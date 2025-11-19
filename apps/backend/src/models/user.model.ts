import type { UserLocalType, UserType } from "@expense-tracker/shared-types";
import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
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
        phoneNumber: {
            type: String,
            required: false,
        },
        dateOfBirth: {
            type: Date,
            required: false,
        },
        currency: {
            type: String,
            required: false,
            default: "INR",
        },
        currencySymbol: {
            type: String,
            required: false,
            default: "₹",
        },
        country: {
            type: String,
            required: false,
        },
        timezone: {
            type: String,
            required: false,
        },
        /* budget: {
            type: Boolean,
            required: false,
            default: false,
        },
        budgetType: {
            type: String,
            required: false,
            default: "monthly",
        }, */
        hasCompletedOnboarding: {
            type: Boolean,
            required: false,
            default: false,
        },
        onboardingCompletedAt: {
            type: Date,
            required: false,
        },
        onboardingStep: {
            type: Number,
            required: false,
            default: 0,
        },
        settings: {
            type: Schema.Types.Mixed,
            ref: "Settings",
            required: false,
        },
    },
    {
        versionKey: false,
    }
);

const settingsSchema = new Schema(
    {
        _id: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        billsAndBudgetsAlert: {
            type: Boolean,
            default: false,
        },
        monthlyReports: {
            type: Boolean,
            default: false,
        },
        expenseReminders: {
            type: Boolean,
            default: true,
        },
        expenseReminderTime: {
            type: String,
            default: "18:00",
        },
    },
    {
        versionKey: false,
    }
);

export const User = mongoose.model<UserLocalType | UserType>("User", userSchema);

export const Settings = mongoose.model("Settings", settingsSchema);
