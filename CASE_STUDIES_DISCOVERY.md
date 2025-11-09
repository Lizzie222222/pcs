# Case Studies Module Extraction - Discovery Document

## ENDPOINTS INVENTORY (16 total)

### Public Routes (4 endpoints) - Mount at `/api/case-studies`
1. **GET /api/case-studies** (line 1127)
   - Gallery list with filters
   - Public access
   
2. **GET /api/case-studies/:id** (line 1176)
   - View single case study
   - Public access
   
3. **GET /api/case-studies/:id/related** (line 1260)
   - Get related case studies
   - Public access
   
4. **GET /api/case-studies/:id/pdf** (line 1290)
   - PDF export (INLINE PUPPETEER CODE - NEEDS REFACTORING)
   - Public access
   - **CRITICAL: Must unify with generatePDFReport**

### Media Routes (2 endpoints) - Mount at `/api/case-studies`
5. **POST /api/case-studies/upload** (line 4263)
   - Media upload to GCS
   - Requires authentication
   
6. **PUT /api/case-studies/set-acl** (line 4275)
   - Set ACL for uploaded files
   - Requires authentication

### Admin Routes (10 endpoints) - Mount at `/api/admin/case-studies`
7. **GET /api/admin/case-studies** (line 6504)
   - List all with filters
   - Admin only
   
8. **GET /api/admin/case-studies/:id** (line 6536)
   - Get single for editing
   - Admin only
   
9. **PUT /api/admin/case-studies/:id/featured** (line 6552)
   - Toggle featured status
   - Admin/Partner
   
10. **POST /api/admin/case-studies/from-evidence** (line 6586)
    - **CROSS-CUTTING ROUTE - STAYS IN MONOLITH**
    - Converts evidence to case study
    - Admin/Partner
   
11. **POST /api/admin/case-studies** (line 6626)
    - Create new case study
    - Admin/Partner
   
12. **PUT /api/admin/case-studies/:id** (line 6652)
    - Update case study
    - Admin/Partner
   
13. **DELETE /api/admin/case-studies/:id** (line 6722)
    - Delete case study
    - Admin/Partner
   
14. **POST /api/admin/case-studies/:id/versions** (line 6738)
    - Create version snapshot
    - Admin/Partner
   
15. **GET /api/admin/case-studies/:id/versions** (line 6783)
    - Get version history
    - Admin only
   
16. **POST /api/admin/case-studies/:id/versions/:versionId/restore** (line 6795)
    - Restore from version
    - Admin/Partner

---

## STORAGE METHODS INVENTORY (10+ methods)

### Core CRUD
1. `createCaseStudy(caseStudyData)` - line 2554
2. `getCaseStudyById(id)` - line 2562
3. `getCaseStudies(filters)` - line 2608
4. `updateCaseStudy(id, updates)` - line 2721
5. `updateCaseStudyFeatured(id, featured)` - line 2712
6. `deleteCaseStudy(id)` - line 2730

### Related Features
7. `getRelatedCaseStudies(caseStudyId, limit)` - line 2767
8. `getInspirationContent()` - Includes case studies

### Versions
9. `createCaseStudyVersion(version)` - line 2870
10. `getCaseStudyVersions(caseStudyId)` - line 2875
11. `getCaseStudyVersion(versionId)` - line 2883

### Search
12. `searchCaseStudies(query, limit, offset, useFullTextSearch)` - line 4142 (private method)

---

## DEPENDENCIES & INTEGRATIONS

### 1. PDF Generation (CRITICAL - NEEDS REFACTORING)
- **Current**: Inline Puppeteer code at line 1290-1400+
- **Target**: Use shared `generatePDFReport` from `server/lib/pdfGenerator.ts`
- **Files**: 
  - server/routes.ts (PDF endpoint)
  - server/lib/pdfGenerator.ts (shared service)
- **Risk**: HIGH - PDF generation must work identically after refactor

### 2. GCS Media Storage
- **Used for**: Case study images, before/after photos
- **Routes**: POST /upload, PUT /set-acl
- **Service**: ObjectStorageService
- **Risk**: MEDIUM - Media upload orchestration

### 3. Evidence Conversion
- **Route**: POST /api/admin/case-studies/from-evidence
- **Cross-module**: Calls Evidence module to get evidence data
- **Risk**: MEDIUM - Cross-module integration
- **NOTE**: This route STAYS in monolith (cross-cutting)

### 4. Email Notifications
- **Not directly visible** in current grep
- **Likely**: Sends emails when case study approved/published
- **Risk**: LOW - Standard email delegate pattern

### 5. Translation System
- **Used for**: Multi-language case study content
- **Risk**: LOW - Already handled via existing service

### 6. Admin Review Workflow
- **Features**: Versioning, review comments, approval
- **Tables**: case_study_versions, case_study_review_comments
- **Risk**: MEDIUM - Complex state management

---

## DATABASE SCHEMA

### Tables (5)
1. **case_studies** - Main table with JSONB fields for rich media
   - images, videos, studentQuotes, impactMetrics, timelineSections
   - Relations: schools, evidence, users (creator/reviewer)
   
2. **case_study_versions** - Version history
   - Snapshot of entire case study state
   
3. **case_study_tags** - Tag definitions
   
4. **case_study_tag_relations** - Many-to-many case study ↔ tags
   
5. **case_study_review_comments** - Review workflow comments

### Key Relations
- case_study → school (many-to-one)
- case_study → evidence (one-to-one, optional)
- case_study → user (creator, reviewer)
- case_study → versions (one-to-many)
- case_study → tags (many-to-many)
- case_study → review_comments (one-to-many)

---

## FRONTEND CROSS-REFERENCES

### Pages Using Case Studies
1. **client/src/pages/admin.tsx** - Admin dashboard
2. **client/src/pages/case-study-detail.tsx** - Public detail view
3. **client/src/pages/inspiration.tsx** - Gallery display

### API Calls to Preserve
- All `/api/case-studies/*` paths must remain unchanged
- Frontend TanStack Query cache keys depend on these paths

---

## EXTRACTION PLAN SUMMARY

### What Moves to Module
- 15 endpoints (excluding from-evidence)
- 10+ storage methods
- Media upload handlers
- PDF generation (refactored)
- Version management

### What Stays in Monolith
- POST /api/admin/case-studies/from-evidence (cross-cutting)
- Any analytics routes (if they exist)

### Critical Refactoring
- **PDF Generation**: Replace 100+ lines of inline Puppeteer with call to `generatePDFReport`
- **Media Upload**: Clean delegate for GCS operations
- **Version Management**: Ensure version snapshot logic preserved

---

## RISK ASSESSMENT

### HIGH RISK
✅ **PDF Generation Refactor**
   - Must produce identical PDFs
   - Test with actual case study data
   - Verify images load correctly
   - Check layout/formatting

### MEDIUM RISK
✅ **Media Upload Orchestration**
   - Multiple files per case study
   - GCS ACL management
   - Thumbnail generation

✅ **Evidence Conversion**
   - Cross-module delegation
   - Data mapping from evidence to case study

✅ **Version Management**
   - Snapshot creation logic
   - Version restoration

### LOW RISK
✅ **CRUD Operations**
   - Standard database operations
   - Well-defined schema

✅ **Gallery Display**
   - Simple query with filters

---

## ESTIMATED IMPACT

### Lines Removed from Monolith
- routes.ts: **~1,000-1,400 lines** (16 endpoints + PDF code)
- storage.ts: **~400-600 lines** (10+ methods)
- **Total: ~1,400-2,000 lines**

### New Module Size
- routes.ts: ~1,200-1,600 lines
- storage.ts: ~400-600 lines
- delegates.ts: ~200-300 lines
- **Total: ~1,800-2,500 lines**

---

## TESTING CHECKLIST

### Must Test
- [ ] PDF generation produces correct output
- [ ] Media upload to GCS works
- [ ] Case study gallery displays correctly
- [ ] Admin CRUD operations work
- [ ] Version creation/restoration works
- [ ] Evidence conversion works
- [ ] Related case studies query works
- [ ] Frontend pages load correctly

### Edge Cases
- [ ] PDF with missing images
- [ ] Case study without media
- [ ] Invalid data submission
- [ ] Concurrent version creation
- [ ] Missing translations

---

## NEXT STEPS

1. ✅ Discovery complete
2. ⏳ Extract storage methods
3. ⏳ Create delegates (especially PDF refactor)
4. ⏳ Extract routes in groups
5. ⏳ Comprehensive testing
6. ⏳ Architect review

---

**Discovery Status**: COMPLETE ✅
**Ready for Phase 2**: YES ✅

