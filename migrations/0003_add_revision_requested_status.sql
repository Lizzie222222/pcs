-- Add 'revision_requested' status to evidence_status enum
-- This is a friendlier alternative to 'rejected' for when admins want to request changes
ALTER TYPE "evidence_status" ADD VALUE IF NOT EXISTS 'revision_requested' BEFORE 'rejected';
