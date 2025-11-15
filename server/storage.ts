import {
  users,
  schools,
  schoolUsers,
  resources,
  resourcePacks,
  resourcePackItems,
  evidence,
  evidenceRequirements,
  adminEvidenceOverrides,
  caseStudies,
  caseStudyVersions,
  caseStudyReviewComments,
  emailLogs,
  mailchimpAudiences,
  mailchimpSubscriptions,
  certificates,
  teacherInvitations,
  adminInvitations,
  verificationRequests,
  testimonials,
  auditResponses,
  reductionPromises,
  printableFormSubmissions,
  events,
  eventRegistrations,
  eventResources,
  eventAnnouncements,
  eventBanners,
  eventLinkClicks,
  eventResourceDownloads,
  mediaAssets,
  mediaTags,
  mediaAssetTags,
  mediaAssetUsage,
  notifications,
  importBatches,
  chatMessages,
  documentLocks,
  healthChecks,
  uptimeMetrics,
  passwordResetTokens,
  settings,
  type User,
  type UpsertUser,
  type School,
  type InsertSchool,
  type SchoolUser,
  type InsertSchoolUser,
  type Resource,
  type InsertResource,
  type ResourcePack,
  type InsertResourcePack,
  type ResourcePackItem,
  type InsertResourcePackItem,
  type Evidence,
  type InsertEvidence,
  type EvidenceWithSchool,
  type EvidenceRequirement,
  type InsertEvidenceRequirement,
  type AdminEvidenceOverride,
  type InsertAdminEvidenceOverride,
  type CaseStudy,
  type InsertCaseStudy,
  type CaseStudyVersion,
  type InsertCaseStudyVersion,
  type EmailLog,
  type InsertEmailLog,
  type MailchimpAudience,
  type InsertMailchimpAudience,
  type MailchimpSubscription,
  type InsertMailchimpSubscription,
  type Certificate,
  type InsertCertificate,
  type TeacherInvitation,
  type InsertTeacherInvitation,
  type AdminInvitation,
  type InsertAdminInvitation,
  type VerificationRequest,
  type InsertVerificationRequest,
  type Testimonial,
  type InsertTestimonial,
  type AuditResponse,
  type InsertAuditResponse,
  type ReductionPromise,
  type InsertReductionPromise,
  type PrintableFormSubmission,
  type InsertPrintableFormSubmission,
  type Event,
  type InsertEvent,
  type EventRegistration,
  type InsertEventRegistration,
  type EventResource,
  type InsertEventResource,
  type EventAnnouncement,
  type InsertEventAnnouncement,
  type EventBanner,
  type InsertEventBanner,
  type EventLinkClick,
  type InsertEventLinkClick,
  type EventResourceDownload,
  type InsertEventResourceDownload,
  type MediaAsset,
  type InsertMediaAsset,
  type MediaTag,
  type InsertMediaTag,
  type MediaAssetTag,
  type InsertMediaAssetTag,
  type MediaAssetUsage,
  type InsertMediaAssetUsage,
  type Notification,
  type InsertNotification,
  type CreatePasswordUser,
  type ChatMessage,
  type InsertChatMessage,
  type DocumentLock,
  type InsertDocumentLock,
  auditLogs,
  type AuditLog,
  type InsertAuditLog,
  type HealthCheck,
  type InsertHealthCheck,
  type UptimeMetric,
  type InsertUptimeMetric,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type Setting,
  type InsertSetting,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, ilike, count, sql, inArray, getTableColumns, ne, gte, isNull } from "drizzle-orm";
import * as bcrypt from "bcrypt";
import { sendCourseCompletionCelebrationEmail, getBaseUrl } from './emailService';
import { normalizeCountryName, getAllCountryCodes, getCountryCode } from './countryMapping';
import { schoolStorage } from './features/schools/storage';
import { getEvidenceStorage } from './features/evidence/storage';
import { createEvidenceDelegates } from './features/evidence/delegates';
import { createSchoolProgressionDelegate } from './features/schools/progression';
import { getCaseStudyStorage } from './features/case-studies/storage';

/**
 * Custom error class for database constraint violations
 */
export class ConstraintError extends Error {
  public readonly constraintType: string;
  public readonly details: string;
  
  constructor(message: string, constraintType: string = 'foreign_key', details: string = '') {
    super(message);
    this.name = 'ConstraintError';
    this.constraintType = constraintType;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConstraintError);
    }
  }
}

/**
 * System user ID for archived/transferred content
 * When users are deleted with 'transfer' mode, their content is reassigned to this system user
 */
export const ARCHIVED_USER_ID = 'archived-user-system';

export interface IStorage {
  // User operations (required for authentication system)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Authentication methods
  findUserByEmail(email: string): Promise<User | undefined>;
  createUserWithPassword(userData: CreatePasswordUser): Promise<User>;
  updateUserPassword(id: string, passwordHash: string): Promise<User | undefined>;
  verifyEmail(userId: string): Promise<User | undefined>;
  verifyPassword(password: string, passwordHash: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
  
  // Password reset methods
  createPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  findValidPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  deletePasswordResetToken(token: string): Promise<void>;
  
  // User management (admin operations)
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string, mode?: 'soft' | 'transfer' | 'hard'): Promise<{
    success: boolean;
    mode: string;
    evidenceDeleted?: number;
    caseStudiesAffected?: Array<{ id: string; title: string }>;
  }>;
  getOrCreateArchivedUser(): Promise<User>;
  getUserContentCounts(userId: string): Promise<{
    evidence: number;
    caseStudies: number;
    reductionPromises: number;
    mediaAssets: number;
    certificates: number;
    importBatches: number;
    teacherInvitations: number;
    adminInvitations: number;
  } | null>;
  getTeacherEmails(): Promise<string[]>;
  markOnboardingComplete(userId: string): Promise<User | undefined>;
  updateAdminOnboarding(userId: string, data: { firstName: string; lastName: string; preferredLanguage: string }): Promise<User | undefined>;
  updateUserLastActive(userId: string): Promise<void>;
  markUserAsInteracted(userId: string): Promise<void>;
  getUserActiveSchoolMembership(userId: string): Promise<{ schoolId: string; role: string } | undefined>;
  
  // School operations
  createSchool(school: InsertSchool): Promise<School>;
  getSchool(id: string): Promise<School | undefined>;
  getSchoolByName(name: string): Promise<School | undefined>;
  getSchools(filters?: {
    country?: string;
    stage?: string;
    type?: string;
    showOnMap?: boolean;
    lastActiveDays?: number;
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'country' | 'progress' | 'joinDate';
    sortOrder?: 'asc' | 'desc';
  }): Promise<School[]>;
  updateSchool(id: string, updates: Partial<School>): Promise<School | undefined>;
  manuallyUpdateSchoolProgression(id: string, updates: {
    currentStage?: 'inspire' | 'investigate' | 'act';
    currentRound?: number;
    inspireCompleted?: boolean;
    investigateCompleted?: boolean;
    actCompleted?: boolean;
    progressPercentage?: number;
  }): Promise<School | undefined>;
  getSchoolStats(): Promise<{
    totalSchools: number;
    completedAwards: number;
    countries: number;
    studentsImpacted: number;
  }>;
  getSchoolCountsByCountry(filters?: {
    country?: string;
    lastActiveDays?: number;
  }): Promise<Array<{
    countryCode: string;
    countryName: string;
    totalSchools: number;
    completedAwards: number;
    featuredSchools: number;
  }>>;
  getUniqueCountries(): Promise<string[]>;
  findSchoolsByEmailDomain(domain: string): Promise<Array<School & { userEmails: string[] }>>;
  
  // Photo Consent operations
  updateSchoolPhotoConsent(schoolId: string, documentUrl: string, approvedBy?: string): Promise<School | undefined>;
  reviewSchoolPhotoConsent(schoolId: string, status: 'approved' | 'rejected', reviewedBy: string, notes?: string): Promise<School | undefined>;
  getSchoolPhotoConsentStatus(schoolId: string): Promise<{ status: string | null; documentUrl: string | null; uploadedAt: Date | null; approvedAt: Date | null; reviewNotes: string | null } | undefined>;
  getSchoolsWithPendingPhotoConsent(): Promise<Array<{
    id: string;
    name: string;
    country: string;
    photoConsent: {
      documentUrl: string | null;
      uploadedAt: Date | null;
      status: string | null;
    } | null;
  }>>;
  
  // School User operations
  addUserToSchool(schoolUser: InsertSchoolUser): Promise<SchoolUser>;
  getSchoolUsers(schoolId: string): Promise<SchoolUser[]>;
  getUserSchools(userId: string): Promise<School[]>;
  
  // School User role management
  getSchoolUser(schoolId: string, userId: string): Promise<SchoolUser | undefined>;
  updateSchoolUserRole(schoolId: string, userId: string, role: 'head_teacher' | 'teacher' | 'pending_teacher'): Promise<SchoolUser | undefined>;
  removeUserFromSchool(schoolId: string, userId: string): Promise<SchoolUser | undefined>;
  getSchoolUsersWithDetails(schoolId: string, filters?: { role?: string; limit?: number; offset?: number }): Promise<Array<SchoolUser & { user: User | null }>>;
  updateLegacyEvidenceCount(schoolId: string, userId: string, count: number): Promise<SchoolUser | undefined>;

  // Teacher invitation operations  
  createTeacherInvitation(invitation: InsertTeacherInvitation): Promise<TeacherInvitation>;
  getTeacherInvitationByToken(token: string): Promise<TeacherInvitation | undefined>;
  getSchoolInvitations(schoolId: string): Promise<TeacherInvitation[]>;
  acceptTeacherInvitation(token: string): Promise<TeacherInvitation | undefined>;
  expireTeacherInvitation(token: string): Promise<TeacherInvitation | undefined>;

  // Admin invitation operations
  createAdminInvitation(invitation: InsertAdminInvitation): Promise<AdminInvitation>;
  getAdminInvitationByToken(token: string): Promise<AdminInvitation | undefined>;
  getAllAdminInvitations(): Promise<AdminInvitation[]>;
  acceptAdminInvitation(token: string): Promise<AdminInvitation | undefined>;
  expireAdminInvitation(token: string): Promise<AdminInvitation | undefined>;
  deleteAdminInvitation(id: string): Promise<boolean>;

  // Verification request operations
  createVerificationRequest(request: InsertVerificationRequest): Promise<VerificationRequest>;
  getVerificationRequest(id: string): Promise<VerificationRequest | undefined>;
  getSchoolVerificationRequests(schoolId: string): Promise<VerificationRequest[]>;
  getPendingVerificationRequests(): Promise<VerificationRequest[]>;
  approveVerificationRequest(id: string, reviewedBy: string, reviewNotes?: string): Promise<VerificationRequest | undefined>;
  rejectVerificationRequest(id: string, reviewedBy: string, reviewNotes?: string): Promise<VerificationRequest | undefined>;
  
  // Resource operations
  createResource(resource: InsertResource): Promise<Resource>;
  getResources(filters?: {
    stage?: string;
    country?: string;
    language?: string;
    ageRange?: string;
    resourceType?: string;
    theme?: string;
    search?: string;
    visibility?: 'public' | 'private';
    includeHidden?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Resource[]>;
  updateResource(id: string, updates: Partial<InsertResource>): Promise<Resource | undefined>;
  deleteResource(id: string): Promise<boolean>;
  updateResourceDownloads(id: string): Promise<void>;
  getResourceById(id: string): Promise<Resource | undefined>;

  // Resource Pack operations
  createResourcePack(pack: InsertResourcePack): Promise<ResourcePack>;
  getResourcePacks(filters?: {
    stage?: string;
    theme?: string;
    visibility?: 'public' | 'private';
    limit?: number;
    offset?: number;
  }): Promise<Array<ResourcePack & { resourceCount: number; previewResources: Array<Pick<Resource, 'id' | 'title' | 'fileUrl' | 'fileType'>> }>>;
  getResourcePackById(id: string): Promise<(ResourcePack & { resources: Resource[] }) | undefined>;
  updateResourcePack(id: string, updates: Partial<InsertResourcePack>): Promise<ResourcePack | undefined>;
  deleteResourcePack(id: string): Promise<boolean>;
  addResourceToPack(packId: string, resourceId: string, orderIndex: number): Promise<ResourcePackItem>;
  removeResourceFromPack(packId: string, resourceId: string): Promise<boolean>;
  updateResourcePackDownloads(id: string): Promise<void>;
  updateResourcePackItemsOrder(packId: string, items: Array<{ resourceId: string; orderIndex: number }>): Promise<void>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getSchoolNotifications(schoolId: string, unreadOnly?: boolean): Promise<Notification[]>;
  getUserNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(schoolId: string): Promise<void>;
  markAllNotificationsAsReadForUser(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<boolean>;
  getUnreadNotificationCount(schoolId: string): Promise<number>;
  getUnreadNotificationCountForUser(userId: string): Promise<number>;
  
  // Evidence operations
  createEvidence(evidence: InsertEvidence): Promise<Evidence>;
  getEvidence(id: string): Promise<Evidence | undefined>;
  getEvidenceById(id: string): Promise<EvidenceWithSchool & { schoolName: string; schoolCountry: string; schoolLanguage: string | null } | undefined>;
  getSchoolEvidence(schoolId: string): Promise<Evidence[]>;
  getPendingEvidence(): Promise<Evidence[]>;
  getAllEvidence(filters?: {
    status?: 'pending' | 'approved' | 'rejected';
    stage?: 'inspire' | 'investigate' | 'act';
    schoolId?: string;
    country?: string;
    visibility?: 'public' | 'private';
    assignedTo?: string;
  }): Promise<EvidenceWithSchool[]>;
  getApprovedPublicEvidence(): Promise<Evidence[]>;
  updateEvidenceStatus(
    id: string, 
    status: 'approved' | 'rejected',
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<Evidence | undefined>;
  assignEvidence(evidenceId: string, assignedToUserId: string | null): Promise<void>;
  updateEvidence(id: string, updates: Partial<InsertEvidence>): Promise<Evidence | undefined>;
  updateEvidenceFiles(id: string, files: any[]): Promise<Evidence | undefined>;
  deleteEvidence(id: string): Promise<boolean>;
  deleteSchool(id: string): Promise<boolean>;
  getApprovedEvidenceForInspiration(filters?: {
    stage?: string;
    country?: string;
    search?: string;
    visibility?: 'public' | 'private';
    limit?: number;
    offset?: number;
  }): Promise<Array<EvidenceWithSchool & { 
    schoolName: string;
    schoolCountry: string;
    schoolLanguage: string | null;
  }>>;
  getEvidenceByFileUrl(fileUrl: string): Promise<(EvidenceWithSchool & { 
    schoolName: string;
    schoolCountry: string;
    schoolLanguage: string | null;
  }) | undefined>;
  
  // Evidence Requirements operations
  getEvidenceRequirements(stage?: string): Promise<EvidenceRequirement[]>;
  getEvidenceRequirement(id: string): Promise<EvidenceRequirement | undefined>;
  createEvidenceRequirement(data: InsertEvidenceRequirement): Promise<EvidenceRequirement>;
  updateEvidenceRequirement(id: string, data: Partial<InsertEvidenceRequirement>): Promise<EvidenceRequirement | undefined>;
  deleteEvidenceRequirement(id: string): Promise<boolean>;
  getEvidenceByRequirement(requirementId: string): Promise<Evidence[]>;
  
  // Admin Evidence Override operations
  createAdminEvidenceOverride(override: InsertAdminEvidenceOverride): Promise<AdminEvidenceOverride>;
  getAdminEvidenceOverrides(schoolId: string, roundNumber?: number): Promise<AdminEvidenceOverride[]>;
  deleteAdminEvidenceOverride(id: string): Promise<boolean>;
  toggleAdminEvidenceOverride(
    schoolId: string, 
    evidenceRequirementId: string, 
    stage: 'inspire' | 'investigate' | 'act',
    roundNumber: number, 
    markedBy: string
  ): Promise<{ created: boolean; override: AdminEvidenceOverride | null }>;
  
  // Progression system operations
  checkAndUpdateSchoolProgression(schoolId: string): Promise<School | undefined>;
  getSchoolEvidenceCounts(schoolId: string): Promise<{
    inspire: { total: number; approved: number };
    investigate: { total: number; approved: number; hasQuiz: boolean; hasActionPlan: boolean };
    act: { total: number; approved: number };
  }>;
  startNewRound(schoolId: string): Promise<School | undefined>;
  migrateStuckSchools(): Promise<{ fixed: number; schools: string[] }>;
  
  // Case Study operations
  createCaseStudy(caseStudy: InsertCaseStudy): Promise<CaseStudy>;
  getCaseStudyById(id: string): Promise<CaseStudy | undefined>;
  getCaseStudies(filters?: {
    stage?: string;
    country?: string;
    featured?: boolean;
    search?: string;
    categories?: string[];
    tags?: string[];
    status?: 'draft' | 'published';
    limit?: number;
    offset?: number;
  }): Promise<CaseStudy[]>;
  updateCaseStudy(id: string, updates: Partial<InsertCaseStudy>): Promise<CaseStudy | undefined>;
  updateCaseStudyFeatured(id: string, featured: boolean): Promise<CaseStudy | undefined>;
  deleteCaseStudy(id: string): Promise<boolean>;
  getGlobalMovementData(): Promise<{
    featuredCaseStudies: CaseStudy[];
    statistics: {
      totalSchools: number;
      studentsEngaged: number;
      countriesInvolved: number;
    };
  }>;
  getRelatedCaseStudies(caseStudyId: string, limit?: number): Promise<CaseStudy[]>;
  
  // Case Study Version Management
  createCaseStudyVersion(version: InsertCaseStudyVersion): Promise<CaseStudyVersion>;
  getCaseStudyVersions(caseStudyId: string): Promise<CaseStudyVersion[]>;
  getCaseStudyVersion(versionId: string): Promise<CaseStudyVersion | undefined>;
  
  // Email operations
  logEmail(emailLog: InsertEmailLog): Promise<EmailLog>;
  getEmailLogs(limit?: number): Promise<EmailLog[]>;
  
  // Mailchimp operations
  createMailchimpAudience(audience: InsertMailchimpAudience): Promise<MailchimpAudience>;
  getMailchimpAudiences(): Promise<MailchimpAudience[]>;
  getMailchimpAudience(id: string): Promise<MailchimpAudience | undefined>;
  updateMailchimpAudience(id: string, updates: Partial<MailchimpAudience>): Promise<MailchimpAudience | undefined>;
  deleteMailchimpAudience(id: string): Promise<void>;
  
  createMailchimpSubscription(subscription: InsertMailchimpSubscription): Promise<MailchimpSubscription>;
  getMailchimpSubscriptions(audienceId?: string, email?: string): Promise<MailchimpSubscription[]>;
  updateMailchimpSubscription(id: string, updates: Partial<MailchimpSubscription>): Promise<MailchimpSubscription | undefined>;
  deleteMailchimpSubscription(id: string): Promise<void>;
  getSubscriptionsBySchool(schoolId: string): Promise<MailchimpSubscription[]>;
  getSubscriptionsByUser(userId: string): Promise<MailchimpSubscription[]>;
  
  // Certificate operations
  createCertificate(certificate: InsertCertificate): Promise<Certificate>;
  getCertificates(): Promise<(Certificate & { school: School })[]>;
  getCertificate(id: string): Promise<(Certificate & { school: School }) | undefined>;
  getCertificatesBySchool(schoolId: string): Promise<(Certificate & { school: School })[]>;
  getCertificateByNumber(certificateNumber: string): Promise<(Certificate & { school: School }) | undefined>;
  updateCertificate(id: string, updates: Partial<Certificate>): Promise<Certificate | undefined>;
  deleteCertificate(id: string): Promise<void>;
  
  // Testimonial operations
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
  getTestimonials(filters?: { isActive?: boolean }): Promise<Testimonial[]>;
  getTestimonial(id: string): Promise<Testimonial | undefined>;
  updateTestimonial(id: string, updates: Partial<Testimonial>): Promise<Testimonial | undefined>;
  deleteTestimonial(id: string): Promise<void>;
  
  // Admin operations
  getAdminStats(): Promise<{
    totalSchools: number;
    pendingEvidence: number;
    featuredCaseStudies: number;
    activeUsers: number;
    totalActions: number;
  }>;
  
  getAllUsersWithSchools(): Promise<Array<{ 
    user: User; 
    schools: Array<School & { role: string }> 
  }>>;
  
  getUsersWithSchoolsPaginated(params: {
    limit?: number;
    offset?: number;
    search?: string;
    interactionFilter?: 'all' | 'interacted' | 'not-interacted';
    schoolFilter?: 'all' | 'with-schools' | 'without-schools';
  }): Promise<{
    users: Array<{ user: User; schools: Array<School & { role: string }> }>;
    total: number;
    limit: number;
    offset: number;
  }>;

  // Analytics operations
  getAnalyticsOverview(startDate?: string, endDate?: string): Promise<{
    totalSchools: number;
    totalUsers: number;
    totalEvidence: number;
    completedAwards: number;
    pendingEvidence: number;
    averageProgress: number;
    studentsImpacted: number;
    countriesReached: number;
  }>;

  getSchoolProgressAnalytics(startDate?: string, endDate?: string): Promise<{
    stageDistribution: Array<{ stage: string; count: number }>;
    progressRanges: Array<{ range: string; count: number }>;
    completionRates: Array<{ metric: string; rate: number }>;
    monthlyRegistrations: Array<{ month: string; count: number }>;
    schoolsByCountry: Array<{ country: string; count: number; students: number }>;
  }>;

  getEvidenceAnalytics(startDate?: string, endDate?: string): Promise<{
    submissionTrends: Array<{ month: string; submissions: number; approvals: number; rejections: number }>;
    stageBreakdown: Array<{ stage: string; total: number; approved: number; pending: number; rejected: number }>;
    reviewTurnaround: Array<{ range: string; count: number }>;
    topSubmitters: Array<{ schoolName: string; submissions: number; approvalRate: number }>;
  }>;

  getUserEngagementAnalytics(startDate?: string, endDate?: string): Promise<{
    registrationTrends: Array<{ month: string; teachers: number; admins: number }>;
    roleDistribution: Array<{ role: string; count: number }>;
    activeUsers: Array<{ period: string; active: number }>;
    schoolEngagement: Array<{ schoolName: string; users: number; evidence: number; lastActivity: Date }>;
  }>;

  getResourceAnalytics(): Promise<{
    downloadTrends: Array<{ month: string; downloads: number }>;
    popularResources: Array<{ title: string; downloads: number; stage: string }>;
    resourcesByStage: Array<{ stage: string; count: number; totalDownloads: number }>;
    resourcesByCountry: Array<{ country: string; resources: number; downloads: number }>;
  }>;

  getEmailAnalytics(): Promise<{
    deliveryStats: Array<{ date: string; sent: number; delivered: number }>;
    templatePerformance: Array<{ template: string; sent: number; successRate: number }>;
    recentActivity: Array<{ date: string; template: string; recipient: string; status: string }>;
  }>;

  getGeographicAnalytics(): Promise<{
    schoolsByRegion: Array<{ country: string; schools: number; students: number; progress: number }>;
    globalReach: {
      totalCountries: number;
      totalCities: number;
      coordinates: Array<{ lat: number; lng: number; schoolCount: number; country: string }>;
    };
  }>;

  // School-specific analytics
  getSchoolAnalytics(schoolId: string): Promise<{
    submissionTrends: Array<{ month: string; count: number }>;
    teamContributions: Array<{ userId: string; userName: string; submissionCount: number; approvedCount: number }>;
    stageTimeline: Array<{ stage: 'inspire' | 'investigate' | 'act'; completedAt: string | null; daysToComplete: number | null }>;
    reviewStats: {
      averageReviewTimeHours: number;
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
    };
    fileTypeDistribution: {
      images: number;
      videos: number;
      pdfs: number;
      other: number;
    };
  }>;

  // Audit analytics
  getAuditOverviewAnalytics(): Promise<{
    totalSchoolsAudited: number;
    totalPlasticItems: number;
    averageItemsPerSchool: number;
    topProblemPlastics: Array<{ name: string; count: number }>;
  }>;

  getAuditBySchoolAnalytics(): Promise<Array<{
    schoolId: string;
    schoolName: string;
    country: string;
    totalPlasticItems: number;
    topProblemPlastic: string | null;
    auditDate: string;
    hasRecycling: boolean;
    hasComposting: boolean;
    hasPolicy: boolean;
  }>>;

  getWasteTrendsAnalytics(): Promise<{
    monthlySubmissions: Array<{ month: string; count: number }>;
    plasticItemsTrend: Array<{ month: string; totalItems: number }>;
    wasteReductionSchools: Array<{ month: string; count: number }>;
  }>;

  // Audit operations
  createAudit(audit: InsertAuditResponse): Promise<AuditResponse>;
  getAudit(id: string): Promise<AuditResponse | undefined>;
  getSchoolAudit(schoolId: string): Promise<AuditResponse | undefined>;
  getSchoolAudits(schoolId: string): Promise<Array<AuditResponse & { submittedByUser: User; reviewedByUser: User | null }>>;
  updateAudit(id: string, updates: Partial<AuditResponse>): Promise<AuditResponse | undefined>;
  submitAudit(id: string, userId: string): Promise<AuditResponse | undefined>;
  reviewAudit(id: string, reviewerId: string, approved: boolean, notes?: string): Promise<AuditResponse | undefined>;
  getPendingAudits(): Promise<Array<AuditResponse & { school: School; submittedByUser: User }>>;
  getAllAudits(filters?: { status?: string; limit?: number; offset?: number }): Promise<Array<AuditResponse & { school: School }>>;

  // Reduction Promise operations
  getReductionPromisesBySchool(schoolId: string): Promise<ReductionPromise[]>;
  getReductionPromisesByAudit(auditId: string): Promise<ReductionPromise[]>;
  createReductionPromise(data: InsertReductionPromise, createdBy: string): Promise<ReductionPromise>;
  updateReductionPromise(id: string, data: Partial<InsertReductionPromise>, existing?: ReductionPromise): Promise<ReductionPromise>;
  deleteReductionPromise(id: string): Promise<void>;
  getActivePromisesBySchool(schoolId: string): Promise<ReductionPromise[]>;
  getAllActivePromises(): Promise<ReductionPromise[]>;

  // Printable Form Submission operations
  createPrintableFormSubmission(data: InsertPrintableFormSubmission): Promise<PrintableFormSubmission>;
  getPrintableFormSubmission(id: string): Promise<PrintableFormSubmission | undefined>;
  getPrintableFormSubmissionsBySchool(schoolId: string): Promise<PrintableFormSubmission[]>;
  getAllPrintableFormSubmissions(filters?: { 
    status?: string; 
    formType?: string;
    schoolId?: string;
    limit?: number; 
    offset?: number;
  }): Promise<Array<PrintableFormSubmission & { school: School; submittedByUser: User }>>;
  updatePrintableFormSubmissionStatus(
    id: string, 
    status: 'approved' | 'rejected' | 'revision_requested',
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<PrintableFormSubmission | undefined>;

  // Event operations
  createEvent(event: InsertEvent): Promise<Event>;
  getEvent(id: string): Promise<Event | undefined>;
  getEvents(filters?: {
    status?: string;
    eventType?: string;
    upcoming?: boolean;
    publicSlug?: string;
    limit?: number;
    offset?: number;
  }): Promise<Event[]>;
  updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<void>;
  getUpcomingEvents(limit?: number): Promise<Event[]>;
  getPastEvents(limit?: number): Promise<Event[]>;
  
  // Event Registration operations
  createEventRegistration(registration: InsertEventRegistration): Promise<EventRegistration>;
  getEventRegistration(eventId: string, userId: string): Promise<EventRegistration | undefined>;
  getEventRegistrations(eventId: string, filters?: { status?: string }): Promise<Array<EventRegistration & { user: User; school: School | null }>>;
  getUserEventRegistrations(userId: string): Promise<Array<EventRegistration & { event: Event }>>;
  updateEventRegistration(id: string, updates: Partial<EventRegistration>): Promise<EventRegistration | undefined>;
  cancelEventRegistration(id: string): Promise<EventRegistration | undefined>;
  getEventRegistrationCount(eventId: string): Promise<number>;
  getEventAttendeesCount(eventId: string): Promise<number>;

  // Event Resource operations
  attachResourceToEvent(eventId: string, resourceId: string, orderIndex?: number): Promise<EventResource>;
  detachResourceFromEvent(eventId: string, resourceId: string): Promise<void>;
  getEventResources(eventId: string): Promise<Array<EventResource & { resource: Resource }>>;
  reorderEventResources(eventId: string, resourceOrders: Array<{ resourceId: string; orderIndex: number }>): Promise<void>;

  // Event Announcement operations
  createEventAnnouncement(announcement: InsertEventAnnouncement): Promise<EventAnnouncement>;
  getEventAnnouncements(eventId: string): Promise<EventAnnouncement[]>;
  getEventAnnouncementsByAudience(audienceId: string): Promise<Array<EventAnnouncement & { event: Event }>>;
  hasEventBeenAnnounced(eventId: string, audienceId: string): Promise<boolean>;

  // Event Banner operations
  createEventBanner(banner: InsertEventBanner): Promise<EventBanner>;
  getEventBanners(): Promise<Array<EventBanner & { event: Event }>>;
  getActiveEventBanner(): Promise<(EventBanner & { event: Event }) | null>;
  updateEventBanner(id: string, updates: Partial<EventBanner>): Promise<EventBanner | undefined>;
  deleteEventBanner(id: string): Promise<void>;

  // Event Analytics operations
  getEventAnalytics(): Promise<{
    totalEvents: number;
    eventsByStatus: {
      draft: number;
      published: number;
      completed: number;
      cancelled: number;
    };
    totalRegistrations: number;
    averageRegistrationsPerEvent: number;
    registrationConversionRate: number;
    eventsByType: Array<{
      type: string;
      count: number;
    }>;
    topEvents: Array<{
      id: string;
      title: string;
      registrations: number;
      capacity: number | null;
    }>;
    registrationsTrend: Array<{
      date: string;
      count: number;
    }>;
    upcomingEventsCount: number;
    pastEventsCount: number;
  }>;

  // Event tracking operations
  trackEventLinkClick(eventId: string, userId?: string): Promise<void>;
  getEventLinkClicks(eventId: string): Promise<Array<EventLinkClick & { user: User | null }>>;
  getEventLinkClickCount(eventId: string): Promise<number>;
  trackEventResourceDownload(eventId: string, fileIndex: number, fileName: string, userId?: string): Promise<void>;
  getEventResourceDownloads(eventId: string): Promise<Array<EventResourceDownload & { user: User | null }>>;
  getEventResourceDownloadStats(eventId: string): Promise<Array<{ fileIndex: number; fileName: string; downloadCount: number }>>;
  getEventDetailedAnalytics(eventId: string): Promise<{
    registrations: number;
    attended: number;
    linkClicks: number;
    uniqueLinkClickers: number;
    resourceDownloads: Array<{
      fileIndex: number;
      fileName: string;
      downloadCount: number;
      uniqueDownloaders: number;
    }>;
  }>;

  // Media Assets operations
  createMediaAsset(asset: InsertMediaAsset): Promise<MediaAsset>;
  getMediaAsset(id: string): Promise<MediaAsset | null>;
  listMediaAssets(filters?: {
    mediaType?: string;
    tags?: string[];
    uploaderId?: string;
    schoolId?: string | null;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<MediaAsset[]>;
  updateMediaAssetMetadata(id: string, updates: Partial<Pick<MediaAsset, 'altText' | 'description' | 'visibility'>>): Promise<MediaAsset>;
  deleteMediaAsset(id: string): Promise<void>;

  // Media Tags operations
  createMediaTag(tag: InsertMediaTag): Promise<MediaTag>;
  listMediaTags(): Promise<MediaTag[]>;
  attachMediaTags(assetId: string, tagIds: string[]): Promise<void>;
  detachMediaTags(assetId: string, tagIds: string[]): Promise<void>;

  // Media Asset Usage tracking
  recordMediaAssetUsage(assetId: string, usageType: string, referenceId?: string): Promise<void>;
  listMediaAssetUsage(assetId: string): Promise<any[]>;

  // Collaboration - Chat operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(limit?: number, offset?: number): Promise<Array<ChatMessage & { user: User | null }>>;

  // Collaboration - Document Lock operations
  createDocumentLock(lock: InsertDocumentLock): Promise<DocumentLock>;
  getDocumentLock(documentType: string, documentId: string): Promise<DocumentLock | null>;
  deleteDocumentLock(documentType: string, documentId: string): Promise<boolean>;
  forceUnlockDocument(documentId: string, documentType: string): Promise<void>;
  getActiveDocumentLocks(): Promise<Array<DocumentLock & { user: User | null }>>;
  cleanupExpiredLocks(): Promise<void>;

  // Audit logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: {
    userId?: string;
    targetType?: string;
    targetId?: string;
    limit?: number;
  }): Promise<Array<AuditLog & { user: { firstName: string | null, lastName: string | null } }>>;

  // Health Monitoring operations
  createHealthCheck(check: {
    endpoint: string;
    status: 'healthy' | 'degraded' | 'down';
    responseTime?: number;
    errorMessage?: string;
  }): Promise<void>;
  getRecentHealthChecks(endpoint: string, limit?: number): Promise<any[]>;
  getLatestHealthStatus(): Promise<Array<{
    endpoint: string;
    status: string;
    responseTime: number | null;
    checkedAt: Date;
  }>>;
  getHealthIncidents(hours?: number): Promise<Array<{
    endpoint: string;
    status: string;
    errorMessage: string | null;
    checkedAt: Date;
  }>>;
  updateUptimeMetric(metric: {
    date: Date;
    endpoint: string;
    totalChecks: number;
    successfulChecks: number;
    failedChecks: number;
    avgResponseTime: string;
    uptimePercentage: string;
  }): Promise<void>;
  getUptimeMetrics(filters?: {
    endpoint?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]>;
  getUptimeStats(days?: number): Promise<{
    overall: {
      uptimePercentage: number;
      avgResponseTime: number;
      totalChecks: number;
      successfulChecks: number;
      failedChecks: number;
    };
    byEndpoint: Array<{
      endpoint: string;
      uptimePercentage: number;
      avgResponseTime: number;
      totalChecks: number;
    }>;
  }>;

  // Settings operations
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for authentication system)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  // Authentication methods implementation
  async findUserByEmail(email: string): Promise<User | undefined> {
    // Case-insensitive email search
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.email}) = LOWER(${email})`);
    return user;
  }

  async createUserWithPassword(userData: CreatePasswordUser): Promise<User> {
    const userId = crypto.randomUUID();
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        ...userData,
      })
      .returning();
    return user;
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async verifyEmail(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, passwordHash);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = 12;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Password hashing failed');
    }
  }

  async createPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [resetToken] = await db
      .insert(passwordResetTokens)
      .values({
        email,
        token,
        expiresAt,
      })
      .returning();
    return resetToken;
  }

  async findValidPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        gte(passwordResetTokens.expiresAt, new Date())
      ))
      .limit(1);
    return resetToken;
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateAdminOnboarding(userId: string, data: { firstName: string; lastName: string; preferredLanguage: string }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        firstName: data.firstName,
        lastName: data.lastName,
        preferredLanguage: data.preferredLanguage,
        hasSeenOnboarding: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(id: string, mode: 'soft' | 'transfer' | 'hard' = 'soft'): Promise<{
    success: boolean;
    mode: string;
    evidenceDeleted?: number;
    caseStudiesAffected?: Array<{ id: string; title: string }>;
  }> {
    // First check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    if (existingUser.length === 0) {
      console.log(`User deletion failed: User ${id} does not exist`);
      return {
        success: false,
        mode,
      };
    }

    try {
      console.log(`[Delete User] Starting ${mode} deletion for user ${id}`);

      // MODE 1: SOFT DELETE - Just mark as deleted
      if (mode === 'soft') {
        await db
          .update(users)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(users.id, id));
        
        console.log(`[Delete User] User ${id} soft deleted successfully`);
        return {
          success: true,
          mode: 'soft',
        };
      }

      // MODE 2: TRANSFER - Transfer content to archived user, then delete user
      if (mode === 'transfer') {
        // Get or create the archived user
        const archivedUser = await this.getOrCreateArchivedUser();
        console.log(`[Delete User] Transferring content to archived user ${archivedUser.id}`);

        // Transfer all content to archived user
        // Transfer evidence submissions
        await db
          .update(evidence)
          .set({ submittedBy: archivedUser.id })
          .where(eq(evidence.submittedBy, id));
        
        // Transfer evidence reviews
        await db
          .update(evidence)
          .set({ reviewedBy: archivedUser.id })
          .where(eq(evidence.reviewedBy, id));
        
        // Transfer case studies
        await db
          .update(caseStudies)
          .set({ createdBy: archivedUser.id })
          .where(eq(caseStudies.createdBy, id));
        
        // Transfer case study reviews
        await db
          .update(caseStudies)
          .set({ reviewedBy: archivedUser.id })
          .where(eq(caseStudies.reviewedBy, id));
        
        // Transfer case study versions
        await db
          .update(caseStudyVersions)
          .set({ createdBy: archivedUser.id })
          .where(eq(caseStudyVersions.createdBy, id));
        
        // Transfer reduction promises
        await db
          .update(reductionPromises)
          .set({ createdBy: archivedUser.id })
          .where(eq(reductionPromises.createdBy, id));
        
        // Transfer printable forms
        await db
          .update(printableFormSubmissions)
          .set({ submittedBy: archivedUser.id })
          .where(eq(printableFormSubmissions.submittedBy, id));
        
        // Transfer printable form reviews
        await db
          .update(printableFormSubmissions)
          .set({ reviewedBy: archivedUser.id })
          .where(eq(printableFormSubmissions.reviewedBy, id));
        
        // Transfer audit submissions
        await db
          .update(auditResponses)
          .set({ submittedBy: archivedUser.id })
          .where(eq(auditResponses.submittedBy, id));
        
        // Transfer audit reviews
        await db
          .update(auditResponses)
          .set({ reviewedBy: archivedUser.id })
          .where(eq(auditResponses.reviewedBy, id));
        
        // Transfer media assets
        await db
          .update(mediaAssets)
          .set({ uploadedBy: archivedUser.id })
          .where(eq(mediaAssets.uploadedBy, id));
        
        // Transfer event banners
        await db
          .update(eventBanners)
          .set({ createdBy: archivedUser.id })
          .where(eq(eventBanners.createdBy, id));
        
        // Transfer events
        await db
          .update(events)
          .set({ createdBy: archivedUser.id })
          .where(eq(events.createdBy, id));
        
        // Transfer teacher invitations
        await db
          .update(teacherInvitations)
          .set({ invitedBy: archivedUser.id })
          .where(eq(teacherInvitations.invitedBy, id));
        
        // Transfer admin invitations
        await db
          .update(adminInvitations)
          .set({ invitedBy: archivedUser.id })
          .where(eq(adminInvitations.invitedBy, id));
        
        // Transfer certificates
        await db
          .update(certificates)
          .set({ issuedBy: archivedUser.id })
          .where(eq(certificates.issuedBy, id));
        
        // Transfer import batches
        await db
          .update(importBatches)
          .set({ importedBy: archivedUser.id })
          .where(eq(importBatches.importedBy, id));
        
        // Transfer event announcements
        await db
          .update(eventAnnouncements)
          .set({ sentBy: archivedUser.id })
          .where(eq(eventAnnouncements.sentBy, id));
        
        // Transfer verification request reviews
        await db
          .update(verificationRequests)
          .set({ reviewedBy: archivedUser.id })
          .where(eq(verificationRequests.reviewedBy, id));
        
        // Transfer case study review comments
        await db
          .update(caseStudyReviewComments)
          .set({ userId: archivedUser.id })
          .where(eq(caseStudyReviewComments.userId, id));
        
        // Transfer resource packs
        await db
          .update(resourcePacks)
          .set({ createdBy: archivedUser.id })
          .where(eq(resourcePacks.createdBy, id));
        
        // Set recipientId to NULL for email logs (these aren't content, just logs)
        await db
          .update(emailLogs)
          .set({ recipientId: null })
          .where(eq(emailLogs.recipientId, id));
        
        // Set primaryContactId and photoConsentApprovedBy to NULL for schools
        await db
          .update(schools)
          .set({ primaryContactId: null })
          .where(eq(schools.primaryContactId, id));
        
        await db
          .update(schools)
          .set({ photoConsentApprovedBy: null })
          .where(eq(schools.photoConsentApprovedBy, id));
        
        // Set invitedBy to NULL for school users
        await db
          .update(schoolUsers)
          .set({ invitedBy: null })
          .where(eq(schoolUsers.invitedBy, id));
        
        // Delete audit logs (these are just logs, not content)
        await db
          .delete(auditLogs)
          .where(eq(auditLogs.userId, id));
        
        // Finally, delete the user
        const result = await db
          .delete(users)
          .where(eq(users.id, id))
          .returning();
        
        const success = result.length > 0;
        console.log(`[Delete User] User ${id} successfully deleted after transferring content to archived user`);
        
        return {
          success,
          mode: 'transfer',
        };
      }

      // MODE 3: HARD DELETE - Delete all content and user (original implementation)
      // Track affected case studies before updating them
      const affectedCaseStudiesData = await db
        .select({ id: caseStudies.id, title: caseStudies.title })
        .from(caseStudies)
        .where(eq(caseStudies.createdBy, id));
      
      const caseStudiesAffected = affectedCaseStudiesData.map(cs => ({
        id: cs.id,
        title: cs.title || 'Untitled Case Study',
      }));
      
      console.log(`[Delete User] Found ${caseStudiesAffected.length} case studies created by user ${id}`);
      
      // Delete evidence submitted by this user
      const deletedEvidence = await db
        .delete(evidence)
        .where(eq(evidence.submittedBy, id))
        .returning({ id: evidence.id });
      
      const evidenceDeleted = deletedEvidence.length;
      console.log(`[Delete User] Deleted ${evidenceDeleted} evidence items submitted by user ${id}`);
      
      // Set reviewedBy to NULL for evidence reviewed by this user
      await db
        .update(evidence)
        .set({ reviewedBy: null })
        .where(eq(evidence.reviewedBy, id));
      
      // DELETE case studies created by this user (createdBy is NOT NULL)
      await db
        .delete(caseStudies)
        .where(eq(caseStudies.createdBy, id));
      
      // Set reviewedBy to NULL for case studies reviewed by this user
      await db
        .update(caseStudies)
        .set({ reviewedBy: null })
        .where(eq(caseStudies.reviewedBy, id));
      
      // NOTE: resources table does not have a createdBy field, so we skip it
      
      // DELETE reduction promises created by this user (createdBy is NOT NULL)
      await db
        .delete(reductionPromises)
        .where(eq(reductionPromises.createdBy, id));
      
      // DELETE printable forms submitted by this user (submittedBy is NOT NULL)
      await db
        .delete(printableFormSubmissions)
        .where(eq(printableFormSubmissions.submittedBy, id));
      
      // Set reviewedBy to NULL for printable forms reviewed by this user
      await db
        .update(printableFormSubmissions)
        .set({ reviewedBy: null })
        .where(eq(printableFormSubmissions.reviewedBy, id));
      
      // DELETE media assets uploaded by this user (uploadedBy is NOT NULL)
      await db
        .delete(mediaAssets)
        .where(eq(mediaAssets.uploadedBy, id));
      
      // DELETE event banners created by this user (createdBy is NOT NULL)
      await db
        .delete(eventBanners)
        .where(eq(eventBanners.createdBy, id));
      
      // DELETE teacher invitations sent by this user (invitedBy is NOT NULL)
      await db
        .delete(teacherInvitations)
        .where(eq(teacherInvitations.invitedBy, id));
      
      // DELETE admin invitations sent by this user (invitedBy is NOT NULL)
      await db
        .delete(adminInvitations)
        .where(eq(adminInvitations.invitedBy, id));
      
      // DELETE certificates issued by this user (issuedBy is NOT NULL)
      await db
        .delete(certificates)
        .where(eq(certificates.issuedBy, id));
      
      // DELETE import batches created by this user (importedBy is NOT NULL)
      await db
        .delete(importBatches)
        .where(eq(importBatches.importedBy, id));
      
      // DELETE event announcements sent by this user (sentBy is NOT NULL)
      await db
        .delete(eventAnnouncements)
        .where(eq(eventAnnouncements.sentBy, id));
      
      // Set reviewedBy to NULL for verification requests
      await db
        .update(verificationRequests)
        .set({ reviewedBy: null })
        .where(eq(verificationRequests.reviewedBy, id));
      
      // DELETE case study review comments by this user (userId is NOT NULL)
      await db
        .delete(caseStudyReviewComments)
        .where(eq(caseStudyReviewComments.userId, id));
      
      // Set recipientId to NULL for email logs
      await db
        .update(emailLogs)
        .set({ recipientId: null })
        .where(eq(emailLogs.recipientId, id));
      
      // Set primaryContactId and photoConsentApprovedBy to NULL for schools
      await db
        .update(schools)
        .set({ primaryContactId: null })
        .where(eq(schools.primaryContactId, id));
      
      await db
        .update(schools)
        .set({ photoConsentApprovedBy: null })
        .where(eq(schools.photoConsentApprovedBy, id));
      
      // Set invitedBy to NULL for school users
      await db
        .update(schoolUsers)
        .set({ invitedBy: null })
        .where(eq(schoolUsers.invitedBy, id));
      
      // Finally, delete the user
      const result = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning();
      
      const success = result.length > 0;
      
      console.log(`[Delete User] User ${id} successfully hard deleted. Evidence deleted: ${evidenceDeleted}, Case studies affected: ${caseStudiesAffected.length}`);
      
      return {
        success,
        mode: 'hard',
        evidenceDeleted,
        caseStudiesAffected,
      };
    } catch (error: any) {
      console.error(`Unexpected error during ${mode} deletion:`, {
        userId: id,
        error: error.message,
        code: error.code,
        detail: error.detail
      });
      
      throw new Error(`Failed to delete user: ${error.message || 'Unknown database error'}`);
    }
  }

  async markOnboardingComplete(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ hasSeenOnboarding: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserLastActive(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ lastActiveAt: new Date() })
      .where(eq(users.id, userId));
  }

  async markUserAsInteracted(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ hasInteracted: true, lastActiveAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getUserActiveSchoolMembership(userId: string): Promise<{ schoolId: string; role: string } | undefined> {
    // Get user's school memberships (excluding pending)
    const memberships = await db
      .select({
        schoolId: schoolUsers.schoolId,
        role: schoolUsers.role,
        createdAt: schoolUsers.createdAt,
      })
      .from(schoolUsers)
      .innerJoin(schools, eq(schoolUsers.schoolId, schools.id))
      .where(
        and(
          eq(schoolUsers.userId, userId),
          or(
            eq(schoolUsers.role, 'teacher'),
            eq(schoolUsers.role, 'head_teacher')
          )
        )
      )
      .orderBy(desc(schoolUsers.createdAt));

    if (memberships.length === 0) {
      return undefined;
    }

    if (memberships.length > 1) {
      console.warn(`[Auth] User ${userId} has ${memberships.length} school memberships. Using most recent.`);
    }

    return {
      schoolId: memberships[0].schoolId,
      role: memberships[0].role || 'teacher',
    };
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(sql`${users.deletedAt} IS NULL`)
      .orderBy(asc(users.firstName), asc(users.lastName));
  }

  async getOrCreateArchivedUser(): Promise<User> {
    // Check if archived user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, ARCHIVED_USER_ID))
      .limit(1);

    if (existingUser) {
      return existingUser;
    }

    // Create archived user if it doesn't exist
    const [archivedUser] = await db
      .insert(users)
      .values({
        id: ARCHIVED_USER_ID,
        email: 'archived@plasticcleverschools.system',
        firstName: 'Archived',
        lastName: 'User',
        role: 'admin',
        isAdmin: false,
        emailVerified: true,
      })
      .returning();

    console.log('[Archived User] Created system archived user');
    return archivedUser;
  }

  async getUserContentCounts(userId: string): Promise<{
    evidence: number;
    caseStudies: number;
    reductionPromises: number;
    mediaAssets: number;
    certificates: number;
    importBatches: number;
    teacherInvitations: number;
    adminInvitations: number;
  } | null> {
    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return null;
    }

    // Get counts of all content types
    const [evidenceCount] = await db
      .select({ count: count() })
      .from(evidence)
      .where(eq(evidence.submittedBy, userId));

    const [caseStudiesCount] = await db
      .select({ count: count() })
      .from(caseStudies)
      .where(eq(caseStudies.createdBy, userId));

    const [reductionPromisesCount] = await db
      .select({ count: count() })
      .from(reductionPromises)
      .where(eq(reductionPromises.createdBy, userId));

    const [mediaAssetsCount] = await db
      .select({ count: count() })
      .from(mediaAssets)
      .where(eq(mediaAssets.uploadedBy, userId));

    const [certificatesCount] = await db
      .select({ count: count() })
      .from(certificates)
      .where(eq(certificates.issuedBy, userId));

    const [importBatchesCount] = await db
      .select({ count: count() })
      .from(importBatches)
      .where(eq(importBatches.importedBy, userId));

    const [teacherInvitationsCount] = await db
      .select({ count: count() })
      .from(teacherInvitations)
      .where(eq(teacherInvitations.invitedBy, userId));

    const [adminInvitationsCount] = await db
      .select({ count: count() })
      .from(adminInvitations)
      .where(eq(adminInvitations.invitedBy, userId));

    return {
      evidence: evidenceCount?.count || 0,
      caseStudies: caseStudiesCount?.count || 0,
      reductionPromises: reductionPromisesCount?.count || 0,
      mediaAssets: mediaAssetsCount?.count || 0,
      certificates: certificatesCount?.count || 0,
      importBatches: importBatchesCount?.count || 0,
      teacherInvitations: teacherInvitationsCount?.count || 0,
      adminInvitations: adminInvitationsCount?.count || 0,
    };
  }

  async getTeacherEmails(): Promise<string[]> {
    const teachers = await db
      .select({ email: users.email })
      .from(users)
      .where(
        and(
          eq(users.role, 'teacher'),
          sql`${users.email} IS NOT NULL`
        )
      );
    
    return teachers
      .map(t => t.email)
      .filter((email): email is string => email !== null);
  }

  // School operations
  async createSchool(schoolData: InsertSchool): Promise<School> {
    return schoolStorage.createSchool(schoolData);
  }

  async getSchool(id: string): Promise<School | undefined> {
    return schoolStorage.getSchool(id);
  }

  async getSchoolByName(name: string): Promise<School | undefined> {
    return schoolStorage.getSchoolByName(name);
  }

  async getSchools(filters: {
    country?: string;
    stage?: string;
    type?: string;
    showOnMap?: boolean;
    language?: string;
    search?: string;
    lastActiveDays?: number;
    sortByDate?: 'newest' | 'oldest';
    joinedMonth?: string;
    joinedYear?: string;
    interactionStatus?: string;
    completionStatus?: string;
    sortBy?: 'name' | 'country' | 'progress' | 'joinDate';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}): Promise<Array<School & { primaryContactEmail: string | null; primaryContactFirstName: string | null; primaryContactLastName: string | null }>> {
    return schoolStorage.getSchools(filters);
  }

  async updateSchool(id: string, updates: Partial<School>): Promise<School | undefined> {
    return schoolStorage.updateSchool(id, updates);
  }

  async manuallyUpdateSchoolProgression(id: string, updates: {
    currentStage?: 'inspire' | 'investigate' | 'act';
    currentRound?: number;
    inspireCompleted?: boolean;
    investigateCompleted?: boolean;
    actCompleted?: boolean;
    progressPercentage?: number;
  }): Promise<School | undefined> {
    return schoolStorage.manuallyUpdateSchoolProgression(id, updates);
  }

  async getSchoolStats(): Promise<{
    totalSchools: number;
    completedAwards: number;
    countries: number;
    studentsImpacted: number;
  }> {
    return schoolStorage.getSchoolStats();
  }

  async getSchoolCountsByCountry(filters: {
    country?: string;
    lastActiveDays?: number;
  } = {}): Promise<Array<{
    countryCode: string;
    countryName: string;
    totalSchools: number;
    completedAwards: number;
    featuredSchools: number;
  }>> {
    return schoolStorage.getSchoolCountsByCountry(filters);
  }

  async getUniqueCountries(): Promise<string[]> {
    return schoolStorage.getUniqueCountries();
  }

  async findSchoolsByEmailDomain(domain: string): Promise<Array<School & { userEmails: string[] }>> {
    return schoolStorage.findSchoolsByEmailDomain(domain);
  }

  // Photo Consent operations
  async updateSchoolPhotoConsent(schoolId: string, documentUrl: string, approvedBy?: string): Promise<School | undefined> {
    return schoolStorage.updateSchoolPhotoConsent(schoolId, documentUrl, approvedBy);
  }

  async reviewSchoolPhotoConsent(
    schoolId: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    notes?: string
  ): Promise<School | undefined> {
    return schoolStorage.reviewSchoolPhotoConsent(schoolId, status, reviewedBy, notes);
  }

  async getSchoolPhotoConsentStatus(schoolId: string): Promise<{
    status: string | null;
    documentUrl: string | null;
    uploadedAt: Date | null;
    approvedAt: Date | null;
    reviewNotes: string | null;
  } | undefined> {
    return schoolStorage.getSchoolPhotoConsentStatus(schoolId);
  }

  async getSchoolsWithPendingPhotoConsent(): Promise<Array<{
    id: string;
    name: string;
    country: string;
    photoConsent: {
      documentUrl: string | null;
      uploadedAt: Date | null;
      status: string | null;
    } | null;
  }>> {
    return schoolStorage.getSchoolsWithPendingPhotoConsent();
  }

  // School User operations
  async addUserToSchool(schoolUserData: InsertSchoolUser): Promise<SchoolUser> {
    return schoolStorage.addUserToSchool(schoolUserData);
  }

  async getSchoolUsers(schoolId: string): Promise<SchoolUser[]> {
    return schoolStorage.getSchoolUsers(schoolId);
  }

  async getUserSchools(userId: string): Promise<School[]> {
    return schoolStorage.getUserSchools(userId);
  }

  // School User role management
  async getSchoolUser(schoolId: string, userId: string): Promise<SchoolUser | undefined> {
    return schoolStorage.getSchoolUser(schoolId, userId);
  }

  async updateSchoolUserRole(
    schoolId: string,
    userId: string,
    role: 'head_teacher' | 'teacher' | 'pending_teacher'
  ): Promise<SchoolUser | undefined> {
    return schoolStorage.updateSchoolUserRole(schoolId, userId, role);
  }

  async removeUserFromSchool(schoolId: string, userId: string): Promise<SchoolUser | undefined> {
    return schoolStorage.removeUserFromSchool(schoolId, userId);
  }

  async getSchoolUsersWithDetails(
    schoolId: string, 
    filters?: { role?: string; limit?: number; offset?: number }
  ): Promise<Array<SchoolUser & { user: User | null }>> {
    return schoolStorage.getSchoolUsersWithDetails(schoolId, filters);
  }

  async updateLegacyEvidenceCount(
    schoolId: string,
    userId: string,
    count: number
  ): Promise<SchoolUser | undefined> {
    return schoolStorage.updateLegacyEvidenceCount(schoolId, userId, count);
  }

  // Teacher invitation operations
  async createTeacherInvitation(invitationData: InsertTeacherInvitation): Promise<TeacherInvitation> {
    return schoolStorage.createTeacherInvitation(invitationData);
  }

  async getTeacherInvitationByToken(token: string): Promise<TeacherInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(teacherInvitations)
      .where(eq(teacherInvitations.token, token));
    return invitation;
  }

  async getSchoolInvitations(schoolId: string): Promise<TeacherInvitation[]> {
    return schoolStorage.getSchoolInvitations(schoolId);
  }

  async acceptTeacherInvitation(token: string): Promise<TeacherInvitation | undefined> {
    const [invitation] = await db
      .update(teacherInvitations)
      .set({
        status: 'accepted' as any,
        acceptedAt: new Date(),
      })
      .where(
        and(
          eq(teacherInvitations.token, token),
          eq(teacherInvitations.status, 'pending'),
          sql`${teacherInvitations.expiresAt} > NOW()`
        )
      )
      .returning();
    return invitation;
  }

  async expireTeacherInvitation(token: string): Promise<TeacherInvitation | undefined> {
    const [invitation] = await db
      .update(teacherInvitations)
      .set({
        status: 'expired' as any,
      })
      .where(
        and(
          eq(teacherInvitations.token, token),
          eq(teacherInvitations.status, 'pending')
        )
      )
      .returning();
    return invitation;
  }

  // Admin invitation operations
  async createAdminInvitation(invitationData: InsertAdminInvitation): Promise<AdminInvitation> {
    const [invitation] = await db
      .insert(adminInvitations)
      .values(invitationData)
      .returning();
    return invitation;
  }

  async getAdminInvitationByToken(token: string): Promise<AdminInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(adminInvitations)
      .where(eq(adminInvitations.token, token));
    return invitation;
  }

  async getAllAdminInvitations(): Promise<AdminInvitation[]> {
    return await db
      .select()
      .from(adminInvitations)
      .orderBy(desc(adminInvitations.createdAt));
  }

  async acceptAdminInvitation(token: string): Promise<AdminInvitation | undefined> {
    const [invitation] = await db
      .update(adminInvitations)
      .set({
        status: 'accepted' as any,
        acceptedAt: new Date(),
      })
      .where(
        and(
          eq(adminInvitations.token, token),
          eq(adminInvitations.status, 'pending'),
          sql`${adminInvitations.expiresAt} > NOW()`
        )
      )
      .returning();
    return invitation;
  }

  async expireAdminInvitation(token: string): Promise<AdminInvitation | undefined> {
    const [invitation] = await db
      .update(adminInvitations)
      .set({
        status: 'expired' as any,
      })
      .where(
        and(
          eq(adminInvitations.token, token),
          eq(adminInvitations.status, 'pending')
        )
      )
      .returning();
    return invitation;
  }

  async deleteAdminInvitation(id: string): Promise<boolean> {
    const result = await db
      .delete(adminInvitations)
      .where(eq(adminInvitations.id, id))
      .returning();
    return result.length > 0;
  }

  // Verification request operations
  async createVerificationRequest(requestData: InsertVerificationRequest): Promise<VerificationRequest> {
    const [request] = await db
      .insert(verificationRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async getVerificationRequest(id: string): Promise<VerificationRequest | undefined> {
    const [request] = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.id, id));
    return request;
  }

  async getSchoolVerificationRequests(schoolId: string): Promise<VerificationRequest[]> {
    return await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.schoolId, schoolId))
      .orderBy(desc(verificationRequests.createdAt));
  }

  async getPendingVerificationRequests(): Promise<VerificationRequest[]> {
    return await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.status, 'pending'))
      .orderBy(desc(verificationRequests.createdAt));
  }

  async approveVerificationRequest(
    id: string,
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<VerificationRequest | undefined> {
    const [request] = await db
      .update(verificationRequests)
      .set({
        status: 'approved' as any,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes,
      })
      .where(eq(verificationRequests.id, id))
      .returning();
    return request;
  }

  async rejectVerificationRequest(
    id: string,
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<VerificationRequest | undefined> {
    const [request] = await db
      .update(verificationRequests)
      .set({
        status: 'rejected' as any,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes,
      })
      .where(eq(verificationRequests.id, id))
      .returning();
    return request;
  }

  // Resource operations
  async createResource(resourceData: InsertResource): Promise<Resource> {
    // Sync language fields if languages array is provided
    const dataWithSync = { ...resourceData };
    if (resourceData.languages && Array.isArray(resourceData.languages) && resourceData.languages.length > 0) {
      // Map language code to name for backward compatibility
      const languageNames: Record<string, string> = {
        'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
        'it': 'Italian', 'pt': 'Portuguese', 'nl': 'Dutch', 'ar': 'Arabic',
        'zh': 'Chinese', 'el': 'Greek', 'ru': 'Russian', 'ko': 'Korean',
        'id': 'Indonesian', 'cy': 'Welsh'
      };
      dataWithSync.language = languageNames[resourceData.languages[0]] || 'English';
    }
    
    const [resource] = await db
      .insert(resources)
      .values(dataWithSync)
      .returning();
    return resource;
  }

  async getResources(filters: {
    stage?: string;
    country?: string;
    language?: string;
    ageRange?: string;
    resourceType?: string;
    theme?: string;
    search?: string;
    visibility?: 'public' | 'private';
    includeHidden?: boolean;
    includeInactive?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<Resource[]> {
    const conditions = [];
    
    // Filter out inactive resources unless explicitly included (for admin)
    if (!filters.includeInactive) {
      conditions.push(eq(resources.isActive, true));
    }
    
    // Filter out hidden resources unless explicitly included (for search)
    if (!filters.includeHidden) {
      conditions.push(eq(resources.hiddenOnResourcesPage, false));
    }
    
    if (filters.stage) {
      conditions.push(eq(resources.stage, filters.stage as any));
    }
    if (filters.country) {
      conditions.push(eq(resources.country, filters.country));
    }
    if (filters.language) {
      // Map language names to codes if needed
      const languageCodes: Record<string, string> = {
        'English': 'en', 'Spanish': 'es', 'French': 'fr', 'German': 'de',
        'Italian': 'it', 'Portuguese': 'pt', 'Dutch': 'nl', 'Arabic': 'ar',
        'Chinese': 'zh', 'Greek': 'el', 'Russian': 'ru', 'Korean': 'ko',
        'Indonesian': 'id', 'Welsh': 'cy'
      };
      
      // Convert language name to code if it's not already a 2-letter code
      const languageCode = filters.language.length === 2 
        ? filters.language 
        : (languageCodes[filters.language] || filters.language);
      
      // Check if the language exists in the languages array
      conditions.push(sql`${languageCode} = ANY(${resources.languages})`);
    }
    if (filters.ageRange) {
      conditions.push(eq(resources.ageRange, filters.ageRange));
    }
    if (filters.resourceType) {
      conditions.push(eq(resources.resourceType, filters.resourceType as any));
    }
    if (filters.theme) {
      // Support both old single theme field and new themes array
      const themeCondition = or(
        eq(resources.theme, filters.theme as any),
        sql`${filters.theme} = ANY(${resources.themes})`
      );
      if (themeCondition) {
        conditions.push(themeCondition);
      }
    }
    if (filters.visibility) {
      conditions.push(eq(resources.visibility, filters.visibility as any));
    }
    if (filters.search) {
      const searchCondition = or(
        ilike(resources.title, `%${filters.search}%`),
        ilike(resources.description, `%${filters.search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }
    
    // Sort by pinned first, then by creation date
    const query = db.select().from(resources)
      .where(and(...conditions))
      .orderBy(desc(resources.isPinned), desc(resources.createdAt))
      .limit(filters.limit ?? 1000)
      .offset(filters.offset ?? 0);
    
    return await query;
  }

  async updateResourceDownloads(id: string): Promise<void> {
    await db
      .update(resources)
      .set({ downloadCount: sql`download_count + 1` })
      .where(eq(resources.id, id));
  }

  async updateResource(id: string, updates: Partial<InsertResource>): Promise<Resource | undefined> {
    // If languages array is provided, sync the old language field with the first language
    const updatesWithSync = { ...updates };
    if (updates.languages && Array.isArray(updates.languages) && updates.languages.length > 0) {
      // Map language code to name for backward compatibility
      const languageNames: Record<string, string> = {
        'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
        'it': 'Italian', 'pt': 'Portuguese', 'nl': 'Dutch', 'ar': 'Arabic',
        'zh': 'Chinese', 'el': 'Greek', 'ru': 'Russian', 'ko': 'Korean',
        'id': 'Indonesian', 'cy': 'Welsh'
      };
      updatesWithSync.language = languageNames[updates.languages[0]] || 'English';
    }
    
    // If themes array is provided, sync the old theme field with the first theme
    if (updates.themes && Array.isArray(updates.themes) && updates.themes.length > 0) {
      updatesWithSync.theme = updates.themes[0] as any;
    }
    
    const [resource] = await db
      .update(resources)
      .set({ ...updatesWithSync, updatedAt: new Date() })
      .where(eq(resources.id, id))
      .returning();
    return resource;
  }

  async deleteResource(id: string): Promise<boolean> {
    const result = await db
      .delete(resources)
      .where(eq(resources.id, id))
      .returning();
    return result.length > 0;
  }

  async getResourceById(id: string): Promise<Resource | undefined> {
    const [resource] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, id));
    return resource;
  }

  // Resource Pack operations
  async createResourcePack(packData: InsertResourcePack): Promise<ResourcePack> {
    const [pack] = await db
      .insert(resourcePacks)
      .values(packData)
      .returning();
    return pack;
  }

  async getResourcePacks(filters: {
    stage?: string;
    theme?: string;
    visibility?: 'public' | 'private';
    limit?: number;
    offset?: number;
  } = {}): Promise<Array<ResourcePack & { resourceCount: number; previewResources: Array<Pick<Resource, 'id' | 'title' | 'fileUrl' | 'fileType'>> }>> {
    const conditions = [eq(resourcePacks.isActive, true)];
    
    if (filters.stage) {
      conditions.push(eq(resourcePacks.stage, filters.stage as any));
    }
    if (filters.theme) {
      conditions.push(eq(resourcePacks.theme, filters.theme as any));
    }
    if (filters.visibility) {
      conditions.push(eq(resourcePacks.visibility, filters.visibility as any));
    }
    
    const packsQuery = db
      .select({
        ...getTableColumns(resourcePacks),
        resourceCount: sql<number>`CAST(COUNT(DISTINCT ${resourcePackItems.resourceId}) AS INTEGER)`,
      })
      .from(resourcePacks)
      .leftJoin(resourcePackItems, eq(resourcePacks.id, resourcePackItems.packId))
      .where(and(...conditions))
      .groupBy(resourcePacks.id)
      .orderBy(desc(resourcePacks.createdAt));
    
    let query = packsQuery;
    if (filters.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters.offset) {
      query = query.offset(filters.offset) as any;
    }
    
    const packs = await query;
    
    // Fetch preview resources for each pack (first 4 resources ordered by orderIndex)
    const packsWithPreviews = await Promise.all(
      packs.map(async (pack) => {
        const previewResourcesRaw = await db
          .select({
            id: resources.id,
            title: resources.title,
            fileUrl: resources.fileUrl,
            fileType: resources.fileType,
          })
          .from(resourcePackItems)
          .innerJoin(resources, eq(resourcePackItems.resourceId, resources.id))
          .where(eq(resourcePackItems.packId, pack.id))
          .orderBy(asc(resourcePackItems.orderIndex))
          .limit(4);
        
        // Map to ensure correct shape
        const previewResources = previewResourcesRaw.map((r): Pick<Resource, 'id' | 'title' | 'fileUrl' | 'fileType'> => ({
          id: r.id,
          title: r.title,
          fileUrl: r.fileUrl,
          fileType: r.fileType,
        }));
        
        return {
          ...pack,
          previewResources,
        };
      })
    );
    
    return packsWithPreviews satisfies Array<ResourcePack & { 
      resourceCount: number; 
      previewResources: Array<Pick<Resource, 'id' | 'title' | 'fileUrl' | 'fileType'>> 
    }>;
  }

  async getResourcePackById(id: string): Promise<(ResourcePack & { resources: Resource[] }) | undefined> {
    const [pack] = await db
      .select()
      .from(resourcePacks)
      .where(eq(resourcePacks.id, id));
    
    if (!pack) {
      return undefined;
    }
    
    const packResources = await db
      .select({
        ...getTableColumns(resources),
        orderIndex: resourcePackItems.orderIndex,
      })
      .from(resourcePackItems)
      .innerJoin(resources, eq(resourcePackItems.resourceId, resources.id))
      .where(eq(resourcePackItems.packId, id))
      .orderBy(asc(resourcePackItems.orderIndex));
    
    return {
      ...pack,
      resources: packResources,
    };
  }

  async updateResourcePack(id: string, updates: Partial<InsertResourcePack>): Promise<ResourcePack | undefined> {
    const [pack] = await db
      .update(resourcePacks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resourcePacks.id, id))
      .returning();
    return pack;
  }

  async deleteResourcePack(id: string): Promise<boolean> {
    const result = await db
      .delete(resourcePacks)
      .where(eq(resourcePacks.id, id))
      .returning();
    return result.length > 0;
  }

  async addResourceToPack(packId: string, resourceId: string, orderIndex: number): Promise<ResourcePackItem> {
    const [item] = await db
      .insert(resourcePackItems)
      .values({
        packId,
        resourceId,
        orderIndex,
      })
      .returning();
    return item;
  }

  async removeResourceFromPack(packId: string, resourceId: string): Promise<boolean> {
    const result = await db
      .delete(resourcePackItems)
      .where(and(
        eq(resourcePackItems.packId, packId),
        eq(resourcePackItems.resourceId, resourceId)
      ))
      .returning();
    return result.length > 0;
  }

  async updateResourcePackDownloads(id: string): Promise<void> {
    await db
      .update(resourcePacks)
      .set({ downloadCount: sql`download_count + 1` })
      .where(eq(resourcePacks.id, id));
  }

  async updateResourcePackItemsOrder(packId: string, items: Array<{ resourceId: string; orderIndex: number }>): Promise<void> {
    // Update each resource's order index in a transaction - all succeed or all fail
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(resourcePackItems)
          .set({ orderIndex: item.orderIndex })
          .where(and(
            eq(resourcePackItems.packId, packId),
            eq(resourcePackItems.resourceId, item.resourceId)
          ));
      }
    });
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    
    // Broadcast notification update via WebSocket to eliminate polling
    // This notifies users immediately when a new notification is created
    if (notificationData.userId) {
      // User-specific notification
      const { broadcastNotificationUpdate } = await import('./websocket');
      broadcastNotificationUpdate(notificationData.userId, 'new');
    } else if (notificationData.schoolId) {
      // School-wide notification - notify all team members
      const schoolMembers = await this.getSchoolTeamMembers(notificationData.schoolId);
      const { broadcastNotificationUpdate } = await import('./websocket');
      for (const member of schoolMembers) {
        broadcastNotificationUpdate(member.id, 'new');
      }
    }
    
    return notification;
  }

  async getSchoolNotifications(schoolId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const conditions = [eq(notifications.schoolId, schoolId)];
    
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }
    
    return await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const conditions = [eq(notifications.userId, userId)];
    
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }
    
    return await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  async markAllNotificationsAsRead(schoolId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.schoolId, schoolId),
        eq(notifications.isRead, false)
      ));
  }

  async markAllNotificationsAsReadForUser(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(eq(notifications.id, id))
      .returning();
    return result.length > 0;
  }

  async getUnreadNotificationCount(schoolId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.schoolId, schoolId),
        eq(notifications.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  async getUnreadNotificationCountForUser(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  async createResourceNotifications(resourceId: string, resourceTitle: string, resourceStage: string, isUpdate: boolean = false): Promise<void> {
    // Get all schools at this stage
    const matchingSchools = await db
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.currentStage, resourceStage as any));
    
    // Create notifications for each school
    const notificationPromises = matchingSchools.map(school => 
      this.createNotification({
        schoolId: school.id,
        type: isUpdate ? 'resource_updated' : 'new_resource',
        title: isUpdate ? 'Resource Updated' : 'New Resource Available',
        message: isUpdate 
          ? `The resource "${resourceTitle}" has been updated with new content for the ${resourceStage} stage.`
          : `A new resource "${resourceTitle}" is now available for the ${resourceStage} stage.`,
        actionUrl: '/resources',
        resourceId: resourceId,
      })
    );
    
    await Promise.all(notificationPromises);
  }

  // Evidence operations
  async createEvidence(evidenceData: InsertEvidence): Promise<Evidence> {
    return evidenceStorage.createEvidence(evidenceData);
  }

  async getEvidence(id: string): Promise<Evidence | undefined> {
    return evidenceStorage.getEvidence(id);
  }

  async getEvidenceById(id: string): Promise<EvidenceWithSchool & { schoolName: string; schoolCountry: string; schoolLanguage: string | null } | undefined> {
    return evidenceStorage.getEvidenceById(id);
  }

  async getSchoolEvidence(schoolId: string): Promise<Array<Evidence & { reviewer?: { id: string | null; email: string | null; firstName: string | null; lastName: string | null; } | null }>> {
    return schoolStorage.getSchoolEvidence(schoolId);
  }

  async getPendingEvidence(): Promise<Evidence[]> {
    return evidenceStorage.getPendingEvidence();
  }

  async getAllEvidence(filters?: {
    status?: 'pending' | 'approved' | 'rejected';
    stage?: 'inspire' | 'investigate' | 'act';
    schoolId?: string;
    country?: string;
    visibility?: 'public' | 'private';
    assignedTo?: string;
  }): Promise<EvidenceWithSchool[]> {
    return evidenceStorage.getAllEvidence(filters);
  }

  async getApprovedPublicEvidence(): Promise<Evidence[]> {
    return evidenceStorage.getApprovedPublicEvidence();
  }

  async getApprovedEvidenceForInspiration(filters?: {
    stage?: string;
    country?: string;
    search?: string;
    visibility?: 'public' | 'private';
    limit?: number;
    offset?: number;
  }): Promise<Array<EvidenceWithSchool & { 
    schoolName: string;
    schoolCountry: string;
    schoolLanguage: string | null;
  }>> {
    return evidenceStorage.getApprovedEvidenceForInspiration(filters);
  }

  async getEvidenceByFileUrl(fileUrl: string): Promise<(EvidenceWithSchool & { 
    schoolName: string;
    schoolCountry: string;
    schoolLanguage: string | null;
  }) | undefined> {
    return evidenceStorage.getEvidenceByFileUrl(fileUrl);
  }

  async updateEvidenceStatus(
    id: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<Evidence | undefined> {
    return evidenceStorage.updateEvidenceStatus(id, status, reviewedBy, reviewNotes);
  }

  async assignEvidence(evidenceId: string, assignedToUserId: string | null): Promise<void> {
    return evidenceStorage.assignEvidence(evidenceId, assignedToUserId);
  }

  async updateEvidence(id: string, updates: Partial<InsertEvidence>): Promise<Evidence | undefined> {
    return evidenceStorage.updateEvidence(id, updates);
  }

  async updateEvidenceFiles(id: string, files: any[]): Promise<Evidence | undefined> {
    const [evidenceRecord] = await db
      .update(evidence)
      .set({
        files: files as any,
        updatedAt: new Date(),
      })
      .where(eq(evidence.id, id))
      .returning();
    return evidenceRecord;
  }

  async deleteEvidence(id: string): Promise<boolean> {
    return evidenceStorage.deleteEvidence(id);
  }

  async deleteSchool(id: string): Promise<boolean> {
    return schoolStorage.deleteSchool(id);
  }

  // Evidence Requirements operations
  async getEvidenceRequirements(stage?: string): Promise<EvidenceRequirement[]> {
    return evidenceStorage.getEvidenceRequirements(stage as 'inspire' | 'investigate' | 'act' | undefined);
  }

  async getEvidenceRequirement(id: string): Promise<EvidenceRequirement | undefined> {
    return evidenceStorage.getEvidenceRequirement(id);
  }

  async createEvidenceRequirement(data: InsertEvidenceRequirement): Promise<EvidenceRequirement> {
    return evidenceStorage.createEvidenceRequirement(data);
  }

  async updateEvidenceRequirement(
    id: string, 
    data: Partial<InsertEvidenceRequirement>
  ): Promise<EvidenceRequirement | undefined> {
    return evidenceStorage.updateEvidenceRequirement(id, data);
  }

  async deleteEvidenceRequirement(id: string): Promise<boolean> {
    return evidenceStorage.deleteEvidenceRequirement(id);
  }

  async getEvidenceByRequirement(requirementId: string): Promise<Evidence[]> {
    return await db
      .select()
      .from(evidence)
      .where(eq(evidence.evidenceRequirementId, requirementId))
      .orderBy(desc(evidence.submittedAt));
  }

  // Admin Evidence Override operations
  async createAdminEvidenceOverride(override: InsertAdminEvidenceOverride): Promise<AdminEvidenceOverride> {
    const [created] = await db
      .insert(adminEvidenceOverrides)
      .values(override)
      .returning();
    return created;
  }

  async getAdminEvidenceOverrides(schoolId: string, roundNumber?: number): Promise<AdminEvidenceOverride[]> {
    return schoolStorage.getAdminEvidenceOverrides(schoolId, roundNumber);
  }

  async deleteAdminEvidenceOverride(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(adminEvidenceOverrides)
        .where(eq(adminEvidenceOverrides.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Error deleting admin evidence override:", error);
      return false;
    }
  }

  async toggleAdminEvidenceOverride(
    schoolId: string, 
    evidenceRequirementId: string, 
    stage: 'inspire' | 'investigate' | 'act',
    roundNumber: number, 
    markedBy: string
  ): Promise<{ created: boolean; override: AdminEvidenceOverride | null }> {
    // Check if override already exists
    const [existing] = await db
      .select()
      .from(adminEvidenceOverrides)
      .where(
        and(
          eq(adminEvidenceOverrides.schoolId, schoolId),
          eq(adminEvidenceOverrides.evidenceRequirementId, evidenceRequirementId),
          eq(adminEvidenceOverrides.roundNumber, roundNumber)
        )
      );

    if (existing) {
      // Delete the existing override (toggle off)
      await this.deleteAdminEvidenceOverride(existing.id);
      return { created: false, override: null };
    } else {
      // Create new override (toggle on)
      const newOverride = await this.createAdminEvidenceOverride({
        schoolId,
        evidenceRequirementId,
        stage,
        roundNumber,
        markedBy
      });
      return { created: true, override: newOverride };
    }
  }

  // Progression system operations
  async getSchoolEvidenceCounts(schoolId: string): Promise<{
    inspire: { total: number; approved: number };
    investigate: { total: number; approved: number; hasQuiz: boolean; hasActionPlan: boolean };
    act: { total: number; approved: number };
  }> {
    return schoolStorage.getSchoolEvidenceCounts(schoolId);
  }

  async checkAndUpdateSchoolProgression(schoolId: string): Promise<School | undefined> {
    return schoolStorage.checkAndUpdateSchoolProgression(schoolId);
  }
  async startNewRound(schoolId: string): Promise<School | undefined> {
    return schoolStorage.startNewRound(schoolId);
  }

  // Migration function to fix schools stuck in previous rounds
  async migrateStuckSchools(): Promise<{ fixed: number; schools: string[] }> {
    return schoolStorage.migrateStuckSchools();
  }

  // Case Study operations
  async createCaseStudy(caseStudyData: InsertCaseStudy): Promise<CaseStudy> {
    return caseStudyStorage.createCaseStudy(caseStudyData);
  }

  async getCaseStudyById(id: string): Promise<CaseStudy | undefined> {
    return caseStudyStorage.getCaseStudyById(id);
  }

  async getCaseStudies(filters: {
    stage?: string;
    country?: string;
    featured?: boolean;
    search?: string;
    categories?: string[];
    tags?: string[];
    status?: 'draft' | 'published';
    limit?: number;
    offset?: number;
  } = {}): Promise<CaseStudy[]> {
    return caseStudyStorage.getCaseStudies(filters);
  }

  async updateCaseStudyFeatured(id: string, featured: boolean): Promise<CaseStudy | undefined> {
    return caseStudyStorage.updateCaseStudyFeatured(id, featured);
  }

  async updateCaseStudy(id: string, updates: Partial<InsertCaseStudy>): Promise<CaseStudy | undefined> {
    return caseStudyStorage.updateCaseStudy(id, updates);
  }

  async deleteCaseStudy(id: string): Promise<boolean> {
    return caseStudyStorage.deleteCaseStudy(id);
  }

  async getGlobalMovementData(): Promise<{
    featuredCaseStudies: CaseStudy[];
    statistics: {
      totalSchools: number;
      studentsEngaged: number;
      countriesInvolved: number;
    };
  }> {
    return caseStudyStorage.getGlobalMovementData();
  }

  async getRelatedCaseStudies(caseStudyId: string, limit: number = 4): Promise<CaseStudy[]> {
    return caseStudyStorage.getRelatedCaseStudies(caseStudyId, limit);
  }

  // Case Study Version Management
  async createCaseStudyVersion(version: InsertCaseStudyVersion): Promise<CaseStudyVersion> {
    return caseStudyStorage.createCaseStudyVersion(version);
  }

  async getCaseStudyVersions(caseStudyId: string): Promise<CaseStudyVersion[]> {
    return caseStudyStorage.getCaseStudyVersions(caseStudyId);
  }

  async getCaseStudyVersion(versionId: string): Promise<CaseStudyVersion | undefined> {
    return caseStudyStorage.getCaseStudyVersion(versionId);
  }

  // Email operations
  async logEmail(emailLogData: InsertEmailLog): Promise<EmailLog> {
    const [emailLog] = await db
      .insert(emailLogs)
      .values(emailLogData)
      .returning();
    return emailLog;
  }

  async getEmailLogs(limit: number = 50): Promise<EmailLog[]> {
    return await db
      .select()
      .from(emailLogs)
      .orderBy(desc(emailLogs.sentAt))
      .limit(limit);
  }

  // Mailchimp operations
  async createMailchimpAudience(audience: InsertMailchimpAudience): Promise<MailchimpAudience> {
    const [newAudience] = await db.insert(mailchimpAudiences).values(audience).returning();
    return newAudience;
  }

  async getMailchimpAudiences(): Promise<MailchimpAudience[]> {
    return await db.select().from(mailchimpAudiences).where(eq(mailchimpAudiences.isActive, true)).orderBy(asc(mailchimpAudiences.name));
  }

  async getMailchimpAudience(id: string): Promise<MailchimpAudience | undefined> {
    const [audience] = await db.select().from(mailchimpAudiences).where(eq(mailchimpAudiences.id, id));
    return audience;
  }

  async updateMailchimpAudience(id: string, updates: Partial<MailchimpAudience>): Promise<MailchimpAudience | undefined> {
    const [updatedAudience] = await db.update(mailchimpAudiences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mailchimpAudiences.id, id))
      .returning();
    return updatedAudience;
  }

  async deleteMailchimpAudience(id: string): Promise<void> {
    await db.delete(mailchimpAudiences).where(eq(mailchimpAudiences.id, id));
  }

  async createMailchimpSubscription(subscription: InsertMailchimpSubscription): Promise<MailchimpSubscription> {
    const [newSubscription] = await db.insert(mailchimpSubscriptions).values(subscription).returning();
    return newSubscription;
  }

  async getMailchimpSubscriptions(audienceId?: string, email?: string): Promise<MailchimpSubscription[]> {
    const conditions = [];
    if (audienceId) conditions.push(eq(mailchimpSubscriptions.audienceId, audienceId));
    if (email) conditions.push(eq(mailchimpSubscriptions.email, email));
    
    let query = db.select().from(mailchimpSubscriptions).$dynamic();
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(mailchimpSubscriptions.subscribedAt));
  }

  async updateMailchimpSubscription(id: string, updates: Partial<MailchimpSubscription>): Promise<MailchimpSubscription | undefined> {
    const [updatedSubscription] = await db.update(mailchimpSubscriptions)
      .set(updates)
      .where(eq(mailchimpSubscriptions.id, id))
      .returning();
    return updatedSubscription;
  }

  async deleteMailchimpSubscription(id: string): Promise<void> {
    await db.delete(mailchimpSubscriptions).where(eq(mailchimpSubscriptions.id, id));
  }

  async getSubscriptionsBySchool(schoolId: string): Promise<MailchimpSubscription[]> {
    return await db.select().from(mailchimpSubscriptions)
      .where(eq(mailchimpSubscriptions.schoolId, schoolId))
      .orderBy(desc(mailchimpSubscriptions.subscribedAt));
  }

  async getSubscriptionsByUser(userId: string): Promise<MailchimpSubscription[]> {
    return await db.select().from(mailchimpSubscriptions)
      .where(eq(mailchimpSubscriptions.userId, userId))
      .orderBy(desc(mailchimpSubscriptions.subscribedAt));
  }

  // Admin operations
  async getAdminStats(): Promise<{
    totalSchools: number;
    pendingEvidence: number;
    featuredCaseStudies: number;
    activeUsers: number;
    totalActions: number;
  }> {
    const [schoolStats] = await db
      .select({ totalSchools: count() })
      .from(schools);
    
    const [evidenceStats] = await db
      .select({ pendingEvidence: count() })
      .from(evidence)
      .where(eq(evidence.status, 'pending'));
    
    const [approvedEvidenceStats] = await db
      .select({
        approvedEvidence: sql<number>`count(*) filter (where status = 'approved')`,
      })
      .from(evidence);
    
    const [legacyStats] = await db
      .select({
        legacyTotal: sql<number>`coalesce(sum(legacy_evidence_count), 0)`,
      })
      .from(schoolUsers);
    
    const featuredCaseStudies = await caseStudyStorage.getFeaturedCaseStudiesCount();
    
    const [userStats] = await db
      .select({ activeUsers: count() })
      .from(users);
    
    const totalActions = Number(approvedEvidenceStats?.approvedEvidence || 0) + Number(legacyStats?.legacyTotal || 0);
    
    return {
      totalSchools: schoolStats.totalSchools,
      pendingEvidence: evidenceStats.pendingEvidence,
      featuredCaseStudies,
      activeUsers: userStats.activeUsers,
      totalActions,
    };
  }

  async getAllUsersWithSchools(): Promise<Array<{ 
    user: User; 
    schools: Array<School & { role: string }> 
  }>> {
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(asc(users.firstName), asc(users.lastName));

    const usersWithSchools = await Promise.all(
      allUsers.map(async (user) => {
        const userSchools = await db
          .select({
            ...getTableColumns(schools),
            role: schoolUsers.role,
          })
          .from(schools)
          .innerJoin(schoolUsers, eq(schoolUsers.schoolId, schools.id))
          .where(eq(schoolUsers.userId, user.id));

        return {
          user,
          schools: userSchools.map(s => ({
            ...s,
            role: s.role || 'teacher',
          })),
        };
      })
    );

    return usersWithSchools;
  }

  async getUsersWithSchoolsPaginated(params: {
    limit?: number;
    offset?: number;
    search?: string;
    interactionFilter?: 'all' | 'interacted' | 'not-interacted';
    schoolFilter?: 'all' | 'with-schools' | 'without-schools';
  }): Promise<{
    users: Array<{ user: User; schools: Array<School & { role: string }> }>;
    total: number;
    limit: number;
    offset: number;
  }> {
    const {
      limit = 50,
      offset = 0,
      search = '',
      interactionFilter = 'all',
      schoolFilter = 'all',
    } = params;

    // Build a subquery that includes school count for filtering
    const userSchoolCountSubquery = db
      .select({
        userId: schoolUsers.userId,
        schoolCount: sql<number>`COUNT(${schoolUsers.schoolId})`.as('school_count'),
      })
      .from(schoolUsers)
      .groupBy(schoolUsers.userId)
      .as('user_school_counts');

    // Build filter conditions for the main user query
    const conditions = [];
    
    // Search filter (name or email)
    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${users.firstName}) LIKE ${searchTerm}`,
          sql`LOWER(${users.lastName}) LIKE ${searchTerm}`,
          sql`LOWER(${users.email}) LIKE ${searchTerm}`,
          sql`LOWER(CONCAT(${users.firstName}, ' ', ${users.lastName})) LIKE ${searchTerm}`
        )
      );
    }

    // Interaction filter
    if (interactionFilter === 'interacted') {
      conditions.push(eq(users.hasInteracted, true));
    } else if (interactionFilter === 'not-interacted') {
      conditions.push(or(eq(users.hasInteracted, false), sql`${users.hasInteracted} IS NULL`));
    }

    // School filter - applied via LEFT JOIN and WHERE
    let baseQuery = db.select({
      ...getTableColumns(users),
      schoolCount: sql<number>`COALESCE(${userSchoolCountSubquery.schoolCount}, 0)`.as('school_count'),
    })
    .from(users)
    .leftJoin(userSchoolCountSubquery, eq(users.id, userSchoolCountSubquery.userId));

    // Apply school filter to conditions
    if (schoolFilter === 'with-schools') {
      conditions.push(sql`COALESCE(${userSchoolCountSubquery.schoolCount}, 0) > 0`);
    } else if (schoolFilter === 'without-schools') {
      conditions.push(sql`COALESCE(${userSchoolCountSubquery.schoolCount}, 0) = 0`);
    }

    // Apply WHERE conditions (including school filter)
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions)) as any;
    }

    // Get total count with same filters
    const countQuery = baseQuery.as('filtered_users');
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(countQuery);
    const totalCount = Number(countResult?.count || 0);

    // Get paginated users with same filters
    const paginatedUsers = await baseQuery
      .orderBy(asc(users.firstName), asc(users.lastName))
      .limit(limit)
      .offset(offset);

    // Get schools for each user
    const usersWithSchools = await Promise.all(
      paginatedUsers.map(async (user) => {
        const userSchools = await db
          .select({
            ...getTableColumns(schools),
            role: schoolUsers.role,
          })
          .from(schools)
          .innerJoin(schoolUsers, eq(schoolUsers.schoolId, schools.id))
          .where(eq(schoolUsers.userId, user.id));

        return {
          user,
          schools: userSchools.map(s => ({
            ...s,
            role: s.role || 'teacher',
          })),
        };
      })
    );

    return {
      users: usersWithSchools,
      total: totalCount,
      limit,
      offset,
    };
  }

  // Analytics implementations
  async getAnalyticsOverview(startDate?: string, endDate?: string): Promise<{
    totalSchools: number;
    totalUsers: number;
    totalEvidence: number;
    completedAwards: number;
    pendingEvidence: number;
    averageProgress: number;
    studentsImpacted: number;
    countriesReached: number;
  }> {
    // Build date filter conditions
    const schoolDateFilter = startDate && endDate 
      ? sql`created_at >= ${startDate}::timestamp AND created_at < (${endDate}::timestamp + INTERVAL '1 day')`
      : sql`true`;
    
    const userDateFilter = startDate && endDate
      ? sql`created_at >= ${startDate}::timestamp AND created_at < (${endDate}::timestamp + INTERVAL '1 day')`
      : sql`true`;
    
    const evidenceDateFilter = startDate && endDate
      ? sql`submitted_at >= ${startDate}::timestamp AND submitted_at < (${endDate}::timestamp + INTERVAL '1 day')`
      : sql`true`;

    // Get individual metrics separately to avoid complex subquery issues
    const [schoolsCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(schools).where(schoolDateFilter);
    const [usersCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(users).where(userDateFilter);
    const [evidenceCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(evidence).where(evidenceDateFilter);
    
    // Count schools that have completed at least one round (became "plastic clever")
    const [completedAwardsCount] = await db.select({ 
      count: sql<number>`COUNT(*) FILTER (WHERE rounds_completed >= 1)` 
    }).from(schools).where(schoolDateFilter);
    
    const [pendingCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(evidence).where(and(eq(evidence.status, 'pending'), evidenceDateFilter));
    const [avgProgress] = await db.select({ avg: sql<number>`COALESCE(AVG(progress_percentage), 0)` }).from(schools).where(schoolDateFilter);
    const [studentsSum] = await db.select({ sum: sql<number>`COALESCE(SUM(student_count), 0)` }).from(schools).where(schoolDateFilter);
    const [countriesCount] = await db.select({ count: sql<number>`COUNT(DISTINCT country)` }).from(schools).where(schoolDateFilter);

    return {
      totalSchools: schoolsCount?.count || 0,
      totalUsers: usersCount?.count || 0,
      totalEvidence: evidenceCount?.count || 0,
      completedAwards: completedAwardsCount?.count || 0,
      pendingEvidence: pendingCount?.count || 0,
      averageProgress: avgProgress?.avg || 0,
      studentsImpacted: studentsSum?.sum || 0,
      countriesReached: countriesCount?.count || 0,
    };
  }

  async getSchoolProgressAnalytics(startDate?: string, endDate?: string): Promise<{
    stageDistribution: Array<{ stage: string; count: number }>;
    progressRanges: Array<{ range: string; count: number }>;
    completionRates: Array<{ metric: string; rate: number }>;
    monthlyRegistrations: Array<{ month: string; count: number }>;
    schoolsByCountry: Array<{ country: string; count: number; students: number }>;
  }> {
    // Build date filter condition
    const dateFilter = startDate && endDate
      ? sql`created_at >= ${startDate}::timestamp AND created_at < (${endDate}::timestamp + INTERVAL '1 day')`
      : sql`true`;

    // Stage distribution
    const stageDistribution = await db
      .select({
        stage: schools.currentStage,
        count: count()
      })
      .from(schools)
      .where(dateFilter)
      .groupBy(schools.currentStage);

    // Progress ranges
    const progressRanges = await db
      .select({
        range: sql<string>`CASE 
          WHEN progress_percentage = 0 THEN 'Not Started'
          WHEN progress_percentage <= 25 THEN '1-25%'
          WHEN progress_percentage <= 50 THEN '26-50%'
          WHEN progress_percentage <= 75 THEN '51-75%'
          WHEN progress_percentage <= 99 THEN '76-99%'
          ELSE 'Completed'
        END`,
        count: count()
      })
      .from(schools)
      .where(dateFilter)
      .groupBy(sql`CASE 
        WHEN progress_percentage = 0 THEN 'Not Started'
        WHEN progress_percentage <= 25 THEN '1-25%'
        WHEN progress_percentage <= 50 THEN '26-50%'
        WHEN progress_percentage <= 75 THEN '51-75%'
        WHEN progress_percentage <= 99 THEN '76-99%'
        ELSE 'Completed'
      END`);

    // Completion rates
    const [completionData] = await db
      .select({
        inspire: sql<number>`COUNT(*) FILTER (WHERE inspire_completed = true)`,
        investigate: sql<number>`COUNT(*) FILTER (WHERE investigate_completed = true)`,
        act: sql<number>`COUNT(*) FILTER (WHERE act_completed = true)`,
        award: sql<number>`COUNT(*) FILTER (WHERE award_completed = true)`,
        total: count()
      })
      .from(schools)
      .where(dateFilter);

    const completionRates = [
      { metric: 'Inspire', rate: (completionData.inspire / completionData.total) * 100 },
      { metric: 'Investigate', rate: (completionData.investigate / completionData.total) * 100 },
      { metric: 'Act', rate: (completionData.act / completionData.total) * 100 },
      { metric: 'Award', rate: (completionData.award / completionData.total) * 100 }
    ];

    // Monthly registrations - use date filter or default to last 12 months
    const monthlyRegistrationsFilter = startDate && endDate
      ? dateFilter
      : sql`created_at >= NOW() - INTERVAL '12 months'`;
    
    const monthlyRegistrations = await db
      .select({
        month: sql<string>`TO_CHAR(created_at, 'YYYY-MM')`,
        count: count()
      })
      .from(schools)
      .where(monthlyRegistrationsFilter)
      .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(created_at, 'YYYY-MM')`);

    // Schools by country
    const schoolsByCountry = await db
      .select({
        country: schools.country,
        count: count(),
        students: sql<number>`COALESCE(SUM(student_count), 0)`
      })
      .from(schools)
      .where(dateFilter)
      .groupBy(schools.country)
      .orderBy(desc(count()));

    return {
      stageDistribution: stageDistribution.map(s => ({ stage: s.stage || '', count: s.count })),
      progressRanges: progressRanges ?? [],
      completionRates: completionRates ?? [],
      monthlyRegistrations: monthlyRegistrations ?? [],
      schoolsByCountry: schoolsByCountry ?? []
    };
  }

  async getEvidenceAnalytics(startDate?: string, endDate?: string): Promise<{
    submissionTrends: Array<{ month: string; submissions: number; approvals: number; rejections: number }>;
    stageBreakdown: Array<{ stage: string; total: number; approved: number; pending: number; rejected: number }>;
    reviewTurnaround: Array<{ range: string; count: number }>;
    topSubmitters: Array<{ schoolName: string; submissions: number; approvalRate: number }>;
  }> {
    // Build date filter condition
    const dateFilter = startDate && endDate
      ? sql`submitted_at >= ${startDate}::timestamp AND submitted_at < (${endDate}::timestamp + INTERVAL '1 day')`
      : sql`true`;

    // Submission trends - use date filter or default to last 12 months
    const submissionTrendsFilter = startDate && endDate
      ? dateFilter
      : sql`submitted_at >= NOW() - INTERVAL '12 months'`;
    
    const submissionTrends = await db
      .select({
        month: sql<string>`TO_CHAR(submitted_at, 'YYYY-MM')`,
        submissions: count(),
        approvals: sql<number>`COUNT(*) FILTER (WHERE status = 'approved')`,
        rejections: sql<number>`COUNT(*) FILTER (WHERE status = 'rejected')`
      })
      .from(evidence)
      .where(submissionTrendsFilter)
      .groupBy(sql`TO_CHAR(submitted_at, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(submitted_at, 'YYYY-MM')`);

    // Stage breakdown
    const stageBreakdown = await db
      .select({
        stage: evidence.stage,
        total: count(),
        approved: sql<number>`COUNT(*) FILTER (WHERE status = 'approved')`,
        pending: sql<number>`COUNT(*) FILTER (WHERE status = 'pending')`,
        rejected: sql<number>`COUNT(*) FILTER (WHERE status = 'rejected')`
      })
      .from(evidence)
      .where(dateFilter)
      .groupBy(evidence.stage);

    // Review turnaround (for completed reviews)
    // First, count total reviewed items to ensure sufficient data
    const reviewConditions = [
      sql`reviewed_at IS NOT NULL`,
      sql`submitted_at IS NOT NULL`,
      sql`reviewed_at >= submitted_at`
    ];
    
    if (startDate && endDate) {
      reviewConditions.push(sql`reviewed_at >= ${startDate}::timestamp AND reviewed_at < (${endDate}::timestamp + INTERVAL '1 day')`);
    }
    
    const reviewedCountResult = await db
      .select({
        count: count()
      })
      .from(evidence)
      .where(and(...reviewConditions));
    
    const reviewedCount = reviewedCountResult[0]?.count || 0;
    
    // Only calculate turnaround if we have at least 5 reviewed items (sufficient data)
    let reviewTurnaround: Array<{ range: string; count: number }> = [];
    
    if (reviewedCount >= 5) {
      reviewTurnaround = await db
        .select({
          range: sql<string>`CASE 
            WHEN EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/86400 <= 1 THEN 'Same day'
            WHEN EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/86400 <= 3 THEN '1-3 days'
            WHEN EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/86400 <= 7 THEN '4-7 days'
            WHEN EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/86400 <= 14 THEN '1-2 weeks'
            ELSE 'Over 2 weeks'
          END`,
          count: count()
        })
        .from(evidence)
        .where(and(...reviewConditions))
        .groupBy(sql`CASE 
          WHEN EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/86400 <= 1 THEN 'Same day'
          WHEN EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/86400 <= 3 THEN '1-3 days'
          WHEN EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/86400 <= 7 THEN '4-7 days'
          WHEN EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/86400 <= 14 THEN '1-2 weeks'
          ELSE 'Over 2 weeks'
        END`);
    }

    // Top submitting schools
    const topSubmitters = await db
      .select({
        schoolName: schools.name,
        submissions: count(),
        approvalRate: sql<number>`(COUNT(*) FILTER (WHERE evidence.status = 'approved') * 100.0 / COUNT(*))`
      })
      .from(evidence)
      .innerJoin(schools, eq(evidence.schoolId, schools.id))
      .where(dateFilter)
      .groupBy(schools.id, schools.name)
      .having(sql`COUNT(*) >= 3`)
      .orderBy(desc(count()))
      .limit(10);

    return {
      submissionTrends,
      stageBreakdown,
      reviewTurnaround,
      topSubmitters
    };
  }

  async getUserEngagementAnalytics(startDate?: string, endDate?: string): Promise<{
    registrationTrends: Array<{ month: string; teachers: number; admins: number }>;
    roleDistribution: Array<{ role: string; count: number }>;
    activeUsers: Array<{ period: string; active: number }>;
    schoolEngagement: Array<{ schoolName: string; users: number; evidence: number; lastActivity: Date }>;
  }> {
    // Build date filter conditions
    const userDateFilter = startDate && endDate
      ? sql`created_at >= ${startDate}::timestamp AND created_at < (${endDate}::timestamp + INTERVAL '1 day')`
      : sql`true`;
    
    const evidenceDateFilter = startDate && endDate
      ? sql`submitted_at >= ${startDate}::timestamp AND submitted_at < (${endDate}::timestamp + INTERVAL '1 day')`
      : sql`true`;

    // Registration trends - use date filter or default to last 12 months
    const registrationTrendsFilter = startDate && endDate
      ? userDateFilter
      : sql`created_at >= NOW() - INTERVAL '12 months'`;
    
    const registrationTrends = await db
      .select({
        month: sql<string>`TO_CHAR(created_at, 'YYYY-MM')`,
        teachers: sql<number>`COUNT(*) FILTER (WHERE role = 'teacher')`,
        admins: sql<number>`COUNT(*) FILTER (WHERE is_admin = true)`
      })
      .from(users)
      .where(registrationTrendsFilter)
      .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(created_at, 'YYYY-MM')`);

    // Role distribution - filter by user creation date
    const roleDistribution = await db
      .select({
        role: sql<string>`
          CASE 
            WHEN is_admin = true THEN 'Admin'
            WHEN role = 'teacher' THEN 'Teacher'
            WHEN role = 'head_teacher' THEN 'Head Teacher'
            WHEN role = 'pending_teacher' THEN 'Pending Teacher'
            ELSE COALESCE(role, 'Other')
          END
        `,
        count: count()
      })
      .from(users)
      .where(userDateFilter)
      .groupBy(sql`
        CASE 
          WHEN is_admin = true THEN 'Admin'
          WHEN role = 'teacher' THEN 'Teacher'
          WHEN role = 'head_teacher' THEN 'Head Teacher'
          WHEN role = 'pending_teacher' THEN 'Pending Teacher'
          ELSE COALESCE(role, 'Other')
        END
      `);

    // Active users (based on evidence submissions) - use evidence date filter or default periods
    const activeUsersFilter7Days = startDate && endDate
      ? evidenceDateFilter
      : sql`submitted_at >= NOW() - INTERVAL '7 days'`;
    
    const activeUsersFilter30Days = startDate && endDate
      ? evidenceDateFilter
      : sql`submitted_at >= NOW() - INTERVAL '30 days'`;
    
    const activeUsersFilter90Days = startDate && endDate
      ? evidenceDateFilter
      : sql`submitted_at >= NOW() - INTERVAL '90 days'`;
    
    const activeUsers = [
      {
        period: 'Last 7 days',
        active: (await db
          .select({ count: sql<number>`COUNT(DISTINCT submitted_by)` })
          .from(evidence)
          .where(activeUsersFilter7Days))[0].count
      },
      {
        period: 'Last 30 days',
        active: (await db
          .select({ count: sql<number>`COUNT(DISTINCT submitted_by)` })
          .from(evidence)
          .where(activeUsersFilter30Days))[0].count
      },
      {
        period: 'Last 90 days',
        active: (await db
          .select({ count: sql<number>`COUNT(DISTINCT submitted_by)` })
          .from(evidence)
          .where(activeUsersFilter90Days))[0].count
      }
    ];

    // School engagement - filter evidence by date
    const schoolEngagement = await db
      .select({
        schoolName: schools.name,
        users: sql<number>`COUNT(DISTINCT school_users.user_id)`,
        evidence: sql<number>`COUNT(DISTINCT CASE WHEN ${evidenceDateFilter} THEN evidence.id END)`,
        lastActivity: sql<Date>`GREATEST(MAX(evidence.submitted_at), MAX(school_users.created_at))`
      })
      .from(schools)
      .leftJoin(schoolUsers, eq(schoolUsers.schoolId, schools.id))
      .leftJoin(evidence, eq(evidence.schoolId, schools.id))
      .groupBy(schools.id, schools.name)
      .orderBy(desc(sql`GREATEST(MAX(evidence.submitted_at), MAX(school_users.created_at))`))
      .limit(20);

    return {
      registrationTrends,
      roleDistribution,
      activeUsers,
      schoolEngagement
    };
  }

  async getResourceAnalytics(): Promise<{
    downloadTrends: Array<{ month: string; downloads: number }>;
    popularResources: Array<{ title: string; downloads: number; stage: string }>;
    resourcesByStage: Array<{ stage: string; count: number; totalDownloads: number }>;
    resourcesByCountry: Array<{ country: string; resources: number; downloads: number }>;
  }> {
    // Download trends (last 12 months) - using created_at as proxy since we don't have download timestamps
    const downloadTrends = await db
      .select({
        month: sql<string>`TO_CHAR(created_at, 'YYYY-MM')`,
        downloads: sql<number>`SUM(download_count)`
      })
      .from(resources)
      .where(sql`created_at >= NOW() - INTERVAL '12 months'`)
      .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(created_at, 'YYYY-MM')`);

    // Popular resources
    const popularResources = await db
      .select({
        title: resources.title,
        downloads: sql<number>`COALESCE(${resources.downloadCount}, 0)`,
        stage: resources.stage
      })
      .from(resources)
      .where(eq(resources.isActive, true))
      .orderBy(desc(resources.downloadCount))
      .limit(10);

    // Resources by stage
    const resourcesByStage = await db
      .select({
        stage: resources.stage,
        count: count(),
        totalDownloads: sql<number>`SUM(download_count)`
      })
      .from(resources)
      .where(eq(resources.isActive, true))
      .groupBy(resources.stage);

    // Resources by country
    const resourcesByCountry = await db
      .select({
        country: sql<string>`COALESCE(resources.country, 'Global')`,
        resources: count(),
        downloads: sql<number>`SUM(download_count)`
      })
      .from(resources)
      .where(eq(resources.isActive, true))
      .groupBy(sql`COALESCE(resources.country, 'Global')`)
      .orderBy(desc(sql`SUM(download_count)`));

    return {
      downloadTrends: downloadTrends ?? [],
      popularResources: popularResources.map(r => ({ 
        title: r.title, 
        downloads: r.downloads, 
        stage: r.stage || '' 
      })),
      resourcesByStage: resourcesByStage ?? [],
      resourcesByCountry: resourcesByCountry ?? []
    };
  }

  async getEmailAnalytics(): Promise<{
    deliveryStats: Array<{ date: string; sent: number; delivered: number }>;
    templatePerformance: Array<{ template: string; sent: number; successRate: number }>;
    recentActivity: Array<{ date: string; template: string; recipient: string; status: string }>;
  }> {
    // Delivery stats (last 30 days)
    const deliveryStats = await db
      .select({
        date: sql<string>`TO_CHAR(sent_at, 'YYYY-MM-DD')`,
        sent: count(),
        delivered: sql<number>`COUNT(*) FILTER (WHERE status = 'sent')`
      })
      .from(emailLogs)
      .where(sql`sent_at >= NOW() - INTERVAL '30 days'`)
      .groupBy(sql`TO_CHAR(sent_at, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(sent_at, 'YYYY-MM-DD')`);

    // Template performance
    const templatePerformance = await db
      .select({
        template: sql<string>`COALESCE(template, 'Unknown')`,
        sent: count(),
        successRate: sql<number>`(COUNT(*) FILTER (WHERE status = 'sent') * 100.0 / COUNT(*))`
      })
      .from(emailLogs)
      .groupBy(sql`COALESCE(template, 'Unknown')`)
      .orderBy(desc(count()));

    // Recent activity
    const recentActivity = await db
      .select({
        date: sql<string>`TO_CHAR(sent_at, 'YYYY-MM-DD HH24:MI')`,
        template: sql<string>`COALESCE(template, 'Direct Email')`,
        recipient: emailLogs.recipientEmail,
        status: sql<string>`COALESCE(${emailLogs.status}, 'unknown')`
      })
      .from(emailLogs)
      .orderBy(desc(emailLogs.sentAt))
      .limit(50);

    return {
      deliveryStats: deliveryStats ?? [],
      templatePerformance: templatePerformance ?? [],
      recentActivity: recentActivity ?? []
    };
  }

  async getGeographicAnalytics(): Promise<{
    schoolsByRegion: Array<{ country: string; schools: number; students: number; progress: number }>;
    globalReach: {
      totalCountries: number;
      totalCities: number;
      coordinates: Array<{ lat: number; lng: number; schoolCount: number; country: string }>;
    };
  }> {
    // Schools by region
    const schoolsByRegion = await db
      .select({
        country: schools.country,
        schools: count(),
        students: sql<number>`COALESCE(SUM(student_count), 0)`,
        progress: sql<number>`AVG(progress_percentage)`
      })
      .from(schools)
      .groupBy(schools.country)
      .orderBy(desc(count()));

    // Global reach summary
    const [globalSummary] = await db
      .select({
        totalCountries: sql<number>`COUNT(DISTINCT country)`,
        totalCities: sql<number>`COUNT(DISTINCT COALESCE(address, 'Unknown'))`
      })
      .from(schools);

    // School coordinates (for mapping)
    const coordinates = await db
      .select({
        lat: sql<number>`latitude::float`,
        lng: sql<number>`longitude::float`,
        schoolCount: count(),
        country: schools.country
      })
      .from(schools)
      .where(and(
        sql`latitude IS NOT NULL`,
        sql`longitude IS NOT NULL`
      ))
      .groupBy(schools.latitude, schools.longitude, schools.country)
      .limit(100);

    return {
      schoolsByRegion,
      globalReach: {
        totalCountries: globalSummary.totalCountries,
        totalCities: globalSummary.totalCities,
        coordinates
      }
    };
  }

  async getSchoolAnalytics(schoolId: string): Promise<{
    submissionTrends: Array<{ month: string; count: number }>;
    teamContributions: Array<{ userId: string; userName: string; submissionCount: number; approvedCount: number }>;
    stageTimeline: Array<{ stage: 'inspire' | 'investigate' | 'act'; completedAt: string | null; daysToComplete: number | null }>;
    reviewStats: {
      averageReviewTimeHours: number;
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
    };
    fileTypeDistribution: {
      images: number;
      videos: number;
      pdfs: number;
      other: number;
    };
  }> {
    // Submission trends (last 6 months)
    const submissionTrendsRaw = await db
      .select({
        month: sql<string>`TO_CHAR(submitted_at, 'Mon YYYY')`,
        count: count()
      })
      .from(evidence)
      .where(and(
        eq(evidence.schoolId, schoolId),
        sql`submitted_at >= NOW() - INTERVAL '6 months'`
      ))
      .groupBy(sql`TO_CHAR(submitted_at, 'Mon YYYY')`, sql`DATE_TRUNC('month', submitted_at)`)
      .orderBy(sql`DATE_TRUNC('month', submitted_at)`);

    // Team contributions (submissions and approvals by user)
    const teamContributionsRaw = await db
      .select({
        userId: evidence.submittedBy,
        submissionCount: count(),
        approvedCount: sql<number>`COUNT(*) FILTER (WHERE status = 'approved')`
      })
      .from(evidence)
      .where(eq(evidence.schoolId, schoolId))
      .groupBy(evidence.submittedBy);

    // Get user names for team contributions
    const userIds = teamContributionsRaw.map(t => t.userId);
    const userMap = new Map<string, { firstName: string | null; lastName: string | null }>();
    
    if (userIds.length > 0) {
      const usersData = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName
        })
        .from(users)
        .where(inArray(users.id, userIds));
      
      usersData.forEach(u => {
        userMap.set(u.id, { firstName: u.firstName, lastName: u.lastName });
      });
    }

    const teamContributions = teamContributionsRaw.map(t => {
      const user = userMap.get(t.userId);
      const userName = user 
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User'
        : 'Unknown User';
      
      return {
        userId: t.userId,
        userName,
        submissionCount: t.submissionCount,
        approvedCount: t.approvedCount
      };
    });

    // Stage timeline (based on first approved evidence for each stage)
    const stageCompletionData = await db
      .select({
        stage: evidence.stage,
        completedAt: sql<string>`MIN(reviewed_at)::text`
      })
      .from(evidence)
      .where(and(
        eq(evidence.schoolId, schoolId),
        eq(evidence.status, 'approved'),
        sql`reviewed_at IS NOT NULL`
      ))
      .groupBy(evidence.stage);

    // Get school creation date for calculating days to complete
    const school = await this.getSchool(schoolId);
    const schoolCreatedAt = school?.createdAt || new Date();

    const stageMap = new Map(stageCompletionData.map(s => [s.stage, s.completedAt]));
    
    const stageTimeline = (['inspire', 'investigate', 'act'] as const).map(stage => {
      const completedAt = stageMap.get(stage) || null;
      let daysToComplete = null;
      
      if (completedAt) {
        const completedDate = new Date(completedAt);
        const startDate = new Date(schoolCreatedAt);
        daysToComplete = Math.floor((completedDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      return {
        stage,
        completedAt,
        daysToComplete
      };
    });

    // Review stats
    const reviewStatsRaw = await db
      .select({
        status: evidence.status,
        count: count(),
        avgReviewHours: sql<number>`AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at)) / 3600)`
      })
      .from(evidence)
      .where(eq(evidence.schoolId, schoolId))
      .groupBy(evidence.status);

    let averageReviewTimeHours = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    reviewStatsRaw.forEach(stat => {
      if (stat.status === 'pending') pendingCount = stat.count;
      if (stat.status === 'approved') {
        approvedCount = stat.count;
        averageReviewTimeHours = stat.avgReviewHours || 0;
      }
      if (stat.status === 'rejected') rejectedCount = stat.count;
    });

    // File type distribution
    const evidenceFiles = await db
      .select({
        files: evidence.files
      })
      .from(evidence)
      .where(eq(evidence.schoolId, schoolId));

    let images = 0;
    let videos = 0;
    let pdfs = 0;
    let other = 0;

    evidenceFiles.forEach(e => {
      const files = Array.isArray(e.files) ? e.files : [];
      files.forEach((file: any) => {
        const url = file.url || file.publicUrl || '';
        const lowerUrl = url.toLowerCase();
        
        if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
          images++;
        } else if (lowerUrl.match(/\.(mp4|mov|avi|webm|mkv)$/)) {
          videos++;
        } else if (lowerUrl.match(/\.pdf$/)) {
          pdfs++;
        } else if (url) {
          other++;
        }
      });
    });

    return {
      submissionTrends: submissionTrendsRaw.map(t => ({
        month: t.month,
        count: t.count
      })),
      teamContributions,
      stageTimeline,
      reviewStats: {
        averageReviewTimeHours: Math.round(averageReviewTimeHours * 10) / 10,
        pendingCount,
        approvedCount,
        rejectedCount
      },
      fileTypeDistribution: {
        images,
        videos,
        pdfs,
        other
      }
    };
  }

  // Helper method to check if PostgreSQL full-text search is available
  private async isFullTextSearchAvailable(): Promise<boolean> {
    try {
      await db.execute(sql`SELECT to_tsvector('english', 'test')`);
      return true;
    } catch {
      return false;
    }
  }

  // Helper method to sanitize search query
  private sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }
    return query.trim().slice(0, 100); // Limit query length and trim
  }

  // Advanced search implementation with PostgreSQL full-text search and fallback
  async searchGlobal(query: string, options: {
    contentTypes?: ('resources' | 'schools' | 'evidence' | 'caseStudies')[];
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    resources: Resource[];
    schools: School[];
    evidence: Evidence[];
    caseStudies: CaseStudy[];
    totalResults: number;
  }> {
    const { contentTypes = ['resources', 'schools', 'evidence', 'caseStudies'], limit = 50, offset = 0 } = options;
    const sanitizedQuery = this.sanitizeSearchQuery(query);
    
    if (!sanitizedQuery) {
      return {
        resources: [],
        schools: [],
        evidence: [],
        caseStudies: [],
        totalResults: 0
      };
    }

    const results = {
      resources: [] as Resource[],
      schools: [] as School[],
      evidence: [] as Evidence[],
      caseStudies: [] as CaseStudy[],
      totalResults: 0
    };

    const perTypeLimit = Math.floor(limit / contentTypes.length);
    const useFullTextSearch = await this.isFullTextSearchAvailable();

    try {
      // Search resources
      if (contentTypes.includes('resources')) {
        results.resources = await this.searchResources(sanitizedQuery, perTypeLimit, offset, useFullTextSearch);
      }

      // Search schools
      if (contentTypes.includes('schools')) {
        results.schools = await this.searchSchools(sanitizedQuery, perTypeLimit, offset, useFullTextSearch);
      }

      // Search evidence
      if (contentTypes.includes('evidence')) {
        results.evidence = await this.searchEvidence(sanitizedQuery, perTypeLimit, offset, useFullTextSearch);
      }

      // Search case studies
      if (contentTypes.includes('caseStudies')) {
        results.caseStudies = await this.searchCaseStudies(sanitizedQuery, perTypeLimit, offset, useFullTextSearch);
      }

      results.totalResults = results.resources.length + results.schools.length + results.evidence.length + results.caseStudies.length;
      return results;
    } catch (error) {
      console.error('Error in searchGlobal:', error);
      // Fall back to basic search on error
      return await this.searchGlobalFallback(sanitizedQuery, options);
    }
  }

  // Individual search methods for each content type
  private async searchResources(query: string, limit: number, offset: number, useFullTextSearch: boolean): Promise<Resource[]> {
    try {
      if (useFullTextSearch) {
        return await db
          .select()
          .from(resources)
          .where(
            and(
              eq(resources.isActive, true),
              sql`to_tsvector('english', ${resources.title} || ' ' || coalesce(${resources.description}, '')) @@ websearch_to_tsquery('english', ${query})`
            )
          )
          .orderBy(
            sql`ts_rank(to_tsvector('english', ${resources.title} || ' ' || coalesce(${resources.description}, '')), websearch_to_tsquery('english', ${query})) desc`
          )
          .limit(limit)
          .offset(offset);
      } else {
        // Fallback to ILIKE search
        return await db
          .select()
          .from(resources)
          .where(
            and(
              eq(resources.isActive, true),
              or(
                ilike(resources.title, `%${query}%`),
                ilike(resources.description, `%${query}%`)
              )
            )
          )
          .orderBy(desc(resources.createdAt))
          .limit(limit)
          .offset(offset);
      }
    } catch (error) {
      console.error('Error searching resources:', error);
      // Ultimate fallback
      return await db
        .select()
        .from(resources)
        .where(
          and(
            eq(resources.isActive, true),
            ilike(resources.title, `%${query}%`)
          )
        )
        .limit(limit)
        .offset(offset);
    }
  }

  private async searchSchools(query: string, limit: number, offset: number, useFullTextSearch: boolean): Promise<School[]> {
    try {
      if (useFullTextSearch) {
        return await db
          .select()
          .from(schools)
          .where(
            sql`to_tsvector('english', ${schools.name} || ' ' || coalesce(${schools.address}, '') || ' ' || ${schools.country}) @@ websearch_to_tsquery('english', ${query})`
          )
          .orderBy(
            sql`ts_rank(to_tsvector('english', ${schools.name} || ' ' || coalesce(${schools.address}, '') || ' ' || ${schools.country}), websearch_to_tsquery('english', ${query})) desc`
          )
          .limit(limit)
          .offset(offset);
      } else {
        // Fallback to ILIKE search
        return await db
          .select()
          .from(schools)
          .where(
            or(
              ilike(schools.name, `%${query}%`),
              ilike(schools.address, `%${query}%`),
              ilike(schools.country, `%${query}%`)
            )
          )
          .orderBy(desc(schools.createdAt))
          .limit(limit)
          .offset(offset);
      }
    } catch (error) {
      console.error('Error searching schools:', error);
      // Ultimate fallback
      return await db
        .select()
        .from(schools)
        .where(ilike(schools.name, `%${query}%`))
        .limit(limit)
        .offset(offset);
    }
  }

  private async searchEvidence(query: string, limit: number, offset: number, useFullTextSearch: boolean): Promise<Evidence[]> {
    try {
      if (useFullTextSearch) {
        return await db
          .select()
          .from(evidence)
          .where(
            and(
              eq(evidence.visibility, 'public'),
              sql`to_tsvector('english', ${evidence.title} || ' ' || coalesce(${evidence.description}, '')) @@ websearch_to_tsquery('english', ${query})`
            )
          )
          .orderBy(
            sql`ts_rank(to_tsvector('english', ${evidence.title} || ' ' || coalesce(${evidence.description}, '')), websearch_to_tsquery('english', ${query})) desc`
          )
          .limit(limit)
          .offset(offset);
      } else {
        // Fallback to ILIKE search
        return await db
          .select()
          .from(evidence)
          .where(
            and(
              eq(evidence.visibility, 'public'),
              or(
                ilike(evidence.title, `%${query}%`),
                ilike(evidence.description, `%${query}%`)
              )
            )
          )
          .orderBy(desc(evidence.submittedAt))
          .limit(limit)
          .offset(offset);
      }
    } catch (error) {
      console.error('Error searching evidence:', error);
      // Ultimate fallback
      return await db
        .select()
        .from(evidence)
        .where(
          and(
            eq(evidence.visibility, 'public'),
            ilike(evidence.title, `%${query}%`)
          )
        )
        .limit(limit)
        .offset(offset);
    }
  }

  private async searchCaseStudies(query: string, limit: number, offset: number, useFullTextSearch: boolean): Promise<CaseStudy[]> {
    return caseStudyStorage.searchCaseStudies(query, limit, offset, useFullTextSearch);
  }

  // Fallback search using simple ILIKE patterns
  private async searchGlobalFallback(query: string, options: {
    contentTypes?: ('resources' | 'schools' | 'evidence' | 'caseStudies')[];
    limit?: number;
    offset?: number;
  }): Promise<{
    resources: Resource[];
    schools: School[];
    evidence: Evidence[];
    caseStudies: CaseStudy[];
    totalResults: number;
  }> {
    const { contentTypes = ['resources', 'schools', 'evidence', 'caseStudies'], limit = 50, offset = 0 } = options;
    const perTypeLimit = Math.floor(limit / contentTypes.length);
    
    const results = {
      resources: [] as Resource[],
      schools: [] as School[],
      evidence: [] as Evidence[],
      caseStudies: [] as CaseStudy[],
      totalResults: 0
    };

    try {
      if (contentTypes.includes('resources')) {
        results.resources = await db
          .select()
          .from(resources)
          .where(
            and(
              eq(resources.isActive, true),
              eq(resources.visibility, 'public'),
              ilike(resources.title, `%${query}%`)
            )
          )
          .limit(perTypeLimit)
          .offset(offset);
      }

      if (contentTypes.includes('schools')) {
        results.schools = await db
          .select()
          .from(schools)
          .where(ilike(schools.name, `%${query}%`))
          .limit(perTypeLimit)
          .offset(offset);
      }

      if (contentTypes.includes('evidence')) {
        results.evidence = await db
          .select()
          .from(evidence)
          .where(
            and(
              eq(evidence.visibility, 'public'),
              ilike(evidence.title, `%${query}%`)
            )
          )
          .limit(perTypeLimit)
          .offset(offset);
      }

      if (contentTypes.includes('caseStudies')) {
        results.caseStudies = await db
          .select()
          .from(caseStudies)
          .where(ilike(caseStudies.title, `%${query}%`))
          .limit(perTypeLimit)
          .offset(offset);
      }

      results.totalResults = results.resources.length + results.schools.length + results.evidence.length + results.caseStudies.length;
      return results;
    } catch (error) {
      console.error('Error in searchGlobalFallback:', error);
      return {
        resources: [],
        schools: [],
        evidence: [],
        caseStudies: [],
        totalResults: 0
      };
    }
  }

  async searchWithRanking(
    query: string,
    contentType: 'resources' | 'schools' | 'evidence' | 'caseStudies',
    options: { limit?: number; offset?: number; } = {}
  ): Promise<any[]> {
    const { limit = 20, offset = 0 } = options;
    const sanitizedQuery = this.sanitizeSearchQuery(query);
    
    if (!sanitizedQuery) {
      return [];
    }

    const useFullTextSearch = await this.isFullTextSearchAvailable();

    try {
      switch (contentType) {
        case 'resources':
          return await this.searchResourcesWithRanking(sanitizedQuery, limit, offset, useFullTextSearch);

        case 'schools':
          return await this.searchSchoolsWithRanking(sanitizedQuery, limit, offset, useFullTextSearch);

        case 'evidence':
          return await this.searchEvidenceWithRanking(sanitizedQuery, limit, offset, useFullTextSearch);

        case 'caseStudies':
          return await this.searchCaseStudiesWithRanking(sanitizedQuery, limit, offset, useFullTextSearch);

        default:
          return [];
      }
    } catch (error) {
      console.error(`Error in searchWithRanking for ${contentType}:`, error);
      // Fallback to basic search without ranking
      return await this.searchWithRankingFallback(sanitizedQuery, contentType, { limit, offset });
    }
  }

  // Individual ranking search methods for each content type
  private async searchResourcesWithRanking(query: string, limit: number, offset: number, useFullTextSearch: boolean): Promise<any[]> {
    try {
      if (useFullTextSearch) {
        return await db
          .select({
            id: resources.id,
            title: resources.title,
            description: resources.description,
            stage: resources.stage,
            ageRange: resources.ageRange,
            language: resources.language,
            country: resources.country,
            fileUrl: resources.fileUrl,
            fileType: resources.fileType,
            fileSize: resources.fileSize,
            downloadCount: resources.downloadCount,
            isActive: resources.isActive,
            createdAt: resources.createdAt,
            updatedAt: resources.updatedAt,
            rank: sql<number>`ts_rank(to_tsvector('english', ${resources.title} || ' ' || coalesce(${resources.description}, '')), websearch_to_tsquery('english', ${query}))`
          })
          .from(resources)
          .where(
            and(
              eq(resources.isActive, true),
              eq(resources.visibility, 'public'),
              sql`to_tsvector('english', ${resources.title} || ' ' || coalesce(${resources.description}, '')) @@ websearch_to_tsquery('english', ${query})`
            )
          )
          .orderBy(sql`ts_rank(to_tsvector('english', ${resources.title} || ' ' || coalesce(${resources.description}, '')), websearch_to_tsquery('english', ${query})) desc`)
          .limit(limit)
          .offset(offset);
      } else {
        // Fallback without ranking
        return await db
          .select({
            id: resources.id,
            title: resources.title,
            description: resources.description,
            stage: resources.stage,
            ageRange: resources.ageRange,
            language: resources.language,
            country: resources.country,
            fileUrl: resources.fileUrl,
            fileType: resources.fileType,
            fileSize: resources.fileSize,
            downloadCount: resources.downloadCount,
            isActive: resources.isActive,
            createdAt: resources.createdAt,
            updatedAt: resources.updatedAt,
            rank: sql<number>`1` // Default rank
          })
          .from(resources)
          .where(
            and(
              eq(resources.isActive, true),
              eq(resources.visibility, 'public'),
              or(
                ilike(resources.title, `%${query}%`),
                ilike(resources.description, `%${query}%`)
              )
            )
          )
          .orderBy(desc(resources.createdAt))
          .limit(limit)
          .offset(offset);
      }
    } catch (error) {
      console.error('Error in searchResourcesWithRanking:', error);
      // Simple fallback - return basic resources without rank
      const basicResults = await db
        .select()
        .from(resources)
        .where(
          and(
            eq(resources.isActive, true),
            eq(resources.visibility, 'public'),
            ilike(resources.title, `%${query}%`)
          )
        )
        .limit(limit)
        .offset(offset);
      
      // Add rank field to match expected interface
      return basicResults.map(resource => ({ ...resource, rank: 1 }));
    }
  }

  private async searchSchoolsWithRanking(query: string, limit: number, offset: number, useFullTextSearch: boolean): Promise<any[]> {
    try {
      if (useFullTextSearch) {
        return await db
          .select({
            id: schools.id,
            name: schools.name,
            type: schools.type,
            country: schools.country,
            address: schools.address,
            studentCount: schools.studentCount,
            latitude: schools.latitude,
            longitude: schools.longitude,
            currentStage: schools.currentStage,
            progressPercentage: schools.progressPercentage,
            inspireCompleted: schools.inspireCompleted,
            investigateCompleted: schools.investigateCompleted,
            actCompleted: schools.actCompleted,
            awardCompleted: schools.awardCompleted,
            featuredSchool: schools.featuredSchool,
            primaryContactId: schools.primaryContactId,
            createdAt: schools.createdAt,
            updatedAt: schools.updatedAt,
            rank: sql<number>`ts_rank(to_tsvector('english', ${schools.name} || ' ' || coalesce(${schools.address}, '') || ' ' || ${schools.country}), websearch_to_tsquery('english', ${query}))`
          })
          .from(schools)
          .where(
            sql`to_tsvector('english', ${schools.name} || ' ' || coalesce(${schools.address}, '') || ' ' || ${schools.country}) @@ websearch_to_tsquery('english', ${query})`
          )
          .orderBy(sql`ts_rank(to_tsvector('english', ${schools.name} || ' ' || coalesce(${schools.address}, '') || ' ' || ${schools.country}), websearch_to_tsquery('english', ${query})) desc`)
          .limit(limit)
          .offset(offset);
      } else {
        // Fallback without ranking
        return await db
          .select({
            id: schools.id,
            name: schools.name,
            type: schools.type,
            country: schools.country,
            address: schools.address,
            studentCount: schools.studentCount,
            latitude: schools.latitude,
            longitude: schools.longitude,
            currentStage: schools.currentStage,
            progressPercentage: schools.progressPercentage,
            inspireCompleted: schools.inspireCompleted,
            investigateCompleted: schools.investigateCompleted,
            actCompleted: schools.actCompleted,
            awardCompleted: schools.awardCompleted,
            featuredSchool: schools.featuredSchool,
            primaryContactId: schools.primaryContactId,
            createdAt: schools.createdAt,
            updatedAt: schools.updatedAt,
            rank: sql<number>`1`
          })
          .from(schools)
          .where(
            or(
              ilike(schools.name, `%${query}%`),
              ilike(schools.address, `%${query}%`),
              ilike(schools.country, `%${query}%`)
            )
          )
          .orderBy(desc(schools.createdAt))
          .limit(limit)
          .offset(offset);
      }
    } catch (error) {
      console.error('Error in searchSchoolsWithRanking:', error);
      // Simple fallback - return basic schools without rank
      const basicResults = await db
        .select()
        .from(schools)
        .where(ilike(schools.name, `%${query}%`))
        .limit(limit)
        .offset(offset);
      
      // Add rank field to match expected interface
      return basicResults.map(school => ({ ...school, rank: 1 }));
    }
  }

  private async searchEvidenceWithRanking(query: string, limit: number, offset: number, useFullTextSearch: boolean): Promise<any[]> {
    try {
      if (useFullTextSearch) {
        return await db
          .select({
            id: evidence.id,
            schoolId: evidence.schoolId,
            submittedBy: evidence.submittedBy,
            title: evidence.title,
            description: evidence.description,
            stage: evidence.stage,
            status: evidence.status,
            visibility: evidence.visibility,
            files: evidence.files,
            reviewedBy: evidence.reviewedBy,
            reviewedAt: evidence.reviewedAt,
            reviewNotes: evidence.reviewNotes,
            isFeatured: evidence.isFeatured,
            submittedAt: evidence.submittedAt,
            updatedAt: evidence.updatedAt,
            rank: sql<number>`ts_rank(to_tsvector('english', ${evidence.title} || ' ' || coalesce(${evidence.description}, '')), websearch_to_tsquery('english', ${query}))`
          })
          .from(evidence)
          .where(
            and(
              eq(evidence.visibility, 'public'),
              sql`to_tsvector('english', ${evidence.title} || ' ' || coalesce(${evidence.description}, '')) @@ websearch_to_tsquery('english', ${query})`
            )
          )
          .orderBy(sql`ts_rank(to_tsvector('english', ${evidence.title} || ' ' || coalesce(${evidence.description}, '')), websearch_to_tsquery('english', ${query})) desc`)
          .limit(limit)
          .offset(offset);
      } else {
        // Fallback without ranking
        return await db
          .select({
            id: evidence.id,
            schoolId: evidence.schoolId,
            submittedBy: evidence.submittedBy,
            title: evidence.title,
            description: evidence.description,
            stage: evidence.stage,
            status: evidence.status,
            visibility: evidence.visibility,
            files: evidence.files,
            reviewedBy: evidence.reviewedBy,
            reviewedAt: evidence.reviewedAt,
            reviewNotes: evidence.reviewNotes,
            isFeatured: evidence.isFeatured,
            submittedAt: evidence.submittedAt,
            updatedAt: evidence.updatedAt,
            rank: sql<number>`1`
          })
          .from(evidence)
          .where(
            and(
              eq(evidence.visibility, 'public'),
              or(
                ilike(evidence.title, `%${query}%`),
                ilike(evidence.description, `%${query}%`)
              )
            )
          )
          .orderBy(desc(evidence.submittedAt))
          .limit(limit)
          .offset(offset);
      }
    } catch (error) {
      console.error('Error in searchEvidenceWithRanking:', error);
      // Simple fallback - return basic evidence without rank
      const basicResults = await db
        .select()
        .from(evidence)
        .where(
          and(
            eq(evidence.visibility, 'public'),
            ilike(evidence.title, `%${query}%`)
          )
        )
        .limit(limit)
        .offset(offset);
      
      // Add rank field to match expected interface
      return basicResults.map(evidenceItem => ({ ...evidenceItem, rank: 1 }));
    }
  }

  private async searchCaseStudiesWithRanking(query: string, limit: number, offset: number, useFullTextSearch: boolean): Promise<any[]> {
    return caseStudyStorage.searchCaseStudiesWithRanking(query, limit, offset, useFullTextSearch);
  }

  // Ultimate fallback for searchWithRanking
  private async searchWithRankingFallback(
    query: string,
    contentType: 'resources' | 'schools' | 'evidence' | 'caseStudies',
    options: { limit?: number; offset?: number; }
  ): Promise<any[]> {
    const { limit = 20, offset = 0 } = options;
    
    try {
      switch (contentType) {
        case 'resources':
          const resources_results = await db
            .select()
            .from(resources)
            .where(
              and(
                eq(resources.isActive, true),
                eq(resources.visibility, 'public'),
                ilike(resources.title, `%${query}%`)
              )
            )
            .limit(limit)
            .offset(offset);
          return resources_results.map(resource => ({ ...resource, rank: 1 }));

        case 'schools':
          const schools_results = await db
            .select()
            .from(schools)
            .where(ilike(schools.name, `%${query}%`))
            .limit(limit)
            .offset(offset);
          return schools_results.map(school => ({ ...school, rank: 1 }));

        case 'evidence':
          const evidence_results = await db
            .select()
            .from(evidence)
            .where(
              and(
                eq(evidence.visibility, 'public'),
                ilike(evidence.title, `%${query}%`)
              )
            )
            .limit(limit)
            .offset(offset);
          return evidence_results.map(evidenceItem => ({ ...evidenceItem, rank: 1 }));

        case 'caseStudies':
          const caseStudies_results = await db
            .select()
            .from(caseStudies)
            .where(ilike(caseStudies.title, `%${query}%`))
            .limit(limit)
            .offset(offset);
          return caseStudies_results.map(caseStudy => ({ ...caseStudy, rank: 1 }));

        default:
          return [];
      }
    } catch (error) {
      console.error('Error in searchWithRankingFallback:', error);
      return [];
    }
  }

  // Certificate operations
  async createCertificate(certificate: InsertCertificate): Promise<Certificate> {
    const [newCertificate] = await db.insert(certificates).values(certificate).returning();
    return newCertificate;
  }

  async getCertificates(): Promise<(Certificate & { school: School })[]> {
    const results = await db
      .select()
      .from(certificates)
      .innerJoin(schools, eq(certificates.schoolId, schools.id))
      .where(eq(certificates.isActive, true))
      .orderBy(desc(certificates.issuedDate));
    
    return results.map(result => ({
      ...result.certificates,
      school: result.schools
    }));
  }

  async getCertificate(id: string): Promise<(Certificate & { school: School }) | undefined> {
    const [certificate] = await db
      .select()
      .from(certificates)
      .innerJoin(schools, eq(certificates.schoolId, schools.id))
      .where(and(eq(certificates.id, id), eq(certificates.isActive, true)));
    
    if (!certificate) return undefined;
    
    return {
      ...certificate.certificates,
      school: certificate.schools
    };
  }

  async getCertificatesBySchool(schoolId: string): Promise<(Certificate & { school: School })[]> {
    const results = await db
      .select()
      .from(certificates)
      .innerJoin(schools, eq(certificates.schoolId, schools.id))
      .where(and(eq(certificates.schoolId, schoolId), eq(certificates.isActive, true)))
      .orderBy(desc(certificates.issuedDate));
    
    return results.map(result => ({
      ...result.certificates,
      school: result.schools
    }));
  }

  async getCertificateByNumber(certificateNumber: string): Promise<(Certificate & { school: School }) | undefined> {
    const [certificate] = await db
      .select()
      .from(certificates)
      .innerJoin(schools, eq(certificates.schoolId, schools.id))
      .where(and(eq(certificates.certificateNumber, certificateNumber), eq(certificates.isActive, true)));
    
    if (!certificate) return undefined;
    
    return {
      ...certificate.certificates,
      school: certificate.schools
    };
  }

  async updateCertificate(id: string, updates: Partial<Certificate>): Promise<Certificate | undefined> {
    const [updatedCertificate] = await db
      .update(certificates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(certificates.id, id))
      .returning();
    return updatedCertificate;
  }

  async deleteCertificate(id: string): Promise<void> {
    await db.update(certificates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(certificates.id, id));
  }

  // Testimonial operations
  async createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial> {
    const [newTestimonial] = await db.insert(testimonials).values(testimonial).returning();
    return newTestimonial;
  }

  async getTestimonials(filters?: { isActive?: boolean }): Promise<Testimonial[]> {
    let query = db.select().from(testimonials);
    
    if (filters?.isActive !== undefined) {
      query = query.where(eq(testimonials.isActive, filters.isActive)) as any;
    }
    
    return await query.orderBy(asc(testimonials.displayOrder), desc(testimonials.createdAt));
  }

  async getTestimonial(id: string): Promise<Testimonial | undefined> {
    const [testimonial] = await db.select().from(testimonials).where(eq(testimonials.id, id));
    return testimonial;
  }

  async updateTestimonial(id: string, updates: Partial<Testimonial>): Promise<Testimonial | undefined> {
    const [updatedTestimonial] = await db.update(testimonials)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(testimonials.id, id))
      .returning();
    return updatedTestimonial;
  }

  async deleteTestimonial(id: string): Promise<void> {
    await db.delete(testimonials).where(eq(testimonials.id, id));
  }

  // Audit operations
  async createAudit(audit: InsertAuditResponse): Promise<AuditResponse> {
    const [newAudit] = await db.insert(auditResponses).values(audit).returning();
    return newAudit;
  }

  async getAudit(id: string): Promise<AuditResponse | undefined> {
    const [audit] = await db.select().from(auditResponses).where(eq(auditResponses.id, id));
    return audit;
  }

  async getSchoolAudit(schoolId: string, roundNumber?: number): Promise<AuditResponse | undefined> {
    // If round number is specified, filter by it
    // Otherwise return most recent audit (for backwards compatibility)
    const [audit] = await db
      .select()
      .from(auditResponses)
      .where(
        roundNumber !== undefined
          ? and(
              eq(auditResponses.schoolId, schoolId),
              eq(auditResponses.roundNumber, roundNumber)
            )
          : eq(auditResponses.schoolId, schoolId)
      )
      .orderBy(desc(auditResponses.createdAt))
      .limit(1);
    return audit;
  }

  async getSchoolAudits(schoolId: string): Promise<Array<AuditResponse & { submittedByUser: User; reviewedByUser: User | null }>> {
    const results = await db
      .select({
        audit: auditResponses,
        submittedByUser: users,
        reviewedByUser: {
          id: sql<string>`reviewer.id`,
          email: sql<string>`reviewer.email`,
          firstName: sql<string | null>`reviewer.first_name`,
          lastName: sql<string | null>`reviewer.last_name`,
          role: sql<string>`reviewer.role`,
          isAdmin: sql<boolean>`reviewer.is_admin`,
        },
      })
      .from(auditResponses)
      .innerJoin(users, eq(auditResponses.submittedBy, users.id))
      .leftJoin(
        sql`users as reviewer`,
        sql`${auditResponses.reviewedBy} = reviewer.id`
      )
      .where(eq(auditResponses.schoolId, schoolId))
      .orderBy(desc(auditResponses.roundNumber), desc(auditResponses.submittedAt));

    return results.map((r) => ({
      ...r.audit,
      submittedByUser: r.submittedByUser,
      reviewedByUser: r.reviewedByUser.id ? {
        id: r.reviewedByUser.id,
        email: r.reviewedByUser.email,
        firstName: r.reviewedByUser.firstName,
        lastName: r.reviewedByUser.lastName,
        role: r.reviewedByUser.role,
        isAdmin: r.reviewedByUser.isAdmin,
      } as User : null,
    }));
  }

  async updateAudit(id: string, updates: Partial<AuditResponse>): Promise<AuditResponse | undefined> {
    const [updatedAudit] = await db
      .update(auditResponses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(auditResponses.id, id))
      .returning();
    return updatedAudit;
  }

  async submitAudit(id: string, userId: string): Promise<AuditResponse | undefined> {
    const [submittedAudit] = await db
      .update(auditResponses)
      .set({
        status: 'submitted',
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(auditResponses.id, id), eq(auditResponses.submittedBy, userId)))
      .returning();
    return submittedAudit;
  }

  async reviewAudit(
    id: string,
    reviewerId: string,
    approved: boolean,
    notes?: string
  ): Promise<AuditResponse | undefined> {
    const status = approved ? 'approved' : 'rejected';
    const [reviewedAudit] = await db
      .update(auditResponses)
      .set({
        status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(auditResponses.id, id))
      .returning();

    // If approved, update school's auditQuizCompleted status
    if (approved && reviewedAudit) {
      await db
        .update(schools)
        .set({ auditQuizCompleted: true })
        .where(eq(schools.id, reviewedAudit.schoolId));
    }

    return reviewedAudit;
  }

  async getPendingAudits(): Promise<Array<AuditResponse & { school: School; submittedByUser: User }>> {
    const results = await db
      .select({
        audit: auditResponses,
        school: schools,
        submittedByUser: users,
      })
      .from(auditResponses)
      .innerJoin(schools, eq(auditResponses.schoolId, schools.id))
      .innerJoin(users, eq(auditResponses.submittedBy, users.id))
      .where(eq(auditResponses.status, 'submitted'))
      .orderBy(desc(auditResponses.submittedAt));

    return results.map((r) => ({
      ...r.audit,
      school: r.school,
      submittedByUser: r.submittedByUser,
    }));
  }

  async getAllAudits(filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Array<AuditResponse & { school: School }>> {
    let query = db
      .select({
        audit: auditResponses,
        school: schools,
      })
      .from(auditResponses)
      .innerJoin(schools, eq(auditResponses.schoolId, schools.id))
      .orderBy(desc(auditResponses.createdAt));

    if (filters?.status) {
      query = query.where(eq(auditResponses.status, filters.status as any)) as any;
    }

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    const results = await query;

    return results.map((r) => ({
      ...r.audit,
      school: r.school,
    }));
  }

  // Audit analytics implementations
  async getAuditOverviewAnalytics(): Promise<{
    totalSchoolsAudited: number;
    totalPlasticItems: number;
    averageItemsPerSchool: number;
    topProblemPlastics: Array<{ name: string; count: number }>;
  }> {
    // Only include approved audits
    const approvedAudits = await db
      .select()
      .from(auditResponses)
      .where(eq(auditResponses.status, 'approved'));

    const totalSchoolsAudited = approvedAudits.length;
    const totalPlasticItems = approvedAudits.reduce((sum, audit) => sum + (audit.totalPlasticItems || 0), 0);
    const averageItemsPerSchool = totalSchoolsAudited > 0 ? Math.round(totalPlasticItems / totalSchoolsAudited) : 0;

    // Aggregate top problem plastics across all schools
    const plasticCounts = new Map<string, number>();
    
    approvedAudits.forEach(audit => {
      const topProblems = audit.topProblemPlastics as any[];
      if (Array.isArray(topProblems)) {
        topProblems.forEach(item => {
          if (item.name) {
            const currentCount = plasticCounts.get(item.name) || 0;
            plasticCounts.set(item.name, currentCount + (item.count || 1));
          }
        });
      }
    });

    // Convert to array and sort by count
    const topProblemPlastics = Array.from(plasticCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSchoolsAudited,
      totalPlasticItems,
      averageItemsPerSchool,
      topProblemPlastics,
    };
  }

  async getAuditBySchoolAnalytics(): Promise<Array<{
    schoolId: string;
    schoolName: string;
    country: string;
    totalPlasticItems: number;
    topProblemPlastic: string | null;
    auditDate: string;
    hasRecycling: boolean;
    hasComposting: boolean;
    hasPolicy: boolean;
  }>> {
    // Only include approved audits with school details
    const results = await db
      .select({
        audit: auditResponses,
        school: schools,
      })
      .from(auditResponses)
      .innerJoin(schools, eq(auditResponses.schoolId, schools.id))
      .where(eq(auditResponses.status, 'approved'))
      .orderBy(desc(auditResponses.submittedAt));

    return results.map(r => {
      const part4 = (r.audit.part4Data as any) || {};
      const topProblems = r.audit.topProblemPlastics as any[];
      const topProblemPlastic = Array.isArray(topProblems) && topProblems.length > 0 
        ? topProblems[0].name 
        : null;

      return {
        schoolId: r.school.id,
        schoolName: r.school.name,
        country: r.school.country,
        totalPlasticItems: r.audit.totalPlasticItems || 0,
        topProblemPlastic,
        auditDate: r.audit.submittedAt?.toISOString() || r.audit.createdAt?.toISOString() || '',
        hasRecycling: part4.hasRecycling === 'yes' || part4.hasRecycling === true,
        hasComposting: part4.hasComposting === 'yes' || part4.hasComposting === true,
        hasPolicy: part4.hasWastePolicy === 'yes' || part4.hasWastePolicy === true,
      };
    });
  }

  async getWasteTrendsAnalytics(): Promise<{
    monthlySubmissions: Array<{ month: string; count: number }>;
    plasticItemsTrend: Array<{ month: string; totalItems: number }>;
    wasteReductionSchools: Array<{ month: string; count: number }>;
  }> {
    // Monthly audit submissions (only approved, last 12 months)
    const monthlySubmissions = await db
      .select({
        month: sql<string>`TO_CHAR(submitted_at, 'YYYY-MM')`,
        count: count(),
      })
      .from(auditResponses)
      .where(and(
        eq(auditResponses.status, 'approved'),
        sql`submitted_at >= NOW() - INTERVAL '12 months'`
      ))
      .groupBy(sql`TO_CHAR(submitted_at, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(submitted_at, 'YYYY-MM')`);

    // Plastic items trend over time (last 12 months)
    const plasticItemsTrend = await db
      .select({
        month: sql<string>`TO_CHAR(submitted_at, 'YYYY-MM')`,
        totalItems: sql<number>`COALESCE(SUM(total_plastic_items), 0)`,
      })
      .from(auditResponses)
      .where(and(
        eq(auditResponses.status, 'approved'),
        sql`submitted_at >= NOW() - INTERVAL '12 months'`
      ))
      .groupBy(sql`TO_CHAR(submitted_at, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(submitted_at, 'YYYY-MM')`);

    // Schools implementing waste reduction (with recycling, composting, or policy)
    const wasteReductionSchools = await db
      .select({
        month: sql<string>`TO_CHAR(submitted_at, 'YYYY-MM')`,
        count: sql<number>`COUNT(DISTINCT CASE 
          WHEN part4_data->>'hasRecycling' IN ('yes', 'true') 
            OR part4_data->>'hasComposting' IN ('yes', 'true')
            OR part4_data->>'hasWastePolicy' IN ('yes', 'true')
          THEN school_id 
        END)`,
      })
      .from(auditResponses)
      .where(and(
        eq(auditResponses.status, 'approved'),
        sql`submitted_at >= NOW() - INTERVAL '12 months'`
      ))
      .groupBy(sql`TO_CHAR(submitted_at, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(submitted_at, 'YYYY-MM')`);

    return {
      monthlySubmissions,
      plasticItemsTrend,
      wasteReductionSchools,
    };
  }

  // Reduction Promise operations
  async getReductionPromisesBySchool(schoolId: string): Promise<ReductionPromise[]> {
    return await db
      .select()
      .from(reductionPromises)
      .where(eq(reductionPromises.schoolId, schoolId))
      .orderBy(desc(reductionPromises.createdAt));
  }

  async getReductionPromisesByAudit(auditId: string): Promise<ReductionPromise[]> {
    return await db
      .select()
      .from(reductionPromises)
      .where(eq(reductionPromises.auditId, auditId))
      .orderBy(desc(reductionPromises.createdAt));
  }

  async createReductionPromise(data: InsertReductionPromise, createdBy: string): Promise<ReductionPromise> {
    // Calculate reductionAmount from baseline and target quantities
    const reductionAmount = data.baselineQuantity - data.targetQuantity;
    
    const [newPromise] = await db
      .insert(reductionPromises)
      .values({
        ...data,
        reductionAmount,
        createdBy,
      } as any)
      .returning();
    return newPromise;
  }

  async updateReductionPromise(id: string, data: Partial<InsertReductionPromise>, existing?: ReductionPromise): Promise<ReductionPromise> {
    // Recalculate reductionAmount if baseline or target quantities are being updated
    let updateData: any = { ...data };
    if (existing && (data.baselineQuantity !== undefined || data.targetQuantity !== undefined)) {
      const baselineQuantity = data.baselineQuantity ?? existing.baselineQuantity;
      const targetQuantity = data.targetQuantity ?? existing.targetQuantity;
      updateData.reductionAmount = baselineQuantity - targetQuantity;
    }
    
    const [updatedPromise] = await db
      .update(reductionPromises)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(reductionPromises.id, id))
      .returning();
    return updatedPromise;
  }

  async deleteReductionPromise(id: string): Promise<void> {
    await db
      .delete(reductionPromises)
      .where(eq(reductionPromises.id, id));
  }

  async getActivePromisesBySchool(schoolId: string): Promise<ReductionPromise[]> {
    return await db
      .select()
      .from(reductionPromises)
      .where(and(
        eq(reductionPromises.schoolId, schoolId),
        eq(reductionPromises.status, 'active')
      ))
      .orderBy(desc(reductionPromises.createdAt));
  }

  async getAllActivePromises(): Promise<ReductionPromise[]> {
    return await db
      .select()
      .from(reductionPromises)
      .where(eq(reductionPromises.status, 'active'))
      .orderBy(desc(reductionPromises.createdAt));
  }

  // Printable Form Submission operations
  async createPrintableFormSubmission(data: InsertPrintableFormSubmission): Promise<PrintableFormSubmission> {
    const [newSubmission] = await db
      .insert(printableFormSubmissions)
      .values(data)
      .returning();
    return newSubmission;
  }

  async getPrintableFormSubmission(id: string): Promise<PrintableFormSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(printableFormSubmissions)
      .where(eq(printableFormSubmissions.id, id));
    return submission;
  }

  async getPrintableFormSubmissionsBySchool(schoolId: string): Promise<PrintableFormSubmission[]> {
    return await db
      .select()
      .from(printableFormSubmissions)
      .where(eq(printableFormSubmissions.schoolId, schoolId))
      .orderBy(desc(printableFormSubmissions.createdAt));
  }

  async getAllPrintableFormSubmissions(filters?: {
    status?: string;
    formType?: string;
    schoolId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Array<PrintableFormSubmission & { school: School; submittedByUser: User }>> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(printableFormSubmissions.status, filters.status as any));
    }
    if (filters?.formType) {
      conditions.push(eq(printableFormSubmissions.formType, filters.formType as any));
    }
    if (filters?.schoolId) {
      conditions.push(eq(printableFormSubmissions.schoolId, filters.schoolId));
    }

    const results = await db
      .select({
        printableFormSubmission: printableFormSubmissions,
        school: schools,
        submittedByUser: users,
      })
      .from(printableFormSubmissions)
      .leftJoin(schools, eq(printableFormSubmissions.schoolId, schools.id))
      .leftJoin(users, eq(printableFormSubmissions.submittedBy, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(printableFormSubmissions.createdAt))
      .limit(filters?.limit || 100)
      .offset(filters?.offset || 0);

    return results.map(row => ({
      ...row.printableFormSubmission,
      school: row.school as School,
      submittedByUser: row.submittedByUser as User,
    }));
  }

  async updatePrintableFormSubmissionStatus(
    id: string,
    status: 'approved' | 'rejected' | 'revision_requested',
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<PrintableFormSubmission | undefined> {
    const [updatedSubmission] = await db
      .update(printableFormSubmissions)
      .set({
        status,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes,
        updatedAt: new Date(),
      })
      .where(eq(printableFormSubmissions.id, id))
      .returning();
    return updatedSubmission;
  }

  // Event operations
  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db
      .insert(events)
      .values(event)
      .returning();
    return newEvent;
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, id));
    return event;
  }

  async getEvents(filters?: {
    status?: string;
    eventType?: string;
    upcoming?: boolean;
    publicSlug?: string;
    limit?: number;
    offset?: number;
  }): Promise<Event[]> {
    let query = db.select().from(events);
    
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(events.status, filters.status as any));
    }
    if (filters?.eventType) {
      conditions.push(eq(events.eventType, filters.eventType as any));
    }
    if (filters?.upcoming) {
      conditions.push(sql`${events.startDateTime} > NOW()`);
    }
    if (filters?.publicSlug) {
      conditions.push(eq(events.publicSlug, filters.publicSlug));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    query = query.orderBy(asc(events.startDateTime)) as any;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }
    
    return await query;
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    const [updatedEvent] = await db
      .update(events)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    await db
      .delete(events)
      .where(eq(events.id, id));
  }

  async getUpcomingEvents(limit: number = 10): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(and(
        eq(events.status, 'published'),
        sql`${events.startDateTime} > NOW()`
      ))
      .orderBy(asc(events.startDateTime))
      .limit(limit);
  }

  async getPastEvents(limit: number = 10): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(and(
        eq(events.status, 'published'),
        sql`${events.endDateTime} < NOW()`
      ))
      .orderBy(desc(events.startDateTime))
      .limit(limit);
  }

  // Event Registration operations
  async createEventRegistration(registration: InsertEventRegistration): Promise<EventRegistration> {
    const [newRegistration] = await db
      .insert(eventRegistrations)
      .values(registration)
      .returning();
    return newRegistration;
  }

  async getEventRegistration(eventId: string, userId: string): Promise<EventRegistration | undefined> {
    const [registration] = await db
      .select()
      .from(eventRegistrations)
      .where(and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.userId, userId)
      ));
    return registration;
  }

  async getEventRegistrations(eventId: string, filters?: { status?: string }): Promise<Array<EventRegistration & { user: User; school: School | null }>> {
    const conditions = [eq(eventRegistrations.eventId, eventId)];
    
    if (filters?.status) {
      conditions.push(eq(eventRegistrations.status, filters.status as any));
    }

    const results = await db
      .select({
        registration: eventRegistrations,
        user: users,
        school: schools,
      })
      .from(eventRegistrations)
      .innerJoin(users, eq(eventRegistrations.userId, users.id))
      .leftJoin(schools, eq(eventRegistrations.schoolId, schools.id))
      .where(and(...conditions))
      .orderBy(desc(eventRegistrations.registeredAt));
    
    return results.map(r => ({
      ...r.registration,
      user: r.user,
      school: r.school,
    }));
  }

  async getUserEventRegistrations(userId: string): Promise<Array<EventRegistration & { event: Event }>> {
    const results = await db
      .select({
        registration: eventRegistrations,
        event: events,
      })
      .from(eventRegistrations)
      .innerJoin(events, eq(eventRegistrations.eventId, events.id))
      .where(eq(eventRegistrations.userId, userId))
      .orderBy(desc(events.startDateTime));
    
    return results.map(r => ({
      ...r.registration,
      event: r.event,
    }));
  }

  async updateEventRegistration(id: string, updates: Partial<EventRegistration>): Promise<EventRegistration | undefined> {
    const [updatedRegistration] = await db
      .update(eventRegistrations)
      .set(updates)
      .where(eq(eventRegistrations.id, id))
      .returning();
    return updatedRegistration;
  }

  async cancelEventRegistration(id: string): Promise<EventRegistration | undefined> {
    const [cancelledRegistration] = await db
      .update(eventRegistrations)
      .set({ 
        status: 'cancelled',
        cancelledAt: new Date()
      })
      .where(eq(eventRegistrations.id, id))
      .returning();
    return cancelledRegistration;
  }

  async getEventRegistrationCount(eventId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(eventRegistrations)
      .where(and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.status, 'registered')
      ));
    return result[0]?.count || 0;
  }

  async getEventAttendeesCount(eventId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(eventRegistrations)
      .where(and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.status, 'attended')
      ));
    return result[0]?.count || 0;
  }

  // Event Resource operations
  async attachResourceToEvent(eventId: string, resourceId: string, orderIndex?: number): Promise<EventResource> {
    // If no orderIndex provided, get the max orderIndex and add 1
    if (orderIndex === undefined) {
      const existing = await db
        .select({ orderIndex: eventResources.orderIndex })
        .from(eventResources)
        .where(eq(eventResources.eventId, eventId))
        .orderBy(desc(eventResources.orderIndex))
        .limit(1);
      
      orderIndex = existing.length > 0 ? (existing[0].orderIndex || 0) + 1 : 0;
    }

    const [newEventResource] = await db
      .insert(eventResources)
      .values({ eventId, resourceId, orderIndex })
      .returning();
    return newEventResource;
  }

  async detachResourceFromEvent(eventId: string, resourceId: string): Promise<void> {
    await db
      .delete(eventResources)
      .where(and(
        eq(eventResources.eventId, eventId),
        eq(eventResources.resourceId, resourceId)
      ));
  }

  async getEventResources(eventId: string): Promise<Array<EventResource & { resource: Resource }>> {
    const results = await db
      .select({
        eventResource: eventResources,
        resource: resources,
      })
      .from(eventResources)
      .innerJoin(resources, eq(eventResources.resourceId, resources.id))
      .where(eq(eventResources.eventId, eventId))
      .orderBy(asc(eventResources.orderIndex));
    
    return results.map(r => ({
      ...r.eventResource,
      resource: r.resource,
    }));
  }

  async reorderEventResources(eventId: string, resourceOrders: Array<{ resourceId: string; orderIndex: number }>): Promise<void> {
    // Use transaction to update all order indices atomically
    await db.transaction(async (tx) => {
      for (const { resourceId, orderIndex } of resourceOrders) {
        await tx
          .update(eventResources)
          .set({ orderIndex })
          .where(and(
            eq(eventResources.eventId, eventId),
            eq(eventResources.resourceId, resourceId)
          ));
      }
    });
  }

  // Event Announcement operations
  async createEventAnnouncement(announcement: InsertEventAnnouncement): Promise<EventAnnouncement> {
    const [newAnnouncement] = await db
      .insert(eventAnnouncements)
      .values(announcement)
      .returning();
    return newAnnouncement;
  }

  async getEventAnnouncements(eventId: string): Promise<EventAnnouncement[]> {
    return await db
      .select()
      .from(eventAnnouncements)
      .where(eq(eventAnnouncements.eventId, eventId))
      .orderBy(desc(eventAnnouncements.sentAt));
  }

  async getEventAnnouncementsByAudience(audienceId: string): Promise<Array<EventAnnouncement & { event: Event }>> {
    const results = await db
      .select({
        ...getTableColumns(eventAnnouncements),
        event: events
      })
      .from(eventAnnouncements)
      .leftJoin(events, eq(eventAnnouncements.eventId, events.id))
      .where(eq(eventAnnouncements.eventId, audienceId))
      .orderBy(desc(eventAnnouncements.sentAt));
    
    return results as Array<EventAnnouncement & { event: Event }>;
  }

  async getEventAnnouncementsByRecipientType(recipientType: 'all_teachers' | 'custom'): Promise<Array<EventAnnouncement & { event: Event }>> {
    const results = await db
      .select({
        announcement: eventAnnouncements,
        event: events,
      })
      .from(eventAnnouncements)
      .innerJoin(events, eq(eventAnnouncements.eventId, events.id))
      .where(eq(eventAnnouncements.recipientType, recipientType))
      .orderBy(desc(eventAnnouncements.sentAt));

    return results.map(r => ({
      ...r.announcement,
      event: r.event,
    }));
  }

  async hasEventBeenAnnounced(eventId: string, announcementType: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(eventAnnouncements)
      .where(and(
        eq(eventAnnouncements.eventId, eventId),
        eq(eventAnnouncements.announcementType, announcementType)
      ))
      .limit(1);
    
    return !!result;
  }

  // Event Banner operations
  async createEventBanner(banner: InsertEventBanner): Promise<EventBanner> {
    // Use transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // If creating an active banner, deactivate all other banners first
      if (banner.isActive) {
        await tx
          .update(eventBanners)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(eventBanners.isActive, true));
      }

      const [newBanner] = await tx
        .insert(eventBanners)
        .values(banner)
        .returning();
      return newBanner;
    });
  }

  async getEventBanners(): Promise<Array<EventBanner & { event: Event }>> {
    const results = await db
      .select({
        banner: eventBanners,
        event: events,
      })
      .from(eventBanners)
      .innerJoin(events, eq(eventBanners.eventId, events.id))
      .orderBy(desc(eventBanners.createdAt));

    return results.map(r => ({
      ...r.banner,
      event: r.event,
    }));
  }

  async getActiveEventBanner(): Promise<(EventBanner & { event: Event }) | null> {
    const [result] = await db
      .select({
        banner: eventBanners,
        event: events,
      })
      .from(eventBanners)
      .innerJoin(events, eq(eventBanners.eventId, events.id))
      .where(eq(eventBanners.isActive, true))
      .orderBy(desc(eventBanners.createdAt))
      .limit(1);

    if (!result) return null;

    return {
      ...result.banner,
      event: result.event,
    };
  }

  async updateEventBanner(id: string, updates: Partial<EventBanner>): Promise<EventBanner | undefined> {
    // Use transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // If activating this banner, deactivate all other banners first
      if (updates.isActive === true) {
        await tx
          .update(eventBanners)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(
            eq(eventBanners.isActive, true),
            ne(eventBanners.id, id)
          ));
      }

      const [updatedBanner] = await tx
        .update(eventBanners)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(eventBanners.id, id))
        .returning();
      return updatedBanner;
    });
  }

  async deleteEventBanner(id: string): Promise<void> {
    await db
      .delete(eventBanners)
      .where(eq(eventBanners.id, id));
  }

  // Event Analytics operations
  async getEventAnalytics() {
    // Get total events count
    const totalEventsResult = await db
      .select({ count: count() })
      .from(events);
    const totalEvents = totalEventsResult[0]?.count || 0;

    // Get events by status
    const statusResults = await db
      .select({
        status: events.status,
        count: count(),
      })
      .from(events)
      .groupBy(events.status);

    const eventsByStatus = {
      draft: 0,
      published: 0,
      completed: 0,
      cancelled: 0,
    };
    statusResults.forEach(row => {
      if (row.status && row.status in eventsByStatus) {
        eventsByStatus[row.status as keyof typeof eventsByStatus] = Number(row.count);
      }
    });

    // Get total registrations count
    const totalRegistrationsResult = await db
      .select({ count: count() })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.status, 'registered'));
    const totalRegistrations = totalRegistrationsResult[0]?.count || 0;

    // Calculate average registrations per event
    const averageRegistrationsPerEvent = totalEvents > 0 
      ? Number(totalRegistrations) / Number(totalEvents) 
      : 0;

    // Calculate registration conversion rate (registered vs total capacity)
    const capacityResult = await db
      .select({
        totalCapacity: sql<number>`COALESCE(SUM(${events.capacity}), 0)`,
      })
      .from(events)
      .where(sql`${events.capacity} IS NOT NULL`);
    const totalCapacity = Number(capacityResult[0]?.totalCapacity || 0);
    const registrationConversionRate = totalCapacity > 0 
      ? (Number(totalRegistrations) / totalCapacity) * 100 
      : 0;

    // Get events by type breakdown
    const typeResults = await db
      .select({
        type: events.eventType,
        count: count(),
      })
      .from(events)
      .groupBy(events.eventType)
      .orderBy(desc(count()));

    const eventsByType = typeResults.map(row => ({
      type: row.type,
      count: Number(row.count),
    }));

    // Get top 5 most popular events by registration count
    const topEventsResults = await db
      .select({
        id: events.id,
        title: events.title,
        capacity: events.capacity,
        registrations: sql<number>`COUNT(${eventRegistrations.id})`,
      })
      .from(events)
      .leftJoin(eventRegistrations, and(
        eq(eventRegistrations.eventId, events.id),
        eq(eventRegistrations.status, 'registered')
      ))
      .groupBy(events.id, events.title, events.capacity)
      .orderBy(desc(sql<number>`COUNT(${eventRegistrations.id})`))
      .limit(5);

    const topEvents = topEventsResults.map(row => ({
      id: row.id,
      title: row.title,
      registrations: Number(row.registrations),
      capacity: row.capacity,
    }));

    // Get registrations trend over last 30 days (daily counts)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendResults = await db
      .select({
        date: sql<string>`DATE(${eventRegistrations.registeredAt})`,
        count: count(),
      })
      .from(eventRegistrations)
      .where(and(
        sql`${eventRegistrations.registeredAt} >= ${thirtyDaysAgo}`,
        eq(eventRegistrations.status, 'registered')
      ))
      .groupBy(sql`DATE(${eventRegistrations.registeredAt})`)
      .orderBy(asc(sql`DATE(${eventRegistrations.registeredAt})`));

    const registrationsTrend = trendResults.map(row => ({
      date: row.date,
      count: Number(row.count),
    }));

    // Get upcoming events count
    const upcomingEventsResult = await db
      .select({ count: count() })
      .from(events)
      .where(and(
        eq(events.status, 'published'),
        sql`${events.startDateTime} > NOW()`
      ));
    const upcomingEventsCount = upcomingEventsResult[0]?.count || 0;

    // Get past events count
    const pastEventsResult = await db
      .select({ count: count() })
      .from(events)
      .where(and(
        or(
          eq(events.status, 'published'),
          eq(events.status, 'completed')
        ),
        sql`${events.endDateTime} < NOW()`
      ));
    const pastEventsCount = pastEventsResult[0]?.count || 0;

    return {
      totalEvents: Number(totalEvents),
      eventsByStatus,
      totalRegistrations: Number(totalRegistrations),
      averageRegistrationsPerEvent: Math.round(averageRegistrationsPerEvent * 10) / 10,
      registrationConversionRate: Math.round(registrationConversionRate * 10) / 10,
      eventsByType,
      topEvents,
      registrationsTrend,
      upcomingEventsCount: Number(upcomingEventsCount),
      pastEventsCount: Number(pastEventsCount),
    };
  }

  // Event tracking operations
  async trackEventLinkClick(eventId: string, userId?: string): Promise<void> {
    await db.insert(eventLinkClicks).values({
      eventId,
      userId: userId || null,
    });
  }

  async getEventLinkClicks(eventId: string): Promise<Array<EventLinkClick & { user: User | null }>> {
    const results = await db
      .select({
        click: eventLinkClicks,
        user: users,
      })
      .from(eventLinkClicks)
      .leftJoin(users, eq(eventLinkClicks.userId, users.id))
      .where(eq(eventLinkClicks.eventId, eventId))
      .orderBy(desc(eventLinkClicks.clickedAt));

    return results.map(row => ({
      ...row.click,
      user: row.user,
    }));
  }

  async getEventLinkClickCount(eventId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(eventLinkClicks)
      .where(eq(eventLinkClicks.eventId, eventId));
    return result[0]?.count || 0;
  }

  async trackEventResourceDownload(eventId: string, fileIndex: number, fileName: string, userId?: string): Promise<void> {
    await db.insert(eventResourceDownloads).values({
      eventId,
      fileIndex,
      fileName,
      userId: userId || null,
    });
  }

  async getEventResourceDownloads(eventId: string): Promise<Array<EventResourceDownload & { user: User | null }>> {
    const results = await db
      .select({
        download: eventResourceDownloads,
        user: users,
      })
      .from(eventResourceDownloads)
      .leftJoin(users, eq(eventResourceDownloads.userId, users.id))
      .where(eq(eventResourceDownloads.eventId, eventId))
      .orderBy(desc(eventResourceDownloads.downloadedAt));

    return results.map(row => ({
      ...row.download,
      user: row.user,
    }));
  }

  async getEventResourceDownloadStats(eventId: string): Promise<Array<{ fileIndex: number; fileName: string; downloadCount: number }>> {
    const results = await db
      .select({
        fileIndex: eventResourceDownloads.fileIndex,
        fileName: eventResourceDownloads.fileName,
        downloadCount: count(),
      })
      .from(eventResourceDownloads)
      .where(eq(eventResourceDownloads.eventId, eventId))
      .groupBy(eventResourceDownloads.fileIndex, eventResourceDownloads.fileName)
      .orderBy(eventResourceDownloads.fileIndex);

    return results.map(row => ({
      fileIndex: row.fileIndex,
      fileName: row.fileName,
      downloadCount: Number(row.downloadCount),
    }));
  }

  async getEventDetailedAnalytics(eventId: string): Promise<{
    registrations: number;
    attended: number;
    linkClicks: number;
    uniqueLinkClickers: number;
    resourceDownloads: Array<{
      fileIndex: number;
      fileName: string;
      downloadCount: number;
      uniqueDownloaders: number;
    }>;
  }> {
    // Get registration count
    const registrationsResult = await db
      .select({ count: count() })
      .from(eventRegistrations)
      .where(and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.status, 'registered')
      ));
    const registrations = registrationsResult[0]?.count || 0;

    // Get attended count
    const attendedResult = await db
      .select({ count: count() })
      .from(eventRegistrations)
      .where(and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.status, 'attended')
      ));
    const attended = attendedResult[0]?.count || 0;

    // Get link click count
    const linkClicksResult = await db
      .select({ count: count() })
      .from(eventLinkClicks)
      .where(eq(eventLinkClicks.eventId, eventId));
    const linkClicks = linkClicksResult[0]?.count || 0;

    // Get unique link clickers count
    const uniqueLinkClickersResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${eventLinkClicks.userId})` })
      .from(eventLinkClicks)
      .where(and(
        eq(eventLinkClicks.eventId, eventId),
        sql`${eventLinkClicks.userId} IS NOT NULL`
      ));
    const uniqueLinkClickers = Number(uniqueLinkClickersResult[0]?.count || 0);

    // Get resource download stats with unique downloaders
    const downloadStatsResults = await db
      .select({
        fileIndex: eventResourceDownloads.fileIndex,
        fileName: eventResourceDownloads.fileName,
        downloadCount: count(),
        uniqueDownloaders: sql<number>`COUNT(DISTINCT ${eventResourceDownloads.userId})`,
      })
      .from(eventResourceDownloads)
      .where(eq(eventResourceDownloads.eventId, eventId))
      .groupBy(eventResourceDownloads.fileIndex, eventResourceDownloads.fileName)
      .orderBy(eventResourceDownloads.fileIndex);

    const resourceDownloads = downloadStatsResults.map(row => ({
      fileIndex: row.fileIndex,
      fileName: row.fileName,
      downloadCount: Number(row.downloadCount),
      uniqueDownloaders: Number(row.uniqueDownloaders),
    }));

    return {
      registrations: Number(registrations),
      attended: Number(attended),
      linkClicks: Number(linkClicks),
      uniqueLinkClickers,
      resourceDownloads,
    };
  }

  // Media Assets operations
  async createMediaAsset(asset: InsertMediaAsset): Promise<MediaAsset> {
    const [mediaAsset] = await db
      .insert(mediaAssets)
      .values(asset)
      .returning();
    return mediaAsset;
  }

  async getMediaAsset(id: string): Promise<MediaAsset | null> {
    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, id));
    return asset || null;
  }

  async listMediaAssets(filters?: {
    mediaType?: string;
    tags?: string[];
    uploaderId?: string;
    schoolId?: string | null;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<MediaAsset[]> {
    let query = db.select().from(mediaAssets);

    const conditions = [];

    if (filters?.mediaType) {
      conditions.push(eq(mediaAssets.mediaType, filters.mediaType as any));
    }

    if (filters?.uploaderId) {
      conditions.push(eq(mediaAssets.uploadedBy, filters.uploaderId));
    }

    if (filters?.schoolId !== undefined) {
      if (filters.schoolId === null) {
        conditions.push(sql`${mediaAssets.schoolId} IS NULL`);
      } else {
        conditions.push(eq(mediaAssets.schoolId, filters.schoolId));
      }
    }

    if (filters?.search) {
      conditions.push(
        or(
          ilike(mediaAssets.filename, `%${filters.search}%`),
          ilike(mediaAssets.altText, `%${filters.search}%`),
          ilike(mediaAssets.description, `%${filters.search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    if (filters?.tags && filters.tags.length > 0) {
      const assetsWithTags = await db
        .selectDistinct({ assetId: mediaAssetTags.assetId })
        .from(mediaAssetTags)
        .where(inArray(mediaAssetTags.tagId, filters.tags));

      const assetIds = assetsWithTags.map(a => a.assetId);
      
      if (assetIds.length === 0) {
        return [];
      }
      
      query = query.where(inArray(mediaAssets.id, assetIds)) as any;
    }

    query = query.orderBy(desc(mediaAssets.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    const assets = await query;
    return assets;
  }

  async updateMediaAssetMetadata(
    id: string,
    updates: Partial<Pick<MediaAsset, 'altText' | 'description' | 'visibility'>>
  ): Promise<MediaAsset> {
    const [updated] = await db
      .update(mediaAssets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mediaAssets.id, id))
      .returning();
    return updated;
  }

  async deleteMediaAsset(id: string): Promise<void> {
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  }

  // Media Tags operations
  async createMediaTag(tag: InsertMediaTag): Promise<MediaTag> {
    const [mediaTag] = await db
      .insert(mediaTags)
      .values(tag)
      .returning();
    return mediaTag;
  }

  async listMediaTags(): Promise<MediaTag[]> {
    const tags = await db.select().from(mediaTags).orderBy(asc(mediaTags.name));
    return tags;
  }

  async attachMediaTags(assetId: string, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;

    const values = tagIds.map(tagId => ({
      assetId,
      tagId,
    }));

    await db.insert(mediaAssetTags).values(values);
  }

  async detachMediaTags(assetId: string, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;

    await db
      .delete(mediaAssetTags)
      .where(
        and(
          eq(mediaAssetTags.assetId, assetId),
          inArray(mediaAssetTags.tagId, tagIds)
        )
      );
  }

  // Media Asset Usage tracking
  async recordMediaAssetUsage(
    assetId: string,
    usageType: string,
    referenceId?: string
  ): Promise<void> {
    await db.insert(mediaAssetUsage).values({
      assetId,
      usageType,
      referenceId,
    });
  }

  async listMediaAssetUsage(assetId: string): Promise<any[]> {
    const usage = await db
      .select()
      .from(mediaAssetUsage)
      .where(eq(mediaAssetUsage.assetId, assetId))
      .orderBy(desc(mediaAssetUsage.createdAt));
    return usage;
  }

  // Collaboration - Chat operations
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [chatMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return chatMessage;
  }

  async getChatMessages(limit: number = 100, offset: number = 0): Promise<Array<ChatMessage & { user: User | null }>> {
    const messages = await db
      .select({
        id: chatMessages.id,
        userId: chatMessages.userId,
        message: chatMessages.message,
        createdAt: chatMessages.createdAt,
        user: users,
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.userId, users.id))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .offset(offset);
    
    return messages;
  }

  // Collaboration - Document Lock operations
  async createDocumentLock(lock: InsertDocumentLock): Promise<DocumentLock> {
    const [documentLock] = await db
      .insert(documentLocks)
      .values(lock)
      .returning();
    return documentLock;
  }

  async getDocumentLock(documentType: string, documentId: string): Promise<DocumentLock | null> {
    const [lock] = await db
      .select()
      .from(documentLocks)
      .where(
        and(
          eq(documentLocks.documentType, documentType),
          eq(documentLocks.documentId, documentId)
        )
      );
    return lock || null;
  }

  async deleteDocumentLock(documentType: string, documentId: string): Promise<boolean> {
    const result = await db
      .delete(documentLocks)
      .where(
        and(
          eq(documentLocks.documentType, documentType),
          eq(documentLocks.documentId, documentId)
        )
      );
    return true;
  }

  async forceUnlockDocument(documentId: string, documentType: string): Promise<void> {
    await db
      .delete(documentLocks)
      .where(
        and(
          eq(documentLocks.documentId, documentId),
          eq(documentLocks.documentType, documentType)
        )
      );
  }

  async getActiveDocumentLocks(): Promise<Array<DocumentLock & { user: User | null }>> {
    const locks = await db
      .select({
        id: documentLocks.id,
        documentType: documentLocks.documentType,
        documentId: documentLocks.documentId,
        userId: documentLocks.userId,
        acquiredAt: documentLocks.acquiredAt,
        expiresAt: documentLocks.expiresAt,
        user: users,
      })
      .from(documentLocks)
      .leftJoin(users, eq(documentLocks.userId, users.id))
      .where(sql`${documentLocks.expiresAt} > NOW()`)
      .orderBy(desc(documentLocks.acquiredAt));
    
    return locks;
  }

  async cleanupExpiredLocks(): Promise<void> {
    await db
      .delete(documentLocks)
      .where(sql`${documentLocks.expiresAt} <= NOW()`);
  }

  // Audit log operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getAuditLogs(filters: {
    userId?: string;
    targetType?: string;
    targetId?: string;
    limit?: number;
  } = {}): Promise<Array<AuditLog & { user: { firstName: string | null, lastName: string | null } }>> {
    const { userId, targetType, targetId, limit = 100 } = filters;
    
    let query = db.select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      user: {
        firstName: users.firstName,
        lastName: users.lastName,
      }
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .$dynamic();
    
    // Apply filters
    const conditions = [];
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (targetType) conditions.push(eq(auditLogs.targetType, targetType));
    if (targetId) conditions.push(eq(auditLogs.targetId, targetId));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const results = await query
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    
    return results.map(r => ({
      ...r,
      user: r.user || { firstName: null, lastName: null }
    }));
  }

  // Health Monitoring implementation
  async createHealthCheck(check: {
    endpoint: string;
    status: 'healthy' | 'degraded' | 'down';
    responseTime?: number;
    errorMessage?: string;
  }): Promise<void> {
    const { nanoid } = await import('nanoid');
    await db.insert(healthChecks).values({
      id: nanoid(),
      endpoint: check.endpoint,
      status: check.status,
      responseTime: check.responseTime,
      errorMessage: check.errorMessage,
    });
  }

  async getRecentHealthChecks(endpoint: string, limit: number = 100): Promise<any[]> {
    return await db
      .select()
      .from(healthChecks)
      .where(eq(healthChecks.endpoint, endpoint))
      .orderBy(desc(healthChecks.checkedAt))
      .limit(limit);
  }

  async getLatestHealthStatus(): Promise<Array<{
    endpoint: string;
    status: string;
    responseTime: number | null;
    checkedAt: Date;
  }>> {
    const latestChecks = await db
      .select({
        endpoint: healthChecks.endpoint,
        status: healthChecks.status,
        responseTime: healthChecks.responseTime,
        checkedAt: healthChecks.checkedAt,
      })
      .from(healthChecks)
      .orderBy(desc(healthChecks.checkedAt))
      .limit(100);

    const endpointMap = new Map<string, any>();
    for (const check of latestChecks) {
      if (!endpointMap.has(check.endpoint)) {
        endpointMap.set(check.endpoint, check);
      }
    }

    return Array.from(endpointMap.values());
  }

  async getHealthIncidents(hours: number = 24): Promise<Array<{
    endpoint: string;
    status: string;
    errorMessage: string | null;
    checkedAt: Date;
  }>> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    return await db
      .select({
        endpoint: healthChecks.endpoint,
        status: healthChecks.status,
        errorMessage: healthChecks.errorMessage,
        checkedAt: healthChecks.checkedAt,
      })
      .from(healthChecks)
      .where(
        and(
          gte(healthChecks.checkedAt, cutoffTime),
          or(
            eq(healthChecks.status, 'degraded'),
            eq(healthChecks.status, 'down')
          )
        )
      )
      .orderBy(desc(healthChecks.checkedAt));
  }

  async updateUptimeMetric(metric: {
    date: Date;
    endpoint: string;
    totalChecks: number;
    successfulChecks: number;
    failedChecks: number;
    avgResponseTime: string;
    uptimePercentage: string;
  }): Promise<void> {
    const { nanoid } = await import('nanoid');
    
    const existing = await db
      .select()
      .from(uptimeMetrics)
      .where(
        and(
          eq(uptimeMetrics.date, metric.date),
          eq(uptimeMetrics.endpoint, metric.endpoint)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(uptimeMetrics)
        .set({
          totalChecks: metric.totalChecks,
          successfulChecks: metric.successfulChecks,
          failedChecks: metric.failedChecks,
          avgResponseTime: metric.avgResponseTime,
          uptimePercentage: metric.uptimePercentage,
        })
        .where(eq(uptimeMetrics.id, existing[0].id));
    } else {
      await db.insert(uptimeMetrics).values({
        id: nanoid(),
        date: metric.date,
        endpoint: metric.endpoint,
        totalChecks: metric.totalChecks,
        successfulChecks: metric.successfulChecks,
        failedChecks: metric.failedChecks,
        avgResponseTime: metric.avgResponseTime,
        uptimePercentage: metric.uptimePercentage,
      });
    }
  }

  async getUptimeMetrics(filters?: {
    endpoint?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    let query = db.select().from(uptimeMetrics).$dynamic();

    const conditions = [];
    if (filters?.endpoint) {
      conditions.push(eq(uptimeMetrics.endpoint, filters.endpoint));
    }
    if (filters?.startDate) {
      conditions.push(gte(uptimeMetrics.date, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(sql`${uptimeMetrics.date} <= ${filters.endDate}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(uptimeMetrics.date));
  }

  async getUptimeStats(days: number = 7): Promise<{
    overall: {
      uptimePercentage: number;
      avgResponseTime: number;
      totalChecks: number;
      successfulChecks: number;
      failedChecks: number;
    };
    byEndpoint: Array<{
      endpoint: string;
      uptimePercentage: number;
      avgResponseTime: number;
      totalChecks: number;
    }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Query health_checks directly instead of uptime_metrics
    const checks = await db
      .select()
      .from(healthChecks)
      .where(gte(healthChecks.checkedAt, startDate));

    let totalChecks = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    const endpointStats = new Map<string, {
      totalChecks: number;
      successfulChecks: number;
      totalResponseTime: number;
      responseTimeCount: number;
    }>();

    for (const check of checks) {
      totalChecks++;
      
      if (check.status === 'healthy') {
        totalSuccessful++;
      } else if (check.status === 'down') {
        totalFailed++;
      }

      if (check.responseTime !== null && check.responseTime !== undefined) {
        totalResponseTime += check.responseTime;
        responseTimeCount++;
      }

      if (!endpointStats.has(check.endpoint)) {
        endpointStats.set(check.endpoint, {
          totalChecks: 0,
          successfulChecks: 0,
          totalResponseTime: 0,
          responseTimeCount: 0,
        });
      }

      const epStats = endpointStats.get(check.endpoint)!;
      epStats.totalChecks++;
      
      if (check.status === 'healthy') {
        epStats.successfulChecks++;
      }

      if (check.responseTime !== null && check.responseTime !== undefined) {
        epStats.totalResponseTime += check.responseTime;
        epStats.responseTimeCount++;
      }
    }

    const overall = {
      uptimePercentage: totalChecks > 0 ? (totalSuccessful / totalChecks) * 100 : 0,
      avgResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
      totalChecks,
      successfulChecks: totalSuccessful,
      failedChecks: totalFailed,
    };

    const byEndpoint = Array.from(endpointStats.entries()).map(([endpoint, stats]) => ({
      endpoint,
      uptimePercentage: stats.totalChecks > 0 ? (stats.successfulChecks / stats.totalChecks) * 100 : 0,
      avgResponseTime: stats.responseTimeCount > 0 ? stats.totalResponseTime / stats.responseTimeCount : 0,
      totalChecks: stats.totalChecks,
    }));

    return { overall, byEndpoint };
  }

  // Settings operations
  async getSetting(key: string): Promise<string | null> {
    const [setting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);
    
    return setting?.value || null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({
          value,
          updatedAt: new Date(),
        })
        .where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({
        key,
        value,
      });
    }
  }
}

export const storage = new DatabaseStorage();

// Initialize Evidence Storage with delegates
const progressionDelegate = createSchoolProgressionDelegate(schoolStorage);
const evidenceDelegates = createEvidenceDelegates(storage, progressionDelegate);
const evidenceStorage = getEvidenceStorage(evidenceDelegates);

// Initialize Case Study Storage with storage delegate
const caseStudyStorage = getCaseStudyStorage(storage);
