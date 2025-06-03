import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class EmbeddingService {
  /**
   * Generate embeddings for text using OpenAI's text-embedding-ada-002 model
   * This matches the 1536-dimensional vectors used in your candidates table
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.trim(),
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding for text');
    }
  }

  /**
   * Generate embeddings for job description with different aspects
   * This allows for more nuanced matching against candidate profiles
   */
  static async generateJobDescriptionEmbeddings(jobDescription: string): Promise<{
    fullEmbedding: number[];
    skillsEmbedding: number[];
    requirementsEmbedding: number[];
  }> {
    try {
      // Extract skills and requirements sections for targeted embeddings
      const skillsSection = this.extractSkillsFromJobDescription(jobDescription);
      const requirementsSection = this.extractRequirementsFromJobDescription(jobDescription);

      const [fullEmbedding, skillsEmbedding, requirementsEmbedding] = await Promise.all([
        this.generateEmbedding(jobDescription),
        this.generateEmbedding(skillsSection || jobDescription),
        this.generateEmbedding(requirementsSection || jobDescription),
      ]);

      return {
        fullEmbedding,
        skillsEmbedding,
        requirementsEmbedding,
      };
    } catch (error) {
      console.error('Error generating job description embeddings:', error);
      throw error;
    }
  }

  /**
   * Extract skills section from job description
   * This is a simple implementation - you might want to enhance with NLP
   */
  private static extractSkillsFromJobDescription(jobDescription: string): string {
    const text = jobDescription.toLowerCase();
    const skillsKeywords = ['skills', 'technologies', 'requirements', 'experience with'];
    
    // Find sections that mention skills
    const lines = text.split('\n');
    const skillsLines = lines.filter(line => 
      skillsKeywords.some(keyword => line.toLowerCase().includes(keyword))
    );
    
    return skillsLines.join('\n') || jobDescription;
  }

  /**
   * Extract requirements section from job description
   */
  private static extractRequirementsFromJobDescription(jobDescription: string): string {
    const text = jobDescription.toLowerCase();
    const requirementsKeywords = ['requirements', 'qualifications', 'must have', 'required'];
    
    const lines = text.split('\n');
    const requirementsLines = lines.filter(line => 
      requirementsKeywords.some(keyword => line.toLowerCase().includes(keyword))
    );
    
    return requirementsLines.join('\n') || jobDescription;
  }
}