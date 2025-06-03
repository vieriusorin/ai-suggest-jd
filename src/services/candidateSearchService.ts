import { sql } from 'drizzle-orm';
import db from '../../db/connection';
import { EmbeddingService } from './embeddingService';

export interface CandidateSearchParams {
  query: string;
  experienceLevel?: string | null;
  requiredSkills?: string[] | null;
  location?: string | null;
  maxResults?: number;
}

export interface CandidateSearchResult {
  candidateId: number;
  name: string;
  email: string;
  phone?: string;
  currentTitle?: string;
  currentCompany?: string;
  yearsExperience: number;
  skills: string[];
  location?: string;
  summary?: string;
  salaryExpectation?: number;
  matchScore: number;
  profileSimilarity: number;
  skillsSimilarity: number;
  experienceSimilarity: number;
  resumeSimilarity: number;
}

export class CandidateSearchService {
  /**
   * Search for candidates using semantic similarity matching
   */
  static async searchCandidates(params: CandidateSearchParams): Promise<CandidateSearchResult[]> {
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

      // Add ordering and limit
      const maxResults = params.maxResults || 10;
      query = sql`${query} ORDER BY match_score DESC LIMIT ${maxResults}`;

      console.log('Executing candidate search query...');

      const result = await db.execute(query);

      // Transform results to match the expected interface
      const candidates: CandidateSearchResult[] = result.rows.map((row: any) => ({
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
      }));

      console.log(`Found ${candidates.length} matching candidates`);
      return candidates;

    } catch (error) {
      console.error('Error in candidate search:', error);
      throw error;
    }
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