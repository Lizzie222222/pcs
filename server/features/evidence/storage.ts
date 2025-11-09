import type { EvidenceDelegates } from './delegates';

/**
 * Evidence Storage
 * 
 * Handles all evidence-related data operations using the delegation pattern.
 * This class will be extracted from server/storage.ts in 4 phases:
 * 
 * - Phase 1: Core CRUD operations (6 methods)
 * - Phase 2: Requirements management (6 methods)
 * - Phase 3: Admin review operations (2 methods + delegation to Schools)
 * - Phase 4: Import/migration utilities
 * 
 * The delegation pattern allows Evidence module to:
 * 1. Persist data via delegates.persistence (IStorage subset)
 * 2. Trigger school progression via delegates.progression
 * 3. Send emails via delegates.email
 * 4. Manage files via delegates.files
 */
export class EvidenceStorage {
  private delegates: EvidenceDelegates;

  constructor(delegates: EvidenceDelegates) {
    this.delegates = delegates;
  }

  /**
   * Example delegation patterns for each phase:
   * 
   * PHASE 1: Core CRUD Operations
   * ===============================
   * 
   * async createEvidence(data: InsertEvidence): Promise<Evidence> {
   *   // 1. Upload files if present
   *   if (data.files) {
   *     const uploadedUrls = await Promise.all(
   *       data.files.map(file => 
   *         this.delegates.files.uploadFile(file, `evidence/${data.stage}`, data.isPublic)
   *       )
   *     );
   *     data.fileUrls = uploadedUrls;
   *   }
   *   
   *   // 2. Persist to database
   *   const evidence = await this.delegates.persistence.createEvidence(data);
   *   
   *   // 3. Send confirmation email
   *   const school = await this.delegates.persistence.getSchool(evidence.schoolId);
   *   if (school?.primaryContactId) {
   *     const user = await this.delegates.persistence.getSchoolUser(school.id, school.primaryContactId);
   *     if (user?.email) {
   *       await this.delegates.email.sendEvidenceSubmissionConfirmation(evidence.id, user.email);
   *     }
   *   }
   *   
   *   // 4. Auto-approve if criteria met (some evidence types)
   *   if (shouldAutoApprove(evidence)) {
   *     await this.delegates.progression.checkAndUpdateSchoolProgression(
   *       evidence.schoolId,
   *       { reason: 'evidence_approved', evidenceId: evidence.id }
   *     );
   *   }
   *   
   *   return evidence;
   * }
   * 
   * async deleteEvidence(id: string): Promise<boolean> {
   *   // 1. Get evidence to find file URLs
   *   const evidence = await this.delegates.persistence.getEvidence(id);
   *   if (!evidence) return false;
   *   
   *   // 2. Delete from database
   *   const deleted = await this.delegates.persistence.deleteEvidence(id);
   *   
   *   // 3. Delete associated files
   *   if (deleted && evidence.fileUrls) {
   *     await Promise.all(
   *       evidence.fileUrls.map(url => this.delegates.files.deleteFile(url))
   *     );
   *   }
   *   
   *   return deleted;
   * }
   * 
   * 
   * PHASE 2: Evidence Requirements Management
   * ==========================================
   * 
   * async getEvidenceRequirements(filters?: { stage?: string; language?: string }): Promise<EvidenceRequirement[]> {
   *   // Direct delegation to persistence
   *   return this.delegates.persistence.getEvidenceRequirements(filters);
   * }
   * 
   * async createEvidenceRequirement(data: InsertEvidenceRequirement): Promise<EvidenceRequirement> {
   *   // Direct delegation to persistence
   *   return this.delegates.persistence.createEvidenceRequirement(data);
   * }
   * 
   * 
   * PHASE 3: Admin Review & School Progression (CRITICAL)
   * =====================================================
   * 
   * async approveEvidence(id: string, reviewedBy: string, reviewNotes?: string): Promise<Evidence> {
   *   // 1. Get evidence to find school and contact
   *   const evidence = await this.delegates.persistence.getEvidenceById(id);
   *   if (!evidence) throw new Error('Evidence not found');
   *   
   *   // 2. Update status to approved
   *   const updated = await this.delegates.persistence.updateEvidence(id, {
   *     status: 'approved',
   *     reviewedBy,
   *     reviewNotes,
   *     reviewedAt: new Date()
   *   });
   *   
   *   // 3. CRITICAL: Trigger school progression check
   *   // This may advance the school's stage or complete their round
   *   await this.delegates.progression.checkAndUpdateSchoolProgression(
   *     evidence.schoolId,
   *     { reason: 'evidence_approved', evidenceId: id }
   *   );
   *   
   *   // 4. Send approval email to teacher
   *   const school = await this.delegates.persistence.getSchool(evidence.schoolId);
   *   if (school?.primaryContactId) {
   *     const user = await this.delegates.persistence.getSchoolUser(school.id, school.primaryContactId);
   *     if (user?.email) {
   *       await this.delegates.email.sendEvidenceApprovalEmail(id, user.email);
   *     }
   *   }
   *   
   *   return updated;
   * }
   * 
   * async rejectEvidence(id: string, reviewedBy: string, reviewNotes: string): Promise<Evidence> {
   *   // 1. Get evidence to find school and contact
   *   const evidence = await this.delegates.persistence.getEvidenceById(id);
   *   if (!evidence) throw new Error('Evidence not found');
   *   
   *   // 2. Update status to rejected
   *   const updated = await this.delegates.persistence.updateEvidence(id, {
   *     status: 'rejected',
   *     reviewedBy,
   *     reviewNotes,
   *     reviewedAt: new Date()
   *   });
   *   
   *   // 3. Send rejection email with feedback
   *   const school = await this.delegates.persistence.getSchool(evidence.schoolId);
   *   if (school?.primaryContactId) {
   *     const user = await this.delegates.persistence.getSchoolUser(school.id, school.primaryContactId);
   *     if (user?.email) {
   *       await this.delegates.email.sendEvidenceRejectionEmail(id, user.email, reviewNotes);
   *     }
   *   }
   *   
   *   return updated;
   * }
   * 
   * async bulkReview(evidenceIds: string[], status: 'approved' | 'rejected', reviewedBy: string): Promise<void> {
   *   // Process each evidence item
   *   for (const id of evidenceIds) {
   *     if (status === 'approved') {
   *       await this.approveEvidence(id, reviewedBy);
   *     } else {
   *       await this.rejectEvidence(id, reviewedBy, 'Bulk rejection');
   *     }
   *   }
   *   
   *   // Collect unique school IDs and trigger progression check for each
   *   const evidenceList = await Promise.all(
   *     evidenceIds.map(id => this.delegates.persistence.getEvidenceById(id))
   *   );
   *   const uniqueSchoolIds = [...new Set(evidenceList.map(e => e?.schoolId).filter(Boolean))];
   *   
   *   // Check progression for all affected schools
   *   await Promise.all(
   *     uniqueSchoolIds.map(schoolId => 
   *       this.delegates.progression.checkAndUpdateSchoolProgression(schoolId!, {
   *         reason: 'evidence_approved'
   *       })
   *     )
   *   );
   * }
   * 
   * 
   * PHASE 4: Import & Migration
   * ===========================
   * 
   * async importLegacyEvidence(csvData: string): Promise<{ imported: number; errors: string[] }> {
   *   // Parse CSV, create evidence records
   *   // Use delegates.persistence.createEvidence() for each row
   *   // Use delegates.progression for schools that now meet criteria
   * }
   */

  // Evidence storage methods will be extracted here in 4 phases
  // For now, this is just the infrastructure skeleton
}

/**
 * Singleton instance
 * 
 * The Evidence storage is a singleton to ensure consistent state
 * across the application. It will be initialized with delegates
 * during app startup.
 */
let evidenceStorageInstance: EvidenceStorage | null = null;

/**
 * Get or create Evidence Storage instance
 * 
 * @param delegates - Evidence delegates for persistence, progression, email, and files
 * @returns Singleton EvidenceStorage instance
 */
export function getEvidenceStorage(delegates: EvidenceDelegates): EvidenceStorage {
  if (!evidenceStorageInstance) {
    evidenceStorageInstance = new EvidenceStorage(delegates);
  }
  return evidenceStorageInstance;
}
