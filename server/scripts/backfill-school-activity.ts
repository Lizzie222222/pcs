import { db } from '../db';
import { schools, schoolUsers, userActivityLogs } from '@shared/schema';
import { sql, eq } from 'drizzle-orm';

/**
 * Backfill script to update the lastActiveAt field for all schools
 * based on their most recent user activity from the user_activity_logs table.
 * 
 * This script:
 * 1. Joins schools → school_users → user_activity_logs
 * 2. Finds the most recent activity timestamp for each school
 * 3. Updates schools.lastActiveAt with the most recent activity
 * 4. Handles schools with no activity (leaves as NULL)
 * 5. Processes in batches of 100 schools for efficiency
 * 6. Is idempotent (safe to run multiple times)
 */

interface SchoolActivityResult {
  school_id: string;
  school_name: string;
  last_active_at: Date | null;
}

export interface BackfillResult {
  success: boolean;
  updated: number;
  noActivity: number;
  total: number;
  errors?: string[];
}

async function backfillSchoolActivity(): Promise<BackfillResult> {
  console.log('[Backfill] Starting school activity backfill...\n');

  try {
    // Query to find the most recent activity for each school
    // Joins: schools -> school_users -> user_activity_logs
    // Groups by school to get the MAX created_at timestamp
    const query = sql<SchoolActivityResult>`
      SELECT 
        s.id as school_id,
        s.name as school_name,
        MAX(ual.created_at) as last_active_at
      FROM ${schools} s
      LEFT JOIN ${schoolUsers} su ON s.id = su.school_id
      LEFT JOIN ${userActivityLogs} ual ON su.user_id = ual.user_id
      GROUP BY s.id, s.name
      ORDER BY s.name
    `;

    const result = await db.execute(query);
    const schoolActivities = result.rows as unknown as SchoolActivityResult[];

    console.log(`[Backfill] Found ${schoolActivities.length} schools to process\n`);

    let updatedCount = 0;
    let noActivityCount = 0;
    let unchangedCount = 0;
    const batchSize = 100;
    const errors: string[] = [];

    // Process schools in batches
    for (let i = 0; i < schoolActivities.length; i += batchSize) {
      const batch = schoolActivities.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(schoolActivities.length / batchSize);

      console.log(`[Backfill] Processing batch ${batchNumber}/${totalBatches} (${batch.length} schools)...`);

      for (const schoolActivity of batch) {
        try {
          const { school_id, school_name, last_active_at } = schoolActivity;

          if (last_active_at) {
            // Fetch current lastActiveAt to check if update is needed
            const currentSchool = await db
              .select({ lastActiveAt: schools.lastActiveAt })
              .from(schools)
              .where(eq(schools.id, school_id))
              .limit(1);

            const currentLastActiveAt = currentSchool[0]?.lastActiveAt;

            // Only update if the value has changed (idempotent)
            if (!currentLastActiveAt || currentLastActiveAt.getTime() !== new Date(last_active_at).getTime()) {
              await db
                .update(schools)
                .set({ lastActiveAt: new Date(last_active_at) })
                .where(eq(schools.id, school_id));

              updatedCount++;
              console.log(`  ✅ Updated: ${school_name} - ${new Date(last_active_at).toISOString()}`);
            } else {
              unchangedCount++;
              console.log(`  ℹ️  Unchanged: ${school_name} - already up to date`);
            }
          } else {
            // School has no activity - ensure lastActiveAt is NULL
            const currentSchool = await db
              .select({ lastActiveAt: schools.lastActiveAt })
              .from(schools)
              .where(eq(schools.id, school_id))
              .limit(1);

            if (currentSchool[0]?.lastActiveAt !== null) {
              await db
                .update(schools)
                .set({ lastActiveAt: null })
                .where(eq(schools.id, school_id));
              
              console.log(`  ⚠️  Cleared: ${school_name} - no activity found`);
            } else {
              console.log(`  ⚠️  Skipped: ${school_name} - no activity (already NULL)`);
            }
            noActivityCount++;
          }
        } catch (error) {
          const errorMsg = `${schoolActivity.school_name}: ${error}`;
          errors.push(errorMsg);
          console.error(`  ❌ Error: ${errorMsg}`);
        }
      }

      console.log(`[Backfill] Batch ${batchNumber}/${totalBatches} complete\n`);
    }

    // Print summary
    console.log('========================================');
    console.log('BACKFILL COMPLETE');
    console.log('========================================');
    console.log(`Total schools processed: ${schoolActivities.length}`);
    console.log(`✅ Updated: ${updatedCount} schools`);
    console.log(`ℹ️  Unchanged: ${unchangedCount} schools`);
    console.log(`⚠️  No activity: ${noActivityCount} schools`);

    if (errors.length > 0) {
      console.log(`\n❌ Errors encountered: ${errors.length}`);
      errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log('\n');

    // Return results for API endpoint
    return {
      success: true,
      updated: updatedCount,
      noActivity: noActivityCount,
      total: schoolActivities.length,
      ...(errors.length > 0 ? { errors } : {})
    };

  } catch (error) {
    console.error('[Backfill] Fatal error:', error);
    throw error;
  }
}

// Main execution function (only runs when executed as a script)
async function main() {
  try {
    await backfillSchoolActivity();
    console.log('[Backfill] Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('[Backfill] Script failed:', error);
    process.exit(1);
  }
}

// Only execute if run directly as a script (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { backfillSchoolActivity };
