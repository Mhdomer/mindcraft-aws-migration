// Google Generative AI SDK - Gemini Integration
// Uses Google's Generative AI SDK to access Gemini models directly

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
// Uses GEMINI_API_KEY from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

/**
 * Generate text content using Gemini model
 * @param {string} prompt - The prompt to send to the model
 * @param {object} options - Options for generation
 * @param {string} options.model - Model name (default: 'gemini-2.0-flash-exp')
 * @param {number} options.temperature - Temperature for generation (0-1)
 * @param {number} options.maxTokens - Maximum tokens to generate
 * @returns {Promise<string>} Generated text
 */
export async function generateText(prompt, options = {}) {
	try {
		if (!genAI.apiKey) {
			throw new Error('GEMINI_API_KEY is not set. Please add it to your .env file.');
		}

		const model = genAI.getGenerativeModel({
			model: options.model || 'gemini-2.0-flash-exp',
			generationConfig: {
				temperature: options.temperature || 0.7,
				maxOutputTokens: options.maxTokens || 2048,
			},
		});

		const result = await model.generateContent(prompt);
		const response = await result.response;
		return response.text();
	} catch (error) {
		console.error('Google Generative AI error:', error);
		throw new Error(`Failed to generate AI response: ${error.message}`);
	}
}

/**
 * Generate structured JSON response from Gemini
 * @param {string} prompt - The prompt to send to the model
 * @param {object} options - Options for generation
 * @returns {Promise<object>} Parsed JSON response
 */
export async function generateJSON(prompt, options = {}) {
	try {
		const text = await generateText(prompt, options);
		
		// Try to extract JSON from response
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			return JSON.parse(jsonMatch[0]);
		}
		
		// If no JSON found, return as text response
		return { response: text };
	} catch (error) {
		console.error('Firebase AI JSON parsing error:', error);
		// Return text response if JSON parsing fails
		return { response: text || 'Error generating response' };
	}
}

/**
 * Generate content with conversation history (for chat-like interactions)
 * @param {string} prompt - Current user prompt
 * @param {Array} history - Conversation history [{role: 'user'|'model', parts: [{text: string}]}]
 * @param {object} options - Options for generation
 * @returns {Promise<string>} Generated text
 */
export async function generateWithHistory(prompt, history = [], options = {}) {
	try {
		if (!genAI.apiKey) {
			throw new Error('GEMINI_API_KEY is not set. Please add it to your .env file.');
		}

		const model = genAI.getGenerativeModel({
			model: options.model || 'gemini-2.0-flash-exp',
			generationConfig: {
				temperature: options.temperature || 0.7,
				maxOutputTokens: options.maxTokens || 2048,
			},
		});

		// If history is empty, just use the prompt
		if (history.length === 0) {
			const result = await model.generateContent(prompt);
			const response = await result.response;
			return response.text();
		}

		// Build full conversation with history
		// Google Generative AI SDK expects an array of content objects
		const chat = model.startChat({
			history: history.map(msg => ({
				role: msg.role === 'user' ? 'user' : 'model',
				parts: typeof msg.parts === 'string' ? [{ text: msg.parts }] : msg.parts
			})),
		});

		const result = await chat.sendMessage(prompt);
		const response = await result.response;
		return response.text();
	} catch (error) {
		console.error('Google Generative AI history error:', error);
		// Fallback to simple generation if history fails
		try {
			return await generateText(prompt, options);
		} catch (fallbackError) {
			throw new Error(`Failed to generate AI response: ${error.message}`);
		}
	}
}

// Export the genAI instance if needed elsewhere
export { genAI };

