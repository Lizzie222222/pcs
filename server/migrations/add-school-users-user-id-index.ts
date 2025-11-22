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
    console.log('Starting school_users user_id index migration...\n');
    
    // Add index on user_id for getUserSchools() queries
    console.log('Adding index on school_users(user_id) for performance optimization...');
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_school_users_user_id 
        ON school_users(user_id)
      `);
      console.log('✓ Index idx_school_users_user_id created successfully');
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log('✓ Index idx_school_users_user_id already exists (skipping)');
      } else {
        throw error;
      }
    }
    
    console.log('\n✓ Migration completed successfully!');
    console.log('\nℹ️  This index optimizes getUserSchools() queries, preventing full table scans.');
    console.log('ℹ️  Expected impact: 200,000-400,000 CU/day reduction in compute usage.');
    
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
