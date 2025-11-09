import type { EvidenceDelegates } from './delegates';
import type { 
  Evidence, 
  InsertEvidence, 
  EvidenceWithSchool,
  EvidenceRequirement,
  InsertEvidenceRequirement
} from '@shared/schema';
import { db } from '../../db';
import { evidence, evidenceRequirements, schools, users } from '@shared/schema';
import { eq, and, or, desc, asc, ilike } from 'drizzle-orm';

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
    const [evidenceRecord] = await db
      .insert(evidence)
      .values(data)
      .returning();
    return evidenceRecord;
  }

  /**
   * Get evidence by ID (simple lookup)
   * @param id - Evidence ID
   * @returns Evidence record or undefined
   */
  async getEvidence(id: string): Promise<Evidence | undefined> {
    const [evidenceRecord] = await db
      .select()
      .from(evidence)
      .where(eq(evidence.id, id));
    return evidenceRecord;
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
    const [evidenceRecord] = await db
      .select({
        id: evidence.id,
        schoolId: evidence.schoolId,
        submittedBy: evidence.submittedBy,
        evidenceRequirementId: evidence.evidenceRequirementId,
        title: evidence.title,
        description: evidence.description,
        stage: evidence.stage,
        status: evidence.status,
        visibility: evidence.visibility,
        files: evidence.files,
        videoLinks: evidence.videoLinks,
        reviewedBy: evidence.reviewedBy,
        reviewedAt: evidence.reviewedAt,
        reviewNotes: evidence.reviewNotes,
        isFeatured: evidence.isFeatured,
        isAuditQuiz: evidence.isAuditQuiz,
        roundNumber: evidence.roundNumber,
        hasChildren: evidence.hasChildren,
        parentalConsentFiles: evidence.parentalConsentFiles,
        submittedAt: evidence.submittedAt,
        updatedAt: evidence.updatedAt,
        schoolName: schools.name,
        schoolCountry: schools.country,
        schoolLanguage: schools.primaryLanguage,
      })
      .from(evidence)
      .leftJoin(schools, eq(evidence.schoolId, schools.id))
      .where(eq(evidence.id, id))
      .limit(1);
    
    return evidenceRecord as any;
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
    // Build WHERE conditions
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(evidence.status, filters.status));
    }
    if (filters?.stage) {
      conditions.push(eq(evidence.stage, filters.stage));
    }
    if (filters?.schoolId) {
      conditions.push(eq(evidence.schoolId, filters.schoolId));
    }
    if (filters?.visibility) {
      conditions.push(eq(evidence.visibility, filters.visibility));
    }
    if (filters?.country) {
      conditions.push(eq(schools.country, filters.country));
    }
    if (filters?.assignedTo) {
      conditions.push(eq(evidence.assignedTo, filters.assignedTo));
    }

    // Query with JOIN to include school data and reviewer info
    const query = db
      .select({
        id: evidence.id,
        schoolId: evidence.schoolId,
        submittedBy: evidence.submittedBy,
        evidenceRequirementId: evidence.evidenceRequirementId,
        title: evidence.title,
        description: evidence.description,
        stage: evidence.stage,
        status: evidence.status,
        visibility: evidence.visibility,
        files: evidence.files,
        videoLinks: evidence.videoLinks,
        reviewedBy: evidence.reviewedBy,
        reviewedAt: evidence.reviewedAt,
        reviewNotes: evidence.reviewNotes,
        assignedTo: evidence.assignedTo,
        isFeatured: evidence.isFeatured,
        isAuditQuiz: evidence.isAuditQuiz,
        roundNumber: evidence.roundNumber,
        hasChildren: evidence.hasChildren,
        parentalConsentFiles: evidence.parentalConsentFiles,
        submittedAt: evidence.submittedAt,
        updatedAt: evidence.updatedAt,
        school: {
          id: schools.id,
          name: schools.name,
          country: schools.country,
          photoConsentStatus: schools.photoConsentStatus,
          photoConsentDocumentUrl: schools.photoConsentDocumentUrl,
        },
        reviewer: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(evidence)
      .leftJoin(schools, eq(evidence.schoolId, schools.id))
      .leftJoin(users, eq(evidence.reviewedBy, users.id));

    const results = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(evidence.submittedAt))
      : await query.orderBy(desc(evidence.submittedAt));
    
    return results.filter(r => r.school !== null) as Array<EvidenceWithSchool>;
  }

  /**
   * Update evidence record
   * @param id - Evidence ID
   * @param updates - Fields to update
   * @returns Updated evidence record or undefined
   */
  async updateEvidence(id: string, updates: Partial<InsertEvidence>): Promise<Evidence | undefined> {
    const [evidenceRecord] = await db
      .update(evidence)
      .set({
        ...updates,
        updatedAt: new Date(),
      } as any)
      .where(eq(evidence.id, id))
      .returning();
    return evidenceRecord;
  }

  /**
   * Delete evidence record
   * @param id - Evidence ID
   * @returns true if deleted, false otherwise
   */
  async deleteEvidence(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(evidence)
        .where(eq(evidence.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Error deleting evidence:", error);
      return false;
    }
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
    // Delegate to the getAllEvidence method (already implemented above)
    // This method already provides all the admin review functionality
    return await this.getAllEvidence(filters);
  }

  /**
   * Get all pending evidence for review queue
   * Admin helper for evidence that needs review
   * 
   * @returns Array of pending evidence submissions
   */
  async getPendingEvidence(): Promise<Evidence[]> {
    return await db
      .select()
      .from(evidence)
      .where(eq(evidence.status, 'pending'))
      .orderBy(desc(evidence.submittedAt));
  }

  /**
   * Get approved public evidence for case studies
   * Admin helper for selecting featured evidence
   * 
   * @returns Array of approved public evidence
   */
  async getApprovedPublicEvidence(): Promise<Evidence[]> {
    return await db
      .select()
      .from(evidence)
      .where(
        and(
          eq(evidence.status, 'approved'),
          eq(evidence.visibility, 'public')
        )
      )
      .orderBy(desc(evidence.submittedAt));
  }

  /**
   * Assign evidence to admin for review
   * Updates assignedTo field and tracks assignments
   * 
   * @param evidenceId - Evidence ID to assign
   * @param assignedToUserId - Admin user ID or null to unassign
   */
  async assignEvidence(evidenceId: string, assignedToUserId: string | null): Promise<void> {
    await db
      .update(evidence)
      .set({ 
        assignedTo: assignedToUserId,
        updatedAt: new Date(),
      })
      .where(eq(evidence.id, evidenceId));
  }

  /**
   * Get approved evidence for inspiration page with filters
   * Includes school details and supports pagination
   * 
   * @param filters - Filter criteria including stage, country, search, pagination
   * @returns Array of approved evidence with school details
   */
  async getApprovedEvidenceForInspiration(filters?: {
    stage?: string;
    country?: string;
    search?: string;
    visibility?: 'public' | 'private';
    limit?: number;
    offset?: number;
  }): Promise<Array<EvidenceWithSchool & { 
    schoolName: string;
    schoolCountry: string;
    schoolLanguage: string | null;
  }>> {
    const conditions = [
      eq(evidence.status, 'approved'),
      eq(schools.photoConsentStatus, 'approved')
    ];
    
    // Visibility filter logic:
    // - If 'public': show only public evidence
    // - If 'private': This filter is handled at route level with ACL checks
    if (filters?.visibility === 'public') {
      conditions.push(eq(evidence.visibility, 'public'));
    } else if (filters?.visibility === 'private') {
      conditions.push(eq(evidence.visibility, 'private'));
    }
    
    if (filters?.stage) {
      conditions.push(eq(evidence.stage, filters.stage as any));
    }
    
    if (filters?.country) {
      conditions.push(eq(schools.country, filters.country));
    }
    
    if (filters?.search) {
      const searchCondition = or(
        ilike(evidence.title, `%${filters.search}%`),
        ilike(evidence.description, `%${filters.search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }
    
    let query = db
      .select({
        id: evidence.id,
        schoolId: evidence.schoolId,
        submittedBy: evidence.submittedBy,
        evidenceRequirementId: evidence.evidenceRequirementId,
        title: evidence.title,
        description: evidence.description,
        stage: evidence.stage,
        status: evidence.status,
        visibility: evidence.visibility,
        files: evidence.files,
        videoLinks: evidence.videoLinks,
        reviewedBy: evidence.reviewedBy,
        reviewedAt: evidence.reviewedAt,
        reviewNotes: evidence.reviewNotes,
        isFeatured: evidence.isFeatured,
        isAuditQuiz: evidence.isAuditQuiz,
        roundNumber: evidence.roundNumber,
        hasChildren: evidence.hasChildren,
        parentalConsentFiles: evidence.parentalConsentFiles,
        submittedAt: evidence.submittedAt,
        updatedAt: evidence.updatedAt,
        school: {
          id: schools.id,
          name: schools.name,
          country: schools.country,
        },
        schoolName: schools.name,
        schoolCountry: schools.country,
        schoolLanguage: schools.primaryLanguage,
      })
      .from(evidence)
      .leftJoin(schools, eq(evidence.schoolId, schools.id));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    // Order by featured first, then by submission date
    query = query.orderBy(desc(evidence.isFeatured), desc(evidence.submittedAt)) as any;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }
    
    return await query as any;
  }

  /**
   * Get evidence by file URL
   * Searches for evidence containing a specific file URL
   * 
   * @param fileUrl - File URL to search for
   * @returns Evidence with matching file or undefined
   */
  async getEvidenceByFileUrl(fileUrl: string): Promise<(EvidenceWithSchool & { 
    schoolName: string;
    schoolCountry: string;
    schoolLanguage: string | null;
  }) | undefined> {
    // Extract file ID from various URL formats
    const fileId = fileUrl.split('/').pop() || '';
    
    // Query evidence where the files JSON contains this file ID
    const results = await db
      .select({
        id: evidence.id,
        schoolId: evidence.schoolId,
        submittedBy: evidence.submittedBy,
        evidenceRequirementId: evidence.evidenceRequirementId,
        title: evidence.title,
        description: evidence.description,
        stage: evidence.stage,
        status: evidence.status,
        visibility: evidence.visibility,
        files: evidence.files,
        videoLinks: evidence.videoLinks,
        reviewedBy: evidence.reviewedBy,
        reviewedAt: evidence.reviewedAt,
        reviewNotes: evidence.reviewNotes,
        isFeatured: evidence.isFeatured,
        isAuditQuiz: evidence.isAuditQuiz,
        roundNumber: evidence.roundNumber,
        hasChildren: evidence.hasChildren,
        parentalConsentFiles: evidence.parentalConsentFiles,
        submittedAt: evidence.submittedAt,
        updatedAt: evidence.updatedAt,
        school: {
          id: schools.id,
          name: schools.name,
          country: schools.country,
        },
        schoolName: schools.name,
        schoolCountry: schools.country,
        schoolLanguage: schools.primaryLanguage,
      })
      .from(evidence)
      .leftJoin(schools, eq(evidence.schoolId, schools.id))
      .where(eq(evidence.status, 'approved'));
    
    // Filter in JavaScript to check the files JSON array
    const matchingEvidence = results.find((ev: any) => {
      const files = Array.isArray(ev.files) ? ev.files : [];
      return files.some((file: any) => 
        file.url && (
          file.url.includes(fileId) || 
          file.url === `/objects/uploads/${fileId}` ||
          file.url === `/api/objects/uploads/${fileId}`
        )
      );
    });
    
    return matchingEvidence as any;
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
