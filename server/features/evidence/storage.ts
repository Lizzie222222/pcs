import type { EvidenceDelegates } from './delegates';
import type { 
  Evidence, 
  InsertEvidence, 
  EvidenceWithSchool 
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
