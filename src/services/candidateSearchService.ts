import { sql } from 'drizzle-orm';
import db from '../../db/connection';
import { EmbeddingService } from './embeddingService';
import { CandidateSearchResult, CandidateSearchParams } from '../types';


export class CandidateSearchService {
  /**
   * Enhanced search with hybrid retrieval capabilities
   */
  static async searchCandidates(params: CandidateSearchParams): Promise<CandidateSearchResult[]> {
    try {
      if (params.useHybridSearch) {
        return await this.hybridSearch(params);
      } else {
        return await this.vectorSearch(params);
      }
    } catch (error) {
      console.error('Error in candidate search:', error);
      throw error;
    }
  }

  /**
   * Hybrid search combining vector similarity with keyword matching
   */
  static async hybridSearch(params: CandidateSearchParams): Promise<CandidateSearchResult[]> {
    try {
      const maxResults = params.maxResults || 10;
      
      // 1. Perform vector-based search
      const vectorResults = await this.vectorSearch({
        ...params,
        maxResults: maxResults * 2 // Get more results for fusion
      });
      
      // 2. Perform keyword-based search
      const keywordResults = await this.keywordSearch({
        ...params,
        maxResults: maxResults * 2
      });
      
      // 3. Apply Reciprocal Rank Fusion
      const fusedResults = this.reciprocalRankFusion(vectorResults, keywordResults, 60);
      
      // 4. Return top results
      return fusedResults.slice(0, maxResults).map(result => ({
        ...result,
        retrievalMethod: 'hybrid' as const
      }));
      
    } catch (error) {
      console.error('Error in hybrid search:', error);
      throw error;
    }
  }

  /**
   * Keyword-based search for exact matches
   */
  static async keywordSearch(params: CandidateSearchParams): Promise<CandidateSearchResult[]> {
    try {
      // Extract keywords from query
      const keywords = this.extractKeywords(params.query);
      const skillKeywords = this.extractSkillKeywords(params.query);
      
      if (keywords.length === 0 && skillKeywords.length === 0) {
        return []; // No keywords to search for
      }

      // Build keyword conditions using OR logic
      const keywordConditions: any[] = [];
      
      // Add summary keyword conditions
      keywords.forEach(keyword => {
        keywordConditions.push(sql`summary ILIKE ${'%' + keyword + '%'}`);
        keywordConditions.push(sql`current_title ILIKE ${'%' + keyword + '%'}`);
      });
      
      // Add skill conditions
      skillKeywords.forEach(skill => {
        keywordConditions.push(sql`${skill} = ANY(skills)`);
      });
      
      if (keywordConditions.length === 0) {
        return []; // No valid conditions
      }
      
      // Combine all conditions with OR
      const combinedConditions = keywordConditions.reduce((acc, condition, index) => {
        if (index === 0) return condition;
        return sql`${acc} OR ${condition}`;
      });

      // Build the main query
      let query = sql`
        SELECT 
          id,
          first_name,
          last_name,
          email,
          phone,
          current_title,
          current_company,
          years_experience,
          skills,
          location,
          summary,
          salary_expectation,
          (
            -- Simple keyword matching score based on matches found
            ${this.buildKeywordScoreExpression(keywords, skillKeywords)}
          ) as match_score,
          0.0 as profile_similarity,
          0.0 as skills_similarity,
          0.0 as experience_similarity,
          0.0 as resume_similarity
        FROM candidates
        WHERE ${combinedConditions}
      `;

      // Apply filters (same as vector search)
      query = this.applyFilters(query, params);

      // Add ordering and limit
      const maxResults = params.maxResults || 10;
      query = sql`${query} ORDER BY match_score DESC LIMIT ${maxResults}`;

      console.log('Executing keyword search query...');
      const result = await db.execute(query);
      
      return this.transformResults(result.rows, 'keyword');

    } catch (error) {
      console.error('Error in keyword search:', error);
      throw error;
    }
  }

  /**
   * Build keyword scoring expression
   */
  private static buildKeywordScoreExpression(keywords: string[], skillKeywords: string[]) {
    const scoreExpressions: any[] = [];
    
    // Score for summary matches
    keywords.forEach(keyword => {
      scoreExpressions.push(sql`CASE WHEN summary ILIKE ${'%' + keyword + '%'} THEN 0.2 ELSE 0.0 END`);
    });
    
    // Score for title matches  
    keywords.forEach(keyword => {
      scoreExpressions.push(sql`CASE WHEN current_title ILIKE ${'%' + keyword + '%'} THEN 0.3 ELSE 0.0 END`);
    });
    
    // Score for skill matches
    skillKeywords.forEach(skill => {
      scoreExpressions.push(sql`CASE WHEN ${skill} = ANY(skills) THEN 0.4 ELSE 0.0 END`);
    });
    
    if (scoreExpressions.length === 0) {
      return sql`0.0`;
    }
    
    // Sum all score expressions
    return scoreExpressions.reduce((acc, expr, index) => {
      if (index === 0) return expr;
      return sql`${acc} + ${expr}`;
    });
  }

  /**
   * Original vector-based search (enhanced)
   */
  static async vectorSearch(params: CandidateSearchParams): Promise<CandidateSearchResult[]> {
    try {
      // Generate embeddings for the job description
      const embeddings = await EmbeddingService.generateJobDescriptionEmbeddings(params.query);
      const { fullEmbedding, skillsEmbedding } = embeddings;

      // Convert embeddings to PostgreSQL vector format
      const fullEmbeddingVector = `[${fullEmbedding.join(',')}]`;
      const skillsEmbeddingVector = `[${skillsEmbedding.join(',')}]`;

      // Build the base query
      let query = sql`
        SELECT 
          id,
          first_name,
          last_name,
          email,
          phone,
          current_title,
          current_company,
          years_experience,
          skills,
          location,
          summary,
          salary_expectation,
          1 - (profile_embedding <=> ${fullEmbeddingVector}::vector) as profile_similarity,
          1 - (skills_embedding <=> ${skillsEmbeddingVector}::vector) as skills_similarity,
          1 - (experience_embedding <=> ${fullEmbeddingVector}::vector) as experience_similarity,
          1 - (resume_embedding <=> ${fullEmbeddingVector}::vector) as resume_similarity,
          (
            (1 - (profile_embedding <=> ${fullEmbeddingVector}::vector)) * 0.3 +
            (1 - (skills_embedding <=> ${skillsEmbeddingVector}::vector)) * 0.4 +
            (1 - (experience_embedding <=> ${fullEmbeddingVector}::vector)) * 0.2 +
            (1 - (resume_embedding <=> ${fullEmbeddingVector}::vector)) * 0.1
          ) as match_score
        FROM candidates
        WHERE 
          profile_embedding IS NOT NULL 
          AND skills_embedding IS NOT NULL 
          AND experience_embedding IS NOT NULL
      `;

      // Apply filters
      query = this.applyFilters(query, params);

      // Add ordering and limit
      const maxResults = params.maxResults || 10;
      query = sql`${query} ORDER BY match_score DESC LIMIT ${maxResults}`;

      console.log('Executing candidate search query...');

      const result = await db.execute(query);
      
      return this.transformResults(result.rows, 'vector');

    } catch (error) {
      console.error('Error in vector search:', error);
      throw error;
    }
  }

  /**
   * Apply common filters to search queries
   */
  private static applyFilters(query: any, params: CandidateSearchParams) {
    // Add experience level filter
    if (params.experienceLevel) {
      const experienceRange = this.getExperienceRange(params.experienceLevel);
      if (experienceRange) {
        query = sql`${query} AND years_experience >= ${experienceRange.min} AND years_experience <= ${experienceRange.max}`;
      }
    }

    // Add location filter
    if (params.location) {
      query = sql`${query} AND (location ILIKE ${`%${params.location}%`} OR remote_preference = 'remote')`;
    }

    // Add skills filter
    if (params.requiredSkills && params.requiredSkills.length > 0) {
      const skillsConditions = params.requiredSkills.map(skill => sql`${skill} = ANY(skills)`);
      const combinedSkillsCondition = skillsConditions.reduce((acc, condition, index) => {
        if (index === 0) return condition;
        return sql`${acc} OR ${condition}`;
      });
      query = sql`${query} AND (${combinedSkillsCondition})`;
    }

    return query;
  }

  /**
   * Transform database results to CandidateSearchResult format
   */
  private static transformResults(rows: any[], method: 'vector' | 'keyword' | 'hybrid'): CandidateSearchResult[] {
    return rows.map((row: any) => ({
      candidateId: row.id,
      name: `${row.first_name} ${row.last_name}`,
      email: row.email,
      phone: row.phone,
      currentTitle: row.current_title,
      currentCompany: row.current_company,
      yearsExperience: parseFloat(row.years_experience) || 0,
      skills: row.skills || [],
      location: row.location,
      summary: row.summary,
      salaryExpectation: row.salary_expectation,
      matchScore: parseFloat(row.match_score) || 0,
      profileSimilarity: parseFloat(row.profile_similarity) || 0,
      skillsSimilarity: parseFloat(row.skills_similarity) || 0,
      experienceSimilarity: parseFloat(row.experience_similarity) || 0,
      resumeSimilarity: parseFloat(row.resume_similarity) || 0,
      retrievalMethod: method,
    }));
  }

  /**
   * Reciprocal Rank Fusion algorithm
   */
  private static reciprocalRankFusion(
    vectorResults: CandidateSearchResult[], 
    keywordResults: CandidateSearchResult[], 
    k = 60
  ): CandidateSearchResult[] {
    const scoreMap = new Map<number, { candidate: CandidateSearchResult; score: number }>();
    
    // Score vector results
    vectorResults.forEach((candidate, index) => {
      const id = candidate.candidateId;
      const score = 1 / (k + index + 1);
      scoreMap.set(id, { candidate, score });
    });
    
    // Score keyword results and combine
    keywordResults.forEach((candidate, index) => {
      const id = candidate.candidateId;
      const score = 1 / (k + index + 1);
      const existing = scoreMap.get(id);
      
      if (existing) {
        existing.score += score;
        // Combine the best features from both results
        existing.candidate.matchScore = Math.max(existing.candidate.matchScore, candidate.matchScore);
      } else {
        scoreMap.set(id, { candidate, score });
      }
    });
    
    // Sort by combined scores and return candidates
    return Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .map(({ candidate, score }) => ({
        ...candidate,
        matchScore: score // Use RRF score as final match score
      }));
  }

  /**
   * Extract keywords from job description
   */
  private static extractKeywords(query: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an']);
    
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to top 10 keywords
  }

  /**
   * Extract skill-related keywords
   */
  private static extractSkillKeywords(query: string): string[] {
    const skillPatterns = [
      /javascript|js|node\.js|react|angular|vue/gi,
      /python|django|flask|fastapi/gi,
      /java|spring|hibernate/gi,
      /c#|\.net|asp\.net/gi,
      /sql|mysql|postgresql|mongodb/gi,
      /aws|azure|gcp|docker|kubernetes/gi,
    ];
    
    const skills: string[] = [];
    skillPatterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        skills.push(...matches.map(m => m.toLowerCase()));
      }
    });
    
    return [...new Set(skills)]; // Remove duplicates
  }

  /**
   * Map experience level strings to numeric ranges
   */
  private static getExperienceRange(experienceLevel: string): { min: number; max: number } | null {
    const level = experienceLevel.toLowerCase();
    
    switch (level) {
      case 'junior':
      case 'entry-level':
        return { min: 0, max: 2 };
      case 'mid-level':
      case 'intermediate':
        return { min: 2, max: 5 };
      case 'senior':
        return { min: 5, max: 10 };
      case 'lead':
      case 'principal':
      case 'staff':
        return { min: 8, max: 20 };
      case 'executive':
      case 'director':
        return { min: 10, max: 30 };
      default:
        return null;
    }
  }

  /**
   * Get candidate statistics for a search
   */
  static async getCandidateStats(): Promise<{
    totalCandidates: number;
    candidatesWithEmbeddings: number;
  }> {
    try {
      const totalResult = await db.execute(sql`SELECT COUNT(*) as count FROM candidates`);
      const embeddingsResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM candidates 
        WHERE profile_embedding IS NOT NULL 
          AND skills_embedding IS NOT NULL 
          AND experience_embedding IS NOT NULL
      `);

      return {
        totalCandidates: parseInt(totalResult.rows[0].count as string),
        candidatesWithEmbeddings: parseInt(embeddingsResult.rows[0].count as string),
      };
    } catch (error) {
      console.error('Error getting candidate stats:', error);
      return { totalCandidates: 0, candidatesWithEmbeddings: 0 };
    }
  }
}