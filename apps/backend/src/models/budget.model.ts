import type { BudgetType } from "@expense-tracker/shared-types";
import mongoose, { Schema } from "mongoose";

export type BudgetRecurrence = "daily" | "weekly" | "monthly" | "yearly";

const budgetSchema = new Schema<BudgetType>(
	{
		userId: {
			type: String,
			ref: "User",
			required: true,
		},
		title: { type: String, required: false },
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
	},
	{
		versionKey: false,
	}
);

export const Budget = mongoose.model<BudgetType>("Budget", budgetSchema);
