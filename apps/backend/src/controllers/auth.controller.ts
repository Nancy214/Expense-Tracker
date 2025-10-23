import { Request, Response, NextFunction } from "express";
import passport from "passport";
import {
	UserLocalType,
	TokenPayload,
	ResetPasswordRequest,
	JwtPayload,
	UserType,
	SettingsType,
	RefreshTokenResponse,
	PasswordResponse,
	RegisterCredentials,
	AuthResponse,
	ForgotPasswordRequest,
} from "@expense-tracker/shared-types/src";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { s3Client } from "../config/s3Client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sgMail, { MailDataRequired } from "@sendgrid/mail";
import { AuthDAO } from "../daos/auth.dao";

dotenv.config();
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || "";

// Generate tokens - now using AuthDAO
export const generateTokens = (user: UserType): { accessToken: string; refreshToken: string } => {
	return AuthDAO.generateToken(user, "auth") as {
		accessToken: string;
		refreshToken: string;
	};
};

export const register = async (
	req: Request<{}, AuthResponse, RegisterCredentials>,
	res: Response<AuthResponse>
): Promise<void> => {
	try {
		const { email, name, password } = req.body;

		const user: UserType = await AuthDAO.createUser({
			email,
			name,
			password,
		});

		res.status(200).json({ message: "User registered successfully", user });
	} catch (error: unknown) {
		console.error("Registration error:", error);
		res.status(500).json({
			message: "Internal server error during registration",
		});
	}
};

export const login = (req: Request, res: Response, next: NextFunction): void => {
	passport.authenticate(
		"local",
		{ session: false },
		async (err: Error | null, user: UserLocalType | UserType | false, info: { message: string }) => {
			if (err) {
				return next(err);
			}
			if (!user) {
				res.status(401).json({ message: info.message });
				return;
			}

			// Generate tokens - cast to MongooseUserDocument for token generation
			const userDoc: UserType = user;
			const { accessToken, refreshToken } = generateTokens(userDoc);

			let profilePictureUrl = "";
			if (user.profilePicture) {
				const getCommand: GetObjectCommand = new GetObjectCommand({
					Bucket: AWS_BUCKET_NAME,
					Key: user.profilePicture,
				});
				profilePictureUrl = await getSignedUrl(s3Client, getCommand, {
					expiresIn: 30,
				});
			}

			// Always fetch or create settings
			const settings: SettingsType | null = await AuthDAO.findOrCreateUserSettings(user.id);
			if (!settings) {
				res.status(500).json({
					message: "Failed to fetch or create settings",
				});
				return;
			}

			const loginResponse: AuthResponse = {
				accessToken,
				refreshToken,
				user: {
					id: user.id,
					email: user.email,
					name: user.name || "",
					profilePicture: profilePictureUrl,
					phoneNumber: user.phoneNumber || "",
					dateOfBirth: user.dateOfBirth || "",
					currency: user.currency || "",
					country: user.country || "",
					timezone: user.timezone || "",
					settings: {
						monthlyReports: settings.monthlyReports || false,
						expenseReminders: settings.expenseReminders || false,
						billsAndBudgetsAlert: settings.billsAndBudgetsAlert || false,
						expenseReminderTime: settings.expenseReminderTime || "18:00",
					},
				},
			};

			res.status(200).json(loginResponse);
		}
	)(req, res, next);
};

export const googleAuthCallback = async (req: Request, res: Response): Promise<void> => {
	try {
		const response = req.user as
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
					dateOfBirth: nestedUser?.dateOfBirth || flat?.dateOfBirth || "",
					currency: nestedUser?.currency || flat?.currency || "",
					country: nestedUser?.country || flat?.country || "",
					timezone: nestedUser?.timezone || flat?.timezone || "",
					settings,
				},
			})
		);

		res.redirect(`http://localhost:3000/auth/google/callback?tokens=${tokens}`);
	} catch (error: unknown) {
		console.error("Google auth callback error:", error);
		res.status(500).json({
			message: "Internal server error during Google authentication",
		});
	}
};

export const refreshToken = async (
	req: Request<{}, RefreshTokenResponse, { refreshToken: string }>,
	res: Response<RefreshTokenResponse>
): Promise<void> => {
	try {
		const { refreshToken } = req.body;

		if (!refreshToken) {
			res.status(401).json({
				message: "Refresh token required",
				accessToken: "",
				refreshToken: "",
			});
			return;
		}

		// Verify refresh token
		const decoded: JwtPayload = AuthDAO.verifyToken(
			refreshToken,
			process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key"
		);

		// Find user
		const user: UserType | null = await AuthDAO.findUserById(decoded.id);
		if (!user) {
			res.status(401).json({
				message: "Invalid refresh token",
				accessToken: "",
				refreshToken: "",
			});
			return;
		}

		// Generate new tokens - cast to MongooseUserDocument for token generation
		const userDoc: UserType = user;
		const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(userDoc);

		const refreshResponse: RefreshTokenResponse = {
			accessToken: newAccessToken,
			refreshToken: newRefreshToken,
		};

		res.json(refreshResponse);
	} catch (error: unknown) {
		console.error("Refresh token error:", error);
		res.status(401).json({
			message: "Invalid refresh token",
			accessToken: "",
			refreshToken: "",
		});
	}
};

export const logout = async (req: Request, res: Response<{ success: boolean; message: string }>): Promise<void> => {
	try {
		// Clear any auth cookies
		res.clearCookie("connect.sid"); // Clear session cookie
		res.clearCookie("accessToken"); // Clear JWT token if using cookies

		// Only try session operations if session exists
		if (req.session) {
			// Try to destroy session first
			req.session.destroy((err) => {
				if (err) {
					console.error("Error destroying session:", err);
				}
			});
		}

		// Try Passport logout if available and session exists
		if (req.logout && req.session) {
			req.logout((err) => {
				if (err) {
					console.error("Error during Passport logout:", err);
				}
			});
		}

		const logoutResponse: { success: boolean; message: string } = {
			success: true,
			message: "Successfully logged out",
		};

		res.status(200).json(logoutResponse);
	} catch (error: unknown) {
		console.error("Logout error:", error);
		// Even if there's an error, we still want to send a success response
		// since the client will clear tokens anyway
		const logoutResponse: { success: boolean; message: string } = {
			success: true,
			message: "Successfully logged out",
		};
		res.status(200).json(logoutResponse);
	}
};

export const forgotPassword = async (
	req: Request<{}, PasswordResponse, ForgotPasswordRequest>,
	res: Response<PasswordResponse>
): Promise<void> => {
	const { email } = req.body;

	if (!email) {
		res.status(400).json({ success: false, message: "Email is required" });
		return;
	}

	try {
		// Check if user exists in our database
		const user: UserType | null = await AuthDAO.findUserByEmail(email);
		if (!user) {
			res.status(400).json({
				success: false,
				message: "No account found with this email address.",
			});
			return;
		}

		// Generate a stateless reset token with user info embedded
		const resetToken: string = AuthDAO.generateToken(user, "password_reset") as string;

		// Create the reset URL
		const resetUrl: string = `${
			process.env.FRONTEND_URL || "http://localhost:3000"
		}/reset-password?token=${resetToken}`;

		// Send email using SendGrid
		const sendgridApiKey: string | undefined = process.env.SENDGRID_API_KEY;
		let fromEmail: string = process.env.SENDGRID_FROM_EMAIL || "";

		if (!sendgridApiKey) {
			console.error("Forgot password error: SENDGRID_API_KEY is not configured");
			res.status(500).json({
				success: false,
				message: "Email service is not configured.",
			});
			return;
		}

		if (!fromEmail) {
			if (process.env.NODE_ENV === "production") {
				console.error("Forgot password error: SENDGRID_FROM_EMAIL is not configured");
				res.status(500).json({
					success: false,
					message: "Email service sender is not configured.",
				});
				return;
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

		const forgotPasswordResponse: PasswordResponse = {
			success: true,
			message: "Password reset email sent successfully. Please check your email.",
		};

		res.status(200).json(forgotPasswordResponse);
	} catch (error: unknown) {
		// Provide clearer diagnostics for SendGrid failures
		const err = error as any;
		const code = err?.code as number | undefined;
		const sgBody = err?.response?.body;
		if (code === 401 || code === 403) {
			console.error("SendGrid auth error:", { code, body: sgBody });
			res.status(500).json({
				success: false,
				message: "Email service unauthorized. Check SENDGRID_API_KEY and sender verification.",
			});
			return;
		}

		console.error("Error sending reset email:", err);
		res.status(500).json({
			success: false,
			message: "Failed to send reset email. Please try again later.",
		});
	}
};

export const resetPassword = async (
	req: Request<{}, PasswordResponse, ResetPasswordRequest>,
	res: Response<PasswordResponse>
): Promise<void> => {
	const { token, newPassword } = req.body;

	if (!token || !newPassword) {
		res.status(400).json({
			success: false,
			message: "Token and new password are required",
		});
		return;
	}

	try {
		// Verify the reset token
		const decoded: JwtPayload = AuthDAO.verifyToken(token, process.env.JWT_SECRET || "your-secret-key");

		// Verify it's a password reset token
		if (decoded.type !== "password_reset") {
			res.status(400).json({
				success: false,
				message: "Invalid token type",
			});
			return;
		}

		// Check if token is not too old (additional security)
		if (decoded.timestamp) {
			const tokenAge: number = Date.now() - decoded.timestamp;
			const maxAge: number = 600000; // 10 minutes in milliseconds (matching JWT expiration)
			if (tokenAge > maxAge) {
				res.status(400).json({
					success: false,
					message: "Reset token has expired",
				});
				return;
			}
		}

		// Find user by ID and email
		const user: UserType | null = await AuthDAO.findUserByEmail(decoded.email || "");

		if (!user) {
			res.status(400).json({
				success: false,
				message: "User not found",
			});
			return;
		}

		// Hash the new password
		const hashedPassword: string = AuthDAO.hashPassword(newPassword);

		// Update user's password using findOneAndUpdate to avoid validation issues
		const updatedUser: UserType | null = await AuthDAO.updateUserPassword(decoded.id, hashedPassword);

		if (!updatedUser) {
			res.status(500).json({
				success: false,
				message: "Failed to update password",
			});
			return;
		}

		const resetPasswordResponse: PasswordResponse = {
			success: true,
			message: "Password reset successfully",
		};

		res.status(200).json(resetPasswordResponse);
	} catch (error: unknown) {
		console.error("Password reset error:", error);

		const resetPasswordResponse: PasswordResponse = {
			success: false,
			message: "Failed to reset password. Please try again.",
		};

		res.status(500).json(resetPasswordResponse);
	}
};

export const changePassword = async (req: Request, res: Response<PasswordResponse>): Promise<void> => {
	try {
		const user = req.user as TokenPayload | undefined;
		const userId: string | undefined = user?.id;

		if (!userId) {
			res.status(401).json({
				success: false,
				message: "User not authenticated",
			});
			return;
		}

		const { currentPassword, newPassword } = req.body;

		if (!currentPassword || !newPassword) {
			res.status(400).json({
				success: false,
				message: "Current password and new password are required",
			});
			return;
		}

		// Find user and verify current password
		const userDoc: UserType | null = await AuthDAO.findUserById(userId);
		if (!userDoc) {
			res.status(404).json({ success: false, message: "User not found" });
			return;
		}

		// Verify current password
		const isCurrentPasswordValid: boolean = await AuthDAO.verifyPassword(currentPassword, userDoc.password);
		if (!isCurrentPasswordValid) {
			res.status(400).json({
				success: false,
				message: "Current password is incorrect",
			});
			return;
		}

		// Check if new password is different from current password
		const isNewPasswordSame: boolean = await AuthDAO.verifyPassword(newPassword, userDoc.password);
		if (isNewPasswordSame) {
			res.status(400).json({
				success: false,
				message: "New password must be different from current password",
			});
			return;
		}

		// Hash the new password
		const hashedNewPassword: string = AuthDAO.hashPassword(newPassword);

		// Update user's password
		const updatedUser: UserType | null = await AuthDAO.updateUserPassword(userId, hashedNewPassword);

		if (!updatedUser) {
			res.status(500).json({
				success: false,
				message: "Failed to update password",
			});
			return;
		}

		const changePasswordResponse: PasswordResponse = {
			success: true,
			message: "Password changed successfully",
		};

		res.status(200).json(changePasswordResponse);
	} catch (error: unknown) {
		console.error("Change password error:", error);

		const changePasswordResponse: PasswordResponse = {
			message: "Failed to change password. Please try again.",
			success: false,
		};

		res.status(500).json(changePasswordResponse);
	}
};
