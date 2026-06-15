# Voice Agent Health Monitoring & Resilience Spec

**For:** KeyFlow Bot implementation
**Priority:** Critical — RDL's primary lead intake channel
**Date:** June 5, 2026

---

## 1. Current State (What Just Broke and Why)

### Infrastructure Stack

| Component | Host | Port | Status |
|---|---|---|---|
| Voice Agent (Pipecat) | `127.0.0.1` | 7860 | ✅ Running (bare process, PID 9353) |
| Cloudflare Tunnel | — | — | ✅ Systemd service, routes voice→7860 |
| Redis | `127.0.0.1` | 6379 | ✅ Running |
| KeyFlow API | `127.0.0.1` | 3200 | ✅ Running |
| SurrealDB | `0.0.0.0` | 8000 | ✅ Running (DO NOT confuse with voice agent) |

### Public URLs

- `https://voice.raindesignlabs.net` → Cloudflare Tunnel → `127.0.0.1:7860`
- Health check: `GET https://voice.raindesignlabs.net/status` → `{"ok":true}`
- Twilio webhook: `https://voice.raindesignlabs.net/` (phone `+18663699294`)

### What Failed (June 3-4)

1. **Voice DNS was orphaned.** `voice.raindesignlabs.net` had stale A records pointing to CF proxy IPs but no tunnel ingress rule. Calls worked June 2 via a now-dead routing path. After that path died, Twilio webhooks hit HTTP 530 (origin unreachable).
2. **No systemd service for cloudflared.** The tunnel process was a bare command with no auto-restart. If it crashed, nothing brought it back.
3. **No connectivity watchdog.** A Hermes cron job (`connectivity_watchdog.sh`) existed but the script file was missing — silently failing forever.
4. **No call-notification pipeline.** Call logs were written to disk (`KeyFlow/logs/`) but nothing watched for new calls or alerted on failures.

### What Was Fixed Today (June 4)

- Added `voice.raindesignlabs.net` ingress rule to tunnel config (`~/.cloudflared/config.yml`)
- Re-routed DNS: `cloudflared tunnel route dns --overwrite-dns df2eb111 voice.raindesignlabs.net`
- Created systemd user service for cloudflared tunnel (`cloudflared-tunnel.service`, enabled)
- Verified: `https://voice.raindesignlabs.net/status` → `{"ok":true}`

---

## 2. What Still Needs Hardening

### A. Voice Agent Process → Systemd Service

The voice bot (`python3 bot.py -t twilio -x voice.raindesignlabs.net`) is a **bare process with no auto-restart**. If it crashes, calls go to dead air.

**Create:** `~/.config/systemd/user/voice-agent.service`

```ini
[Unit]
Description=RDL Voice AI Agent (Pipecat + Twilio)
After=network.target cloudflared-tunnel.service
Wants=cloudflared-tunnel.service

[Service]
Type=simple
WorkingDirectory=/home/james/my_claude/projects/rdl-voice-agent
ExecStart=/home/james/my_claude/projects/rdl-voice-agent/venv/bin/python3 bot.py -t twilio -x voice.raindesignlabs.net
Restart=always
RestartSec=10
Environment=RUNNER_PORT=7860

[Install]
WantedBy=default.target
```

**Also kill the existing bare process (PID 9353) and start via systemd instead.**

### B. BullMQ Health Monitor (5 Operations)

Use the existing KeyFlow BullMQ + Redis infrastructure. Add a new queue with 5 recurring jobs.

**Queue:** `voice-health`

**Redis connection:** Same as existing queues (`{ host: '127.0.0.1', port: 6379, maxRetriesPerRequest: null }`)

---

### Operation 1: Connectivity Check (every 60 seconds)

**Job name:** `voice-connectivity`
**Schedule:** `*/1 * * * *` (every minute)
**What it does:**
1. `GET https://voice.raindesignlabs.net/status`
2. If response ≠ `{"ok":true}` or timeout → **ALERT**

**Alert action:**
- Send notification to James (Telegram via KeyFlow API or email to james@raindesignlabs.net)
- Log failure to `notification_log` table with type `voice-health`

### Operation 2: Tunnel Heartbeat (every 5 minutes)

**Job name:** `voice-tunnel-check`
**Schedule:** `*/5 * * * *`
**What it does:**
1. Verify cloudflared tunnel is running: `systemctl --user is-active cloudflared-tunnel.service`
2. Verify tunnel config contains `voice.raindesignlabs.net` ingress rule
3. If tunnel is down or misconfigured → **ALERT + auto-restart attempt**

**Alert action:**
- Try `systemctl --user restart cloudflared-tunnel.service`
- If restart fails, alert James immediately

### Operation 3: Call Log Watcher (every 2 minutes)

**Job name:** `voice-call-watcher`
**Schedule:** `*/2 * * * *`
**What it does:**
1. Scan `/home/james/my_claude/projects/rdl-voice-agent/KeyFlow/logs/` for new `*_conversation.json` files (compare against last checked timestamp stored in Redis)
2. For each new file:
   - Parse the JSON to extract: caller number, call duration, transcript summary
   - POST to KeyFlow API `POST /api/voice-calls` to log the call
   - Send James a notification with caller info and duration
3. If any call has duration < 5 seconds (ghost call) → note it, don't alert
4. If any call has errors or guardrails triggered → **ALERT**

**Alert action:**
- Telegram message: "📞 New call from {number} — {duration}s. Transcript: {summary}"
- Log to KeyFlow voice_calls table

### Operation 4: Daily Health Report (once daily at 8 AM PT)

**Job name:** `voice-daily-report`
**Schedule:** `0 8 * * *` (8 AM Pacific = `0 15 * * *` UTC)
**What it does:**
1. Count calls in last 24h from `KeyFlow/logs/`
2. Check voice agent uptime (systemd service status)
3. Check tunnel uptime
4. Check for any failed health checks in last 24h
5. Compile summary and send to James

**Report format:**
```
RDL Voice Agent — Daily Report
Calls yesterday: {n} ({real} real, {ghost} ghost)
Agent uptime: {uptime}
Tunnel uptime: {uptime}
Health check failures: {n}
Status: ✅ Healthy / ⚠️ Degraded / ❌ Down
```

### Operation 5: Dead Air Detection (on every call)

**Job name:** `voice-dead-air-check`
**Schedule:** Triggered (not cron) — fired by call log watcher when a new call is detected
**What it does:**
1. If a call lasted > 30 seconds but transcript is empty or only contains bot messages (no user speech detected)
2. → Dead air detected. Possible STT/TTS failure.
3. **ALERT:** "⚠️ Dead air detected on call from {number} — {duration}s, no user speech captured. Possible STT failure."

---

## 3. Implementation Structure

Add to KeyFlow backend under `src/backend/jobs/`:

```
src/backend/jobs/
├── connection.ts          # Existing Redis config (reuse)
├── queues.ts              # Add: voiceHealthQueue
├── scheduler.ts           # Add: scheduleVoiceHealthMonitors()
├── bootstrap.ts           # Add: re-register voice health jobs on start
└── workers/
    ├── daily-briefing.ts  # Existing
    └── voice-health.ts    # NEW — handles all 5 operations
```

### Queue Definition (add to `queues.ts`)

```typescript
export const voiceHealthQueue = new Queue('voice-health', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});
```

### Worker (new file `workers/voice-health.ts`)

Single worker handles all 5 job types based on `job.name`:

```typescript
worker.on('completed', (job) => {
  // Log success to Redis key for daily report aggregation
});

worker.on('failed', (job, err) => {
  // Alert James on consecutive failures (don't spam on transient)
});
```

### Alert Delivery

Reuse existing KeyFlow alert channels:
- **Primary:** Email via `services/email.ts` (already works, Hostinger SMTP)
- **Critical alerts:** Also POST to James's Telegram via bot API (if Telegram bot token available)
- **All alerts logged to:** `notification_log` table with type `voice-health`

### Alert Throttling

- Connectivity failures: Alert on first failure, then suppress for 10 minutes. Re-alert every 10 minutes while down. Alert on recovery.
- Dead air: Alert immediately per occurrence (rate calls are low enough).
- Daily report: Always send, even if "all clear."

---

## 4. KeyFlow API Additions

### New Route: `GET /api/voice-health`

Returns current voice agent health status:

```json
{
  "agent": { "status": "up", "port": 7860, "uptime": "2d 5h 30m" },
  "tunnel": { "status": "up", "service": "cloudflared-tunnel.service" },
  "lastCheck": "2026-06-05T08:00:00Z",
  "consecutiveFailures": 0
}
```

### Existing Route: `POST /api/voice-calls`

Already exists — call watcher posts new calls here.

---

## 5. Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| `src/backend/jobs/queues.ts` | Modify | Add `voiceHealthQueue` |
| `src/backend/jobs/workers/voice-health.ts` | Create | Health check worker (5 operations) |
| `src/backend/jobs/scheduler.ts` | Modify | Add `scheduleVoiceHealthMonitors()` |
| `src/backend/jobs/bootstrap.ts` | Modify | Register voice health jobs on start |
| `src/backend/routes/voice-health.ts` | Create | Health status API endpoint |
| `src/backend/index.ts` | Modify | Register new route |
| `~/.config/systemd/user/voice-agent.service` | Create | Systemd service for voice bot |

---

## 6. Testing Checklist

After implementation, verify each:

- [ ] Kill voice bot process → systemd restarts it within 10s
- [ ] Stop cloudflared tunnel → health check detects within 60s → alert fires
- [ ] Place test call → call watcher logs it → notification sent
- [ ] Simulate dead air (call in, say nothing 30s) → dead air alert fires
- [ ] Check daily report generates at 8 AM with correct stats
- [ ] Reboot host → both systemd services (tunnel + voice) auto-start
- [ ] BullMQ jobs re-register on KeyFlow server start (bootstrap)

---

## 7. Critical Reminders

- **Voice agent port is 7860.** Port 8000 is SurrealDB. Never route to 8000.
- **BullMQ takes plain `{ host, port }` object** for connection — NOT a `new Redis()` instance.
- **Process is currently bare (PID 9353).** Must kill and migrate to systemd.
- **Call logs are JSON files on disk** at `~/my_claude/projects/rdl-voice-agent/KeyFlow/logs/`. No API to poll — watch the filesystem.
- **Redis must stay up.** If Redis dies, all BullMQ jobs stop. Consider adding Redis to the health checks too.
