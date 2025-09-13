import {
  users,
  schools,
  schoolUsers,
  resources,
  evidence,
  caseStudies,
  emailLogs,
  mailchimpAudiences,
  mailchimpSubscriptions,
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
  type CaseStudy,
  type InsertCaseStudy,
  type EmailLog,
  type InsertEmailLog,
  type MailchimpAudience,
  type InsertMailchimpAudience,
  type MailchimpSubscription,
  type InsertMailchimpSubscription,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, ilike, count, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
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
  
  // School User operations
  addUserToSchool(schoolUser: InsertSchoolUser): Promise<SchoolUser>;
  getSchoolUsers(schoolId: string): Promise<SchoolUser[]>;
  getUserSchools(userId: string): Promise<School[]>;
  
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
  getAllEvidence(): Promise<Evidence[]>;
  updateEvidenceStatus(
    id: string, 
    status: 'approved' | 'rejected',
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<Evidence | undefined>;
  
  // Case Study operations
  createCaseStudy(caseStudy: InsertCaseStudy): Promise<CaseStudy>;
  getCaseStudies(filters?: {
    stage?: string;
    country?: string;
    featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<CaseStudy[]>;
  updateCaseStudyFeatured(id: string, featured: boolean): Promise<CaseStudy | undefined>;
  
  // Email operations
  logEmail(emailLog: InsertEmailLog): Promise<EmailLog>;
  
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
  
  // Admin operations
  getAdminStats(): Promise<{
    totalSchools: number;
    pendingEvidence: number;
    featuredCaseStudies: number;
    activeUsers: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
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
    limit?: number;
    offset?: number;
  } = {}): Promise<School[]> {
    let query = db.select().from(schools);
    
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
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(schools.createdAt));
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query;
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
        primaryContactId: schools.primaryContactId,
        createdAt: schools.createdAt,
        updatedAt: schools.updatedAt,
      })
      .from(schools)
      .innerJoin(schoolUsers, eq(schools.id, schoolUsers.schoolId))
      .where(eq(schoolUsers.userId, userId));
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
    let query = db.select().from(resources);
    
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
      conditions.push(
        or(
          ilike(resources.title, `%${filters.search}%`),
          ilike(resources.description, `%${filters.search}%`)
        )
      );
    }
    
    query = query.where(and(...conditions));
    query = query.orderBy(desc(resources.createdAt));
    
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

  async getAllEvidence(): Promise<Evidence[]> {
    return await db
      .select()
      .from(evidence)
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

  // Case Study operations
  async createCaseStudy(caseStudyData: InsertCaseStudy): Promise<CaseStudy> {
    const [caseStudy] = await db
      .insert(caseStudies)
      .values(caseStudyData)
      .returning();
    return caseStudy;
  }

  async getCaseStudies(filters: {
    stage?: string;
    country?: string;
    featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<CaseStudy[]> {
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
      conditions.push(
        or(
          ilike(caseStudies.title, `%${filters.search}%`),
          ilike(schools.name, `%${filters.search}%`)
        )
      );
    }
    
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

  // Email operations
  async logEmail(emailLogData: InsertEmailLog): Promise<EmailLog> {
    const [emailLog] = await db
      .insert(emailLogs)
      .values(emailLogData)
      .returning();
    return emailLog;
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
    let query = db.select().from(mailchimpSubscriptions);
    
    const conditions = [];
    if (audienceId) conditions.push(eq(mailchimpSubscriptions.audienceId, audienceId));
    if (email) conditions.push(eq(mailchimpSubscriptions.email, email));
    
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
}

export const storage = new DatabaseStorage();
