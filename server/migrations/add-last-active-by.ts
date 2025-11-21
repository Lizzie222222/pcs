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
    console.log('Starting last_active_by migration...\n');
    
    // Add lastActiveBy column to schools table
    console.log('Step 1: Adding last_active_by column to schools table...');
    
    try {
      await pool.query(`
        ALTER TABLE schools 
        ADD COLUMN last_active_by VARCHAR REFERENCES users(id)
      `);
      console.log('  ✓ Added column: last_active_by');
    } catch (error: any) {
      if (error.code === '42701') {
        console.log('  ✓ Column last_active_by already exists (skipping)');
      } else {
        throw error;
      }
    }
    
    // Add index on lastActiveBy for efficient queries
    console.log('\nStep 2: Adding index on last_active_by...');
    try {
      await pool.query(`
        CREATE INDEX idx_schools_last_active_by ON schools(last_active_by)
      `);
      console.log('✓ Index idx_schools_last_active_by created successfully');
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log('✓ Index idx_schools_last_active_by already exists (skipping)');
      } else {
        throw error;
      }
    }
    
    // Add lastActionType column to track what action was performed
    console.log('\nStep 3: Adding last_action_type column to schools table...');
    try {
      await pool.query(`
        ALTER TABLE schools 
        ADD COLUMN last_action_type VARCHAR
      `);
      console.log('  ✓ Added column: last_action_type');
    } catch (error: any) {
      if (error.code === '42701') {
        console.log('  ✓ Column last_action_type already exists (skipping)');
      } else {
        throw error;
      }
    }
    
    console.log('\n✓ Migration completed successfully!');
    
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
