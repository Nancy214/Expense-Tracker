import { Schema } from "mongoose";

export type BudgetFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface BudgetType {
  userId: Schema.Types.ObjectId;
  amount: number;
  frequency: BudgetFrequency;
  startDate: Date;
  createdAt: Date;
}

export interface BudgetRequest {
  amount: number;
  frequency: BudgetFrequency;
  startDate: Date;
}
