#!/usr/bin/env tsx

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// CSV column to evidence requirement title mapping (exact matches from database)
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

const STAGE_REQUIREMENTS = {
  inspire: ['School Assembly', 'Local Cleanup', 'Plastic Clever Pledge'],
  investigate: ['Plastic Waste Audit', 'Action Plan Development'],
  act: ['Run a Campaign ', 'Share your evidence ', 'Share your success!'],
};

interface CSVRow {
  user_email: string;
  school_name: string;
  stage_1_assembly?: string;
  stage_1_litterpick?: string;
  stage_1_pledge?: string;
  stage2_audit?: string;
  stage2_actionplan?: string;
  stage_3_campaign?: string;
  stage_3shareevidence?: string;
  stage_3_sharesuccess?: string;
}

interface EvidenceRequirement {
  id: string;
  title: string;
  stage: string;
}

interface School {
  id: string;
  name: string;
  currentRound: number;
  isMigrated: boolean;
  primaryContactId: string;
}

export async function runMigration(dryRun: boolean = true): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('='.repeat(80));
    console.log('Starting Legacy Evidence Migration');
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE MIGRATION'}`);
    console.log('='.repeat(80));
    console.log();

    // Step 1: Load CSV file
    console.log('Step 1: Loading CSV file...');
    const csvPath = 'attached_assets/Info - 102825 - Final schools upload from PCS old - RvF (1)_1762201941020.csv';
    const csvContent = readFileSync(csvPath, 'latin1'); // Handle encoding
    const records: CSVRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    console.log(`✓ Loaded ${records.length} records from CSV\n`);

    // Step 2: Fetch evidence requirements from database
    console.log('Step 2: Fetching evidence requirements...');
    const requirementsResult = await pool.query<EvidenceRequirement>(
      'SELECT id, title, stage FROM evidence_requirements ORDER BY stage, order_index'
    );
    const requirements = requirementsResult.rows;
    console.log(`✓ Found ${requirements.length} evidence requirements\n`);

    // Create mapping from title to requirement
    const requirementMap = new Map<string, EvidenceRequirement>();
    requirements.forEach(req => {
      requirementMap.set(req.title, req);
    });

    // Store total requirements count for progress calculation
    const totalRequirementsCount = requirements.length;
    console.log(`  Total evidence requirements: ${totalRequirementsCount}`);

    // Validate all expected requirements exist
    console.log('\nStep 3: Validating evidence requirement mapping...');
    const missingRequirements: string[] = [];
    Object.values(EVIDENCE_MAPPING).forEach(title => {
      if (!requirementMap.has(title)) {
        missingRequirements.push(title);
      }
    });

    if (missingRequirements.length > 0) {
      throw new Error(
        `Missing evidence requirements in database: ${missingRequirements.join(', ')}\n` +
        'Please ensure all requirements are seeded before running this migration.'
      );
    }
    console.log('✓ All mapped CSV requirements found in database\n');

    // Step 4: Fetch all Round 1 migrated schools with their head teacher emails
    console.log('Step 4: Fetching Round 1 migrated schools with users...');
    const schoolsResult = await pool.query<School & { email: string; userId: string }>(
      `SELECT DISTINCT s.id, s.name, 
              s.current_round AS "currentRound", 
              s.is_migrated AS "isMigrated", 
              COALESCE(s.primary_contact_id, su.user_id) AS "primaryContactId", 
              u.email, u.id AS "userId"
       FROM schools s
       JOIN school_users su ON s.id = su.school_id
       JOIN users u ON su.user_id = u.id
       WHERE s.is_migrated = true 
         AND s.current_round = 1
         AND su.role = 'head_teacher'`
    );
    const schools = schoolsResult.rows;
    console.log(`✓ Found ${schools.length} Round 1 migrated schools\n`);

    // Create email to school mapping (use first school if multiple matches)
    const schoolByEmail = new Map<string, School & { email: string; userId: string }>();
    schools.forEach(school => {
      const emailKey = school.email.toLowerCase();
      if (!schoolByEmail.has(emailKey)) {
        schoolByEmail.set(emailKey, school);
      }
    });

    // Step 5: Process CSV records
    console.log('Step 5: Processing CSV records...');
    let processedCount = 0;
    let notFoundCount = 0;
    const migrations: Array<{
      school: School;
      evidenceToCreate: Array<{ requirementId: string; title: string }>;
      progressionUpdates: {
        inspireCompleted: boolean;
        investigateCompleted: boolean;
        actCompleted: boolean;
        currentStage: string;
        progressPercentage: number;
      };
    }> = [];

    for (const row of records) {
      if (!row.user_email || !row.user_email.includes('@')) {
        continue; // Skip invalid emails
      }

      // Find school by email
      const school = schoolByEmail.get(row.user_email.toLowerCase());
      
      if (!school) {
        notFoundCount++;
        continue;
      }

      // Determine which evidence to create
      const evidenceToCreate: Array<{ requirementId: string; title: string }> = [];
      const completedByStage = {
        inspire: [] as string[],
        investigate: [] as string[],
        act: [] as string[],
      };

      // Check each evidence field in the CSV
      Object.entries(EVIDENCE_MAPPING).forEach(([csvField, requirementTitle]) => {
        const hasEvidence = row[csvField as keyof CSVRow] === 'Y';
        if (hasEvidence) {
          const requirement = requirementMap.get(requirementTitle)!;
          evidenceToCreate.push({
            requirementId: requirement.id,
            title: requirementTitle,
          });
          completedByStage[requirement.stage as keyof typeof completedByStage].push(requirementTitle);
        }
      });

      // Calculate progression based on CSV data (source of truth)
      const inspireCompleted = STAGE_REQUIREMENTS.inspire.every(title =>
        completedByStage.inspire.includes(title)
      );
      const investigateCompleted = STAGE_REQUIREMENTS.investigate.every(title =>
        completedByStage.investigate.includes(title)
      );
      const actCompleted = STAGE_REQUIREMENTS.act.every(title =>
        completedByStage.act.includes(title)
      );

      // Determine current stage (sequential: must complete previous stages)
      let currentStage: string;
      if (!inspireCompleted) {
        currentStage = 'inspire';
      } else if (!investigateCompleted) {
        currentStage = 'investigate';
      } else {
        currentStage = 'act';
      }

      // Calculate progress percentage based on evidence requirements completed
      // Use actual total from database, not hardcoded value
      const progressPercentage = (evidenceToCreate.length / totalRequirementsCount) * 100;

      migrations.push({
        school,
        evidenceToCreate,
        progressionUpdates: {
          inspireCompleted,
          investigateCompleted,
          actCompleted,
          currentStage,
          progressPercentage,
        },
      });

      processedCount++;
    }

    console.log(`✓ Analysis complete:`);
    console.log(`  - CSV records processed: ${records.length}`);
    console.log(`  - Schools matched and to migrate: ${processedCount}`);
    console.log(`  - CSV records not found in migrated schools: ${notFoundCount}`);
    console.log();

    // Step 5: Display preview or execute migration
    if (dryRun) {
      console.log('DRY RUN PREVIEW:');
      console.log('='.repeat(80));
      
      let totalEvidence = 0;
      migrations.slice(0, 5).forEach((migration, idx) => {
        console.log(`\n${idx + 1}. ${migration.school.name} (ID: ${migration.school.id})`);
        console.log(`   Evidence to create: ${migration.evidenceToCreate.length}`);
        migration.evidenceToCreate.forEach(ev => {
          console.log(`     - ${ev.title}`);
        });
        console.log(`   Progression updates:`);
        console.log(`     - Progress: ${migration.progressionUpdates.progressPercentage.toFixed(1)}%`);
        console.log(`     - Inspire: ${migration.progressionUpdates.inspireCompleted}`);
        console.log(`     - Investigate: ${migration.progressionUpdates.investigateCompleted}`);
        console.log(`     - Act: ${migration.progressionUpdates.actCompleted}`);
        console.log(`     - Current Stage: ${migration.progressionUpdates.currentStage}`);
        totalEvidence += migration.evidenceToCreate.length;
      });

      if (migrations.length > 5) {
        console.log(`\n... and ${migrations.length - 5} more schools`);
      }

      const totalEvidenceCount = migrations.reduce((sum, m) => sum + m.evidenceToCreate.length, 0);
      console.log(`\nTotal evidence records to create: ${totalEvidenceCount}`);
      console.log('\n' + '='.repeat(80));
      console.log('To execute the migration, run: npm run migrate:legacy-evidence:execute');
    } else {
      console.log('Step 5: Executing migration...');
      console.log();

      let evidenceCreated = 0;
      let schoolsUpdated = 0;

      for (const migration of migrations) {
        try {
          // Create evidence records only if they don't already exist
          let newEvidenceCount = 0;
          for (const evidence of migration.evidenceToCreate) {
            // Check if evidence already exists for this school/requirement/round
            const existingCheck = await pool.query(
              `SELECT id FROM evidence 
               WHERE school_id = $1 
                 AND evidence_requirement_id = $2 
                 AND round_number = $3
               LIMIT 1`,
              [migration.school.id, evidence.requirementId, 1]
            );

            if (existingCheck.rows.length === 0) {
              // Evidence doesn't exist, create it
              await pool.query(
                `INSERT INTO evidence (
                  school_id,
                  submitted_by,
                  evidence_requirement_id,
                  title,
                  description,
                  stage,
                  status,
                  round_number,
                  submitted_at
                ) VALUES ($1, $2, $3, $4, $5, (SELECT stage FROM evidence_requirements WHERE id = $3), $6, $7, NOW())`,
                [
                  migration.school.id,
                  migration.school.primaryContactId,
                  evidence.requirementId,
                  evidence.title,
                  'Legacy evidence migrated from previous system',
                  'approved',
                  1,
                ]
              );
              newEvidenceCount++;
              evidenceCreated++;
            }
          }

          // Update school progression and overwrite legacy_evidence_count with CSV total
          await pool.query(
            `UPDATE schools 
             SET inspire_completed = $1,
                 investigate_completed = $2,
                 act_completed = $3,
                 current_stage = $4,
                 legacy_evidence_count = $5,
                 progress_percentage = $6,
                 updated_at = NOW()
             WHERE id = $7`,
            [
              migration.progressionUpdates.inspireCompleted,
              migration.progressionUpdates.investigateCompleted,
              migration.progressionUpdates.actCompleted,
              migration.progressionUpdates.currentStage,
              migration.evidenceToCreate.length, // CSV total, not newly inserted count
              migration.progressionUpdates.progressPercentage,
              migration.school.id,
            ]
          );
          schoolsUpdated++;

          if (schoolsUpdated % 10 === 0) {
            console.log(`  Processed ${schoolsUpdated} schools...`);
          }
        } catch (error) {
          console.error(`  ✗ Failed to migrate ${migration.school.name}:`, error);
        }
      }

      console.log();
      console.log(`✓ Migration completed successfully!`);
      console.log(`  - Evidence records created: ${evidenceCreated}`);
      console.log(`  - Schools updated: ${schoolsUpdated}`);
    }

    console.log();
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration(isDryRun)
    .then(() => {
      console.log('Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}
