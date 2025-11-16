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
            required: true,
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
        fromRate: {
            type: Number,
            default: 1,
        },
        toRate: {
            type: Number,
            default: 1,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        receipt: {
            type: String,
            default: "",
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
