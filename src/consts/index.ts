import type { AgentConfig } from "../types";

export const DEFAULT_CONFIG: AgentConfig = {
	maxIterations: 10,
	toolTimeout: 30000, // 30 seconds
	retryAttempts: 2,
};