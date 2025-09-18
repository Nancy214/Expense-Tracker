import mongoose, { Schema } from "mongoose";
import { BudgetLogType } from "../types/budget";

const budgetLogSchema = new Schema<BudgetLogType>({
    budgetId: {
        type: Schema.Types.ObjectId,
        ref: "Budget",
        required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
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
});

export const BudgetLog = mongoose.model<BudgetLogType>("BudgetLog", budgetLogSchema);
