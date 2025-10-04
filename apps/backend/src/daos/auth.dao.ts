import { User, Settings } from "../models/user.model";
import { UserType, SettingsType, RegisterCredentials, JwtPayload } from "@expense-tracker/shared-types/src/auth";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";

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
     * Find user by ID and email (for password reset validation)
     */
    static async findUserByIdAndEmail(id: string, email: string): Promise<UserType | null> {
        return await User.findOne({ id, email });
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
     * Update user password using findOneAndUpdate (for password reset)
     */
    static async updateUserPasswordById(id: string, hashedPassword: string): Promise<UserType | null> {
        return await User.findOneAndUpdate({ id }, { password: hashedPassword }, { new: true, runValidators: false });
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
     * Generate JWT tokens for a user
     */
    static generateTokens(user: UserType): { accessToken: string; refreshToken: string } {
        const accessToken = jwt.sign({ id: user.id.toString() }, process.env.JWT_SECRET || "your-secret-key", {
            expiresIn: "15m",
        });

        const refreshToken = jwt.sign(
            { id: user.id.toString() },
            process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
            { expiresIn: "1h" }
        );

        return { accessToken, refreshToken };
    }

    /**
     * Verify JWT token
     */
    static verifyToken(token: string, secret: string): JwtPayload {
        return jwt.verify(token, secret) as JwtPayload;
    }

    /**
     * Generate password reset token
     */
    static generatePasswordResetToken(user: UserType): string {
        return jwt.sign(
            {
                id: user.id.toString(),
                email: user.email,
                type: "password_reset",
                timestamp: Date.now(),
            },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "10m" }
        );
    }

    /**
     * Find or create user settings
     */
    static async findOrCreateUserSettings(userId: string): Promise<SettingsType> {
        let settingsDoc: any = await Settings.findById(userId);

        if (!settingsDoc) {
            settingsDoc = await Settings.create({
                userId: new Types.ObjectId(userId),
                monthlyReports: false,
                expenseReminders: false,
                billsAndBudgetsAlert: false,
                expenseReminderTime: "18:00",
            });
        }

        return {
            userId: settingsDoc.userId,
            monthlyReports: settingsDoc.monthlyReports,
            expenseReminders: settingsDoc.expenseReminders,
            billsAndBudgetsAlert: settingsDoc.billsAndBudgetsAlert,
            expenseReminderTime: settingsDoc.expenseReminderTime,
        };
    }

    /**
     * Find user settings by user ID
     */
    static async findUserSettings(userId: string): Promise<SettingsType | null> {
        const settingsDoc: any = await Settings.findById(userId);

        if (!settingsDoc) {
            return null;
        }

        return {
            userId: settingsDoc.userId,
            monthlyReports: settingsDoc.monthlyReports,
            expenseReminders: settingsDoc.expenseReminders,
            billsAndBudgetsAlert: settingsDoc.billsAndBudgetsAlert,
            expenseReminderTime: settingsDoc.expenseReminderTime,
        };
    }

    /**
     * Create user settings
     */
    static async createUserSettings(userId: string): Promise<SettingsType> {
        const settingsDoc = await Settings.create({
            userId: new Types.ObjectId(userId),
            monthlyReports: false,
            expenseReminders: false,
            billsAndBudgetsAlert: false,
            expenseReminderTime: "18:00",
        });

        return {
            userId: settingsDoc.userId.toString(),
            monthlyReports: settingsDoc.monthlyReports,
            expenseReminders: settingsDoc.expenseReminders,
            billsAndBudgetsAlert: settingsDoc.billsAndBudgetsAlert,
            expenseReminderTime: settingsDoc.expenseReminderTime,
        };
    }
}
