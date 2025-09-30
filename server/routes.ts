import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { sendWelcomeEmail, sendEvidenceApprovalEmail, sendEvidenceRejectionEmail, sendEvidenceSubmissionEmail, sendAdminNewEvidenceEmail, sendBulkEmail, BulkEmailParams, sendEmail } from "./emailService";
import { mailchimpService } from "./mailchimpService";
import { insertSchoolSchema, insertEvidenceSchema, insertMailchimpAudienceSchema, insertMailchimpSubscriptionSchema, insertTeacherInvitationSchema, insertVerificationRequestSchema } from "@shared/schema";
import { z } from "zod";
import * as XLSX from 'xlsx';
import { randomUUID, randomBytes } from 'crypto';

// CSV generation helper with proper escaping
function generateCSV(data: any[], type: string): string {
  if (data.length === 0) return '';

  const headers = getCSVHeaders(type);
  const csvRows = [headers.join(',')];
  
  data.forEach(item => {
    const row = headers.map(header => {
      const value = item[header];
      if (value === null || value === undefined) return '';
      
      let stringValue = String(value);
      if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
      }
      
      // Escape CSV special characters: quotes, commas, newlines
      if (stringValue.includes('"') || stringValue.includes(',') || 
          stringValue.includes('\n') || stringValue.includes('\r')) {
        stringValue = `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    });
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

function getCSVHeaders(type: string): string[] {
  switch (type) {
    case 'schools':
      return ['id', 'name', 'type', 'country', 'address', 'studentCount', 'currentStage', 'progressPercentage', 'createdAt'];
    case 'evidence':
      return ['id', 'title', 'description', 'stage', 'status', 'schoolId', 'submittedBy', 'submittedAt', 'reviewedBy', 'reviewedAt'];
    case 'users':
      return ['id', 'email', 'firstName', 'lastName', 'role', 'isAdmin', 'createdAt'];
    case 'analytics':
      return ['category', 'metric', 'value'];
    default:
      return [];
  }
}

// Excel generation helper
function generateExcel(data: any[], type: string): Buffer {
  const headers = getCSVHeaders(type);
  const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, type.charAt(0).toUpperCase() + type.slice(1));
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);


  // Public routes
  
  // Get site statistics
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await storage.getSchoolStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Get comprehensive list of countries
  app.get('/api/countries', async (req, res) => {
    try {
      const countries = [
        "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", 
        "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", 
        "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", 
        "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", 
        "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", 
        "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", 
        "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", 
        "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", 
        "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", 
        "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", 
        "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", 
        "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", 
        "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", 
        "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", 
        "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", 
        "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", 
        "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", 
        "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", 
        "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", 
        "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", 
        "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", 
        "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", 
        "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", 
        "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe", "Other"
      ];
      res.json(countries);
    } catch (error) {
      console.error("Error fetching countries:", error);
      res.status(500).json({ message: "Failed to fetch countries" });
    }
  });

  // Advanced search endpoints
  
  // Global search across all content types
  app.get('/api/search/global', async (req, res) => {
    try {
      const { q, contentTypes, limit, offset } = req.query;
      
      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return res.status(400).json({ message: "Search query 'q' is required" });
      }

      const searchOptions: any = {};
      
      if (contentTypes && typeof contentTypes === 'string') {
        const types = contentTypes.split(',');
        const validTypes = ['resources', 'schools', 'evidence', 'caseStudies'];
        searchOptions.contentTypes = types.filter(type => validTypes.includes(type));
      }
      
      if (limit && typeof limit === 'string') {
        searchOptions.limit = Math.min(parseInt(limit), 100); // Max 100 results
      }
      
      if (offset && typeof offset === 'string') {
        searchOptions.offset = parseInt(offset);
      }

      const results = await storage.searchGlobal(q.trim(), searchOptions);
      res.json(results);
    } catch (error) {
      console.error("Error performing global search:", error);
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  // Content-specific search with ranking
  app.get('/api/search/:contentType', async (req, res) => {
    try {
      const { contentType } = req.params;
      const { q, limit, offset } = req.query;
      
      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return res.status(400).json({ message: "Search query 'q' is required" });
      }

      const validContentTypes = ['resources', 'schools', 'evidence', 'caseStudies'];
      if (!validContentTypes.includes(contentType)) {
        return res.status(400).json({ 
          message: `Invalid content type. Must be one of: ${validContentTypes.join(', ')}` 
        });
      }

      const searchOptions: any = {};
      
      if (limit && typeof limit === 'string') {
        searchOptions.limit = Math.min(parseInt(limit), 50); // Max 50 results for specific searches
      }
      
      if (offset && typeof offset === 'string') {
        searchOptions.offset = parseInt(offset);
      }

      const results = await storage.searchWithRanking(
        q.trim(), 
        contentType as 'resources' | 'schools' | 'evidence' | 'caseStudies',
        searchOptions
      );
      
      res.json(results);
    } catch (error) {
      console.error(`Error performing ${req.params.contentType} search:`, error);
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  // Get resources with filters
  app.get('/api/resources', async (req, res) => {
    try {
      const { stage, country, language, ageRange, search, limit, offset } = req.query;
      const resources = await storage.getResources({
        stage: stage as string,
        country: country as string,
        language: language as string,
        ageRange: ageRange as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      });
      res.json(resources);
    } catch (error) {
      console.error("Error fetching resources:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  // Download resource (increment counter)
  app.get('/api/resources/:id/download', async (req, res) => {
    try {
      await storage.updateResourceDownloads(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating download count:", error);
      res.status(500).json({ message: "Failed to update download count" });
    }
  });

  // Get case studies/inspiration
  app.get('/api/case-studies', async (req, res) => {
    try {
      const { stage, country, search, limit, offset } = req.query;
      const caseStudies = await storage.getCaseStudies({
        stage: stage as string,
        country: country as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      });
      res.json(caseStudies);
    } catch (error) {
      console.error("Error fetching case studies:", error);
      res.status(500).json({ message: "Failed to fetch case studies" });
    }
  });

  // Get single case study by ID
  app.get('/api/case-studies/:id', async (req, res) => {
    try {
      const caseStudy = await storage.getCaseStudyById(req.params.id);
      if (!caseStudy) {
        return res.status(404).json({ message: "Case study not found" });
      }
      res.json(caseStudy);
    } catch (error) {
      console.error("Error fetching case study:", error);
      res.status(500).json({ message: "Failed to fetch case study" });
    }
  });

  // Get global movement data for landing page
  app.get('/api/landing/global-movement', async (req, res) => {
    try {
      const globalMovementData = await storage.getGlobalMovementData();
      res.json(globalMovementData);
    } catch (error) {
      console.error("Error fetching global movement data:", error);
      res.status(500).json({ message: "Failed to fetch global movement data" });
    }
  });

  // Get schools for map
  app.get('/api/schools/map', async (req, res) => {
    try {
      const { country } = req.query;
      const schools = await storage.getSchools({
        country: country as string,
        showOnMap: true, // Only show schools that have consented to be on the map
        limit: 1000, // Large limit for map display
      });
      
      // Only return necessary data for map display
      const mapData = schools.map(school => ({
        id: school.id,
        name: school.name,
        country: school.country,
        latitude: school.latitude,
        longitude: school.longitude,
        currentStage: school.currentStage,
        awardCompleted: school.awardCompleted,
        featuredSchool: school.featuredSchool,
      }));
      
      res.json(mapData);
    } catch (error) {
      console.error("Error fetching schools for map:", error);
      res.status(500).json({ message: "Failed to fetch schools for map" });
    }
  });

  // School registration (public)
  app.post('/api/schools/register', async (req, res) => {
    try {
      // Validate school data
      const schoolData = insertSchoolSchema.parse(req.body.school);
      const userData = {
        email: req.body.user.email,
        firstName: req.body.user.firstName,
        lastName: req.body.user.lastName,
        role: 'teacher',
      };

      // Create user first
      const user = await storage.upsertUser({
        id: randomUUID(),
        ...userData,
      });
      
      // Log the user in to establish a session
      req.login(user, async (err) => {
        if (err) {
          console.error("Error logging in user after registration:", err);
          return res.status(500).json({ message: "User created but failed to establish session" });
        }

        try {
          // Create school with user as primary contact
          const school = await storage.createSchool({
            ...schoolData,
            showOnMap: req.body.showOnMap || false, // Include map consent from form
            primaryContactId: user.id,
          });

          // Add user to school
          await storage.addUserToSchool({
            schoolId: school.id,
            userId: user.id,
            role: 'head_teacher',
          });

          // Send welcome email (non-blocking)
          try {
            await sendWelcomeEmail(user.email!, school.name);
          } catch (emailError) {
            // Log but don't fail registration if email fails
            console.warn('Welcome email failed to send:', emailError);
          }

          // Add to Mailchimp automation (non-blocking)
          try {
            await mailchimpService.setupSchoolSignupAutomation({
              email: user.email!,
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              schoolName: school.name,
              schoolCountry: school.country,
              role: 'teacher',
              tags: ['new_school_signup', 'teacher', school.currentStage || 'inspire'],
            });
          } catch (mailchimpError) {
            // Log but don't fail registration if Mailchimp fails
            console.warn('Mailchimp automation failed for school signup:', mailchimpError);
          }

          // Ensure session is saved before sending response
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("Error saving session:", saveErr);
              return res.status(500).json({ message: "Registration successful but session save failed" });
            }

            res.status(201).json({ 
              message: "School registered successfully",
              school: school,
              user: user 
            });
          });
        } catch (schoolError) {
          console.error("Error creating school after user login:", schoolError);
          return res.status(500).json({ message: "User created and logged in, but school creation failed" });
        }
      });
    } catch (error) {
      console.error("Error registering school:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register school" });
    }
  });

  // Protected routes (require authentication)

  // TEACHER INVITATION ROUTES
  
  // POST /api/schools/:schoolId/invite-teacher - Invite a teacher to join a school
  app.post('/api/schools/:schoolId/invite-teacher', isAuthenticated, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const userId = req.user.id;
      
      // Validate request body
      const inviteSchema = z.object({
        email: z.string().email("Valid email is required"),
      });
      const { email } = inviteSchema.parse(req.body);
      
      console.log(`[Teacher Invitation] User ${userId} inviting ${email} to school ${schoolId}`);
      
      // Check if user is head teacher of this school (will add middleware in next task)
      const schoolUser = await storage.getSchoolUser(schoolId, userId);
      if (!schoolUser || schoolUser.role !== 'head_teacher') {
        console.log(`[Teacher Invitation] Access denied - user is not head teacher`);
        return res.status(403).json({ message: "Only head teachers can invite teachers" });
      }
      
      // Generate invitation token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
      
      // Create invitation
      const invitation = await storage.createTeacherInvitation({
        schoolId,
        invitedBy: userId,
        email,
        token,
        expiresAt,
      });
      
      console.log(`[Teacher Invitation] Created invitation ${invitation.id} for ${email}`);
      
      // Get school details for email
      const school = await storage.getSchool(schoolId);
      const inviter = await storage.getUser(userId);
      
      // Send invitation email
      if (school) {
        const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/invitations/${token}`;
        await sendEmail({
          to: email,
          from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
          subject: `You're invited to join ${school.name} on Plastic Clever Schools`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You've been invited to join ${school.name}!</h2>
              <p>${inviter?.firstName || 'A colleague'} has invited you to join their school team on Plastic Clever Schools.</p>
              <p><strong>School:</strong> ${school.name}</p>
              <p><strong>Country:</strong> ${school.country}</p>
              <p>Click the link below to accept this invitation:</p>
              <a href="${inviteUrl}" style="background: #02BBB4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Invitation</a>
              <p style="color: #666; margin-top: 20px;">This invitation will expire in 7 days.</p>
            </div>
          `,
        });
        console.log(`[Teacher Invitation] Sent invitation email to ${email}`);
      }
      
      res.status(201).json({ 
        message: "Invitation sent successfully",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expiresAt: invitation.expiresAt,
        }
      });
    } catch (error) {
      console.error("[Teacher Invitation] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });
  
  // GET /api/schools/:schoolId/invitations - Get all invitations for a school
  app.get('/api/schools/:schoolId/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const userId = req.user.id;
      
      console.log(`[Teacher Invitations] User ${userId} fetching invitations for school ${schoolId}`);
      
      // Check if user is head teacher of this school
      const schoolUser = await storage.getSchoolUser(schoolId, userId);
      if (!schoolUser || schoolUser.role !== 'head_teacher') {
        console.log(`[Teacher Invitations] Access denied - user is not head teacher`);
        return res.status(403).json({ message: "Only head teachers can view invitations" });
      }
      
      const invitations = await storage.getSchoolInvitations(schoolId);
      console.log(`[Teacher Invitations] Found ${invitations.length} invitations`);
      
      res.json(invitations);
    } catch (error) {
      console.error("[Teacher Invitations] Error:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });
  
  // POST /api/invitations/:token/accept - Accept a teacher invitation
  app.post('/api/invitations/:token/accept', isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.params;
      const userId = req.user.id;
      
      console.log(`[Accept Invitation] User ${userId} accepting invitation with token ${token}`);
      
      // Accept the invitation
      const invitation = await storage.acceptTeacherInvitation(token);
      
      if (!invitation) {
        console.log(`[Accept Invitation] Invitation not found or expired`);
        return res.status(404).json({ message: "Invitation not found or has expired" });
      }
      
      // Verify the email matches the authenticated user
      const user = await storage.getUser(userId);
      if (user?.email !== invitation.email) {
        console.log(`[Accept Invitation] Email mismatch - invitation for ${invitation.email}, user is ${user?.email}`);
        return res.status(403).json({ message: "This invitation is for a different email address" });
      }
      
      // Add user to school
      await storage.addUserToSchool({
        schoolId: invitation.schoolId,
        userId: userId,
        role: 'teacher',
        invitedBy: invitation.invitedBy,
        invitedAt: invitation.createdAt,
      });
      
      console.log(`[Accept Invitation] User ${userId} added to school ${invitation.schoolId}`);
      
      // Get school info to return
      const school = await storage.getSchool(invitation.schoolId);
      
      res.json({ 
        message: "Invitation accepted successfully",
        school
      });
    } catch (error) {
      console.error("[Accept Invitation] Error:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });
  
  // VERIFICATION REQUEST ROUTES
  
  // POST /api/schools/:schoolId/request-access - Request access to a school
  app.post('/api/schools/:schoolId/request-access', isAuthenticated, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const userId = req.user.id;
      
      // Validate request body
      const requestSchema = z.object({
        evidence: z.string().min(1, "Evidence is required"),
      });
      const { evidence } = requestSchema.parse(req.body);
      
      console.log(`[Access Request] User ${userId} requesting access to school ${schoolId}`);
      
      // Create verification request
      const verificationRequest = await storage.createVerificationRequest({
        userId,
        schoolId,
        evidence,
      });
      
      console.log(`[Access Request] Created verification request ${verificationRequest.id}`);
      
      // Get school and user info for email
      const school = await storage.getSchool(schoolId);
      const user = await storage.getUser(userId);
      
      // Send notification email to head teacher
      if (school && school.primaryContactId) {
        const headTeacher = await storage.getUser(school.primaryContactId);
        if (headTeacher?.email) {
          await sendEmail({
            to: headTeacher.email,
            from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
            subject: `New access request for ${school.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>New Access Request</h2>
                <p>${user?.firstName || 'A teacher'} ${user?.lastName || ''} has requested to join ${school.name}.</p>
                <p><strong>Email:</strong> ${user?.email}</p>
                <p><strong>Evidence provided:</strong></p>
                <p style="background: #f5f5f5; padding: 12px; border-left: 3px solid #02BBB4;">${evidence}</p>
                <p>Please review this request in your dashboard.</p>
              </div>
            `,
          });
          console.log(`[Access Request] Sent notification to head teacher ${headTeacher.email}`);
        }
      }
      
      res.status(201).json({ 
        message: "Access request submitted successfully",
        verificationRequest: {
          id: verificationRequest.id,
          status: verificationRequest.status,
        }
      });
    } catch (error) {
      console.error("[Access Request] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit access request" });
    }
  });
  
  // GET /api/schools/:schoolId/verification-requests - Get verification requests for a school
  app.get('/api/schools/:schoolId/verification-requests', isAuthenticated, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const userId = req.user.id;
      
      console.log(`[Verification Requests] User ${userId} fetching requests for school ${schoolId}`);
      
      // Check if user is head teacher of this school
      const schoolUser = await storage.getSchoolUser(schoolId, userId);
      if (!schoolUser || schoolUser.role !== 'head_teacher') {
        console.log(`[Verification Requests] Access denied - user is not head teacher`);
        return res.status(403).json({ message: "Only head teachers can view verification requests" });
      }
      
      const requests = await storage.getSchoolVerificationRequests(schoolId);
      console.log(`[Verification Requests] Found ${requests.length} requests`);
      
      res.json(requests);
    } catch (error) {
      console.error("[Verification Requests] Error:", error);
      res.status(500).json({ message: "Failed to fetch verification requests" });
    }
  });
  
  // PUT /api/verification-requests/:id/approve - Approve a verification request
  app.put('/api/verification-requests/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Validate request body
      const approveSchema = z.object({
        reviewNotes: z.string().optional(),
      });
      const { reviewNotes } = approveSchema.parse(req.body);
      
      console.log(`[Approve Request] User ${userId} approving verification request ${id}`);
      
      // Get the verification request first
      const request = await storage.getVerificationRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Verification request not found" });
      }
      
      // Check if user is head teacher or admin
      const schoolUser = await storage.getSchoolUser(request.schoolId, userId);
      const user = await storage.getUser(userId);
      if ((!schoolUser || schoolUser.role !== 'head_teacher') && !user?.isAdmin) {
        console.log(`[Approve Request] Access denied - user is not head teacher or admin`);
        return res.status(403).json({ message: "Only head teachers or admins can approve requests" });
      }
      
      // Approve the request
      const approvedRequest = await storage.approveVerificationRequest(id, userId, reviewNotes);
      
      if (!approvedRequest) {
        return res.status(404).json({ message: "Failed to approve request" });
      }
      
      // Add user to school
      await storage.addUserToSchool({
        schoolId: approvedRequest.schoolId,
        userId: approvedRequest.userId,
        role: 'teacher',
        verificationMethod: 'manual_approval',
      });
      
      console.log(`[Approve Request] User ${approvedRequest.userId} added to school ${approvedRequest.schoolId}`);
      
      // Send approval email to requester
      const requester = await storage.getUser(approvedRequest.userId);
      const school = await storage.getSchool(approvedRequest.schoolId);
      
      if (requester?.email && school) {
        await sendEmail({
          to: requester.email,
          from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
          subject: `Access approved for ${school.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Access Approved!</h2>
              <p>Your request to join ${school.name} has been approved.</p>
              ${reviewNotes ? `<p><strong>Notes from reviewer:</strong> ${reviewNotes}</p>` : ''}
              <p>You can now access the school dashboard and collaborate with your team.</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard" style="background: #02BBB4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Go to Dashboard</a>
            </div>
          `,
        });
        console.log(`[Approve Request] Sent approval email to ${requester.email}`);
      }
      
      res.json({ 
        message: "Verification request approved successfully",
        verificationRequest: approvedRequest
      });
    } catch (error) {
      console.error("[Approve Request] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to approve verification request" });
    }
  });
  
  // PUT /api/verification-requests/:id/reject - Reject a verification request
  app.put('/api/verification-requests/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Validate request body
      const rejectSchema = z.object({
        reviewNotes: z.string().optional(),
      });
      const { reviewNotes } = rejectSchema.parse(req.body);
      
      console.log(`[Reject Request] User ${userId} rejecting verification request ${id}`);
      
      // Get the verification request first
      const request = await storage.getVerificationRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Verification request not found" });
      }
      
      // Check if user is head teacher or admin
      const schoolUser = await storage.getSchoolUser(request.schoolId, userId);
      const user = await storage.getUser(userId);
      if ((!schoolUser || schoolUser.role !== 'head_teacher') && !user?.isAdmin) {
        console.log(`[Reject Request] Access denied - user is not head teacher or admin`);
        return res.status(403).json({ message: "Only head teachers or admins can reject requests" });
      }
      
      // Reject the request
      const rejectedRequest = await storage.rejectVerificationRequest(id, userId, reviewNotes);
      
      if (!rejectedRequest) {
        return res.status(404).json({ message: "Failed to reject request" });
      }
      
      console.log(`[Reject Request] Verification request ${id} rejected`);
      
      // Send rejection email to requester
      const requester = await storage.getUser(rejectedRequest.userId);
      const school = await storage.getSchool(rejectedRequest.schoolId);
      
      if (requester?.email && school) {
        await sendEmail({
          to: requester.email,
          from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
          subject: `Access request update for ${school.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Access Request Update</h2>
              <p>Your request to join ${school.name} has been reviewed.</p>
              ${reviewNotes ? `<p><strong>Notes from reviewer:</strong> ${reviewNotes}</p>` : ''}
              <p>If you believe this was in error, please contact the school directly or submit a new request with additional evidence.</p>
            </div>
          `,
        });
        console.log(`[Reject Request] Sent rejection email to ${requester.email}`);
      }
      
      res.json({ 
        message: "Verification request rejected",
        verificationRequest: rejectedRequest
      });
    } catch (error) {
      console.error("[Reject Request] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to reject verification request" });
    }
  });
  
  // TEAM MANAGEMENT ROUTES
  
  // GET /api/schools/:schoolId/team - Get school team members
  app.get('/api/schools/:schoolId/team', isAuthenticated, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const userId = req.user.id;
      const { limit, offset } = req.query;
      
      console.log(`[School Team] User ${userId} fetching team for school ${schoolId}`);
      
      // Check if user is a member of this school
      const schoolUser = await storage.getSchoolUser(schoolId, userId);
      if (!schoolUser) {
        console.log(`[School Team] Access denied - user is not a school member`);
        return res.status(403).json({ message: "You must be a school member to view the team" });
      }
      
      // Get team members with pagination
      const teamMembers = await storage.getSchoolUsersWithDetails(schoolId, {
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      
      console.log(`[School Team] Found ${teamMembers.length} team members`);
      
      res.json(teamMembers);
    } catch (error) {
      console.error("[School Team] Error:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });
  
  // DELETE /api/schools/:schoolId/teachers/:userId - Remove a teacher from school
  app.delete('/api/schools/:schoolId/teachers/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { schoolId, userId: teacherUserId } = req.params;
      const userId = req.user.id;
      
      console.log(`[Remove Teacher] User ${userId} removing teacher ${teacherUserId} from school ${schoolId}`);
      
      // Check if user is head teacher of this school
      const schoolUser = await storage.getSchoolUser(schoolId, userId);
      if (!schoolUser || schoolUser.role !== 'head_teacher') {
        console.log(`[Remove Teacher] Access denied - user is not head teacher`);
        return res.status(403).json({ message: "Only head teachers can remove teachers" });
      }
      
      // Cannot remove yourself
      if (userId === teacherUserId) {
        return res.status(400).json({ message: "You cannot remove yourself from the school" });
      }
      
      // Remove the teacher
      const removed = await storage.removeUserFromSchool(schoolId, teacherUserId);
      
      if (!removed) {
        return res.status(404).json({ message: "Teacher not found in this school" });
      }
      
      console.log(`[Remove Teacher] Teacher ${teacherUserId} removed from school ${schoolId}`);
      
      res.json({ message: "Teacher removed successfully" });
    } catch (error) {
      console.error("[Remove Teacher] Error:", error);
      res.status(500).json({ message: "Failed to remove teacher" });
    }
  });
  
  // PUT /api/schools/:schoolId/teachers/:userId/role - Update a teacher's role
  app.put('/api/schools/:schoolId/teachers/:userId/role', isAuthenticated, async (req: any, res) => {
    try {
      const { schoolId, userId: teacherUserId } = req.params;
      const userId = req.user.id;
      
      // Validate request body
      const roleSchema = z.object({
        role: z.enum(['head_teacher', 'teacher'], {
          errorMap: () => ({ message: "Role must be 'head_teacher' or 'teacher'" })
        }),
      });
      const { role } = roleSchema.parse(req.body);
      
      console.log(`[Update Role] User ${userId} updating role for teacher ${teacherUserId} in school ${schoolId} to ${role}`);
      
      // Check if user is head teacher of this school
      const schoolUser = await storage.getSchoolUser(schoolId, userId);
      if (!schoolUser || schoolUser.role !== 'head_teacher') {
        console.log(`[Update Role] Access denied - user is not head teacher`);
        return res.status(403).json({ message: "Only head teachers can update roles" });
      }
      
      // Update the role
      const updated = await storage.updateSchoolUserRole(schoolId, teacherUserId, role);
      
      if (!updated) {
        return res.status(404).json({ message: "Teacher not found in this school" });
      }
      
      console.log(`[Update Role] Teacher ${teacherUserId} role updated to ${role}`);
      
      res.json({ 
        message: "Role updated successfully",
        schoolUser: updated
      });
    } catch (error) {
      console.error("[Update Role] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Get user's school dashboard data
  app.get('/api/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const schools = await storage.getUserSchools(userId);
      
      if (schools.length === 0) {
        return res.status(404).json({ message: "No schools found for user" });
      }

      // For now, use the first school (multi-school support can be added later)
      const school = schools[0];
      
      // Get recent evidence for this school
      const evidence = await storage.getSchoolEvidence(school.id);
      
      res.json({
        school,
        recentEvidence: evidence.slice(0, 5), // Latest 5 submissions
      });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Submit evidence
  app.post('/api/evidence', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const evidenceData = insertEvidenceSchema.parse({
        ...req.body,
        submittedBy: userId,
      });

      const evidence = await storage.createEvidence(evidenceData);

      // Send email notifications (non-blocking)
      try {
        const user = await storage.getUser(userId);
        const school = await storage.getSchool(evidenceData.schoolId);
        
        if (user?.email && school) {
          // Send confirmation email to the teacher who submitted the evidence
          await sendEvidenceSubmissionEmail(
            user.email,
            school.name,
            evidence.title,
            evidence.stage
          );

          // Send notification email to all admin users
          const adminUsers = await storage.getAllUsers();
          const admins = adminUsers.filter(adminUser => adminUser.isAdmin);
          
          for (const admin of admins) {
            if (admin.email) {
              await sendAdminNewEvidenceEmail(
                admin.email,
                school.name,
                evidence.title,
                evidence.stage,
                `${user.firstName} ${user.lastName}`.trim() || user.email
              );
            }
          }

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

      res.status(201).json(evidence);
    } catch (error) {
      console.error("Error submitting evidence:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit evidence" });
    }
  });

  // Get user's evidence
  app.get('/api/evidence', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const schools = await storage.getUserSchools(userId);
      
      if (schools.length === 0) {
        return res.json([]);
      }

      // Get evidence for all user's schools
      const evidence = await storage.getSchoolEvidence(schools[0].id);
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching evidence:", error);
      res.status(500).json({ message: "Failed to fetch evidence" });
    }
  });

  // Object storage routes for evidence files
  
  // Serve private objects with ACL check
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.id;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL for evidence files
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Set ACL policy for uploaded evidence files
  app.put("/api/evidence-files", isAuthenticated, async (req: any, res) => {
    if (!req.body.fileURL) {
      return res.status(400).json({ error: "fileURL is required" });
    }

    const userId = req.user?.id;
    const visibility = req.body.visibility || 'private';

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.fileURL,
        {
          owner: userId,
          visibility: visibility,
        },
      );

      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting file ACL:", error);
      res.status(500).json({ error: "Failed to set file permissions" });
    }
  });

  // Admin routes (require admin privileges)
  
  const requireAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      next();
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Failed to verify admin status" });
    }
  };

  // Get admin dashboard stats
  app.get('/api/admin/stats', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin statistics" });
    }
  });

  // Analytics endpoints
  app.get('/api/admin/analytics/overview', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getAnalyticsOverview();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics overview:", error);
      res.status(500).json({ message: "Failed to fetch analytics overview" });
    }
  });

  app.get('/api/admin/analytics/school-progress', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getSchoolProgressAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching school progress analytics:", error);
      res.status(500).json({ message: "Failed to fetch school progress analytics" });
    }
  });

  app.get('/api/admin/analytics/evidence', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getEvidenceAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching evidence analytics:", error);
      res.status(500).json({ message: "Failed to fetch evidence analytics" });
    }
  });

  app.get('/api/admin/analytics/user-engagement', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getUserEngagementAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching user engagement analytics:", error);
      res.status(500).json({ message: "Failed to fetch user engagement analytics" });
    }
  });

  app.get('/api/admin/analytics/resources', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getResourceAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching resource analytics:", error);
      res.status(500).json({ message: "Failed to fetch resource analytics" });
    }
  });

  app.get('/api/admin/analytics/email', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getEmailAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching email analytics:", error);
      res.status(500).json({ message: "Failed to fetch email analytics" });
    }
  });

  app.get('/api/admin/analytics/geographic', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getGeographicAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching geographic analytics:", error);
      res.status(500).json({ message: "Failed to fetch geographic analytics" });
    }
  });

  // Get pending evidence for review
  app.get('/api/admin/evidence/pending', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const evidence = await storage.getPendingEvidence();
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching pending evidence:", error);
      res.status(500).json({ message: "Failed to fetch pending evidence" });
    }
  });

  // Review evidence (approve/reject)
  app.put('/api/admin/evidence/:id/review', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { status, reviewNotes } = req.body;
      const reviewerId = req.user.id;
      
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const evidence = await storage.updateEvidenceStatus(
        req.params.id,
        status,
        reviewerId,
        reviewNotes
      );

      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }

      // Send notification email
      const user = await storage.getUser(evidence.submittedBy);
      const school = await storage.getSchool(evidence.schoolId);
      
      if (user?.email && school) {
        if (status === 'approved') {
          await sendEvidenceApprovalEmail(user.email, school.name, evidence.title);
        } else {
          await sendEvidenceRejectionEmail(user.email, school.name, evidence.title, reviewNotes || 'Please review and resubmit');
        }
      }

      res.json(evidence);
    } catch (error) {
      console.error("Error reviewing evidence:", error);
      res.status(500).json({ message: "Failed to review evidence" });
    }
  });

  // Bulk evidence review endpoint
  app.post('/api/admin/evidence/bulk-review', isAuthenticated, requireAdmin, async (req: any, res) => {
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

      // Process each evidence submission
      for (const evidenceId of evidenceIds) {
        try {
          const evidence = await storage.updateEvidenceStatus(
            evidenceId,
            status,
            reviewerId,
            reviewNotes
          );

          if (evidence) {
            results.success.push(evidenceId);

            // Send notification email (non-blocking)
            try {
              const user = await storage.getUser(evidence.submittedBy);
              const school = await storage.getSchool(evidence.schoolId);
              
              if (user?.email && school) {
                if (status === 'approved') {
                  await sendEvidenceApprovalEmail(user.email, school.name, evidence.title);
                } else {
                  await sendEvidenceRejectionEmail(user.email, school.name, evidence.title, reviewNotes || 'Please review and resubmit');
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

      res.json({
        message: `Bulk review completed. ${results.success.length} successful, ${results.failed.length} failed.`,
        results
      });
    } catch (error) {
      console.error("Error in bulk evidence review:", error);
      res.status(500).json({ message: "Failed to perform bulk review" });
    }
  });

  // Bulk delete evidence endpoint
  app.delete('/api/admin/evidence/bulk-delete', isAuthenticated, requireAdmin, async (req: any, res) => {
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
          const deleted = await storage.deleteEvidence(evidenceId);
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

  // Admin Case Study Management Routes
  
  // Get all case studies for admin management
  app.get('/api/admin/case-studies', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { stage, country, featured, search, limit, offset } = req.query;
      const caseStudies = await storage.getCaseStudies({
        stage: stage as string,
        country: country as string,
        featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
        search: search as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      res.json(caseStudies);
    } catch (error) {
      console.error("Error fetching case studies:", error);
      res.status(500).json({ message: "Failed to fetch case studies" });
    }
  });

  // Create case study from evidence
  app.post('/api/admin/case-studies/from-evidence', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { evidenceId, title, description, impact, imageUrl, featured = false, priority = 0 } = req.body;
      const userId = req.user.id;

      if (!evidenceId || !title) {
        return res.status(400).json({ message: "Evidence ID and title are required" });
      }

      // Get the evidence to verify it exists and get school info
      const evidence = await storage.getEvidence(evidenceId);
      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }

      // Create case study with link to original evidence
      const caseStudy = await storage.createCaseStudy({
        evidenceId: evidenceId,
        schoolId: evidence.schoolId,
        title,
        description: description || evidence.description,
        stage: evidence.stage,
        impact,
        imageUrl,
        featured,
        priority,
        createdBy: userId,
      });

      res.status(201).json(caseStudy);
    } catch (error) {
      console.error("Error creating case study from evidence:", error);
      res.status(500).json({ message: "Failed to create case study" });
    }
  });

  // Update case study featured status
  app.put('/api/admin/case-studies/:id/featured', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { featured } = req.body;
      
      if (typeof featured !== 'boolean') {
        return res.status(400).json({ message: "Featured must be a boolean value" });
      }

      const caseStudy = await storage.updateCaseStudyFeatured(req.params.id, featured);
      
      if (!caseStudy) {
        return res.status(404).json({ message: "Case study not found" });
      }

      res.json(caseStudy);
    } catch (error) {
      console.error("Error updating case study featured status:", error);
      res.status(500).json({ message: "Failed to update case study" });
    }
  });

  // Bulk school update endpoint
  app.post('/api/admin/schools/bulk-update', isAuthenticated, requireAdmin, async (req: any, res) => {
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

  // Bulk delete schools endpoint
  app.delete('/api/admin/schools/bulk-delete', isAuthenticated, requireAdmin, async (req: any, res) => {
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

  // Get all schools for admin management
  app.get('/api/admin/schools', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { country, stage, type, search, limit, offset } = req.query;
      const schools = await storage.getSchools({
        country: country as string,
        stage: stage as string,
        type: type as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      res.json(schools);
    } catch (error) {
      console.error("Error fetching schools:", error);
      res.status(500).json({ message: "Failed to fetch schools" });
    }
  });

  // Update school details
  app.put('/api/admin/schools/:id', isAuthenticated, requireAdmin, async (req, res) => {
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

  // Delete school
  app.delete('/api/admin/schools/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const schoolId = req.params.id;
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

  // Export analytics data as CSV/Excel (MUST come before the general export endpoint)
  app.get('/api/admin/export/analytics', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { format = 'csv' } = req.query;

      // Get all analytics data
      const [overview, schoolProgress, evidenceAnalytics, userEngagement] = await Promise.all([
        storage.getAnalyticsOverview(),
        storage.getSchoolProgressAnalytics(),
        storage.getEvidenceAnalytics(), 
        storage.getUserEngagementAnalytics()
      ]);

      // Compile comprehensive analytics summary
      const analyticsData = [
        // Overview metrics
        { category: 'Overview', metric: 'Total Schools', value: overview.totalSchools },
        { category: 'Overview', metric: 'Total Users', value: overview.totalUsers },
        { category: 'Overview', metric: 'Total Evidence', value: overview.totalEvidence },
        { category: 'Overview', metric: 'Completed Awards', value: overview.completedAwards },
        { category: 'Overview', metric: 'Pending Evidence', value: overview.pendingEvidence },
        { category: 'Overview', metric: 'Average Progress', value: `${Math.round(overview.averageProgress)}%` },
        { category: 'Overview', metric: 'Students Impacted', value: overview.studentsImpacted },
        { category: 'Overview', metric: 'Countries Reached', value: overview.countriesReached },
        
        // School progress metrics
        ...schoolProgress.stageDistribution.map(item => ({ 
          category: 'School Stages', 
          metric: `${item.stage} Schools`, 
          value: item.count 
        })),
        
        // Evidence metrics
        ...evidenceAnalytics.stageBreakdown.map(item => ({ 
          category: 'Evidence by Stage', 
          metric: `${item.stage} Approved`, 
          value: item.approved 
        })),
        
        // User engagement metrics
        ...userEngagement.roleDistribution.map(item => ({ 
          category: 'User Roles', 
          metric: `${item.role} Users`, 
          value: item.count 
        }))
      ];

      const filename = `analytics_${new Date().toISOString().split('T')[0]}`;

      if (format === 'csv') {
        const csv = generateCSV(analyticsData, 'analytics');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csv);
      } else if (format === 'excel' || format === 'xlsx') {
        const excel = generateExcel(analyticsData, 'analytics');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        res.send(excel);
      } else {
        res.json(analyticsData);
      }
    } catch (error) {
      console.error("Error exporting analytics:", error);
      res.status(500).json({ message: "Failed to export analytics data" });
    }
  });

  // Export data as CSV/Excel with filtering support
  app.get('/api/admin/export/:type', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { type } = req.params;
      const { format = 'csv', ...filters } = req.query;

      if (!['schools', 'evidence', 'users'].includes(type)) {
        return res.status(400).json({ message: "Invalid export type. Use: schools, evidence, or users" });
      }

      let data: any[] = [];
      let filename = '';

      switch (type) {
        case 'schools':
          const schoolFilters = {
            country: filters.country as string,
            stage: filters.stage as string,
            type: filters.type as string,
            search: filters.search as string,
            limit: 1000,
            offset: 0,
          };
          data = await storage.getSchools(schoolFilters);
          filename = 'schools';
          break;
        case 'evidence':
          data = await storage.getAllEvidence();
          // Apply client-side filtering for evidence if needed
          if (filters.status) {
            data = data.filter(item => item.status === filters.status);
          }
          if (filters.stage) {
            data = data.filter(item => item.stage === filters.stage);
          }
          filename = 'evidence';
          break;
        case 'users':
          data = await storage.getAllUsers();
          // Apply client-side filtering for users if needed
          if (filters.role) {
            data = data.filter(item => item.role === filters.role);
          }
          if (filters.isAdmin !== undefined) {
            data = data.filter(item => item.isAdmin === (filters.isAdmin === 'true'));
          }
          filename = 'users';
          break;
      }

      if (format === 'csv') {
        const csv = generateCSV(data, type);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
      } else if (format === 'excel' || format === 'xlsx') {
        const excel = generateExcel(data, type);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.xlsx"`);
        res.send(excel);
      } else {
        res.json(data);
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Validation schema for bulk email request
  const bulkEmailSchema = z.object({
    recipientType: z.enum(['all_teachers', 'schools', 'custom'], {
      errorMap: () => ({ message: "Invalid recipient type. Must be 'all_teachers', 'schools', or 'custom'" })
    }),
    subject: z.string().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
    content: z.string().min(1, "Content is required").max(10000, "Content must be less than 10,000 characters"),
    template: z.enum(['announcement', 'reminder', 'invitation', 'newsletter', 'custom'], {
      errorMap: () => ({ message: "Invalid template type" })
    }).default('custom'),
    recipients: z.array(
      z.string().email("Invalid email format")
    ).max(500, "Cannot send to more than 500 custom recipients").optional(),
    filters: z.object({
      search: z.string().optional(),
      country: z.string().optional(),
      stage: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional(),
  }).refine((data) => {
    // Custom recipients must be provided when recipientType is 'custom'
    if (data.recipientType === 'custom' && (!data.recipients || data.recipients.length === 0)) {
      return false;
    }
    return true;
  }, {
    message: "Recipients list is required when recipient type is 'custom'",
    path: ["recipients"],
  });

  // Bulk email API for admin
  app.post('/api/admin/send-bulk-email', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validationResult = bulkEmailSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }

      const { recipients, subject, content, template, recipientType, filters } = validationResult.data;

      let emailList: string[] = [];

      if (recipientType === 'custom' && recipients) {
        emailList = recipients;
      } else if (recipientType === 'schools') {
        // Get schools based on filters and extract teacher emails from associated users
        const schools = await storage.getSchools(filters || { limit: 1000, offset: 0 });
        const schoolIds = schools.map(s => s.id);
        
        // Get all users associated with these specific schools
        const userIdSet = new Set<string>();
        for (const schoolId of schoolIds) {
          const schoolUsers = await storage.getSchoolUsers(schoolId);
          schoolUsers.forEach(su => userIdSet.add(su.userId));
        }
        
        // Get user details for the associated users and filter for teachers with emails
        const allUsers = await storage.getAllUsers();
        emailList = allUsers
          .filter(user => userIdSet.has(user.id) && user.email && user.role === 'teacher')
          .map(user => user.email!)
          .filter(Boolean);
      } else if (recipientType === 'all_teachers') {
        const users = await storage.getAllUsers();
        emailList = users
          .filter(user => user.email && user.role === 'teacher')
          .map(user => user.email!)
          .filter(Boolean);
      }

      if (emailList.length === 0) {
        return res.status(400).json({ message: "No valid email recipients found" });
      }

      const bulkEmailParams: BulkEmailParams = {
        recipients: emailList,
        subject,
        content,
        template: template || 'custom',
      };

      const results = await sendBulkEmail(bulkEmailParams);

      res.json({
        message: "Bulk email sent successfully",
        results: {
          totalRecipients: emailList.length,
          sent: results.sent,
          failed: results.failed,
        },
      });
    } catch (error) {
      console.error("Error sending bulk email:", error);
      res.status(500).json({ message: "Failed to send bulk email" });
    }
  });

  // Mailchimp integration routes
  
  // Get Mailchimp audiences
  app.get('/api/mailchimp/audiences', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const audiences = await mailchimpService.getAudiences();
      res.json(audiences);
    } catch (error: any) {
      console.error("Error fetching Mailchimp audiences:", error);
      res.status(500).json({ message: error.message || "Failed to fetch audiences" });
    }
  });

  // Create Mailchimp audience
  app.post('/api/mailchimp/audiences', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validationResult = insertMailchimpAudienceSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid audience data", errors: validationResult.error.issues });
      }

      const audience = await storage.createMailchimpAudience(validationResult.data);
      res.status(201).json(audience);
    } catch (error: any) {
      console.error("Error creating Mailchimp audience:", error);
      res.status(500).json({ message: "Failed to create audience" });
    }
  });

  // Subscribe user to newsletter
  app.post('/api/mailchimp/subscribe', async (req, res) => {
    try {
      const { email, firstName, lastName, schoolName, schoolCountry, tags } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const audienceId = process.env.MAILCHIMP_MAIN_AUDIENCE_ID;
      if (!audienceId) {
        return res.status(500).json({ message: "Newsletter signup not configured" });
      }

      const success = await mailchimpService.addContactToAudience(audienceId, {
        email,
        firstName,
        lastName,
        schoolName,
        schoolCountry,
        tags: tags || ['newsletter_signup'],
      });

      if (success) {
        // Track subscription in database
        await storage.createMailchimpSubscription({
          audienceId,
          email,
          status: 'subscribed',
          tags: JSON.stringify(tags || ['newsletter_signup']),
          mergeFields: JSON.stringify({ firstName, lastName, schoolName, schoolCountry }),
        });

        res.json({ message: "Successfully subscribed to newsletter" });
      } else {
        res.status(500).json({ message: "Failed to subscribe to newsletter" });
      }
    } catch (error: any) {
      console.error("Error subscribing to newsletter:", error);
      res.status(500).json({ message: "Failed to subscribe to newsletter" });
    }
  });

  // Get subscriptions for admin
  app.get('/api/admin/mailchimp/subscriptions', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { audienceId, email } = req.query;
      const subscriptions = await storage.getMailchimpSubscriptions(
        audienceId as string,
        email as string
      );
      res.json(subscriptions);
    } catch (error: any) {
      console.error("Error fetching Mailchimp subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  // Create and send Mailchimp campaign
  app.post('/api/admin/mailchimp/campaigns', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { subject, title, content, audienceId, fromName, fromEmail, tags } = req.body;
      
      if (!subject || !title || !content || !audienceId) {
        return res.status(400).json({ message: "Subject, title, content, and audience ID are required" });
      }

      const campaign = await mailchimpService.createCampaign({
        subject,
        title,
        content,
        audienceId,
        fromName,
        fromEmail,
        tags,
      });

      if (campaign) {
        res.status(201).json({
          message: "Campaign created successfully",
          campaignId: campaign.campaignId,
          webId: campaign.webId,
        });
      } else {
        res.status(500).json({ message: "Failed to create campaign" });
      }
    } catch (error: any) {
      console.error("Error creating Mailchimp campaign:", error);
      res.status(500).json({ message: error.message || "Failed to create campaign" });
    }
  });

  // Send existing campaign
  app.post('/api/admin/mailchimp/campaigns/:campaignId/send', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { campaignId } = req.params;
      const success = await mailchimpService.sendCampaign(campaignId);
      
      if (success) {
        res.json({ message: "Campaign sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send campaign" });
      }
    } catch (error: any) {
      console.error("Error sending Mailchimp campaign:", error);
      res.status(500).json({ message: error.message || "Failed to send campaign" });
    }
  });

  // Get campaign statistics
  app.get('/api/admin/mailchimp/campaigns/:campaignId/stats', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { campaignId } = req.params;
      const stats = await mailchimpService.getCampaignStats(campaignId);
      
      if (stats) {
        res.json(stats);
      } else {
        res.status(404).json({ message: "Campaign stats not found" });
      }
    } catch (error: any) {
      console.error("Error fetching campaign stats:", error);
      res.status(500).json({ message: error.message || "Failed to fetch campaign stats" });
    }
  });

  // Email system health check endpoint
  app.get('/api/admin/email/health', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const health: {
        sendgrid: {
          configured: boolean;
          apiKey: string;
          fromEmail: string;
        };
        mailchimp: {
          configured: boolean;
          apiKey: string;
          serverPrefix: string;
          mainAudienceId: string;
        };
        environment: {
          frontendUrl: string;
          nodeEnv: string;
        };
        lastEmailLogs: Array<{
          id: string;
          recipientEmail: string;
          subject: string;
          status: string | null;
          template: string | null;
          sentAt: Date | null;
        }> | string;
      } = {
        sendgrid: {
          configured: !!process.env.SENDGRID_API_KEY,
          apiKey: process.env.SENDGRID_API_KEY ? `${process.env.SENDGRID_API_KEY.substring(0, 8)}...` : 'Not set',
          fromEmail: process.env.FROM_EMAIL || 'Not set (will use default)',
        },
        mailchimp: {
          configured: !!(process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_SERVER_PREFIX),
          apiKey: process.env.MAILCHIMP_API_KEY ? `${process.env.MAILCHIMP_API_KEY.substring(0, 8)}...` : 'Not set',
          serverPrefix: process.env.MAILCHIMP_SERVER_PREFIX || 'Not set',
          mainAudienceId: process.env.MAILCHIMP_MAIN_AUDIENCE_ID || 'Not set',
        },
        environment: {
          frontendUrl: process.env.FRONTEND_URL || 'Not set (will use default)',
          nodeEnv: process.env.NODE_ENV || 'development',
        },
        lastEmailLogs: []
      };

      // Get recent email logs
      try {
        const recentLogs = await storage.getEmailLogs(10); // Get last 10 email logs
        health.lastEmailLogs = recentLogs.map(log => ({
          id: log.id,
          recipientEmail: log.recipientEmail,
          subject: log.subject,
          status: log.status,
          template: log.template,
          sentAt: log.sentAt,
        }));
      } catch (logError) {
        console.warn('Could not fetch email logs for health check:', logError);
        health.lastEmailLogs = 'Could not fetch email logs';
      }

      res.json(health);
    } catch (error: any) {
      console.error("Error checking email health:", error);
      res.status(500).json({ message: "Failed to check email system health" });
    }
  });

  // Test email endpoint for administrators
  app.post('/api/admin/email/test', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { email } = req.body;
      const testEmail = email || req.user.email;
      
      if (!testEmail) {
        return res.status(400).json({ message: "Email address is required" });
      }

      if (!process.env.SENDGRID_API_KEY) {
        return res.status(500).json({ 
          message: "SendGrid not configured. Please set SENDGRID_API_KEY environment variable." 
        });
      }

      const success = await sendEmail({
        to: testEmail,
        from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
        subject: 'Test Email - Plastic Clever Schools Email System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0B3D5D 0%, #019ADE 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🧪 Email System Test</h1>
            </div>
            <div style="padding: 40px 20px; background: #f9f9f9;">
              <h2 style="color: #0B3D5D;">Email System Working!</h2>
              <p style="color: #666; line-height: 1.6;">
                This is a test email from the Plastic Clever Schools email notification system. 
                If you're receiving this, your email configuration is working correctly.
              </p>
              <div style="background: #fff; border-left: 4px solid #02BBB4; padding: 20px; margin: 20px 0;">
                <h3 style="color: #02BBB4; margin-top: 0;">System Information:</h3>
                <ul style="color: #666; margin-bottom: 0;">
                  <li><strong>Sent at:</strong> ${new Date().toISOString()}</li>
                  <li><strong>From:</strong> ${process.env.FROM_EMAIL || 'noreply@plasticclever.org'}</li>
                  <li><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</li>
                </ul>
              </div>
            </div>
            <div style="background: #0B3D5D; color: white; padding: 20px; text-align: center; font-size: 14px;">
              <p>© 2024 Plastic Clever Schools. Email System Test.</p>
            </div>
          </div>
        `,
      });

      if (success) {
        res.json({ 
          message: `Test email sent successfully to ${testEmail}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({ 
          message: "Failed to send test email. Check SendGrid configuration.",
        });
      }
    } catch (error: any) {
      console.error("Error sending test email:", error);
      res.status(500).json({ 
        message: "Failed to send test email",
        error: error.message,
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
