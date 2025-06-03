import ora from "ora";
import type { AIMessage } from "../types";
import { pdfParseToolDefinition } from "./tools/pdf-parse";

export const showLoader = (text: string) => {
	const spinner = ora({
		text,
		color: "cyan",
	}).start();

	return {
		stop: () => spinner.stop(),
		succeed: (text?: string) => spinner.succeed(text),
		fail: (text?: string) => spinner.fail(text),
		update: (text: string) => {
			spinner.text = text;
			return spinner;
		},
	};
};

export const logMessage = (message: AIMessage) => {
	const roleColors = {
		user: "\x1b[36m",
		assistant: "\x1b[32m",
	};

	const reset = "\x1b[0m";
	const role = message.role;
	const color = roleColors[role as keyof typeof roleColors] || "\x1b[37m"; // default to white

	// Don't log tool messages
	if (role === "tool") {
		return;
	}

	// Log user messages (only have content)
	if (role === "user") {
		console.log(`\n${color}[USER]${reset}`);
		console.log(`${message.content}\n`);
		return;
	}

	// Log assistant messages
	if (role === "assistant") {
		// If has tool_calls, log function name and ask for approval
		if ("tool_calls" in message && message.tool_calls) {
			for (const tool of message.tool_calls) {
				console.log(`\n${color}[ASSISTANT]${reset}`);
				console.log(`${tool.function.name}\n`);

				if (tool.function.name === pdfParseToolDefinition.name) {
					console.log("\nDo you approve scanning the pdf? (yes/no)\n");
				}
			}
			return;
		}

		if (message.content) {
			console.log(`\n${color}[ASSISTANT]${reset}`);
			console.log(`${message.content}\n`);
		}
	}
};
