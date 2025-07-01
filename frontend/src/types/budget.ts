export type BudgetFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface BudgetData {
  amount: number;
  frequency: BudgetFrequency;
}

export interface BudgetResponse {
  _id: string;
  userId: string;
  amount: number;
  frequency: BudgetFrequency;
  createdAt: string;
}
