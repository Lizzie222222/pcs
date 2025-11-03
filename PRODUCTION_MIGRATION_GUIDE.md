# Production Database Migration Guide

## Overview
This guide documents the fixes applied to the dev database and provides a safe migration strategy for production.

## Issues Fixed in Dev

### 1. Missing pgcrypto Extension
**Problem**: The migration file used `gen_random_uuid()` before enabling the pgcrypto extension, causing PostgreSQL to fail with "function not found" error.

**Fix Applied**: Added `CREATE EXTENSION IF NOT EXISTS pgcrypto;` to the beginning of `migrations/0000_clean_darkstar.sql`.

### 2. progress_percentage Type Mismatch
**Problem**: Database had `numeric(5,2)` but schema defined it as `integer`.

**Fix Applied**: Converted column from numeric to integer using:
```sql
ALTER TABLE schools ALTER COLUMN progress_percentage TYPE integer USING progress_percentage::integer;
```

**Note**: This conversion rounds decimal values (e.g., 33.50 becomes 33). In dev, all schools had 0 progress, so no data was lost.

### 3. visibility Column Type Mismatch
**Problem**: Four tables (evidence, media_assets, resource_packs, resources) had `visibility` as `text` instead of the `visibility` enum.

**Fix Applied**:
```sql
-- Convert each table
ALTER TABLE evidence ALTER COLUMN visibility TYPE visibility USING visibility::visibility;
ALTER TABLE media_assets ALTER COLUMN visibility TYPE visibility USING visibility::visibility;
ALTER TABLE resource_packs ALTER COLUMN visibility TYPE visibility USING visibility::visibility;
ALTER TABLE resources ALTER COLUMN visibility TYPE visibility USING visibility::visibility;
```

### 4. visibility Enum Ordering
**Problem**: Enum values were in wrong order (public, registered, private instead of public, private, registered).

**Fix Applied**:
```sql
-- Temporarily convert to text
ALTER TABLE evidence ALTER COLUMN visibility TYPE text;
ALTER TABLE media_assets ALTER COLUMN visibility TYPE text;
ALTER TABLE resource_packs ALTER COLUMN visibility TYPE text;
ALTER TABLE resources ALTER COLUMN visibility TYPE text;

-- Drop and recreate enum with correct order
DROP TYPE visibility CASCADE;
CREATE TYPE visibility AS ENUM('public', 'private', 'registered');

-- Convert back to enum
ALTER TABLE evidence ALTER COLUMN visibility TYPE visibility USING visibility::visibility;
ALTER TABLE media_assets ALTER COLUMN visibility TYPE visibility USING visibility::visibility;
ALTER TABLE resource_packs ALTER COLUMN visibility TYPE visibility USING visibility::visibility;
ALTER TABLE resources ALTER COLUMN visibility TYPE visibility USING visibility::visibility;
```

## Production Migration Strategy

### Prerequisites
1. **Full database backup** - Take a complete backup before starting
2. **Staging environment test** - Run these steps in staging first
3. **Maintenance window** - Schedule downtime to avoid data corruption
4. **Rollback plan** - Have the backup restoration process tested and ready

### Migration Steps for Production

#### Step 1: Verify Current State
```sql
-- Check current data types
SELECT column_name, data_type, numeric_precision, numeric_scale 
FROM information_schema.columns 
WHERE table_name = 'schools' AND column_name = 'progress_percentage';

-- Check if pgcrypto is enabled
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- Sample progress_percentage values to understand data
SELECT progress_percentage, COUNT(*) 
FROM schools 
GROUP BY progress_percentage 
ORDER BY progress_percentage;
```

#### Step 2: Backup Critical Data
```sql
-- Create backup table with current values
CREATE TABLE schools_backup_progress AS 
SELECT id, progress_percentage, current_stage, 
       inspire_completed, investigate_completed, act_completed
FROM schools;
```

#### Step 3: Enable pgcrypto (if not already enabled)
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

**Verification**: Confirm the role has permission to create extensions. If not, contact your database administrator.

#### Step 4: Convert progress_percentage
```sql
-- Convert with proper rounding to preserve data
ALTER TABLE schools 
ALTER COLUMN progress_percentage TYPE integer 
USING ROUND(progress_percentage)::integer;
```

**Important**: The `ROUND()` function ensures decimal values like 33.50 become 34 instead of 33. If your progress values are already whole numbers (33.00, 66.00, 100.00), this is safe.

#### Step 5: Fix visibility Columns

Check which tables need fixing:
```sql
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name = 'visibility' AND table_schema = 'public'
ORDER BY table_name;
```

If any show `text` instead of `USER-DEFINED`, run:

```sql
-- For each table that needs fixing
ALTER TABLE evidence ALTER COLUMN visibility TYPE visibility USING visibility::visibility;
ALTER TABLE media_assets ALTER COLUMN visibility TYPE visibility USING visibility::visibility;
ALTER TABLE resource_packs ALTER COLUMN visibility TYPE visibility USING visibility::visibility;
ALTER TABLE resources ALTER COLUMN visibility TYPE visibility USING visibility::visibility;
```

#### Step 6: Verify Results
```sql
-- Check data types are correct
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'schools' AND column_name = 'progress_percentage';

-- Verify no data loss
SELECT COUNT(*) FROM schools;
SELECT COUNT(*) FROM schools_backup_progress;

-- Compare progress values
SELECT 
  s.progress_percentage as new_value,
  b.progress_percentage as old_value,
  COUNT(*) as count
FROM schools s
JOIN schools_backup_progress b ON s.id = b.id
GROUP BY s.progress_percentage, b.progress_percentage
ORDER BY old_value;
```

#### Step 7: Update Migration File (for future fresh installs)
Ensure `migrations/0000_clean_darkstar.sql` has:
- Line 1: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
- progress_percentage defined as `integer DEFAULT 0`

### Rollback Plan

If anything goes wrong:

```sql
-- Restore from backup
DROP TABLE schools;
ALTER TABLE schools_backup_progress RENAME TO schools;

-- Or restore progress_percentage from backup
UPDATE schools s
SET progress_percentage = b.progress_percentage
FROM schools_backup_progress b
WHERE s.id = b.id;
```

### Post-Migration Checklist

- [ ] All API endpoints respond correctly
- [ ] School progress displays correctly in UI
- [ ] No errors in application logs
- [ ] Progress calculations work as expected
- [ ] Run end-to-end tests
- [ ] Monitor for 24 hours post-migration

### Differences Between Dev and Prod

**Dev Database**:
- All 1362 schools had progress_percentage = 0
- No active progress data lost
- Migration file updated with pgcrypto extension

**Production Database** (anticipated):
- May have schools with actual progress values (33, 66, 100)
- Must use ROUND() to preserve data during conversion
- Backup is CRITICAL before conversion

### Emergency Contacts

If issues arise during migration:
1. Stop immediately
2. Check application logs
3. Verify database connectivity
4. Consider rollback if data loss detected
5. Contact database administrator if permissions issues

### Testing the Migration

Before running in production, test on a **copy** of production data:
1. Clone production database to staging
2. Run all migration steps
3. Verify data integrity
4. Test application functionality
5. Only proceed to production if all tests pass

## Summary

The dev database has been successfully fixed and is running normally. For production:
1. Take a full backup
2. Test in staging first
3. Use ROUND() when converting progress_percentage
4. Verify pgcrypto permissions
5. Have rollback plan ready
6. Monitor closely post-migration
