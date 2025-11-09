# Evidence Module

## Overview
This module handles all evidence-related functionality for the Plastic Clever Schools platform, including evidence submission, review workflows, requirements management, and school progression integration.

## Architecture
The Evidence module follows a **4-phase extraction strategy** to safely migrate from monolithic files while maintaining backward compatibility and zero regressions.

### Delegation Pattern

The Evidence module uses **dependency injection via delegates** to avoid tight coupling with other modules and services. This pattern provides:
- **Testability**: Easy to mock dependencies in unit tests
- **Flexibility**: Swap implementations without changing Evidence logic
- **Clear contracts**: Explicit interfaces define dependencies
- **Separation of concerns**: Evidence doesn't know implementation details

#### Delegate Structure

The `EvidenceDelegates` interface aggregates four types of dependencies:

```typescript
interface EvidenceDelegates {
  persistence: Pick<IStorage, 'createEvidence' | 'updateEvidence' | ...>;
  progression: SchoolProgressionDelegate;
  email: EvidenceEmailDelegate;
  files: EvidenceFileDelegate;
}
```

#### 1. Persistence Delegate
**Purpose**: Database operations for evidence and related entities

```typescript
// Evidence CRUD
await this.delegates.persistence.createEvidence(data);
await this.delegates.persistence.updateEvidence(id, updates);
await this.delegates.persistence.getEvidenceById(id);

// School context (needed for evidence operations)
await this.delegates.persistence.getSchool(schoolId);
await this.delegates.persistence.getUserSchools(userId);
```

**Implementation**: Direct pass-through to `IStorage` interface. Uses TypeScript's `Pick<>` utility type to enforce minimal interface principle - Evidence only accesses methods it needs.

#### 2. Progression Delegate
**Purpose**: Trigger school stage advancement and round completion

```typescript
// After approving evidence, check if school should advance
await this.delegates.progression.checkAndUpdateSchoolProgression(
  evidence.schoolId,
  { reason: 'evidence_approved', evidenceId: evidence.id }
);
```

**Implementation**: Wraps `SchoolStorage.checkAndUpdateSchoolProgression()` which:
- Counts approved evidence per stage (inspire/investigate/act)
- Marks stages complete when thresholds met (3+ evidence per stage)
- Advances school to next stage/round
- Generates certificates on round completion
- Sends celebration emails

**Critical**: This is the **highest-risk** integration point. Evidence approval MUST trigger progression correctly or schools won't advance.

#### 3. Email Delegate
**Purpose**: Send evidence-related notifications

```typescript
// Approval notification
await this.delegates.email.sendEvidenceApprovalEmail(id, teacherEmail);

// Rejection with feedback
await this.delegates.email.sendEvidenceRejectionEmail(id, teacherEmail, notes);

// Submission confirmation
await this.delegates.email.sendEvidenceSubmissionConfirmation(id, teacherEmail);
```

**Implementation**: Will be wired to `emailService` in Phase 1/3. Currently stubbed with console.log for infrastructure testing.

#### 4. Files Delegate
**Purpose**: Manage evidence file uploads, deletions, and compression

```typescript
// Upload with ACL policy
const url = await this.delegates.files.uploadFile(file, 'evidence/inspire', isPublic);

// Delete on evidence removal
await this.delegates.files.deleteFile(url);

// Compress before upload
const compressed = await this.delegates.files.compressImage(buffer);
```

**Implementation**: Will be wired to `objectStorage` and `imageCompression` services in Phase 1. Currently stubbed.

#### Delegate Initialization

Delegates are created at app startup and injected into `EvidenceStorage`:

```typescript
import { createSchoolProgressionDelegate } from '../schools';
import { createEvidenceDelegates } from './delegates';

// Create school progression delegate
const progressionDelegate = createSchoolProgressionDelegate(schoolStorage);

// Create evidence delegates with all dependencies
const evidenceDelegates = createEvidenceDelegates(storage, progressionDelegate);

// Initialize evidence storage with delegates
const evidenceStorage = getEvidenceStorage(evidenceDelegates);
```

This happens in `server/storage.ts` or `server/index.ts` during application bootstrap.

#### Testing with Delegates

For unit tests, create mock delegates:

```typescript
const mockDelegates: EvidenceDelegates = {
  persistence: {
    createEvidence: vi.fn(),
    updateEvidence: vi.fn(),
    // ... other methods
  },
  progression: {
    checkAndUpdateSchoolProgression: vi.fn()
  },
  email: {
    sendEvidenceApprovalEmail: vi.fn(),
    sendEvidenceRejectionEmail: vi.fn(),
    sendEvidenceSubmissionConfirmation: vi.fn()
  },
  files: {
    uploadFile: vi.fn().mockResolvedValue('mock-url'),
    deleteFile: vi.fn(),
    compressImage: vi.fn().mockResolvedValue(Buffer.from(''))
  }
};

const storage = new EvidenceStorage(mockDelegates);
```

### Module Organization
- **Routes**: `server/routes.ts` mounts `evidenceRouter` from this module
- **Storage**: `server/storage.ts` delegates evidence methods to `EvidenceStorage` singleton
- **Delegates**: `delegates.ts` defines all dependency interfaces
- **Utilities**: Shared utilities (image compression, object storage) remain in original locations with re-exports

### Critical Dependencies
1. **Schools Module**: Evidence approval triggers school progression via `SchoolProgressionDelegate`
2. **Object Storage**: Evidence files with ACL policies for public/private access (via `EvidenceFileDelegate`)
3. **Photo Consent**: GDPR enforcement for public evidence display
4. **Email Notifications**: 4 types of evidence-related emails (via `EvidenceEmailDelegate`)

## Extraction Phases

### Phase 1: Core CRUD Operations ✅
**Scope**: Basic evidence operations
- POST /api/evidence (submission)
- GET /api/evidence (gallery with filters)
- GET /api/evidence/:id (single view)
- DELETE /api/evidence/:id (pending deletion)

**Storage Methods**:
- createEvidence()
- getEvidence()
- getEvidenceById()
- getAllEvidence()
- deleteEvidence()
- updateEvidence()

**Testing**: CRUD smoke tests via curl

### Phase 2: Evidence Requirements ⏳
**Scope**: Requirements management and multi-language support
- GET /api/evidence-requirements (2 public endpoints)
- POST/PATCH/DELETE /api/evidence-requirements (3 admin endpoints)
- POST /api/evidence-requirements/:id/translate

**Storage Methods**:
- getEvidenceRequirements()
- getEvidenceRequirement()
- createEvidenceRequirement()
- updateEvidenceRequirement()
- deleteEvidenceRequirement()
- translateEvidenceRequirement()

**Testing**: Requirements CRUD + translation tests

### Phase 3: Admin Review & Progression 🔴 CRITICAL
**Scope**: Review workflows and school progression integration
- PATCH /api/admin/evidence/:id (admin update)
- PATCH /api/admin/evidence/:id/review (single review)
- POST /api/admin/evidence/bulk-review
- GET /api/admin/evidence (3 variants - all, pending, approved-public)

**Storage Methods**:
- updateEvidenceStatus()
- getAdminEvidence()
- Delegation to Schools.checkAndUpdateSchoolProgression()

**Testing**: Progression regression tests (MOST CRITICAL)
- Test single review approval triggers school advancement
- Test bulk review operations
- Verify evidence counts affect stage progression
- Test award completion logic

### Phase 4: Import & Migration ⏳
**Scope**: Data migration tools
- POST /api/admin/migration/legacy-evidence
- POST /api/admin/evidence/migrate-urls

**Storage Methods**:
- Import utilities
- CSV parsing
- URL migration helpers

**Testing**: Import validation and data integrity

## Files

### routes.ts
All 18 evidence-related API endpoints organized by:
- Public routes (3)
- Authenticated teacher routes (3)
- Admin/Partner routes (12)

Maintains exact same paths as original to preserve React Query cache keys.

### storage.ts
EvidenceStorage class with 27 evidence operations:
- CRUD operations
- Requirements management
- Review workflows
- Analytics queries
- Admin overrides

Delegates to Schools module for progression updates.

### utils/
Evidence-specific utilities (if needed). Shared utilities remain in original locations.

## Testing Strategy

### Testing Checkpoints
1. **After Phase 1**: CRUD unit/integration smoke tests
2. **After Phase 2**: Requirements CRUD + translation tests
3. **After Phase 3**: Progression/review regressions + bulk review scenarios (CRITICAL)
4. **After Phase 4**: Import CSV validation/process suites
5. **Final**: Targeted E2E regression + comprehensive smoke tests

### Critical Test Scenarios
1. Teacher evidence submission → pending state
2. Admin review approval → school stage advancement
3. Bulk review operations → multiple schools progress
4. Evidence counts → award completion
5. Photo consent → public gallery filtering
6. Multi-language requirements display
7. Evidence deletion → object storage cleanup

## Potential Breakage Points
1. **School Progression Calculation** (HIGHEST RISK)
   - Evidence approval must trigger stage advancement
   - Evidence counts must update correctly
   - Award completion must calculate properly

2. **Round Number Integrity**
   - Evidence must maintain correct round numbers
   - Round changes must be tracked

3. **Photo Consent Enforcement**
   - Public evidence must respect photo consent
   - GDPR compliance required

4. **Evidence Requirements Multi-Language**
   - 14 languages support
   - Translation integrity

5. **Object Storage ACL**
   - Public vs private file access
   - File deletion on evidence deletion

6. **Email Notifications**
   - Approval emails
   - Rejection emails
   - Submission confirmations
   - Bulk operation notifications

## Frontend Consumers
62+ TypeScript files consume evidence APIs:
- Evidence Gallery page
- Evidence submission forms
- Admin Review Queue
- Inspiration page (public evidence)
- Analytics dashboards
- Case Study wizard
- School dashboard

## Rollback Strategy
If issues arise during extraction:
1. Remove delegation in main routes.ts/storage.ts
2. Comment out evidence module imports
3. Restart workflow
4. Original monolithic code remains as backup

## Success Criteria
- ✅ All 18 endpoints functional
- ✅ Zero regressions in evidence workflows
- ✅ School progression working correctly
- ✅ All 62+ frontend consumers compatible
- ✅ Photo consent enforcement intact
- ✅ Multi-language support preserved
- ✅ Object storage ACL working
- ✅ Email notifications sending
- ✅ TypeScript errors: 0
- ✅ LSP diagnostics: 0 critical errors
- ✅ E2E tests passing

## References
- Discovery Document: `EVIDENCE_MODULE_DISCOVERY.md`
- Schools Module: `server/features/schools/`
- Original Routes: `server/routes.ts` (lines 1230-6275)
- Original Storage: `server/storage.ts` (345 evidence mentions)
