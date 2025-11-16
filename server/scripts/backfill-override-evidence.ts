import { db } from '../db';
import { evidence, adminEvidenceOverrides, evidenceRequirements } from '@shared/schema';
import { eq, isNull } from 'drizzle-orm';

/**
 * Migration Script: Backfill Evidence Records for Historical Admin Overrides
 * 
 * This script creates evidence records for all existing admin overrides that don't
 * have linked evidence. The evidence appears identical to school-submitted evidence
 * to maintain consistency and cover data migration issues.
 * 
 * Can be run:
 * 1. Manually: npm run migrate:backfill-override-evidence
 * 2. Automatically: Called from server startup in production
 */

export async function backfillOverrideEvidence() {
  console.log('[Migration] Starting backfill of override evidence records...');
  
  // Check total overrides for context
  const allOverrides = await db.select().from(adminEvidenceOverrides);
  console.log(`[Migration] Total overrides in database: ${allOverrides.length}`);
  
  // Find all overrides without linked evidence (idempotent check)
  const overridesWithoutEvidence = await db
    .select()
    .from(adminEvidenceOverrides)
    .where(isNull(adminEvidenceOverrides.evidenceId));

  console.log(`[Migration] Found ${overridesWithoutEvidence.length} overrides without evidence`);
  console.log(`[Migration] Already processed: ${allOverrides.length - overridesWithoutEvidence.length} overrides`);

  if (overridesWithoutEvidence.length === 0) {
    console.log('[Migration] ✓ All overrides already have evidence. Migration is idempotent - safe to rerun.');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const override of overridesWithoutEvidence) {
    try {
      // Get requirement details
      const [requirement] = await db
        .select()
        .from(evidenceRequirements)
        .where(eq(evidenceRequirements.id, override.evidenceRequirementId));

      if (!requirement) {
        console.error(`[Migration] ERROR: Requirement ${override.evidenceRequirementId} not found for override ${override.id}`);
        errorCount++;
        continue;
      }

      // Use transaction to ensure atomicity
      await db.transaction(async (tx) => {
        // Create evidence record that looks like school-submitted evidence
        const [evidenceRecord] = await tx
          .insert(evidence)
          .values({
            schoolId: override.schoolId,
            submittedBy: override.markedBy,
            evidenceRequirementId: override.evidenceRequirementId,
            title: requirement.title,
            description: requirement.description,
            stage: override.stage,
            status: 'approved',
            visibility: 'registered',
            reviewedBy: override.markedBy,
            reviewedAt: override.createdAt, // Use override creation date as review date
            roundNumber: override.roundNumber,
            files: [],
            videoLinks: null,
            parentalConsentFiles: [],
            submittedAt: override.createdAt, // Use override creation date
          })
          .returning();

        // Link the evidence to the override
        await tx
          .update(adminEvidenceOverrides)
          .set({ evidenceId: evidenceRecord.id })
          .where(eq(adminEvidenceOverrides.id, override.id));

        console.log(`[Migration] ✓ Created evidence ${evidenceRecord.id} for override ${override.id} (${requirement.title})`);
        successCount++;
      });
    } catch (error) {
      console.error(`[Migration] ERROR processing override ${override.id}:`, error);
      errorCount++;
    }
  }

  console.log('[Migration] Backfill complete!');
  console.log(`[Migration] Success: ${successCount}, Errors: ${errorCount}`);
  
  if (errorCount > 0) {
    console.error('[Migration] WARNING: Some overrides failed to backfill. Check errors above.');
    // Throw error instead of exiting process (allows caller to decide how to handle)
    throw new Error(`Failed to backfill ${errorCount} override(s). Check logs for details.`);
  }
  
  return { successCount, errorCount };
}

// Run migration when executed directly (not imported)
if (require.main === module) {
  backfillOverrideEvidence()
    .then(() => {
      console.log('[Migration] Migration finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migration] FATAL ERROR:', error);
      process.exit(1);
    });
}
