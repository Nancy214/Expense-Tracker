import mongoose, { Schema } from "mongoose";
import { UserLocalType, UserGoogleType } from "../types/auth";

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  googleId: {
    type: String,
    default: null,
    required: false,
  },
  accessToken: {
    type: String,
    default: null,
    required: false,
  },
  refreshToken: {
    type: String,
    default: null,
    required: false,
  },
});

export const User = mongoose.model<UserLocalType | UserGoogleType>(
  "User",
  userSchema
);
