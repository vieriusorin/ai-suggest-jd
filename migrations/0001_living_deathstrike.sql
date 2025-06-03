CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"preferences" jsonb,
	"search_history" jsonb,
	"personality_traits" jsonb,
	"career_goals" text,
	"preferences_embedding" vector(1536),
	"behavior_embedding" vector(1536),
	"personality_embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "candidate_job_matches" DROP CONSTRAINT "unique_candidate_job";--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "job_embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "requirements_embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD COLUMN "skills_embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD COLUMN "actual_match_quality" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD COLUMN "ai_accuracy" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD COLUMN "user_satisfaction" integer;--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD COLUMN "feedback_context" jsonb;--> statement-breakpoint
ALTER TABLE "candidate_job_matches" ADD COLUMN "user_id" varchar(100);--> statement-breakpoint
ALTER TABLE "candidate_job_matches" ADD COLUMN "ai_match_score" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "candidate_job_matches" ADD COLUMN "profile_similarity" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "candidate_job_matches" ADD COLUMN "skills_similarity" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "candidate_job_matches" ADD COLUMN "experience_similarity" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "candidate_job_matches" ADD COLUMN "culture_fit_score" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "candidate_job_matches" ADD COLUMN "ai_explanation" text;--> statement-breakpoint
ALTER TABLE "candidate_job_matches" ADD COLUMN "strengths_weaknesses" jsonb;--> statement-breakpoint
ALTER TABLE "candidate_job_matches" ADD COLUMN "improvement_suggestions" text;--> statement-breakpoint
ALTER TABLE "candidate_job_matches" ADD COLUMN "rank" integer;--> statement-breakpoint
ALTER TABLE "candidate_job_matches" ADD COLUMN "is_recommended" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "profile_embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "skills_embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "experience_embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "resume_embedding" vector(1536);--> statement-breakpoint
CREATE INDEX "idx_user_profiles_user_id" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_preferences_embedding" ON "user_profiles" USING hnsw ("preferences_embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_job_descriptions_job_embedding" ON "job_descriptions" USING hnsw ("job_embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_job_descriptions_requirements_embedding" ON "job_descriptions" USING hnsw ("requirements_embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_feedback_satisfaction" ON "ai_feedback" USING btree ("user_satisfaction");--> statement-breakpoint
CREATE INDEX "idx_ai_feedback_accuracy" ON "ai_feedback" USING btree ("ai_accuracy");--> statement-breakpoint
CREATE INDEX "idx_candidate_matches_ai_score" ON "candidate_job_matches" USING btree ("ai_match_score");--> statement-breakpoint
CREATE INDEX "idx_candidate_matches_profile_similarity" ON "candidate_job_matches" USING btree ("profile_similarity");--> statement-breakpoint
CREATE INDEX "idx_candidate_matches_user_id" ON "candidate_job_matches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_candidate_matches_rank" ON "candidate_job_matches" USING btree ("rank");--> statement-breakpoint
CREATE INDEX "idx_candidate_matches_recommended" ON "candidate_job_matches" USING btree ("is_recommended");--> statement-breakpoint
CREATE INDEX "idx_candidates_profile_embedding" ON "candidates" USING hnsw ("profile_embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_candidates_skills_embedding" ON "candidates" USING hnsw ("skills_embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_candidates_resume_embedding" ON "candidates" USING hnsw ("resume_embedding" vector_cosine_ops);--> statement-breakpoint
ALTER TABLE "candidate_job_matches" ADD CONSTRAINT "unique_candidate_job_user" UNIQUE("candidate_id","job_description_id","user_id");