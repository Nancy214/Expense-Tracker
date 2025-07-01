import mongoose, { Schema } from "mongoose";
import { UserLocalType, UserGoogleType } from "../types/auth";

const userSchema = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
  },
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
  budget: {
    type: Boolean,
    required: false,
    default: false,
  },
  budgetType: {
    type: String,
    required: false,
    default: "monthly",
  },
});

export const User = mongoose.model<UserLocalType | UserGoogleType>(
  "User",
  userSchema
);
