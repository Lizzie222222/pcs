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
    console.log('Starting user interaction tracking migration...\n');
    
    // Add lastActiveAt and hasInteracted columns to users table
    console.log('Step 1: Adding interaction tracking columns to users table...');
    
    const newColumns = [
      { name: 'last_active_at', sql: 'ADD COLUMN last_active_at TIMESTAMP' },
      { name: 'has_interacted', sql: 'ADD COLUMN has_interacted BOOLEAN DEFAULT false' },
    ];
    
    for (const column of newColumns) {
      try {
        await pool.query(`ALTER TABLE users ${column.sql}`);
        console.log(`  ✓ Added column: ${column.name}`);
      } catch (error: any) {
        if (error.code === '42701') {
          console.log(`  ✓ Column ${column.name} already exists (skipping)`);
        } else {
          throw error;
        }
      }
    }
    
    // Add index on lastActiveAt for efficient queries
    console.log('\nStep 2: Adding index on last_active_at...');
    try {
      await pool.query(`
        CREATE INDEX idx_users_last_active_at ON users(last_active_at)
      `);
      console.log('✓ Index idx_users_last_active_at created successfully');
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log('✓ Index idx_users_last_active_at already exists (skipping)');
      } else {
        throw error;
      }
    }
    
    // Add index on hasInteracted for efficient filtering
    console.log('\nStep 3: Adding index on has_interacted...');
    try {
      await pool.query(`
        CREATE INDEX idx_users_has_interacted ON users(has_interacted)
      `);
      console.log('✓ Index idx_users_has_interacted created successfully');
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log('✓ Index idx_users_has_interacted already exists (skipping)');
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
