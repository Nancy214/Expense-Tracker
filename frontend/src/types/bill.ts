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
  billProvider: string;
  dueDate: string; // Format: dd/MM/yyyy
  billStatus: BillStatus;
  paymentMethod: PaymentMethod;
  billFrequency: BillFrequency;
  isRecurring: boolean;
  nextDueDate?: string;
  lastPaidDate?: string;
  reminderDays?: number;
  autoPayEnabled?: boolean;
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
  billProvider: string;
  dueDate: Date;
  billStatus: BillStatus;
  paymentMethod: PaymentMethod;
  billFrequency: BillFrequency;
  isRecurring: boolean;
  nextDueDate?: Date;
  lastPaidDate?: Date;
  reminderDays?: number;
  autoPayEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillStats {
  totalBills: number;
  unpaidBills: number;
  overdueBills: number;
  upcomingBills: number;
}
