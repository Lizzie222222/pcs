#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { MigrationScript } from './migration-script';
import { runMigration as runEvidenceMigration } from './migrations/migrate-legacy-evidence';

async function recover() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         DATA RECOVERY - Restoring Schools & Progress          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();

  try {
    // Step 1: Restore all schools and users
    console.log('📊 STEP 1: Restoring all schools and users from main CSV...');
    console.log('-'.repeat(70));
    
    const csvPath = 'attached_assets/user-export_1761641883683.csv';
    const csvContent = readFileSync(csvPath, 'utf-8');
    
    const migration = new MigrationScript({
      csvContent,
      dryRun: false, // LIVE migration
      // performedBy is optional - skip it to avoid FK constraint
    });

    const result = await migration.run();
    
    console.log();
    console.log('✅ User/School Migration Results:');
    console.log(`   Total rows: ${result.totalRows}`);
    console.log(`   Valid rows: ${result.validRows}`);
    console.log(`   Processed: ${result.processedRows}`);
    console.log(`   Users created: ${result.usersCreated}`);
    console.log(`   Schools created: ${result.schoolsCreated}`);
    console.log(`   Failed: ${result.failedRows}`);
    console.log(`   Errors: ${result.errors.length}`);
    console.log();

    // Step 2: Restore all progress data
    console.log('🎯 STEP 2: Restoring progress data from evidence CSV...');
    console.log('-'.repeat(70));
    
    await runEvidenceMigration(false); // LIVE migration
    
    console.log();
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                  🎉 RECOVERY COMPLETE! 🎉                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log();
    console.log('Next steps:');
    console.log('1. Check database counts');
    console.log('2. Verify progress percentages');
    console.log('3. Confirm completion flags are set');
    
  } catch (error) {
    console.error();
    console.error('❌ RECOVERY FAILED:');
    console.error(error);
    process.exit(1);
  }
}

recover();
