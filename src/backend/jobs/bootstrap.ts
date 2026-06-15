import { db } from "../db/index.js";
import { users } from "../models/schema.js";
import { isNotNull, and } from "drizzle-orm";
import { scheduleDailyBriefing, scheduleVoiceHealthMonitors } from "./scheduler.js";

/**
 * On server start, re-register BullMQ repeatable jobs for all users
 * who have notification time + timezone configured.
 */
export async function bootstrapSchedules() {
  try {
    const scheduled = await db
      .select({
        id: users.id,
        notificationTime: users.notificationTime,
        timezone: users.timezone,
      })
      .from(users)
      .where(and(isNotNull(users.notificationTime), isNotNull(users.timezone)));

    for (const user of scheduled) {
      await scheduleDailyBriefing(
        user.id,
        user.notificationTime!,
        user.timezone!
      );
    }

    console.log(`[Bootstrap] ${scheduled.length} notification schedule(s) registered`);
  } catch (err) {
    console.error("[Bootstrap] Failed to register schedules:", err);
  }
}

/**
 * Bootstrap voice agent health monitoring jobs.
 * Runs independently of user notification schedules.
 */
export async function bootstrapVoiceHealth() {
  try {
    await scheduleVoiceHealthMonitors();
    console.log("[Bootstrap] Voice health monitors bootstrapped");
  } catch (err) {
    console.error("[Bootstrap] Failed to bootstrap voice health monitors:", err);
  }
}
