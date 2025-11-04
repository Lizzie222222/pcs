#!/usr/bin/env tsx

import { db } from './db';
import { schools, schoolUsers, evidence, users } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

async function consolidateDuplicates() {
  console.log('🔧 CONSOLIDATING DUPLICATE SCHOOLS...\n');

  // Find all duplicate school names
  const duplicateNames = await db.execute(sql`
    SELECT name, COUNT(*) as count
    FROM schools
    GROUP BY name
    HAVING COUNT(*) > 1
  `);

  console.log(`Found ${duplicateNames.rows.length} school names with duplicates\n`);

  for (const row of duplicateNames.rows) {
    const schoolName = row.name as string;
    console.log(`\nProcessing: ${schoolName}`);

    // Get all schools with this name, ordered by creation date (oldest first)
    const duplicateSchools = await db
      .select()
      .from(schools)
      .where(eq(schools.name, schoolName))
      .orderBy(schools.createdAt);

    if (duplicateSchools.length <= 1) continue;

    const original = duplicateSchools[0]; // Keep the oldest one
    const toDelete = duplicateSchools.slice(1); // Delete the rest

    console.log(`  Original: ${original.id} (created ${original.createdAt})`);
    console.log(`  Duplicates to merge: ${toDelete.length}`);

    // Migrate users from duplicates to original
    for (const duplicate of toDelete) {
      // Get users from duplicate
      const duplicateUsers = await db
        .select()
        .from(schoolUsers)
        .where(eq(schoolUsers.schoolId, duplicate.id));

      console.log(`    Migrating ${duplicateUsers.length} users from ${duplicate.id}`);

      for (const userRel of duplicateUsers) {
        // Check if this user is already connected to the original
        const existing = await db
          .select()
          .from(schoolUsers)
          .where(
            and(
              eq(schoolUsers.schoolId, original.id),
              eq(schoolUsers.userId, userRel.userId)
            )
          );

        if (existing.length === 0) {
          // Move user to original school
          await db
            .update(schoolUsers)
            .set({ schoolId: original.id })
            .where(
              and(
                eq(schoolUsers.schoolId, duplicate.id),
                eq(schoolUsers.userId, userRel.userId)
              )
            );
        } else {
          // User already exists on original, just delete the duplicate relationship
          await db
            .delete(schoolUsers)
            .where(
              and(
                eq(schoolUsers.schoolId, duplicate.id),
                eq(schoolUsers.userId, userRel.userId)
              )
            );
        }
      }

      // Migrate evidence from duplicates to original
      const duplicateEvidence = await db
        .select()
        .from(evidence)
        .where(eq(evidence.schoolId, duplicate.id));

      if (duplicateEvidence.length > 0) {
        console.log(`    Migrating ${duplicateEvidence.length} evidence from ${duplicate.id}`);
        await db
          .update(evidence)
          .set({ schoolId: original.id })
          .where(eq(evidence.schoolId, duplicate.id));
      }

      // Delete the duplicate school
      await db.delete(schools).where(eq(schools.id, duplicate.id));
      console.log(`    Deleted duplicate: ${duplicate.id}`);
    }
  }

  console.log('\n✅ Consolidation complete!');
}

consolidateDuplicates().catch(console.error).then(() => process.exit(0));
