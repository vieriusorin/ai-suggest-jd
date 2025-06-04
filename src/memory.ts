import { JSONFilePreset } from "lowdb/node";
import { v4 as uuidv4 } from "uuid";
import type { AIMessage } from "./types";

export type MessageWithMetadata = AIMessage & {
	id: string;
	createdAt: string;
};

type Data = {
	messages: MessageWithMetadata[];
};

/**
 * 
 * @param {AIMessage} message - The message to be added.
 * @description This function adds metadata to the message, including a unique ID and the current timestamp.
 * It uses the uuid library to generate a unique ID and the Date object to get the current timestamp.
 * @function addMetadata
 * @returns 
 */
export const addMetadata = (message: AIMessage) => {
	return {
		...message,
		id: uuidv4(),
		createdAt: new Date().toISOString(),
	};
};

/**
 * 
 * @param {MessageWithMetadata} message - The message to be removed.
 * @description This function removes metadata from the message, including the unique ID and the timestamp.
 * It returns the message without the metadata.
 * @function removeMetadata
 * @description This function removes metadata from the message, including the unique ID and the timestamp.
 * It returns the message without the metadata.
 * @returns 
 */
export const removeMetadata = (message: MessageWithMetadata) => {
	const { id, createdAt, ...rest } = message;
	return rest;
};

const defaultData: Data = {
	messages: [],
};

/**
 * 
 * @returns {Promise<JSONFilePreset<Data>>} - A promise that resolves to the database instance.
 * @description This function initializes the database using the JSONFilePreset class from the lowdb library.
 * It creates a new JSON file if it doesn't exist and sets the default data.
 * The database is used to store messages with metadata.
 * @function getDb
 */
export const getDb = async () => {
	const db = await JSONFilePreset<Data>("db.json", defaultData);
	return db;
};

/**
 * 
 * @param messages - The messages to be added.
 * @description This function adds messages to the database.
 * It uses the getDb function to get the database instance and then pushes the messages to the messages array.
 * The messages are mapped to add metadata before being added to the database.
 * @function addMessages
 * @returns
 */
export const addMessages = async (messages: AIMessage[]) => {
	const db = await getDb();
	db.data.messages.push(...messages.map(addMetadata));

	await db.write();
};

/**
 * 
 * @returns {Promise<AIMessage[]>} - A promise that resolves to the array of messages.
 * @description This function retrieves messages from the database.
 * It uses the getDb function to get the database instance and then maps the messages to remove metadata before returning them.
 * @function getMessages
 * @returns
 */
export const getMessages = async () => {
	const db = await getDb();
	return db.data.messages.map(removeMetadata);
};

/**
 * 
 * @param toolCallId - The ID of the tool call.
 * @description This function retrieves a tool response from the database.
 * It uses the getDb function to get the database instance and then finds the message with the specified tool call ID.
 * The message is mapped to remove metadata before being returned.
 * @function getToolResponse
 * @param toolResponse 
 * @returns 
 */
export const saveToolResponse = async (toolCallId: string, toolResponse: string) => {
	return addMessages([
		{
			role: "tool",
			content: toolResponse,
			tool_call_id: toolCallId,
		},
	]);
};
