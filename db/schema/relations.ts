import { relations } from 'drizzle-orm';
import { internalGrades } from './internal-grades';
import { candidates } from './candidates';
import { jobDescriptions } from './job-descriptions';
import { matchingResults } from './matching-results';
import { candidateJobMatches } from './candidate-job-matches';
import { aiFeedback } from './ai-feedback';
import { userProfiles } from './users-profiles';

export const internalGradesRelations = relations(internalGrades, ({ many }) => ({
  currentGradeCandidates: many(candidates, { relationName: 'currentGrade' }),
  targetGradeCandidates: many(candidates, { relationName: 'targetGrade' }),
  jobDescriptions: many(jobDescriptions),
  matchingResults: many(matchingResults),
  aiFeedbackCorrect: many(aiFeedback),
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  currentGrade: one(internalGrades, {
    fields: [candidates.currentGradeLevel],
    references: [internalGrades.levelNumber],
    relationName: 'currentGrade',
  }),
  targetGrade: one(internalGrades, {
    fields: [candidates.targetGradeLevel],
    references: [internalGrades.levelNumber],
    relationName: 'targetGrade',
  }),
  jobMatches: many(candidateJobMatches),
}));

export const jobDescriptionsRelations = relations(jobDescriptions, ({ one, many }) => ({
  aiSuggestedGradeRef: one(internalGrades, {
    fields: [jobDescriptions.aiSuggestedGrade],
    references: [internalGrades.levelNumber],
  }),
  matchingResults: many(matchingResults),
  candidateMatches: many(candidateJobMatches),
}));

export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  candidateMatches: many(candidateJobMatches),
}));

export const matchingResultsRelations = relations(matchingResults, ({ one, many }) => ({
  jobDescription: one(jobDescriptions, {
    fields: [matchingResults.jobDescriptionId],
    references: [jobDescriptions.id],
  }),
  suggestedGrade: one(internalGrades, {
    fields: [matchingResults.suggestedInternalGrade],
    references: [internalGrades.levelNumber],
  }),
  feedback: many(aiFeedback),
}));

export const candidateJobMatchesRelations = relations(candidateJobMatches, ({ one }) => ({
  candidate: one(candidates, {
    fields: [candidateJobMatches.candidateId],
    references: [candidates.id],
  }),
  jobDescription: one(jobDescriptions, {
    fields: [candidateJobMatches.jobDescriptionId],
    references: [jobDescriptions.id],
  }),
  userProfile: one(userProfiles, {
    fields: [candidateJobMatches.userId],
    references: [userProfiles.userId],
  }),
}));

export const aiFeedbackRelations = relations(aiFeedback, ({ one }) => ({
  matchingResult: one(matchingResults, {
    fields: [aiFeedback.matchingResultId],
    references: [matchingResults.id],
  }),
  correctGradeRef: one(internalGrades, {
    fields: [aiFeedback.correctGrade],
    references: [internalGrades.levelNumber],
  }),
}));