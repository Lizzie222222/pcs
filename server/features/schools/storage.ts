import { db } from '../../db';
import {
  schools,
  schoolUsers,
  users,
  evidence,
  evidenceRequirements,
  adminEvidenceOverrides,
  teacherInvitations,
  certificates,
  auditResponses,
  reductionPromises,
  type School,
  type InsertSchool,
  type SchoolUser,
  type InsertSchoolUser,
  type User,
  type TeacherInvitation,
  type InsertTeacherInvitation,
  type Evidence,
  type AdminEvidenceOverride,
  type InsertAdminEvidenceOverride,
} from '@shared/schema';
import { 
  eq, 
  and, 
  or, 
  inArray, 
  gte, 
  desc, 
  asc, 
  sql, 
  count, 
  ilike, 
  isNull,
  getTableColumns 
} from 'drizzle-orm';
import { getAllCountryCodes, normalizeCountryName, getCountryCode } from './utils/countryMapping';
import { sendCourseCompletionCelebrationEmail, getBaseUrl } from '../../emailService';

export class SchoolStorage {
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
    const conditions = [];
    if (filters.country && filters.country !== 'all') {
      const allCodes = getAllCountryCodes(filters.country);
      const searchValues = [...allCodes, filters.country];
      
      if (searchValues.length > 1) {
        conditions.push(inArray(schools.country, searchValues));
      } else {
        conditions.push(eq(schools.country, searchValues[0]));
      }
    }
    if (filters.stage && filters.stage !== 'all') {
      conditions.push(eq(schools.currentStage, filters.stage as any));
    }
    if (filters.completionStatus && filters.completionStatus !== 'all') {
      if (filters.completionStatus === 'plastic-clever') {
        conditions.push(gte(schools.roundsCompleted, 1));
      } else if (filters.completionStatus === 'plastic-clever-ii') {
        conditions.push(gte(schools.roundsCompleted, 2));
      } else if (filters.completionStatus === 'plastic-clever-iii') {
        conditions.push(gte(schools.roundsCompleted, 3));
      } else if (filters.completionStatus === 'in-progress') {
        conditions.push(or(eq(schools.roundsCompleted, 0), isNull(schools.roundsCompleted)));
      }
    }
    if (filters.type && filters.type !== 'all') {
      conditions.push(eq(schools.type, filters.type as any));
    }
    if (filters.showOnMap !== undefined) {
      conditions.push(eq(schools.showOnMap, filters.showOnMap));
    }
    if (filters.language && filters.language !== 'all') {
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
      const languageName = languageMap[filters.language] || filters.language;
      conditions.push(eq(schools.primaryLanguage, languageName));
    }
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(schools.name, searchTerm),
          ilike(schools.address, searchTerm),
          ilike(schools.adminEmail, searchTerm)
        )
      );
    }
    if (filters.lastActiveDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.lastActiveDays);
      conditions.push(gte(schools.lastActiveAt, cutoffDate));
    }
    
    if (filters.joinedMonth && filters.joinedYear) {
      const month = parseInt(filters.joinedMonth);
      const year = parseInt(filters.joinedYear);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      conditions.push(and(
        gte(schools.createdAt, startDate),
        sql`${schools.createdAt} <= ${endDate}`
      ));
    } else if (filters.joinedYear) {
      const year = parseInt(filters.joinedYear);
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      conditions.push(and(
        gte(schools.createdAt, startDate),
        sql`${schools.createdAt} <= ${endDate}`
      ));
    }
    
    let query = db
      .select({
        ...getTableColumns(schools),
        primaryContactEmail: users.email,
        primaryContactFirstName: users.firstName,
        primaryContactLastName: users.lastName,
      })
      .from(schools)
      .leftJoin(users, eq(schools.primaryContactId, users.id));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    if (filters.sortBy && filters.sortOrder) {
      const order = filters.sortOrder === 'asc' ? asc : desc;
      switch (filters.sortBy) {
        case 'name':
          query = query.orderBy(order(schools.name)) as any;
          break;
        case 'country':
          query = query.orderBy(order(schools.country)) as any;
          break;
        case 'progress':
          query = query.orderBy(order(schools.progressPercentage)) as any;
          break;
        case 'joinDate':
          query = query.orderBy(order(schools.createdAt)) as any;
          break;
      }
    } else {
      const sortOrder = filters.sortByDate === 'oldest' ? asc : desc;
      query = query.orderBy(sortOrder(schools.createdAt)) as any;
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters.offset) {
      query = query.offset(filters.offset) as any;
    }
    
    let results = await query;
    
    if (filters.interactionStatus && filters.interactionStatus !== 'all') {
      const schoolInteractionQuery = await db
        .select({
          schoolId: schoolUsers.schoolId,
          hasInteractedUser: sql<boolean>`EXISTS(
            SELECT 1 FROM ${schoolUsers} su
            JOIN ${users} u ON su.user_id = u.id
            WHERE su.school_id = ${schoolUsers.schoolId}
            AND u.has_interacted = true
          )`.as('has_interacted_user')
        })
        .from(schoolUsers)
        .groupBy(schoolUsers.schoolId);
      
      const schoolInteractionMap = new Map(
        schoolInteractionQuery.map(row => [row.schoolId, row.hasInteractedUser])
      );
      
      if (filters.interactionStatus === 'interacted') {
        results = results.filter(school => schoolInteractionMap.get(school.id) === true);
      } else if (filters.interactionStatus === 'not-interacted') {
        results = results.filter(school => schoolInteractionMap.get(school.id) !== true);
      }
    }
    
    return results.map(school => ({
      ...school,
      country: normalizeCountryName(school.country) || school.country
    }));
  }

  async updateSchool(id: string, updates: Partial<School>): Promise<School | undefined> {
    const [school] = await db
      .update(schools)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schools.id, id))
      .returning();
    return school;
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

  async manuallyUpdateSchoolProgression(id: string, updates: {
    currentStage?: 'inspire' | 'investigate' | 'act';
    currentRound?: number;
    inspireCompleted?: boolean;
    investigateCompleted?: boolean;
    actCompleted?: boolean;
    progressPercentage?: number;
  }): Promise<School | undefined> {
    const currentSchool = await this.getSchool(id);
    if (!currentSchool) {
      return undefined;
    }

    if (updates.currentRound !== undefined && updates.currentRound < (currentSchool.currentRound || 1)) {
      (updates as any).roundsCompleted = Math.max(0, updates.currentRound - 1);
      console.log(`[Manual Progression] Rolling back from Round ${currentSchool.currentRound} to Round ${updates.currentRound}, resetting roundsCompleted to ${(updates as any).roundsCompleted}`);
    }

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
        countries: sql<number>`count(distinct country)`,
        studentsImpacted: sql<number>`coalesce(sum(student_count), 0)`,
      })
      .from(schools);
    
    const [evidenceStats] = await db
      .select({
        approvedEvidence: sql<number>`count(*) filter (where status = 'approved')`,
      })
      .from(evidence);
    
    const [legacyStats] = await db
      .select({
        legacyTotal: sql<number>`coalesce(sum(legacy_evidence_count), 0)`,
      })
      .from(schoolUsers);
    
    const totalActions = Number(evidenceStats?.approvedEvidence || 0) + Number(legacyStats?.legacyTotal || 0);
    
    return {
      totalSchools: stats.totalSchools,
      completedAwards: totalActions,
      countries: stats.countries,
      studentsImpacted: stats.studentsImpacted,
    };
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
    const conditions = [];
    
    conditions.push(eq(schools.showOnMap, true));
    
    if (filters.country) {
      const allCodes = getAllCountryCodes(filters.country);
      if (allCodes.length > 1) {
        conditions.push(inArray(schools.country, allCodes));
      } else {
        conditions.push(eq(schools.country, allCodes[0]));
      }
    }
    
    if (filters.lastActiveDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.lastActiveDays);
      conditions.push(gte(schools.lastActiveAt, cutoffDate));
    }
    
    let query = db
      .select({
        country: schools.country,
        totalSchools: count(),
        completedAwards: sql<number>`count(*) filter (where ${schools.awardCompleted} = true)`,
        featuredSchools: sql<number>`count(*) filter (where ${schools.featuredSchool} = true)`,
      })
      .from(schools);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    query = query.groupBy(schools.country) as any;
    query = query.orderBy(desc(sql`count(*)`)) as any;
    
    const results = await query;
    
    return results.map(row => {
      const normalizedName = normalizeCountryName(row.country) || row.country;
      const isoCode = getCountryCode(normalizedName) || row.country;
      
      return {
        countryCode: isoCode,
        countryName: normalizedName,
        totalSchools: Number(row.totalSchools),
        completedAwards: Number(row.completedAwards),
        featuredSchools: Number(row.featuredSchools),
      };
    });
  }

  async getUniqueCountries(): Promise<string[]> {
    const result = await db
      .selectDistinct({ country: schools.country })
      .from(schools)
      .where(sql`${schools.country} IS NOT NULL AND ${schools.country} != ''`)
      .orderBy(asc(schools.country));
    
    const countries = result.map(row => row.country).filter(Boolean);
    const normalizedCountries = countries.map(c => normalizeCountryName(c) || c);
    
    const uniqueCountries = Array.from(new Set(normalizedCountries));
    
    return uniqueCountries.sort();
  }

  async findSchoolsByEmailDomain(domain: string): Promise<Array<School & { userEmails: string[] }>> {
    const normalizedDomain = domain.toLowerCase().trim();
    
    const results = await db
      .select({
        ...getTableColumns(schools),
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
        const { userEmail, ...schoolData } = row;
        schoolMap.set(schoolId, {
          ...schoolData,
          userEmails: [],
        });
      }
      
      if (row.userEmail) {
        schoolMap.get(schoolId)!.userEmails.push(row.userEmail);
      }
    }
    
    return Array.from(schoolMap.values()).filter(school => school.userEmails.length >= 2);
  }

  async updateSchoolPhotoConsent(schoolId: string, documentUrl: string, approvedBy?: string): Promise<School | undefined> {
    const [updated] = await db
      .update(schools)
      .set({
        photoConsentDocumentUrl: documentUrl,
        photoConsentStatus: approvedBy ? 'approved' : 'pending',
        photoConsentUploadedAt: new Date(),
        ...(approvedBy ? {
          photoConsentApprovedAt: new Date(),
          photoConsentApprovedBy: approvedBy,
        } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schools.id, schoolId))
      .returning();
    
    return updated;
  }

  async reviewSchoolPhotoConsent(
    schoolId: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    notes?: string
  ): Promise<School | undefined> {
    const updateData: any = {
      photoConsentStatus: status,
      photoConsentReviewNotes: notes || null,
      updatedAt: new Date(),
    };

    if (status === 'approved') {
      updateData.photoConsentApprovedAt = new Date();
      updateData.photoConsentApprovedBy = reviewedBy;
    }

    const [updated] = await db
      .update(schools)
      .set(updateData)
      .where(eq(schools.id, schoolId))
      .returning();
    
    return updated;
  }

  async getSchoolPhotoConsentStatus(schoolId: string): Promise<{
    status: string | null;
    documentUrl: string | null;
    uploadedAt: Date | null;
    approvedAt: Date | null;
    reviewNotes: string | null;
  } | undefined> {
    const school = await db.query.schools.findFirst({
      where: eq(schools.id, schoolId),
      columns: {
        photoConsentStatus: true,
        photoConsentDocumentUrl: true,
        photoConsentUploadedAt: true,
        photoConsentApprovedAt: true,
        photoConsentReviewNotes: true,
      },
    });

    if (!school) return undefined;

    return {
      status: school.photoConsentStatus,
      documentUrl: school.photoConsentDocumentUrl,
      uploadedAt: school.photoConsentUploadedAt,
      approvedAt: school.photoConsentApprovedAt,
      reviewNotes: school.photoConsentReviewNotes,
    };
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
    const pendingSchools = await db
      .select({
        id: schools.id,
        name: schools.name,
        country: schools.country,
        photoConsentDocumentUrl: schools.photoConsentDocumentUrl,
        photoConsentUploadedAt: schools.photoConsentUploadedAt,
        photoConsentStatus: schools.photoConsentStatus,
      })
      .from(schools)
      .where(eq(schools.photoConsentStatus, 'pending'));
    
    return pendingSchools.map(school => ({
      id: school.id,
      name: school.name,
      country: school.country,
      photoConsent: school.photoConsentDocumentUrl || school.photoConsentUploadedAt ? {
        documentUrl: school.photoConsentDocumentUrl,
        uploadedAt: school.photoConsentUploadedAt,
        status: school.photoConsentStatus,
      } : null
    }));
  }

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
      .select(getTableColumns(schools))
      .from(schools)
      .innerJoin(schoolUsers, eq(schoolUsers.schoolId, schools.id))
      .where(eq(schoolUsers.userId, userId));
  }

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
        ...getTableColumns(schoolUsers),
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

  async updateLegacyEvidenceCount(
    schoolId: string,
    userId: string,
    count: number
  ): Promise<SchoolUser | undefined> {
    const [schoolUser] = await db
      .update(schoolUsers)
      .set({ 
        legacyEvidenceCount: count,
        updatedAt: sql`NOW()`
      })
      .where(and(eq(schoolUsers.schoolId, schoolId), eq(schoolUsers.userId, userId)))
      .returning();
    return schoolUser;
  }

  async createTeacherInvitation(invitationData: InsertTeacherInvitation): Promise<TeacherInvitation> {
    const [invitation] = await db
      .insert(teacherInvitations)
      .values(invitationData)
      .returning();
    return invitation;
  }

  async getSchoolInvitations(schoolId: string): Promise<TeacherInvitation[]> {
    return await db
      .select()
      .from(teacherInvitations)
      .where(eq(teacherInvitations.schoolId, schoolId))
      .orderBy(desc(teacherInvitations.createdAt));
  }

  async getSchoolEvidence(schoolId: string): Promise<Array<Evidence & { reviewer?: { id: string | null; email: string | null; firstName: string | null; lastName: string | null; } | null }>> {
    return await db
      .select({
        id: evidence.id,
        schoolId: evidence.schoolId,
        submittedBy: evidence.submittedBy,
        evidenceRequirementId: evidence.evidenceRequirementId,
        title: evidence.title,
        description: evidence.description,
        stage: evidence.stage,
        status: evidence.status,
        visibility: evidence.visibility,
        files: evidence.files,
        videoLinks: evidence.videoLinks,
        reviewedBy: evidence.reviewedBy,
        reviewedAt: evidence.reviewedAt,
        reviewNotes: evidence.reviewNotes,
        assignedTo: evidence.assignedTo,
        isFeatured: evidence.isFeatured,
        isAuditQuiz: evidence.isAuditQuiz,
        roundNumber: evidence.roundNumber,
        hasChildren: evidence.hasChildren,
        parentalConsentFiles: evidence.parentalConsentFiles,
        submittedAt: evidence.submittedAt,
        updatedAt: evidence.updatedAt,
        reviewer: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(evidence)
      .leftJoin(users, eq(evidence.reviewedBy, users.id))
      .where(eq(evidence.schoolId, schoolId))
      .orderBy(desc(evidence.submittedAt));
  }

  async getAdminEvidenceOverrides(schoolId: string, roundNumber?: number): Promise<AdminEvidenceOverride[]> {
    if (roundNumber !== undefined) {
      return await db
        .select()
        .from(adminEvidenceOverrides)
        .where(
          and(
            eq(adminEvidenceOverrides.schoolId, schoolId),
            eq(adminEvidenceOverrides.roundNumber, roundNumber)
          )
        );
    }
    
    return await db
      .select()
      .from(adminEvidenceOverrides)
      .where(eq(adminEvidenceOverrides.schoolId, schoolId));
  }

  async getSchoolEvidenceCounts(schoolId: string): Promise<{
    inspire: { total: number; approved: number };
    investigate: { total: number; approved: number; hasQuiz: boolean; hasActionPlan: boolean };
    act: { total: number; approved: number };
  }> {
    const school = await this.getSchool(schoolId);
    if (!school) {
      return {
        inspire: { total: 0, approved: 0 },
        investigate: { total: 0, approved: 0, hasQuiz: false, hasActionPlan: false },
        act: { total: 0, approved: 0 }
      };
    }

    const currentRound = school.currentRound || 1;

    const allEvidence = await db
      .select()
      .from(evidence)
      .where(
        and(
          eq(evidence.schoolId, schoolId),
          eq(evidence.roundNumber, currentRound)
        )
      );

    const adminOverrides = await db
      .select()
      .from(adminEvidenceOverrides)
      .where(
        and(
          eq(adminEvidenceOverrides.schoolId, schoolId),
          eq(adminEvidenceOverrides.roundNumber, currentRound)
        )
      );

    const inspireEvidence = allEvidence.filter(e => e.stage === 'inspire');
    const investigateEvidence = allEvidence.filter(e => e.stage === 'investigate');
    const actEvidence = allEvidence.filter(e => e.stage === 'act');

    const getApprovedRequirementsCount = (stageEvidence: typeof allEvidence, stageId: string) => {
      const approvedEvidence = stageEvidence.filter(e => e.status === 'approved');
      
      const uniqueRequirementIds = new Set(
        approvedEvidence
          .filter(e => e.evidenceRequirementId !== null)
          .map(e => e.evidenceRequirementId)
      );
      
      const evidenceWithoutRequirement = approvedEvidence.filter(e => e.evidenceRequirementId === null);
      
      const stageOverrides = adminOverrides.filter(o => o.stage === stageId);
      
      stageOverrides.forEach(override => {
        uniqueRequirementIds.add(override.evidenceRequirementId);
      });
      
      return uniqueRequirementIds.size + evidenceWithoutRequirement.length;
    };

    const approvedAudit = await db
      .select()
      .from(auditResponses)
      .where(
        and(
          eq(auditResponses.schoolId, schoolId),
          eq(auditResponses.status, 'approved'),
          eq(auditResponses.roundNumber, currentRound)
        )
      )
      .limit(1);

    const hasQuiz = approvedAudit.length > 0;

    const actionPlans = await db
      .select()
      .from(reductionPromises)
      .where(
        and(
          eq(reductionPromises.schoolId, schoolId),
          eq(reductionPromises.roundNumber, currentRound)
        )
      )
      .limit(1);

    const hasActionPlan = actionPlans.length > 0;

    return {
      inspire: {
        total: inspireEvidence.length,
        approved: getApprovedRequirementsCount(inspireEvidence, 'inspire')
      },
      investigate: {
        total: investigateEvidence.length,
        approved: getApprovedRequirementsCount(investigateEvidence, 'investigate'),
        hasQuiz,
        hasActionPlan
      },
      act: {
        total: actEvidence.length,
        approved: getApprovedRequirementsCount(actEvidence, 'act')
      }
    };
  }

  async checkAndUpdateSchoolProgression(schoolId: string): Promise<School | undefined> {
    const school = await this.getSchool(schoolId);
    if (!school) return undefined;

    const counts = await this.getSchoolEvidenceCounts(schoolId);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Progress] School ${schoolId}: Current round progress: ${school.progressPercentage}%, Completed rounds: ${school.roundsCompleted || 0}, Total progress: ${school.progressPercentage}%`);
    }
    
    const completedRound = school.currentRound || 1;
    
    let updates: Partial<School> = {};
    let hasChanges = false;
    let justCompletedRound = false;

    if (counts.inspire.approved >= 3 && !school.inspireCompleted) {
      updates.inspireCompleted = true;
      hasChanges = true;
    }

    if (counts.investigate.hasQuiz && counts.investigate.hasActionPlan && !school.investigateCompleted) {
      updates.investigateCompleted = true;
      updates.auditQuizCompleted = true;
      hasChanges = true;
    }

    if (counts.act.approved >= 3 && !school.actCompleted) {
      updates.actCompleted = true;
      hasChanges = true;
      justCompletedRound = true;
      
      const roundsCompleted = (school.roundsCompleted || 0) + 1;
      updates.roundsCompleted = roundsCompleted;
      
      const nextRound = (school.currentRound || 1) + 1;
      updates.currentRound = nextRound;
      updates.currentStage = 'inspire';
      updates.inspireCompleted = false;
      updates.investigateCompleted = false;
      updates.actCompleted = false;
      updates.awardCompleted = false;
      updates.auditQuizCompleted = false;
      
      console.log(`[Round Progression] School ${schoolId} completed round ${completedRound}, advancing to round ${nextRound}`);
    }

    if (!justCompletedRound) {
      const finalInspireCompleted = updates.inspireCompleted ?? school.inspireCompleted;
      const finalInvestigateCompleted = updates.investigateCompleted ?? school.investigateCompleted;
      
      let correctStage: 'inspire' | 'investigate' | 'act';
      
      if (!finalInspireCompleted) {
        correctStage = 'inspire';
      } else if (!finalInvestigateCompleted) {
        correctStage = 'investigate';
      } else {
        correctStage = 'act';
      }
      
      if (school.currentStage !== correctStage) {
        updates.currentStage = correctStage;
        hasChanges = true;
      }

      const finalActCompleted = updates.actCompleted ?? school.actCompleted;
      if (finalInspireCompleted && finalInvestigateCompleted && finalActCompleted && !school.awardCompleted) {
        updates.awardCompleted = true;
        hasChanges = true;
        justCompletedRound = true;
        
        if ((school.roundsCompleted || 0) === 0 && !updates.roundsCompleted) {
          updates.roundsCompleted = 1;
        }
        
        const nextRound = (school.currentRound || 1) + 1;
        updates.currentRound = nextRound;
        updates.currentStage = 'inspire';
        updates.inspireCompleted = false;
        updates.investigateCompleted = false;
        updates.actCompleted = false;
        updates.awardCompleted = false;
        updates.auditQuizCompleted = false;
        
        console.log(`[Round Progression] School ${schoolId} completed round ${completedRound} (catch-up), advancing to round ${nextRound}`);
      }
    }

    let currentRoundProgress = 0;
    
    if (school.isMigrated) {
      const inspireComplete = updates.inspireCompleted ?? school.inspireCompleted;
      const investigateComplete = updates.investigateCompleted ?? school.investigateCompleted;
      const actComplete = updates.actCompleted ?? school.actCompleted;
      
      const allRequirements = await db
        .select()
        .from(evidenceRequirements);
      
      const inspireRequirements = allRequirements.filter(r => r.stage === 'inspire').length;
      const investigateRequirements = allRequirements.filter(r => r.stage === 'investigate').length;
      const actRequirements = allRequirements.filter(r => r.stage === 'act').length;
      
      const totalNewApproved = 
        counts.inspire.approved + 
        counts.investigate.approved + 
        (counts.investigate.hasQuiz ? 1 : 0) +
        (counts.investigate.hasActionPlan ? 1 : 0) +
        counts.act.approved;
      
      const totalEvidence = totalNewApproved;
      
      const totalRequired = inspireRequirements + investigateRequirements + actRequirements + 2;
      
      if (totalRequired > 0) {
        currentRoundProgress = Math.min(100, Math.round((totalEvidence / totalRequired) * 100));
      }
      
      const currentRound = school.currentRound || 1;
      if (currentRound === 1) {
        if (actComplete) {
          currentRoundProgress = Math.max(currentRoundProgress, 100);
        } else if (investigateComplete) {
          currentRoundProgress = Math.max(currentRoundProgress, 67);
        } else if (inspireComplete) {
          currentRoundProgress = Math.max(currentRoundProgress, 33);
        }
      }
    } else {
      const allRequirements = await db
        .select()
        .from(evidenceRequirements);
      
      const inspireRequirements = allRequirements.filter(r => r.stage === 'inspire').length;
      const investigateRequirements = allRequirements.filter(r => r.stage === 'investigate').length;
      const actRequirements = allRequirements.filter(r => r.stage === 'act').length;
      
      const totalApproved = 
        counts.inspire.approved + 
        counts.investigate.approved + 
        (counts.investigate.hasQuiz ? 1 : 0) +
        (counts.investigate.hasActionPlan ? 1 : 0) +
        counts.act.approved;
      
      const totalRequired = inspireRequirements + investigateRequirements + actRequirements + 2;
      
      if (totalRequired > 0) {
        currentRoundProgress = Math.round((totalApproved / totalRequired) * 100);
      } else {
        const inspireComplete = updates.inspireCompleted ?? school.inspireCompleted;
        const investigateComplete = updates.investigateCompleted ?? school.investigateCompleted;
        const actComplete = updates.actCompleted ?? school.actCompleted;
        
        if (actComplete) {
          currentRoundProgress = 100;
        } else if (investigateComplete) {
          currentRoundProgress = 67;
        } else if (inspireComplete) {
          currentRoundProgress = 33;
        }
      }
    }
    
    const completedRounds = updates.roundsCompleted ?? school.roundsCompleted ?? 0;
    const progressPercentage = (completedRounds * 100) + currentRoundProgress;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Progress] School ${schoolId}: Current round progress: ${currentRoundProgress}%, Completed rounds: ${completedRounds}, Total progress: ${progressPercentage}%`);
      console.log(`[Progress] School ${schoolId}: Old progress: ${school.progressPercentage}%, New progress: ${progressPercentage}%, Has changes: ${progressPercentage !== school.progressPercentage}`);
    }
    
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
      
      if (justCompletedRound) {
        const currentRound = completedRound;
        
        const existingCertificates = await db
          .select()
          .from(certificates)
          .where(
            and(
              eq(certificates.schoolId, schoolId),
              eq(certificates.stage, 'act'),
              sql`(${certificates.metadata}->>'round')::int = ${currentRound}`
            )
          );
        
        if (existingCertificates.length === 0) {
          const certificateNumber = `PCSR${currentRound}-${Date.now()}-${schoolId.substring(0, 8)}`;
          
          const [newCertificate] = await db.insert(certificates).values({
            schoolId,
            stage: 'act',
            issuedBy: null,
            certificateNumber,
            completedDate: new Date(),
            title: `Round ${currentRound} Completion Certificate`,
            description: `Successfully completed all three stages (Inspire, Investigate, Act) in Round ${currentRound}`,
            metadata: {
              round: currentRound,
              achievements: {
                inspire: counts.inspire.approved,
                investigate: counts.investigate.approved,
                act: counts.act.approved
              }
            }
          }).returning();

          if (newCertificate) {
            console.log(`[Certificate] Created certificate ${newCertificate.id} for school ${schoolId}. PDF will be generated on-demand.`);
          }
        }
      }
      
      if (justCompletedRound) {
        const currentRound = completedRound;
        
        const roundCertificates = await db
          .select()
          .from(certificates)
          .where(
            and(
              eq(certificates.schoolId, schoolId),
              eq(certificates.stage, 'act'),
              sql`(${certificates.metadata}->>'round')::int = ${currentRound}`
            )
          )
          .limit(1);
        
        const primaryContact = school.primaryContactId 
          ? await this.getUser(school.primaryContactId)
          : null;
        
        if (primaryContact?.email) {
          const certificateUrl = roundCertificates.length > 0
            ? `${getBaseUrl()}/api/certificates/${roundCertificates[0].id}/download`
            : undefined;
          
          sendCourseCompletionCelebrationEmail(
            primaryContact.email,
            school.name,
            currentRound,
            certificateUrl,
            primaryContact.preferredLanguage ?? undefined
          ).catch(err => console.error('Failed to send celebration email:', err));
        }
      }
      
      return updated;
    }

    return school;
  }

  async startNewRound(schoolId: string): Promise<School | undefined> {
    const school = await this.getSchool(schoolId);
    if (!school) return undefined;

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

  async migrateStuckSchools(): Promise<{ fixed: number; schools: string[] }> {
    console.log('[Migration] Checking for schools stuck in previous rounds...');
    
    const allSchools = await db.select().from(schools);
    
    const stuckSchools = allSchools.filter(school => {
      const roundsCompleted = school.roundsCompleted || 0;
      const currentRound = school.currentRound || 1;
      
      return roundsCompleted > 0 && currentRound <= roundsCompleted;
    });
    
    if (stuckSchools.length === 0) {
      console.log('[Migration] No stuck schools found.');
      return { fixed: 0, schools: [] };
    }
    
    console.log(`[Migration] Found ${stuckSchools.length} stuck schools. Fixing...`);
    
    const fixedSchools: string[] = [];
    
    for (const school of stuckSchools) {
      const roundsCompleted = school.roundsCompleted || 0;
      const correctRound = roundsCompleted + 1;
      
      console.log(`[Migration] Fixing school ${school.id} (${school.name}): roundsCompleted=${roundsCompleted}, currentRound=${school.currentRound} -> ${correctRound}`);
      
      await db
        .update(schools)
        .set({
          currentRound: correctRound,
          currentStage: 'inspire',
          inspireCompleted: false,
          investigateCompleted: false,
          actCompleted: false,
          awardCompleted: false,
          auditQuizCompleted: false,
          updatedAt: new Date()
        })
        .where(eq(schools.id, school.id));
      
      fixedSchools.push(`${school.name} (${school.id})`);
    }
    
    console.log(`[Migration] Successfully fixed ${fixedSchools.length} schools.`);
    
    return { fixed: fixedSchools.length, schools: fixedSchools };
  }

  private async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getSchoolsWithImageCounts(): Promise<Array<School & { imageCount: number }>> {
    const schoolsList = await db
      .select({
        ...getTableColumns(schools),
        imageCount: sql<number>`COALESCE(COUNT(DISTINCT ${evidence.id}) FILTER (WHERE ${evidence.status} = 'approved'), 0)`.as('imageCount')
      })
      .from(schools)
      .leftJoin(evidence, eq(schools.id, evidence.schoolId))
      .groupBy(schools.id)
      .orderBy(desc(schools.createdAt));
    
    return schoolsList;
  }

  async getSchoolByDomain(domain: string): Promise<School | undefined> {
    const normalizedDomain = domain.toLowerCase().trim();
    
    const [school] = await db
      .select()
      .from(schools)
      .where(
        sql`LOWER(SUBSTRING(${schools.adminEmail} FROM POSITION('@' IN ${schools.adminEmail}) + 1)) = ${normalizedDomain}`
      )
      .limit(1);
    
    return school;
  }

  async getInvitationByEmail(schoolId: string, email: string): Promise<TeacherInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(teacherInvitations)
      .where(and(
        eq(teacherInvitations.schoolId, schoolId),
        eq(teacherInvitations.email, email.toLowerCase())
      ))
      .orderBy(desc(teacherInvitations.createdAt))
      .limit(1);
    
    return invitation;
  }

  async createInvitation(invitationData: InsertTeacherInvitation): Promise<TeacherInvitation> {
    return this.createTeacherInvitation(invitationData);
  }

  async getPendingVerificationRequest(schoolId: string, userId: string): Promise<any | undefined> {
    const { verificationRequests } = await import('@shared/schema');
    
    const [request] = await db
      .select()
      .from(verificationRequests)
      .where(and(
        eq(verificationRequests.schoolId, schoolId),
        eq(verificationRequests.userId, userId),
        eq(verificationRequests.status, 'pending')
      ))
      .limit(1);
    
    return request;
  }

  async createVerificationRequest(requestData: any): Promise<any> {
    const { verificationRequests } = await import('@shared/schema');
    
    const [request] = await db
      .insert(verificationRequests)
      .values(requestData)
      .returning();
    
    return request;
  }

  async getSchoolVerificationRequests(schoolId: string): Promise<any[]> {
    const { verificationRequests } = await import('@shared/schema');
    
    return await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.schoolId, schoolId))
      .orderBy(desc(verificationRequests.createdAt));
  }

  async getSchoolCertificates(schoolId: string): Promise<any[]> {
    return await db
      .select()
      .from(certificates)
      .where(eq(certificates.schoolId, schoolId))
      .orderBy(desc(certificates.issuedDate));
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
    fileTypeDistribution: Record<string, number>;
  }> {
    const submissionsByMonth = await db
      .select({
        month: sql<string>`TO_CHAR(${evidence.submittedAt}, 'YYYY-MM')`,
        count: count()
      })
      .from(evidence)
      .where(eq(evidence.schoolId, schoolId))
      .groupBy(sql`TO_CHAR(${evidence.submittedAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${evidence.submittedAt}, 'YYYY-MM')`);

    const teamMembers = await db
      .select({
        userId: schoolUsers.userId,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(schoolUsers)
      .leftJoin(users, eq(schoolUsers.userId, users.id))
      .where(eq(schoolUsers.schoolId, schoolId));

    const teamContributions = await Promise.all(
      teamMembers.map(async (member) => {
        const submissions = await db
          .select({
            total: count(),
            approved: sql<number>`COUNT(*) FILTER (WHERE ${evidence.status} = 'approved')`
          })
          .from(evidence)
          .where(and(
            eq(evidence.schoolId, schoolId),
            eq(evidence.submittedBy, member.userId)
          ));

        return {
          userId: member.userId,
          userName: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown',
          submissionCount: Number(submissions[0]?.total || 0),
          approvedCount: Number(submissions[0]?.approved || 0)
        };
      })
    );

    const school = await this.getSchool(schoolId);
    const stageTimeline = [
      {
        stage: 'inspire' as const,
        completedAt: school?.inspireCompleted ? school.updatedAt?.toISOString() || null : null,
        daysToComplete: null
      },
      {
        stage: 'investigate' as const,
        completedAt: school?.investigateCompleted ? school.updatedAt?.toISOString() || null : null,
        daysToComplete: null
      },
      {
        stage: 'act' as const,
        completedAt: school?.actCompleted ? school.updatedAt?.toISOString() || null : null,
        daysToComplete: null
      }
    ];

    const reviewStats = await db
      .select({
        pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${evidence.status} = 'pending')`,
        approvedCount: sql<number>`COUNT(*) FILTER (WHERE ${evidence.status} = 'approved')`,
        rejectedCount: sql<number>`COUNT(*) FILTER (WHERE ${evidence.status} = 'rejected')`,
        avgReviewTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${evidence.reviewedAt} - ${evidence.submittedAt})) / 3600) FILTER (WHERE ${evidence.reviewedAt} IS NOT NULL)`
      })
      .from(evidence)
      .where(eq(evidence.schoolId, schoolId));

    return {
      submissionTrends: submissionsByMonth.map(row => ({
        month: row.month,
        count: Number(row.count)
      })),
      teamContributions,
      stageTimeline,
      reviewStats: {
        averageReviewTimeHours: Number(reviewStats[0]?.avgReviewTime || 0),
        pendingCount: Number(reviewStats[0]?.pendingCount || 0),
        approvedCount: Number(reviewStats[0]?.approvedCount || 0),
        rejectedCount: Number(reviewStats[0]?.rejectedCount || 0)
      },
      fileTypeDistribution: {}
    };
  }

  async getSchoolAuditAnalytics(schoolId: string): Promise<{
    totalAudits: number;
    completedAudits: number;
    averageScore: number;
    latestAudit: any;
    trends: Array<{ date: string; score: number }>;
  }> {
    const audits = await db
      .select()
      .from(auditResponses)
      .where(eq(auditResponses.schoolId, schoolId))
      .orderBy(desc(auditResponses.createdAt));

    const completedAudits = audits.filter(a => a.status === 'approved');
    
    return {
      totalAudits: audits.length,
      completedAudits: completedAudits.length,
      averageScore: 0,
      latestAudit: audits[0] || null,
      trends: []
    };
  }
}

export const schoolStorage = new SchoolStorage();
