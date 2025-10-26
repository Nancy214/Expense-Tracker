import type {
    AuthResponse,
    ForgotPasswordRequest,
    PasswordResponse,
    RefreshTokenResponse,
    RegisterCredentials,
    ResetPasswordRequest,
    TokenPayload,
    UserLocalType,
    UserType,
    ApiError,
} from "@expense-tracker/shared-types/src";
import type { NextFunction, Request, Response } from "express";
import passport from "passport";
import { AuthService } from "../services/auth.service";
import { logError } from "../services/error.service";
import { createErrorResponse } from "../services/error.service";

// Create service instance
const authService = new AuthService();

export const register = async (
    req: Request<{}, AuthResponse, RegisterCredentials>,
    res: Response<AuthResponse>
): Promise<void> => {
    try {
        const response = await authService.register(req.body);
        res.status(200).json(response);
    } catch (error: unknown) {
        logError("register", error);
        res.status(500).json(createErrorResponse("Internal server error during registration"));
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

            try {
                const loginResponse = await authService.processLogin(user);
                res.status(200).json(loginResponse);
            } catch (error: unknown) {
                logError("login", error);
                res.status(500).json(createErrorResponse("Failed to process login"));
            }
        }
    )(req, res, next);
};

export const googleAuthCallback = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tokens } = await authService.processGoogleAuthCallback(req.user);
        res.redirect(`http://localhost:3000/auth/google/callback?tokens=${tokens}`);
    } catch (error: unknown) {
        logError("googleAuthCallback", error);
        res.status(500).json(createErrorResponse("Internal server error during Google authentication"));
    }
};

export const refreshToken = async (
    req: Request<{}, RefreshTokenResponse, { refreshToken: string }>,
    res: Response<RefreshTokenResponse>
): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        const response = await authService.refreshToken(refreshToken);
        res.json(response);
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

        const logoutResponse = await authService.logout();
        res.status(200).json(logoutResponse);
    } catch (error: unknown) {
        logError("logout", error);
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
    try {
        const response = await authService.forgotPassword(req.body);
        res.status(200).json(response);
    } catch (error: unknown) {
        // Provide clearer diagnostics for SendGrid failures
        const err = error as ApiError;
        const message = err.message as string | undefined;
        logError("forgotPassword", error);
        res.status(500).json(createErrorResponse(message || "Failed to send reset email. Please try again later."));
    }
};

export const resetPassword = async (
    req: Request<{}, PasswordResponse, ResetPasswordRequest>,
    res: Response<PasswordResponse>
): Promise<void> => {
    try {
        const response = await authService.resetPassword(req.body);
        res.status(200).json(response);
    } catch (error: unknown) {
        logError("resetPassword", error);

        res.status(500).json(createErrorResponse("Failed to reset password. Please try again."));
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

        const response = await authService.changePassword(userId, currentPassword, newPassword);
        res.status(200).json(response);
    } catch (error: unknown) {
        logError("changePassword", error);

        res.status(500).json(createErrorResponse("Failed to change password. Please try again."));
    }
};
