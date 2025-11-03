import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import bcrypt from 'bcrypt';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface CSVRow {
  user_email: string;
  user_url: string;
  user_registered: string;
  role: string;
  school_name: string;
  district: string;
  phone_number: string;
  country: string;
  school_type: string;
}

interface SchoolData {
  name: string;
  type: string;
  country: string;
  district: string;
  phoneNumber: string;
  website: string;
}

interface UserData {
  email: string;
  role: string;
  registeredDate: string;
}

async function main() {
  console.log('================================================================================');
  console.log('Restoring Schools and Users from CSV');
  console.log('================================================================================\n');

  try {
    // Step 1: Load CSV file
    console.log('Step 1: Loading CSV file...');
    const csvPath = path.join(process.cwd(), 'attached_assets', 'Info - 102825 - Final schools upload from PCS old - RvF (1)_1762204279601.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at: ${csvPath}`);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records: CSVRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`✓ Loaded ${records.length} records from CSV\n`);

    // Step 2: Process each record
    console.log('Step 2: Processing records and creating schools/users...');
    
    let schoolsCreated = 0;
    let usersCreated = 0;
    let errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        // Skip if no email or school name
        if (!record.user_email || !record.school_name) {
          continue;
        }

        // Map school type
        let schoolType = 'primary';
        if (record.school_type) {
          const type = record.school_type.toLowerCase();
          if (type.includes('secondary') || type === 'high school' || type.includes('high')) {
            schoolType = 'secondary';
          } else if (type.includes('international')) {
            schoolType = 'international';
          } else if (type.includes('primary')) {
            schoolType = 'primary';
          } else {
            schoolType = 'other';
          }
        }

        // Check if school already exists
        const existingSchool = await pool.query(
          'SELECT id FROM schools WHERE name = $1 AND country = $2',
          [record.school_name, record.country]
        );

        let schoolId: string;

        if (existingSchool.rows.length > 0) {
          schoolId = existingSchool.rows[0].id;
        } else {
          // Create school
          const schoolResult = await pool.query(
            `INSERT INTO schools (
              name, type, country, admin_email, website, 
              current_stage, progress_percentage, is_migrated, legacy_district, migrated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING id`,
            [
              record.school_name,
              schoolType,
              record.country || 'GB',
              record.user_email,
              record.user_url || null,
              'inspire',
              0,
              true,
              record.district || null
            ]
          );

          schoolId = schoolResult.rows[0].id;
          schoolsCreated++;
        }

        // Check if user already exists
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          [record.user_email.toLowerCase()]
        );

        let userId: string;

        if (existingUser.rows.length > 0) {
          userId = existingUser.rows[0].id;
        } else {
          // Generate temporary password
          const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase();
          const passwordHash = await bcrypt.hash(tempPassword, 10);

          // Create user
          const userResult = await pool.query(
            `INSERT INTO users (
              email, password_hash, role, first_name, last_name, preferred_language,
              is_migrated, needs_password_reset, migrated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING id`,
            [
              record.user_email.toLowerCase(),
              passwordHash,
              'teacher',
              '', // Will be filled in during onboarding
              '', // Will be filled in during onboarding
              'en',
              true,
              true
            ]
          );

          userId = userResult.rows[0].id;
          usersCreated++;
        }

        // Check if school_user relationship exists
        const existingRelation = await pool.query(
          'SELECT id FROM school_users WHERE school_id = $1 AND user_id = $2',
          [schoolId, userId]
        );

        if (existingRelation.rows.length === 0) {
          // Map role
          let schoolRole = 'teacher';
          if (record.role && (record.role.toLowerCase() === 'head teacher' || record.role.toLowerCase() === 'headteacher')) {
            schoolRole = 'head_teacher';
          }

          // Create school_user relationship
          await pool.query(
            `INSERT INTO school_users (school_id, user_id, role, is_verified, verified_at)
            VALUES ($1, $2, $3, $4, NOW())`,
            [schoolId, userId, schoolRole, true]
          );
        }

        // Progress indicator
        if ((i + 1) % 100 === 0) {
          console.log(`  Processed ${i + 1}/${records.length} records...`);
        }

      } catch (error) {
        errors.push(`Row ${i + 1} (${record.school_name}): ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`✓ Processing complete\n`);
    console.log('Summary:');
    console.log(`  - Schools created: ${schoolsCreated}`);
    console.log(`  - Users created: ${usersCreated}`);
    console.log(`  - Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\nFirst 10 errors:');
      errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
    }

    console.log('\n================================================================================');
    console.log('Restoration complete!');
    console.log('================================================================================\n');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
