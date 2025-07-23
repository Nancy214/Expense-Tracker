import { Schema } from "mongoose";

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type TransactionType = "income" | "expense";

export interface ExpenseType {
  date: Date;
  title: string;
  amount: number;
  description: string;
  category: string;
  currency: string;
  type: TransactionType;
  fromRate?: number;
  toRate?: number;
  userId: Schema.Types.ObjectId;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  endDate?: Date;
  templateId?: Schema.Types.ObjectId;
  receipts?: string[];
}
export default ExpenseType;
