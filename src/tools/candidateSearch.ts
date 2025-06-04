import { z } from 'zod';
import { CandidateSearchService } from '../services/candidateSearchService';
import { CandidateSearchParams } from '../types';

export const candidateSearchToolDefinition = {
  name: 'candidateSearch',
  description: 'Search for candidates using semantic similarity matching',
  parameters: z.object({
    query: z.string().describe('Job description or search query for finding candidates'),
    experienceLevel: z.enum(['junior', 'mid-level', 'senior', 'lead', 'principal', 'executive']).nullable().describe('Required experience level'),
    requiredSkills: z.array(z.string()).nullable().describe('List of required technical skills'),
    location: z.string().nullable().describe('Preferred location or "remote" for remote work'),
    maxResults: z.number().min(1).max(50).nullable().describe('Maximum number of candidates to return (default: 10)'),
  }),
};

type Args = z.infer<typeof candidateSearchToolDefinition.parameters>;

export const getCandidateSearchTool = async ({
  userMessage,
  toolArgs,
}: {
  userMessage: string;
  toolArgs: Args;
}) => {
  console.log('🔍 Starting candidate search...');
  
  try {
    // Simple search parameters without advanced features
    const searchParams: CandidateSearchParams = {
      query: toolArgs.query,
      experienceLevel: toolArgs.experienceLevel || null,
      requiredSkills: toolArgs.requiredSkills || null,
      location: toolArgs.location || null,
      maxResults: toolArgs.maxResults || 10,
      useHybridSearch: false, // Disable hybrid search for now
    };

    console.log('Search params:', searchParams);

    // Perform basic vector search
    const candidates = await CandidateSearchService.vectorSearch(searchParams);
    
    console.log(`Found ${candidates.length} candidates`);

    if (candidates.length === 0) {
      return `No candidates found matching the criteria. Consider:
      - Broadening skill requirements
      - Adjusting experience level criteria  
      - Removing location restrictions
      - Using more general search terms`;
    }

    // Format results simply
    const formattedResults = candidates.slice(0, toolArgs.maxResults || 10).map((candidate, index) => {
      const skills = candidate.skills?.length > 0 ? candidate.skills.slice(0, 5) : ['No skills listed'];
      const location = candidate.location || 'Location not specified';
      const matchScorePercent = Math.round(candidate.matchScore * 100);
      
      return `${index + 1}. **${candidate.name}**
📧 ${candidate.email}
💼 ${candidate.currentTitle} at ${candidate.currentCompany}
📍 ${location}
💻 Skills: ${skills.join(', ')}
🎯 Experience: ${candidate.yearsExperience} years
⭐ Match Score: ${matchScorePercent}%`;
    });

    return `Found ${candidates.length} matching candidates for: "${searchParams.query}"

${formattedResults.join('\n\n')}

💡 **Tip**: Use more specific skills or adjust experience level for refined results.`;

  } catch (error) {
    console.error('Error in candidate search:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return `I encountered an error while searching for candidates: ${errorMessage}. Please try again with a simpler query.`;
  }
};