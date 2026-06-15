import { FastifyInstance, FastifyPluginCallback } from "fastify";
import { db } from "../db/index.js";
import { users, notificationSettings, notificationLog } from "../models/schema.js";
import { eq, desc } from "drizzle-orm";
import { scheduleDailyBriefing, unscheduleDailyBriefing } from "../jobs/scheduler.js";

interface NotificationSettingsBody {
  notificationTime?: string;   // "HH:MM"
  timezone?: string;            // IANA timezone
  channels?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  settings?: {
    adminDailyDigest?: boolean;
    adminPipelineAlerts?: boolean;
    adminAgentActivity?: boolean;
    adminLeadScoreChanges?: boolean;
    clientDailyBriefing?: boolean;
    clientFollowUpReminders?: boolean;
    clientDealUpdates?: boolean;
    clientNewLeadAlerts?: boolean;
    quietHoursEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  };
}

export const notificationRoutes: FastifyPluginCallback = async (app: FastifyInstance) => {
  // GET notification settings for a user
  app.get<{ Params: { id: string } }>(
    "/:id",
    async (req, reply) => {
      const { id } = req.params;

      const [user] = await db
        .select({
          notificationTime: users.notificationTime,
          timezone: users.timezone,
          notificationChannels: users.notificationChannels,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const [settings] = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, id))
        .limit(1);

      return {
        notificationTime: user.notificationTime,
        timezone: user.timezone,
        channels: user.notificationChannels,
        settings: settings || null,
      };
    }
  );

  // PUT — update notification settings + schedule
  app.put<{ Params: { id: string }; Body: NotificationSettingsBody }>(
    "/:id",
    async (req, reply) => {
      const { id } = req.params;
      const { notificationTime, timezone, channels, settings } = req.body;

      // Validate time format
      if (notificationTime && !/^\d{2}:\d{2}$/.test(notificationTime)) {
        return reply.status(400).send({ error: "notificationTime must be HH:MM format" });
      }

      // Validate timezone (basic check)
      if (timezone) {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: timezone });
        } catch {
          return reply.status(400).send({ error: `Invalid timezone: ${timezone}` });
        }
      }

      // Update user table
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (notificationTime !== undefined) updates.notificationTime = notificationTime;
      if (timezone !== undefined) updates.timezone = timezone;
      if (channels !== undefined) updates.notificationChannels = channels;

      await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id));

      // Upsert notification_settings
      if (settings) {
        const [existing] = await db
          .select({ id: notificationSettings.id })
          .from(notificationSettings)
          .where(eq(notificationSettings.userId, id))
          .limit(1);

        if (existing) {
          await db
            .update(notificationSettings)
            .set({ ...settings, updatedAt: new Date() })
            .where(eq(notificationSettings.id, existing.id));
        } else {
          await db.insert(notificationSettings).values({
            userId: id,
            ...settings,
          });
        }
      }

      // If time + timezone both provided, register/update the BullMQ job
      const finalTime = notificationTime ?? (await getCurrentUserValue(id, "notificationTime"));
      const finalTz = timezone ?? (await getCurrentUserValue(id, "timezone"));

      if (finalTime && finalTz) {
        await scheduleDailyBriefing(id, finalTime, finalTz);
      }

      return { success: true, notificationTime: finalTime, timezone: finalTz };
    }
  );

  // POST — send a test briefing immediately
  app.post<{ Params: { id: string } }>(
    "/:id/test",
    async (req, _reply) => {
      const { id } = req.params;

      const { dailyBriefingQueue } = await import("../jobs/queues.js");
      const job = await dailyBriefingQueue.add(
        "send-briefing",
        { userId: id },
        {
          jobId: `test-briefing:${id}:${Date.now()}`,
          attempts: 1,
        }
      );

      return {
        success: true,
        jobId: job.id,
        message: "Test briefing queued — check notification_log for result",
      };
    }
  );

  // DELETE — remove the scheduled job (pause all notifications)
  app.delete<{ Params: { id: string } }>(
    "/:id/schedule",
    async (req, _reply) => {
      const { id } = req.params;

      // Clear the time so bootstrap won't re-register
      await db
        .update(users)
        .set({ notificationTime: null, updatedAt: new Date() })
        .where(eq(users.id, id));

      await unscheduleDailyBriefing(id);

      return { success: true, message: "Notification schedule removed" };
    }
  );

  // GET — notification log for a user
  app.get<{ Params: { id: string } }>(
    "/:id/log",
    async (req, _reply) => {
      const { id } = req.params;

      const log = await db
        .select()
        .from(notificationLog)
        .where(eq(notificationLog.userId, id))
        .orderBy(desc(notificationLog.createdAt))
        .limit(50);

      return log;
    }
  );
};

// Helper to get current user column value
async function getCurrentUserValue(userId: string, column: "notificationTime" | "timezone") {
  const [row] = await db
    .select({ [column]: users[column] })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.[column] as string | null;
}
