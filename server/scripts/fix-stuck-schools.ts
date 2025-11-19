import { db } from '../db';
import { schools, schoolUsers, users } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { storage } from '../storage';
import { sendCourseCompletionCelebrationEmail, getBaseUrl } from '../emailService';

/**
 * Migration script to fix schools stuck at wrong progress or missing celebration emails
 * 
 * This script:
 * 1. Finds schools with all requirements complete but still in Round 1 at <100%
 * 2. Triggers progression checks to advance them to Round 2
 * 3. Sends celebration emails to schools that completed rounds but didn't get emails
 * 4. Sets primary contact for schools that don't have one
 */

async function fixStuckSchools() {
  console.log('[Fix] Starting migration to fix stuck schools...\n');

  try {
    // Step 1: Find all schools and recalculate their progression
    const allSchools = await db.select().from(schools);
    console.log(`[Fix] Found ${allSchools.length} total schools\n`);

    let progressionFixed = 0;
    let emailsSent = 0;
    let primaryContactsSet = 0;
    const errors: string[] = [];

    for (const school of allSchools) {
      try {
        console.log(`[Fix] Processing school: ${school.name} (${school.id})`);
        console.log(`  Current state: Round ${school.currentRound}, ${school.progressPercentage}% complete`);
        console.log(`  Stages: Inspire=${school.inspireCompleted}, Investigate=${school.investigateCompleted}, Act=${school.actCompleted}`);

        // Set primary contact if missing
        if (!school.primaryContactId) {
          const headTeachers = await db
            .select({
              userId: schoolUsers.userId,
              user: users
            })
            .from(schoolUsers)
            .leftJoin(users, eq(schoolUsers.userId, users.id))
            .where(
              and(
                eq(schoolUsers.schoolId, school.id),
                eq(schoolUsers.role, 'head_teacher')
              )
            )
            .limit(1);

          if (headTeachers.length > 0 && headTeachers[0].userId) {
            await db
              .update(schools)
              .set({ primaryContactId: headTeachers[0].userId })
              .where(eq(schools.id, school.id));
            
            console.log(`  ✅ Set primary contact to head teacher: ${headTeachers[0].user?.email}`);
            primaryContactsSet++;
          } else {
            // Try to find any teacher
            const anyTeacher = await db
              .select({
                userId: schoolUsers.userId,
                user: users
              })
              .from(schoolUsers)
              .leftJoin(users, eq(schoolUsers.userId, users.id))
              .where(eq(schoolUsers.schoolId, school.id))
              .limit(1);

            if (anyTeacher.length > 0 && anyTeacher[0].userId) {
              await db
                .update(schools)
                .set({ primaryContactId: anyTeacher[0].userId })
                .where(eq(schools.id, school.id));
              
              console.log(`  ✅ Set primary contact to teacher: ${anyTeacher[0].user?.email}`);
              primaryContactsSet++;
            } else {
              console.log(`  ⚠️  No teachers found - cannot set primary contact`);
            }
          }
        }

        // Trigger progression check - this will recalculate progress with the fix
        const oldProgress = school.progressPercentage;
        const oldRound = school.currentRound;
        
        await storage.checkAndUpdateSchoolProgression(school.id);
        
        // Re-fetch school to see changes
        const updatedSchool = await db
          .select()
          .from(schools)
          .where(eq(schools.id, school.id))
          .limit(1);

        if (updatedSchool.length > 0) {
          const newProgress = updatedSchool[0].progressPercentage;
          const newRound = updatedSchool[0].currentRound;

          if (oldProgress !== newProgress || oldRound !== newRound) {
            console.log(`  ✅ FIXED: Progress changed from ${oldProgress}% → ${newProgress}%`);
            if (oldRound !== newRound) {
              console.log(`  🎉 ADVANCED: Round ${oldRound ?? 1} → Round ${newRound ?? 1}`);
            }
            progressionFixed++;

            // Check if they should get a celebration email for the round they just completed
            const safeOldRound = oldRound ?? 1;
            const safeNewRound = newRound ?? 1;
            if (safeNewRound > safeOldRound) {
              const completedRound = safeOldRound;
              
              // Get primary contact (may have just been set)
              const finalSchool = updatedSchool[0];
              const primaryContact = finalSchool.primaryContactId
                ? await storage.getUser(finalSchool.primaryContactId)
                : null;

              if (primaryContact?.email) {
                // Check if certificate exists for this round
                const certificateQuery = await db.execute(
                  sql`SELECT id FROM certificates 
                      WHERE school_id = ${school.id} 
                      AND stage = 'act' 
                      AND (metadata->>'round')::int = ${completedRound}
                      LIMIT 1`
                );

                const certificateUrl = certificateQuery.rows.length > 0
                  ? `${getBaseUrl()}/api/certificates/${certificateQuery.rows[0].id}/download`
                  : undefined;

                try {
                  await sendCourseCompletionCelebrationEmail(
                    primaryContact.email,
                    school.name,
                    completedRound,
                    certificateUrl,
                    primaryContact.preferredLanguage ?? undefined
                  );
                  console.log(`  📧 Sent celebration email to ${primaryContact.email} for Round ${completedRound}`);
                  emailsSent++;
                } catch (emailError) {
                  console.error(`  ❌ Failed to send email:`, emailError);
                  errors.push(`Email failed for ${school.name}: ${emailError}`);
                }
              } else {
                console.log(`  ⚠️  Cannot send email - no primary contact with email`);
              }
            }
          } else {
            console.log(`  ℹ️  No changes needed`);
          }
        }

        console.log(''); // Blank line between schools
      } catch (schoolError) {
        console.error(`  ❌ Error processing school ${school.name}:`, schoolError);
        errors.push(`${school.name}: ${schoolError}`);
        console.log(''); // Blank line
      }
    }

    console.log('\n========================================');
    console.log('MIGRATION COMPLETE');
    console.log('========================================');
    console.log(`✅ Progression fixed: ${progressionFixed} schools`);
    console.log(`📧 Celebration emails sent: ${emailsSent}`);
    console.log(`👤 Primary contacts set: ${primaryContactsSet}`);
    
    if (errors.length > 0) {
      console.log(`\n❌ Errors encountered: ${errors.length}`);
      errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log('\n');
  } catch (error) {
    console.error('[Fix] Fatal error:', error);
    throw error;
  }
}

// Run the migration
fixStuckSchools()
  .then(() => {
    console.log('[Fix] Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Fix] Migration failed:', error);
    process.exit(1);
  });
