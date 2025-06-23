import mongoose, { Schema } from "mongoose";
import { UserLocalType, UserGoogleType } from "../types/auth";

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
    required: false,
  },
  password: {
    type: String,
    required: true,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
});

export const User = mongoose.model<UserLocalType | UserGoogleType>(
  "User",
  userSchema
);
