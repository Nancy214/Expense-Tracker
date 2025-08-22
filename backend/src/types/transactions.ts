import { Schema } from "mongoose";

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type TransactionType = "income" | "expense";

// Bill-related types - ADDED
export type BillStatus = "unpaid" | "paid" | "overdue" | "pending";
export type BillFrequency = "monthly" | "quarterly" | "yearly" | "one-time";
export type PaymentMethod = "manual" | "auto-pay" | "bank-transfer" | "credit-card" | "debit-card" | "cash";

export interface Transaction {
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

export type Bill = Omit<Transaction, "isRecurring" | "recurringFrequency" | "endDate" | "templateId"> & {
    billCategory?: string;
    reminderDays?: number;
    dueDate?: Date;
    billStatus?: BillStatus;
    billFrequency?: BillFrequency;
    nextDueDate?: Date;
    lastPaidDate?: Date;
    paymentMethod?: PaymentMethod;
};
