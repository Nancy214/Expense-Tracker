import { Transaction } from "@expense-tracker/shared-types/src";
import mongoose, { Schema } from "mongoose";

/* interface TransactionDocument extends Document, Transaction {
    _id: string;
}
 */
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
        isRecurring: {
            type: Boolean,
            default: false,
        },
        recurringFrequency: {
            type: String,
            enum: ["daily", "weekly", "monthly", "yearly"],
            required: false,
        },
        endDate: {
            type: Date,
            required: false,
        },
        templateId: {
            type: Schema.Types.ObjectId,
            ref: "Expense",
            default: null,
        },
        receipt: {
            type: String,
            default: "",
        },
        // Bill-specific fields - ADDED
        billCategory: {
            type: String,
            required: false,
        },
        reminderDays: {
            type: Number,
            required: false,
            default: 3,
        },
        dueDate: {
            type: Date,
            required: false,
        },
        billStatus: {
            type: String,
            enum: ["unpaid", "paid", "overdue", "pending"],
            default: "unpaid",
        },
        billFrequency: {
            type: String,
            enum: ["monthly", "quarterly", "yearly", "one-time"],
            default: "monthly",
        },
        nextDueDate: {
            type: Date,
            required: false,
        },
        lastPaidDate: {
            type: Date,
            required: false,
        },
        paymentMethod: {
            type: String,
            enum: ["manual", "auto-pay", "bank-transfer", "credit-card", "debit-card", "cash"],
            default: "manual",
        },
    },
    {
        versionKey: false,
        toJSON: {
            virtuals: true,
            versionKey: false,
            transform: (_doc, ret) => {
                delete ret._id;
                return ret;
            },
        },
        toObject: {
            virtuals: true,
            versionKey: false,
            transform: (_doc, ret) => {
                delete ret._id;
                return ret;
            },
        },
    }
);

// Virtual id that mirrors MongoDB's _id
TransactionSchema.virtual("id").get(function (this: any) {
    return this._id?.toString();
});

export const TransactionModel = mongoose.model<Transaction>("Transaction", TransactionSchema);
