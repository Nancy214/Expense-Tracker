import OpenAI from "openai";

/**
 * OpenAI Service - handles all communication with OpenAI API
 * Single Responsibility: OpenAI API integration
 */
export class OpenAIService {
	private client: OpenAI;
	private model: string;

	constructor() {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error("OPENAI_API_KEY environment variable is required");
		}

		this.client = new OpenAI({
			apiKey,
		});

		this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
	}

	/**
	 * Send a chat completion request
	 */
	async chat(
		messages: Array<{
			role: "system" | "user" | "assistant";
			content: string;
		}>
	): Promise<{
		content: string;
		tokensUsed: number;
	}> {
		try {
			const response = await this.client.chat.completions.create({
				model: this.model,
				messages,
				temperature: 0.7,
				max_tokens: 1000,
			});

			const content = response.choices[0]?.message?.content || "";
			const tokensUsed = response.usage?.total_tokens || 0;

			return {
				content,
				tokensUsed,
			};
		} catch (error: any) {
			if (error instanceof OpenAI.APIError) {
				throw new Error(`OpenAI API error: ${error.message}`);
			}
			throw error;
		}
	}

	/**
	 * Check if the OpenAI service is configured properly
	 */
	async healthCheck(): Promise<boolean> {
		try {
			await this.client.models.list();
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get the current model being used
	 */
	getModel(): string {
		return this.model;
	}
}
