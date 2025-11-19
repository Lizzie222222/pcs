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
    console.log('Starting database migration: Add review fields to reduction_promises table...\n');
    
    // Step 1: Add reviewStatus column
    console.log('Step 1: Adding review_status column...');
    try {
      await pool.query(`
        ALTER TABLE reduction_promises 
        ADD COLUMN IF NOT EXISTS review_status submission_status DEFAULT 'pending'
      `);
      console.log('✓ Successfully added review_status column');
    } catch (error: any) {
      console.log('Note: review_status column may already exist:', error.message);
    }
    
    // Step 2: Add reviewedBy column
    console.log('Step 2: Adding reviewed_by column...');
    try {
      await pool.query(`
        ALTER TABLE reduction_promises 
        ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR REFERENCES users(id)
      `);
      console.log('✓ Successfully added reviewed_by column');
    } catch (error: any) {
      console.log('Note: reviewed_by column may already exist:', error.message);
    }
    
    // Step 3: Add reviewedAt column
    console.log('Step 3: Adding reviewed_at column...');
    try {
      await pool.query(`
        ALTER TABLE reduction_promises 
        ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP
      `);
      console.log('✓ Successfully added reviewed_at column');
    } catch (error: any) {
      console.log('Note: reviewed_at column may already exist:', error.message);
    }
    
    // Step 4: Add reviewNotes column
    console.log('Step 4: Adding review_notes column...');
    try {
      await pool.query(`
        ALTER TABLE reduction_promises 
        ADD COLUMN IF NOT EXISTS review_notes TEXT
      `);
      console.log('✓ Successfully added review_notes column');
    } catch (error: any) {
      console.log('Note: review_notes column may already exist:', error.message);
    }
    
    // Step 5: Create index on review_status
    console.log('Step 5: Creating index on review_status...');
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_reduction_promises_review_status 
        ON reduction_promises(review_status)
      `);
      console.log('✓ Successfully created index on review_status');
    } catch (error: any) {
      console.log('Note: Index may already exist:', error.message);
    }
    
    // Step 6: Set existing reduction promises to 'approved' to maintain backward compatibility
    // This ensures existing action plans don't block progression
    console.log('Step 6: Setting existing reduction promises to approved status...');
    const result = await pool.query(`
      UPDATE reduction_promises 
      SET review_status = 'approved'
      WHERE review_status = 'pending' 
        AND created_at < NOW()
    `);
    console.log(`✓ Updated ${result.rowCount} existing reduction promises to approved status`);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('Action plans (reduction promises) can now be reviewed like evidence.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
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
