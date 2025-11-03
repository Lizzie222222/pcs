# Legacy Evidence Migration Guide

This migration script imports historical evidence data from the old Plastic Clever Schools website into the new system for Round 1 schools.

## What It Does

The migration:
- Processes **1,481 Round 1 migrated schools** from the CSV file
- Creates **514 approved evidence records** based on "Y" markers in CSV columns
- Updates school progression flags (`inspireCompleted`, `investigateCompleted`, `actCompleted`)
- Sets `currentStage` using sequential logic (Inspire → Investigate → Act)
- Sets `legacy_evidence_count` to match CSV totals
- **Skips Round 2+ schools automatically** (schools that already achieved Plastic Clever status)

## CSV to Evidence Mapping

The script maps these CSV columns to evidence requirements:

**Inspire Stage:**
- `stage_1_assembly` → "School Assembly"
- `stage_1_litterpick` → "Local Cleanup"
- `stage_1_pledge` → "Plastic Clever Pledge"

**Investigate Stage:**
- `stage2_audit` → "Plastic Waste Audit"
- `stage2_actionplan` → "Action Plan Development"

**Act Stage:**
- `stage_3_campaign` → "Run a Campaign"
- `stage_3shareevidence` → "Share your evidence"
- `stage_3_sharesuccess` → "Share your success!"

## Important Notes

### CSV as Source of Truth
- The migration uses CSV data as the authoritative source
- **School progression will be overwritten** to match CSV exactly
- If CSV shows less evidence than current database, the school will be **downgraded**
- `legacy_evidence_count` is **overwritten** (not incremented)

### Idempotency
- Safe to run multiple times
- Checks for existing evidence before inserting (prevents duplicates)
- Always sets progression and counts to CSV values on each run

### Schools Processed
- Only processes schools with `isMigrated = true` AND `currentRound = 1`
- Round 2+ schools are automatically skipped (already completed the award)
- Matches schools by head teacher email from `school_users` table

## How to Run

### Step 1: Dry Run (Preview)

Always run a dry-run first to preview changes:

```bash
tsx server/migrations/migrate-legacy-evidence.ts
```

This will show:
- How many schools will be migrated
- How many evidence records will be created
- Sample of progression changes
- No actual changes are made

### Step 2: Execute Migration

After reviewing the dry-run output, execute the migration:

```bash
tsx server/migrations/migrate-legacy-evidence.ts --execute
```

The migration will:
- Create evidence records (checking for duplicates)
- Update school progression flags
- Update legacy_evidence_count
- Display progress every 10 schools

## Post-Migration Verification

After running, verify a few sample schools:

```sql
-- Check a school that should have evidence
SELECT 
  s.name,
  s.inspire_completed,
  s.investigate_completed,
  s.act_completed,
  s.current_stage,
  s.legacy_evidence_count,
  COUNT(e.id) as actual_evidence_count
FROM schools s
LEFT JOIN evidence e ON s.id = e.school_id AND e.round_number = 1
WHERE s.name = 'The Cavendish School'
GROUP BY s.id;

-- Check all evidence for a school
SELECT 
  e.title,
  e.stage,
  e.status,
  e.submitted_at
FROM evidence e
JOIN schools s ON e.school_id = s.id
WHERE s.name = 'The Cavendish School'
  AND e.round_number = 1
ORDER BY e.stage, e.title;
```

## Troubleshooting

### No schools found
If the dry-run shows 0 schools:
- Check that schools have `is_migrated = true` and `current_round = 1`
- Verify head teachers exist in `school_users` with `role = 'head_teacher'`

### Evidence requirement mapping errors
If you see "Missing evidence requirements" error:
- Ensure all 8 evidence requirements exist in the database
- Run the evidence requirements seed script if needed

### Database connection errors
- Verify `DATABASE_URL` environment variable is set
- Check database is accessible and credentials are correct

## File Location

- **Migration script:** `server/migrations/migrate-legacy-evidence.ts`
- **CSV file:** `attached_assets/Info - 102825 - Final schools upload from PCS old - RvF (1)_1762201941020.csv`
