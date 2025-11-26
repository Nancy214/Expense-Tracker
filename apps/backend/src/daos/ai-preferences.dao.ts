import { UserAIPreferences } from "../models/user-ai-preferences.model";

/**
 * DAO for UserAIPreferences - handles all database operations
 * Single Responsibility: Database access for AI preferences
 */
export class AIPreferencesDAO {
	/**
	 * Find user AI preferences by user ID
	 */
	static async findByUserId(userId: string) {
		return await UserAIPreferences.findOne({ userId });
	}

	/**
	 * Create new AI preferences for a user
	 */
	static async create(userId: string) {
		const preferences = new UserAIPreferences({
			userId,
			enabled: false,
			privacyConsent: false,
			dailyMessageLimit: 50,
			messagesUsedToday: 0,
			lastResetDate: new Date(),
		});
		return await preferences.save();
	}

	/**
	 * Find or create user AI preferences
	 */
	static async findOrCreate(userId: string) {
		let preferences = await this.findByUserId(userId);
		if (!preferences) {
			preferences = await this.create(userId);
		}
		return preferences;
	}

	/**
	 * Update AI preferences
	 */
	static async update(
		userId: string,
		updates: Partial<{
			enabled: boolean;
			privacyConsent: boolean;
			dailyMessageLimit: number;
		}>
	) {
		return await UserAIPreferences.findOneAndUpdate({ userId }, updates, { new: true, runValidators: true });
	}

	/**
	 * Increment message usage counter
	 */
	static async incrementMessageCount(userId: string) {
		return await UserAIPreferences.findOneAndUpdate({ userId }, { $inc: { messagesUsedToday: 1 } }, { new: true });
	}

	/**
	 * Reset daily message counter if needed
	 */
	static async resetDailyCounterIfNeeded(userId: string) {
		const preferences = await this.findByUserId(userId);
		if (!preferences) return null;

		const today = new Date().toDateString();
		const lastReset = new Date(preferences.lastResetDate).toDateString();

		if (today !== lastReset) {
			return await UserAIPreferences.findOneAndUpdate(
				{ userId },
				{
					messagesUsedToday: 0,
					lastResetDate: new Date(),
				},
				{ new: true }
			);
		}

		return preferences;
	}

	/**
	 * Check if user has remaining messages today
	 */
	static async hasRemainingMessages(userId: string): Promise<boolean> {
		const preferences = await this.resetDailyCounterIfNeeded(userId);
		if (!preferences) return false;
		return preferences.messagesUsedToday < preferences.dailyMessageLimit;
	}

	/**
	 * Get remaining message count for today
	 */
	static async getRemainingMessageCount(userId: string): Promise<number> {
		const preferences = await this.resetDailyCounterIfNeeded(userId);
		if (!preferences) return 0;
		return Math.max(0, preferences.dailyMessageLimit - preferences.messagesUsedToday);
	}
}
