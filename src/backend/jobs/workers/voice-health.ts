/**
 * Voice Agent Health Worker
 *
 * Handles 5 job types on the 'voice-health' queue:
 * 1. voice-connectivity — every 60s, check public health endpoint
 * 2. voice-tunnel-check — every 5 min, verify cloudflared tunnel
 * 3. voice-call-watcher — every 2 min, scan for new call logs
 * 4. voice-daily-report — daily at 8 AM PT, compile summary
 * 5. voice-dead-air-check — triggered by call watcher, detect silent calls
 */

import { Worker, Job } from "bullmq";
import { execSync } from "child_process";
import { readdir, stat, readFile } from "fs/promises";
import { join } from "path";
import connection from "../connection.js";
import { voiceHealthQueue } from "../queues.js";
import { sendEmail } from "../../services/email.js";

// ── Configuration ──────────────────────────────────────────────────

const VOICE_AGENT_URL = process.env.VOICE_AGENT_URL || "https://voice.raindesignlabs.net";
const VOICE_LOGS_DIR = process.env.VOICE_LOGS_DIR || "/home/james/my_claude/projects/rdl-voice-agent/KeyFlow/logs";
const KEYFLOW_API = process.env.KEYFLOW_API || "http://127.0.0.1:3200";
const KEYFLOW_API_KEY = process.env.KEYFLOW_API_KEY || "";
// Org that ingested voice calls belong to. Required by the /api/voice-calls
// schema; if unset we skip ingestion rather than POST payloads that always 400.
const VOICE_AGENT_ORG_ID = process.env.VOICE_AGENT_ORG_ID || "";
const ALERT_EMAIL = process.env.ALERT_EMAIL || "james@raindesignlabs.net";
const ALERT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// ── Alert Throttling ───────────────────────────────────────────────

const lastAlert: Record<string, number> = {};

function shouldAlert(type: string): boolean {
  const now = Date.now();
  if (!lastAlert[type] || now - lastAlert[type] >= ALERT_COOLDOWN_MS) {
    lastAlert[type] = now;
    return true;
  }
  return false;
}

async function alert(subject: string, text: string, force = false) {
  const type = subject;
  if (!force && !shouldAlert(type)) return;
  try {
    await sendEmail({ to: ALERT_EMAIL, subject, text });
    console.log(`[VoiceHealth] Alert sent: ${subject}`);
  } catch (err: any) {
    console.error(`[VoiceHealth] Alert failed: ${err.message}`);
  }
}

// ── Health State (stored in Redis for route access) ────────────────

const healthState = {
  agentStatus: "unknown",
  tunnelStatus: "unknown",
  lastCheck: new Date().toISOString(),
  consecutiveFailures: 0,
};

// Exported for the voice-health route
export function getHealthState() {
  return { ...healthState };
}

// ── Job Handlers ───────────────────────────────────────────────────

async function handleConnectivityCheck(_job: Job) {
  try {
    const resp = await fetch(`${VOICE_AGENT_URL}/status`, {
      signal: AbortSignal.timeout(10000),
    });
    const data = await resp.json();

    if (resp.ok && data.ok === true) {
      if (healthState.consecutiveFailures > 0) {
        // Recovery — always alert on recovery
        await alert(
          "✅ Voice Agent Recovered",
          `Voice agent is back up after ${healthState.consecutiveFailures} failed checks.\n\nURL: ${VOICE_AGENT_URL}/status\nTime: ${new Date().toISOString()}`,
          true
        );
      }
      healthState.agentStatus = "up";
      healthState.consecutiveFailures = 0;
      return { healthy: true };
    }

    throw new Error(`Unexpected response: ${resp.status} ${JSON.stringify(data)}`);
  } catch (err: any) {
    healthState.consecutiveFailures++;
    healthState.agentStatus = "down";
    await alert(
      "❌ Voice Agent Down",
      `Voice agent health check failed (${healthState.consecutiveFailures} consecutive failures).\n\nError: ${err.message}\nURL: ${VOICE_AGENT_URL}/status\nTime: ${new Date().toISOString()}\n\nAction: Check voice-agent.service and cloudflared-tunnel.service`
    );
    return { healthy: false, error: err.message };
  } finally {
    healthState.lastCheck = new Date().toISOString();
  }
}

async function handleTunnelCheck(_job: Job) {
  try {
    const tunnelStatus = execSync(
      "systemctl --user is-active cloudflared-tunnel.service 2>/dev/null",
      { encoding: "utf-8" }
    ).trim();

    const agentStatus = execSync(
      "systemctl --user is-active voice-agent.service 2>/dev/null",
      { encoding: "utf-8" }
    ).trim();

    healthState.tunnelStatus = tunnelStatus;

    if (tunnelStatus !== "active") {
      // Try auto-restart
      try {
        execSync("systemctl --user restart cloudflared-tunnel.service", { encoding: "utf-8" });
        await alert(
          "⚠️ Cloudflare Tunnel Restarted",
          `Tunnel was down (status: ${tunnelStatus}). Auto-restart attempted.\n\nCheck: systemctl --user status cloudflared-tunnel.service`
        );
      } catch (restartErr: any) {
        await alert(
          "❌ Cloudflare Tunnel Down — Auto-restart Failed",
          `Tunnel status: ${tunnelStatus}\nAuto-restart failed: ${restartErr.message}\n\nManual fix: systemctl --user restart cloudflared-tunnel.service`
        );
      }
    }

    if (agentStatus !== "active") {
      try {
        execSync("systemctl --user restart voice-agent.service", { encoding: "utf-8" });
        await alert(
          "⚠️ Voice Agent Restarted",
          `Agent was down (status: ${agentStatus}). Auto-restart attempted.`
        );
      } catch (restartErr: any) {
        await alert(
          "❌ Voice Agent Down — Auto-restart Failed",
          `Agent status: ${agentStatus}\nAuto-restart failed: ${restartErr.message}\n\nManual fix: systemctl --user restart voice-agent.service`
        );
      }
    }

    return { tunnel: tunnelStatus, agent: agentStatus };
  } catch (err: any) {
    return { error: err.message };
  }
}

async function handleCallWatcher(_job: Job) {
  // Use a raw TCP connection to Redis for key storage (avoid ioredis dependency)
  // BullMQ manages its own ioredis internally, but for ad-hoc keys we use redis package
  let lastScanTs = "0";
  let redisClient: any = null;

  try {
    // Dynamically import redis v5 (createClient pattern)
    const { createClient } = await import("redis");
    redisClient = createClient({
      url: `redis://${connection.host}:${connection.port}`,
    });
    redisClient.on("error", () => {}); // Suppress connection errors
    await redisClient.connect();
    lastScanTs = await redisClient.get("voice-health:last-scan") || "0";
    const files = await readdir(VOICE_LOGS_DIR);
    const conversationFiles = files.filter(
      f => f.endsWith("_conversation.json") && f > lastScanTs
    ).sort();

    if (conversationFiles.length === 0) {
      return { newCalls: 0 };
    }

    const results = [];
    for (const file of conversationFiles) {
      const filePath = join(VOICE_LOGS_DIR, file);
      try {
        const raw = await readFile(filePath, "utf-8");
        const data = JSON.parse(raw);

        const callerNumber = data.caller_number || data.metadata?.caller_number || "unknown";
        const duration = data.duration || data.metadata?.duration || 0;
        const startedAt = data.started_at || data.metadata?.started_at || file.split("_")[0];
        const messages = data.conversation || data.messages || [];

        // Check for dead air (call > 30s, no user speech)
        const hasUserSpeech = messages.some(
          (m: any) => m.role === "user" && m.content?.trim()?.length > 0
        );

        if (duration > 30 && !hasUserSpeech) {
          // Trigger dead air check
          await voiceHealthQueue.add(
            "voice-dead-air-check",
            { file, callerNumber, duration },
            { attempts: 1 }
          );
        }

        // POST to KeyFlow API. The /api/voice-calls schema requires callId +
        // organizationId; skip ingestion (rather than spamming 400s) until an
        // org is configured.
        if (VOICE_AGENT_ORG_ID) {
          try {
            await fetch(`${KEYFLOW_API}/api/voice-calls`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(KEYFLOW_API_KEY ? { "x-api-key": KEYFLOW_API_KEY } : {}),
              },
              body: JSON.stringify({
                callId: file,
                organizationId: VOICE_AGENT_ORG_ID,
                callerPhone: callerNumber,
                startedAt,
                durationSeconds: typeof duration === "number" ? duration : Number(duration) || undefined,
                metadata: { messages: messages.length, hasUserSpeech, transcriptFile: file },
              }),
              signal: AbortSignal.timeout(5000),
            });
          } catch (apiErr: any) {
            console.error(`[VoiceHealth] Failed to log call to KeyFlow: ${apiErr.message}`);
          }
        }

        // Notify James for real calls (not ghosts < 5s)
        if (duration >= 5) {
          await alert(
            `📞 New Call from ${callerNumber}`,
            `Duration: ${duration}s\nStarted: ${startedAt}\nMessages: ${messages.length}\nFile: ${file}`,
            true // Always notify on real calls
          );
        }

        results.push({ file, callerNumber, duration, hasUserSpeech });
      } catch (parseErr: any) {
        console.error(`[VoiceHealth] Failed to parse ${file}: ${parseErr.message}`);
      }
    }

    // Update last scan timestamp
    lastScanTs = conversationFiles[conversationFiles.length - 1];
    if (redisClient) await redisClient.set("voice-health:last-scan", lastScanTs);

    return { newCalls: results.length, calls: results };
  } finally {
    if (redisClient) await redisClient.disconnect();
  }
}

async function handleDailyReport(_job: Job) {
  try {
    const files = await readdir(VOICE_LOGS_DIR);
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const recentFiles = files.filter(f => f.endsWith("_conversation.json"));
    let realCalls = 0;
    let ghostCalls = 0;

    for (const file of recentFiles) {
      try {
        const fileStat = await stat(join(VOICE_LOGS_DIR, file));
        if (fileStat.mtimeMs >= oneDayAgo) {
          const raw = await readFile(join(VOICE_LOGS_DIR, file), "utf-8");
          const data = JSON.parse(raw);
          const duration = data.duration || data.metadata?.duration || 0;
          if (duration >= 5) realCalls++;
          else ghostCalls++;
        }
      } catch { /* skip unreadable files */ }
    }

    // Check service statuses
    let agentUptime = "unknown";
    let tunnelUptime = "unknown";
    try {
      agentUptime = execSync(
        "systemctl --user show voice-agent.service --property=ActiveEnterTimestamp --value 2>/dev/null",
        { encoding: "utf-8" }
      ).trim() || "unknown";
      tunnelUptime = execSync(
        "systemctl --user show cloudflared-tunnel.service --property=ActiveEnterTimestamp --value 2>/dev/null",
        { encoding: "utf-8" }
      ).trim() || "unknown";
    } catch { /* not available */ }

    const status = healthState.consecutiveFailures === 0 ? "✅ Healthy" : "❌ Degraded";

    const report = [
      `RDL Voice Agent — Daily Report`,
      `Date: ${new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" })}`,
      ``,
      `Calls yesterday: ${realCalls + ghostCalls} (${realCalls} real, ${ghostCalls} ghost)`,
      `Agent up since: ${agentUptime}`,
      `Tunnel up since: ${tunnelUptime}`,
      `Health check failures: ${healthState.consecutiveFailures}`,
      `Status: ${status}`,
    ].join("\n");

    await sendEmail({
      to: ALERT_EMAIL,
      subject: `📊 Voice Agent Daily Report — ${status}`,
      text: report,
    });

    return { realCalls, ghostCalls, status };
  } catch (err: any) {
    console.error(`[VoiceHealth] Daily report failed: ${err.message}`);
    return { error: err.message };
  }
}

async function handleDeadAirCheck(job: Job) {
  const { file, callerNumber, duration } = job.data;
  await alert(
    `⚠️ Dead Air Detected — ${callerNumber}`,
    `Call from ${callerNumber} lasted ${duration}s with no user speech detected.\n\nFile: ${file}\nTime: ${new Date().toISOString()}\n\nPossible STT failure or audio issue. Check Deepgram service status.`,
    true
  );
  return { file, deadAir: true };
}

// ── Router ─────────────────────────────────────────────────────────

async function processJob(job: Job) {
  switch (job.name) {
    case "voice-connectivity":
      return handleConnectivityCheck(job);
    case "voice-tunnel-check":
      return handleTunnelCheck(job);
    case "voice-call-watcher":
      return handleCallWatcher(job);
    case "voice-daily-report":
      return handleDailyReport(job);
    case "voice-dead-air-check":
      return handleDeadAirCheck(job);
    default:
      console.warn(`[VoiceHealth] Unknown job: ${job.name}`);
      return { unknown: true };
  }
}

// ── Worker ─────────────────────────────────────────────────────────

export const voiceHealthWorker = new Worker(
  "voice-health",
  processJob,
  {
    connection,
    concurrency: 5,
  }
);

voiceHealthWorker.on("failed", (job, err) => {
  console.error(`[VoiceHealth] Job ${job?.name} failed:`, err.message);
});

voiceHealthWorker.on("completed", (job, result) => {
  console.log(`[VoiceHealth] Job ${job.name} completed:`, JSON.stringify(result));
});
