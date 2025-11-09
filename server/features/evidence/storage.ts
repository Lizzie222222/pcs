import type { EvidenceDelegates } from './delegates';
import type { 
  Evidence, 
  InsertEvidence, 
  EvidenceWithSchool,
  EvidenceRequirement,
  InsertEvidenceRequirement
} from '@shared/schema';

/**
 * Evidence Storage
 * 
 * Handles all evidence-related data operations using the delegation pattern.
 * This class will be extracted from server/storage.ts in 4 phases:
 * 
 * - Phase 1: Core CRUD operations (6 methods) ✓
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
   * PHASE 1: Core CRUD Operations
   * ===============================
   */

  /**
   * Create new evidence record
   * @param data - Evidence data to insert
   * @returns Created evidence record
   */
  async createEvidence(data: InsertEvidence): Promise<Evidence> {
    // Delegate to persistence layer (IStorage)
    return await this.delegates.persistence.createEvidence(data);
  }

  /**
   * Get evidence by ID (simple lookup)
   * @param id - Evidence ID
   * @returns Evidence record or undefined
   */
  async getEvidence(id: string): Promise<Evidence | undefined> {
    // Delegate to persistence layer
    return await this.delegates.persistence.getEvidence(id);
  }

  /**
   * Get evidence by ID with school details
   * @param id - Evidence ID
   * @returns Evidence with school data or undefined
   */
  async getEvidenceById(id: string): Promise<EvidenceWithSchool & { 
    schoolName: string; 
    schoolCountry: string; 
    schoolLanguage: string | null 
  } | undefined> {
    // Delegate to persistence layer
    return await this.delegates.persistence.getEvidenceById(id);
  }

  /**
   * Get all evidence with filters
   * @param filters - Filter criteria
   * @returns Array of evidence with school details
   */
  async getAllEvidence(filters?: {
    status?: 'pending' | 'approved' | 'rejected';
    stage?: 'inspire' | 'investigate' | 'act';
    schoolId?: string;
    country?: string;
    visibility?: 'public' | 'private';
    assignedTo?: string;
  }): Promise<EvidenceWithSchool[]> {
    // Delegate to persistence layer
    return await this.delegates.persistence.getAllEvidence(filters);
  }

  /**
   * Update evidence record
   * @param id - Evidence ID
   * @param updates - Fields to update
   * @returns Updated evidence record or undefined
   */
  async updateEvidence(id: string, updates: Partial<InsertEvidence>): Promise<Evidence | undefined> {
    // Delegate to persistence layer
    return await this.delegates.persistence.updateEvidence(id, updates);
  }

  /**
   * Delete evidence record
   * @param id - Evidence ID
   * @returns true if deleted, false otherwise
   */
  async deleteEvidence(id: string): Promise<boolean> {
    // Delegate to persistence layer
    return await this.delegates.persistence.deleteEvidence(id);
  }

  /**
   * PHASE 2: Evidence Requirements Methods
   * ========================================
   */

  /**
   * Get all evidence requirements, optionally filtered by stage
   * Requirements define what evidence is needed for each stage (inspire/investigate/act)
   * Supports multi-language translations (14 languages)
   * 
   * @param stage - Optional stage filter ('inspire' | 'investigate' | 'act')
   * @returns Array of evidence requirements
   */
  async getEvidenceRequirements(stage?: 'inspire' | 'investigate' | 'act'): Promise<EvidenceRequirement[]> {
    // Delegate to persistence layer
    return await this.delegates.persistence.getEvidenceRequirements(stage);
  }

  /**
   * Get single evidence requirement by ID
   * 
   * @param id - Evidence requirement ID
   * @returns Evidence requirement or undefined
   */
  async getEvidenceRequirement(id: string): Promise<EvidenceRequirement | undefined> {
    // Delegate to persistence layer
    return await this.delegates.persistence.getEvidenceRequirement(id);
  }

  /**
   * Create new evidence requirement
   * Used by admins to define what evidence schools must submit per stage
   * 
   * @param data - Evidence requirement data to insert
   * @returns Created evidence requirement
   */
  async createEvidenceRequirement(data: InsertEvidenceRequirement): Promise<EvidenceRequirement> {
    // Delegate to persistence layer
    return await this.delegates.persistence.createEvidenceRequirement(data);
  }

  /**
   * Update evidence requirement
   * Used to modify requirement details, translations, or ordering
   * 
   * @param id - Evidence requirement ID
   * @param updates - Fields to update
   * @returns Updated evidence requirement or undefined
   */
  async updateEvidenceRequirement(
    id: string, 
    updates: Partial<InsertEvidenceRequirement>
  ): Promise<EvidenceRequirement | undefined> {
    // Delegate to persistence layer
    return await this.delegates.persistence.updateEvidenceRequirement(id, updates);
  }

  /**
   * Delete evidence requirement
   * Removes a requirement definition from the system
   * 
   * @param id - Evidence requirement ID
   * @returns true if deleted, false otherwise
   */
  async deleteEvidenceRequirement(id: string): Promise<boolean> {
    // Delegate to persistence layer
    return await this.delegates.persistence.deleteEvidenceRequirement(id);
  }

  /**
   * PHASE 3: Admin Review Methods
   * ===============================
   */

  /**
   * Update evidence status (approve/reject)
   * CRITICAL: Triggers school progression via delegate
   * 
   * This is the most important method in the Evidence module because:
   * - Approving evidence can trigger school stage progression (inspire → investigate → act)
   * - Stage progression affects award completion and certificate generation
   * - Any bugs here will break the core platform functionality
   * 
   * @param id - Evidence ID to update
   * @param status - New status ('approved' or 'rejected')
   * @param reviewedBy - Admin user ID performing the review
   * @param reviewNotes - Optional notes/feedback for the school
   * @returns Updated evidence record or undefined
   */
  async updateEvidenceStatus(
    id: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<Evidence | undefined> {
    // Get evidence first to know the schoolId for progression check
    const evidence = await this.delegates.persistence.getEvidenceById(id);
    if (!evidence) {
      throw new Error('Evidence not found');
    }

    // Update status via persistence layer
    const updated = await this.delegates.persistence.updateEvidenceStatus(
      id,
      status,
      reviewedBy,
      reviewNotes
    );

    // CRITICAL: Trigger school progression check if approved
    // This may advance the school to the next stage or complete a round
    if (status === 'approved' && updated) {
      await this.delegates.progression.checkAndUpdateSchoolProgression(
        evidence.schoolId,
        {
          reason: 'evidence_approved',
          evidenceId: id
        }
      );
    }

    return updated;
  }

  /**
   * Get evidence for admin review
   * 
   * This is a convenience wrapper around getAllEvidence with admin-specific semantics.
   * Admins use this to review evidence submissions with filtering, pagination, and sorting.
   * 
   * Supports:
   * - Filtering by status, stage, school, country, visibility, assignment
   * - Full school and reviewer details in response
   * 
   * Note: Pagination and advanced sorting should be handled at the route level
   * or by using the underlying getAllEvidence method with custom post-processing.
   * 
   * @param filters - Filter criteria for evidence retrieval
   * @returns Array of evidence with school details
   */
  async getAdminEvidence(filters?: {
    status?: 'pending' | 'approved' | 'rejected';
    stage?: 'inspire' | 'investigate' | 'act';
    schoolId?: string;
    country?: string;
    visibility?: 'public' | 'private';
    assignedTo?: string;
  }): Promise<EvidenceWithSchool[]> {
    // Delegate to the getAllEvidence method (extracted in Phase 1)
    // This method already provides all the admin review functionality
    return await this.delegates.persistence.getAllEvidence(filters);
  }

  /**
   * Get all pending evidence for review queue
   * Admin helper for evidence that needs review
   * 
   * @returns Array of pending evidence submissions
   */
  async getPendingEvidence(): Promise<Evidence[]> {
    return await this.delegates.persistence.getPendingEvidence();
  }

  /**
   * Get approved public evidence for case studies
   * Admin helper for selecting featured evidence
   * 
   * @returns Array of approved public evidence
   */
  async getApprovedPublicEvidence(): Promise<Evidence[]> {
    return await this.delegates.persistence.getApprovedPublicEvidence();
  }

  /**
   * Assign evidence to admin for review
   * Updates assignedTo field and tracks assignments
   * 
   * @param evidenceId - Evidence ID to assign
   * @param assignedToUserId - Admin user ID or null to unassign
   */
  async assignEvidence(evidenceId: string, assignedToUserId: string | null): Promise<void> {
    return await this.delegates.persistence.assignEvidence(evidenceId, assignedToUserId);
  }

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
