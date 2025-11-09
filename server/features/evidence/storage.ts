import type { IStorage } from '../../storage';

export class EvidenceStorage {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  // Evidence storage methods will be extracted here in 4 phases:
  // Phase 1: Core CRUD operations (6 methods)
  // Phase 2: Requirements management (6 methods)
  // Phase 3: Admin review operations (2 methods + delegation to Schools)
  // Phase 4: Import/migration utilities
}

// Singleton instance
let evidenceStorageInstance: EvidenceStorage | null = null;

export function getEvidenceStorage(storage: IStorage): EvidenceStorage {
  if (!evidenceStorageInstance) {
    evidenceStorageInstance = new EvidenceStorage(storage);
  }
  return evidenceStorageInstance;
}
