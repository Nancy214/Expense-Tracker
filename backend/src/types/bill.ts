import { Schema } from "mongoose";

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
  title: string;
  amount: number;
  category: string;
  currency: string;
  fromRate?: number;
  toRate?: number;
  userId: Schema.Types.ObjectId;

  // Bill-specific fields
  dueDate: Date;
  billStatus: BillStatus;
  billFrequency: BillFrequency;
  isRecurring: boolean;
  nextDueDate?: Date;
  lastPaidDate?: Date;
  reminderDays?: number; // Days before due date to send reminder
  receipts?: string[];
  templateId?: Schema.Types.ObjectId;
}

export default BillType;
