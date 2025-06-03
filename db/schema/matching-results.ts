import { pgTable, serial, integer, varchar, text, decimal, timestamp, jsonb, index, foreignKey } from 'drizzle-orm/pg-core';
import { jobDescriptions } from './job-descriptions';
import { internalGrades } from './internal-grades';

  export const matchingResults = pgTable('matching_results', {
    id: serial('id').primaryKey(),
    jobDescriptionId: integer('job_description_id'),
    suggestedInternalGrade: integer('suggested_internal_grade'),
    levelKeyword: varchar('level_keyword', { length: 100 }),
    confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }).notNull(),
    experienceRange: varchar('experience_range', { length: 50 }),
    keyRequirementsExtracted: text('key_requirements_extracted').array(),
    reasoning: text('reasoning'),
    theoryLevelAnalysis: text('theory_level_analysis'),
    experienceCapabilityAnalysis: text('experience_capability_analysis'),
    autonomyLevelAnalysis: text('autonomy_level_analysis'),
    leadershipCoachingAnalysis: text('leadership_coaching_analysis'),
    alternativeConsiderations: jsonb('alternative_considerations'),
    flagsForReview: text('flags_for_review').array(),
    analyzedAt: timestamp('analyzed_at').defaultNow().notNull(),
    aiModelUsed: varchar('ai_model_used', { length: 100 }).default('gpt-4'),
  }, (table) => ({
    confidenceIdx: index('idx_matching_results_confidence').on(table.confidenceScore),
    jobIdx: index('idx_matching_results_job').on(table.jobDescriptionId),
    jobFk: foreignKey({
      columns: [table.jobDescriptionId],
      foreignColumns: [jobDescriptions.id],
      name: 'fk_matching_results_job'
    }),
    gradeFk: foreignKey({
      columns: [table.suggestedInternalGrade],
      foreignColumns: [internalGrades.levelNumber],
      name: 'fk_matching_results_grade'
    }),
  }));