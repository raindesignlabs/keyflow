# KeyFlow — BullMQ Notification & Scheduling System

## Overview

Replace OS cron with BullMQ recurring jobs for all scheduled notifications. Two user types with different needs:

- **Admin (owner/admin role):** System-wide briefings — daily activity digest, pipeline alerts, AI agent summaries, lead score changes
- **Client (agent role):** Personal daily briefing at a time and timezone they configure in settings

## Why BullMQ, Not Cron

| Concern | OS Cron | BullMQ |
|---|---|---|
| Per-user scheduling | Hard (separate crontab entries) | Native (one repeated job per user) |
| Observability | Read syslog | Bull Board dashboard, job status API |
| Retry on failure | Manual | Built-in with backoff |
| Server restart | Missed jobs silently | Redis persistence, jobs resume |
| Pause/resume per user | Shell scripts | `job.pause()` / `job.resume()` |
| Access to app context | External script + DB creds | Runs inside Node, full ORM access |
| Scale to multi-server | No | Redis-backed, distributes across workers |

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  User saves notification settings (timezone, time)   │
│  PUT /api/users/:id/notification-settings            │
└──────────────────┬───────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│  NotificationScheduler                               │
│  - Remove old BullMQ repeatable job for this user    │
│  - Calculate cron expression from user's time+tz     │
│  - Register new BullMQ repeatable job                │
└──────────────────┬───────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│  Redis (BullMQ state)                                │
│  - Repeat job definitions                            │
│  - Job queue, completed/failed sets                  │
└──────────────────┬───────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│  NotificationWorker                                  │
│  - Processes 'daily-briefing' jobs                   │
│  - Queries DB for user's data (contacts, deals, etc) │
│  - Calls AI to summarize into briefing               │
│  - Sends via user's preferred channel                │
└──────────────────────────────────────────────────────┘
```

## Database Changes

### 1. Add columns to `users` table

```ts
// New columns on existing users table

notificationTime: varchar("notification_time", { length: 5 }),  // "HH:MM" in user's local time, e.g. "06:00"
timezone: varchar("timezone", { length: 50 }),                  // IANA timezone, e.g. "America/Los_Angeles"
notificationChannels: jsonb("notification_channels").$type<{
  email: boolean;
  sms: boolean;
  push: boolean;
}>().default({ email: true, sms: false, push: false }),
```

**Why `notification_time` as HH:MM string:** BullMQ repeatable jobs use cron expressions. We convert `"06:00"` + `"America/Los_Angeles"` → `"0 6 * * *"` with the timezone passed to BullMQ. Simple, no ambiguity.

### 2. New `notification_settings` table

For granular control over *what* gets included in the briefing:

```ts
export const notificationSettings = pgTable("notification_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  
  // Admin-specific settings
  adminDailyDigest: boolean("admin_daily_digest").default(false),
  adminPipelineAlerts: boolean("admin_pipeline_alerts").default(true),
  adminAgentActivity: boolean("admin_agent_activity").default(true),
  adminLeadScoreChanges: boolean("admin_lead_score_changes").default(true),
  
  // Client/Agent-specific settings  
  clientDailyBriefing: boolean("client_daily_briefing").default(true),
  clientFollowUpReminders: boolean("client_follow_up_reminders").default(true),
  clientDealUpdates: boolean("client_deal_updates").default(true),
  clientNewLeadAlerts: boolean("client_new_lead_alerts").default(false),
  
  // Quiet hours (no notifications during these hours in user's timezone)
  quietHoursEnabled: boolean("quiet_hours_enabled").default(false),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }).default("22:00"),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }).default("07:00"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### 3. New `notification_log` table

Track what was sent, when, and whether it succeeded:

```ts
export const notificationLog = pgTable("notification_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: varchar("type", { length: 50 }).notNull(),  // "daily_briefing", "pipeline_alert", "lead_alert", etc.
  channel: varchar("channel", { length: 20 }).notNull(), // "email", "sms", "push"
  status: varchar("status", { length: 20 }).default("pending").notNull(), // "pending", "sent", "failed"
  content: text("content"),           // The rendered briefing text
  metadata: jsonb("metadata"),        // Delivery receipts, error details, etc.
  scheduledFor: timestamp("scheduled_for").notNull(), // When it was supposed to go out
  sentAt: timestamp("sent_at"),       // When it actually went out
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

## Drizzle Migration

After adding the new columns/table to `schema.ts`:

```bash
pnpm db:generate   # generates SQL migration
pnpm db:migrate    # applies it
```

## BullMQ Implementation

### File structure

```
src/backend/
├── jobs/
│   ├── connection.ts          # Redis connection singleton
│   ├── scheduler.ts           # Register/remove repeatable jobs
│   ├── workers/
│   │   ├── daily-briefing.ts  # Worker that builds & sends briefings
│   │   ├── pipeline-alert.ts  # Worker for deal stage changes
│   │   └── lead-alert.ts      # Worker for new/high-score leads
│   └── queues.ts              # Queue definitions
```

### `connection.ts` — Redis connection

```ts
import { Redis } from "redis";

// BullMQ requires a Redis connection
// redis@5 uses the newer API
const connection = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required by BullMQ
});

export default connection;
```

### `queues.ts` — Queue definitions

```ts
import { Queue } from "bullmq";
import connection from "./connection.js";

export const dailyBriefingQueue = new Queue("daily-briefing", { connection });
export const pipelineAlertQueue = new Queue("pipeline-alert", { connection });
export const leadAlertQueue = new Queue("lead-alert", { connection });
```

### `scheduler.ts` — Register/remove repeatable jobs

```ts
import { dailyBriefingQueue } from "./queues.js";

/**
 * Register a daily briefing job for a user.
 * Converts HH:MM + IANA timezone → BullMQ cron repeatable job.
 */
export async function scheduleDailyBriefing(
  userId: string,
  time: string,       // "HH:MM" e.g. "06:00"
  timezone: string     // "America/Los_Angeles"
) {
  const [hours, minutes] = time.split(":").map(Number);
  const cronExpression = `${minutes} ${hours} * * *`;
  
  const jobId = `daily-briefing:${userId}`;
  
  // Remove existing repeatable job for this user (if any)
  await dailyBriefingQueue.removeRepeatableByKey(jobId);
  
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
      // Retry up to 3 times with exponential backoff
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 60_000, // start at 1 minute
      },
    }
  );
}

/**
 * Remove a user's scheduled daily briefing.
 */
export async function unscheduleDailyBriefing(userId: string) {
  const jobId = `daily-briefing:${userId}`;
  await dailyBriefingQueue.removeRepeatableByKey(jobId);
}
```

### `workers/daily-briefing.ts` — The actual briefing worker

```ts
import { Worker, Job } from "bullmq";
import connection from "../connection.js";
import { db } from "../../db/index.js";
import { contacts, deals, activities, notificationLog } from "../../models/schema.js";
import { and, eq, gte, desc } from "drizzle-orm";

interface BriefingJobData {
  userId: string;
}

async function processBriefing(job: Job<BriefingJobData>) {
  const { userId } = job.data;
  
  // 1. Fetch user's data since yesterday
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const [newContacts, dealUpdates, recentActivities] = await Promise.all([
    // New leads
    db.select().from(contacts)
      .where(gte(contacts.createdAt, since))
      .orderBy(desc(contacts.leadScore)),
    
    // Deal changes
    db.select().from(deals)
      .where(gte(deals.updatedAt, since)),
    
    // Recent activity
    db.select().from(activities)
      .where(gte(activities.createdAt, since))
      .orderBy(desc(activities.createdAt))
      .limit(20),
  ]);
  
  // 2. Build briefing (future: AI-generated summary via LangChain)
  const briefing = buildBriefingText(newContacts, dealUpdates, recentActivities);
  
  // 3. Log the notification
  const [logEntry] = await db.insert(notificationLog).values({
    userId,
    type: "daily_briefing",
    channel: "email", // TODO: check user's channel preference
    status: "pending",
    content: briefing,
    scheduledFor: new Date(),
  }).returning();
  
  // 4. Send via preferred channel (TODO: implement email/SMS/push)
  // For now, just mark as sent
  await db.update(notificationLog)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(notificationLog.id, logEntry.id));
  
  return { userId, briefingSent: true };
}

function buildBriefingText(
  newContacts: any[],
  dealUpdates: any[],
  recentActivities: any[]
): string {
  const parts: string[] = [];
  
  if (newContacts.length > 0) {
    parts.push(`📋 ${newContacts.length} new lead(s) overnight:`);
    newContacts.forEach(c => {
      parts.push(`  • ${c.firstName} ${c.lastName || ""} (score: ${c.leadScore})`);
    });
  }
  
  if (dealUpdates.length > 0) {
    parts.push(`💰 ${dealUpdates.length} deal update(s):`);
    dealUpdates.forEach(d => {
      parts.push(`  • ${d.title} — stage: ${d.stage}`);
    });
  }
  
  if (recentActivities.length > 0) {
    parts.push(`📝 ${recentActivities.length} recent activit(ies)`);
  }
  
  return parts.join("\n") || "Nothing new since yesterday. You're all caught up.";
}

// Start the worker
export const dailyBriefingWorker = new Worker<BriefingJobData>(
  "daily-briefing",
  processBriefing,
  {
    connection,
    concurrency: 5, // process up to 5 briefings simultaneously
  }
);

dailyBriefingWorker.on("failed", (job, err) => {
  console.error(`Briefing failed for user ${job?.data.userId}:`, err.message);
});

dailyBriefingWorker.on("completed", (job) => {
  console.log(`Briefing sent for user ${job.data.userId}`);
});
```

## API Routes

### `PUT /api/users/:id/notification-settings`

User saves their preferred time, timezone, and channels:

```ts
// Request body
{
  "notificationTime": "06:00",
  "timezone": "America/Los_Angeles",
  "channels": { "email": true, "sms": false, "push": true },
  "settings": {
    "clientDailyBriefing": true,
    "clientFollowUpReminders": true,
    "quietHoursEnabled": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "07:00"
  }
}
```

The route handler:
1. Updates `users` table with `notificationTime`, `timezone`, `notificationChannels`
2. Upserts `notification_settings` row
3. Calls `scheduleDailyBriefing(userId, time, timezone)` to register/update the BullMQ job

### `POST /api/users/:id/notification-settings/test`

Sends a test briefing immediately (useful for onboarding).

### `GET /api/users/:id/notification-log`

Returns recent notification history from `notification_log`.

### `DELETE /api/users/:id/notification-schedule`

Removes the BullMQ repeatable job (pauses all scheduled notifications for that user).

## Bootstrap on Server Start

In `index.ts`, after Fastify boots, load all active users who have `notificationTime` set and register their BullMQ repeatable jobs:

```ts
// src/backend/jobs/bootstrap.ts

import { db } from "../db/index.js";
import { users } from "../models/schema.js";
import { isNotNull } from "drizzle-orm";
import { scheduleDailyBriefing } from "./scheduler.js";

export async function bootstrapSchedules() {
  const usersWithSchedules = await db.select({
    id: users.id,
    notificationTime: users.notificationTime,
    timezone: users.timezone,
  }).from(users).where(
    and(
      isNotNull(users.notificationTime),
      isNotNull(users.timezone)
    )
  );
  
  for (const user of usersWithSchedules) {
    await scheduleDailyBriefing(user.id, user.notificationTime!, user.timezone!);
  }
  
  console.log(`Bootstrapped ${usersWithSchedules.length} notification schedules`);
}
```

Call this once in `main()` after `app.listen()`:

```ts
// In index.ts, after app.listen():
import { bootstrapSchedules } from "./jobs/bootstrap.js";
await bootstrapSchedules();
```

## Admin vs Client Briefings

The worker checks the user's role and adjusts content:

| Content | Admin | Client (Agent) |
|---|---|---|
| Org-wide activity summary | ✅ | ❌ |
| All new leads across org | ✅ | ❌ |
| Own leads only | — | ✅ |
| Pipeline stage changes (all) | ✅ | ❌ |
| Own deal updates | — | ✅ |
| AI agent activity log | ✅ | ❌ |
| Follow-up reminders | ❌ | ✅ |
| Lead score changes | ✅ | — |
| Daily coaching tip | ❌ | ✅ |

## Redis Setup

Make sure Redis is running:

```bash
# Install if not present
sudo apt install redis-server

# Start
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify
redis-cli ping  # → PONG
```

Add to `.env`:
```
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Dependencies Already Installed

- `bullmq@^5.0.0` ✅
- `redis@^5.12.0` ✅

No new packages needed.

## Implementation Order

1. Add new columns to `users` table + `notification_settings` + `notification_log` tables to schema
2. Run migration: `pnpm db:generate && pnpm db:migrate`
3. Create `src/backend/jobs/` directory with connection, queues, scheduler
4. Create `daily-briefing` worker
5. Add API routes for notification settings
6. Add bootstrap call in `index.ts`
7. Wire up actual email/SMS delivery (nodemailer + twilio already in deps)
