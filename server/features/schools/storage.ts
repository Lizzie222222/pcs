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
  settings,
  duplicateSchoolGroups,
  notifications,
  passwordResetTokens,
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
  type DuplicateSchoolGroup,
  type InsertDuplicateSchoolGroup,
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
import { alias } from 'drizzle-orm/pg-core';
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

  async getSchool(id: string): Promise<(School & { primaryContactEmail: string | null; primaryContactFirstName: string | null; primaryContactLastName: string | null }) | undefined> {
    const [school] = await db
      .select({
        ...getTableColumns(schools),
        primaryContactEmail: sql<string | null>`COALESCE(${users.email}, ${schools.adminEmail})`,
        primaryContactFirstName: users.firstName,
        primaryContactLastName: users.lastName,
      })
      .from(schools)
      .leftJoin(users, eq(schools.primaryContactId, users.id))
      .where(eq(schools.id, id));
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
        primaryContactEmail: sql<string | null>`COALESCE(${users.email}, ${schools.adminEmail})`,
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

    // If rolling back to a previous round, adjust roundsCompleted
    if (updates.currentRound !== undefined && updates.currentRound < (currentSchool.currentRound || 1)) {
      (updates as any).roundsCompleted = Math.max(0, updates.currentRound - 1);
      console.log(`[Manual Progression] Rolling back from Round ${currentSchool.currentRound} to Round ${updates.currentRound}, resetting roundsCompleted to ${(updates as any).roundsCompleted}`);
    }

    // CRITICAL: If advancing to a new round, reset ALL stage completion flags
    // This mirrors the behavior of startNewRound() to prevent stale completion states
    // Without this, flags like inspireCompleted stay true from the previous round
    if (updates.currentRound !== undefined && updates.currentRound > (currentSchool.currentRound || 1)) {
      console.log(`[Manual Progression] Advancing from Round ${currentSchool.currentRound} to Round ${updates.currentRound}`);
      console.log(`[Manual Progression] Before reset - inspireCompleted: ${currentSchool.inspireCompleted}, investigateCompleted: ${currentSchool.investigateCompleted}, actCompleted: ${currentSchool.actCompleted}`);
      
      // Reset all stage completion flags for the new round
      updates.inspireCompleted = false;
      updates.investigateCompleted = false;
      updates.actCompleted = false;
      (updates as any).awardCompleted = false;
      (updates as any).auditQuizCompleted = false;
      updates.progressPercentage = 0;
      (updates as any).roundCelebrationDismissed = false;
      
      console.log(`[Manual Progression] After reset - all completion flags set to false, progressPercentage set to 0`);
    }

    const [school] = await db
      .update(schools)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schools.id, id))
      .returning();
    return school;
  }

  // Shared helper to get deduplicated evidence count
  // This filters out duplicate evidence created by running the backfill script multiple times
  // Optional date parameters filter evidence by submitted_at when provided
  async getDeduplicatedEvidenceCount(startDate?: string, endDate?: string): Promise<number> {
    // Build date filter for evidence
    const hasDateRange = startDate && endDate;
    const dateFilter = hasDateRange
      ? sql`submitted_at >= ${startDate}::timestamp AND submitted_at < (${endDate}::timestamp + INTERVAL '1 day')`
      : sql`true`;
    
    // Count distinct evidence by grouping on school, requirement, round
    // This automatically collapses duplicates from the backfill script
    const [deduplicatedCount] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT (school_id, evidence_requirement_id, round_number))`,
      })
      .from(evidence)
      .where(dateFilter);
    
    // Legacy stats are always lifetime (no date filtering) since they're historical imports
    const [legacyStats] = await db
      .select({
        legacyTotal: sql<number>`coalesce(sum(legacy_evidence_count), 0)`,
      })
      .from(schoolUsers);
    
    // When filtering by date, only return evidence from that period (no legacy)
    // When showing lifetime (no date filter), include both current evidence and legacy imports
    if (hasDateRange) {
      return Number(deduplicatedCount?.count || 0);
    }
    return Number(deduplicatedCount?.count || 0) + Number(legacyStats?.legacyTotal || 0);
  }

  async getSchoolStats(): Promise<{
    totalSchools: number;
    completedAwards: number;
    countries: number;
    studentsImpacted: number;
  }> {
    const [stats] = await db
      .select({
        totalSchools: sql<number>`count(*)`,
        countries: sql<number>`count(distinct country)`,
        studentsImpacted: sql<number>`coalesce(sum(student_count), 0)`,
      })
      .from(schools);
    
    // Use shared deduplication logic
    const totalActions = await this.getDeduplicatedEvidenceCount();
    
    return {
      totalSchools: Number(stats.totalSchools || 0),
      completedAwards: totalActions,
      countries: Number(stats.countries || 0),
      studentsImpacted: Number(stats.studentsImpacted || 0),
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
  }>> {
    const conditions = [];
    
    // Count ALL schools for map display - no longer filtered by showOnMap
    // This ensures map statistics align with admin dashboard numbers
    
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
        roundsCompleted: schools.roundsCompleted,
      })
      .from(schools);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const allSchools = await query;
    
    const countryMap = new Map<string, {
      countryCode: string;
      countryName: string;
      totalSchools: number;
      completedAwards: number;
      originalCountryCode: string;
    }>();
    
    for (const school of allSchools) {
      const isoCode = getCountryCode(school.country) || school.country;
      
      if (!countryMap.has(isoCode)) {
        const normalizedName = normalizeCountryName(school.country) || school.country;
        countryMap.set(isoCode, {
          countryCode: isoCode,
          countryName: normalizedName,
          totalSchools: 0,
          completedAwards: 0,
          originalCountryCode: school.country,
        });
      }
      
      const countryData = countryMap.get(isoCode)!;
      countryData.totalSchools++;
      
      if ((school.roundsCompleted || 0) >= 1) {
        countryData.completedAwards++;
      }
    }
    
    return Array.from(countryMap.values())
      .map(({ originalCountryCode, ...rest }) => rest)
      .sort((a, b) => b.totalSchools - a.totalSchools);
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
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isAdmin: users.isAdmin,
          preferredLanguage: users.preferredLanguage,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
        },
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

    const results = await query;
    
    // Map results to ensure user is null when all user fields are null (no matching user)
    return results.map(result => ({
      ...result,
      user: result.user?.id ? (result.user as any) : null
    }));
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

  async createTeacherInvitation(invitationData: Omit<TeacherInvitation, 'id' | 'status' | 'createdAt' | 'acceptedAt'>): Promise<TeacherInvitation> {
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

  /**
   * Get all evidence for a school, optionally filtered by round
   * 
   * ROUND FILTERING EXPECTATIONS:
   * =============================
   * The `roundNumber` parameter is OPTIONAL for backward compatibility:
   * 
   * WHY round filtering is needed:
   * - Schools complete multiple rounds, each with separate evidence submissions
   * - Mixing rounds would show duplicate requirement titles and confuse admins
   * - Progress tracking requires round-specific evidence counts
   * 
   * WHEN to provide roundNumber:
   * - SchoolProgressOverride: MUST filter by school.currentRound (line 70)
   * - Dashboard/ProgressTracker: Filter by selectedRound state
   * - Admin evidence review for specific round
   * 
   * WHEN to omit roundNumber (backward compatible, returns ALL):
   * - SchoolProfile Evidence tab uses UI-level filtering instead
   * - Historical evidence export/reports across all rounds
   * 
   * @param schoolId - School ID to fetch evidence for
   * @param roundNumber - Optional round filter. If provided, returns only evidence
   *                      from that round. If omitted, returns ALL rounds (backward compatible).
   * @returns Array of evidence with reviewer details
   */
  async getSchoolEvidence(schoolId: string, roundNumber?: number): Promise<Array<Evidence & { reviewer?: { id: string | null; email: string | null; firstName: string | null; lastName: string | null; } | null; submitter?: { id: string | null; email: string | null; firstName: string | null; lastName: string | null; isAdmin: boolean | null; } | null }>> {
    const conditions = [eq(evidence.schoolId, schoolId)];
    
    if (roundNumber !== undefined) {
      conditions.push(eq(evidence.roundNumber, roundNumber));
    }
    
    // Create alias for submitter users table (since we're joining users twice)
    const submitterUser = alias(users, 'submitter');
    
    return await db
      .select({
        id: evidence.id,
        schoolId: evidence.schoolId,
        submittedBy: evidence.submittedBy,
        evidenceRequirementId: evidence.evidenceRequirementId,
        isBonus: evidence.isBonus,
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
        submitter: {
          id: submitterUser.id,
          email: submitterUser.email,
          firstName: submitterUser.firstName,
          lastName: submitterUser.lastName,
          isAdmin: submitterUser.isAdmin,
        },
      })
      .from(evidence)
      .leftJoin(users, eq(evidence.reviewedBy, users.id))
      .leftJoin(submitterUser, eq(evidence.submittedBy, submitterUser.id))
      .where(and(...conditions))
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

  /**
   * Calculate evidence counts for a school, filtered by round
   * 
   * ROUND FILTERING EXPECTATIONS:
   * =============================
   * The `roundNumber` parameter is OPTIONAL but DEFAULTS to school's currentRound:
   * 
   * WHY round filtering is critical:
   * - Progress percentage must be calculated per-round, not across all rounds
   * - Each round has independent requirements and completion tracking
   * - Mixing rounds would show inflated counts and incorrect progress
   * - Admin overrides are round-specific and must match evidence round
   * 
   * WHEN to provide roundNumber:
   * - ProgressTracker viewing historical rounds: Pass selectedRound state
   * - Admin reports for specific round: Pass explicit round number
   * - Testing/debugging specific round data
   * 
   * WHEN to omit roundNumber (uses school.currentRound):
   * - Dashboard displaying current progress (most common case)
   * - POST /api/evidence review triggering progression check
   * - Automatic progression calculations after evidence approval
   * 
   * CONSISTENCY requirement (CRITICAL):
   * - This method queries evidence, adminOverrides, audits, and actionPlans
   * - ALL queries use the same round number (lines 782-855)
   * - If these get out of sync, progress calculations will be incorrect
   * 
   * @param schoolId - School ID to calculate counts for
   * @param roundNumber - Optional round filter. If provided, counts evidence for that round.
   *                      If omitted, uses school's currentRound (backward compatible).
   * @returns Evidence counts broken down by stage with override counts
   */
  async getSchoolEvidenceCounts(schoolId: string, roundNumber?: number): Promise<{
    inspire: { total: number; approved: number; overrideCount: number };
    investigate: { total: number; approved: number; overrideCount: number; hasQuiz: boolean; hasActionPlan: boolean };
    act: { total: number; approved: number; overrideCount: number };
  }> {
    const school = await this.getSchool(schoolId);
    if (!school) {
      return {
        inspire: { total: 0, approved: 0, overrideCount: 0 },
        investigate: { total: 0, approved: 0, overrideCount: 0, hasQuiz: false, hasActionPlan: false },
        act: { total: 0, approved: 0, overrideCount: 0 }
      };
    }

    // Use provided roundNumber or fall back to school's current round
    const currentRound = roundNumber ?? school.currentRound ?? 1;

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
      
      // Only count homeless evidence (not bonus evidence)
      const evidenceWithoutRequirement = approvedEvidence.filter(e => 
        e.evidenceRequirementId === null && !e.isBonus
      );
      
      const stageOverrides = adminOverrides.filter(o => o.stage === stageId);
      
      stageOverrides.forEach(override => {
        uniqueRequirementIds.add(override.evidenceRequirementId);
      });
      
      return {
        total: uniqueRequirementIds.size + evidenceWithoutRequirement.length,
        overrideCount: stageOverrides.length
      };
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

    // CRITICAL FIX: Also check for admin override on audit requirements
    // Look up by title since database may have 'standard' as requirement_type
    const auditRequirements = await db
      .select({ id: evidenceRequirements.id })
      .from(evidenceRequirements)
      .where(
        and(
          eq(evidenceRequirements.stage, 'investigate'),
          sql`LOWER(${evidenceRequirements.title}) LIKE '%audit%'`
        )
      );
    
    const auditRequirementIds = new Set(auditRequirements.map(r => r.id));
    const hasAuditOverride = adminOverrides.some(
      override => auditRequirementIds.has(override.evidenceRequirementId) && override.stage === 'investigate'
    );

    const hasQuiz = approvedAudit.length > 0 || hasAuditOverride;

    const approvedActionPlans = await db
      .select()
      .from(reductionPromises)
      .where(
        and(
          eq(reductionPromises.schoolId, schoolId),
          eq(reductionPromises.roundNumber, currentRound),
          eq(reductionPromises.reviewStatus, 'approved')
        )
      )
      .limit(1);

    // CRITICAL FIX: Also check for admin override on action plan requirements
    // Look up by title since database may have 'standard' as requirement_type
    const actionPlanRequirements = await db
      .select({ id: evidenceRequirements.id })
      .from(evidenceRequirements)
      .where(
        and(
          eq(evidenceRequirements.stage, 'investigate'),
          sql`LOWER(${evidenceRequirements.title}) LIKE '%action plan%'`
        )
      );
    
    const actionPlanRequirementIds = new Set(actionPlanRequirements.map(r => r.id));
    const hasActionPlanOverride = adminOverrides.some(
      override => actionPlanRequirementIds.has(override.evidenceRequirementId) && override.stage === 'investigate'
    );

    const hasActionPlan = approvedActionPlans.length > 0 || hasActionPlanOverride;

    const inspireCounts = getApprovedRequirementsCount(inspireEvidence, 'inspire');
    const investigateCounts = getApprovedRequirementsCount(investigateEvidence, 'investigate');
    const actCounts = getApprovedRequirementsCount(actEvidence, 'act');

    return {
      inspire: {
        total: inspireEvidence.length,
        approved: inspireCounts.total,
        overrideCount: inspireCounts.overrideCount
      },
      investigate: {
        total: investigateEvidence.length,
        approved: investigateCounts.total,
        overrideCount: investigateCounts.overrideCount,
        hasQuiz,
        hasActionPlan
      },
      act: {
        total: actEvidence.length,
        approved: actCounts.total,
        overrideCount: actCounts.overrideCount
      }
    };
  }

  async checkAndUpdateSchoolProgression(schoolId: string, submitterEmail?: string): Promise<School | undefined> {
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
      
      // Check if ALL stages (Inspire, Investigate, Act) are complete
      const finalInspireCompleted = updates.inspireCompleted ?? school.inspireCompleted;
      const finalInvestigateCompleted = updates.investigateCompleted ?? school.investigateCompleted;
      
      if (finalInspireCompleted && finalInvestigateCompleted) {
        // All three stages are now complete - mark round as completed but DON'T auto-advance
        // Schools can stay in "completed" status and manually choose to start the next round
        justCompletedRound = true;
        
        if (!school.awardCompleted) {
          updates.awardCompleted = true;
          updates.roundsCompleted = (school.roundsCompleted || 0) + 1;
          // Reset celebration dismissed flag so they see the celebration
          updates.roundCelebrationDismissed = false;
          
          console.log(`[Round Completion] School ${schoolId} completed round ${completedRound}. Staying in completed status - school can manually start next round.`);
        }
      } else {
        console.log(`[Round Progression] School ${schoolId} completed Act stage, but Inspire (${finalInspireCompleted}) or Investigate (${finalInvestigateCompleted}) not complete. Not advancing round yet.`);
      }
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
        
        // Increment roundsCompleted but DON'T auto-advance to next round
        // Schools can stay in "completed" status and manually choose to start the next round
        updates.roundsCompleted = (school.roundsCompleted ?? 0) + 1;
        // Reset celebration dismissed flag so they see the celebration
        updates.roundCelebrationDismissed = false;
        
        console.log(`[Round Completion] School ${schoolId} completed round ${completedRound} (catch-up). Staying in completed status - school can manually start next round.`);
      }
    }

    // CRITICAL FIX: Re-fetch evidence counts for the effective round after any round transitions
    // This ensures we don't use stale counts from the previous round
    const effectiveRound = updates.currentRound ?? school.currentRound ?? 1;
    const freshCounts = await this.getSchoolEvidenceCounts(schoolId, effectiveRound);

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
        freshCounts.inspire.approved + 
        freshCounts.investigate.approved + 
        (freshCounts.investigate.hasQuiz ? 1 : 0) +
        (freshCounts.investigate.hasActionPlan ? 1 : 0) +
        freshCounts.act.approved;
      
      const totalEvidence = totalNewApproved;
      
      // CRITICAL FIX: Don't add +2 because audit and action plan are already in investigateRequirements
      // The evidence_requirements table has "Plastic Waste Audit" and "Action Plan Development" entries
      const totalRequired = inspireRequirements + investigateRequirements + actRequirements;
      
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
        freshCounts.inspire.approved + 
        freshCounts.investigate.approved + 
        (freshCounts.investigate.hasQuiz ? 1 : 0) +
        (freshCounts.investigate.hasActionPlan ? 1 : 0) +
        freshCounts.act.approved;
      
      // CRITICAL FIX: Don't add +2 because audit and action plan are already in investigateRequirements
      // The evidence_requirements table has "Plastic Waste Audit" and "Action Plan Development" entries
      const totalRequired = inspireRequirements + investigateRequirements + actRequirements;
      
      if (totalRequired > 0) {
        currentRoundProgress = Math.min(100, Math.round((totalApproved / totalRequired) * 100));
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
    // Cap progress at 100% to prevent over-counting from bonus evidence or admin overrides
    const progressPercentage = Math.min(100, currentRoundProgress);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Progress] School ${schoolId}: Current round progress: ${currentRoundProgress}%, Completed rounds: ${completedRounds}, Progress: ${progressPercentage}%`);
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
        
        // PRIORITY: Use submitter email if provided (person who submitted final piece)
        // FALLBACK: Use primary contact if submitter email not provided
        let recipientEmail: string | undefined;
        let recipientLanguage: string | undefined;
        
        if (submitterEmail) {
          // Submitter completed the round - send to them
          recipientEmail = submitterEmail;
          // Try to get their language preference
          const submitter = await db
            .select()
            .from(users)
            .where(eq(users.email, submitterEmail))
            .limit(1);
          recipientLanguage = submitter[0]?.preferredLanguage ?? 'en';
        } else {
          // Fallback to primary contact
          const primaryContact = school.primaryContactId 
            ? await this.getUser(school.primaryContactId)
            : null;
          recipientEmail = primaryContact?.email ?? undefined;
          recipientLanguage = primaryContact?.preferredLanguage ?? 'en';
        }
        
        if (recipientEmail) {
          const certificateUrl = roundCertificates.length > 0
            ? `${getBaseUrl()}/api/certificates/${roundCertificates[0].id}/download`
            : undefined;
          
          sendCourseCompletionCelebrationEmail(
            recipientEmail,
            school.name,
            currentRound,
            certificateUrl,
            recipientLanguage
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

    const currentRound = school.currentRound || 1;
    const nextRound = currentRound + 1;
    
    // Ensure roundsCompleted reflects the completed round
    // Since awardCompleted is true, we know currentRound was completed
    const updatedRoundsCompleted = Math.max(school.roundsCompleted || 0, currentRound);

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
        roundsCompleted: updatedRoundsCompleted,
        updatedAt: new Date()
      })
      .where(eq(schools.id, schoolId))
      .returning();
    
    return updated;
  }

  async dismissRoundCelebration(schoolId: string): Promise<School | undefined> {
    const school = await this.getSchool(schoolId);
    if (!school) return undefined;

    const [updated] = await db
      .update(schools)
      .set({
        roundCelebrationDismissed: true,
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

  async createInvitation(invitationData: Omit<TeacherInvitation, 'id' | 'createdAt' | 'acceptedAt'>): Promise<TeacherInvitation> {
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

  // ============= DUPLICATE SCHOOL DETECTION METHODS =============

  /**
   * Get the email domain from an email address
   */
  private extractEmailDomain(email: string | null): string | null {
    if (!email) return null;
    const parts = email.toLowerCase().split('@');
    return parts.length === 2 ? parts[1] : null;
  }

  /**
   * Find all schools grouped by email domain (for duplicate detection)
   */
  async findSchoolsByEmailDomainGroups(): Promise<Map<string, School[]>> {
    const allSchools = await db
      .select()
      .from(schools)
      .orderBy(asc(schools.createdAt));

    const domainMap = new Map<string, School[]>();

    for (const school of allSchools) {
      const domain = this.extractEmailDomain(school.adminEmail);
      if (domain) {
        if (!domainMap.has(domain)) {
          domainMap.set(domain, []);
        }
        domainMap.get(domain)!.push(school);
      }
    }

    // Only return domains with more than one school
    const duplicates = new Map<string, School[]>();
    Array.from(domainMap.entries()).forEach(([domain, schoolList]) => {
      if (schoolList.length > 1) {
        duplicates.set(domain, schoolList);
      }
    });

    return duplicates;
  }

  /**
   * Find schools with the same postcode
   */
  async findSchoolsByPostcodeGroups(): Promise<Map<string, School[]>> {
    const allSchools = await db
      .select()
      .from(schools)
      .orderBy(asc(schools.createdAt));

    const postcodeMap = new Map<string, School[]>();

    for (const school of allSchools) {
      const postcode = (school.postcode || school.zipCode || '').toLowerCase().trim();
      if (postcode && postcode.length >= 3) {
        if (!postcodeMap.has(postcode)) {
          postcodeMap.set(postcode, []);
        }
        postcodeMap.get(postcode)!.push(school);
      }
    }

    // Only return postcodes with more than one school
    const duplicates = new Map<string, School[]>();
    Array.from(postcodeMap.entries()).forEach(([postcode, schoolList]) => {
      if (schoolList.length > 1) {
        duplicates.set(postcode, schoolList);
      }
    });

    return duplicates;
  }

  /**
   * Find potential duplicates for a newly registered school
   */
  async findPotentialDuplicatesForSchool(schoolId: string): Promise<Array<{
    matchType: 'email_domain' | 'similar_name' | 'same_postcode';
    matchValue: string;
    matchingSchools: School[];
  }>> {
    const school = await this.getSchool(schoolId);
    if (!school) return [];

    const results: Array<{
      matchType: 'email_domain' | 'similar_name' | 'same_postcode';
      matchValue: string;
      matchingSchools: School[];
    }> = [];

    // Check email domain matches
    const domain = this.extractEmailDomain(school.adminEmail);
    if (domain) {
      const domainMatches = await db
        .select()
        .from(schools)
        .where(
          and(
            sql`LOWER(SUBSTRING(${schools.adminEmail} FROM POSITION('@' IN ${schools.adminEmail}) + 1)) = ${domain}`,
            sql`${schools.id} != ${schoolId}`
          )
        );

      if (domainMatches.length > 0) {
        results.push({
          matchType: 'email_domain',
          matchValue: domain,
          matchingSchools: domainMatches
        });
      }
    }

    // Check postcode matches
    const postcode = (school.postcode || school.zipCode || '').toLowerCase().trim();
    if (postcode && postcode.length >= 3) {
      const postcodeMatches = await db
        .select()
        .from(schools)
        .where(
          and(
            or(
              sql`LOWER(TRIM(${schools.postcode})) = ${postcode}`,
              sql`LOWER(TRIM(${schools.zipCode})) = ${postcode}`
            ),
            sql`${schools.id} != ${schoolId}`
          )
        );

      if (postcodeMatches.length > 0) {
        results.push({
          matchType: 'same_postcode',
          matchValue: postcode,
          matchingSchools: postcodeMatches
        });
      }
    }

    return results;
  }

  /**
   * Get all duplicate school groups
   */
  async getDuplicateGroups(filters?: { status?: string }): Promise<Array<DuplicateSchoolGroup & { 
    schoolDetails: Array<School & { 
      evidenceCount: number; 
      teamMemberCount: number;
      primaryContactEmail: string | null;
    }>;
  }>> {
    const conditions = [];
    if (filters?.status && filters.status !== 'all') {
      conditions.push(eq(duplicateSchoolGroups.status, filters.status as any));
    }

    const groups = await db
      .select()
      .from(duplicateSchoolGroups)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(duplicateSchoolGroups.createdAt));

    // Enrich with school details
    const enrichedGroups = await Promise.all(
      groups.map(async (group) => {
        const schoolIds = group.schoolIds || [];
        
        const schoolDetails = await Promise.all(
          schoolIds.map(async (schoolId) => {
            const school = await this.getSchool(schoolId);
            if (!school) return null;

            // Get evidence count
            const [evidenceCountResult] = await db
              .select({ count: count() })
              .from(evidence)
              .where(eq(evidence.schoolId, schoolId));

            // Get team member count
            const [teamCountResult] = await db
              .select({ count: count() })
              .from(schoolUsers)
              .where(eq(schoolUsers.schoolId, schoolId));

            return {
              ...school,
              evidenceCount: Number(evidenceCountResult?.count || 0),
              teamMemberCount: Number(teamCountResult?.count || 0),
            };
          })
        );

        return {
          ...group,
          schoolDetails: schoolDetails.filter((s): s is NonNullable<typeof s> => s !== null)
        };
      })
    );

    return enrichedGroups;
  }

  /**
   * Get a single duplicate group with full details
   */
  async getDuplicateGroup(groupId: string): Promise<(DuplicateSchoolGroup & {
    schoolDetails: Array<School & {
      evidenceCount: number;
      teamMemberCount: number;
      certificateCount: number;
      primaryContactEmail: string | null;
      primaryContactName: string | null;
    }>;
    resolvedByUser?: { id: string; email: string | null; firstName: string | null; lastName: string | null } | null;
  }) | null> {
    const [group] = await db
      .select()
      .from(duplicateSchoolGroups)
      .where(eq(duplicateSchoolGroups.id, groupId));

    if (!group) return null;

    const schoolIds = group.schoolIds || [];

    const schoolDetails = await Promise.all(
      schoolIds.map(async (schoolId) => {
        const school = await this.getSchool(schoolId);
        if (!school) return null;

        // Get evidence count
        const [evidenceCountResult] = await db
          .select({ count: count() })
          .from(evidence)
          .where(eq(evidence.schoolId, schoolId));

        // Get team member count
        const [teamCountResult] = await db
          .select({ count: count() })
          .from(schoolUsers)
          .where(eq(schoolUsers.schoolId, schoolId));

        // Get certificate count
        const [certCountResult] = await db
          .select({ count: count() })
          .from(certificates)
          .where(eq(certificates.schoolId, schoolId));

        return {
          ...school,
          evidenceCount: Number(evidenceCountResult?.count || 0),
          teamMemberCount: Number(teamCountResult?.count || 0),
          certificateCount: Number(certCountResult?.count || 0),
          primaryContactName: school.primaryContactFirstName && school.primaryContactLastName 
            ? `${school.primaryContactFirstName} ${school.primaryContactLastName}`.trim()
            : null
        };
      })
    );

    let resolvedByUser = null;
    if (group.resolvedBy) {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName
        })
        .from(users)
        .where(eq(users.id, group.resolvedBy));
      resolvedByUser = user || null;
    }

    return {
      ...group,
      schoolDetails: schoolDetails.filter((s): s is NonNullable<typeof s> => s !== null),
      resolvedByUser
    };
  }

  /**
   * Create a duplicate school group
   */
  async createDuplicateGroup(data: InsertDuplicateSchoolGroup): Promise<DuplicateSchoolGroup> {
    // Check if a group with same match type and value already exists
    const [existing] = await db
      .select()
      .from(duplicateSchoolGroups)
      .where(
        and(
          eq(duplicateSchoolGroups.matchType, data.matchType as any),
          eq(duplicateSchoolGroups.matchValue, data.matchValue),
          eq(duplicateSchoolGroups.status, 'new')
        )
      );

    if (existing) {
      // Update existing group with new school IDs
      const existingIds = new Set(existing.schoolIds || []);
      const newIds = data.schoolIds || [];
      newIds.forEach(id => existingIds.add(id));
      
      const [updated] = await db
        .update(duplicateSchoolGroups)
        .set({
          schoolIds: Array.from(existingIds),
          updatedAt: new Date()
        })
        .where(eq(duplicateSchoolGroups.id, existing.id))
        .returning();
      
      return updated;
    }

    const [group] = await db
      .insert(duplicateSchoolGroups)
      .values(data)
      .returning();

    return group;
  }

  /**
   * Dismiss a duplicate group (mark as not duplicates)
   */
  async dismissDuplicateGroup(groupId: string, userId: string, notes?: string): Promise<DuplicateSchoolGroup | null> {
    const [updated] = await db
      .update(duplicateSchoolGroups)
      .set({
        status: 'dismissed',
        resolvedBy: userId,
        resolvedAt: new Date(),
        notes: notes || null,
        updatedAt: new Date()
      })
      .where(eq(duplicateSchoolGroups.id, groupId))
      .returning();

    return updated || null;
  }

  /**
   * Merge schools - transfer all data from source to target school
   */
  async mergeSchools(
    targetSchoolId: string,
    sourceSchoolId: string,
    userId: string,
    mergeOptions: {
      useTargetName?: boolean;
      useTargetAddress?: boolean;
      useTargetStudentCount?: boolean;
      notes?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const targetSchool = await this.getSchool(targetSchoolId);
      const sourceSchool = await this.getSchool(sourceSchoolId);

      if (!targetSchool || !sourceSchool) {
        return { success: false, error: 'One or both schools not found' };
      }

      // Transfer school users
      await db
        .update(schoolUsers)
        .set({ schoolId: targetSchoolId, updatedAt: new Date() })
        .where(eq(schoolUsers.schoolId, sourceSchoolId));

      // Transfer evidence
      await db
        .update(evidence)
        .set({ schoolId: targetSchoolId, updatedAt: new Date() })
        .where(eq(evidence.schoolId, sourceSchoolId));

      // Transfer audit responses
      await db
        .update(auditResponses)
        .set({ schoolId: targetSchoolId, updatedAt: new Date() })
        .where(eq(auditResponses.schoolId, sourceSchoolId));

      // Transfer reduction promises
      await db
        .update(reductionPromises)
        .set({ schoolId: targetSchoolId, updatedAt: new Date() })
        .where(eq(reductionPromises.schoolId, sourceSchoolId));

      // Transfer certificates
      await db
        .update(certificates)
        .set({ schoolId: targetSchoolId, updatedAt: new Date() })
        .where(eq(certificates.schoolId, sourceSchoolId));

      // Transfer admin evidence overrides
      await db
        .update(adminEvidenceOverrides)
        .set({ schoolId: targetSchoolId, updatedAt: new Date() })
        .where(eq(adminEvidenceOverrides.schoolId, sourceSchoolId));

      // Optionally update target school with source school data
      const updates: Partial<School> = {};
      if (!mergeOptions.useTargetName && sourceSchool.name) {
        updates.name = sourceSchool.name;
      }
      if (!mergeOptions.useTargetAddress && sourceSchool.address) {
        updates.address = sourceSchool.address;
      }
      if (!mergeOptions.useTargetStudentCount && sourceSchool.studentCount) {
        updates.studentCount = sourceSchool.studentCount;
      }

      // Update higher progression values from source if applicable
      const sourceProgress = sourceSchool.progressPercentage || 0;
      const targetProgress = targetSchool.progressPercentage || 0;
      if (sourceProgress > targetProgress) {
        updates.progressPercentage = sourceProgress;
        updates.currentStage = sourceSchool.currentStage;
        updates.inspireCompleted = sourceSchool.inspireCompleted || targetSchool.inspireCompleted;
        updates.investigateCompleted = sourceSchool.investigateCompleted || targetSchool.investigateCompleted;
        updates.actCompleted = sourceSchool.actCompleted || targetSchool.actCompleted;
        updates.awardCompleted = sourceSchool.awardCompleted || targetSchool.awardCompleted;
      }

      if (Object.keys(updates).length > 0) {
        await this.updateSchool(targetSchoolId, updates);
      }

      // Mark source school as merged (soft delete)
      // Only add [MERGED] prefix if not already present
      const mergedName = sourceSchool.name.startsWith('[MERGED]') 
        ? sourceSchool.name 
        : `[MERGED] ${sourceSchool.name}`;
      
      await db
        .update(schools)
        .set({
          name: mergedName,
          showOnMap: false,
          updatedAt: new Date()
        })
        .where(eq(schools.id, sourceSchoolId));

      return { success: true };
    } catch (error) {
      console.error('Error merging schools:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Merge multiple source schools into a single target school
   */
  async mergeMultipleSchools(
    targetSchoolId: string,
    sourceSchoolIds: string[],
    userId: string,
    mergeOptions: {
      useTargetName?: boolean;
      useTargetAddress?: boolean;
      useTargetStudentCount?: boolean;
      notes?: string;
    }
  ): Promise<{ success: boolean; mergedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let mergedCount = 0;

    for (const sourceSchoolId of sourceSchoolIds) {
      try {
        const result = await this.mergeSchools(targetSchoolId, sourceSchoolId, userId, mergeOptions);
        if (result.success) {
          mergedCount++;
        } else {
          errors.push(`Failed to merge school ${sourceSchoolId}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Error merging school ${sourceSchoolId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: mergedCount > 0,
      mergedCount,
      errors
    };
  }

  /**
   * Mark a duplicate group as merged
   */
  async markDuplicateGroupMerged(
    groupId: string,
    userId: string,
    targetSchoolId: string,
    notes?: string
  ): Promise<DuplicateSchoolGroup | null> {
    const [updated] = await db
      .update(duplicateSchoolGroups)
      .set({
        status: 'merged',
        resolvedBy: userId,
        resolvedAt: new Date(),
        mergedIntoSchoolId: targetSchoolId,
        notes: notes || null,
        updatedAt: new Date()
      })
      .where(eq(duplicateSchoolGroups.id, groupId))
      .returning();

    return updated || null;
  }

  /**
   * Scan all schools and create duplicate groups
   */
  async scanAndCreateDuplicateGroups(): Promise<{
    emailDomainGroups: number;
    postcodeGroups: number;
    totalSchoolsAffected: number;
  }> {
    let emailDomainGroups = 0;
    let postcodeGroups = 0;
    const affectedSchools = new Set<string>();

    // Find email domain duplicates
    const emailDuplicates = await this.findSchoolsByEmailDomainGroups();
    for (const entry of Array.from(emailDuplicates.entries())) {
      const [domain, schoolList] = entry;
      const schoolIds = schoolList.map((s: School) => s.id);
      await this.createDuplicateGroup({
        matchType: 'email_domain',
        matchValue: domain,
        schoolIds,
        status: 'new'
      });
      emailDomainGroups++;
      schoolIds.forEach((id: string) => affectedSchools.add(id));
    }

    // Find postcode duplicates
    const postcodeDuplicates = await this.findSchoolsByPostcodeGroups();
    for (const entry of Array.from(postcodeDuplicates.entries())) {
      const [postcode, schoolList] = entry;
      const schoolIds = schoolList.map((s: School) => s.id);
      await this.createDuplicateGroup({
        matchType: 'same_postcode',
        matchValue: postcode,
        schoolIds,
        status: 'new'
      });
      postcodeGroups++;
      schoolIds.forEach((id: string) => affectedSchools.add(id));
    }

    return {
      emailDomainGroups,
      postcodeGroups,
      totalSchoolsAffected: affectedSchools.size
    };
  }

  /**
   * Get count of duplicate groups by status
   */
  async getDuplicateGroupCounts(): Promise<{
    new: number;
    reviewed: number;
    dismissed: number;
    merged: number;
    total: number;
  }> {
    const counts = await db
      .select({
        status: duplicateSchoolGroups.status,
        count: count()
      })
      .from(duplicateSchoolGroups)
      .groupBy(duplicateSchoolGroups.status);

    const result = {
      new: 0,
      reviewed: 0,
      dismissed: 0,
      merged: 0,
      total: 0
    };

    for (const row of counts) {
      const status = row.status as keyof typeof result;
      result[status] = Number(row.count);
      result.total += Number(row.count);
    }

    return result;
  }

  /**
   * Create admin notification for duplicate detection
   */
  async createDuplicateNotification(schoolId: string, matchType: string, matchCount: number): Promise<void> {
    await db.insert(notifications).values({
      schoolId: null,
      userId: null,
      type: 'general',
      title: 'Potential Duplicate School Detected',
      message: `A new school registration may be a duplicate. Found ${matchCount} existing school(s) with matching ${matchType.replace('_', ' ')}.`,
      actionUrl: `/admin?tab=schools&filter=duplicates`,
      isRead: false
    });
  }

  /**
   * Get merge preview with user analysis for two schools
   * Returns user counts, potential duplicate users, and non-duplicate users
   */
  async getMergePreview(
    targetSchoolId: string,
    sourceSchoolId: string
  ): Promise<{
    targetSchool: School | undefined;
    sourceSchool: School | undefined;
    targetUsers: Array<{ id: string; email: string | null; firstName: string | null; lastName: string | null; role: string | null; lastActiveAt: Date | null }>;
    sourceUsers: Array<{ id: string; email: string | null; firstName: string | null; lastName: string | null; role: string | null; lastActiveAt: Date | null }>;
    duplicateUsers: Array<{
      targetUser: { id: string; email: string | null; firstName: string | null; lastName: string | null; role: string | null; lastActiveAt: Date | null };
      sourceUser: { id: string; email: string | null; firstName: string | null; lastName: string | null; role: string | null; lastActiveAt: Date | null };
      matchReason: string;
      recommendedSurvivor: 'target' | 'source';
    }>;
    nonDuplicateSourceUsers: Array<{ id: string; email: string | null; firstName: string | null; lastName: string | null; role: string | null; lastActiveAt: Date | null }>;
  }> {
    const targetSchool = await this.getSchool(targetSchoolId);
    const sourceSchool = await this.getSchool(sourceSchoolId);

    // Get users for both schools
    const targetSchoolUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: schoolUsers.role,
        lastActiveAt: users.lastActiveAt
      })
      .from(schoolUsers)
      .innerJoin(users, eq(schoolUsers.userId, users.id))
      .where(eq(schoolUsers.schoolId, targetSchoolId));

    const sourceSchoolUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: schoolUsers.role,
        lastActiveAt: users.lastActiveAt
      })
      .from(schoolUsers)
      .innerJoin(users, eq(schoolUsers.userId, users.id))
      .where(eq(schoolUsers.schoolId, sourceSchoolId));

    // Detect duplicate users by email matching
    const duplicateUsers: Array<{
      targetUser: typeof targetSchoolUsers[0];
      sourceUser: typeof sourceSchoolUsers[0];
      matchReason: string;
      recommendedSurvivor: 'target' | 'source';
    }> = [];

    const matchedSourceUserIds = new Set<string>();

    for (const targetUser of targetSchoolUsers) {
      // Check for email matches (exact or domain match for admin/primary contact emails)
      for (const sourceUser of sourceSchoolUsers) {
        if (matchedSourceUserIds.has(sourceUser.id)) continue;

        // Check for exact email match (handle nulls)
        if (targetUser.email && sourceUser.email && 
            targetUser.email.toLowerCase() === sourceUser.email.toLowerCase()) {
          const targetActiveTime = targetUser.lastActiveAt?.getTime() || 0;
          const sourceActiveTime = sourceUser.lastActiveAt?.getTime() || 0;
          
          duplicateUsers.push({
            targetUser,
            sourceUser,
            matchReason: 'Same email address',
            recommendedSurvivor: sourceActiveTime > targetActiveTime ? 'source' : 'target'
          });
          matchedSourceUserIds.add(sourceUser.id);
          continue;
        }

        // Check for matching name (case-insensitive)
        const targetName = `${(targetUser.firstName || '').toLowerCase()} ${(targetUser.lastName || '').toLowerCase()}`.trim();
        const sourceName = `${(sourceUser.firstName || '').toLowerCase()} ${(sourceUser.lastName || '').toLowerCase()}`.trim();
        
        if (targetName && sourceName && targetName === sourceName) {
          const targetActiveTime = targetUser.lastActiveAt?.getTime() || 0;
          const sourceActiveTime = sourceUser.lastActiveAt?.getTime() || 0;
          
          duplicateUsers.push({
            targetUser,
            sourceUser,
            matchReason: 'Same name',
            recommendedSurvivor: sourceActiveTime > targetActiveTime ? 'source' : 'target'
          });
          matchedSourceUserIds.add(sourceUser.id);
        }
      }
    }

    // Non-duplicate source users (will be transferred to target school)
    const nonDuplicateSourceUsers = sourceSchoolUsers.filter(
      u => !matchedSourceUserIds.has(u.id)
    );

    return {
      targetSchool,
      sourceSchool,
      targetUsers: targetSchoolUsers,
      sourceUsers: sourceSchoolUsers,
      duplicateUsers,
      nonDuplicateSourceUsers
    };
  }

  /**
   * Merge two user accounts - keep survivor, deactivate duplicate
   * Returns the survivor user ID and a reset token for password reset
   */
  async mergeUsers(
    survivorUserId: string,
    duplicateUserId: string,
    adminUserId: string
  ): Promise<{ success: boolean; error?: string; survivorUserId?: string; resetToken?: string }> {
    try {
      // Get both users
      const [survivor] = await db
        .select()
        .from(users)
        .where(eq(users.id, survivorUserId));

      const [duplicate] = await db
        .select()
        .from(users)
        .where(eq(users.id, duplicateUserId));

      if (!survivor || !duplicate) {
        return { success: false, error: 'One or both users not found' };
      }

      // Transfer all school memberships from duplicate to survivor
      // First, get the school IDs where duplicate is a member but survivor is not
      const duplicateSchools = await db
        .select({ schoolId: schoolUsers.schoolId })
        .from(schoolUsers)
        .where(eq(schoolUsers.userId, duplicateUserId));

      const survivorSchools = await db
        .select({ schoolId: schoolUsers.schoolId })
        .from(schoolUsers)
        .where(eq(schoolUsers.userId, survivorUserId));

      const survivorSchoolIds = new Set(survivorSchools.map(s => s.schoolId));

      for (const { schoolId } of duplicateSchools) {
        if (!survivorSchoolIds.has(schoolId)) {
          // Transfer membership - update duplicate's membership to point to survivor
          await db
            .update(schoolUsers)
            .set({ userId: survivorUserId, updatedAt: new Date() })
            .where(
              and(
                eq(schoolUsers.userId, duplicateUserId),
                eq(schoolUsers.schoolId, schoolId)
              )
            );
        } else {
          // Both are members - remove duplicate's membership
          await db
            .delete(schoolUsers)
            .where(
              and(
                eq(schoolUsers.userId, duplicateUserId),
                eq(schoolUsers.schoolId, schoolId)
              )
            );
        }
      }

      // Transfer evidence submissions from duplicate to survivor
      await db
        .update(evidence)
        .set({ submittedBy: survivorUserId, updatedAt: new Date() })
        .where(eq(evidence.submittedBy, duplicateUserId));

      // Update any schools where duplicate is primary contact
      await db
        .update(schools)
        .set({ primaryContactId: survivorUserId, updatedAt: new Date() })
        .where(eq(schools.primaryContactId, duplicateUserId));

      // Deactivate the duplicate user (soft delete with modified email to avoid unique constraint)
      await db
        .update(users)
        .set({
          deletedAt: new Date(),
          email: `[MERGED-${Date.now()}]${duplicate.email || 'no-email'}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, duplicateUserId));

      // Mark survivor as needing password reset
      await db
        .update(users)
        .set({
          needsPasswordReset: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, survivorUserId));

      // Generate a password reset token in the passwordResetTokens table
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
      
      await db.insert(passwordResetTokens).values({
        id: crypto.randomUUID(),
        email: survivor.email || '',
        token: resetToken,
        expiresAt
      });

      return { success: true, survivorUserId, resetToken };
    } catch (error) {
      console.error('Error merging users:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const schoolStorage = new SchoolStorage();
