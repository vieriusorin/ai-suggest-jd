import { pgTable, serial, integer, varchar, text, decimal, timestamp, index, foreignKey, jsonb } from 'drizzle-orm/pg-core';
import { internalGrades } from './internal-grades';
import { jobDescriptions } from './job-descriptions';
import { vector } from '../vector';

export const userProfiles = pgTable('user_profiles', {
    id: serial('id').primaryKey(),
    userId: varchar('user_id', { length: 100 }).notNull().unique(),
    
    // User preferences and search behavior
    preferences: jsonb('preferences'), // Job preferences, salary, location, remote work, etc.
    searchHistory: jsonb('search_history'), // Previous searches and interactions
    personalityTraits: jsonb('personality_traits'), // Work style, culture fit preferences
    careerGoals: text('career_goals'),
    
    // Vector representations for AI matching
    preferencesEmbedding: vector('preferences_embedding', { dimensions: 1536 }),
    behaviorEmbedding: vector('behavior_embedding', { dimensions: 1536 }),
    personalityEmbedding: vector('personality_embedding', { dimensions: 1536 }),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  }, (table) => ({
    userIdIdx: index('idx_user_profiles_user_id').on(table.userId),
    preferencesEmbeddingIdx: index('idx_user_preferences_embedding')
      .using('hnsw', table.preferencesEmbedding.asc().op('vector_cosine_ops')),
  }));
