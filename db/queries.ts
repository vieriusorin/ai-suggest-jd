// src/db/queries.ts
import { eq, and, gte, lte, desc, asc, ilike, inArray } from 'drizzle-orm';
import { db } from './connection';
import { 
  internalGrades, 
  candidates, 
  jobDescriptions, 
  matchingResults, 
  candidateJobMatches, 
  aiFeedback 
} from './schema';

// Internal Grades Operations
export const gradeQueries = {
  // Get all grades
  getAll: async () => {
    return await db.select().from(internalGrades).orderBy(asc(internalGrades.levelNumber));
  },

  // Get grade by level number
  getByLevel: async (levelNumber: number) => {
    return await db.select().from(internalGrades).where(eq(internalGrades.levelNumber, levelNumber));
  },

  // Get grade by abbreviation
  getByAbbreviation: async (abbreviation: string) => {
    return await db.select().from(internalGrades).where(eq(internalGrades.abbreviation, abbreviation));
  },
};

// Candidate Operations
export const candidateQueries = {
  // Get all candidates
  getAll: async () => {
    return await db.select().from(candidates).orderBy(desc(candidates.createdAt));
  },

  // Get candidate by ID with grade relations
  getById: async (id: number) => {
    return await db.query.candidates.findFirst({
      where: eq(candidates.id, id),
      with: {
        currentGrade: true,
        targetGrade: true,
        jobMatches: {
          with: {
            jobDescription: true,
          },
        },
      },
    });
  },

  // Get candidates by experience range
  getByExperienceRange: async (minYears: number, maxYears: number) => {
    return await db.select().from(candidates)
      .where(and(
        gte(candidates.yearsExperience, minYears.toString()),
        lte(candidates.yearsExperience, maxYears.toString())
      ))
      .orderBy(asc(candidates.yearsExperience));
  },

  // Get candidates by grade level
  getByGradeLevel: async (gradeLevel: number) => {
    return await db.select().from(candidates)
      .where(eq(candidates.currentGradeLevel, gradeLevel))
      .orderBy(desc(candidates.yearsExperience));
  },

  // Search candidates by skills
  searchBySkills: async (skillKeywords: string[]) => {
    return await db.select().from(candidates)
      .where(inArray(candidates.skills, skillKeywords))
      .orderBy(desc(candidates.yearsExperience));
  },

  // Create new candidate
  create: async (candidateData: typeof candidates.$inferInsert) => {
    return await db.insert(candidates).values(candidateData).returning();
  },

  // Update candidate
  update: async (id: number, candidateData: Partial<typeof candidates.$inferInsert>) => {
    return await db.update(candidates)
      .set({ ...candidateData, updatedAt: new Date() })
      .where(eq(candidates.id, id))
      .returning();
  },
};

// Job Description Operations
export const jobQueries = {
  // Get all job descriptions
  getAll: async () => {
    return await db.select().from(jobDescriptions).orderBy(desc(jobDescriptions.createdAt));
  },

  // Get job by ID with matching results
  getById: async (id: number) => {
    return await db.query.jobDescriptions.findFirst({
      where: eq(jobDescriptions.id, id),
      with: {
        aiSuggestedGradeRef: true,
        matchingResults: {
          orderBy: desc(matchingResults.analyzedAt),
          limit: 1,
        },
        candidateMatches: {
          with: {
            candidate: true,
          },
          orderBy: desc(candidateJobMatches.matchScore),
          limit: 10,
        },
      },
    });
  },

  // Get jobs by company
  getByCompany: async (company: string) => {
    return await db.select().from(jobDescriptions)
      .where(ilike(jobDescriptions.company, `%${company}%`))
      .orderBy(desc(jobDescriptions.createdAt));
  },

  // Get jobs by suggested grade
  getBySuggestedGrade: async (gradeLevel: number) => {
    return await db.select().from(jobDescriptions)
      .where(eq(jobDescriptions.aiSuggestedGrade, gradeLevel))
      .orderBy(desc(jobDescriptions.createdAt));
  },

  // Create new job description
  create: async (jobData: typeof jobDescriptions.$inferInsert) => {
    return await db.insert(jobDescriptions).values(jobData).returning();
  },

  // Update job description
  update: async (id: number, jobData: Partial<typeof jobDescriptions.$inferInsert>) => {
    return await db.update(jobDescriptions)
      .set({ ...jobData, updatedAt: new Date() })
      .where(eq(jobDescriptions.id, id))
      .returning();
  },
};

// Matching Results Operations
export const matchingQueries = {
  // Get all matching results
  getAll: async () => {
    return await db.query.matchingResults.findMany({
      with: {
        jobDescription: true,
        suggestedGrade: true,
      },
      orderBy: desc(matchingResults.analyzedAt),
    });
  },

  // Get matching results by job ID
  getByJobId: async (jobId: number) => {
    return await db.query.matchingResults.findMany({
      where: eq(matchingResults.jobDescriptionId, jobId),
      with: {
        suggestedGrade: true,
      },
      orderBy: desc(matchingResults.analyzedAt),
    });
  },

  // Get high confidence matches
  getHighConfidenceMatches: async (minConfidence: number = 0.8) => {
    return await db.query.matchingResults.findMany({
      where: gte(matchingResults.confidenceScore, minConfidence.toString()),
      with: {
        jobDescription: true,
        suggestedGrade: true,
      },
      orderBy: desc(matchingResults.confidenceScore),
    });
  },

  // Create new matching result
  create: async (matchingData: typeof matchingResults.$inferInsert) => {
    return await db.insert(matchingResults).values(matchingData).returning();
  },

  // Get latest match for a job
  getLatestForJob: async (jobId: number) => {
    return await db.query.matchingResults.findFirst({
      where: eq(matchingResults.jobDescriptionId, jobId),
      orderBy: desc(matchingResults.analyzedAt),
      with: {
        suggestedGrade: true,
      },
    });
  },
};

// Candidate Job Matches Operations
export const candidateMatchQueries = {
  // Get matches for a candidate
  getForCandidate: async (candidateId: number) => {
    return await db.query.candidateJobMatches.findMany({
      where: eq(candidateJobMatches.candidateId, candidateId),
      with: {
        jobDescription: true,
      },
      orderBy: desc(candidateJobMatches.matchScore),
    });
  },

  // Get matches for a job
  getForJob: async (jobId: number) => {
    return await db.query.candidateJobMatches.findMany({
      where: eq(candidateJobMatches.jobDescriptionId, jobId),
      with: {
        candidate: true,
      },
      orderBy: desc(candidateJobMatches.matchScore),
    });
  },

  // Get top matches (high scores)
  getTopMatches: async (minScore: number = 0.8, limit: number = 20) => {
    return await db.query.candidateJobMatches.findMany({
      where: gte(candidateJobMatches.matchScore, minScore.toString()),
      with: {
        candidate: true,
        jobDescription: true,
      },
      orderBy: desc(candidateJobMatches.matchScore),
      limit,
    });
  },

  // Create new candidate-job match
  create: async (matchData: typeof candidateJobMatches.$inferInsert) => {
    return await db.insert(candidateJobMatches).values(matchData).returning();
  },

  // Update match score
  updateScore: async (candidateId: number, jobId: number, newScore: number) => {
    return await db.update(candidateJobMatches)
      .set({ matchScore: newScore.toString() })
      .where(and(
        eq(candidateJobMatches.candidateId, candidateId),
        eq(candidateJobMatches.jobDescriptionId, jobId)
      ))
      .returning();
  },
};

// AI Feedback Operations
export const feedbackQueries = {
  // Get all feedback
  getAll: async () => {
    return await db.query.aiFeedback.findMany({
      with: {
        matchingResult: {
          with: {
            jobDescription: true,
          },
        },
        correctGradeRef: true,
      },
      orderBy: desc(aiFeedback.createdAt),
    });
  },

  // Create feedback
  create: async (feedbackData: typeof aiFeedback.$inferInsert) => {
    return await db.insert(aiFeedback).values(feedbackData).returning();
  },

  // Get feedback for a matching result
  getForMatchingResult: async (matchingResultId: number) => {
    return await db.select().from(aiFeedback)
      .where(eq(aiFeedback.matchingResultId, matchingResultId));
  },
};

// Analytics Queries
export const analyticsQueries = {
  // Get grade distribution of candidates
  getCandidateGradeDistribution: async () => {
    return await db
      .select({
        gradeLevel: candidates.currentGradeLevel,
        count: candidates.id,
      })
      .from(candidates)
      .groupBy(candidates.currentGradeLevel)
      .orderBy(asc(candidates.currentGradeLevel));
  },

  // Get average confidence scores by grade
  getAverageConfidenceByGrade: async () => {
    return await db
      .select({
        gradeLevel: matchingResults.suggestedInternalGrade,
        avgConfidence: matchingResults.confidenceScore,
      })
      .from(matchingResults)
      .groupBy(matchingResults.suggestedInternalGrade)
      .orderBy(asc(matchingResults.suggestedInternalGrade));
  },

  // Get matching accuracy (requires feedback)
  getMatchingAccuracy: async () => {
    return await db
      .select({
        totalFeedback: aiFeedback.id,
        correctMatches: aiFeedback.feedbackType,
      })
      .from(aiFeedback)
      .groupBy(aiFeedback.feedbackType);
  },
};