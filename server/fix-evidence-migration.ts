#!/usr/bin/env tsx

import { db } from './db';
import { schools, evidence, evidenceRequirements, users, schoolUsers } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { nanoid } from 'nanoid';

// Evidence mapping from CSV
const EVIDENCE_MAPPING = {
  stage_1_assembly: 'School Assembly',
  stage_1_litterpick: 'Local Cleanup',
  stage_1_pledge: 'Plastic Clever Pledge',
  stage2_audit: 'Plastic Waste Audit',
  stage2_actionplan: 'Action Plan Development',
  stage_3_campaign: 'Run a Campaign ',
  stage_3shareevidence: 'Share your evidence ',
  stage_3_sharesuccess: 'Share your success!',
};

async function fixEvidenceMigration() {
  console.log('🔧 FIXING EVIDENCE MIGRATION...\n');

  // Load CSV
  const csvPath = 'attached_assets/Info - 102825 - Final schools upload from PCS old - RvF (1)_1762201941020.csv';
  const csvContent = readFileSync(csvPath, 'latin1');
  const records: any[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`✓ Loaded ${records.length} CSV records\n`);

  // Get all evidence requirements
  const allRequirements = await db.select().from(evidenceRequirements);
  const requirementMap = new Map(allRequirements.map(r => [r.title, r]));

  console.log(`✓ Loaded ${allRequirements.length} evidence requirements\n`);

  // Get all migrated Round 1 schools with their users
  const allSchools = await db
    .select({
      schoolId: schools.id,
      schoolName: schools.name,
      currentRound: schools.currentRound,
      userId: users.id,
      userEmail: users.email,
    })
    .from(schools)
    .innerJoin(schoolUsers, eq(schools.id, schoolUsers.schoolId))
    .innerJoin(users, eq(schoolUsers.userId, users.id))
    .where(and(
      eq(schools.isMigrated, true),
      eq(schools.currentRound, 1),
      eq(schoolUsers.role, 'head_teacher')
    ));

  const schoolByEmail = new Map(
    allSchools.map(s => [s.userEmail.toLowerCase(), s])
  );

  console.log(`✓ Loaded ${schoolByEmail.size} migrated schools\n`);

  let processed = 0;
  let updated = 0;
  let evidenceCreated = 0;

  for (const row of records) {
    if (!row.user_email || !row.user_email.includes('@')) continue;

    const school = schoolByEmail.get(row.user_email.toLowerCase());
    if (!school) continue;

    processed++;

    // Determine which evidence to create
    const evidenceList: Array<{ req: any; csvField: string }> = [];
    const completedStages = { inspire: false, investigate: false, act: false };

    for (const [csvField, reqTitle] of Object.entries(EVIDENCE_MAPPING)) {
      const hasEvidence = row[csvField] && row[csvField].trim() !== '';
      if (hasEvidence) {
        const req = requirementMap.get(reqTitle);
        if (req) {
          evidenceList.push({ req, csvField });
          
          // Track completed stages
          if (req.stage === 'inspire') completedStages.inspire = true;
          if (req.stage === 'investigate') completedStages.investigate = true;
          if (req.stage === 'act') completedStages.act = true;
        }
      }
    }

    // Create evidence records using Drizzle ORM
    for (const { req } of evidenceList) {
      try {
        await db.insert(evidence).values({
          id: nanoid(),
          schoolId: school.schoolId,
          submittedBy: school.userId,
          evidenceRequirementId: req.id,
          title: req.title,
          description: 'Legacy evidence migrated from previous system',
          stage: req.stage as 'inspire' | 'investigate' | 'act',
          status: 'approved',
          roundNumber: 1,
          submittedAt: new Date(),
        }).onConflictDoNothing();
        
        evidenceCreated++;
      } catch (error) {
        // Skip if already exists
      }
    }

    // Update school progression
    const currentStage = completedStages.act ? 'act' : 
                        completedStages.investigate ? 'investigate' : 'inspire';

    await db.update(schools)
      .set({
        inspireCompleted: completedStages.inspire,
        investigateCompleted: completedStages.investigate,
        actCompleted: completedStages.act,
        currentStage: currentStage as 'inspire' | 'investigate' | 'act',
        legacyEvidenceCount: evidenceList.length,
        updatedAt: new Date(),
      })
      .where(eq(schools.id, school.schoolId));

    updated++;

    if (updated % 100 === 0) {
      console.log(`  Processed ${updated} schools...`);
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Schools processed: ${processed}`);
  console.log(`   Schools updated: ${updated}`);
  console.log(`   Evidence records created: ${evidenceCreated}`);
}

fixEvidenceMigration().catch(console.error);
