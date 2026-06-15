import { dailyBriefingQueue, voiceHealthQueue } from "./queues.js";

/**
 * Register a daily briefing repeatable job for a user.
 * Converts "HH:MM" + IANA timezone → BullMQ cron pattern.
 */
export async function scheduleDailyBriefing(
  userId: string,
  time: string,    // "HH:MM" e.g. "06:00"
  timezone: string  // "America/Los_Angeles"
) {
  const [hours, minutes] = time.split(":").map(Number);
  const cronExpression = `${minutes} ${hours} * * *`;
  const jobId = `daily-briefing:${userId}`;

  // Remove any existing repeatable job for this user
  await unscheduleDailyBriefing(userId);

  // Register new repeatable job
  await dailyBriefingQueue.add(
    "send-briefing",
    { userId },
    {
      repeat: {
        pattern: cronExpression,
        tz: timezone,
      },
      jobId,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 60_000,
      },
    }
  );

  console.log(`[Scheduler] Registered daily briefing for user ${userId} at ${time} (${timezone})`);
}

/**
 * Remove a user's scheduled daily briefing.
 */
export async function unscheduleDailyBriefing(userId: string) {
  const jobId = `daily-briefing:${userId}`;

  // BullMQ requires us to find the existing repeatable job to remove it
  const repeatableJobs = await dailyBriefingQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.key.includes(jobId)) {
      await dailyBriefingQueue.removeRepeatableByKey(job.key);
      console.log(`[Scheduler] Removed old schedule for user ${userId}`);
      break;
    }
  }
}

/**
 * Register voice agent health monitoring repeatable jobs.
 * Called once on server bootstrap.
 */
export async function scheduleVoiceHealthMonitors() {
  // Remove any existing voice health repeatable jobs first
  const existing = await voiceHealthQueue.getRepeatableJobs();
  for (const job of existing) {
    await voiceHealthQueue.removeRepeatableByKey(job.key);
  }

  // 1. Connectivity check — every minute
  await voiceHealthQueue.add(
    "voice-connectivity",
    {},
    { repeat: { pattern: "*/1 * * * *" }, jobId: "voice-connectivity" }
  );

  // 2. Tunnel + agent service check — every 5 minutes
  await voiceHealthQueue.add(
    "voice-tunnel-check",
    {},
    { repeat: { pattern: "*/5 * * * *" }, jobId: "voice-tunnel-check" }
  );

  // 3. Call log watcher — every 2 minutes
  await voiceHealthQueue.add(
    "voice-call-watcher",
    {},
    { repeat: { pattern: "*/2 * * * *" }, jobId: "voice-call-watcher" }
  );

  // 4. Daily report — 8 AM PT (15:00 UTC)
  await voiceHealthQueue.add(
    "voice-daily-report",
    {},
    { repeat: { pattern: "0 15 * * *", tz: "America/Los_Angeles" }, jobId: "voice-daily-report" }
  );

  console.log("[Scheduler] Voice health monitors registered (connectivity, tunnel, calls, daily report)");
}
