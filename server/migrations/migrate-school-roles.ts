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
    console.log('Starting school_users role migration...');
    console.log('Updating role "admin" to "head_teacher"...');
    
    const result = await pool.query(
      `UPDATE school_users SET role = 'head_teacher' WHERE role = 'admin'`
    );
    
    const rowsUpdated = result.rowCount || 0;
    
    console.log(`✓ Migration completed successfully!`);
    console.log(`  Rows updated: ${rowsUpdated}`);
    
    if (rowsUpdated === 0) {
      console.log('  No rows needed updating (no "admin" roles found)');
    }
  } catch (error) {
    console.error('✗ Migration failed:');
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
