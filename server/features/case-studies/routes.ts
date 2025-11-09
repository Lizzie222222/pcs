import { Router } from 'express';
import type { Request, Response } from 'express';
import { getCaseStudyStorage } from './storage';
import { getPDFDelegate, getMediaDelegate } from './delegates';
import { generatePdfHtml, sanitizeFilename } from '../../routes/utils/pdf';
import { normalizeObjectStorageUrl } from '../../routes/utils/urlNormalization';
import { isAuthenticated } from '../../auth';
import { requireAdmin, requireAdminOrPartner } from '../../routes/utils/middleware';
import { insertCaseStudySchema } from '@shared/schema';
import type { InsertCaseStudy, InsertCaseStudyVersion } from '@shared/schema';
import type { IStorage } from '../../storage';
import { logUserActivity } from '../../auditLog';
import { z } from 'zod';

/**
 * Case Study Routes Module
 * 
 * Handles public, authenticated, and admin routes for case studies:
 * 
 * PUBLIC ROUTES (mounted at /api/case-studies):
 * - GET / - Gallery list with filters
 * - GET /:id - View single case study
 * - GET /:id/related - Get related case studies
 * - GET /:id/pdf - Generate PDF export
 * 
 * AUTHENTICATED ROUTES:
 * - POST /upload - Get upload URL for media
 * - PUT /set-acl - Set ACL policy for uploaded files
 * 
 * ADMIN ROUTES (mounted at /api/admin/case-studies):
 * - GET / - List all case studies for admin management
 * - GET /:id - Get single case study for editing
 * - PUT /:id/featured - Toggle featured status
 * - POST / - Create new case study
 * - PUT /:id - Update case study
 * - DELETE /:id - Delete case study
 * - POST /:id/versions - Create version snapshot
 * - GET /:id/versions - Get version history
 * - POST /:id/versions/:versionId/restore - Restore from version
 * 
 * Follows the delegation pattern established in Schools and Evidence modules.
 * All routes preserve exact functionality from server/routes.ts.
 */

const router = Router();

// Storage and delegate instances
let caseStudyStorage: any;
let mainStorage: IStorage;
let pdfDelegate: any;
let mediaDelegate: any;

/**
 * Initialize case study routes with storage instance
 * @param storage - Main IStorage instance
 * @returns Express router with case study routes
 */
export function initCaseStudyRoutes(storage: IStorage) {
  mainStorage = storage;
  caseStudyStorage = getCaseStudyStorage(storage);
  pdfDelegate = getPDFDelegate();
  mediaDelegate = getMediaDelegate();
  return router;
}

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * GET /api/case-studies
 * 
 * Public endpoint for retrieving case studies with filtering by stage, country, 
 * categories, tags. Only published case studies shown to non-admin users.
 * 
 * Query params:
 * - stage: Filter by stage (inspire, investigate, act)
 * - country: Filter by school country
 * - search: Search term for title
 * - categories: Comma-separated list of categories
 * - tags: Comma-separated list of tags
 * - status: Filter by status (draft, published) - admin only for drafts
 * - limit: Results per page (default 20)
 * - offset: Pagination offset (default 0)
 * 
 * Migrated from server/routes.ts:1127-1173
 */
router.get('/', async (req: any, res: Response) => {
  try {
    const { stage, country, search, categories, tags, status, limit, offset } = req.query;
    
    // Check if user is authenticated and is admin
    const isAdmin = req.isAuthenticated && req.isAuthenticated() && req.user?.isAdmin;
    
    // Parse comma-separated categories and tags into arrays
    const categoriesArray = categories && typeof categories === 'string' 
      ? categories.split(',').map(c => c.trim()).filter(c => c.length > 0)
      : undefined;
      
    const tagsArray = tags && typeof tags === 'string'
      ? tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
      : undefined;
    
    // Draft Protection: Only admins can see drafts
    // For non-admin users, always filter to 'published' status
    const statusFilter = isAdmin && status ? (status as 'draft' | 'published') : 'published';
    
    const caseStudies = await caseStudyStorage.getCaseStudies({
      stage: stage as string,
      country: country as string,
      search: search as string,
      categories: categoriesArray,
      tags: tagsArray,
      status: statusFilter,
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
    });
    
    // Normalize URLs in case studies
    const normalizedCaseStudies = caseStudies.map((cs: any) => ({
      ...cs,
      imageUrl: normalizeObjectStorageUrl(cs.imageUrl),
      images: Array.isArray(cs.images) ? cs.images.map((img: any) => ({
        ...img,
        url: normalizeObjectStorageUrl(img.url),
      })) : cs.images,
    }));
    
    res.json(normalizedCaseStudies);
  } catch (error) {
    console.error("Error fetching case studies:", error);
    res.status(500).json({ message: "Failed to fetch case studies" });
  }
});

/**
 * GET /api/case-studies/:id
 * 
 * View single case study by ID with school details and evidence data.
 * Only published case studies shown to non-admin users.
 * 
 * Returns case study with:
 * - School details (name, country, language)
 * - Creator name
 * - Evidence data (if evidenceId present)
 * - Normalized object storage URLs
 * 
 * Migrated from server/routes.ts:1176-1235
 */
router.get('/:id', async (req: any, res: Response) => {
  try {
    const caseStudy = await caseStudyStorage.getCaseStudyById(req.params.id);
    if (!caseStudy) {
      return res.status(404).json({ message: "Case study not found" });
    }
    
    // Draft Protection: Only admins can view draft case studies
    const isAdmin = req.isAuthenticated && req.isAuthenticated() && req.user?.isAdmin;
    if (caseStudy.status === 'draft' && !isAdmin) {
      return res.status(404).json({ message: "Case study not found" });
    }
    
    // Get creator name
    let createdByName = 'Unknown';
    if (caseStudy.createdBy) {
      const creator = await mainStorage.getUser(caseStudy.createdBy);
      if (creator) {
        createdByName = `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || creator.email || 'Unknown';
      }
    }
    
    // Get evidence data if evidenceId is present
    let evidenceLink: string | null = null;
    let evidenceFiles: any[] | null = null;
    if (caseStudy.evidenceId) {
      const evidence = await mainStorage.getEvidenceById(caseStudy.evidenceId);
      if (evidence) {
        evidenceLink = evidence.videoLinks || null;
        // Normalize evidence file URLs
        evidenceFiles = Array.isArray(evidence.files) 
          ? evidence.files.map((file: any) => ({
              ...file,
              url: normalizeObjectStorageUrl(file.url),
            }))
          : null;
      }
    }
    
    // Transform the response to match the expected frontend interface
    const transformedCaseStudy = {
      ...caseStudy,
      location: (caseStudy as any).schoolCountry || '', // Map schoolCountry to location
      createdByName, // Add creator name
      evidenceLink, // From evidence table
      evidenceFiles, // From evidence table (with normalized URLs)
      // Normalize URLs
      imageUrl: normalizeObjectStorageUrl(caseStudy.imageUrl),
      images: Array.isArray(caseStudy.images) ? caseStudy.images.map((img: any) => ({
        ...img,
        url: normalizeObjectStorageUrl(img.url),
      })) : caseStudy.images,
    };
    
    res.json(transformedCaseStudy);
  } catch (error) {
    console.error("Error fetching case study:", error);
    res.status(500).json({ message: "Failed to fetch case study" });
  }
});

/**
 * GET /api/case-studies/:id/related
 * 
 * Get related case studies using scoring algorithm.
 * Returns case studies with similar stage, country, categories, or tags.
 * 
 * Query params:
 * - limit: Number of related case studies to return (default 4)
 * 
 * Migrated from server/routes.ts:1260-1281
 */
router.get('/:id/related', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 4;
    const relatedCaseStudies = await caseStudyStorage.getRelatedCaseStudies(id, limit);
    
    // Normalize URLs in related case studies
    const normalizedRelated = relatedCaseStudies.map((cs: any) => ({
      ...cs,
      imageUrl: normalizeObjectStorageUrl(cs.imageUrl),
      images: Array.isArray(cs.images) ? cs.images.map((img: any) => ({
        ...img,
        url: normalizeObjectStorageUrl(img.url),
      })) : cs.images,
    }));
    
    res.json(normalizedRelated);
  } catch (error) {
    console.error("Error fetching related case studies:", error);
    res.status(500).json({ message: "Failed to fetch related case studies" });
  }
});

/**
 * GET /api/case-studies/:id/pdf
 * 
 * Generates and downloads beautifully formatted PDF of case study using shared PDF service.
 * Includes images, metrics, timeline, and quotes.
 * 
 * Features:
 * - Draft protection (admin-only for drafts)
 * - Evidence data inclusion (files and video links)
 * - Base URL calculation for absolute image URLs
 * - Sanitized filename for safe downloads
 * 
 * Migrated from server/routes.ts:1290-1342
 */
router.get('/:id/pdf', async (req: any, res: Response) => {
  try {
    const caseStudy = await caseStudyStorage.getCaseStudyById(req.params.id);
    if (!caseStudy) {
      return res.status(404).json({ error: 'Case study not found' });
    }
    
    // Draft Protection: Only admins can download draft case studies
    const isAdmin = req.isAuthenticated && req.isAuthenticated() && req.user?.isAdmin;
    if (caseStudy.status === 'draft' && !isAdmin) {
      return res.status(404).json({ error: 'Case study not found' });
    }
    
    // Get evidence data if evidenceId is present
    let evidenceLink: string | null = null;
    let evidenceFiles: any[] | null = null;
    if (caseStudy.evidenceId) {
      const evidence = await mainStorage.getEvidenceById(caseStudy.evidenceId);
      if (evidence) {
        evidenceLink = evidence.videoLinks || null;
        evidenceFiles = Array.isArray(evidence.files) ? evidence.files : null;
      }
    }
    
    // Add evidence data to case study for PDF generation
    const caseStudyWithEvidence = {
      ...caseStudy,
      evidenceLink,
      evidenceFiles
    };
    
    // Get base URL for converting relative image URLs to absolute
    const protocol = req.protocol || 'https';
    const host = req.get('host') || 'plasticcleverschools.com';
    const baseUrl = `${protocol}://${host}`;
    
    // Generate beautiful HTML for PDF
    const htmlContent = generatePdfHtml(caseStudyWithEvidence, baseUrl);
    
    // Use shared PDF service via delegate
    const pdfBuffer = await pdfDelegate.generateCaseStudyPDF(htmlContent);
    
    // Set headers and send PDF
    const filename = sanitizeFilename(caseStudy.title);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[PDF] PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// ============================================================================
// AUTHENTICATED ROUTES
// ============================================================================

/**
 * POST /api/case-studies/upload
 * 
 * Get upload URL for case study media files.
 * Returns signed URL for direct client-side upload to Google Cloud Storage.
 * 
 * Authentication: Required
 * 
 * Response:
 * - uploadURL: Signed URL for uploading files
 * 
 * Migrated from server/routes.ts:4021-4030
 */
router.post('/upload', isAuthenticated, async (req: any, res: Response) => {
  try {
    const uploadURL = await mediaDelegate.getUploadURL();
    res.json({ uploadURL });
  } catch (error) {
    console.error('[CaseStudies] Error getting upload URL:', error);
    res.status(500).json({ error: 'Failed to get upload URL' });
  }
});

/**
 * PUT /api/case-studies/set-acl
 * 
 * Set ACL policy for uploaded case study files.
 * Controls file visibility and ownership after upload.
 * 
 * Authentication: Required
 * 
 * Request body:
 * - fileURL: GCS file URL (required)
 * - visibility: File visibility ('public' | 'private' | 'registered', default: 'public')
 * - filename: Optional filename
 * 
 * Response:
 * - objectPath: Normalized object storage path
 * 
 * Migrated from server/routes.ts:4033-4058
 */
router.put('/set-acl', isAuthenticated, async (req: any, res: Response) => {
  if (!req.body.fileURL) {
    return res.status(400).json({ error: 'fileURL is required' });
  }

  const userId = req.user?.id;
  const visibility = req.body.visibility || 'public';
  const filename = req.body.filename;

  try {
    const objectPath = await mediaDelegate.setFileACL(
      req.body.fileURL,
      userId,
      visibility,
      filename
    );
    res.status(200).json({ objectPath });
  } catch (error) {
    console.error('[CaseStudies] Error setting file ACL:', error);
    res.status(500).json({ error: 'Failed to set file permissions' });
  }
});

// ============================================================================
// ADMIN ROUTES (Separate Router)
// ============================================================================

/**
 * Helper function to log audit actions for case study operations
 * @param userId - User performing the action
 * @param action - Action type (created, edited, deleted)
 * @param entityType - Entity type (case_study)
 * @param entityId - Entity ID
 * @param metadata - Optional metadata about the action
 */
async function logAuditAction(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: any
): Promise<void> {
  try {
    await logUserActivity({
      userId,
      action,
      entityType,
      entityId,
      metadata,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}

/**
 * Helper function to synchronize imageUrl with images array
 * Ensures imageUrl is set to first image if images array exists
 * @param data - Case study data to sync
 * @returns Synchronized case study data
 */
function syncImageUrl(data: any): any {
  if (data.images && Array.isArray(data.images) && data.images.length > 0) {
    const firstImageUrl = data.images[0].url;
    if (firstImageUrl && !data.imageUrl) {
      data.imageUrl = firstImageUrl;
    }
  }
  return data;
}

const adminRouter = Router();

/**
 * GET /api/admin/case-studies
 * 
 * Get all case studies for admin management with filters.
 * Admins can filter by any status including drafts.
 * 
 * Query params:
 * - stage: Filter by stage
 * - country: Filter by school country
 * - featured: Filter by featured status (true/false)
 * - search: Search term for title
 * - categories: Comma-separated list of categories
 * - tags: Comma-separated list of tags
 * - status: Filter by status (draft, published)
 * - limit: Results per page (default 50)
 * - offset: Pagination offset (default 0)
 * 
 * Migrated from server/routes.ts:6222-6251
 */
adminRouter.get('/', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { stage, country, featured, search, categories, tags, status, limit, offset } = req.query;
    
    const categoriesArray = categories && typeof categories === 'string' 
      ? categories.split(',').map(c => c.trim()).filter(c => c.length > 0)
      : undefined;
      
    const tagsArray = tags && typeof tags === 'string'
      ? tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
      : undefined;
    
    const caseStudies = await caseStudyStorage.getCaseStudies({
      stage: stage as string,
      country: country as string,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      search: search as string,
      categories: categoriesArray,
      tags: tagsArray,
      status: status as 'draft' | 'published' | undefined,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });
    res.json(caseStudies);
  } catch (error) {
    console.error("Error fetching case studies:", error);
    res.status(500).json({ message: "Failed to fetch case studies" });
  }
});

/**
 * GET /api/admin/case-studies/:id
 * 
 * Get single case study by ID for admin editing.
 * No draft protection - admins can view any case study.
 * 
 * Migrated from server/routes.ts:6254-6267
 */
adminRouter.get('/:id', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const caseStudy = await caseStudyStorage.getCaseStudyById(req.params.id);
    
    if (!caseStudy) {
      return res.status(404).json({ message: "Case study not found" });
    }
    
    res.json(caseStudy);
  } catch (error) {
    console.error("Error fetching case study:", error);
    res.status(500).json({ message: "Failed to fetch case study" });
  }
});

/**
 * PUT /api/admin/case-studies/:id/featured
 * 
 * Update case study featured status.
 * Only admins and partners can toggle featured status.
 * 
 * Request body:
 * - featured: Boolean value for featured status
 * 
 * Migrated from server/routes.ts:6270-6289
 */
adminRouter.put('/:id/featured', isAuthenticated, requireAdminOrPartner, async (req: Request, res: Response) => {
  try {
    const { featured } = req.body;
    
    if (typeof featured !== 'boolean') {
      return res.status(400).json({ message: "Featured must be a boolean value" });
    }

    const caseStudy = await caseStudyStorage.updateCaseStudyFeatured(req.params.id, featured);
    
    if (!caseStudy) {
      return res.status(404).json({ message: "Case study not found" });
    }

    res.json(caseStudy);
  } catch (error) {
    console.error("Error updating case study featured status:", error);
    res.status(500).json({ message: "Failed to update case study" });
  }
});

/**
 * POST /api/admin/case-studies
 * 
 * Create new case study from scratch.
 * Validates request body using insertCaseStudySchema.
 * Automatically syncs imageUrl with images array.
 * 
 * Request body: InsertCaseStudy schema
 * 
 * Migrated from server/routes.ts:6344-6367
 */
adminRouter.post('/', isAuthenticated, requireAdminOrPartner, async (req: any, res: Response) => {
  try {
    const validatedData = insertCaseStudySchema.parse(req.body);
    
    const dataWithSyncedImage = syncImageUrl(validatedData);
    
    const caseStudy = await caseStudyStorage.createCaseStudy(dataWithSyncedImage);
    
    await logAuditAction(req.user.id, 'created', 'case_study', caseStudy.id);
    
    const caseStudyWithSchool = await caseStudyStorage.getCaseStudyById(caseStudy.id);
    
    res.status(201).json(caseStudyWithSchool || caseStudy);
  } catch (error) {
    console.error("Error creating case study:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create case study" });
  }
});

/**
 * PUT /api/admin/case-studies/:id
 * 
 * Update case study with partial data.
 * Validates request body using insertCaseStudySchema.partial().
 * Auto-creates version snapshot when publishing.
 * 
 * Request body: Partial<InsertCaseStudy>
 * 
 * Migrated from server/routes.ts:6370-6437
 */
adminRouter.put('/:id', isAuthenticated, requireAdminOrPartner, async (req: any, res: Response) => {
  try {
    const validatedData = insertCaseStudySchema.partial().parse(req.body);
    
    const dataWithSyncedImage = syncImageUrl(validatedData);
    
    const originalCaseStudy = await caseStudyStorage.getCaseStudyById(req.params.id);
    
    const caseStudy = await caseStudyStorage.updateCaseStudy(req.params.id, dataWithSyncedImage);
    
    if (!caseStudy) {
      return res.status(404).json({ message: "Case study not found" });
    }

    await logAuditAction(req.user.id, 'edited', 'case_study', req.params.id, { changes: validatedData });

    if (validatedData.status === 'published' && originalCaseStudy?.status !== 'published') {
      try {
        const existingVersions = await mainStorage.getCaseStudyVersions(req.params.id);
        const nextVersionNumber = existingVersions.length > 0 
          ? Math.max(...existingVersions.map(v => v.versionNumber)) + 1 
          : 1;
        
        await mainStorage.createCaseStudyVersion({
          caseStudyId: req.params.id,
          versionNumber: nextVersionNumber,
          title: caseStudy.title,
          description: caseStudy.description,
          stage: caseStudy.stage,
          status: caseStudy.status || 'draft',
          impact: caseStudy.impact,
          images: caseStudy.images as any,
          videos: caseStudy.videos as any,
          studentQuotes: caseStudy.studentQuotes as any,
          impactMetrics: caseStudy.impactMetrics as any,
          timelineSections: caseStudy.timelineSections as any,
          templateType: caseStudy.templateType,
          beforeImage: caseStudy.beforeImage,
          afterImage: caseStudy.afterImage,
          snapshot: caseStudy as any,
          createdBy: req.user!.id,
        });
        
        console.log(`[Version] Auto-created version ${nextVersionNumber} for case study ${req.params.id}`);
      } catch (versionError) {
        console.error("Error auto-creating version:", versionError);
      }
    }

    const caseStudyWithSchool = await caseStudyStorage.getCaseStudyById(caseStudy.id);
    
    res.json(caseStudyWithSchool || caseStudy);
  } catch (error) {
    console.error("Error updating case study:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to update case study" });
  }
});

/**
 * DELETE /api/admin/case-studies/:id
 * 
 * Delete case study by ID.
 * Only admins and partners can delete case studies.
 * 
 * Migrated from server/routes.ts:6440-6453
 */
adminRouter.delete('/:id', isAuthenticated, requireAdminOrPartner, async (req: Request, res: Response) => {
  try {
    const deleted = await caseStudyStorage.deleteCaseStudy(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Case study not found" });
    }

    res.json({ message: "Case study deleted successfully" });
  } catch (error) {
    console.error("Error deleting case study:", error);
    res.status(500).json({ message: "Failed to delete case study" });
  }
});

/**
 * POST /api/admin/case-studies/:id/versions
 * 
 * Create a version snapshot of current case study state.
 * Captures all fields for potential future restoration.
 * 
 * Migrated from server/routes.ts:6456-6498
 */
adminRouter.post("/:id/versions", isAuthenticated, requireAdminOrPartner, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const caseStudy = await caseStudyStorage.getCaseStudyById(id);
    if (!caseStudy) {
      return res.status(404).json({ success: false, message: "Case study not found" });
    }
    
    const existingVersions = await mainStorage.getCaseStudyVersions(id);
    const nextVersionNumber = existingVersions.length > 0 
      ? Math.max(...existingVersions.map(v => v.versionNumber)) + 1 
      : 1;
    
    const version = await mainStorage.createCaseStudyVersion({
      caseStudyId: id,
      versionNumber: nextVersionNumber,
      title: caseStudy.title,
      description: caseStudy.description,
      stage: caseStudy.stage,
      status: caseStudy.status || 'draft',
      impact: caseStudy.impact,
      images: caseStudy.images as any,
      videos: caseStudy.videos as any,
      studentQuotes: caseStudy.studentQuotes as any,
      impactMetrics: caseStudy.impactMetrics as any,
      timelineSections: caseStudy.timelineSections as any,
      templateType: caseStudy.templateType,
      beforeImage: caseStudy.beforeImage,
      afterImage: caseStudy.afterImage,
      snapshot: caseStudy as any,
      createdBy: req.user!.id,
    });
    
    res.json({ success: true, version });
  } catch (error: any) {
    console.error("Error creating case study version:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/case-studies/:id/versions
 * 
 * List all versions for a case study.
 * Returns version history sorted by version number.
 * 
 * Migrated from server/routes.ts:6501-6510
 */
adminRouter.get("/:id/versions", isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const versions = await mainStorage.getCaseStudyVersions(id);
    res.json({ success: true, versions });
  } catch (error: any) {
    console.error("Error getting case study versions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/case-studies/:id/versions/:versionId/restore
 * 
 * Restore case study from a specific version snapshot.
 * Updates case study with ALL fields from version.
 * Review workflow fields are NOT restored.
 * 
 * Migrated from server/routes.ts:6513-6566
 */
adminRouter.post("/:id/versions/:versionId/restore", isAuthenticated, requireAdminOrPartner, async (req: Request, res: Response) => {
  try {
    const { id, versionId } = req.params;
    
    const version = await mainStorage.getCaseStudyVersion(versionId);
    if (!version || version.caseStudyId !== id) {
      return res.status(404).json({ success: false, message: "Version not found" });
    }
    
    const snapshot = version.snapshot as any;
    
    const updated = await caseStudyStorage.updateCaseStudy(id, {
      title: version.title,
      description: version.description,
      stage: version.stage,
      status: version.status || snapshot?.status || 'draft',
      impact: version.impact,
      
      images: version.images as any,
      videos: version.videos as any,
      studentQuotes: version.studentQuotes as any,
      impactMetrics: version.impactMetrics as any,
      timelineSections: version.timelineSections as any,
      
      templateType: version.templateType,
      beforeImage: version.beforeImage,
      afterImage: version.afterImage,
      
      categories: snapshot?.categories,
      tags: snapshot?.tags,
      metaDescription: snapshot?.metaDescription,
      metaKeywords: snapshot?.metaKeywords,
      imageUrl: snapshot?.imageUrl,
      featured: snapshot?.featured,
      priority: snapshot?.priority,
      evidenceId: snapshot?.evidenceId,
    });
    
    res.json({ success: true, caseStudy: updated });
  } catch (error: any) {
    console.error("Error restoring case study version:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export both routers
export { adminRouter };
export default router;
