import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const internalGrades = pgTable('internal_grades', {
  id: serial('id').primaryKey(),
  levelNumber: integer('level_number').notNull().unique(),
  title: varchar('title', { length: 100 }).notNull(),
  abbreviation: varchar('abbreviation', { length: 10 }).notNull(),
  levelKeyword: varchar('level_keyword', { length: 100 }).notNull(),
  experienceMin: varchar('experience_min', { length: 20 }).notNull(),
  theoryLevel: varchar('theory_level', { length: 50 }).notNull(),
  autonomyLevel: varchar('autonomy_level', { length: 50 }).notNull(),
  leadershipLevel: varchar('leadership_level', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});