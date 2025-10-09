import {
  users,
  schools,
  schoolUsers,
  resources,
  evidence,
  evidenceRequirements,
  caseStudies,
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
  type User,
  type UpsertUser,
  type School,
  type InsertSchool,
  type SchoolUser,
  type InsertSchoolUser,
  type Resource,
  type InsertResource,
  type Evidence,
  type InsertEvidence,
  type EvidenceRequirement,
  type InsertEvidenceRequirement,
  type CaseStudy,
  type InsertCaseStudy,
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
  type CreatePasswordUser,
  type CreateOAuthUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, ilike, count, sql, inArray } from "drizzle-orm";
import * as bcrypt from "bcrypt";

export interface IStorage {
  // User operations (required for authentication system)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Authentication methods
  findUserByEmail(email: string): Promise<User | undefined>;
  createUserWithPassword(userData: CreatePasswordUser): Promise<User>;
  createUserWithOAuth(userData: CreateOAuthUser): Promise<User>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  updateUserPassword(id: string, passwordHash: string): Promise<User | undefined>;
  linkGoogleAccount(userId: string, googleId: string): Promise<User | undefined>;
  verifyEmail(userId: string): Promise<User | undefined>;
  verifyPassword(password: string, passwordHash: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
  
  // User management (admin operations)
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // School operations
  createSchool(school: InsertSchool): Promise<School>;
  getSchool(id: string): Promise<School | undefined>;
  getSchoolByName(name: string): Promise<School | undefined>;
  getSchools(filters?: {
    country?: string;
    stage?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<School[]>;
  updateSchool(id: string, updates: Partial<School>): Promise<School | undefined>;
  getSchoolStats(): Promise<{
    totalSchools: number;
    completedAwards: number;
    countries: number;
    studentsImpacted: number;
  }>;
  getUniqueCountries(): Promise<string[]>;
  findSchoolsByEmailDomain(domain: string): Promise<Array<School & { userEmails: string[] }>>;
  
  // School User operations
  addUserToSchool(schoolUser: InsertSchoolUser): Promise<SchoolUser>;
  getSchoolUsers(schoolId: string): Promise<SchoolUser[]>;
  getUserSchools(userId: string): Promise<School[]>;
  
  // School User role management
  getSchoolUser(schoolId: string, userId: string): Promise<SchoolUser | undefined>;
  updateSchoolUserRole(schoolId: string, userId: string, role: 'head_teacher' | 'teacher' | 'pending_teacher'): Promise<SchoolUser | undefined>;
  removeUserFromSchool(schoolId: string, userId: string): Promise<SchoolUser | undefined>;
  getSchoolUsersWithDetails(schoolId: string, filters?: { role?: string; limit?: number; offset?: number }): Promise<Array<SchoolUser & { user: User | null }>>;

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
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Resource[]>;
  updateResourceDownloads(id: string): Promise<void>;
  
  // Evidence operations
  createEvidence(evidence: InsertEvidence): Promise<Evidence>;
  getEvidence(id: string): Promise<Evidence | undefined>;
  getSchoolEvidence(schoolId: string): Promise<Evidence[]>;
  getPendingEvidence(): Promise<Evidence[]>;
  getAllEvidence(statusFilter?: 'pending' | 'approved' | 'rejected'): Promise<Evidence[]>;
  getApprovedPublicEvidence(): Promise<Evidence[]>;
  updateEvidenceStatus(
    id: string, 
    status: 'approved' | 'rejected',
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<Evidence | undefined>;
  updateEvidenceFiles(id: string, files: any[]): Promise<Evidence | undefined>;
  deleteEvidence(id: string): Promise<boolean>;
  deleteSchool(id: string): Promise<boolean>;
  
  // Evidence Requirements operations
  getEvidenceRequirements(stage?: string): Promise<EvidenceRequirement[]>;
  getEvidenceRequirement(id: string): Promise<EvidenceRequirement | undefined>;
  createEvidenceRequirement(data: InsertEvidenceRequirement): Promise<EvidenceRequirement>;
  updateEvidenceRequirement(id: string, data: Partial<InsertEvidenceRequirement>): Promise<EvidenceRequirement | undefined>;
  deleteEvidenceRequirement(id: string): Promise<boolean>;
  getEvidenceByRequirement(requirementId: string): Promise<Evidence[]>;
  
  // Progression system operations
  checkAndUpdateSchoolProgression(schoolId: string): Promise<School | undefined>;
  getSchoolEvidenceCounts(schoolId: string): Promise<{
    inspire: { total: number; approved: number };
    investigate: { total: number; approved: number; hasQuiz: boolean };
    act: { total: number; approved: number };
  }>;
  startNewRound(schoolId: string): Promise<School | undefined>;
  
  // Case Study operations
  createCaseStudy(caseStudy: InsertCaseStudy): Promise<CaseStudy>;
  getCaseStudyById(id: string): Promise<CaseStudy | undefined>;
  getCaseStudies(filters?: {
    stage?: string;
    country?: string;
    featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<CaseStudy[]>;
  updateCaseStudyFeatured(id: string, featured: boolean): Promise<CaseStudy | undefined>;
  getGlobalMovementData(): Promise<{
    featuredCaseStudies: CaseStudy[];
    statistics: {
      totalSchools: number;
      studentsEngaged: number;
      countriesInvolved: number;
    };
  }>;
  
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
  getCertificates(): Promise<Certificate[]>;
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
  }>;
  
  getAllUsersWithSchools(): Promise<Array<{ 
    user: User; 
    schools: Array<School & { role: string }> 
  }>>;

  // Analytics operations
  getAnalyticsOverview(): Promise<{
    totalSchools: number;
    totalUsers: number;
    totalEvidence: number;
    completedAwards: number;
    pendingEvidence: number;
    averageProgress: number;
    studentsImpacted: number;
    countriesReached: number;
  }>;

  getSchoolProgressAnalytics(): Promise<{
    stageDistribution: Array<{ stage: string; count: number }>;
    progressRanges: Array<{ range: string; count: number }>;
    completionRates: Array<{ metric: string; rate: number }>;
    monthlyRegistrations: Array<{ month: string; count: number }>;
    schoolsByCountry: Array<{ country: string; count: number; students: number }>;
  }>;

  getEvidenceAnalytics(): Promise<{
    submissionTrends: Array<{ month: string; submissions: number; approvals: number; rejections: number }>;
    stageBreakdown: Array<{ stage: string; total: number; approved: number; pending: number; rejected: number }>;
    reviewTurnaround: Array<{ range: string; count: number }>;
    topSubmitters: Array<{ schoolName: string; submissions: number; approvalRate: number }>;
  }>;

  getUserEngagementAnalytics(): Promise<{
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
  updateAudit(id: string, updates: Partial<AuditResponse>): Promise<AuditResponse | undefined>;
  submitAudit(id: string, userId: string): Promise<AuditResponse | undefined>;
  reviewAudit(id: string, reviewerId: string, approved: boolean, notes?: string): Promise<AuditResponse | undefined>;
  getPendingAudits(): Promise<Array<AuditResponse & { school: School; submittedByUser: User }>>;
  getAllAudits(filters?: { status?: string; limit?: number; offset?: number }): Promise<Array<AuditResponse & { school: School }>>;

  // Reduction Promise operations
  getReductionPromisesBySchool(schoolId: string): Promise<ReductionPromise[]>;
  getReductionPromisesByAudit(auditId: string): Promise<ReductionPromise[]>;
  createReductionPromise(data: InsertReductionPromise): Promise<ReductionPromise>;
  updateReductionPromise(id: string, data: Partial<InsertReductionPromise>): Promise<ReductionPromise>;
  deleteReductionPromise(id: string): Promise<void>;
  getActivePromisesBySchool(schoolId: string): Promise<ReductionPromise[]>;
  getAllActivePromises(): Promise<ReductionPromise[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for authentication system)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  // Authentication methods implementation
  async findUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  async createUserWithOAuth(userData: CreateOAuthUser): Promise<User> {
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

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
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

  async linkGoogleAccount(userId: string, googleId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ googleId, updatedAt: new Date() })
      .where(eq(users.id, userId))
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

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
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
      .orderBy(asc(users.firstName), asc(users.lastName));
  }

  // School operations
  async createSchool(schoolData: InsertSchool): Promise<School> {
    const [school] = await db
      .insert(schools)
      .values(schoolData)
      .returning();
    return school;
  }

  async getSchool(id: string): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school;
  }

  async getSchoolByName(name: string): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.name, name));
    return school;
  }

  async getSchools(filters: {
    country?: string;
    stage?: string;
    type?: string;
    showOnMap?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<School[]> {
    const conditions = [];
    if (filters.country) {
      conditions.push(eq(schools.country, filters.country));
    }
    if (filters.stage) {
      conditions.push(eq(schools.currentStage, filters.stage as any));
    }
    if (filters.type) {
      conditions.push(eq(schools.type, filters.type as any));
    }
    if (filters.showOnMap !== undefined) {
      conditions.push(eq(schools.showOnMap, filters.showOnMap));
    }
    
    const baseQuery = db
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
        showOnMap: schools.showOnMap,
        primaryContactId: schools.primaryContactId,
        createdAt: schools.createdAt,
        updatedAt: schools.updatedAt,
        primaryContactEmail: users.email,
      })
      .from(schools)
      .leftJoin(users, eq(schools.primaryContactId, users.id))
      .$dynamic();
    
    if (conditions.length > 0) {
      baseQuery.where(and(...conditions));
    }
    
    baseQuery.orderBy(desc(schools.createdAt));
    
    if (filters.limit) {
      baseQuery.limit(filters.limit);
    }
    if (filters.offset) {
      baseQuery.offset(filters.offset);
    }
    
    return await baseQuery;
  }

  async updateSchool(id: string, updates: Partial<School>): Promise<School | undefined> {
    const [school] = await db
      .update(schools)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schools.id, id))
      .returning();
    return school;
  }

  async getSchoolStats(): Promise<{
    totalSchools: number;
    completedAwards: number;
    countries: number;
    studentsImpacted: number;
  }> {
    const [stats] = await db
      .select({
        totalSchools: count(),
        completedAwards: sql<number>`count(*) filter (where award_completed = true)`,
        countries: sql<number>`count(distinct country)`,
        studentsImpacted: sql<number>`coalesce(sum(student_count), 0)`,
      })
      .from(schools);
    
    return {
      totalSchools: stats.totalSchools,
      completedAwards: stats.completedAwards,
      countries: stats.countries,
      studentsImpacted: stats.studentsImpacted,
    };
  }

  async getUniqueCountries(): Promise<string[]> {
    const result = await db
      .selectDistinct({ country: schools.country })
      .from(schools)
      .where(sql`${schools.country} IS NOT NULL AND ${schools.country} != ''`)
      .orderBy(asc(schools.country));
    
    return result.map(row => row.country).filter(Boolean);
  }

  async findSchoolsByEmailDomain(domain: string): Promise<Array<School & { userEmails: string[] }>> {
    const normalizedDomain = domain.toLowerCase().trim();
    
    const results = await db
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
        showOnMap: schools.showOnMap,
        primaryContactId: schools.primaryContactId,
        createdAt: schools.createdAt,
        updatedAt: schools.updatedAt,
        userEmail: users.email,
      })
      .from(schools)
      .innerJoin(schoolUsers, eq(schoolUsers.schoolId, schools.id))
      .innerJoin(users, eq(users.id, schoolUsers.userId))
      .where(
        sql`LOWER(SUBSTRING(${users.email} FROM POSITION('@' IN ${users.email}) + 1)) = ${normalizedDomain}`
      );

    const schoolMap = new Map<string, School & { userEmails: string[] }>();
    
    for (const row of results) {
      const schoolId = row.id;
      
      if (!schoolMap.has(schoolId)) {
        schoolMap.set(schoolId, {
          id: row.id,
          name: row.name,
          type: row.type,
          country: row.country,
          address: row.address,
          studentCount: row.studentCount,
          latitude: row.latitude,
          longitude: row.longitude,
          currentStage: row.currentStage,
          progressPercentage: row.progressPercentage,
          inspireCompleted: row.inspireCompleted,
          investigateCompleted: row.investigateCompleted,
          actCompleted: row.actCompleted,
          awardCompleted: row.awardCompleted,
          featuredSchool: row.featuredSchool,
          showOnMap: row.showOnMap,
          primaryContactId: row.primaryContactId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          userEmails: [],
        });
      }
      
      if (row.userEmail) {
        schoolMap.get(schoolId)!.userEmails.push(row.userEmail);
      }
    }
    
    return Array.from(schoolMap.values()).filter(school => school.userEmails.length >= 2);
  }

  // School User operations
  async addUserToSchool(schoolUserData: InsertSchoolUser): Promise<SchoolUser> {
    const [schoolUser] = await db
      .insert(schoolUsers)
      .values(schoolUserData)
      .returning();
    return schoolUser;
  }

  async getSchoolUsers(schoolId: string): Promise<SchoolUser[]> {
    return await db
      .select()
      .from(schoolUsers)
      .where(eq(schoolUsers.schoolId, schoolId));
  }

  async getUserSchools(userId: string): Promise<School[]> {
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
        showOnMap: schools.showOnMap,
        primaryContactId: schools.primaryContactId,
        createdAt: schools.createdAt,
        updatedAt: schools.updatedAt,
      })
      .from(schools)
      .innerJoin(schoolUsers, eq(schoolUsers.schoolId, schools.id))
      .where(eq(schoolUsers.userId, userId));
  }

  // School User role management
  async getSchoolUser(schoolId: string, userId: string): Promise<SchoolUser | undefined> {
    const [schoolUser] = await db
      .select()
      .from(schoolUsers)
      .where(and(eq(schoolUsers.schoolId, schoolId), eq(schoolUsers.userId, userId)));
    return schoolUser;
  }

  async updateSchoolUserRole(
    schoolId: string,
    userId: string,
    role: 'head_teacher' | 'teacher' | 'pending_teacher'
  ): Promise<SchoolUser | undefined> {
    const [schoolUser] = await db
      .update(schoolUsers)
      .set({ 
        role: role as 'head_teacher' | 'teacher' | 'pending_teacher',
        updatedAt: sql`NOW()`
      })
      .where(and(eq(schoolUsers.schoolId, schoolId), eq(schoolUsers.userId, userId)))
      .returning();
    return schoolUser;
  }

  async removeUserFromSchool(schoolId: string, userId: string): Promise<SchoolUser | undefined> {
    try {
      const [deletedRecord] = await db
        .delete(schoolUsers)
        .where(and(eq(schoolUsers.schoolId, schoolId), eq(schoolUsers.userId, userId)))
        .returning();
      return deletedRecord;
    } catch (error) {
      console.error("Error removing user from school:", error);
      return undefined;
    }
  }

  async getSchoolUsersWithDetails(
    schoolId: string, 
    filters?: { role?: string; limit?: number; offset?: number }
  ): Promise<Array<SchoolUser & { user: User | null }>> {
    let query = db
      .select({
        id: schoolUsers.id,
        schoolId: schoolUsers.schoolId,
        userId: schoolUsers.userId,
        role: schoolUsers.role,
        isVerified: schoolUsers.isVerified,
        invitedBy: schoolUsers.invitedBy,
        invitedAt: schoolUsers.invitedAt,
        verifiedAt: schoolUsers.verifiedAt,
        verificationMethod: schoolUsers.verificationMethod,
        createdAt: schoolUsers.createdAt,
        updatedAt: schoolUsers.updatedAt,
        user: users,
      })
      .from(schoolUsers)
      .leftJoin(users, eq(schoolUsers.userId, users.id))
      .$dynamic();

    const conditions = [eq(schoolUsers.schoolId, schoolId)];
    if (filters?.role) {
      conditions.push(eq(schoolUsers.role, filters.role as any));
    }
    
    query = query.where(and(...conditions));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  // Teacher invitation operations
  async createTeacherInvitation(invitationData: InsertTeacherInvitation): Promise<TeacherInvitation> {
    const [invitation] = await db
      .insert(teacherInvitations)
      .values(invitationData)
      .returning();
    return invitation;
  }

  async getTeacherInvitationByToken(token: string): Promise<TeacherInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(teacherInvitations)
      .where(eq(teacherInvitations.token, token));
    return invitation;
  }

  async getSchoolInvitations(schoolId: string): Promise<TeacherInvitation[]> {
    return await db
      .select()
      .from(teacherInvitations)
      .where(eq(teacherInvitations.schoolId, schoolId))
      .orderBy(desc(teacherInvitations.createdAt));
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
    const [resource] = await db
      .insert(resources)
      .values(resourceData)
      .returning();
    return resource;
  }

  async getResources(filters: {
    stage?: string;
    country?: string;
    language?: string;
    ageRange?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Resource[]> {
    const conditions = [eq(resources.isActive, true)];
    
    if (filters.stage) {
      conditions.push(eq(resources.stage, filters.stage as any));
    }
    if (filters.country) {
      conditions.push(eq(resources.country, filters.country));
    }
    if (filters.language) {
      conditions.push(eq(resources.language, filters.language));
    }
    if (filters.ageRange) {
      conditions.push(eq(resources.ageRange, filters.ageRange));
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
    
    let query = db.select().from(resources)
      .where(and(...conditions))
      .orderBy(desc(resources.createdAt));
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query;
  }

  async updateResourceDownloads(id: string): Promise<void> {
    await db
      .update(resources)
      .set({ downloadCount: sql`download_count + 1` })
      .where(eq(resources.id, id));
  }

  // Evidence operations
  async createEvidence(evidenceData: InsertEvidence): Promise<Evidence> {
    const [evidenceRecord] = await db
      .insert(evidence)
      .values(evidenceData)
      .returning();
    return evidenceRecord;
  }

  async getEvidence(id: string): Promise<Evidence | undefined> {
    const [evidenceRecord] = await db
      .select()
      .from(evidence)
      .where(eq(evidence.id, id));
    return evidenceRecord;
  }

  async getSchoolEvidence(schoolId: string): Promise<Evidence[]> {
    return await db
      .select()
      .from(evidence)
      .where(eq(evidence.schoolId, schoolId))
      .orderBy(desc(evidence.submittedAt));
  }

  async getPendingEvidence(): Promise<Evidence[]> {
    return await db
      .select()
      .from(evidence)
      .where(eq(evidence.status, 'pending'))
      .orderBy(desc(evidence.submittedAt));
  }

  async getAllEvidence(statusFilter?: 'pending' | 'approved' | 'rejected'): Promise<Evidence[]> {
    if (statusFilter) {
      return await db
        .select()
        .from(evidence)
        .where(eq(evidence.status, statusFilter))
        .orderBy(desc(evidence.submittedAt));
    }
    return await db
      .select()
      .from(evidence)
      .orderBy(desc(evidence.submittedAt));
  }

  async getApprovedPublicEvidence(): Promise<Evidence[]> {
    return await db
      .select()
      .from(evidence)
      .where(
        and(
          eq(evidence.status, 'approved'),
          eq(evidence.visibility, 'public')
        )
      )
      .orderBy(desc(evidence.submittedAt));
  }

  async updateEvidenceStatus(
    id: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<Evidence | undefined> {
    const [evidenceRecord] = await db
      .update(evidence)
      .set({
        status: status as any,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes,
        updatedAt: new Date(),
      })
      .where(eq(evidence.id, id))
      .returning();
    return evidenceRecord;
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
    try {
      const result = await db
        .delete(evidence)
        .where(eq(evidence.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Error deleting evidence:", error);
      return false;
    }
  }

  async deleteSchool(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(schools)
        .where(eq(schools.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Error deleting school:", error);
      return false;
    }
  }

  // Evidence Requirements operations
  async getEvidenceRequirements(stage?: string): Promise<EvidenceRequirement[]> {
    if (stage) {
      return await db
        .select()
        .from(evidenceRequirements)
        .where(eq(evidenceRequirements.stage, stage as any))
        .orderBy(asc(evidenceRequirements.orderIndex));
    }
    
    return await db
      .select()
      .from(evidenceRequirements)
      .orderBy(asc(evidenceRequirements.stage), asc(evidenceRequirements.orderIndex));
  }

  async getEvidenceRequirement(id: string): Promise<EvidenceRequirement | undefined> {
    const [requirement] = await db
      .select()
      .from(evidenceRequirements)
      .where(eq(evidenceRequirements.id, id));
    return requirement;
  }

  async createEvidenceRequirement(data: InsertEvidenceRequirement): Promise<EvidenceRequirement> {
    const [requirement] = await db
      .insert(evidenceRequirements)
      .values(data)
      .returning();
    return requirement;
  }

  async updateEvidenceRequirement(
    id: string, 
    data: Partial<InsertEvidenceRequirement>
  ): Promise<EvidenceRequirement | undefined> {
    const [requirement] = await db
      .update(evidenceRequirements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(evidenceRequirements.id, id))
      .returning();
    return requirement;
  }

  async deleteEvidenceRequirement(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(evidenceRequirements)
        .where(eq(evidenceRequirements.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Error deleting evidence requirement:", error);
      return false;
    }
  }

  async getEvidenceByRequirement(requirementId: string): Promise<Evidence[]> {
    return await db
      .select()
      .from(evidence)
      .where(eq(evidence.evidenceRequirementId, requirementId))
      .orderBy(desc(evidence.submittedAt));
  }

  // Progression system operations
  async getSchoolEvidenceCounts(schoolId: string): Promise<{
    inspire: { total: number; approved: number };
    investigate: { total: number; approved: number; hasQuiz: boolean };
    act: { total: number; approved: number };
  }> {
    const school = await this.getSchool(schoolId);
    if (!school) {
      return {
        inspire: { total: 0, approved: 0 },
        investigate: { total: 0, approved: 0, hasQuiz: false },
        act: { total: 0, approved: 0 }
      };
    }

    const currentRound = school.currentRound || 1;

    // Get all evidence for current round
    const allEvidence = await db
      .select()
      .from(evidence)
      .where(
        and(
          eq(evidence.schoolId, schoolId),
          eq(evidence.roundNumber, currentRound)
        )
      );

    const inspireEvidence = allEvidence.filter(e => e.stage === 'inspire');
    const investigateEvidence = allEvidence.filter(e => e.stage === 'investigate');
    const actEvidence = allEvidence.filter(e => e.stage === 'act');

    // Check if school has an approved audit
    const approvedAudit = await db
      .select()
      .from(auditResponses)
      .where(
        and(
          eq(auditResponses.schoolId, schoolId),
          eq(auditResponses.status, 'approved')
        )
      )
      .limit(1);

    const hasQuiz = approvedAudit.length > 0;

    return {
      inspire: {
        total: inspireEvidence.length,
        approved: inspireEvidence.filter(e => e.status === 'approved').length
      },
      investigate: {
        total: investigateEvidence.length,
        approved: investigateEvidence.filter(e => e.status === 'approved').length,
        hasQuiz
      },
      act: {
        total: actEvidence.length,
        approved: actEvidence.filter(e => e.status === 'approved').length
      }
    };
  }

  async checkAndUpdateSchoolProgression(schoolId: string): Promise<School | undefined> {
    const school = await this.getSchool(schoolId);
    if (!school) return undefined;

    const counts = await this.getSchoolEvidenceCounts(schoolId);
    
    let updates: Partial<School> = {};
    let hasChanges = false;

    // Check Inspire completion (3 approved evidence)
    if (counts.inspire.approved >= 3 && !school.inspireCompleted) {
      updates.inspireCompleted = true;
      updates.currentStage = 'investigate';
      hasChanges = true;
    }

    // Check Investigate completion (2 approved items total, counting audit as 1 item)
    const investigateItemCount = counts.investigate.approved + (counts.investigate.hasQuiz ? 1 : 0);
    if (investigateItemCount >= 2 && !school.investigateCompleted) {
      updates.investigateCompleted = true;
      updates.currentStage = 'act';
      updates.auditQuizCompleted = true;
      hasChanges = true;
    }

    // Check Act completion (3 approved evidence)
    if (counts.act.approved >= 3 && !school.actCompleted) {
      updates.actCompleted = true;
      updates.awardCompleted = true;
      hasChanges = true;
      
      // Round completed! Set up for next round
      const roundsCompleted = (school.roundsCompleted || 0) + 1;
      updates.roundsCompleted = roundsCompleted;
    }

    // Calculate progress percentage based on completed stages
    const inspireComplete = updates.inspireCompleted ?? school.inspireCompleted;
    const investigateComplete = updates.investigateCompleted ?? school.investigateCompleted;
    const actComplete = updates.actCompleted ?? school.actCompleted;
    
    let progressPercentage = 0;
    if (actComplete) {
      progressPercentage = 100;
    } else if (investigateComplete) {
      progressPercentage = 67;
    } else if (inspireComplete) {
      progressPercentage = 33;
    }
    
    // Update progress percentage if it has changed
    if (progressPercentage !== school.progressPercentage) {
      updates.progressPercentage = progressPercentage;
      hasChanges = true;
    }

    if (hasChanges) {
      const [updated] = await db
        .update(schools)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(schools.id, schoolId))
        .returning();
      
      // Generate certificate for Round 1 completion
      if (updates.actCompleted && (school.currentRound || 1) === 1) {
        const existingCertificates = await db
          .select()
          .from(certificates)
          .where(
            and(
              eq(certificates.schoolId, schoolId),
              eq(certificates.stage, 'act')
            )
          );
        
        // Only create certificate if one doesn't exist for this stage
        if (existingCertificates.length === 0) {
          const certificateNumber = `PCSR1-${Date.now()}-${schoolId.substring(0, 8)}`;
          
          await db.insert(certificates).values({
            schoolId,
            stage: 'act',
            issuedBy: 'system',
            certificateNumber,
            completedDate: new Date(),
            title: 'Round 1 Completion Certificate',
            description: 'Successfully completed all three stages (Inspire, Investigate, Act) in Round 1',
            metadata: {
              round: 1,
              achievements: {
                inspire: counts.inspire.approved,
                investigate: counts.investigate.approved,
                act: counts.act.approved
              }
            }
          });
        }
      }
      
      return updated;
    }

    return school;
  }

  async startNewRound(schoolId: string): Promise<School | undefined> {
    const school = await this.getSchool(schoolId);
    if (!school) return undefined;

    // Only allow starting new round if current round is complete
    if (!school.awardCompleted) return undefined;

    const nextRound = (school.currentRound || 1) + 1;

    const [updated] = await db
      .update(schools)
      .set({
        currentRound: nextRound,
        currentStage: 'inspire',
        inspireCompleted: false,
        investigateCompleted: false,
        actCompleted: false,
        awardCompleted: false,
        auditQuizCompleted: false,
        progressPercentage: 0,
        updatedAt: new Date()
      })
      .where(eq(schools.id, schoolId))
      .returning();
    
    return updated;
  }

  // Case Study operations
  async createCaseStudy(caseStudyData: InsertCaseStudy): Promise<CaseStudy> {
    const [caseStudy] = await db
      .insert(caseStudies)
      .values(caseStudyData)
      .returning();
    return caseStudy;
  }

  async getCaseStudyById(id: string): Promise<CaseStudy | undefined> {
    const result = await db
      .select({
        id: caseStudies.id,
        title: caseStudies.title,
        description: caseStudies.description,
        stage: caseStudies.stage,
        impact: caseStudies.impact,
        imageUrl: caseStudies.imageUrl,
        featured: caseStudies.featured,
        evidenceId: caseStudies.evidenceId,
        evidenceLink: evidence.fileUrl,
        evidenceFiles: evidence.files,
        schoolId: caseStudies.schoolId,
        schoolName: schools.name,
        schoolCountry: schools.country,
        location: caseStudies.location,
        createdAt: caseStudies.createdAt,
        createdBy: caseStudies.createdBy,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(caseStudies)
      .leftJoin(schools, eq(caseStudies.schoolId, schools.id))
      .leftJoin(evidence, eq(caseStudies.evidenceId, evidence.id))
      .leftJoin(users, eq(caseStudies.createdBy, users.id))
      .where(eq(caseStudies.id, id))
      .limit(1);

    const row = result[0];
    if (!row) return undefined;

    // Compute createdByName in JavaScript for database compatibility
    return {
      ...row,
      createdByName: row.firstName && row.lastName 
        ? `${row.firstName} ${row.lastName}` 
        : 'Unknown',
    } as any;
  }

  async getCaseStudies(filters: {
    stage?: string;
    country?: string;
    featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<CaseStudy[]> {
    const conditions = [];
    
    if (filters.stage) {
      conditions.push(eq(caseStudies.stage, filters.stage as any));
    }
    if (filters.country) {
      conditions.push(eq(schools.country, filters.country));
    }
    if (filters.featured !== undefined) {
      conditions.push(eq(caseStudies.featured, filters.featured));
    }
    if (filters.search) {
      const searchCondition = or(
        ilike(caseStudies.title, `%${filters.search}%`),
        ilike(schools.name, `%${filters.search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }
    
    let query = db
      .select({
        id: caseStudies.id,
        evidenceId: caseStudies.evidenceId,
        schoolId: caseStudies.schoolId,
        title: caseStudies.title,
        description: caseStudies.description,
        stage: caseStudies.stage,
        impact: caseStudies.impact,
        imageUrl: caseStudies.imageUrl,
        featured: caseStudies.featured,
        priority: caseStudies.priority,
        createdBy: caseStudies.createdBy,
        createdAt: caseStudies.createdAt,
        updatedAt: caseStudies.updatedAt,
        schoolName: schools.name,
        schoolCountry: schools.country,
      })
      .from(caseStudies)
      .innerJoin(schools, eq(caseStudies.schoolId, schools.id));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(caseStudies.priority), desc(caseStudies.createdAt));
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query;
  }

  async updateCaseStudyFeatured(id: string, featured: boolean): Promise<CaseStudy | undefined> {
    const [caseStudy] = await db
      .update(caseStudies)
      .set({ featured, updatedAt: new Date() })
      .where(eq(caseStudies.id, id))
      .returning();
    return caseStudy;
  }

  async getGlobalMovementData(): Promise<{
    featuredCaseStudies: CaseStudy[];
    statistics: {
      totalSchools: number;
      studentsEngaged: number;
      countriesInvolved: number;
    };
  }> {
    // Get featured case studies, ordered by priority and newest first
    const featuredCaseStudies = await this.getCaseStudies({ 
      featured: true, 
      limit: 3 
    });

    // Get overall statistics using existing method
    const stats = await this.getSchoolStats();

    return {
      featuredCaseStudies,
      statistics: {
        totalSchools: stats.totalSchools,
        studentsEngaged: stats.studentsImpacted,
        countriesInvolved: stats.countries,
      },
    };
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
    
    let query = db.select().from(mailchimpSubscriptions);
    
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

  // Advanced search operations
  searchGlobal(query: string, options?: {
    contentTypes?: ('resources' | 'schools' | 'evidence' | 'caseStudies')[];
    limit?: number;
    offset?: number;
  }): Promise<{
    resources: Resource[];
    schools: School[];
    evidence: Evidence[];
    caseStudies: CaseStudy[];
    totalResults: number;
  }>;

  searchWithRanking(
    query: string,
    contentType: 'resources' | 'schools' | 'evidence' | 'caseStudies',
    options?: { limit?: number; offset?: number; }
  ): Promise<any[]>;

  // Admin operations
  async getAdminStats(): Promise<{
    totalSchools: number;
    pendingEvidence: number;
    featuredCaseStudies: number;
    activeUsers: number;
  }> {
    const [schoolStats] = await db
      .select({ totalSchools: count() })
      .from(schools);
    
    const [evidenceStats] = await db
      .select({ pendingEvidence: count() })
      .from(evidence)
      .where(eq(evidence.status, 'pending'));
    
    const [caseStudyStats] = await db
      .select({ featuredCaseStudies: count() })
      .from(caseStudies)
      .where(eq(caseStudies.featured, true));
    
    const [userStats] = await db
      .select({ activeUsers: count() })
      .from(users);
    
    return {
      totalSchools: schoolStats.totalSchools,
      pendingEvidence: evidenceStats.pendingEvidence,
      featuredCaseStudies: caseStudyStats.featuredCaseStudies,
      activeUsers: userStats.activeUsers,
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
            id: schools.id,
            name: schools.name,
            type: schools.type,
            country: schools.country,
            address: schools.address,
            studentCount: schools.studentCount,
            currentStage: schools.currentStage,
            progressPercentage: schools.progressPercentage,
            latitude: schools.latitude,
            longitude: schools.longitude,
            showOnMap: schools.showOnMap,
            primaryContactId: schools.primaryContactId,
            createdAt: schools.createdAt,
            updatedAt: schools.updatedAt,
            role: schoolUsers.role,
          })
          .from(schools)
          .innerJoin(schoolUsers, eq(schoolUsers.schoolId, schools.id))
          .where(eq(schoolUsers.userId, user.id));

        return {
          user,
          schools: userSchools,
        };
      })
    );

    return usersWithSchools;
  }

  // Analytics implementations
  async getAnalyticsOverview(): Promise<{
    totalSchools: number;
    totalUsers: number;
    totalEvidence: number;
    completedAwards: number;
    pendingEvidence: number;
    averageProgress: number;
    studentsImpacted: number;
    countriesReached: number;
  }> {
    // Get individual metrics separately to avoid complex subquery issues
    const [schoolsCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(schools);
    const [usersCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    const [evidenceCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(evidence);
    const [awardsCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(schools).where(eq(schools.awardCompleted, true));
    const [pendingCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(evidence).where(eq(evidence.status, 'pending'));
    const [avgProgress] = await db.select({ avg: sql<number>`COALESCE(AVG(progress_percentage), 0)` }).from(schools);
    const [studentsSum] = await db.select({ sum: sql<number>`COALESCE(SUM(student_count), 0)` }).from(schools);
    const [countriesCount] = await db.select({ count: sql<number>`COUNT(DISTINCT country)` }).from(schools);

    return {
      totalSchools: schoolsCount?.count || 0,
      totalUsers: usersCount?.count || 0,
      totalEvidence: evidenceCount?.count || 0,
      completedAwards: awardsCount?.count || 0,
      pendingEvidence: pendingCount?.count || 0,
      averageProgress: avgProgress?.avg || 0,
      studentsImpacted: studentsSum?.sum || 0,
      countriesReached: countriesCount?.count || 0,
    };
  }

  async getSchoolProgressAnalytics(): Promise<{
    stageDistribution: Array<{ stage: string; count: number }>;
    progressRanges: Array<{ range: string; count: number }>;
    completionRates: Array<{ metric: string; rate: number }>;
    monthlyRegistrations: Array<{ month: string; count: number }>;
    schoolsByCountry: Array<{ country: string; count: number; students: number }>;
  }> {
    // Stage distribution
    const stageDistribution = await db
      .select({
        stage: schools.currentStage,
        count: count()
      })
      .from(schools)
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
      .from(schools);

    const completionRates = [
      { metric: 'Inspire', rate: (completionData.inspire / completionData.total) * 100 },
      { metric: 'Investigate', rate: (completionData.investigate / completionData.total) * 100 },
      { metric: 'Act', rate: (completionData.act / completionData.total) * 100 },
      { metric: 'Award', rate: (completionData.award / completionData.total) * 100 }
    ];

    // Monthly registrations (last 12 months)
    const monthlyRegistrations = await db
      .select({
        month: sql<string>`TO_CHAR(created_at, 'YYYY-MM')`,
        count: count()
      })
      .from(schools)
      .where(sql`created_at >= NOW() - INTERVAL '12 months'`)
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
      .groupBy(schools.country)
      .orderBy(desc(count()));

    return {
      stageDistribution,
      progressRanges,
      completionRates,
      monthlyRegistrations,
      schoolsByCountry
    };
  }

  async getEvidenceAnalytics(): Promise<{
    submissionTrends: Array<{ month: string; submissions: number; approvals: number; rejections: number }>;
    stageBreakdown: Array<{ stage: string; total: number; approved: number; pending: number; rejected: number }>;
    reviewTurnaround: Array<{ range: string; count: number }>;
    topSubmitters: Array<{ schoolName: string; submissions: number; approvalRate: number }>;
  }> {
    // Submission trends (last 12 months)
    const submissionTrends = await db
      .select({
        month: sql<string>`TO_CHAR(submitted_at, 'YYYY-MM')`,
        submissions: count(),
        approvals: sql<number>`COUNT(*) FILTER (WHERE status = 'approved')`,
        rejections: sql<number>`COUNT(*) FILTER (WHERE status = 'rejected')`
      })
      .from(evidence)
      .where(sql`submitted_at >= NOW() - INTERVAL '12 months'`)
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
      .groupBy(evidence.stage);

    // Review turnaround (for completed reviews)
    // First, count total reviewed items to ensure sufficient data
    const reviewedCountResult = await db
      .select({
        count: count()
      })
      .from(evidence)
      .where(and(
        sql`reviewed_at IS NOT NULL`,
        sql`submitted_at IS NOT NULL`,
        sql`reviewed_at >= submitted_at`
      ));
    
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
        .where(and(
          sql`reviewed_at IS NOT NULL`,
          sql`submitted_at IS NOT NULL`,
          sql`reviewed_at >= submitted_at`
        ))
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

  async getUserEngagementAnalytics(): Promise<{
    registrationTrends: Array<{ month: string; teachers: number; admins: number }>;
    roleDistribution: Array<{ role: string; count: number }>;
    activeUsers: Array<{ period: string; active: number }>;
    schoolEngagement: Array<{ schoolName: string; users: number; evidence: number; lastActivity: Date }>;
  }> {
    // Registration trends (last 12 months)
    const registrationTrends = await db
      .select({
        month: sql<string>`TO_CHAR(created_at, 'YYYY-MM')`,
        teachers: sql<number>`COUNT(*) FILTER (WHERE role = 'teacher')`,
        admins: sql<number>`COUNT(*) FILTER (WHERE is_admin = true)`
      })
      .from(users)
      .where(sql`created_at >= NOW() - INTERVAL '12 months'`)
      .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(created_at, 'YYYY-MM')`);

    // Role distribution
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
      .groupBy(sql`
        CASE 
          WHEN is_admin = true THEN 'Admin'
          WHEN role = 'teacher' THEN 'Teacher'
          WHEN role = 'head_teacher' THEN 'Head Teacher'
          WHEN role = 'pending_teacher' THEN 'Pending Teacher'
          ELSE COALESCE(role, 'Other')
        END
      `);

    // Active users (based on evidence submissions)
    const activeUsers = [
      {
        period: 'Last 7 days',
        active: (await db
          .select({ count: sql<number>`COUNT(DISTINCT submitted_by)` })
          .from(evidence)
          .where(sql`submitted_at >= NOW() - INTERVAL '7 days'`))[0].count
      },
      {
        period: 'Last 30 days',
        active: (await db
          .select({ count: sql<number>`COUNT(DISTINCT submitted_by)` })
          .from(evidence)
          .where(sql`submitted_at >= NOW() - INTERVAL '30 days'`))[0].count
      },
      {
        period: 'Last 90 days',
        active: (await db
          .select({ count: sql<number>`COUNT(DISTINCT submitted_by)` })
          .from(evidence)
          .where(sql`submitted_at >= NOW() - INTERVAL '90 days'`))[0].count
      }
    ];

    // School engagement
    const schoolEngagement = await db
      .select({
        schoolName: schools.name,
        users: sql<number>`COUNT(DISTINCT school_users.user_id)`,
        evidence: sql<number>`COUNT(DISTINCT evidence.id)`,
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
        downloads: resources.downloadCount,
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
      downloadTrends,
      popularResources,
      resourcesByStage,
      resourcesByCountry
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
        status: emailLogs.status
      })
      .from(emailLogs)
      .orderBy(desc(emailLogs.sentAt))
      .limit(50);

    return {
      deliveryStats,
      templatePerformance,
      recentActivity
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
    try {
      if (useFullTextSearch) {
        return await db
          .select()
          .from(caseStudies)
          .where(
            sql`to_tsvector('english', ${caseStudies.title} || ' ' || coalesce(${caseStudies.description}, '') || ' ' || coalesce(${caseStudies.impact}, '')) @@ websearch_to_tsquery('english', ${query})`
          )
          .orderBy(
            sql`ts_rank(to_tsvector('english', ${caseStudies.title} || ' ' || coalesce(${caseStudies.description}, '') || ' ' || coalesce(${caseStudies.impact}, '')), websearch_to_tsquery('english', ${query})) desc`
          )
          .limit(limit)
          .offset(offset);
      } else {
        // Fallback to ILIKE search
        return await db
          .select()
          .from(caseStudies)
          .where(
            or(
              ilike(caseStudies.title, `%${query}%`),
              ilike(caseStudies.description, `%${query}%`),
              ilike(caseStudies.impact, `%${query}%`)
            )
          )
          .orderBy(desc(caseStudies.createdAt))
          .limit(limit)
          .offset(offset);
      }
    } catch (error) {
      console.error('Error searching case studies:', error);
      // Ultimate fallback
      return await db
        .select()
        .from(caseStudies)
        .where(ilike(caseStudies.title, `%${query}%`))
        .limit(limit)
        .offset(offset);
    }
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
    try {
      if (useFullTextSearch) {
        return await db
          .select({
            id: caseStudies.id,
            evidenceId: caseStudies.evidenceId,
            schoolId: caseStudies.schoolId,
            title: caseStudies.title,
            description: caseStudies.description,
            stage: caseStudies.stage,
            impact: caseStudies.impact,
            imageUrl: caseStudies.imageUrl,
            featured: caseStudies.featured,
            priority: caseStudies.priority,
            createdBy: caseStudies.createdBy,
            createdAt: caseStudies.createdAt,
            updatedAt: caseStudies.updatedAt,
            rank: sql<number>`ts_rank(to_tsvector('english', ${caseStudies.title} || ' ' || coalesce(${caseStudies.description}, '') || ' ' || coalesce(${caseStudies.impact}, '')), websearch_to_tsquery('english', ${query}))`
          })
          .from(caseStudies)
          .where(
            sql`to_tsvector('english', ${caseStudies.title} || ' ' || coalesce(${caseStudies.description}, '') || ' ' || coalesce(${caseStudies.impact}, '')) @@ websearch_to_tsquery('english', ${query})`
          )
          .orderBy(sql`ts_rank(to_tsvector('english', ${caseStudies.title} || ' ' || coalesce(${caseStudies.description}, '') || ' ' || coalesce(${caseStudies.impact}, '')), websearch_to_tsquery('english', ${query})) desc`)
          .limit(limit)
          .offset(offset);
      } else {
        // Fallback without ranking
        return await db
          .select({
            id: caseStudies.id,
            evidenceId: caseStudies.evidenceId,
            schoolId: caseStudies.schoolId,
            title: caseStudies.title,
            description: caseStudies.description,
            stage: caseStudies.stage,
            impact: caseStudies.impact,
            imageUrl: caseStudies.imageUrl,
            featured: caseStudies.featured,
            priority: caseStudies.priority,
            createdBy: caseStudies.createdBy,
            createdAt: caseStudies.createdAt,
            updatedAt: caseStudies.updatedAt,
            rank: sql<number>`1`
          })
          .from(caseStudies)
          .where(
            or(
              ilike(caseStudies.title, `%${query}%`),
              ilike(caseStudies.description, `%${query}%`),
              ilike(caseStudies.impact, `%${query}%`)
            )
          )
          .orderBy(desc(caseStudies.createdAt))
          .limit(limit)
          .offset(offset);
      }
    } catch (error) {
      console.error('Error in searchCaseStudiesWithRanking:', error);
      // Simple fallback - return basic case studies without rank
      const basicResults = await db
        .select()
        .from(caseStudies)
        .where(ilike(caseStudies.title, `%${query}%`))
        .limit(limit)
        .offset(offset);
      
      // Add rank field to match expected interface
      return basicResults.map(caseStudy => ({ ...caseStudy, rank: 1 }));
    }
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

  async getCertificates(): Promise<Certificate[]> {
    return await db.select().from(certificates).where(eq(certificates.isActive, true)).orderBy(desc(certificates.issuedDate));
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

  async getSchoolAudit(schoolId: string): Promise<AuditResponse | undefined> {
    const [audit] = await db
      .select()
      .from(auditResponses)
      .where(eq(auditResponses.schoolId, schoolId))
      .orderBy(desc(auditResponses.createdAt))
      .limit(1);
    return audit;
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

  async createReductionPromise(data: InsertReductionPromise): Promise<ReductionPromise> {
    const [newPromise] = await db
      .insert(reductionPromises)
      .values(data)
      .returning();
    return newPromise;
  }

  async updateReductionPromise(id: string, data: Partial<InsertReductionPromise>): Promise<ReductionPromise> {
    const [updatedPromise] = await db
      .update(reductionPromises)
      .set({ ...data, updatedAt: new Date() })
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
}

export const storage = new DatabaseStorage();
