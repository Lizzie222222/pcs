import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Script to generate SQL for creating/updating lizzie@creativeco.io admin user in production
 * This user needs email/password login since Google OAuth was removed
 */

async function generateAdminUserSQL() {
  // Generate a secure random password (16 characters with mix of alphanumeric and special chars)
  const password = crypto.randomBytes(12).toString('base64').slice(0, 16);
  
  // Hash the password using bcrypt (same settings as the app: 12 salt rounds)
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  // User details
  const userId = crypto.randomUUID();
  const email = 'lizzie@creativeco.io';
  const firstName = 'Elizabeth';
  const lastName = 'Lawley';
  const role = 'admin';
  const isAdmin = true;
  const emailVerified = true;
  const preferredLanguage = 'en';
  
  // Generate SQL with UPSERT (handles both insert and update)
  const sql = `
-- UPSERT admin user: lizzie@creativeco.io
-- This will INSERT if user doesn't exist, or UPDATE if they do
INSERT INTO users (
  id,
  email,
  first_name,
  last_name,
  role,
  is_admin,
  email_verified,
  password_hash,
  preferred_language,
  has_seen_onboarding,
  created_at,
  updated_at
) VALUES (
  '${userId}',
  '${email}',
  '${firstName}',
  '${lastName}',
  '${role}',
  ${isAdmin},
  ${emailVerified},
  '${passwordHash}',
  '${preferredLanguage}',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  is_admin = EXCLUDED.is_admin,
  email_verified = EXCLUDED.email_verified,
  password_hash = EXCLUDED.password_hash,
  preferred_language = EXCLUDED.preferred_language,
  updated_at = NOW();
`.trim();

  console.log('='.repeat(80));
  console.log('PRODUCTION ADMIN USER SETUP');
  console.log('='.repeat(80));
  console.log('\n📧 Email:', email);
  console.log('🔑 Password:', password);
  console.log('👤 Name:', firstName, lastName);
  console.log('🛡️  Role: Platform Admin');
  console.log('\n' + '='.repeat(80));
  console.log('SQL TO RUN IN PRODUCTION DATABASE:');
  console.log('='.repeat(80));
  console.log(sql);
  console.log('\n' + '='.repeat(80));
  console.log('⚠️  IMPORTANT:');
  console.log('   1. Copy the SQL above and run it in your production database');
  console.log('   2. Save the password securely and share it with Lizzie');
  console.log('   3. User can login at your production URL with email/password');
  console.log('   4. Delete this output after use for security');
  console.log('='.repeat(80));
}

generateAdminUserSQL().catch(console.error);
