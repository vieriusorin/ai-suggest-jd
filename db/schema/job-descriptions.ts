import { pgTable, serial, integer, varchar, text, decimal, boolean, timestamp, index, foreignKey } from 'drizzle-orm/pg-core';
import { internalGrades } from './internal-grades';

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
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  aiSuggestedGradeIdx: index('idx_job_descriptions_grade').on(table.aiSuggestedGrade),
  skillsRequiredIdx: index('idx_job_descriptions_skills').on(table.skillsRequired),
  aiSuggestedGradeFk: foreignKey({
    columns: [table.aiSuggestedGrade],
    foreignColumns: [internalGrades.levelNumber],
    name: 'fk_job_descriptions_grade'
  }),
}));