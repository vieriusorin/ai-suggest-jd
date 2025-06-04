import { zodFunction } from "openai/helpers/zod";
import type { AIMessage } from "./types";
import { openai } from "./ai";

import { systemPrompt as defaultSystemPrompt } from "./systemPrompt";

/**
 * 
 * @param messages - The messages to be sent to the LLM.
 * @param tools - The tools to be used by the LLM.
 * @param temperature - The temperature for the LLM response.
 * @param systemPrompt - The system prompt for the LLM.
 * @description This function sends a request to the LLM with the provided messages and tools.
 * It uses the OpenAI API to generate a response based on the provided parameters.
 * @returns 
 */
export const runLLM = async ({
	messages,
	tools = [],
	temperature = 0.1,
	systemPrompt,
}: {
	messages: AIMessage[];
	// biome-ignore lint/suspicious/noExplicitAny: intentionally using any for tools array
	tools?: any[];
	temperature?: number;
	systemPrompt?: string;
}) => {
	const formattedTools = tools.map(zodFunction);

	const response = await openai.chat.completions.create({
		model: "gpt-4o-mini",
		temperature,
		messages: [
			{
				role: "system",
				content: systemPrompt || defaultSystemPrompt,
				name: "Gepeto",
			},
			...messages,
		],
		...(formattedTools.length > 0 && {
			tools: formattedTools,
			tool_choice: "auto",
			parallel_tool_calls: false,
		}),
	});

	return response.choices[0].message;
};
