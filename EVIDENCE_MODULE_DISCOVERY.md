# Evidence Module Discovery Report
*Generated: November 09, 2025*

## Executive Summary
- **Total routes found**: 18 evidence-specific endpoints
- **Total storage methods found**: 27 evidence operations
- **Frontend consumers**: 62+ TypeScript files
- **Critical dependencies**: Schools (progression), Users (submissions/reviews), Case Studies (media), Events, Analytics
- **Complexity Assessment**: **HIGH** - Deep integration with school progression, multi-language support, complex review workflow

---

## 1. Routes Inventory

### 1.1 Public Routes (No Authentication Required)

#### GET /api/evidence/:id
**Location**: `server/routes.ts:1230-1248`
- **Description**: View single approved evidence by ID (public endpoint)
- **Middleware**: None (public), but only shows approved evidence to non-admins
- **Storage Methods**: `storage.getEvidenceById()`
- **Response**: Evidence object with school data
- **Notes**: Admins can view any status, public can only view approved

#### GET /api/evidence-requirements
**Location**: `server/routes.ts:3141-3150`
- **Description**: Get all evidence requirements (optionally filter by stage)
- **Middleware**: None (public)
- **Storage Methods**: `storage.getEvidenceRequirements(stage)`
- **Query Params**: `?stage=inspire|investigate|act`
- **Response**: Array of evidence requirements with translations

#### GET /api/evidence-requirements/:id
**Location**: `server/routes.ts:3153-3167`
- **Description**: Get single evidence requirement by ID
- **Middleware**: None (public)
- **Storage Methods**: `storage.getEvidenceRequirement(id)`
- **Response**: Single requirement with translations

---

### 1.2 Authenticated Teacher Routes

#### POST /api/evidence
**Location**: `server/routes.ts:2855-2965`
- **Description**: Submit new evidence with files/videos
- **Middleware**: `isAuthenticated`
- **Validation**: `insertEvidenceSchema`
- **Storage Methods**: 
  - `storage.getSchool()` - Get school for round number
  - `storage.getSchoolUser()` - Verify membership
  - `storage.createEvidence()`
  - `storage.checkAndUpdateSchoolProgression()` - For admin auto-approvals
- **Side Effects**:
  - Admin uploads auto-approved
  - Sends confirmation email to submitter
  - Creates Mailchimp automation
  - Logs user activity
  - Marks user as interacted
- **Special Logic**: Sets `roundNumber` from school's current round

#### GET /api/evidence
**Location**: `server/routes.ts:2968-3033`
- **Description**: Get user's school evidence with filters
- **Middleware**: `isAuthenticated`
- **Query Params**: `?schoolId=&status=&visibility=&requirePhotoConsent=true`
- **Storage Methods**:
  - `storage.getSchoolUser()` - Verify access
  - `storage.getUserSchools()` - Get user's schools
  - `storage.getAllEvidence()`
- **Response**: Array of evidence with fileUrls extracted
- **Notes**: Can filter by photo consent status

#### DELETE /api/evidence/:id
**Location**: `server/routes.ts:3036-3088`
- **Description**: Delete pending evidence
- **Middleware**: `isAuthenticated`
- **Storage Methods**:
  - `storage.getEvidence()` - Check status
  - `storage.getUserSchools()` - Verify permission
  - `storage.deleteEvidence()`
- **Restrictions**: Only pending evidence can be deleted
- **Side Effects**: Logs user activity

---

### 1.3 Admin/Partner Routes

#### PATCH /api/admin/evidence/:id
**Location**: `server/routes.ts:3091-3136`
- **Description**: Update evidence (admin only)
- **Middleware**: `isAuthenticated`, `requireAdmin`
- **Storage Methods**:
  - `storage.getEvidence()` - Get current state
  - `storage.updateEvidenceStatus()` - For status changes
  - `storage.updateEvidence()` - For other updates
  - `storage.checkAndUpdateSchoolProgression()` - On approval
- **Notes**: Status changes trigger review workflow

#### PATCH /api/admin/evidence/:id/review
**Location**: `server/routes.ts:6099-6171`
- **Description**: Review evidence (approve/reject)
- **Middleware**: `isAuthenticated`, `requireAdminOrPartner`
- **Validation**: `{ status: 'approved'|'rejected', reviewNotes?: string }`
- **Storage Methods**:
  - `storage.getEvidence()`
  - `storage.updateEvidenceStatus()`
  - `storage.checkAndUpdateSchoolProgression()` - On approval
- **Side Effects**:
  - Sends approval/rejection email
  - Updates school progression
  - Logs user activity
- **Critical**: Triggers school stage progression on approval

#### POST /api/admin/evidence/bulk-review
**Location**: `server/routes.ts:6174-6275`
- **Description**: Bulk approve/reject evidence
- **Middleware**: `isAuthenticated`, `requireAdminOrPartner`
- **Request**: `{ evidenceIds: string[], status: 'approved'|'rejected', reviewNotes?: string }`
- **Storage Methods**:
  - `storage.getEvidence()` - For each ID
  - `storage.updateEvidenceStatus()` - For each ID
  - `storage.checkAndUpdateSchoolProgression()` - For each school
- **Response**: `{ successful: [], failed: [] }`
- **Side Effects**: Emails for each evidence, progression updates

#### POST /api/admin/evidence/bulk-delete
**Location**: `server/routes.ts:6277-6315` (estimated)
- **Description**: Bulk delete evidence
- **Middleware**: `isAuthenticated`, `requireAdminOrPartner`
- **Request**: `{ evidenceIds: string[] }`
- **Storage Methods**: `storage.deleteEvidence()` - For each ID
- **Response**: `{ deleted: number, failed: [] }`

#### PATCH /api/admin/evidence/:id/assign
**Location**: `server/routes.ts:6356-6390`
- **Description**: Assign evidence to admin for review
- **Middleware**: `isAuthenticated`, `requireAdmin`
- **Request**: `{ assignedTo: string | null }`
- **Storage Methods**: `storage.assignEvidence()`
- **Side Effects**: Creates notification for assigned admin

---

### 1.4 Evidence Requirements Management (Admin Only)

#### POST /api/evidence-requirements
**Location**: `server/routes.ts:3170-3194`
- **Description**: Create new evidence requirement
- **Middleware**: `isAuthenticated` (admin check in handler)
- **Validation**: `insertEvidenceRequirementSchema`
- **Storage Methods**: `storage.createEvidenceRequirement()`

#### PATCH /api/evidence-requirements/:id
**Location**: `server/routes.ts:3197-3243`
- **Description**: Update evidence requirement
- **Middleware**: `isAuthenticated` (admin check in handler)
- **Storage Methods**: `storage.updateEvidenceRequirement()`
- **Special Handling**: Extracts JSONB fields (translations, languageSpecificResources, languageSpecificLinks) before validation

#### POST /api/evidence-requirements/:id/translate
**Location**: `server/routes.ts:3246-3297`
- **Description**: Auto-generate translations for requirement
- **Middleware**: `isAuthenticated` (admin check in handler)
- **Storage Methods**:
  - `storage.getEvidenceRequirement()`
  - `storage.updateEvidenceRequirement()`
- **Translation Service**: Uses OpenAI to translate to 13 languages
- **Languages**: es, fr, de, it, pt, nl, ru, zh, ko, ar, id, el, cy

#### DELETE /api/evidence-requirements/:id
**Location**: `server/routes.ts:3300-3336`
- **Description**: Delete evidence requirement
- **Middleware**: `isAuthenticated` (admin check in handler)
- **Storage Methods**:
  - `storage.getEvidenceByRequirement()` - Check for linked evidence
  - `storage.deleteEvidenceRequirement()`
- **Restrictions**: Cannot delete if evidence submissions reference it

---

### 1.5 Evidence Import/Migration Routes

#### POST /api/admin/import/evidence/validate
**Location**: `server/routes.ts:12575-12598`
- **Description**: Validate evidence CSV import file
- **Middleware**: `isAuthenticated`, `requireAdmin`, `importUpload.single('file')`
- **Side Effects**: Parses CSV and returns validation errors

#### POST /api/admin/import/evidence/process
**Location**: `server/routes.ts:12599-12662`
- **Description**: Process evidence import batch
- **Middleware**: `isAuthenticated`, `requireAdmin`, `importUpload.single('file')`
- **Storage Methods**: Creates evidence records in batch
- **Side Effects**: Updates import progress, creates batch record

#### GET /api/admin/import/evidence/progress/:batchId
**Location**: `server/routes.ts:12664-12686`
- **Description**: Get progress of evidence import batch
- **Middleware**: `isAuthenticated`, `requireAdmin`
- **Response**: Progress tracking data

---

### 1.6 Evidence in Other Endpoints

Evidence data is also consumed by:
- **GET /api/inspiration-content** - Returns approved public evidence
- **GET /api/case-studies/:id** - Includes linked evidence files/videos
- **GET /api/case-studies/:id/pdf** - Includes evidence in PDF export
- **GET /api/dashboard** - Shows recent evidence submissions
- **GET /api/schools-with-image-counts** - Counts approved evidence images
- **GET /api/admin/analytics/export-pdf** - Evidence analytics in reports

---

## 2. Storage Methods Inventory

### 2.1 Evidence CRUD Operations

#### createEvidence(evidenceData: InsertEvidence): Promise<Evidence>
**Location**: `server/storage.ts:2305-2311`
- **Description**: Create new evidence submission
- **Tables**: `evidence`
- **Returns**: Created evidence record

#### getEvidence(id: string): Promise<Evidence | undefined>
**Location**: `server/storage.ts:2313-2319`
- **Description**: Get evidence by ID (basic, no joins)
- **Tables**: `evidence`
- **Returns**: Evidence record or undefined

#### getEvidenceById(id: string): Promise<EvidenceWithSchool & {...} | undefined>
**Location**: `server/storage.ts:2321-2355`
- **Description**: Get evidence with school data
- **Tables**: `evidence LEFT JOIN schools`
- **Returns**: Evidence with schoolName, schoolCountry, schoolLanguage

#### getSchoolEvidence(schoolId: string): Promise<Array<Evidence & {...}>>
**Location**: `server/storage.ts:2357-2359`
- **Description**: Get all evidence for a school with reviewer info
- **Delegates**: To `schoolStorage.getSchoolEvidence()`
- **Returns**: Evidence array with reviewer data

#### getPendingEvidence(): Promise<Evidence[]>
**Location**: `server/storage.ts:2361-2367`
- **Description**: Get all pending evidence (admin review queue)
- **Tables**: `evidence`
- **Filter**: `status = 'pending'`
- **Order**: Descending by submittedAt

#### getAllEvidence(filters): Promise<EvidenceWithSchool[]>
**Location**: `server/storage.ts:2369-2447`
- **Description**: Get evidence with optional filters
- **Tables**: `evidence LEFT JOIN schools LEFT JOIN users`
- **Filters**: status, stage, schoolId, country, visibility, assignedTo
- **Returns**: Evidence with school and reviewer data
- **Order**: Descending by submittedAt

#### getApprovedPublicEvidence(): Promise<Evidence[]>
**Location**: `server/storage.ts:2449-2460`
- **Description**: Get approved public evidence
- **Tables**: `evidence`
- **Filter**: `status = 'approved' AND visibility = 'public'`

#### getApprovedEvidenceForInspiration(filters): Promise<Array<EvidenceWithSchool & {...}>>
**Location**: `server/storage.ts:2462-2556`
- **Description**: Get approved evidence for public inspiration gallery
- **Tables**: `evidence LEFT JOIN schools`
- **Filters**: stage, country, search, visibility
- **Additional Filters**: 
  - `photoConsentStatus = 'approved'` (required)
  - Search in title/description
- **Order**: Featured first, then by submittedAt
- **Pagination**: Supports limit/offset

#### getEvidenceByFileUrl(fileUrl: string): Promise<EvidenceWithSchool & {...} | undefined>
**Location**: `server/storage.ts:2558-2616`
- **Description**: Find evidence by file URL (for case study media selection)
- **Tables**: `evidence LEFT JOIN schools`
- **Filter**: Searches files JSONB array for matching URL
- **Returns**: First matching evidence with school data

#### updateEvidenceStatus(id, status, reviewedBy, reviewNotes): Promise<Evidence | undefined>
**Location**: `server/storage.ts:2618-2636`
- **Description**: Update evidence review status (approve/reject)
- **Tables**: `evidence`
- **Updates**: status, reviewedBy, reviewedAt, reviewNotes, updatedAt
- **Critical**: Used by review workflow

#### assignEvidence(evidenceId, assignedToUserId): Promise<void>
**Location**: `server/storage.ts:2638-2646`
- **Description**: Assign evidence to admin for review
- **Tables**: `evidence`
- **Updates**: assignedTo, updatedAt

#### updateEvidence(id, updates): Promise<Evidence | undefined>
**Location**: `server/storage.ts:2648-2658`
- **Description**: Generic evidence update
- **Tables**: `evidence`
- **Updates**: Any partial evidence fields

#### updateEvidenceFiles(id, files): Promise<Evidence | undefined>
**Location**: `server/storage.ts:2660-2670`
- **Description**: Update evidence files array
- **Tables**: `evidence`
- **Updates**: files JSONB field

#### deleteEvidence(id: string): Promise<boolean>
**Location**: `server/storage.ts:2672-2682`
- **Description**: Delete evidence record
- **Tables**: `evidence`
- **Cascade**: Related records handled by DB constraints

---

### 2.2 Evidence Requirements Operations

#### getEvidenceRequirements(stage?: string): Promise<EvidenceRequirement[]>
**Location**: `server/storage.ts:2689-2702`
- **Description**: Get all evidence requirements, optionally filtered by stage
- **Tables**: `evidenceRequirements`
- **Order**: By stage, then orderIndex
- **Multi-language**: Includes translations JSONB

#### getEvidenceRequirement(id: string): Promise<EvidenceRequirement | undefined>
**Location**: `server/storage.ts:2704-2710`
- **Description**: Get single evidence requirement
- **Tables**: `evidenceRequirements`

#### createEvidenceRequirement(data): Promise<EvidenceRequirement>
**Location**: `server/storage.ts:2712-2718`
- **Description**: Create new evidence requirement
- **Tables**: `evidenceRequirements`

#### updateEvidenceRequirement(id, data): Promise<EvidenceRequirement | undefined>
**Location**: `server/storage.ts:2720-2730`
- **Description**: Update evidence requirement
- **Tables**: `evidenceRequirements`
- **Updates**: Any partial requirement fields, sets updatedAt

#### deleteEvidenceRequirement(id: string): Promise<boolean>
**Location**: `server/storage.ts:2732-2742`
- **Description**: Delete evidence requirement
- **Tables**: `evidenceRequirements`
- **Note**: Should check for linked evidence first (done in route handler)

#### getEvidenceByRequirement(requirementId: string): Promise<Evidence[]>
**Location**: `server/storage.ts:2744-2750`
- **Description**: Get all evidence linked to a requirement
- **Tables**: `evidence`
- **Filter**: `evidenceRequirementId = requirementId`
- **Use**: Check before deleting requirement

---

### 2.3 Admin Evidence Override Operations

#### createAdminEvidenceOverride(override): Promise<AdminEvidenceOverride>
**Location**: `server/storage.ts:2753-2759`
- **Description**: Manually mark evidence requirement as complete
- **Tables**: `adminEvidenceOverrides`
- **Use**: Allow schools to progress without submitting evidence

#### getAdminEvidenceOverrides(schoolId, roundNumber?): Promise<AdminEvidenceOverride[]>
**Location**: `server/storage.ts:2761-2763`
- **Description**: Get override flags for a school
- **Delegates**: To `schoolStorage.getAdminEvidenceOverrides()`

#### deleteAdminEvidenceOverride(id: string): Promise<boolean>
**Location**: `server/storage.ts:2765-2775`
- **Description**: Remove evidence override
- **Tables**: `adminEvidenceOverrides`

#### toggleAdminEvidenceOverride(schoolId, evidenceRequirementId, stage, roundNumber, markedBy): Promise<{...}>
**Location**: `server/storage.ts:2777-2811`
- **Description**: Toggle evidence requirement completion (create or delete override)
- **Tables**: `adminEvidenceOverrides`
- **Returns**: `{ created: boolean, override: AdminEvidenceOverride | null }`
- **Logic**: Creates if doesn't exist, deletes if exists
- **Constraint**: Unique on (schoolId, evidenceRequirementId, roundNumber)

---

### 2.4 Progression & Analytics

#### getSchoolEvidenceCounts(schoolId: string): Promise<{...}>
**Location**: `server/storage.ts:2814-2820`
- **Description**: Get evidence counts by stage for progression tracking
- **Delegates**: To `schoolStorage.getSchoolEvidenceCounts()`
- **Returns**: Object with inspire, investigate, act counts (total, approved)
- **Critical**: Used for school progression calculation

#### checkAndUpdateSchoolProgression(schoolId: string): Promise<School | undefined>
**Location**: `server/storage.ts:2822-2824`
- **Description**: Recalculate and update school progression based on evidence
- **Delegates**: To `schoolStorage.checkAndUpdateSchoolProgression()`
- **Critical**: Triggered after evidence approval
- **Side Effects**: Updates school stage, completion flags, progress percentage

#### getEvidenceAnalytics(startDate?, endDate?): Promise<{...}>
**Location**: `server/storage.ts:3609+` (not shown in excerpt)
- **Description**: Get evidence submission analytics
- **Returns**: Evidence stats by stage, status, time period
- **Use**: Admin analytics dashboards and reports

---

### 2.5 User Management Impact

#### deleteUser(id, mode): Promise<{...}>
**Location**: `server/storage.ts:971-1322`
- **Evidence Impact**:
  - **'soft' mode**: No evidence deletion, just marks user deleted
  - **'transfer' mode**: Transfers evidence to `ARCHIVED_USER_ID`
  - **'hard' mode**: Deletes evidence submitted by user, sets reviewedBy to NULL
- **Tables**: Updates `evidence.submittedBy`, `evidence.reviewedBy`

#### getUserContentCounts(userId: string): Promise<{...}>
**Location**: `server/storage.ts:1414-1476`
- **Evidence Count**: Counts evidence submitted by user
- **Use**: Display before user deletion

---

## 3. Database Schemas

### 3.1 Evidence Table
**Location**: `shared/schema.ts:395-418`

```typescript
export const evidence = pgTable("evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  evidenceRequirementId: varchar("evidence_requirement_id").references(() => evidenceRequirements.id),
  title: varchar("title").notNull(),
  description: text("description"),
  stage: programStageEnum("stage").notNull(), // 'inspire', 'investigate', 'act'
  status: evidenceStatusEnum("status").default('pending'), // 'pending', 'approved', 'rejected'
  visibility: visibilityEnum("visibility").default('registered'), // 'public', 'private', 'registered'
  files: jsonb("files").default('[]'), // Array of { url, name, size, type }
  videoLinks: text("video_links"), // Newline-separated video URLs
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  assignedTo: varchar("assigned_to").references(() => users.id), // For assignment workflow
  isFeatured: boolean("is_featured").default(false),
  isAuditQuiz: boolean("is_audit_quiz").default(false),
  roundNumber: integer("round_number").default(1), // Tracks which round evidence belongs to
  hasChildren: boolean("has_children").default(false),
  parentalConsentFiles: jsonb("parental_consent_files").default('[]'),
  submittedAt: timestamp("submitted_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**Key Fields**:
- **roundNumber**: Critical for multi-round schools, ensures evidence is counted for correct round
- **files**: JSONB array of file objects with URL, name, size, type
- **status**: Controls visibility and review workflow
- **visibility**: Determines public/private/registered access

**Relationships**:
- **schools** (CASCADE DELETE): Evidence deleted when school deleted
- **users** (submittedBy): Evidence submitter
- **users** (reviewedBy): Admin who reviewed
- **users** (assignedTo): Admin assigned to review
- **evidenceRequirements**: Optional link to requirement

---

### 3.2 Evidence Requirements Table
**Location**: `shared/schema.ts:375-388`

```typescript
export const evidenceRequirements = pgTable("evidence_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stage: programStageEnum("stage").notNull(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  orderIndex: integer("order_index").notNull(), // Display order
  resourceIds: text("resource_ids").array().default(sql`ARRAY[]::text[]`), // Linked resources
  customLinks: jsonb("custom_links").default('[]'), // Additional links
  translations: jsonb("translations").default('{}'), // Multi-language support
  languageSpecificResources: jsonb("language_specific_resources").default('{}'),
  languageSpecificLinks: jsonb("language_specific_links").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**Key Fields**:
- **translations**: Object with language codes as keys, { title, description } as values
- **resourceIds**: Array of resource IDs to display with requirement
- **orderIndex**: Controls display order in UI

---

### 3.3 Admin Evidence Overrides Table
**Location**: `shared/schema.ts:425-438`

```typescript
export const adminEvidenceOverrides = pgTable("admin_evidence_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  evidenceRequirementId: varchar("evidence_requirement_id").notNull()
    .references(() => evidenceRequirements.id, { onDelete: 'cascade' }),
  stage: programStageEnum("stage").notNull(),
  roundNumber: integer("round_number").notNull().default(1),
  markedBy: varchar("marked_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("admin_evidence_overrides_school_id_idx").on(table.schoolId),
  index("admin_evidence_overrides_requirement_id_idx").on(table.evidenceRequirementId),
  uniqueIndex("admin_evidence_overrides_unique_idx")
    .on(table.schoolId, table.evidenceRequirementId, table.roundNumber)
]);
```

**Purpose**: Allow admins to manually mark requirements complete without evidence submission
**Unique Constraint**: One override per (school, requirement, round)

---

### 3.4 Validation Schemas (Zod)

#### insertEvidenceSchema
**Location**: `shared/schema.ts:1533-1542`
- **Omits**: id, submittedAt, updatedAt, reviewedAt, reviewedBy, reviewNotes, assignedTo, isFeatured
- **Use**: Validate evidence submission from teachers
- **Generated**: From `evidence` table using `createInsertSchema`

#### insertEvidenceRequirementSchema
**Referenced but not shown in excerpt**
- **Use**: Validate requirement creation/updates

#### insertAdminEvidenceOverrideSchema
**Location**: `shared/schema.ts:1544-1548`
- **Omits**: id, createdAt, updatedAt
- **Use**: Validate override creation

---

### 3.5 TypeScript Types

```typescript
export type Evidence = typeof evidence.$inferSelect;
export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
export type EvidenceWithSchool = Evidence & { school: School | null };
export type EvidenceRequirement = typeof evidenceRequirements.$inferSelect;
export type InsertEvidenceRequirement = z.infer<typeof insertEvidenceRequirementSchema>;
export type AdminEvidenceOverride = typeof adminEvidenceOverrides.$inferSelect;
export type InsertAdminEvidenceOverride = z.infer<typeof insertAdminEvidenceOverrideSchema>;
```

---

## 4. Utilities and Helpers

### 4.1 Image Compression
**File**: `server/imageCompression.ts`
- **compressImage(buffer, options)**: Compress uploaded images
- **shouldCompressFile(mimeType, size)**: Check if compression needed
- **Use**: Evidence file uploads

### 4.2 Object Storage Utilities
**File**: `server/routes/utils/objectStorage.ts`
- **uploadToObjectStorage(fileBuffer, mimeType, filename, userId, visibility)**: Upload evidence files
- **createAclPolicy(userId, visibility)**: Create access control policy
- **Use**: Evidence file uploads with proper permissions

### 4.3 URL Normalization
**File**: `server/routes/utils/urlNormalization.ts`, `client/src/lib/urlNormalization.ts`
- **normalizeObjectStorageUrl(url)**: Convert object storage URLs to CORS-compatible format
- **normalizeFileArray(files)**: Normalize file URLs in evidence files array
- **Use**: Evidence file URL handling throughout app

### 4.4 Upload Middleware
**File**: `server/routes/utils/uploads.ts`
- **uploadCompression**: Multer middleware for evidence file uploads with compression
- **Use**: POST /api/evidence-files/upload-compressed

### 4.5 Evidence Import Utilities
**File**: `server/lib/evidenceImportUtils.ts` (referenced in routes)
- **parseEvidenceCSV()**: Parse evidence import CSV
- **validateEvidenceRow()**: Validate evidence data
- **Use**: Evidence migration/import endpoints

### 4.6 PHP Deserializer
**File**: `server/lib/phpDeserializer.ts`
- **parsePhpEvidenceCount(value)**: Parse legacy WordPress evidence counts
- **sumStageEvidence(stage1, stage2, stage3)**: Sum evidence across stages
- **Use**: Legacy data migration

---

## 5. Frontend Consumers

### 5.1 Evidence Submission & Display Components

#### EvidenceSubmissionForm.tsx
- **APIs**: POST /api/evidence
- **Purpose**: Teacher evidence submission with file upload
- **Features**: Multi-file upload, video links, visibility control

#### EvidenceFilesGallery.tsx
- **Purpose**: Display evidence file attachments
- **Features**: Lightbox, file icons, PDF thumbnails
- **Uses**: normalizeObjectStorageUrl()

#### EvidenceVideoLinks.tsx
- **Purpose**: Display evidence video links
- **Features**: Split by newlines, external link icons

#### EditEvidenceDialog.tsx
- **APIs**: PATCH /api/admin/evidence/:id
- **Purpose**: Admin edit evidence details
- **Access**: Admin only

#### UploadEvidenceDialog.tsx
- **APIs**: POST /api/evidence (admin upload)
- **Purpose**: Admin bulk evidence upload
- **Features**: Auto-approval, round number setting

---

### 5.2 Admin Review Components

#### EvidenceReviewQueue.tsx
- **APIs**: 
  - PATCH /api/admin/evidence/:id/review
  - POST /api/admin/evidence/bulk-review
  - POST /api/admin/evidence/bulk-delete
- **Purpose**: Evidence review queue
- **Features**: Approve, reject, bulk actions, filtering, assignment

#### EvidenceAssignment.tsx
- **APIs**: PATCH /api/admin/evidence/:id/assign
- **Purpose**: Assign evidence to admins
- **Features**: Admin dropdown, assignment tracking

#### ReviewsSection.tsx
- **APIs**: Queries pending evidence, uses review mutations
- **Purpose**: Main admin reviews container
- **Tabs**: Evidence, Audits, Photo Consent

#### ReviewsFilters.tsx
- **Purpose**: Filter evidence by status, stage, assignee
- **Features**: Multi-select filters, search

---

### 5.3 Evidence Requirements Management

#### EvidenceRequirementsSection.tsx
- **APIs**:
  - GET /api/evidence-requirements
  - POST /api/evidence-requirements
  - PATCH /api/evidence-requirements/:id
  - DELETE /api/evidence-requirements/:id
- **Purpose**: Admin manage evidence requirements
- **Features**: CRUD, reordering, resource linking

#### TranslationManagementDialog.tsx
- **APIs**: POST /api/evidence-requirements/:id/translate
- **Purpose**: Auto-generate translations
- **Features**: AI translation to 13 languages

---

### 5.4 Evidence Import

#### EvidenceImport.tsx
- **APIs**:
  - POST /api/admin/import/evidence/validate
  - POST /api/admin/import/evidence/process
  - GET /api/admin/import/evidence/progress/:batchId
- **Purpose**: Import legacy evidence from CSV
- **Features**: Validation, batch processing, progress tracking

---

### 5.5 Evidence Gallery & Display

#### EvidenceGalleryTab.tsx
- **APIs**: GET /api/evidence (with filters)
- **Purpose**: View school's evidence gallery
- **Features**: Filter by stage, status, photo consent

#### evidence-detail.tsx (page)
- **APIs**: GET /api/evidence/:id
- **Purpose**: Public evidence detail page
- **Features**: Full evidence display, school info

---

### 5.6 Case Study Integration

#### wizard/media-sections/EvidenceSelector.tsx
- **APIs**: GET /api/evidence (with requirePhotoConsent)
- **Purpose**: Select evidence images for case studies
- **Features**: Filter by school, photo consent check

#### case-study-preview/CaseStudyEvidenceFilesSection.tsx
- **Purpose**: Display evidence files in case study
- **Uses**: Evidence files from linked evidence

#### case-study-preview/CaseStudyEvidenceLinkSection.tsx
- **Purpose**: Display evidence video links in case study
- **Uses**: Evidence videoLinks from linked evidence

---

### 5.7 Dashboard & Analytics

#### home.tsx (Dashboard)
- **APIs**: GET /api/dashboard (includes recentEvidence)
- **Purpose**: Show recent evidence submissions
- **Features**: Evidence preview cards

#### AnalyticsContent.tsx
- **APIs**: Evidence analytics queries
- **Purpose**: Admin evidence analytics
- **Features**: Charts, stats, trends

---

### 5.8 School Profile & Progression

#### SchoolProfile.tsx
- **APIs**: Queries evidence for school
- **Purpose**: School profile page with evidence
- **Features**: Evidence gallery, progression tracker

#### ProgressTracker.tsx
- **Purpose**: Display school progression
- **Uses**: Evidence counts for stage completion

#### SchoolProgressOverride.tsx
- **APIs**: Evidence override endpoints
- **Purpose**: Admin manually complete requirements
- **Features**: Toggle overrides, track manual completions

---

### 5.9 Other Pages

- **inspiration.tsx**: GET /api/inspiration-content (includes evidence)
- **how-it-works.tsx**: Displays evidence requirements
- **award-criteria.tsx**: Shows evidence needed for award
- **profile.tsx**: User's evidence submissions
- **analytics.tsx**: Evidence analytics dashboard

**Total Frontend Files**: 62+ TypeScript files consume evidence data

---

## 6. Cross-Module Dependencies

### 6.1 Schools Module (CRITICAL)

**Dependency Type**: Bidirectional, tightly coupled

**Evidence → Schools**:
- Evidence submission requires `schoolId` (FK constraint, CASCADE DELETE)
- Evidence approval triggers `checkAndUpdateSchoolProgression()`
- Evidence counts determine school stage completion
- **Critical Flow**: Approve evidence → Count evidence → Update school stage → Award completion

**Schools → Evidence**:
- School deletion cascades to evidence (FK onDelete: 'cascade')
- School's `currentRound` determines evidence `roundNumber`
- School's `currentStage` determines allowed evidence submissions
- School's `photoConsentStatus` affects evidence visibility

**Shared State**:
- School progression percentage calculated from evidence counts
- Stage completion flags (inspireCompleted, investigateCompleted, actCompleted) based on evidence
- Round numbers must match between schools and evidence

**Breakage Risk**: **CRITICAL** - Progression system will break if evidence counting logic changes

---

### 6.2 Users Module (HIGH)

**Dependency Type**: Required relationships

**Evidence → Users**:
- Evidence `submittedBy` references user (FK, required)
- Evidence `reviewedBy` references user (FK, nullable)
- Evidence `assignedTo` references user (FK, nullable)
- User deletion handling:
  - Soft delete: Evidence remains, user marked deleted
  - Transfer mode: Evidence transferred to ARCHIVED_USER_ID
  - Hard delete: Evidence deleted, or reviewedBy set to NULL

**Users → Evidence**:
- User's preferred language affects email notifications
- User role determines evidence visibility and permissions
- Admin users can auto-approve their own evidence

**Breakage Risk**: **MEDIUM** - User deletion modes must handle evidence properly

---

### 6.3 Case Studies Module (MEDIUM)

**Dependency Type**: Optional reference

**Case Studies → Evidence**:
- Case studies can link to evidence via `evidenceId` (FK, onDelete: 'set null')
- Case study wizard pulls evidence files for media gallery
- Case study PDF export includes linked evidence files/videos

**Evidence → Case Studies**:
- Evidence can be selected for case study media
- Evidence photo consent must be approved for case study use

**Breakage Risk**: **LOW** - Link is optional, can be NULL

---

### 6.4 Evidence Requirements Module (MEDIUM)

**Dependency Type**: Optional reference with business logic

**Evidence → Evidence Requirements**:
- Evidence can link to requirement via `evidenceRequirementId` (FK, nullable)
- Evidence linked to requirement cannot be deleted while requirement exists

**Evidence Requirements → Evidence**:
- Requirements cannot be deleted if evidence references them
- Requirements provide structure and guidance for evidence submission
- Overrides can mark requirements complete without evidence

**Admin Overrides**:
- Allow school progression without evidence
- Track manually completed requirements
- Unique per (school, requirement, round)

**Breakage Risk**: **MEDIUM** - Deletion constraints must be enforced

---

### 6.5 Notifications Module (LOW)

**Dependency Type**: One-way notification sending

**Evidence → Notifications**:
- Evidence assignment creates notification for assignee
- Evidence approval/rejection can trigger notifications

**Breakage Risk**: **LOW** - Notifications are informational only

---

### 6.6 Email Service (MEDIUM)

**Dependency Type**: Side effects on evidence operations

**Email Triggers**:
- Evidence submission → Confirmation email to teacher
- Evidence approval → Approval email to teacher
- Evidence rejection → Revision request email to teacher
- Evidence assignment → Assignment notification to admin
- Bulk operations → Multiple emails

**Languages Supported**: Uses user's `preferredLanguage` for translations

**Breakage Risk**: **LOW** - Emails are non-blocking side effects

---

### 6.7 Mailchimp Integration (LOW)

**Dependency Type**: Marketing automation

**Evidence → Mailchimp**:
- Evidence submission adds tags: ['evidence_submitted', stage, role]
- Tracks evidence submission in automation workflows

**Breakage Risk**: **LOW** - Non-critical marketing feature

---

### 6.8 Analytics Module (LOW)

**Dependency Type**: Read-only analytics

**Analytics → Evidence**:
- Evidence counts by stage, status, time period
- Evidence submission trends
- School engagement metrics based on evidence

**Breakage Risk**: **LOW** - Analytics are read-only

---

### 6.9 Object Storage (CRITICAL)

**Dependency Type**: File storage for evidence

**Evidence → Object Storage**:
- Evidence files stored in object storage
- Files array contains object storage URLs
- ACL policies control file visibility
- URL normalization required for CORS

**Breakage Risk**: **CRITICAL** - Evidence files will be inaccessible if storage breaks

---

### 6.10 Audit Logs (LOW)

**Dependency Type**: Activity tracking

**Evidence → Audit Logs**:
- Evidence submit logged
- Evidence review logged
- Evidence delete logged
- Tracks user ID, email, action, metadata

**Breakage Risk**: **LOW** - Logs are for tracking only

---

## 7. Potential Breakage Points

### 7.1 Critical User Flows

#### Flow 1: Teacher Evidence Submission
**Steps**:
1. Teacher navigates to evidence submission
2. Selects stage, enters title/description
3. Uploads image files (compressed)
4. Adds video links
5. Selects visibility
6. Submits evidence

**Breakage Points**:
- ❌ File upload to object storage fails
- ❌ Image compression fails
- ❌ `schoolId` not found
- ❌ User not member of school
- ❌ Round number not set correctly
- ❌ Email notification fails (non-blocking)

**Critical**: Must preserve `roundNumber` from school's `currentRound`

---

#### Flow 2: Admin Evidence Review
**Steps**:
1. Admin opens review queue
2. Views pending evidence with filters
3. Clicks approve/reject
4. Adds review notes
5. Submits review

**Breakage Points**:
- ❌ `checkAndUpdateSchoolProgression()` fails
- ❌ Email notification fails
- ❌ School stage not updated
- ❌ Evidence count not refreshed
- ❌ Completion flags not set

**Critical**: School progression MUST update on approval

---

#### Flow 3: Bulk Evidence Review
**Steps**:
1. Admin selects multiple evidence
2. Chooses bulk action (approve/reject/delete)
3. Adds optional notes
4. Confirms action

**Breakage Points**:
- ❌ Partial failures not handled
- ❌ School progression not updated for each school
- ❌ Transaction not atomic
- ❌ Email failures blocking review

**Critical**: Must handle partial successes gracefully

---

#### Flow 4: Evidence Requirements Display
**Steps**:
1. Teacher views evidence requirements for stage
2. Sees requirement list with translations
3. Clicks requirement to see details
4. Accesses linked resources
5. Submits evidence for requirement

**Breakage Points**:
- ❌ Translations not loaded
- ❌ Resources not linked correctly
- ❌ Language-specific content missing
- ❌ Requirement order wrong

**Critical**: Multi-language support must work

---

#### Flow 5: School Progression Calculation
**Steps**:
1. Evidence approved
2. `checkAndUpdateSchoolProgression()` called
3. Evidence counts fetched per stage
4. Requirements checked (with overrides)
5. Completion flags updated
6. Stage advanced if requirements met
7. Award granted if all stages complete

**Breakage Points**:
- ❌ Evidence counts wrong (wrong round counted)
- ❌ Admin overrides not considered
- ❌ Stage completion logic broken
- ❌ Round number not incremented
- ❌ Award completion not set
- ❌ Progress percentage not updated

**Critical**: MOST CRITICAL FLOW - Affects entire progression system

---

#### Flow 6: Public Evidence Gallery
**Steps**:
1. Public visitor views inspiration page
2. Filters by stage/country
3. Views approved public evidence
4. Only sees evidence with photo consent

**Breakage Points**:
- ❌ Photo consent filter not applied
- ❌ Private evidence shown
- ❌ Pending/rejected evidence shown
- ❌ Files not accessible (CORS issues)

**Critical**: GDPR/Privacy - Must respect photo consent

---

#### Flow 7: Evidence Import/Migration
**Steps**:
1. Admin uploads evidence CSV
2. CSV validated
3. Batch processing started
4. Evidence created with correct round numbers
5. School progression updated

**Breakage Points**:
- ❌ Round numbers not set correctly
- ❌ School IDs not matched
- ❌ User IDs not matched
- ❌ Progression not recalculated
- ❌ Files not migrated

**Critical**: Must preserve historical data integrity

---

#### Flow 8: Evidence in Case Studies
**Steps**:
1. Admin creates case study
2. Links to evidence
3. Selects evidence files for gallery
4. Evidence files/videos included in case study
5. PDF export includes evidence

**Breakage Points**:
- ❌ Evidence link broken (FK constraint)
- ❌ Files not accessible
- ❌ Photo consent not checked
- ❌ Evidence deleted while linked

**Critical**: Must respect FK constraints and photo consent

---

### 7.2 Data Integrity Concerns

1. **Round Number Consistency**: Evidence `roundNumber` must match school's `currentRound` at submission
2. **Photo Consent**: Evidence with school's photo consent must be enforced for public display
3. **Cascade Deletes**: School deletion must cascade to evidence
4. **User Deletion**: Must handle evidence when user deleted (soft/transfer/hard)
5. **Requirement References**: Cannot delete requirement with linked evidence

---

### 7.3 Performance Concerns

1. **Bulk Operations**: Bulk review/delete must handle large batches without timeout
2. **Evidence Counts**: `getSchoolEvidenceCounts()` runs on every approval (could be slow)
3. **Pagination**: Evidence gallery must paginate large result sets
4. **Image Compression**: Compression must not block submission
5. **Email Sending**: Must not block HTTP response

---

### 7.4 Security Concerns

1. **Access Control**: Teachers can only view/submit evidence for their schools
2. **Admin Permissions**: Only admins can review/delete evidence
3. **Photo Consent**: Must enforce consent for public evidence
4. **File Upload**: Must validate file types and sizes
5. **SQL Injection**: All queries use parameterized queries (ORM)

---

## 8. Extraction Complexity Assessment

### Complexity: **HIGH**

**Reasons**:
1. **Deep School Integration**: Evidence approval directly triggers school progression
2. **Multi-Round System**: Round numbers must be preserved and tracked
3. **Complex Review Workflow**: Approval/rejection with emails and notifications
4. **Multi-Language Support**: Evidence requirements support 14 languages
5. **Admin Overrides**: Manual completion tracking adds complexity
6. **File Storage**: Object storage integration with ACLs
7. **Cascade Effects**: Evidence affects school stage, awards, certificates
8. **Legacy Migration**: Must support evidence import from old system

---

### Estimated Scope

- **Routes to Extract**: 18 evidence-specific endpoints
- **Storage Methods**: 27 evidence operations
- **Additional Methods**: 10+ school progression methods that use evidence
- **Database Tables**: 3 (evidence, evidenceRequirements, adminEvidenceOverrides)
- **Frontend Components**: 60+ files consuming evidence APIs
- **Frontend Pages**: 12+ pages with evidence features

---

### Key Extraction Risks

#### 1. School Progression Breakage (CRITICAL)
**Risk**: Evidence approval triggers `checkAndUpdateSchoolProgression()`
**Impact**: Schools cannot progress through stages
**Mitigation**: 
- Extract progression logic with evidence module
- OR maintain event bus for progression triggers
- Extensive integration testing

#### 2. Round Number Integrity (HIGH)
**Risk**: Evidence `roundNumber` must match school's `currentRound`
**Impact**: Evidence counted for wrong round, progression breaks
**Mitigation**:
- Validate round numbers at submission
- Migration script to verify data integrity
- Add database constraints

#### 3. File Storage Coupling (MEDIUM)
**Risk**: Evidence files in object storage with complex ACLs
**Impact**: Files inaccessible or broken links
**Mitigation**:
- Keep object storage utilities in shared module
- Test file access across all visibility levels
- URL normalization in shared library

#### 4. Email Dependencies (MEDIUM)
**Risk**: Evidence triggers 4 different email types
**Impact**: Broken email notifications
**Mitigation**:
- Extract email service as shared module
- Use event bus for async email sending
- Make emails non-blocking

#### 5. Frontend Integration (HIGH)
**Risk**: 60+ frontend files consume evidence APIs
**Impact**: Breaking changes across entire UI
**Mitigation**:
- Create evidence SDK/client library
- Version API endpoints
- Comprehensive E2E tests

#### 6. Photo Consent Coupling (HIGH)
**Risk**: Evidence visibility depends on school's photo consent status
**Impact**: GDPR violations if broken
**Mitigation**:
- Keep photo consent checking in evidence module
- Add privacy validation tests
- Audit public evidence queries

#### 7. Analytics Coupling (LOW)
**Risk**: Analytics queries evidence data
**Impact**: Broken dashboards
**Mitigation**:
- Keep analytics read-only
- Use materialized views or caching
- Abstract evidence queries behind interface

---

### Recommended Extraction Approach

#### Phase 1: Preparation (No Breaking Changes)
1. Create evidence module directory structure
2. Create evidence types/interfaces in shared module
3. Add comprehensive tests for existing evidence flows
4. Document all evidence-school progression logic
5. Audit frontend evidence usage

#### Phase 2: Backend Extraction
1. Move evidence routes to evidence module
2. Move evidence storage methods to evidence module
3. Keep `checkAndUpdateSchoolProgression()` in schools module (with evidence event trigger)
4. Extract email templates and helpers
5. Create evidence service layer

#### Phase 3: Frontend Refactoring
1. Create evidence SDK client library
2. Update frontend to use evidence SDK
3. Migrate components one at a time
4. Test each migration

#### Phase 4: Integration Testing
1. Test school progression with extracted evidence
2. Test email notifications
3. Test file uploads and access
4. Test photo consent enforcement
5. Test bulk operations
6. Test evidence import
7. Test case study integration

#### Phase 5: Deployment
1. Deploy with feature flag
2. Monitor error rates
3. Verify progression system working
4. Verify emails sending
5. Rollback plan ready

---

### Testing Requirements

**Unit Tests Needed**:
- Evidence CRUD operations (27 tests)
- Evidence validation schemas (5 tests)
- Round number assignment (3 tests)
- Admin override toggling (4 tests)
- Evidence counting logic (8 tests)

**Integration Tests Needed**:
- Evidence submission → school progression (5 scenarios)
- Evidence approval → email sending (4 scenarios)
- Bulk operations → partial failures (3 scenarios)
- Photo consent enforcement (6 scenarios)
- Evidence requirements → translations (14 languages)

**E2E Tests Needed**:
- Teacher submission flow (3 stages)
- Admin review flow (approve/reject)
- Bulk review workflow
- Evidence gallery filtering
- Public inspiration gallery
- Case study evidence integration
- Evidence import workflow

**Total Estimated Tests**: ~90 tests

---

## 9. Dependencies Summary

**Direct Dependencies** (Must extract together):
- Evidence table
- Evidence requirements table
- Admin evidence overrides table
- Evidence routes (18 endpoints)
- Evidence storage methods (27 methods)

**Coupled Dependencies** (Shared with other modules):
- Object storage service (files)
- Email service (notifications)
- User service (authentication, authorship)
- School service (progression, photo consent)
- Image compression service

**Optional Dependencies** (Can be decoupled):
- Case studies (optional link)
- Analytics (read-only)
- Notifications (informational)
- Mailchimp (marketing)

**Critical Shared State**:
- School `currentRound` ↔ Evidence `roundNumber`
- School stage completion ↔ Evidence counts
- School photo consent ↔ Evidence visibility
- User deletion ↔ Evidence ownership

---

## 10. Recommendations

### Before Extraction
1. ✅ **Add Comprehensive Tests**: 90+ tests for evidence flows
2. ✅ **Document Progression Logic**: Full specification of school progression algorithm
3. ✅ **Audit Frontend Usage**: Map all evidence API consumers
4. ✅ **Create Migration Scripts**: Round number verification, data integrity checks
5. ✅ **Plan Rollback Strategy**: Feature flags, data rollback procedures

### During Extraction
1. ✅ **Maintain Backward Compatibility**: Keep existing API endpoints during transition
2. ✅ **Event-Driven Architecture**: Use events for school progression triggers
3. ✅ **Shared Libraries**: Extract common utilities (object storage, emails) first
4. ✅ **Incremental Migration**: Move one route at a time, test thoroughly
5. ✅ **Monitor Metrics**: Track error rates, submission rates, progression rates

### After Extraction
1. ✅ **Integration Testing**: Full end-to-end testing of all flows
2. ✅ **Performance Testing**: Ensure no regressions in bulk operations
3. ✅ **Data Validation**: Verify all evidence has correct round numbers
4. ✅ **User Acceptance Testing**: Test with real teachers and admins
5. ✅ **Documentation**: Update API docs, admin guides, developer docs

---

## 11. Conclusion

The Evidence module is a **highly complex, deeply integrated feature** that affects multiple critical systems:

- **School Progression System**: Evidence approval drives stage advancement
- **Multi-Round Tracking**: Round numbers must be preserved across migrations
- **Multi-Language Support**: 14 language translations for requirements
- **File Storage System**: Complex object storage integration with ACLs
- **Review Workflow**: Admin/partner approval with email notifications
- **Photo Consent Enforcement**: GDPR compliance for public evidence
- **Case Study Integration**: Evidence media used in case studies
- **Analytics System**: Evidence metrics across multiple dashboards

**Extraction is feasible but requires**:
- Careful planning and comprehensive testing
- Event-driven architecture for school progression
- Shared service layer for common utilities
- Incremental migration with rollback capability
- Close monitoring during and after deployment

**Estimated Effort**: 4-6 weeks for complete extraction with testing

**Success Criteria**:
- All 18 endpoints working in extracted module
- School progression system intact
- No data loss or corruption
- All 60+ frontend components functional
- Email notifications working
- Photo consent enforced
- Round number integrity maintained

---

**Discovery Complete** ✅
*This document provides the foundation for safe Evidence module extraction.*
