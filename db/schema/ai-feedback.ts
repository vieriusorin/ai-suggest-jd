import { pgTable, serial, integer, varchar, text, timestamp, foreignKey } from 'drizzle-orm/pg-core';
import { matchingResults } from './matching-results';
import { internalGrades } from './internal-grades';

export const aiFeedback = pgTable('ai_feedback', {
  id: serial('id').primaryKey(),
  matchingResultId: integer('matching_result_id'),
  userId: varchar('user_id', { length: 100 }),
  correctGrade: integer('correct_grade'),
  feedbackType: varchar('feedback_type', { length: 50 }),
  feedbackNotes: text('feedback_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  matchingFk: foreignKey({
    columns: [table.matchingResultId],
    foreignColumns: [matchingResults.id],
    name: 'fk_ai_feedback_matching'
  }),
  gradeFk: foreignKey({
    columns: [table.correctGrade],
    foreignColumns: [internalGrades.levelNumber],
    name: 'fk_ai_feedback_grade'
  }),
}));