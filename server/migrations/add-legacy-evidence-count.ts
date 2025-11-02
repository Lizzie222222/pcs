#!/usr/bin/env tsx

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

export async function runMigration(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Starting legacy evidence count migration...\n');
    
    // Add legacyEvidenceCount column to schools table
    console.log('Step 1: Adding legacy_evidence_count column to schools table...');
    try {
      await pool.query(`
        ALTER TABLE schools 
        ADD COLUMN legacy_evidence_count INTEGER DEFAULT 0
      `);
      console.log('✓ Added column: legacy_evidence_count');
    } catch (error: any) {
      if (error.code === '42701') {
        console.log('✓ Column legacy_evidence_count already exists (skipping)');
      } else {
        throw error;
      }
    }
    
    // Add index for efficient queries on migrated schools
    console.log('\nStep 2: Adding index on legacy_evidence_count...');
    try {
      await pool.query(`
        CREATE INDEX idx_schools_legacy_evidence_count 
        ON schools(legacy_evidence_count) 
        WHERE legacy_evidence_count > 0
      `);
      console.log('✓ Index idx_schools_legacy_evidence_count created successfully');
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log('✓ Index idx_schools_legacy_evidence_count already exists (skipping)');
      } else {
        throw error;
      }
    }
    
    console.log('\n✓ Migration completed successfully!');
    console.log('\nℹ️  The legacy_evidence_count column is now ready to track historical evidence from migrated schools.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}
