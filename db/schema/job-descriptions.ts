import { pgTable, serial, integer, varchar, text, decimal, boolean, timestamp, index, foreignKey } from 'drizzle-orm/pg-core';
import { internalGrades } from './internal-grades';
import { vector } from '../vector';

export const jobDescriptions = pgTable('job_descriptions', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  company: varchar('company', { length: 200 }).notNull(),
  department: varchar('department', { length: 100 }),
  location: varchar('location', { length: 200 }),
  employmentType: varchar('employment_type', { length: 50 }),
  experienceRequired: varchar('experience_required', { length: 50 }),
  description: text('description').notNull(),
  requirements: text('requirements'),
  responsibilities: text('responsibilities'),
  skillsRequired: text('skills_required').array(),
  educationRequired: varchar('education_required', { length: 100 }),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  remoteOption: boolean('remote_option').default(false),
  aiSuggestedGrade: integer('ai_suggested_grade'),
  aiConfidenceScore: decimal('ai_confidence_score', { precision: 3, scale: 2 }),
  aiReasoning: text('ai_reasoning'),
  
  // Vector embeddings for semantic matching
  jobEmbedding: vector('job_embedding', { dimensions: 1536 }),
  requirementsEmbedding: vector('requirements_embedding', { dimensions: 1536 }),
  skillsEmbedding: vector('skills_embedding', { dimensions: 1536 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  aiSuggestedGradeIdx: index('idx_job_descriptions_grade').on(table.aiSuggestedGrade),
  skillsRequiredIdx: index('idx_job_descriptions_skills').on(table.skillsRequired),
  
  // HNSW indexes for vector similarity search (much faster than brute force)
  jobEmbeddingIdx: index('idx_job_descriptions_job_embedding')
    .using('hnsw', table.jobEmbedding.asc().op('vector_cosine_ops')),
  requirementsEmbeddingIdx: index('idx_job_descriptions_requirements_embedding')
    .using('hnsw', table.requirementsEmbedding.asc().op('vector_cosine_ops')),
  
  aiSuggestedGradeFk: foreignKey({
    columns: [table.aiSuggestedGrade],
    foreignColumns: [internalGrades.levelNumber],
    name: 'fk_job_descriptions_grade'
  }),
}));