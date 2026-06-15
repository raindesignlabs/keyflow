/**
 * KeyFlow CRM — Contact Engine Database Schema
 *
 * Core tables: contacts, activities, smart_lists, pipelines, deals
 * Uses Drizzle ORM with PostgreSQL
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────────────

export const contactStatusEnum = pgEnum("contact_status", [
  "new",
  "contacted",
  "qualified",
  "negotiation",
  "closed_won",
  "closed_lost",
  "nurture",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "call",
  "text",
  "email",
  "note",
  "ai_interaction",
  "website_visit",
  "appointment",
  "deal_update",
]);

export const dealStageEnum = pgEnum("deal_stage", [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
]);

// ── Organizations ──────────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 100 }),
  website: varchar("website", { length: 500 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  metadata: jsonb("metadata"), // flexible key-value store
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Contacts ───────────────────────────────────────────────────────────

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  status: contactStatusEnum("status").default("new").notNull(),
  leadScore: integer("lead_score").default(0), // AI-calculated 0-100
  source: varchar("source", { length: 100 }), // where this lead came from
  organizationId: uuid("organization_id").references(() => organizations.id),
  tags: jsonb("tags").$type<string[]>().default([]),
  customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),
  // AI voice/style profile for this contact's communication preferences
  communicationStyle: jsonb("communication_style").$type<{
    tone?: string;
    preferredChannel?: "email" | "text" | "phone";
    responseTime?: string; // "fast", "moderate", "slow"
    notes?: string;
  }>(),
  lastContactedAt: timestamp("last_contacted_at"),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Activities (Timeline) ──────────────────────────────────────────────

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id")
    .references(() => contacts.id, { onDelete: "cascade" })
    .notNull(),
  type: activityTypeEnum("type").notNull(),
  direction: varchar("direction", { length: 10 }), // "inbound" | "outbound"
  subject: varchar("subject", { length: 500 }),
  body: text("body"),
  // AI-generated summary of this activity
  aiSummary: text("ai_summary"),
  // For AI interactions: what the agent did
  aiAction: varchar("ai_action", { length: 100 }),
  // Status: for drafts awaiting approval
  status: varchar("status", { length: 20 }).default("completed"), // "draft" | "pending_approval" | "approved" | "sent" | "completed"
  metadata: jsonb("metadata"), // channel-specific data (message IDs, call duration, etc.)
  userId: uuid("user_id"), // who performed or triggered this
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Smart Lists ────────────────────────────────────────────────────────

export const smartLists = pgTable("smart_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).default("custom"), // "ai_suggested" | "custom"
  // Filter rules (JSON query format)
  filters: jsonb("filters").$type<{
    conditions: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
    logic?: "and" | "or";
  }>(),
  aiPrompt: text("ai_prompt"), // natural language description for AI-generated lists
  isPinned: boolean("is_pinned").default(false),
  userId: uuid("user_id").notNull(),
  lastRefreshedAt: timestamp("last_refreshed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Pipelines ──────────────────────────────────────────────────────────

export const pipelines = pgTable("pipelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  stages: jsonb("stages")
    .$type<string[]>()
    .notNull()
    .default(["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]),
  isDefault: boolean("is_default").default(false),
  organizationId: uuid("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Deals ──────────────────────────────────────────────────────────────

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  contactId: uuid("contact_id")
    .references(() => contacts.id)
    .notNull(),
  pipelineId: uuid("pipeline_id")
    .references(() => pipelines.id)
    .notNull(),
  stage: varchar("stage", { length: 50 }).default("lead").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }),
  commission: decimal("commission", { precision: 12, scale: 2 }),
  closeDate: timestamp("close_date"),
  probability: integer("probability"), // 0-100, AI-calculated
  notes: text("notes"),
  assignedUserId: uuid("assigned_user_id"),
  aiNextAction: text("ai_next_action"), // AI-suggested next step
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Automations ────────────────────────────────────────────────────────

export const automations = pgTable("automations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  enabled: boolean("enabled").default(true),
  // Trigger definition
  trigger: jsonb("trigger")
    .$type<{
      event: string; // "new_lead", "stage_change", "email_open", "time_based", etc.
      conditions?: Record<string, unknown>;
    }>()
    .notNull(),
  // Actions to execute
  actions: jsonb("actions")
    .$type<
      Array<{
        type: string; // "send_email", "send_text", "create_task", "update_field", "trigger_ai", etc.
        params: Record<string, unknown>;
        requiresApproval?: boolean;
      }>
    >()
    .notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Properties (Real Estate) ──────────────────────────────────────────────

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id")
    .references(() => contacts.id, { onDelete: "cascade" })
    .notNull(),
  // Property details
  address: text("address").notNull(),
  yearBuilt: integer("year_built"),
  yearPurchased: integer("year_purchased"),
  bedrooms: integer("bedrooms"),
  fullBathrooms: integer("full_bathrooms"),
  halfBathrooms: integer("half_bathrooms"),
  garageType: varchar("garage_type", { length: 50 }), // "attached", "detached", "carport"
  garageCapacity: integer("garage_capacity"),
  // Utilities
  electricProvider: varchar("electric_provider", { length: 100 }),
  electricAvgBill: varchar("electric_avg_bill", { length: 50 }),
  waterProvider: varchar("water_provider", { length: 100 }),
  waterAvgBill: varchar("water_avg_bill", { length: 50 }),
  trashProvider: varchar("trash_provider", { length: 100 }),
  trashAvgBill: varchar("trash_avg_bill", { length: 50 }),
  internetProvider: varchar("internet_provider", { length: 100 }),
  internetAvgBill: varchar("internet_avg_bill", { length: 50 }),
  internetSpeed: varchar("internet_speed", { length: 50 }),
  // Major systems
  heatingType: varchar("heating_type", { length: 100 }),
  heatingAge: varchar("heating_age", { length: 50 }),
  coolingType: varchar("cooling_type", { length: 100 }),
  coolingAge: varchar("cooling_age", { length: 50 }),
  waterHeaterType: varchar("water_heater_type", { length: 50 }),
  roofType: varchar("roof_type", { length: 50 }),
  roofAge: varchar("roof_age", { length: 50 }),
  // Exterior & lot
  septicSewer: varchar("septic_sewer", { length: 20 }), // "septic", "sewer"
  septicSize: varchar("septic_size", { length: 50 }),
  septicLastCleaned: varchar("septic_last_cleaned", { length: 50 }),
  waterSource: varchar("water_source", { length: 100 }),
  // Security
  securitySystem: varchar("security_system", { length: 100 }),
  camerasConvey: varchar("cameras_convey", { length: 20 }), // "convey", "not_convey"
  // Financial
  insuranceCompany: varchar("insurance_company", { length: 100 }),
  insuranceAnnualPremium: varchar("insurance_annual_premium", { length: 50 }),
  annualTaxes: varchar("annual_taxes", { length: 50 }),
  // Service contracts
  termiteCompany: varchar("termite_company", { length: 100 }),
  termiteAnnualCost: varchar("termite_annual_cost", { length: 50 }),
  // Notes (flexible storage for things that don't fit elsewhere)
  appliancesNotes: text("appliances_notes"),
  negotiationItems: text("negotiation_items"),
  marketingLoveNotes: text("marketing_love_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Users (within an organization) ─────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).default("agent").notNull(), // "owner" | "admin" | "agent"
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  phone: varchar("phone", { length: 20 }),
  // User's communication style (for AI to match when drafting messages)
  voiceProfile: jsonb("voice_profile").$type<{
    tone?: string;
    exampleMessages?: string[];
    phrasesToAvoid?: string[];
    signature?: string;
    styleNotes?: string;
  }>(),
  // Notification scheduling (client sets in settings screen)
  notificationTime: varchar("notification_time", { length: 5 }), // "HH:MM" in user's local time, e.g. "06:00"
  timezone: varchar("timezone", { length: 50 }), // IANA timezone, e.g. "America/Los_Angeles"
  notificationChannels: jsonb("notification_channels").$type<{
    email: boolean;
    sms: boolean;
    push: boolean;
  }>().default({ email: true, sms: false, push: false }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Voice Calls (RDL Voice Agent Integration) ──────────────────────────────

export const voiceCalls = pgTable("voice_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: varchar("call_id", { length: 255 }).notNull().unique(), // Twilio call_id or internal ID
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  // Caller info
  callerPhone: varchar("caller_phone", { length: 20 }),
  callerName: varchar("caller_name", { length: 255 }),
  mode: varchar("mode", { length: 20 }).default("prospect").notNull(), // "prospect", "admin", "client"
  // Call timing & duration
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  durationSeconds: decimal("duration_seconds", { precision: 10, scale: 2 }),
  // AI & model info
  model: varchar("model", { length: 100 }), // e.g., "gpt-4o-mini", "glm-4.6", "claude-haiku-4-5"
  llmProvider: varchar("llm_provider", { length: 50 }), // "openai", "z.ai", "anthropic"
  // Full conversation transcript
  transcript: jsonb("transcript").$type<Array<{ role: string; content: string }>>(),
  // Summary & metadata
  summary: text("summary"),
  sentiment: varchar("sentiment", { length: 20 }), // "positive", "neutral", "negative"
  topics: jsonb("topics").$type<string[]>().default([]), // ["scheduling", "inquiry", ...]
  metadata: jsonb("metadata"), // flexible key-value store
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Notification Settings ─────────────────────────────────────────────

export const notificationSettings = pgTable("notification_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  // Admin-specific
  adminDailyDigest: boolean("admin_daily_digest").default(false),
  adminPipelineAlerts: boolean("admin_pipeline_alerts").default(true),
  adminAgentActivity: boolean("admin_agent_activity").default(true),
  adminLeadScoreChanges: boolean("admin_lead_score_changes").default(true),
  // Client/Agent-specific
  clientDailyBriefing: boolean("client_daily_briefing").default(true),
  clientFollowUpReminders: boolean("client_follow_up_reminders").default(true),
  clientDealUpdates: boolean("client_deal_updates").default(true),
  clientNewLeadAlerts: boolean("client_new_lead_alerts").default(false),
  // Quiet hours
  quietHoursEnabled: boolean("quiet_hours_enabled").default(false),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }).default("22:00"),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }).default("07:00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Notification Log ──────────────────────────────────────────────────

export const notificationLog = pgTable("notification_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: varchar("type", { length: 50 }).notNull(), // "daily_briefing", "pipeline_alert", "lead_alert"
  channel: varchar("channel", { length: 20 }).notNull(), // "email", "sms", "push"
  status: varchar("status", { length: 20 }).default("pending").notNull(), // "pending", "sent", "failed"
  content: text("content"),
  metadata: jsonb("metadata"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ════════════════════════════════════════════════════════════════════════
// QUICK WIN #1: AI Content Studio
// ════════════════════════════════════════════════════════════════════════

export const contentDrafts = pgTable("content_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  // Content metadata
  type: varchar("type", { length: 50 }).notNull(), // "property_description", "follow_up_email", "social_caption", "listing_copy", "market_update"
  title: varchar("title", { length: 255 }),
  // The generated content
  content: text("content").notNull(),
  // Input context that generated this draft
  prompt: text("prompt"),
  // Links to CRM records (optional)
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  dealId: uuid("deal_id").references(() => deals.id, { onDelete: "set null" }),
  // Status workflow (drafts-for-approval model)
  status: varchar("status", { length: 20 }).default("draft").notNull(), // "draft", "approved", "sent", "archived"
  // AI generation metadata
  model: varchar("model", { length: 100 }),
  voiceProfileUsed: boolean("voice_profile_used").default(false),
  // Variants (if user requested multiple options)
  variants: jsonb("variants").$type<string[]>(), // alternative versions
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ════════════════════════════════════════════════════════════════════════
// QUICK WIN #2: Transaction Checklists
// ════════════════════════════════════════════════════════════════════════

export const dealTasks = pgTable("deal_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  // Task details
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("general"), // "listing", "offer", "inspection", "financing", "title", "closing", "general"
  // Which deal stage triggers this task
  triggerStage: varchar("trigger_stage", { length: 50 }), // stage name that auto-creates this task
  // Ordering within a category
  sortOrder: integer("sort_order").default(0),
  // Status
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  completedBy: uuid("completed_by"),
  // Due date (calculated from deal stage change or manual)
  dueDate: timestamp("due_date"),
  // Assignee
  assignedUserId: uuid("assigned_user_id"),
  // Whether this was auto-generated from a template
  isAutoGenerated: boolean("is_auto_generated").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ════════════════════════════════════════════════════════════════════════
// QUICK WIN #3: Self-Booking Links
// ════════════════════════════════════════════════════════════════════════

export const bookingLinks = pgTable("booking_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  // Public slug for the URL (e.g. keyflow.raindesignlabs.net/book/abc123)
  slug: varchar("slug", { length: 32 }).notNull().unique(),
  // Link config
  title: varchar("title", { length: 255 }).notNull(), // "Listing Consultation", "Buyer Meeting", etc.
  description: text("description"),
  // Available days & time slots (stored as JSON for flexibility)
  availability: jsonb("availability").$type<{
    days: number[]; // 0=Sun, 6=Sat
    slots: string[]; // ["09:00", "10:00", "11:00", "14:00"]
  }>().notNull(),
  // Meeting duration in minutes
  durationMinutes: integer("duration_minutes").default(30).notNull(),
  // Meeting type
  meetingType: varchar("meeting_type", { length: 20 }).default("in_person"), // "in_person", "phone", "video"
  // Location/link for the meeting
  location: varchar("location", { length: 500 }),
  // Buffer between meetings (minutes)
  bufferMinutes: integer("buffer_minutes").default(15),
  // How far ahead can someone book (days)
  maxAdvanceDays: integer("max_advance_days").default(30),
  // Active toggle
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingLinkId: uuid("booking_link_id").references(() => bookingLinks.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  // Prospect info (from the public form — may or may not be in CRM yet)
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  prospectName: varchar("prospect_name", { length: 255 }).notNull(),
  prospectEmail: varchar("prospect_email", { length: 255 }).notNull(),
  prospectPhone: varchar("prospect_phone", { length: 20 }),
  prospectNotes: text("prospect_notes"),
  // Booking details
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").default(30).notNull(),
  timezone: varchar("timezone", { length: 50 }),
  // Status
  status: varchar("status", { length: 20 }).default("confirmed").notNull(), // "confirmed", "cancelled", "completed", "no_show"
  // Cancellation
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ════════════════════════════════════════════════════════════════════════
// QUICK WIN #4: Open House QR Sign-In
// ════════════════════════════════════════════════════════════════════════

export const openHouseEvents = pgTable("open_house_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  // Event details
  title: varchar("title", { length: 255 }).notNull(),
  propertyAddress: text("property_address").notNull(),
  // Link to property record (optional)
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  // Public slug for QR URL
  slug: varchar("slug", { length: 32 }).notNull().unique(),
  // Schedule
  scheduledDate: timestamp("scheduled_date").notNull(),
  endTime: timestamp("end_time"),
  // Custom sign-in questions (JSON array of {field, label, type, required})
  customQuestions: jsonb("custom_questions").$type<Array<{
    field: string;
    label: string;
    type: "text" | "email" | "phone" | "select" | "checkbox";
    options?: string[];
    required?: boolean;
  }>>().default([]),
  // Stats (denormalized for quick dashboard display)
  signInCount: integer("sign_in_count").default(0).notNull(),
  // Status
  status: varchar("status", { length: 20 }).default("scheduled").notNull(), // "scheduled", "live", "ended", "cancelled"
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
