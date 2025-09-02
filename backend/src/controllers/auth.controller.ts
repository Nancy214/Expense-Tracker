import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import passport from "passport";
import { User, Settings } from "../models/user.model";
import {
    AuthRequest,
    UserGoogleType,
    UserLocalType,
    TokenPayload,
    RegisterRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    JwtPayload,
    UserDocument,
    SettingsDocument,
    AuthenticatedUser,
    LoginResponse,
    RefreshTokenResponse,
    LogoutResponse,
    ForgotPasswordResponse,
    ResetPasswordResponse,
    ChangePasswordResponse,
    RegisterResponse,
    MongooseUserDocument,
} from "../types/auth";
import bcrypt from "bcrypt";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { s3Client } from "../config/s3Client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sgMail, { MailDataRequired } from "@sendgrid/mail";
import crypto from "crypto";
import { Types } from "mongoose";

dotenv.config();
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || "";

// Generate tokens
export const generateTokens = (user: MongooseUserDocument): { accessToken: string; refreshToken: string } => {
    const accessToken = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET || "your-secret-key", {
        expiresIn: "15m",
    });

    const refreshToken = jwt.sign(
        { id: user._id.toString() },
        process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
        { expiresIn: "7d" }
    );

    return { accessToken, refreshToken };
};

export const register = async (
    req: Request<{}, RegisterResponse, RegisterRequest> & { file?: Express.Multer.File },
    res: Response<RegisterResponse>
): Promise<void> => {
    try {
        const { email, password, name } = req.body;
        let profilePictureName = "";

        // Check if user exists
        const existingUser: UserDocument | null = await User.findOne({ email });
        if (existingUser) {
            //console.log("User already exists");
            res.status(400).json({ message: "User already exists" });
            return;
        }

        if (req.file) {
            profilePictureName = crypto.createHash("sha256").update(req.file.originalname).digest("hex");
            const uploadCommand: PutObjectCommand = new PutObjectCommand({
                Bucket: AWS_BUCKET_NAME,
                Key: profilePictureName,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            });

            await s3Client.send(uploadCommand);
        }

        const user = new User({
            email,
            password: bcrypt.hashSync(password, 10),
            name,
            profilePicture: profilePictureName,
        });

        await user.save();

        res.status(200).json({ message: "User registered successfully" });
    } catch (error: unknown) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Internal server error during registration" });
    }
};

export const login = (req: Request, res: Response, next: NextFunction): void => {
    passport.authenticate(
        "local",
        { session: false },
        async (err: Error | null, user: UserLocalType | UserGoogleType | false, info: { message: string }) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                res.status(401).json({ message: info.message });
                return;
            }

            // Generate tokens - cast to MongooseUserDocument for token generation
            const userDoc = user as MongooseUserDocument;
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
            let settingsDoc: SettingsDocument | null = await Settings.findById(user._id);
            if (!settingsDoc) {
                settingsDoc = (await Settings.create({
                    userId: new Types.ObjectId(user._id),
                    monthlyReports: false,
                    expenseReminders: false,
                    billsAndBudgetsAlert: false,
                    expenseReminderTime: "18:00",
                })) as SettingsDocument;
            }

            const loginResponse: LoginResponse = {
                accessToken,
                refreshToken,
                user: {
                    id: new Types.ObjectId(user._id),
                    email: user.email,
                    name: user.name || "",
                    profilePicture: profilePictureUrl,
                    currency: user.currency,
                    settings: settingsDoc,
                },
            };

            res.status(200).json(loginResponse);
        }
    )(req, res, next);
};

export const googleAuthCallback = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as AuthenticatedUser;

        // Fetch or create settings
        let settingsDoc: SettingsDocument | null = await Settings.findById(user._id);
        if (!settingsDoc) {
            settingsDoc = (await Settings.create({
                userId: user._id,
                monthlyReports: false,
                expenseReminders: false,
                billsAndBudgetsAlert: false,
                expenseReminderTime: "18:00",
            })) as SettingsDocument;
        }

        const tokens: string = encodeURIComponent(
            JSON.stringify({
                accessToken: user?.accessToken,
                refreshToken: user?.refreshToken,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name || "",
                    profilePicture: user.profilePicture || "",
                    settings: settingsDoc,
                },
            })
        );

        res.redirect(`http://localhost:3000/auth/google/callback?tokens=${tokens}`);
    } catch (error: unknown) {
        console.error("Google auth callback error:", error);
        res.status(500).json({ message: "Internal server error during Google authentication" });
    }
};

export const refreshToken = async (
    req: Request<{}, RefreshTokenResponse, { refreshToken: string }>,
    res: Response<RefreshTokenResponse>
): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(401).json({ message: "Refresh token required", accessToken: "", refreshToken: "" });
            return;
        }

        // Verify refresh token
        const decoded: JwtPayload = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key"
        ) as JwtPayload;

        // Find user
        const user: UserDocument | null = await User.findById(decoded.id);
        if (!user) {
            res.status(401).json({ message: "Invalid refresh token", accessToken: "", refreshToken: "" });
            return;
        }

        // Generate new tokens - cast to MongooseUserDocument for token generation
        const userDoc = user as MongooseUserDocument;
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(userDoc);

        const refreshResponse: RefreshTokenResponse = {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };

        res.json(refreshResponse);
    } catch (error: unknown) {
        console.error("Refresh token error:", error);
        res.status(401).json({ message: "Invalid refresh token", accessToken: "", refreshToken: "" });
    }
};

export const logout = async (req: AuthRequest, res: Response<LogoutResponse>): Promise<void> => {
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

        const logoutResponse: LogoutResponse = {
            success: true,
            message: "Successfully logged out",
        };

        res.status(200).json(logoutResponse);
    } catch (error: unknown) {
        console.error("Logout error:", error);
        // Even if there's an error, we still want to send a success response
        // since the client will clear tokens anyway
        const logoutResponse: LogoutResponse = {
            success: true,
            message: "Successfully logged out",
        };
        res.status(200).json(logoutResponse);
    }
};

export const forgotPassword = async (
    req: Request<{}, ForgotPasswordResponse, ForgotPasswordRequest>,
    res: Response<ForgotPasswordResponse>
): Promise<void> => {
    const { email } = req.body;

    if (!email) {
        res.status(400).json({ message: "Email is required" });
        return;
    }

    try {
        // Check if user exists in our database
        const user: UserDocument | null = await User.findOne({ email });
        if (!user) {
            res.status(400).json({
                message: "No account found with this email address.",
            });
            return;
        }

        // Generate a stateless reset token with user info embedded
        const resetToken: string = jwt.sign(
            {
                id: user._id.toString(),
                email: user.email,
                type: "password_reset",
                timestamp: Date.now(),
            },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "10m" }
        );

        // Create the reset URL
        const resetUrl: string = `${
            process.env.FRONTEND_URL || "http://localhost:3000"
        }/reset-password?token=${resetToken}`;

        // Send email using SendGrid
        sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

        const msg: MailDataRequired = {
            to: email,
            from: "nancypro2000@gmail.com",
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

        await sgMail.send(msg);

        const forgotPasswordResponse: ForgotPasswordResponse = {
            message: "Password reset email sent successfully. Please check your email.",
        };

        res.status(200).json(forgotPasswordResponse);
    } catch (error: unknown) {
        console.error("Error sending reset email:", error);

        const forgotPasswordResponse: ForgotPasswordResponse = {
            message: "Failed to send reset email. Please try again later.",
        };

        res.status(500).json(forgotPasswordResponse);
    }
};

export const resetPassword = async (
    req: Request<{}, ResetPasswordResponse, ResetPasswordRequest>,
    res: Response<ResetPasswordResponse>
): Promise<void> => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        res.status(400).json({
            message: "Token and new password are required",
        });
        return;
    }

    try {
        // Verify the reset token
        const decoded: JwtPayload = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as JwtPayload;

        // Verify it's a password reset token
        if (decoded.type !== "password_reset") {
            res.status(400).json({
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
                    message: "Reset token has expired",
                });
                return;
            }
        }

        // Find user by ID and email
        const user: UserDocument | null = await User.findOne({
            _id: decoded.id,
            email: decoded.email,
        });

        if (!user) {
            res.status(400).json({
                message: "User not found",
            });
            return;
        }

        // Hash the new password
        const hashedPassword: string = bcrypt.hashSync(newPassword, 10);

        // Update user's password using findOneAndUpdate to avoid validation issues
        const updatedUser: UserDocument | null = await User.findOneAndUpdate(
            { _id: decoded.id },
            { password: hashedPassword },
            { new: true, runValidators: false }
        );

        if (!updatedUser) {
            res.status(500).json({
                message: "Failed to update password",
            });
            return;
        }

        const resetPasswordResponse: ResetPasswordResponse = {
            message: "Password reset successfully",
        };

        res.status(200).json(resetPasswordResponse);
    } catch (error: unknown) {
        console.error("Password reset error:", error);

        const resetPasswordResponse: ResetPasswordResponse = {
            message: "Failed to reset password. Please try again.",
        };

        res.status(500).json(resetPasswordResponse);
    }
};

export const changePassword = async (req: AuthRequest, res: Response<ChangePasswordResponse>): Promise<void> => {
    try {
        const user: TokenPayload | undefined = req.user;
        const userId: string | undefined = user?.id;

        if (!userId) {
            res.status(401).json({ message: "User not authenticated", success: false });
            return;
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({
                message: "Current password and new password are required",
                success: false,
            });
            return;
        }

        // Find user and verify current password
        const userDoc: UserDocument | null = await User.findById(userId);
        if (!userDoc) {
            res.status(404).json({ message: "User not found", success: false });
            return;
        }

        // Verify current password
        const isCurrentPasswordValid: boolean = bcrypt.compareSync(currentPassword, userDoc.password);
        if (!isCurrentPasswordValid) {
            res.status(400).json({ message: "Current password is incorrect", success: false });
            return;
        }

        // Check if new password is different from current password
        const isNewPasswordSame: boolean = bcrypt.compareSync(newPassword, userDoc.password);
        if (isNewPasswordSame) {
            res.status(400).json({
                message: "New password must be different from current password",
                success: false,
            });
            return;
        }

        // Hash the new password
        const hashedNewPassword: string = bcrypt.hashSync(newPassword, 10);

        // Update user's password
        const updatedUser: UserDocument | null = await User.findByIdAndUpdate(
            userId,
            { password: hashedNewPassword },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            res.status(500).json({ message: "Failed to update password", success: false });
            return;
        }

        const changePasswordResponse: ChangePasswordResponse = {
            success: true,
            message: "Password changed successfully",
        };

        res.status(200).json(changePasswordResponse);
    } catch (error: unknown) {
        console.error("Change password error:", error);

        const changePasswordResponse: ChangePasswordResponse = {
            message: "Failed to change password. Please try again.",
            success: false,
        };

        res.status(500).json(changePasswordResponse);
    }
};
