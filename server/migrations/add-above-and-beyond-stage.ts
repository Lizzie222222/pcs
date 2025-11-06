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
    console.log('Starting database migration: Add "above_and_beyond" to program_stage enum...\n');
    
    // Add 'above_and_beyond' value to program_stage enum
    console.log('Step 1: Adding "above_and_beyond" to program_stage enum...');
    try {
      await pool.query(`
        ALTER TYPE program_stage ADD VALUE IF NOT EXISTS 'above_and_beyond'
      `);
      console.log('✓ Successfully added "above_and_beyond" to program_stage enum');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('✓ Value "above_and_beyond" already exists in program_stage enum (skipping)');
      } else {
        throw error;
      }
    }
    
    console.log('\nMigration completed successfully!');
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
