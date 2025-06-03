import type OpenAI from "openai";

export type AIMessage =
	| OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam
	| { role: "user"; content: string }
	| { role: "tool"; content: string; tool_call_id: string };

export type ToolFn<A = unknown, T = unknown> = (input: { userMessage: string; toolArgs: A }) => Promise<T>;
