import type { SettingsType, UserType } from "@expense-tracker/shared-types/src/auth";
import type { CountryTimezoneCurrencyData, ProfileData, SettingsData } from "@expense-tracker/shared-types/src/profile";
import CountryTimezoneCurrency from "../models/countries.model";
import { Settings, User } from "../models/user.model";

export class ProfileDAO {
	/**
	 * Find user by ID without password
	 */
	/*  static async findUserById(userId: string): Promise<UserType | null> {
        return await User.findById(userId).select("-password");
    } */

	/**
	 * Find user by ID with only profile picture field
	 */
	static async findUserProfilePicture(userId: string): Promise<{ profilePicture?: string } | null> {
		return await User.findById(userId).select("profilePicture");
	}

	/**
	 * Check if email exists for another user
	 */
	static async checkEmailExists(email: string, excludeUserId: string): Promise<boolean> {
		const existingUser = await User.findOne({
			email,
			_id: { $ne: excludeUserId },
		});
		return !!existingUser;
	}

	/**
	 * Update user profile data
	 */
	static async updateUserProfile(userId: string, updateData: ProfileData): Promise<UserType | null> {
		return await User.findByIdAndUpdate(userId, updateData, {
			new: true,
			runValidators: true,
		}).select("-password");
	}

	/**
	 * Update user profile picture
	 */
	static async updateUserProfilePicture(userId: string, profilePictureKey: string): Promise<UserType | null> {
		return await User.findByIdAndUpdate(
			userId,
			{ profilePicture: profilePictureKey },
			{ new: true, runValidators: true }
		).select("-password");
	}

	/**
	 * Remove user profile picture
	 */
	static async removeUserProfilePicture(userId: string): Promise<UserType | null> {
		return await User.findByIdAndUpdate(userId, { profilePicture: "" }, { new: true, runValidators: true }).select(
			"-password"
		);
	}

	/**
	 * Find user settings by user ID
	 */
	/* static async findUserSettings(userId: string): Promise<SettingsType | null> {
        const settingsDoc = await Settings.findById(userId);

        if (!settingsDoc) {
            return null;
        }

        return {
            userId: settingsDoc._id.toString(),
            monthlyReports: settingsDoc.monthlyReports,
            expenseReminders: settingsDoc.expenseReminders,
            billsAndBudgetsAlert: settingsDoc.billsAndBudgetsAlert,
            expenseReminderTime: settingsDoc.expenseReminderTime,
        };
    } */

	/**
	 * Find or create user settings
	 */
	/* static async findOrCreateUserSettings(userId: string): Promise<SettingsType> {
        let settingsDoc = await Settings.findById(userId);

        if (!settingsDoc) {
            const defaultSettings: SettingsData = {
                monthlyReports: false,
                expenseReminders: true,
                billsAndBudgetsAlert: false,
                expenseReminderTime: "18:00",
            };
            settingsDoc = await Settings.create(defaultSettings);
        }

        return {
            userId: settingsDoc._id.toString(),
            monthlyReports: settingsDoc.monthlyReports,
            expenseReminders: settingsDoc.expenseReminders,
            billsAndBudgetsAlert: settingsDoc.billsAndBudgetsAlert,
            expenseReminderTime: settingsDoc.expenseReminderTime,
        };
    } */

	/**
	 * Update user settings
	 */
	static async updateUserSettings(userId: string, settingsData: SettingsData): Promise<SettingsType | null> {
		const settingsDoc = await Settings.findByIdAndUpdate(
			userId,
			{ ...settingsData },
			{
				new: true,
				runValidators: true,
				upsert: true, // Create if doesn't exist
				setDefaultsOnInsert: true, // Apply schema defaults when creating
			}
		);

		if (!settingsDoc) {
			return null;
		}

		return {
			userId: settingsDoc._id.toString(),
			monthlyReports: settingsDoc.monthlyReports,
			expenseReminders: settingsDoc.expenseReminders,
			billsAndBudgetsAlert: settingsDoc.billsAndBudgetsAlert,
			expenseReminderTime: settingsDoc.expenseReminderTime,
		};
	}

	/**
	 * Get all country timezone currency data
	 */
	static async getCountryTimezoneCurrency(): Promise<CountryTimezoneCurrencyData[]> {
		const countryTimezoneCurrency = await CountryTimezoneCurrency.find().sort({
			country: 1,
		});

		return countryTimezoneCurrency.map((item) => ({
			_id: item._id.toString(),
			country: item.country,
			currency: item.currency,
			timezones: item.timezones,
		}));
	}
}
