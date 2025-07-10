export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type TransactionType = "income" | "expense";

export interface ExpenseType {
  _id?: string;
  date: string;
  title: string;
  amount: number;
  description?: string;
  category: string;
  currency?: string;
  type: TransactionType;
  fromRate?: number;
  toRate?: number;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
}

export interface ExpenseResponseType {
  _id: string;
  date: Date;
  title: string;
  amount: number;
  description?: string;
  category: string;
  currency?: string;
  type: TransactionType;
  fromRate?: number;
  toRate?: number;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
}
