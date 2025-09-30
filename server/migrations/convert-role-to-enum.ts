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
    console.log('Starting database migration...\n');
    
    // Step 1: Create the enum type if it doesn't exist
    console.log('Step 1: Creating school_role enum type...');
    try {
      await pool.query(`
        CREATE TYPE school_role AS ENUM ('head_teacher', 'teacher', 'pending_teacher')
      `);
      console.log('✓ Enum type school_role created successfully');
    } catch (error: any) {
      if (error.code === '42710') {
        console.log('✓ Enum type school_role already exists (skipping)');
      } else {
        throw error;
      }
    }
    
    // Step 2: Alter the role column to use the enum type
    console.log('\nStep 2: Converting school_users.role column to enum...');
    try {
      // First drop the default value
      await pool.query(`
        ALTER TABLE school_users ALTER COLUMN role DROP DEFAULT
      `);
      console.log('  ✓ Dropped default value from role column');
      
      // Then convert the column type
      await pool.query(`
        ALTER TABLE school_users 
        ALTER COLUMN role TYPE school_role 
        USING role::school_role
      `);
      console.log('  ✓ Converted role column to enum type');
      
      // Then set the new default
      await pool.query(`
        ALTER TABLE school_users ALTER COLUMN role SET DEFAULT 'teacher'::school_role
      `);
      console.log('  ✓ Set default value to teacher::school_role');
      
      console.log('✓ Column school_users.role converted to enum type');
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('is already of type')) {
        console.log('✓ Column school_users.role already using enum type (skipping)');
      } else {
        throw error;
      }
    }
    
    // Step 3: Add new columns to school_users table
    console.log('\nStep 3: Adding new columns to school_users table...');
    
    const newColumns = [
      { name: 'is_verified', sql: 'ADD COLUMN is_verified BOOLEAN DEFAULT false' },
      { name: 'invited_by', sql: 'ADD COLUMN invited_by VARCHAR REFERENCES users(id)' },
      { name: 'invited_at', sql: 'ADD COLUMN invited_at TIMESTAMP' },
      { name: 'verified_at', sql: 'ADD COLUMN verified_at TIMESTAMP' },
      { name: 'verification_method', sql: 'ADD COLUMN verification_method VARCHAR' },
    ];
    
    for (const column of newColumns) {
      try {
        await pool.query(`ALTER TABLE school_users ${column.sql}`);
        console.log(`  ✓ Added column: ${column.name}`);
      } catch (error: any) {
        if (error.code === '42701') {
          console.log(`  ✓ Column ${column.name} already exists (skipping)`);
        } else {
          throw error;
        }
      }
    }
    
    // Step 4: Create teacher_invitations table
    console.log('\nStep 4: Creating teacher_invitations table...');
    try {
      await pool.query(`
        CREATE TABLE teacher_invitations (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          school_id VARCHAR NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
          invited_by VARCHAR NOT NULL REFERENCES users(id),
          email VARCHAR NOT NULL,
          token VARCHAR NOT NULL UNIQUE,
          status VARCHAR DEFAULT 'pending',
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          accepted_at TIMESTAMP
        )
      `);
      console.log('✓ Table teacher_invitations created successfully');
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log('✓ Table teacher_invitations already exists (skipping)');
      } else {
        throw error;
      }
    }
    
    // Step 5: Create verification_requests table
    console.log('\nStep 5: Creating verification_requests table...');
    try {
      await pool.query(`
        CREATE TABLE verification_requests (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          school_id VARCHAR NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
          request_type VARCHAR DEFAULT 'join_school',
          status VARCHAR DEFAULT 'pending',
          evidence TEXT NOT NULL,
          reviewed_by VARCHAR REFERENCES users(id),
          reviewed_at TIMESTAMP,
          review_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✓ Table verification_requests created successfully');
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log('✓ Table verification_requests already exists (skipping)');
      } else {
        throw error;
      }
    }
    
    console.log('\n✓ Migration completed successfully!');
    console.log('\nSummary:');
    console.log('  - Created school_role enum type');
    console.log('  - Converted school_users.role to enum');
    console.log('  - Added 5 new columns to school_users');
    console.log('  - Created teacher_invitations table');
    console.log('  - Created verification_requests table');
    
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
