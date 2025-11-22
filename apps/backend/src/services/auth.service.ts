import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
    AuthResponse,
    ForgotPasswordRequest,
    JwtPayload,
    PasswordResponse,
    RefreshTokenResponse,
    RegisterCredentials,
    ResetPasswordRequest,
    SettingsType,
    UserLocalType,
    UserType,
} from "@expense-tracker/shared-types";
import sgMail, { type MailDataRequired } from "@sendgrid/mail";
import { format, isValid } from "date-fns";
import dotenv from "dotenv";
import { s3Client } from "../config/s3Client";
import { AuthDAO } from "../daos/auth.dao";
//import { createErrorResponse } from "./error.service";
import { ApiError } from "@expense-tracker/shared-types";

dotenv.config();
const AWS_BUCKET_NAME =
    process.env.AWS_BUCKET_NAME ||
    (() => {
        throw new Error("AWS_BUCKET_NAME environment variable is required");
    })();

export class AuthService {
    // Generate tokens - now using AuthDAO
    generateTokens(user: UserType): { accessToken: string; refreshToken: string } {
        return AuthDAO.generateToken(user, "auth") as {
            accessToken: string;
            refreshToken: string;
        };
    }

    // Register user
    async register(credentials: RegisterCredentials): Promise<AuthResponse | ApiError> {
        const { email, name, password } = credentials;

        const user: UserType = await AuthDAO.createUser({
            email,
            name,
            password,
        });

        // Auto-login after registration - generate tokens
        const { accessToken, refreshToken } = this.generateTokens(user);

        // Get user settings
        const userId = (user as any)._id?.toString() || user.id;
        const settings: SettingsType | null = await AuthDAO.findOrCreateUserSettings(userId);

        return {
            accessToken,
            refreshToken,
            user: {
                id: userId,
                email: user.email,
                name: user.name || "",
                profilePicture: "",
                phoneNumber: user.phoneNumber || "",
                dateOfBirth: user.dateOfBirth && isValid(new Date(user.dateOfBirth)) ? format(new Date(user.dateOfBirth), "dd/MM/yyyy") : "",
                currency: user.currency || "",
                currencySymbol: user.currencySymbol || "",
                country: user.country || "",
                timezone: user.timezone || "",
                hasCompletedOnboarding: user.hasCompletedOnboarding || false,
                settings: {
                    monthlyReports: settings?.monthlyReports || false,
                    expenseReminders: settings?.expenseReminders || false,
                    billsAndBudgetsAlert: settings?.billsAndBudgetsAlert || false,
                    expenseReminderTime: settings?.expenseReminderTime || "18:00",
                },
            },
        };
    }

    // Process login and generate response
    async processLogin(user: UserLocalType | UserType): Promise<AuthResponse> {
        // Generate tokens - cast to MongooseUserDocument for token generation
        const userDoc: UserType = user;

        // Ensure user.id is properly set (handle both _id and id cases)
        const userId = (user as any)._id?.toString() || user.id || (user as any).id?.toString();
        if (!userId) {
            throw new Error("User ID is missing");
        }

        const { accessToken, refreshToken } = this.generateTokens(userDoc);

        let profilePictureUrl = "";
        if (user.profilePicture) {
            try {
                const getCommand: GetObjectCommand = new GetObjectCommand({
                    Bucket: AWS_BUCKET_NAME,
                    Key: user.profilePicture,
                });
                profilePictureUrl = await getSignedUrl(s3Client, getCommand, {
                    expiresIn: 30,
                });
            } catch (s3Error) {
                console.error("Error generating S3 signed URL:", s3Error);
                // Continue without profile picture URL if S3 fails
                profilePictureUrl = "";
            }
        }

        // Always fetch or create settings
        const settings: SettingsType | null = await AuthDAO.findOrCreateUserSettings(userId);
        if (!settings) {
            throw new Error("Failed to fetch or create settings");
        }

        return {
            accessToken,
            refreshToken,
            user: {
                id: userId,
                email: user.email,
                name: user.name || "",
                profilePicture: profilePictureUrl,
                phoneNumber: user.phoneNumber || "",
                dateOfBirth: user.dateOfBirth && isValid(new Date(user.dateOfBirth)) ? format(new Date(user.dateOfBirth), "dd/MM/yyyy") : "",
                currency: user.currency || "",
                currencySymbol: user.currencySymbol || "",
                country: user.country || "",
                timezone: user.timezone || "",
                hasCompletedOnboarding: user.hasCompletedOnboarding || false,
                settings: {
                    monthlyReports: settings.monthlyReports || false,
                    expenseReminders: settings.expenseReminders || false,
                    billsAndBudgetsAlert: settings.billsAndBudgetsAlert || false,
                    expenseReminderTime: settings.expenseReminderTime || "18:00",
                },
            },
        };
    }

    // Process Google auth callback
    async processGoogleAuthCallback(reqUser: any): Promise<{ tokens: string }> {
        const response = reqUser as
            | AuthResponse
            | (Record<string, any> & {
                  accessToken?: string;
                  refreshToken?: string;
              });

        // Support both shapes: { accessToken, refreshToken, user: {...} } OR a flattened user document with tokens
        const flat = response as Record<string, any>;
        const nestedUser = (response as AuthResponse)?.user;
        const userId = nestedUser?.id || flat?.id || flat?._id || "";

        // Fetch or create settings only if we have a valid user id
        const settings: SettingsType | null = userId ? await AuthDAO.findOrCreateUserSettings(userId) : null;

        const tokens: string = encodeURIComponent(
            JSON.stringify({
                accessToken: (response as AuthResponse)?.accessToken || flat?.accessToken || "",
                refreshToken: (response as AuthResponse)?.refreshToken || flat?.refreshToken || "",
                user: {
                    id: userId || undefined,
                    email: nestedUser?.email || flat?.email || "",
                    name: nestedUser?.name || flat?.name || "",
                    profilePicture: nestedUser?.profilePicture || flat?.profilePicture || "",
                    phoneNumber: nestedUser?.phoneNumber || flat?.phoneNumber || "",
                    dateOfBirth: (nestedUser?.dateOfBirth || flat?.dateOfBirth) && isValid(new Date(nestedUser?.dateOfBirth || flat?.dateOfBirth)) ? format(new Date(nestedUser?.dateOfBirth || flat?.dateOfBirth), "dd/MM/yyyy") : "",
                    currency: nestedUser?.currency || flat?.currency || "",
                    currencySymbol: nestedUser?.currencySymbol || flat?.currencySymbol || "",
                    country: nestedUser?.country || flat?.country || "",
                    timezone: nestedUser?.timezone || flat?.timezone || "",
                    hasCompletedOnboarding: nestedUser?.hasCompletedOnboarding || flat?.hasCompletedOnboarding || false,
                    settings,
                },
            })
        );

        return { tokens };
    }

    // Refresh token
    async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
        if (!refreshToken) {
            throw new Error("Refresh token required");
        }

        // Verify refresh token
        const decoded: JwtPayload = AuthDAO.verifyToken(
            refreshToken,
            process.env.JWT_REFRESH_SECRET ||
                (() => {
                    throw new Error("JWT_REFRESH_SECRET environment variable is required");
                })()
        );

        // Find user
        const user: UserType | null = await AuthDAO.findUserById(decoded.id);
        if (!user) {
            throw new Error("Invalid refresh token");
        }

        // Generate new tokens - cast to MongooseUserDocument for token generation
        const userDoc: UserType = user;
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = this.generateTokens(userDoc);

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    }

    // Logout (business logic is minimal, mostly handled by controller)
    async logout(): Promise<{ success: boolean; message: string }> {
        return {
            success: true,
            message: "Successfully logged out",
        };
    }

    // Forgot password
    async forgotPassword(request: ForgotPasswordRequest): Promise<PasswordResponse> {
        const { email } = request;

        if (!email) {
            throw new Error("Email is required");
        }

        // Check if user exists in our database
        const user: UserType | null = await AuthDAO.findUserByEmail(email);
        if (!user) {
            throw new Error("No account found with this email address.");
        }

        // Generate a stateless reset token with user info embedded
        const resetToken: string = AuthDAO.generateToken(user, "password_reset") as string;

        // Create the reset URL
        const resetUrl: string = `${
            process.env.FRONTEND_URL ||
            (() => {
                throw new Error("FRONTEND_URL environment variable is required");
            })()
        }/reset-password?token=${resetToken}`;

        // Send email using SendGrid
        const sendgridApiKey: string | undefined = process.env.SENDGRID_API_KEY;
        let fromEmail: string =
            process.env.SENDGRID_FROM_EMAIL ||
            (() => {
                throw new Error("SENDGRID_FROM_EMAIL environment variable is required");
            })();

        if (!sendgridApiKey) {
            console.error("Forgot password error: SENDGRID_API_KEY is not configured");
            throw new Error("Email service is not configured.");
        }

        if (!fromEmail) {
            if (process.env.NODE_ENV === "production") {
                console.error("Forgot password error: SENDGRID_FROM_EMAIL is not configured");
                throw new Error("Email service sender is not configured.");
            } else {
                // Use a safe placeholder sender in development (with sandbox mode enabled below)
                fromEmail = "no-reply@example.com";
            }
        }

        sgMail.setApiKey(sendgridApiKey);

        const msg: MailDataRequired = {
            to: email,
            from: fromEmail,
            subject: "Password Reset Request",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello ${user.name || "there"},</p>
          <p>You requested a password reset for your account. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 10 minutes.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      `,
        };

        // Enable sandbox mode for non-production environments to avoid actual sends when testing
        if (process.env.NODE_ENV !== "production") {
            (msg as any).mailSettings = { sandboxMode: { enable: true } };
        }

        await sgMail.send(msg);

        return {
            success: true,
            message: "Password reset email sent successfully. Please check your email.",
        };
    }

    // Reset password
    async resetPassword(request: ResetPasswordRequest): Promise<PasswordResponse> {
        const { token, newPassword } = request;

        if (!token || !newPassword) {
            throw new Error("Token and new password are required");
        }

        // Verify the reset token
        const decoded: JwtPayload = AuthDAO.verifyToken(
            token,
            process.env.JWT_SECRET ||
                (() => {
                    throw new Error("JWT_SECRET environment variable is required");
                })()
        );

        // Verify it's a password reset token
        if (decoded.type !== "password_reset") {
            throw new Error("Invalid token type");
        }

        // Check if token is not too old (additional security)
        if (decoded.timestamp) {
            const tokenAge: number = Date.now() - decoded.timestamp;
            const maxAge: number = 600000; // 10 minutes in milliseconds (matching JWT expiration)
            if (tokenAge > maxAge) {
                throw new Error("Reset token has expired");
            }
        }

        // Find user by ID and email
        const user: UserType | null = await AuthDAO.findUserByEmail(decoded.email || "");

        if (!user) {
            throw new Error("User not found");
        }

        // Hash the new password
        const hashedPassword: string = AuthDAO.hashPassword(newPassword);

        // Update user's password using findOneAndUpdate to avoid validation issues
        const updatedUser: UserType | null = await AuthDAO.updateUserPassword(decoded.id, hashedPassword);

        if (!updatedUser) {
            throw new Error("Failed to update password");
        }

        return {
            success: true,
            message: "Password reset successfully",
        };
    }

    // Change password
    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<PasswordResponse> {
        if (!currentPassword || !newPassword) {
            throw new Error("Current password and new password are required");
        }

        // Find user and verify current password
        const userDoc: UserType | null = await AuthDAO.findUserById(userId);
        if (!userDoc) {
            throw new Error("User not found");
        }

        // Verify current password
        const isCurrentPasswordValid: boolean = await AuthDAO.verifyPassword(currentPassword, userDoc.password);
        if (!isCurrentPasswordValid) {
            throw new Error("Current password is incorrect");
        }

        // Check if new password is different from current password
        const isNewPasswordSame: boolean = await AuthDAO.verifyPassword(newPassword, userDoc.password);
        if (isNewPasswordSame) {
            throw new Error("New password must be different from current password");
        }

        // Hash the new password
        const hashedNewPassword: string = AuthDAO.hashPassword(newPassword);

        // Update user's password
        const updatedUser: UserType | null = await AuthDAO.updateUserPassword(userId, hashedNewPassword);

        if (!updatedUser) {
            throw new Error("Failed to update password");
        }

        return {
            success: true,
            message: "Password changed successfully",
        };
    }
}
