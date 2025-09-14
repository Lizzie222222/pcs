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

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("teacher"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  featuredSchool: boolean("featured_school").default(false),
  primaryContactId: varchar("primary_contact_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const schoolUsers = pgTable("school_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar("role").default("teacher"),
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

export const evidence = pgTable("evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: varchar("school_id").notNull().references(() => schools.id, { onDelete: 'cascade' }),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  stage: programStageEnum("stage").notNull(),
  status: evidenceStatusEnum("status").default('pending'),
  visibility: visibilityEnum("visibility").default('private'),
  files: jsonb("files").default('[]'),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  isFeatured: boolean("is_featured").default(false),
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

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  schoolUsers: many(schoolUsers),
  primaryContactSchools: many(schools),
  submittedEvidence: many(evidence, { relationName: "submittedEvidence" }),
  reviewedEvidence: many(evidence, { relationName: "reviewedEvidence" }),
  caseStudies: many(caseStudies),
  emailLogs: many(emailLogs),
}));

export const schoolsRelations = relations(schools, ({ many, one }) => ({
  users: many(schoolUsers),
  primaryContact: one(users, {
    fields: [schools.primaryContactId],
    references: [users.id],
  }),
  evidence: many(evidence),
  caseStudies: many(caseStudies),
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

export const resourcesRelations = relations(resources, ({ one }) => ({}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  recipient: one(users, {
    fields: [emailLogs.recipientId],
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
