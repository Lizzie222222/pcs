import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isSchoolMember, trackUserActivity, markUserInteracted } from "./auth";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { ObjectPermission, getObjectAclPolicy, setObjectAclPolicy } from "./objectAcl";
import { sendWelcomeEmail, sendEvidenceApprovalEmail, sendEvidenceRejectionEmail, sendEvidenceSubmissionEmail, sendAdminNewEvidenceEmail, sendBulkEmail, BulkEmailParams, sendEmail, sendVerificationApprovalEmail, sendVerificationRejectionEmail, sendTeacherInvitationEmail, sendVerificationRequestEmail, sendAdminInvitationEmail, sendPartnerInvitationEmail, sendAuditSubmissionEmail, sendAuditApprovalEmail, sendAuditRejectionEmail, sendAdminNewAuditEmail, sendEventRegistrationEmail, sendEventCancellationEmail, sendEventReminderEmail, sendEventUpdatedEmail, sendEventAnnouncementEmail, sendEventDigestEmail, sendContactFormEmail, getFromAddress, sendWeeklyAdminDigest, WeeklyDigestData, getBaseUrl } from "./emailService";
import { mailchimpService } from "./mailchimpService";
import { insertSchoolSchema, insertEvidenceSchema, insertEvidenceRequirementSchema, insertMailchimpAudienceSchema, insertMailchimpSubscriptionSchema, insertTeacherInvitationSchema, insertVerificationRequestSchema, insertAuditResponseSchema, insertReductionPromiseSchema, insertEventSchema, insertEventRegistrationSchema, insertMediaAssetSchema, insertMediaTagSchema, insertCaseStudySchema, type VerificationRequest, users, schools, schoolUsers, caseStudies, importBatches, userActivityLogs, certificates, evidence } from "@shared/schema";
import { nanoid } from 'nanoid';
import { z } from "zod";
import { randomUUID, randomBytes } from 'crypto';
import { db } from "./db";
import { eq, and, or, sql, desc, gte, lte, count, ilike, inArray } from "drizzle-orm";
import { generateAnalyticsInsights } from "./lib/aiInsights";
import { translateEmailContent, translateEvidenceRequirement, type EmailContent } from "./translationService";
import { promises as fs } from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { apiCache, CACHE_TTL } from "./cache";
import { parseImportFile, sanitizeForPreview, generateSchoolTemplate, generateUserTemplate, generateRelationshipTemplate } from './lib/importUtils.js';
import { importSchools, importUsers, importRelationships, updateImportBatch } from './lib/importProcessor.js';
import { logUserActivity } from "./auditLog";
import { compressImage, shouldCompressFile } from "./imageCompression";
import OpenAI from 'openai';

// Import extracted utilities
import { generateCSV, getCSVHeaders, generateExcel, generateTitleFromFilename } from './routes/utils/exports';
import { stripHtml, escapeHtml, sanitizeFilename, generatePdfHtml } from './routes/utils/pdf';
import { bulkResourceUpload, photoConsentUpload, uploadCompression, importUpload } from './routes/utils/uploads';
import { uploadToObjectStorage } from './routes/utils/objectStorage';
import { requireAdmin, requireAdminOrPartner } from './routes/utils/middleware';
import { normalizeObjectStorageUrl, normalizeFileArray } from './routes/utils/urlNormalization';
import { generatePDFReport } from './lib/pdfGenerator';
import { calculateAggregateMetrics } from '@shared/plasticMetrics';

// Import WebSocket collaboration functions
import { getOnlineUsers, broadcastChatMessage, notifyDocumentLock, broadcastDocumentUnlock } from './websocket';
import { getAllCountryCodes } from './countryMapping';

/**
 * @description Main route registration function setting up all API endpoints including auth, schools, evidence, case studies, events, email, and file uploads. Applies authentication middleware and ACL policies.
 * @param {Express} app - Express application instance
 * @returns {Promise<Server>} HTTP server instance
 * @location server/routes.ts#L232
 * @related server/auth.ts (setupAuth, isAuthenticated, isSchoolMember), server/storage.ts, shared/schema.ts (all tables), client/src/pages/admin.tsx
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Apply trackUserActivity middleware globally to all authenticated routes
  // This updates lastActiveAt timestamp for all user activity
  app.use(trackUserActivity);

  // Serve PDF resources from public folder with proper CORS headers
  app.get('/api/pdfs/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      const { lang } = req.query;
      
      // Whitelist allowed filenames for security
      const allowedFiles = [
        'PCS_PRIMARY_Teacher_Toolkit.pdf',
        'PCS_SECONDARY_Teacher_Toolkit.pdf',
        'PCS_PRIMARY_Pupil_Workbook.pdf',
        'PCS_SECONDARY_Student_Workbook.pdf',
        // Language-specific files
        'PCS_TeacherToolkit_Dutch.pdf',
        'PCS_TeacherToolkit_French.pdf',
        'PCS_TeacherToolkit_Greek.pdf',
        'PCS_TeacherToolkit_Indonesian.pdf',
        'PCS_StudentWorkbook_Dutch.pdf',
        'PCS_StudentWorkbook_French.pdf',
        'PCS_StudentWorkbook_Greek.pdf',
        'PCS_StudentWorkbook_Indonesian.pdf'
      ];
      
      let targetFilename = filename;
      
      // If language parameter is provided, map to language-specific file
      if (lang && typeof lang === 'string') {
        const languageMap: Record<string, string> = {
          'nl': 'Dutch',
          'fr': 'French',
          'el': 'Greek',
          'id': 'Indonesian'
        };
        
        const languageName = languageMap[lang];
        
        if (languageName) {
          // Map base filename to language-specific filename
          if (filename.includes('Teacher_Toolkit')) {
            targetFilename = `PCS_TeacherToolkit_${languageName}.pdf`;
          } else if (filename.includes('Pupil_Workbook') || filename.includes('Student_Workbook')) {
            targetFilename = `PCS_StudentWorkbook_${languageName}.pdf`;
          }
        }
      }
      
      if (!allowedFiles.includes(targetFilename)) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      const filePath = path.resolve(import.meta.dirname, '..', 'public', targetFilename);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        // If language-specific file doesn't exist, fall back to original filename
        if (targetFilename !== filename) {
          const fallbackPath = path.resolve(import.meta.dirname, '..', 'public', filename);
          try {
            await fs.access(fallbackPath);
            // Use fallback file
            const fallbackStream = await fs.readFile(fallbackPath);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            return res.send(fallbackStream);
          } catch {
            return res.status(404).json({ message: 'File not found' });
          }
        }
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Set proper headers for PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${targetFilename}"`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      // Stream the file
      const fileStream = await fs.readFile(filePath);
      res.send(fileStream);
    } catch (error) {
      console.error('Error serving PDF:', error);
      res.status(500).json({ message: 'Failed to serve PDF' });
    }
  });

  // Serve email logo (publicly accessible for email templates)
  app.get('/api/email-logo', async (req, res) => {
    try {
      const logoPath = path.resolve(import.meta.dirname, '..', 'attached_assets', 'PCSWhite_1761216344335.png');
      
      // Check if file exists
      try {
        await fs.access(logoPath);
      } catch {
        return res.status(404).json({ message: 'Logo not found' });
      }
      
      // Set proper headers for PNG image
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      // Stream the file
      const fileStream = await fs.readFile(logoPath);
      res.send(fileStream);
    } catch (error) {
      console.error('Error serving email logo:', error);
      res.status(500).json({ message: 'Failed to serve logo' });
    }
  });

  // Public routes
  
  // Get site statistics (cached for 5 minutes)
  app.get('/api/stats', async (req, res) => {
    try {
      const cacheKey = 'stats';
      const cached = apiCache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }
      
      const stats = await storage.getSchoolStats();
      apiCache.set(cacheKey, stats, CACHE_TTL.SHORT);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Contact form submission
  app.post('/api/contact', async (req, res) => {
    try {
      const contactSchema = z.object({
        fullName: z.string().min(1, "Full name is required"),
        email: z.string().email("Please enter a valid email address"),
        subject: z.string().min(1, "Subject is required"),
        message: z.string().min(10, "Message must be at least 10 characters"),
      });

      const data = contactSchema.parse(req.body);

      // Send email notification
      const emailSent = await sendContactFormEmail(
        data.fullName,
        data.email,
        data.subject,
        data.message
      );

      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send contact form email" });
      }

      res.status(200).json({ 
        success: true, 
        message: "Contact form submitted successfully" 
      });
    } catch (error) {
      console.error("Error processing contact form:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process contact form" });
    }
  });

  // Get comprehensive list of countries (cached for 1 hour - static data)
  app.get('/api/countries', async (req, res) => {
    try {
      const cacheKey = 'countries';
      const cached = apiCache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }
      
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
      apiCache.set(cacheKey, countries, CACHE_TTL.STATIC);
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
  app.get('/api/resources', async (req: any, res) => {
    try {
      const { stage, country, language, ageRange, resourceType, theme, search, limit, offset, includeHidden, includeInactive } = req.query;
      
      // Check if user is authenticated
      const isAuthenticated = req.isAuthenticated && req.isAuthenticated();
      
      // Show public resources to everyone, and private resources only to authenticated users
      // If authenticated, don't filter by visibility (show all resources)
      // If not authenticated, only show public resources
      // Include hidden resources if: there's a search query OR explicitly requested (for admin panel)
      // Include inactive resources if explicitly requested (for admin panel)
      const resources = await storage.getResources({
        stage: stage as string,
        country: country as string,
        language: language as string,
        ageRange: ageRange as string,
        resourceType: resourceType as string,
        theme: theme as string,
        search: search as string,
        visibility: isAuthenticated ? undefined : 'public',
        includeHidden: includeHidden === 'true' || !!search,
        includeInactive: includeInactive === 'true',
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      });
      res.json(resources);
    } catch (error) {
      console.error("Error fetching resources:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  // Get single resource by ID
  app.get('/api/resources/:id', async (req: any, res) => {
    try {
      const resource = await storage.getResourceById(req.params.id);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }
      
      // Check if user is authenticated for private resources
      const isAuthenticated = req.isAuthenticated && req.isAuthenticated();
      if (resource.visibility === 'private' && !isAuthenticated) {
        return res.status(403).json({ message: "Authentication required to access this resource" });
      }
      
      res.json(resource);
    } catch (error) {
      console.error("Error fetching resource:", error);
      res.status(500).json({ message: "Failed to fetch resource" });
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

  // Create new resource (admin/partner only)
  app.post('/api/resources', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user?.isAdmin && req.user?.role !== 'partner') {
        return res.status(403).json({ message: "Admin or Partner access required" });
      }

      // Convert empty strings to null for enum fields
      const resourceData = {
        ...req.body,
        resourceType: req.body.resourceType === '' ? null : req.body.resourceType,
        theme: req.body.theme === '' ? null : req.body.theme,
      };

      const resource = await storage.createResource(resourceData);
      
      // Create notifications for schools at this stage
      await storage.createResourceNotifications(resource.id, resource.title, resource.stage, false);
      
      res.json(resource);
    } catch (error) {
      console.error("Error creating resource:", error);
      res.status(500).json({ message: "Failed to create resource" });
    }
  });

  // Update resource (admin/partner only)
  app.put('/api/resources/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user?.isAdmin && req.user?.role !== 'partner') {
        return res.status(403).json({ message: "Admin or Partner access required" });
      }

      // Convert empty strings to null for enum fields
      const resourceData = {
        ...req.body,
        resourceType: req.body.resourceType === '' ? null : req.body.resourceType,
        theme: req.body.theme === '' ? null : req.body.theme,
      };

      const resource = await storage.updateResource(req.params.id, resourceData);
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }
      
      // Create notifications for schools at this stage (only if file was updated)
      if (req.body.fileUrl && req.body.fileUrl !== resource.fileUrl) {
        await storage.createResourceNotifications(resource.id, resource.title, resource.stage, true);
      }
      
      res.json(resource);
    } catch (error) {
      console.error("Error updating resource:", error);
      res.status(500).json({ message: "Failed to update resource" });
    }
  });

  // Delete resource (admin/partner only)
  app.delete('/api/resources/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user?.isAdmin && req.user?.role !== 'partner') {
        return res.status(403).json({ message: "Admin or Partner access required" });
      }

      const success = await storage.deleteResource(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Resource not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting resource:", error);
      res.status(500).json({ message: "Failed to delete resource" });
    }
  });

  // Get resource packs with filters
  app.get('/api/resource-packs', async (req: any, res) => {
    try {
      const { stage, theme, limit, offset } = req.query;
      
      // Check if user is authenticated
      const isAuthenticated = req.isAuthenticated && req.isAuthenticated();
      
      const packs = await storage.getResourcePacks({
        stage: stage as string,
        theme: theme as string,
        visibility: isAuthenticated ? undefined : 'public', // Only public packs for non-authenticated users
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      });
      res.json(packs);
    } catch (error) {
      console.error("Error fetching resource packs:", error);
      res.status(500).json({ message: "Failed to fetch resource packs" });
    }
  });

  // Download resource pack (increment counter)
  app.get('/api/resource-packs/:id/download', async (req, res) => {
    try {
      await storage.updateResourcePackDownloads(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating download count:", error);
      res.status(500).json({ message: "Failed to update download count" });
    }
  });

  // Get single resource pack with all its resources
  app.get('/api/resource-packs/:id', async (req, res) => {
    try {
      const pack = await storage.getResourcePackById(req.params.id);
      if (!pack) {
        return res.status(404).json({ message: "Resource pack not found" });
      }
      res.json(pack);
    } catch (error) {
      console.error("Error fetching resource pack:", error);
      res.status(500).json({ message: "Failed to fetch resource pack" });
    }
  });

  // Create new resource pack (admin/partner only)
  app.post('/api/resource-packs', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user?.isAdmin && req.user?.role !== 'partner') {
        return res.status(403).json({ message: "Admin or Partner access required" });
      }

      const pack = await storage.createResourcePack(req.body);
      res.json(pack);
    } catch (error) {
      console.error("Error creating resource pack:", error);
      res.status(500).json({ message: "Failed to create resource pack" });
    }
  });

  // Update resource pack (admin/partner only)
  app.put('/api/resource-packs/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user?.isAdmin && req.user?.role !== 'partner') {
        return res.status(403).json({ message: "Admin or Partner access required" });
      }

      const pack = await storage.updateResourcePack(req.params.id, req.body);
      if (!pack) {
        return res.status(404).json({ message: "Resource pack not found" });
      }
      res.json(pack);
    } catch (error) {
      console.error("Error updating resource pack:", error);
      res.status(500).json({ message: "Failed to update resource pack" });
    }
  });

  // Delete resource pack (admin/partner only)
  app.delete('/api/resource-packs/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user?.isAdmin && req.user?.role !== 'partner') {
        return res.status(403).json({ message: "Admin or Partner access required" });
      }

      const success = await storage.deleteResourcePack(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Resource pack not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting resource pack:", error);
      res.status(500).json({ message: "Failed to delete resource pack" });
    }
  });

  // Add resource to pack (admin/partner only)
  app.post('/api/resource-packs/:id/resources', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user?.isAdmin && req.user?.role !== 'partner') {
        return res.status(403).json({ message: "Admin or Partner access required" });
      }

      const { resourceId, orderIndex } = req.body;
      if (!resourceId) {
        return res.status(400).json({ message: "resourceId is required" });
      }

      const item = await storage.addResourceToPack(
        req.params.id,
        resourceId,
        orderIndex ?? 0
      );
      res.json(item);
    } catch (error) {
      console.error("Error adding resource to pack:", error);
      res.status(500).json({ message: "Failed to add resource to pack" });
    }
  });

  // Remove resource from pack (admin/partner only)
  app.delete('/api/resource-packs/:id/resources/:resourceId', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user?.isAdmin && req.user?.role !== 'partner') {
        return res.status(403).json({ message: "Admin or Partner access required" });
      }

      const success = await storage.removeResourceFromPack(
        req.params.id,
        req.params.resourceId
      );
      if (!success) {
        return res.status(404).json({ message: "Resource not found in pack" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing resource from pack:", error);
      res.status(500).json({ message: "Failed to remove resource from pack" });
    }
  });

  // Bulk upload resources (admin/partner only)
  // (using bulkResourceUpload from utils/uploads.ts)
  app.post('/api/resources/bulk-upload', isAuthenticated, bulkResourceUpload.array('files', 50), async (req: any, res) => {
    try {
      if (!req.user?.isAdmin && req.user?.role !== 'partner') {
        return res.status(403).json({ message: "Admin or Partner access required" });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files provided" });
      }

      const userId = req.user.id;
      const objectStorageService = new ObjectStorageService();
      const results = [];
      const errors = [];

      // Process each file
      for (const file of req.files) {
        try {
          const filename = file.originalname;
          const mimeType = file.mimetype;
          const fileSize = file.buffer.length;
          
          // Generate title from filename
          const title = generateTitleFromFilename(filename);
          
          // Get upload URL from object storage
          const uploadURL = await objectStorageService.getObjectEntityUploadURL();
          
          // Upload file to object storage
          const uploadResponse = await fetch(uploadURL, {
            method: 'PUT',
            body: file.buffer,
            headers: {
              'Content-Type': mimeType,
              'Content-Length': fileSize.toString(),
            },
          });

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
          }

          // Set ACL policy with public visibility
          const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
            uploadURL.split('?')[0],
            {
              owner: userId,
              visibility: 'public',
            },
            filename,
          );

          // Create resource record with default values
          const resource = await storage.createResource({
            title,
            stage: 'inspire',
            visibility: 'public',
            isActive: true,
            fileUrl: objectPath,
            fileType: mimeType,
            fileSize,
            languages: ['en'], // Default to English until admin sets the correct language
          });

          results.push({
            success: true,
            filename,
            resource,
          });

          console.log(`Successfully uploaded resource: ${filename} -> ${title}`);
        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          errors.push({
            filename: file.originalname,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      res.status(200).json({
        success: true,
        message: `Processed ${req.files.length} files: ${results.length} succeeded, ${errors.length} failed`,
        results,
        errors,
      });
    } catch (error) {
      console.error("Error in bulk upload:", error);
      res.status(500).json({ message: "Failed to process bulk upload" });
    }
  });

  // AI-powered metadata generation for resources (admin only)
  app.post('/api/resources/ai-analyze-metadata', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const requestSchema = z.object({
        resources: z.array(z.object({
          id: z.string(),
          title: z.string(),
          filename: z.string(),
          fileType: z.string(),
        })),
      });

      const { resources } = requestSchema.parse(req.body);

      if (resources.length === 0) {
        return res.json({ suggestions: [] });
      }

      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OpenAI API key not configured for AI metadata analysis');
        return res.status(503).json({ 
          message: "AI analysis service not configured. Please contact administrator.",
          suggestions: [] 
        });
      }

      // Initialize OpenAI client
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const suggestions = [];

      // Process each resource
      for (const resource of resources) {
        try {
          const prompt = `Analyse this educational resource for the Plastic Clever Schools programme and suggest metadata:

Current Title: ${resource.title}
Filename: ${resource.filename}
File Type: ${resource.fileType}

Context: This is an educational resource about plastic pollution, ocean literacy, and environmental action for schools.

Available stages: inspire (introduce topic), investigate (research/explore), act (take action)
Available themes: ocean_literacy, climate_change, plastic_pollution, science, design_technology, geography, cross_curricular, enrichment
Available resource types: lesson_plan, assembly, teacher_toolkit, student_workbook, printable_activities

Return JSON with:
- title: A clear, descriptive, professional title (improve the current title if needed, max 80 characters)
- description: An engaging 2-3 sentence description explaining what the resource is and how teachers can use it
- stage: one of the available stages that best fits this resource
- theme: one of the available themes that best fits this resource
- ageRange: suggested age range (e.g., "5-7 years", "8-11 years", "11-14 years", "14-16 years")
- resourceType: one of the available resource types`;

          const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            console.error(`No response from OpenAI for resource ${resource.id}`);
            continue;
          }

          const aiSuggestion = JSON.parse(content);

          suggestions.push({
            id: resource.id,
            title: aiSuggestion.title || resource.title,
            description: aiSuggestion.description || '',
            stage: aiSuggestion.stage || 'inspire',
            theme: aiSuggestion.theme || 'ocean_literacy',
            ageRange: aiSuggestion.ageRange || '',
            resourceType: aiSuggestion.resourceType || 'lesson_plan',
          });

          console.log(`AI metadata generated for resource ${resource.id}: ${aiSuggestion.title || resource.title}`);
        } catch (error) {
          console.error(`Error analyzing resource ${resource.id}:`, error);
          // Continue processing other resources, don't fail the entire request
        }
      }

      res.json({ suggestions });
    } catch (error) {
      console.error("Error in AI metadata analysis:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      // Return empty suggestions on failure instead of failing
      res.json({ suggestions: [] });
    }
  });

  // Get notifications for authenticated user's school
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { unreadOnly } = req.query;
      
      // Get the user's school(s)
      const userSchools = await storage.getUserSchools(userId);
      
      if (userSchools.length === 0) {
        return res.json([]);
      }
      
      // Get notifications for the first school (primary school)
      const notifications = await storage.getSchoolNotifications(
        userSchools[0].id,
        unreadOnly === 'true'
      );
      
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get('/api/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userSchools = await storage.getUserSchools(userId);
      
      if (userSchools.length === 0) {
        return res.json({ count: 0 });
      }
      
      const count = await storage.getUnreadNotificationCount(userSchools[0].id);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // Mark notification as read
  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const notification = await storage.markNotificationAsRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read for user's school
  app.patch('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userSchools = await storage.getUserSchools(userId);
      
      if (userSchools.length === 0) {
        return res.json({ success: true });
      }
      
      await storage.markAllNotificationsAsRead(userSchools[0].id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Delete notification
  app.delete('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const success = await storage.deleteNotification(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  /**
   * @description GET /api/inspiration-content - Combined endpoint for case studies and approved evidence
   * @returns {Array} Array of case studies and evidence with contentType field
   * @location server/routes.ts
   * @related client/src/pages/inspiration.tsx
   */
  app.get('/api/inspiration-content', async (req: any, res) => {
    try {
      const { stage, country, search, contentType, limit, offset, featured, categories, tags } = req.query;
      
      // Check if user is authenticated
      const isAuthenticated = req.isAuthenticated && req.isAuthenticated();
      const isAdmin = isAuthenticated && req.user?.isAdmin;
      
      const requestedLimit = limit ? parseInt(limit as string) : 20;
      const requestedOffset = offset ? parseInt(offset as string) : 0;
      
      // Parse featured filter (convert string 'true' to boolean)
      const featuredFilter = featured === 'true' ? true : undefined;
      
      // Parse categories and tags filters (split comma-separated values into arrays)
      const categoriesFilter = categories ? (categories as string).split(',').map(c => c.trim()) : undefined;
      const tagsFilter = tags ? (tags as string).split(',').map(t => t.trim()) : undefined;
      
      let combinedResults: any[] = [];
      
      // Determine which content types to fetch
      const shouldFetchCaseStudies = !contentType || contentType === 'all' || contentType === 'case-study';
      const shouldFetchEvidence = !contentType || contentType === 'all' || contentType === 'evidence';
      
      // When fetching both types (contentType='all'), fetch a reasonable buffer
      // Use a constant buffer multiplier to prevent exponential growth on subsequent pages
      const isMixedContent = contentType === 'all' || !contentType;
      const bufferMultiplier = 2; // Fetch 2x the requested page to ensure enough after sorting
      const fetchLimit = isMixedContent 
        ? (requestedOffset + requestedLimit) + (requestedLimit * bufferMultiplier)
        : requestedLimit;
      const fetchOffset = isMixedContent 
        ? 0  // Always start from beginning when mixing to ensure correct sorting
        : requestedOffset;
      
      // Fetch case studies (published only for non-admin)
      if (shouldFetchCaseStudies) {
        const statusFilter = isAdmin ? undefined : 'published';
        const caseStudies = await storage.getCaseStudies({
          stage: stage as string,
          country: country as string,
          search: search as string,
          featured: featuredFilter,
          categories: categoriesFilter,
          tags: tagsFilter,
          status: statusFilter,
          limit: contentType === 'case-study' ? requestedLimit : fetchLimit,
          offset: contentType === 'case-study' ? requestedOffset : fetchOffset,
        });
        
        // Add contentType field to case studies and normalize URLs
        const caseStudiesWithType = caseStudies.map(cs => ({
          ...cs,
          contentType: 'case-study',
          imageUrl: normalizeObjectStorageUrl(cs.imageUrl),
          images: Array.isArray(cs.images) ? cs.images.map((img: any) => ({
            ...img,
            url: normalizeObjectStorageUrl(img.url),
          })) : cs.images,
        }));
        
        combinedResults = [...combinedResults, ...caseStudiesWithType];
      }
      
      // Fetch approved evidence
      if (shouldFetchEvidence) {
        // IMPORTANT: Private evidence should ONLY be visible to the uploading school and admins
        // The inspiration gallery should ONLY show public evidence to everyone
        const visibilityFilter = 'public';
        
        const evidenceList = await storage.getApprovedEvidenceForInspiration({
          stage: stage as string,
          country: country as string,
          search: search as string,
          visibility: visibilityFilter,
          limit: contentType === 'evidence' ? requestedLimit : fetchLimit,
          offset: contentType === 'evidence' ? requestedOffset : fetchOffset,
        });
        
        // Transform evidence to match case study format
        const evidenceWithType = evidenceList.map(ev => {
          // Map files array to images format with normalized URLs
          const files = Array.isArray(ev.files) ? ev.files : [];
          const images = files.map((file: any) => ({
            url: normalizeObjectStorageUrl(file.url),
            caption: file.caption || file.name,
            type: file.type,
            name: file.name,
            size: file.size,
          }));
          
          return {
            id: ev.id,
            title: ev.title,
            description: ev.description || '',
            stage: ev.stage,
            status: ev.status,
            imageUrl: images[0]?.url || null,
            featured: ev.isFeatured || false,
            schoolName: ev.schoolName,
            schoolCountry: ev.schoolCountry,
            schoolLanguage: ev.schoolLanguage,
            createdAt: ev.submittedAt,
            images: images,
            videos: ev.videoLinks ? [{ url: ev.videoLinks }] : [],
            studentQuotes: [],
            impactMetrics: [],
            categories: [],
            tags: [],
            contentType: 'evidence',
            evidenceFiles: images, // Include evidence files with normalized URLs for PDF thumbnails
          };
        });
        
        combinedResults = [...combinedResults, ...evidenceWithType];
      }
      
      // Sort combined results:
      // 1. Featured case studies (contentType === 'case-study' && featured === true)
      // 2. Regular case studies (contentType === 'case-study' && featured === false)
      // 3. Featured evidence (contentType === 'evidence' && featured === true)
      // 4. Regular evidence (contentType === 'evidence' && featured === false)
      combinedResults.sort((a, b) => {
        // Priority scoring: case-study=2, evidence=1; featured adds 10
        const scoreA = (a.contentType === 'case-study' ? 20 : 10) + (a.featured ? 10 : 0);
        const scoreB = (b.contentType === 'case-study' ? 20 : 10) + (b.featured ? 10 : 0);
        
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Higher score first
        }
        
        // If same priority, sort by date (newest first)
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      
      // Apply pagination to combined results if fetching all types
      if (contentType === 'all' || !contentType) {
        combinedResults = combinedResults.slice(requestedOffset, requestedOffset + requestedLimit);
      }
      
      res.json(combinedResults);
    } catch (error) {
      console.error("Error fetching inspiration content:", error);
      res.status(500).json({ message: "Failed to fetch inspiration content" });
    }
  });

  /**
   * @description GET /api/case-studies - Public endpoint for retrieving case studies with filtering by stage, country, categories, tags. Only published case studies shown to non-admin users.
   * @returns {CaseStudy[]} Array of case study objects with pagination
   * @location server/routes.ts#L461
   * @related shared/schema.ts (caseStudies table), client/src/pages/inspiration.tsx, client/src/pages/admin.tsx (CaseStudyEditor)
   */
  app.get('/api/case-studies', async (req: any, res) => {
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
      
      const caseStudies = await storage.getCaseStudies({
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
      const normalizedCaseStudies = caseStudies.map(cs => ({
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

  // Get single case study by ID
  app.get('/api/case-studies/:id', async (req: any, res) => {
    try {
      const caseStudy = await storage.getCaseStudyById(req.params.id);
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
        const creator = await storage.getUser(caseStudy.createdBy);
        if (creator) {
          createdByName = `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || creator.email || 'Unknown';
        }
      }
      
      // Get evidence data if evidenceId is present
      let evidenceLink: string | null = null;
      let evidenceFiles: any[] | null = null;
      if (caseStudy.evidenceId) {
        const evidence = await storage.getEvidenceById(caseStudy.evidenceId);
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

  // Get single evidence by ID (public endpoint for approved evidence)
  app.get('/api/evidence/:id', async (req: any, res) => {
    try {
      const evidence = await storage.getEvidenceById(req.params.id);
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

  // Get related case studies by ID
  app.get('/api/case-studies/:id/related', async (req, res) => {
    try {
      const { id } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 4;
      const relatedCaseStudies = await storage.getRelatedCaseStudies(id, limit);
      
      // Normalize URLs in related case studies
      const normalizedRelated = relatedCaseStudies.map(cs => ({
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
   * @description GET /api/case-studies/:id/pdf - Generates and downloads beautifully formatted PDF of case study using Puppeteer. Includes images, metrics, timeline, and quotes.
   * @param {string} id - Case study ID from URL params
   * @returns {Buffer} PDF file buffer for download
   * @location server/routes.ts#L533
   * @related generatePdfHtml, shared/schema.ts (caseStudies table), client/src/pages/inspiration.tsx
   */
  app.get('/api/case-studies/:id/pdf', async (req: any, res) => {
    try {
      const caseStudy = await storage.getCaseStudyById(req.params.id);
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
        const evidence = await storage.getEvidenceById(caseStudy.evidenceId);
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
      
      console.log('[PDF] Starting PDF generation for case study:', caseStudy.id);
      
      // Use system Chromium for Replit/NixOS compatibility
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || 
                            '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
      
      const browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer'
        ]
      });
      
      console.log('[PDF] Browser launched successfully');
      
      const page = await browser.newPage();
      
      // Get base URL for converting relative image URLs to absolute
      const protocol = req.protocol || 'https';
      const host = req.get('host') || 'plasticcleverschools.com';
      const baseUrl = `${protocol}://${host}`;
      
      // Generate beautiful HTML for PDF
      const htmlContent = generatePdfHtml(caseStudyWithEvidence, baseUrl);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      console.log('[PDF] HTML content loaded, waiting for images...');
      
      // Wait for all images to load or fail
      try {
        await page.evaluate(() => {
          return Promise.all(
            Array.from(document.images).map((img) => {
              if (img.complete) return Promise.resolve();
              return new Promise((resolve) => {
                img.addEventListener('load', resolve);
                img.addEventListener('error', resolve); // Continue even if image fails
              });
            })
          );
        });
        console.log('[PDF] All images loaded');
      } catch (error) {
        console.log('[PDF] Image loading timeout or error, continuing...', error);
      }
      
      console.log('[PDF] Generating PDF...');
      
      // Generate PDF with options
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
      });
      
      await browser.close();
      
      console.log('[PDF] PDF generated successfully');
      
      // Set headers
      const filename = sanitizeFilename(caseStudy.title);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      res.send(Buffer.from(pdf));
    } catch (error) {
      console.error('[PDF] PDF generation error:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
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

  // Get schools for map (cached for 15 minutes, per country and activity filter)
  app.get('/api/schools/map', async (req, res) => {
    try {
      const { country, lastActiveDays } = req.query;
      const cacheKey = `schools-map-${country || 'all'}-${lastActiveDays || 'all'}`;
      const cached = apiCache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }
      
      const schools = await storage.getSchools({
        country: country as string,
        showOnMap: true, // Only show schools that have consented to be on the map
        lastActiveDays: lastActiveDays ? parseInt(lastActiveDays as string) : undefined,
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
      
      apiCache.set(cacheKey, mapData, CACHE_TTL.MEDIUM);
      res.json(mapData);
    } catch (error) {
      console.error("Error fetching schools for map:", error);
      res.status(500).json({ message: "Failed to fetch schools for map" });
    }
  });

  // Get school counts by country for choropleth map (cached for 15 minutes)
  app.get('/api/schools/map/summary', async (req, res) => {
    try {
      const { country, lastActiveDays } = req.query;
      const cacheKey = `schools-map-summary-${country || 'all'}-${lastActiveDays || 'all'}`;
      const cached = apiCache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }
      
      const countryCounts = await storage.getSchoolCountsByCountry({
        country: country as string,
        lastActiveDays: lastActiveDays ? parseInt(lastActiveDays as string) : undefined,
      });
      
      apiCache.set(cacheKey, countryCounts, CACHE_TTL.MEDIUM);
      res.json(countryCounts);
    } catch (error) {
      console.error("Error fetching school counts by country:", error);
      res.status(500).json({ message: "Failed to fetch school counts" });
    }
  });

  /**
   * @description GET /api/schools - Retrieves list of schools with optional filtering by country, type, and search term. Used for join school flow and public directory.
   * @returns {School[]} Array of school objects with pagination
   * @location server/routes.ts#L645
   * @related shared/schema.ts (schools table), client/src/components/JoinSchoolFlow.tsx
   */
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

  /**
   * @description GET /api/schools-with-image-counts - Get schools with count of approved evidence images for case study wizard
   * @returns {Array} Schools with imageCount property showing number of approved evidence images
   */
  app.get('/api/schools-with-image-counts', async (req, res) => {
    try {
      const schools = await storage.getSchools({ limit: 1000, offset: 0 });
      
      // For each school, count approved evidence with images
      const schoolsWithCounts = await Promise.all(
        schools.map(async (school) => {
          const evidenceList = await storage.getAllEvidence({ schoolId: school.id, status: 'approved' });
          
          // Count evidence items that have images (non-empty images array)
          const imageCount = evidenceList.filter((ev: any) => {
            const images = ev.images;
            return images && Array.isArray(images) && images.length > 0;
          }).reduce((total: number, ev: any) => {
            const images = ev.images;
            return total + (Array.isArray(images) ? images.length : 0);
          }, 0);
          
          return {
            ...school,
            approvedImageCount: imageCount
          };
        })
      );
      
      res.json(schoolsWithCounts);
    } catch (error) {
      console.error("Error fetching schools with image counts:", error);
      res.status(500).json({ message: "Failed to fetch schools with image counts" });
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

  /**
   * @description POST /api/schools/register - Public endpoint for school registration creating user account, school record, and establishing head_teacher relationship. Sends welcome email and triggers Mailchimp automation.
   * @returns {Object} Created school and user objects with session
   * @location server/routes.ts#L757
   * @related shared/schema.ts (schools, users, schoolUsers tables), server/email.ts (sendWelcomeEmail), client/src/components/MultiStepSchoolRegistration.tsx
   */
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
            await sendWelcomeEmail(user.email!, school.name, user.preferredLanguage || 'en');
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
          req.session.save(async (saveErr) => {
            if (saveErr) {
              console.error("Error saving session:", saveErr);
              return res.status(500).json({ message: "Registration successful but session save failed" });
            }

            // Log school creation
            await logUserActivity(
              user.id,
              user.email || undefined,
              'school_create',
              {
                schoolId: school.id,
                schoolName: school.name,
                schoolCountry: school.country,
              },
              school.id,
              'school',
              req
            );

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
        adminEmail: z.string().min(1).email(),
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
        // Optional: Current UI language for welcome email
        language: z.string().optional(),
      });

      const data = multiStepSchema.parse(req.body);

      // Map primaryLanguage to language code for preferredLanguage
      const languageMap: Record<string, string> = {
        'English': 'en',
        'Spanish': 'es',
        'French': 'fr',
        'German': 'de',
        'Portuguese': 'pt',
        'Italian': 'it',
        'Dutch': 'nl',
        'Greek': 'el',
        'Chinese (Mandarin)': 'zh',
        'Japanese': 'ja',
        'Korean': 'ko',
        'Arabic': 'ar',
        'Hindi': 'hi',
        'Other': 'en'
      };
      
      const preferredLanguage = languageMap[data.primaryLanguage] || 'en';
      
      // Update user info if different from auth
      if (data.firstName !== req.user.firstName || data.lastName !== req.user.lastName || data.email !== req.user.email || preferredLanguage !== req.user.preferredLanguage) {
        await storage.updateUser(userId, {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          preferredLanguage: preferredLanguage,
        });
      }

      // Create school with all the collected data
      const school = await storage.createSchool({
        name: data.schoolName,
        country: data.country,
        address: data.address,
        adminEmail: data.adminEmail,
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
      // Use provided language from UI, otherwise fall back to user's preferredLanguage
      try {
        await sendWelcomeEmail(req.user.email!, school.name, data.language || req.user.preferredLanguage || 'en');
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
      
      // Check if user is a member of this school
      const schoolUser = await storage.getSchoolUser(schoolId, userId);
      if (!schoolUser) {
        console.log(`[Teacher Invitation] Access denied - user is not a school member`);
        return res.status(403).json({ message: "You must be a member of this school to invite teachers" });
      }
      
      // Check if the invited email already belongs to a teacher on this school's team
      const invitedUser = await storage.findUserByEmail(email);
      if (invitedUser) {
        const existingSchoolUser = await storage.getSchoolUser(schoolId, invitedUser.id);
        if (existingSchoolUser) {
          console.log(`[Teacher Invitation] Teacher ${email} is already a member of school ${schoolId}`);
          return res.status(400).json({ 
            message: "This teacher is already a member of your school team" 
          });
        }
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
      if (school && inviter) {
        const inviterName = `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || 'A colleague';
        const expiresInDays = 7;
        
        await sendTeacherInvitationEmail(
          email,
          school.name,
          inviterName,
          token,
          expiresInDays,
          inviter.preferredLanguage || 'en'
        );
        console.log(`[Teacher Invitation] Sent vibrant invitation email to ${email}`);
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
      
      // Check if user is a member of this school
      const schoolUser = await storage.getSchoolUser(schoolId, userId);
      if (!schoolUser) {
        console.log(`[Teacher Invitations] Access denied - user is not a school member`);
        return res.status(403).json({ message: "You must be a member of this school to view invitations" });
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
      
      // Check if the invited email has an existing user account with a password
      const existingUser = await storage.findUserByEmail(invitation.email);
      const hasExistingAccount = !!existingUser;
      const authMethod = (existingUser && existingUser.passwordHash) ? 'password' : 'none';
      
      console.log(`[Get Invitation] User exists: ${hasExistingAccount}, auth method: ${authMethod}`);
      
      // Get school and inviter details
      const school = await storage.getSchool(invitation.schoolId);
      const inviter = invitation.invitedBy ? await storage.getUser(invitation.invitedBy) : null;
      
      console.log(`[Get Invitation] Returning invitation details for ${invitation.email}`);
      
      res.json({
        email: invitation.email,
        schoolName: school?.name || 'Unknown School',
        schoolCountry: school?.country,
        inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() : 'A colleague',
        expiresAt: invitation.expiresAt,
        status: invitation.status,
        authMethod,
        hasExistingAccount,
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
  
  // USER PROFILE MANAGEMENT ROUTES
  
  // PUT /api/user/profile - Update user profile (basic information)
  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Validate request body
      const profileSchema = z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
      });
      
      const updates = profileSchema.parse(req.body);
      
      // If email is being changed, check if it's already in use
      if (updates.email && updates.email !== req.user.email) {
        const existingUser = await storage.findUserByEmail(updates.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({ message: "Email already in use" });
        }
      }
      
      // Update user profile
      const updatedUser = await storage.updateUser(userId, updates);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`[Profile Update] User ${userId} updated profile`);
      
      res.json({ 
        message: "Profile updated successfully",
        user: updatedUser
      });
    } catch (error) {
      console.error("[Profile Update] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // PUT /api/user/language - Update user's preferred language
  app.put('/api/user/language', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Validate request body
      const languageSchema = z.object({
        language: z.string().min(2).max(5), // e.g., 'en', 'es', 'fr', 'zh-CN'
      });
      
      const { language } = languageSchema.parse(req.body);
      
      // Update user's preferred language
      const updatedUser = await storage.updateUser(userId, { 
        preferredLanguage: language 
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`[Language Update] User ${userId} changed language to ${language}`);
      
      res.json({ 
        message: "Language preference updated successfully",
        user: updatedUser
      });
    } catch (error) {
      console.error("[Language Update] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update language preference" });
    }
  });

  // PUT /api/user/password - Change user password
  app.put('/api/user/password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user has a password (not OAuth only)
      if (!user.passwordHash) {
        return res.status(400).json({ 
          message: "Cannot change password for OAuth-only accounts" 
        });
      }
      
      // Validate request body
      const passwordSchema = z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      });
      
      const { currentPassword, newPassword } = passwordSchema.parse(req.body);
      
      // Verify current password
      const isPasswordValid = await storage.verifyPassword(currentPassword, user.passwordHash);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const newPasswordHash = await storage.hashPassword(newPassword);
      
      // Update password
      const updatedUser = await storage.updateUserPassword(userId, newPasswordHash);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      console.log(`[Password Change] User ${userId} changed password`);
      
      res.json({ 
        message: "Password changed successfully"
      });
    } catch (error) {
      console.error("[Password Change] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // POST /api/auth/reset-migrated-password - Reset password for migrated users
  app.post('/api/auth/reset-migrated-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Only allow migrated users with needsPasswordReset flag
      if (!user.isMigrated || !user.needsPasswordReset) {
        return res.status(403).json({ 
          message: "This endpoint is only for migrated users who need to reset their password" 
        });
      }
      
      // Validate request body
      const passwordSchema = z.object({
        password: z.string().min(8, "Password must be at least 8 characters"),
      });
      
      const { password } = passwordSchema.parse(req.body);
      
      // Hash new password
      const passwordHash = await storage.hashPassword(password);
      
      // Update password and clear needsPasswordReset flag
      await db
        .update(users)
        .set({ 
          passwordHash, 
          needsPasswordReset: false, 
          updatedAt: new Date() 
        })
        .where(eq(users.id, userId));
      
      console.log(`[Migrated User] User ${userId} reset their password`);
      
      res.json({ 
        success: true,
        message: "Password updated successfully"
      });
    } catch (error) {
      console.error("[Migrated User Password Reset] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ success: false, message: "Failed to update password" });
    }
  });

  // POST /api/auth/complete-migrated-onboarding - Complete onboarding for migrated users
  app.post('/api/auth/complete-migrated-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Validate request body (only editable fields - schoolName and currentStage are read-only)
      const profileSchema = z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().optional(),
        preferredLanguage: z.string().optional(),
        studentCount: z.number().int().positive().optional(),
        country: z.string().min(1).optional(),
      });
      
      const { firstName, lastName, preferredLanguage, studentCount, country } = profileSchema.parse(req.body);
      
      console.log(`[Migrated User Onboarding] User ${userId} updating profile:`, {
        firstName,
        lastName,
        preferredLanguage,
        studentCount,
        country
      });
      
      // Update user profile and mark onboarding as complete
      await db
        .update(users)
        .set({ 
          firstName, 
          lastName: lastName || user.lastName,
          preferredLanguage: preferredLanguage || user.preferredLanguage,
          needsPasswordReset: false,
          hasSeenOnboarding: true,
          updatedAt: new Date() 
        })
        .where(eq(users.id, userId));
      
      // If any editable school fields are provided, update the user's school
      // Note: schoolName and currentStage are read-only during onboarding
      const hasSchoolUpdates = studentCount !== undefined || country !== undefined;
      
      if (hasSchoolUpdates) {
        console.log(`[Migrated User Onboarding] Updating school fields for user ${userId}`);
        
        // Fetch user's school via schoolUsers table
        const userSchools = await db
          .select({
            schoolId: schoolUsers.schoolId,
          })
          .from(schoolUsers)
          .where(eq(schoolUsers.userId, userId))
          .limit(1);
        
        if (userSchools.length > 0) {
          const schoolId = userSchools[0].schoolId;
          
          // Build update object with only the editable fields
          const schoolUpdates: any = {
            updatedAt: new Date()
          };
          
          if (studentCount !== undefined) schoolUpdates.studentCount = studentCount;
          if (country !== undefined) schoolUpdates.country = country;
          
          // Update the school
          await db
            .update(schools)
            .set(schoolUpdates)
            .where(eq(schools.id, schoolId));
          
          console.log(`[Migrated User Onboarding] Updated school ${schoolId} with:`, schoolUpdates);
        } else {
          console.log(`[Migrated User Onboarding] No school found for user ${userId}, skipping school updates`);
        }
      }
      
      console.log(`[Migrated User Onboarding] User ${userId} completed onboarding successfully`);
      
      // Fetch and return the updated user object
      const updatedUser = await storage.getUser(userId);
      
      res.json(updatedUser);
    } catch (error) {
      console.error("[Migrated User Onboarding] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ success: false, message: "Failed to complete onboarding" });
    }
  });

  // GET /api/auth/migrated-user-school - Get school details for migrated user
  app.get('/api/auth/migrated-user-school', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      console.log(`[Migrated User School] Fetching school for user ${userId}`);
      
      // Fetch school linked to the authenticated user via schoolUsers table
      const userSchoolData = await db
        .select({
          school: schools,
          role: schoolUsers.role,
        })
        .from(schoolUsers)
        .innerJoin(schools, eq(schoolUsers.schoolId, schools.id))
        .where(eq(schoolUsers.userId, userId))
        .limit(1);
      
      if (userSchoolData.length === 0) {
        console.log(`[Migrated User School] No school found for user ${userId}`);
        return res.status(404).json({ 
          message: "No school found for this user. Please contact support if you believe this is an error." 
        });
      }
      
      const { school, role } = userSchoolData[0];
      
      console.log(`[Migrated User School] Found school ${school.id} for user ${userId} with role ${role}`);
      
      // Return all school fields, renaming 'name' to 'schoolName' for frontend compatibility
      const { name, ...restSchool } = school;
      res.json({
        ...restSchool,
        schoolName: name,
        role,
      });
    } catch (error) {
      console.error("[Migrated User School] Error:", error);
      res.status(500).json({ message: "Failed to fetch school details" });
    }
  });

  // DELETE /api/user/account - Delete user account (GDPR compliant)
  app.delete('/api/user/account', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      console.log(`[Account Deletion] User ${userId} requested account deletion`);
      
      // Delete user account (cascade will handle related records)
      const deleted = await storage.deleteUser(userId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete account" });
      }
      
      // Log out the user
      req.logout((err: Error) => {
        if (err) {
          console.error("[Account Deletion] Error during logout:", err);
        }
      });
      
      console.log(`[Account Deletion] User ${userId} account deleted successfully (GDPR compliant)`);
      
      res.json({ 
        message: "Account deleted successfully. All your personal data has been removed in compliance with GDPR."
      });
    } catch (error) {
      console.error("[Account Deletion] Error:", error);
      res.status(500).json({ message: "Failed to delete account" });
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
            from: getFromAddress(),
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
      
      // Check if user is a member of this school
      const schoolUser = await storage.getSchoolUser(schoolId, userId);
      if (!schoolUser) {
        console.log(`[Verification Requests] Access denied - user is not a school member`);
        return res.status(403).json({ message: "You must be a member of this school to view verification requests" });
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
      
      // Check if user is a member of this school or admin
      const schoolUser = await storage.getSchoolUser(request.schoolId, userId);
      const user = await storage.getUser(userId);
      if (!schoolUser && !user?.isAdmin) {
        console.log(`[Approve Request] Access denied - user is not a school member or admin`);
        return res.status(403).json({ message: "You must be a member of this school or an admin to approve requests" });
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
          from: getFromAddress(),
          subject: `Access approved for ${school.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Access Approved!</h2>
              <p>Your request to join ${school.name} has been approved.</p>
              ${reviewNotes ? `<p><strong>Notes from reviewer:</strong> ${reviewNotes}</p>` : ''}
              <p>You can now access the school dashboard and collaborate with your team.</p>
              <a href="${getBaseUrl()}/dashboard" style="background: #02BBB4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Go to Dashboard</a>
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
      
      // Check if user is a member of this school or admin
      const schoolUser = await storage.getSchoolUser(request.schoolId, userId);
      const user = await storage.getUser(userId);
      if (!schoolUser && !user?.isAdmin) {
        console.log(`[Reject Request] Access denied - user is not a school member or admin`);
        return res.status(403).json({ message: "You must be a member of this school or an admin to reject requests" });
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
          from: getFromAddress(),
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

  /**
   * @description POST /api/evidence - Authenticated endpoint for submitting evidence with files/videos. Validates stage locking (unlocked stages only unless admin/partner), sends confirmation and admin notification emails.
   * @returns {Evidence} Created evidence object
   * @location server/routes.ts#L1546
   * @related shared/schema.ts (evidence table, insertEvidenceSchema), server/email.ts (sendEvidenceSubmissionEmail, sendAdminNewEvidenceEmail), client/src/components/EvidenceSubmissionForm.tsx
   */
  app.post('/api/evidence', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      // Mark user as having interacted (evidence submission is a meaningful action)
      await markUserInteracted(userId);
      
      // Check if user is admin or partner
      const isAdminOrPartner = user?.isAdmin || user?.role === 'partner';
      
      // Get school to check stage lock status and round number
      const school = await storage.getSchool(req.body.schoolId);
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
        const schoolUser = await storage.getSchoolUser(evidenceData.schoolId, userId);
        if (!schoolUser) {
          return res.status(403).json({ 
            message: "You must be a member of the school to submit evidence" 
          });
        }
      }

      const evidence = await storage.createEvidence(evidenceData);

      // If admin uploaded and auto-approved, check and update school progression
      if (user?.isAdmin) {
        await storage.checkAndUpdateSchoolProgression(evidenceData.schoolId);
      }

      // Skip email notifications for admin uploads
      if (!user?.isAdmin) {
        // Send email notifications (non-blocking) for non-admin submissions
        try {
          const user = await storage.getUser(userId);
          const school = await storage.getSchool(evidenceData.schoolId);
          
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

  // Get user's evidence with optional filters for case study creation
  app.get('/api/evidence', isAuthenticated, async (req: any, res) => {
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
          const schoolUser = await storage.getSchoolUser(targetSchoolId, userId);
          if (!schoolUser) {
            return res.status(403).json({ 
              message: "You don't have permission to view evidence for this school" 
            });
          }
        }
      } else {
        // No schoolId provided, get user's first school
        const schools = await storage.getUserSchools(userId);
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
      let evidence = await storage.getAllEvidence(filters);
      
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

  // Update evidence (admin only)
  app.patch('/api/admin/evidence/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Get existing evidence to verify it exists
      const evidence = await storage.getEvidence(id);
      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }

      // If updating status to approved or rejected, use proper review method
      if (updates.status && ['approved', 'rejected'].includes(updates.status) && evidence.status !== updates.status) {
        console.log(`[Evidence] Updating evidence ${id} status to ${updates.status} via admin PATCH`);
        const updatedEvidence = await storage.updateEvidenceStatus(
          id,
          updates.status as 'approved' | 'rejected',
          req.user.id,
          updates.reviewNotes
        );
        
        if (!updatedEvidence) {
          return res.status(500).json({ message: "Failed to update evidence" });
        }

        // Check and update school progression if approved
        if (updates.status === 'approved') {
          console.log(`[Evidence] Triggering school progression check for school ${updatedEvidence.schoolId}`);
          await storage.checkAndUpdateSchoolProgression(updatedEvidence.schoolId);
        }

        return res.json(updatedEvidence);
      }

      // For other updates, use regular update method
      const updatedEvidence = await storage.updateEvidence(id, updates);
      if (!updatedEvidence) {
        return res.status(500).json({ message: "Failed to update evidence" });
      }

      res.json(updatedEvidence);
    } catch (error) {
      console.error("Error updating evidence:", error);
      res.status(500).json({ message: "Failed to update evidence" });
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

  // Generate translations for evidence requirement (admin only)
  app.post('/api/evidence-requirements/:id/translate', isAuthenticated, async (req: any, res) => {
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
      
      const requirement = await storage.getEvidenceRequirement(id);
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

      const updated = await storage.updateEvidenceRequirement(id, { translations });
      
      console.log(`[Evidence Requirement Translated] ID: ${id}, Languages: ${Object.keys(translations).length}`);
      res.json({ translations, requirement: updated });
    } catch (error) {
      console.error("Error translating evidence requirement:", error);
      res.status(500).json({ message: "Failed to translate evidence requirement" });
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

  // Public certificate PDF download endpoint (no auth, no query params needed)
  // This endpoint always generates/returns the PDF - designed for email links
  app.get('/api/certificates/:id/download', async (req: any, res) => {
    try {
      const certificate = await storage.getCertificate(req.params.id);
      
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }

      console.log(`[Certificate Download] Request for certificate ${req.params.id}`);

      // Generate PDF on-demand and stream it directly to the browser
      const { generateCertificatePDFBuffer } = await import('./certificateService');
      
      try {
        const { buffer, schoolName } = await generateCertificatePDFBuffer(certificate.id);
        
        // Set headers for PDF download
        const filename = `${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_Certificate_${certificate.certificateNumber}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        
        console.log(`[Certificate Download] Streaming PDF (${buffer.length} bytes) for ${schoolName}`);
        
        // Stream the PDF buffer to the response
        res.send(buffer);
      } catch (error) {
        console.error(`[Certificate Download] Failed to generate PDF:`, error);
        return res.status(500).json({ message: "Failed to generate certificate PDF" });
      }
    } catch (error) {
      console.error("Error downloading certificate:", error);
      res.status(500).json({ message: "Failed to download certificate" });
    }
  });

  // Public certificate data endpoint with content negotiation (no auth required)
  app.get('/api/certificates/:id', async (req: any, res) => {
    try {
      const certificate = await storage.getCertificate(req.params.id);
      
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }

      // Support content negotiation: PDF via Accept header or ?format=pdf or ?download=true
      const wantsPdf = req.query.format === 'pdf' || 
                      req.query.download === 'true' || 
                      req.headers.accept?.includes('application/pdf');
      
      if (wantsPdf) {
        // Generate PDF on-demand and stream it directly to the browser
        const { generateCertificatePDFBuffer } = await import('./certificateService');
        
        try {
          const { buffer, schoolName } = await generateCertificatePDFBuffer(certificate.id);
          
          // Set headers for PDF download
          const filename = `${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_Certificate_${certificate.certificateNumber}.pdf`;
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
          res.setHeader('Content-Length', buffer.length);
          res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
          
          console.log(`[Certificate] Streaming PDF (${buffer.length} bytes) for ${schoolName}`);
          
          // Stream the PDF buffer to the response
          return res.send(buffer);
        } catch (error) {
          console.error(`[Certificate] Failed to generate PDF:`, error);
          return res.status(500).json({ message: "Failed to generate certificate PDF" });
        }
      }

      // Default: Return JSON data (for API consumers, verification page, etc.)
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

  // Public certificate verification endpoint (no auth required)
  app.get('/api/certificates/verify/:certificateNumber', async (req, res) => {
    try {
      const { certificateNumber } = req.params;
      
      const certificate = await storage.getCertificateByNumber(certificateNumber);
      
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }

      // Return certificate data with school information for public verification
      res.json({
        ...certificate,
        school: certificate.school,
        isValid: certificate.isActive,
      });
    } catch (error) {
      console.error("Error verifying certificate:", error);
      res.status(500).json({ message: "Failed to verify certificate" });
    }
  });

  // Admin certificate routes
  app.get('/api/admin/certificates', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const certificates = await storage.getCertificates();
      res.json(certificates);
    } catch (error) {
      console.error("Error fetching all certificates:", error);
      res.status(500).json({ message: "Failed to fetch certificates" });
    }
  });

  app.post('/api/admin/certificates', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const certificateSchema = z.object({
        schoolId: z.string(),
        stage: z.enum(['inspire', 'investigate', 'act']),
        completedDate: z.string(),
        title: z.string(),
        description: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      });
      
      const data = certificateSchema.parse(req.body);
      
      // Generate certificate number
      const school = await storage.getSchool(data.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      
      const currentRound = school.currentRound || 1;
      const certificateNumber = `PCSR${currentRound}-${Date.now()}-${data.schoolId.substring(0, 8)}`;
      
      const certificate = await storage.createCertificate({
        schoolId: data.schoolId,
        stage: data.stage,
        issuedBy: req.user.id,
        certificateNumber,
        completedDate: new Date(data.completedDate),
        title: data.title,
        description: data.description,
        metadata: data.metadata || {
          round: currentRound,
          manuallyIssued: true,
          issuedByAdmin: req.user.email,
        },
      });
      
      res.status(201).json(certificate);
    } catch (error) {
      console.error("Error creating certificate:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create certificate" });
    }
  });

  // Public certificate background setting (no authentication required for public certificate verification page)
  app.get('/api/settings/certificate-background', async (req: any, res) => {
    try {
      const backgroundUrl = await storage.getSetting('certificateBackgroundUrl');
      res.json({ url: backgroundUrl });
    } catch (error) {
      console.error("Error fetching certificate background setting:", error);
      res.status(500).json({ message: "Failed to fetch certificate background" });
    }
  });

  // Admin certificate background settings routes
  app.get('/api/admin/settings/certificate-background', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const backgroundUrl = await storage.getSetting('certificateBackgroundUrl');
      res.json({ url: backgroundUrl });
    } catch (error) {
      console.error("Error fetching certificate background setting:", error);
      res.status(500).json({ message: "Failed to fetch certificate background" });
    }
  });

  app.post('/api/admin/settings/certificate-background', isAuthenticated, requireAdmin, uploadCompression.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const userId = req.user?.id;
      const filename = req.file.originalname;
      const mimeType = req.file.mimetype;
      
      // Validate file type (only images)
      if (!mimeType.startsWith('image/')) {
        return res.status(400).json({ error: "Only image files are allowed" });
      }

      console.log('[Certificate Background] Uploading background image...');

      // Create unique filename
      const timestamp = Date.now();
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFilename = `${timestamp}-${sanitizedFilename}`;
      
      // Get public search paths from object storage service
      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      
      if (publicPaths.length === 0) {
        return res.status(500).json({ error: "Object storage not configured" });
      }
      
      // Use first public path and append certificate-backgrounds directory
      const publicPath = publicPaths[0];
      const objectPath = `${publicPath}/certificate-backgrounds/${uniqueFilename}`;
      const { bucketName, objectName } = parseObjectPath(objectPath);
      
      console.log(`[Certificate Background] Uploading to bucket: ${bucketName}, object: ${objectName}`);
      
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      // Upload the file buffer directly
      await file.save(req.file.buffer, {
        metadata: {
          contentType: mimeType,
          metadata: {
            uploadedBy: userId || 'system',
            originalFilename: filename,
            uploadedAt: new Date().toISOString(),
          },
        },
      });
      
      console.log('[Certificate Background] File uploaded successfully');
      
      // Set ACL policy so the file is accessible via /api/objects/ route
      await setObjectAclPolicy(file, {
        owner: userId || 'system',
        visibility: 'public',
        aclRules: [],
      });
      console.log('[Certificate Background] ACL policy set to public');
      
      // Make file public in GCS for direct access
      try {
        await file.makePublic();
        console.log('[Certificate Background] File made public in GCS');
      } catch (error) {
        console.warn('[Certificate Background] Failed to make file public in GCS:', error);
      }

      // Return /api/objects/public/ path so the route can find it correctly
      const apiPath = `/api/objects/public/certificate-backgrounds/${uniqueFilename}`;
      
      console.log(`[Certificate Background] Saving path: ${apiPath}`);
      
      // Save to settings
      await storage.setSetting('certificateBackgroundUrl', apiPath);
      
      res.json({ url: apiPath });
    } catch (error) {
      console.error("Error uploading certificate background:", error);
      res.status(500).json({ error: "Failed to upload certificate background" });
    }
  });

  app.delete('/api/admin/settings/certificate-background', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      await storage.setSetting('certificateBackgroundUrl', '');
      res.json({ message: "Certificate background reset to default" });
    } catch (error) {
      console.error("Error resetting certificate background:", error);
      res.status(500).json({ message: "Failed to reset certificate background" });
    }
  });

  // Migration endpoint to fix ACL on existing certificate PDFs
  app.post('/api/admin/certificates/migrate-acl', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      console.log('[Certificate Migration] Starting ACL migration for existing certificates...');
      
      // Get all certificates
      const allCertificates = await storage.getCertificates();
      console.log(`[Certificate Migration] Found ${allCertificates.length} total certificates`);
      
      const results = {
        total: allCertificates.length,
        processed: 0,
        fixed: 0,
        skipped: 0,
        errors: [] as string[],
      };
      
      // Process each certificate that has a shareableUrl (PDF was generated)
      for (const cert of allCertificates) {
        try {
          if (!cert.shareableUrl) {
            results.skipped++;
            continue;
          }
          
          results.processed++;
          
          let bucketName: string;
          let objectName: string;
          
          // Handle both /objects/ paths and direct GCS URLs
          if (cert.shareableUrl.startsWith('/objects/')) {
            // New format: /objects/certificates/abc123.pdf
            // Need to get the actual bucket from PUBLIC_OBJECT_SEARCH_PATHS
            const objectStorageService = new ObjectStorageService();
            const publicPaths = objectStorageService.getPublicObjectSearchPaths();
            
            if (publicPaths.length === 0) {
              console.warn(`[Certificate Migration] Object storage not configured`);
              results.errors.push(`No public paths: ${cert.id}`);
              continue;
            }
            
            // Get the path after /objects/ (e.g., "certificates/abc123.pdf")
            const relativePath = cert.shareableUrl.replace('/objects/', '');
            
            // Build full path: /<bucket>/public/certificates/abc123.pdf
            const fullPath = `${publicPaths[0]}/${relativePath}`;
            const parsed = parseObjectPath(fullPath);
            bucketName = parsed.bucketName;
            objectName = parsed.objectName;
            
          } else if (cert.shareableUrl.startsWith('https://storage.googleapis.com/')) {
            // Old format: direct GCS URL
            const url = new URL(cert.shareableUrl);
            const pathParts = url.pathname.split('/').filter(p => p);
            if (pathParts.length < 2) {
              console.warn(`[Certificate Migration] Invalid GCS URL for certificate ${cert.id}: ${cert.shareableUrl}`);
              results.errors.push(`Invalid GCS URL: ${cert.id}`);
              continue;
            }
            bucketName = pathParts[0];
            objectName = pathParts.slice(1).join('/');
            
          } else {
            console.warn(`[Certificate Migration] Unknown URL format for certificate ${cert.id}: ${cert.shareableUrl}`);
            results.errors.push(`Unknown format: ${cert.id}`);
            continue;
          }
          
          console.log(`[Certificate Migration] Processing ${cert.id}: bucket=${bucketName}, object=${objectName}`);
          
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          
          // Check if file exists
          const [exists] = await file.exists();
          if (!exists) {
            console.warn(`[Certificate Migration] File not found for certificate ${cert.id}`);
            results.errors.push(`File not found: ${cert.id}`);
            continue;
          }
          
          console.log(`[Certificate Migration] File exists, setting ACL policy for ${cert.id}...`);
          
          // Set ACL policy
          try {
            await setObjectAclPolicy(file, {
              owner: 'system',
              visibility: 'public',
              aclRules: [],
            });
            console.log(`[Certificate Migration] ACL policy set successfully for ${cert.id}`);
            results.fixed++;
          } catch (aclError) {
            console.error(`[Certificate Migration] Failed to set ACL policy for ${cert.id}:`, aclError);
            results.errors.push(`ACL failed: ${cert.id}`);
            continue;
          }
          
          // Make file public in GCS (optional - will fail if public access prevention is enabled)
          try {
            await file.makePublic();
            console.log(`[Certificate Migration] GCS public access set for ${cert.id}`);
          } catch (error) {
            console.warn(`[Certificate Migration] GCS makePublic failed (expected if public access prevention is enabled): ${cert.id}`);
            // This is OK - ACL policy is what matters for /api/objects/ route
          }
          
        } catch (error) {
          console.error(`[Certificate Migration] Error processing certificate ${cert.id}:`, error);
          results.errors.push(`Error: ${cert.id} - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      console.log('[Certificate Migration] Migration complete:', results);
      res.json(results);
      
    } catch (error) {
      console.error("[Certificate Migration] Migration failed:", error);
      res.status(500).json({ 
        error: "Migration failed", 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
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

  // Photo Consent routes
  // (using photoConsentUpload from utils/uploads.ts)
  
  // POST /api/schools/:schoolId/photo-consent/upload - Teacher uploads consent document
  app.post('/api/schools/:schoolId/photo-consent/upload', isAuthenticated, photoConsentUpload.single('file'), async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const userId = req.user.id;

      // Mark user as having interacted (file upload is a meaningful action)
      await markUserInteracted(userId);

      // Check if user is admin or member of the school (verified or not)
      const isAdmin = req.user.isAdmin;
      if (!isAdmin) {
        console.log(`[Photo Consent Upload] Checking school membership - schoolId: ${schoolId}, userId: ${userId}`);
        const schoolUser = await storage.getSchoolUser(schoolId, userId);
        console.log(`[Photo Consent Upload] School user found:`, schoolUser ? `yes (role: ${schoolUser.role}, verified: ${schoolUser.isVerified})` : 'no');
        
        if (!schoolUser) {
          // Log all schools the user belongs to for debugging
          const userSchools = await storage.getUserSchools(userId);
          console.log(`[Photo Consent Upload] User belongs to ${userSchools.length} school(s):`, userSchools.map(s => `${s.id} (${s.name})`));
          
          return res.status(403).json({ 
            message: "You don't have permission to upload photo consent for this school. Please ensure you are a member of this school." 
          });
        }
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      // Verify school exists
      const school = await storage.getSchool(schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      const file = req.file;
      const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || 'pdf';
      const timestamp = Date.now();
      const objectStorageService = new ObjectStorageService();

      // Get upload URL from object storage
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Upload file to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file.buffer,
        headers: {
          'Content-Type': file.mimetype,
          'Content-Length': file.size.toString(),
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
      }

      // Set ACL policy with private visibility
      const filename = `photo-consent-${schoolId}-${timestamp}.${fileExtension}`;
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        uploadURL.split('?')[0],
        {
          owner: userId,
          visibility: 'private',
        },
        filename,
      );

      // Update school photo consent status
      // Auto-approve if uploaded by admin
      await storage.updateSchoolPhotoConsent(schoolId, objectPath, isAdmin ? userId : undefined);

      res.json({ 
        success: true, 
        message: "Photo consent document uploaded successfully",
        documentUrl: objectPath,
      });
    } catch (error) {
      console.error("Error uploading photo consent:", error);
      if (error instanceof Error && error.message.includes('Invalid file type')) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to upload photo consent document" });
    }
  });

  // GET /api/schools/:schoolId/photo-consent - Get consent status
  app.get('/api/schools/:schoolId/photo-consent', isAuthenticated, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const userId = req.user.id;

      // Verify school exists
      const school = await storage.getSchool(schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      // Check if user is admin or member of the school
      const isAdmin = req.user.isAdmin;
      if (!isAdmin) {
        const schoolUser = await storage.getSchoolUser(schoolId, userId);
        if (!schoolUser) {
          return res.status(403).json({ message: "You don't have access to this school's photo consent" });
        }
      }

      // Get photo consent status
      const consentStatus = await storage.getSchoolPhotoConsentStatus(schoolId);
      
      if (!consentStatus) {
        return res.status(404).json({ message: "Photo consent status not found" });
      }

      res.json(consentStatus);
    } catch (error) {
      console.error("Error fetching photo consent status:", error);
      res.status(500).json({ message: "Failed to fetch photo consent status" });
    }
  });

  // PATCH /api/schools/:schoolId/photo-consent/approve - Admin/Partner approves consent
  app.patch('/api/schools/:schoolId/photo-consent/approve', isAuthenticated, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const { notes } = req.body;
      const userId = req.user.id;

      // Check if user is admin or partner
      if (!req.user.isAdmin && req.user.role !== 'partner') {
        return res.status(403).json({ message: "Admin or Partner access required" });
      }

      // Verify school exists
      const school = await storage.getSchool(schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      // Approve photo consent
      const updatedSchool = await storage.reviewSchoolPhotoConsent(
        schoolId,
        'approved',
        userId,
        notes
      );

      if (!updatedSchool) {
        return res.status(500).json({ message: "Failed to approve photo consent" });
      }

      res.json({ 
        success: true, 
        message: "Photo consent approved successfully",
        school: updatedSchool,
      });
    } catch (error) {
      console.error("Error approving photo consent:", error);
      res.status(500).json({ message: "Failed to approve photo consent" });
    }
  });

  // PATCH /api/schools/:schoolId/photo-consent/reject - Admin/Partner rejects consent
  app.patch('/api/schools/:schoolId/photo-consent/reject', isAuthenticated, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const { notes } = req.body;
      const userId = req.user.id;

      // Check if user is admin or partner
      if (!req.user.isAdmin && req.user.role !== 'partner') {
        return res.status(403).json({ message: "Admin or Partner access required" });
      }

      // Validate that notes are provided for rejection
      if (!notes || notes.trim().length === 0) {
        return res.status(400).json({ message: "Review notes are required for rejection" });
      }

      // Verify school exists
      const school = await storage.getSchool(schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      // Reject photo consent
      const updatedSchool = await storage.reviewSchoolPhotoConsent(
        schoolId,
        'rejected',
        userId,
        notes
      );

      if (!updatedSchool) {
        return res.status(500).json({ message: "Failed to reject photo consent" });
      }

      res.json({ 
        success: true, 
        message: "Photo consent rejected",
        school: updatedSchool,
      });
    } catch (error) {
      console.error("Error rejecting photo consent:", error);
      res.status(500).json({ message: "Failed to reject photo consent" });
    }
  });

  // Object storage routes for evidence files
  
  // Handle CORS preflight for object requests (both /objects and /api/objects)
  app.options(["/objects/:objectPath(*)", "/api/objects/:objectPath(*)"], (req, res) => {
    const origin = req.headers.origin || req.headers.referer || '*';
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      'Access-Control-Max-Age': '86400', // 24 hours
    });
    res.sendStatus(204);
  });
  
  // Serve objects with ACL check (both public and private) with range request support for PDF.js
  // Support both /objects/... and /api/objects/... paths
  app.get(["/objects/:objectPath(*)", "/api/objects/:objectPath(*)"], async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    const shouldDownload = req.query.download === 'true';
    
    try {
      // Normalize the path: remove /api prefix if present
      let normalizedPath = req.path;
      if (normalizedPath.startsWith('/api/objects/')) {
        normalizedPath = normalizedPath.replace('/api/objects/', '/objects/');
      }
      
      let objectFile;
      
      // Check if this is a public file first
      if (normalizedPath.startsWith('/objects/public/')) {
        // Extract the file path after /objects/public/
        const publicFilePath = normalizedPath.replace('/objects/public/', '');
        objectFile = await objectStorageService.searchPublicObject(publicFilePath);
        
        if (!objectFile) {
          return res.status(404).send('Not found');
        }
      } else {
        // Use the standard entity file lookup for private files
        objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
      }
      
      // Get file metadata early to determine content type
      const [metadata] = await objectFile.getMetadata();
      const filename = metadata.metadata?.filename || req.path.split('/').pop() || 'download';
      const contentType = metadata.contentType || 'application/octet-stream';
      const fileSize = Number(metadata.size) || 0;
      
      // Check if object is public first (fast path for public objects)
      const aclPolicy = await getObjectAclPolicy(objectFile);
      
      // Debug logging for ACL policy
      if (!aclPolicy) {
        console.log(`[ACL Debug] File ${normalizedPath} has NO ACL policy (null)`);
      } else {
        console.log(`[ACL Debug] File ${normalizedPath} has ACL policy with visibility: ${aclPolicy.visibility}`);
      }
      
      // Set CORS headers for cross-origin access (required for PDF.js and browser viewing)
      const origin = req.headers.origin || req.headers.referer || '*';
      res.set({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      });
      
      // Files in the public directory are always publicly accessible, skip ACL checks
      const isPublicDirectory = normalizedPath.startsWith('/objects/public/');
      
      // Check access permissions (skip for public directory files)
      if (!isPublicDirectory && aclPolicy?.visibility !== 'public') {
        // For private/registered objects, check evidence-based access control
        if (!aclPolicy || aclPolicy?.visibility === 'private' || aclPolicy?.visibility === 'registered') {
          const pathParts = normalizedPath.split('/');
          const fileId = pathParts[pathParts.length - 1];
          
          try {
            // Look up the evidence record for this file
            const evidenceRecord = await storage.getEvidenceByFileUrl(fileId);
            
            if (evidenceRecord && evidenceRecord.visibility === 'public') {
              // Public evidence is accessible to everyone
            } else if (evidenceRecord && evidenceRecord.visibility === 'private') {
              // Private evidence requires authentication
              if (!req.isAuthenticated() || !req.user) {
                return res.sendStatus(401);
              }
              
              const userId = req.user.id;
              const isAdmin = req.user.isAdmin || false;
              
              // Admins can access all private evidence
              if (isAdmin) {
                // Admin access granted
              } else {
                // For non-admins, check if user is a member of the school that submitted this evidence
                const schoolUser = await storage.getSchoolUser(evidenceRecord.schoolId, userId);
                if (!schoolUser) {
                  // User is not a member of this school, check standard ACL as fallback
                  const canAccess = await objectStorageService.canAccessObjectEntity({
                    objectFile,
                    userId: userId,
                    requestedPermission: ObjectPermission.READ,
                    isAdmin: false,
                  });
                  
                  if (!canAccess) {
                    return res.sendStatus(403);
                  }
                }
              }
            } else {
              // File not found in evidence records, use standard ACL check
              if (!req.isAuthenticated() || !req.user) {
                return res.sendStatus(401);
              }
              
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
            }
          } catch (evidenceError) {
            console.error("Error checking evidence visibility:", evidenceError);
            // If evidence check fails, require authentication as fallback
            if (!req.isAuthenticated() || !req.user) {
              return res.sendStatus(401);
            }
          }
        } else {
          // For private objects with ACL policy, require authentication
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
        }
      }
      
      // Set Content-Disposition based on download parameter
      res.set('Content-Disposition', shouldDownload 
        ? `attachment; filename="${filename}"` 
        : 'inline'
      );
      
      // Set Content-Type
      res.set('Content-Type', contentType);
      
      // Indicate that we support range requests
      res.set('Accept-Ranges', 'bytes');
      
      // Handle range requests (required for PDF.js)
      const rangeHeader = req.headers.range;
      
      if (rangeHeader) {
        // Parse range header (e.g., "bytes=0-1023")
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;
        
        // Validate range
        if (start >= fileSize || end >= fileSize || start > end) {
          res.status(416).set({
            'Content-Range': `bytes */${fileSize}`
          });
          return res.end();
        }
        
        // Set headers for partial content
        res.status(206);
        res.set({
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': chunkSize.toString(),
        });
        
        // Stream the requested range
        const stream = objectFile.createReadStream({
          start,
          end,
        });
        
        stream.on('error', (err) => {
          console.error('Stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error streaming file' });
          }
        });
        
        stream.pipe(res);
      } else {
        // No range requested, send entire file
        res.set('Content-Length', fileSize.toString());
        
        const stream = objectFile.createReadStream();
        
        stream.on('error', (err) => {
          console.error('Stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error streaming file' });
          }
        });
        
        stream.pipe(res);
      }
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Upload and compress evidence files
  // (using uploadCompression from utils/uploads.ts)
  app.post("/api/evidence-files/upload-compressed", isAuthenticated, uploadCompression.single('file'), async (req: any, res) => {
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

  // Direct file upload to object storage (for event images, etc.)
  app.post("/api/objects/upload", isAuthenticated, uploadCompression.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const userId = req.user?.id;
      const visibility = req.body.visibility || 'public';
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
          fileBuffer = req.file.buffer;
          compressedSize = originalSize;
          wasCompressed = false;
        }
      }

      // Upload to object storage using the helper function
      const objectPath = await uploadToObjectStorage(
        fileBuffer,
        mimeType,
        filename,
        userId,
        visibility
      );

      res.status(200).json({ 
        url: objectPath,
        originalSize,
        compressedSize,
        wasCompressed,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Get upload URL for case study files
  app.post("/api/case-studies/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Set ACL policy for uploaded case study files
  app.put("/api/case-studies/set-acl", isAuthenticated, async (req: any, res) => {
    if (!req.body.fileURL) {
      return res.status(400).json({ error: "fileURL is required" });
    }

    const userId = req.user?.id;
    const visibility = req.body.visibility || 'public';
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

  // Helper function to log admin actions
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

  // GET /api/admin/audit-logs - Get audit logs (admin only)
  app.get('/api/admin/audit-logs', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { userId, targetType, targetId, limit } = req.query;
      
      const logs = await storage.getAuditLogs({
        userId: userId as string,
        targetType: targetType as string,
        targetId: targetId as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // GET /api/admin/photo-consent/pending - Get all schools with pending photo consent
  app.get('/api/admin/photo-consent/pending', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const pendingSchools = await storage.getSchoolsWithPendingPhotoConsent();
      res.json(pendingSchools);
    } catch (error) {
      console.error("Error fetching pending photo consent:", error);
      res.status(500).json({ message: "Failed to fetch pending photo consent" });
    }
  });

  // Routes for admin and partner roles
  // (using requireAdminOrPartner middleware from utils/middleware.ts)

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

  // Bulk delete resources (admin/partner only)
  app.post('/api/admin/resources/bulk-delete', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
    try {
      const { resourceIds } = req.body;
      
      if (!Array.isArray(resourceIds) || resourceIds.length === 0) {
        return res.status(400).json({ message: "Please provide an array of resource IDs to delete" });
      }

      console.log(`[Bulk Delete Resources] Admin ${req.user.id} deleting ${resourceIds.length} resources`);
      
      const results = {
        successful: [] as string[],
        failed: [] as { id: string; reason: string }[],
      };

      for (const resourceId of resourceIds) {
        try {
          const deleted = await storage.deleteResource(resourceId);
          
          if (deleted) {
            results.successful.push(resourceId);
          } else {
            results.failed.push({ id: resourceId, reason: "Resource not found" });
          }
        } catch (error: any) {
          results.failed.push({ id: resourceId, reason: "Unknown error" });
          console.error(`[Bulk Delete Resources] Error deleting resource ${resourceId}:`, error);
        }
      }

      console.log(`[Bulk Delete Resources] Completed: ${results.successful.length} successful, ${results.failed.length} failed`);
      
      res.json({ 
        successCount: results.successful.length,
        failedCount: results.failed.length,
        failures: results.failed,
        message: `Deleted ${results.successful.length} of ${resourceIds.length} resources`
      });
    } catch (error) {
      console.error("[Bulk Delete Resources] Error:", error);
      res.status(500).json({ message: "Failed to bulk delete resources" });
    }
  });

  // PUT /api/admin/schools/:schoolId/progression - Manually update school stage and round (admin/partner only)
  app.put('/api/admin/schools/:schoolId/progression', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
    try {
      const { schoolId } = req.params;
      const userId = req.user.id;
      
      // Validate request body
      const progressionSchema = z.object({
        currentStage: z.enum(['inspire', 'investigate', 'act']).optional(),
        currentRound: z.number().int().positive().optional(),
        inspireCompleted: z.boolean().optional(),
        investigateCompleted: z.boolean().optional(),
        actCompleted: z.boolean().optional(),
        progressPercentage: z.number().int().min(0).max(100).optional(),
      });
      const updates = progressionSchema.parse(req.body);
      
      console.log(`[Manual Progression Update] Admin/Partner ${userId} updating progression for school ${schoolId}`, updates);
      
      // Update the school progression
      const updatedSchool = await storage.manuallyUpdateSchoolProgression(schoolId, updates);
      
      if (!updatedSchool) {
        return res.status(404).json({ message: "School not found" });
      }
      
      console.log(`[Manual Progression Update] School ${schoolId} progression updated successfully`);
      
      res.json({ 
        message: "School progression updated successfully",
        school: updatedSchool
      });
    } catch (error) {
      console.error("[Manual Progression Update] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update school progression" });
    }
  });

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

  // Combined dashboard data endpoint - fetches stats, pending audits, and pending photo consent in one call
  app.get('/api/admin/dashboard-data', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const [stats, pendingAudits, pendingPhotoConsent] = await Promise.all([
        storage.getAdminStats(),
        storage.getPendingAudits(),
        storage.getSchoolsWithPendingPhotoConsent()
      ]);
      
      res.json({
        stats,
        pendingAudits,
        pendingPhotoConsent
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Analytics endpoints
  app.get('/api/admin/analytics/overview', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await storage.getAnalyticsOverview(
        startDate as string | undefined,
        endDate as string | undefined
      );
      
      // Get user interaction metrics
      const totalUsersResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL
      `);
      const interactedUsersResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL AND has_interacted = true
      `);
      const notInteractedUsersResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL AND (has_interacted = false OR has_interacted IS NULL)
      `);
      
      const totalUsers = Number(totalUsersResult.rows[0]?.count || 0);
      const interactedUsers = Number(interactedUsersResult.rows[0]?.count || 0);
      const notInteractedUsers = Number(notInteractedUsersResult.rows[0]?.count || 0);
      const interactionRate = totalUsers > 0 ? Math.round((interactedUsers / totalUsers) * 100) : 0;
      
      // Merge user interaction metrics with existing analytics
      const enrichedAnalytics = {
        ...analytics,
        totalUsers,
        interactedUsers,
        notInteractedUsers,
        interactionRate,
      };
      
      res.json(enrichedAnalytics);
    } catch (error) {
      console.error("Error fetching analytics overview:", error);
      res.status(500).json({ message: "Failed to fetch analytics overview" });
    }
  });

  app.get('/api/admin/analytics/school-progress', isAuthenticated, requireAdminOrPartner, async (req, res) => {
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

  app.get('/api/admin/analytics/evidence', isAuthenticated, requireAdminOrPartner, async (req, res) => {
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

  app.get('/api/admin/analytics/user-engagement', isAuthenticated, requireAdminOrPartner, async (req, res) => {
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

  app.get('/api/admin/analytics/resources', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const analytics = await storage.getResourceAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching resource analytics:", error);
      res.status(500).json({ message: "Failed to fetch resource analytics" });
    }
  });

  app.get('/api/admin/analytics/email', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const analytics = await storage.getEmailAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching email analytics:", error);
      res.status(500).json({ message: "Failed to fetch email analytics" });
    }
  });

  app.get('/api/admin/analytics/geographic', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const analytics = await storage.getGeographicAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching geographic analytics:", error);
      res.status(500).json({ message: "Failed to fetch geographic analytics" });
    }
  });

  // Audit analytics endpoints
  app.get('/api/admin/analytics/audit-overview', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const analytics = await storage.getAuditOverviewAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching audit overview analytics:", error);
      res.status(500).json({ message: "Failed to fetch audit overview analytics" });
    }
  });

  app.get('/api/admin/analytics/audit-by-school', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const analytics = await storage.getAuditBySchoolAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching audit by school analytics:", error);
      res.status(500).json({ message: "Failed to fetch audit by school analytics" });
    }
  });

  app.get('/api/admin/analytics/waste-trends', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const analytics = await storage.getWasteTrendsAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching waste trends analytics:", error);
      res.status(500).json({ message: "Failed to fetch waste trends analytics" });
    }
  });

  // Migration endpoints
  app.post('/api/admin/migration/run', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { csvContent, dryRun = true } = req.body;
      
      if (!csvContent) {
        return res.status(400).json({ message: 'CSV content is required' });
      }

      const { MigrationScript } = await import('./migration-script');
      
      const migration = new MigrationScript({
        csvContent,
        dryRun,
        performedBy: req.user.id,
      });

      const result = await migration.run();

      res.json({
        message: dryRun ? 'Dry run completed successfully' : 'Migration completed successfully',
        result,
      });
    } catch (error) {
      console.error('Migration error:', error);
      res.status(500).json({ 
        message: 'Migration failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.get('/api/admin/migration/logs', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const logs = await db.query.migrationLogs.findMany({
        orderBy: (migrationLogs, { desc }) => [desc(migrationLogs.startedAt)],
        limit: 50,
      });

      res.json(logs);
    } catch (error) {
      console.error('Error fetching migration logs:', error);
      res.status(500).json({ message: 'Failed to fetch migration logs' });
    }
  });

  app.get('/api/admin/migration/logs/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const log = await db.query.migrationLogs.findFirst({
        where: (migrationLogs, { eq }) => eq(migrationLogs.id, id),
      });

      if (!log) {
        return res.status(404).json({ message: 'Migration log not found' });
      }

      res.json(log);
    } catch (error) {
      console.error('Error fetching migration log:', error);
      res.status(500).json({ message: 'Failed to fetch migration log' });
    }
  });

  app.get('/api/admin/migration/users', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { limit = 100, offset = 0 } = req.query;
      
      const migratedUsers = await db.query.users.findMany({
        where: (users, { eq }) => eq(users.isMigrated, true),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        orderBy: (users, { desc }) => [desc(users.migratedAt)],
      });

      const totalCount = await db.select({ count: count() })
        .from(users)
        .where(eq(users.isMigrated, true));

      res.json({
        users: migratedUsers,
        total: totalCount[0]?.count || 0,
      });
    } catch (error) {
      console.error('Error fetching migrated users:', error);
      res.status(500).json({ message: 'Failed to fetch migrated users' });
    }
  });

  app.post('/api/admin/migration/legacy-evidence', isAuthenticated, requireAdmin, importUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'CSV file is required' });
      }

      const { parseImportFile, mapLegacyEvidenceFields } = await import('./lib/importUtils');
      const { sumStageEvidence } = await import('./lib/phpDeserializer');
      
      const parsed = parseImportFile(req.file.buffer, req.file.originalname);
      
      let processed = 0;
      let updated = 0;
      let skipped = 0;
      const errors: Array<{ row: number; email: string; error: string }> = [];

      for (let i = 0; i < parsed.data.length; i++) {
        const row = parsed.data[i];
        processed++;

        try {
          const mapped = mapLegacyEvidenceFields(row);
          
          if (!mapped.email || !mapped.schoolName) {
            skipped++;
            continue;
          }

          const totalCount = sumStageEvidence(mapped.stage1, mapped.stage2, mapped.stage3);
          
          if (totalCount === 0) {
            skipped++;
            continue;
          }

          const user = await storage.findUserByEmail(mapped.email);
          if (!user) {
            skipped++;
            errors.push({ 
              row: i + 1, 
              email: mapped.email, 
              error: 'User not found' 
            });
            continue;
          }

          const school = await storage.getSchoolByName(mapped.schoolName);
          if (!school) {
            skipped++;
            errors.push({ 
              row: i + 1, 
              email: mapped.email, 
              error: `School not found: ${mapped.schoolName}` 
            });
            continue;
          }

          await storage.updateLegacyEvidenceCount(school.id, user.id, totalCount);
          updated++;
        } catch (error) {
          errors.push({ 
            row: i + 1, 
            email: row.user_email || 'unknown', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      res.json({
        message: 'Legacy evidence migration completed',
        processed,
        updated,
        skipped,
        errors: errors.length > 0 ? errors.slice(0, 10) : [],
        totalErrors: errors.length,
      });
    } catch (error) {
      console.error('Legacy evidence migration error:', error);
      res.status(500).json({ 
        message: 'Migration failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Fix progress percentage for migrated schools
  app.post('/api/admin/migration/fix-progress', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log('[Fix Progress] Starting progress update for migrated schools');
      
      // Get all migrated schools
      const migratedSchools = await db.query.schools.findMany({
        where: (schools, { eq }) => eq(schools.isMigrated, true),
      });

      console.log(`[Fix Progress] Found ${migratedSchools.length} migrated schools`);

      let updated = 0;
      let skipped = 0;
      const errors: Array<{ schoolId: string; schoolName: string; error: string }> = [];

      // Process in batches to prevent timeout
      const BATCH_SIZE = 50;
      for (let i = 0; i < migratedSchools.length; i += BATCH_SIZE) {
        const batch = migratedSchools.slice(i, i + BATCH_SIZE);
        console.log(`[Fix Progress] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(migratedSchools.length / BATCH_SIZE)}`);
        
        for (const school of batch) {
          try {
            const beforeProgress = school.progressPercentage;
            
            // Call checkAndUpdateSchoolProgression to recalculate progress
            await storage.checkAndUpdateSchoolProgression(school.id);
            
            // Fetch the updated school to see the new progress
            const updatedSchool = await storage.getSchool(school.id);
            const afterProgress = updatedSchool?.progressPercentage ?? 0;
            
            if (beforeProgress !== afterProgress) {
              updated++;
            } else {
              skipped++;
            }
          } catch (error) {
            console.error(`[Fix Progress] Error updating school ${school.id}:`, error);
            errors.push({
              schoolId: school.id,
              schoolName: school.name,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      console.log(`[Fix Progress] Completed: ${updated} updated, ${skipped} skipped, ${errors.length} errors`);

      res.json({
        message: 'Migrated schools progress update completed',
        total: migratedSchools.length,
        updated,
        skipped,
        errors: errors.length > 0 ? errors.slice(0, 10) : [],
        totalErrors: errors.length,
      });
    } catch (error) {
      console.error('[Fix Progress] Migration failed:', error);
      res.status(500).json({
        message: 'Failed to update migrated schools progress',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Fix illogical completion flags from migration
  app.post('/api/admin/migration/fix-completion-flags', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log('[Fix Completion Flags] Starting completion flags consistency check...');

      // Find schools that need fixing:
      // 1. Schools where actCompleted = true but inspireCompleted OR investigateCompleted = false (illogical flags)
      // 2. Schools where all 3 stages are complete but awardCompleted = false (missing award flag)
      // 3. Schools where awardCompleted = true but still on currentRound = 1 (should be Round 2)
      const problematicSchools = await db.query.schools.findMany({
        where: or(
          and(
            eq(schools.actCompleted, true),
            or(
              eq(schools.inspireCompleted, false),
              eq(schools.investigateCompleted, false)
            )
          ),
          and(
            eq(schools.inspireCompleted, true),
            eq(schools.investigateCompleted, true),
            eq(schools.actCompleted, true),
            eq(schools.awardCompleted, false)
          ),
          and(
            eq(schools.awardCompleted, true),
            or(
              eq(schools.currentRound, 1),
              sql`${schools.currentRound} IS NULL`
            )
          )
        ),
      });

      console.log(`[Fix Completion Flags] Found ${problematicSchools.length} schools that need completion/round fixes`);

      let fixed = 0;
      const errors: Array<{ schoolId: string; schoolName: string; error: string }> = [];

      for (const school of problematicSchools) {
        try {
          console.log(`[Fix Completion Flags] Fixing ${school.name} (ID: ${school.id})`);
          console.log(`  Before: inspireCompleted=${school.inspireCompleted}, investigateCompleted=${school.investigateCompleted}, actCompleted=${school.actCompleted}`);
          
          // Update the completion flags to ensure logical consistency
          await db
            .update(schools)
            .set({
              inspireCompleted: true,
              investigateCompleted: true,
            })
            .where(eq(schools.id, school.id));
          
          // Call checkAndUpdateSchoolProgression to recalculate stage and award status
          await storage.checkAndUpdateSchoolProgression(school.id);
          
          // If the school has completed all stages (awardCompleted=true) but is still on Round 1,
          // move them to Round 2 WITHOUT resetting completion flags (they already earned it!)
          const updatedSchool = await storage.getSchool(school.id);
          if (updatedSchool?.awardCompleted && updatedSchool?.currentRound === 1) {
            console.log(`  School completed Round 1 - moving to Round 2 (keeping completion status)`);
            await db
              .update(schools)
              .set({
                currentRound: 2,
                roundsCompleted: 1,
                updatedAt: new Date()
              })
              .where(eq(schools.id, school.id));
          }
          
          // Fetch final state to log the changes
          const finalSchool = await storage.getSchool(school.id);
          console.log(`  After: stage=${finalSchool?.currentStage}, round=${finalSchool?.currentRound}, roundsCompleted=${finalSchool?.roundsCompleted}, awardCompleted=${finalSchool?.awardCompleted}`);
          
          fixed++;
        } catch (error) {
          console.error(`[Fix Completion Flags] Error fixing school ${school.id}:`, error);
          errors.push({
            schoolId: school.id,
            schoolName: school.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log(`[Fix Completion Flags] Completed: ${fixed} fixed, ${errors.length} errors`);

      res.json({
        message: 'Completion flags consistency check completed',
        total: problematicSchools.length,
        fixed,
        alreadyCorrect: 0,
        errors: errors.length > 0 ? errors.slice(0, 10) : [],
        totalErrors: errors.length,
      });
    } catch (error) {
      console.error('[Fix Completion Flags] Operation failed:', error);
      res.status(500).json({
        message: 'Failed to fix completion flags',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Reset Round 2 schools to start fresh (preserve Round 1 completion history)
  app.post('/api/admin/migration/reset-round-2-schools', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log('[Reset Round 2] Finding schools on Round 2 that need fresh start...');

      // Find schools on Round 2 with award completed (they finished Round 1)
      const round2Schools = await db.query.schools.findMany({
        where: and(
          eq(schools.currentRound, 2),
          eq(schools.awardCompleted, true)
        ),
      });

      console.log(`[Reset Round 2] Found ${round2Schools.length} schools on Round 2 with Round 1 completion`);

      let reset = 0;
      const errors: Array<{ schoolId: string; schoolName: string; error: string }> = [];

      for (const school of round2Schools) {
        try {
          console.log(`[Reset Round 2] Resetting ${school.name} (ID: ${school.id})`);
          console.log(`  Before: stage=${school.currentStage}, progress=${school.progressPercentage}%, roundsCompleted=${school.roundsCompleted}`);
          
          // Reset current round progress to start fresh on Round 2
          // BUT preserve their Round 1 completion history (roundsCompleted=1, awardCompleted=true)
          await db
            .update(schools)
            .set({
              currentStage: 'inspire',
              inspireCompleted: false,
              investigateCompleted: false,
              actCompleted: false,
              auditQuizCompleted: false,
              progressPercentage: 0,
              // Keep awardCompleted=true to show they earned Round 1 award
              // Keep roundsCompleted=1 to show they completed Round 1
              updatedAt: new Date()
            })
            .where(eq(schools.id, school.id));
          
          const updatedSchool = await storage.getSchool(school.id);
          console.log(`  After: stage=${updatedSchool?.currentStage}, progress=${updatedSchool?.progressPercentage}%, roundsCompleted=${updatedSchool?.roundsCompleted}`);
          
          reset++;
        } catch (error) {
          console.error(`[Reset Round 2] Error resetting school ${school.id}:`, error);
          errors.push({
            schoolId: school.id,
            schoolName: school.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log(`[Reset Round 2] Completed: ${reset} schools reset, ${errors.length} errors`);

      res.json({
        message: 'Round 2 schools reset to fresh start',
        total: round2Schools.length,
        reset,
        errors: errors.length > 0 ? errors.slice(0, 10) : [],
        totalErrors: errors.length,
      });
    } catch (error) {
      console.error('[Reset Round 2] Operation failed:', error);
      res.status(500).json({
        message: 'Failed to reset Round 2 schools',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Audit and fix school rounds (comprehensive fix for illogical round states)
  app.post('/api/admin/migration/audit-school-rounds', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log('[School Round Audit] Starting audit...');
      
      const { SchoolRoundFixer } = await import('./lib/schoolRoundFixer');
      const fixer = new SchoolRoundFixer();
      
      const result = await fixer.auditAllSchools();
      
      console.log('[School Round Audit] Audit complete');
      
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('[School Round Audit] Failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to audit school rounds',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post('/api/admin/migration/fix-school-rounds', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log('[School Round Fix] Starting fix process...');
      
      const { schoolIds, dryRun = false } = req.body;
      
      if (!schoolIds || !Array.isArray(schoolIds)) {
        return res.status(400).json({
          success: false,
          message: 'schoolIds array is required',
        });
      }
      
      console.log(`[School Round Fix] Fixing ${schoolIds.length} schools (dryRun: ${dryRun})`);
      
      const { SchoolRoundFixer } = await import('./lib/schoolRoundFixer');
      const fixer = new SchoolRoundFixer();
      
      if (dryRun) {
        // In dry run mode, just audit the specific schools
        const allSchools = await db.select().from(schools);
        const targetSchools = allSchools.filter(s => schoolIds.includes(s.id));
        
        const auditResults = targetSchools.map(s => {
          const audit = (fixer as any).auditSchool(s);
          return audit;
        });
        
        res.json({
          success: true,
          dryRun: true,
          message: `Dry run complete - no changes made`,
          wouldFix: auditResults.filter(a => a.status !== 'logical').length,
          preview: auditResults.filter(a => a.status !== 'logical'),
        });
      } else {
        const result = await fixer.fixSchools(schoolIds);
        
        res.json({
          success: true,
          dryRun: false,
          message: `Fixed ${result.fixed} schools`,
          ...result,
        });
      }
    } catch (error) {
      console.error('[School Round Fix] Failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fix school rounds',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Consolidated migration cleanup - runs all cleanup steps in sequence
  app.post('/api/admin/migration/cleanup', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log('[Migration Cleanup] Starting consolidated cleanup workflow...');
      
      const results = {
        step1_recalculateProgress: { status: 'pending', updated: 0, skipped: 0, errors: [] as any[] },
        step2_fixCompletionFlags: { status: 'pending', fixed: 0, errors: [] as any[] },
        step3_resetRound2: { status: 'pending', reset: 0, errors: [] as any[] },
      };

      try {
        // STEP 1: Recalculate progress for migrated schools (in batches to avoid timeout)
        console.log('[Migration Cleanup] Step 1: Recalculating migrated schools progress...');
        results.step1_recalculateProgress.status = 'running';
        
        const migratedSchools = await db.query.schools.findMany({
          where: eq(schools.isMigrated, true),
        });
        
        console.log(`[Migration Cleanup] Found ${migratedSchools.length} migrated schools to process`);
        
        const BATCH_SIZE = 50;
        for (let i = 0; i < migratedSchools.length; i += BATCH_SIZE) {
          const batch = migratedSchools.slice(i, i + BATCH_SIZE);
          console.log(`[Migration Cleanup] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(migratedSchools.length / BATCH_SIZE)}`);
          
          for (const school of batch) {
            try {
              const beforeProgress = school.progressPercentage;
              await storage.checkAndUpdateSchoolProgression(school.id);
              const updatedSchool = await storage.getSchool(school.id);
              const afterProgress = updatedSchool?.progressPercentage ?? 0;
              
              if (beforeProgress !== afterProgress) {
                results.step1_recalculateProgress.updated++;
              } else {
                results.step1_recalculateProgress.skipped++;
              }
            } catch (error) {
              results.step1_recalculateProgress.errors.push({
                schoolId: school.id,
                schoolName: school.name,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
        }
        
        results.step1_recalculateProgress.status = 'completed';
        console.log(`[Migration Cleanup] Step 1 completed: ${results.step1_recalculateProgress.updated} updated, ${results.step1_recalculateProgress.skipped} skipped, ${results.step1_recalculateProgress.errors.length} errors`);
      } catch (error) {
        results.step1_recalculateProgress.status = 'failed';
        results.step1_recalculateProgress.errors.push({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error('[Migration Cleanup] Step 1 failed:', error);
      }

      try {
        // STEP 2: Fix completion flags and move award winners to Round 2
        console.log('[Migration Cleanup] Step 2: Fixing completion flags...');
        results.step2_fixCompletionFlags.status = 'running';
        
        const problematicSchools = await db.query.schools.findMany({
          where: or(
            // Case 1: Act complete but earlier stages incomplete (illogical)
            and(
              eq(schools.actCompleted, true),
              or(
                eq(schools.inspireCompleted, false),
                eq(schools.investigateCompleted, false)
              )
            ),
            // Case 2: All 3 stages complete but missing award flag
            and(
              eq(schools.inspireCompleted, true),
              eq(schools.investigateCompleted, true),
              eq(schools.actCompleted, true),
              eq(schools.awardCompleted, false)
            ),
            // Case 3: Award completed but still on Round 1 (should be Round 2)
            and(
              eq(schools.awardCompleted, true),
              or(
                eq(schools.currentRound, 1),
                sql`${schools.currentRound} IS NULL`
              )
            ),
            // Case 4: roundsCompleted=1 but missing award or completion flags (legacy data)
            and(
              sql`${schools.roundsCompleted} >= 1`,
              or(
                eq(schools.awardCompleted, false),
                eq(schools.currentRound, 1),
                sql`${schools.currentRound} IS NULL`
              )
            )
          ),
        });
        
        console.log(`[Migration Cleanup] Found ${problematicSchools.length} schools with completion flag issues`);
        
        for (const school of problematicSchools) {
          try {
            // For schools with roundsCompleted >= 1 (legacy award winners), ensure all flags are set
            const hasCompletedRound = (school.roundsCompleted || 0) >= 1;
            
            if (hasCompletedRound) {
              // Legacy school that completed Round 1 - ensure all flags are correct
              await db.update(schools).set({
                inspireCompleted: true,
                investigateCompleted: true,
                actCompleted: true,
                awardCompleted: true, // They earned the award
                currentRound: 2, // Move to Round 2
                roundsCompleted: 1, // Preserve round completion
                updatedAt: new Date()
              }).where(eq(schools.id, school.id));
            } else {
              // Regular school with illogical flags - fix the logic
              await db.update(schools).set({
                inspireCompleted: true,
                investigateCompleted: true,
              }).where(eq(schools.id, school.id));
              
              // Recalculate to determine if they should get the award
              await storage.checkAndUpdateSchoolProgression(school.id);
              
              // If they got the award, move to Round 2
              const updatedSchool = await storage.getSchool(school.id);
              if (updatedSchool?.awardCompleted && (updatedSchool?.currentRound === 1 || !updatedSchool?.currentRound)) {
                await db.update(schools).set({
                  currentRound: 2,
                  roundsCompleted: 1,
                  updatedAt: new Date()
                }).where(eq(schools.id, school.id));
              }
            }
            
            results.step2_fixCompletionFlags.fixed++;
          } catch (error) {
            results.step2_fixCompletionFlags.errors.push({
              schoolId: school.id,
              schoolName: school.name,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        
        results.step2_fixCompletionFlags.status = 'completed';
        console.log(`[Migration Cleanup] Step 2 completed: ${results.step2_fixCompletionFlags.fixed} fixed, ${results.step2_fixCompletionFlags.errors.length} errors`);
      } catch (error) {
        results.step2_fixCompletionFlags.status = 'failed';
        results.step2_fixCompletionFlags.errors.push({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error('[Migration Cleanup] Step 2 failed:', error);
      }

      try {
        // STEP 3: Reset Round 2 schools to fresh start
        console.log('[Migration Cleanup] Step 3: Resetting Round 2 schools...');
        results.step3_resetRound2.status = 'running';
        
        const round2Schools = await db.query.schools.findMany({
          where: and(
            eq(schools.currentRound, 2),
            eq(schools.awardCompleted, true)
          ),
        });
        
        console.log(`[Migration Cleanup] Found ${round2Schools.length} Round 2 schools to reset`);
        
        for (const school of round2Schools) {
          try {
            await db.update(schools).set({
              currentStage: 'inspire',
              inspireCompleted: false,
              investigateCompleted: false,
              actCompleted: false,
              auditQuizCompleted: false,
              progressPercentage: 0,
              updatedAt: new Date()
            }).where(eq(schools.id, school.id));
            
            results.step3_resetRound2.reset++;
          } catch (error) {
            results.step3_resetRound2.errors.push({
              schoolId: school.id,
              schoolName: school.name,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        
        results.step3_resetRound2.status = 'completed';
        console.log(`[Migration Cleanup] Step 3 completed: ${results.step3_resetRound2.reset} reset, ${results.step3_resetRound2.errors.length} errors`);
      } catch (error) {
        results.step3_resetRound2.status = 'failed';
        results.step3_resetRound2.errors.push({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error('[Migration Cleanup] Step 3 failed:', error);
      }

      // Return comprehensive results
      const overallSuccess = 
        results.step1_recalculateProgress.status === 'completed' &&
        results.step2_fixCompletionFlags.status === 'completed' &&
        results.step3_resetRound2.status === 'completed';

      const hasCriticalFailures =
        results.step1_recalculateProgress.status === 'failed' ||
        results.step2_fixCompletionFlags.status === 'failed' ||
        results.step3_resetRound2.status === 'failed';

      console.log(`[Migration Cleanup] Workflow ${overallSuccess ? 'completed successfully' : 'completed with errors'}`);

      // Use HTTP 500 if any step completely failed (not just individual school errors)
      const statusCode = hasCriticalFailures ? 500 : 200;

      res.status(statusCode).json({
        success: overallSuccess && !hasCriticalFailures,
        message: overallSuccess && !hasCriticalFailures
          ? 'Migration cleanup completed successfully' 
          : hasCriticalFailures
          ? 'Migration cleanup failed - one or more steps did not complete'
          : 'Migration cleanup completed with some errors',
        results,
        stepStatus: {
          step1: results.step1_recalculateProgress.status,
          step2: results.step2_fixCompletionFlags.status,
          step3: results.step3_resetRound2.status,
        },
        summary: {
          step1: `${results.step1_recalculateProgress.updated} schools updated, ${results.step1_recalculateProgress.skipped} skipped`,
          step2: `${results.step2_fixCompletionFlags.fixed} schools fixed`,
          step3: `${results.step3_resetRound2.reset} schools reset to Round 2`,
          totalErrors: 
            results.step1_recalculateProgress.errors.length +
            results.step2_fixCompletionFlags.errors.length +
            results.step3_resetRound2.errors.length
        }
      });
    } catch (error) {
      console.error('[Migration Cleanup] Workflow failed:', error);
      res.status(500).json({
        success: false,
        message: 'Migration cleanup workflow failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Recalculate progress for all schools (applies new calculation logic)
  app.post('/api/admin/recalculate-all-progress', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      console.log('[Recalculate Progress] Starting recalculation for all schools...');
      
      const allSchools = await db.select().from(schools);
      console.log(`[Recalculate Progress] Found ${allSchools.length} schools`);
      
      let updated = 0;
      let skipped = 0;
      const errors: any[] = [];
      
      for (const school of allSchools) {
        try {
          const beforeProgress = school.progressPercentage;
          await storage.checkAndUpdateSchoolProgression(school.id);
          const updatedSchool = await storage.getSchool(school.id);
          const afterProgress = updatedSchool?.progressPercentage ?? 0;
          
          if (beforeProgress !== afterProgress) {
            updated++;
            console.log(`[Recalculate Progress] ${school.name}: ${beforeProgress}% → ${afterProgress}%`);
          } else {
            skipped++;
          }
        } catch (error) {
          errors.push({
            schoolId: school.id,
            schoolName: school.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      console.log(`[Recalculate Progress] Complete: ${updated} updated, ${skipped} unchanged, ${errors.length} errors`);
      
      res.json({
        success: true,
        message: 'Progress recalculation complete',
        total: allSchools.length,
        updated,
        skipped,
        errors: errors.slice(0, 10),
        totalErrors: errors.length
      });
    } catch (error) {
      console.error('[Recalculate Progress] Failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to recalculate progress',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
        sections: z.object({
          overview: z.boolean().default(true),
          scoresEvidence: z.boolean().default(true),
          plasticWasteAudits: z.boolean().default(true),
          userEngagement: z.boolean().default(true),
          aiInsights: z.boolean().default(true),
        }).default({
          overview: true,
          scoresEvidence: true,
          plasticWasteAudits: true,
          userEngagement: true,
          aiInsights: true,
        })
      });

      const { dateRange, sections } = exportRequestSchema.parse(req.body);
      
      console.log('[Export PDF] Fetching analytics data for date range:', dateRange);
      console.log('[Export PDF] Selected sections:', sections);
      
      // Fetch only the data for selected sections
      const fetchPromises: any[] = [];
      
      if (sections.overview) {
        fetchPromises.push(storage.getAnalyticsOverview(dateRange.start, dateRange.end));
      } else {
        fetchPromises.push(null);
      }
      
      if (sections.scoresEvidence) {
        fetchPromises.push(storage.getSchoolProgressAnalytics(dateRange.start, dateRange.end));
        fetchPromises.push(storage.getEvidenceAnalytics(dateRange.start, dateRange.end));
      } else {
        fetchPromises.push(null);
        fetchPromises.push(null);
      }
      
      if (sections.userEngagement) {
        fetchPromises.push(storage.getUserEngagementAnalytics(dateRange.start, dateRange.end));
      } else {
        fetchPromises.push(null);
      }
      
      if (sections.plasticWasteAudits) {
        fetchPromises.push(storage.getAuditOverviewAnalytics());
        fetchPromises.push(storage.getAuditBySchoolAnalytics());
      } else {
        fetchPromises.push(null);
        fetchPromises.push(null);
      }
      
      const [overview, schoolEvidence, evidenceAnalytics, userEngagement, auditOverview, auditBySchool] = await Promise.all(fetchPromises);
      
      // Generate AI insights if requested
      let aiInsights;
      if (sections.aiInsights) {
        console.log('[Export PDF] Generating AI insights...');
        aiInsights = await generateAnalyticsInsights({
          overview: overview || {},
          schoolEvidence: schoolEvidence || {},
          evidenceAnalytics: evidenceAnalytics || {},
          userEngagement: userEngagement || {},
          dateRange
        });
      } else {
        // Provide default insights structure if not requested
        aiInsights = {
          executiveSummary: "This report provides a comprehensive overview of Plastic Clever Schools programme performance during the selected period.",
          keyInsights: [],
          trends: [],
          recommendations: []
        };
      }
      
      // Prepare report data
      const reportData = {
        dateRange,
        sections,
        overview,
        schoolEvidence,
        evidenceAnalytics,
        userEngagement,
        auditOverview,
        auditBySchool,
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

  /**
   * @description GET /api/admin/activity-logs - Admin-only endpoint for retrieving user activity logs with filtering and pagination.
   * @returns {{ logs: UserActivityLog[], total: number }} Object containing paginated activity logs and total count
   * @location server/routes.ts
   * @related shared/schema.ts (userActivityLogs table), client/src/pages/admin.tsx (activity logs tab)
   */
  app.get('/api/admin/activity-logs', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { userId, actionType, startDate, endDate, limit, offset } = req.query;

      // Parse pagination parameters
      const parsedLimit = limit ? parseInt(limit as string) : 100;
      const parsedOffset = offset ? parseInt(offset as string) : 0;

      // Build where conditions
      const whereConditions: any[] = [];

      if (userId) {
        whereConditions.push(eq(userActivityLogs.userId, userId as string));
      }

      if (actionType) {
        whereConditions.push(eq(userActivityLogs.actionType, actionType as string));
      }

      if (startDate) {
        whereConditions.push(gte(userActivityLogs.createdAt, new Date(startDate as string)));
      }

      if (endDate) {
        whereConditions.push(lte(userActivityLogs.createdAt, new Date(endDate as string)));
      }

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(userActivityLogs)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      const total = totalResult[0]?.count || 0;

      // Get paginated logs with user information
      const logs = await db
        .select({
          id: userActivityLogs.id,
          userId: userActivityLogs.userId,
          userEmail: users.email,
          userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
          actionType: userActivityLogs.actionType,
          actionDetails: userActivityLogs.actionDetails,
          targetId: userActivityLogs.targetId,
          targetType: userActivityLogs.targetType,
          ipAddress: userActivityLogs.ipAddress,
          userAgent: userActivityLogs.userAgent,
          createdAt: userActivityLogs.createdAt,
        })
        .from(userActivityLogs)
        .leftJoin(users, eq(userActivityLogs.userId, users.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(userActivityLogs.createdAt))
        .limit(parsedLimit)
        .offset(parsedOffset);

      res.json({ logs, total });
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  /**
   * @description GET /api/admin/evidence - Admin-only endpoint for retrieving all evidence submissions with flexible filtering by status, stage, school, country, and visibility.
   * @returns {Evidence[]} Array of evidence objects matching filters
   * @location server/routes.ts#L2570
   * @related shared/schema.ts (evidence table), client/src/pages/admin.tsx (evidence review tab)
   */
  app.get('/api/admin/evidence', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const filters = {
        status: req.query.status as 'pending' | 'approved' | 'rejected' | undefined,
        stage: req.query.stage as 'inspire' | 'investigate' | 'act' | undefined,
        schoolId: req.query.schoolId as string | undefined,
        country: req.query.country as string | undefined,
        visibility: req.query.visibility as 'public' | 'private' | undefined,
        assignedTo: req.query.assignedTo as string | undefined,
      };
      
      // Remove undefined values
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== undefined)
      );
      
      const evidence = await storage.getAllEvidence(cleanFilters);
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching evidence:", error);
      res.status(500).json({ message: "Failed to fetch evidence" });
    }
  });

  // Get pending evidence for review (kept for backward compatibility)
  app.get('/api/admin/evidence/pending', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const evidence = await storage.getPendingEvidence();
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching pending evidence:", error);
      res.status(500).json({ message: "Failed to fetch pending evidence" });
    }
  });

  // Get approved and public evidence for case studies
  app.get('/api/admin/evidence/approved-public', isAuthenticated, requireAdminOrPartner, async (req, res) => {
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

  /**
   * @description PATCH /api/admin/evidence/:id/review - Admin/Partner endpoint for approving or rejecting evidence submissions. Updates school progression on approval and sends notification emails (approval or revision request).
   * @param {string} id - Evidence ID from URL params
   * @returns {Evidence} Updated evidence object with review status
   * @location server/routes.ts#L2655
   * @related shared/schema.ts (evidence table), server/email.ts (sendEvidenceApprovalEmail, sendEvidenceRejectionEmail), client/src/pages/admin.tsx (evidence review handlers)
   */
  app.patch('/api/admin/evidence/:id/review', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
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

  // Bulk evidence review endpoint (admin/partner)
  app.post('/api/admin/evidence/bulk-review', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
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
      
      // Get reviewer name once (used for all bulk emails)
      const reviewer = await storage.getUser(reviewerId);
      const reviewerName = reviewer?.firstName && reviewer?.lastName 
        ? `${reviewer.firstName} ${reviewer.lastName}` 
        : reviewer?.email || 'Platform Admin';

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

  // Delete individual evidence (admin only)
  app.delete('/api/admin/evidence/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Get evidence before deletion for logging
      const evidence = await storage.getEvidence(id);
      if (!evidence) {
        return res.status(404).json({ message: "Evidence not found" });
      }

      // Delete the evidence
      const deleted = await storage.deleteEvidence(id);
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

  // Assign evidence to admin
  app.patch('/api/admin/evidence/:id/assign', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;
      const userId = req.user.id;
      
      await storage.assignEvidence(id, assignedTo);
      
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

  // Audit Routes
  
  /**
   * @description POST /api/audits - Authenticated endpoint for creating or updating waste audit responses. Supports draft saving and progress tracking for multi-step audit forms.
   * @returns {AuditResponse} Created or updated audit object
   * @location server/routes.ts#L2857
   * @related shared/schema.ts (auditResponses table, insertAuditResponseSchema), client/src/pages/audit.tsx
   */
  app.post('/api/audits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const isAdmin = user?.isAdmin;
      
      // Mark user as having interacted (audit submission is a meaningful action)
      await markUserInteracted(userId);
      
      // Get school to set correct round number
      const school = await storage.getSchool(req.body.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      
      const auditData = insertAuditResponseSchema.parse({
        ...req.body,
        submittedBy: userId,
        roundNumber: school.currentRound || 1,
        // Auto-approve if submitted by admin
        ...(isAdmin ? { status: 'approved' } : {}),
      });

      // Check if audit already exists for this school and current round
      const existingAudit = await storage.getSchoolAudit(auditData.schoolId, school.currentRound || 1);
      
      let audit;
      if (existingAudit && existingAudit.status === 'draft') {
        // Update existing draft for this round
        audit = await storage.updateAudit(existingAudit.id, auditData);
      } else if (!existingAudit) {
        // Create new audit for this round
        audit = await storage.createAudit(auditData);
      } else {
        return res.status(400).json({ message: `Audit already submitted for round ${school.currentRound}` });
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

  // Export audit results as PDF
  app.get('/api/audits/:auditId/results-pdf', isAuthenticated, async (req: any, res) => {
    try {
      const { auditId } = req.params;
      const userId = req.user.id;
      
      // Fetch audit
      const audit = await storage.getAudit(auditId);
      
      if (!audit) {
        return res.status(404).json({ message: "Audit not found" });
      }

      // Verify user has access to this audit
      const user = await storage.getUser(userId);
      const isAdmin = user?.isAdmin;
      
      // Check if user is a member of the school or is admin
      if (!isAdmin) {
        const schoolMember = await storage.getSchoolUser(audit.schoolId, userId);
        if (!schoolMember) {
          return res.status(403).json({ message: "Unauthorized to access this audit" });
        }
      }

      // Get school data
      const school = await storage.getSchool(audit.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }

      // Parse audit data
      const part1Data = audit.part1Data as any;
      const resultsData = audit.resultsData as any;
      
      // Calculate breakdown data for all plastic types
      const allPlasticTypes = resultsData?.plasticCounts || {};
      const allPlasticTypesArray = Object.entries(allPlasticTypes).map(([name, count]) => ({
        name,
        count: Number(count).toLocaleString(),
        isZero: Number(count) === 0
      }));

      // Sort by count descending
      allPlasticTypesArray.sort((a, b) => {
        const countA = Number(a.count.replace(/,/g, ''));
        const countB = Number(b.count.replace(/,/g, ''));
        return countB - countA;
      });

      // Prepare top 5 problem plastics with percentages
      const topProblemPlastics = resultsData?.topProblemPlastics || [];
      const totalPlasticItems = resultsData?.totalPlasticItems || 0;
      
      const topProblemsWithPercentages = topProblemPlastics.map((item: any, idx: number) => ({
        rank: idx + 1,
        name: item.name,
        count: Number(item.count).toLocaleString(),
        percentage: totalPlasticItems > 0 
          ? ((item.count / totalPlasticItems) * 100).toFixed(1) 
          : '0.0'
      }));

      // Prepare template data
      const templateData = {
        schoolName: part1Data?.schoolName || school.name || 'Unknown School',
        auditDate: part1Data?.auditDate 
          ? new Date(part1Data.auditDate).toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            }) 
          : 'N/A',
        studentCount: part1Data?.studentCount || '',
        staffCount: part1Data?.staffCount || '',
        totalPlasticItems: Number(totalPlasticItems).toLocaleString(),
        hasTopPlastics: topProblemsWithPercentages.length > 0,
        topProblemPlastics: topProblemsWithPercentages,
        allPlasticTypes: allPlasticTypesArray,
        generatedDate: new Date().toLocaleDateString('en-GB', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      // Read HTML template
      const templatePath = path.join(import.meta.dirname, 'lib', 'templates', 'audit-results.html');
      let htmlTemplate = await fs.readFile(templatePath, 'utf-8');

      // Simple template replacement (using basic string replacement for Handlebars-like syntax)
      // Replace simple variables
      htmlTemplate = htmlTemplate.replace(/\{\{schoolName\}\}/g, escapeHtml(templateData.schoolName));
      htmlTemplate = htmlTemplate.replace(/\{\{auditDate\}\}/g, escapeHtml(templateData.auditDate));
      htmlTemplate = htmlTemplate.replace(/\{\{totalPlasticItems\}\}/g, templateData.totalPlasticItems);
      htmlTemplate = htmlTemplate.replace(/\{\{generatedDate\}\}/g, escapeHtml(templateData.generatedDate));

      // Replace conditional studentCount
      if (templateData.studentCount) {
        const studentCountHtml = `
      <div class="info-item">
        <span class="info-label">Number of Students</span>
        <span class="info-value">${escapeHtml(templateData.studentCount)}</span>
      </div>`;
        htmlTemplate = htmlTemplate.replace(/\{\{#if studentCount\}\}[\s\S]*?\{\{\/if\}\}/g, studentCountHtml);
      } else {
        htmlTemplate = htmlTemplate.replace(/\{\{#if studentCount\}\}[\s\S]*?\{\{\/if\}\}/g, '');
      }

      // Replace conditional staffCount
      if (templateData.staffCount) {
        const staffCountHtml = `
      <div class="info-item">
        <span class="info-label">Number of Staff</span>
        <span class="info-value">${escapeHtml(templateData.staffCount)}</span>
      </div>`;
        htmlTemplate = htmlTemplate.replace(/\{\{#if staffCount\}\}[\s\S]*?\{\{\/if\}\}/g, staffCountHtml);
      } else {
        htmlTemplate = htmlTemplate.replace(/\{\{#if staffCount\}\}[\s\S]*?\{\{\/if\}\}/g, '');
      }

      // Replace top plastics section
      if (templateData.hasTopPlastics) {
        // Prepare chart data for Chart.js (raw numbers without formatting)
        const chartData = topProblemPlastics.map((item: any) => ({
          name: item.name,
          count: item.count
        }));
        const chartDataJson = JSON.stringify(chartData);
        
        let topPlasticsRows = '';
        templateData.topProblemPlastics.forEach((item: any) => {
          topPlasticsRows += `
        <tr>
          <td class="rank">${item.rank}</td>
          <td class="item-name">
            ${escapeHtml(item.name)}
            <div class="percentage-bar">
              <div class="percentage-fill" style="width: ${item.percentage}%;"></div>
            </div>
          </td>
          <td class="count">${item.count}</td>
          <td class="percentage">${item.percentage}%</td>
        </tr>`;
        });
        
        const topPlasticsHtml = `
  <div class="chart-container">
    <h3>Plastic Waste Distribution</h3>
    <div class="chart-wrapper">
      <canvas id="plasticPieChart"></canvas>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Top 5 Problem Plastics</div>
    
    <table class="top-plastics-table">
      <thead>
        <tr>
          <th style="width: 50px;">Rank</th>
          <th>Plastic Type</th>
          <th style="width: 150px; text-align: right;">Annual Count</th>
          <th style="width: 100px; text-align: right;">Percentage</th>
        </tr>
      </thead>
      <tbody>
        ${topPlasticsRows}
      </tbody>
    </table>
  </div>`;
        
        htmlTemplate = htmlTemplate.replace(/\{\{#if hasTopPlastics\}\}[\s\S]*?\{\{\/if\}\}/g, topPlasticsHtml);
        
        // Replace chart data JSON
        htmlTemplate = htmlTemplate.replace(/\{\{chartDataJson\}\}/g, chartDataJson);
      } else {
        htmlTemplate = htmlTemplate.replace(/\{\{#if hasTopPlastics\}\}[\s\S]*?\{\{\/if\}\}/g, '');
        htmlTemplate = htmlTemplate.replace(/\{\{chartDataJson\}\}/g, '[]');
      }

      // Replace all plastic types breakdown
      let allPlasticsRows = '';
      templateData.allPlasticTypes.forEach((item) => {
        allPlasticsRows += `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td class="count-cell ${item.isZero ? 'zero-count' : ''}">
            ${item.isZero ? '0' : item.count}
          </td>
        </tr>`;
      });
      htmlTemplate = htmlTemplate.replace(/\{\{#each allPlasticTypes\}\}[\s\S]*?\{\{\/each\}\}/g, allPlasticsRows);

      // Generate PDF
      const pdfBuffer = await generatePDFReport(htmlTemplate);

      // Set response headers for PDF download
      const filename = `${sanitizeFilename(templateData.schoolName)}_Audit_Results_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Error generating audit results PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Admin: Get pending audits
  app.get('/api/admin/audits/pending', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
    try {
      const audits = await storage.getPendingAudits();
      res.json(audits);
    } catch (error) {
      console.error("Error fetching pending audits:", error);
      res.status(500).json({ message: "Failed to fetch pending audits" });
    }
  });

  // Admin: Get all audits with filters
  app.get('/api/admin/audits', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
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

  // Admin/Partner: Review audit (approve/reject)
  app.patch('/api/admin/audits/:id/review', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
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
            await sendAuditApprovalEmail(user.email, school.name, user.preferredLanguage || 'en');
          } else {
            await sendAuditRejectionEmail(user.email, school.name, reviewNotes || 'Please review and resubmit', user.preferredLanguage || 'en');
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

  // Printable Form Submission Routes

  // Admin: Get all printable form submissions with filters
  app.get('/api/admin/printable-form-submissions', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { status, formType, schoolId, limit, offset } = req.query;
      
      const submissions = await storage.getAllPrintableFormSubmissions({
        status: status as string | undefined,
        formType: formType as string | undefined,
        schoolId: schoolId as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching printable form submissions:", error);
      res.status(500).json({ message: "Failed to fetch printable form submissions" });
    }
  });

  // Admin/Partner: Update printable form submission status
  app.patch('/api/admin/printable-form-submissions/:id/status', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
    try {
      const { id } = req.params;
      const statusSchema = z.object({
        status: z.enum(['approved', 'rejected', 'revision_requested']),
        reviewNotes: z.string().optional(),
      });
      
      const validatedData = statusSchema.parse(req.body);
      const adminId = req.user.id;
      
      const updatedSubmission = await storage.updatePrintableFormSubmissionStatus(
        id,
        validatedData.status,
        adminId,
        validatedData.reviewNotes
      );
      
      if (!updatedSubmission) {
        return res.status(404).json({ message: "Printable form submission not found" });
      }
      
      res.json(updatedSubmission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error updating printable form submission status:", error);
      res.status(500).json({ message: "Failed to update submission status" });
    }
  });

  // Get printable form submission download URL
  app.get('/api/printable-form-submissions/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.isAdmin || false;
      
      const submission = await storage.getPrintableFormSubmission(id);
      
      if (!submission) {
        return res.status(404).json({ message: "Printable form submission not found" });
      }
      
      // Check access: user must be admin OR submission belongs to user's school
      if (!isAdmin) {
        const userSchools = await storage.getUserSchools(userId);
        const hasAccess = userSchools.some(s => s.id === submission.schoolId);
        
        if (!hasAccess) {
          return res.status(403).json({ message: "Not authorized to download this submission" });
        }
      }
      
      // Get signed download URL
      const objectStorageService = new ObjectStorageService();
      const downloadUrl = await objectStorageService.getSignedDownloadUrl(submission.filePath, 3600);
      
      res.json({ downloadUrl });
    } catch (error) {
      console.error("Error getting printable form submission download URL:", error);
      res.status(500).json({ message: "Failed to get download URL" });
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
      
      console.log("[Reduction Promise] Received data:", JSON.stringify(req.body, null, 2));
      
      // Get school to set correct round number
      const school = await storage.getSchool(req.body.schoolId);
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      
      // Validate request body with round number
      const validatedData = insertReductionPromiseSchema.parse({
        ...req.body,
        roundNumber: school.currentRound || 1,
      });
      
      // Check if user is a member of the school
      const schools = await storage.getUserSchools(userId);
      const isMember = schools.some(s => s.id === validatedData.schoolId) || req.user.isAdmin;
      
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to create promises for this school" });
      }
      
      // Create the promise (reductionAmount and status defaults are handled in storage)
      const promise = await storage.createReductionPromise(validatedData, userId);
      
      res.status(201).json(promise);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("[Reduction Promise] Validation failed:", JSON.stringify(error.errors, null, 2));
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
      
      // Update the promise (reductionAmount will be recalculated in storage if needed)
      const updatedPromise = await storage.updateReductionPromise(id, validatedData, existingPromise);
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
      
      // Use the calculateAggregateMetrics function to get comprehensive metrics
      const aggregateMetrics = calculateAggregateMetrics(activePromises);
      
      // Count unique schools with promises
      const uniqueSchoolIds = new Set(activePromises.map(p => p.schoolId));
      const totalSchoolsWithPromises = uniqueSchoolIds.size;
      
      // Calculate total annualized reduction (sum of all items after frequency conversion)
      const frequencyMultipliers: Record<string, number> = {
        week: 52,
        month: 12,
        year: 1,
      };
      
      const totalAnnualReduction = activePromises.reduce((sum, p) => {
        const multiplier = frequencyMultipliers[p.timeframeUnit] || 1;
        return sum + (p.reductionAmount * multiplier);
      }, 0);
      
      res.json({
        totalPromises: activePromises.length,
        totalSchoolsWithPromises,
        totalAnnualReduction,
        totalAnnualWeightKg: aggregateMetrics.seriousMetrics.kilograms,
        funMetrics: {
          oceanPlasticBottles: aggregateMetrics.funMetrics.oceanPlasticBottles,
          fishSaved: aggregateMetrics.funMetrics.fishSaved,
          seaTurtles: aggregateMetrics.funMetrics.seaTurtles,
          dolphins: aggregateMetrics.funMetrics.dolphins,
          plasticBags: aggregateMetrics.funMetrics.plasticBags,
        },
        seriousMetrics: {
          co2Prevented: aggregateMetrics.seriousMetrics.co2Prevented,
          oilSaved: aggregateMetrics.seriousMetrics.oilSaved,
          tons: aggregateMetrics.seriousMetrics.tons,
        },
        byItemType: aggregateMetrics.byItemType,
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
      const { stage, country, featured, search, categories, tags, status, limit, offset } = req.query;
      
      // Parse comma-separated categories and tags into arrays
      const categoriesArray = categories && typeof categories === 'string' 
        ? categories.split(',').map(c => c.trim()).filter(c => c.length > 0)
        : undefined;
        
      const tagsArray = tags && typeof tags === 'string'
        ? tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : undefined;
      
      const caseStudies = await storage.getCaseStudies({
        stage: stage as string,
        country: country as string,
        featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
        search: search as string,
        categories: categoriesArray,
        tags: tagsArray,
        status: status as 'draft' | 'published' | undefined, // Admins can filter by any status
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      res.json(caseStudies);
    } catch (error) {
      console.error("Error fetching case studies:", error);
      res.status(500).json({ message: "Failed to fetch case studies" });
    }
  });

  // Get single case study by ID (admin - no draft protection)
  app.get('/api/admin/case-studies/:id', isAuthenticated, requireAdmin, async (req, res) => {
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

  // Create case study from evidence
  app.post('/api/admin/case-studies/from-evidence', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
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

      // Log audit action
      await logAuditAction(userId, 'created', 'case_study', caseStudy.id);

      res.status(201).json(caseStudy);
    } catch (error) {
      console.error("Error creating case study from evidence:", error);
      res.status(500).json({ message: "Failed to create case study" });
    }
  });

  // Update case study featured status
  app.put('/api/admin/case-studies/:id/featured', isAuthenticated, requireAdminOrPartner, async (req, res) => {
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

  // Helper function to synchronize imageUrl with images array
  function syncImageUrl(data: any): any {
    // If images array exists and has items, ensure imageUrl is set to first image
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      const firstImageUrl = data.images[0].url;
      if (firstImageUrl && !data.imageUrl) {
        data.imageUrl = firstImageUrl;
      }
    }
    return data;
  }

  // Create new case study
  app.post('/api/admin/case-studies', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
    try {
      const validatedData = insertCaseStudySchema.parse(req.body);
      
      // Sync imageUrl with images array
      const dataWithSyncedImage = syncImageUrl(validatedData);
      
      const caseStudy = await storage.createCaseStudy(dataWithSyncedImage);
      
      // Log audit action
      await logAuditAction(req.user.id, 'created', 'case_study', caseStudy.id);
      
      // Fetch the case study with school info joined
      const caseStudyWithSchool = await storage.getCaseStudyById(caseStudy.id);
      
      res.status(201).json(caseStudyWithSchool || caseStudy);
    } catch (error) {
      console.error("Error creating case study:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create case study" });
    }
  });

  // Update case study
  app.put('/api/admin/case-studies/:id', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
    try {
      const validatedData = insertCaseStudySchema.partial().parse(req.body);
      
      // Sync imageUrl with images array
      const dataWithSyncedImage = syncImageUrl(validatedData);
      
      // Get original case study to check if status is changing to published
      const originalCaseStudy = await storage.getCaseStudyById(req.params.id);
      
      const caseStudy = await storage.updateCaseStudy(req.params.id, dataWithSyncedImage);
      
      if (!caseStudy) {
        return res.status(404).json({ message: "Case study not found" });
      }

      // Log audit action
      await logAuditAction(req.user.id, 'edited', 'case_study', req.params.id, { changes: validatedData });

      // Auto-create version when publishing
      if (validatedData.status === 'published' && originalCaseStudy?.status !== 'published') {
        try {
          // Get the next version number
          const existingVersions = await storage.getCaseStudyVersions(req.params.id);
          const nextVersionNumber = existingVersions.length > 0 
            ? Math.max(...existingVersions.map(v => v.versionNumber)) + 1 
            : 1;
          
          // Create version snapshot
          await storage.createCaseStudyVersion({
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
          // Log version creation error but don't fail the update
          console.error("Error auto-creating version:", versionError);
        }
      }

      // Fetch the updated case study with school info joined
      const caseStudyWithSchool = await storage.getCaseStudyById(caseStudy.id);
      
      res.json(caseStudyWithSchool || caseStudy);
    } catch (error) {
      console.error("Error updating case study:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update case study" });
    }
  });

  // Delete case study
  app.delete('/api/admin/case-studies/:id', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const deleted = await storage.deleteCaseStudy(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Case study not found" });
      }

      res.json({ message: "Case study deleted successfully" });
    } catch (error) {
      console.error("Error deleting case study:", error);
      res.status(500).json({ message: "Failed to delete case study" });
    }
  });

  // Create a version snapshot
  app.post("/api/admin/case-studies/:id/versions", isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the current case study
      const caseStudy = await storage.getCaseStudyById(id);
      if (!caseStudy) {
        return res.status(404).json({ success: false, message: "Case study not found" });
      }
      
      // Get the next version number
      const existingVersions = await storage.getCaseStudyVersions(id);
      const nextVersionNumber = existingVersions.length > 0 
        ? Math.max(...existingVersions.map(v => v.versionNumber)) + 1 
        : 1;
      
      // Create version snapshot
      const version = await storage.createCaseStudyVersion({
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
        snapshot: caseStudy as any, // Full snapshot as JSON
        createdBy: req.user!.id,
      });
      
      res.json({ success: true, version });
    } catch (error: any) {
      console.error("Error creating case study version:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // List all versions for a case study
  app.get("/api/admin/case-studies/:id/versions", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const versions = await storage.getCaseStudyVersions(id);
      res.json({ success: true, versions });
    } catch (error: any) {
      console.error("Error getting case study versions:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Restore a specific version
  app.post("/api/admin/case-studies/:id/versions/:versionId/restore", isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const { id, versionId } = req.params;
      
      // Get the version to restore
      const version = await storage.getCaseStudyVersion(versionId);
      if (!version || version.caseStudyId !== id) {
        return res.status(404).json({ success: false, message: "Version not found" });
      }
      
      // Use snapshot field for complete restoration
      const snapshot = version.snapshot as any;
      
      // Update case study with ALL fields from version and snapshot
      const updated = await storage.updateCaseStudy(id, {
        // Core fields from version table
        title: version.title,
        description: version.description,
        stage: version.stage,
        status: version.status || snapshot?.status || 'draft',
        impact: version.impact,
        
        // Media from version table
        images: version.images as any,
        videos: version.videos as any,
        studentQuotes: version.studentQuotes as any,
        impactMetrics: version.impactMetrics as any,
        timelineSections: version.timelineSections as any,
        
        // Template fields from version table
        templateType: version.templateType,
        beforeImage: version.beforeImage,
        afterImage: version.afterImage,
        
        // Additional fields from snapshot (these are not in version table columns)
        categories: snapshot?.categories,
        tags: snapshot?.tags,
        metaDescription: snapshot?.metaDescription,
        metaKeywords: snapshot?.metaKeywords,
        imageUrl: snapshot?.imageUrl,
        featured: snapshot?.featured,
        priority: snapshot?.priority,
        evidenceId: snapshot?.evidenceId,
        
        // Note: Review workflow fields (reviewStatus, submittedAt, reviewedBy, reviewedAt, reviewNotes)
        // are NOT restored as they track the current approval state, not historical state
      });
      
      res.json({ success: true, caseStudy: updated });
    } catch (error: any) {
      console.error("Error restoring case study version:", error);
      res.status(500).json({ success: false, message: error.message });
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

  // Get schools ready for award completion (Round 1 complete)
  app.get('/api/admin/schools/award-completion-ready', isAuthenticated, requireAdmin, async (req, res) => {
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

  // Bulk award completion: Generate certificates and move schools to Round 2
  app.post('/api/admin/schools/bulk-award-process', isAuthenticated, requireAdmin, async (req: any, res) => {
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

  // Get all users with their school associations for admin management
  app.get('/api/admin/users', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const { role, limit, offset, page, search, interactionFilter, schoolFilter } = req.query;
      
      // If filtering by role=admin, return just admin users (not the full structure)
      if (role === 'admin') {
        const usersWithSchools = await storage.getAllUsersWithSchools();
        const adminUsers = usersWithSchools
          .filter(({ user }) => user.isAdmin)
          .map(({ user }) => user);
        res.json(adminUsers);
      } else {
        // Check if pagination is requested
        const isPaginated = limit !== undefined || offset !== undefined || page !== undefined;
        
        if (isPaginated) {
          // Use paginated query
          const pageNum = page ? parseInt(page as string) : 1;
          const pageSize = limit ? parseInt(limit as string) : 50;
          const pageOffset = offset !== undefined ? parseInt(offset as string) : (pageNum - 1) * pageSize;
          
          const result = await storage.getUsersWithSchoolsPaginated({
            limit: pageSize,
            offset: pageOffset,
            search: search as string,
            interactionFilter: (interactionFilter as 'all' | 'interacted' | 'not-interacted') || 'all',
            schoolFilter: (schoolFilter as 'all' | 'with-schools' | 'without-schools') || 'all',
          });
          
          res.json({
            users: result.users,
            pagination: {
              total: result.total,
              limit: result.limit,
              offset: result.offset,
              page: Math.floor(result.offset / result.limit) + 1,
              totalPages: Math.ceil(result.total / result.limit),
            },
          });
        } else {
          // Otherwise return full structure with schools for admin management (backward compatibility)
          const usersWithSchools = await storage.getAllUsersWithSchools();
          res.json(usersWithSchools);
        }
      }
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
        email: z.string().email().optional(),
        phoneNumber: z.string().optional(),
        preferredLanguage: z.string().optional(),
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

  // Get deletion preview for a user
  app.get('/api/admin/users/:id/deletion-preview', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
    try {
      const { id } = req.params;
      const adminUserId = req.user.id;
      
      // Prevent admin from deleting themselves
      if (id === adminUserId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      console.log(`[Deletion Preview] Admin ${adminUserId} previewing deletion of user ${id}`);
      
      // Get counts of content that will be affected
      const preview = await storage.getUserContentCounts(id);
      
      if (!preview) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(preview);
    } catch (error: any) {
      console.error("[Deletion Preview] Error:", error);
      res.status(500).json({ message: "Failed to get deletion preview" });
    }
  });

  // Delete user with mode selection
  app.delete('/api/admin/users/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { mode = 'soft' } = req.query;
      const adminUserId = req.user.id;
      
      // Prevent admin from deleting themselves
      if (id === adminUserId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      // Validate mode parameter
      if (!['soft', 'transfer', 'hard'].includes(mode as string)) {
        return res.status(400).json({ message: "Invalid mode. Must be 'soft', 'transfer', or 'hard'" });
      }

      console.log(`[Delete User] Admin ${adminUserId} deleting user ${id} with mode: ${mode}`);
      
      const result = await storage.deleteUser(id, mode as 'soft' | 'transfer' | 'hard');
      
      if (!result.success) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`[Delete User] Successfully ${mode} deleted user ${id}`);
      res.json({ 
        message: "User deleted successfully",
        mode: result.mode,
        evidenceDeleted: result.evidenceDeleted,
        caseStudiesAffected: result.caseStudiesAffected
      });
    } catch (error: any) {
      console.error("[Delete User] Error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Bulk delete users with mode selection
  app.post('/api/admin/users/bulk-delete', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { userIds, mode = 'soft' } = req.body;
      const adminUserId = req.user.id;
      
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "Please provide an array of user IDs to delete" });
      }

      // Check if admin is trying to delete themselves
      if (userIds.includes(adminUserId)) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      // Validate mode parameter
      if (!['soft', 'transfer', 'hard'].includes(mode)) {
        return res.status(400).json({ message: "Invalid mode. Must be 'soft', 'transfer', or 'hard'" });
      }

      console.log(`[Bulk Delete Users] Admin ${adminUserId} deleting ${userIds.length} users with mode: ${mode}`);
      
      // Fetch user information before deletion to get emails (only for the users being deleted)
      const userMap = new Map<string, string>();
      for (const userId of userIds) {
        try {
          const user = await storage.getUser(userId);
          if (user) {
            userMap.set(userId, user.email || 'Unknown');
          }
        } catch (error) {
          // User might not exist, will be handled in deletion loop
          userMap.set(userId, 'Unknown');
        }
      }
      
      let successCount = 0;
      let totalEvidenceDeleted = 0;
      const affectedCaseStudiesMap = new Map<string, { id: string; title: string }>();
      const failures: Array<{ email: string; reason: string }> = [];

      for (const userId of userIds) {
        try {
          const result = await storage.deleteUser(userId, mode as 'soft' | 'transfer' | 'hard');
          
          if (result.success) {
            successCount++;
            if (result.evidenceDeleted) totalEvidenceDeleted += result.evidenceDeleted;
            
            // Aggregate affected case studies (avoid duplicates)
            if (result.caseStudiesAffected) {
              result.caseStudiesAffected.forEach(cs => {
                if (!affectedCaseStudiesMap.has(cs.id)) {
                  affectedCaseStudiesMap.set(cs.id, cs);
                }
              });
            }
            
            console.log(`[Bulk Delete Users] ${mode} deleted user ${userId}`);
          } else {
            failures.push({ 
              email: userMap.get(userId) || userId, 
              reason: "User not found" 
            });
          }
        } catch (error: any) {
          failures.push({ 
            email: userMap.get(userId) || userId, 
            reason: error.message || "Unknown error" 
          });
          console.error(`[Bulk Delete Users] Error deleting user ${userId}:`, error);
        }
      }

      const affectedCaseStudies = Array.from(affectedCaseStudiesMap.values());
      const failedCount = failures.length;

      console.log(`[Bulk Delete Users] Completed: ${successCount} successful, ${failedCount} failed, mode: ${mode}`);
      
      res.json({ 
        successCount,
        failedCount,
        failures,
        mode,
        totalEvidenceDeleted,
        affectedCaseStudies
      });
    } catch (error) {
      console.error("[Bulk Delete Users] Error:", error);
      res.status(500).json({ message: "Failed to bulk delete users" });
    }
  });

  // Get all schools for admin management
  app.get('/api/admin/schools', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
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
      } = req.query;
      
      // Parse pagination params
      const currentPage = page ? parseInt(page as string) : 1;
      const pageLimit = limit ? parseInt(limit as string) : 50;
      const offset = (currentPage - 1) * pageLimit;
      
      // Get total count for pagination metadata
      // For interactionStatus filter, we need to fetch all schools and filter in memory
      // For other filters, we can use an efficient COUNT(*) query
      let total: number;
      
      if (interactionStatus && interactionStatus !== 'all') {
        // Fall back to fetching all schools for interaction status filtering
        const totalSchools = await storage.getSchools({
          country: country as string,
          stage: stage as string,
          type: type as string,
          search: search as string,
          language: language as string,
          sortByDate: sortByDate as 'newest' | 'oldest',
          joinedMonth: joinedMonth as string,
          joinedYear: joinedYear as string,
          interactionStatus: interactionStatus as string,
          completionStatus: completionStatus as string,
        });
        total = totalSchools.length;
      } else {
        // Use efficient COUNT(*) query with same WHERE conditions as getSchools
        const conditions = [];
        
        // Country filter
        if (country && country !== 'all') {
          const allCodes = getAllCountryCodes(country);
          const searchValues = [...allCodes, country];
          if (searchValues.length > 1) {
            conditions.push(inArray(schools.country, searchValues));
          } else {
            conditions.push(eq(schools.country, searchValues[0]));
          }
        }
        
        // Stage filter
        if (stage && stage !== 'all') {
          conditions.push(eq(schools.currentStage, stage as any));
        }
        
        // Completion status filter
        if (completionStatus && completionStatus !== 'all') {
          if (completionStatus === 'plastic-clever') {
            conditions.push(eq(schools.awardCompleted, true));
          } else if (completionStatus === 'in-progress') {
            conditions.push(eq(schools.awardCompleted, false));
          }
        }
        
        // Type filter
        if (type && type !== 'all') {
          conditions.push(eq(schools.type, type as any));
        }
        
        // Language filter
        if (language && language !== 'all') {
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
        country: country as string,
        stage: stage as string,
        type: type as string,
        search: search as string,
        language: language as string,
        sortByDate: sortByDate as 'newest' | 'oldest',
        joinedMonth: joinedMonth as string,
        joinedYear: joinedYear as string,
        interactionStatus: interactionStatus as string,
        completionStatus: completionStatus as string,
        sortBy: sortBy as 'name' | 'country' | 'progress' | 'joinDate' | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        limit: pageLimit,
        offset: offset,
      });
      
      // Return pagination metadata
      res.json({
        schools: paginatedSchools,
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit)
      });
    } catch (error) {
      console.error("Error fetching schools:", error);
      res.status(500).json({ message: "Failed to fetch schools" });
    }
  });

  // Get single school by ID
  app.get('/api/admin/schools/:id', isAuthenticated, requireAdminOrPartner, async (req, res) => {
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

  // Get evidence for a specific school
  app.get('/api/admin/schools/:id/evidence', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const schoolId = req.params.id;
      const evidence = await storage.getSchoolEvidence(schoolId);
      res.json(evidence);
    } catch (error) {
      console.error("Error fetching school evidence:", error);
      res.status(500).json({ message: "Failed to fetch evidence" });
    }
  });

  // Get teachers for a specific school
  app.get('/api/admin/schools/:id/teachers', isAuthenticated, requireAdminOrPartner, async (req, res) => {
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

  // Get school users count for deletion preview
  app.get('/api/admin/schools/:id/users-preview', isAuthenticated, requireAdminOrPartner, async (req, res) => {
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

  // Delete school
  app.delete('/api/admin/schools/:id', isAuthenticated, requireAdmin, async (req, res) => {
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

  // Get teachers for a specific school (for expandable rows)
  app.get('/api/admin/schools/:schoolId/teachers', isAuthenticated, requireAdminOrPartner, async (req, res) => {
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
    autoTranslate: z.boolean().optional().default(false),
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

  // Generate translation previews for selected languages
  app.post('/api/admin/bulk-email/translate-preview', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { subject, preheader, title, preTitle, messageContent, languages } = req.body;
      
      if (!subject || !title || !messageContent) {
        return res.status(400).json({ message: "Subject, title, and message content are required" });
      }

      if (!languages || !Array.isArray(languages) || languages.length === 0) {
        return res.status(400).json({ message: "At least one language must be selected" });
      }

      const emailContent = {
        subject,
        preheader: preheader || '',
        title,
        preTitle: preTitle || '',
        messageContent,
      };

      const translations: Record<string, { subject: string; preheader: string; title: string; preTitle: string; messageContent: string }> = {};

      // Generate translations for each selected language
      for (const lang of languages) {
        if (lang === 'en') {
          // English is the source, just copy it
          translations[lang] = emailContent;
        } else {
          try {
            const translated = await translateEmailContent(emailContent, lang);
            translations[lang] = {
              subject: translated.subject,
              preheader: translated.preheader || '',
              title: translated.title,
              preTitle: translated.preTitle || '',
              messageContent: translated.messageContent,
            };
          } catch (error) {
            console.error(`Translation failed for language ${lang}:`, error);
            // If translation fails, use original content
            translations[lang] = emailContent;
          }
        }
      }

      res.json({ translations });
    } catch (error) {
      console.error("Error generating translation previews:", error);
      res.status(500).json({ message: "Failed to generate translations" });
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

      const { recipients, subject, preheader, title, preTitle, messageContent, template, recipientType, filters, autoTranslate } = validationResult.data;
      
      // Get edited translations from request body if provided
      const editedTranslations = req.body.editedTranslations || {};

      let emailList: string[] = [];
      let emailToSchoolLanguageMap: Map<string, string> = new Map();

      if (recipientType === 'custom' && recipients) {
        emailList = recipients;
        // For custom recipients, we can't determine school language, so use English
        recipients.forEach(email => emailToSchoolLanguageMap.set(email, 'en'));
      } else if (recipientType === 'schools') {
        // Get schools based on filters and extract teacher emails from associated users
        const schools = await storage.getSchools({ 
          ...filters,
          limit: filters?.limit || 1000, 
          offset: filters?.offset || 0 
        });
        
        // For bulk email, default to English since getSchools doesn't return primaryLanguage for security
        const schoolLanguageMap = new Map<string, string>();
        schools.forEach(school => {
          schoolLanguageMap.set(school.id, 'en'); // Default to English for admin bulk emails
        });
        
        const schoolIds = schools.map(s => s.id);
        
        // Get all users associated with these specific schools
        const userIdToSchoolIdMap = new Map<string, string>();
        for (const schoolId of schoolIds) {
          const schoolUsers = await storage.getSchoolUsers(schoolId);
          schoolUsers.forEach(su => {
            // Store the first school for each user (primary school)
            if (!userIdToSchoolIdMap.has(su.userId)) {
              userIdToSchoolIdMap.set(su.userId, schoolId);
            }
          });
        }
        
        // Get user details for the associated users and filter for teachers with emails
        const allUsers = await storage.getAllUsers();
        emailList = allUsers
          .filter(user => userIdToSchoolIdMap.has(user.id) && user.email && user.role === 'teacher')
          .map(user => {
            const email = user.email!;
            const schoolId = userIdToSchoolIdMap.get(user.id)!;
            const language = schoolLanguageMap.get(schoolId) || 'en';
            emailToSchoolLanguageMap.set(email, language);
            return email;
          })
          .filter(Boolean);
      } else if (recipientType === 'all_teachers') {
        const users = await storage.getAllUsers();
        
        // Build email list and get primary school for each user
        for (const user of users) {
          if (user.email && user.role === 'teacher') {
            const userSchools = await storage.getUserSchools(user.id);
            const primarySchool = userSchools.length > 0 ? userSchools[0] : null;
            const language = primarySchool?.primaryLanguage || 'en';
            emailToSchoolLanguageMap.set(user.email, language);
            emailList.push(user.email);
          }
        }
      }

      if (emailList.length === 0) {
        return res.status(400).json({ message: "No valid email recipients found" });
      }

      let sent = 0;
      let failed = 0;

      // If auto-translate is enabled, send emails individually with translation
      if (autoTranslate) {
        for (const email of emailList) {
          try {
            const targetLanguage = emailToSchoolLanguageMap.get(email) || 'en';
            let emailContent: EmailContent = {
              subject,
              preheader: preheader || undefined,
              title,
              preTitle: preTitle || undefined,
              messageContent,
            };

            // Use edited translation if available, otherwise translate on the fly
            if (targetLanguage !== 'en') {
              if (editedTranslations[targetLanguage]) {
                // Use the edited translation
                emailContent = editedTranslations[targetLanguage];
              } else {
                // Generate fresh translation
                emailContent = await translateEmailContent(emailContent, targetLanguage);
              }
            }

            const results = await sendBulkEmail({
              recipients: [email],
              subject: emailContent.subject,
              preheader: emailContent.preheader,
              title: emailContent.title,
              preTitle: emailContent.preTitle,
              messageContent: emailContent.messageContent,
            });

            if (results.sent > 0) {
              sent++;
            } else {
              failed++;
            }
          } catch (error) {
            console.error(`Failed to send/translate email to ${email}:`, error);
            failed++;
          }
        }
      } else {
        // Send all at once without translation (original behavior)
        const results = await sendBulkEmail({
          recipients: emailList,
          subject,
          preheader: preheader || '',
          title,
          preTitle: preTitle || '',
          messageContent,
        });
        sent = results.sent;
        failed = results.failed;
      }

      res.json({
        message: "Bulk email sent successfully",
        results: {
          totalRecipients: emailList.length,
          sent,
          failed,
        },
      });
    } catch (error) {
      console.error("Error sending bulk email:", error);
      res.status(500).json({ message: "Failed to send bulk email" });
    }
  });

  // Generate and send weekly admin digest
  app.post('/api/admin/send-weekly-digest', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      // Get date range for the past week
      const weekEnd = new Date();
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      
      // Get all evidence submissions from the past week
      const allEvidence = await storage.getAllEvidence({});
      const weeklyEvidence = allEvidence.filter(e => {
        const submittedAtDate = e.submittedAt || (e as any).createdAt;
        if (!submittedAtDate) return false;
        const submittedAt = new Date(submittedAtDate);
        return submittedAt >= weekStart && submittedAt <= weekEnd;
      });
      
      // Get all users created in the past week
      const allUsers = await storage.getAllUsers();
      const weeklyUsers = allUsers.filter(u => {
        if (!u.createdAt) return false;
        const joinedAt = new Date(u.createdAt);
        return joinedAt >= weekStart && joinedAt <= weekEnd;
      });
      
      // Get platform stats
      const stats = await storage.getSchoolStats();
      const totalSchools = stats.totalSchools || 0;
      
      // Count total evidence and users
      const totalEvidence = allEvidence.length;
      const totalUsers = allUsers.length;
      
      // Prepare evidence submissions data
      const evidenceSubmissions = await Promise.all(
        weeklyEvidence.slice(0, 20).map(async (e) => {
          const school = await storage.getSchool(e.schoolId);
          const submitter = await storage.getUser(e.submittedBy);
          const submittedAtDate = e.submittedAt || (e as any).createdAt;
          return {
            schoolName: school?.name || 'Unknown School',
            evidenceTitle: e.title,
            submitterName: `${submitter?.firstName || ''} ${submitter?.lastName || ''}`.trim() || 'Unknown User',
            submittedAt: submittedAtDate ? new Date(submittedAtDate) : new Date()
          };
        })
      );
      
      // Prepare new users data
      const newUsers = (await Promise.all(
        weeklyUsers.slice(0, 20).map(async (u) => {
          const userSchools = await storage.getUserSchools(u.id);
          if (!u.email || !u.role || !u.createdAt) return null;
          return {
            email: u.email,
            schoolName: userSchools.length > 0 ? userSchools[0].name : 'No School',
            role: u.role,
            joinedAt: new Date(u.createdAt)
          };
        })
      )).filter((u): u is { email: string; schoolName: string; role: string; joinedAt: Date } => u !== null);
      
      // Prepare digest data
      const digestData: WeeklyDigestData = {
        evidenceCount: weeklyEvidence.length,
        evidenceSubmissions,
        newUsersCount: weeklyUsers.length,
        newUsers,
        platformStats: {
          totalSchools,
          totalEvidence,
          totalUsers,
          activeSchools: totalSchools
        },
        weekStart,
        weekEnd
      };
      
      // Get all admin users
      const adminUsers = allUsers.filter(u => u.isAdmin);
      
      if (adminUsers.length === 0) {
        return res.status(400).json({ message: "No admin users found to send digest to" });
      }
      
      // Send digest to all admins
      let sent = 0;
      let failed = 0;
      const results: { email: string; status: 'sent' | 'failed'; error?: string }[] = [];
      
      for (const admin of adminUsers) {
        try {
          if (!admin.email) {
            results.push({ email: 'unknown', status: 'failed', error: 'No email address' });
            failed++;
            continue;
          }
          
          const emailSent = await sendWeeklyAdminDigest(
            admin.email as string,
            digestData,
            admin.preferredLanguage || 'en'
          );
          
          if (emailSent) {
            results.push({ email: admin.email as string, status: 'sent' });
            sent++;
            console.log(`[Weekly Digest] Sent digest to ${admin.email}`);
          } else {
            results.push({ email: admin.email as string, status: 'failed', error: 'Email service failed' });
            failed++;
          }
        } catch (error) {
          console.error(`[Weekly Digest] Failed to send to ${admin.email}:`, error);
          results.push({ 
            email: admin.email as string, 
            status: 'failed', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          failed++;
        }
      }
      
      res.json({
        message: "Weekly digest generation completed",
        results: {
          totalRecipients: adminUsers.length,
          sent,
          failed,
          digestPeriod: {
            start: weekStart.toISOString(),
            end: weekEnd.toISOString()
          },
          summary: {
            evidenceSubmissions: weeklyEvidence.length,
            newUsers: weeklyUsers.length
          }
        },
        details: results
      });
    } catch (error) {
      console.error("[Weekly Digest] Error generating digest:", error);
      res.status(500).json({ message: "Failed to generate weekly digest" });
    }
  });

  // Send test welcome email to preview the template (NO DATABASE CHANGES)
  app.post('/api/admin/send-test-migrated-email', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { testEmail } = req.body;

      if (!testEmail) {
        return res.status(400).json({ message: "Test email address is required" });
      }

      // IMPORTANT: This is a PREVIEW ONLY - use example data, DO NOT modify database
      const tempPassword = "Demo1234";  // Example password for preview
      const schoolName = "Example School"; // Example school name
      const firstName = "Sam";  // Example first name

      // Import the email function
      const { sendMigratedUserWelcomeEmail } = await import('./emailService');
      
      // Send test email with example data ONLY - no database writes
      const emailSent = await sendMigratedUserWelcomeEmail(
        testEmail,
        tempPassword,
        schoolName,
        firstName
      );

      if (emailSent) {
        console.log(`[Test Email] Sent welcome email preview to ${testEmail} (no user data modified)`);
        res.json({ 
          message: "Test email sent successfully",
          note: "This was a preview with example data. No user passwords were modified.",
          details: {
            recipient: testEmail,
            exampleSchoolName: schoolName,
            exampleFirstName: firstName,
            examplePassword: tempPassword
          }
        });
      } else {
        res.status(500).json({ message: "Failed to send test email" });
      }
    } catch (error: any) {
      console.error("[Test Email] Error sending test email:", error);
      res.status(500).json({ message: error.message || "Failed to send test email" });
    }
  });

  // Send welcome emails to migrated users with temporary passwords
  app.post('/api/admin/send-migrated-user-emails', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { userIds } = req.body;
      
      // Get users to email - either specific IDs or all migrated users
      let migratedUsers;
      if (userIds && Array.isArray(userIds) && userIds.length > 0) {
        // Filter to specified user IDs
        const allUsers = await storage.getAllUsers();
        migratedUsers = allUsers.filter(user => 
          userIds.includes(user.id) && user.isMigrated && user.needsPasswordReset
        );
      } else {
        // Legacy behavior: send to all migrated users
        const allUsers = await storage.getAllUsers();
        migratedUsers = allUsers.filter(user => user.isMigrated && user.needsPasswordReset);
      }

      if (migratedUsers.length === 0) {
        return res.status(400).json({ message: "No migrated users awaiting welcome emails" });
      }

      let sent = 0;
      let failed = 0;
      const results: { email: string; status: 'sent' | 'failed'; error?: string }[] = [];

      for (const user of migratedUsers) {
        try {
          if (!user.email) {
            results.push({ email: 'unknown', status: 'failed', error: 'No email address' });
            failed++;
            continue;
          }

          // Generate temporary password (8 chars: uppercase, lowercase, numbers)
          const tempPassword = randomBytes(6).toString('base64').slice(0, 8);
          
          // Hash and store the temporary password
          const passwordHash = await storage.hashPassword(tempPassword);
          await db
            .update(users)
            .set({ 
              passwordHash, 
              welcomeEmailSentAt: new Date(),
              updatedAt: new Date() 
            })
            .where(eq(users.id, user.id));

          // Get school name for the email
          const userSchools = await storage.getUserSchools(user.id);
          const schoolName = userSchools.length > 0 ? userSchools[0].name : 'your school';

          // Import the email function
          const { sendMigratedUserWelcomeEmail } = await import('./emailService');
          
          // Send welcome email with temporary password
          const emailSent = await sendMigratedUserWelcomeEmail(
            user.email,
            tempPassword,
            schoolName,
            user.firstName || undefined,
            user.preferredLanguage || 'en'
          );

          if (emailSent) {
            results.push({ email: user.email, status: 'sent' });
            sent++;
            console.log(`[Migrated Users] Sent welcome email to ${user.email}`);
          } else {
            results.push({ email: user.email, status: 'failed', error: 'Email service failed' });
            failed++;
          }
        } catch (error: any) {
          console.error(`[Migrated Users] Failed to send email to ${user.email}:`, error);
          results.push({ 
            email: user.email || 'unknown', 
            status: 'failed', 
            error: error.message 
          });
          failed++;
        }
      }

      res.json({
        message: "Migrated user welcome emails processed",
        results: {
          totalMigratedUsers: migratedUsers.length,
          sent,
          failed,
          details: results,
        },
      });
    } catch (error) {
      console.error("[Migrated Users] Error sending welcome emails:", error);
      res.status(500).json({ message: "Failed to send migrated user welcome emails" });
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
  app.get('/api/admin/email/health', isAuthenticated, requireAdminOrPartner, async (req, res) => {
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

  // Test email endpoint for administrators and partners
  app.post('/api/admin/email/test', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
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
        from: getFromAddress(),
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
                  <li><strong>From:</strong> ${getFromAddress()}</li>
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
      
      console.log(`[Partner Invitation] Created invitation ${invitation.id} for ${email} (token: ${token.substring(0, 8)}...)`);
      
      // Get inviter details for email
      const inviter = await storage.getUser(userId);
      
      // Send partner invitation email
      const emailSent = await sendPartnerInvitationEmail(
        email,
        inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() : 'An administrator',
        token,
        7,
        inviter?.preferredLanguage || 'en'
      );
      
      if (emailSent) {
        console.log(`[Partner Invitation] Successfully sent invitation email to ${email}`);
      } else {
        console.error(`[Partner Invitation] Failed to send invitation email to ${email} - check SendGrid configuration`);
      }
      
      res.status(201).json({ 
        message: emailSent 
          ? "Partner invitation sent successfully" 
          : "Invitation created but email failed to send. Check email configuration.",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expiresAt: invitation.expiresAt,
        },
        emailSent,
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
      
      console.log(`[Admin Invitation] Created invitation ${invitation.id} for ${email} (token: ${token.substring(0, 8)}...)`);
      
      // Get inviter details for email
      const inviter = await storage.getUser(userId);
      
      // Send invitation email
      const emailSent = await sendAdminInvitationEmail(
        email,
        inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() : 'An administrator',
        token,
        7,
        inviter?.preferredLanguage || 'en'
      );
      
      if (emailSent) {
        console.log(`[Admin Invitation] Successfully sent invitation email to ${email}`);
      } else {
        console.error(`[Admin Invitation] Failed to send invitation email to ${email} - check SendGrid configuration`);
        // Still return success since the invitation was created in the database
        // The admin can manually share the link if needed
      }
      
      res.status(201).json({ 
        message: emailSent 
          ? "Invitation sent successfully" 
          : "Invitation created but email failed to send. Check email configuration.",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expiresAt: invitation.expiresAt,
        },
        token, // Include token for testing/manual sharing
        emailSent,
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
  app.get('/api/admin/invitations', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
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

  // DELETE /api/admin/invitations/:id - Delete an admin invitation
  app.delete('/api/admin/invitations/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      console.log(`[Delete Admin Invitation] Admin ${userId} deleting invitation ${id}`);
      
      const deleted = await storage.deleteAdminInvitation(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      console.log(`[Delete Admin Invitation] Successfully deleted invitation ${id}`);
      res.json({ message: "Invitation deleted successfully" });
    } catch (error) {
      console.error("[Delete Admin Invitation] Error:", error);
      res.status(500).json({ message: "Failed to delete invitation" });
    }
  });

  // GET /api/admin-invitations/:token - Get admin invitation details by token (public)
  app.get('/api/admin-invitations/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      console.log(`[Get Admin Invitation] Fetching invitation details for token ${token.substring(0, 8)}...`);
      
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
      const inviter = invitation.invitedBy ? await storage.getUser(invitation.invitedBy) : null;
      
      // Check if user with this email already exists and what auth methods they have
      const existingUser = await storage.findUserByEmail(invitation.email);
      let authMethod: 'none' | 'password' = 'none';
      
      if (existingUser) {
        const hasPassword = !!existingUser.passwordHash;
        
        if (hasPassword) {
          authMethod = 'password';
        }
        
        console.log(`[Get Admin Invitation] User exists with auth method: ${authMethod}`);
      } else {
        console.log(`[Get Admin Invitation] No existing user found, new account will be created`);
      }
      
      console.log(`[Get Admin Invitation] Returning invitation details for ${invitation.email}`);
      
      res.json({
        email: invitation.email,
        inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() : 'An administrator',
        expiresAt: invitation.expiresAt,
        status: invitation.status,
        authMethod: authMethod,
        hasExistingAccount: !!existingUser,
        role: invitation.role || 'admin',
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
      
      console.log(`[Accept Admin Invitation] User ${userId} accepting invitation with token ${token.substring(0, 8)}...`);
      
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
      } else {
        await db.update(users).set({ role: 'admin', isAdmin: true }).where(eq(users.id, userId));
        console.log(`[Accept Admin Invitation] User ${userId} is now an admin`);
      }
      
      // CRITICAL: Refresh the user's session with updated privileges
      // Without this, user won't see admin access until they log out and back in
      const updatedUser = await storage.getUser(userId);
      if (!updatedUser) {
        console.error(`[Accept Admin Invitation] Failed to fetch updated user ${userId}`);
        return res.status(500).json({ message: "Failed to refresh session" });
      }
      
      // Force Passport to reload the user into the session
      req.login(updatedUser, (err: any) => {
        if (err) {
          console.error(`[Accept Admin Invitation] Failed to refresh session for user ${userId}:`, err);
          return res.status(500).json({ message: "Privileges granted but session refresh failed. Please log out and back in." });
        }
        
        console.log(`[Accept Admin Invitation] Session refreshed for user ${userId} with new privileges`);
        
        if (invitationRole === 'partner') {
          res.json({ 
            message: "Partner invitation accepted successfully. You are now a partner.",
          });
        } else {
          res.json({ 
            message: "Admin invitation accepted successfully. You are now an administrator.",
          });
        }
      });
    } catch (error) {
      console.error("[Accept Admin Invitation] Error:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // POST /api/admin-invitations/:token/profile - Update user profile before accepting invitation
  app.post('/api/admin-invitations/:token/profile', isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.params;
      const userId = req.user.id;
      
      console.log(`[Admin Invitation Profile] User ${userId} updating profile for token ${token.substring(0, 8)}...`);
      
      // Validate request body
      const profileSchema = z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        preferredLanguage: z.string().min(1, "Preferred language is required"),
      });
      
      const profileData = profileSchema.parse(req.body);
      
      // Get invitation by token
      const invitation = await storage.getAdminInvitationByToken(token);
      
      if (!invitation) {
        console.log(`[Admin Invitation Profile] Invitation not found`);
        return res.status(404).json({ message: "Invitation not found or has expired" });
      }
      
      // Check if invitation is expired
      if (new Date() > new Date(invitation.expiresAt)) {
        console.log(`[Admin Invitation Profile] Invitation expired`);
        return res.status(410).json({ message: "This invitation has expired" });
      }
      
      // Check if already accepted
      if (invitation.status === 'accepted') {
        console.log(`[Admin Invitation Profile] Invitation already accepted`);
        return res.status(410).json({ message: "This invitation has already been accepted" });
      }
      
      // Verify the email matches the authenticated user
      const user = await storage.getUser(userId);
      if (user?.email !== invitation.email) {
        console.log(`[Admin Invitation Profile] Email mismatch - invitation for ${invitation.email}, user is ${user?.email}`);
        return res.status(403).json({ message: "This invitation is for a different email address" });
      }
      
      // Update user profile with onboarding data
      const updatedUser = await storage.updateAdminOnboarding(userId, profileData);
      
      if (!updatedUser) {
        console.error(`[Admin Invitation Profile] Failed to update user ${userId}`);
        return res.status(500).json({ message: "Failed to update profile" });
      }
      
      // Refresh the user's session with updated profile
      req.login(updatedUser, (err: any) => {
        if (err) {
          console.error(`[Admin Invitation Profile] Failed to refresh session for user ${userId}:`, err);
          return res.status(500).json({ message: "Profile updated but session refresh failed. Please log out and back in." });
        }
        
        console.log(`[Admin Invitation Profile] Profile updated and session refreshed for user ${userId}`);
        res.json({ 
          message: "Profile updated successfully",
          user: updatedUser
        });
      });
    } catch (error) {
      console.error("[Admin Invitation Profile] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update profile" });
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

  // GET /api/admin/verification-requests - Admin views all verification requests across all schools
  app.get('/api/admin/verification-requests', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
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
            notes || undefined,
            user.preferredLanguage || 'en'
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
            notes,
            user.preferredLanguage || 'en'
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
      const success = await sendTeacherInvitationEmail(recipientEmail, schoolName, inviterName, token, expiresInDays, 'en');
      
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
      
      // Add registration counts and normalize URLs for each event
      const eventsWithCounts = await Promise.all(
        events.map(async (event) => {
          const registrationsCount = await storage.getEventRegistrationCount(event.id);
          return { 
            ...event, 
            registrationsCount,
            imageUrl: event.imageUrl ? normalizeObjectStorageUrl(event.imageUrl) : null,
            eventPackBannerImageUrl: event.eventPackBannerImageUrl ? normalizeObjectStorageUrl(event.eventPackBannerImageUrl) : null,
          };
        })
      );
      
      res.json(eventsWithCounts);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      res.status(500).json({ message: "Failed to fetch upcoming events" });
    }
  });

  /**
   * @description GET /api/events - Public endpoint for retrieving published events with filtering by type and upcoming status. Powers events listing and event calendar.
   * @returns {Event[]} Array of published event objects with pagination
   * @location server/routes.ts#L5335
   * @related shared/schema.ts (events table), client/src/pages/events.tsx, client/src/pages/event-live.tsx
   */
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
      
      // Add registration counts and normalize URLs for each event
      const eventsWithCounts = await Promise.all(
        events.map(async (event) => {
          const registrationsCount = await storage.getEventRegistrationCount(event.id);
          return { 
            ...event, 
            registrationsCount,
            imageUrl: event.imageUrl ? normalizeObjectStorageUrl(event.imageUrl) : null,
            eventPackBannerImageUrl: event.eventPackBannerImageUrl ? normalizeObjectStorageUrl(event.eventPackBannerImageUrl) : null,
          };
        })
      );
      
      res.json(eventsWithCounts);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Get past events (public) - must come before /api/events/:id to avoid route conflict
  app.get('/api/events/past', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const pastEvents = await storage.getPastEvents(limit);
      
      // Normalize URLs in all events
      const normalizedEvents = pastEvents.map(event => ({
        ...event,
        imageUrl: event.imageUrl ? normalizeObjectStorageUrl(event.imageUrl) : null,
        eventPackBannerImageUrl: event.eventPackBannerImageUrl ? normalizeObjectStorageUrl(event.eventPackBannerImageUrl) : null,
      }));
      
      res.json(normalizedEvents);
    } catch (error) {
      console.error("Error fetching past events:", error);
      res.status(500).json({ message: "Failed to fetch past events" });
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
      
      // Add registration count and attached resources
      const registrationsCount = await storage.getEventRegistrationCount(event.id);
      const attachedResources = await storage.getEventResources(event.id);
      
      // Normalize URLs
      const normalizedEvent = {
        ...event,
        registrationsCount,
        attachedResources,
        imageUrl: event.imageUrl ? normalizeObjectStorageUrl(event.imageUrl) : null,
        eventPackBannerImageUrl: event.eventPackBannerImageUrl ? normalizeObjectStorageUrl(event.eventPackBannerImageUrl) : null,
      };
      
      res.json(normalizedEvent);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // Public: Get event by public slug
  app.get('/api/events/slug/:slug', async (req, res) => {
    try {
      const events = await storage.getEvents({ publicSlug: req.params.slug, status: 'published' });
      if (events.length === 0) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Add registration count and attached resources
      const event = events[0];
      const registrationsCount = await storage.getEventRegistrationCount(event.id);
      const attachedResources = await storage.getEventResources(event.id);
      
      // Normalize URLs
      const normalizedEvent = {
        ...event,
        registrationsCount,
        attachedResources,
        imageUrl: event.imageUrl ? normalizeObjectStorageUrl(event.imageUrl) : null,
        eventPackBannerImageUrl: event.eventPackBannerImageUrl ? normalizeObjectStorageUrl(event.eventPackBannerImageUrl) : null,
      };
      
      res.json(normalizedEvent);
    } catch (error) {
      console.error("Error fetching event by slug:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // Authenticated: Mark events as viewed (updates lastViewedEventsAt timestamp)
  app.post('/api/events/mark-viewed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      await db.update(users)
        .set({ lastViewedEventsAt: new Date() })
        .where(eq(users.id, userId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking events as viewed:", error);
      res.status(500).json({ message: "Failed to update view timestamp" });
    }
  });

  /**
   * @description POST /api/events/:id/register - Authenticated endpoint for registering to events with capacity checking and waitlist support. Sends confirmation email and handles Mailchimp tagging.
   * @param {string} id - Event ID from URL params
   * @returns {EventRegistration} Created registration object with status
   * @location server/routes.ts#L5387
   * @related shared/schema.ts (eventRegistrations table), server/email.ts (sendEventRegistrationEmail), client/src/pages/events.tsx
   */
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
            publicSlug: event.publicSlug || undefined,
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

  // Authenticated: Check if user is registered for a specific event
  app.get('/api/events/:id/registration', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = req.params.id;
      const userId = req.user.id;
      
      const registration = await storage.getEventRegistration(eventId, userId);
      
      if (!registration) {
        return res.status(404).json({ message: "Not registered" });
      }
      
      res.json(registration);
    } catch (error) {
      console.error("Error checking event registration:", error);
      res.status(500).json({ message: "Failed to check registration" });
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
          registration.event,
          req.user.preferredLanguage || 'en'
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

  // Track event link click (meeting link, video, etc.)
  app.post('/api/events/:id/track-click', async (req: any, res) => {
    try {
      const eventId = req.params.id;
      const userId = req.user?.id;
      
      await storage.trackEventLinkClick(eventId, userId);
      res.json({ message: "Click tracked successfully" });
    } catch (error) {
      console.error("Error tracking event link click:", error);
      res.status(500).json({ message: "Failed to track click" });
    }
  });

  // Track event resource download
  app.post('/api/events/:id/resources/:fileIndex/download', async (req: any, res) => {
    try {
      const eventId = req.params.id;
      const fileIndex = parseInt(req.params.fileIndex);
      const { fileName } = req.body;
      const userId = req.user?.id;
      
      if (!fileName) {
        return res.status(400).json({ message: "File name is required" });
      }
      
      await storage.trackEventResourceDownload(eventId, fileIndex, fileName, userId);
      res.json({ message: "Download tracked successfully" });
    } catch (error) {
      console.error("Error tracking resource download:", error);
      res.status(500).json({ message: "Failed to track download" });
    }
  });

  // Get user's past event registrations (authenticated)
  app.get('/api/my-events/past', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const allRegistrations = await storage.getUserEventRegistrations(userId);
      
      // Filter for past events
      const pastEventRegistrations = allRegistrations.filter(reg => {
        const eventEndDate = new Date(reg.event.endDateTime);
        return eventEndDate < new Date();
      });
      
      res.json(pastEventRegistrations);
    } catch (error) {
      console.error("Error fetching user's past events:", error);
      res.status(500).json({ message: "Failed to fetch past events" });
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

  // Admin: Get detailed analytics for a specific event
  app.get('/api/admin/events/:id/analytics', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const eventId = req.params.id;
      const analytics = await storage.getEventDetailedAnalytics(eventId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching detailed event analytics:", error);
      res.status(500).json({ message: "Failed to fetch detailed analytics" });
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

  /**
   * @description POST /api/admin/events - Admin/Partner endpoint for creating events with full details including page builder content (YouTube videos, PDFs, testimonials). Validates dates and capacity.
   * @returns {Event} Created event object
   * @location server/routes.ts#L5565
   * @related shared/schema.ts (events table, insertEventSchema), client/src/pages/admin.tsx (event form handlers)
   */
  app.post('/api/admin/events', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
    try {
      const eventData = insertEventSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      
      // Auto-generate publicSlug from title if not provided
      if (!eventData.publicSlug && eventData.title) {
        const baseSlug = eventData.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        // Check if slug exists, if so append timestamp to make it unique
        const existingEvents = await storage.getEvents({ publicSlug: baseSlug });
        if (existingEvents && existingEvents.length > 0) {
          eventData.publicSlug = `${baseSlug}-${Date.now()}`;
        } else {
          eventData.publicSlug = baseSlug;
        }
      }
      
      // Automatically set main status to 'published' if pagePublishedStatus is coming_soon or published
      // and status is not explicitly set or is still 'draft'
      if ((eventData.pagePublishedStatus === 'coming_soon' || eventData.pagePublishedStatus === 'published') 
          && (!eventData.status || eventData.status === 'draft')) {
        eventData.status = 'published';
      }
      
      // Auto-populate English translations from main title/description
      if (eventData.title) {
        const existingTitleTranslations = (eventData.titleTranslations && typeof eventData.titleTranslations === 'object') 
          ? eventData.titleTranslations 
          : {};
        eventData.titleTranslations = {
          ...existingTitleTranslations,
          en: eventData.title,
        };
      }
      
      if (eventData.description) {
        const existingDescriptionTranslations = (eventData.descriptionTranslations && typeof eventData.descriptionTranslations === 'object')
          ? eventData.descriptionTranslations
          : {};
        eventData.descriptionTranslations = {
          ...existingDescriptionTranslations,
          en: eventData.description,
        };
      }
      
      const event = await storage.createEvent(eventData);

      // Log audit action
      await logAuditAction(req.user.id, 'created', 'event', event.id);

      res.json({ message: "Event created successfully", event });
    } catch (error) {
      console.error("Error creating event:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // Admin/Partner: Update event
  app.put('/api/admin/events/:id', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const eventId = req.params.id;
      const updates = req.body;
      
      // Get existing event for validation
      const existingEvent = await storage.getEvent(eventId);
      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Automatically set main status to 'published' if pagePublishedStatus is coming_soon or published
      // and status is not explicitly being updated or is currently 'draft'
      if ((updates.pagePublishedStatus === 'coming_soon' || updates.pagePublishedStatus === 'published') 
          && (!updates.status && existingEvent.status === 'draft')) {
        updates.status = 'published';
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
      
      // Validate date changes - prevent setting dates to the past (except drafts)
      // Allow editing dates on draft events regardless of date
      if (updates.startDateTime || updates.endDateTime) {
        const isDraft = existingEvent.status === 'draft' || updates.status === 'draft';
        const now = new Date();
        
        // Check if new dates are in the past (only for non-draft events)
        if (!isDraft) {
          if (updates.startDateTime && new Date(updates.startDateTime) < now) {
            return res.status(400).json({ 
              message: "Cannot set start date to the past" 
            });
          }
          if (updates.endDateTime && new Date(updates.endDateTime) < now) {
            return res.status(400).json({ 
              message: "Cannot set end date to the past" 
            });
          }
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
      
      // Convert datetime fields to Date objects for Drizzle
      const processedUpdates = { ...updates };
      if (processedUpdates.startDateTime) {
        processedUpdates.startDateTime = new Date(processedUpdates.startDateTime);
      }
      if (processedUpdates.endDateTime) {
        processedUpdates.endDateTime = new Date(processedUpdates.endDateTime);
      }
      if (processedUpdates.registrationDeadline) {
        processedUpdates.registrationDeadline = new Date(processedUpdates.registrationDeadline);
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
      
      // Auto-sync English translations when main title/description changes
      // IMPORTANT: Preserve translations sent from frontend (e.g., auto-translated), don't overwrite with DB values
      if (processedUpdates.title) {
        // Use translations from the update request if provided, otherwise fall back to database
        const baseTitleTranslations = (processedUpdates.titleTranslations && typeof processedUpdates.titleTranslations === 'object')
          ? processedUpdates.titleTranslations
          : (existingEvent.titleTranslations && typeof existingEvent.titleTranslations === 'object')
            ? existingEvent.titleTranslations
            : {};
        
        processedUpdates.titleTranslations = {
          ...baseTitleTranslations,
          en: processedUpdates.title,
        };
      }
      
      if (processedUpdates.description) {
        // Use translations from the update request if provided, otherwise fall back to database
        const baseDescriptionTranslations = (processedUpdates.descriptionTranslations && typeof processedUpdates.descriptionTranslations === 'object')
          ? processedUpdates.descriptionTranslations
          : (existingEvent.descriptionTranslations && typeof existingEvent.descriptionTranslations === 'object')
            ? existingEvent.descriptionTranslations
            : {};
        
        processedUpdates.descriptionTranslations = {
          ...baseDescriptionTranslations,
          en: processedUpdates.description,
        };
      }
      
      const event = await storage.updateEvent(eventId, processedUpdates);

      // Log audit action
      if (req.user) {
        await logAuditAction(req.user.id, 'edited', 'event', eventId, { changes });
      }
      
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
                    publicSlug: event.publicSlug || undefined,
                  },
                  changes,
                  registration.user.preferredLanguage || 'en'
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

  // Admin/Partner: Delete event
  app.delete('/api/admin/events/:id', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      await storage.deleteEvent(req.params.id);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Admin/Partner: Duplicate event
  app.post('/api/admin/events/:id/duplicate', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
    try {
      const eventId = req.params.id;
      
      // Fetch the original event
      const originalEvent = await storage.getEvent(eventId);
      if (!originalEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Prepare duplicated event data
      const duplicatedTitle = `${originalEvent.title} (Copy)`;
      
      // Generate unique slug using same logic as POST /api/admin/events
      const baseSlug = duplicatedTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Check if slug exists, if so append timestamp to make it unique
      const existingEvents = await storage.getEvents({ publicSlug: baseSlug });
      const publicSlug = (existingEvents && existingEvents.length > 0) 
        ? `${baseSlug}-${Date.now()}`
        : baseSlug;
      
      // Update English translation title to include " (Copy)"
      const titleTranslations = (originalEvent.titleTranslations && typeof originalEvent.titleTranslations === 'object')
        ? { ...originalEvent.titleTranslations, en: duplicatedTitle }
        : { en: duplicatedTitle };
      
      // Prepare event data for duplication
      const eventData = {
        title: duplicatedTitle,
        description: originalEvent.description,
        eventType: originalEvent.eventType,
        status: 'draft' as const, // Always create as draft
        startDateTime: originalEvent.startDateTime,
        endDateTime: originalEvent.endDateTime,
        location: originalEvent.location,
        isVirtual: originalEvent.isVirtual,
        meetingLink: originalEvent.meetingLink,
        imageUrl: originalEvent.imageUrl,
        capacity: originalEvent.capacity,
        waitlistEnabled: originalEvent.waitlistEnabled,
        registrationDeadline: originalEvent.registrationDeadline,
        tags: originalEvent.tags,
        timezone: originalEvent.timezone,
        accessToken: originalEvent.accessToken,
        isPreRecorded: originalEvent.isPreRecorded,
        recordingAvailableFrom: originalEvent.recordingAvailableFrom,
        pagePublishedStatus: originalEvent.pagePublishedStatus || 'draft',
        accessType: originalEvent.accessType,
        publicSlug: publicSlug,
        createdBy: req.user.id, // Set to current user
        
        // Copy multi-language fields
        titleTranslations: titleTranslations,
        descriptionTranslations: originalEvent.descriptionTranslations as any,
        youtubeVideoTranslations: originalEvent.youtubeVideoTranslations as any,
        eventPackFileTranslations: originalEvent.eventPackFileTranslations as any,
        testimonialTranslations: originalEvent.testimonialTranslations as any,
        
        // Copy page builder content
        youtubeVideos: originalEvent.youtubeVideos as any,
        eventPackFiles: originalEvent.eventPackFiles as any,
        testimonials: originalEvent.testimonials as any,
      };
      
      // Create the duplicated event
      const duplicatedEvent = await storage.createEvent(eventData);
      
      res.json(duplicatedEvent);
    } catch (error) {
      console.error("Error duplicating event:", error);
      res.status(500).json({ message: "Failed to duplicate event" });
    }
  });

  // Admin/Partner: Attach resource to event
  app.post('/api/admin/events/:id/resources', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const eventId = req.params.id;
      const { resourceId, orderIndex } = req.body;

      if (!resourceId) {
        return res.status(400).json({ message: "Resource ID is required" });
      }

      // Verify event exists
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Attach resource
      const eventResource = await storage.attachResourceToEvent(eventId, resourceId, orderIndex);
      res.json({ message: "Resource attached successfully", eventResource });
    } catch (error) {
      console.error("Error attaching resource to event:", error);
      if (error instanceof Error && error.message.includes('unique')) {
        return res.status(400).json({ message: "Resource is already attached to this event" });
      }
      res.status(500).json({ message: "Failed to attach resource" });
    }
  });

  // Admin/Partner: Detach resource from event
  app.delete('/api/admin/events/:id/resources/:resourceId', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const { id: eventId, resourceId } = req.params;
      await storage.detachResourceFromEvent(eventId, resourceId);
      res.json({ message: "Resource detached successfully" });
    } catch (error) {
      console.error("Error detaching resource from event:", error);
      res.status(500).json({ message: "Failed to detach resource" });
    }
  });

  // Admin: Get event resources
  app.get('/api/admin/events/:id/resources', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const eventId = req.params.id;
      const resources = await storage.getEventResources(eventId);
      res.json(resources);
    } catch (error) {
      console.error("Error fetching event resources:", error);
      res.status(500).json({ message: "Failed to fetch event resources" });
    }
  });

  // Admin/Partner: Reorder event resources
  app.put('/api/admin/events/:id/resources/reorder', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const eventId = req.params.id;
      const { resourceOrders } = req.body;

      if (!Array.isArray(resourceOrders)) {
        return res.status(400).json({ message: "resourceOrders must be an array" });
      }

      await storage.reorderEventResources(eventId, resourceOrders);
      res.json({ message: "Resources reordered successfully" });
    } catch (error) {
      console.error("Error reordering event resources:", error);
      res.status(500).json({ message: "Failed to reorder resources" });
    }
  });

  // Admin/Partner: Auto-translate event content
  app.post('/api/admin/events/:id/auto-translate', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const eventId = req.params.id;
      const { languages } = req.body;
      
      if (!languages || !Array.isArray(languages) || languages.length === 0) {
        return res.status(400).json({ message: "At least one language must be selected" });
      }
      
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (!event.title || !event.description) {
        return res.status(400).json({ message: "Event must have title and description to translate" });
      }
      
      const eventContent = {
        title: event.title,
        description: event.description,
      };
      
      const titleTranslations: Record<string, string> = {};
      const descriptionTranslations: Record<string, string> = {};
      
      // Always include English (original)
      titleTranslations.en = event.title;
      descriptionTranslations.en = event.description;
      
      // Generate translations for each selected language
      for (const lang of languages) {
        if (lang === 'en') {
          continue; // Skip English, already added
        }
        
        try {
          const { translateEventContent } = await import('./translationService');
          const translated = await translateEventContent(eventContent, lang);
          titleTranslations[lang] = translated.title;
          descriptionTranslations[lang] = translated.description;
        } catch (error) {
          console.error(`Translation failed for language ${lang}:`, error);
          // If translation fails, use original content
          titleTranslations[lang] = event.title;
          descriptionTranslations[lang] = event.description;
        }
      }
      
      res.json({ 
        titleTranslations, 
        descriptionTranslations 
      });
    } catch (error) {
      console.error("Error auto-translating event:", error);
      res.status(500).json({ message: "Failed to auto-translate event" });
    }
  });

  // Admin/Partner: Update event landing page content
  app.patch('/api/admin/events/:id/page-content', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const eventId = req.params.id;
      const { 
        publicSlug, 
        youtubeVideos, 
        eventPackFiles, 
        testimonials, 
        accessToken,
        titleTranslations,
        descriptionTranslations,
        youtubeVideoTranslations,
        eventPackFileTranslations,
        testimonialTranslations,
        featuredVideoIndex,
        eventPackBannerImageUrl,
        showEvidenceSubmission,
        evidenceSubmissionText
      } = req.body;
      
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Validate public slug uniqueness if provided and changed
      if (publicSlug !== undefined && publicSlug !== event.publicSlug && publicSlug !== '') {
        const existingEvents = await storage.getEvents({ publicSlug });
        const conflictingEvent = existingEvents.find(e => e.id !== eventId);
        if (conflictingEvent) {
          return res.status(400).json({ 
            message: `Public slug "${publicSlug}" is already in use by another event: "${conflictingEvent.title}"`,
            field: "publicSlug"
          });
        }
      }
      
      const updates: any = {};
      if (publicSlug !== undefined) updates.publicSlug = publicSlug;
      if (youtubeVideos !== undefined) updates.youtubeVideos = youtubeVideos;
      if (eventPackFiles !== undefined) updates.eventPackFiles = eventPackFiles;
      if (testimonials !== undefined) updates.testimonials = testimonials;
      if (accessToken !== undefined) updates.accessToken = accessToken;
      if (titleTranslations !== undefined) updates.titleTranslations = titleTranslations;
      if (descriptionTranslations !== undefined) updates.descriptionTranslations = descriptionTranslations;
      if (youtubeVideoTranslations !== undefined) updates.youtubeVideoTranslations = youtubeVideoTranslations;
      if (eventPackFileTranslations !== undefined) updates.eventPackFileTranslations = eventPackFileTranslations;
      if (testimonialTranslations !== undefined) updates.testimonialTranslations = testimonialTranslations;
      if (featuredVideoIndex !== undefined) updates.featuredVideoIndex = featuredVideoIndex;
      if (eventPackBannerImageUrl !== undefined) updates.eventPackBannerImageUrl = eventPackBannerImageUrl;
      if (showEvidenceSubmission !== undefined) updates.showEvidenceSubmission = showEvidenceSubmission;
      if (evidenceSubmissionText !== undefined) updates.evidenceSubmissionText = evidenceSubmissionText;
      
      const updatedEvent = await storage.updateEvent(eventId, updates);
      res.json({ message: "Event page content updated successfully", event: updatedEvent });
    } catch (error) {
      console.error("Error updating event page content:", error);
      res.status(500).json({ message: "Failed to update event page content" });
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

  // Admin/Partner: Send event announcement via SendGrid
  app.post('/api/admin/events/:id/announce', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
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
      const result = await sendEventAnnouncementEmail(recipients, {
        ...event,
        timezone: event.timezone ?? undefined,
        location: event.location ?? undefined,
        isVirtual: event.isVirtual ?? undefined,
        meetingLink: event.meetingLink ?? undefined,
        imageUrl: event.imageUrl ?? undefined,
        capacity: event.capacity ?? undefined,
        publicSlug: event.publicSlug ?? undefined
      });
      
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

  // Admin/Partner: Send event digest via SendGrid
  app.post('/api/admin/events/digest', isAuthenticated, requireAdminOrPartner, async (req: any, res) => {
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
      const result = await sendEventDigestEmail(recipients, eventsToInclude.map(event => ({
        ...event,
        timezone: event.timezone ?? undefined,
        location: event.location ?? undefined,
        isVirtual: event.isVirtual ?? undefined,
        imageUrl: event.imageUrl ?? undefined,
        publicSlug: event.publicSlug ?? undefined
      })));
      
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

  // Event Banner Routes
  // Get all event banners (admin)
  app.get('/api/admin/banners', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const banners = await storage.getEventBanners();
      res.json(banners);
    } catch (error: any) {
      console.error("Error fetching event banners:", error);
      res.status(500).json({ message: "Failed to fetch event banners" });
    }
  });

  // Get active banner (public)
  app.get('/api/banners/active', async (req, res) => {
    try {
      const banner = await storage.getActiveEventBanner();
      res.json(banner);
    } catch (error: any) {
      console.error("Error fetching active banner:", error);
      res.status(500).json({ message: "Failed to fetch active banner" });
    }
  });

  // Create event banner (admin)
  app.post('/api/admin/banners', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const newBanner = await storage.createEventBanner({
        ...req.body,
        createdBy: req.user.id,
      });
      res.json(newBanner);
    } catch (error: any) {
      console.error("Error creating event banner:", error);
      res.status(500).json({ message: "Failed to create event banner" });
    }
  });

  // Update event banner (admin)
  app.put('/api/admin/banners/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const updatedBanner = await storage.updateEventBanner(req.params.id, req.body);
      if (!updatedBanner) {
        return res.status(404).json({ message: "Banner not found" });
      }
      res.json(updatedBanner);
    } catch (error: any) {
      console.error("Error updating event banner:", error);
      res.status(500).json({ message: "Failed to update event banner" });
    }
  });

  // Delete event banner (admin)
  app.delete('/api/admin/banners/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      await storage.deleteEventBanner(req.params.id);
      res.json({ message: "Banner deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting event banner:", error);
      res.status(500).json({ message: "Failed to delete event banner" });
    }
  });

  // Printable Form Download Routes
  const { generatePrintableForm, getPrintableFormFilename } = await import('./lib/printableForms');
  
  // Download blank audit form PDF
  app.get('/api/printable-forms/audit', async (req, res) => {
    try {
      console.log('[Printable Forms] Generating audit form PDF...');
      const pdfBuffer = await generatePrintableForm('audit-form');
      const filename = getPrintableFormFilename('audit');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('[Printable Forms] Error generating audit form:', error);
      res.status(500).json({ message: 'Failed to generate audit form PDF' });
    }
  });
  
  // Download blank action plan form PDF
  app.get('/api/printable-forms/action-plan', async (req, res) => {
    try {
      console.log('[Printable Forms] Generating action plan form PDF...');
      const pdfBuffer = await generatePrintableForm('action-plan-form');
      const filename = getPrintableFormFilename('action-plan');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('[Printable Forms] Error generating action plan form:', error);
      res.status(500).json({ message: 'Failed to generate action plan form PDF' });
    }
  });

  // Printable Form Upload Routes
  const objectStorageService = new ObjectStorageService();

  // Get signed URL for uploading printable forms
  app.post('/api/uploads/printable-forms/signed-url', isAuthenticated, async (req, res) => {
    try {
      const { formType, filename, fileSize } = req.body;

      // Validate form type
      if (!formType || !['audit', 'action_plan'].includes(formType)) {
        return res.status(400).json({ message: 'Invalid form type. Must be "audit" or "action_plan"' });
      }

      if (!filename) {
        return res.status(400).json({ message: 'Filename is required' });
      }

      // Validate PDF extension
      if (!filename.toLowerCase().endsWith('.pdf')) {
        return res.status(400).json({ message: 'Only PDF files are allowed. Filename must end with .pdf' });
      }

      // Validate file size (max 10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
      if (!fileSize || typeof fileSize !== 'number') {
        return res.status(400).json({ message: 'File size is required' });
      }

      if (fileSize > MAX_FILE_SIZE) {
        return res.status(400).json({ 
          message: `File size exceeds maximum allowed size of 10MB. File size: ${(fileSize / (1024 * 1024)).toFixed(2)}MB` 
        });
      }

      if (fileSize <= 0) {
        return res.status(400).json({ message: 'Invalid file size' });
      }

      // Generate unique object path in private directory
      const privateDir = objectStorageService.getPrivateObjectDir();
      const objectId = randomUUID();
      const fullPath = `${privateDir}/printable-forms/${formType}/${objectId}`;

      // Parse path and generate signed URL
      const pathParts = fullPath.split('/');
      const bucketName = pathParts[1];
      const objectName = pathParts.slice(2).join('/');

      const uploadUrl = await objectStorageService.getSignedUploadUrl(bucketName, objectName);
      const objectPath = `/objects/printable-forms/${formType}/${objectId}`;

      res.json({ uploadUrl, objectPath });
    } catch (error: any) {
      console.error('[Printable Forms Upload] Error generating signed URL:', error);
      res.status(500).json({ message: error.message || 'Failed to generate upload URL' });
    }
  });

  // Create printable form submission record
  app.post('/api/printable-form-submissions', isAuthenticated, async (req, res) => {
    try {
      const { schoolId, formType, objectPath, filename, notes } = req.body;

      // Validate required fields
      if (!schoolId || !formType || !objectPath || !filename) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Validate form type
      if (!['audit', 'action_plan'].includes(formType)) {
        return res.status(400).json({ message: 'Invalid form type' });
      }

      // Check if user is member of school
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const schoolUser = await storage.getSchoolUser(schoolId, req.user.id);
      if (!schoolUser && !req.user.isAdmin) {
        return res.status(403).json({ message: 'You are not a member of this school' });
      }

      // CRITICAL SECURITY: Verify the uploaded object exists and is valid
      console.log('[Printable Forms Submission] Validating uploaded file:', objectPath);
      const metadata = await objectStorageService.getObjectMetadata(objectPath);

      if (!metadata.exists) {
        console.error('[Printable Forms Submission] Object does not exist:', objectPath);
        return res.status(400).json({ message: 'Uploaded file not found. Please upload the file again.' });
      }

      // Validate Content-Type is application/pdf
      if (metadata.contentType !== 'application/pdf') {
        console.error('[Printable Forms Submission] Invalid content type:', metadata.contentType);
        // Delete the invalid upload
        try {
          await objectStorageService.deleteObject(objectPath);
          console.log('[Printable Forms Submission] Deleted invalid file:', objectPath);
        } catch (deleteError) {
          console.error('[Printable Forms Submission] Failed to delete invalid file:', deleteError);
        }
        return res.status(400).json({ 
          message: `Invalid file type. Only PDF files are allowed. Detected type: ${metadata.contentType || 'unknown'}` 
        });
      }

      // Validate file size is ≤10MB
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
      if (!metadata.size) {
        console.error('[Printable Forms Submission] Could not determine file size');
        // Delete the file with unknown size
        try {
          await objectStorageService.deleteObject(objectPath);
        } catch (deleteError) {
          console.error('[Printable Forms Submission] Failed to delete file with unknown size:', deleteError);
        }
        return res.status(400).json({ message: 'Could not determine file size. Please upload again.' });
      }

      if (metadata.size > MAX_FILE_SIZE) {
        console.error('[Printable Forms Submission] File size exceeds limit:', metadata.size);
        // Delete the oversized file
        try {
          await objectStorageService.deleteObject(objectPath);
          console.log('[Printable Forms Submission] Deleted oversized file:', objectPath);
        } catch (deleteError) {
          console.error('[Printable Forms Submission] Failed to delete oversized file:', deleteError);
        }
        return res.status(400).json({ 
          message: `File size exceeds maximum allowed size of 10MB. File size: ${(metadata.size / (1024 * 1024)).toFixed(2)}MB` 
        });
      }

      console.log('[Printable Forms Submission] File validation passed:', {
        objectPath,
        contentType: metadata.contentType,
        size: metadata.size,
      });

      // Set object ACL to private
      const userId = req.user?.id || '';
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(
        objectPath,
        { 
          owner: userId,
          visibility: 'private'
        },
        filename
      );

      // Create submission record
      const submission = await storage.createPrintableFormSubmission({
        schoolId,
        submittedBy: userId,
        formType,
        filePath: normalizedPath,
        originalFilename: filename,
        status: 'pending',
      });

      res.json(submission);
    } catch (error: any) {
      console.error('[Printable Forms Submission] Error creating submission:', error);
      res.status(500).json({ message: error.message || 'Failed to create submission' });
    }
  });

  // Media Library Routes (admin-only)
  
  // GET /api/admin/media-assets - List media assets with filters
  app.get('/api/admin/media-assets', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { mediaType, tags, search, limit, offset } = req.query;
      
      const filters: any = {};
      
      if (mediaType) filters.mediaType = mediaType;
      if (search) filters.search = search;
      if (limit) filters.limit = parseInt(limit as string);
      if (offset) filters.offset = parseInt(offset as string);
      
      // Parse tags array if provided
      if (tags) {
        filters.tags = Array.isArray(tags) ? tags : [tags];
      }
      
      const assets = await storage.listMediaAssets(filters);
      
      // Generate signed download URLs for each asset
      const assetsWithUrls = await Promise.all(
        assets.map(async (asset) => {
          const downloadUrl = await objectStorageService.getSignedDownloadUrl(asset.objectKey, 3600);
          return { ...asset, downloadUrl };
        })
      );
      
      res.json(assetsWithUrls);
    } catch (error: any) {
      console.error('Error listing media assets:', error);
      res.status(500).json({ message: error.message || 'Failed to list media assets' });
    }
  });
  
  // POST /api/admin/media-assets/upload-url - Get signed upload URL
  app.post('/api/admin/media-assets/upload-url', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { filename, mimeType, fileSize, mediaType } = req.body;
      
      // Validate required fields
      if (!filename || !mimeType || !fileSize || !mediaType) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Validate file size (50MB max)
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      if (fileSize > MAX_FILE_SIZE) {
        return res.status(400).json({ 
          message: `File size exceeds maximum of 50MB. Size: ${(fileSize / (1024 * 1024)).toFixed(2)}MB` 
        });
      }
      
      // Validate MIME type matches media type
      const mimeTypeMap: Record<string, string[]> = {
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
        document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']
      };
      
      if (!mimeTypeMap[mediaType]?.includes(mimeType)) {
        return res.status(400).json({ 
          message: `Invalid MIME type '${mimeType}' for media type '${mediaType}'` 
        });
      }
      
      // Generate object key
      const objectKey = `media/${mediaType}/${req.user.id}/${nanoid()}-${filename}`;
      
      // Parse bucket and object name from private dir
      const privateDir = objectStorageService.getPrivateObjectDir();
      const fullPath = `${privateDir}/${objectKey}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      
      // Get signed upload URL
      const uploadUrl = await objectStorageService.getSignedUploadUrl(bucketName, objectName, 900);
      
      res.json({ uploadUrl, objectKey: `/objects/${objectKey}` });
    } catch (error: any) {
      console.error('Error generating upload URL:', error);
      res.status(500).json({ message: error.message || 'Failed to generate upload URL' });
    }
  });
  
  // POST /api/admin/media-assets - Create media asset record
  app.post('/api/admin/media-assets', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { tagIds, ...assetData } = req.body;
      
      // Validate using schema
      const validatedData = insertMediaAssetSchema.parse({
        ...assetData,
        uploadedBy: req.user.id
      });
      
      // Create media asset
      const asset = await storage.createMediaAsset(validatedData);
      
      // Attach tags if provided
      if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        await storage.attachMediaTags(asset.id, tagIds);
      }
      
      res.json(asset);
    } catch (error: any) {
      console.error('Error creating media asset:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid asset data', errors: error.errors });
      }
      res.status(500).json({ message: error.message || 'Failed to create media asset' });
    }
  });
  
  // PATCH /api/admin/media-assets/:id - Update media asset metadata
  app.patch('/api/admin/media-assets/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { altText, description, visibility } = req.body;
      
      // Validate updates
      const updateSchema = z.object({
        altText: z.string().optional(),
        description: z.string().optional(),
        visibility: z.enum(['private', 'public']).optional()
      });
      
      const validatedUpdates = updateSchema.parse({ altText, description, visibility });
      
      const updatedAsset = await storage.updateMediaAssetMetadata(id, validatedUpdates);
      res.json(updatedAsset);
    } catch (error: any) {
      console.error('Error updating media asset:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid update data', errors: error.errors });
      }
      res.status(500).json({ message: error.message || 'Failed to update media asset' });
    }
  });
  
  // DELETE /api/admin/media-assets/:id - Delete media asset
  app.delete('/api/admin/media-assets/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get asset details
      const asset = await storage.getMediaAsset(id);
      if (!asset) {
        return res.status(404).json({ message: 'Media asset not found' });
      }
      
      // Check usage
      const usage = await storage.listMediaAssetUsage(id);
      if (usage.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete asset that is in use',
          usage 
        });
      }
      
      // Delete from object storage
      try {
        await objectStorageService.deleteObject(asset.objectKey);
      } catch (storageError) {
        console.error('Error deleting from object storage:', storageError);
        // Continue with database deletion even if storage delete fails
      }
      
      // Delete from database
      await storage.deleteMediaAsset(id);
      
      res.json({ success: true, message: 'Media asset deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting media asset:', error);
      res.status(500).json({ message: error.message || 'Failed to delete media asset' });
    }
  });
  
  // GET /api/admin/media-assets/:id/usage - Get asset usage
  app.get('/api/admin/media-assets/:id/usage', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const usage = await storage.listMediaAssetUsage(id);
      res.json(usage);
    } catch (error: any) {
      console.error('Error getting asset usage:', error);
      res.status(500).json({ message: error.message || 'Failed to get asset usage' });
    }
  });
  
  // POST /api/admin/media-assets/:id/tags - Attach tags to asset
  app.post('/api/admin/media-assets/:id/tags', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { tagIds } = req.body;
      
      if (!Array.isArray(tagIds)) {
        return res.status(400).json({ message: 'tagIds must be an array' });
      }
      
      await storage.attachMediaTags(id, tagIds);
      res.json({ success: true, message: 'Tags attached successfully' });
    } catch (error: any) {
      console.error('Error attaching tags:', error);
      res.status(500).json({ message: error.message || 'Failed to attach tags' });
    }
  });
  
  // DELETE /api/admin/media-assets/:id/tags - Detach tags from asset
  app.delete('/api/admin/media-assets/:id/tags', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { tagIds } = req.body;
      
      if (!Array.isArray(tagIds)) {
        return res.status(400).json({ message: 'tagIds must be an array' });
      }
      
      await storage.detachMediaTags(id, tagIds);
      res.json({ success: true, message: 'Tags detached successfully' });
    } catch (error: any) {
      console.error('Error detaching tags:', error);
      res.status(500).json({ message: error.message || 'Failed to detach tags' });
    }
  });
  
  // GET /api/admin/media-tags - List all media tags
  app.get('/api/admin/media-tags', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const tags = await storage.listMediaTags();
      res.json(tags);
    } catch (error: any) {
      console.error('Error listing media tags:', error);
      res.status(500).json({ message: error.message || 'Failed to list media tags' });
    }
  });
  
  // POST /api/admin/media-tags - Create new media tag
  app.post('/api/admin/media-tags', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const validatedData = insertMediaTagSchema.parse(req.body);
      const tag = await storage.createMediaTag(validatedData);
      res.json(tag);
    } catch (error: any) {
      console.error('Error creating media tag:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid tag data', errors: error.errors });
      }
      res.status(500).json({ message: error.message || 'Failed to create media tag' });
    }
  });

  // ===== CRON ENDPOINTS =====
  
  // GET /api/cron/event-reminders - Send reminders for events starting in 1 hour
  app.get('/api/cron/event-reminders', async (req, res) => {
    try {
      // Verify cron secret token for security
      const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
      const expectedSecret = process.env.CRON_SECRET;
      
      if (!expectedSecret) {
        console.warn('[Event Reminders Cron] CRON_SECRET not configured - endpoint disabled for security');
        return res.status(503).json({ message: 'Cron service not configured' });
      }
      
      if (cronSecret !== expectedSecret) {
        console.warn('[Event Reminders Cron] Invalid cron secret provided');
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      console.log('[Event Reminders Cron] Starting event reminder check...');
      
      // Calculate time window: events starting between 45 and 75 minutes from now
      const now = new Date();
      const startWindow = new Date(now.getTime() + 45 * 60 * 1000);
      const endWindow = new Date(now.getTime() + 75 * 60 * 1000);
      
      // Get all published events
      const allEvents = await storage.getEvents({ status: 'published' });
      
      // Filter events in the time window that haven't been reminded yet
      const eventsToRemind = allEvents.filter(event => {
        const eventStart = new Date(event.startDateTime);
        const inTimeWindow = eventStart >= startWindow && eventStart <= endWindow;
        const notReminded = !event.reminderSentAt;
        return inTimeWindow && notReminded;
      });
      
      console.log(`[Event Reminders Cron] Found ${eventsToRemind.length} events needing reminders`);
      
      let remindersSent = 0;
      let remindersFailed = 0;
      
      for (const event of eventsToRemind) {
        try {
          // Get all registered users for this event
          const registrations = await storage.getEventRegistrations(event.id, {
            status: 'registered'
          });
          
          console.log(`[Event Reminders Cron] Event "${event.title}" has ${registrations.length} registrations`);
          
          // Send reminder to each registered user
          for (const registration of registrations) {
            if (!registration.user.email) continue;
            
            try {
              await sendEventReminderEmail(
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
                  publicSlug: event.publicSlug || undefined,
                },
                1,
                registration.user.preferredLanguage || 'en'
              );
              remindersSent++;
            } catch (emailError) {
              console.error(`[Event Reminders Cron] Failed to send reminder to ${registration.user.email}:`, emailError);
              remindersFailed++;
            }
          }
          
          // Mark reminder as sent
          await storage.updateEvent(event.id, {
            reminderSentAt: new Date()
          });
          
          console.log(`[Event Reminders Cron] Reminder sent successfully for event "${event.title}"`);
        } catch (eventError) {
          console.error(`[Event Reminders Cron] Error processing event ${event.id}:`, eventError);
          remindersFailed++;
        }
      }
      
      const summary = {
        eventsChecked: allEvents.length,
        eventsToRemind: eventsToRemind.length,
        remindersSent,
        remindersFailed,
        timestamp: new Date().toISOString()
      };
      
      console.log('[Event Reminders Cron] Summary:', summary);
      res.json(summary);
    } catch (error) {
      console.error('[Event Reminders Cron] Error:', error);
      res.status(500).json({ message: 'Failed to process event reminders' });
    }
  });

  // Import Data Routes (Admin only)
  // (using importUpload from utils/uploads.ts)

  // Parse and validate import file
  app.post('/api/admin/import/validate', isAuthenticated, requireAdmin, importUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { type } = req.body; // 'schools', 'users', or 'relationships'
      
      if (!['schools', 'users', 'relationships'].includes(type)) {
        return res.status(400).json({ message: 'Invalid import type' });
      }

      // Parse the file
      const parsed = parseImportFile(req.file.buffer, req.file.originalname);
      
      // Create dry-run context
      const dryRunContext = {
        importBatchId: nanoid(),
        importedBy: req.user.id,
        dryRun: true,
      };

      // Run validation by executing import in dry-run mode
      let validationResult;
      if (type === 'schools') {
        validationResult = await importSchools(parsed.data, dryRunContext);
      } else if (type === 'users') {
        validationResult = await importUsers(parsed.data, dryRunContext);
      } else if (type === 'relationships') {
        // For relationships, we can't validate foreign keys without context
        // So we only validate the structure
        validationResult = await importRelationships(parsed.data, dryRunContext);
      }

      if (!validationResult) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid import type' 
        });
      }

      // Sanitize for preview
      const preview = sanitizeForPreview(parsed.data.slice(0, 10)); // First 10 rows for preview
      
      res.json({
        success: validationResult.success,
        headers: parsed.headers,
        rowCount: parsed.rowCount,
        preview,
        validation: {
          recordsProcessed: validationResult.recordsProcessed,
          errors: validationResult.errors,
          errorCount: validationResult.recordsFailed,
        },
      });
    } catch (error) {
      console.error('[Import Validate] Error:', error);
      res.status(400).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Failed to parse file' 
      });
    }
  });

  // Execute import
  app.post('/api/admin/import/execute', isAuthenticated, requireAdmin, importUpload.fields([
    { name: 'schoolsFile', maxCount: 1 },
    { name: 'usersFile', maxCount: 1 },
    { name: 'relationshipsFile', maxCount: 1 }
  ]), async (req: any, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Create import batch record
      const batchId = nanoid();
      await db.insert(importBatches).values({
        id: batchId,
        importedBy: req.user.id,
        status: 'processing',
        totalRecords: 0,
      });

      const context = {
        importBatchId: batchId,
        importedBy: req.user.id,
      };

      let schoolsResult;
      let usersResult;
      let relationshipsResult;
      const allErrors: any[] = [];

      // Import schools first
      if (files.schoolsFile && files.schoolsFile[0]) {
        const parsed = parseImportFile(files.schoolsFile[0].buffer, files.schoolsFile[0].originalname);
        schoolsResult = await importSchools(parsed.data, context);
        allErrors.push(...schoolsResult.errors);
      }

      // Import users second
      if (files.usersFile && files.usersFile[0]) {
        const parsed = parseImportFile(files.usersFile[0].buffer, files.usersFile[0].originalname);
        usersResult = await importUsers(parsed.data, context);
        allErrors.push(...usersResult.errors);
      }

      // Import relationships last (requires schools and users to exist)
      if (files.relationshipsFile && files.relationshipsFile[0]) {
        const parsed = parseImportFile(files.relationshipsFile[0].buffer, files.relationshipsFile[0].originalname);
        relationshipsResult = await importRelationships(
          parsed.data,
          context,
          schoolsResult?.schoolMap,
          usersResult?.userMap
        );
        allErrors.push(...relationshipsResult.errors);
      }

      // Update import batch with results
      await updateImportBatch(batchId, {
        schoolsImported: schoolsResult?.recordsSucceeded || 0,
        usersImported: usersResult?.recordsSucceeded || 0,
        relationshipsImported: relationshipsResult?.recordsSucceeded || 0,
        errors: allErrors,
      });

      // Send welcome emails to new users
      if (usersResult?.temporaryPasswords && usersResult.temporaryPasswords.size > 0) {
        for (const [email, password] of Array.from(usersResult.temporaryPasswords.entries())) {
          try {
            // TODO: Send email with temporary password
            console.log(`[Import] New user created: ${email} with temp password (email notification pending)`);
          } catch (emailError) {
            console.error(`[Import] Failed to send welcome email to ${email}:`, emailError);
          }
        }
      }

      res.json({
        success: allErrors.length === 0,
        batchId,
        results: {
          schools: {
            processed: schoolsResult?.recordsProcessed || 0,
            succeeded: schoolsResult?.recordsSucceeded || 0,
            failed: schoolsResult?.recordsFailed || 0,
          },
          users: {
            processed: usersResult?.recordsProcessed || 0,
            succeeded: usersResult?.recordsSucceeded || 0,
            failed: usersResult?.recordsFailed || 0,
            newUsers: usersResult?.temporaryPasswords?.size || 0,
          },
          relationships: {
            processed: relationshipsResult?.recordsProcessed || 0,
            succeeded: relationshipsResult?.recordsSucceeded || 0,
            failed: relationshipsResult?.recordsFailed || 0,
          },
        },
        errors: allErrors,
      });
    } catch (error) {
      console.error('[Import Execute] Error:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Import failed' 
      });
    }
  });

  // Get import history
  app.get('/api/admin/import/history', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const history = await db
        .select()
        .from(importBatches)
        .orderBy(sql`${importBatches.createdAt} DESC`)
        .limit(50);
      
      res.json(history);
    } catch (error) {
      console.error('[Import History] Error:', error);
      res.status(500).json({ message: 'Failed to fetch import history' });
    }
  });

  // Download CSV templates
  app.get('/api/admin/import/template/:type', isAuthenticated, requireAdmin, (req, res) => {
    const { type } = req.params;
    
    let csvContent: string;
    let filename: string;
    
    switch (type) {
      case 'schools':
        csvContent = generateSchoolTemplate();
        filename = 'schools_template.csv';
        break;
      case 'users':
        csvContent = generateUserTemplate();
        filename = 'users_template.csv';
        break;
      case 'relationships':
        csvContent = generateRelationshipTemplate();
        filename = 'relationships_template.csv';
        break;
      default:
        return res.status(400).json({ message: 'Invalid template type' });
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  });

  // Evidence Approval Import Routes
  // These routes handle CSV import of evidence completions from legacy system
  
  // In-memory storage for import progress tracking
  const evidenceImportProgress = new Map<string, any>();

  // Validate evidence CSV
  app.post('/api/admin/import/evidence/validate', isAuthenticated, requireAdmin, importUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { parseEvidenceCSV, validateEvidenceImport } = await import('./lib/evidenceImportUtils');
      
      // Parse CSV
      const rows = await parseEvidenceCSV(req.file.buffer, req.file.originalname);
      
      // Validate all rows (preview will still show first 10)
      const validation = await validateEvidenceImport(rows);
      
      res.json(validation);
    } catch (error) {
      console.error('[Evidence Import Validate] Error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Validation failed' 
      });
    }
  });

  // Process evidence import (with test mode for single school)
  app.post('/api/admin/import/evidence/process', isAuthenticated, requireAdmin, importUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const testMode = req.body.testMode === 'true';
      const testSchoolIndex = req.body.testSchoolIndex ? parseInt(req.body.testSchoolIndex) : 0;
      const { parseEvidenceCSV, processEvidenceImport } = await import('./lib/evidenceImportUtils');
      
      // Parse CSV
      const rows = await parseEvidenceCSV(req.file.buffer, req.file.originalname);
      
      if (rows.length === 0) {
        return res.status(400).json({ message: 'No valid rows found in CSV' });
      }

      // Validate test school index
      if (testMode && (testSchoolIndex < 0 || testSchoolIndex >= rows.length)) {
        return res.status(400).json({ message: 'Invalid school index' });
      }

      // Create batch ID for tracking
      const batchId = nanoid();
      
      // Initialize progress
      evidenceImportProgress.set(batchId, {
        status: 'processing',
        processedSchools: 0,
        totalSchools: testMode ? 1 : rows.length,
        successCount: 0,
        errorCount: 0,
        errors: [],
        startTime: Date.now(),
      });

      // Start processing in background
      processEvidenceImport(
        rows,
        (progress) => {
          evidenceImportProgress.set(batchId, progress);
        },
        testMode,
        testSchoolIndex
      ).catch(error => {
        console.error('[Evidence Import Process] Error:', error);
        const currentProgress = evidenceImportProgress.get(batchId) || {};
        evidenceImportProgress.set(batchId, {
          ...currentProgress,
          status: 'error',
          errors: [...(currentProgress.errors || []), error.message],
        });
      });

      // Return batch ID for polling
      res.json({ batchId, testMode });
    } catch (error) {
      console.error('[Evidence Import Process] Error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Import failed' 
      });
    }
  });

  // Get progress of evidence import
  app.get('/api/admin/import/evidence/progress/:batchId', isAuthenticated, requireAdmin, async (req, res) => {
    const { batchId } = req.params;
    const progress = evidenceImportProgress.get(batchId);
    
    if (!progress) {
      return res.status(404).json({ message: 'Import batch not found' });
    }
    
    // Clean up completed imports after 5 minutes
    if (progress.status === 'completed' || progress.status === 'error') {
      const age = Date.now() - (progress.endTime || progress.startTime);
      if (age > 5 * 60 * 1000) {
        evidenceImportProgress.delete(batchId);
      }
    }
    
    res.json(progress);
  });

  // Simple School & User Import Routes
  // These routes handle CSV import of schools and users (simpler than full data migration)
  
  // Validate school/user CSV
  app.post('/api/admin/school-user-import/validate', isAuthenticated, requireAdmin, importUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { parseSchoolUserCSV, validateSchoolUserImport } = await import('./lib/schoolUserImportUtils');
      
      // Parse CSV
      const csvContent = req.file.buffer.toString('utf-8');
      const rows = parseSchoolUserCSV(csvContent);
      
      // Validate all rows
      const validation = await validateSchoolUserImport(rows);
      
      res.json(validation);
    } catch (error) {
      console.error('[School/User Import Validate] Error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Validation failed' 
      });
    }
  });

  // Process school/user import
  app.post('/api/admin/school-user-import/process', isAuthenticated, requireAdmin, importUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { parseSchoolUserCSV, processSchoolUserImport } = await import('./lib/schoolUserImportUtils');
      
      // Parse CSV
      const csvContent = req.file.buffer.toString('utf-8');
      const rows = parseSchoolUserCSV(csvContent);
      
      if (rows.length === 0) {
        return res.status(400).json({ message: 'No valid rows found in CSV' });
      }

      // Process import
      const result = await processSchoolUserImport(rows);
      
      res.json(result);
    } catch (error) {
      console.error('[School/User Import Process] Error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Import failed' 
      });
    }
  });

  // Server-side meta tag injection for case study pages
  // This route MUST be before Vite/SPA catch-all to intercept case study requests
  // ONLY enabled in production - in development, Vite needs to transform the HTML
  app.get('/case-study/:id', async (req: any, res, next) => {
    // In development, skip meta tag injection and let Vite handle the request
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    
    try {
      const { id } = req.params;
      
      // Check if user is authenticated and is admin
      const isAdmin = req.isAuthenticated && req.isAuthenticated() && req.user?.isAdmin;
      
      // Fetch case study data directly with only the fields needed for meta tags
      // Draft Protection: Admins can view all case studies, public users only see published
      const whereConditions = [eq(caseStudies.id, id)];
      if (!isAdmin) {
        whereConditions.push(eq(caseStudies.status, 'published'));
      }
      
      const result = await db
        .select({
          id: caseStudies.id,
          title: caseStudies.title,
          description: caseStudies.description,
          imageUrl: caseStudies.imageUrl,
          images: caseStudies.images,
          status: caseStudies.status,
          createdAt: caseStudies.createdAt,
          updatedAt: caseStudies.updatedAt,
        })
        .from(caseStudies)
        .where(and(...whereConditions))
        .limit(1);
      
      const caseStudy = result[0];
      
      // If case study not found, let SPA handle 404
      if (!caseStudy) {
        console.log(`[Meta Tags] Case study ${id} not found${!isAdmin ? ' or is draft' : ''}, falling back to SPA`);
        return next();
      }
      
      console.log(`[Meta Tags] Injecting meta tags for case study: ${caseStudy.title}`);
      
      // Determine HTML template path based on environment
      let indexPath: string;
      if (process.env.NODE_ENV === 'production') {
        // In production, read from dist/public directory
        indexPath = path.join(import.meta.dirname, 'public', 'index.html');
      } else {
        // In development, read from client directory
        indexPath = path.join(import.meta.dirname, '..', 'client', 'index.html');
      }
      
      // Read HTML template
      let html: string;
      try {
        html = await fs.readFile(indexPath, 'utf-8');
      } catch (readError) {
        console.error('[Meta Tags] Failed to read index.html:', readError);
        return next();
      }
      
      // Extract and prepare meta tag content
      const description = stripHtml(caseStudy.description).substring(0, 150);
      
      // Get image URL from images array or fallback to imageUrl
      let imageUrl = '';
      if (caseStudy.images && Array.isArray(caseStudy.images) && caseStudy.images.length > 0) {
        const firstImage = caseStudy.images[0] as any;
        imageUrl = firstImage?.url || '';
      }
      if (!imageUrl && caseStudy.imageUrl) {
        imageUrl = caseStudy.imageUrl;
      }
      
      // Build full URL for og:url
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const host = req.get('host');
      const fullUrl = `${protocol}://${host}${req.originalUrl}`;
      
      // Build JSON-LD structured data for rich snippets
      const structuredData = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": caseStudy.title,
        "description": description,
        "image": imageUrl,
        "author": {
          "@type": "Organization",
          "name": "Plastic Clever Schools"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Plastic Clever Schools",
          "logo": {
            "@type": "ImageObject",
            "url": `${protocol}://${host}/logo.png`
          }
        },
        "datePublished": caseStudy.createdAt ? new Date(caseStudy.createdAt).toISOString() : new Date().toISOString(),
        "dateModified": caseStudy.updatedAt 
          ? new Date(caseStudy.updatedAt).toISOString() 
          : (caseStudy.createdAt ? new Date(caseStudy.createdAt).toISOString() : new Date().toISOString())
      };
      
      // Build structured data script tag (JSON doesn't need HTML escaping within script tag)
      const structuredDataScript = `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`;
      
      // Build meta tags with escaped content
      const metaTags = `
    <!-- Case Study Meta Tags (Server-Side Injected) -->
    <meta property="og:title" content="${escapeHtml(caseStudy.title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:url" content="${escapeHtml(fullUrl)}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Plastic Clever Schools" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(caseStudy.title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${escapeHtml(fullUrl)}" />
    <title>${escapeHtml(caseStudy.title)} | Plastic Clever Schools</title>
    ${structuredDataScript}`;
      
      // Inject meta tags before </head>
      html = html.replace('</head>', `${metaTags}\n  </head>`);
      
      // Send the modified HTML
      res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
      
      console.log(`[Meta Tags] Successfully injected meta tags for case study: ${caseStudy.title}`);
    } catch (error) {
      console.error('[Meta Tags] Error injecting meta tags:', error);
      // Fallback to normal SPA serving on error
      next();
    }
  });

  // ==========================================
  // COLLABORATION FEATURES
  // ==========================================

  // Presence Tracking - Get all online users
  app.get('/api/collaboration/presence', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const onlineUsers = getOnlineUsers();
      res.json({ users: onlineUsers });
    } catch (error) {
      console.error('Error fetching online users:', error);
      res.status(500).json({ message: 'Failed to fetch online users' });
    }
  });

  // Document Locking - Request to lock a document
  app.post('/api/collaboration/locks', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const lockSchema = z.object({
        documentType: z.enum(['case_study', 'event']),
        documentId: z.string().min(1),
      });

      const { documentType, documentId } = lockSchema.parse(req.body);

      // Check if document is already locked
      const existingLock = await storage.getDocumentLock(documentType, documentId);
      
      if (existingLock) {
        // Check if lock has expired
        if (new Date() > new Date(existingLock.expiresAt)) {
          // Lock expired, delete it
          await storage.deleteDocumentLock(documentType, documentId);
        } else if (existingLock.userId !== user.id) {
          // Document is locked by someone else
          const lockUser = await storage.getUser(existingLock.userId);
          return res.status(409).json({
            locked: true,
            lockedBy: {
              userId: existingLock.userId,
              name: lockUser ? `${lockUser.firstName || ''} ${lockUser.lastName || ''}`.trim() : 'Unknown',
              email: lockUser?.email,
            },
            lockedAt: existingLock.acquiredAt,
            expiresAt: existingLock.expiresAt,
          });
        } else {
          // User already has the lock, extend it
          await storage.deleteDocumentLock(documentType, documentId);
        }
      }

      // Create new lock (expires in 5 minutes)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      
      try {
        const lock = await storage.createDocumentLock({
          documentType,
          documentId,
          userId: user.id,
          expiresAt,
        });

        // Notify other users via WebSocket
        notifyDocumentLock({
          documentId,
          documentType,
          userId: user.id,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown',
          action: 'acquired',
        });

        res.status(201).json({
          success: true,
          lock: {
            documentId: lock.documentId,
            documentType: lock.documentType,
            lockedBy: {
              userId: user.id,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
              email: user.email,
            },
            lockedAt: lock.acquiredAt,
            expiresAt: lock.expiresAt,
          },
        });
      } catch (lockError: any) {
        // Handle unique constraint violation - race condition detected
        if (lockError.code === '23505' || lockError.constraint === 'idx_document_locks_unique' || lockError.message?.includes('unique constraint')) {
          // Another user acquired the lock between our check and insert
          // Fetch the existing lock and return 409
          const raceLock = await storage.getDocumentLock(documentType, documentId);
          if (raceLock) {
            const lockUser = await storage.getUser(raceLock.userId);
            return res.status(409).json({
              locked: true,
              lockedBy: {
                userId: raceLock.userId,
                name: lockUser ? `${lockUser.firstName || ''} ${lockUser.lastName || ''}`.trim() : 'Unknown',
                email: lockUser?.email,
              },
              lockedAt: raceLock.acquiredAt,
              expiresAt: raceLock.expiresAt,
            });
          }
        }
        // Re-throw if it's not a unique constraint error
        throw lockError;
      }
    } catch (error: any) {
      console.error('Error creating document lock:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create document lock' });
    }
  });

  // Document Locking - Release a lock
  app.delete('/api/collaboration/locks/:documentType/:documentId', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { documentType, documentId } = req.params;

      if (!['case_study', 'event'].includes(documentType)) {
        return res.status(400).json({ message: 'Invalid document type' });
      }

      // Check if lock exists
      const existingLock = await storage.getDocumentLock(documentType, documentId);
      
      if (!existingLock) {
        return res.status(404).json({ message: 'Lock not found' });
      }

      // Check if user owns the lock (admins can release any lock)
      if (existingLock.userId !== user.id && !user.isAdmin) {
        return res.status(403).json({ message: 'You do not own this lock' });
      }

      // Delete the lock
      await storage.deleteDocumentLock(documentType, documentId);

      // Notify other users via WebSocket
      notifyDocumentLock({
        documentId,
        documentType,
        action: 'released',
      });

      res.json({ success: true, message: 'Lock released successfully' });
    } catch (error) {
      console.error('Error releasing document lock:', error);
      res.status(500).json({ message: 'Failed to release document lock' });
    }
  });

  // Document Locking - Check if document is locked
  app.get('/api/collaboration/locks/:documentType/:documentId', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const { documentType, documentId } = req.params;

      if (!['case_study', 'event'].includes(documentType)) {
        return res.status(400).json({ message: 'Invalid document type' });
      }

      const lock = await storage.getDocumentLock(documentType, documentId);
      
      if (!lock) {
        return res.json({ locked: false });
      }

      // Check if lock has expired
      if (new Date() > new Date(lock.expiresAt)) {
        // Lock expired, delete it
        await storage.deleteDocumentLock(documentType, documentId);
        return res.json({ locked: false });
      }

      // Get lock owner details
      const lockUser = await storage.getUser(lock.userId);
      
      res.json({
        locked: true,
        lockedBy: {
          userId: lock.userId,
          name: lockUser ? `${lockUser.firstName || ''} ${lockUser.lastName || ''}`.trim() : 'Unknown',
          email: lockUser?.email,
        },
        lockedAt: lock.acquiredAt,
        expiresAt: lock.expiresAt,
      });
    } catch (error) {
      console.error('Error checking document lock:', error);
      res.status(500).json({ message: 'Failed to check document lock' });
    }
  });

  // Document Locking - Get all active locks
  app.get('/api/collaboration/locks', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const locks = await storage.getActiveDocumentLocks();
      
      const formattedLocks = locks.map(lock => ({
        documentId: lock.documentId,
        documentType: lock.documentType,
        lockedBy: {
          userId: lock.userId,
          name: lock.user ? `${lock.user.firstName || ''} ${lock.user.lastName || ''}`.trim() : 'Unknown',
          email: lock.user?.email,
        },
        lockedAt: lock.acquiredAt,
        expiresAt: lock.expiresAt,
      }));

      res.json({ locks: formattedLocks });
    } catch (error) {
      console.error('Error fetching active locks:', error);
      res.status(500).json({ message: 'Failed to fetch active locks' });
    }
  });

  // Document Locking - Force unlock (admin only)
  app.post('/api/collaboration/locks/force-unlock', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const { documentId, documentType, reason } = req.body;

      // Validate inputs
      if (!documentId || !documentType) {
        return res.status(400).json({ error: 'Missing documentId or documentType' });
      }

      // Delete the lock from database
      await storage.forceUnlockDocument(documentId, documentType);

      // Broadcast unlock via WebSocket
      broadcastDocumentUnlock(documentId, documentType, reason);

      // Log audit action
      await logAuditAction(
        user.id,
        'force_unlocked',
        documentType,
        documentId,
        { reason }
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error force unlocking document:', error);
      res.status(500).json({ message: 'Failed to force unlock document' });
    }
  });

  // Chat - Get recent chat messages
  app.get('/api/collaboration/chat/messages', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const { limit = '100', offset = '0' } = req.query;
      
      const messages = await storage.getChatMessages(
        parseInt(limit as string),
        parseInt(offset as string)
      );

      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        userId: msg.userId,
        userName: msg.user ? `${msg.user.firstName || ''} ${msg.user.lastName || ''}`.trim() || msg.user.email : 'Unknown',
        userEmail: msg.user?.email,
        message: msg.message,
        createdAt: msg.createdAt,
      }));

      res.json({ messages: formattedMessages });
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({ message: 'Failed to fetch chat messages' });
    }
  });

  // Chat - Send chat message
  app.post('/api/collaboration/chat/messages', isAuthenticated, requireAdminOrPartner, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const messageSchema = z.object({
        message: z.string().min(1).max(1000),
      });

      const { message } = messageSchema.parse(req.body);

      // Store message in database
      const chatMessage = await storage.createChatMessage({
        userId: user.id,
        message,
      });

      // Broadcast to all connected users via WebSocket
      broadcastChatMessage({
        id: chatMessage.id,
        userId: chatMessage.userId,
        message: chatMessage.message,
        createdAt: chatMessage.createdAt,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      });

      res.status(201).json({
        success: true,
        message: {
          id: chatMessage.id,
          userId: chatMessage.userId,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown',
          message: chatMessage.message,
          createdAt: chatMessage.createdAt,
        },
      });
    } catch (error: any) {
      console.error('Error sending chat message:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to send chat message' });
    }
  });

  // Health Monitoring Routes (Admin only)
  app.get('/api/admin/health/status', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const latestStatus = await storage.getLatestHealthStatus();
      res.json(latestStatus);
    } catch (error) {
      console.error('Error fetching health status:', error);
      res.status(500).json({ message: 'Failed to fetch health status' });
    }
  });

  app.get('/api/admin/health/incidents', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
      const incidents = await storage.getHealthIncidents(hours);
      res.json(incidents);
    } catch (error) {
      console.error('Error fetching health incidents:', error);
      res.status(500).json({ message: 'Failed to fetch health incidents' });
    }
  });

  app.get('/api/admin/health/stats', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const stats = await storage.getUptimeStats(days);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching uptime stats:', error);
      res.status(500).json({ message: 'Failed to fetch uptime stats' });
    }
  });

  app.get('/api/admin/health/metrics', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const filters: any = {};
      
      if (req.query.endpoint) {
        filters.endpoint = req.query.endpoint as string;
      }
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      const metrics = await storage.getUptimeMetrics(filters);
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching uptime metrics:', error);
      res.status(500).json({ message: 'Failed to fetch uptime metrics' });
    }
  });

  // Clear API cache (admin only)
  app.post('/api/admin/cache/clear', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { cacheKey } = req.body;
      
      if (cacheKey) {
        // Clear specific cache key
        apiCache.clear(cacheKey);
        console.log(`[Cache] Cleared specific cache key: ${cacheKey}`);
        res.json({ message: `Cache key "${cacheKey}" cleared successfully` });
      } else {
        // Clear all cache
        apiCache.clearAll();
        console.log('[Cache] Cleared all API cache');
        res.json({ message: 'All cache cleared successfully' });
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({ message: 'Failed to clear cache' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to parse object path
function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}
