import { pgTable, serial, integer, varchar, text, timestamp, foreignKey, decimal, index, jsonb } from 'drizzle-orm/pg-core';
import { matchingResults } from './matching-results';
import { internalGrades } from './internal-grades';

export const aiFeedback = pgTable('ai_feedback', {
  id: serial('id').primaryKey(),
  matchingResultId: integer('matching_result_id'),
  userId: varchar('user_id', { length: 100 }),
  correctGrade: integer('correct_grade'),
  feedbackType: varchar('feedback_type', { length: 50 }),
  feedbackNotes: text('feedback_notes'),
  
  // Enhanced feedback for AI improvement
  actualMatchQuality: decimal('actual_match_quality', { precision: 3, scale: 2 }),
  aiAccuracy: decimal('ai_accuracy', { precision: 3, scale: 2 }),
  userSatisfaction: integer('user_satisfaction'), // 1-5 rating
  feedbackContext: jsonb('feedback_context'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userSatisfactionIdx: index('idx_ai_feedback_satisfaction').on(table.userSatisfaction),
  aiAccuracyIdx: index('idx_ai_feedback_accuracy').on(table.aiAccuracy),
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