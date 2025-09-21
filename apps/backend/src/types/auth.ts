import { Document, Schema, Types } from "mongoose";
import { Request } from "express";

export interface UserType {
    _id: string;
    email: string;
    name: string;
    profilePicture?: string;
    password: string;
    googleId?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    currency?: string;
    country?: string;
    timezone?: string;
    budget?: boolean;
    budgetType?: string;
    settings?: SettingsType;
}

export interface SettingsType {
    userId: Schema.Types.ObjectId;
    monthlyReports?: boolean;
    expenseReminders?: boolean;
    billsAndBudgetsAlert?: boolean;
    expenseReminderTime?: string;
}

export type UserLocalType = Omit<UserType, "googleId">;

export type UserGoogleType = UserType;

export interface LoginRequest {
    email: string;
    password: string;
}

export interface TokenPayload {
    id: string;
    user: UserLocalType | UserGoogleType;
}

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface AuthResponse {
    user: UserLocalType | UserGoogleType;
    accessToken: string;
    refreshToken: string;
}

// New types for the auth controller
export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export interface JwtPayload {
    id: string;
    email?: string;
    type?: string;
    timestamp?: number;
}

export interface UserDocument extends Document {
    _id: Types.ObjectId;
    email: string;
    name: string;
    profilePicture?: string;
    password: string;
    googleId?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    currency?: string;
    country?: string;
    timezone?: string;
    budget?: boolean;
    budgetType?: string;
}

export interface SettingsDocument extends Document {
    userId: Types.ObjectId;
    monthlyReports: boolean;
    expenseReminders: boolean;
    billsAndBudgetsAlert: boolean;
    expenseReminderTime: string;
}

export interface AuthenticatedUser {
    _id: Types.ObjectId;
    email: string;
    name: string;
    profilePicture?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    currency?: string;
    country?: string;
    timezone?: string;
    accessToken?: string;
    refreshToken?: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: Types.ObjectId;
        email: string;
        name: string;
        profilePicture: string;
        phoneNumber?: string;
        dateOfBirth?: string;
        currency?: string;
        country?: string;
        timezone?: string;
        settings: SettingsDocument;
    };
}

export interface RefreshTokenResponse {
    accessToken: string;
    refreshToken: string;
    message?: string;
}

export interface LogoutResponse {
    success: boolean;
    message: string;
}

export interface ForgotPasswordResponse {
    message: string;
}

export interface ResetPasswordResponse {
    message: string;
}

export interface ChangePasswordResponse {
    success: boolean;
    message: string;
}

export interface RegisterResponse {
    message: string;
}

// Utility type for Mongoose documents that can be used with generateTokens
export type MongooseUserDocument = Document & {
    _id: Types.ObjectId | string;
    email: string;
    name: string;
    profilePicture?: string;
    password: string;
    googleId?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    currency?: string;
    country?: string;
    timezone?: string;
    budget?: boolean;
    budgetType?: string;
};
