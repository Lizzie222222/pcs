/**
 * Evidence Module Delegates
 * 
 * This file defines delegation interfaces that allow Evidence module to:
 * 1. Persist data via IStorage (database operations)
 * 2. Trigger school progression via SchoolProgressionDelegate
 * 3. Send emails via EvidenceEmailDelegate
 * 4. Manage files via EvidenceFileDelegate
 * 
 * This delegation pattern prevents tight coupling and enables:
 * - Testing with mock delegates
 * - Swapping implementations without changing Evidence logic
 * - Clear separation of concerns
 */

import type { IStorage } from '../../storage';
import type { SchoolProgressionDelegate } from '../schools/progression';
import { 
  sendEvidenceApprovalEmail as emailServiceApproval, 
  sendEvidenceRejectionEmail as emailServiceRejection, 
  sendEvidenceSubmissionEmail as emailServiceSubmission 
} from '../../emailService';
import { uploadToObjectStorage } from '../../routes/utils/objectStorage';
import { compressImage as compressImageService } from '../../imageCompression';
import { ObjectStorageService } from '../../objectStorage';

/**
 * Email Delegate for Evidence-related notifications
 * 
 * Handles all evidence email workflows:
 * - Approval notifications to teachers
 * - Rejection notifications with feedback
 * - Submission confirmations
 */
export interface EvidenceEmailDelegate {
  /**
   * Send approval notification to teacher
   * Includes evidence details and encouragement
   */
  sendEvidenceApprovalEmail(evidenceId: string, recipientEmail: string): Promise<void>;
  
  /**
   * Send rejection notification with admin feedback
   * Includes review notes and guidance for resubmission
   */
  sendEvidenceRejectionEmail(evidenceId: string, recipientEmail: string, notes?: string): Promise<void>;
  
  /**
   * Send submission confirmation to teacher
   * Acknowledges receipt and sets expectations for review
   */
  sendEvidenceSubmissionConfirmation(evidenceId: string, recipientEmail: string): Promise<void>;
}

/**
 * File/Storage Delegate for Evidence files
 * 
 * Handles all evidence file operations:
 * - Upload to object storage with ACL policies
 * - File deletion on evidence removal
 * - Image compression before upload
 */
export interface EvidenceFileDelegate {
  /**
   * Upload file to object storage
   * @param file - Multer file object from request
   * @param path - Storage path (e.g., 'evidence/inspire/...')
   * @param isPublic - Whether file should be publicly accessible (respects photo consent)
   * @returns Public URL to uploaded file
   */
  uploadFile(file: Express.Multer.File, path: string, isPublic: boolean): Promise<string>;
  
  /**
   * Delete file from object storage
   * Called when evidence is deleted or file is replaced
   * @param url - Full URL to file to delete
   */
  deleteFile(url: string): Promise<void>;
  
  /**
   * Compress image before upload
   * Reduces file size while maintaining quality
   * @param buffer - Original image buffer
   * @returns Compressed image buffer
   */
  compressImage(buffer: Buffer): Promise<Buffer>;
}

/**
 * Main Evidence Delegates Container
 * 
 * Aggregates all dependencies that Evidence module needs.
 * This is the single dependency injected into EvidenceStorage.
 */
export interface EvidenceDelegates {
  /**
   * Database persistence operations
   * Picks only the methods Evidence needs from IStorage
   * This creates a clear contract and prevents overreach
   */
  persistence: Pick<IStorage, 
    // Evidence CRUD
    'createEvidence' | 
    'updateEvidence' | 
    'getEvidence' | 
    'getEvidenceById' | 
    'getAllEvidence' | 
    'deleteEvidence' |
    
    // Evidence Requirements
    'getEvidenceRequirements' |
    'getEvidenceRequirement' |
    'createEvidenceRequirement' |
    'updateEvidenceRequirement' |
    'deleteEvidenceRequirement' |
    
    // School context (needed for evidence operations)
    'getSchool' | 
    'getSchoolUser' | 
    'getUserSchools'
  >;
  
  /**
   * School progression delegate
   * Triggers progression checks when evidence is approved
   */
  progression: SchoolProgressionDelegate;
  
  /**
   * Email notification service
   * Sends evidence-related emails
   */
  email: EvidenceEmailDelegate;
  
  /**
   * File/storage service
   * Manages evidence file uploads and deletions
   */
  files: EvidenceFileDelegate;
}

/**
 * Factory to create Evidence delegates with default wiring
 * 
 * This factory creates a fully-wired EvidenceDelegates instance
 * with production implementations. In tests, you can create
 * custom delegates with mock implementations.
 * 
 * @param storage - Main IStorage instance for persistence
 * @param schoolProgressionDelegate - Progression delegate from Schools module
 * @returns Fully-wired EvidenceDelegates instance
 */
export function createEvidenceDelegates(
  storage: IStorage, 
  schoolProgressionDelegate: SchoolProgressionDelegate
): EvidenceDelegates {
  return {
    // Persistence: Direct pass-through to IStorage
    // Type system ensures we only pick the methods Evidence needs
    persistence: storage,
    
    // Progression: Delegate from Schools module
    progression: schoolProgressionDelegate,
    
    // Email: Wire to actual email service
    email: {
      async sendEvidenceApprovalEmail(evidenceId: string, recipientEmail: string): Promise<void> {
        // Get evidence and school details for email
        const evidence = await storage.getEvidence(evidenceId);
        if (!evidence) return;
        
        const school = await storage.getSchool(evidence.schoolId);
        const user = await storage.getUser(evidence.submittedBy!);
        
        await emailServiceApproval(
          recipientEmail,
          school?.name || 'Your School',
          evidence.title,
          undefined, // reviewerName
          user?.preferredLanguage || 'en'
        );
      },
      
      async sendEvidenceRejectionEmail(evidenceId: string, recipientEmail: string, notes?: string): Promise<void> {
        // Get evidence and school details for email
        const evidence = await storage.getEvidence(evidenceId);
        if (!evidence) return;
        
        const school = await storage.getSchool(evidence.schoolId);
        const user = await storage.getUser(evidence.submittedBy!);
        
        await emailServiceRejection(
          recipientEmail,
          school?.name || 'Your School',
          evidence.title,
          notes || 'Please review and resubmit',
          undefined, // reviewerName
          user?.preferredLanguage || 'en'
        );
      },
      
      async sendEvidenceSubmissionConfirmation(evidenceId: string, recipientEmail: string): Promise<void> {
        // Get evidence and school details for email
        const evidence = await storage.getEvidence(evidenceId);
        if (!evidence) return;
        
        const school = await storage.getSchool(evidence.schoolId);
        const user = await storage.getUser(evidence.submittedBy!);
        
        await emailServiceSubmission(
          recipientEmail,
          school?.name || 'Your School',
          evidence.title,
          evidence.stage,
          user?.preferredLanguage || 'en'
        );
      }
    },
    
    // Files: Wire to actual object storage and image compression
    files: {
      async uploadFile(file: Express.Multer.File, path: string, isPublic: boolean): Promise<string> {
        // Use uploadToObjectStorage utility
        const visibility = isPublic ? 'public' : 'private';
        const url = await uploadToObjectStorage(
          file.buffer,
          file.mimetype,
          file.originalname,
          'system', // Using system as owner for evidence files
          visibility
        );
        return url;
      },
      
      async deleteFile(url: string): Promise<void> {
        // Delete file from object storage
        try {
          const objectStorageService = new ObjectStorageService();
          const objectPath = objectStorageService.normalizeObjectEntityPath(url);
          const file = await objectStorageService.getObjectEntityFile(objectPath);
          await file.delete();
        } catch (error) {
          console.warn(`Failed to delete file ${url}:`, error);
          // Don't throw - file deletion is best-effort
        }
      },
      
      async compressImage(buffer: Buffer): Promise<Buffer> {
        // Compress image using imageCompression service
        return await compressImageService(buffer);
      }
    }
  };
}
