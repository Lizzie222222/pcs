import { db } from '../../db';
import { 
  caseStudies, 
  caseStudyVersions,
  schools 
} from '@shared/schema';
import type {
  CaseStudy,
  InsertCaseStudy,
  CaseStudyVersion,
  InsertCaseStudyVersion,
} from '@shared/schema';
import { eq, and, or, desc, ilike, sql } from 'drizzle-orm';

/**
 * Case Study Storage
 * 
 * Handles all case study database operations including:
 * - Case study CRUD operations
 * - Version management for tracking changes
 * - Related case studies with scoring algorithm
 * - Global movement data aggregation
 * - Full-text search capabilities
 * 
 * Follows the delegation pattern established in Schools and Evidence modules.
 */
export class CaseStudyStorage {
  private storage: any;

  constructor(storage: any) {
    this.storage = storage;
  }

  /**
   * Create a new case study
   * @param caseStudyData - Case study data to insert
   * @returns Created case study
   */
  async createCaseStudy(caseStudyData: InsertCaseStudy): Promise<CaseStudy> {
    const [caseStudy] = await db
      .insert(caseStudies)
      .values(caseStudyData)
      .returning();
    return caseStudy;
  }

  /**
   * Get case study by ID with school details
   * @param id - Case study ID
   * @returns Case study with school data or undefined
   */
  async getCaseStudyById(id: string): Promise<CaseStudy | undefined> {
    const [caseStudy] = await db
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
        images: caseStudies.images,
        videos: caseStudies.videos,
        studentQuotes: caseStudies.studentQuotes,
        impactMetrics: caseStudies.impactMetrics,
        timelineSections: caseStudies.timelineSections,
        categories: caseStudies.categories,
        tags: caseStudies.tags,
        status: caseStudies.status,
        templateType: caseStudies.templateType,
        beforeImage: caseStudies.beforeImage,
        afterImage: caseStudies.afterImage,
        metaDescription: caseStudies.metaDescription,
        metaKeywords: caseStudies.metaKeywords,
        reviewStatus: caseStudies.reviewStatus,
        submittedAt: caseStudies.submittedAt,
        reviewedBy: caseStudies.reviewedBy,
        reviewedAt: caseStudies.reviewedAt,
        reviewNotes: caseStudies.reviewNotes,
        createdBy: caseStudies.createdBy,
        createdAt: caseStudies.createdAt,
        updatedAt: caseStudies.updatedAt,
        schoolName: schools.name,
        schoolCountry: schools.country,
        schoolLanguage: schools.primaryLanguage,
      })
      .from(caseStudies)
      .leftJoin(schools, eq(caseStudies.schoolId, schools.id))
      .where(eq(caseStudies.id, id))
      .limit(1);
    
    return caseStudy as any;
  }

  /**
   * Get case studies with optional filters
   * Supports filtering by stage, country, school type, featured status, search term, categories, tags, and status
   * 
   * @param filters - Filter criteria
   * @returns Array of case studies with school details
   */
  async getCaseStudies(filters: {
    stage?: string;
    country?: string;
    schoolType?: string;
    featured?: boolean;
    search?: string;
    categories?: string[];
    tags?: string[];
    status?: 'draft' | 'published';
    limit?: number;
    offset?: number;
  } = {}): Promise<CaseStudy[]> {
    const conditions = [];
    
    if (filters.stage) {
      conditions.push(eq(caseStudies.stage, filters.stage as any));
    }
    if (filters.country) {
      const schoolConditions = await db.select({ id: schools.id })
        .from(schools)
        .where(eq(schools.country, filters.country));
      const schoolIds = schoolConditions.map(s => s.id);
      if (schoolIds.length > 0) {
        conditions.push(sql`${caseStudies.schoolId} IN (${sql.join(schoolIds.map(id => sql`${id}`), sql`, `)})`);
      } else {
        // No schools match the country filter, return empty
        return [];
      }
    }
    if (filters.schoolType) {
      const schoolConditions = await db.select({ id: schools.id })
        .from(schools)
        .where(eq(schools.type, filters.schoolType as any));
      const schoolIds = schoolConditions.map(s => s.id);
      if (schoolIds.length > 0) {
        conditions.push(sql`${caseStudies.schoolId} IN (${sql.join(schoolIds.map(id => sql`${id}`), sql`, `)})`);
      } else {
        // No schools match the school type filter, return empty
        return [];
      }
    }
    if (filters.featured !== undefined) {
      conditions.push(eq(caseStudies.featured, filters.featured));
    }
    if (filters.search) {
      const searchCondition = ilike(caseStudies.title, `%${filters.search}%`);
      conditions.push(searchCondition);
    }
    
    // Filter by categories (array overlap - any match)
    if (filters.categories && filters.categories.length > 0) {
      conditions.push(sql`${caseStudies.categories} && ${filters.categories}::jsonb`);
    }
    
    // Filter by tags (array overlap - any match)
    if (filters.tags && filters.tags.length > 0) {
      conditions.push(sql`${caseStudies.tags} && ${filters.tags}::jsonb`);
    }
    
    // Filter by status
    if (filters.status) {
      conditions.push(eq(caseStudies.status, filters.status));
    }
    
    let query = db.select({
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
      images: caseStudies.images,
      videos: caseStudies.videos,
      studentQuotes: caseStudies.studentQuotes,
      impactMetrics: caseStudies.impactMetrics,
      timelineSections: caseStudies.timelineSections,
      categories: caseStudies.categories,
      tags: caseStudies.tags,
      status: caseStudies.status,
      templateType: caseStudies.templateType,
      beforeImage: caseStudies.beforeImage,
      afterImage: caseStudies.afterImage,
      metaDescription: caseStudies.metaDescription,
      metaKeywords: caseStudies.metaKeywords,
      reviewStatus: caseStudies.reviewStatus,
      submittedAt: caseStudies.submittedAt,
      reviewedBy: caseStudies.reviewedBy,
      reviewedAt: caseStudies.reviewedAt,
      reviewNotes: caseStudies.reviewNotes,
      createdBy: caseStudies.createdBy,
      createdAt: caseStudies.createdAt,
      updatedAt: caseStudies.updatedAt,
      schoolName: schools.name,
      schoolCountry: schools.country,
      schoolLanguage: schools.primaryLanguage,
    }).from(caseStudies).leftJoin(schools, eq(caseStudies.schoolId, schools.id));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    query = query.orderBy(desc(caseStudies.priority), desc(caseStudies.createdAt)) as any;
    
    if (filters.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters.offset) {
      query = query.offset(filters.offset) as any;
    }
    
    return await query as any;
  }

  /**
   * Update featured status of a case study
   * @param id - Case study ID
   * @param featured - New featured status
   * @returns Updated case study or undefined
   */
  async updateCaseStudyFeatured(id: string, featured: boolean): Promise<CaseStudy | undefined> {
    const [caseStudy] = await db
      .update(caseStudies)
      .set({ featured, updatedAt: new Date() })
      .where(eq(caseStudies.id, id))
      .returning();
    return caseStudy;
  }

  /**
   * Update case study
   * @param id - Case study ID
   * @param updates - Fields to update
   * @returns Updated case study or undefined
   */
  async updateCaseStudy(id: string, updates: Partial<InsertCaseStudy>): Promise<CaseStudy | undefined> {
    const [caseStudy] = await db
      .update(caseStudies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(caseStudies.id, id))
      .returning();
    return caseStudy;
  }

  /**
   * Delete case study
   * @param id - Case study ID
   * @returns true if deleted, false otherwise
   */
  async deleteCaseStudy(id: string): Promise<boolean> {
    const result = await db
      .delete(caseStudies)
      .where(eq(caseStudies.id, id))
      .returning();
    return result.length > 0;
  }

  /**
   * Get global movement data including featured case studies and statistics
   * Delegates to storage for school stats
   * 
   * @returns Featured case studies and aggregated statistics
   */
  async getGlobalMovementData(): Promise<{
    featuredCaseStudies: CaseStudy[];
    statistics: {
      totalSchools: number;
      studentsEngaged: number;
      countriesInvolved: number;
    };
  }> {
    // Get featured case studies, ordered by priority and newest first
    // Only show published case studies to protect drafts from leaking
    const featuredCaseStudies = await this.getCaseStudies({ 
      featured: true,
      status: 'published',
      limit: 3 
    });

    // Get overall statistics using delegation to main storage
    const stats = await this.storage.getSchoolStats();

    return {
      featuredCaseStudies,
      statistics: {
        totalSchools: stats.totalSchools,
        studentsEngaged: stats.studentsImpacted,
        countriesInvolved: stats.countries,
      },
    };
  }

  /**
   * Get related case studies using a scoring algorithm
   * Scores based on: same stage (+100), same country (+50), matching categories (+10 each)
   * 
   * @param caseStudyId - Current case study ID
   * @param limit - Maximum number of related case studies to return
   * @returns Array of related case studies sorted by relevance
   */
  async getRelatedCaseStudies(caseStudyId: string, limit: number = 4): Promise<CaseStudy[]> {
    const currentCaseStudy = await db
      .select({
        id: caseStudies.id,
        stage: caseStudies.stage,
        schoolId: caseStudies.schoolId,
        categories: caseStudies.categories,
        status: caseStudies.status,
      })
      .from(caseStudies)
      .leftJoin(schools, eq(caseStudies.schoolId, schools.id))
      .where(eq(caseStudies.id, caseStudyId))
      .limit(1);

    if (!currentCaseStudy || currentCaseStudy.length === 0) {
      return [];
    }

    const current = currentCaseStudy[0];
    
    const schoolData = await db
      .select({
        country: schools.country,
      })
      .from(schools)
      .where(eq(schools.id, current.schoolId))
      .limit(1);

    const currentCountry = schoolData[0]?.country;
    const currentCategories = (current.categories as string[]) || [];

    const relatedCaseStudies = await db
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
        images: caseStudies.images,
        videos: caseStudies.videos,
        studentQuotes: caseStudies.studentQuotes,
        impactMetrics: caseStudies.impactMetrics,
        timelineSections: caseStudies.timelineSections,
        categories: caseStudies.categories,
        tags: caseStudies.tags,
        status: caseStudies.status,
        templateType: caseStudies.templateType,
        beforeImage: caseStudies.beforeImage,
        afterImage: caseStudies.afterImage,
        metaDescription: caseStudies.metaDescription,
        metaKeywords: caseStudies.metaKeywords,
        reviewStatus: caseStudies.reviewStatus,
        submittedAt: caseStudies.submittedAt,
        reviewedBy: caseStudies.reviewedBy,
        reviewedAt: caseStudies.reviewedAt,
        reviewNotes: caseStudies.reviewNotes,
        createdBy: caseStudies.createdBy,
        createdAt: caseStudies.createdAt,
        updatedAt: caseStudies.updatedAt,
        schoolName: schools.name,
        schoolCountry: schools.country,
      })
      .from(caseStudies)
      .innerJoin(schools, eq(caseStudies.schoolId, schools.id))
      .where(
        and(
          sql`${caseStudies.id} != ${caseStudyId}`,
          eq(caseStudies.status, 'published')
        )
      )
      .limit(20);

    const scoredResults = relatedCaseStudies.map((cs) => {
      let score = 0;
      
      if (cs.stage === current.stage) {
        score += 100;
      }
      
      if (cs.schoolCountry === currentCountry) {
        score += 50;
      }
      
      const csCategories = (cs.categories as string[]) || [];
      const matchingCategories = csCategories.filter(cat => 
        currentCategories.includes(cat)
      ).length;
      score += matchingCategories * 10;
      
      return { ...cs, score };
    });

    scoredResults.sort((a, b) => b.score - a.score);

    return scoredResults.slice(0, limit).map(({ score, ...cs }) => cs as unknown as CaseStudy);
  }

  /**
   * Create a new version of a case study for tracking changes
   * @param version - Version data to insert
   * @returns Created version record
   */
  async createCaseStudyVersion(version: InsertCaseStudyVersion): Promise<CaseStudyVersion> {
    const [created] = await db.insert(caseStudyVersions).values(version).returning();
    return created;
  }

  /**
   * Get all versions of a case study ordered by version number (newest first)
   * @param caseStudyId - Case study ID
   * @returns Array of versions
   */
  async getCaseStudyVersions(caseStudyId: string): Promise<CaseStudyVersion[]> {
    return await db
      .select()
      .from(caseStudyVersions)
      .where(eq(caseStudyVersions.caseStudyId, caseStudyId))
      .orderBy(desc(caseStudyVersions.versionNumber));
  }

  /**
   * Get a specific version by ID
   * @param versionId - Version ID
   * @returns Version record or undefined
   */
  async getCaseStudyVersion(versionId: string): Promise<CaseStudyVersion | undefined> {
    const [version] = await db
      .select()
      .from(caseStudyVersions)
      .where(eq(caseStudyVersions.id, versionId));
    return version;
  }

  /**
   * Search case studies using full-text search or ILIKE fallback
   * Private method used by global search functionality
   * 
   * @param query - Search query string
   * @param limit - Maximum results to return
   * @param offset - Results offset for pagination
   * @param useFullTextSearch - Whether to use PostgreSQL full-text search
   * @returns Array of matching case studies
   */
  async searchCaseStudies(query: string, limit: number, offset: number, useFullTextSearch: boolean): Promise<CaseStudy[]> {
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

  /**
   * Search case studies with ranking scores
   * Private method used by global search functionality with ranking
   * 
   * @param query - Search query string
   * @param limit - Maximum results to return
   * @param offset - Results offset for pagination
   * @param useFullTextSearch - Whether to use PostgreSQL full-text search
   * @returns Array of case studies with relevance rank scores
   */
  async searchCaseStudiesWithRanking(query: string, limit: number, offset: number, useFullTextSearch: boolean): Promise<any[]> {
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

  /**
   * Get count of featured case studies
   * Used by admin stats aggregation
   * 
   * @returns Number of featured case studies
   */
  async getFeaturedCaseStudiesCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(caseStudies)
      .where(eq(caseStudies.featured, true));
    return Number(result?.count || 0);
  }
}

/**
 * Singleton instance management
 * Ensures only one instance of CaseStudyStorage exists per storage instance
 */
let caseStudyStorageInstance: CaseStudyStorage | null = null;

export function getCaseStudyStorage(storage: any): CaseStudyStorage {
  if (!caseStudyStorageInstance) {
    caseStudyStorageInstance = new CaseStudyStorage(storage);
  }
  return caseStudyStorageInstance;
}
