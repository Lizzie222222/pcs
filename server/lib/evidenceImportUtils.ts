import { db } from "../db";
import { schools, evidenceRequirements, evidence, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { Evidence, EvidenceRequirement } from "@shared/schema";
import { parseImportFile, normalizeColumnName } from "./importUtils";

/**
 * Maps CSV column names to evidence requirement titles
 * CSV columns use format like "stage_1_assembly" or "stage2_audit"
 */
export const CSV_TO_REQUIREMENT_MAP: Record<string, string> = {
  // Inspire stage
  'stage_1_assembly': 'School Assembly',
  'stage_1_litterpick': 'Litter Audit & Cleanup',
  'stage_1_pledge': 'Recycling Infrastructure',
  
  // Investigate stage
  'stage2_audit': 'Plastic Waste Audit',
  'stage2_actionplan': 'Action Plan Development',
  
  // Act stage
  'stage_3_shareevidence': 'Plastic-Free Initiative',
  'stage_3_campaign': 'Student-Led Campaign',
  'stage_3_sharesuccess': 'Community Engagement',
};

/**
 * System user for evidence imports
 * All imported evidence will be attributed to this user
 */
export const EVIDENCE_IMPORT_USER_ID = 'evidence-import-system';

export interface EvidenceImportRow {
  schoolName: string;
  country: string;
  userEmail?: string;
  completedRequirements: {
    requirementTitle: string;
    csvColumn: string;
    value: string;
  }[];
}

export interface EvidenceImportValidation {
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
    requirementsToApprove: string[];
  }[];
}

export interface EvidenceImportProgress {
  status: 'idle' | 'validating' | 'processing' | 'completed' | 'error';
  currentSchool?: string;
  processedSchools: number;
  totalSchools: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  startTime?: number;
  endTime?: number;
}

/**
 * Parse CSV and extract evidence completion data
 */
export async function parseEvidenceCSV(buffer: Buffer, filename: string): Promise<EvidenceImportRow[]> {
  const parsed = parseImportFile(buffer, filename);
  const rows: EvidenceImportRow[] = [];

  for (const row of parsed.data) {
    const schoolName = row['school_name'] || row['School Name'] || '';
    const country = row['country'] || row['Country'] || '';
    const userEmail = row['user_email'] || row['User Email'] || '';

    if (!schoolName.trim() || !country.trim()) {
      continue; // Skip rows without school name or country
    }

    // Check all possible requirement columns
    const completedRequirements: EvidenceImportRow['completedRequirements'] = [];
    
    for (const [csvColumn, requirementTitle] of Object.entries(CSV_TO_REQUIREMENT_MAP)) {
      const value = row[csvColumn] || '';
      
      // "Y" means requirement is completed and should be approved
      if (value === 'Y' || value === 'y') {
        completedRequirements.push({
          requirementTitle,
          csvColumn,
          value: value.toString(),
        });
      }
    }

    rows.push({
      schoolName: schoolName.trim(),
      country: country.trim(),
      userEmail: userEmail.trim(),
      completedRequirements,
    });
  }

  return rows;
}

/**
 * Validate CSV data before import
 */
export async function validateEvidenceImport(
  rows: EvidenceImportRow[],
  limit?: number
): Promise<EvidenceImportValidation> {
  const errors: EvidenceImportValidation['errors'] = [];
  const warnings: EvidenceImportValidation['warnings'] = [];
  const preview: EvidenceImportValidation['preview'] = [];
  
  let validRows = 0;
  let invalidRows = 0;

  // Get all evidence requirements from database
  const allRequirements = await db
    .select()
    .from(evidenceRequirements);
  
  const requirementsByTitle = new Map(
    allRequirements.map(r => [r.title, r])
  );

  // Process each row (or limit for preview)
  const rowsToProcess = limit ? rows.slice(0, limit) : rows;
  
  for (let i = 0; i < rowsToProcess.length; i++) {
    const row = rowsToProcess[i];
    const rowNum = i + 1;
    let hasErrors = false;

    // Check if school exists
    const school = await db
      .select()
      .from(schools)
      .where(
        and(
          eq(schools.name, row.schoolName),
          eq(schools.country, row.country)
        )
      )
      .limit(1);

    if (school.length === 0) {
      errors.push({
        row: rowNum,
        schoolName: row.schoolName,
        message: `School not found: "${row.schoolName}" in ${row.country}`,
      });
      hasErrors = true;
      invalidRows++;
      continue;
    }

    // Validate requirements exist
    for (const req of row.completedRequirements) {
      if (!requirementsByTitle.has(req.requirementTitle)) {
        errors.push({
          row: rowNum,
          schoolName: row.schoolName,
          message: `Unknown requirement: "${req.requirementTitle}"`,
        });
        hasErrors = true;
      }
    }

    if (row.completedRequirements.length === 0) {
      warnings.push({
        row: rowNum,
        schoolName: row.schoolName,
        message: 'No evidence requirements to approve (all columns empty or not "Y")',
      });
    }

    if (!hasErrors) {
      validRows++;
      
      // Add to preview (first 10)
      if (preview.length < 10) {
        preview.push({
          schoolName: row.schoolName,
          country: row.country,
          requirementsToApprove: row.completedRequirements.map(r => r.requirementTitle),
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
 * Process evidence import for schools in chunks
 * Returns progress updates via callback
 */
export async function processEvidenceImport(
  rows: EvidenceImportRow[],
  onProgress?: (progress: EvidenceImportProgress) => void,
  testMode: boolean = false
): Promise<EvidenceImportProgress> {
  const startTime = Date.now();
  const progress: EvidenceImportProgress = {
    status: 'processing',
    processedSchools: 0,
    totalSchools: testMode ? 1 : rows.length,
    successCount: 0,
    errorCount: 0,
    errors: [],
    startTime,
  };

  // Get all requirements once
  const allRequirements = await db
    .select()
    .from(evidenceRequirements);
  
  const requirementsByTitle = new Map(
    allRequirements.map(r => [r.title, r])
  );

  // Ensure import system user exists
  await ensureImportSystemUser();

  // Process rows (just first one in test mode)
  const rowsToProcess = testMode ? rows.slice(0, 1) : rows;

  for (const row of rowsToProcess) {
    try {
      progress.currentSchool = row.schoolName;
      
      if (onProgress) {
        onProgress({ ...progress });
      }

      // Find school
      const [school] = await db
        .select()
        .from(schools)
        .where(
          and(
            eq(schools.name, row.schoolName),
            eq(schools.country, row.country)
          )
        )
        .limit(1);

      if (!school) {
        throw new Error(`School not found: ${row.schoolName}`);
      }

      // Create approved evidence for each completed requirement
      for (const req of row.completedRequirements) {
        const requirement = requirementsByTitle.get(req.requirementTitle);
        
        if (!requirement) {
          throw new Error(`Requirement not found: ${req.requirementTitle}`);
        }

        // Check if evidence already exists for this school + requirement
        const existing = await db
          .select()
          .from(evidence)
          .where(
            and(
              eq(evidence.schoolId, school.id),
              eq(evidence.evidenceRequirementId, requirement.id),
              eq(evidence.status, 'approved')
            )
          )
          .limit(1);

        // Only create if doesn't exist
        if (existing.length === 0) {
          await db.insert(evidence).values({
            schoolId: school.id,
            submittedBy: EVIDENCE_IMPORT_USER_ID,
            evidenceRequirementId: requirement.id,
            title: requirement.title,
            description: `Migrated evidence from legacy system`,
            stage: requirement.stage,
            status: 'approved',
            visibility: 'registered',
            files: JSON.stringify([]),
            roundNumber: school.currentRound || 1,
            reviewedBy: EVIDENCE_IMPORT_USER_ID,
            reviewedAt: new Date(),
            reviewNotes: 'Auto-approved via CSV import',
          });
        }
      }

      // Update school progress
      const { checkAndUpdateSchoolProgression } = await import('../storage');
      const storage = (await import('../storage')).storage;
      await storage.checkAndUpdateSchoolProgression(school.id);

      progress.successCount++;
    } catch (error) {
      progress.errorCount++;
      progress.errors.push(
        `${row.schoolName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    progress.processedSchools++;
  }

  progress.status = 'completed';
  progress.endTime = Date.now();
  progress.currentSchool = undefined;

  if (onProgress) {
    onProgress({ ...progress });
  }

  return progress;
}

/**
 * Ensure the import system user exists
 */
async function ensureImportSystemUser(): Promise<void> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, EVIDENCE_IMPORT_USER_ID))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(users).values({
      id: EVIDENCE_IMPORT_USER_ID,
      email: 'evidence-import@system.internal',
      emailVerified: true,
      firstName: 'Evidence',
      lastName: 'Import System',
      role: 'admin',
      isAdmin: true,
      preferredLanguage: 'en',
    });
  }
}
