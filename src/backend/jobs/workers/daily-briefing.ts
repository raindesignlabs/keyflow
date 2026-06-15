import { Worker, Job } from "bullmq";
import connection from "../connection.js";
import { db } from "../../db/index.js";
import {
  contacts,
  deals,
  activities,
  notificationLog,
  users,
} from "../../models/schema.js";
import { and, eq, gte, desc } from "drizzle-orm";
import { sendEmail } from "../../services/email.js";
import { generateAIBriefing } from "../../services/briefing.js";

interface BriefingJobData {
  userId: string;
}

async function processBriefing(job: Job<BriefingJobData>) {
  const { userId } = job.data;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Fetch user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    console.warn(`[Briefing] User ${userId} not found, skipping`);
    return { userId, sent: false, reason: "user_not_found" };
  }

  if (!user.email) {
    console.warn(`[Briefing] User ${userId} has no email, skipping`);
    return { userId, sent: false, reason: "no_email" };
  }

  const isAdmin = user.role === "owner" || user.role === "admin";

  // Fetch data
  const [newLeads, dealUpdates, recentActivity] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(
        isAdmin
          ? gte(contacts.createdAt, since)
          : and(
              gte(contacts.createdAt, since),
              eq(contacts.organizationId, user.organizationId)
            )
      )
      .orderBy(desc(contacts.leadScore))
      .limit(20),

    db
      .select()
      .from(deals)
      .where(gte(deals.updatedAt, since))
      .limit(20),

    db
      .select()
      .from(activities)
      .where(gte(activities.createdAt, since))
      .orderBy(desc(activities.createdAt))
      .limit(20),
  ]);

  // Determine channel
  const channels = (user.notificationChannels as { email: boolean; sms: boolean; push: boolean }) ?? { email: true, sms: false, push: false };
  const channel = channels.email ? "email" : "push";

  // Generate AI briefing (falls back to template if OpenAI key missing)
  const briefing = await generateAIBriefing({
    newLeads,
    dealUpdates,
    recentActivity,
    isAdmin,
    userName: user.name.split(" ")[0],
  });

  // Log the notification
  const [logEntry] = await db
    .insert(notificationLog)
    .values({
      userId,
      type: "daily_briefing",
      channel,
      status: "pending",
      content: briefing,
      scheduledFor: new Date(),
    })
    .returning();

  // Send via email
  if (channel === "email") {
    try {
      await sendEmail({
        to: user.email,
        subject: isAdmin
          ? "📊 Your KeyFlow Daily Digest"
          : "📋 Your KeyFlow Daily Briefing",
        text: briefing,
      });

      await db
        .update(notificationLog)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(notificationLog.id, logEntry.id));

      console.log(`[Briefing] Sent email to ${user.email} (${user.role})`);
    } catch (err: any) {
      await db
        .update(notificationLog)
        .set({
          status: "failed",
          metadata: { error: err.message },
        })
        .where(eq(notificationLog.id, logEntry.id));

      console.error(`[Briefing] Email failed for ${user.email}:`, err.message);
      throw err; // Let BullMQ retry
    }
  }

  return {
    userId,
    sent: true,
    channel,
    leadCount: newLeads.length,
    dealCount: dealUpdates.length,
    activityCount: recentActivity.length,
  };
}

// Start the worker
export const dailyBriefingWorker = new Worker<BriefingJobData>(
  "daily-briefing",
  processBriefing,
  {
    connection,
    concurrency: 5,
  }
);

dailyBriefingWorker.on("failed", (job, err) => {
  console.error(`[Briefing] Failed for user ${job?.data.userId}:`, err.message);
});

dailyBriefingWorker.on("completed", (job, result) => {
  console.log(`[Briefing] Completed for user ${job.data.userId}`, result);
});
