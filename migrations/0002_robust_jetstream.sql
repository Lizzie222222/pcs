CREATE TYPE "public"."duplicate_group_status" AS ENUM('new', 'reviewed', 'dismissed', 'merged');--> statement-breakpoint
CREATE TYPE "public"."duplicate_match_type" AS ENUM('email_domain', 'similar_name', 'same_postcode', 'same_address');--> statement-breakpoint
CREATE TYPE "public"."requirement_type" AS ENUM('standard', 'audit', 'action_plan');--> statement-breakpoint
CREATE TYPE "public"."sendgrid_sync_mode" AS ENUM('incremental', 'full');--> statement-breakpoint
CREATE TYPE "public"."sendgrid_sync_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
ALTER TYPE "public"."evidence_status" ADD VALUE 'revision_requested' BEFORE 'rejected';--> statement-breakpoint
ALTER TYPE "public"."program_stage" ADD VALUE 'above_and_beyond';--> statement-breakpoint
ALTER TYPE "public"."school_type" ADD VALUE 'kindergarten' BEFORE 'primary';--> statement-breakpoint
CREATE TABLE "duplicate_school_groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_type" "duplicate_match_type" NOT NULL,
	"match_value" varchar NOT NULL,
	"school_ids" text[] NOT NULL,
	"status" "duplicate_group_status" DEFAULT 'new',
	"resolved_by" varchar,
	"resolved_at" timestamp,
	"merged_into_school_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_recipient_groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"filters" jsonb NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sendgrid_sync_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "sendgrid_sync_status" DEFAULT 'pending',
	"mode" "sendgrid_sync_mode" DEFAULT 'incremental',
	"total_contacts" integer DEFAULT 0,
	"processed_contacts" integer DEFAULT 0,
	"synced_contacts" integer DEFAULT 0,
	"skipped_no_email" integer DEFAULT 0,
	"skipped_already_synced" integer DEFAULT 0,
	"failed_batches" integer DEFAULT 0,
	"current_batch" integer DEFAULT 0,
	"total_batches" integer DEFAULT 0,
	"error_message" text,
	"error_details" jsonb,
	"triggered_by" varchar,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"last_progress_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "admin_evidence_overrides" ADD COLUMN "evidence_id" varchar;--> statement-breakpoint
ALTER TABLE "audit_responses" ADD COLUMN "is_resubmission" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "audit_responses" ADD COLUMN "previous_review_notes" text;--> statement-breakpoint
ALTER TABLE "evidence" ADD COLUMN "is_bonus" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "evidence" ADD COLUMN "is_resubmission" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "evidence" ADD COLUMN "previous_review_notes" text;--> statement-breakpoint
ALTER TABLE "evidence_requirements" ADD COLUMN "requirement_type" "requirement_type" DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "reduction_promises" ADD COLUMN "review_status" "submission_status" DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "reduction_promises" ADD COLUMN "reviewed_by" varchar;--> statement-breakpoint
ALTER TABLE "reduction_promises" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "reduction_promises" ADD COLUMN "review_notes" text;--> statement-breakpoint
ALTER TABLE "reduction_promises" ADD COLUMN "is_resubmission" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "reduction_promises" ADD COLUMN "previous_review_notes" text;--> statement-breakpoint
ALTER TABLE "resource_packs" ADD COLUMN "cover_image_url" varchar;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "round_celebration_dismissed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "last_active_by" varchar;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "last_action_type" varchar;--> statement-breakpoint
ALTER TABLE "teacher_invitations" ADD COLUMN "message" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sendgrid_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "duplicate_school_groups" ADD CONSTRAINT "duplicate_school_groups_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_school_groups" ADD CONSTRAINT "duplicate_school_groups_merged_into_school_id_schools_id_fk" FOREIGN KEY ("merged_into_school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_recipient_groups" ADD CONSTRAINT "email_recipient_groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sendgrid_sync_jobs" ADD CONSTRAINT "sendgrid_sync_jobs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_duplicate_groups_status" ON "duplicate_school_groups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_duplicate_groups_match" ON "duplicate_school_groups" USING btree ("match_type","match_value");--> statement-breakpoint
CREATE INDEX "idx_recipient_groups_name" ON "email_recipient_groups" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_sendgrid_sync_jobs_status" ON "sendgrid_sync_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sendgrid_sync_jobs_started" ON "sendgrid_sync_jobs" USING btree ("started_at");--> statement-breakpoint
ALTER TABLE "admin_evidence_overrides" ADD CONSTRAINT "admin_evidence_overrides_evidence_id_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reduction_promises" ADD CONSTRAINT "reduction_promises_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_last_active_by_users_id_fk" FOREIGN KEY ("last_active_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_reduction_promises_review_status" ON "reduction_promises" USING btree ("review_status");