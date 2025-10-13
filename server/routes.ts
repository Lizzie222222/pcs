import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isSchoolMember } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission, getObjectAclPolicy } from "./objectAcl";
import { sendWelcomeEmail, sendEvidenceApprovalEmail, sendEvidenceRejectionEmail, sendEvidenceSubmissionEmail, sendAdminNewEvidenceEmail, sendBulkEmail, BulkEmailParams, sendEmail, sendVerificationApprovalEmail, sendVerificationRejectionEmail, sendTeacherInvitationEmail, sendVerificationRequestEmail, sendAdminInvitationEmail, sendPartnerInvitationEmail, sendAuditSubmissionEmail, sendAuditApprovalEmail, sendAuditRejectionEmail, sendAdminNewAuditEmail, sendEventRegistrationEmail, sendEventCancellationEmail, sendEventReminderEmail, sendEventUpdatedEmail, sendEventAnnouncementEmail, sendEventDigestEmail } from "./emailService";
import { mailchimpService } from "./mailchimpService";
import { insertSchoolSchema, insertEvidenceSchema, insertEvidenceRequirementSchema, insertMailchimpAudienceSchema, insertMailchimpSubscriptionSchema, insertTeacherInvitationSchema, insertVerificationRequestSchema, insertAuditResponseSchema, insertReductionPromiseSchema, insertEventSchema, insertEventRegistrationSchema, type VerificationRequest, users } from "@shared/schema";
import { z } from "zod";
import * as XLSX from 'xlsx';
import { randomUUID, randomBytes } from 'crypto';
import { db } from "./db";
import { eq } from "drizzle-orm";
import { generateAnalyticsInsights } from "./lib/aiInsights";

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

  // Get all schools (for join school flow)
  app.get('/api/schools', async (req, res) => {
    try {
      const { country, type, search, limit, offset } = req.query;
      const schools = await storage.getSchools({
        country: country as string,
        type: type as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      
      // Filter by search term if provided
      let filteredSchools = schools;
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        filteredSchools = schools.filter(school => 
          school.name.toLowerCase().includes(searchLower) ||
          school.country.toLowerCase().includes(searchLower)
        );
      }
      
      res.json(filteredSchools);
    } catch (error) {
      console.error("Error fetching schools:", error);
      res.status(500).json({ message: "Failed to fetch schools" });
    }
  });

  // Check email domain for existing schools (public)
  app.get('/api/schools/check-domain', async (req, res) => {
    try {
      const { email } = req.query;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ 
          message: "Email parameter is required" 
        });
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          message: "Invalid email format" 
        });
      }
      
      const domain = email.split('@')[1].toLowerCase();
      
      const publicDomains = [
        'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
        'icloud.com', 'aol.com', 'protonmail.com', 'mail.com',
        'yandex.com', 'zoho.com', 'gmx.com', 'live.com',
        'msn.com', 'qq.com', '163.com', 'sina.com'
      ];
      
      if (publicDomains.includes(domain)) {
        return res.json({ 
          matchingSchools: [],
          note: "Public email provider detected. Schools cannot be suggested for generic email domains."
        });
      }
      
      const schoolsWithDomain = await storage.findSchoolsByEmailDomain(domain);
      
      const matchingSchools = schoolsWithDomain.map(school => ({
        school: {
          id: school.id,
          name: school.name,
          country: school.country,
          type: school.type,
          currentStage: school.currentStage,
          studentCount: school.studentCount,
        },
        matchCount: school.userEmails.length,
      }));
      
      console.log(`Email domain check for ${domain}: Found ${matchingSchools.length} school(s)`);
      
      res.json({ matchingSchools });
    } catch (error) {
      console.error("Error checking email domain:", error);
      res.status(500).json({ message: "Failed to check email domain" });
    }
  });

  // Get single school by ID
  app.get('/api/schools/:schoolId', isAuthenticated, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const userId = req.user.id;

      const school = await storage.getSchool(schoolId);
      
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      // Verify user has access to this school (or is admin)
      const schools = await storage.getUserSchools(userId);
      const hasAccess = schools.some(s => s.id === schoolId) || req.user.isAdmin;
      
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this school" });
      }

      res.json(school);
    } catch (error) {
      console.error("Error fetching school:", error);
      res.status(500).json({ message: "Failed to fetch school" });
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

  // Multi-step school registration (authenticated)
  app.post('/api/schools/register-multi-step', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Validate the multi-step registration data
      const multiStepSchema = z.object({
        // Step 1: School Info
        country: z.string().min(1),
        schoolName: z.string().min(1).max(200),
        adminEmail: z.string().email().optional().or(z.literal('')),
        address: z.string().min(1),
        postcode: z.string().optional(),
        zipCode: z.string().optional(),
        primaryLanguage: z.string().min(1),
        // Step 2: Teacher Info
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        teacherRole: z.string().optional(),
        referralSource: z.string().optional(),
        // Step 3: Student Info
        studentCount: z.number().min(1).max(10000),
        ageRanges: z.array(z.string()).min(1),
        showOnMap: z.boolean().default(false),
        gdprConsent: z.boolean().refine(val => val === true, { message: "GDPR consent is required" }),
        acceptTerms: z.boolean().refine(val => val === true, { message: "Terms acceptance is required" }),
      });

      const data = multiStepSchema.parse(req.body);

      // Update user info if different from auth
      if (data.firstName !== req.user.firstName || data.lastName !== req.user.lastName || data.email !== req.user.email) {
        await storage.updateUser(userId, {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
        });
      }

      // Create school with all the collected data
      const school = await storage.createSchool({
        name: data.schoolName,
        country: data.country,
        address: data.address,
        adminEmail: data.adminEmail || undefined,
        postcode: data.postcode,
        zipCode: data.zipCode,
        primaryLanguage: data.primaryLanguage,
        ageRanges: data.ageRanges,
        studentCount: data.studentCount,
        showOnMap: data.showOnMap,
        registrationCompleted: true,
        primaryContactId: userId,
      });

      // Add user to school with teacher info
      await storage.addUserToSchool({
        schoolId: school.id,
        userId: userId,
        role: 'head_teacher',
        teacherRole: data.teacherRole,
        referralSource: data.referralSource,
      });

      // Send welcome email (non-blocking)
      try {
        await sendWelcomeEmail(req.user.email!, school.name);
      } catch (emailError) {
        console.warn('Welcome email failed to send:', emailError);
      }

      // Add to Mailchimp automation (non-blocking)
      try {
        await mailchimpService.setupSchoolSignupAutomation({
          email: req.user.email!,
          firstName: data.firstName,
          lastName: data.lastName,
          schoolName: school.name,
          schoolCountry: school.country,
          role: 'teacher',
          tags: ['new_school_signup', 'teacher', school.currentStage || 'inspire', 'multi_step_registration'],
        });
      } catch (mailchimpError) {
        console.warn('Mailchimp automation failed for school signup:', mailchimpError);
      }

      res.status(201).json({ 
        message: "School registered successfully",
        school: school,
      });
    } catch (error) {
      console.error("Error in multi-step school registration:", error);
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
  
  // GET /api/invitations/:token - Get invitation details by token
  app.get('/api/invitations/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      console.log(`[Get Invitation] Fetching invitation details for token ${token}`);
      
      // Get invitation by token
      const invitation = await storage.getTeacherInvitationByToken(token);
      
      if (!invitation) {
        console.log(`[Get Invitation] Invitation not found`);
        return res.status(404).json({ message: "Invitation not found or has expired" });
      }
      
      // Check if invitation is expired
      if (new Date() > new Date(invitation.expiresAt)) {
        console.log(`[Get Invitation] Invitation expired`);
        return res.status(410).json({ message: "This invitation has expired" });
      }
      
      // Check if already accepted
      if (invitation.status === 'accepted') {
        console.log(`[Get Invitation] Invitation already accepted`);
        return res.status(410).json({ message: "This invitation has already been accepted" });
      }
      
      // Get school and inviter details
      const school = await storage.getSchool(invitation.schoolId);
      const inviter = await storage.getUser(invitation.invitedBy);
      
      console.log(`[Get Invitation] Returning invitation details for ${invitation.email}`);
      
      res.json({
        email: invitation.email,
        schoolName: school?.name || 'Unknown School',
        schoolCountry: school?.country,
        inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() : 'A colleague',
        expiresAt: invitation.expiresAt,
        status: invitation.status,
      });
    } catch (error) {
      console.error("[Get Invitation] Error:", error);
      res.status(500).json({ message: "Failed to fetch invitation details" });
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
      
      // Get user's role in this school
      const schoolUser = await storage.getSchoolUser(school.id, userId);
      
      // Get evidence counts with progression info
      const evidenceCounts = await storage.getSchoolEvidenceCounts(school.id);
      
      res.json({
        school,
        recentEvidence: evidence.slice(0, 5), // Latest 5 submissions
        schoolUser: schoolUser ? {
          role: schoolUser.role,
          isVerified: schoolUser.isVerified,
        } : null,
        evidenceCounts,
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

      // Get school to check stage lock status
      const school = await storage.getSchool(evidenceData.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      // Check if stage is unlocked
      const isStageUnlocked = (stage: string): boolean => {
        if (stage === 'inspire') return true;
        if (stage === 'investigate') return school.inspireCompleted === true;
        if (stage === 'act') return school.investigateCompleted === true;
        return false;
      };

      if (!isStageUnlocked(evidenceData.stage)) {
        return res.status(403).json({ 
          message: "Cannot submit evidence to locked stage. Complete the previous stage first." 
        });
      }

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

  // Delete pending evidence
  app.delete('/api/evidence/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Get evidence by ID
      const evidence = await storage.getEvidence(id);
      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }

      // Check if evidence status is 'pending'
      if (evidence.status !== 'pending') {
        return res.status(403).json({ message: "Only pending evidence can be deleted" });
      }

      // Verify user is a member of the school that submitted the evidence
      const userSchools = await storage.getUserSchools(userId);
      const hasPermission = userSchools.some(school => school.id === evidence.schoolId);
      
      if (!hasPermission) {
        return res.status(403).json({ message: "You don't have permission to delete this evidence" });
      }

      // Delete the evidence
      const deleted = await storage.deleteEvidence(id);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete evidence" });
      }

      res.json({ message: "Evidence deleted successfully" });
    } catch (error) {
      console.error("Error deleting evidence:", error);
      res.status(500).json({ message: "Failed to delete evidence" });
    }
  });

  // Evidence Requirements endpoints

  // Get all evidence requirements (public, optional stage filter)
  app.get('/api/evidence-requirements', async (req, res) => {
    try {
      const { stage } = req.query;
      const requirements = await storage.getEvidenceRequirements(stage as string);
      res.json(requirements);
    } catch (error) {
      console.error("Error fetching evidence requirements:", error);
      res.status(500).json({ message: "Failed to fetch evidence requirements" });
    }
  });

  // Get single evidence requirement (public)
  app.get('/api/evidence-requirements/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const requirement = await storage.getEvidenceRequirement(id);
      
      if (!requirement) {
        return res.status(404).json({ message: "Evidence requirement not found" });
      }
      
      res.json(requirement);
    } catch (error) {
      console.error("Error fetching evidence requirement:", error);
      res.status(500).json({ message: "Failed to fetch evidence requirement" });
    }
  });

  // Create evidence requirement (admin only)
  app.post('/api/evidence-requirements', isAuthenticated, async (req: any, res) => {
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
      const requirement = await storage.createEvidenceRequirement(requirementData);
      
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

  // Update evidence requirement (admin only)
  app.patch('/api/evidence-requirements/:id', isAuthenticated, async (req: any, res) => {
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
      
      // Validate partial update data
      const updateData = insertEvidenceRequirementSchema.partial().parse(req.body);
      
      const requirement = await storage.updateEvidenceRequirement(id, updateData);
      
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

  // Delete evidence requirement (admin only)
  app.delete('/api/evidence-requirements/:id', isAuthenticated, async (req: any, res) => {
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
      
      const deleted = await storage.deleteEvidenceRequirement(id);
      
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

  // Start a new round for the school
  app.post('/api/schools/:schoolId/start-round', isAuthenticated, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const userId = req.user.id;

      // Verify user has access to this school
      const schools = await storage.getUserSchools(userId);
      const hasAccess = schools.some(s => s.id === schoolId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this school" });
      }

      // Get school to check if round is complete
      const school = await storage.getSchool(schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      if (!school.awardCompleted) {
        return res.status(400).json({ 
          message: "Current round must be completed before starting a new round" 
        });
      }

      // Start new round
      const updatedSchool = await storage.startNewRound(schoolId);
      
      if (!updatedSchool) {
        return res.status(500).json({ message: "Failed to start new round" });
      }

      res.json(updatedSchool);
    } catch (error) {
      console.error("Error starting new round:", error);
      res.status(500).json({ message: "Failed to start new round" });
    }
  });

  // Certificate routes
  app.get('/api/schools/:schoolId/certificates', isAuthenticated, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const userId = req.user.id;

      // Verify user has access to this school
      const schools = await storage.getUserSchools(userId);
      const hasAccess = schools.some(s => s.id === schoolId) || req.user.isAdmin;
      
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this school" });
      }

      const certificates = await storage.getCertificatesBySchool(schoolId);
      res.json(certificates);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      res.status(500).json({ message: "Failed to fetch certificates" });
    }
  });

  app.get('/api/certificates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const certificate = await storage.getCertificate(req.params.id);
      
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }

      // Verify user has access to this school's certificate (or is admin)
      const userId = req.user.id;
      const schools = await storage.getUserSchools(userId);
      const hasAccess = schools.some(s => s.id === certificate.schoolId) || req.user.isAdmin;
      
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this certificate" });
      }

      res.json(certificate);
    } catch (error) {
      console.error("Error fetching certificate:", error);
      res.status(500).json({ message: "Failed to fetch certificate" });
    }
  });

  app.get('/api/certificates/number/:certificateNumber', isAuthenticated, async (req: any, res) => {
    try {
      const certificate = await storage.getCertificateByNumber(req.params.certificateNumber);
      
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }

      // Verify user has access to this school's certificate (or is admin)
      const userId = req.user.id;
      const schools = await storage.getUserSchools(userId);
      const hasAccess = schools.some(s => s.id === certificate.schoolId) || req.user.isAdmin;
      
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this certificate" });
      }

      res.json(certificate);
    } catch (error) {
      console.error("Error fetching certificate:", error);
      res.status(500).json({ message: "Failed to fetch certificate" });
    }
  });

  // School analytics route
  app.get('/api/schools/:schoolId/analytics', isSchoolMember, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const analytics = await storage.getSchoolAnalytics(schoolId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching school analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Audit analytics route
  app.get('/api/schools/:schoolId/audit-analytics', isSchoolMember, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      
      // Fetch the approved audit for the school
      const audit = await storage.getSchoolAudit(schoolId);
      
      if (!audit || audit.status !== 'approved') {
        return res.status(404).json({ 
          message: "No approved audit found",
          hasAudit: false 
        });
      }

      // Parse the audit data
      const part2Data = audit.part2Data as any || {};
      const part3Data = audit.part3Data as any || {};
      const part4Data = audit.part4Data as any || {};

      // Calculate location breakdown
      const lunchroomTotal = 
        parseInt(part2Data.lunchroomPlasticBottles || '0') +
        parseInt(part2Data.lunchroomPlasticCups || '0') +
        parseInt(part2Data.lunchroomPlasticCutlery || '0') +
        parseInt(part2Data.lunchroomPlasticStraws || '0') +
        parseInt(part2Data.lunchroomFoodPackaging || '0') +
        parseInt(part2Data.lunchroomClingFilm || '0');

      const staffroomTotal = 
        parseInt(part2Data.staffroomPlasticBottles || '0') +
        parseInt(part2Data.staffroomPlasticCups || '0') +
        parseInt(part2Data.staffroomFoodPackaging || '0');

      const classroomsTotal = 
        parseInt(part3Data.classroomPensPencils || '0') +
        parseInt(part3Data.classroomStationery || '0') +
        parseInt(part3Data.classroomDisplayMaterials || '0') +
        parseInt(part3Data.classroomToys || '0');

      const bathroomsTotal = 
        parseInt(part3Data.bathroomSoapBottles || '0') +
        parseInt(part3Data.bathroomBinLiners || '0') +
        parseInt(part3Data.bathroomCupsPaper || '0');

      // Build detailed plastic items list with location context
      const plasticItems: { name: string; count: number; location: string }[] = [
        { name: 'Plastic Bottles', count: parseInt(part2Data.lunchroomPlasticBottles || '0'), location: 'Lunchroom' },
        { name: 'Plastic Cups', count: parseInt(part2Data.lunchroomPlasticCups || '0'), location: 'Lunchroom' },
        { name: 'Plastic Cutlery', count: parseInt(part2Data.lunchroomPlasticCutlery || '0'), location: 'Lunchroom' },
        { name: 'Plastic Straws', count: parseInt(part2Data.lunchroomPlasticStraws || '0'), location: 'Lunchroom' },
        { name: 'Food Packaging', count: parseInt(part2Data.lunchroomFoodPackaging || '0'), location: 'Lunchroom' },
        { name: 'Cling Film', count: parseInt(part2Data.lunchroomClingFilm || '0'), location: 'Lunchroom' },
        { name: 'Plastic Bottles', count: parseInt(part2Data.staffroomPlasticBottles || '0'), location: 'Staffroom' },
        { name: 'Plastic Cups', count: parseInt(part2Data.staffroomPlasticCups || '0'), location: 'Staffroom' },
        { name: 'Food Packaging', count: parseInt(part2Data.staffroomFoodPackaging || '0'), location: 'Staffroom' },
        { name: 'Pens & Pencils', count: parseInt(part3Data.classroomPensPencils || '0'), location: 'Classrooms' },
        { name: 'Stationery Items', count: parseInt(part3Data.classroomStationery || '0'), location: 'Classrooms' },
        { name: 'Display Materials', count: parseInt(part3Data.classroomDisplayMaterials || '0'), location: 'Classrooms' },
        { name: 'Toys/Equipment', count: parseInt(part3Data.classroomToys || '0'), location: 'Classrooms' },
        { name: 'Soap Bottles', count: parseInt(part3Data.bathroomSoapBottles || '0'), location: 'Bathrooms' },
        { name: 'Bin Liners', count: parseInt(part3Data.bathroomBinLiners || '0'), location: 'Bathrooms' },
        { name: 'Cups/Dispensers', count: parseInt(part3Data.bathroomCupsPaper || '0'), location: 'Bathrooms' },
      ];

      // Get top 5 problem plastics (with location context)
      const topProblemPlastics = plasticItems
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(item => ({
          name: `${item.name} (${item.location})`,
          count: item.count
        }));

      const analyticsData = {
        hasAudit: true,
        totalPlasticItems: audit.totalPlasticItems || 0,
        locationBreakdown: {
          lunchroom: lunchroomTotal,
          staffroom: staffroomTotal,
          classrooms: classroomsTotal,
          bathrooms: bathroomsTotal,
        },
        topProblemPlastics,
        wasteManagement: {
          hasRecycling: part4Data.hasRecyclingBins || false,
          recyclingBinLocations: part4Data.recyclingBinLocations || null,
          plasticWasteDestination: part4Data.plasticWasteDestination || null,
          hasComposting: part4Data.compostsOrganicWaste || false,
          hasPolicy: part4Data.hasPlasticReductionPolicy || false,
          policyDetails: part4Data.reductionPolicyDetails || null,
        },
      };

      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching audit analytics:", error);
      res.status(500).json({ message: "Failed to fetch audit analytics" });
    }
  });

  // Object storage routes for evidence files
  
  // Serve objects with ACL check (both public and private)
  app.get("/objects/:objectPath(*)", async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    const shouldDownload = req.query.download === 'true';
    
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      // Check if object is public first (fast path for public objects)
      const aclPolicy = await getObjectAclPolicy(objectFile);
      
      if (aclPolicy?.visibility === 'public') {
        // Public objects are accessible to everyone
        if (shouldDownload) {
          const [metadata] = await objectFile.getMetadata();
          const filename = metadata.metadata?.filename || req.path.split('/').pop() || 'download';
          res.set('Content-Disposition', `attachment; filename="${filename}"`);
        }
        return objectStorageService.downloadObject(objectFile, res);
      }
      
      // For private objects, require authentication
      if (!req.isAuthenticated() || !req.user) {
        return res.sendStatus(401);
      }
      
      // Check access with user credentials and admin status
      const userId = req.user.id;
      const isAdmin = req.user.isAdmin || false;
      
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
        isAdmin: isAdmin,
      });
      
      if (!canAccess) {
        return res.sendStatus(403);
      }
      
      if (shouldDownload) {
        const [metadata] = await objectFile.getMetadata();
        const filename = metadata.metadata?.filename || req.path.split('/').pop() || 'download';
        res.set('Content-Disposition', `attachment; filename="${filename}"`);
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
    const filename = req.body.filename;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.fileURL,
        {
          owner: userId,
          visibility: visibility,
        },
        filename,
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

  // Middleware to allow both admin and partner roles
  const requireAdminOrPartner = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || (!user.isAdmin && user.role !== 'partner')) {
        return res.status(403).json({ message: "Admin or Partner access required" });
      }

      // Attach user to request for later checks
      req.adminUser = user;
      next();
    } catch (error) {
      console.error("Error checking admin/partner status:", error);
      res.status(500).json({ message: "Failed to verify access status" });
    }
  };

  // Middleware to block partners from specific actions (role assignment, data downloads)
  const requireFullAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin || user.role === 'partner') {
        return res.status(403).json({ message: "Full admin access required. Partners cannot perform this action." });
      }

      next();
    } catch (error) {
      console.error("Error checking full admin status:", error);
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
      const { startDate, endDate } = req.query;
      const analytics = await storage.getAnalyticsOverview(
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics overview:", error);
      res.status(500).json({ message: "Failed to fetch analytics overview" });
    }
  });

  app.get('/api/admin/analytics/school-progress', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await storage.getSchoolProgressAnalytics(
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching school progress analytics:", error);
      res.status(500).json({ message: "Failed to fetch school progress analytics" });
    }
  });

  app.get('/api/admin/analytics/evidence', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await storage.getEvidenceAnalytics(
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching evidence analytics:", error);
      res.status(500).json({ message: "Failed to fetch evidence analytics" });
    }
  });

  app.get('/api/admin/analytics/user-engagement', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await storage.getUserEngagementAnalytics(
        startDate as string | undefined,
        endDate as string | undefined
      );
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

  // Audit analytics endpoints
  app.get('/api/admin/analytics/audit-overview', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getAuditOverviewAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching audit overview analytics:", error);
      res.status(500).json({ message: "Failed to fetch audit overview analytics" });
    }
  });

  app.get('/api/admin/analytics/audit-by-school', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getAuditBySchoolAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching audit by school analytics:", error);
      res.status(500).json({ message: "Failed to fetch audit by school analytics" });
    }
  });

  app.get('/api/admin/analytics/waste-trends', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getWasteTrendsAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching waste trends analytics:", error);
      res.status(500).json({ message: "Failed to fetch waste trends analytics" });
    }
  });

  // AI-powered analytics insights generation
  app.post('/api/admin/analytics/generate-insights', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log('[Generate Insights] Request received from admin');
      
      // Validate request body
      const analyticsDataSchema = z.object({
        overview: z.any().optional(),
        schoolEvidence: z.any().optional(),
        evidenceAnalytics: z.any().optional(),
        userEngagement: z.any().optional(),
        dateRange: z.object({
          start: z.string(),
          end: z.string()
        }).optional()
      });

      const analyticsData = analyticsDataSchema.parse(req.body);
      
      // Generate AI insights using OpenAI GPT-5
      const insights = await generateAnalyticsInsights(analyticsData);
      
      console.log('[Generate Insights] Successfully generated AI insights');
      res.json(insights);
    } catch (error) {
      console.error("Error generating analytics insights:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid analytics data provided", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: "Failed to generate analytics insights",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Export analytics report as PDF
  app.post('/api/admin/analytics/export-pdf', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log('[Export PDF] Request received from admin');
      
      // Validate request body
      const exportRequestSchema = z.object({
        dateRange: z.object({
          start: z.string(),
          end: z.string()
        }),
        includeInsights: z.boolean().default(true)
      });

      const { dateRange, includeInsights } = exportRequestSchema.parse(req.body);
      
      console.log('[Export PDF] Fetching analytics data for date range:', dateRange);
      
      // Fetch all analytics data sets
      const [overview, schoolEvidence, evidenceAnalytics, userEngagement] = await Promise.all([
        storage.getAnalyticsOverview(dateRange.start, dateRange.end),
        storage.getSchoolProgressAnalytics(dateRange.start, dateRange.end),
        storage.getEvidenceAnalytics(dateRange.start, dateRange.end),
        storage.getUserEngagementAnalytics(dateRange.start, dateRange.end)
      ]);
      
      // Generate AI insights if requested
      let aiInsights;
      if (includeInsights) {
        console.log('[Export PDF] Generating AI insights...');
        aiInsights = await generateAnalyticsInsights({
          overview,
          schoolEvidence,
          evidenceAnalytics,
          userEngagement,
          dateRange
        });
      } else {
        // Provide default insights structure if not requested
        aiInsights = {
          executiveSummary: "This report provides a comprehensive overview of Plastic Clever Schools program performance during the selected period.",
          keyInsights: [],
          trends: [],
          recommendations: []
        };
      }
      
      // Prepare report data
      const reportData = {
        dateRange,
        overview,
        schoolEvidence,
        evidenceAnalytics,
        userEngagement,
        aiInsights
      };
      
      console.log('[Export PDF] Generating HTML report...');
      
      // Import report template (dynamic import to avoid circular dependencies)
      const { generateHTMLReport } = await import('./lib/reportTemplate');
      const htmlReport = generateHTMLReport(reportData);
      
      console.log('[Export PDF] Converting HTML to PDF...');
      
      // Import PDF generator
      const { generatePDFReport } = await import('./lib/pdfGenerator');
      const pdfBuffer = await generatePDFReport(htmlReport);
      
      console.log('[Export PDF] PDF generated successfully');
      
      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      const filename = `analytics-report-${date}.pdf`;
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Send PDF buffer
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('[Export PDF] Error exporting report:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: "Failed to export PDF report",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get evidence with optional status filter
  app.get('/api/admin/evidence', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const status = req.query.status as 'pending' | 'approved' | 'rejected' | undefined;
      const evidence = await storage.getAllEvidence(status);
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching evidence:", error);
      res.status(500).json({ message: "Failed to fetch evidence" });
    }
  });

  // Get pending evidence for review (kept for backward compatibility)
  app.get('/api/admin/evidence/pending', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const evidence = await storage.getPendingEvidence();
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching pending evidence:", error);
      res.status(500).json({ message: "Failed to fetch pending evidence" });
    }
  });

  // Get approved and public evidence for case studies
  app.get('/api/admin/evidence/approved-public', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const evidence = await storage.getApprovedPublicEvidence();
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching approved public evidence:", error);
      res.status(500).json({ message: "Failed to fetch approved public evidence" });
    }
  });

  // Migration endpoint: Normalize evidence file URLs
  app.post('/api/admin/evidence/migrate-urls', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const allEvidence = await storage.getAllEvidence();
      let updatedCount = 0;

      for (const evidenceItem of allEvidence) {
        if (evidenceItem.files && Array.isArray(evidenceItem.files) && evidenceItem.files.length > 0) {
          let hasChanges = false;
          const updatedFiles = evidenceItem.files.map((file: any) => {
            if (file.url && file.url.startsWith('https://storage.googleapis.com/')) {
              const normalizedUrl = objectStorageService.normalizeObjectEntityPath(file.url);
              if (normalizedUrl !== file.url) {
                hasChanges = true;
                return { ...file, url: normalizedUrl };
              }
            }
            return file;
          });

          if (hasChanges) {
            await storage.updateEvidenceFiles(evidenceItem.id, updatedFiles);
            updatedCount++;
          }
        }
      }

      res.json({ 
        success: true, 
        message: `Successfully normalized URLs for ${updatedCount} evidence records`,
        updatedCount 
      });
    } catch (error) {
      console.error("Error migrating evidence URLs:", error);
      res.status(500).json({ message: "Failed to migrate evidence URLs" });
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

      // Check and update school progression if approved
      if (status === 'approved') {
        await storage.checkAndUpdateSchoolProgression(evidence.schoolId);
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

      const affectedSchools = new Set<string>();

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
            
            // Track affected schools for progression check
            if (status === 'approved') {
              affectedSchools.add(evidence.schoolId);
            }

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

      // Check progression for all affected schools
      for (const schoolId of Array.from(affectedSchools)) {
        try {
          await storage.checkAndUpdateSchoolProgression(schoolId);
        } catch (error) {
          console.warn(`Failed to check progression for school ${schoolId}:`, error);
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

  // Audit Routes
  
  // Create or update audit (save progress)
  app.post('/api/audits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const auditData = insertAuditResponseSchema.parse({
        ...req.body,
        submittedBy: userId,
      });

      // Check if audit already exists for this school
      const existingAudit = await storage.getSchoolAudit(auditData.schoolId);
      
      let audit;
      if (existingAudit && existingAudit.status === 'draft') {
        // Update existing draft
        audit = await storage.updateAudit(existingAudit.id, auditData);
      } else if (!existingAudit) {
        // Create new audit
        audit = await storage.createAudit(auditData);
      } else {
        return res.status(400).json({ message: "Audit already submitted for this school" });
      }

      res.status(201).json(audit);
    } catch (error) {
      console.error("Error saving audit:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save audit" });
    }
  });

  // Get school audit
  app.get('/api/audits/school/:schoolId', isAuthenticated, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const audit = await storage.getSchoolAudit(schoolId);
      
      if (!audit) {
        return res.status(404).json({ message: "No audit found for this school" });
      }

      res.json(audit);
    } catch (error) {
      console.error("Error fetching school audit:", error);
      res.status(500).json({ message: "Failed to fetch audit" });
    }
  });

  // Get specific audit
  app.get('/api/audits/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const audit = await storage.getAudit(id);
      
      if (!audit) {
        return res.status(404).json({ message: "Audit not found" });
      }

      res.json(audit);
    } catch (error) {
      console.error("Error fetching audit:", error);
      res.status(500).json({ message: "Failed to fetch audit" });
    }
  });

  // Submit audit for review
  app.post('/api/audits/:id/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const audit = await storage.submitAudit(id, userId);
      
      if (!audit) {
        return res.status(404).json({ message: "Audit not found or unauthorized" });
      }

      // Send email notifications (non-blocking)
      try {
        const user = await storage.getUser(userId);
        const school = await storage.getSchool(audit.schoolId);
        
        if (user?.email && school) {
          // Send confirmation email to the teacher who submitted the audit
          await sendAuditSubmissionEmail(
            user.email,
            school.name
          );
          
          // TODO: Notify admins about new audit submission
          console.log(`Audit submitted for school: ${school.name}`);
        }
      } catch (emailError) {
        console.warn("Failed to send audit submission email:", emailError);
      }

      res.json(audit);
    } catch (error) {
      console.error("Error submitting audit:", error);
      res.status(500).json({ message: "Failed to submit audit" });
    }
  });

  // Admin: Get pending audits
  app.get('/api/admin/audits/pending', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const audits = await storage.getPendingAudits();
      res.json(audits);
    } catch (error) {
      console.error("Error fetching pending audits:", error);
      res.status(500).json({ message: "Failed to fetch pending audits" });
    }
  });

  // Admin: Get all audits with filters
  app.get('/api/admin/audits', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { status, limit, offset } = req.query;
      const audits = await storage.getAllAudits({
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(audits);
    } catch (error) {
      console.error("Error fetching audits:", error);
      res.status(500).json({ message: "Failed to fetch audits" });
    }
  });

  // Admin: Review audit (approve/reject)
  app.put('/api/admin/audits/:id/review', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { approved, reviewNotes } = req.body;
      const reviewerId = req.user.id;
      const { id } = req.params;
      
      const audit = await storage.reviewAudit(id, reviewerId, approved, reviewNotes);
      
      if (!audit) {
        return res.status(404).json({ message: "Audit not found" });
      }

      // Send notification email
      try {
        const user = await storage.getUser(audit.submittedBy);
        const school = await storage.getSchool(audit.schoolId);
        
        if (user?.email && school) {
          if (approved) {
            await sendAuditApprovalEmail(user.email, school.name);
          } else {
            await sendAuditRejectionEmail(user.email, school.name, reviewNotes || 'Please review and resubmit');
          }
        }
      } catch (emailError) {
        console.warn("Failed to send audit review email:", emailError);
      }

      // Check and update school progression if approved
      if (approved) {
        await storage.checkAndUpdateSchoolProgression(audit.schoolId);
      }

      res.json(audit);
    } catch (error) {
      console.error("Error reviewing audit:", error);
      res.status(500).json({ message: "Failed to review audit" });
    }
  });

  // Reduction Promises Routes

  // Get all reduction promises for a school
  app.get('/api/reduction-promises/school/:schoolId', isAuthenticated, isSchoolMember, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const promises = await storage.getReductionPromisesBySchool(schoolId);
      res.json(promises);
    } catch (error) {
      console.error("Error fetching reduction promises:", error);
      res.status(500).json({ message: "Failed to fetch reduction promises" });
    }
  });

  // Get all reduction promises for an audit
  app.get('/api/reduction-promises/audit/:auditId', isAuthenticated, async (req: any, res) => {
    try {
      const { auditId } = req.params;
      const promises = await storage.getReductionPromisesByAudit(auditId);
      res.json(promises);
    } catch (error) {
      console.error("Error fetching reduction promises for audit:", error);
      res.status(500).json({ message: "Failed to fetch reduction promises" });
    }
  });

  // Create a new reduction promise
  app.post('/api/reduction-promises', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Validate request body
      const validatedData = insertReductionPromiseSchema.parse(req.body);
      
      // Check if user is a member of the school
      const schools = await storage.getUserSchools(userId);
      const isMember = schools.some(s => s.id === validatedData.schoolId) || req.user.isAdmin;
      
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to create promises for this school" });
      }
      
      // Calculate reduction amount
      const reductionAmount = validatedData.baselineQuantity - validatedData.targetQuantity;
      
      // Create the promise
      const promise = await storage.createReductionPromise({
        ...validatedData,
        reductionAmount,
        status: 'active',
        createdBy: userId,
      });
      
      res.status(201).json(promise);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating reduction promise:", error);
      res.status(500).json({ message: "Failed to create reduction promise" });
    }
  });

  // Update a reduction promise
  app.patch('/api/reduction-promises/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      // Fetch user's schools to find the promise
      const userSchools = await storage.getUserSchools(userId);
      const allPromises = await Promise.all(
        userSchools.map(school => storage.getReductionPromisesBySchool(school.id))
      );
      const existingPromise = allPromises.flat().find(p => p.id === id);
      
      if (!existingPromise) {
        return res.status(404).json({ message: "Reduction promise not found" });
      }
      
      // Verify user is member of the school
      const isMember = userSchools.some(s => s.id === existingPromise.schoolId) || req.user.isAdmin;
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to update this promise" });
      }
      
      // Validate request body with partial schema
      const partialSchema = insertReductionPromiseSchema.partial();
      const validatedData = partialSchema.parse(req.body);
      
      // Recalculate reduction amount if baseline or target quantities are being updated
      let updateData = { ...validatedData };
      if (validatedData.baselineQuantity !== undefined || validatedData.targetQuantity !== undefined) {
        const baselineQuantity = validatedData.baselineQuantity ?? existingPromise.baselineQuantity;
        const targetQuantity = validatedData.targetQuantity ?? existingPromise.targetQuantity;
        updateData.reductionAmount = baselineQuantity - targetQuantity;
      }
      
      // Update the promise
      const updatedPromise = await storage.updateReductionPromise(id, updateData);
      res.json(updatedPromise);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error updating reduction promise:", error);
      res.status(500).json({ message: "Failed to update reduction promise" });
    }
  });

  // Delete a reduction promise
  app.delete('/api/reduction-promises/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      // Fetch user's schools to find the promise
      const userSchools = await storage.getUserSchools(userId);
      const allPromises = await Promise.all(
        userSchools.map(school => storage.getReductionPromisesBySchool(school.id))
      );
      const promise = allPromises.flat().find(p => p.id === id);
      
      if (!promise) {
        return res.status(404).json({ message: "Reduction promise not found" });
      }
      
      // Verify user is member of the school or is admin
      const isMember = userSchools.some(s => s.id === promise.schoolId) || req.user.isAdmin;
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to delete this promise" });
      }
      
      // Delete the promise
      await storage.deleteReductionPromise(id);
      
      res.json({ message: "Reduction promise deleted successfully" });
    } catch (error) {
      console.error("Error deleting reduction promise:", error);
      res.status(500).json({ message: "Failed to delete reduction promise" });
    }
  });

  // Get aggregated metrics for reduction promises (admin only)
  app.get('/api/admin/reduction-promises/metrics', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Get all active promises
      const activePromises = await storage.getAllActivePromises();
      
      // Calculate aggregated metrics
      const totalPromises = activePromises.length;
      
      // Group by item type and calculate totals
      const itemTypeMetrics = activePromises.reduce((acc, promise) => {
        const type = promise.plasticItemType;
        if (!acc[type]) {
          acc[type] = {
            itemType: type,
            count: 0,
            totalReduction: 0,
          };
        }
        acc[type].count += 1;
        acc[type].totalReduction += promise.reductionAmount;
        return acc;
      }, {} as Record<string, { itemType: string; count: number; totalReduction: number }>);
      
      const itemTypeBreakdown = Object.values(itemTypeMetrics);
      const totalReductionAmount = activePromises.reduce((sum, p) => sum + p.reductionAmount, 0);
      
      res.json({
        totalPromises,
        totalReductionAmount,
        itemTypeBreakdown,
      });
    } catch (error) {
      console.error("Error fetching reduction promise metrics:", error);
      res.status(500).json({ message: "Failed to fetch reduction promise metrics" });
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

  // Get all users with their school associations for admin management
  app.get('/api/admin/users', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const usersWithSchools = await storage.getAllUsersWithSchools();
      res.json(usersWithSchools);
    } catch (error) {
      console.error("Error fetching users with schools:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get all teacher emails for SendGrid
  app.get('/api/admin/teachers/emails', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const teacherEmails = await storage.getTeacherEmails();
      res.json({ emails: teacherEmails, count: teacherEmails.length });
    } catch (error) {
      console.error("Error fetching teacher emails:", error);
      res.status(500).json({ message: "Failed to fetch teacher emails" });
    }
  });

  // Update user (role, isAdmin, etc.) - Partners cannot perform this action
  app.patch('/api/admin/users/:id', isAuthenticated, requireFullAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const adminUserId = req.user.id;
      
      // Prevent admin from modifying their own admin status
      if (id === adminUserId && req.body.isAdmin === false) {
        return res.status(400).json({ message: "You cannot remove your own admin privileges" });
      }

      // Validate request body
      const updateSchema = z.object({
        role: z.string().optional(),
        isAdmin: z.boolean().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      });
      const updates = updateSchema.parse(req.body);
      
      console.log(`[Update User] Admin ${adminUserId} updating user ${id}`, updates);
      
      const user = await storage.updateUser(id, updates);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`[Update User] Successfully updated user ${id}`);
      res.json(user);
    } catch (error) {
      console.error("[Update User] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user
  app.delete('/api/admin/users/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const adminUserId = req.user.id;
      
      // Prevent admin from deleting themselves
      if (id === adminUserId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      console.log(`[Delete User] Admin ${adminUserId} deleting user ${id}`);
      
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found or already deleted" });
      }

      console.log(`[Delete User] Successfully deleted user ${id}`);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("[Delete User] Error:", error);
      res.status(500).json({ message: "Failed to delete user" });
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

  // Get teachers for a specific school (for expandable rows)
  app.get('/api/admin/schools/:schoolId/teachers', isAuthenticated, requireAdmin, async (req, res) => {
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
        isVerified: su.isVerified,
        joinedAt: su.createdAt,
      }));
      
      res.json(teachers);
    } catch (error) {
      console.error("Error fetching school teachers:", error);
      res.status(500).json({ message: "Failed to fetch school teachers" });
    }
  });

  // Export analytics data as CSV/Excel (MUST come before the general export endpoint) - Partners cannot download data
  app.get('/api/admin/export/analytics', isAuthenticated, requireFullAdmin, async (req, res) => {
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

  // Export data as CSV/Excel with filtering support - Partners cannot download data
  app.get('/api/admin/export/:type', isAuthenticated, requireFullAdmin, async (req, res) => {
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
    preheader: z.string().max(100, "Preheader must be less than 100 characters").optional(),
    title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
    preTitle: z.string().max(200, "Pre-title must be less than 200 characters").optional(),
    messageContent: z.string().min(1, "Message content is required").max(10000, "Message content must be less than 10,000 characters"),
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
      language: z.enum(['all', 'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'zh', 'ko', 'ar', 'id', 'el', 'cy']).optional(),
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

  // Preview bulk email HTML content
  app.post('/api/admin/bulk-email/preview', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { subject, htmlContent } = req.body;
      
      if (!subject || !htmlContent) {
        return res.status(400).json({ message: "Subject and HTML content are required" });
      }

      res.json({
        subject,
        htmlContent,
        preview: htmlContent,
      });
    } catch (error) {
      console.error("Error previewing email:", error);
      res.status(500).json({ message: "Failed to generate preview" });
    }
  });

  // Send test bulk email to a single recipient
  app.post('/api/admin/bulk-email/test', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { subject, preheader, title, preTitle, messageContent, testEmail } = req.body;
      
      if (!subject || !title || !messageContent || !testEmail) {
        return res.status(400).json({ message: "Subject, title, message content, and test email are required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(testEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const results = await sendBulkEmail({
        recipients: [testEmail],
        subject: `[TEST] ${subject}`,
        preheader: preheader || '',
        title,
        preTitle: preTitle || '',
        messageContent,
      });

      if (results.sent > 0) {
        res.json({
          message: "Test email sent successfully",
          recipient: testEmail,
        });
      } else {
        res.status(500).json({ message: "Failed to send test email" });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Failed to send test email" });
    }
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

      const { recipients, subject, preheader, title, preTitle, messageContent, template, recipientType, filters } = validationResult.data;

      let emailList: string[] = [];

      if (recipientType === 'custom' && recipients) {
        emailList = recipients;
      } else if (recipientType === 'schools') {
        // Get schools based on filters and extract teacher emails from associated users
        const schools = await storage.getSchools({ 
          ...filters,
          limit: filters?.limit || 1000, 
          offset: filters?.offset || 0 
        });
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

      const results = await sendBulkEmail({
        recipients: emailList,
        subject,
        preheader: preheader || '',
        title,
        preTitle: preTitle || '',
        messageContent,
      });

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

  // Mailchimp integration routes (DEPRECATED - Keeping for backwards compatibility)
  // Event announcements now use SendGrid instead of Mailchimp
  
  // Get Mailchimp audiences (DEPRECATED)
  app.get('/api/mailchimp/audiences', isAuthenticated, requireAdmin, async (req, res) => {
    res.status(410).json({ 
      message: "Mailchimp audiences endpoint is deprecated. Event announcements now use SendGrid.",
      deprecated: true 
    });
  });

  // Create Mailchimp audience (DEPRECATED)
  app.post('/api/mailchimp/audiences', isAuthenticated, requireAdmin, async (req, res) => {
    res.status(410).json({ 
      message: "Creating Mailchimp audiences is deprecated. Event announcements now use SendGrid.",
      deprecated: true 
    });
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

  // ============= ADMIN INVITATION ROUTES =============

  // POST /api/admin/invite-partner - Invite a user to be a partner
  app.post('/api/admin/invite-partner', isAuthenticated, requireFullAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Validate request body
      const inviteSchema = z.object({
        email: z.string().email("Valid email is required"),
      });
      const { email } = inviteSchema.parse(req.body);
      
      console.log(`[Partner Invitation] Admin ${userId} inviting ${email} to be a partner`);
      
      // Generate invitation token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
      
      // Create invitation with partner role
      const invitation = await storage.createAdminInvitation({
        invitedBy: userId,
        email,
        token,
        expiresAt,
        role: 'partner', // Set as partner instead of admin
      });
      
      console.log(`[Partner Invitation] Created invitation ${invitation.id} for ${email}`);
      
      // Get inviter details for email
      const inviter = await storage.getUser(userId);
      
      // Send partner invitation email
      await sendPartnerInvitationEmail(
        email,
        inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() : 'An administrator',
        token,
        7
      );
      
      console.log(`[Partner Invitation] Sent invitation email to ${email}`);
      
      res.status(201).json({ 
        message: "Partner invitation sent successfully",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expiresAt: invitation.expiresAt,
        }
      });
    } catch (error) {
      console.error("[Partner Invitation] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send partner invitation" });
    }
  });

  // POST /api/admin/invite-admin - Invite a user to be an admin
  app.post('/api/admin/invite-admin', isAuthenticated, requireFullAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Validate request body
      const inviteSchema = z.object({
        email: z.string().email("Valid email is required"),
      });
      const { email } = inviteSchema.parse(req.body);
      
      console.log(`[Admin Invitation] Admin ${userId} inviting ${email} to be an admin`);
      
      // Generate invitation token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
      
      // Create invitation
      const invitation = await storage.createAdminInvitation({
        invitedBy: userId,
        email,
        token,
        expiresAt,
      });
      
      console.log(`[Admin Invitation] Created invitation ${invitation.id} for ${email}`);
      
      // Get inviter details for email
      const inviter = await storage.getUser(userId);
      
      // Send invitation email
      await sendAdminInvitationEmail(
        email,
        inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() : 'An administrator',
        token,
        7
      );
      
      console.log(`[Admin Invitation] Sent invitation email to ${email}`);
      
      res.status(201).json({ 
        message: "Invitation sent successfully",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expiresAt: invitation.expiresAt,
        }
      });
    } catch (error) {
      console.error("[Admin Invitation] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  // GET /api/admin/invitations - Get all admin invitations
  app.get('/api/admin/invitations', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      console.log(`[Admin Invitations] Admin ${userId} fetching all admin invitations`);
      
      const invitations = await storage.getAllAdminInvitations();
      console.log(`[Admin Invitations] Found ${invitations.length} invitations`);
      
      res.json(invitations);
    } catch (error) {
      console.error("[Admin Invitations] Error:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // GET /api/admin-invitations/:token - Get admin invitation details by token (public)
  app.get('/api/admin-invitations/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      console.log(`[Get Admin Invitation] Fetching invitation details for token ${token}`);
      
      // Get invitation by token
      const invitation = await storage.getAdminInvitationByToken(token);
      
      if (!invitation) {
        console.log(`[Get Admin Invitation] Invitation not found`);
        return res.status(404).json({ message: "Invitation not found or has expired" });
      }
      
      // Check if invitation is expired
      if (new Date() > new Date(invitation.expiresAt)) {
        console.log(`[Get Admin Invitation] Invitation expired`);
        return res.status(410).json({ message: "This invitation has expired" });
      }
      
      // Check if already accepted
      if (invitation.status === 'accepted') {
        console.log(`[Get Admin Invitation] Invitation already accepted`);
        return res.status(410).json({ message: "This invitation has already been accepted" });
      }
      
      // Get inviter details
      const inviter = await storage.getUser(invitation.invitedBy);
      
      console.log(`[Get Admin Invitation] Returning invitation details for ${invitation.email}`);
      
      res.json({
        email: invitation.email,
        inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() : 'An administrator',
        expiresAt: invitation.expiresAt,
        status: invitation.status,
      });
    } catch (error) {
      console.error("[Get Admin Invitation] Error:", error);
      res.status(500).json({ message: "Failed to fetch invitation details" });
    }
  });

  // POST /api/admin-invitations/:token/accept - Accept an admin invitation
  app.post('/api/admin-invitations/:token/accept', isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.params;
      const userId = req.user.id;
      
      console.log(`[Accept Admin Invitation] User ${userId} accepting invitation with token ${token}`);
      
      // Accept the invitation
      const invitation = await storage.acceptAdminInvitation(token);
      
      if (!invitation) {
        console.log(`[Accept Admin Invitation] Invitation not found or expired`);
        return res.status(404).json({ message: "Invitation not found or has expired" });
      }
      
      // Verify the email matches the authenticated user
      const user = await storage.getUser(userId);
      if (user?.email !== invitation.email) {
        console.log(`[Accept Admin Invitation] Email mismatch - invitation for ${invitation.email}, user is ${user?.email}`);
        return res.status(403).json({ message: "This invitation is for a different email address" });
      }
      
      // Update user's role and admin status based on invitation
      const invitationRole = invitation.role || 'admin';
      if (invitationRole === 'partner') {
        await db.update(users).set({ role: 'partner', isAdmin: false }).where(eq(users.id, userId));
        console.log(`[Accept Admin Invitation] User ${userId} is now a partner`);
        res.json({ 
          message: "Partner invitation accepted successfully. You are now a partner.",
        });
      } else {
        await db.update(users).set({ role: 'admin', isAdmin: true }).where(eq(users.id, userId));
        console.log(`[Accept Admin Invitation] User ${userId} is now an admin`);
        res.json({ 
          message: "Admin invitation accepted successfully. You are now an administrator.",
        });
      }
    } catch (error) {
      console.error("[Accept Admin Invitation] Error:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // ============= TESTIMONIALS ROUTES =============

  // GET /api/testimonials - Get active testimonials for public display
  app.get('/api/testimonials', async (req, res) => {
    try {
      const testimonials = await storage.getTestimonials({ isActive: true });
      res.json(testimonials);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      res.status(500).json({ message: "Failed to fetch testimonials" });
    }
  });

  // GET /api/admin/testimonials - Get all testimonials (admin only)
  app.get('/api/admin/testimonials', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const testimonials = await storage.getTestimonials();
      res.json(testimonials);
    } catch (error) {
      console.error("Error fetching all testimonials:", error);
      res.status(500).json({ message: "Failed to fetch testimonials" });
    }
  });

  // POST /api/admin/testimonials - Create a new testimonial (admin only)
  app.post('/api/admin/testimonials', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const testimonialSchema = z.object({
        quote: z.string().min(1, "Quote is required"),
        authorName: z.string().min(1, "Author name is required"),
        authorRole: z.string().min(1, "Author role is required"),
        schoolName: z.string().min(1, "School name is required"),
        rating: z.number().min(1).max(5).optional(),
        isActive: z.boolean().optional(),
        displayOrder: z.number().optional(),
      });

      const testimonialData = testimonialSchema.parse(req.body);
      const testimonial = await storage.createTestimonial(testimonialData);
      res.status(201).json(testimonial);
    } catch (error) {
      console.error("Error creating testimonial:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create testimonial" });
    }
  });

  // PATCH /api/admin/testimonials/:id - Update a testimonial (admin only)
  app.patch('/api/admin/testimonials/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateSchema = z.object({
        quote: z.string().min(1).optional(),
        authorName: z.string().min(1).optional(),
        authorRole: z.string().min(1).optional(),
        schoolName: z.string().min(1).optional(),
        rating: z.number().min(1).max(5).optional(),
        isActive: z.boolean().optional(),
        displayOrder: z.number().optional(),
      });

      const updates = updateSchema.parse(req.body);
      const testimonial = await storage.updateTestimonial(id, updates);
      
      if (!testimonial) {
        return res.status(404).json({ message: "Testimonial not found" });
      }

      res.json(testimonial);
    } catch (error) {
      console.error("Error updating testimonial:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update testimonial" });
    }
  });

  // DELETE /api/admin/testimonials/:id - Delete a testimonial (admin only)
  app.delete('/api/admin/testimonials/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTestimonial(id);
      res.json({ message: "Testimonial deleted successfully" });
    } catch (error) {
      console.error("Error deleting testimonial:", error);
      res.status(500).json({ message: "Failed to delete testimonial" });
    }
  });

  // ============= ADMIN TEAM MANAGEMENT ROUTES =============

  // POST /api/admin/schools/:schoolId/assign-teacher - Admin assigns a teacher to a school
  app.post('/api/admin/schools/:schoolId/assign-teacher', isAuthenticated, requireAdmin, async (req: any, res) => {
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
        // Create new user account with OAuth (minimal data)
        user = await storage.createUserWithOAuth({
          email,
          firstName: email.split('@')[0],
          lastName: '',
          googleId: `admin-created-${Date.now()}`, // Placeholder Google ID
          emailVerified: true,
        });
        console.log(`[Admin Assign Teacher] Created new user ${user.id} for ${email}`);
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
          from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
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
                  You can now access your school dashboard and participate in the Plastic Clever Schools program.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || 'https://plasticclever.org'}/dashboard" 
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
  app.delete('/api/admin/schools/:schoolId/teachers/:userId', isAuthenticated, requireAdmin, async (req: any, res) => {
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
            from: process.env.FROM_EMAIL || 'noreply@plasticclever.org',
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

  // GET /api/admin/verification-requests - Admin views all verification requests across all schools
  app.get('/api/admin/verification-requests', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      console.log('[Admin Verification Requests] Fetching all verification requests');

      // Get all pending verification requests
      const requests = await storage.getPendingVerificationRequests();

      // Enrich with user and school data
      const enrichedRequests = await Promise.all(
        requests.map(async (request: VerificationRequest) => {
          const user = await storage.getUser(request.userId);
          const school = await storage.getSchool(request.schoolId);
          return {
            ...request,
            schoolName: school?.name || 'Unknown School',
            userName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown User',
            userEmail: user?.email || 'N/A',
          };
        })
      );

      console.log(`[Admin Verification Requests] Found ${enrichedRequests.length} requests`);
      res.json(enrichedRequests);
    } catch (error) {
      console.error("[Admin Verification Requests] Error:", error);
      res.status(500).json({ message: "Failed to fetch verification requests" });
    }
  });

  // PUT /api/admin/verification-requests/:id/:action - Admin approves or rejects a verification request
  app.put('/api/admin/verification-requests/:id/:action', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id, action } = req.params;
      const { notes } = req.body;

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: "Action must be 'approve' or 'reject'" });
      }

      console.log(`[Admin Verification ${action}] Admin ${action}ing request ${id}`);

      // Get the verification request
      const request = await storage.getVerificationRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Verification request not found" });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ message: "This request has already been reviewed" });
      }

      // Get user and school info for email
      const user = await storage.getUser(request.userId);
      const school = await storage.getSchool(request.schoolId);

      if (!user || !school) {
        return res.status(404).json({ message: "User or school not found" });
      }

      if (action === 'approve') {
        // Approve the request
        await storage.approveVerificationRequest(id, req.user.id, notes);

        // Add user to school as verified teacher
        await storage.addUserToSchool({
          schoolId: request.schoolId,
          userId: request.userId,
          role: 'teacher',
          isVerified: true,
        });

        // Send approval email
        if (user.email) {
          await sendVerificationApprovalEmail(
            user.email,
            school.name,
            notes || undefined
          );
        }

        console.log(`[Admin Verification approve] Request ${id} approved, user ${request.userId} added to school ${request.schoolId}`);
        
        res.json({ 
          message: "Verification request approved successfully",
          status: 'approved'
        });
      } else {
        // Reject the request
        if (!notes || notes.trim() === '') {
          return res.status(400).json({ message: "Rejection notes are required" });
        }

        await storage.rejectVerificationRequest(id, req.user.id, notes);

        // Send rejection email
        if (user.email) {
          await sendVerificationRejectionEmail(
            user.email,
            school.name,
            notes
          );
        }

        console.log(`[Admin Verification reject] Request ${id} rejected with notes`);
        
        res.json({ 
          message: "Verification request rejected",
          status: 'rejected'
        });
      }
    } catch (error) {
      console.error(`[Admin Verification ${req.params.action}] Error:`, error);
      res.status(500).json({ message: `Failed to ${req.params.action} verification request` });
    }
  });

  // Test email endpoints (protected - admin only)
  
  // Test welcome email
  app.post('/api/admin/test-email', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { email, schoolName } = req.body;
      
      if (!email || !schoolName) {
        return res.status(400).json({ message: "Email and schoolName are required" });
      }
      
      console.log(`[Test Email] Sending welcome email to ${email} for school ${schoolName}`);
      
      const success = await sendWelcomeEmail(email, schoolName);
      
      if (success) {
        console.log(`[Test Email] Email sent successfully to ${email}`);
        res.json({ 
          success: true,
          message: "Test email sent successfully",
          recipient: email
        });
      } else {
        console.error(`[Test Email] Failed to send email to ${email}`);
        res.status(500).json({ 
          success: false,
          message: "Failed to send test email"
        });
      }
    } catch (error) {
      console.error("[Test Email] Error:", error);
      res.status(500).json({ 
        success: false,
        message: "Error sending test email",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Test teacher invitation email
  app.post('/api/admin/test-email/teacher-invitation', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const schema = z.object({
        recipientEmail: z.string().email(),
        schoolName: z.string().min(1),
        inviterName: z.string().min(1),
        expiresInDays: z.number().int().positive().default(7),
      });
      
      const { recipientEmail, schoolName, inviterName, expiresInDays } = schema.parse(req.body);
      
      console.log(`[Test Email] Sending teacher invitation to ${recipientEmail}`);
      
      const token = randomBytes(32).toString('hex');
      const success = await sendTeacherInvitationEmail(recipientEmail, schoolName, inviterName, token, expiresInDays);
      
      if (success) {
        res.json({ success: true, message: "Teacher invitation email sent successfully", recipient: recipientEmail });
      } else {
        res.status(500).json({ success: false, message: "Failed to send teacher invitation email" });
      }
    } catch (error) {
      console.error("[Test Email - Teacher Invitation] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ success: false, message: "Error sending teacher invitation email" });
    }
  });

  // Test join request email (to head teacher)
  app.post('/api/admin/test-email/join-request', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const schema = z.object({
        recipientEmail: z.string().email(),
        schoolName: z.string().min(1),
        requesterName: z.string().min(1),
        requesterEmail: z.string().email(),
        evidence: z.string().min(1),
      });
      
      const { recipientEmail, schoolName, requesterName, requesterEmail, evidence } = schema.parse(req.body);
      
      console.log(`[Test Email] Sending join request to ${recipientEmail}`);
      
      const success = await sendVerificationRequestEmail(recipientEmail, schoolName, requesterName, requesterEmail, evidence);
      
      if (success) {
        res.json({ success: true, message: "Join request email sent successfully", recipient: recipientEmail });
      } else {
        res.status(500).json({ success: false, message: "Failed to send join request email" });
      }
    } catch (error) {
      console.error("[Test Email - Join Request] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ success: false, message: "Error sending join request email" });
    }
  });

  // Test join request approved email
  app.post('/api/admin/test-email/join-approved', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const schema = z.object({
        recipientEmail: z.string().email(),
        schoolName: z.string().min(1),
        reviewerName: z.string().min(1),
        reviewNotes: z.string().optional(),
      });
      
      const { recipientEmail, schoolName, reviewerName, reviewNotes } = schema.parse(req.body);
      
      console.log(`[Test Email] Sending join approved email to ${recipientEmail}`);
      
      const success = await sendVerificationApprovalEmail(recipientEmail, schoolName, reviewerName, reviewNotes);
      
      if (success) {
        res.json({ success: true, message: "Join approved email sent successfully", recipient: recipientEmail });
      } else {
        res.status(500).json({ success: false, message: "Failed to send join approved email" });
      }
    } catch (error) {
      console.error("[Test Email - Join Approved] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ success: false, message: "Error sending join approved email" });
    }
  });

  // Test evidence submitted email
  app.post('/api/admin/test-email/evidence-submitted', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const schema = z.object({
        recipientEmail: z.string().email(),
        schoolName: z.string().min(1),
        evidenceTitle: z.string().min(1),
        stage: z.enum(['Stage 1', 'Stage 2', 'Stage 3']),
      });
      
      const { recipientEmail, schoolName, evidenceTitle, stage } = schema.parse(req.body);
      
      console.log(`[Test Email] Sending evidence submitted email to ${recipientEmail}`);
      
      const success = await sendEvidenceSubmissionEmail(recipientEmail, schoolName, evidenceTitle, stage);
      
      if (success) {
        res.json({ success: true, message: "Evidence submitted email sent successfully", recipient: recipientEmail });
      } else {
        res.status(500).json({ success: false, message: "Failed to send evidence submitted email" });
      }
    } catch (error) {
      console.error("[Test Email - Evidence Submitted] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ success: false, message: "Error sending evidence submitted email" });
    }
  });

  // Test evidence approved email
  app.post('/api/admin/test-email/evidence-approved', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const schema = z.object({
        recipientEmail: z.string().email(),
        schoolName: z.string().min(1),
        evidenceTitle: z.string().min(1),
      });
      
      const { recipientEmail, schoolName, evidenceTitle } = schema.parse(req.body);
      
      console.log(`[Test Email] Sending evidence approved email to ${recipientEmail}`);
      
      const success = await sendEvidenceApprovalEmail(recipientEmail, schoolName, evidenceTitle);
      
      if (success) {
        res.json({ success: true, message: "Evidence approved email sent successfully", recipient: recipientEmail });
      } else {
        res.status(500).json({ success: false, message: "Failed to send evidence approved email" });
      }
    } catch (error) {
      console.error("[Test Email - Evidence Approved] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ success: false, message: "Error sending evidence approved email" });
    }
  });

  // Test evidence needs revision email
  app.post('/api/admin/test-email/evidence-revision', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const schema = z.object({
        recipientEmail: z.string().email(),
        schoolName: z.string().min(1),
        evidenceTitle: z.string().min(1),
        feedback: z.string().min(1),
      });
      
      const { recipientEmail, schoolName, evidenceTitle, feedback } = schema.parse(req.body);
      
      console.log(`[Test Email] Sending evidence revision email to ${recipientEmail}`);
      
      const success = await sendEvidenceRejectionEmail(recipientEmail, schoolName, evidenceTitle, feedback);
      
      if (success) {
        res.json({ success: true, message: "Evidence revision email sent successfully", recipient: recipientEmail });
      } else {
        res.status(500).json({ success: false, message: "Failed to send evidence revision email" });
      }
    } catch (error) {
      console.error("[Test Email - Evidence Revision] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ success: false, message: "Error sending evidence revision email" });
    }
  });

  // Test new evidence for admin email
  app.post('/api/admin/test-email/new-evidence', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const schema = z.object({
        recipientEmail: z.string().email(),
        schoolName: z.string().min(1),
        evidenceTitle: z.string().min(1),
        stage: z.enum(['Stage 1', 'Stage 2', 'Stage 3']),
        submitterName: z.string().min(1),
      });
      
      const { recipientEmail, schoolName, evidenceTitle, stage, submitterName } = schema.parse(req.body);
      
      console.log(`[Test Email] Sending new evidence notification to ${recipientEmail}`);
      
      const success = await sendAdminNewEvidenceEmail(recipientEmail, schoolName, evidenceTitle, stage, submitterName);
      
      if (success) {
        res.json({ success: true, message: "New evidence notification email sent successfully", recipient: recipientEmail });
      } else {
        res.status(500).json({ success: false, message: "Failed to send new evidence notification email" });
      }
    } catch (error) {
      console.error("[Test Email - New Evidence] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ success: false, message: "Error sending new evidence notification email" });
    }
  });

  // ===== EVENT ROUTES =====
  
  // Public: Get upcoming events
  app.get('/api/events/upcoming', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const events = await storage.getUpcomingEvents(limit);
      res.json(events);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      res.status(500).json({ message: "Failed to fetch upcoming events" });
    }
  });

  // Public: Get all published events with filters
  app.get('/api/events', async (req, res) => {
    try {
      const { eventType, upcoming, limit, offset } = req.query;
      const events = await storage.getEvents({
        status: 'published',
        eventType: eventType as string,
        upcoming: upcoming === 'true',
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Public: Get single event
  app.get('/api/events/:id', async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Only show published events to non-admin users
      if (event.status !== 'published' && (!req.user || !req.user.isAdmin)) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // Authenticated: Register for event
  app.post('/api/events/:id/register', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = req.params.id;
      const userId = req.user.id;
      
      // Check if event exists and is published
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      if (event.status !== 'published') {
        return res.status(400).json({ message: "Event is not available for registration" });
      }
      
      // Check if event has ended
      if (new Date(event.startDateTime) < new Date()) {
        return res.status(400).json({ message: "Cannot register for past events" });
      }
      
      // Check registration deadline
      if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
        return res.status(400).json({ message: "Registration deadline has passed" });
      }
      
      // Check if already registered
      const existingRegistration = await storage.getEventRegistration(eventId, userId);
      if (existingRegistration && existingRegistration.status !== 'cancelled') {
        return res.status(400).json({ message: "Already registered for this event" });
      }
      
      // Check capacity and handle waitlist - SERVER-SIDE ENFORCEMENT
      let registrationStatus: 'registered' | 'waitlisted' = 'registered';
      if (event.capacity) {
        const registrationCount = await storage.getEventRegistrationCount(eventId);
        if (registrationCount >= event.capacity) {
          if (event.waitlistEnabled) {
            registrationStatus = 'waitlisted';
          } else {
            return res.status(400).json({ message: "Event is at full capacity" });
          }
        }
      }
      
      // Get user's school if they have one
      const userSchools = await storage.getUserSchools(userId);
      const schoolId = userSchools.length > 0 ? userSchools[0].id : null;
      
      const registration = await storage.createEventRegistration({
        eventId,
        userId,
        schoolId,
        status: registrationStatus,
      });
      
      // Send registration confirmation email (don't fail request if email fails)
      try {
        await sendEventRegistrationEmail(
          req.user.email,
          { firstName: req.user.firstName, lastName: req.user.lastName },
          {
            id: event.id,
            title: event.title,
            description: event.description,
            startDateTime: event.startDateTime,
            endDateTime: event.endDateTime,
            timezone: event.timezone || undefined,
            location: event.location || undefined,
            isVirtual: event.isVirtual || false,
            meetingLink: event.meetingLink || undefined,
          }
        );
      } catch (emailError) {
        console.error("Failed to send registration confirmation email:", emailError);
      }
      
      res.json({ 
        message: registrationStatus === 'waitlisted' 
          ? "Added to waitlist successfully" 
          : "Successfully registered for event", 
        registration 
      });
    } catch (error) {
      console.error("Error registering for event:", error);
      res.status(500).json({ message: "Failed to register for event" });
    }
  });

  // Authenticated: Get user's event registrations
  app.get('/api/my-events', isAuthenticated, async (req: any, res) => {
    try {
      const registrations = await storage.getUserEventRegistrations(req.user.id);
      res.json(registrations);
    } catch (error) {
      console.error("Error fetching user event registrations:", error);
      res.status(500).json({ message: "Failed to fetch event registrations" });
    }
  });

  // Authenticated: Cancel event registration
  app.delete('/api/events/registrations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const registrationId = req.params.id;
      const userId = req.user.id;
      
      // Get the registration to verify ownership and check event status
      const registrations = await storage.getUserEventRegistrations(userId);
      const registration = registrations.find(r => r.id === registrationId);
      
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      
      // Check if the registration belongs to the user
      if (registration.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to cancel this registration" });
      }
      
      // Check if event has already started
      if (new Date(registration.event.startDateTime) < new Date()) {
        return res.status(400).json({ message: "Cannot cancel registration for events that have already started" });
      }
      
      // Check if already cancelled
      if (registration.status === 'cancelled') {
        return res.status(400).json({ message: "Registration is already cancelled" });
      }
      
      const updatedRegistration = await storage.cancelEventRegistration(registrationId);
      
      // Send cancellation confirmation email (don't fail request if email fails)
      try {
        await sendEventCancellationEmail(
          req.user.email,
          { firstName: req.user.firstName, lastName: req.user.lastName },
          registration.event
        );
      } catch (emailError) {
        console.error("Failed to send cancellation confirmation email:", emailError);
      }
      
      res.json({ message: "Registration cancelled successfully", registration: updatedRegistration });
    } catch (error) {
      console.error("Error cancelling registration:", error);
      res.status(500).json({ message: "Failed to cancel registration" });
    }
  });

  // ===== ADMIN EVENT ROUTES =====
  
  // Admin: Get event analytics
  app.get('/api/admin/events/analytics', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getEventAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching event analytics:", error);
      res.status(500).json({ message: "Failed to fetch event analytics" });
    }
  });

  // Admin: Get all events (including drafts)
  app.get('/api/admin/events', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { status, eventType, limit, offset } = req.query;
      const events = await storage.getEvents({
        status: status as string,
        eventType: eventType as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Admin: Create event
  app.post('/api/admin/events', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const eventData = insertEventSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      
      const event = await storage.createEvent(eventData);
      res.json({ message: "Event created successfully", event });
    } catch (error) {
      console.error("Error creating event:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // Admin: Update event
  app.put('/api/admin/events/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const eventId = req.params.id;
      const updates = req.body;
      
      // Get existing event for validation
      const existingEvent = await storage.getEvent(eventId);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Validate status transitions
      if (updates.status && existingEvent.status) {
        const validTransitions: Record<string, string[]> = {
          'draft': ['published', 'cancelled'],
          'published': ['cancelled', 'completed'],
          'cancelled': [], // Cannot transition from cancelled
          'completed': [], // Cannot transition from completed
        };
        
        const allowedNextStatuses = validTransitions[existingEvent.status];
        if (allowedNextStatuses && !allowedNextStatuses.includes(updates.status)) {
          return res.status(400).json({ 
            message: `Cannot transition from ${existingEvent.status} to ${updates.status}` 
          });
        }
      }
      
      // Validate date changes - cannot reschedule past events
      if (updates.startDateTime || updates.endDateTime) {
        const eventHasStarted = new Date(existingEvent.startDateTime) < new Date();
        if (eventHasStarted) {
          return res.status(400).json({ 
            message: "Cannot reschedule events that have already started" 
          });
        }
      }
      
      // Validate date logic
      if (updates.startDateTime && updates.endDateTime) {
        if (new Date(updates.startDateTime) >= new Date(updates.endDateTime)) {
          return res.status(400).json({ 
            message: "Start date must be before end date" 
          });
        }
      } else if (updates.startDateTime && existingEvent.endDateTime) {
        if (new Date(updates.startDateTime) >= new Date(existingEvent.endDateTime)) {
          return res.status(400).json({ 
            message: "Start date must be before end date" 
          });
        }
      } else if (updates.endDateTime && existingEvent.startDateTime) {
        if (new Date(existingEvent.startDateTime) >= new Date(updates.endDateTime)) {
          return res.status(400).json({ 
            message: "Start date must be before end date" 
          });
        }
      }
      
      // Validate capacity reduction doesn't affect existing registrations
      if (updates.capacity !== undefined && updates.capacity < existingEvent.capacity!) {
        const registrationCount = await storage.getEventRegistrationCount(eventId);
        if (updates.capacity < registrationCount) {
          return res.status(400).json({ 
            message: `Cannot reduce capacity below current registration count (${registrationCount})` 
          });
        }
      }
      
      // Track changes for email notification
      const changes: string[] = [];
      if (updates.title && updates.title !== existingEvent.title) {
        changes.push(`Event name changed to "${updates.title}"`);
      }
      if (updates.startDateTime && new Date(updates.startDateTime).getTime() !== new Date(existingEvent.startDateTime).getTime()) {
        changes.push(`Start date/time updated`);
      }
      if (updates.endDateTime && new Date(updates.endDateTime).getTime() !== new Date(existingEvent.endDateTime).getTime()) {
        changes.push(`End date/time updated`);
      }
      if (updates.location && updates.location !== existingEvent.location) {
        changes.push(`Location changed to "${updates.location}"`);
      }
      if (updates.meetingLink && updates.meetingLink !== existingEvent.meetingLink) {
        changes.push(`Meeting link updated`);
      }
      if (updates.isVirtual !== undefined && updates.isVirtual !== existingEvent.isVirtual) {
        changes.push(`Event format changed to ${updates.isVirtual ? 'virtual' : 'in-person'}`);
      }
      if (updates.description && updates.description !== existingEvent.description) {
        changes.push(`Event description updated`);
      }
      
      const event = await storage.updateEvent(eventId, updates);
      
      // Send update emails to registered users (only if there are meaningful changes)
      if (event && changes.length > 0 && existingEvent.status === 'published') {
        try {
          const registrations = await storage.getEventRegistrations(eventId, { status: 'registered' });
          
          // Send emails in the background (don't wait for all to complete)
          registrations.forEach(async (registration) => {
            try {
              if (registration.user.email && event) {
                await sendEventUpdatedEmail(
                  registration.user.email,
                  { 
                    firstName: registration.user.firstName || undefined, 
                    lastName: registration.user.lastName || undefined 
                  },
                  {
                    id: event.id,
                    title: event.title,
                    description: event.description,
                    startDateTime: event.startDateTime,
                    endDateTime: event.endDateTime,
                    timezone: event.timezone || undefined,
                    location: event.location || undefined,
                    isVirtual: event.isVirtual || false,
                    meetingLink: event.meetingLink || undefined,
                  },
                  changes
                );
              }
            } catch (emailError) {
              console.error(`Failed to send event update email to ${registration.user.email}:`, emailError);
            }
          });
        } catch (emailError) {
          console.error("Failed to send event update emails:", emailError);
        }
      }
      
      res.json({ message: "Event updated successfully", event });
    } catch (error) {
      console.error("Error updating event:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  // Admin: Delete event
  app.delete('/api/admin/events/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteEvent(req.params.id);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Admin: Get event registrations
  app.get('/api/admin/events/:id/registrations', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const eventId = req.params.id;
      const { status } = req.query;
      const registrations = await storage.getEventRegistrations(eventId, {
        status: status as string,
      });
      res.json(registrations);
    } catch (error) {
      console.error("Error fetching event registrations:", error);
      res.status(500).json({ message: "Failed to fetch event registrations" });
    }
  });

  // Admin: Update registration status (mark as attended)
  app.put('/api/admin/events/registrations/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const registrationId = req.params.id;
      const { status } = req.body;
      
      const updates: any = { status };
      if (status === 'attended') {
        updates.attendedAt = new Date();
      }
      
      const registration = await storage.updateEventRegistration(registrationId, updates);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      
      res.json({ message: "Registration updated successfully", registration });
    } catch (error) {
      console.error("Error updating registration:", error);
      res.status(500).json({ message: "Failed to update registration" });
    }
  });

  // Admin: Send event announcement via SendGrid
  app.post('/api/admin/events/:id/announce', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const eventId = req.params.id;
      const { recipientType, customEmails } = req.body;

      if (!recipientType || !['all_teachers', 'custom'].includes(recipientType)) {
        return res.status(400).json({ message: "Valid recipient type is required (all_teachers or custom)" });
      }

      if (recipientType === 'custom' && (!customEmails || customEmails.length === 0)) {
        return res.status(400).json({ message: "Custom email list is required for custom recipient type" });
      }

      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (event.status !== 'published') {
        return res.status(400).json({ message: "Only published events can be announced" });
      }

      // Get recipient list
      let recipients: string[] = [];
      if (recipientType === 'all_teachers') {
        recipients = await storage.getTeacherEmails();
      } else {
        recipients = customEmails;
      }

      if (recipients.length === 0) {
        return res.status(400).json({ message: "No recipients found" });
      }

      // Send via SendGrid
      const result = await sendEventAnnouncementEmail(recipients, event);
      
      if (!result.success) {
        return res.status(500).json({ 
          message: result.error || "Failed to send event announcement" 
        });
      }

      // Track announcement
      await storage.createEventAnnouncement({
        eventId,
        recipientType,
        campaignId: result.messageId || null,
        announcementType: 'single_event',
        sentBy: req.user.id,
        recipientCount: recipients.length,
        status: 'sent',
      });

      res.json({ 
        message: "Event announcement sent successfully",
        recipientCount: recipients.length,
        messageId: result.messageId
      });
    } catch (error: any) {
      console.error("Error sending event announcement:", error);
      res.status(500).json({ message: "Failed to send event announcement" });
    }
  });

  // Admin: Send event digest via SendGrid
  app.post('/api/admin/events/digest', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { recipientType, customEmails, eventIds } = req.body;

      if (!recipientType || !['all_teachers', 'custom'].includes(recipientType)) {
        return res.status(400).json({ message: "Valid recipient type is required (all_teachers or custom)" });
      }

      if (recipientType === 'custom' && (!customEmails || customEmails.length === 0)) {
        return res.status(400).json({ message: "Custom email list is required for custom recipient type" });
      }

      if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
        return res.status(400).json({ message: "At least one event must be selected for the digest" });
      }

      const eventsToInclude = [];
      for (const eventId of eventIds) {
        const event = await storage.getEvent(eventId);
        if (event && event.status === 'published') {
          eventsToInclude.push(event);
        }
      }

      if (eventsToInclude.length === 0) {
        return res.status(400).json({ message: "No published events found to include in digest" });
      }

      // Get recipient list
      let recipients: string[] = [];
      if (recipientType === 'all_teachers') {
        recipients = await storage.getTeacherEmails();
      } else {
        recipients = customEmails;
      }

      if (recipients.length === 0) {
        return res.status(400).json({ message: "No recipients found" });
      }

      // Send via SendGrid
      const result = await sendEventDigestEmail(recipients, eventsToInclude);
      
      if (!result.success) {
        return res.status(500).json({ 
          message: result.error || "Failed to send event digest" 
        });
      }

      // Track announcements for each event
      for (const event of eventsToInclude) {
        await storage.createEventAnnouncement({
          eventId: event.id,
          recipientType,
          campaignId: result.messageId || null,
          announcementType: 'digest',
          sentBy: req.user.id,
          recipientCount: recipients.length,
          status: 'sent',
        });
      }

      res.json({ 
        message: `Event digest sent successfully with ${eventsToInclude.length} events`,
        recipientCount: recipients.length,
        messageId: result.messageId
      });
    } catch (error: any) {
      console.error("Error sending event digest:", error);
      res.status(500).json({ message: "Failed to send event digest" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
