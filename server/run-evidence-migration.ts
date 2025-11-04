#!/usr/bin/env tsx

import { runMigration } from './migrations/migrate-legacy-evidence';

async function run() {
  console.log('🚀 Running LIVE evidence migration...\n');
  await runMigration(false); // false = LIVE mode, not dry run
  console.log('\n✅ Evidence migration complete!');
}

run().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
