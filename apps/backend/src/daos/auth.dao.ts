import { User, Settings } from "../models/user.model";
import { UserType, SettingsType, RegisterCredentials, JwtPayload } from "@expense-tracker/shared-types/src";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export class AuthDAO {
	/**
	 * Check if a user exists by email
	 */
	static async findUserByEmail(email: string): Promise<UserType | null> {
		return await User.findOne({ email });
	}

	/**
	 * Find user by ID
	 */
	static async findUserById(id: string): Promise<UserType | null> {
		return await User.findById(id);
	}

	/**
	 * Create a new user
	 */
	static async createUser(credentials: RegisterCredentials): Promise<UserType> {
		const { email, password, name } = credentials;

		const user = new User({
			email,
			password: bcrypt.hashSync(password, 10),
			name,
		});

		return await user.save();
	}

	/**
	 * Update user password
	 */
	static async updateUserPassword(userId: string, hashedPassword: string): Promise<UserType | null> {
		return await User.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true, runValidators: true });
	}

	/**
	 * Verify user password
	 */
	static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
		return bcrypt.compareSync(plainPassword, hashedPassword);
	}

	/**
	 * Hash a password
	 */
	static hashPassword(password: string): string {
		return bcrypt.hashSync(password, 10);
	}

	/**
	 * Unified token generation function
	 */
	static generateToken(
		user: UserType,
		tokenType: "auth" | "password_reset"
	): string | { accessToken: string; refreshToken: string } {
		const basePayload = {
			id: user.id.toString(),
			email: user.email,
		};

		if (tokenType === "auth") {
			const accessToken = jwt.sign(basePayload, process.env.JWT_SECRET || "your-secret-key", {
				expiresIn: "15m",
			});

			const refreshToken = jwt.sign(basePayload, process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key", {
				expiresIn: "1h",
			});

			return { accessToken, refreshToken };
		} else if (tokenType === "password_reset") {
			return jwt.sign(
				{
					...basePayload,
					type: "password_reset",
					timestamp: Date.now(),
				},
				process.env.JWT_SECRET || "your-secret-key",
				{ expiresIn: "10m" }
			);
		}

		throw new Error(`Unsupported token type: ${tokenType}`);
	}

	/**
	 * Verify JWT token
	 */
	static verifyToken(token: string, secret: string): JwtPayload {
		return jwt.verify(token, secret) as JwtPayload;
	}

	/**
	 * Find or create user settings
	 */
	static async findOrCreateUserSettings(userId: string): Promise<SettingsType | null> {
		// First try to find existing settings
		let settingsDoc = await Settings.findById(userId);

		// If no settings exist, create new ones with defaults
		if (!settingsDoc) {
			settingsDoc = await Settings.create({
				_id: userId,
				monthlyReports: false,
				expenseReminders: true,
				billsAndBudgetsAlert: false,
				expenseReminderTime: "18:00",
			});
		}

		if (!settingsDoc) {
			return null;
		}

		return {
			userId: settingsDoc._id.toString(),
			monthlyReports: settingsDoc.monthlyReports || false,
			expenseReminders: settingsDoc.expenseReminders || false,
			billsAndBudgetsAlert: settingsDoc.billsAndBudgetsAlert || false,
			expenseReminderTime: settingsDoc.expenseReminderTime || "18:00",
		};
	}

	/**
	 * Find user settings by user ID
	 */
	static async findUserSettings(userId: string): Promise<SettingsType | null> {
		const settingsDoc = await Settings.findById(userId);

		if (!settingsDoc) {
			return null;
		}

		return {
			userId: settingsDoc._id.toString(),
			monthlyReports: settingsDoc.monthlyReports || false,
			expenseReminders: settingsDoc.expenseReminders || false,
			billsAndBudgetsAlert: settingsDoc.billsAndBudgetsAlert || false,
			expenseReminderTime: settingsDoc.expenseReminderTime || "18:00",
		};
	}
}
