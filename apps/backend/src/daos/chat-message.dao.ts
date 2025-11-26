import { ChatMessage } from "../models/chat-message.model";

/**
 * DAO for ChatMessage - handles all database operations
 * Single Responsibility: Database access for chat messages
 */
export class ChatMessageDAO {
	/**
	 * Create a new chat message
	 */
	static async create(messageData: {
		userId: string;
		role: "user" | "assistant" | "system";
		content: string;
		metadata?: {
			model?: string;
			tokensUsed?: number;
			responseTime?: number;
		};
	}) {
		const message = new ChatMessage({
			...messageData,
			timestamp: new Date(),
		});
		return await message.save();
	}

	/**
	 * Create multiple chat messages in bulk
	 */
	static async createMany(
		messages: Array<{
			userId: string;
			role: "user" | "assistant" | "system";
			content: string;
			timestamp?: Date;
			metadata?: {
				model?: string;
				tokensUsed?: number;
				responseTime?: number;
			};
		}>
	) {
		return await ChatMessage.insertMany(
			messages.map((msg) => ({
				...msg,
				timestamp: msg.timestamp || new Date(),
			}))
		);
	}

	/**
	 * Get chat history for a user
	 */
	static async findByUserId(userId: string, limit: number = 50) {
		return await ChatMessage.find({
			userId,
			role: { $ne: "system" }, // Exclude system messages from history
		})
			.sort({ timestamp: -1 })
			.limit(limit)
			.lean();
	}

	/**
	 * Get recent messages for context (including system messages)
	 */
	static async getRecentForContext(userId: string, limit: number = 10) {
		return await ChatMessage.find({ userId }).sort({ timestamp: -1 }).limit(limit).lean();
	}

	/**
	 * Delete all chat messages for a user
	 */
	static async deleteByUserId(userId: string) {
		return await ChatMessage.deleteMany({ userId });
	}

	/**
	 * Get total message count for a user
	 */
	static async countByUserId(userId: string): Promise<number> {
		return await ChatMessage.countDocuments({ userId });
	}

	/**
	 * Get messages within a date range
	 */
	static async findByDateRange(userId: string, startDate: Date, endDate: Date) {
		return await ChatMessage.find({
			userId,
			timestamp: {
				$gte: startDate,
				$lte: endDate,
			},
		})
			.sort({ timestamp: 1 })
			.lean();
	}

	/**
	 * Delete messages older than a certain date
	 */
	static async deleteOlderThan(userId: string, date: Date) {
		return await ChatMessage.deleteMany({
			userId,
			timestamp: { $lt: date },
		});
	}
}
