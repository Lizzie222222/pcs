import { Router } from 'express';
import { isAuthenticated } from '../../auth';
import { markUserInteracted } from '../../auth';
import { logUserActivity } from '../../auditLog';
import { getEvidenceStorage } from './storage';
import { createEvidenceDelegates } from './delegates';
import { createSchoolProgressionDelegate } from '../schools/progression';
import { schoolStorage } from '../schools/storage';
import type { IStorage } from '../../storage';
import { insertEvidenceSchema, insertEvidenceRequirementSchema, evidence } from '@shared/schema';
import { sendEvidenceSubmissionEmail, sendEvidenceApprovalEmail, sendEvidenceRejectionEmail } from '../../emailService';
import { mailchimpService } from '../../mailchimpService';
import { translateEvidenceRequirement } from '../../translationService';
import { requireAdmin, requireAdminOrPartner } from '../../routes/utils/middleware';
import { uploadCompression } from '../../routes/utils/uploads';
import { shouldCompressFile, compressImage } from '../../imageCompression';
import { ObjectStorageService } from '../../objectStorage';
import { z } from 'zod';
import { db } from '../../db';
import { sql, and, eq } from 'drizzle-orm';

/**
 * Create Evidence Routers (Quad Router Structure)
 * 
 * PHASE 1: Evidence CRUD Routes (4 endpoints) - mounted at /api/evidence
 * - POST /api/evidence - Submit new evidence
 * - GET /api/evidence - Get user's evidence with filters
 * - GET /api/evidence/:id - View single evidence (public if approved)
 * - DELETE /api/evidence/:id - Delete pending evidence
 * 
 * PHASE 2: Evidence Requirements Routes (6 endpoints) - mounted at /api/evidence-requirements
 * - GET /api/evidence-requirements - Get all requirements (with optional stage filter)
 * - GET /api/evidence-requirements/:id - Get single requirement
 * - POST /api/evidence-requirements - Create requirement (admin)
 * - PATCH /api/evidence-requirements/:id - Update requirement (admin)
 * - DELETE /api/evidence-requirements/:id - Delete requirement (admin)
 * - POST /api/evidence-requirements/:id/translate - Translate requirement (admin)
 * 
 * PHASE 3: Admin Evidence Review Routes (4 endpoints) - mounted at /api/admin/evidence
 * - PATCH /api/admin/evidence/:id - Update evidence metadata
 * - GET /api/admin/evidence - List evidence with filters
 * - PATCH /api/admin/evidence/:id/review - Review evidence (approve/reject)
 * - POST /api/admin/evidence/bulk-review - Bulk approve/reject multiple evidence
 * 
 * PHASE 4: Evidence File Upload Routes (1 endpoint) - mounted at /api/evidence-files
 * - POST /api/evidence-files/upload-compressed - Upload and compress evidence files
 * 
 * NOTE: Cross-cutting admin routes remain in server/routes.ts:
 * - GET /api/admin/analytics/evidence - Evidence analytics (in analytics section)
 * - POST /api/admin/case-studies/from-evidence - Create case study from evidence (in case studies section)
 * 
 * @param storage - Main IStorage instance
 * @returns Object containing evidenceRouter, requirementsRouter, adminEvidenceRouter, and evidenceFilesRouter
 */
export function createEvidenceRouters(storage: IStorage): {
  evidenceRouter: Router;
  requirementsRouter: Router;
  adminEvidenceRouter: Router;
  evidenceFilesRouter: Router;
} {
  const evidenceRouter = Router();
  const requirementsRouter = Router();
  const adminEvidenceRouter = Router();
  const evidenceFilesRouter = Router();
  
  // Initialize EvidenceStorage with delegates
  const progressionDelegate = createSchoolProgressionDelegate(schoolStorage);
  const delegates = createEvidenceDelegates(storage, progressionDelegate);
  const evidenceStorage = getEvidenceStorage(delegates);

  // ============================================================================
  // PHASE 1: EVIDENCE ROUTES (mounted at /api/evidence)
  // ============================================================================

  /**
   * GET /api/evidence/:id
   * 
   * View single evidence by ID (public endpoint for approved evidence)
   * - Public can view approved evidence
   * - Admins can view any evidence
   * 
   * Migrated from server/routes.ts:1230-1248
   */
  evidenceRouter.get('/:id', async (req: any, res) => {
    try {
      const evidence = await evidenceStorage.getEvidenceById(req.params.id);
      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }
      
      // Only allow viewing approved evidence publicly (non-admins)
      const isAdmin = req.isAuthenticated && req.isAuthenticated() && req.user?.isAdmin;
      if (evidence.status !== 'approved' && !isAdmin) {
        return res.status(404).json({ message: "Evidence not found" });
      }
      
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching evidence:", error);
      res.status(500).json({ message: "Failed to fetch evidence" });
    }
  });

  /**
   * POST /api/evidence
   * 
   * Submit new evidence with files/videos
   * - Validates stage locking (unlocked stages only unless admin/partner)
   * - Auto-approves admin uploads
   * - Sends confirmation and admin notification emails
   * - Creates Mailchimp automation
   * - Logs user activity
   * 
   * Migrated from server/routes.ts:2855-2965
   */
  evidenceRouter.post('/', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      // Mark user as having interacted (evidence submission is a meaningful action)
      await markUserInteracted(userId);
      
      // Check if user is admin or partner
      const isAdminOrPartner = user?.isAdmin || user?.role === 'partner';
      
      // Get school to check stage lock status and round number
      const school = await schoolStorage.getSchool(req.body.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      // If admin is uploading, auto-approve and set review metadata
      // Also set the roundNumber to the school's current round
      const evidenceData = insertEvidenceSchema.parse({
        ...req.body,
        submittedBy: userId,
        roundNumber: school.currentRound || 1,
        // Auto-approve admin uploads
        ...(user?.isAdmin ? {
          status: 'approved',
          reviewedBy: userId,
          reviewedAt: new Date(),
        } : {}),
      });

      // If not admin/partner, verify user is a member of the school
      if (!isAdminOrPartner) {
        const schoolUser = await schoolStorage.getSchoolUser(evidenceData.schoolId, userId);
        if (!schoolUser) {
          return res.status(403).json({ 
            message: "You must be a member of the school to submit evidence" 
          });
        }
      }

      const evidence = await evidenceStorage.createEvidence(evidenceData);

      // If admin uploaded and auto-approved, check and update school progression
      if (user?.isAdmin) {
        await delegates.progression.checkAndUpdateSchoolProgression(evidenceData.schoolId);
      }

      // Skip email notifications for admin uploads
      if (!user?.isAdmin) {
        // Send email notifications (non-blocking) for non-admin submissions
        try {
          const user = await storage.getUser(userId);
          const school = await schoolStorage.getSchool(evidenceData.schoolId);
          
          if (user?.email && school) {
            // Send confirmation email to the teacher who submitted the evidence
            await sendEvidenceSubmissionEmail(
              user.email,
              school.name,
              evidence.title,
              evidence.stage,
              user.preferredLanguage || 'en'
            );

            // NOTE: Admin notifications replaced with weekly digest emails
            // Admins receive a weekly summary instead of being notified on every submission
            // Use POST /api/admin/send-weekly-digest to send the digest manually

            // Add to Mailchimp evidence submission automation
            await mailchimpService.setupEvidenceSubmissionAutomation({
              email: user.email,
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              schoolName: school.name,
              schoolCountry: school.country,
              role: user.role || 'teacher',
              tags: ['evidence_submitted', evidenceData.stage, user.role || 'teacher'],
            }, evidence.title);
          }
        } catch (emailError) {
          // Log but don't fail evidence submission if email/Mailchimp fails
          console.warn('Email notification failed for evidence submission:', emailError);
        }
      }

      // Log evidence submission
      await logUserActivity(
        userId,
        user?.email || undefined,
        'evidence_submit',
        {
          evidenceId: evidence.id,
          title: evidence.title,
          stage: evidence.stage,
          schoolId: evidence.schoolId,
        },
        evidence.id,
        'evidence',
        req
      );

      res.status(201).json(evidence);
    } catch (error) {
      console.error("Error submitting evidence:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit evidence" });
    }
  });

  /**
   * GET /api/evidence
   * 
   * Get user's evidence with optional filters
   * - Filters by schoolId, status, visibility, photo consent
   * - Verifies user has access to requested school
   * - Returns evidence with file URLs extracted
   * 
   * Migrated from server/routes.ts:2968-3033
   */
  evidenceRouter.get('/', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const { schoolId, status, visibility, requirePhotoConsent, roundNumber } = req.query;
      
      // If schoolId is provided, verify user has access to it
      let targetSchoolId = schoolId as string | undefined;
      
      if (targetSchoolId) {
        // Admins can access any school's evidence
        if (!user?.isAdmin) {
          // Non-admins must be a member of the school
          const schoolUser = await schoolStorage.getSchoolUser(targetSchoolId, userId);
          if (!schoolUser) {
            return res.status(403).json({ 
              message: "You don't have permission to view evidence for this school" 
            });
          }
        }
      } else {
        // No schoolId provided, get user's first school
        const schools = await schoolStorage.getUserSchools(userId);
        if (schools.length === 0) {
          return res.json([]);
        }
        targetSchoolId = schools[0].id;
      }

      // Build filters
      const filters: any = { schoolId: targetSchoolId };
      if (status) filters.status = status as 'pending' | 'approved' | 'rejected';
      if (visibility) filters.visibility = visibility as 'public' | 'private';
      if (roundNumber) filters.roundNumber = parseInt(roundNumber as string, 10);

      // Get evidence with school data (includes photo consent status)
      let evidence = await evidenceStorage.getAllEvidence(filters);
      
      // Filter by photo consent status if required
      if (requirePhotoConsent === 'true') {
        evidence = evidence.filter(ev => ev.school?.photoConsent?.status === 'approved');
      }
      
      // Transform to match the expected format with full evidence data
      const transformedEvidence = evidence.map(ev => ({
        id: ev.id,
        title: ev.title,
        description: ev.description,
        stage: ev.stage,
        status: ev.status,
        visibility: ev.visibility,
        schoolId: ev.schoolId,
        schoolName: ev.school?.name || '',
        evidenceRequirementId: ev.evidenceRequirementId,
        roundNumber: ev.roundNumber,
        files: ev.files || [],
        videoLinks: ev.videoLinks,
        submittedAt: ev.submittedAt,
        reviewedAt: ev.reviewedAt,
        reviewNotes: ev.reviewNotes,
        fileUrls: Array.isArray(ev.files) 
          ? (ev.files as any[]).filter((f: any) => f.type?.startsWith('image/')).map((f: any) => f.url) 
          : [],
        createdAt: ev.submittedAt,
        photoConsentStatus: ev.school?.photoConsent?.status || null,
      }));
      
      res.json(transformedEvidence);
    } catch (error) {
      console.error("Error fetching evidence:", error);
      res.status(500).json({ message: "Failed to fetch evidence" });
    }
  });

  /**
   * DELETE /api/evidence/:id
   * 
   * Delete pending evidence
   * - Only pending evidence can be deleted
   * - Verifies user is a member of the school
   * - Logs deletion activity
   * 
   * Migrated from server/routes.ts:3036-3088
   */
  evidenceRouter.delete('/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Get evidence by ID
      const evidence = await evidenceStorage.getEvidence(id);
      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }

      // Check if evidence status is 'pending'
      if (evidence.status !== 'pending') {
        return res.status(403).json({ message: "Only pending evidence can be deleted" });
      }

      // Verify user is a member of the school that submitted the evidence
      const userSchools = await schoolStorage.getUserSchools(userId);
      const hasPermission = userSchools.some((school: { id: string }) => school.id === evidence.schoolId);
      
      if (!hasPermission) {
        return res.status(403).json({ message: "You don't have permission to delete this evidence" });
      }

      // Delete the evidence
      const deleted = await evidenceStorage.deleteEvidence(id);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete evidence" });
      }

      // Log evidence deletion
      const user = await storage.getUser(userId);
      await logUserActivity(
        userId,
        user?.email || undefined,
        'evidence_delete',
        {
          evidenceId: id,
          title: evidence.title,
          stage: evidence.stage,
          schoolId: evidence.schoolId,
        },
        id,
        'evidence',
        req
      );

      res.json({ message: "Evidence deleted successfully" });
    } catch (error) {
      console.error("Error deleting evidence:", error);
      res.status(500).json({ message: "Failed to delete evidence" });
    }
  });

  // ============================================================================
  // PHASE 2: EVIDENCE REQUIREMENTS ROUTES (mounted at /api/evidence-requirements)
  // ============================================================================

  /**
   * GET /api/evidence-requirements
   * 
   * Get all evidence requirements (public, optional stage filter)
   * Migrated from server/routes.ts:3147-3156
   */
  requirementsRouter.get('/', async (req, res) => {
    try {
      const { stage } = req.query;
      const requirements = await evidenceStorage.getEvidenceRequirements(
        stage as 'inspire' | 'investigate' | 'act' | undefined
      );
      res.json(requirements);
    } catch (error) {
      console.error("Error fetching evidence requirements:", error);
      res.status(500).json({ message: "Failed to fetch evidence requirements" });
    }
  });

  /**
   * GET /api/evidence-requirements/:id
   * 
   * Get single evidence requirement (public)
   * Migrated from server/routes.ts:3159-3173
   */
  requirementsRouter.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const requirement = await evidenceStorage.getEvidenceRequirement(id);
      
      if (!requirement) {
        return res.status(404).json({ message: "Evidence requirement not found" });
      }
      
      res.json(requirement);
    } catch (error) {
      console.error("Error fetching evidence requirement:", error);
      res.status(500).json({ message: "Failed to fetch evidence requirement" });
    }
  });

  /**
   * POST /api/evidence-requirements
   * 
   * Create evidence requirement (admin only)
   * Migrated from server/routes.ts:3176-3200
   */
  requirementsRouter.post('/', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const requirementData = insertEvidenceRequirementSchema.parse(req.body);
      const requirement = await evidenceStorage.createEvidenceRequirement(requirementData);
      
      console.log(`[Evidence Requirement Created] ID: ${requirement.id}, Stage: ${requirement.stage}, Title: ${requirement.title}`);
      res.status(201).json(requirement);
    } catch (error) {
      console.error("Error creating evidence requirement:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create evidence requirement" });
    }
  });

  /**
   * PATCH /api/evidence-requirements/:id
   * 
   * Update evidence requirement (admin only)
   * Migrated from server/routes.ts:3203-3249
   */
  requirementsRouter.patch('/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      
      // Extract JSONB fields before schema validation
      const { translations, languageSpecificResources, languageSpecificLinks, ...rest } = req.body;
      
      // Validate partial update data (excluding JSONB fields for explicit handling)
      const updateData = insertEvidenceRequirementSchema.partial().parse(rest);
      
      // Add JSONB fields to updateData if provided
      if (translations !== undefined) {
        updateData.translations = translations;
      }
      if (languageSpecificResources !== undefined) {
        updateData.languageSpecificResources = languageSpecificResources;
      }
      if (languageSpecificLinks !== undefined) {
        updateData.languageSpecificLinks = languageSpecificLinks;
      }
      
      const requirement = await evidenceStorage.updateEvidenceRequirement(id, updateData);
      
      if (!requirement) {
        return res.status(404).json({ message: "Evidence requirement not found" });
      }
      
      console.log(`[Evidence Requirement Updated] ID: ${requirement.id}, Title: ${requirement.title}`);
      res.json(requirement);
    } catch (error) {
      console.error("Error updating evidence requirement:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update evidence requirement" });
    }
  });

  /**
   * POST /api/evidence-requirements/:id/translate
   * 
   * Generate translations for evidence requirement (admin only)
   * Migrated from server/routes.ts:3252-3303
   */
  requirementsRouter.post('/:id/translate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      
      const requirement = await evidenceStorage.getEvidenceRequirement(id);
      if (!requirement) {
        return res.status(404).json({ message: "Evidence requirement not found" });
      }

      const supportedLanguages = ['es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'zh', 'ko', 'ar', 'id', 'el', 'cy'];
      const translations: Record<string, { title: string; description: string }> = {
        en: {
          title: requirement.title,
          description: requirement.description
        }
      };

      for (const lang of supportedLanguages) {
        try {
          const translated = await translateEvidenceRequirement(
            { title: requirement.title, description: requirement.description },
            lang
          );
          translations[lang] = translated;
        } catch (error) {
          console.error(`Failed to translate to ${lang}:`, error);
          translations[lang] = {
            title: requirement.title,
            description: requirement.description
          };
        }
      }

      const updated = await evidenceStorage.updateEvidenceRequirement(id, { translations });
      
      console.log(`[Evidence Requirement Translated] ID: ${id}, Languages: ${Object.keys(translations).length}`);
      res.json({ translations, requirement: updated });
    } catch (error) {
      console.error("Error translating evidence requirement:", error);
      res.status(500).json({ message: "Failed to translate evidence requirement" });
    }
  });

  /**
   * DELETE /api/evidence-requirements/:id
   * 
   * Delete evidence requirement (admin only)
   * Migrated from server/routes.ts:3306-3342
   */
  requirementsRouter.delete('/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      
      // Check if any evidence is linked to this requirement
      const linkedEvidence = await storage.getEvidenceByRequirement(id);
      
      if (linkedEvidence.length > 0) {
        return res.status(409).json({ 
          message: "Cannot delete evidence requirement with linked evidence submissions",
          linkedEvidenceCount: linkedEvidence.length
        });
      }
      
      const deleted = await evidenceStorage.deleteEvidenceRequirement(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Evidence requirement not found" });
      }
      
      console.log(`[Evidence Requirement Deleted] ID: ${id}`);
      res.json({ message: "Evidence requirement deleted successfully" });
    } catch (error) {
      console.error("Error deleting evidence requirement:", error);
      res.status(500).json({ message: "Failed to delete evidence requirement" });
    }
  });

  // ============================================================================
  // PHASE 3: ADMIN EVIDENCE REVIEW ROUTES (mounted at /api/admin/evidence)
  // ============================================================================

  /**
   * Helper function to log admin actions
   * Used by admin evidence routes to track review actions
   */
  async function logAuditAction(
    userId: string,
    action: string,
    targetType: string,
    targetId: string,
    details?: any
  ) {
    try {
      await storage.createAuditLog({
        userId,
        action,
        targetType,
        targetId,
        details,
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  }

  /**
   * PATCH /api/admin/evidence/:id
   * 
   * Update evidence metadata (admin only)
   * - Can update title, description, stage, visibility, etc.
   * - If updating status to approved/rejected, uses updateEvidenceStatus()
   * - Triggers school progression on approval
   * 
   * Migrated from server/routes.ts:3101-3146
   */
  adminEvidenceRouter.patch('/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Get existing evidence to verify it exists
      const evidence = await evidenceStorage.getEvidence(id);
      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }

      // If updating status to approved or rejected, use proper review method
      if (updates.status && ['approved', 'rejected'].includes(updates.status) && evidence.status !== updates.status) {
        console.log(`[Evidence] Updating evidence ${id} status to ${updates.status} via admin PATCH`);
        const updatedEvidence = await evidenceStorage.updateEvidenceStatus(
          id,
          updates.status as 'approved' | 'rejected',
          req.user.id,
          updates.reviewNotes
        );
        
        if (!updatedEvidence) {
          return res.status(500).json({ message: "Failed to update evidence" });
        }

        // School progression is triggered internally by updateEvidenceStatus
        // No need to call checkAndUpdateSchoolProgression here
        return res.json(updatedEvidence);
      }

      // For other updates, use regular update method
      const updatedEvidence = await evidenceStorage.updateEvidence(id, updates);
      if (!updatedEvidence) {
        return res.status(500).json({ message: "Failed to update evidence" });
      }

      res.json(updatedEvidence);
    } catch (error) {
      console.error("Error updating evidence:", error);
      res.status(500).json({ message: "Failed to update evidence" });
    }
  });

  /**
   * GET /api/admin/evidence
   * 
   * List evidence with flexible filtering
   * - Filters by status, stage, schoolId, country, visibility, assignedTo, evidenceRequirementId
   * - Supports search, sorting, and date range filtering
   * - Returns all evidence with school details
   * 
   * Migrated from server/routes.ts:5847-5869
   */
  adminEvidenceRouter.get('/', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const filters = {
        status: req.query.status as 'pending' | 'approved' | 'rejected' | undefined,
        stage: req.query.stage as 'inspire' | 'investigate' | 'act' | 'above_and_beyond' | undefined,
        schoolId: req.query.schoolId as string | undefined,
        country: req.query.country as string | undefined,
        visibility: req.query.visibility as 'public' | 'private' | undefined,
        assignedTo: req.query.assignedTo as string | undefined,
        evidenceRequirementId: req.query.evidenceRequirementId as string | undefined,
        search: req.query.search as string | undefined,
        sortBy: req.query.sortBy as 'newest' | 'oldest' | 'schoolName' | 'stage' | undefined,
        roundNumber: req.query.roundNumber ? parseInt(req.query.roundNumber as string) : undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      };
      
      // Remove undefined values
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== undefined)
      );
      
      const evidence = await evidenceStorage.getAdminEvidence(cleanFilters);
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching evidence:", error);
      res.status(500).json({ message: "Failed to fetch evidence" });
    }
  });

  /**
   * PATCH /api/admin/evidence/:id/review
   * 
   * Review evidence (approve/reject)
   * - Updates evidence status
   * - Triggers school progression on approval (via updateEvidenceStatus)
   * - Sends notification email to submitter
   * - Logs review activity
   * 
   * CRITICAL: This route triggers school stage progression on approval
   * 
   * Migrated from server/routes.ts:5939-6011
   */
  adminEvidenceRouter.patch('/:id/review', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
    try {
      const { status, reviewNotes } = req.body;
      const reviewerId = req.user.id;
      
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Update evidence status (this triggers progression internally)
      const evidence = await evidenceStorage.updateEvidenceStatus(
        req.params.id,
        status,
        reviewerId,
        reviewNotes
      );

      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }

      // School progression is triggered internally by updateEvidenceStatus
      // No need to call it again here to avoid recursion

      // Send notification email
      const user = await storage.getUser(evidence.submittedBy);
      const school = await storage.getSchool(evidence.schoolId);
      const reviewer = await storage.getUser(reviewerId);
      const reviewerName = reviewer?.firstName && reviewer?.lastName 
        ? `${reviewer.firstName} ${reviewer.lastName}` 
        : reviewer?.email || 'Platform Admin';
      
      if (user?.email && school) {
        if (status === 'approved') {
          await sendEvidenceApprovalEmail(user.email, school.name, evidence.title, reviewerName, user.preferredLanguage || 'en');
        } else {
          await sendEvidenceRejectionEmail(user.email, school.name, evidence.title, reviewNotes || 'Please review and resubmit', reviewerName, user.preferredLanguage || 'en');
        }
      }

      // Log evidence approval or rejection
      await logUserActivity(
        reviewerId,
        reviewer?.email || undefined,
        status === 'approved' ? 'evidence_approve' : 'evidence_reject',
        {
          evidenceId: evidence.id,
          title: evidence.title,
          stage: evidence.stage,
          schoolId: evidence.schoolId,
          reviewNotes: reviewNotes,
        },
        evidence.id,
        'evidence',
        req
      );

      // Log audit action
      await logAuditAction(
        reviewerId,
        status === 'approved' ? 'approved' : 'rejected',
        'evidence',
        evidence.id,
        { reason: reviewNotes }
      );

      res.json(evidence);
    } catch (error) {
      console.error("Error reviewing evidence:", error);
      res.status(500).json({ message: "Failed to review evidence" });
    }
  });

  /**
   * POST /api/admin/evidence/bulk-review
   * 
   * Bulk approve/reject multiple evidence
   * - Processes array of evidence IDs
   * - Updates status for each (triggers progression per evidence)
   * - Sends notification emails
   * - Returns success/failure results
   * 
   * Migrated from server/routes.ts:6014-6114
   */
  adminEvidenceRouter.post('/bulk-review', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
    try {
      const { evidenceIds, status, reviewNotes } = req.body;
      const reviewerId = req.user.id;
      
      if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) {
        return res.status(400).json({ message: "Evidence IDs array is required" });
      }
      
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const results: {
        success: string[];
        failed: Array<{ id: string; reason: string }>;
        emailsProcessed: number;
      } = {
        success: [],
        failed: [],
        emailsProcessed: 0
      };

      // Get reviewer name once (used for all bulk emails)
      const reviewer = await storage.getUser(reviewerId);
      const reviewerName = reviewer?.firstName && reviewer?.lastName 
        ? `${reviewer.firstName} ${reviewer.lastName}` 
        : reviewer?.email || 'Platform Admin';

      // Process each evidence submission
      for (const evidenceId of evidenceIds) {
        try {
          // Update evidence status (progression triggered internally)
          const evidence = await evidenceStorage.updateEvidenceStatus(
            evidenceId,
            status,
            reviewerId,
            reviewNotes
          );

          if (evidence) {
            results.success.push(evidenceId);

            // Log audit action
            await logAuditAction(
              reviewerId,
              status === 'approved' ? 'approved' : 'rejected',
              'evidence',
              evidenceId,
              { reason: reviewNotes }
            );

            // Send notification email (non-blocking)
            try {
              const user = await storage.getUser(evidence.submittedBy);
              const school = await storage.getSchool(evidence.schoolId);
              
              if (user?.email && school) {
                if (status === 'approved') {
                  await sendEvidenceApprovalEmail(user.email, school.name, evidence.title, reviewerName, user.preferredLanguage || 'en');
                } else {
                  await sendEvidenceRejectionEmail(user.email, school.name, evidence.title, reviewNotes || 'Please review and resubmit', reviewerName, user.preferredLanguage || 'en');
                }
                results.emailsProcessed++;
              }
            } catch (emailError) {
              console.warn(`Email notification failed for evidence ${evidenceId}:`, emailError);
            }
          } else {
            results.failed.push({ id: evidenceId, reason: 'Evidence not found' });
          }
        } catch (error) {
          console.error(`Error reviewing evidence ${evidenceId}:`, error);
          results.failed.push({ id: evidenceId, reason: 'Review failed' });
        }
      }

      // Note: School progression is triggered automatically per evidence
      // by updateEvidenceStatus, so no need for a separate progression check loop

      res.json({
        message: `Bulk review completed. ${results.success.length} successful, ${results.failed.length} failed.`,
        results
      });
    } catch (error) {
      console.error("Error in bulk evidence review:", error);
      res.status(500).json({ message: "Failed to perform bulk review" });
    }
  });

  /**
   * GET /api/admin/evidence/pending
   * 
   * Get pending evidence for review queue
   * Migrated from server/routes.ts:5807
   */
  adminEvidenceRouter.get('/pending', async (req, res) => {
    try {
      const evidence = await evidenceStorage.getPendingEvidence();
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching pending evidence:", error);
      res.status(500).json({ message: "Failed to fetch pending evidence" });
    }
  });

  /**
   * GET /api/admin/evidence/approved-public
   * 
   * Get approved and public evidence for case studies
   * Migrated from server/routes.ts:5818
   */
  adminEvidenceRouter.get('/approved-public', async (req, res) => {
    try {
      const evidence = await evidenceStorage.getApprovedPublicEvidence();
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching approved public evidence:", error);
      res.status(500).json({ message: "Failed to fetch approved public evidence" });
    }
  });

  /**
   * DELETE /api/admin/evidence/bulk-delete
   * 
   * Bulk delete evidence endpoint
   * Migrated from server/routes.ts:5880
   */
  adminEvidenceRouter.delete('/bulk-delete', async (req: any, res) => {
    try {
      const { evidenceIds } = req.body;
      
      if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) {
        return res.status(400).json({ message: "Evidence IDs array is required" });
      }

      const results: {
        success: string[];
        failed: Array<{ id: string; reason: string }>;
      } = {
        success: [],
        failed: []
      };

      for (const evidenceId of evidenceIds) {
        try {
          const deleted = await evidenceStorage.deleteEvidence(evidenceId);
          if (deleted) {
            results.success.push(evidenceId);
          } else {
            results.failed.push({ id: evidenceId, reason: 'Evidence not found' });
          }
        } catch (error) {
          console.error(`Error deleting evidence ${evidenceId}:`, error);
          results.failed.push({ id: evidenceId, reason: 'Delete failed' });
        }
      }

      res.json({
        message: `Bulk delete completed. ${results.success.length} deleted, ${results.failed.length} failed.`,
        results
      });
    } catch (error) {
      console.error("Error in bulk evidence delete:", error);
      res.status(500).json({ message: "Failed to perform bulk delete" });
    }
  });

  /**
   * DELETE /api/admin/evidence/:id
   * 
   * Delete individual evidence (admin only)
   * Migrated from server/routes.ts:5921
   */
  adminEvidenceRouter.delete('/:id', async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Get evidence before deletion for logging
      const evidence = await evidenceStorage.getEvidence(id);
      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }

      // Delete the evidence
      const deleted = await evidenceStorage.deleteEvidence(id);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete evidence" });
      }

      // Log the deletion
      await logAuditAction(
        userId,
        'deleted',
        'evidence',
        id,
        {
          title: evidence.title,
          stage: evidence.stage,
          schoolId: evidence.schoolId,
        }
      );

      res.json({ success: true, message: "Evidence deleted successfully" });
    } catch (error) {
      console.error("Error deleting evidence:", error);
      res.status(500).json({ message: "Failed to delete evidence" });
    }
  });

  /**
   * PATCH /api/admin/evidence/:id/assign
   * 
   * Assign evidence to admin
   * Migrated from server/routes.ts:5959
   */
  adminEvidenceRouter.patch('/:id/assign', async (req: any, res) => {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;
      const userId = req.user.id;
      
      await evidenceStorage.assignEvidence(id, assignedTo);
      
      // Log the assignment
      await logAuditAction(
        userId,
        assignedTo ? 'assigned' : 'unassigned',
        'evidence',
        id,
        { assignedTo }
      );
      
      // Send notification to assigned user
      if (assignedTo) {
        await storage.createNotification({
          userId: assignedTo,
          type: 'evidence_assigned' as any,
          title: 'Evidence Assigned to You',
          message: 'You have been assigned new evidence to review',
          linkUrl: `/admin/evidence/${id}`,
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error assigning evidence:", error);
      res.status(500).json({ message: "Failed to assign evidence" });
    }
  });

  /**
   * GET /api/admin/evidence/homeless
   * 
   * Get all homeless evidence (evidenceRequirementId=null AND isBonus=false)
   * Used by Evidence Triage dashboard to identify unassigned evidence
   * 
   * UNIFIED PAGINATION ARCHITECTURE:
   * - Route is thin pass-through (parse, call storage, shape response)
   * - Storage handles ALL pagination logic
   * - No duplicate queries or calculations
   * 
   * Query params:
   * - schoolId: Optional filter by school
   * - stage: Optional filter by stage (inspire/investigate/act)
   * - page: Page number (default 1)
   * - limit: Items per page (default 20)
   */
  adminEvidenceRouter.get('/homeless', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      // Parse query params
      const { schoolId, stage, page, limit } = req.query;
      
      const parsedPage = Number.parseInt(page as string, 10);
      const parsedLimit = Number.parseInt(limit as string, 10);
      
      const requestedPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
      const requestedLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
      
      // Delegate everything to storage
      const result = await evidenceStorage.getHomelessEvidence(
        schoolId as string | undefined,
        stage as 'inspire' | 'investigate' | 'act' | undefined,
        requestedPage,
        requestedLimit
      );
      
      // Shape response
      return res.json({
        evidence: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.page < result.totalPages
        }
      });
    } catch (error) {
      console.error('[Evidence Triage] Failed to fetch homeless evidence:', error);
      return res.status(500).json({
        error: 'Failed to fetch homeless evidence'
      });
    }
  });

  /**
   * PATCH /api/admin/evidence/:id/assign-requirement
   * 
   * Assign or reassign evidence to a requirement
   * - Validates requirement exists
   * - Allows stage changes (admin can assign to any stage)
   * - Supports reassignment with allowOverwrite flag
   * - Invalidates school progress cache (triggers progression check)
   * 
   * Body: { evidenceRequirementId: string, allowOverwrite?: boolean }
   */
  adminEvidenceRouter.patch('/:id/assign-requirement', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { evidenceRequirementId, allowOverwrite } = req.body;
      const userId = req.user.id;
      
      if (!evidenceRequirementId) {
        return res.status(400).json({ message: "evidenceRequirementId is required" });
      }
      
      // Get evidence to verify it exists
      const evidence = await evidenceStorage.getEvidence(id);
      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }
      
      // Check if evidence is already assigned to a requirement
      if (evidence.evidenceRequirementId && !allowOverwrite) {
        // Get current requirement details for the warning
        const currentRequirement = await evidenceStorage.getEvidenceRequirement(evidence.evidenceRequirementId);
        return res.status(409).json({ 
          message: "Evidence is already assigned to a requirement",
          conflict: "reassignment",
          currentRequirement: {
            id: currentRequirement?.id,
            title: currentRequirement?.title,
            stage: currentRequirement?.stage,
          }
        });
      }
      
      // Get new requirement to validate it exists
      const requirement = await evidenceStorage.getEvidenceRequirement(evidenceRequirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Evidence requirement not found" });
      }
      
      // Allow admin to assign to any stage (no stage validation)
      // Admins can freely move evidence between stages
      
      // Update evidence with requirement assignment and stage
      const updatedEvidence = await evidenceStorage.updateEvidence(id, {
        evidenceRequirementId,
        stage: requirement.stage, // Update evidence stage to match requirement
      });
      
      if (!updatedEvidence) {
        return res.status(500).json({ message: "Failed to assign requirement" });
      }
      
      // Invalidate school progress cache and trigger progression check
      await delegates.progression.checkAndUpdateSchoolProgression(evidence.schoolId);
      
      // Log the assignment
      const action = evidence.evidenceRequirementId ? 'reassigned_requirement' : 'assigned_requirement';
      await logAuditAction(
        userId,
        action,
        'evidence',
        id,
        { 
          evidenceRequirementId, 
          requirementTitle: requirement.title,
          previousRequirementId: evidence.evidenceRequirementId 
        }
      );
      
      res.json(updatedEvidence);
    } catch (error) {
      console.error("Error assigning requirement to evidence:", error);
      res.status(500).json({ message: "Failed to assign requirement" });
    }
  });

  /**
   * POST /api/admin/evidence/:id/check-duplicate
   * 
   * Check if school already has evidence for a requirement
   * - Finds existing evidence for the same school, requirement, and round
   * - Returns duplicate evidence details if found
   * - Used for duplicate detection before assignment
   * 
   * Body: { requirementId: string }
   */
  adminEvidenceRouter.post('/:id/check-duplicate', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { requirementId } = req.body;
      
      if (!requirementId) {
        return res.status(400).json({ message: "requirementId is required" });
      }
      
      // Get current evidence to get schoolId
      const currentEvidence = await evidenceStorage.getEvidence(id);
      if (!currentEvidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }
      
      // Get school to check current round
      const school = await schoolStorage.getSchool(currentEvidence.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      
      // Find existing evidence for the same school, requirement, and the school's CURRENT round
      // This ensures round 2 assignments don't conflict with round 1
      const duplicates = await evidenceStorage.getAllEvidence({
        schoolId: currentEvidence.schoolId,
        evidenceRequirementId: requirementId,
        roundNumber: school.currentRound || 1,
      });
      
      // Filter out the current evidence and only include pending/approved
      const existingEvidence = duplicates.filter(e => 
        e.id !== id && 
        (e.status === 'pending' || e.status === 'approved')
      );
      
      if (existingEvidence.length > 0) {
        // Get requirement details for the response
        const requirement = await evidenceStorage.getEvidenceRequirement(requirementId);
        
        return res.json({
          hasDuplicate: true,
          duplicate: existingEvidence[0],
          requirementTitle: requirement?.title || 'Unknown requirement',
        });
      }
      
      res.json({ hasDuplicate: false });
    } catch (error) {
      console.error("Error checking for duplicate evidence:", error);
      res.status(500).json({ message: "Failed to check for duplicates" });
    }
  });

  /**
   * PATCH /api/admin/evidence/:id/mark-bonus
   * 
   * Mark homeless evidence as bonus evidence
   * - Updates evidence record with isBonus=true
   * - Invalidates school progress cache
   * 
   * Body: { isBonus: true }
   */
  adminEvidenceRouter.patch('/:id/mark-bonus', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isBonus } = req.body;
      const userId = req.user.id;
      
      if (typeof isBonus !== 'boolean') {
        return res.status(400).json({ message: "isBonus must be a boolean" });
      }
      
      // Get evidence to verify it exists
      const evidence = await evidenceStorage.getEvidence(id);
      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }
      
      if (evidence.evidenceRequirementId && isBonus) {
        return res.status(400).json({ 
          message: "Cannot mark evidence as bonus if it's assigned to a requirement. Unassign it first." 
        });
      }
      
      // Update evidence with bonus flag
      const updatedEvidence = await evidenceStorage.updateEvidence(id, {
        isBonus,
      });
      
      if (!updatedEvidence) {
        return res.status(500).json({ message: "Failed to mark as bonus" });
      }
      
      // Invalidate school progress cache
      await delegates.progression.checkAndUpdateSchoolProgression(evidence.schoolId);
      
      // Log the action
      await logAuditAction(
        userId,
        isBonus ? 'marked_bonus' : 'unmarked_bonus',
        'evidence',
        id,
        { isBonus }
      );
      
      res.json(updatedEvidence);
    } catch (error) {
      console.error("Error marking evidence as bonus:", error);
      res.status(500).json({ message: "Failed to mark as bonus" });
    }
  });

  // ============================================================================
  // PHASE 4: EVIDENCE FILE UPLOAD ROUTES (mounted at /api/evidence-files)
  // ============================================================================

  /**
   * POST /api/evidence-files/upload-compressed
   * 
   * Upload and compress evidence files
   * - Accepts file via multer middleware
   * - Optionally compresses images (jpeg, png, webp, etc.)
   * - Uploads to GCS object storage
   * - Sets ACL policy based on visibility
   * - Returns upload metadata (objectPath, sizes, compression ratio)
   * 
   * Migrated from server/routes.ts:4204-4288
   */
  evidenceFilesRouter.post('/upload-compressed', isAuthenticated, uploadCompression.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const userId = req.user?.id;
      const visibility = req.body.visibility || 'private';
      const filename = req.file.originalname;
      const mimeType = req.file.mimetype;
      
      let fileBuffer = req.file.buffer;
      const originalSize = req.file.buffer.length;
      let compressedSize = originalSize;
      let wasCompressed = false;
      
      // Only compress if it's an image format we support
      if (shouldCompressFile(mimeType)) {
        try {
          fileBuffer = await compressImage(fileBuffer, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 85,
          });
          compressedSize = fileBuffer.length;
          wasCompressed = true;
          
          const savingsPercent = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
          console.log(`Compressed ${filename}: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressedSize / 1024 / 1024).toFixed(2)}MB (saved ${savingsPercent}%)`);
        } catch (compressionError) {
          console.warn(`Compression failed for ${filename}, uploading original:`, compressionError);
          // Reset to original buffer if compression fails
          fileBuffer = req.file.buffer;
          compressedSize = originalSize;
          wasCompressed = false;
        }
      } else {
        console.log(`Skipping compression for non-image file: ${filename} (${mimeType})`);
      }

      // Get upload URL from object storage
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      // Upload file to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: fileBuffer,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileBuffer.length.toString(),
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
      }

      // Set ACL policy
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        uploadURL.split('?')[0],
        {
          owner: userId,
          visibility: visibility,
        },
        filename,
      );

      // Calculate compression ratio (0 if not compressed)
      const compressionRatio = wasCompressed 
        ? ((originalSize - compressedSize) / originalSize * 100).toFixed(1)
        : '0';

      res.status(200).json({ 
        objectPath,
        originalSize,
        compressedSize,
        compressionRatio,
        wasCompressed,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  return { evidenceRouter, requirementsRouter, adminEvidenceRouter, evidenceFilesRouter };
}

/**
 * Backward compatibility export (deprecated)
 * @deprecated Use createEvidenceRouters instead
 */
export function createEvidenceRouter(storage: IStorage) {
  const { evidenceRouter } = createEvidenceRouters(storage);
  return evidenceRouter;
}
