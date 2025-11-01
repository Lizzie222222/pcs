CREATE TYPE "public"."access_type" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."activity_status" AS ENUM('idle', 'viewing_dashboard', 'reviewing_evidence', 'editing_case_study', 'editing_event', 'managing_schools', 'managing_users', 'managing_resources');--> statement-breakpoint
CREATE TYPE "public"."audit_status" AS ENUM('draft', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."case_study_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('workshop', 'webinar', 'community_event', 'training', 'celebration', 'assembly', 'other');--> statement-breakpoint
CREATE TYPE "public"."evidence_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."form_type" AS ENUM('audit', 'action_plan');--> statement-breakpoint
CREATE TYPE "public"."health_check_status" AS ENUM('healthy', 'degraded', 'down');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('processing', 'completed', 'failed', 'partial');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('image', 'video', 'document', 'audio');--> statement-breakpoint
CREATE TYPE "public"."migration_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('new_resource', 'resource_updated', 'evidence_reviewed', 'evidence_assigned', 'stage_completed', 'general');--> statement-breakpoint
CREATE TYPE "public"."page_published_status" AS ENUM('draft', 'coming_soon', 'published');--> statement-breakpoint
CREATE TYPE "public"."photo_consent_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."program_stage" AS ENUM('inspire', 'investigate', 'act');--> statement-breakpoint
CREATE TYPE "public"."promise_status" AS ENUM('active', 'achieved', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."recipient_type" AS ENUM('all_teachers', 'custom');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('registered', 'attended', 'cancelled', 'waitlisted');--> statement-breakpoint
CREATE TYPE "public"."request_type" AS ENUM('join_school');--> statement-breakpoint
CREATE TYPE "public"."resource_theme" AS ENUM('ocean_literacy', 'climate_change', 'plastic_pollution', 'science', 'design_technology', 'geography', 'cross_curricular', 'enrichment', 'student_action');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('lesson_plan', 'assembly', 'teacher_toolkit', 'student_workbook', 'printable_activities');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('draft', 'pending_review', 'approved', 'rejected', 'published');--> statement-breakpoint
CREATE TYPE "public"."school_role" AS ENUM('head_teacher', 'teacher', 'pending_teacher');--> statement-breakpoint
CREATE TYPE "public"."school_type" AS ENUM('primary', 'secondary', 'high_school', 'international', 'other');--> statement-breakpoint
CREATE TYPE "public"."storage_scope" AS ENUM('global', 'school');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'approved', 'rejected', 'revision_requested');--> statement-breakpoint
CREATE TYPE "public"."user_activity_action" AS ENUM('login', 'logout', 'register', 'evidence_submit', 'evidence_approve', 'evidence_reject', 'evidence_delete', 'school_create', 'school_update', 'audit_submit', 'audit_approve', 'audit_reject', 'promise_create', 'promise_update', 'promise_delete', 'user_invite', 'user_remove', 'resource_create', 'resource_update', 'resource_delete', 'case_study_create', 'case_study_update', 'case_study_publish', 'case_study_delete', 'event_create', 'event_update', 'event_delete', 'event_register', 'email_send', 'settings_update', 'role_change', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('teacher', 'admin', 'partner', 'school');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'private', 'registered');--> statement-breakpoint
CREATE TABLE "admin_invitations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invited_by" varchar,
	"email" varchar NOT NULL,
	"token" varchar NOT NULL,
	"role" varchar DEFAULT 'admin',
	"status" "invitation_status" DEFAULT 'pending',
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	CONSTRAINT "admin_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"action" varchar NOT NULL,
	"target_type" varchar NOT NULL,
	"target_id" varchar NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_responses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" varchar NOT NULL,
	"submitted_by" varchar NOT NULL,
	"status" "audit_status" DEFAULT 'draft',
	"part1_data" jsonb DEFAULT '{}',
	"part2_data" jsonb DEFAULT '{}',
	"part3_data" jsonb DEFAULT '{}',
	"part4_data" jsonb DEFAULT '{}',
	"results_data" jsonb DEFAULT '{}',
	"total_plastic_items" integer DEFAULT 0,
	"top_problem_plastics" jsonb DEFAULT '[]',
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_notes" text,
	"current_part" integer DEFAULT 1,
	"completed_at" timestamp,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "case_studies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evidence_id" varchar,
	"school_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"stage" "program_stage" NOT NULL,
	"impact" text,
	"image_url" varchar,
	"featured" boolean DEFAULT false,
	"priority" integer DEFAULT 0,
	"images" jsonb DEFAULT '[]',
	"videos" jsonb DEFAULT '[]',
	"student_quotes" jsonb DEFAULT '[]',
	"impact_metrics" jsonb DEFAULT '[]',
	"timeline_sections" jsonb DEFAULT '[]',
	"categories" jsonb DEFAULT '[]',
	"tags" jsonb DEFAULT '[]',
	"status" "case_study_status" DEFAULT 'draft',
	"template_type" varchar,
	"before_image" varchar,
	"after_image" varchar,
	"meta_description" text,
	"meta_keywords" text,
	"review_status" "review_status" DEFAULT 'draft',
	"submitted_at" timestamp,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "case_study_review_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_study_id" varchar NOT NULL,
	"user_id" varchar,
	"comment" text NOT NULL,
	"action" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "case_study_tag_relations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_study_id" varchar NOT NULL,
	"tag_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "case_study_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"description" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "case_study_tags_name_unique" UNIQUE("name"),
	CONSTRAINT "case_study_tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "case_study_versions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_study_id" varchar NOT NULL,
	"version_number" integer NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"stage" "program_stage" NOT NULL,
	"status" "case_study_status" DEFAULT 'draft',
	"impact" text,
	"images" jsonb DEFAULT '[]',
	"videos" jsonb DEFAULT '[]',
	"student_quotes" jsonb DEFAULT '[]',
	"impact_metrics" jsonb DEFAULT '[]',
	"timeline_sections" jsonb DEFAULT '[]',
	"template_type" varchar,
	"before_image" varchar,
	"after_image" varchar,
	"snapshot" jsonb,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" varchar NOT NULL,
	"stage" "program_stage" NOT NULL,
	"issued_by" varchar,
	"certificate_number" varchar NOT NULL,
	"completed_date" timestamp NOT NULL,
	"issued_date" timestamp DEFAULT now(),
	"title" varchar NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}',
	"shareable_url" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "certificates_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_locks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_type" varchar NOT NULL,
	"document_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"acquired_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_email" varchar NOT NULL,
	"recipient_id" varchar,
	"subject" varchar NOT NULL,
	"template" varchar,
	"status" varchar DEFAULT 'sent',
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_announcements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"recipient_type" "recipient_type" NOT NULL,
	"campaign_id" varchar,
	"announcement_type" varchar NOT NULL,
	"sent_by" varchar,
	"sent_at" timestamp DEFAULT now(),
	"recipient_count" integer NOT NULL,
	"status" varchar DEFAULT 'sent'
);
--> statement-breakpoint
CREATE TABLE "event_banners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"event_id" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"background_color" varchar DEFAULT '#0B3D5D',
	"text_color" varchar DEFAULT '#FFFFFF',
	"gradient" varchar DEFAULT 'ocean',
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_link_clicks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"user_id" varchar,
	"clicked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"school_id" varchar,
	"status" "registration_status" DEFAULT 'registered',
	"registered_at" timestamp DEFAULT now(),
	"cancelled_at" timestamp,
	"attended_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "event_resource_downloads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"user_id" varchar,
	"file_index" integer NOT NULL,
	"file_name" varchar NOT NULL,
	"downloaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_resources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"resource_id" varchar NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"event_type" "event_type" NOT NULL,
	"status" "event_status" DEFAULT 'draft',
	"start_date_time" timestamp NOT NULL,
	"end_date_time" timestamp NOT NULL,
	"timezone" varchar DEFAULT 'UTC',
	"location" text,
	"is_virtual" boolean DEFAULT false,
	"meeting_link" varchar,
	"image_url" varchar,
	"capacity" integer,
	"waitlist_enabled" boolean DEFAULT false,
	"registration_deadline" timestamp,
	"tags" text[] DEFAULT ARRAY[]::text[],
	"public_slug" varchar,
	"youtube_videos" jsonb,
	"event_pack_files" jsonb,
	"testimonials" jsonb,
	"access_token" varchar,
	"reminder_sent_at" timestamp,
	"is_pre_recorded" boolean DEFAULT false,
	"recording_available_from" timestamp,
	"page_published_status" "page_published_status" DEFAULT 'draft',
	"access_type" "access_type" DEFAULT 'open',
	"title_translations" jsonb,
	"description_translations" jsonb,
	"youtube_video_translations" jsonb,
	"event_pack_file_translations" jsonb,
	"testimonial_translations" jsonb,
	"featured_video_index" integer DEFAULT 0,
	"event_pack_banner_image_url" varchar,
	"show_evidence_submission" boolean DEFAULT false,
	"evidence_submission_text" jsonb,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" varchar NOT NULL,
	"submitted_by" varchar NOT NULL,
	"evidence_requirement_id" varchar,
	"title" varchar NOT NULL,
	"description" text,
	"stage" "program_stage" NOT NULL,
	"status" "evidence_status" DEFAULT 'pending',
	"visibility" "visibility" DEFAULT 'registered',
	"files" jsonb DEFAULT '[]',
	"video_links" text,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_notes" text,
	"assigned_to" varchar,
	"is_featured" boolean DEFAULT false,
	"is_audit_quiz" boolean DEFAULT false,
	"round_number" integer DEFAULT 1,
	"has_children" boolean DEFAULT false,
	"parental_consent_files" jsonb DEFAULT '[]',
	"submitted_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evidence_requirements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage" "program_stage" NOT NULL,
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"order_index" integer NOT NULL,
	"resource_ids" text[] DEFAULT ARRAY[]::text[],
	"custom_links" jsonb DEFAULT '[]',
	"translations" jsonb DEFAULT '{}',
	"language_specific_resources" jsonb DEFAULT '{}',
	"language_specific_links" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "health_checks" (
	"id" varchar PRIMARY KEY NOT NULL,
	"endpoint" varchar NOT NULL,
	"status" "health_check_status" NOT NULL,
	"response_time" integer,
	"error_message" text,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"imported_by" varchar,
	"status" "import_status" DEFAULT 'processing',
	"total_records" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"schools_imported" integer DEFAULT 0,
	"users_imported" integer DEFAULT 0,
	"relationships_imported" integer DEFAULT 0,
	"errors" jsonb DEFAULT '[]',
	"metadata" jsonb DEFAULT '{}',
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mailchimp_audiences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mailchimp_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"member_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "mailchimp_audiences_mailchimp_id_unique" UNIQUE("mailchimp_id")
);
--> statement-breakpoint
CREATE TABLE "mailchimp_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audience_id" varchar NOT NULL,
	"email" varchar NOT NULL,
	"user_id" varchar,
	"school_id" varchar,
	"status" varchar DEFAULT 'subscribed',
	"subscribed_at" timestamp DEFAULT now(),
	"tags" jsonb DEFAULT '[]',
	"merge_fields" jsonb DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "media_asset_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" varchar NOT NULL,
	"tag_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "media_asset_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" varchar NOT NULL,
	"usage_type" varchar NOT NULL,
	"reference_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_key" varchar NOT NULL,
	"filename" varchar NOT NULL,
	"mime_type" varchar NOT NULL,
	"file_size" integer NOT NULL,
	"media_type" "media_type" NOT NULL,
	"storage_scope" "storage_scope" DEFAULT 'global',
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"alt_text" text,
	"description" text,
	"uploaded_by" varchar,
	"school_id" varchar,
	"visibility" "visibility" DEFAULT 'registered',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "media_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "media_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "migration_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "migration_status" DEFAULT 'pending',
	"total_rows" integer DEFAULT 0,
	"valid_rows" integer DEFAULT 0,
	"skipped_rows" integer DEFAULT 0,
	"processed_rows" integer DEFAULT 0,
	"failed_rows" integer DEFAULT 0,
	"users_created" integer DEFAULT 0,
	"schools_created" integer DEFAULT 0,
	"dry_run" boolean DEFAULT false,
	"error_log" jsonb DEFAULT '[]',
	"report_data" jsonb,
	"csv_file_name" varchar,
	"performed_by" varchar,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" varchar,
	"user_id" varchar,
	"type" "notification_type" NOT NULL,
	"title" varchar NOT NULL,
	"message" text NOT NULL,
	"action_url" varchar,
	"link_url" varchar,
	"resource_id" varchar,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "printable_form_submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" varchar NOT NULL,
	"submitted_by" varchar NOT NULL,
	"form_type" "form_type" NOT NULL,
	"file_path" varchar NOT NULL,
	"original_filename" varchar NOT NULL,
	"status" "submission_status" DEFAULT 'pending',
	"submitted_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"reviewed_by" varchar,
	"review_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reduction_promises" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" varchar NOT NULL,
	"audit_id" varchar,
	"plastic_item_type" varchar NOT NULL,
	"plastic_item_label" varchar NOT NULL,
	"baseline_quantity" integer NOT NULL,
	"target_quantity" integer NOT NULL,
	"reduction_amount" integer NOT NULL,
	"timeframe_unit" varchar NOT NULL,
	"status" "promise_status" DEFAULT 'active',
	"notes" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resource_pack_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" varchar NOT NULL,
	"resource_id" varchar NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resource_packs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"stage" "program_stage" NOT NULL,
	"theme" "resource_theme",
	"visibility" "visibility" DEFAULT 'public',
	"is_active" boolean DEFAULT true,
	"download_count" integer DEFAULT 0,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"stage" "program_stage" NOT NULL,
	"age_range" varchar,
	"language" varchar DEFAULT 'English',
	"languages" text[],
	"country" varchar,
	"resource_type" "resource_type",
	"theme" "resource_theme",
	"themes" text[],
	"tags" text[],
	"file_url" varchar,
	"file_type" varchar,
	"file_size" integer,
	"download_count" integer DEFAULT 0,
	"visibility" "visibility" DEFAULT 'public',
	"is_active" boolean DEFAULT true,
	"hidden_on_resources_page" boolean DEFAULT false,
	"is_pinned" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "school_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" "school_role" DEFAULT 'teacher',
	"teacher_role" varchar,
	"referral_source" varchar,
	"is_verified" boolean DEFAULT false,
	"invited_by" varchar,
	"invited_at" timestamp,
	"verified_at" timestamp,
	"verification_method" varchar,
	"legacy_evidence_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"type" "school_type",
	"country" varchar NOT NULL,
	"address" text,
	"website" varchar,
	"admin_email" varchar,
	"postcode" varchar,
	"zip_code" varchar,
	"primary_language" varchar,
	"age_ranges" text[],
	"student_count" integer,
	"registration_completed" boolean DEFAULT false,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"current_stage" "program_stage" DEFAULT 'inspire',
	"progress_percentage" integer DEFAULT 0,
	"inspire_completed" boolean DEFAULT false,
	"investigate_completed" boolean DEFAULT false,
	"act_completed" boolean DEFAULT false,
	"award_completed" boolean DEFAULT false,
	"current_round" integer DEFAULT 1,
	"rounds_completed" integer DEFAULT 0,
	"audit_quiz_completed" boolean DEFAULT false,
	"featured_school" boolean DEFAULT false,
	"show_on_map" boolean DEFAULT false,
	"primary_contact_id" varchar,
	"photo_consent_document_url" varchar,
	"photo_consent_status" "photo_consent_status",
	"photo_consent_uploaded_at" timestamp,
	"photo_consent_approved_at" timestamp,
	"photo_consent_approved_by" varchar,
	"photo_consent_review_notes" text,
	"is_migrated" boolean DEFAULT false,
	"legacy_district" varchar,
	"migrated_at" timestamp,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_invitations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" varchar NOT NULL,
	"invited_by" varchar,
	"email" varchar NOT NULL,
	"token" varchar NOT NULL,
	"status" "invitation_status" DEFAULT 'pending',
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	CONSTRAINT "teacher_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote" text NOT NULL,
	"author_name" varchar NOT NULL,
	"author_role" varchar NOT NULL,
	"school_name" varchar NOT NULL,
	"rating" integer DEFAULT 5,
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "uptime_metrics" (
	"id" varchar PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"endpoint" varchar NOT NULL,
	"total_checks" integer DEFAULT 0 NOT NULL,
	"successful_checks" integer DEFAULT 0 NOT NULL,
	"failed_checks" integer DEFAULT 0 NOT NULL,
	"avg_response_time" numeric(10, 2),
	"uptime_percentage" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "user_activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"user_email" varchar,
	"action_type" varchar NOT NULL,
	"action_details" jsonb DEFAULT '{}',
	"target_id" varchar,
	"target_type" varchar,
	"ip_address" varchar,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"email_verified" boolean DEFAULT false,
	"password_hash" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"phone_number" varchar,
	"role" varchar DEFAULT 'teacher',
	"is_admin" boolean DEFAULT false,
	"preferred_language" varchar DEFAULT 'en',
	"has_seen_onboarding" boolean DEFAULT false,
	"needs_password_reset" boolean DEFAULT false,
	"last_viewed_events_at" timestamp,
	"last_active_at" timestamp,
	"has_interacted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"is_migrated" boolean DEFAULT false,
	"legacy_user_id" varchar,
	"needs_evidence_resubmission" boolean DEFAULT false,
	"migrated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"school_id" varchar NOT NULL,
	"request_type" "request_type" DEFAULT 'join_school',
	"status" "verification_status" DEFAULT 'pending',
	"evidence" text NOT NULL,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_responses" ADD CONSTRAINT "audit_responses_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_responses" ADD CONSTRAINT "audit_responses_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_responses" ADD CONSTRAINT "audit_responses_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_evidence_id_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_study_review_comments" ADD CONSTRAINT "case_study_review_comments_case_study_id_case_studies_id_fk" FOREIGN KEY ("case_study_id") REFERENCES "public"."case_studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_study_review_comments" ADD CONSTRAINT "case_study_review_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_study_tag_relations" ADD CONSTRAINT "case_study_tag_relations_case_study_id_case_studies_id_fk" FOREIGN KEY ("case_study_id") REFERENCES "public"."case_studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_study_tag_relations" ADD CONSTRAINT "case_study_tag_relations_tag_id_case_study_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."case_study_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_study_tags" ADD CONSTRAINT "case_study_tags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_study_versions" ADD CONSTRAINT "case_study_versions_case_study_id_case_studies_id_fk" FOREIGN KEY ("case_study_id") REFERENCES "public"."case_studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_study_versions" ADD CONSTRAINT "case_study_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_locks" ADD CONSTRAINT "document_locks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_announcements" ADD CONSTRAINT "event_announcements_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_announcements" ADD CONSTRAINT "event_announcements_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_banners" ADD CONSTRAINT "event_banners_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_banners" ADD CONSTRAINT "event_banners_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_link_clicks" ADD CONSTRAINT "event_link_clicks_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_link_clicks" ADD CONSTRAINT "event_link_clicks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_resource_downloads" ADD CONSTRAINT "event_resource_downloads_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_resource_downloads" ADD CONSTRAINT "event_resource_downloads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_resources" ADD CONSTRAINT "event_resources_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_resources" ADD CONSTRAINT "event_resources_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_evidence_requirement_id_evidence_requirements_id_fk" FOREIGN KEY ("evidence_requirement_id") REFERENCES "public"."evidence_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailchimp_subscriptions" ADD CONSTRAINT "mailchimp_subscriptions_audience_id_mailchimp_audiences_id_fk" FOREIGN KEY ("audience_id") REFERENCES "public"."mailchimp_audiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailchimp_subscriptions" ADD CONSTRAINT "mailchimp_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailchimp_subscriptions" ADD CONSTRAINT "mailchimp_subscriptions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_asset_tags" ADD CONSTRAINT "media_asset_tags_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_asset_tags" ADD CONSTRAINT "media_asset_tags_tag_id_media_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."media_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_asset_usage" ADD CONSTRAINT "media_asset_usage_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_logs" ADD CONSTRAINT "migration_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printable_form_submissions" ADD CONSTRAINT "printable_form_submissions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printable_form_submissions" ADD CONSTRAINT "printable_form_submissions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printable_form_submissions" ADD CONSTRAINT "printable_form_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reduction_promises" ADD CONSTRAINT "reduction_promises_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reduction_promises" ADD CONSTRAINT "reduction_promises_audit_id_audit_responses_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audit_responses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reduction_promises" ADD CONSTRAINT "reduction_promises_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_pack_items" ADD CONSTRAINT "resource_pack_items_pack_id_resource_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."resource_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_pack_items" ADD CONSTRAINT "resource_pack_items_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_packs" ADD CONSTRAINT "resource_packs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_users" ADD CONSTRAINT "school_users_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_users" ADD CONSTRAINT "school_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_users" ADD CONSTRAINT "school_users_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_primary_contact_id_users_id_fk" FOREIGN KEY ("primary_contact_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_photo_consent_approved_by_users_id_fk" FOREIGN KEY ("photo_consent_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_invitations" ADD CONSTRAINT "teacher_invitations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_invitations" ADD CONSTRAINT "teacher_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_logs" ADD CONSTRAINT "user_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_target" ON "audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "case_study_review_comments_case_study_idx" ON "case_study_review_comments" USING btree ("case_study_id");--> statement-breakpoint
CREATE INDEX "case_study_tag_relations_case_study_idx" ON "case_study_tag_relations" USING btree ("case_study_id");--> statement-breakpoint
CREATE INDEX "case_study_tag_relations_tag_idx" ON "case_study_tag_relations" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "case_study_versions_case_study_id_idx" ON "case_study_versions" USING btree ("case_study_id");--> statement-breakpoint
CREATE UNIQUE INDEX "case_study_versions_unique_version_idx" ON "case_study_versions" USING btree ("case_study_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_created" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_document_locks_doc" ON "document_locks" USING btree ("document_type","document_id");--> statement-breakpoint
CREATE INDEX "idx_document_locks_user" ON "document_locks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_document_locks_expires" ON "document_locks" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_document_locks_unique" ON "document_locks" USING btree ("document_type","document_id");--> statement-breakpoint
CREATE INDEX "idx_event_announcements_event" ON "event_announcements" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_event_banners_active" ON "event_banners" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_event_banners_single_active" ON "event_banners" USING btree ("is_active") WHERE "event_banners"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_event_link_clicks_event" ON "event_link_clicks" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_event_link_clicks_user" ON "event_link_clicks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_event_registrations_event" ON "event_registrations" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_event_registrations_user" ON "event_registrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_event_resource_downloads_event" ON "event_resource_downloads" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_event_resource_downloads_user" ON "event_resource_downloads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_event_resources_event" ON "event_resources" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_event_resources_resource" ON "event_resources" USING btree ("resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_event_resources_unique" ON "event_resources" USING btree ("event_id","resource_id");--> statement-breakpoint
CREATE INDEX "idx_events_start_date" ON "events" USING btree ("start_date_time");--> statement-breakpoint
CREATE INDEX "idx_events_status" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_events_public_slug" ON "events" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "idx_health_checks_endpoint" ON "health_checks" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "idx_health_checks_checked_at" ON "health_checks" USING btree ("checked_at");--> statement-breakpoint
CREATE INDEX "idx_media_asset_tags_asset_id" ON "media_asset_tags" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_media_asset_tags_tag_id" ON "media_asset_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "idx_media_asset_usage_asset_id" ON "media_asset_usage" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_media_assets_media_type_scope" ON "media_assets" USING btree ("media_type","storage_scope");--> statement-breakpoint
CREATE INDEX "idx_media_assets_uploaded_by" ON "media_assets" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "idx_media_assets_school_id" ON "media_assets" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_migration_logs_status" ON "migration_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_migration_logs_started" ON "migration_logs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_school_read" ON "notifications" USING btree ("school_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_read" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_created" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_password_reset_email" ON "password_reset_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_password_reset_token" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_password_reset_expires" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_printable_submissions_school" ON "printable_form_submissions" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_printable_submissions_status" ON "printable_form_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_reduction_promises_school_status" ON "reduction_promises" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "resource_pack_items_pack_id_idx" ON "resource_pack_items" USING btree ("pack_id");--> statement-breakpoint
CREATE INDEX "resource_pack_items_resource_id_idx" ON "resource_pack_items" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_school_users_school_role" ON "school_users" USING btree ("school_id","role");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_uptime_metrics_date" ON "uptime_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_uptime_metrics_endpoint" ON "uptime_metrics" USING btree ("endpoint");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_uptime_metrics_unique" ON "uptime_metrics" USING btree ("date","endpoint");--> statement-breakpoint
CREATE INDEX "idx_user_activity_logs_user" ON "user_activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_activity_logs_action" ON "user_activity_logs" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "idx_user_activity_logs_created" ON "user_activity_logs" USING btree ("created_at");