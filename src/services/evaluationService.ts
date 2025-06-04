import { CandidateSearchResult} from '../types';
import { EmbeddingService } from './embeddingService';
import db from '../../db/connection';
import { sql } from 'drizzle-orm';

export interface EvaluationMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  contextRelevancy: number;
  diversityScore: number;
  averageMatchScore: number;
  topResultScore: number;
}

export interface UserFeedback {
  queryId: string;
  userId: string;
  rating: number; // 1-5 scale
  relevantCandidates: number[]; // Candidate IDs marked as relevant
  irrelevantCandidates: number[]; // Candidate IDs marked as irrelevant
  feedback?: string;
  timestamp: Date;
}

export interface SearchMetrics {
  queryId: string;
  timestamp: Date;
  query: string;
  queryType: 'technical' | 'experience' | 'location' | 'general';
  retrievalMethod: 'vector' | 'keyword' | 'hybrid';
  resultsCount: number;
  avgMatchScore: number;
  topResultScore: number;
  executionTimeMs: number;
  userFeedback?: UserFeedback;
  evaluationMetrics?: EvaluationMetrics;
}

export class RAGEvaluationService {
  /**
   * Evaluate retrieval quality using multiple metrics
   */
  static async evaluateRetrievalQuality(
    query: string,
    retrievedCandidates: CandidateSearchResult[],
    groundTruthCandidates: CandidateSearchResult[]
  ): Promise<EvaluationMetrics> {
    
    const precision = this.calculatePrecision(retrievedCandidates, groundTruthCandidates);
    const recall = this.calculateRecall(retrievedCandidates, groundTruthCandidates);
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
    const contextRelevancy = await this.evaluateContextRelevancy(query, retrievedCandidates);
    const diversityScore = this.calculateDiversityScore(retrievedCandidates);
    const avgMatchScore = retrievedCandidates.reduce((sum, c) => sum + c.matchScore, 0) / retrievedCandidates.length || 0;
    const topResultScore = retrievedCandidates[0]?.matchScore || 0;
    
    return {
      precision,
      recall,
      f1Score,
      contextRelevancy,
      diversityScore,
      averageMatchScore: avgMatchScore,
      topResultScore,
    };
  }

  /**
   * Calculate precision: relevant retrieved / total retrieved
   */
  private static calculatePrecision(
    retrievedCandidates: CandidateSearchResult[], 
    groundTruthCandidates: CandidateSearchResult[]
  ): number {
    if (retrievedCandidates.length === 0) return 0;
    
    const groundTruthIds = new Set(groundTruthCandidates.map(c => c.candidateId));
    const relevantRetrieved = retrievedCandidates.filter(c => groundTruthIds.has(c.candidateId)).length;
    
    return relevantRetrieved / retrievedCandidates.length;
  }

  /**
   * Calculate recall: relevant retrieved / total relevant
   */
  private static calculateRecall(
    retrievedCandidates: CandidateSearchResult[], 
    groundTruthCandidates: CandidateSearchResult[]
  ): number {
    if (groundTruthCandidates.length === 0) return 1; // Perfect recall if no ground truth
    
    const retrievedIds = new Set(retrievedCandidates.map(c => c.candidateId));
    const relevantRetrieved = groundTruthCandidates.filter(c => retrievedIds.has(c.candidateId)).length;
    
    return relevantRetrieved / groundTruthCandidates.length;
  }

  /**
   * Evaluate context relevancy using embedding similarity
   */
  private static async evaluateContextRelevancy(
    query: string, 
    retrievedCandidates: CandidateSearchResult[]
  ): Promise<number> {
    try {
      const queryEmbedding = await EmbeddingService.generateEmbedding(query);
      
      let totalRelevancy = 0;
      for (const candidate of retrievedCandidates) {
        // Create candidate context
        const candidateContext = `${candidate.currentTitle} at ${candidate.currentCompany}. 
          Skills: ${candidate.skills.join(', ')}. 
          Experience: ${candidate.yearsExperience} years. 
          ${candidate.summary || ''}`;
        
        const candidateEmbedding = await EmbeddingService.generateEmbedding(candidateContext);
        const similarity = this.cosineSimilarity(queryEmbedding, candidateEmbedding);
        totalRelevancy += similarity;
      }
      
      return retrievedCandidates.length > 0 ? totalRelevancy / retrievedCandidates.length : 0;
    } catch (error) {
      console.error('Error evaluating context relevancy:', error);
      return 0;
    }
  }

  /**
   * Calculate diversity score to measure result variety
   */
  private static calculateDiversityScore(retrievedCandidates: CandidateSearchResult[]): number {
    if (retrievedCandidates.length <= 1) return 1;
    
    // Measure diversity based on different attributes
    const uniqueCompanies = new Set(retrievedCandidates.map(c => c.currentCompany)).size;
    const uniqueTitles = new Set(retrievedCandidates.map(c => c.currentTitle)).size;
    const uniqueLocations = new Set(retrievedCandidates.map(c => c.location)).size;
    
    const totalCandidates = retrievedCandidates.length;
    
    // Normalize diversity scores
    const companyDiversity = uniqueCompanies / totalCandidates;
    const titleDiversity = uniqueTitles / totalCandidates;
    const locationDiversity = uniqueLocations / totalCandidates;
    
    // Weighted average of diversity metrics
    return (companyDiversity * 0.4 + titleDiversity * 0.4 + locationDiversity * 0.2);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private static cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Monitor search performance over time
   */
  static async logSearchMetrics(
    queryId: string,
    query: string,
    retrievedCandidates: CandidateSearchResult[],
    executionTimeMs: number,
    userFeedback?: UserFeedback
  ): Promise<void> {
    try {
      const metrics: SearchMetrics = {
        queryId,
        timestamp: new Date(),
        query,
        queryType: this.classifyQuery(query),
        retrievalMethod: retrievedCandidates[0]?.retrievalMethod || 'vector',
        resultsCount: retrievedCandidates.length,
        avgMatchScore: retrievedCandidates.reduce((sum, c) => sum + c.matchScore, 0) / retrievedCandidates.length || 0,
        topResultScore: retrievedCandidates[0]?.matchScore || 0,
        executionTimeMs,
        userFeedback,
      };
      
      // Store metrics in database
      await this.storeMetrics(metrics);
      
      // Log important metrics
      console.log(`Search Metrics [${queryId}]:`, {
        query: query.substring(0, 50) + '...',
        resultsCount: metrics.resultsCount,
        avgMatchScore: metrics.avgMatchScore.toFixed(3),
        executionTime: `${metrics.executionTimeMs}ms`,
        method: metrics.retrievalMethod
      });
      
    } catch (error) {
      console.error('Error logging search metrics:', error);
    }
  }

  /**
   * Classify query type for analysis
   */
  private static classifyQuery(query: string): 'technical' | 'experience' | 'location' | 'general' {
    const lowerQuery = query.toLowerCase();
    
    // Technical keywords
    const technicalKeywords = [
      'javascript', 'python', 'react', 'node', 'sql', 'aws', 'docker', 'kubernetes',
      'java', 'typescript', 'angular', 'vue', 'spring', 'django', 'mongodb'
    ];
    
    // Experience keywords
    const experienceKeywords = [
      'senior', 'junior', 'lead', 'principal', 'years', 'experience', 'expert'
    ];
    
    // Location keywords
    const locationKeywords = [
      'remote', 'new york', 'san francisco', 'london', 'berlin', 'toronto', 'location'
    ];
    
    if (technicalKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return 'technical';
    } else if (experienceKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return 'experience';
    } else if (locationKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return 'location';
    } else {
      return 'general';
    }
  }

  /**
   * Store metrics in database
   */
  private static async storeMetrics(metrics: SearchMetrics): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO search_metrics (
          query_id, timestamp, query, query_type, retrieval_method,
          results_count, avg_match_score, top_result_score, execution_time_ms,
          user_feedback
        ) VALUES (
          ${metrics.queryId},
          ${metrics.timestamp.toISOString()},
          ${metrics.query},
          ${metrics.queryType},
          ${metrics.retrievalMethod},
          ${metrics.resultsCount},
          ${metrics.avgMatchScore},
          ${metrics.topResultScore},
          ${metrics.executionTimeMs},
          ${JSON.stringify(metrics.userFeedback)}
        )
        ON CONFLICT (query_id) DO UPDATE SET
          user_feedback = EXCLUDED.user_feedback,
          timestamp = EXCLUDED.timestamp
      `);
    } catch (error) {
      // Silently handle missing table errors - don't break the main flow
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('search_metrics') || errorMessage.includes('does not exist')) {
        console.log('⚠️ Metrics table not available - continuing without logging');
      } else {
        console.error('Error storing metrics in database:', error);
      }
      // Don't throw - metrics storage shouldn't break the main flow
    }
  }

  /**
   * Analyze search performance trends
   */
  static async getPerformanceAnalytics(timeRangeHours = 24): Promise<{
    totalQueries: number;
    averageResponseTime: number;
    averageRelevanceScore: number;
    queryTypeDistribution: Record<string, number>;
    methodPerformance: Record<string, { count: number; avgScore: number; avgTime: number }>;
  }> {
    try {
      const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
      
      const result = await db.execute(sql`
        SELECT 
          COUNT(*) as total_queries,
          AVG(execution_time_ms) as avg_response_time,
          AVG(avg_match_score) as avg_relevance_score,
          query_type,
          retrieval_method,
          COUNT(*) OVER (PARTITION BY query_type) as type_count,
          COUNT(*) OVER (PARTITION BY retrieval_method) as method_count,
          AVG(avg_match_score) OVER (PARTITION BY retrieval_method) as method_avg_score,
          AVG(execution_time_ms) OVER (PARTITION BY retrieval_method) as method_avg_time
        FROM search_metrics 
        WHERE timestamp >= ${since.toISOString()}
        GROUP BY query_type, retrieval_method
      `);
      
      const rows = result.rows as any[];
      
      if (rows.length === 0) {
        return {
          totalQueries: 0,
          averageResponseTime: 0,
          averageRelevanceScore: 0,
          queryTypeDistribution: {},
          methodPerformance: {}
        };
      }
      
      const totalQueries = parseInt(rows[0].total_queries) || 0;
      const averageResponseTime = parseFloat(rows[0].avg_response_time) || 0;
      const averageRelevanceScore = parseFloat(rows[0].avg_relevance_score) || 0;
      
      const queryTypeDistribution: Record<string, number> = {};
      const methodPerformance: Record<string, { count: number; avgScore: number; avgTime: number }> = {};
      
      rows.forEach(row => {
        queryTypeDistribution[row.query_type] = parseInt(row.type_count);
        methodPerformance[row.retrieval_method] = {
          count: parseInt(row.method_count),
          avgScore: parseFloat(row.method_avg_score),
          avgTime: parseFloat(row.method_avg_time)
        };
      });
      
      return {
        totalQueries,
        averageResponseTime,
        averageRelevanceScore,
        queryTypeDistribution,
        methodPerformance
      };
      
    } catch (error) {
      // Handle missing table gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('search_metrics') || errorMessage.includes('does not exist')) {
        console.log('⚠️ Analytics not available - metrics table missing');
      } else {
        console.error('Error getting performance analytics:', error);
      }
      return {
        totalQueries: 0,
        averageResponseTime: 0,
        averageRelevanceScore: 0,
        queryTypeDistribution: {},
        methodPerformance: {}
      };
    }
  }

  /**
   * Process user feedback to improve system
   */
  static async processFeedback(feedback: UserFeedback): Promise<void> {
    try {
      // Store feedback
      await db.execute(sql`
        INSERT INTO user_feedback (
          query_id, user_id, rating, relevant_candidates, 
          irrelevant_candidates, feedback, timestamp
        ) VALUES (
          ${feedback.queryId},
          ${feedback.userId},
          ${feedback.rating},
          ${JSON.stringify(feedback.relevantCandidates)},
          ${JSON.stringify(feedback.irrelevantCandidates)},
          ${feedback.feedback},
          ${feedback.timestamp.toISOString()}
        )
      `);
      
      // Update search metrics with feedback
      await this.updateSearchMetricsWithFeedback(feedback);
      
      console.log(`Processed feedback for query ${feedback.queryId}: Rating ${feedback.rating}/5`);
      
    } catch (error) {
      console.error('Error processing feedback:', error);
    }
  }

  /**
   * Update search metrics with user feedback
   */
  private static async updateSearchMetricsWithFeedback(feedback: UserFeedback): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE search_metrics 
        SET user_feedback = ${JSON.stringify(feedback)}
        WHERE query_id = ${feedback.queryId}
      `);
    } catch (error) {
      console.error('Error updating search metrics with feedback:', error);
    }
  }

  /**
   * Generate improvement recommendations based on metrics
   */
  static async generateRecommendations(): Promise<string[]> {
    try {
      const analytics = await this.getPerformanceAnalytics(168); // Last week
      const recommendations: string[] = [];
      
      // Response time recommendations
      if (analytics.averageResponseTime > 2000) {
        recommendations.push('Consider optimizing query execution - average response time is high');
      }
      
      // Relevance score recommendations
      if (analytics.averageRelevanceScore < 0.7) {
        recommendations.push('Relevance scores are low - consider improving embedding quality or search parameters');
      }
      
      // Method performance recommendations
      Object.entries(analytics.methodPerformance).forEach(([method, perf]) => {
        if (perf.avgScore < 0.6) {
          recommendations.push(`${method} search method showing low relevance scores - needs optimization`);
        }
        if (perf.avgTime > 3000) {
          recommendations.push(`${method} search method is slow - consider performance improvements`);
        }
      });
      
      return recommendations;
      
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return ['Unable to generate recommendations due to analysis error'];
    }
  }
} 