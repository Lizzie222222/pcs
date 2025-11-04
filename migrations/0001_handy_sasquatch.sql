CREATE TABLE "admin_evidence_overrides" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" varchar NOT NULL,
	"evidence_requirement_id" varchar NOT NULL,
	"stage" "program_stage" NOT NULL,
	"round_number" integer DEFAULT 1 NOT NULL,
	"marked_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar NOT NULL,
	"value" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "audit_responses" ADD COLUMN "round_number" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "reduction_promises" ADD COLUMN "round_number" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "legacy_evidence_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "welcome_email_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "admin_evidence_overrides" ADD CONSTRAINT "admin_evidence_overrides_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_evidence_overrides" ADD CONSTRAINT "admin_evidence_overrides_evidence_requirement_id_evidence_requirements_id_fk" FOREIGN KEY ("evidence_requirement_id") REFERENCES "public"."evidence_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_evidence_overrides" ADD CONSTRAINT "admin_evidence_overrides_marked_by_users_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_evidence_overrides_school_id_idx" ON "admin_evidence_overrides" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "admin_evidence_overrides_requirement_id_idx" ON "admin_evidence_overrides" USING btree ("evidence_requirement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_evidence_overrides_unique_idx" ON "admin_evidence_overrides" USING btree ("school_id","evidence_requirement_id","round_number");--> statement-breakpoint
CREATE INDEX "idx_settings_key" ON "settings" USING btree ("key");