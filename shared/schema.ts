import { sql } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for authentication system)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

/**
 * @description User role enumeration defining access levels (teacher, admin, partner, school). Determines permission scopes across the application.
 * @location shared/schema.ts#L30
 * @related users table, server/auth.ts (role-based middleware)
 */
export const userRoleEnum = pgEnum('user_role', [
  'teacher',
  'admin',
  'partner',
  'school'
]);

export const schoolTypeEnum = pgEnum('school_type', [
  'primary',
  'secondary', 
  'high_school',
  'international',
  'other'
]);

/**
 * @description Program stage enumeration for the 3-phase Plastic Clever Schools journey (inspire → investigate → act). Controls progression and evidence requirements.
 * @location shared/schema.ts#L45
 * @related schools table (currentStage), evidence table (stage), server/routes.ts (stage locking logic), client/src/pages/admin.tsx
 */
export const programStageEnum = pgEnum('program_stage', [
  'inspire',
  'investigate', 
  'act'
]);

/**
 * @description Evidence review status enumeration for admin approval workflow. Tracks evidence submission lifecycle.
 * @location shared/schema.ts#L51
 * @related evidence table, server/routes.ts (evidence review endpoints), client/src/pages/admin.tsx (review handlers)
 */
export const evidenceStatusEnum = pgEnum('evidence_status', [
  'pending',
  'approved',
  'rejected'
]);

export const visibilityEnum = pgEnum('visibility', [
  'public',
  'private',
  'registered'
]);

export const resourceTypeEnum = pgEnum('resource_type', [
  'lesson_plan',
  'assembly',
  'teacher_toolkit',
  'student_workbook',
  'printable_activities'
]);

export const resourceThemeEnum = pgEnum('resource_theme', [
  'ocean_literacy',
  'climate_change',
  'plastic_pollution',
  'science',
  'design_technology',
  'geography',
  'cross_curricular',
  'enrichment',
  'student_action'
]);

export const schoolRoleEnum = pgEnum('school_role', [
  'head_teacher',
  'teacher',
  'pending_teacher'
]);

export const mediaTypeEnum = pgEnum('media_type', ['image', 'video', 'document', 'audio']);
export const storageScopeEnum = pgEnum('storage_scope', ['global', 'school']);
export const caseStudyStatusEnum = pgEnum('case_study_status', ['draft', 'published']);
export const reviewStatusEnum = pgEnum('review_status', [
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'published'
]);

export const photoConsentStatusEnum = pgEnum('photo_consent_status', [
  'pending',
  'approved',
  'rejected'
]);

export const healthCheckStatusEnum = pgEnum('health_check_status', [
  'healthy',
  'degraded',
  'down'
]);

/**
 * @description Core users table supporting email/password authentication. Central entity linking to schools, evidence submissions, and all user-generated content.
 * @location shared/schema.ts#L73
 * @related schoolUsers table (many-to-many with schools), evidence table (submittedBy), server/auth.ts, client/src/hooks/useAuth.ts
 */
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  emailVerified: boolean("email_verified").default(false),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phoneNumber: varchar("phone_number"),
  role: varchar("role").default("teacher"), // Supports: teacher, admin, partner, school
  isAdmin: boolean("is_admin").default(false),
  preferredLanguage: varchar("preferred_language").default("en"),
  hasSeenOnboarding: boolean("has_seen_onboarding").default(false),
  needsPasswordReset: boolean("needs_password_reset").default(false),
  lastViewedEventsAt: timestamp("last_viewed_events_at"),
  lastActiveAt: timestamp("last_active_at"),
  hasInteracted: boolean("has_interacted").default(false),
  deletedAt: timestamp("deleted_at"),
  isMigrated: boolean("is_migrated").default(false),
  legacyUserId: varchar("legacy_user_id"),
  needsEvidenceResubmission: boolean("needs_evidence_resubmission").default(false),
  migratedAt: timestamp("migrated_at"),
  welcomeEmailSentAt: timestamp("welcome_email_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_password_reset_email").on(table.email),
  index("idx_password_reset_token").on(table.token),
  index("idx_password_reset_expires").on(table.expiresAt),
]);

export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'expired'
]);

export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'approved',
  'rejected'
]);

export const requestTypeEnum = pgEnum('request_type', [
  'join_school'
]);

export const migrationStatusEnum = pgEnum('migration_status', [
  'pending',
  'processing',
  'completed',
  'failed'
]);

export const migrationLogs = pgTable("migration_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: migrationStatusEnum("status").default('pending'),
  totalRows: integer("total_rows").default(0),
  validRows: integer("valid_rows").default(0),
  skippedRows: integer("skipped_rows").default(0),
  processedRows: integer("processed_rows").default(0),
  failedRows: integer("failed_rows").default(0),
  usersCreated: integer("users_created").default(0),
  schoolsCreated: integer("schools_created").default(0),
  dryRun: boolean("dry_run").default(false),
  errorLog: jsonb("error_log").default('[]'),
  reportData: jsonb("report_data"),
  csvFileName: varchar("csv_file_name"),
  performedBy: varchar("performed_by").references(() => users.id),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_migration_logs_status").on(table.status),
  index("idx_migration_logs_started").on(table.startedAt),
]);

/**
 * @description Schools table tracking program progress through 3 stages (inspire/investigate/act), geographic location, and completion status. Core entity for all school-related data.
 * @location shared/schema.ts#L105
 * @related schoolUsers table (team members), evidence table (submissions), server/routes.ts (schools CRUD), client/src/pages/admin.tsx (school management)
 */
export const schools = pgTable("schools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: schoolTypeEnum("type"),
  country: varchar("country").notNull(),
  address: text("address"),
  website: varchar("website"),
  adminEmail: varchar("admin_email"),
  postcode: varchar("postcode"),
  zipCode: varchar("zip_code"),
  primaryLanguage: varchar("primary_language"),
  ageRanges: text("age_ranges").array(),
  studentCount: integer("student_count"),
  registrationCompleted: boolean("registration_completed").default(false),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  currentStage: programStageEnum("current_stage").default('inspire'),
  progressPercentage: integer("progress_percentage").default(0),
  inspireCompleted: boolean("inspire_completed").default(false),
  investigateCompleted: boolean("investigate_completed").default(false),
  actCompleted: boolean("act_completed").default(false),
  awardCompleted: boolean("award_completed").default(false),
  currentRound: integer("current_round").default(1),
  roundsCompleted: integer("rounds_completed").default(0),
  auditQuizCompleted: boolean("audit_quiz_completed").default(false),
  featuredSchool: boolean("featured_school").default(false),
  showOnMap: boolean("show_on_map").default(false),
  primaryContactId: varchar("primary_contact_id").references(() => users.id),
  photoConsentDocumentUrl: varchar("photo_consent_document_url"),
  photoConsentStatus: photoConsentStatusEnum("photo_consent_status"),
  photoConsentUploadedAt: timestamp("photo_consent_uploaded_at"),
  photoConsentApprovedAt: timestamp("photo_consent_approved_at"),
  photoConsentApprovedBy: varchar("photo_consent_approved_by").references(() => users.id),
  photoConsentReviewNotes: text("photo_consent_review_notes"),
  isMigrated: boolean("is_migrated").default(false),
  legacyDistrict: varchar("legacy_district"),
  legacyEvidenceCount: integer("legacy_evidence_count").default(0),
  migratedAt: timestamp("migrated_at"),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * @description Junction table managing many-to-many relationship between users and schools with role-based access (head_teacher, teacher). Handles team membership and verification status.
 * @location shared/schema.ts#L136
 * @related users table, schools table, teacherInvitations table, server/routes.ts (team management endpoints), client/src/pages/TeamManagement.tsx
 */
export const schoolUsers = pgTable("school_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: schoolRoleEnum("role").default("teacher"),
  teacherRole: varchar("teacher_role"),
  referralSource: varchar("referral_source"),
  isVerified: boolean("is_verified").default(false),
  invitedBy: varchar("invited_by").references(() => users.id),
  invitedAt: timestamp("invited_at"),
  verifiedAt: timestamp("verified_at"),
  verificationMethod: varchar("verification_method"),
  legacyEvidenceCount: integer("legacy_evidence_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_school_users_school_role").on(table.schoolId, table.role),
]);

export const teacherInvitations = pgTable("teacher_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  invitedBy: varchar("invited_by").references(() => users.id),
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(),
  status: invitationStatusEnum("status").default('pending'),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const adminInvitations = pgTable("admin_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invitedBy: varchar("invited_by").references(() => users.id),
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(),
  role: varchar("role").default('admin'), // 'admin' or 'partner'
  status: invitationStatusEnum("status").default('pending'),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const verificationRequests = pgTable("verification_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  requestType: requestTypeEnum("request_type").default('join_school'),
  status: verificationStatusEnum("status").default('pending'),
  evidence: text("evidence").notNull(),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const resources = pgTable("resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  stage: programStageEnum("stage").notNull(),
  ageRange: varchar("age_range"),
  language: varchar("language").default("English"),
  languages: text("languages").array(),
  country: varchar("country"),
  resourceType: resourceTypeEnum("resource_type"),
  theme: resourceThemeEnum("theme"),
  themes: text("themes").array(),
  tags: text("tags").array(),
  fileUrl: varchar("file_url"),
  fileType: varchar("file_type"),
  fileSize: integer("file_size"),
  downloadCount: integer("download_count").default(0),
  visibility: visibilityEnum("visibility").default('public'),
  isActive: boolean("is_active").default(true),
  hiddenOnResourcesPage: boolean("hidden_on_resources_page").default(false),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const resourcePacks = pgTable("resource_packs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  stage: programStageEnum("stage").notNull(),
  theme: resourceThemeEnum("theme"),
  visibility: visibilityEnum("visibility").default('public'),
  isActive: boolean("is_active").default(true),
  downloadCount: integer("download_count").default(0),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const resourcePackItems = pgTable("resource_pack_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packId: varchar("pack_id").notNull().references(() => resourcePacks.id, { onDelete: 'cascade' }),
  resourceId: varchar("resource_id").notNull().references(() => resources.id, { onDelete: 'cascade' }),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("resource_pack_items_pack_id_idx").on(table.packId),
  index("resource_pack_items_resource_id_idx").on(table.resourceId),
]);

export const evidenceRequirements = pgTable("evidence_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stage: programStageEnum("stage").notNull(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  orderIndex: integer("order_index").notNull(),
  resourceIds: text("resource_ids").array().default(sql`ARRAY[]::text[]`),
  customLinks: jsonb("custom_links").default('[]'),
  translations: jsonb("translations").default('{}'),
  languageSpecificResources: jsonb("language_specific_resources").default('{}'),
  languageSpecificLinks: jsonb("language_specific_links").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * @description Evidence submissions table tracking student work across 3 program stages with file attachments, video links, and admin review workflow. Supports parental consent tracking.
 * @location shared/schema.ts#L219
 * @related schools table, users table (submittedBy, reviewedBy), evidenceRequirements table, server/routes.ts (evidence CRUD, review endpoints), client/src/pages/admin.tsx (evidence review)
 */
export const evidence = pgTable("evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  evidenceRequirementId: varchar("evidence_requirement_id").references(() => evidenceRequirements.id),
  title: varchar("title").notNull(),
  description: text("description"),
  stage: programStageEnum("stage").notNull(),
  status: evidenceStatusEnum("status").default('pending'),
  visibility: visibilityEnum("visibility").default('registered'),
  files: jsonb("files").default('[]'),
  videoLinks: text("video_links"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  isFeatured: boolean("is_featured").default(false),
  isAuditQuiz: boolean("is_audit_quiz").default(false),
  roundNumber: integer("round_number").default(1),
  hasChildren: boolean("has_children").default(false),
  parentalConsentFiles: jsonb("parental_consent_files").default('[]'),
  submittedAt: timestamp("submitted_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * @description Case studies table for showcasing school success stories with rich media (images, videos), student quotes, impact metrics, and timeline. Supports draft/published workflow with SEO metadata.
 * @location shared/schema.ts#L243
 * @related evidence table (optional link), schools table, server/routes.ts (case studies CRUD, PDF export), client/src/pages/admin.tsx (CaseStudyEditor), client/src/pages/inspiration.tsx
 */
export const caseStudies = pgTable("case_studies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  evidenceId: varchar("evidence_id").references(() => evidence.id, { onDelete: 'set null' }),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  title: varchar("title").notNull(),
  description: text("description"),
  stage: programStageEnum("stage").notNull(),
  impact: text("impact"),
  imageUrl: varchar("image_url"),
  featured: boolean("featured").default(false),
  priority: integer("priority").default(0),
  images: jsonb("images").default('[]'),
  videos: jsonb("videos").default('[]'),
  studentQuotes: jsonb("student_quotes").default('[]'),
  impactMetrics: jsonb("impact_metrics").default('[]'),
  timelineSections: jsonb("timeline_sections").default('[]'),
  categories: jsonb("categories").default('[]'),
  tags: jsonb("tags").default('[]'),
  status: caseStudyStatusEnum("status").default('draft'),
  templateType: varchar("template_type"),
  beforeImage: varchar("before_image"),
  afterImage: varchar("after_image"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  reviewStatus: reviewStatusEnum("review_status").default('draft'),
  submittedAt: timestamp("submitted_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const caseStudyVersions = pgTable("case_study_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseStudyId: varchar("case_study_id").notNull().references(() => caseStudies.id, { onDelete: 'cascade' }),
  versionNumber: integer("version_number").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  stage: programStageEnum("stage").notNull(),
  status: caseStudyStatusEnum("status").default('draft'),
  impact: text("impact"),
  images: jsonb("images").default('[]'),
  videos: jsonb("videos").default('[]'),
  studentQuotes: jsonb("student_quotes").default('[]'),
  impactMetrics: jsonb("impact_metrics").default('[]'),
  timelineSections: jsonb("timeline_sections").default('[]'),
  templateType: varchar("template_type"),
  beforeImage: varchar("before_image"),
  afterImage: varchar("after_image"),
  snapshot: jsonb("snapshot"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("case_study_versions_case_study_id_idx").on(table.caseStudyId),
  // Unique constraint ensures no duplicate version numbers per case study
  uniqueIndex("case_study_versions_unique_version_idx").on(table.caseStudyId, table.versionNumber)
]);

export const caseStudyTags = pgTable("case_study_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  slug: varchar("slug").notNull().unique(),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const caseStudyTagRelations = pgTable("case_study_tag_relations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseStudyId: varchar("case_study_id").notNull().references(() => caseStudies.id, { onDelete: 'cascade' }),
  tagId: varchar("tag_id").notNull().references(() => caseStudyTags.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("case_study_tag_relations_case_study_idx").on(table.caseStudyId),
  index("case_study_tag_relations_tag_idx").on(table.tagId)
]);

export const caseStudyReviewComments = pgTable("case_study_review_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseStudyId: varchar("case_study_id").notNull().references(() => caseStudies.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id),
  comment: text("comment").notNull(),
  action: varchar("action"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("case_study_review_comments_case_study_idx").on(table.caseStudyId)
]);

export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientEmail: varchar("recipient_email").notNull(),
  recipientId: varchar("recipient_id").references(() => users.id),
  subject: varchar("subject").notNull(),
  template: varchar("template"),
  status: varchar("status").default('sent'),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const userActivityLogs = pgTable("user_activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  userEmail: varchar("user_email"),
  actionType: varchar("action_type").notNull(),
  actionDetails: jsonb("action_details").default('{}'),
  targetId: varchar("target_id"),
  targetType: varchar("target_type"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_activity_logs_user").on(table.userId),
  index("idx_user_activity_logs_action").on(table.actionType),
  index("idx_user_activity_logs_created").on(table.createdAt),
]);

export const mailchimpAudiences = pgTable("mailchimp_audiences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mailchimpId: varchar("mailchimp_id").notNull().unique(),
  name: varchar("name").notNull(),
  description: text("description"),
  memberCount: integer("member_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mailchimpSubscriptions = pgTable("mailchimp_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  audienceId: varchar("audience_id").notNull().references(() => mailchimpAudiences.id, { onDelete: 'cascade' }),
  email: varchar("email").notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: 'cascade' }),
  status: varchar("status").default('subscribed'),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  tags: jsonb("tags").default('[]'),
  mergeFields: jsonb("merge_fields").default('{}'),
});

export const notificationTypeEnum = pgEnum('notification_type', [
  'new_resource',
  'resource_updated',
  'evidence_reviewed',
  'evidence_assigned',
  'stage_completed',
  'general'
]);

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  actionUrl: varchar("action_url"),
  linkUrl: varchar("link_url"),
  resourceId: varchar("resource_id").references(() => resources.id, { onDelete: 'cascade' }),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_notifications_school_read").on(table.schoolId, table.isRead),
  index("idx_notifications_user_read").on(table.userId, table.isRead),
  index("idx_notifications_created").on(table.createdAt),
]);

export const activityStatusEnum = pgEnum('activity_status', [
  'idle',
  'viewing_dashboard',
  'reviewing_evidence',
  'editing_case_study',
  'editing_event',
  'managing_schools',
  'managing_users',
  'managing_resources'
]);

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_chat_messages_created").on(table.createdAt),
]);

export const documentLocks = pgTable("document_locks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentType: varchar("document_type").notNull(),
  documentId: varchar("document_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  acquiredAt: timestamp("acquired_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [
  index("idx_document_locks_doc").on(table.documentType, table.documentId),
  index("idx_document_locks_user").on(table.userId),
  index("idx_document_locks_expires").on(table.expiresAt),
  uniqueIndex("idx_document_locks_unique").on(table.documentType, table.documentId),
]);

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar("action").notNull(),
  targetType: varchar("target_type").notNull(),
  targetId: varchar("target_id").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_logs_user").on(table.userId),
  index("idx_audit_logs_target").on(table.targetType, table.targetId),
  index("idx_audit_logs_created").on(table.createdAt),
]);

export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  stage: programStageEnum("stage").notNull(),
  issuedBy: varchar("issued_by").references(() => users.id),
  certificateNumber: varchar("certificate_number").notNull().unique(),
  completedDate: timestamp("completed_date").notNull(),
  issuedDate: timestamp("issued_date").defaultNow(),
  title: varchar("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata").default('{}'), // Store additional certificate data like achievements, stats
  shareableUrl: varchar("shareable_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const testimonials = pgTable("testimonials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quote: text("quote").notNull(),
  authorName: varchar("author_name").notNull(),
  authorRole: varchar("author_role").notNull(),
  schoolName: varchar("school_name").notNull(),
  rating: integer("rating").default(5),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const auditStatusEnum = pgEnum('audit_status', [
  'draft',
  'submitted',
  'approved',
  'rejected'
]);

export const promiseStatusEnum = pgEnum('promise_status', [
  'active',
  'achieved',
  'cancelled'
]);

export const eventTypeEnum = pgEnum('event_type', [
  'workshop',
  'webinar',
  'community_event',
  'training',
  'celebration',
  'assembly',
  'other'
]);

export const eventStatusEnum = pgEnum('event_status', [
  'draft',
  'published',
  'cancelled',
  'completed'
]);

export const registrationStatusEnum = pgEnum('registration_status', [
  'registered',
  'attended',
  'cancelled',
  'waitlisted'
]);

export const pagePublishedStatusEnum = pgEnum('page_published_status', [
  'draft',
  'coming_soon',
  'published'
]);

export const accessTypeEnum = pgEnum('access_type', [
  'open',
  'closed'
]);

export const formTypeEnum = pgEnum('form_type', [
  'audit',
  'action_plan'
]);

export const submissionStatusEnum = pgEnum('submission_status', [
  'pending',
  'approved',
  'rejected',
  'revision_requested'
]);

export const userActivityActionEnum = pgEnum('user_activity_action', [
  'login',
  'logout',
  'register',
  'evidence_submit',
  'evidence_approve',
  'evidence_reject',
  'evidence_delete',
  'school_create',
  'school_update',
  'audit_submit',
  'audit_approve',
  'audit_reject',
  'promise_create',
  'promise_update',
  'promise_delete',
  'user_invite',
  'user_remove',
  'resource_create',
  'resource_update',
  'resource_delete',
  'case_study_create',
  'case_study_update',
  'case_study_publish',
  'case_study_delete',
  'event_create',
  'event_update',
  'event_delete',
  'event_register',
  'email_send',
  'settings_update',
  'role_change',
  'other'
]);

export const auditResponses = pgTable("audit_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  status: auditStatusEnum("status").default('draft'),
  roundNumber: integer("round_number").default(1),
  
  // Part 1: About Your School
  part1Data: jsonb("part1_data").default('{}'),
  
  // Part 2: Lunchroom & Staffroom
  part2Data: jsonb("part2_data").default('{}'),
  
  // Part 3: Classrooms & Bathrooms
  part3Data: jsonb("part3_data").default('{}'),
  
  // Part 4: Waste Management
  part4Data: jsonb("part4_data").default('{}'),
  
  // Calculated results
  resultsData: jsonb("results_data").default('{}'),
  totalPlasticItems: integer("total_plastic_items").default(0),
  topProblemPlastics: jsonb("top_problem_plastics").default('[]'),
  
  // Review fields
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  currentPart: integer("current_part").default(1),
  completedAt: timestamp("completed_at"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * @description Reduction promises table tracking schools' commitments to reduce specific plastic items with baseline/target quantities and timeframes. Links to audit responses for data-driven goals.
 * @location shared/schema.ts#L418
 * @related schools table, auditResponses table, server/routes.ts (promises CRUD), client/src/pages/admin.tsx (metrics display), shared/plasticMetrics.ts (impact calculations)
 */
export const reductionPromises = pgTable("reduction_promises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  auditId: varchar("audit_id").references(() => auditResponses.id, { onDelete: 'set null' }),
  roundNumber: integer("round_number").default(1),
  plasticItemType: varchar("plastic_item_type").notNull(),
  plasticItemLabel: varchar("plastic_item_label").notNull(),
  baselineQuantity: integer("baseline_quantity").notNull(),
  targetQuantity: integer("target_quantity").notNull(),
  reductionAmount: integer("reduction_amount").notNull(),
  timeframeUnit: varchar("timeframe_unit").notNull(),
  status: promiseStatusEnum("status").default('active'),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_reduction_promises_school_status").on(table.schoolId, table.status),
]);

export const printableFormSubmissions = pgTable("printable_form_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  formType: formTypeEnum("form_type").notNull(),
  filePath: varchar("file_path").notNull(),
  originalFilename: varchar("original_filename").notNull(),
  status: submissionStatusEnum("status").default('pending'),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_printable_submissions_school").on(table.schoolId),
  index("idx_printable_submissions_status").on(table.status),
]);

/**
 * @description Events table managing workshops, webinars, and community gatherings with registration capacity, virtual meeting links, and live page builder support (YouTube videos, PDFs, testimonials).
 * @location shared/schema.ts#L456
 * @related eventRegistrations table, users table (createdBy), server/routes.ts (events CRUD, registration, announcements), client/src/pages/admin.tsx (events management), client/src/pages/event-live.tsx
 */
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  eventType: eventTypeEnum("event_type").notNull(),
  status: eventStatusEnum("status").default('draft'),
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  timezone: varchar("timezone").default('UTC'),
  location: text("location"),
  isVirtual: boolean("is_virtual").default(false),
  meetingLink: varchar("meeting_link"),
  imageUrl: varchar("image_url"),
  capacity: integer("capacity"),
  waitlistEnabled: boolean("waitlist_enabled").default(false),
  registrationDeadline: timestamp("registration_deadline"),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  publicSlug: varchar("public_slug"),
  youtubeVideos: jsonb("youtube_videos"),
  eventPackFiles: jsonb("event_pack_files"),
  testimonials: jsonb("testimonials"),
  accessToken: varchar("access_token"),
  reminderSentAt: timestamp("reminder_sent_at"),
  isPreRecorded: boolean("is_pre_recorded").default(false),
  recordingAvailableFrom: timestamp("recording_available_from"),
  pagePublishedStatus: pagePublishedStatusEnum("page_published_status").default('draft'),
  accessType: accessTypeEnum("access_type").default('open'),
  // Multi-language support - translations stored as JSONB with language codes as keys
  titleTranslations: jsonb("title_translations"),
  descriptionTranslations: jsonb("description_translations"),
  youtubeVideoTranslations: jsonb("youtube_video_translations"),
  eventPackFileTranslations: jsonb("event_pack_file_translations"),
  testimonialTranslations: jsonb("testimonial_translations"),
  // Display configuration
  featuredVideoIndex: integer("featured_video_index").default(0),
  eventPackBannerImageUrl: varchar("event_pack_banner_image_url"),
  showEvidenceSubmission: boolean("show_evidence_submission").default(false),
  evidenceSubmissionText: jsonb("evidence_submission_text"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_events_start_date").on(table.startDateTime),
  index("idx_events_status").on(table.status),
  index("idx_events_public_slug").on(table.publicSlug),
]);

export const eventRegistrations = pgTable("event_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: 'cascade' }),
  status: registrationStatusEnum("status").default('registered'),
  registeredAt: timestamp("registered_at").defaultNow(),
  cancelledAt: timestamp("cancelled_at"),
  attendedAt: timestamp("attended_at"),
  notes: text("notes"),
}, (table) => [
  index("idx_event_registrations_event").on(table.eventId),
  index("idx_event_registrations_user").on(table.userId),
]);

/**
 * @description Junction table linking events to resources with ordering support. Allows admins to attach existing resources to events for easy access by attendees.
 * @location shared/schema.ts
 * @related events table, resources table, server/routes.ts (event resources endpoints), client/src/pages/admin.tsx (event creator)
 */
export const eventResources = pgTable("event_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  resourceId: varchar("resource_id").notNull().references(() => resources.id, { onDelete: 'cascade' }),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_event_resources_event").on(table.eventId),
  index("idx_event_resources_resource").on(table.resourceId),
  uniqueIndex("idx_event_resources_unique").on(table.eventId, table.resourceId),
]);

export const recipientTypeEnum = pgEnum('recipient_type', [
  'all_teachers',
  'custom'
]);

export const eventAnnouncements = pgTable("event_announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  recipientType: recipientTypeEnum("recipient_type").notNull(),
  campaignId: varchar("campaign_id"),
  announcementType: varchar("announcement_type").notNull(),
  sentBy: varchar("sent_by").references(() => users.id),
  sentAt: timestamp("sent_at").defaultNow(),
  recipientCount: integer("recipient_count").notNull(),
  status: varchar("status").default('sent'),
}, (table) => [
  index("idx_event_announcements_event").on(table.eventId),
]);

/**
 * @description Event banners table for displaying promotional banners on the landing page linking to upcoming events
 * @location shared/schema.ts
 * @related events table, users table (createdBy), client/src/pages/landing.tsx, client/src/pages/admin.tsx
 */
export const eventBanners = pgTable("event_banners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  text: text("text").notNull(),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  isActive: boolean("is_active").default(true),
  backgroundColor: varchar("background_color").default('#0B3D5D'),
  textColor: varchar("text_color").default('#FFFFFF'),
  gradient: varchar("gradient").default('ocean'),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_event_banners_active").on(table.isActive),
  // Partial unique index to ensure only one banner can be active at a time
  uniqueIndex("idx_event_banners_single_active").on(table.isActive).where(sql`${table.isActive} = true`),
]);

export const eventLinkClicks = pgTable("event_link_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  clickedAt: timestamp("clicked_at").defaultNow(),
}, (table) => [
  index("idx_event_link_clicks_event").on(table.eventId),
  index("idx_event_link_clicks_user").on(table.userId),
]);

export const eventResourceDownloads = pgTable("event_resource_downloads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  fileIndex: integer("file_index").notNull(),
  fileName: varchar("file_name").notNull(),
  downloadedAt: timestamp("downloaded_at").defaultNow(),
}, (table) => [
  index("idx_event_resource_downloads_event").on(table.eventId),
  index("idx_event_resource_downloads_user").on(table.userId),
]);

export const mediaAssets = pgTable("media_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  objectKey: varchar("object_key").notNull(),
  filename: varchar("filename").notNull(),
  mimeType: varchar("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  mediaType: mediaTypeEnum("media_type").notNull(),
  storageScope: storageScopeEnum("storage_scope").default('global'),
  width: integer("width"),
  height: integer("height"),
  durationSeconds: integer("duration_seconds"),
  altText: text("alt_text"),
  description: text("description"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  schoolId: varchar("school_id").references(() => schools.id, { onDelete: 'cascade' }),
  visibility: visibilityEnum("visibility").default('registered'),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_media_assets_media_type_scope").on(table.mediaType, table.storageScope),
  index("idx_media_assets_uploaded_by").on(table.uploadedBy),
  index("idx_media_assets_school_id").on(table.schoolId),
]);

export const mediaTags = pgTable("media_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mediaAssetTags = pgTable("media_asset_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull().references(() => mediaAssets.id, { onDelete: 'cascade' }),
  tagId: varchar("tag_id").notNull().references(() => mediaTags.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_media_asset_tags_asset_id").on(table.assetId),
  index("idx_media_asset_tags_tag_id").on(table.tagId),
]);

export const mediaAssetUsage = pgTable("media_asset_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull().references(() => mediaAssets.id, { onDelete: 'cascade' }),
  usageType: varchar("usage_type").notNull(),
  referenceId: varchar("reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_media_asset_usage_asset_id").on(table.assetId),
]);

export const importStatusEnum = pgEnum('import_status', [
  'processing',
  'completed',
  'failed',
  'partial'
]);

export const importBatches = pgTable("import_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  importedBy: varchar("imported_by").references(() => users.id),
  status: importStatusEnum("status").default('processing'),
  totalRecords: integer("total_records").default(0),
  successCount: integer("success_count").default(0),
  errorCount: integer("error_count").default(0),
  schoolsImported: integer("schools_imported").default(0),
  usersImported: integer("users_imported").default(0),
  relationshipsImported: integer("relationships_imported").default(0),
  errors: jsonb("errors").default('[]'),
  metadata: jsonb("metadata").default('{}'),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  schoolUsers: many(schoolUsers),
  primaryContactSchools: many(schools),
  submittedEvidence: many(evidence, { relationName: "submittedEvidence" }),
  reviewedEvidence: many(evidence, { relationName: "reviewedEvidence" }),
  caseStudies: many(caseStudies),
  emailLogs: many(emailLogs),
  activityLogs: many(userActivityLogs),
  issuedCertificates: many(certificates),
  sentInvitations: many(teacherInvitations),
  sentAdminInvitations: many(adminInvitations),
  invitedSchoolUsers: many(schoolUsers, { relationName: "invitedBy" }),
  verificationRequests: many(verificationRequests, { relationName: "userVerificationRequests" }),
  reviewedVerificationRequests: many(verificationRequests, { relationName: "reviewedVerificationRequests" }),
  submittedAudits: many(auditResponses, { relationName: "submittedAudits" }),
  reviewedAudits: many(auditResponses, { relationName: "reviewedAudits" }),
  createdPromises: many(reductionPromises),
  createdEvents: many(events),
  eventRegistrations: many(eventRegistrations),
  uploadedMediaAssets: many(mediaAssets),
}));

export const schoolsRelations = relations(schools, ({ many, one }) => ({
  users: many(schoolUsers),
  primaryContact: one(users, {
    fields: [schools.primaryContactId],
    references: [users.id],
  }),
  evidence: many(evidence),
  caseStudies: many(caseStudies),
  certificates: many(certificates),
  teacherInvitations: many(teacherInvitations),
  verificationRequests: many(verificationRequests),
  auditResponses: many(auditResponses),
  reductionPromises: many(reductionPromises),
  eventRegistrations: many(eventRegistrations),
  mediaAssets: many(mediaAssets),
}));

export const schoolUsersRelations = relations(schoolUsers, ({ one }) => ({
  school: one(schools, {
    fields: [schoolUsers.schoolId],
    references: [schools.id],
  }),
  user: one(users, {
    fields: [schoolUsers.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [schoolUsers.invitedBy],
    references: [users.id],
    relationName: "invitedBy",
  }),
}));

export const evidenceRelations = relations(evidence, ({ one }) => ({
  school: one(schools, {
    fields: [evidence.schoolId],
    references: [schools.id],
  }),
  submittedBy: one(users, {
    fields: [evidence.submittedBy],
    references: [users.id],
    relationName: "submittedEvidence",
  }),
  reviewedBy: one(users, {
    fields: [evidence.reviewedBy],
    references: [users.id],
    relationName: "reviewedEvidence",
  }),
  evidenceRequirement: one(evidenceRequirements, {
    fields: [evidence.evidenceRequirementId],
    references: [evidenceRequirements.id],
  }),
  caseStudy: one(caseStudies),
}));

export const caseStudiesRelations = relations(caseStudies, ({ one, many }) => ({
  evidence: one(evidence, {
    fields: [caseStudies.evidenceId],
    references: [evidence.id],
  }),
  school: one(schools, {
    fields: [caseStudies.schoolId],
    references: [schools.id],
  }),
  createdBy: one(users, {
    fields: [caseStudies.createdBy],
    references: [users.id],
  }),
  versions: many(caseStudyVersions),
  tagRelations: many(caseStudyTagRelations),
  reviewComments: many(caseStudyReviewComments),
  reviewer: one(users, { 
    fields: [caseStudies.reviewedBy], 
    references: [users.id],
    relationName: "reviewedCaseStudies"
  }),
}));

export const caseStudyVersionsRelations = relations(caseStudyVersions, ({ one }) => ({
  caseStudy: one(caseStudies, { 
    fields: [caseStudyVersions.caseStudyId], 
    references: [caseStudies.id] 
  }),
  creator: one(users, { 
    fields: [caseStudyVersions.createdBy], 
    references: [users.id] 
  }),
}));

export const caseStudyTagsRelations = relations(caseStudyTags, ({ many }) => ({
  caseStudyRelations: many(caseStudyTagRelations),
}));

export const caseStudyTagRelationsRelations = relations(caseStudyTagRelations, ({ one }) => ({
  caseStudy: one(caseStudies, { 
    fields: [caseStudyTagRelations.caseStudyId], 
    references: [caseStudies.id] 
  }),
  tag: one(caseStudyTags, { 
    fields: [caseStudyTagRelations.tagId], 
    references: [caseStudyTags.id] 
  }),
}));

export const caseStudyReviewCommentsRelations = relations(caseStudyReviewComments, ({ one }) => ({
  caseStudy: one(caseStudies, { 
    fields: [caseStudyReviewComments.caseStudyId], 
    references: [caseStudies.id] 
  }),
  user: one(users, { 
    fields: [caseStudyReviewComments.userId], 
    references: [users.id] 
  }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  school: one(schools, {
    fields: [certificates.schoolId],
    references: [schools.id],
  }),
  issuedBy: one(users, {
    fields: [certificates.issuedBy],
    references: [users.id],
  }),
}));

export const resourcesRelations = relations(resources, ({ many }) => ({
  eventResources: many(eventResources),
}));

export const evidenceRequirementsRelations = relations(evidenceRequirements, ({ many }) => ({
  evidence: many(evidence),
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  recipient: one(users, {
    fields: [emailLogs.recipientId],
    references: [users.id],
  }),
}));

export const userActivityLogsRelations = relations(userActivityLogs, ({ one }) => ({
  user: one(users, {
    fields: [userActivityLogs.userId],
    references: [users.id],
  }),
}));

export const teacherInvitationsRelations = relations(teacherInvitations, ({ one }) => ({
  school: one(schools, {
    fields: [teacherInvitations.schoolId],
    references: [schools.id],
  }),
  inviter: one(users, {
    fields: [teacherInvitations.invitedBy],
    references: [users.id],
  }),
}));

export const adminInvitationsRelations = relations(adminInvitations, ({ one }) => ({
  inviter: one(users, {
    fields: [adminInvitations.invitedBy],
    references: [users.id],
  }),
}));

export const verificationRequestsRelations = relations(verificationRequests, ({ one }) => ({
  user: one(users, {
    fields: [verificationRequests.userId],
    references: [users.id],
    relationName: "userVerificationRequests",
  }),
  school: one(schools, {
    fields: [verificationRequests.schoolId],
    references: [schools.id],
  }),
  reviewer: one(users, {
    fields: [verificationRequests.reviewedBy],
    references: [users.id],
    relationName: "reviewedVerificationRequests",
  }),
}));

export const auditResponsesRelations = relations(auditResponses, ({ one, many }) => ({
  school: one(schools, {
    fields: [auditResponses.schoolId],
    references: [schools.id],
  }),
  submittedBy: one(users, {
    fields: [auditResponses.submittedBy],
    references: [users.id],
    relationName: "submittedAudits",
  }),
  reviewedBy: one(users, {
    fields: [auditResponses.reviewedBy],
    references: [users.id],
    relationName: "reviewedAudits",
  }),
  reductionPromises: many(reductionPromises),
}));

export const reductionPromisesRelations = relations(reductionPromises, ({ one }) => ({
  school: one(schools, {
    fields: [reductionPromises.schoolId],
    references: [schools.id],
  }),
  audit: one(auditResponses, {
    fields: [reductionPromises.auditId],
    references: [auditResponses.id],
  }),
  createdByUser: one(users, {
    fields: [reductionPromises.createdBy],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
  registrations: many(eventRegistrations),
  announcements: many(eventAnnouncements),
  eventResources: many(eventResources),
}));

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(events, {
    fields: [eventRegistrations.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventRegistrations.userId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [eventRegistrations.schoolId],
    references: [schools.id],
  }),
}));

export const eventAnnouncementsRelations = relations(eventAnnouncements, ({ one }) => ({
  event: one(events, {
    fields: [eventAnnouncements.eventId],
    references: [events.id],
  }),
  sentBy: one(users, {
    fields: [eventAnnouncements.sentBy],
    references: [users.id],
  }),
}));

export const eventResourcesRelations = relations(eventResources, ({ one }) => ({
  event: one(events, {
    fields: [eventResources.eventId],
    references: [events.id],
  }),
  resource: one(resources, {
    fields: [eventResources.resourceId],
    references: [resources.id],
  }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one, many }) => ({
  uploadedBy: one(users, {
    fields: [mediaAssets.uploadedBy],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [mediaAssets.schoolId],
    references: [schools.id],
  }),
  tags: many(mediaAssetTags),
  usage: many(mediaAssetUsage),
}));

export const mediaTagsRelations = relations(mediaTags, ({ many }) => ({
  assets: many(mediaAssetTags),
}));

export const mediaAssetTagsRelations = relations(mediaAssetTags, ({ one }) => ({
  asset: one(mediaAssets, {
    fields: [mediaAssetTags.assetId],
    references: [mediaAssets.id],
  }),
  tag: one(mediaTags, {
    fields: [mediaAssetTags.tagId],
    references: [mediaTags.id],
  }),
}));

export const mediaAssetUsageRelations = relations(mediaAssetUsage, ({ one }) => ({
  asset: one(mediaAssets, {
    fields: [mediaAssetUsage.assetId],
    references: [mediaAssets.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Upsert schema that includes ID for OIDC authentication
export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

// Type for translation function
type TranslationFunction = (key: string, options?: any) => string;

// Factory functions for translated schemas
export const createLoginSchema = (t: TranslationFunction) => z.object({
  email: z.string().email(t('forms:validation.email_invalid')),
  password: z.string().min(8, t('forms:validation.password_too_short')),
});

export const createRegisterSchema = (t: TranslationFunction) => z.object({
  email: z.string().email(t('forms:validation.email_invalid')),
  password: z.string()
    .min(8, t('forms:validation.password_too_short'))
    .regex(/[A-Z]/, t('forms:validation.password_uppercase'))
    .regex(/[a-z]/, t('forms:validation.password_lowercase'))
    .regex(/\d/, t('forms:validation.password_number')),
  confirmPassword: z.string(),
  firstName: z.string().min(1, t('forms:validation.first_name_required')),
  lastName: z.string().min(1, t('forms:validation.last_name_required')),
  preferredLanguage: z.string().default('en'),
}).refine((data) => data.password === data.confirmPassword, {
  message: t('forms:validation.passwords_dont_match'),
  path: ["confirmPassword"],
});

// Default schemas with fallback English messages (for backward compatibility)
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/\d/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  preferredLanguage: z.string().default('en'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Password-based user creation schema
export const createPasswordUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  passwordHash: z.string().min(1, "Password hash is required"),
  emailVerified: z.boolean().default(false),
});

/**
 * @description Validation schema for school creation/updates with omitted auto-generated fields. Used for form validation and API request validation.
 * @location shared/schema.ts#L959
 * @related schools table, server/routes.ts (POST /api/schools, PATCH /api/schools/:id), client/src/components/MultiStepSchoolRegistration.tsx
 */
export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentStage: true,
  progressPercentage: true,
  inspireCompleted: true,
  investigateCompleted: true,
  actCompleted: true,
  awardCompleted: true,
  featuredSchool: true,
});

export const insertSchoolUserSchema = createInsertSchema(schoolUsers).omit({
  id: true,
  createdAt: true,
});

export const insertResourceSchema = createInsertSchema(resources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  downloadCount: true,
});

export const insertResourcePackSchema = createInsertSchema(resourcePacks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  downloadCount: true,
});

export const insertResourcePackItemSchema = createInsertSchema(resourcePackItems).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

/**
 * @description Validation schema for evidence submission with file attachments, video links, and stage/visibility fields. Validates evidence data before database insert.
 * @location shared/schema.ts#L978
 * @related evidence table, server/routes.ts (POST /api/evidence), client/src/components/EvidenceSubmissionForm.tsx
 */
export const insertEvidenceSchema = createInsertSchema(evidence).omit({
  id: true,
  submittedAt: true,
  updatedAt: true,
  reviewedAt: true,
  reviewedBy: true,
  reviewNotes: true,
  assignedTo: true,
  isFeatured: true,
});

// Case Study JSONB schemas for rich content
// Helper to validate URLs or object storage paths (required)
const urlOrStoragePath = z.string().refine(
  (val) => {
    if (!val || val.trim() === '') return false;
    // Allow object storage paths starting with /objects/
    if (val.startsWith('/objects/')) return true;
    // Allow valid http/https URLs
    try {
      const url = new URL(val);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  },
  { message: "Must be a valid URL or object storage path" }
);

// Helper for optional URL/path fields that converts empty strings to undefined
const optionalUrlOrStoragePath = z.string().optional().transform((val) => {
  // Convert empty strings to undefined
  if (!val || val.trim() === '') return undefined;
  return val;
}).pipe(
  z.union([
    z.undefined(),
    z.string().refine(
      (val) => {
        // Allow object storage paths starting with /objects/
        if (val.startsWith('/objects/')) return true;
        // Allow valid http/https URLs
        try {
          const url = new URL(val);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: "Must be a valid URL or object storage path" }
    )
  ])
);

export const caseStudyImageSchema = z.object({
  url: urlOrStoragePath,
  caption: z.string().optional(),
  altText: z.string().optional(),
});

export const caseStudyVideoSchema = z.object({
  url: urlOrStoragePath,
  title: z.string().optional(),
  platform: z.enum(['youtube', 'vimeo', 'other']).optional(),
  embedId: z.string().optional(),
  featured: z.boolean().optional(),
});

export const studentQuoteSchema = z.object({
  name: z.string(),
  role: z.string().optional(),
  text: z.string(),
  photo: optionalUrlOrStoragePath,
  age: z.number().optional(),
});

export const impactMetricSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
});

export const timelineSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  imageUrl: optionalUrlOrStoragePath,
  order: z.number(),
});

/**
 * @description Validation schema for case study creation with rich media arrays (images, videos, quotes, metrics, timeline). Includes custom Zod refinements for structured data.
 * @location shared/schema.ts#L1028
 * @related caseStudies table, server/routes.ts (POST /api/admin/case-studies), client/src/components/admin/CaseStudyEditor.tsx
 */
export const insertCaseStudySchema = createInsertSchema(caseStudies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  images: z.array(caseStudyImageSchema).optional(),
  videos: z.array(caseStudyVideoSchema).optional(),
  studentQuotes: z.array(studentQuoteSchema).optional(),
  impactMetrics: z.array(impactMetricSchema).optional(),
  timelineSections: z.array(timelineSectionSchema).optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const insertCaseStudyVersionSchema = createInsertSchema(caseStudyVersions).omit({ 
  id: true, 
  createdAt: true 
}).extend({
  status: z.enum(['draft', 'published']).optional(),
});

export const insertCaseStudyTagSchema = createInsertSchema(caseStudyTags).omit({ 
  id: true, 
  createdAt: true 
});

export const insertCaseStudyTagRelationSchema = createInsertSchema(caseStudyTagRelations).omit({ 
  id: true, 
  createdAt: true 
});

export const insertCaseStudyReviewCommentSchema = createInsertSchema(caseStudyReviewComments).omit({ 
  id: true, 
  createdAt: true 
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true,
});

export const insertUserActivityLogSchema = createInsertSchema(userActivityLogs).omit({
  id: true,
  createdAt: true,
});

export const insertMailchimpAudienceSchema = createInsertSchema(mailchimpAudiences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMailchimpSubscriptionSchema = createInsertSchema(mailchimpSubscriptions).omit({
  id: true,
  subscribedAt: true,
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  issuedDate: true,
});

export const insertTeacherInvitationSchema = createInsertSchema(teacherInvitations).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});

export const insertAdminInvitationSchema = createInsertSchema(adminInvitations).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});

export const insertVerificationRequestSchema = createInsertSchema(verificationRequests).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  reviewedBy: true,
  reviewNotes: true,
});

export const insertTestimonialSchema = createInsertSchema(testimonials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEvidenceRequirementSchema = createInsertSchema(evidenceRequirements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditResponseSchema = createInsertSchema(auditResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  reviewedBy: true,
  reviewNotes: true,
  completedAt: true,
  submittedAt: true,
});

export const insertReductionPromiseSchema = createInsertSchema(reductionPromises).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  status: true,
  reductionAmount: true,
});

export const insertPrintableFormSubmissionSchema = createInsertSchema(printableFormSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  reviewedAt: true,
  reviewedBy: true,
  reviewNotes: true,
});

/**
 * @description Validation schema for event creation with date coercion and page builder fields (YouTube videos, PDFs, testimonials). Handles virtual and in-person events.
 * @location shared/schema.ts#L1124
 * @related events table, server/routes.ts (POST /api/admin/events), client/src/pages/admin.tsx (event form handlers)
 */
export const insertEventSchema = createInsertSchema(events, {
  startDateTime: z.coerce.date(),
  endDateTime: z.coerce.date(),
  registrationDeadline: z.coerce.date().optional().nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrations).omit({
  id: true,
  registeredAt: true,
  cancelledAt: true,
  attendedAt: true,
});

export const insertEventResourceSchema = createInsertSchema(eventResources).omit({
  id: true,
  createdAt: true,
});

export const insertEventAnnouncementSchema = createInsertSchema(eventAnnouncements).omit({
  id: true,
  sentAt: true,
});

export const insertEventBannerSchema = createInsertSchema(eventBanners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventLinkClickSchema = createInsertSchema(eventLinkClicks).omit({
  id: true,
  clickedAt: true,
});

export const insertEventResourceDownloadSchema = createInsertSchema(eventResourceDownloads).omit({
  id: true,
  downloadedAt: true,
});

export const insertMediaAssetSchema = createInsertSchema(mediaAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMediaTagSchema = createInsertSchema(mediaTags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMediaAssetTagSchema = createInsertSchema(mediaAssetTags).omit({
  id: true,
  createdAt: true,
});

export const insertMediaAssetUsageSchema = createInsertSchema(mediaAssetUsage).omit({
  id: true,
  createdAt: true,
});

export const insertImportBatchSchema = createInsertSchema(importBatches).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentLockSchema = createInsertSchema(documentLocks).omit({
  id: true,
  acquiredAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type School = typeof schools.$inferSelect;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type SchoolUser = typeof schoolUsers.$inferSelect;
export type InsertSchoolUser = z.infer<typeof insertSchoolUserSchema>;
export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type ResourcePack = typeof resourcePacks.$inferSelect;
export type InsertResourcePack = z.infer<typeof insertResourcePackSchema>;
export type ResourcePackItem = typeof resourcePackItems.$inferSelect;
export type InsertResourcePackItem = z.infer<typeof insertResourcePackItemSchema>;
export type Evidence = typeof evidence.$inferSelect;
export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
export type EvidenceWithSchool = Evidence & {
  school: {
    id: string;
    name: string;
    country: string;
    photoConsentStatus?: typeof schools.$inferSelect.photoConsentStatus;
    photoConsentDocumentUrl?: string | null;
  };
  reviewer?: {
    id: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
};
export type CaseStudy = typeof caseStudies.$inferSelect;
export type InsertCaseStudy = z.infer<typeof insertCaseStudySchema>;
export type CaseStudyImage = z.infer<typeof caseStudyImageSchema>;
export type CaseStudyVideo = z.infer<typeof caseStudyVideoSchema>;
export type StudentQuote = z.infer<typeof studentQuoteSchema>;
export type ImpactMetric = z.infer<typeof impactMetricSchema>;
export type TimelineSection = z.infer<typeof timelineSectionSchema>;
export type InsertCaseStudyVersion = z.infer<typeof insertCaseStudyVersionSchema>;
export type CaseStudyVersion = typeof caseStudyVersions.$inferSelect;
export type InsertCaseStudyTag = z.infer<typeof insertCaseStudyTagSchema>;
export type CaseStudyTag = typeof caseStudyTags.$inferSelect;
export type InsertCaseStudyTagRelation = z.infer<typeof insertCaseStudyTagRelationSchema>;
export type CaseStudyTagRelation = typeof caseStudyTagRelations.$inferSelect;
export type InsertCaseStudyReviewComment = z.infer<typeof insertCaseStudyReviewCommentSchema>;
export type CaseStudyReviewComment = typeof caseStudyReviewComments.$inferSelect;
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
export type MailchimpAudience = typeof mailchimpAudiences.$inferSelect;
export type InsertMailchimpAudience = z.infer<typeof insertMailchimpAudienceSchema>;
export type MailchimpSubscription = typeof mailchimpSubscriptions.$inferSelect;
export type InsertMailchimpSubscription = z.infer<typeof insertMailchimpSubscriptionSchema>;
export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type TeacherInvitation = typeof teacherInvitations.$inferSelect;
export type InsertTeacherInvitation = z.infer<typeof insertTeacherInvitationSchema>;
export type AdminInvitation = typeof adminInvitations.$inferSelect;
export type InsertAdminInvitation = z.infer<typeof insertAdminInvitationSchema>;
export type VerificationRequest = typeof verificationRequests.$inferSelect;
export type InsertVerificationRequest = z.infer<typeof insertVerificationRequestSchema>;
export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type EvidenceRequirement = typeof evidenceRequirements.$inferSelect;
export type InsertEvidenceRequirement = z.infer<typeof insertEvidenceRequirementSchema>;
export type AuditResponse = typeof auditResponses.$inferSelect;
export type InsertAuditResponse = z.infer<typeof insertAuditResponseSchema>;
export type ReductionPromise = typeof reductionPromises.$inferSelect;
export type InsertReductionPromise = z.infer<typeof insertReductionPromiseSchema>;
export type PrintableFormSubmission = typeof printableFormSubmissions.$inferSelect;
export type InsertPrintableFormSubmission = z.infer<typeof insertPrintableFormSubmissionSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;
export type EventResource = typeof eventResources.$inferSelect;
export type InsertEventResource = z.infer<typeof insertEventResourceSchema>;
export type EventAnnouncement = typeof eventAnnouncements.$inferSelect;
export type InsertEventAnnouncement = z.infer<typeof insertEventAnnouncementSchema>;
export type EventBanner = typeof eventBanners.$inferSelect;
export type InsertEventBanner = z.infer<typeof insertEventBannerSchema>;
export type EventLinkClick = typeof eventLinkClicks.$inferSelect;
export type InsertEventLinkClick = z.infer<typeof insertEventLinkClickSchema>;
export type EventResourceDownload = typeof eventResourceDownloads.$inferSelect;
export type InsertEventResourceDownload = z.infer<typeof insertEventResourceDownloadSchema>;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type InsertMediaAsset = z.infer<typeof insertMediaAssetSchema>;
export type MediaTag = typeof mediaTags.$inferSelect;
export type InsertMediaTag = z.infer<typeof insertMediaTagSchema>;
export type MediaAssetTag = typeof mediaAssetTags.$inferSelect;
export type InsertMediaAssetTag = z.infer<typeof insertMediaAssetTagSchema>;
export type MediaAssetUsage = typeof mediaAssetUsage.$inferSelect;
export type InsertMediaAssetUsage = z.infer<typeof insertMediaAssetUsageSchema>;
export type ImportBatch = typeof importBatches.$inferSelect;
export type InsertImportBatch = z.infer<typeof insertImportBatchSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type DocumentLock = typeof documentLocks.$inferSelect;
export type InsertDocumentLock = z.infer<typeof insertDocumentLockSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Event Analytics Types
export interface EventAnalytics {
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
}

// Health Monitoring Tables
export const healthChecks = pgTable("health_checks", {
  id: varchar("id").primaryKey(),
  endpoint: varchar("endpoint").notNull(),
  status: healthCheckStatusEnum("status").notNull(),
  responseTime: integer("response_time"),
  errorMessage: text("error_message"),
  checkedAt: timestamp("checked_at").notNull().defaultNow(),
}, (table) => [
  index("idx_health_checks_endpoint").on(table.endpoint),
  index("idx_health_checks_checked_at").on(table.checkedAt),
]);

export const uptimeMetrics = pgTable("uptime_metrics", {
  id: varchar("id").primaryKey(),
  date: timestamp("date").notNull(),
  endpoint: varchar("endpoint").notNull(),
  totalChecks: integer("total_checks").notNull().default(0),
  successfulChecks: integer("successful_checks").notNull().default(0),
  failedChecks: integer("failed_checks").notNull().default(0),
  avgResponseTime: decimal("avg_response_time", { precision: 10, scale: 2 }),
  uptimePercentage: decimal("uptime_percentage", { precision: 5, scale: 2 }),
}, (table) => [
  index("idx_uptime_metrics_date").on(table.date),
  index("idx_uptime_metrics_endpoint").on(table.endpoint),
  uniqueIndex("idx_uptime_metrics_unique").on(table.date, table.endpoint),
]);

export const insertHealthCheckSchema = createInsertSchema(healthChecks).omit({
  id: true,
  checkedAt: true,
});

export const insertUptimeMetricSchema = createInsertSchema(uptimeMetrics).omit({
  id: true,
});

export type HealthCheck = typeof healthChecks.$inferSelect;
export type InsertHealthCheck = z.infer<typeof insertHealthCheckSchema>;
export type UptimeMetric = typeof uptimeMetrics.$inferSelect;
export type InsertUptimeMetric = z.infer<typeof insertUptimeMetricSchema>;

// Settings table for application-wide settings
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_settings_key").on(table.key),
]);

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

// Password Reset Token schemas
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// Authentication types
export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type CreatePasswordUser = z.infer<typeof createPasswordUserSchema>;
