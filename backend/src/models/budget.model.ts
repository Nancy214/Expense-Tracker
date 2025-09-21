import mongoose, { Schema } from "mongoose";
import { BudgetType } from "../types/budget";

export type BudgetRecurrence = "daily" | "weekly" | "monthly" | "yearly";

const budgetSchema = new Schema<BudgetType>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    fromRate: { type: Number, default: 1 },
    toRate: { type: Number, default: 1 },
    recurrence: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly"],
        required: true,
    },
    startDate: { type: Date, required: true },
    category: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

export const Budget = mongoose.model<BudgetType>("Budget", budgetSchema);
