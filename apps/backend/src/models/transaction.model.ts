import type { Transaction } from "@expense-tracker/shared-types";
import mongoose, { Schema } from "mongoose";

const TransactionSchema = new Schema(
    {
        date: {
            type: Date,
            required: true,
        },
        title: {
            type: String,
            required: false,
        },
        amount: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
        },
        category: {
            type: String,
            required: true,
        },
        currency: {
            type: String,
            default: "INR",
        },
        type: {
            type: String,
            enum: ["income", "expense"],
            default: "expense",
            required: true,
        },

        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        receipt: {
            type: String,
            default: "",
        },

        // Recurring fields
        isRecurring: {
            type: Boolean,
            default: false,
            index: true,
        },
        recurringFrequency: {
            type: String,
            enum: ["daily", "weekly", "monthly", "quarterly", "yearly"],
            // Only set if isRecurring = true
        },

        recurringEndDate: {
            type: Date,
            // Optional: when to stop creating recurring transactions
        },
        recurringActive: {
            type: Boolean,
            default: true,
            // User can pause/resume recurring transactions
        },
        autoCreate: {
            type: Boolean,
            default: true,
            // true = auto-create transaction
            // false = send reminder only
        },

        // Link to parent recurring transaction
        parentRecurringId: {
            type: Schema.Types.ObjectId,
            ref: "Transaction",
            index: true,
            // If this transaction was generated from a recurring one,
            // this points to the parent template
        },
    },
    {
        versionKey: false,
    }
);

// Virtual id that mirrors MongoDB's _id
TransactionSchema.virtual("id").get(function (this: any) {
    return this._id?.toString();
});

export const TransactionModel = mongoose.model<Transaction>("Transaction", TransactionSchema);
