# Case Studies Module

## Overview
The Case Studies module handles all case study functionality including CRUD operations, version management, PDF generation, and media upload. This module follows the delegation pattern established in Schools and Evidence modules.

## Architecture

### Files
- **storage.ts** (594 lines): Database operations for case studies and versions
- **delegates.ts** (155 lines): Cross-cutting concerns (media, PDF, email)
- **routes.ts** (787 lines): 15 API endpoints organized by access level

### Key Features
- Case study CRUD with rich media support (images, videos, quotes, metrics)
- Version management system with snapshot creation and restoration
- PDF export using shared `generatePDFReport` service
- GCS integration for media uploads with ACL management
- Related case studies with intelligent scoring algorithm

## API Endpoints

### Public Routes (4)
- `GET /api/case-studies` - Gallery list with filters
- `GET /api/case-studies/:id` - View single case study
- `GET /api/case-studies/:id/related` - Get related case studies
- `GET /api/case-studies/:id/pdf` - Export as PDF

### Authenticated Routes (2)
- `POST /api/case-studies/upload` - Get GCS upload URL
- `PUT /api/case-studies/set-acl` - Set file ACL policy

### Admin Routes (9)
- `GET /api/admin/case-studies` - List all with admin filters
- `GET /api/admin/case-studies/:id` - Get for editing
- `PUT /api/admin/case-studies/:id/featured` - Toggle featured status
- `POST /api/admin/case-studies` - Create new
- `PUT /api/admin/case-studies/:id` - Update
- `DELETE /api/admin/case-studies/:id` - Delete
- `POST /api/admin/case-studies/:id/versions` - Create version snapshot
- `GET /api/admin/case-studies/:id/versions` - Get version history
- `POST /api/admin/case-studies/:id/versions/:versionId/restore` - Restore from version

### Cross-Cutting Route (Kept in Monolith)
- `POST /api/admin/case-studies/from-evidence` - Convert evidence to case study
  - This route remains in `server/routes.ts` because it integrates both Evidence and Case Studies modules

## Storage Methods

### Core CRUD
- `createCaseStudy(data)` - Insert new case study
- `getCaseStudyById(id)` - Get case study with school details
- `getCaseStudies(filters)` - Query with filters (stage, country, search, etc.)
- `updateCaseStudy(id, updates)` - Update case study fields
- `updateCaseStudyFeatured(id, featured)` - Toggle featured status
- `deleteCaseStudy(id)` - Delete case study

### Related Features
- `getRelatedCaseStudies(caseStudyId, limit)` - Get related with scoring
- `getGlobalMovementData()` - Featured case studies + stats
- `searchCaseStudies(query, ...)` - Full-text search with fallback
- `searchCaseStudiesWithRanking(query, ...)` - Search with relevance ranking
- `getFeaturedCaseStudiesCount()` - Helper for admin stats

### Version Management
- `createCaseStudyVersion(version)` - Create version snapshot
- `getCaseStudyVersions(caseStudyId)` - Get all versions
- `getCaseStudyVersion(versionId)` - Get specific version

## Delegates

### MediaDelegate
Handles Google Cloud Storage operations:
- `getUploadURL()` - Get signed upload URL for media files
- `setFileACL(fileURL, userId, visibility, filename)` - Set file permissions

### PDFDelegate
Handles PDF generation:
- `generateCaseStudyPDF(htmlContent)` - Generate PDF using shared service
  - **Important**: Uses shared `generatePDFReport` from `server/lib/pdfGenerator.ts`
  - Unified with Resources module PDF generation
  - Eliminates ~100 lines of duplicate Puppeteer code

### EmailDelegate
Handles email notifications (minimal implementation):
- `notifyCaseStudyPublished(caseStudyId, schoolId)`
- `notifyCaseStudyFeatured(caseStudyId, schoolId)`

## Integration Points

### Cross-Module Dependencies
- **Schools Module**: Gets school data via `storage.getSchoolStats()` for global movement data
- **Evidence Module**: PDF export includes evidence data (videoLinks, files) when evidenceId is present
- **Shared Services**:
  - `generatePDFReport` (server/lib/pdfGenerator.ts) - PDF generation
  - `generatePdfHtml` (server/lib/pdfHelpers.ts) - HTML template
  - `ObjectStorageService` (server/objectStorage.ts) - GCS integration

### Frontend Integration
- Frontend uses standard TanStack Query cache keys
- All routes maintain exact API contract from monolith
- Response formats unchanged (preserves frontend compatibility)

## Testing

### Endpoint Verification
```bash
# Public routes
curl https://app.plasticcleverschools.com/api/case-studies
curl https://app.plasticcleverschools.com/api/case-studies/:id
curl https://app.plasticcleverschools.com/api/case-studies/:id/related
curl https://app.plasticcleverschools.com/api/case-studies/:id/pdf

# Authenticated routes (require session)
curl -X POST https://app.plasticcleverschools.com/api/case-studies/upload
curl -X PUT https://app.plasticcleverschools.com/api/case-studies/set-acl

# Admin routes (require admin role)
curl https://app.plasticcleverschools.com/api/admin/case-studies
```

### Key Test Cases
- ✅ Gallery filters (stage, country, search, categories, tags)
- ✅ Draft protection (admin-only access)
- ✅ PDF generation with images and evidence data
- ✅ Media upload and ACL management
- ✅ Version creation and restoration
- ✅ Related case studies scoring algorithm

## Migration Notes

### Extracted from Monolith
- **routes.ts**: Removed 588 lines (15 routes)
- **storage.ts**: Removed 381 lines (11 methods + helpers)
- **Total impact**: ~969 lines removed from monolith

### PDF Refactoring
- Replaced inline Puppeteer code (~100 lines) with shared service
- Unified PDF generation approach across application
- Maintains identical output and functionality

### Backward Compatibility
- All API paths unchanged
- Response formats identical
- Frontend cache keys preserved
- No breaking changes

## Development

### Adding New Routes
1. Add route to appropriate router (public/authenticated/admin)
2. Use storage singleton for database operations
3. Use delegates for cross-cutting concerns (media, PDF, email)
4. Follow existing error handling patterns
5. Add JSDoc comments with endpoint description

### Adding New Storage Methods
1. Add method to CaseStudyStorage class
2. Add corresponding delegation method in server/storage.ts
3. Update IStorage interface if needed
4. Document method purpose and behavior

## Metrics

- **Module size**: 1,536 lines (storage: 594, delegates: 155, routes: 787)
- **Monolith reduction**: ~969 lines removed
- **Routes**: 15 total (4 public, 2 authenticated, 9 admin)
- **Storage methods**: 14 total (11 core + 3 version management)
- **Production status**: ✅ Production-ready (architect-approved)

## Future Enhancements

- Enhanced email notifications for case study events
- Bulk operations for admin management
- Advanced search with more filters
- Image optimization and thumbnail generation
- Analytics and insights dashboard
