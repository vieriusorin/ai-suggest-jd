import { pgTable, serial, integer, decimal, text, timestamp, index, unique, foreignKey } from 'drizzle-orm/pg-core';
import { candidates } from './candidates';
import { jobDescriptions } from './job-descriptions';

export const candidateJobMatches = pgTable('candidate_job_matches', {
  id: serial('id').primaryKey(),
  candidateId: integer('candidate_id'),
  jobDescriptionId: integer('job_description_id'),
  matchScore: decimal('match_score', { precision: 3, scale: 2 }),
  experienceMatch: decimal('experience_match', { precision: 3, scale: 2 }),
  skillsMatch: decimal('skills_match', { precision: 3, scale: 2 }),
  gradeLevelMatch: decimal('grade_level_match', { precision: 3, scale: 2 }),
  salaryMatch: decimal('salary_match', { precision: 3, scale: 2 }),
  locationMatch: decimal('location_match', { precision: 3, scale: 2 }),
  matchReasoning: text('match_reasoning'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  matchScoreIdx: index('idx_candidate_matches_score').on(table.matchScore),
  uniqueCandidateJob: unique('unique_candidate_job').on(table.candidateId, table.jobDescriptionId),
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