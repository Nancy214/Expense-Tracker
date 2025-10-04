import { User, Settings } from "../models/user.model";
import { UserType, SettingsType, RegisterCredentials, JwtPayload } from "@expense-tracker/shared-types/src/auth";
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
        let settingsDoc: any = await Settings.findByIdAndUpdate(
            userId,
            {
                monthlyReports: false,
                expenseReminders: false,
                billsAndBudgetsAlert: false,
                expenseReminderTime: "18:00",
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
            }
        );

        if (!settingsDoc) {
            return null;
        }

        return settingsDoc;
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
}
