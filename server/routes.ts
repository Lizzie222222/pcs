import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { sendWelcomeEmail, sendEvidenceApprovalEmail, sendEvidenceRejectionEmail, sendBulkEmail, BulkEmailParams } from "./emailService";
import { mailchimpService } from "./mailchimpService";
import { insertSchoolSchema, insertEvidenceSchema, insertMailchimpAudienceSchema, insertMailchimpSubscriptionSchema } from "@shared/schema";
import { z } from "zod";
import * as XLSX from 'xlsx';

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

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's schools
      const schools = await storage.getUserSchools(userId);
      
      res.json({ 
        ...user, 
        schools: schools.length > 0 ? schools : []
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

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

  // Get unique countries from schools database
  app.get('/api/countries', async (req, res) => {
    try {
      const countries = await storage.getUniqueCountries();
      res.json(countries);
    } catch (error) {
      console.error("Error fetching countries:", error);
      res.status(500).json({ message: "Failed to fetch countries" });
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

  // Get schools for map
  app.get('/api/schools/map', async (req, res) => {
    try {
      const { country } = req.query;
      const schools = await storage.getSchools({
        country: country as string,
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
      const user = await storage.upsertUser(userData);
      
      // Create school with user as primary contact
      const school = await storage.createSchool({
        ...schoolData,
        primaryContactId: user.id,
      });

      // Add user to school
      await storage.addUserToSchool({
        schoolId: school.id,
        userId: user.id,
        role: 'admin',
      });

      // Send welcome email
      await sendWelcomeEmail(user.email!, school.name);

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

      res.status(201).json({ 
        message: "School registered successfully",
        school: school,
        user: user 
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

  // Get user's school dashboard data
  app.get('/api/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const evidenceData = insertEvidenceSchema.parse({
        ...req.body,
        submittedBy: userId,
      });

      const evidence = await storage.createEvidence(evidenceData);

      // Add to Mailchimp evidence submission automation (non-blocking)
      try {
        const user = await storage.getUser(userId);
        const school = await storage.getSchool(evidenceData.schoolId);
        
        if (user?.email && school) {
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
      } catch (mailchimpError) {
        // Log but don't fail evidence submission if Mailchimp fails
        console.warn('Mailchimp automation failed for evidence submission:', mailchimpError);
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
      const userId = req.user.claims.sub;
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
    const userId = req.user?.claims?.sub;
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

    const userId = req.user?.claims?.sub;
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
      const userId = req.user?.claims?.sub;
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
      const reviewerId = req.user.claims.sub;
      
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

  const httpServer = createServer(app);
  return httpServer;
}
