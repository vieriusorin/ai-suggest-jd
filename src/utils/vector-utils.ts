// src/utils/vector-utils.ts
import OpenAI from 'openai';

// Initialize OpenAI client (make sure to set OPENAI_API_KEY in your .env)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
});

// Types for embeddings
export interface EmbeddingResult {
  embedding: number[];
  text: string;
  tokens: number;
}

export interface CandidateEmbeddings {
  profileEmbedding: number[];
  skillsEmbedding: number[];
  experienceEmbedding: number[];
  resumeEmbedding: number[];
}

export interface JobEmbeddings {
  jobEmbedding: number[];
  requirementsEmbedding: number[];
  skillsEmbedding: number[];
}

// Generate embeddings using OpenAI's text-embedding-3-small model
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-api-key-here') {
      // Return dummy embedding for development/testing
      console.warn('No OpenAI API key found. Generating dummy embedding.');
      return {
        embedding: Array.from({ length: 1536 }, () => Math.random()),
        text,
        tokens: text.split(' ').length
      };
    }

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return {
      embedding: response.data[0].embedding,
      text,
      tokens: response.usage.total_tokens
    };
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Fallback to dummy embedding on error
    return {
      embedding: Array.from({ length: 1536 }, () => Math.random()),
      text,
      tokens: text.split(' ').length
    };
  }
}

// Generate embeddings for a candidate profile
export async function generateCandidateEmbeddings(candidate: {
  firstName: string;
  lastName: string;
  currentTitle?: string;
  summary?: string;
  skills: string[];
  yearsExperience: number;
  educationLevel?: string;
  resumeText?: string;
}): Promise<CandidateEmbeddings> {
  
  // Construct profile text
  const profileText = [
    `${candidate.firstName} ${candidate.lastName}`,
    candidate.currentTitle,
    candidate.summary,
    `${candidate.yearsExperience} years of experience`,
    candidate.educationLevel
  ].filter(Boolean).join('. ');

  // Skills text
  const skillsText = candidate.skills.join(', ');

  // Experience text (could be extracted from resume or constructed)
  const experienceText = [
    candidate.currentTitle,
    `${candidate.yearsExperience} years of experience`,
    candidate.summary
  ].filter(Boolean).join('. ');

  // Resume text (use provided or construct from available data)
  const resumeText = candidate.resumeText || profileText;

  // Generate all embeddings concurrently
  const [profileResult, skillsResult, experienceResult, resumeResult] = await Promise.all([
    generateEmbedding(profileText),
    generateEmbedding(skillsText),
    generateEmbedding(experienceText),
    generateEmbedding(resumeText)
  ]);

  return {
    profileEmbedding: profileResult.embedding,
    skillsEmbedding: skillsResult.embedding,
    experienceEmbedding: experienceResult.embedding,
    resumeEmbedding: resumeResult.embedding
  };
}

// Generate embeddings for a job description
export async function generateJobEmbeddings(job: {
  title: string;
  company: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  skillsRequired: string[];
  experienceRequired?: string;
}): Promise<JobEmbeddings> {

  // Construct job description text
  const jobText = [
    job.title,
    `at ${job.company}`,
    job.description,
    job.responsibilities
  ].filter(Boolean).join('. ');

  // Requirements text
  const requirementsText = [
    job.requirements,
    job.experienceRequired ? `Experience required: ${job.experienceRequired}` : '',
    job.responsibilities
  ].filter(Boolean).join('. ');

  // Skills text
  const skillsText = job.skillsRequired.join(', ');

  // Generate all embeddings concurrently
  const [jobResult, requirementsResult, skillsResult] = await Promise.all([
    generateEmbedding(jobText),
    generateEmbedding(requirementsText),
    generateEmbedding(skillsText)
  ]);

  return {
    jobEmbedding: jobResult.embedding,
    requirementsEmbedding: requirementsResult.embedding,
    skillsEmbedding: skillsResult.embedding
  };
}

// Calculate cosine similarity between two vectors
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
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

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

// Calculate comprehensive similarity score
export function calculateComprehensiveSimilarity(
  candidateEmbeddings: CandidateEmbeddings,
  jobEmbeddings: JobEmbeddings,
  weights: {
    profile: number;
    skills: number;
    experience: number;
    resume: number;
  } = { profile: 0.3, skills: 0.4, experience: 0.2, resume: 0.1 }
): {
  overallScore: number;
  profileSimilarity: number;
  skillsSimilarity: number;
  experienceSimilarity: number;
  resumeSimilarity: number;
} {
  
  const profileSimilarity = cosineSimilarity(candidateEmbeddings.profileEmbedding, jobEmbeddings.jobEmbedding);
  const skillsSimilarity = cosineSimilarity(candidateEmbeddings.skillsEmbedding, jobEmbeddings.skillsEmbedding);
  const experienceSimilarity = cosineSimilarity(candidateEmbeddings.experienceEmbedding, jobEmbeddings.requirementsEmbedding);
  const resumeSimilarity = cosineSimilarity(candidateEmbeddings.resumeEmbedding, jobEmbeddings.jobEmbedding);

  const overallScore = 
    profileSimilarity * weights.profile +
    skillsSimilarity * weights.skills +
    experienceSimilarity * weights.experience +
    resumeSimilarity * weights.resume;

  return {
    overallScore,
    profileSimilarity,
    skillsSimilarity,
    experienceSimilarity,
    resumeSimilarity
  };
}

// Normalize vector (make unit length)
export function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return vector;
  return vector.map(val => val / norm);
}

// Generate dummy embeddings for testing/development
export function generateDummyEmbedding(dimensions: number = 1536): number[] {
  return Array.from({ length: dimensions }, () => Math.random() * 2 - 1); // Random values between -1 and 1
}

// Batch generate embeddings with rate limiting
export async function batchGenerateEmbeddings(
  texts: string[],
  batchSize: number = 10,
  delayMs: number = 1000
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    const batchPromises = batch.map(text => generateEmbedding(text));
    const batchResults = await Promise.all(batchPromises);
    
    results.push(...batchResults);
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    console.log(`Processed ${Math.min(i + batchSize, texts.length)} of ${texts.length} embeddings`);
  }
  
  return results;
}

// Utility to chunk large text into smaller pieces for embedding
export function chunkText(text: string, maxTokens: number = 8000): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokenCount = 0;

  for (const word of words) {
    const wordTokens = Math.ceil(word.length / 4); // Rough token estimation
    
    if (currentTokenCount + wordTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [word];
      currentTokenCount = wordTokens;
    } else {
      currentChunk.push(word);
      currentTokenCount += wordTokens;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }
  
  return chunks;
}

// Example usage and testing functions
export const vectorTestUtils = {
  // Test embedding generation
  testEmbeddingGeneration: async () => {
    const testText = "Software engineer with 5 years of experience in React and Node.js";
    const result = await generateEmbedding(testText);
    
    console.log('Test Embedding Generation:');
    console.log(`Text: ${result.text}`);
    console.log(`Embedding length: ${result.embedding.length}`);
    console.log(`Tokens used: ${result.tokens}`);
    console.log(`First 5 values: ${result.embedding.slice(0, 5)}`);
    
    return result;
  },

  // Test similarity calculation
  testSimilarityCalculation: () => {
    const vector1 = generateDummyEmbedding(10);
    const vector2 = generateDummyEmbedding(10);
    const vector3 = [...vector1]; // Identical vector
    
    const similarity1 = cosineSimilarity(vector1, vector2);
    const similarity2 = cosineSimilarity(vector1, vector3);
    
    console.log('Test Similarity Calculation:');
    console.log(`Random vectors similarity: ${similarity1}`);
    console.log(`Identical vectors similarity: ${similarity2}`);
    
    return { similarity1, similarity2 };
  },

  // Test candidate embeddings generation
  testCandidateEmbeddings: async () => {
    const sampleCandidate = {
      firstName: "John",
      lastName: "Doe",
      currentTitle: "Senior Software Engineer",
      summary: "Experienced full-stack developer with expertise in React and Node.js",
      skills: ["JavaScript", "React", "Node.js", "PostgreSQL"],
      yearsExperience: 5,
      educationLevel: "Bachelor's in Computer Science"
    };
    
    const embeddings = await generateCandidateEmbeddings(sampleCandidate);
    
    console.log('Test Candidate Embeddings:');
    console.log(`Profile embedding length: ${embeddings.profileEmbedding.length}`);
    console.log(`Skills embedding length: ${embeddings.skillsEmbedding.length}`);
    console.log(`Experience embedding length: ${embeddings.experienceEmbedding.length}`);
    console.log(`Resume embedding length: ${embeddings.resumeEmbedding.length}`);
    
    return embeddings;
  }
};