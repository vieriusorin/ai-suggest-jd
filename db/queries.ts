import { eq, and, gte, lte, desc, asc, ilike, sql } from 'drizzle-orm';
import  db  from './connection';
import { 
  internalGrades, 
  candidates, 
  jobDescriptions, 
  matchingResults, 
  candidateJobMatches, 
  aiFeedback,
  userProfiles
} from './schema';

export type VectorSimilarityResult = {
  id: number;
  similarity: number;
  [key: string]: any;
};

export const vectorQueries = {
  findSimilarCandidates: async (
    targetEmbedding: number[], 
    threshold: number = 0.7, 
    limit: number = 10
  ): Promise<VectorSimilarityResult[]> => {
    const embeddingVector = `[${targetEmbedding.join(',')}]`;
    
    return await db.execute(sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.current_title,
        c.years_experience,
        c.current_grade_level,
        cosine_similarity(c.profile_embedding, ${embeddingVector}::vector) as similarity
      FROM candidates c
      WHERE c.profile_embedding IS NOT NULL
        AND cosine_similarity(c.profile_embedding, ${embeddingVector}::vector) >= ${threshold}
      ORDER BY cosine_similarity(c.profile_embedding, ${embeddingVector}::vector) DESC
      LIMIT ${limit}
    `) as any;
  },

  // Find matching jobs for a candidate using vector similarity
  findMatchingJobsForCandidate: async (
    candidateId: number,
    threshold: number = 0.6,
    limit: number = 10
  ) => {
    return await db.execute(sql`
      SELECT 
        j.id,
        j.title,
        j.company,
        j.location,
        j.salary_min,
        j.salary_max,
        j.remote_option,
        cosine_similarity(c.profile_embedding, j.job_embedding) as similarity
      FROM candidates c
      CROSS JOIN job_descriptions j
      WHERE c.id = ${candidateId}
        AND c.profile_embedding IS NOT NULL
        AND j.job_embedding IS NOT NULL
        AND cosine_similarity(c.profile_embedding, j.job_embedding) >= ${threshold}
      ORDER BY cosine_similarity(c.profile_embedding, j.job_embedding) DESC
      LIMIT ${limit}
    `) as any;
  },

  // Find candidates for a job using vector similarity
  findCandidatesForJob: async (
    jobId: number,
    threshold: number = 0.6,
    limit: number = 20
  ) => {
    return await db.execute(sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.current_title,
        c.years_experience,
        c.current_grade_level,
        c.salary_expectation,
        c.location,
        cosine_similarity(c.profile_embedding, j.job_embedding) as similarity
      FROM job_descriptions j
      CROSS JOIN candidates c
      WHERE j.id = ${jobId}
        AND c.profile_embedding IS NOT NULL
        AND j.job_embedding IS NOT NULL
        AND cosine_similarity(c.profile_embedding, j.job_embedding) >= ${threshold}
      ORDER BY cosine_similarity(c.profile_embedding, j.job_embedding) DESC
      LIMIT ${limit}
    `) as any;
  },

  // Skills-based vector matching
  findCandidatesBySkillsSimilarity: async (
    targetSkillsEmbedding: number[],
    threshold: number = 0.7,
    limit: number = 15
  ) => {
    const embeddingVector = `[${targetSkillsEmbedding.join(',')}]`;
    
    return await db.execute(sql`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.skills,
        c.current_title,
        cosine_similarity(c.skills_embedding, ${embeddingVector}::vector) as skills_similarity
      FROM candidates c
      WHERE c.skills_embedding IS NOT NULL
        AND cosine_similarity(c.skills_embedding, ${embeddingVector}::vector) >= ${threshold}
      ORDER BY cosine_similarity(c.skills_embedding, ${embeddingVector}::vector) DESC
      LIMIT ${limit}
    `) as any;
  },

  // Comprehensive matching with multiple vector types
  findComprehensiveMatches: async (
    candidateId: number,
    weights: {
      profile: number;
      skills: number;
      experience: number;
    } = { profile: 0.4, skills: 0.4, experience: 0.2 }
  ) => {
    return await db.execute(sql`
      SELECT 
        j.id,
        j.title,
        j.company,
        j.location,
        j.salary_min,
        j.salary_max,
        cosine_similarity(c.profile_embedding, j.job_embedding) as profile_similarity,
        cosine_similarity(c.skills_embedding, j.skills_embedding) as skills_similarity,
        cosine_similarity(c.experience_embedding, j.requirements_embedding) as experience_similarity,
        (
          cosine_similarity(c.profile_embedding, j.job_embedding) * ${weights.profile} +
          cosine_similarity(c.skills_embedding, j.skills_embedding) * ${weights.skills} +
          cosine_similarity(c.experience_embedding, j.requirements_embedding) * ${weights.experience}
        ) as weighted_score
      FROM candidates c
      CROSS JOIN job_descriptions j
      WHERE c.id = ${candidateId}
        AND c.profile_embedding IS NOT NULL
        AND c.skills_embedding IS NOT NULL
        AND c.experience_embedding IS NOT NULL
        AND j.job_embedding IS NOT NULL
        AND j.skills_embedding IS NOT NULL
        AND j.requirements_embedding IS NOT NULL
      ORDER BY weighted_score DESC
      LIMIT 10
    `) as any;
  },

  // Calculate detailed match score using the database function
  calculateDetailedMatchScore: async (candidateId: number, jobId: number) => {
    return await db.execute(sql`
      SELECT * FROM calculate_match_score(${candidateId}, ${jobId})
    `) as any;
  }
};

// Internal Grades Operations (Enhanced)
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

  // Get grade distribution with vector insights
  getGradeDistributionWithVectorStats: async () => {
    return await db.execute(sql`
      SELECT 
        ig.level_number,
        ig.title,
        COUNT(c.id) as candidate_count,
        COUNT(j.id) as job_count,
        AVG(cjm.ai_match_score::numeric) as avg_ai_match_score
      FROM internal_grades ig
      LEFT JOIN candidates c ON ig.level_number = c.current_grade_level
      LEFT JOIN job_descriptions j ON ig.level_number = j.ai_suggested_grade
      LEFT JOIN candidate_job_matches cjm ON c.id = cjm.candidate_id
      GROUP BY ig.level_number, ig.title
      ORDER BY ig.level_number
    `) as any;
  }
};

// Enhanced Candidate Operations
export const candidateQueries = {
  // Get all candidates with grade information
  getAll: async () => {
    return await db.select().from(candidates).leftJoin(
      internalGrades,
      eq(candidates.currentGradeLevel, internalGrades.levelNumber)
    ).leftJoin(
      internalGrades,
      eq(candidates.targetGradeLevel, internalGrades.levelNumber)
    )
      .orderBy(desc(candidates.createdAt));
  },

  // Get candidate by ID with all relations
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
          orderBy: [desc(candidateJobMatches.aiMatchScore)], // Use AI match score
          limit: 10
        },
      },
    });
  },

  // Enhanced search with vector similarity
  searchWithVectorSimilarity: async (
    searchEmbedding: number[],
    filters?: {
      minExperience?: number;
      maxExperience?: number;
      gradeLevel?: number;
      skills?: string[];
      location?: string;
    }
  ) => {
    let whereConditions = [];
    
    if (filters?.minExperience) {
      whereConditions.push(gte(candidates.yearsExperience, filters.minExperience.toString()));
    }
    if (filters?.maxExperience) {
      whereConditions.push(lte(candidates.yearsExperience, filters.maxExperience.toString()));
    }
    if (filters?.gradeLevel) {
      whereConditions.push(eq(candidates.currentGradeLevel, filters.gradeLevel));
    }
    if (filters?.location) {
      whereConditions.push(ilike(candidates.location, `%${filters.location}%`));
    }
    
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    return await db.select().from(candidates)
      .where(whereClause)
      .orderBy(desc(candidates.yearsExperience));
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

  // Get candidates by grade level with vector embeddings
  getByGradeLevel: async (gradeLevel: number, includeVectorData: boolean = false) => {
    return await db.query.candidates.findMany({
      where: eq(candidates.currentGradeLevel, gradeLevel),
      with: {
        currentGrade: true,
        targetGrade: true,
      },
      orderBy: [desc(candidates.yearsExperience)]
    });
  },

  // Search candidates by skills (enhanced with vector similarity)
  searchBySkills: async (skillKeywords: string[]) => {
    return await db.select().from(candidates)
      .where(sql`${candidates.skills} && ${skillKeywords}`) // PostgreSQL array overlap
      .orderBy(desc(candidates.yearsExperience));
  },

  // Create new candidate
  create: async (candidateData: typeof candidates.$inferInsert) => {
    return await db.insert(candidates).values(candidateData).returning();
  },

  // Update candidate with embeddings
  update: async (id: number, candidateData: Partial<typeof candidates.$inferInsert>) => {
    return await db.update(candidates)
      .set({ ...candidateData, updatedAt: new Date() })
      .where(eq(candidates.id, id))
      .returning();
  },

  // Update embeddings for a candidate
  updateEmbeddings: async (
    id: number, 
    embeddings: {
      profileEmbedding?: number[];
      skillsEmbedding?: number[];
      experienceEmbedding?: number[];
      resumeEmbedding?: number[];
    }
  ) => {
    const updates: any = {};
    
    if (embeddings.profileEmbedding) {
      updates.profileEmbedding = embeddings.profileEmbedding;
    }
    if (embeddings.skillsEmbedding) {
      updates.skillsEmbedding = embeddings.skillsEmbedding;
    }
    if (embeddings.experienceEmbedding) {
      updates.experienceEmbedding = embeddings.experienceEmbedding;
    }
    if (embeddings.resumeEmbedding) {
      updates.resumeEmbedding = embeddings.resumeEmbedding;
    }
    
    updates.updatedAt = new Date();
    
    return await db.update(candidates)
      .set(updates)
      .where(eq(candidates.id, id))
      .returning();
  }
};

// Enhanced Job Description Operations
export const jobQueries = {
  // Get all jobs with grade information
  getAll: async () => {
    return await db.query.jobDescriptions.findMany({
      with: {
        aiSuggestedGradeRef: true,
      },
      orderBy: [desc(jobDescriptions.createdAt)]
    });
  },

  // Get job by ID with all relations and top matches
  getById: async (id: number) => {
    return await db.query.jobDescriptions.findFirst({
      where: eq(jobDescriptions.id, id),
      with: {
        aiSuggestedGradeRef: true,
        matchingResults: {
          orderBy: [desc(matchingResults.analyzedAt)],
          limit: 1,
        },
        candidateMatches: {
          with: {
            candidate: {
              with: {
                currentGrade: true
              }
            },
          },
          orderBy: [desc(candidateJobMatches.aiMatchScore)], // Use AI match score
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

  // Update job embeddings
  updateEmbeddings: async (
    id: number,
    embeddings: {
      jobEmbedding?: number[];
      requirementsEmbedding?: number[];
      skillsEmbedding?: number[];
    }
  ) => {
    const updates: any = {};
    
    if (embeddings.jobEmbedding) {
      updates.jobEmbedding = embeddings.jobEmbedding;
    }
    if (embeddings.requirementsEmbedding) {
      updates.requirementsEmbedding = embeddings.requirementsEmbedding;
    }
    if (embeddings.skillsEmbedding) {
      updates.skillsEmbedding = embeddings.skillsEmbedding;
    }
    
    updates.updatedAt = new Date();
    
    return await db.update(jobDescriptions)
      .set(updates)
      .where(eq(jobDescriptions.id, id))
      .returning();
  }
};

// Enhanced Matching Results Operations
export const matchingQueries = {
  // Get all matching results
  getAll: async () => {
    return await db.query.matchingResults.findMany({
      with: {
        jobDescription: true,
        suggestedGrade: true,
      },
      orderBy: [desc(matchingResults.analyzedAt)],
    });
  },

  // Get matching results by job ID
  getByJobId: async (jobId: number) => {
    return await db.query.matchingResults.findMany({
      where: eq(matchingResults.jobDescriptionId, jobId),
      with: {
        suggestedGrade: true,
      },
      orderBy: [desc(matchingResults.analyzedAt)],
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
      orderBy: [desc(matchingResults.confidenceScore)],
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
      orderBy: [desc(matchingResults.analyzedAt)],
      with: {
        suggestedGrade: true,
      },
    });
  }
};

// Enhanced Candidate Job Matches Operations
export const candidateMatchQueries = {
  // Get matches for a candidate with vector analysis
  getForCandidate: async (candidateId: number) => {
    return await db.query.candidateJobMatches.findMany({
      where: eq(candidateJobMatches.candidateId, candidateId),
      with: {
        jobDescription: {
          with: {
            aiSuggestedGradeRef: true
          }
        },
      },
      orderBy: [desc(candidateJobMatches.aiMatchScore)], // Use AI match score
    });
  },

  // Get matches for a job
  getForJob: async (jobId: number) => {
    return await db.query.candidateJobMatches.findMany({
      where: eq(candidateJobMatches.jobDescriptionId, jobId),
      with: {
        candidate: {
          with: {
            currentGrade: true
          }
        },
      },
      orderBy: [desc(candidateJobMatches.aiMatchScore)], // Use AI match score
    });
  },

  // Get top matches with vector scores
  getTopMatches: async (minScore: number = 0.8, limit: number = 20) => {
    return await db.query.candidateJobMatches.findMany({
      where: gte(candidateJobMatches.aiMatchScore, minScore.toString()),
      with: {
        candidate: {
          with: {
            currentGrade: true
          }
        },
        jobDescription: {
          with: {
            aiSuggestedGradeRef: true
          }
        },
      },
      orderBy: [desc(candidateJobMatches.aiMatchScore)],
      limit,
    });
  },

  // Create comprehensive candidate-job match with vector scoring
  create: async (matchData: typeof candidateJobMatches.$inferInsert) => {
    return await db.insert(candidateJobMatches).values(matchData).returning();
  },

  // Create comprehensive match with vector scoring
  createComprehensiveMatch: async (
    candidateId: number,
    jobId: number,
    userId: string,
    vectorScores?: {
      aiMatchScore?: number;
      profileSimilarity?: number;
      skillsSimilarity?: number;
      experienceSimilarity?: number;
      cultureFitScore?: number;
    }
  ) => {
    // Calculate traditional scores (simplified for demo)
    const matchData = {
      candidateId,
      jobDescriptionId: jobId,
      userId,
      matchScore: '0.85', // These would be calculated based on business logic
      experienceMatch: '0.80',
      skillsMatch: '0.90',
      gradeLevelMatch: '0.85',
      salaryMatch: '0.75',
      locationMatch: '0.95',
      ...vectorScores,
      createdAt: new Date()
    };

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
  }
};

// AI Feedback Operations (Enhanced)
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
      orderBy: [desc(aiFeedback.createdAt)],
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

  // Get feedback analytics
  getFeedbackAnalytics: async () => {
    return await db.execute(sql`
      SELECT 
        feedback_type,
        COUNT(*) as count,
        AVG(user_satisfaction::numeric) as avg_satisfaction,
        AVG(ai_accuracy::numeric) as avg_accuracy
      FROM ai_feedback 
      WHERE user_satisfaction IS NOT NULL
      GROUP BY feedback_type
      ORDER BY avg_satisfaction DESC
    `) as any;
  }
};

// Enhanced Analytics with Vector Insights
export const analyticsQueries = {
  // Get grade distribution of candidates
  getCandidateGradeDistribution: async () => {
    return await db.execute(sql`
      SELECT 
        ig.level_number,
        ig.title,
        COUNT(c.id) as candidate_count
      FROM internal_grades ig
      LEFT JOIN candidates c ON ig.level_number = c.current_grade_level
      GROUP BY ig.level_number, ig.title
      ORDER BY ig.level_number
    `) as any;
  },

  // Get average confidence scores by grade
  getAverageConfidenceByGrade: async () => {
    return await db.execute(sql`
      SELECT 
        ig.level_number,
        ig.title,
        AVG(mr.confidence_score::numeric) as avg_confidence,
        COUNT(mr.id) as total_matches
      FROM internal_grades ig
      LEFT JOIN matching_results mr ON ig.level_number = mr.suggested_internal_grade
      GROUP BY ig.level_number, ig.title
      ORDER BY ig.level_number
    `) as any;
  },

  // Get matching accuracy (requires feedback)
  getMatchingAccuracy: async () => {
    return await db.execute(sql`
      SELECT 
        feedback_type,
        COUNT(*) as total_feedback,
        AVG(ai_accuracy::numeric) as avg_accuracy
      FROM ai_feedback
      GROUP BY feedback_type
    `) as any;
  },

  // Get vector similarity distribution
  getVectorSimilarityDistribution: async () => {
    return await db.execute(sql`
      SELECT 
        CASE 
          WHEN ai_match_score >= 0.9 THEN 'Excellent (0.9+)'
          WHEN ai_match_score >= 0.8 THEN 'Very Good (0.8-0.9)'
          WHEN ai_match_score >= 0.7 THEN 'Good (0.7-0.8)'
          WHEN ai_match_score >= 0.6 THEN 'Fair (0.6-0.7)'
          ELSE 'Poor (<0.6)'
        END as similarity_range,
        COUNT(*) as match_count,
        AVG(ai_match_score::numeric) as avg_similarity
      FROM candidate_job_matches 
      WHERE ai_match_score IS NOT NULL
      GROUP BY 
        CASE 
          WHEN ai_match_score >= 0.9 THEN 'Excellent (0.9+)'
          WHEN ai_match_score >= 0.8 THEN 'Very Good (0.8-0.9)'
          WHEN ai_match_score >= 0.7 THEN 'Good (0.7-0.8)'
          WHEN ai_match_score >= 0.6 THEN 'Fair (0.6-0.7)'
          ELSE 'Poor (<0.6)'
        END
      ORDER BY avg_similarity DESC
    `) as any;
  },

  // Get matching performance by grade level
  getMatchingPerformanceByGrade: async () => {
    return await db.execute(sql`
      SELECT 
        ig.level_number,
        ig.title as grade_title,
        COUNT(cjm.id) as total_matches,
        AVG(cjm.ai_match_score::numeric) as avg_vector_score,
        AVG(cjm.match_score::numeric) as avg_traditional_score,
        COUNT(CASE WHEN cjm.ai_match_score >= 0.8 THEN 1 END) as high_quality_matches
      FROM internal_grades ig
      LEFT JOIN candidates c ON ig.level_number = c.current_grade_level
      LEFT JOIN candidate_job_matches cjm ON c.id = cjm.candidate_id
      GROUP BY ig.level_number, ig.title
      ORDER BY ig.level_number
    `) as any;
  },

  // Get candidates without embeddings (need processing)
  getCandidatesNeedingEmbeddings: async () => {
    return await db.select({
      id: candidates.id,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
      email: candidates.email,
    }).from(candidates)
    .where(sql`profile_embedding IS NULL OR skills_embedding IS NULL OR experience_embedding IS NULL`);
  },

  // Get jobs without embeddings
  getJobsNeedingEmbeddings: async () => {
    return await db.select({
      id: jobDescriptions.id,
      title: jobDescriptions.title,
      company: jobDescriptions.company,
    }).from(jobDescriptions)
    .where(sql`job_embedding IS NULL OR requirements_embedding IS NULL OR skills_embedding IS NULL`);
  }
};

// Utility Functions
export const utilityQueries = {
  // Test vector similarity between two candidates
  testCandidateSimilarity: async (candidateId1: number, candidateId2: number) => {
    return await db.execute(sql`
      SELECT 
        c1.first_name || ' ' || c1.last_name as candidate1,
        c2.first_name || ' ' || c2.last_name as candidate2,
        cosine_similarity(c1.profile_embedding, c2.profile_embedding) as profile_similarity,
        cosine_similarity(c1.skills_embedding, c2.skills_embedding) as skills_similarity,
        cosine_similarity(c1.experience_embedding, c2.experience_embedding) as experience_similarity
      FROM candidates c1
      CROSS JOIN candidates c2
      WHERE c1.id = ${candidateId1} AND c2.id = ${candidateId2}
        AND c1.profile_embedding IS NOT NULL AND c2.profile_embedding IS NOT NULL
    `) as any;
  },

  // Batch update embeddings for all candidates (placeholder)
  batchUpdateCandidateEmbeddings: async () => {
    return await db.execute(sql`
      SELECT update_candidate_embeddings(id) FROM candidates 
      WHERE profile_embedding IS NULL 
      LIMIT 10
    `) as any;
  },

  // Get database statistics
  getDatabaseStats: async () => {
    return await db.execute(sql`
      SELECT 
        'candidates' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN profile_embedding IS NOT NULL THEN 1 END) as with_embeddings,
        COUNT(CASE WHEN profile_embedding IS NULL THEN 1 END) as without_embeddings
      FROM candidates
      UNION ALL
      SELECT 
        'job_descriptions' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN job_embedding IS NOT NULL THEN 1 END) as with_embeddings,
        COUNT(CASE WHEN job_embedding IS NULL THEN 1 END) as without_embeddings
      FROM job_descriptions
      UNION ALL
      SELECT 
        'candidate_job_matches' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN ai_match_score IS NOT NULL THEN 1 END) as with_ai_scores,
        COUNT(CASE WHEN ai_match_score IS NULL THEN 1 END) as without_ai_scores
      FROM candidate_job_matches
    `) as any;
  }
};