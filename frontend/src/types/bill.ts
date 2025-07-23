export type BillStatus = "unpaid" | "paid" | "overdue" | "pending";
export type BillFrequency = "monthly" | "quarterly" | "yearly" | "one-time";
export type PaymentMethod =
  | "manual"
  | "auto-pay"
  | "bank-transfer"
  | "credit-card"
  | "debit-card"
  | "cash";

export interface BillType {
  _id?: string;
  title: string;
  amount: number;
  category: string;
  currency?: string;
  fromRate?: number;
  toRate?: number;

  // Bill-specific fields
  dueDate: string; // Format: dd/MM/yyyy
  billStatus: BillStatus;
  billFrequency: BillFrequency;
  isRecurring: boolean;
  nextDueDate?: string;
  lastPaidDate?: string;
  reminderDays?: number;
}

export interface BillResponseType {
  _id: string;
  title: string;
  amount: number;
  category: string;
  currency?: string;
  fromRate?: number;
  toRate?: number;

  // Bill-specific fields
  dueDate: Date;
  billStatus: BillStatus;
  billFrequency: BillFrequency;
  isRecurring: boolean;
  nextDueDate?: Date;
  lastPaidDate?: Date;
  reminderDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillStats {
  totalBills: number;
  unpaidBills: number;
  overdueBills: number;
  upcomingBills: number;
}
