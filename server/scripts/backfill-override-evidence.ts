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
  
  // Process in smaller batches with longer delays to reduce lock contention
  // This prevents overwhelming production database during migration
  const BATCH_SIZE = 20; // Smaller batches reduce concurrent lock duration
  const BATCH_DELAY_MS = 500; // Longer delay between batches reduces DB load
  
  for (let i = 0; i < overridesWithoutEvidence.length; i++) {
    const override = overridesWithoutEvidence[i];
    
    // Add delay between batches to reduce database lock contention
    if (i > 0 && i % BATCH_SIZE === 0) {
      const progress = Math.round((i / overridesWithoutEvidence.length) * 100);
      console.log(`[Migration] Processed ${i}/${overridesWithoutEvidence.length} overrides (${progress}%), pausing to reduce DB load...`);
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
    try {
      // Validate: Skip overrides with missing required data
      if (!override.markedBy) {
        console.warn(`[Migration] ⚠️ Skipping override ${override.id} - missing markedBy field`);
        errorCount++;
        continue;
      }

      if (!override.schoolId) {
        console.warn(`[Migration] ⚠️ Skipping override ${override.id} - missing schoolId field`);
        errorCount++;
        continue;
      }

      // Get requirement details
      const [requirement] = await db
        .select()
        .from(evidenceRequirements)
        .where(eq(evidenceRequirements.id, override.evidenceRequirementId));

      if (!requirement) {
        console.warn(`[Migration] ⚠️ Skipping override ${override.id} - requirement ${override.evidenceRequirementId} not found`);
        errorCount++;
        continue;
      }

      // Validate requirement has required fields
      if (!requirement.title) {
        console.warn(`[Migration] ⚠️ Skipping override ${override.id} - requirement ${requirement.id} missing title`);
        errorCount++;
        continue;
      }

      if (!requirement.description) {
        console.warn(`[Migration] ⚠️ Skipping override ${override.id} - requirement ${requirement.id} missing description`);
        errorCount++;
        continue;
      }

      // Handle null stage and validate against allowed enum values
      // Valid program stages: 'inspire', 'investigate', 'act'
      const validStages = ['inspire', 'investigate', 'act'] as const;
      let stage: typeof validStages[number] = 'inspire'; // Default fallback
      
      // Try override.stage first, then requirement.stage, validate both
      const candidateStage = override.stage || requirement.stage;
      if (candidateStage && validStages.includes(candidateStage as any)) {
        stage = candidateStage as typeof validStages[number];
      } else if (candidateStage) {
        console.warn(`[Migration] ⚠️ Invalid stage value "${candidateStage}" for override ${override.id}, using default 'inspire'`);
      }

      // Use transaction with row-level locking for concurrency safety
      await db.transaction(async (tx) => {
        // Lock the override row and re-check if it still needs processing
        // This prevents race conditions when multiple server instances run simultaneously
        const [lockedOverride] = await tx
          .select()
          .from(adminEvidenceOverrides)
          .where(eq(adminEvidenceOverrides.id, override.id))
          .for('update');
        
        // Skip if another instance already processed this override
        if (lockedOverride.evidenceId !== null) {
          console.log(`[Migration] ⏭ Skipping override ${override.id} - already processed by another instance`);
          return;
        }

        // Create evidence record that looks like school-submitted evidence
        const [evidenceRecord] = await tx
          .insert(evidence)
          .values({
            schoolId: override.schoolId,
            submittedBy: override.markedBy,
            evidenceRequirementId: override.evidenceRequirementId,
            title: requirement.title,
            description: requirement.description,
            stage: stage, // Use validated stage with fallback
            status: 'approved' as const,
            visibility: 'registered' as const,
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
      console.error(`[Migration] ❌ ERROR processing override ${override.id}:`, error);
      errorCount++;
    }
  }

  console.log('[Migration] Backfill complete!');
  console.log(`[Migration] Summary: ${successCount} successful, ${errorCount} skipped/failed`);
  
  if (errorCount > 0) {
    console.warn(`[Migration] ⚠️ Note: ${errorCount} override(s) were skipped due to missing data (markedBy, schoolId, or requirement). These overrides will not have evidence records. Check warnings above for details.`);
  } else {
    console.log('[Migration] ✓ All overrides processed successfully!');
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
