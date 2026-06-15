CREATE TABLE "notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"channel" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"content" text,
	"metadata" jsonb,
	"scheduled_for" timestamp NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"admin_daily_digest" boolean DEFAULT false,
	"admin_pipeline_alerts" boolean DEFAULT true,
	"admin_agent_activity" boolean DEFAULT true,
	"admin_lead_score_changes" boolean DEFAULT true,
	"client_daily_briefing" boolean DEFAULT true,
	"client_follow_up_reminders" boolean DEFAULT true,
	"client_deal_updates" boolean DEFAULT true,
	"client_new_lead_alerts" boolean DEFAULT false,
	"quiet_hours_enabled" boolean DEFAULT false,
	"quiet_hours_start" varchar(5) DEFAULT '22:00',
	"quiet_hours_end" varchar(5) DEFAULT '07:00',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "voice_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" varchar(255) NOT NULL,
	"organization_id" uuid NOT NULL,
	"caller_phone" varchar(20),
	"caller_name" varchar(255),
	"mode" varchar(20) DEFAULT 'prospect' NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"duration_seconds" numeric(10, 2),
	"model" varchar(100),
	"llm_provider" varchar(50),
	"transcript" jsonb,
	"summary" text,
	"sentiment" varchar(20),
	"topics" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "voice_calls_call_id_unique" UNIQUE("call_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_time" varchar(5);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_channels" jsonb DEFAULT '{"email":true,"sms":false,"push":false}'::jsonb;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;