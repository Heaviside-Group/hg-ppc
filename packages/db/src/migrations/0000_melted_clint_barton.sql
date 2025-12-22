CREATE TYPE "public"."membership_role" AS ENUM('owner', 'admin', 'analyst', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."ad_account_status" AS ENUM('active', 'paused', 'disabled', 'pending');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('active', 'expired', 'revoked', 'error');--> statement-breakpoint
CREATE TYPE "public"."provider" AS ENUM('google_ads', 'meta');--> statement-breakpoint
CREATE TYPE "public"."campaign_objective" AS ENUM('conversions', 'leads', 'traffic', 'awareness', 'engagement', 'app_installs', 'video_views', 'other');--> statement-breakpoint
CREATE TYPE "public"."entity_status" AS ENUM('enabled', 'paused', 'removed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('sync:google:full', 'sync:google:daily', 'sync:meta:full', 'sync:meta:daily', 'sync:backfill');--> statement-breakpoint
CREATE TYPE "public"."log_level" AS ENUM('debug', 'info', 'warn', 'error');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"industry" text,
	"timezone" text DEFAULT 'America/New_York',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"hashed_password" text,
	"email_verified" timestamp,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"role" "membership_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ad_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid,
	"integration_id" uuid NOT NULL,
	"provider" "provider" NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'USD',
	"timezone" text,
	"status" "ad_account_status" DEFAULT 'active' NOT NULL,
	"last_sync_at" timestamp,
	"last_sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"encrypted_blob" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"expires_at" timestamp,
	"scopes" jsonb,
	"token_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "integration_credentials_integration_id_unique" UNIQUE("integration_id")
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider" "provider" NOT NULL,
	"status" "integration_status" DEFAULT 'active' NOT NULL,
	"manager_account_id" text,
	"business_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid,
	"campaign_id" uuid NOT NULL,
	"provider" "provider" NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "entity_status" DEFAULT 'unknown' NOT NULL,
	"bid_strategy_type" text,
	"target_cpa_micros" bigint,
	"target_roas" text,
	"raw_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid,
	"ad_group_id" uuid NOT NULL,
	"provider" "provider" NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "entity_status" DEFAULT 'unknown' NOT NULL,
	"ad_type" text,
	"creative_json" jsonb,
	"raw_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid,
	"ad_account_id" uuid NOT NULL,
	"provider" "provider" NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "entity_status" DEFAULT 'unknown' NOT NULL,
	"objective" "campaign_objective",
	"daily_budget_micros" bigint,
	"lifetime_budget_micros" bigint,
	"raw_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "perf_ad_daily" (
	"workspace_id" uuid NOT NULL,
	"client_id" uuid,
	"ad_id" uuid NOT NULL,
	"provider" "provider" NOT NULL,
	"date" date NOT NULL,
	"impressions" bigint DEFAULT 0 NOT NULL,
	"clicks" bigint DEFAULT 0 NOT NULL,
	"spend_micros" bigint DEFAULT 0 NOT NULL,
	"conversions" real DEFAULT 0 NOT NULL,
	"conversion_value" real DEFAULT 0 NOT NULL,
	"ctr" real,
	"cpc" real,
	"cpm" real,
	"cpa" real,
	"roas" real,
	"provider_metrics" jsonb,
	CONSTRAINT "perf_ad_daily_ad_id_date_pk" PRIMARY KEY("ad_id","date")
);
--> statement-breakpoint
CREATE TABLE "perf_ad_group_daily" (
	"workspace_id" uuid NOT NULL,
	"client_id" uuid,
	"ad_group_id" uuid NOT NULL,
	"provider" "provider" NOT NULL,
	"date" date NOT NULL,
	"impressions" bigint DEFAULT 0 NOT NULL,
	"clicks" bigint DEFAULT 0 NOT NULL,
	"spend_micros" bigint DEFAULT 0 NOT NULL,
	"conversions" real DEFAULT 0 NOT NULL,
	"conversion_value" real DEFAULT 0 NOT NULL,
	"ctr" real,
	"cpc" real,
	"cpm" real,
	"cpa" real,
	"roas" real,
	"provider_metrics" jsonb,
	CONSTRAINT "perf_ad_group_daily_ad_group_id_date_pk" PRIMARY KEY("ad_group_id","date")
);
--> statement-breakpoint
CREATE TABLE "perf_campaign_daily" (
	"workspace_id" uuid NOT NULL,
	"client_id" uuid,
	"campaign_id" uuid NOT NULL,
	"provider" "provider" NOT NULL,
	"date" date NOT NULL,
	"impressions" bigint DEFAULT 0 NOT NULL,
	"clicks" bigint DEFAULT 0 NOT NULL,
	"spend_micros" bigint DEFAULT 0 NOT NULL,
	"conversions" real DEFAULT 0 NOT NULL,
	"conversion_value" real DEFAULT 0 NOT NULL,
	"ctr" real,
	"cpc" real,
	"cpm" real,
	"cpa" real,
	"roas" real,
	"provider_metrics" jsonb,
	CONSTRAINT "perf_campaign_daily_campaign_id_date_pk" PRIMARY KEY("campaign_id","date")
);
--> statement-breakpoint
CREATE TABLE "sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"integration_id" uuid NOT NULL,
	"type" "job_type" NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"config" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error" text,
	"metadata" jsonb,
	"bullmq_job_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"level" "log_level" DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"context" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_groups" ADD CONSTRAINT "ad_groups_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_groups" ADD CONSTRAINT "ad_groups_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_groups" ADD CONSTRAINT "ad_groups_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads" ADD CONSTRAINT "ads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads" ADD CONSTRAINT "ads_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads" ADD CONSTRAINT "ads_ad_group_id_ad_groups_id_fk" FOREIGN KEY ("ad_group_id") REFERENCES "public"."ad_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_ad_account_id_ad_accounts_id_fk" FOREIGN KEY ("ad_account_id") REFERENCES "public"."ad_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perf_ad_daily" ADD CONSTRAINT "perf_ad_daily_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perf_ad_daily" ADD CONSTRAINT "perf_ad_daily_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perf_ad_daily" ADD CONSTRAINT "perf_ad_daily_ad_id_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perf_ad_group_daily" ADD CONSTRAINT "perf_ad_group_daily_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perf_ad_group_daily" ADD CONSTRAINT "perf_ad_group_daily_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perf_ad_group_daily" ADD CONSTRAINT "perf_ad_group_daily_ad_group_id_ad_groups_id_fk" FOREIGN KEY ("ad_group_id") REFERENCES "public"."ad_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perf_campaign_daily" ADD CONSTRAINT "perf_campaign_daily_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perf_campaign_daily" ADD CONSTRAINT "perf_campaign_daily_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perf_campaign_daily" ADD CONSTRAINT "perf_campaign_daily_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_job_id_sync_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."sync_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_memberships_user_workspace_idx" ON "workspace_memberships" USING btree ("user_id","workspace_id");--> statement-breakpoint
CREATE INDEX "ad_accounts_workspace_provider_idx" ON "ad_accounts" USING btree ("workspace_id","provider");--> statement-breakpoint
CREATE INDEX "ad_accounts_external_id_idx" ON "ad_accounts" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "integrations_workspace_provider_idx" ON "integrations" USING btree ("workspace_id","provider");--> statement-breakpoint
CREATE INDEX "ad_groups_workspace_provider_idx" ON "ad_groups" USING btree ("workspace_id","provider");--> statement-breakpoint
CREATE INDEX "ad_groups_campaign_idx" ON "ad_groups" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "ad_groups_external_id_idx" ON "ad_groups" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "ads_workspace_provider_idx" ON "ads" USING btree ("workspace_id","provider");--> statement-breakpoint
CREATE INDEX "ads_ad_group_idx" ON "ads" USING btree ("ad_group_id");--> statement-breakpoint
CREATE INDEX "ads_external_id_idx" ON "ads" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "campaigns_workspace_provider_idx" ON "campaigns" USING btree ("workspace_id","provider");--> statement-breakpoint
CREATE INDEX "campaigns_ad_account_idx" ON "campaigns" USING btree ("ad_account_id");--> statement-breakpoint
CREATE INDEX "campaigns_external_id_idx" ON "campaigns" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "perf_ad_daily_workspace_date_idx" ON "perf_ad_daily" USING btree ("workspace_id","date");--> statement-breakpoint
CREATE INDEX "perf_ad_daily_client_date_idx" ON "perf_ad_daily" USING btree ("client_id","date");--> statement-breakpoint
CREATE INDEX "perf_ad_group_daily_workspace_date_idx" ON "perf_ad_group_daily" USING btree ("workspace_id","date");--> statement-breakpoint
CREATE INDEX "perf_ad_group_daily_client_date_idx" ON "perf_ad_group_daily" USING btree ("client_id","date");--> statement-breakpoint
CREATE INDEX "perf_campaign_daily_workspace_date_idx" ON "perf_campaign_daily" USING btree ("workspace_id","date");--> statement-breakpoint
CREATE INDEX "perf_campaign_daily_client_date_idx" ON "perf_campaign_daily" USING btree ("client_id","date");--> statement-breakpoint
CREATE INDEX "sync_jobs_workspace_idx" ON "sync_jobs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "sync_jobs_integration_idx" ON "sync_jobs" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "sync_jobs_status_idx" ON "sync_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sync_jobs_created_at_idx" ON "sync_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sync_logs_job_idx" ON "sync_logs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "sync_logs_timestamp_idx" ON "sync_logs" USING btree ("timestamp");