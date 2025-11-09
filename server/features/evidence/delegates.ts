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
    
    // Email: Wire to actual email service in later phases
    email: {
      async sendEvidenceApprovalEmail(evidenceId: string, recipientEmail: string): Promise<void> {
        // TODO PHASE 3: Wire to emailService.sendEvidenceApprovalEmail()
        // For now, this is a no-op placeholder
        console.log(`[Email Delegate] TODO: Send approval email for evidence ${evidenceId} to ${recipientEmail}`);
      },
      
      async sendEvidenceRejectionEmail(evidenceId: string, recipientEmail: string, notes?: string): Promise<void> {
        // TODO PHASE 3: Wire to emailService.sendEvidenceRejectionEmail()
        console.log(`[Email Delegate] TODO: Send rejection email for evidence ${evidenceId} to ${recipientEmail}${notes ? ` with notes: ${notes}` : ''}`);
      },
      
      async sendEvidenceSubmissionConfirmation(evidenceId: string, recipientEmail: string): Promise<void> {
        // TODO PHASE 1: Wire to emailService.sendEvidenceSubmissionConfirmation()
        console.log(`[Email Delegate] TODO: Send submission confirmation for evidence ${evidenceId} to ${recipientEmail}`);
      }
    },
    
    // Files: Wire to actual object storage and image compression in later phases
    files: {
      async uploadFile(file: Express.Multer.File, path: string, isPublic: boolean): Promise<string> {
        // TODO PHASE 1: Wire to objectStorage.uploadFile()
        // For now, return empty string
        console.log(`[File Delegate] TODO: Upload file to ${path} (public: ${isPublic})`);
        return '';
      },
      
      async deleteFile(url: string): Promise<void> {
        // TODO PHASE 1: Wire to objectStorage.deleteFile()
        console.log(`[File Delegate] TODO: Delete file at ${url}`);
      },
      
      async compressImage(buffer: Buffer): Promise<Buffer> {
        // TODO PHASE 1: Wire to imageCompression.compressImage()
        // For now, return buffer unchanged
        console.log(`[File Delegate] TODO: Compress image (${buffer.length} bytes)`);
        return buffer;
      }
    }
  };
}
