/**
 * Langfuse Service
 *
 * Responsibility: LLM observability and unified LLM interface
 * - Initialize Langfuse client
 * - Create traces for conversations
 * - Handle LLM completions via Langfuse (supports OpenAI, Anthropic, etc.)
 * - Record metadata and usage
 * - Flush traces to Langfuse
 *
 * SRP: This service handles both Langfuse tracking AND LLM calls via Langfuse SDK
 * This allows model switching without changing code - just env variables
 */

import { Langfuse } from "langfuse";
import { completion } from "litellm";

interface LangfuseConfig {
	publicKey: string;
	secretKey: string;
	host: string;
	enabled: boolean;
}

interface TraceMetadata {
	userId: string;
	sessionId?: string;
	userEmail?: string;
	[key: string]: any;
}

interface GenerationInput {
	traceId: string;
	name: string;
	model: string;
	input: any;
	metadata?: Record<string, any>;
}

interface GenerationOutput {
	output: any;
	usage?: {
		promptTokens?: number;
		completionTokens?: number;
		totalTokens?: number;
	};
	metadata?: Record<string, any>;
}

export class LangfuseService {
	private client: Langfuse | null = null;
	private enabled: boolean = false;
	private traces: Map<string, any> = new Map();
	private generations: Map<string, any> = new Map();

	constructor(config?: LangfuseConfig) {
		const publicKey = config?.publicKey || process.env.LANGFUSE_PUBLIC_KEY;
		const secretKey = config?.secretKey || process.env.LANGFUSE_SECRET_KEY;
		const host = config?.host || process.env.LANGFUSE_HOST || "https://cloud.langfuse.com";
		const enabled = config?.enabled !== undefined ? config.enabled : process.env.LANGFUSE_ENABLED === "true";

		this.enabled = enabled;

		if (!this.enabled) {
			console.log("[Langfuse] Tracking disabled via configuration");
			return;
		}

		if (!publicKey || !secretKey) {
			console.warn("[Langfuse] Missing API keys. Tracking will be disabled.");
			console.warn("[Langfuse] Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY in .env");
			this.enabled = false;
			return;
		}

		if (publicKey === "your_langfuse_public_key_here" || secretKey === "your_langfuse_secret_key_here") {
			console.warn("[Langfuse] Using placeholder API keys. Tracking will be disabled.");
			console.warn("[Langfuse] Get real keys from https://cloud.langfuse.com");
			this.enabled = false;
			return;
		}

		try {
			this.client = new Langfuse({
				publicKey,
				secretKey,
				baseUrl: host,
			});
			console.log("[Langfuse] Initialized successfully");
			console.log(`[Langfuse] Host: ${host}`);
		} catch (error) {
			console.error("[Langfuse] Failed to initialize:", error);
			this.enabled = false;
		}
	}

	/**
	 * Check if Langfuse tracking is enabled
	 */
	isEnabled(): boolean {
		return this.enabled && this.client !== null;
	}

	/**
	 * Create a new trace for a conversation or operation
	 */
	createTrace(name: string, metadata: TraceMetadata): string | null {
		if (!this.isEnabled()) return null;

		try {
			const trace = this.client!.trace({
				name,
				userId: metadata.userId,
				sessionId: metadata.sessionId || null,
				metadata: {
					userEmail: metadata.userEmail,
					...metadata,
				},
			});

			const traceId = trace.id;
			this.traces.set(traceId, trace);

			console.log(`[Langfuse] Created trace: ${traceId} for user: ${metadata.userId}`);
			return traceId;
		} catch (error) {
			console.error("[Langfuse] Failed to create trace:", error);
			return null;
		}
	}

	/**
	 * Start tracking a generation (LLM completion)
	 */
	startGeneration(input: GenerationInput): string | null {
		if (!this.isEnabled()) return null;

		try {
			const trace = this.traces.get(input.traceId);
			if (!trace) {
				console.warn(`[Langfuse] Trace not found: ${input.traceId}`);
				return null;
			}

			const generation = trace.generation({
				name: input.name,
				model: input.model,
				input: input.input,
				metadata: input.metadata,
			});

			const generationId = generation.id;
			this.generations.set(generationId, generation);

			console.log(`[Langfuse] Started generation: ${generationId}`);
			return generationId;
		} catch (error) {
			console.error("[Langfuse] Failed to start generation:", error);
			return null;
		}
	}

	/**
	 * End a generation and record output and usage
	 */
	endGeneration(generationId: string, output: GenerationOutput): void {
		if (!this.isEnabled()) return;

		try {
			const generation = this.generations.get(generationId);
			if (!generation) {
				console.warn(`[Langfuse] Generation not found: ${generationId}`);
				return;
			}

			generation.end({
				output: output.output,
				usage: output.usage,
				metadata: output.metadata,
			});

			console.log(`[Langfuse] Ended generation: ${generationId}`);
			console.log(`[Langfuse] Tokens used: ${output.usage?.totalTokens || 0}`);

			// Clean up from memory
			this.generations.delete(generationId);
		} catch (error) {
			console.error("[Langfuse] Failed to end generation:", error);
		}
	}

	/**
	 * Update trace with additional metadata
	 */
	updateTrace(traceId: string, metadata: Record<string, any>): void {
		if (!this.isEnabled()) return;

		try {
			const trace = this.traces.get(traceId);
			if (!trace) {
				console.warn(`[Langfuse] Trace not found: ${traceId}`);
				return;
			}

			trace.update({
				metadata,
			});

			console.log(`[Langfuse] Updated trace: ${traceId}`);
		} catch (error) {
			console.error("[Langfuse] Failed to update trace:", error);
		}
	}

	/**
	 * Score a trace (e.g., user feedback, quality metrics)
	 */
	scoreTrace(traceId: string, name: string, value: number, comment?: string): void {
		if (!this.isEnabled()) return;

		try {
			const trace = this.traces.get(traceId);
			if (!trace) {
				console.warn(`[Langfuse] Trace not found: ${traceId}`);
				return;
			}

			trace.score({
				name,
				value,
				comment,
			});

			console.log(`[Langfuse] Scored trace: ${traceId} (${name}: ${value})`);
		} catch (error) {
			console.error("[Langfuse] Failed to score trace:", error);
		}
	}

	/**
	 * Send chat completion request via Langfuse
	 * Supports multiple LLM providers (OpenAI, Anthropic, etc.)
	 * Provider and model are configured via environment variables
	 */
	async chat(
		messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
		traceId: string | null
	): Promise<{
		content: string;
		tokensUsed: number;
		promptTokens?: number;
		completionTokens?: number;
		model: string;
		finishReason?: string;
	}> {
		if (!this.isEnabled()) {
			throw new Error("[Langfuse] Cannot make LLM calls - Langfuse is not enabled");
		}

		const trace = traceId ? this.traces.get(traceId) : null;
		if (!trace && traceId) {
			console.warn(`[Langfuse] Trace not found: ${traceId}, creating new generation without trace`);
		}

		// Get model and provider from environment
		const model = process.env.LLM_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
		const provider = process.env.LLM_PROVIDER || "openai";

		console.log(`[Langfuse] Chat request - Provider: ${provider}, Model: ${model}`);

		try {
			// Convert messages for LiteLLM (model-agnostic format)
			const liteLLMMessages = messages.map((msg) => ({
				role: msg.role,
				content: msg.content,
			}));

			// Create generation for Langfuse tracking
			const generationConfig = {
				name: "chat-completion",
				model,
				input: liteLLMMessages,
				metadata: {
					provider,
					temperature: 0.7,
					maxTokens: 1000,
				},
			};

			const generation = trace
				? trace.generation(generationConfig)
				: (() => {
						if (!this.client) {
							throw new Error("[Langfuse] Client not initialized");
						}
						return this.client.generation(generationConfig);
					})();

			// Make the actual LLM call through LiteLLM (model-agnostic)
			const response = await completion({
				model,
				messages: liteLLMMessages,
				temperature: 0.7,
				max_tokens: 1000,
			});

			const content = response.choices[0]?.message?.content || "";
			const promptTokens = response.usage?.prompt_tokens || 0;
			const completionTokens = response.usage?.completion_tokens || 0;
			const tokensUsed = response.usage?.total_tokens || promptTokens + completionTokens;
			const finishReason = response.choices[0]?.finish_reason || "stop";

			// End the generation with results
			generation.end({
				output: content,
				usage: {
					promptTokens,
					completionTokens,
					totalTokens: tokensUsed,
				},
				metadata: {
					finishReason,
				},
			});

			console.log(`[Langfuse] Chat completed - Tokens: ${tokensUsed}, Finish: ${finishReason}`);

			return {
				content,
				tokensUsed,
				promptTokens,
				completionTokens,
				model,
				finishReason,
			};
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			console.error(`[Langfuse] Chat error:`, errorMessage);
			throw new Error(`LLM request failed: ${errorMessage}`);
		}
	}

	/**
	 * Flush all pending traces to Langfuse
	 * Call this at the end of operations to ensure data is sent
	 */
	async flush(): Promise<void> {
		if (!this.isEnabled()) return;

		try {
			await this.client!.flushAsync();
			console.log("[Langfuse] Flushed traces successfully");

			// Clean up traces from memory after flushing
			this.traces.clear();
			this.generations.clear();
		} catch (error) {
			console.error("[Langfuse] Failed to flush:", error);
		}
	}

	/**
	 * Shutdown Langfuse client gracefully
	 */
	async shutdown(): Promise<void> {
		if (!this.isEnabled()) return;

		try {
			await this.client!.shutdownAsync();
			console.log("[Langfuse] Shutdown complete");
		} catch (error) {
			console.error("[Langfuse] Failed to shutdown:", error);
		}
	}

	/**
	 * Get trace by ID
	 */
	getTrace(traceId: string): any | null {
		return this.traces.get(traceId) || null;
	}

	/**
	 * Get generation by ID
	 */
	getGeneration(generationId: string): any | null {
		return this.generations.get(generationId) || null;
	}

	/**
	 * Fetch prompt from Langfuse Prompt Management
	 * Uses Langfuse REST API to retrieve prompt templates
	 */
	async getPrompt(
		promptName: string,
		version?: number
	): Promise<{
		prompt: string;
		version: number;
		config?: Record<string, any>;
	} | null> {
		if (!this.isEnabled()) return null;

		const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
		const secretKey = process.env.LANGFUSE_SECRET_KEY;
		const host = process.env.LANGFUSE_HOST || "https://cloud.langfuse.com";

		if (!publicKey || !secretKey) return null;

		try {
			const versionParam = version ? `?version=${version}` : "";
			const url = `${host}/api/public/v2/prompts/${promptName}${versionParam}`;

			const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

			const response = await fetch(url, {
				headers: {
					Authorization: `Basic ${auth}`,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				if (response.status === 404) {
					console.log(`[Langfuse] Prompt "${promptName}" not found in Langfuse`);
					return null;
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json();

			console.log(`[Langfuse] Fetched prompt "${promptName}" v${data.version}`);
			console.log(data);

			return {
				prompt: data.prompt,
				version: data.version,
				config: data.config,
			};
		} catch (error) {
			console.error(`[Langfuse] Failed to fetch prompt "${promptName}":`, error);
			return null;
		}
	}

	/**
	 * Compile prompt template with variables
	 * Supports {{variable}} syntax for variable substitution
	 */
	compilePrompt(template: string, variables: Record<string, any>): string {
		let compiled = template;

		// Replace {{variable}} with actual values
		for (const [key, value] of Object.entries(variables)) {
			const regex = new RegExp(`{{${key}}}`, "g");
			compiled = compiled.replace(regex, String(value));
		}

		return compiled;
	}
}

// Singleton instance
let langfuseServiceInstance: LangfuseService | null = null;

export function getLangfuseService(): LangfuseService {
	if (!langfuseServiceInstance) {
		langfuseServiceInstance = new LangfuseService();
	}
	return langfuseServiceInstance;
}

export default LangfuseService;
