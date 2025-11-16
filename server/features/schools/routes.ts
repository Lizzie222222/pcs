import { Router } from 'express';
import { schoolStorage } from './storage';
import { isAuthenticated, isSchoolMember } from '../../auth';
import { requireAdmin, requireAdminOrPartner, requireFullAdmin } from '../../routes/utils/middleware';
import { photoConsentUpload } from '../../routes/utils/uploads';
import { uploadToObjectStorage } from '../../routes/utils/objectStorage';
import { 
  sendWelcomeEmail, 
  sendTeacherInvitationEmail, 
  sendVerificationRequestEmail,
  sendVerificationApprovalEmail,
  sendVerificationRejectionEmail,
  sendEmail,
  getFromAddress,
  getBaseUrl
} from '../../emailService';
import { 
  insertSchoolSchema,
  insertTeacherInvitationSchema,
  insertVerificationRequestSchema,
  schools,
  schoolUsers,
  certificates,
  evidence
} from '@shared/schema';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '../../db';
import { eq, and, or, sql, count, ilike, inArray, gte } from 'drizzle-orm';
import { getAllCountryCodes } from './utils/countryMapping';
import { storage } from '../../storage';

// Validation schemas - exported for use in routes.ts
export const toggleEvidenceOverrideSchema = z.object({
  evidenceRequirementId: z.string().uuid(),
  stage: z.enum(['inspire', 'investigate', 'act'])
});

export const updateSchoolProgressionSchema = z.object({
  currentRound: z.number().int().min(1).max(10).optional(),
  currentStage: z.enum(['inspire', 'investigate', 'act']).optional(),
  inspireCompleted: z.boolean().optional(),
  investigateCompleted: z.boolean().optional(),
  actCompleted: z.boolean().optional(),
  progressPercentage: z.number().min(0).max(300).optional()
});

export const adminSchoolsQuerySchema = z.object({
  country: z.string().optional().transform(val => val === 'all' ? undefined : val),
  stage: z.enum(['inspire', 'investigate', 'act', 'all']).optional().transform(val => val === 'all' ? undefined : val),
  type: z.enum(['primary', 'secondary', 'high_school', 'international', 'other', 'all']).optional().transform(val => val === 'all' ? undefined : val),
  search: z.string().optional(),
  language: z.string().optional().transform(val => val === 'all' ? undefined : val),
  sortByDate: z.enum(['newest', 'oldest']).optional(),
  joinedMonth: z.string().optional(),
  joinedYear: z.string().optional(),
  interactionStatus: z.enum(['all', 'interacted', 'not-interacted']).optional().transform(val => val === 'all' ? undefined : val),
  completionStatus: z.enum(['all', 'plastic-clever', 'in-progress']).optional().transform(val => val === 'all' ? undefined : val),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
  sortBy: z.enum(['name', 'country', 'progress', 'joinDate']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const schoolsRouter = Router();

// ============= PUBLIC SCHOOL ROUTES =============

// GET /api/schools/map - Get all schools for map visualization with coordinates
schoolsRouter.get('/api/schools/map', async (req, res) => {
  try {
    const allSchools = await schoolStorage.getSchools({});
    
    // Filter schools that have coordinates
    const schoolsWithCoords = allSchools.filter(school => 
      school.latitude !== null && 
      school.longitude !== null
    );

    const mapData = schoolsWithCoords.map(school => ({
      id: school.id,
      name: school.name,
      latitude: school.latitude,
      longitude: school.longitude,
      country: school.country,
      currentStage: school.currentStage,
      awardCompleted: school.awardCompleted,
      type: school.type,
      address: school.address,
    }));

    res.json(mapData);
  } catch (error) {
    console.error("Error fetching schools for map:", error);
    res.status(500).json({ message: "Failed to fetch schools" });
  }
});

// GET /api/schools/map/summary - Get summary statistics for map
schoolsRouter.get('/api/schools/map/summary', async (req, res) => {
  try {
    const allSchools = await schoolStorage.getSchools({});
    
    // Calculate summary statistics
    const totalSchools = allSchools.length;
    const completedAwards = allSchools.filter(s => s.awardCompleted).length;
    
    // Count unique countries
    const countries = new Set(allSchools.map(s => s.country).filter(Boolean));
    const countriesReached = countries.size;
    
    // Calculate total students impacted
    const studentsImpacted = allSchools.reduce((sum, school) => {
      return sum + (school.studentCount || 0);
    }, 0);

    res.json({
      totalSchools,
      completedAwards,
      countriesReached,
      studentsImpacted,
    });
  } catch (error) {
    console.error("Error fetching map summary:", error);
    res.status(500).json({ message: "Failed to fetch summary" });
  }
});

// GET /api/schools - Public endpoint to get list of schools with filtering
schoolsRouter.get('/api/schools', async (req, res) => {
  try {
    const { country, stage, type, search, limit, offset } = req.query;
    
    const schools = await schoolStorage.getSchools({
      country: country as string,
      stage: stage as string,
      type: type as string,
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(schools);
  } catch (error) {
    console.error("Error fetching schools:", error);
    res.status(500).json({ message: "Failed to fetch schools" });
  }
});

// GET /api/schools-with-image-counts - Get all schools with their approved evidence image counts
schoolsRouter.get('/api/schools-with-image-counts', async (req, res) => {
  try {
    const schoolsWithCounts = await schoolStorage.getSchoolsWithImageCounts();
    res.json(schoolsWithCounts);
  } catch (error) {
    console.error("Error fetching schools with image counts:", error);
    res.status(500).json({ message: "Failed to fetch schools" });
  }
});

// GET /api/schools/check-domain - Check if an email domain is already registered
schoolsRouter.get('/api/schools/check-domain', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: "Email is required" });
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingSchool = await schoolStorage.getSchoolByDomain(domain);
    
    res.json({
      exists: !!existingSchool,
      school: existingSchool ? {
        id: existingSchool.id,
        name: existingSchool.name,
      } : null
    });
  } catch (error) {
    console.error("Error checking domain:", error);
    res.status(500).json({ message: "Failed to check domain" });
  }
});

// POST /api/schools/register - Register a new school (single-step)
schoolsRouter.post('/api/schools/register', async (req, res) => {
  try {
    console.log('[School Registration] Starting registration:', {
      hasBody: !!req.body,
      fields: Object.keys(req.body || {}),
    });

    const validationResult = insertSchoolSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('[School Registration] Validation failed:', validationResult.error.flatten());
      return res.status(400).json({ 
        message: "Invalid school data", 
        errors: validationResult.error.flatten() 
      });
    }

    const schoolData = validationResult.data;
    console.log('[School Registration] Validated data:', {
      name: schoolData.name,
      country: schoolData.country,
      type: schoolData.type,
    });

    // Check if domain is already registered
    if (schoolData.adminEmail) {
      const domain = schoolData.adminEmail.split('@')[1]?.toLowerCase();
      if (domain) {
        const existingSchool = await schoolStorage.getSchoolByDomain(domain);
        if (existingSchool) {
          console.warn('[School Registration] Domain already registered:', domain);
          return res.status(400).json({ 
            message: "A school with this email domain is already registered",
            schoolId: existingSchool.id,
            schoolName: existingSchool.name
          });
        }
      }
    }

    const school = await schoolStorage.createSchool(schoolData);
    console.log('[School Registration] School created:', school.id);

    // Send welcome email (non-blocking)
    if (schoolData.adminEmail) {
      try {
        await sendWelcomeEmail(schoolData.adminEmail, school.name);
        console.log('[School Registration] Welcome email sent to:', schoolData.adminEmail);
      } catch (emailError) {
        console.error('[School Registration] Failed to send welcome email:', emailError);
      }
    }

    res.json(school);
  } catch (error) {
    console.error("[School Registration] Error:", error);
    res.status(500).json({ message: "Failed to register school" });
  }
});

// ============= AUTHENTICATED SCHOOL ROUTES =============

// GET /api/schools/:schoolId - Get a specific school by ID
schoolsRouter.get('/api/schools/:schoolId', isAuthenticated, async (req: any, res) => {
  try {
    const { schoolId } = req.params;
    const userId = req.user.id;

    // Check if user has access to this school (admin or school member)
    if (!req.user.isAdmin) {
      const schoolUser = await schoolStorage.getSchoolUser(schoolId, userId);
      if (!schoolUser) {
        return res.status(403).json({ message: "You do not have access to this school" });
      }
    }

    const school = await schoolStorage.getSchool(schoolId);
    
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    res.json(school);
  } catch (error) {
    console.error("Error fetching school:", error);
    res.status(500).json({ message: "Failed to fetch school" });
  }
});

// POST /api/schools/register-multi-step - Multi-step school registration
schoolsRouter.post('/api/schools/register-multi-step', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    console.log('[Multi-step Registration] User:', userId);

    const validationResult = insertSchoolSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('[Multi-step Registration] Validation failed:', validationResult.error.flatten());
      return res.status(400).json({ 
        message: "Invalid school data", 
        errors: validationResult.error.flatten() 
      });
    }

    const schoolData = validationResult.data;

    // Check if domain is already registered
    if (schoolData.adminEmail) {
      const domain = schoolData.adminEmail.split('@')[1]?.toLowerCase();
      if (domain) {
        const existingSchool = await schoolStorage.getSchoolByDomain(domain);
        if (existingSchool) {
          console.warn('[Multi-step Registration] Domain already registered:', domain);
          return res.status(400).json({ 
            message: "A school with this email domain is already registered",
            schoolId: existingSchool.id,
            schoolName: existingSchool.name
          });
        }
      }
    }

    const school = await schoolStorage.createSchool(schoolData);
    console.log('[Multi-step Registration] School created:', school.id);

    // Add the current user as head teacher
    await schoolStorage.addUserToSchool({
      schoolId: school.id,
      userId: userId,
      role: 'head_teacher',
      isVerified: true,
    });
    console.log('[Multi-step Registration] User added as head teacher');

    // Send welcome email (non-blocking)
    if (req.user.email) {
      try {
        await sendWelcomeEmail(req.user.email, school.name);
        console.log('[Multi-step Registration] Welcome email sent');
      } catch (emailError) {
        console.error('[Multi-step Registration] Failed to send welcome email:', emailError);
      }
    }

    res.json(school);
  } catch (error) {
    console.error("[Multi-step Registration] Error:", error);
    res.status(500).json({ message: "Failed to register school" });
  }
});

// POST /api/schools/:schoolId/invite-teacher - Invite a teacher to join the school
schoolsRouter.post('/api/schools/:schoolId/invite-teacher', isAuthenticated, isSchoolMember, async (req: any, res) => {
  try {
    const { schoolId } = req.params;
    const inviterId = req.user.id;

    const validationResult = insertTeacherInvitationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid invitation data", 
        errors: validationResult.error.flatten() 
      });
    }

    const invitationData = {
      ...validationResult.data,
      schoolId,
      invitedBy: inviterId,
    };

    // Check if invitation already exists
    const existing = await schoolStorage.getInvitationByEmail(schoolId, invitationData.email);
    if (existing && existing.status === 'pending') {
      return res.status(400).json({ message: "An invitation has already been sent to this email" });
    }

    const invitation = await schoolStorage.createInvitation(invitationData);

    // Get school details for email
    const school = await schoolStorage.getSchool(schoolId);
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    // Send invitation email (non-blocking)
    try {
      const inviterUser = await storage.getUser(inviterId);
      const inviterName = inviterUser ? `${inviterUser.firstName} ${inviterUser.lastName}`.trim() : 'Your colleague';
      await sendTeacherInvitationEmail(
        invitation.email,
        school.name,
        inviterName,
        invitation.token,
        7
      );
      console.log('[Teacher Invitation] Email sent to:', invitationData.email);
    } catch (emailError) {
      console.error('[Teacher Invitation] Failed to send email:', emailError);
    }

    res.json(invitation);
  } catch (error) {
    console.error("[Teacher Invitation] Error:", error);
    res.status(500).json({ message: "Failed to send invitation" });
  }
});

// GET /api/schools/:schoolId/invitations - Get all invitations for a school
schoolsRouter.get('/api/schools/:schoolId/invitations', isAuthenticated, isSchoolMember, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const invitations = await schoolStorage.getSchoolInvitations(schoolId);
    res.json(invitations);
  } catch (error) {
    console.error("Error fetching invitations:", error);
    res.status(500).json({ message: "Failed to fetch invitations" });
  }
});

// POST /api/schools/:schoolId/request-access - Request access to a school
schoolsRouter.post('/api/schools/:schoolId/request-access', isAuthenticated, async (req: any, res) => {
  try {
    const { schoolId } = req.params;
    const userId = req.user.id;

    // Check if user is already a member
    const existing = await schoolStorage.getSchoolUser(schoolId, userId);
    if (existing) {
      return res.status(400).json({ message: "You are already a member of this school" });
    }

    // Check if there's already a pending request
    const pendingRequest = await schoolStorage.getPendingVerificationRequest(schoolId, userId);
    if (pendingRequest) {
      return res.status(400).json({ message: "You already have a pending access request" });
    }

    const validationResult = insertVerificationRequestSchema.safeParse({
      ...req.body,
      schoolId,
      userId,
    });

    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid request data", 
        errors: validationResult.error.flatten() 
      });
    }

    const request = await schoolStorage.createVerificationRequest(validationResult.data);

    // Get school details for email
    const school = await schoolStorage.getSchool(schoolId);
    if (school && school.adminEmail) {
      // Send notification email to school admin (non-blocking)
      try {
        const requesterName = `${req.user.firstName} ${req.user.lastName}`.trim();
        await sendVerificationRequestEmail(
          school.adminEmail,
          school.name,
          requesterName,
          req.user.email,
          request.evidence || '',
          req.user.preferredLanguage
        );
        console.log('[Access Request] Email sent to school admin');
      } catch (emailError) {
        console.error('[Access Request] Failed to send email:', emailError);
      }
    }

    res.json(request);
  } catch (error) {
    console.error("[Access Request] Error:", error);
    res.status(500).json({ message: "Failed to create access request" });
  }
});

// GET /api/schools/:schoolId/verification-requests - Get verification requests for a school
schoolsRouter.get('/api/schools/:schoolId/verification-requests', isAuthenticated, isSchoolMember, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const requests = await schoolStorage.getSchoolVerificationRequests(schoolId);
    
    // Enrich with user data
    const enrichedRequests = await Promise.all(
      requests.map(async (request: any) => {
        const user = await storage.getUser(request.userId);
        return {
          ...request,
          userName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown',
          userEmail: user?.email || 'N/A',
        };
      })
    );

    res.json(enrichedRequests);
  } catch (error) {
    console.error("Error fetching verification requests:", error);
    res.status(500).json({ message: "Failed to fetch verification requests" });
  }
});

// GET /api/schools/me/evidence-overrides - Get evidence overrides for schools the user belongs to
schoolsRouter.get('/api/schools/me/evidence-overrides', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // Get schools where user is a member
    const userSchools = await schoolStorage.getUserSchools(userId);
    
    if (userSchools.length === 0) {
      return res.json([]);
    }

    // Get overrides for all user's schools
    const overridesPromises = userSchools.map(async (school) => {
      const currentRound = school.currentRound || 1;
      const overrides = await storage.getAdminEvidenceOverrides(school.id, currentRound);
      
      return overrides.map(override => ({
        ...override,
        schoolId: school.id,
        schoolName: school.name
      }));
    });

    const allOverrides = (await Promise.all(overridesPromises)).flat();
    res.json(allOverrides);
  } catch (error) {
    console.error("Error fetching user evidence overrides:", error);
    res.status(500).json({ message: "Failed to fetch evidence overrides" });
  }
});

// GET /api/schools/:schoolId/team - Get school team members
schoolsRouter.get('/api/schools/:schoolId/team', isAuthenticated, isSchoolMember, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const teamMembers = await schoolStorage.getSchoolUsersWithDetails(schoolId);
    
    console.log(`[Team API - schools/routes.ts] schoolId: ${schoolId}, members found: ${teamMembers.length}`);
    console.log(`[Team API - schools/routes.ts] Raw data from storage:`, JSON.stringify(teamMembers[0], null, 2));
    
    // Return the full data structure including the nested user object
    // The frontend expects: { ..., user: { firstName, lastName, email, ... } }
    const team = teamMembers.map(member => ({
      id: member.id,
      schoolId: member.schoolId,
      userId: member.userId,
      role: member.role,
      teacherRole: member.teacherRole,
      isVerified: member.isVerified,
      invitedBy: member.invitedBy,
      invitedAt: member.invitedAt,
      verifiedAt: member.verifiedAt,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      user: member.user, // Keep the full user object nested
    }));

    console.log(`[Team API - schools/routes.ts] Transformed data:`, JSON.stringify(team[0], null, 2));
    res.json(team);
  } catch (error) {
    console.error("Error fetching team members:", error);
    res.status(500).json({ message: "Failed to fetch team members" });
  }
});

// DELETE /api/schools/:schoolId/teachers/:userId - Remove a teacher from the school
schoolsRouter.delete('/api/schools/:schoolId/teachers/:userId', isAuthenticated, isSchoolMember, async (req: any, res) => {
  try {
    const { schoolId, userId } = req.params;
    const requesterId = req.user.id;

    // Prevent users from removing themselves
    if (userId === requesterId) {
      return res.status(400).json({ message: "You cannot remove yourself from the school" });
    }

    // Only head teachers and admins can remove members
    if (!req.user.isAdmin) {
      const requesterSchoolUser = await schoolStorage.getSchoolUser(schoolId, requesterId);
      if (!requesterSchoolUser || requesterSchoolUser.role !== 'head_teacher') {
        return res.status(403).json({ message: "Only head teachers can remove team members" });
      }
    }

    const removed = await schoolStorage.removeUserFromSchool(schoolId, userId);
    
    if (!removed) {
      return res.status(404).json({ message: "Teacher not found in this school" });
    }

    res.json({ message: "Teacher removed successfully" });
  } catch (error) {
    console.error("Error removing teacher:", error);
    res.status(500).json({ message: "Failed to remove teacher" });
  }
});

// PUT /api/schools/:schoolId/teachers/:userId/role - Update a teacher's role
schoolsRouter.put('/api/schools/:schoolId/teachers/:userId/role', isAuthenticated, isSchoolMember, async (req: any, res) => {
  try {
    const { schoolId, userId } = req.params;
    const { role } = req.body;
    const requesterId = req.user.id;

    if (!['teacher', 'head_teacher'].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Only head teachers and admins can update roles
    if (!req.user.isAdmin) {
      const requesterSchoolUser = await schoolStorage.getSchoolUser(schoolId, requesterId);
      if (!requesterSchoolUser || requesterSchoolUser.role !== 'head_teacher') {
        return res.status(403).json({ message: "Only head teachers can update roles" });
      }
    }

    const updated = await schoolStorage.updateSchoolUserRole(schoolId, userId, role);
    
    if (!updated) {
      return res.status(404).json({ message: "Teacher not found in this school" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating teacher role:", error);
    res.status(500).json({ message: "Failed to update role" });
  }
});

// POST /api/schools/:schoolId/start-round - Start a new round for the school
schoolsRouter.post('/api/schools/:schoolId/start-round', isAuthenticated, isSchoolMember, async (req: any, res) => {
  try {
    const { schoolId } = req.params;

    const school = await schoolStorage.startNewRound(schoolId);
    
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    res.json(school);
  } catch (error) {
    console.error("Error starting new round:", error);
    res.status(500).json({ message: "Failed to start new round" });
  }
});

// GET /api/schools/:schoolId/certificates - Get certificates for a school
schoolsRouter.get('/api/schools/:schoolId/certificates', isAuthenticated, isSchoolMember, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const certificates = await schoolStorage.getSchoolCertificates(schoolId);
    res.json(certificates);
  } catch (error) {
    console.error("Error fetching certificates:", error);
    res.status(500).json({ message: "Failed to fetch certificates" });
  }
});

// GET /api/schools/:schoolId/analytics - Get analytics data for a school
schoolsRouter.get('/api/schools/:schoolId/analytics', isAuthenticated, isSchoolMember, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const analytics = await schoolStorage.getSchoolAnalytics(schoolId);
    res.json(analytics);
  } catch (error) {
    console.error("Error fetching school analytics:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

// GET /api/schools/:schoolId/audit-analytics - Get audit analytics for a school
schoolsRouter.get('/api/schools/:schoolId/audit-analytics', isAuthenticated, isSchoolMember, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const analytics = await schoolStorage.getSchoolAuditAnalytics(schoolId);
    res.json(analytics);
  } catch (error) {
    console.error("Error fetching audit analytics:", error);
    res.status(500).json({ message: "Failed to fetch audit analytics" });
  }
});

// POST /api/schools/:schoolId/photo-consent/upload - Upload photo consent document
schoolsRouter.post('/api/schools/:schoolId/photo-consent/upload', isAuthenticated, isSchoolMember, photoConsentUpload.single('file'), async (req: any, res) => {
  try {
    const { schoolId } = req.params;
    const file = req.file;
    const userId = req.user.id;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Upload to object storage
    const photoConsentDocumentUrl = await uploadToObjectStorage(
      file.buffer,
      file.mimetype,
      file.originalname,
      userId,
      'public' // Photo consent documents should be publicly accessible for review
    );
    
    // Auto-approve if admin is uploading
    const isAdmin = req.user.isAdmin;
    
    const school = await schoolStorage.updateSchool(schoolId, {
      photoConsentDocumentUrl,
      photoConsentStatus: isAdmin ? 'approved' : 'pending',
      photoConsentUploadedAt: new Date(),
      ...(isAdmin ? { photoConsentApprovedAt: new Date() } : {}),
    });

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    res.json({ 
      message: isAdmin ? "Photo consent uploaded and approved" : "Photo consent uploaded successfully",
      photoConsentUrl: photoConsentDocumentUrl,
      status: isAdmin ? 'approved' : 'pending'
    });
  } catch (error) {
    console.error("Error uploading photo consent:", error);
    res.status(500).json({ message: "Failed to upload photo consent" });
  }
});

// GET /api/schools/:schoolId/photo-consent - Get photo consent status
schoolsRouter.get('/api/schools/:schoolId/photo-consent', isAuthenticated, isSchoolMember, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const school = await schoolStorage.getSchool(schoolId);
    
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    // Return normalized field names to match frontend expectations
    res.json({
      status: school.photoConsentStatus,
      documentUrl: school.photoConsentDocumentUrl,
      uploadedAt: school.photoConsentUploadedAt,
      approvedAt: school.photoConsentApprovedAt,
      reviewNotes: school.photoConsentReviewNotes,
    });
  } catch (error) {
    console.error("Error fetching photo consent:", error);
    res.status(500).json({ message: "Failed to fetch photo consent" });
  }
});

// PATCH /api/schools/:schoolId/photo-consent/approve - Approve photo consent (admin only)
schoolsRouter.patch('/api/schools/:schoolId/photo-consent/approve', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    const school = await schoolStorage.updateSchool(schoolId, {
      photoConsentStatus: 'approved',
      photoConsentApprovedAt: new Date(),
    });

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    res.json({ message: "Photo consent approved", school });
  } catch (error) {
    console.error("Error approving photo consent:", error);
    res.status(500).json({ message: "Failed to approve photo consent" });
  }
});

// PATCH /api/schools/:schoolId/photo-consent/reject - Reject photo consent (admin only)
schoolsRouter.patch('/api/schools/:schoolId/photo-consent/reject', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { reason } = req.body;
    
    const updates: any = {
      photoConsentStatus: 'rejected',
    };
    
    if (reason) {
      updates.photoConsentReviewNotes = reason;
    }
    
    const school = await schoolStorage.updateSchool(schoolId, updates);

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    res.json({ message: "Photo consent rejected", school });
  } catch (error) {
    console.error("Error rejecting photo consent:", error);
    res.status(500).json({ message: "Failed to reject photo consent" });
  }
});

// ============= ADMIN SCHOOL ROUTES =============

// POST /api/admin/schools/bulk-update - Bulk update schools
schoolsRouter.post('/api/admin/schools/bulk-update', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const { schoolIds, updates } = req.body;
    
    if (!Array.isArray(schoolIds) || schoolIds.length === 0) {
      return res.status(400).json({ message: "School IDs array is required" });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ message: "Updates object is required" });
    }

    const results: {
      success: string[];
      failed: Array<{ id: string; reason: string }>;
    } = {
      success: [],
      failed: []
    };

    for (const schoolId of schoolIds) {
      try {
        const school = await storage.updateSchool(schoolId, updates);
        if (school) {
          results.success.push(schoolId);
        } else {
          results.failed.push({ id: schoolId, reason: 'School not found' });
        }
      } catch (error) {
        console.error(`Error updating school ${schoolId}:`, error);
        results.failed.push({ id: schoolId, reason: 'Update failed' });
      }
    }

    res.json({
      message: `Bulk update completed. ${results.success.length} updated, ${results.failed.length} failed.`,
      results
    });
  } catch (error) {
    console.error("Error in bulk school update:", error);
    res.status(500).json({ message: "Failed to perform bulk update" });
  }
});

// DELETE /api/admin/schools/bulk-delete - Bulk delete schools
schoolsRouter.delete('/api/admin/schools/bulk-delete', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const { schoolIds } = req.body;
    
    if (!Array.isArray(schoolIds) || schoolIds.length === 0) {
      return res.status(400).json({ message: "School IDs array is required" });
    }

    const results: {
      success: string[];
      failed: Array<{ id: string; reason: string }>;
    } = {
      success: [],
      failed: []
    };

    for (const schoolId of schoolIds) {
      try {
        const deleted = await storage.deleteSchool(schoolId);
        if (deleted) {
          results.success.push(schoolId);
        } else {
          results.failed.push({ id: schoolId, reason: 'School not found' });
        }
      } catch (error) {
        console.error(`Error deleting school ${schoolId}:`, error);
        results.failed.push({ id: schoolId, reason: 'Delete failed' });
      }
    }

    res.json({
      message: `Bulk delete completed. ${results.success.length} deleted, ${results.failed.length} failed.`,
      results
    });
  } catch (error) {
    console.error("Error in bulk school delete:", error);
    res.status(500).json({ message: "Failed to perform bulk delete" });
  }
});

// GET /api/admin/schools/award-completion-ready - Get schools ready for award completion
schoolsRouter.get('/api/admin/schools/award-completion-ready', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    // Find schools that have completed all three stages in Round 1
    const allSchools = await storage.getSchools({});
    
    const readySchools = allSchools.filter(school => 
      school.currentRound === 1 &&
      school.inspireCompleted === true &&
      school.investigateCompleted === true &&
      school.actCompleted === true
    );

    console.log(`[Award Completion] Found ${readySchools.length} schools ready for Round 1 completion`);
    
    res.json({
      count: readySchools.length,
      schools: readySchools
    });
  } catch (error) {
    console.error("Error fetching schools ready for award completion:", error);
    res.status(500).json({ message: "Failed to fetch schools" });
  }
});

// POST /api/admin/schools/bulk-award-process - Bulk award completion process
schoolsRouter.post('/api/admin/schools/bulk-award-process', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const { schoolIds } = req.body;
    
    if (!Array.isArray(schoolIds) || schoolIds.length === 0) {
      return res.status(400).json({ message: "School IDs array is required" });
    }

    // Use a transaction to ensure atomicity - either all schools are processed or none are
    const results = await db.transaction(async (tx) => {
      const success: Array<{ id: string; schoolName: string; certificateId: string }> = [];
      const failed: Array<{ id: string; schoolName: string; reason: string }> = [];

      for (const schoolId of schoolIds) {
        // Fetch school within transaction
        const [school] = await tx
          .select()
          .from(schools)
          .where(eq(schools.id, schoolId));
        
        if (!school) {
          failed.push({ id: schoolId, schoolName: 'Unknown', reason: 'School not found' });
          continue;
        }

        // Verify school has completed all three stages in Round 1
        if (school.currentRound !== 1 || 
            !school.inspireCompleted || 
            !school.investigateCompleted || 
            !school.actCompleted) {
          failed.push({ 
            id: schoolId,
            schoolName: school.name,
            reason: 'School has not completed all stages in Round 1' 
          });
          continue;
        }

        // Check if certificate already exists for this round
        const existingCertificates = await tx
          .select()
          .from(certificates)
          .where(
            and(
              eq(certificates.schoolId, schoolId),
              eq(certificates.stage, 'act'),
              sql`(${certificates.metadata}->>'round')::int = 1`
            )
          );

        let certificateId: string;
        
        if (existingCertificates.length === 0) {
          // Create certificate for Round 1 completion
          const certificateNumber = `PCSR1-${Date.now()}-${schoolId.substring(0, 8)}`;
          
          // Get evidence counts directly from database within transaction
          const inspireEvidence = await tx
            .select()
            .from(evidence)
            .where(
              and(
                eq(evidence.schoolId, schoolId),
                eq(evidence.stage, 'inspire'),
                eq(evidence.status, 'approved')
              )
            );
          
          const investigateEvidence = await tx
            .select()
            .from(evidence)
            .where(
              and(
                eq(evidence.schoolId, schoolId),
                eq(evidence.stage, 'investigate'),
                eq(evidence.status, 'approved')
              )
            );
          
          const actEvidence = await tx
            .select()
            .from(evidence)
            .where(
              and(
                eq(evidence.schoolId, schoolId),
                eq(evidence.stage, 'act'),
                eq(evidence.status, 'approved')
              )
            );
          
          const [newCertificate] = await tx.insert(certificates).values({
            schoolId,
            stage: 'act',
            issuedBy: req.user.id,
            certificateNumber,
            completedDate: new Date(),
            title: `Round 1 Completion Certificate`,
            description: `Successfully completed all three stages (Inspire, Investigate, Act) in Round 1`,
            metadata: {
              round: 1,
              achievements: {
                inspire: inspireEvidence.length,
                investigate: investigateEvidence.length,
                act: actEvidence.length
              }
            }
          }).returning();

          certificateId = newCertificate.id;
          console.log(`[Award Completion] Created certificate ${certificateId} for school ${schoolId}`);
        } else {
          certificateId = existingCertificates[0].id;
          console.log(`[Award Completion] Certificate ${certificateId} already exists for school ${schoolId}`);
        }

        // Move school to Round 2 within same transaction
        await tx
          .update(schools)
          .set({
            currentRound: 2,
            roundsCompleted: 1,
            currentStage: 'inspire',
            inspireCompleted: false,
            investigateCompleted: false,
            actCompleted: false,
            awardCompleted: false,
            auditQuizCompleted: false,
            progressPercentage: 0,
            updatedAt: new Date()
          })
          .where(eq(schools.id, schoolId));

        console.log(`[Award Completion] Moved school ${schoolId} to Round 2`);
        
        success.push({ id: schoolId, schoolName: school.name, certificateId });
      }

      // If there are any failures, throw with details to rollback transaction
      if (failed.length > 0) {
        const error = new Error(`${failed.length} school(s) failed to process`) as any;
        error.failed = failed;
        throw error;
      }

      return { success, failed };
    });

    res.json({
      message: `Bulk award processing completed. ${results.success.length} schools processed successfully.`,
      results
    });
  } catch (error: any) {
    console.error("Error in bulk award processing:", error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to perform bulk award processing';
    
    // If error includes failed schools array, include it in response
    const failed = error.failed || [];
    
    res.status(500).json({ 
      message: errorMessage,
      results: {
        success: [],
        failed
      }
    });
  }
});

// GET /api/admin/schools - Get all schools for admin management
schoolsRouter.get('/api/admin/schools', isAuthenticated, requireAdminOrPartner, async (req, res) => {
  try {
    // Validate and parse query parameters
    const parseResult = adminSchoolsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ 
        message: "Invalid query parameters", 
        errors: parseResult.error.flatten() 
      });
    }
    
    const { 
      country, 
      stage, 
      type, 
      search, 
      language, 
      sortByDate, 
      joinedMonth, 
      joinedYear, 
      interactionStatus, 
      completionStatus,
      page,
      limit,
      sortBy,
      sortOrder
    } = parseResult.data;
    
    // Calculate pagination offset (page and limit are already validated numbers)
    const offset = (page - 1) * limit;
    
    // Get total count for pagination metadata
    // For interactionStatus filter, we need to fetch all schools and filter in memory
    // For other filters, we can use an efficient COUNT(*) query
    let total: number;
    
    if (interactionStatus) {
      // Fall back to fetching all schools for interaction status filtering
      const totalSchools = await storage.getSchools({
        country,
        stage,
        type,
        search,
        language,
        sortByDate,
        joinedMonth,
        joinedYear,
        interactionStatus,
        completionStatus,
      });
      total = totalSchools.length;
    } else {
      // Use efficient COUNT(*) query with same WHERE conditions as getSchools
      const conditions = [];
      
      // Country filter
      if (country) {
        const allCodes = getAllCountryCodes(country);
        const searchValues = [...allCodes, country];
        if (searchValues.length > 1) {
          conditions.push(inArray(schools.country, searchValues));
        } else {
          conditions.push(eq(schools.country, searchValues[0]));
        }
      }
      
      // Stage filter
      if (stage) {
        conditions.push(eq(schools.currentStage, stage as any));
      }
      
      // Completion status filter
      if (completionStatus) {
        if (completionStatus === 'plastic-clever') {
          conditions.push(eq(schools.awardCompleted, true));
        } else if (completionStatus === 'in-progress') {
          conditions.push(eq(schools.awardCompleted, false));
        }
      }
      
      // Type filter
      if (type) {
        conditions.push(eq(schools.type, type as any));
      }
      
      // Language filter
      if (language) {
        const languageMap: Record<string, string> = {
          'en': 'English',
          'es': 'Spanish',
          'fr': 'French',
          'de': 'German',
          'it': 'Italian',
          'pt': 'Portuguese',
          'nl': 'Dutch',
          'el': 'Greek',
          'id': 'Indonesian',
          'zh': 'Chinese'
        };
        const languageName = languageMap[language] || language;
        conditions.push(eq(schools.primaryLanguage, languageName));
      }
      
      // Search filter
      if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(
          or(
            ilike(schools.name, searchTerm),
            ilike(schools.address, searchTerm),
            ilike(schools.adminEmail, searchTerm)
          )
        );
      }
      
      // Joined month/year filter
      if (joinedMonth && joinedYear) {
        const month = parseInt(joinedMonth);
        const year = parseInt(joinedYear);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        conditions.push(and(
          gte(schools.createdAt, startDate),
          sql`${schools.createdAt} <= ${endDate}`
        ));
      } else if (joinedYear) {
        const year = parseInt(joinedYear);
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
        conditions.push(and(
          gte(schools.createdAt, startDate),
          sql`${schools.createdAt} <= ${endDate}`
        ));
      }
      
      // Execute COUNT query
      const countQuery = db
        .select({ count: count() })
        .from(schools)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      
      const [countResult] = await countQuery;
      total = countResult?.count || 0;
    }
    
    // Get paginated schools
    const paginatedSchools = await storage.getSchools({
      country,
      stage,
      type,
      search,
      language,
      sortByDate,
      joinedMonth,
      joinedYear,
      interactionStatus,
      completionStatus,
      sortBy,
      sortOrder,
      limit,
      offset,
    });
    
    // Return pagination metadata
    res.json({
      schools: paginatedSchools,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Error fetching schools:", error);
    res.status(500).json({ message: "Failed to fetch schools" });
  }
});

// GET /api/admin/schools/:id - Get single school by ID
schoolsRouter.get('/api/admin/schools/:id', isAuthenticated, requireAdminOrPartner, async (req, res) => {
  try {
    const school = await storage.getSchool(req.params.id);
    
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    res.json(school);
  } catch (error) {
    console.error("Error fetching school:", error);
    res.status(500).json({ message: "Failed to fetch school" });
  }
});

// GET /api/admin/schools/:id/evidence - Get evidence for a specific school
schoolsRouter.get('/api/admin/schools/:id/evidence', isAuthenticated, requireAdminOrPartner, async (req, res) => {
  try {
    const schoolId = req.params.id;
    const evidence = await storage.getSchoolEvidence(schoolId);
    res.json(evidence);
  } catch (error) {
    console.error("Error fetching school evidence:", error);
    res.status(500).json({ message: "Failed to fetch evidence" });
  }
});

// GET /api/admin/schools/:id/teachers - Get teachers for a specific school
schoolsRouter.get('/api/admin/schools/:id/teachers', isAuthenticated, requireAdminOrPartner, async (req, res) => {
  try {
    const schoolId = req.params.id;
    const schoolUsers = await storage.getSchoolUsersWithDetails(schoolId);
    
    const teachers = schoolUsers.map(su => ({
      userId: su.userId,
      name: su.user ? `${su.user.firstName || ''} ${su.user.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
      email: su.user?.email || 'N/A',
      firstName: su.user?.firstName || null,
      lastName: su.user?.lastName || null,
      role: su.role,
      teacherRole: su.teacherRole,
      isVerified: su.isVerified,
      joinedAt: su.createdAt,
      createdAt: su.createdAt,
      legacyEvidenceCount: su.legacyEvidenceCount || 0,
    }));
    
    res.json(teachers);
  } catch (error) {
    console.error("Error fetching school teachers:", error);
    res.status(500).json({ message: "Failed to fetch teachers" });
  }
});

// GET /api/admin/schools/:id/audits - Get audits for a specific school
schoolsRouter.get('/api/admin/schools/:id/audits', isAuthenticated, requireAdminOrPartner, async (req, res) => {
  try {
    const schoolId = req.params.id;
    const audits = await storage.getSchoolAudits(schoolId);
    res.json(audits);
  } catch (error) {
    console.error("Error fetching school audits:", error);
    res.status(500).json({ message: "Failed to fetch audits" });
  }
});

// PUT /api/admin/schools/:id - Update school details
schoolsRouter.put('/api/admin/schools/:id', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    const school = await storage.updateSchool(req.params.id, updates);
    
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    res.json(school);
  } catch (error) {
    console.error("Error updating school:", error);
    res.status(500).json({ message: "Failed to update school" });
  }
});

// GET /api/admin/schools/:id/users-preview - Get school users count for deletion preview
schoolsRouter.get('/api/admin/schools/:id/users-preview', isAuthenticated, requireAdminOrPartner, async (req, res) => {
  try {
    const schoolId = req.params.id;
    
    // Get school users with details
    const schoolUsers = await storage.getSchoolUsersWithDetails(schoolId);
    
    const users = schoolUsers.map(su => ({
      id: su.user?.id || '',
      name: su.user ? `${su.user.firstName} ${su.user.lastName}`.trim() : 'Unknown',
      email: su.user?.email || 'N/A',
      role: su.role,
    })).filter(u => u.id); // Filter out null users
    
    res.json({
      count: users.length,
      users
    });
  } catch (error) {
    console.error("Error fetching school users preview:", error);
    res.status(500).json({ message: "Failed to fetch school users" });
  }
});

// DELETE /api/admin/schools/:id - Delete school
schoolsRouter.delete('/api/admin/schools/:id', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const schoolId = req.params.id;
    const { deleteUsers = false } = req.body;
    
    // If deleteUsers is true, delete all users associated with this school
    if (deleteUsers === 'true') {
      const schoolUsers = await storage.getSchoolUsersWithDetails(schoolId);
      const userIds = schoolUsers.map(su => su.userId).filter(id => id);
      
      console.log(`[Delete School] Deleting ${userIds.length} associated users`);
      
      // Delete all users (using hard delete mode)
      for (const userId of userIds) {
        try {
          await storage.deleteUser(userId, 'hard');
        } catch (error) {
          console.error(`[Delete School] Error deleting user ${userId}:`, error);
          // Continue with other users even if one fails
        }
      }
    }
    
    const deleted = await storage.deleteSchool(schoolId);
    
    if (!deleted) {
      return res.status(404).json({ message: "School not found or already deleted" });
    }

    res.json({ message: "School deleted successfully" });
  } catch (error) {
    console.error("Error deleting school:", error);
    res.status(500).json({ message: "Failed to delete school" });
  }
});

// GET /api/admin/schools/:schoolId/teachers - Get teachers for a specific school (for expandable rows)
schoolsRouter.get('/api/admin/schools/:schoolId/teachers', isAuthenticated, requireAdminOrPartner, async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    // Get school users with details
    const schoolUsers = await storage.getSchoolUsersWithDetails(schoolId);
    
    // Transform to match expected format
    const teachers = schoolUsers.map(su => ({
      userId: su.userId,
      name: su.user ? `${su.user.firstName} ${su.user.lastName}` : 'Unknown',
      email: su.user?.email || 'N/A',
      role: su.role,
      teacherRole: su.teacherRole,
      isVerified: su.isVerified,
      joinedAt: su.createdAt,
    }));
    
    res.json(teachers);
  } catch (error) {
    console.error("Error fetching school teachers:", error);
    res.status(500).json({ message: "Failed to fetch school teachers" });
  }
});

// GET /api/admin/schools/:schoolId/evidence-overrides - Get admin evidence overrides for a school
schoolsRouter.get('/api/admin/schools/:schoolId/evidence-overrides', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const school = await storage.getSchool(schoolId);
    
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    const currentRound = school.currentRound || 1;
    const overrides = await storage.getAdminEvidenceOverrides(schoolId, currentRound);
    
    res.json(overrides);
  } catch (error) {
    console.error("Error fetching admin evidence overrides:", error);
    res.status(500).json({ message: "Failed to fetch evidence overrides" });
  }
});

// POST /api/admin/schools/:schoolId/evidence-overrides/toggle - Toggle admin evidence override for a school
schoolsRouter.post('/api/admin/schools/:schoolId/evidence-overrides/toggle', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    console.log(`[Admin Override] POST request for school ${schoolId} with body:`, req.body);
    
    // Validate request body with Zod
    const validation = toggleEvidenceOverrideSchema.safeParse(req.body);
    if (!validation.success) {
      console.log(`[Admin Override] Validation failed:`, validation.error.errors);
      return res.status(400).json({ 
        message: "Invalid request body", 
        errors: validation.error.errors 
      });
    }

    const { evidenceRequirementId, stage } = validation.data;

    if (!req.user?.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const school = await storage.getSchool(schoolId);
    if (!school) {
      console.log(`[Admin Override] School not found: ${schoolId}`);
      return res.status(404).json({ message: "School not found" });
    }

    const currentRound = school.currentRound || 1;
    console.log(`[Admin Override] School current round: ${currentRound}`);
    
    // Verify evidence requirement exists and matches school's round/stage
    const requirement = await storage.getEvidenceRequirement(evidenceRequirementId);
    if (!requirement) {
      console.log(`[Admin Override] Requirement not found: ${evidenceRequirementId}`);
      return res.status(404).json({ message: "Evidence requirement not found" });
    }
    
    if (requirement.stage !== stage) {
      console.log(`[Admin Override] Stage mismatch - requirement: ${requirement.stage}, provided: ${stage}`);
      return res.status(400).json({ 
        message: "Evidence requirement stage does not match provided stage" 
      });
    }
    
    console.log(`[Admin Override] Toggling override for requirement ${evidenceRequirementId}`);
    const result = await storage.toggleAdminEvidenceOverride(
      schoolId,
      evidenceRequirementId,
      stage,
      currentRound,
      req.user.id
    );

    console.log(`[Admin Override] Toggle result:`, result);

    // Recalculate school progression after toggling override
    console.log(`[Admin Override] Recalculating school progression...`);
    await storage.checkAndUpdateSchoolProgression(schoolId);
    
    res.json(result);
  } catch (error) {
    console.error("[Admin Override] Error toggling admin evidence override:", error);
    res.status(500).json({ message: "Failed to toggle evidence override" });
  }
});

// PATCH /api/admin/schools/:schoolId/progression - Manually update school progression (round/stage)
schoolsRouter.patch('/api/admin/schools/:schoolId/progression', isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    console.log(`[Admin Progression] PATCH request for school ${schoolId} with body:`, req.body);
    
    // Validate request body with Zod
    const validation = updateSchoolProgressionSchema.safeParse(req.body);
    if (!validation.success) {
      console.log(`[Admin Progression] Validation failed:`, validation.error.errors);
      return res.status(400).json({ 
        message: "Invalid request body", 
        errors: validation.error.errors 
      });
    }

    const { currentRound, currentStage, inspireCompleted, investigateCompleted, actCompleted, progressPercentage } = validation.data;
    
    const updates: any = {};
    if (currentRound !== undefined) updates.currentRound = currentRound;
    if (currentStage !== undefined) updates.currentStage = currentStage;
    if (inspireCompleted !== undefined) updates.inspireCompleted = inspireCompleted;
    if (investigateCompleted !== undefined) updates.investigateCompleted = investigateCompleted;
    if (actCompleted !== undefined) updates.actCompleted = actCompleted;
    if (progressPercentage !== undefined) updates.progressPercentage = progressPercentage;

    console.log(`[Admin Progression] Applying updates:`, updates);

    const school = await storage.manuallyUpdateSchoolProgression(schoolId, updates);
    
    if (!school) {
      console.log(`[Admin Progression] School not found: ${schoolId}`);
      return res.status(404).json({ message: "School not found" });
    }

    // Recalculate progress after manual updates to ensure accuracy
    console.log(`[Admin Progression] Recalculating school progression after manual update...`);
    const updatedSchool = await storage.checkAndUpdateSchoolProgression(schoolId);

    console.log(`[Admin Progression] School updated successfully. New state:`, {
      id: updatedSchool?.id || school.id,
      name: updatedSchool?.name || school.name,
      currentRound: updatedSchool?.currentRound || school.currentRound,
      currentStage: updatedSchool?.currentStage || school.currentStage,
      progressPercentage: updatedSchool?.progressPercentage || school.progressPercentage
    });

    res.json(updatedSchool || school);
  } catch (error) {
    console.error("[Admin Progression] Error updating school progression:", error);
    res.status(500).json({ message: "Failed to update school progression" });
  }
});

// POST /api/admin/schools/:schoolId/assign-teacher - Admin assigns a teacher to a school
schoolsRouter.post('/api/admin/schools/:schoolId/assign-teacher', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const { schoolId } = req.params;
    const assignTeacherSchema = z.object({
      email: z.string().email("Please provide a valid email address"),
      role: z.enum(['head_teacher', 'teacher'], {
        errorMap: () => ({ message: "Role must be 'head_teacher' or 'teacher'" })
      }),
    });
    const { email, role } = assignTeacherSchema.parse(req.body);

    console.log(`[Admin Assign Teacher] Admin assigning ${email} as ${role} to school ${schoolId}`);

    // Check if school exists
    const school = await storage.getSchool(schoolId);
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    // Get or create user
    const allUsers = await storage.getAllUsers();
    let user = allUsers.find(u => u.email === email);
    
    if (!user) {
      // Create new user account using upsertUser
      user = await storage.upsertUser({
        id: nanoid(),
        email,
        firstName: email.split('@')[0] || 'Teacher',
        lastName: '',
        emailVerified: true,
        isAdmin: false,
        role: 'teacher',
      });
      console.log(`[Admin Assign Teacher] Created new user ${user.id} for ${email}`);
    }
    
    // Ensure user exists before proceeding
    if (!user) {
      return res.status(500).json({ message: "Failed to create user account" });
    }

    // Check if already assigned to this school
    const existing = await storage.getSchoolUser(schoolId, user.id);
    if (existing) {
      return res.status(400).json({ 
        message: "User is already assigned to this school",
        currentRole: existing.role 
      });
    }

    // Add user to school as verified member
    await storage.addUserToSchool({
      schoolId,
      userId: user.id,
      role,
      isVerified: true,
    });
    
    console.log(`[Admin Assign Teacher] Successfully assigned ${email} to school ${schoolId} as ${role}`);

    // Send notification email (non-blocking)
    try {
      await sendEmail({
        to: email,
        from: getFromAddress(),
        subject: `You've been added to ${school.name} on Plastic Clever Schools`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0B3D5D 0%, #019ADE 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to ${school.name}!</h1>
            </div>
            <div style="padding: 40px 20px; background: #f9f9f9;">
              <h2 style="color: #0B3D5D;">You've Been Added to a School</h2>
              <p style="color: #666; line-height: 1.6;">
                A platform administrator has added you to <strong>${school.name}</strong> as a ${role === 'head_teacher' ? 'Head Teacher' : 'Teacher'}.
              </p>
              <p style="color: #666; line-height: 1.6;">
                You can now access your school dashboard and participate in the Plastic Clever Schools programme.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getBaseUrl()}/dashboard" 
                   style="background: #02BBB4; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                  Go to Dashboard
                </a>
              </div>
            </div>
            <div style="background: #0B3D5D; color: white; padding: 20px; text-align: center; font-size: 14px;">
              <p>© 2024 Plastic Clever Schools. Together for a plastic-free future.</p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.warn('[Admin Assign Teacher] Email notification failed:', emailError);
    }

    res.json({ 
      message: "Teacher assigned successfully",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      role,
    });
  } catch (error) {
    console.error("[Admin Assign Teacher] Error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to assign teacher" });
  }
});

// DELETE /api/admin/schools/:schoolId/teachers/:userId - Admin removes a teacher from a school
schoolsRouter.delete('/api/admin/schools/:schoolId/teachers/:userId', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const { schoolId, userId } = req.params;

    console.log(`[Admin Remove Teacher] Admin removing teacher ${userId} from school ${schoolId}`);

    // Check if school exists
    const school = await storage.getSchool(schoolId);
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    // Check if user is assigned to this school
    const schoolUser = await storage.getSchoolUser(schoolId, userId);
    if (!schoolUser) {
      return res.status(404).json({ message: "Teacher not found in this school" });
    }

    // Remove user from school
    const removed = await storage.removeUserFromSchool(schoolId, userId);
    
    if (!removed) {
      return res.status(500).json({ message: "Failed to remove teacher" });
    }

    console.log(`[Admin Remove Teacher] Successfully removed teacher ${userId} from school ${schoolId}`);

    // Send notification email (non-blocking)
    try {
      const user = await storage.getUser(userId);
      if (user?.email) {
        await sendEmail({
          to: user.email,
          from: getFromAddress(),
          subject: `Update: Your Access to ${school.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0B3D5D 0%, #019ADE 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">School Access Update</h1>
              </div>
              <div style="padding: 40px 20px; background: #f9f9f9;">
                <h2 style="color: #0B3D5D;">Access Removed</h2>
                <p style="color: #666; line-height: 1.6;">
                  Your access to <strong>${school.name}</strong> has been removed by a platform administrator.
                </p>
                <p style="color: #666; line-height: 1.6;">
                  If you believe this is an error, please contact support for assistance.
                </p>
              </div>
              <div style="background: #0B3D5D; color: white; padding: 20px; text-align: center; font-size: 14px;">
                <p>© 2024 Plastic Clever Schools. Together for a plastic-free future.</p>
              </div>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.warn('[Admin Remove Teacher] Email notification failed:', emailError);
    }

    res.json({ message: "Teacher removed successfully" });
  } catch (error) {
    console.error("[Admin Remove Teacher] Error:", error);
    res.status(500).json({ message: "Failed to remove teacher" });
  }
});
