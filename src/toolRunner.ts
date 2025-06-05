import type OpenAI from "openai";
import { candidateSearchToolDefinition, getCandidateSearchTool } from "./tools/candidateSearch";
import { ToolConfig } from "./types";

type ToolHandler = (input: { userMessage: string; toolArgs: any }) => Promise<string>;

/**
 * Tool registry
 * @description A registry of all tools available to the agent.
*/
const toolRegistry: Record<string, ToolConfig> = {
	[candidateSearchToolDefinition.name]: {
		definition: candidateSearchToolDefinition,
		handler: getCandidateSearchTool as ToolHandler,
	},
};

/**
 * Register a new tool in the registry
 */
export const registerTool = (name: string, definition: any, handler: ToolHandler) => {
	toolRegistry[name] = { definition, handler };
};

/**
 * Get all available tool definitions
 */
export const getAvailableTools = () => Object.values(toolRegistry).map(tool => tool.definition);

/**
 * Enhanced tool runner with better error handling and logging
 * @param toolCall - The tool call object containing the function name and arguments
 * @param userMessage - The user message containing context
 * @returns Tool execution result
 */
export const runTool = async (
	toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
	userMessage: string
): Promise<string> => {
	const startTime = Date.now();
	const toolName = toolCall.function.name;
	
	try {
		// Check if tool exists in registry
		const tool = toolRegistry[toolName];
		if (!tool) {
			console.error(`Unknown tool: ${toolName}`);
			return `Error: Tool '${toolName}' is not available. Available tools: ${Object.keys(toolRegistry).join(', ')}`;
		}

		// Parse arguments with error handling
		let toolArgs;
		try {
			toolArgs = JSON.parse(toolCall.function.arguments || '{}');
		} catch (parseError) {
			console.error(`Error parsing tool arguments for ${toolName}:`, parseError);
			return `Error: Invalid arguments provided to tool '${toolName}'. Please ensure arguments are valid JSON.`;
		}

		console.log(`Executing tool: ${toolName}`);
		console.log(`Arguments:`, { ...toolArgs, userMessage: userMessage.substring(0, 100) + '...' });

		// Execute the tool
		const result = await tool.handler({ userMessage, toolArgs });
		
		const executionTime = Date.now() - startTime;
		console.log(`Tool ${toolName} completed in ${executionTime}ms`);
		
		return result;

	} catch (error) {
		const executionTime = Date.now() - startTime;
		console.error(`Error executing tool ${toolName} (${executionTime}ms):`, error);
		
		// Return user-friendly error message
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return `Error executing ${toolName}: ${errorMessage}. Please try again or contact support if the issue persists.`;
	}
};
