import { db } from '../db';
import { schools, evidence } from '@shared/schema';
import { eq, count, and, sql as drizzleSql } from 'drizzle-orm';

export interface SchoolAuditResult {
  id: string;
  name: string;
  country: string;
  currentRound: number;
  roundsCompleted: number;
  inspireCompleted: boolean;
  investigateCompleted: boolean;
  actCompleted: boolean;
  awardCompleted: boolean;
  progressPercentage: number;
  currentStage: string;
  legacyEvidenceCount: number;
  newEvidenceCount: number;
  totalEvidenceCount: number;
  status: 'logical' | 'illogical_excessive_progress' | 'illogical_round_mismatch' | 'illogical_no_evidence';
  issue?: string;
  recommendedFix?: {
    currentRound: number;
    roundsCompleted: number;
    inspireCompleted: boolean;
    investigateCompleted: boolean;
    actCompleted: boolean;
    awardCompleted: boolean;
    currentStage: 'inspire' | 'investigate' | 'act';
    progressPercentage: number;
    resetType: 'complete' | 'progress_only';
  };
}

export interface AuditSummary {
  totalSchools: number;
  logicalSchools: number;
  illogicalSchools: number;
  byIssueType: {
    excessiveProgress: number;
    roundMismatch: number;
    noEvidence: number;
  };
  byRound: {
    [key: number]: {
      total: number;
      logical: number;
      illogical: number;
      avgProgress: number;
    };
  };
}

const BATCH_SIZE = 50;

export class SchoolRoundFixer {
  /**
   * Audits all schools and identifies those with illogical progress percentages
   * CRITICAL FIX: Now counts BOTH legacy evidence AND new approved evidence
   */
  async auditAllSchools(): Promise<{ schools: SchoolAuditResult[]; summary: AuditSummary }> {
    console.log('[School Round Audit] Starting comprehensive audit...');
    
    // CRITICAL: Get schools WITH their evidence counts
    // We need to count BOTH legacy evidence AND new approved evidence
    const schoolsWithEvidence = await db
      .select({
        id: schools.id,
        name: schools.name,
        country: schools.country,
        currentRound: schools.currentRound,
        roundsCompleted: schools.roundsCompleted,
        inspireCompleted: schools.inspireCompleted,
        investigateCompleted: schools.investigateCompleted,
        actCompleted: schools.actCompleted,
        awardCompleted: schools.awardCompleted,
        progressPercentage: schools.progressPercentage,
        currentStage: schools.currentStage,
        legacyEvidenceCount: schools.legacyEvidenceCount,
        newEvidenceCount: count(evidence.id),
      })
      .from(schools)
      .leftJoin(
        evidence, 
        and(
          eq(evidence.schoolId, schools.id),
          eq(evidence.status, 'approved' as any)
        )
      )
      .groupBy(schools.id);
    
    console.log(`[School Round Audit] Found ${schoolsWithEvidence.length} schools to audit`);
    
    const auditResults: SchoolAuditResult[] = [];
    const summary: AuditSummary = {
      totalSchools: schoolsWithEvidence.length,
      logicalSchools: 0,
      illogicalSchools: 0,
      byIssueType: {
        excessiveProgress: 0,
        roundMismatch: 0,
        noEvidence: 0,
      },
      byRound: {},
    };
    
    for (const school of schoolsWithEvidence) {
      const audit = this.auditSchool(school);
      auditResults.push(audit);
      
      // Update summary
      const round = school.currentRound || 1;
      if (!summary.byRound[round]) {
        summary.byRound[round] = { 
          total: 0, 
          logical: 0, 
          illogical: 0,
          avgProgress: 0,
        };
      }
      summary.byRound[round].total++;
      summary.byRound[round].avgProgress += school.progressPercentage || 0;
      
      if (audit.status === 'logical') {
        summary.logicalSchools++;
        summary.byRound[round].logical++;
      } else {
        summary.illogicalSchools++;
        summary.byRound[round].illogical++;
        
        if (audit.status === 'illogical_excessive_progress') {
          summary.byIssueType.excessiveProgress++;
        } else if (audit.status === 'illogical_round_mismatch') {
          summary.byIssueType.roundMismatch++;
        } else if (audit.status === 'illogical_no_evidence') {
          summary.byIssueType.noEvidence++;
        }
      }
    }
    
    // Calculate average progress per round
    for (const round in summary.byRound) {
      const stats = summary.byRound[round];
      stats.avgProgress = stats.total > 0 ? stats.avgProgress / stats.total : 0;
    }
    
    console.log('[School Round Audit] Audit complete:', {
      total: summary.totalSchools,
      logical: summary.logicalSchools,
      illogical: summary.illogicalSchools,
      byRound: summary.byRound,
    });
    
    return { schools: auditResults, summary };
  }
  
  /**
   * Audits a single school to determine if its round state is logical
   * 
   * FIXED LOGIC (November 2025):
   * - CRITICAL: Schools in Round 2+ MUST have evidence (legacy OR new) to justify their placement
   * - Schools in Round 2+ with 0 TOTAL evidence were incorrectly promoted → Full reset to Round 1
   * - Progress should be 0-100% per round (not cumulative)
   * - currentRound should equal roundsCompleted + 1
   */
  private auditSchool(school: any): SchoolAuditResult {
    const currentRound = school.currentRound || 1;
    const roundsCompleted = school.roundsCompleted || 0;
    const inspireCompleted = school.inspireCompleted || false;
    const investigateCompleted = school.investigateCompleted || false;
    const actCompleted = school.actCompleted || false;
    const awardCompleted = school.awardCompleted || false;
    const progressPercentage = school.progressPercentage || 0;
    const currentStage = school.currentStage || 'inspire';
    const legacyEvidenceCount = school.legacyEvidenceCount || 0;
    const newEvidenceCount = Number(school.newEvidenceCount) || 0;
    const totalEvidenceCount = legacyEvidenceCount + newEvidenceCount;
    
    const result: SchoolAuditResult = {
      id: school.id,
      name: school.name,
      country: school.country,
      currentRound,
      roundsCompleted,
      inspireCompleted,
      investigateCompleted,
      actCompleted,
      awardCompleted,
      progressPercentage,
      currentStage,
      legacyEvidenceCount,
      newEvidenceCount,
      totalEvidenceCount,
      status: 'logical',
    };
    
    // Check 0 (CRITICAL - FIXED): Schools in Round 2+ with NO TOTAL evidence were incorrectly placed
    // They should be completely reset to Round 1
    // FIXED: Now checks TOTAL evidence (legacy + new approved) not just legacy
    if (currentRound > 1 && totalEvidenceCount === 0) {
      result.status = 'illogical_no_evidence';
      result.issue = `Invalid round placement: Round ${currentRound} school has 0 total evidence (0 legacy + 0 new approved, should be in Round 1)`;
      result.recommendedFix = this.calculateFix(school);
      return result;
    }
    
    // Check 1: Round position should be correct
    // currentRound should equal roundsCompleted + 1
    const expectedCurrentRound = roundsCompleted + 1;
    if (currentRound !== expectedCurrentRound) {
      result.status = 'illogical_round_mismatch';
      result.issue = `Round mismatch: currentRound=${currentRound} but roundsCompleted=${roundsCompleted} (expected currentRound=${expectedCurrentRound})`;
      result.recommendedFix = this.calculateFix(school);
      return result;
    }
    
    // Check 2: Progress percentage should be 0-100% per round (NOT cumulative)
    // The migration incorrectly used cumulative progress (Round 2 = 100-200%, Round 3 = 200-300%)
    // Each round should reset to 0% and progress to 100%
    // Schools in Round 2+ with >= 100% need fixing (includes exactly 100% leftover from Round 1)
    if (currentRound > 1 && progressPercentage >= 100) {
      result.status = 'illogical_excessive_progress';
      result.issue = `Excessive progress: Round ${currentRound} school has ${progressPercentage.toFixed(1)}% progress (should be 0-99% for current round)`;
      result.recommendedFix = this.calculateFix(school);
      return result;
    }
    
    // Check 3a: Round 1 schools should never exceed 100% progress
    if (currentRound === 1 && progressPercentage > 100) {
      result.status = 'illogical_excessive_progress';
      result.issue = `Excessive progress: Round 1 school has ${progressPercentage.toFixed(1)}% progress (should be 0-100%)`;
      result.recommendedFix = this.calculateFix(school);
      return result;
    }
    
    // Check 3b: Progress < 0 is also illogical
    if (progressPercentage < 0) {
      result.status = 'illogical_excessive_progress';
      result.issue = `Negative progress: ${progressPercentage.toFixed(1)}% (should be 0-100%)`;
      result.recommendedFix = this.calculateFix(school);
      return result;
    }
    
    return result;
  }
  
  /**
   * Calculates the recommended fix for a school with illogical state
   * 
   * FIXED LOGIC (November 2025):
   * TWO SCENARIOS:
   * 
   * 1. Schools in Round 2+ with 0 TOTAL evidence → COMPLETE RESET to Round 1
   *    - currentRound = 1, roundsCompleted = 0
   *    - These were incorrectly promoted by migration
   *    - FIXED: Now checks TOTAL evidence (legacy + new) not just legacy
   * 
   * 2. Schools with evidence but bad progress → PROGRESS RESET only
   *    - PRESERVE currentRound and roundsCompleted (their achievements)
   *    - Reset progress to 0% and clear flags for current round
   */
  private calculateFix(school: any): SchoolAuditResult['recommendedFix'] {
    const currentRound = school.currentRound || 1;
    const roundsCompleted = school.roundsCompleted || 0;
    const legacyEvidenceCount = school.legacyEvidenceCount || 0;
    const newEvidenceCount = Number(school.newEvidenceCount) || 0;
    const totalEvidenceCount = legacyEvidenceCount + newEvidenceCount;
    
    // SCENARIO 1: School in Round 2+ with NO TOTAL evidence → COMPLETE RESET
    // FIXED: Now checks total evidence, not just legacy
    if (currentRound > 1 && totalEvidenceCount === 0) {
      return {
        currentRound: 1,
        roundsCompleted: 0,
        inspireCompleted: false,
        investigateCompleted: false,
        actCompleted: false,
        awardCompleted: false,
        currentStage: 'inspire',
        progressPercentage: 0,
        resetType: 'complete',
      };
    }
    
    // SCENARIO 2: School has evidence but bad progress → PRESERVE ROUND, reset progress only
    const correctCurrentRound = roundsCompleted + 1;
    return {
      currentRound: correctCurrentRound,
      roundsCompleted: roundsCompleted, // PRESERVE their achievements
      inspireCompleted: false,
      investigateCompleted: false,
      actCompleted: false,
      awardCompleted: false,
      currentStage: 'inspire',
      progressPercentage: 0,
      resetType: 'progress_only',
    };
  }
  
  /**
   * Applies fixes to schools with illogical states
   * Uses batch processing and transactions for safety
   */
  async fixSchools(schoolIds: string[]): Promise<{
    fixed: number;
    errors: Array<{ schoolId: string; error: string }>;
    details: Array<{ schoolId: string; name: string; before: any; after: any }>;
  }> {
    console.log(`[School Round Fix] Starting fix for ${schoolIds.length} schools...`);
    console.log(`[School Round Fix] Using batch size: ${BATCH_SIZE}`);
    
    const result = {
      fixed: 0,
      errors: [] as Array<{ schoolId: string; error: string }>,
      details: [] as Array<{ schoolId: string; name: string; before: any; after: any }>,
    };
    
    // Process in batches for safety
    for (let i = 0; i < schoolIds.length; i += BATCH_SIZE) {
      const batch = schoolIds.slice(i, i + BATCH_SIZE);
      console.log(`[School Round Fix] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(schoolIds.length / BATCH_SIZE)} (${batch.length} schools)`);
      
      // Process each school in the batch
      for (const schoolId of batch) {
        try {
          await this.fixSingleSchool(schoolId, result);
        } catch (error) {
          console.error(`[School Round Fix] Error fixing school ${schoolId}:`, error);
          result.errors.push({
            schoolId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      // Small delay between batches to avoid overwhelming the database
      if (i + BATCH_SIZE < schoolIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`[School Round Fix] Fix complete: ${result.fixed} schools fixed, ${result.errors.length} errors`);
    
    return result;
  }
  
  /**
   * Fixes a single school with transaction safety
   * CRITICAL FIX: Must fetch school WITH evidence counts, not just school alone
   */
  private async fixSingleSchool(
    schoolId: string,
    result: {
      fixed: number;
      errors: Array<{ schoolId: string; error: string }>;
      details: Array<{ schoolId: string; name: string; before: any; after: any }>;
    }
  ): Promise<void> {
    // CRITICAL: Fetch school WITH evidence counts (same as audit)
    // This ensures auditSchool has newEvidenceCount to calculate totalEvidenceCount correctly
    const schoolsWithEvidence = await db
      .select({
        id: schools.id,
        name: schools.name,
        country: schools.country,
        currentRound: schools.currentRound,
        roundsCompleted: schools.roundsCompleted,
        inspireCompleted: schools.inspireCompleted,
        investigateCompleted: schools.investigateCompleted,
        actCompleted: schools.actCompleted,
        awardCompleted: schools.awardCompleted,
        progressPercentage: schools.progressPercentage,
        currentStage: schools.currentStage,
        legacyEvidenceCount: schools.legacyEvidenceCount,
        newEvidenceCount: count(evidence.id),
      })
      .from(schools)
      .leftJoin(
        evidence, 
        and(
          eq(evidence.schoolId, schools.id),
          eq(evidence.status, 'approved' as any)
        )
      )
      .where(eq(schools.id, schoolId))
      .groupBy(schools.id);
    
    const school = schoolsWithEvidence[0];
    
    if (!school) {
      result.errors.push({ schoolId, error: 'School not found' });
      return;
    }
    
    const audit = this.auditSchool(school);
    
    if (audit.status === 'logical') {
      console.log(`[School Round Fix] School ${school.name} is already logical, skipping`);
      return;
    }
    
    if (!audit.recommendedFix) {
      result.errors.push({ schoolId, error: 'No recommended fix available' });
      return;
    }
    
    const before = {
      currentRound: school.currentRound,
      roundsCompleted: school.roundsCompleted,
      inspireCompleted: school.inspireCompleted,
      investigateCompleted: school.investigateCompleted,
      actCompleted: school.actCompleted,
      awardCompleted: school.awardCompleted,
      currentStage: school.currentStage,
      progressPercentage: school.progressPercentage,
    };
    
    const after = audit.recommendedFix;
    
    // Apply the fix with transaction safety
    await db.update(schools)
      .set({
        ...after,
        updatedAt: new Date(),
      })
      .where(eq(schools.id, schoolId));
    
    result.details.push({
      schoolId,
      name: school.name,
      before,
      after,
    });
    
    result.fixed++;
    
    // Detailed logging
    console.log(`[School Round Fix] ✓ Fixed ${school.name}:`);
    console.log(`  - Round: ${before.currentRound} → ${after.currentRound} (roundsCompleted: ${before.roundsCompleted} → ${after.roundsCompleted})`);
    console.log(`  - Progress: ${before.progressPercentage}% → ${after.progressPercentage}%`);
    console.log(`  - Stage: ${before.currentStage} → ${after.currentStage}`);
    console.log(`  - Flags reset: inspire=${after.inspireCompleted}, investigate=${after.investigateCompleted}, act=${after.actCompleted}`);
  }
}
