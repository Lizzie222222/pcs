-- Add requirement_type enum and column to evidence_requirements table
DO $$ BEGIN
    CREATE TYPE "public"."requirement_type" AS ENUM('standard', 'audit', 'action_plan');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "evidence_requirements" ADD COLUMN IF NOT EXISTS "requirement_type" "requirement_type" DEFAULT 'standard';

-- Update existing requirements to have appropriate types based on their titles
UPDATE "evidence_requirements" 
SET "requirement_type" = 'audit' 
WHERE "title" ILIKE '%Plastic Waste Audit%';

UPDATE "evidence_requirements" 
SET "requirement_type" = 'action_plan' 
WHERE "title" ILIKE '%Action Plan%';
