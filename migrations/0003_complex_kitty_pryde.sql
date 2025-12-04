CREATE TYPE "public"."curriculum_stage" AS ENUM('early_years', 'key_stage_1', 'key_stage_2', 'key_stage_3', 'key_stage_4', 'post_16', 'all_ages');--> statement-breakpoint
ALTER TABLE "resource_packs" ADD COLUMN "curriculum_stages" text[];--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "curriculum_stages" text[];--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "cover_image_url" varchar;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "is_merged" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "merged_into_school_id" varchar;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "merged_at" timestamp;