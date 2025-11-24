-- Add resubmission tracking fields to evidence table
ALTER TABLE "evidence" ADD COLUMN "is_resubmission" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "evidence" ADD COLUMN "previous_review_notes" text;--> statement-breakpoint

-- Add resubmission tracking fields to audit_responses table
ALTER TABLE "audit_responses" ADD COLUMN "is_resubmission" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "audit_responses" ADD COLUMN "previous_review_notes" text;--> statement-breakpoint

-- Add resubmission tracking fields to reduction_promises table
ALTER TABLE "reduction_promises" ADD COLUMN "is_resubmission" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "reduction_promises" ADD COLUMN "previous_review_notes" text;
