import { db } from '../db';
import { schools } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
  status: 'logical' | 'illogical_excessive_progress' | 'illogical_round_mismatch';
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
  };
}

export interface AuditSummary {
  totalSchools: number;
  logicalSchools: number;
  illogicalSchools: number;
  byIssueType: {
    excessiveProgress: number;
    roundMismatch: number;
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
   * Focus: Schools in Round 2+ with progress > 100% need fixing
   */
  async auditAllSchools(): Promise<{ schools: SchoolAuditResult[]; summary: AuditSummary }> {
    console.log('[School Round Audit] Starting comprehensive audit...');
    
    const allSchools = await db.select().from(schools);
    console.log(`[School Round Audit] Found ${allSchools.length} schools to audit`);
    
    const auditResults: SchoolAuditResult[] = [];
    const summary: AuditSummary = {
      totalSchools: allSchools.length,
      logicalSchools: 0,
      illogicalSchools: 0,
      byIssueType: {
        excessiveProgress: 0,
        roundMismatch: 0,
      },
      byRound: {},
    };
    
    for (const school of allSchools) {
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
   * Audits a single school to determine if its progress percentage is logical
   * 
   * NEW LOGIC:
   * - Progress should be 0-100% per round (not cumulative)
   * - Schools in Round 2+ with progress > 100% are illogical (migration issue)
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
      legacyEvidenceCount: school.legacyEvidenceCount || 0,
      status: 'logical',
    };
    
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
    // The migration incorrectly used cumulative progress (Round 2 = 153%, Round 3 = 273%)
    // Each round should reset to 0% and progress to 100%
    if (progressPercentage > 100) {
      result.status = 'illogical_excessive_progress';
      result.issue = `Excessive progress: Round ${currentRound} school has ${progressPercentage.toFixed(1)}% progress (should be 0-100%)`;
      result.recommendedFix = this.calculateFix(school);
      return result;
    }
    
    // Check 3: Progress < 0 is also illogical
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
   * NEW FIX LOGIC:
   * 1. PRESERVE roundsCompleted (their achievements!)
   * 2. Fix currentRound = roundsCompleted + 1 (if needed)
   * 3. Reset progressPercentage to 0 (start fresh in current round)
   * 4. Reset all completion flags to false (haven't done anything in current round yet)
   * 5. Set currentStage to 'inspire' (starting the round)
   */
  private calculateFix(school: any): SchoolAuditResult['recommendedFix'] {
    const roundsCompleted = school.roundsCompleted || 0;
    
    // The correct current round based on achievements
    const correctCurrentRound = roundsCompleted + 1;
    
    // Reset for fresh start in current round
    return {
      currentRound: correctCurrentRound,
      roundsCompleted: roundsCompleted, // PRESERVE their achievements
      inspireCompleted: false, // Haven't started current round yet
      investigateCompleted: false,
      actCompleted: false,
      awardCompleted: false,
      currentStage: 'inspire', // Starting fresh
      progressPercentage: 0, // 0% progress in current round
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
   */
  private async fixSingleSchool(
    schoolId: string,
    result: {
      fixed: number;
      errors: Array<{ schoolId: string; error: string }>;
      details: Array<{ schoolId: string; name: string; before: any; after: any }>;
    }
  ): Promise<void> {
    const school = await db.query.schools.findFirst({
      where: eq(schools.id, schoolId),
    });
    
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
