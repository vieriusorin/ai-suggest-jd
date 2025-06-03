import { z } from "zod";
import { CandidateSearchService, CandidateSearchParams } from "../services/candidateSearchService";

export type ToolFn<A = unknown, T = unknown> = (input: { userMessage: string; toolArgs: A }) => Promise<T>;

/**
 * The tool definition for the candidate search tool
 * The tool is used to perform semantic search on candidates based on job descriptions
 * The tool matches job requirements with candidate profiles and skills
 */
export const candidateSearchToolDefinition = {
    name: 'candidateSearch',
    parameters: z.object({
        jobDescription: z.string().describe('The complete job description to match candidates against'),
        experienceLevel: z.string().nullable().describe('Filter candidates by experience level (e.g., "junior", "mid-level", "senior", "lead")'),
        requiredSkills: z.array(z.string()).nullable().describe('Specific skills that are required for the position'),
        location: z.string().nullable().describe('Filter candidates by location or remote work preference'),
        maxResults: z.number().default(10).describe('Maximum number of candidates to return (default: 10)')
    }),
    description:
        'Performs semantic search to match candidates with job descriptions. Analyzes job requirements, skills, experience level, and other criteria to find the best matching candidates from the database. Use this tool when you need to find suitable candidates for a specific job posting or role.',
};

type Args = z.infer<typeof candidateSearchToolDefinition.parameters>;

/**
 * The tool function for the candidate search tool
 * Performs semantic search on candidate database based on job description
 * @param userMessage - The user message
 * @param toolArgs - The tool arguments including job description and filters
 * @returns The results of the candidate search with match scores and details
 */
export const getCandidateSearchTool: ToolFn<Args> = async ({ userMessage, toolArgs }) => {
    try {
        // Validate job description
        if (!toolArgs.jobDescription || toolArgs.jobDescription.trim().length === 0) {
            return JSON.stringify({
                error: true,
                message: 'Job description cannot be empty',
                candidates: [],
                searchCriteria: toolArgs
            });
        }

        console.log('Searching candidates with params:', toolArgs);

        // Prepare search parameters
        const searchParams: CandidateSearchParams = {
            query: toolArgs.jobDescription,
            experienceLevel: toolArgs.experienceLevel,
            requiredSkills: toolArgs.requiredSkills,
            location: toolArgs.location,
            maxResults: toolArgs.maxResults || 10
        };

        console.log('Searching candidates with params:', {
            ...searchParams,
            query: searchParams.query.substring(0, 100) + '...' // Truncate for logging
        });

        // Perform the semantic search
        const candidates = await CandidateSearchService.searchCandidates(searchParams);

        console.log('Found candidates:', candidates.length);

        // Get database statistics for context
        const stats = await CandidateSearchService.getCandidateStats();

        console.log('Database statistics:', stats);

        // Check if we have any results
        if (!candidates || candidates.length === 0) {
            return JSON.stringify({
                message: 'No matching candidates found for the given job description',
                searchCriteria: {
                    jobDescription: toolArgs.jobDescription.substring(0, 200) + '...',
                    experienceLevel: toolArgs.experienceLevel,
                    requiredSkills: toolArgs.requiredSkills,
                    location: toolArgs.location,
                    maxResults: toolArgs.maxResults
                },
                databaseStats: stats,
                candidates: []
            });
        }

        // Format the results for better readability
        const formattedResults = candidates.map((candidate, index) => ({
            rank: index + 1,
            candidateId: candidate.candidateId,
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone || 'Not provided',
            currentRole: candidate.currentTitle || 'Not specified',
            currentCompany: candidate.currentCompany || 'Not specified',
            experienceYears: candidate.yearsExperience,
            skills: candidate.skills || [],
            location: candidate.location || 'Not specified',
            summary: candidate.summary || 'No summary available',
            salaryExpectation: candidate.salaryExpectation ? `$${candidate.salaryExpectation.toLocaleString()}` : 'Not specified',
            
            // Match scores (0-1, higher is better)
            overallMatchScore: Math.round(candidate.matchScore * 100) / 100,
            profileSimilarity: Math.round(candidate.profileSimilarity * 100) / 100,
            skillsSimilarity: Math.round(candidate.skillsSimilarity * 100) / 100,
            experienceSimilarity: Math.round(candidate.experienceSimilarity * 100) / 100,
            resumeSimilarity: Math.round(candidate.resumeSimilarity * 100) / 100,
            
            // Match quality assessment
            matchQuality: candidate.matchScore > 0.8 ? 'Excellent' : 
                         candidate.matchScore > 0.6 ? 'Good' : 
                         candidate.matchScore > 0.4 ? 'Fair' : 'Poor'
        }));

        // Calculate summary statistics
        const avgMatchScore = formattedResults.reduce((sum, c) => sum + c.overallMatchScore, 0) / formattedResults.length;
        const excellentMatches = formattedResults.filter(c => c.overallMatchScore > 0.8).length;
        const goodMatches = formattedResults.filter(c => c.overallMatchScore > 0.6).length;

        // Return the formatted results
        return JSON.stringify({
            message: `Found ${formattedResults.length} matching candidates`,
            searchCriteria: {
                jobDescription: toolArgs.jobDescription.substring(0, 200) + '...',
                experienceLevel: toolArgs.experienceLevel,
                requiredSkills: toolArgs.requiredSkills,
                location: toolArgs.location,
                maxResults: toolArgs.maxResults
            },
            summary: {
                totalCandidates: formattedResults.length,
                averageMatchScore: Math.round(avgMatchScore * 100) / 100,
                excellentMatches,
                goodMatches,
                searchedDatabase: `${stats.candidatesWithEmbeddings} candidates with embeddings out of ${stats.totalCandidates} total`
            },
            candidates: formattedResults
        }, null, 2);
        
    } catch (error) {
        console.error('Error in candidate search tool:', error);
        
        // Return a more informative error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        return JSON.stringify({
            error: true,
            message: `Error searching candidates: ${errorMessage}`,
            searchCriteria: {
                jobDescription: toolArgs.jobDescription?.substring(0, 100) + '...',
                experienceLevel: toolArgs.experienceLevel,
                requiredSkills: toolArgs.requiredSkills,
                location: toolArgs.location
            },
            candidates: [],
            troubleshooting: {
                suggestion: 'Check if the database is accessible and contains candidate embeddings',
                commonIssues: [
                    'Missing OpenAI API key for embedding generation',
                    'Database connection issues',
                    'No candidates with vector embeddings in database',
                    'pgvector extension not properly installed'
                ]
            }
        });
    }
};