# Evidence Module

## Overview
This module handles all evidence-related functionality for the Plastic Clever Schools platform, including evidence submission, review workflows, requirements management, and school progression integration.

## Architecture
The Evidence module follows a **4-phase extraction strategy** to safely migrate from monolithic files while maintaining backward compatibility and zero regressions.

### Delegation Pattern
- **Routes**: `server/routes.ts` mounts `evidenceRouter` from this module
- **Storage**: `server/storage.ts` delegates evidence methods to `EvidenceStorage` singleton
- **Utilities**: Shared utilities (image compression, object storage) remain in original locations with re-exports

### Critical Dependencies
1. **Schools Module**: Evidence approval triggers school progression via `checkAndUpdateSchoolProgression()`
2. **Object Storage**: Evidence files with ACL policies for public/private access
3. **Photo Consent**: GDPR enforcement for public evidence display
4. **Email Notifications**: 4 types of evidence-related emails

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
