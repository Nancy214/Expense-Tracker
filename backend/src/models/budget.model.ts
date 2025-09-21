import mongoose, { Schema } from "mongoose";
import { BudgetType } from "../types/budget";

export type BudgetRecurrence = "daily" | "weekly" | "monthly" | "yearly";

const budgetSchema = new Schema<BudgetType>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    amount: { type: Number, required: true },
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
