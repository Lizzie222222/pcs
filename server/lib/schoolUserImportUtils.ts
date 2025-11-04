import Papa from 'papaparse';
import { db } from '../db';
import { schools, users, schoolUsers } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export interface SchoolUserImportRow {
  school_name: string;
  country: string;
  user_email: string;
  district?: string;
  phone_number?: string;
  school_type?: string;
}

export interface SchoolUserImportValidation {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: {
    row: number;
    schoolName: string;
    message: string;
  }[];
  warnings: {
    row: number;
    schoolName: string;
    message: string;
  }[];
  preview: {
    schoolName: string;
    country: string;
    userEmail: string;
  }[];
}

export interface SchoolUserImportResult {
  success: boolean;
  schoolsCreated: number;
  usersCreated: number;
  errors: string[];
  skipped: number;
  skipReasons: string[];
}

/**
 * Parse CSV file and return structured data
 */
export function parseSchoolUserCSV(csvContent: string): SchoolUserImportRow[] {
  const parsed = Papa.parse<Record<string, any>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase(),
  });

  return parsed.data.map(row => ({
    school_name: String(row.school_name || row.schoolname || '').trim(),
    country: String(row.country || '').trim().toUpperCase(),
    user_email: String(row.user_email || row.email || '').trim().toLowerCase(),
    district: row.district ? String(row.district).trim() : undefined,
    phone_number: row.phone_number ? String(row.phone_number).trim() : undefined,
    school_type: row.school_type || row.schooltype ? String(row.school_type || row.schooltype).trim() : undefined,
  }));
}

/**
 * Validate school and user import data
 */
export async function validateSchoolUserImport(
  rows: SchoolUserImportRow[]
): Promise<SchoolUserImportValidation> {
  const errors: SchoolUserImportValidation['errors'] = [];
  const warnings: SchoolUserImportValidation['warnings'] = [];
  const preview: SchoolUserImportValidation['preview'] = [];
  let validRows = 0;
  let invalidRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 because CSV is 1-indexed and has header row
    let hasErrors = false;

    // Validate required fields
    if (!row.school_name) {
      errors.push({
        row: rowNum,
        schoolName: 'Unknown',
        message: 'Missing school_name',
      });
      hasErrors = true;
    }

    if (!row.country) {
      errors.push({
        row: rowNum,
        schoolName: row.school_name || 'Unknown',
        message: 'Missing country',
      });
      hasErrors = true;
    }

    if (!row.user_email) {
      errors.push({
        row: rowNum,
        schoolName: row.school_name || 'Unknown',
        message: 'Missing user_email',
      });
      hasErrors = true;
    }

    // Validate email format
    if (row.user_email && !row.user_email.includes('@')) {
      errors.push({
        row: rowNum,
        schoolName: row.school_name,
        message: `Invalid email format: ${row.user_email}`,
      });
      hasErrors = true;
    }

    if (!hasErrors) {
      validRows++;
      
      // Add to preview (first 10)
      if (preview.length < 10) {
        preview.push({
          schoolName: row.school_name,
          country: row.country,
          userEmail: row.user_email,
        });
      }
    } else {
      invalidRows++;
    }
  }

  return {
    totalRows: rows.length,
    validRows,
    invalidRows,
    errors,
    warnings,
    preview,
  };
}

/**
 * Process school and user import
 */
export async function processSchoolUserImport(
  rows: SchoolUserImportRow[]
): Promise<SchoolUserImportResult> {
  let schoolsCreated = 0;
  let usersCreated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const skipReasons: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      // Server-side validation - skip if missing required fields
      if (!row.school_name || !row.country || !row.user_email) {
        skipped++;
        skipReasons.push(`Row ${i + 2}: Missing required fields (school_name, country, or user_email)`);
        continue;
      }

      // Server-side validation - validate email format
      if (!row.user_email.includes('@') || !row.user_email.includes('.')) {
        skipped++;
        skipReasons.push(`Row ${i + 2} (${row.school_name}): Invalid email format`);
        continue;
      }

      // Check if school already exists
      const existingSchool = await db.query.schools.findFirst({
        where: and(
          eq(schools.name, row.school_name),
          eq(schools.country, row.country)
        ),
      });

      if (existingSchool) {
        skipped++;
        skipReasons.push(`Row ${i + 2} (${row.school_name}): School already exists`);
        continue;
      }

      // Check if user already exists
      let user = await db.query.users.findFirst({
        where: eq(users.email, row.user_email),
      });

      // Create user if doesn't exist
      if (!user) {
        // Generate a random temporary password
        const tempPassword = Math.random().toString(36).slice(-10);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const [newUser] = await db.insert(users).values({
          email: row.user_email,
          password: hashedPassword,
          role: 'teacher',
          fullName: 'Imported User',
          isVerified: true,
          isMigrated: true,
          needsPasswordReset: true,
        }).returning();

        user = newUser;
        usersCreated++;
      }

      // Create school
      const [newSchool] = await db.insert(schools).values({
        name: row.school_name,
        country: row.country,
        district: row.district,
        phoneNumber: row.phone_number,
        schoolType: row.school_type,
        stage: 'inspire',
        primaryContactId: user.id,
        currentRound: 1,
        roundsCompleted: 0,
        inspireCompleted: false,
        investigateCompleted: false,
        actCompleted: false,
        awardCompleted: false,
      }).returning();

      // Create schoolUsers relationship
      await db.insert(schoolUsers).values({
        schoolId: newSchool.id,
        userId: user.id,
        role: 'head_teacher',
        isVerified: true,
        verifiedAt: new Date(),
      });

      schoolsCreated++;

    } catch (error) {
      errors.push(`Row ${i + 2} (${row.school_name}): ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    success: errors.length === 0,
    schoolsCreated,
    usersCreated,
    errors,
    skipped,
    skipReasons,
  };
}
