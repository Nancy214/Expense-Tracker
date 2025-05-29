import mongoose, { Schema } from "mongoose";
import { IUser } from "../types/auth";

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

export const User = mongoose.model<IUser>("User", userSchema);
