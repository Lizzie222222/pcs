import type { SchoolStorage } from './storage';
import type { School } from '@shared/schema';

/**
 * Trigger information for progression updates
 * Used to track what initiated the progression check
 */
export interface ProgressionTrigger {
  reason?: 'evidence_approved' | 'audit_completed' | 'manual_admin';
  evidenceId?: string;
}

/**
 * School Progression Delegate
 * 
 * Exposes school progression logic to other modules (like Evidence)
 * without creating tight coupling. This delegate wraps the complex
 * progression calculation logic that:
 * - Checks evidence completion for each stage
 * - Advances school stages (inspire → investigate → act)
 * - Handles round completion and award generation
 * - Updates progress percentages
 * - Generates certificates
 * - Sends celebration emails
 */
export interface SchoolProgressionDelegate {
  /**
   * Check and update a school's progression based on completed evidence
   * 
   * This is the core progression logic that:
   * 1. Counts approved evidence per stage
   * 2. Marks stages as complete when thresholds are met
   * 3. Advances to next stage/round when appropriate
   * 4. Generates certificates on round completion
   * 5. Sends celebration emails
   * 
   * @param schoolId - The school to check progression for
   * @param opts - Optional trigger information for logging/tracking
   * @returns Updated school record, or undefined if school not found
   */
  checkAndUpdateSchoolProgression(schoolId: string, opts?: ProgressionTrigger): Promise<School | undefined>;
}

/**
 * Create a School Progression Delegate
 * 
 * Factory function that creates a delegate wrapping SchoolStorage's
 * progression logic. This allows Evidence module to trigger progression
 * updates without direct dependency on SchoolStorage implementation.
 * 
 * @param schoolStorage - The SchoolStorage instance containing progression logic
 * @returns SchoolProgressionDelegate implementation
 */
export function createSchoolProgressionDelegate(schoolStorage: SchoolStorage): SchoolProgressionDelegate {
  return {
    async checkAndUpdateSchoolProgression(schoolId: string, opts?: ProgressionTrigger): Promise<School | undefined> {
      // Delegate to the existing SchoolStorage implementation
      // The SchoolStorage.checkAndUpdateSchoolProgression method contains the full logic for:
      // - Evidence counting
      // - Stage completion checks
      // - Round advancement
      // - Certificate generation
      // - Email notifications
      
      // Optional: Log trigger information for debugging
      if (opts?.reason && process.env.NODE_ENV === 'development') {
        console.log(`[Progression Delegate] Triggered by ${opts.reason}${opts.evidenceId ? ` (evidence: ${opts.evidenceId})` : ''}`);
      }
      
      return schoolStorage.checkAndUpdateSchoolProgression(schoolId);
    }
  };
}
