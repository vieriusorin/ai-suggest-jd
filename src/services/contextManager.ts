import { ContextChunk, RankedResult, CandidateSearchResult } from '../types';
import { EmbeddingService } from './embeddingService';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class ContextManager {
  /**
   * Rerank search results using cross-encoder or LLM-based reranking
   */
  static async rerankResults(
    query: string,
    candidates: CandidateSearchResult[],
    topK = 10
  ): Promise<RankedResult[]> {
    try {
      console.log(`Reranking ${candidates.length} candidates for query...`);
      
      // 1. Create context chunks for each candidate
      const candidatesWithChunks = await Promise.all(
        candidates.map(async (candidate) => {
          const chunks = await this.createContextChunks(candidate);
          return { candidate, chunks };
        })
      );
      
      // 2. Score each candidate using LLM-based reranking
      const rerankedResults = await Promise.all(
        candidatesWithChunks.map(async ({ candidate, chunks }) => {
          const { score, explanation } = await this.scoreCandidate(query, candidate, chunks);
          return {
            candidate,
            contextChunks: chunks,
            rerankScore: score,
            explanation,
          };
        })
      );
      
      // 3. Sort by rerank score and return top results
      return rerankedResults
        .sort((a, b) => b.rerankScore - a.rerankScore)
        .slice(0, topK);
        
    } catch (error) {
      console.error('Error reranking results:', error);
      // Fallback to original results with basic context
      return candidates.slice(0, topK).map(candidate => ({
        candidate,
        contextChunks: [],
        rerankScore: candidate.matchScore,
        explanation: 'Fallback scoring due to reranking error',
      }));
    }
  }

  /**
   * Create context chunks from candidate data
   */
  private static async createContextChunks(candidate: CandidateSearchResult): Promise<ContextChunk[]> {
    const chunks: ContextChunk[] = [];
    const timestamp = new Date();
    
    // Profile chunk
    const profileContent = `
      Name: ${candidate.name}
      Current Position: ${candidate.currentTitle} at ${candidate.currentCompany}
      Experience: ${candidate.yearsExperience} years
      Location: ${candidate.location || 'Not specified'}
    `.trim();
    
    chunks.push({
      id: `${candidate.candidateId}-profile`,
      content: profileContent,
      type: 'profile',
      candidateId: candidate.candidateId,
      relevanceScore: candidate.profileSimilarity,
      metadata: {
        source: 'candidate_profile',
        chunkedAt: timestamp,
        chunkSize: profileContent.length,
      },
    });
    
    // Skills chunk
    if (candidate.skills.length > 0) {
      const skillsContent = `Technical Skills: ${candidate.skills.join(', ')}`;
      
      chunks.push({
        id: `${candidate.candidateId}-skills`,
        content: skillsContent,
        type: 'skills',
        candidateId: candidate.candidateId,
        relevanceScore: candidate.skillsSimilarity,
        metadata: {
          source: 'candidate_skills',
          chunkedAt: timestamp,
          chunkSize: skillsContent.length,
        },
      });
    }
    
    // Experience chunk
    const experienceContent = `
      Professional Experience: ${candidate.yearsExperience} years in the field
      Current Role: ${candidate.currentTitle} at ${candidate.currentCompany}
      Salary Expectation: ${candidate.salaryExpectation ? `$${candidate.salaryExpectation.toLocaleString()}` : 'Not specified'}
    `.trim();
    
    chunks.push({
      id: `${candidate.candidateId}-experience`,
      content: experienceContent,
      type: 'experience',
      candidateId: candidate.candidateId,
      relevanceScore: candidate.experienceSimilarity,
      metadata: {
        source: 'candidate_experience',
        chunkedAt: timestamp,
        chunkSize: experienceContent.length,
      },
    });
    
    // Summary chunk (if available)
    if (candidate.summary) {
      chunks.push({
        id: `${candidate.candidateId}-resume`,
        content: candidate.summary,
        type: 'resume',
        candidateId: candidate.candidateId,
        relevanceScore: candidate.resumeSimilarity,
        metadata: {
          source: 'candidate_summary',
          chunkedAt: timestamp,
          chunkSize: candidate.summary.length,
        },
      });
    }
    
    return chunks;
  }

  /**
   * Score candidate relevance using LLM-based evaluation
   */
  private static async scoreCandidate(
    query: string,
    candidate: CandidateSearchResult,
    chunks: ContextChunk[]
  ): Promise<{ score: number; explanation: string }> {
    try {
      const contextText = chunks.map(chunk => `[${chunk.type.toUpperCase()}] ${chunk.content}`).join('\n\n');
      
      const prompt = `
        As a recruitment expert, evaluate how well this candidate matches the job requirements.
        
        JOB REQUIREMENTS:
        ${query}
        
        CANDIDATE PROFILE:
        ${contextText}
        
        Provide a relevance score from 0.0 to 1.0 and a brief explanation.
        Consider:
        1. Technical skill alignment
        2. Experience level match
        3. Role suitability
        4. Overall fit
        
        Response format:
        Score: [0.0-1.0]
        Explanation: [Brief explanation of the match quality]
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.1,
      });

      const responseText = response.choices[0]?.message?.content || '';
      const scoreMatch = responseText.match(/Score:\s*([\d.]+)/);
      const explanationMatch = responseText.match(/Explanation:\s*(.+)/);
      
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : candidate.matchScore;
      const explanation = explanationMatch ? explanationMatch[1].trim() : 'LLM scoring unavailable';
      
      return { score: Math.min(1.0, Math.max(0.0, score)), explanation };
      
    } catch (error) {
      console.error('Error scoring candidate with LLM:', error);
      return {
        score: candidate.matchScore,
        explanation: 'Fallback to original match score due to LLM error',
      };
    }
  }

  /**
   * Filter and optimize context for better retrieval
   */
  static async optimizeContext(
    chunks: ContextChunk[],
    query: string,
    maxTokens = 2000
  ): Promise<ContextChunk[]> {
    try {
      // 1. Score each chunk for relevance to the query
      const scoredChunks = await Promise.all(
        chunks.map(async (chunk) => {
          const relevance = await this.scoreChunkRelevance(chunk.content, query);
          return { ...chunk, relevanceScore: relevance };
        })
      );
      
      // 2. Sort by relevance score
      scoredChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      // 3. Select chunks within token limit
      const optimizedChunks: ContextChunk[] = [];
      let totalTokens = 0;
      
      for (const chunk of scoredChunks) {
        const chunkTokens = this.estimateTokens(chunk.content);
        if (totalTokens + chunkTokens <= maxTokens) {
          optimizedChunks.push(chunk);
          totalTokens += chunkTokens;
        } else {
          break;
        }
      }
      
      console.log(`Optimized context: ${optimizedChunks.length} chunks, ~${totalTokens} tokens`);
      return optimizedChunks;
      
    } catch (error) {
      console.error('Error optimizing context:', error);
      return chunks.slice(0, 5); // Fallback to first 5 chunks
    }
  }

  /**
   * Score chunk relevance to query using embedding similarity
   */
  private static async scoreChunkRelevance(chunkContent: string, query: string): Promise<number> {
    try {
      const [chunkEmbedding, queryEmbedding] = await Promise.all([
        EmbeddingService.generateEmbedding(chunkContent),
        EmbeddingService.generateEmbedding(query),
      ]);
      
      return this.cosineSimilarity(chunkEmbedding, queryEmbedding);
    } catch (error) {
      console.error('Error scoring chunk relevance:', error);
      return 0.5; // Default relevance score
    }
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  private static estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cosine similarity between vectors
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
   * Generate enhanced candidate summaries with context
   */
  static async generateEnhancedSummary(
    candidate: CandidateSearchResult,
    query: string,
    chunks: ContextChunk[]
  ): Promise<string> {
    try {
      const relevantChunks = chunks
        .filter(chunk => chunk.relevanceScore > 0.3)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3);
      
      const contextText = relevantChunks
        .map(chunk => chunk.content)
        .join('\n\n');
      
      const prompt = `
        Create a concise summary of why this candidate is relevant for the job requirements.
        
        JOB REQUIREMENTS:
        ${query}
        
        CANDIDATE INFORMATION:
        ${contextText}
        
        Write a 2-3 sentence summary highlighting the key match points and any notable strengths.
        Focus on specific skills, experience level, and role fit.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content?.trim() || 
        `${candidate.name} has ${candidate.yearsExperience} years of experience as ${candidate.currentTitle} with skills in ${candidate.skills.slice(0, 3).join(', ')}.`;
      
    } catch (error) {
      console.error('Error generating enhanced summary:', error);
      return `${candidate.name} - ${candidate.currentTitle} at ${candidate.currentCompany} (${candidate.yearsExperience} years experience)`;
    }
  }

  /**
   * Detect and handle context quality issues
   */
  static async assessContextQuality(chunks: ContextChunk[]): Promise<{
    quality: 'high' | 'medium' | 'low';
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check for minimum context coverage
    const hasProfile = chunks.some(c => c.type === 'profile');
    const hasSkills = chunks.some(c => c.type === 'skills');
    const hasExperience = chunks.some(c => c.type === 'experience');
    
    if (!hasProfile) {
      issues.push('Missing profile information');
      recommendations.push('Add candidate profile data');
    }
    
    if (!hasSkills) {
      issues.push('Missing skills information');
      recommendations.push('Add candidate skills data');
    }
    
    if (!hasExperience) {
      issues.push('Missing experience information');
      recommendations.push('Add candidate experience data');
    }
    
    // Check content quality
    const avgChunkSize = chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length;
    if (avgChunkSize < 50) {
      issues.push('Context chunks are too small');
      recommendations.push('Increase context chunk size for better quality');
    }
    
    // Check relevance scores
    const avgRelevance = chunks.reduce((sum, c) => sum + c.relevanceScore, 0) / chunks.length;
    if (avgRelevance < 0.3) {
      issues.push('Low average relevance scores');
      recommendations.push('Improve embedding quality or candidate data');
    }
    
    // Determine overall quality
    let quality: 'high' | 'medium' | 'low';
    if (issues.length === 0) {
      quality = 'high';
    } else if (issues.length <= 2) {
      quality = 'medium';
    } else {
      quality = 'low';
    }
    
    return { quality, issues, recommendations };
  }
} 