import { Document } from "mongoose";
import { Request } from "express";
import multer from "multer";

export interface UserType {
  email: string;
  name: string;
  profilePicture?: string;
  password: string;
  googleId?: string;
  accessToken?: string;
  refreshToken?: string;
  //refreshToken?: string;
}

export type UserLocalType = Pick<UserType, "email" | "password">;

export type UserGoogleType = Pick<
  UserType,
  "email" | "password" | "googleId" | "accessToken" | "refreshToken"
>;

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
