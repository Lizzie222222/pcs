import {
  users,
  schools,
  schoolUsers,
  resources,
  evidence,
  caseStudies,
  emailLogs,
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
}

export const storage = new DatabaseStorage();
