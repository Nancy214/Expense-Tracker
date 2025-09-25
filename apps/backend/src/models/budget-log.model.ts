import mongoose, { Schema } from "mongoose";
import { BudgetLogType } from "@expense-tracker/shared-types/src/budget-backend";

const budgetLogSchema = new Schema<BudgetLogType>(
    {
        budgetId: {
            type: String,
            ref: "Budget",
            required: true,
        },
        userId: {
            type: String,
            ref: "User",
            required: true,
        },
        changeType: {
            type: String,
            enum: ["created", "updated", "deleted"],
            required: true,
        },
        changes: {
            type: [
                {
                    field: { type: String, required: true },
                    oldValue: Schema.Types.Mixed,
                    newValue: Schema.Types.Mixed,
                },
            ],
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        versionKey: false,
    }
);

export const BudgetLog = mongoose.model<BudgetLogType>("BudgetLog", budgetLogSchema);
