// Firebase AI Logic SDK - Gemini Integration
// Uses Firebase AI Logic SDK to access Gemini models through Firebase backend
// This uses your Firebase project API key, NOT a separate Gemini API key

import { app } from '@/firebase';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';

// Initialize Firebase AI service
// Uses Firebase project API key (NEXT_PUBLIC_FIREBASE_API_KEY) - no separate Gemini key needed
let aiInstance = null;

function getAIInstance() {
	if (!aiInstance) {
		try {
			aiInstance = getAI(app, { backend: new GoogleAIBackend() });
		} catch (error) {
			console.error('Failed to initialize Firebase AI:', error);
			throw new Error('Firebase AI Logic SDK not available. Ensure Firebase is properly configured.');
		}
	}
	return aiInstance;
}

// Note: We create models on-demand with generation config rather than caching,
// since generation config can vary per request

/**
 * Generate text content using Gemini model via Firebase AI Logic SDK
 * @param {string} prompt - The prompt to send to the model
 * @param {object} options - Options for generation
 * @param {string} options.model - Model name (default: 'gemini-2.0-flash-exp')
 * @param {number} options.temperature - Temperature for generation (0-1)
 * @param {number} options.maxTokens - Maximum tokens to generate
 * @returns {Promise<string>} Generated text
 */
export async function generateText(prompt, options = {}) {
	try {
		// Create model with generation config if options provided
		const modelName = options.model || 'gemini-2.0-flash-exp';
		const ai = getAIInstance();
		
		// Create model with generation config
		const model = getGenerativeModel(ai, {
			model: modelName,
			generationConfig: {
				temperature: options.temperature || 0.7,
				maxOutputTokens: options.maxTokens || 2048,
			},
		});
		
		// Firebase AI Logic SDK: generateContent takes prompt directly
		const result = await model.generateContent(prompt);
		const response = await result.response;
		return response.text();
	} catch (error) {
		console.error('Firebase AI Logic SDK error:', error);
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
		const modelName = options.model || 'gemini-2.0-flash-exp';
		const ai = getAIInstance();
		
		// Create model with generation config
		const model = getGenerativeModel(ai, {
			model: modelName,
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
		// Firebase AI Logic SDK expects history in the same format
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
		console.error('Firebase AI Logic SDK history error:', error);
		// Fallback to simple generation if history fails
		try {
			return await generateText(prompt, options);
		} catch (fallbackError) {
			throw new Error(`Failed to generate AI response: ${error.message}`);
		}
	}
}


