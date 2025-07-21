import { Document, Schema } from "mongoose";
import { Request } from "express";
import multer from "multer";

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
  budget?: boolean;
  budgetType?: string;
}

export interface SettingsType {
  userId: Schema.Types.ObjectId;
  billsAndBudgetsAlert?: boolean;
  monthlyReports?: boolean;
  expenseReminders?: boolean;
}

export type UserLocalType = Omit<UserType, "googleId">;

export type UserGoogleType = UserType;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenPayload {
  id: string;
  email: string;
}

export interface AuthRequest extends Request {
  headers: {
    authorization?: string;
  };
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
