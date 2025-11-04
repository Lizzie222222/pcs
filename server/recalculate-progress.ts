#!/usr/bin/env tsx

import { storage } from './storage';
import { db } from './db';
import { schools } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function recalculateAllProgress() {
  console.log('📊 RECALCULATING SCHOOL PROGRESS...\n');

  const allSchools = await db.select().from(schools).where(eq(schools.isMigrated, true));
  
  console.log(`Found ${allSchools.length} migrated schools to update\n`);

  let updated = 0;
  for (const school of allSchools) {
    const beforeProgress = school.progressPercentage;
    await storage.checkAndUpdateSchoolProgression(school.id);
    const afterSchool = await storage.getSchool(school.id);
    const afterProgress = afterSchool?.progressPercentage ?? 0;

    if (beforeProgress !== afterProgress) {
      updated++;
      if (updated % 100 === 0) {
        console.log(`  Updated ${updated} schools...`);
      }
    }
  }

  console.log(`\n✅ Progress recalculation complete!`);
  console.log(`   Schools updated: ${updated}/${allSchools.length}`);
}

recalculateAllProgress().catch(console.error).then(() => process.exit(0));
