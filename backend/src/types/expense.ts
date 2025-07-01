import { Schema } from "mongoose";

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

interface ExpenseType {
  date: Date;
  title: string;
  amount: number;
  description: string;
  category: string;
  userId: Schema.Types.ObjectId;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
}
export default ExpenseType;
