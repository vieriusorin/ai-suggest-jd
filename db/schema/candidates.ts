import { pgTable, serial, integer, varchar, text, decimal, timestamp, index, foreignKey } from 'drizzle-orm/pg-core';
import { internalGrades } from './internal-grades';
import { vector } from '../vector';

export const candidates = pgTable('candidates', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  yearsExperience: decimal('years_experience', { precision: 3, scale: 1 }).notNull(),
  currentTitle: varchar('current_title', { length: 200 }),
  currentCompany: varchar('current_company', { length: 200 }),
  educationLevel: varchar('education_level', { length: 100 }),
  skills: text('skills').array(),
  certifications: text('certifications').array(),
  summary: text('summary'),
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  resumeText: text('resume_text'),
  currentGradeLevel: integer('current_grade_level'),
  targetGradeLevel: integer('target_grade_level'),
  salaryExpectation: integer('salary_expectation'),
  location: varchar('location', { length: 200 }),
  remotePreference: varchar('remote_preference', { length: 50 }),
  
  // Vector embeddings for semantic matching
  profileEmbedding: vector('profile_embedding', { dimensions: 1536 }),
  skillsEmbedding: vector('skills_embedding', { dimensions: 1536 }),
  experienceEmbedding: vector('experience_embedding', { dimensions: 1536 }),
  resumeEmbedding: vector('resume_embedding', { dimensions: 1536 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  experienceIdx: index('idx_candidates_experience').on(table.yearsExperience),
  skillsIdx: index('idx_candidates_skills').on(table.skills),
  gradeLevelIdx: index('idx_candidates_grade_level').on(table.currentGradeLevel),
  
  // HNSW indexes for fast vector similarity search
  profileEmbeddingIdx: index('idx_candidates_profile_embedding')
    .using('hnsw', table.profileEmbedding.asc().op('vector_cosine_ops')),
  skillsEmbeddingIdx: index('idx_candidates_skills_embedding')
    .using('hnsw', table.skillsEmbedding.asc().op('vector_cosine_ops')),
  resumeEmbeddingIdx: index('idx_candidates_resume_embedding')
    .using('hnsw', table.resumeEmbedding.asc().op('vector_cosine_ops')),
  
  currentGradeFk: foreignKey({
    columns: [table.currentGradeLevel],
    foreignColumns: [internalGrades.levelNumber],
    name: 'fk_candidates_current_grade'
  }),
  targetGradeFk: foreignKey({
    columns: [table.targetGradeLevel],
    foreignColumns: [internalGrades.levelNumber],
    name: 'fk_candidates_target_grade'
  }),
}));