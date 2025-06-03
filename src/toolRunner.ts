import type OpenAI from "openai";
// TODO: Add tools here

/**
 * 
 * @param toolCall - The tool call object containing the function name and arguments.
 * @description This function handles the execution of tools based on the tool call object.
 * It checks the function name and calls the corresponding tool function with the provided arguments.
 * @function runTool
 * @param userMessage - The user message containing the PDF file path.
 * @returns 
 */
export const runTool = async (toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall, userMessage: string) => {
	const input = {
		userMessage,
		toolArgs: JSON.parse(toolCall.function.arguments || "{}"),
	};

	switch (toolCall.function.name) {

		default:
			return `Never run this tool: ${toolCall.function.name} again, or else!`;
	}
};
