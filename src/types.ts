import type OpenAI from "openai";

export type AIMessage =
	| OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam
	| { role: "user"; content: string }
	| { role: "tool"; content: string; tool_call_id: string };

export type ToolFn<A = unknown, T = unknown> = (input: { userMessage: string; toolArgs: A }) => Promise<T>;

export type AgentConfig = {
	maxIterations?: number;
	toolTimeout?: number;
	retryAttempts?: number;
}

export type ToolConfig = {
	definition: any;
	handler: (input: { userMessage: string; toolArgs: any }) => Promise<string>;
}

export type ContextChunk = {
    id: string;
    content: string;
    type: 'profile' | 'skills' | 'experience' | 'resume';
    candidateId: number;
    relevanceScore: number;
    metadata: {
      source: string;
      chunkedAt: Date;
      chunkSize: number;
    };
  }
  
  export type RankedResult = {
    candidate: CandidateSearchResult;
    contextChunks: ContextChunk[];
    rerankScore: number;
    explanation: string;
  }

  export type CandidateSearchParams = {
    query: string;
    experienceLevel?: string | null;
    requiredSkills?: string[] | null;
    location?: string | null;
    maxResults?: number;
    useHybridSearch?: boolean;
  }
  
  export type CandidateSearchResult = {
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
    retrievalMethod?: 'vector' | 'keyword' | 'hybrid';
    enhancedSummary?: string;
    rerankExplanation?: string;
  }