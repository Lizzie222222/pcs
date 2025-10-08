import { sql } from 'drizzle-orm';
import {
  index,
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

// Define enums before tables
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

export const programStageEnum = pgEnum('program_stage', [
  'inspire',
  'investigate', 
  'act'
]);

export const evidenceStatusEnum = pgEnum('evidence_status', [
  'pending',
  'approved',
  'rejected'
]);

export const visibilityEnum = pgEnum('visibility', [
  'private',
  'public'
]);

export const schoolRoleEnum = pgEnum('school_role', [
  'head_teacher',
  'teacher',
  'pending_teacher'
]);

// User storage table (supports email/password + Google OAuth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  emailVerified: boolean("email_verified").default(false),
  passwordHash: varchar("password_hash"), // nullable for Google OAuth users
  googleId: varchar("google_id").unique(), // nullable, unique when not null
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("teacher"), // Supports: teacher, admin, partner, school
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

export const schools = pgTable("schools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: schoolTypeEnum("type").notNull(),
  country: varchar("country").notNull(),
  address: text("address"),
  studentCount: integer("student_count"),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const schoolUsers = pgTable("school_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: schoolRoleEnum("role").default("teacher"),
  isVerified: boolean("is_verified").default(false),
  invitedBy: varchar("invited_by").references(() => users.id),
  invitedAt: timestamp("invited_at"),
  verifiedAt: timestamp("verified_at"),
  verificationMethod: varchar("verification_method"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_school_users_school_role").on(table.schoolId, table.role),
]);

export const teacherInvitations = pgTable("teacher_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(),
  status: invitationStatusEnum("status").default('pending'),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const adminInvitations = pgTable("admin_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
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
  country: varchar("country"),
  fileUrl: varchar("file_url"),
  fileType: varchar("file_type"),
  fileSize: integer("file_size"),
  downloadCount: integer("download_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const evidenceRequirements = pgTable("evidence_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stage: programStageEnum("stage").notNull(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  orderIndex: integer("order_index").notNull(),
  resourceUrl: varchar("resource_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const evidence = pgTable("evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  evidenceRequirementId: varchar("evidence_requirement_id").references(() => evidenceRequirements.id),
  title: varchar("title").notNull(),
  description: text("description"),
  stage: programStageEnum("stage").notNull(),
  status: evidenceStatusEnum("status").default('pending'),
  visibility: visibilityEnum("visibility").default('private'),
  files: jsonb("files").default('[]'),
  videoLinks: text("video_links"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  isFeatured: boolean("is_featured").default(false),
  isAuditQuiz: boolean("is_audit_quiz").default(false),
  roundNumber: integer("round_number").default(1),
  hasChildren: boolean("has_children").default(false),
  parentalConsentFiles: jsonb("parental_consent_files").default('[]'),
  submittedAt: timestamp("submitted_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientEmail: varchar("recipient_email").notNull(),
  recipientId: varchar("recipient_id").references(() => users.id),
  subject: varchar("subject").notNull(),
  template: varchar("template"),
  status: varchar("status").default('sent'),
  sentAt: timestamp("sent_at").defaultNow(),
});

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

export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  stage: programStageEnum("stage").notNull(),
  issuedBy: varchar("issued_by").notNull().references(() => users.id),
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

export const auditResponses = pgTable("audit_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  status: auditStatusEnum("status").default('draft'),
  
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

export const reductionPromises = pgTable("reduction_promises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  auditId: varchar("audit_id").references(() => auditResponses.id, { onDelete: 'set null' }),
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

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  schoolUsers: many(schoolUsers),
  primaryContactSchools: many(schools),
  submittedEvidence: many(evidence, { relationName: "submittedEvidence" }),
  reviewedEvidence: many(evidence, { relationName: "reviewedEvidence" }),
  caseStudies: many(caseStudies),
  emailLogs: many(emailLogs),
  issuedCertificates: many(certificates),
  sentInvitations: many(teacherInvitations),
  sentAdminInvitations: many(adminInvitations),
  invitedSchoolUsers: many(schoolUsers, { relationName: "invitedBy" }),
  verificationRequests: many(verificationRequests, { relationName: "userVerificationRequests" }),
  reviewedVerificationRequests: many(verificationRequests, { relationName: "reviewedVerificationRequests" }),
  submittedAudits: many(auditResponses, { relationName: "submittedAudits" }),
  reviewedAudits: many(auditResponses, { relationName: "reviewedAudits" }),
  createdPromises: many(reductionPromises),
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

export const caseStudiesRelations = relations(caseStudies, ({ one }) => ({
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

export const resourcesRelations = relations(resources, ({ one }) => ({}));

export const evidenceRequirementsRelations = relations(evidenceRequirements, ({ many }) => ({
  evidence: many(evidence),
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  recipient: one(users, {
    fields: [emailLogs.recipientId],
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
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Password-based user creation schema (excludes OAuth fields)
export const createPasswordUserSchema = createInsertSchema(users).omit({
  id: true,
  googleId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  passwordHash: z.string().min(1, "Password hash is required"),
  emailVerified: z.boolean().default(false),
});

// OAuth user creation schema (excludes password fields)
export const createOAuthUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  googleId: z.string().min(1, "Google ID is required"),
  emailVerified: z.boolean().default(true),
});

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

export const insertEvidenceSchema = createInsertSchema(evidence).omit({
  id: true,
  submittedAt: true,
  updatedAt: true,
  reviewedAt: true,
  reviewedBy: true,
  reviewNotes: true,
  isFeatured: true,
});

export const insertCaseStudySchema = createInsertSchema(caseStudies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true,
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
export type Evidence = typeof evidence.$inferSelect;
export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
export type CaseStudy = typeof caseStudies.$inferSelect;
export type InsertCaseStudy = z.infer<typeof insertCaseStudySchema>;
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
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

// Authentication types
export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type CreatePasswordUser = z.infer<typeof createPasswordUserSchema>;
export type CreateOAuthUser = z.infer<typeof createOAuthUserSchema>;
