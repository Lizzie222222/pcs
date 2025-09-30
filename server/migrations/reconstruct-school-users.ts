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
    console.log('Starting school_users reconstruction migration...\n');
    
    // Step 1: Add unique constraint if it doesn't exist
    console.log('Step 1: Ensuring unique constraint on (school_id, user_id)...');
    try {
      await pool.query(`
        ALTER TABLE school_users 
        ADD CONSTRAINT school_users_school_user_unique 
        UNIQUE (school_id, user_id)
      `);
      console.log('✓ Unique constraint created successfully');
    } catch (error: any) {
      if (error.code === '42P07' || error.message.includes('already exists')) {
        console.log('✓ Unique constraint already exists (skipping)');
      } else {
        throw error;
      }
    }
    
    // Step 2: Insert school_users from schools.primary_contact_id
    console.log('\nStep 2: Reconstructing school_users from schools.primary_contact_id...');
    
    const result = await pool.query(`
      INSERT INTO school_users (id, school_id, user_id, role, is_verified, verification_method, created_at)
      SELECT 
        gen_random_uuid(), 
        id as school_id, 
        primary_contact_id as user_id, 
        'head_teacher'::school_role as role, 
        true as is_verified, 
        'legacy_migration' as verification_method,
        NOW() as created_at
      FROM schools 
      WHERE primary_contact_id IS NOT NULL
      ON CONFLICT (school_id, user_id) DO NOTHING
    `);
    
    const recordsCreated = result.rowCount || 0;
    console.log(`✓ Created ${recordsCreated} school_users records`);
    
    // Step 3: Show summary statistics
    console.log('\nStep 3: Fetching summary statistics...');
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_schools,
        COUNT(primary_contact_id) as schools_with_primary_contact,
        (SELECT COUNT(*) FROM school_users WHERE verification_method = 'legacy_migration') as legacy_migration_users
      FROM schools
    `);
    
    const summary = stats.rows[0];
    console.log(`  Total schools: ${summary.total_schools}`);
    console.log(`  Schools with primary contact: ${summary.schools_with_primary_contact}`);
    console.log(`  Legacy migration users created: ${summary.legacy_migration_users}`);
    
    console.log('\n✓ Migration completed successfully!');
    console.log('\nSummary:');
    console.log(`  - Added unique constraint on (school_id, user_id)`);
    console.log(`  - Created ${recordsCreated} new school_users records from primary_contact_id`);
    console.log(`  - All records marked as head_teacher with legacy_migration verification`);
    
  } catch (error) {
    console.error('\n✗ Migration failed:');
    console.error(error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\nMigration script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration script failed:', error);
    process.exit(1);
  });
