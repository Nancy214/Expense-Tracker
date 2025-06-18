import mongoose, { Schema } from "mongoose";
import { UserType } from "../types/auth";

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
  refreshToken: {
    type: String,
    default: null,
  },
});

export const User = mongoose.model<UserType>("User", userSchema);
