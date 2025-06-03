import { pgTable, serial, integer, decimal, text, timestamp, index, unique, foreignKey, jsonb, boolean, varchar } from 'drizzle-orm/pg-core';
import { candidates } from './candidates';
import { jobDescriptions } from './job-descriptions';

export const candidateJobMatches = pgTable('candidate_job_matches', {
  id: serial('id').primaryKey(),
  candidateId: integer('candidate_id'),
  jobDescriptionId: integer('job_description_id'),
  userId: varchar('user_id', { length: 100 }), // User who requested the match
  
  // Traditional scoring
  matchScore: decimal('match_score', { precision: 3, scale: 2 }),
  experienceMatch: decimal('experience_match', { precision: 3, scale: 2 }),
  skillsMatch: decimal('skills_match', { precision: 3, scale: 2 }),
  gradeLevelMatch: decimal('grade_level_match', { precision: 3, scale: 2 }),
  salaryMatch: decimal('salary_match', { precision: 3, scale: 2 }),
  locationMatch: decimal('location_match', { precision: 3, scale: 2 }),
  
  // AI & Vector-based scoring
  aiMatchScore: decimal('ai_match_score', { precision: 5, scale: 4 }),
  profileSimilarity: decimal('profile_similarity', { precision: 5, scale: 4 }),
  skillsSimilarity: decimal('skills_similarity', { precision: 5, scale: 4 }),
  experienceSimilarity: decimal('experience_similarity', { precision: 5, scale: 4 }),
  cultureFitScore: decimal('culture_fit_score', { precision: 5, scale: 4 }),
  
  // AI-generated explanations
  matchReasoning: text('match_reasoning'),
  aiExplanation: text('ai_explanation'),
  strengthsWeaknesses: jsonb('strengths_weaknesses'),
  improvementSuggestions: text('improvement_suggestions'),
  
  // Ranking and metadata
  rank: integer('rank'),
  isRecommended: boolean('is_recommended').default(false),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  matchScoreIdx: index('idx_candidate_matches_score').on(table.matchScore),
  aiMatchScoreIdx: index('idx_candidate_matches_ai_score').on(table.aiMatchScore),
  profileSimilarityIdx: index('idx_candidate_matches_profile_similarity').on(table.profileSimilarity),
  userIdIdx: index('idx_candidate_matches_user_id').on(table.userId),
  rankIdx: index('idx_candidate_matches_rank').on(table.rank),
  recommendedIdx: index('idx_candidate_matches_recommended').on(table.isRecommended),
  
  uniqueCandidateJobUser: unique('unique_candidate_job_user').on(table.candidateId, table.jobDescriptionId, table.userId),
  candidateFk: foreignKey({
    columns: [table.candidateId],
    foreignColumns: [candidates.id],
    name: 'fk_candidate_matches_candidate'
  }),
  jobFk: foreignKey({
    columns: [table.jobDescriptionId],
    foreignColumns: [jobDescriptions.id],
    name: 'fk_candidate_matches_job'
  }),
}));