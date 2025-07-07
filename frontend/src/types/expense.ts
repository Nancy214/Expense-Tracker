export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface ExpenseType {
  _id?: string;
  date: string;
  title: string;
  amount: number;
  description?: string;
  category: string;
  currency?: string;
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
  fromRate?: number;
  toRate?: number;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
}
