import { db } from '../db';
import { schools, users, schoolUsers, importBatches } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  mapSchoolFields,
  mapUserFields,
  mapRelationshipFields,
  validateSchoolData,
  validateUserData,
  validateRelationshipData,
  generateTemporaryPassword,
  hashPassword,
  ValidationError,
  ImportResult,
} from './importUtils';

export interface ImportContext {
  importBatchId: string;
  importedBy: string;
  dryRun?: boolean;
}

export interface SchoolImportResult extends ImportResult {
  schoolMap?: Map<string, string>; // Maps "name|country" to school ID
}

export interface UserImportResult extends ImportResult {
  userMap?: Map<string, string>; // Maps email to user ID
  temporaryPasswords?: Map<string, string>; // Maps email to temporary password
}

export interface RelationshipImportResult extends ImportResult {
  relationshipIds?: string[];
}

/**
 * Import schools from parsed data
 */
export async function importSchools(
  data: Record<string, any>[],
  context: ImportContext
): Promise<SchoolImportResult> {
  const errors: ValidationError[] = [];
  const schoolMap = new Map<string, string>();
  let successCount = 0;
  let errorCount = 0;

  // First pass: validate all data
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const mapped = mapSchoolFields(row);
    const validationErrors = validateSchoolData(mapped, i + 2); // +2 for 1-indexed and header row
    errors.push(...validationErrors);
  }

  // If validation fails in dry run, return early
  if (context.dryRun || errors.length > 0) {
    return {
      success: errors.length === 0,
      recordsProcessed: data.length,
      recordsSucceeded: 0,
      recordsFailed: errors.length,
      errors,
      schoolMap,
    };
  }

  // Second pass: import data
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const mapped = mapSchoolFields(row);
    
    try {
      // Check if school already exists (by name + country)
      const existing = await db
        .select()
        .from(schools)
        .where(
          and(
            sql`LOWER(${schools.name}) = LOWER(${mapped.name})`,
            sql`LOWER(${schools.country}) = LOWER(${mapped.country})`
          )
        )
        .limit(1);

      let schoolId: string;
      
      if (existing.length > 0) {
        // School exists, update it
        schoolId = existing[0].id;
        await db
          .update(schools)
          .set({
            ...mapped,
            updatedAt: new Date(),
          })
          .where(eq(schools.id, schoolId));
      } else {
        // Create new school
        schoolId = nanoid();
        await db.insert(schools).values({
          id: schoolId,
          name: mapped.name,
          type: mapped.type,
          country: mapped.country,
          address: mapped.address,
          adminEmail: mapped.adminEmail,
          postcode: mapped.postcode,
          zipCode: mapped.zipCode,
          primaryLanguage: mapped.primaryLanguage,
          studentCount: mapped.studentCount,
          latitude: mapped.latitude ? String(mapped.latitude) : null,
          longitude: mapped.longitude ? String(mapped.longitude) : null,
        });
      }

      // Map school name|country to ID for relationship imports
      const key = `${mapped.name.toLowerCase()}|${mapped.country.toLowerCase()}`;
      schoolMap.set(key, schoolId);
      successCount++;
    } catch (error) {
      errorCount++;
      errors.push({
        row: i + 2,
        field: 'general',
        value: row,
        message: `Failed to import school: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  return {
    success: errorCount === 0,
    recordsProcessed: data.length,
    recordsSucceeded: successCount,
    recordsFailed: errorCount,
    errors,
    schoolMap,
  };
}

/**
 * Import users from parsed data
 */
export async function importUsers(
  data: Record<string, any>[],
  context: ImportContext
): Promise<UserImportResult> {
  const errors: ValidationError[] = [];
  const userMap = new Map<string, string>();
  const temporaryPasswords = new Map<string, string>();
  let successCount = 0;
  let errorCount = 0;

  // First pass: validate all data
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const mapped = mapUserFields(row);
    const validationErrors = validateUserData(mapped, i + 2);
    errors.push(...validationErrors);
  }

  // If validation fails in dry run, return early
  if (context.dryRun || errors.length > 0) {
    return {
      success: errors.length === 0,
      recordsProcessed: data.length,
      recordsSucceeded: 0,
      recordsFailed: errors.length,
      errors,
      userMap,
      temporaryPasswords,
    };
  }

  // Second pass: import data
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const mapped = mapUserFields(row);
    
    try {
      // Check if user already exists by email
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, mapped.email))
        .limit(1);

      let userId: string;
      
      if (existing.length > 0) {
        // User exists, update non-password fields
        userId = existing[0].id;
        await db
          .update(users)
          .set({
            firstName: mapped.firstName,
            lastName: mapped.lastName,
            preferredLanguage: mapped.preferredLanguage,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      } else {
        // Create new user with temporary password
        userId = nanoid();
        const tempPassword = generateTemporaryPassword();
        const passwordHash = await hashPassword(tempPassword);
        
        await db.insert(users).values({
          id: userId,
          email: mapped.email,
          firstName: mapped.firstName,
          lastName: mapped.lastName,
          role: mapped.role,
          preferredLanguage: mapped.preferredLanguage,
          passwordHash,
          emailVerified: false,
        });

        // Store temporary password for email notification
        temporaryPasswords.set(mapped.email, tempPassword);
      }

      userMap.set(mapped.email.toLowerCase(), userId);
      successCount++;
    } catch (error) {
      errorCount++;
      errors.push({
        row: i + 2,
        field: 'general',
        value: row,
        message: `Failed to import user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  return {
    success: errorCount === 0,
    recordsProcessed: data.length,
    recordsSucceeded: successCount,
    recordsFailed: errorCount,
    errors,
    userMap,
    temporaryPasswords,
  };
}

/**
 * Import school-user relationships from parsed data
 */
export async function importRelationships(
  data: Record<string, any>[],
  context: ImportContext,
  schoolMap?: Map<string, string>,
  userMap?: Map<string, string>
): Promise<RelationshipImportResult> {
  const errors: ValidationError[] = [];
  const relationshipIds: string[] = [];
  let successCount = 0;
  let errorCount = 0;

  // First pass: validate all data
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const mapped = mapRelationshipFields(row);
    const validationErrors = validateRelationshipData(mapped, i + 2);
    errors.push(...validationErrors);
  }

  // If validation fails in dry run, return early
  if (context.dryRun || errors.length > 0) {
    return {
      success: errors.length === 0,
      recordsProcessed: data.length,
      recordsSucceeded: 0,
      recordsFailed: errors.length,
      errors,
      relationshipIds,
    };
  }

  // Second pass: import relationships
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const mapped = mapRelationshipFields(row);
    
    try {
      // Find school ID
      let schoolId: string | undefined;
      const schoolKey = `${mapped.schoolName.toLowerCase()}|${mapped.schoolCountry.toLowerCase()}`;
      
      if (schoolMap?.has(schoolKey)) {
        schoolId = schoolMap.get(schoolKey);
      } else {
        // Look up school in database
        const schoolResult = await db
          .select()
          .from(schools)
          .where(
            and(
              sql`LOWER(${schools.name}) = LOWER(${mapped.schoolName})`,
              sql`LOWER(${schools.country}) = LOWER(${mapped.schoolCountry})`
            )
          )
          .limit(1);
        
        if (schoolResult.length > 0) {
          schoolId = schoolResult[0].id;
        }
      }

      if (!schoolId) {
        errors.push({
          row: i + 2,
          field: 'schoolName',
          value: mapped.schoolName,
          message: `School not found: ${mapped.schoolName} in ${mapped.schoolCountry}`,
        });
        errorCount++;
        continue;
      }

      // Find user ID
      let userId: string | undefined;
      const userEmail = mapped.userEmail.toLowerCase();
      
      if (userMap?.has(userEmail)) {
        userId = userMap.get(userEmail);
      } else {
        // Look up user in database
        const userResult = await db
          .select()
          .from(users)
          .where(eq(users.email, userEmail))
          .limit(1);
        
        if (userResult.length > 0) {
          userId = userResult[0].id;
        }
      }

      if (!userId) {
        errors.push({
          row: i + 2,
          field: 'userEmail',
          value: mapped.userEmail,
          message: `User not found: ${mapped.userEmail}`,
        });
        errorCount++;
        continue;
      }

      // Check if relationship already exists
      const existing = await db
        .select()
        .from(schoolUsers)
        .where(
          and(
            eq(schoolUsers.schoolId, schoolId),
            eq(schoolUsers.userId, userId)
          )
        )
        .limit(1);

      let relationshipId: string;
      
      if (existing.length > 0) {
        // Update existing relationship
        relationshipId = existing[0].id;
        await db
          .update(schoolUsers)
          .set({
            role: mapped.role,
            teacherRole: mapped.teacherRole,
            isVerified: mapped.isVerified,
            updatedAt: new Date(),
          })
          .where(eq(schoolUsers.id, relationshipId));
      } else {
        // Create new relationship
        relationshipId = nanoid();
        await db.insert(schoolUsers).values({
          id: relationshipId,
          schoolId,
          userId,
          role: mapped.role,
          teacherRole: mapped.teacherRole,
          isVerified: mapped.isVerified,
        });
      }

      relationshipIds.push(relationshipId);
      successCount++;
    } catch (error) {
      errorCount++;
      errors.push({
        row: i + 2,
        field: 'general',
        value: row,
        message: `Failed to import relationship: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  return {
    success: errorCount === 0,
    recordsProcessed: data.length,
    recordsSucceeded: successCount,
    recordsFailed: errorCount,
    errors,
    relationshipIds,
  };
}

/**
 * Update import batch with results
 */
export async function updateImportBatch(
  batchId: string,
  results: {
    schoolsImported?: number;
    usersImported?: number;
    relationshipsImported?: number;
    errors?: ValidationError[];
    status?: 'processing' | 'completed' | 'failed' | 'partial';
  }
): Promise<void> {
  const totalSuccess = 
    (results.schoolsImported || 0) + 
    (results.usersImported || 0) + 
    (results.relationshipsImported || 0);
  
  const totalErrors = results.errors?.length || 0;
  const status = results.status || (totalErrors > 0 ? 'partial' : 'completed');

  await db
    .update(importBatches)
    .set({
      status,
      successCount: totalSuccess,
      errorCount: totalErrors,
      schoolsImported: results.schoolsImported || 0,
      usersImported: results.usersImported || 0,
      relationshipsImported: results.relationshipsImported || 0,
      errors: results.errors || [],
      completedAt: new Date(),
    })
    .where(eq(importBatches.id, batchId));
}
