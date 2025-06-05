import { DEFAULT_CONFIG } from "./consts";
import { runLLM } from "./llm";
import { addMessages, getMessages, saveToolResponse } from "./memory";
import { runTool } from "./toolRunner";
import { logMessage, showLoader } from "./ui";
import type { AgentConfig } from "./types";

/**
 * Enhanced agent with retry logic and better error handling
 */
export const runAgent = async ({
	userMessage,
	tools,
	config = DEFAULT_CONFIG,
}: {
	userMessage: string;
	// biome-ignore lint/suspicious/noExplicitAny: intentionally using any for tools array
	tools: any[];
	config?: AgentConfig;
}) => {
	await addMessages([{ role: 'user', content: userMessage }]);

	const loader = showLoader('🤔');
	let iterations = 0;
	const maxIterations = config.maxIterations ?? DEFAULT_CONFIG.maxIterations!;

	while (iterations < maxIterations) {
		iterations++;
		
		try {
			const history = await getMessages();
			const response = await runLLM({ messages: history, tools });

			await addMessages([response]);

			if (response.content) {
				loader.stop();
				logMessage(response);
				return getMessages();
			}

			if (response.tool_calls) {
				const toolCall = response.tool_calls[0];
				logMessage(response);
				loader.update(`executing: ${toolCall.function.name}`);

				// Execute tool with timeout and retry logic
				const toolResponse = await executeToolWithRetry(
					toolCall, 
					userMessage, 
					config.retryAttempts ?? DEFAULT_CONFIG.retryAttempts!,
					config.toolTimeout ?? DEFAULT_CONFIG.toolTimeout!
				);
				
				await saveToolResponse(toolCall.id, toolResponse);
				loader.update(`done: ${toolCall.function.name}`);
			}
		} catch (error) {
			loader.stop();
			console.error(`Agent error on iteration ${iterations}:`, error);
			
			// Add error message to conversation for context
			await addMessages([{
				role: 'assistant',
				content: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Let me try to help you differently.`
			}]);
			
			return getMessages();
		}
	}

	// Max iterations reached
	loader.stop();
	await addMessages([{
		role: 'assistant',
		content: 'I\'ve reached the maximum number of processing steps. Please try rephrasing your request or ask for help with a more specific question.'
	}]);
	
	return getMessages();
};

/**
 * Execute tool with retry logic and timeout
 */
const executeToolWithRetry = async (
	toolCall: any,
	userMessage: string,
	maxRetries: number,
	timeoutMs: number
): Promise<string> => {
	let lastError: Error | undefined;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			// Create timeout promise
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error(`Tool execution timed out after ${timeoutMs}ms`)), timeoutMs);
			});

			// Race between tool execution and timeout
			const result = await Promise.race([
				runTool(toolCall, userMessage),
				timeoutPromise
			]);

			return result;

		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			console.log(`Tool execution attempt ${attempt}/${maxRetries} failed:`, lastError.message);
			
			if (attempt < maxRetries) {
				// Wait before retry (exponential backoff)
				const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
	}

	// All retries failed
	return `Tool execution failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`;
};
