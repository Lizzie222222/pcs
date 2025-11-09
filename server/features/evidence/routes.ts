import { Router } from 'express';
import { isAuthenticated } from '../../auth';
import { markUserInteracted } from '../../auth';
import { logUserActivity } from '../../auditLog';
import { getEvidenceStorage } from './storage';
import { createEvidenceDelegates } from './delegates';
import { createSchoolProgressionDelegate } from '../schools/progression';
import { schoolStorage } from '../schools/storage';
import type { IStorage } from '../../storage';
import { insertEvidenceSchema, insertEvidenceRequirementSchema } from '@shared/schema';
import { sendEvidenceSubmissionEmail } from '../../emailService';
import { mailchimpService } from '../../mailchimpService';
import { translateEvidenceRequirement } from '../../translationService';
import { z } from 'zod';

/**
 * Create Evidence Routers (Dual Router Structure)
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
 * @param storage - Main IStorage instance
 * @returns Object containing evidenceRouter and requirementsRouter
 */
export function createEvidenceRouters(storage: IStorage): {
  evidenceRouter: Router;
  requirementsRouter: Router;
} {
  const evidenceRouter = Router();
  const requirementsRouter = Router();
  
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
      const school = await delegates.persistence.getSchool(req.body.schoolId);
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
        const schoolUser = await delegates.persistence.getSchoolUser(evidenceData.schoolId, userId);
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
          const school = await delegates.persistence.getSchool(evidenceData.schoolId);
          
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
      const { schoolId, status, visibility, requirePhotoConsent } = req.query;
      
      // If schoolId is provided, verify user has access to it
      let targetSchoolId = schoolId as string | undefined;
      
      if (targetSchoolId) {
        // Admins can access any school's evidence
        if (!user?.isAdmin) {
          // Non-admins must be a member of the school
          const schoolUser = await delegates.persistence.getSchoolUser(targetSchoolId, userId);
          if (!schoolUser) {
            return res.status(403).json({ 
              message: "You don't have permission to view evidence for this school" 
            });
          }
        }
      } else {
        // No schoolId provided, get user's first school
        const schools = await delegates.persistence.getUserSchools(userId);
        if (schools.length === 0) {
          return res.json([]);
        }
        targetSchoolId = schools[0].id;
      }

      // Build filters
      const filters: any = { schoolId: targetSchoolId };
      if (status) filters.status = status as 'pending' | 'approved' | 'rejected';
      if (visibility) filters.visibility = visibility as 'public' | 'private';

      // Get evidence with school data (includes photo consent status)
      let evidence = await evidenceStorage.getAllEvidence(filters);
      
      // Filter by photo consent status if required
      if (requirePhotoConsent === 'true') {
        evidence = evidence.filter(ev => ev.school?.photoConsentStatus === 'approved');
      }
      
      // Transform to match the expected format with file URLs extracted
      const transformedEvidence = evidence.map(ev => ({
        id: ev.id,
        title: ev.title,
        stage: ev.stage,
        status: ev.status,
        visibility: ev.visibility,
        schoolId: ev.schoolId,
        schoolName: ev.school?.name || '',
        evidenceRequirementId: ev.evidenceRequirementId,
        roundNumber: ev.roundNumber,
        fileUrls: Array.isArray(ev.files) 
          ? (ev.files as any[]).filter((f: any) => f.type?.startsWith('image/')).map((f: any) => f.url) 
          : [],
        createdAt: ev.submittedAt,
        photoConsentStatus: ev.school?.photoConsentStatus || null,
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
      const userSchools = await delegates.persistence.getUserSchools(userId);
      const hasPermission = userSchools.some(school => school.id === evidence.schoolId);
      
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
      const requirements = await evidenceStorage.getEvidenceRequirements(stage as string);
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

  return { evidenceRouter, requirementsRouter };
}

/**
 * Backward compatibility export (deprecated)
 * @deprecated Use createEvidenceRouters instead
 */
export function createEvidenceRouter(storage: IStorage) {
  const { evidenceRouter } = createEvidenceRouters(storage);
  return evidenceRouter;
}
