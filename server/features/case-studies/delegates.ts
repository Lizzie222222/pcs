import { ObjectStorageService } from '../../objectStorage';
import type { Request, Response } from 'express';
import { generatePDFReport } from '../../lib/pdfGenerator';

/**
 * Case Study Delegates
 * 
 * Handles cross-cutting concerns for case studies:
 * - Media uploads (GCS integration)
 * - PDF generation (delegates to pdfGenerator service)
 * - Email notifications
 */

/**
 * Media Upload Delegate
 * 
 * Handles Google Cloud Storage operations for case study media
 */
export class MediaDelegate {
  private objectStorage: ObjectStorageService;

  constructor() {
    this.objectStorage = new ObjectStorageService();
  }

  /**
   * Get upload URL for case study media
   * Used for client-side file uploads to GCS
   */
  async getUploadURL(): Promise<string> {
    try {
      const uploadURL = await this.objectStorage.getObjectEntityUploadURL();
      return uploadURL;
    } catch (error) {
      console.error('[MediaDelegate] Error getting upload URL:', error);
      throw new Error('Failed to get upload URL');
    }
  }

  /**
   * Set ACL policy for uploaded case study files
   * Controls file visibility (public/private)
   * 
   * @param fileURL - GCS file URL
   * @param userId - Owner user ID
   * @param visibility - File visibility level
   * @param filename - Optional filename
   */
  async setFileACL(
    fileURL: string,
    userId: string,
    visibility: 'public' | 'private' | 'registered' = 'public',
    filename?: string
  ): Promise<string> {
    try {
      const objectPath = await this.objectStorage.trySetObjectEntityAclPolicy(
        fileURL,
        {
          owner: userId,
          visibility: visibility,
        },
        filename
      );
      return objectPath;
    } catch (error) {
      console.error('[MediaDelegate] Error setting file ACL:', error);
      throw new Error('Failed to set file permissions');
    }
  }
}

/**
 * PDF Generation Delegate
 * 
 * Handles PDF generation for case studies
 * Delegates to shared pdfGenerator service for consistency
 */
export class PDFDelegate {
  /**
   * Generate PDF from case study HTML
   * 
   * Uses the shared generatePDFReport service for consistent PDF generation
   * across the application (resources and case studies)
   * 
   * @param htmlContent - HTML string to convert to PDF
   * @returns PDF buffer
   */
  async generateCaseStudyPDF(htmlContent: string): Promise<Buffer> {
    try {
      console.log('[PDFDelegate] Generating case study PDF using shared service...');
      const pdfBuffer = await generatePDFReport(htmlContent);
      console.log('[PDFDelegate] Case study PDF generated successfully');
      return pdfBuffer;
    } catch (error) {
      console.error('[PDFDelegate] Error generating case study PDF:', error);
      throw new Error(`Failed to generate case study PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Email Notification Delegate
 * 
 * Handles email notifications for case study events
 */
export class EmailDelegate {
  /**
   * Send notification when case study is published
   * 
   * @param caseStudyId - Case study ID
   * @param schoolId - School ID
   */
  async notifyCaseStudyPublished(caseStudyId: string, schoolId: string): Promise<void> {
    // Email notification logic will be added if needed
    // Current implementation doesn't seem to send emails for case study approval
    console.log(`[EmailDelegate] Case study ${caseStudyId} published for school ${schoolId}`);
  }

  /**
   * Send notification when case study is featured
   * 
   * @param caseStudyId - Case study ID
   * @param schoolId - School ID
   */
  async notifyCaseStudyFeatured(caseStudyId: string, schoolId: string): Promise<void> {
    // Email notification logic will be added if needed
    console.log(`[EmailDelegate] Case study ${caseStudyId} featured for school ${schoolId}`);
  }
}

// Singleton instances
let mediaDelegate: MediaDelegate | null = null;
let pdfDelegate: PDFDelegate | null = null;
let emailDelegate: EmailDelegate | null = null;

export function getMediaDelegate(): MediaDelegate {
  if (!mediaDelegate) {
    mediaDelegate = new MediaDelegate();
  }
  return mediaDelegate;
}

export function getPDFDelegate(): PDFDelegate {
  if (!pdfDelegate) {
    pdfDelegate = new PDFDelegate();
  }
  return pdfDelegate;
}

export function getEmailDelegate(): EmailDelegate {
  if (!emailDelegate) {
    emailDelegate = new EmailDelegate();
  }
  return emailDelegate;
}
