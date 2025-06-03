CREATE TABLE "internal_grades" (
	"id" serial PRIMARY KEY NOT NULL,
	"level_number" integer NOT NULL,
	"title" varchar(100) NOT NULL,
	"abbreviation" varchar(10) NOT NULL,
	"level_keyword" varchar(100) NOT NULL,
	"experience_min" varchar(20) NOT NULL,
	"theory_level" varchar(50) NOT NULL,
	"autonomy_level" varchar(50) NOT NULL,
	"leadership_level" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "internal_grades_level_number_unique" UNIQUE("level_number")
);
--> statement-breakpoint
CREATE TABLE "job_descriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"company" varchar(200) NOT NULL,
	"department" varchar(100),
	"location" varchar(200),
	"employment_type" varchar(50),
	"experience_required" varchar(50),
	"description" text NOT NULL,
	"requirements" text,
	"responsibilities" text,
	"skills_required" text[],
	"education_required" varchar(100),
	"salary_min" integer,
	"salary_max" integer,
	"remote_option" boolean DEFAULT false,
	"ai_suggested_grade" integer,
	"ai_confidence_score" numeric(3, 2),
	"ai_reasoning" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matching_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_description_id" integer,
	"suggested_internal_grade" integer,
	"level_keyword" varchar(100),
	"confidence_score" numeric(3, 2) NOT NULL,
	"experience_range" varchar(50),
	"key_requirements_extracted" text[],
	"reasoning" text,
	"theory_level_analysis" text,
	"experience_capability_analysis" text,
	"autonomy_level_analysis" text,
	"leadership_coaching_analysis" text,
	"alternative_considerations" jsonb,
	"flags_for_review" text[],
	"analyzed_at" timestamp DEFAULT now() NOT NULL,
	"ai_model_used" varchar(100) DEFAULT 'gpt-4'
);
--> statement-breakpoint
CREATE TABLE "ai_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"matching_result_id" integer,
	"user_id" varchar(100),
	"correct_grade" integer,
	"feedback_type" varchar(50),
	"feedback_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_job_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer,
	"job_description_id" integer,
	"match_score" numeric(3, 2),
	"experience_match" numeric(3, 2),
	"skills_match" numeric(3, 2),
	"grade_level_match" numeric(3, 2),
	"salary_match" numeric(3, 2),
	"location_match" numeric(3, 2),
	"match_reasoning" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_candidate_job" UNIQUE("candidate_id","job_description_id")
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"years_experience" numeric(3, 1) NOT NULL,
	"current_title" varchar(200),
	"current_company" varchar(200),
	"education_level" varchar(100),
	"skills" text[],
	"certifications" text[],
	"summary" text,
	"linkedin_url" varchar(500),
	"resume_text" text,
	"current_grade_level" integer,
	"target_grade_level" integer,
	"salary_expectation" integer,
	"location" varchar(200),
	"remote_preference" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidates_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD CONSTRAINT "fk_job_descriptions_grade" FOREIGN KEY ("ai_suggested_grade") REFERENCES "public"."internal_grades"("level_number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matching_results" ADD CONSTRAINT "fk_matching_results_job" FOREIGN KEY ("job_description_id") REFERENCES "public"."job_descriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matching_results" ADD CONSTRAINT "fk_matching_results_grade" FOREIGN KEY ("suggested_internal_grade") REFERENCES "public"."internal_grades"("level_number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD CONSTRAINT "fk_ai_feedback_matching" FOREIGN KEY ("matching_result_id") REFERENCES "public"."matching_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD CONSTRAINT "fk_ai_feedback_grade" FOREIGN KEY ("correct_grade") REFERENCES "public"."internal_grades"("level_number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_job_matches" ADD CONSTRAINT "fk_candidate_matches_candidate" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_job_matches" ADD CONSTRAINT "fk_candidate_matches_job" FOREIGN KEY ("job_description_id") REFERENCES "public"."job_descriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "fk_candidates_current_grade" FOREIGN KEY ("current_grade_level") REFERENCES "public"."internal_grades"("level_number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "fk_candidates_target_grade" FOREIGN KEY ("target_grade_level") REFERENCES "public"."internal_grades"("level_number") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_job_descriptions_grade" ON "job_descriptions" USING btree ("ai_suggested_grade");--> statement-breakpoint
CREATE INDEX "idx_job_descriptions_skills" ON "job_descriptions" USING btree ("skills_required");--> statement-breakpoint
CREATE INDEX "idx_matching_results_confidence" ON "matching_results" USING btree ("confidence_score");--> statement-breakpoint
CREATE INDEX "idx_matching_results_job" ON "matching_results" USING btree ("job_description_id");--> statement-breakpoint
CREATE INDEX "idx_candidate_matches_score" ON "candidate_job_matches" USING btree ("match_score");--> statement-breakpoint
CREATE INDEX "idx_candidates_experience" ON "candidates" USING btree ("years_experience");--> statement-breakpoint
CREATE INDEX "idx_candidates_skills" ON "candidates" USING btree ("skills");--> statement-breakpoint
CREATE INDEX "idx_candidates_grade_level" ON "candidates" USING btree ("current_grade_level");