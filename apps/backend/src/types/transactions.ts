import { Document, Types } from "mongoose";

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
    userId: Types.ObjectId;
    isRecurring?: boolean;
    recurringFrequency?: RecurringFrequency;
    endDate?: Date;
    templateId?: Types.ObjectId;
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

// Extended types for better type safety
export interface TransactionDocument extends Document, Transaction {
    _id: Types.ObjectId;
}

export interface BillDocument extends Document, Bill {
    _id: Types.ObjectId;
}

export type TransactionOrBill = Transaction | Bill;
export type TransactionOrBillDocument = TransactionDocument | BillDocument;

// Pagination types
export interface PaginationQuery {
    page?: string;
    limit?: string;
}

export interface PaginationResponse {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

// Response types
export interface PaginatedResponse<T> {
    [key: string]: T[] | PaginationResponse;
    pagination: PaginationResponse;
}

export interface TransactionSummary {
    totalTransactions: number;
    totalIncome: number;
    totalExpenses: number;
    totalBills: number;
    totalRecurringTemplates: number;
    totalIncomeAmount: number;
    totalExpenseAmount: number;
    totalBillsAmount: number;
    totalRecurringAmount: number;
    averageTransactionAmount: number;
}

export interface SummaryResponse {
    summary: TransactionSummary;
}

export interface ReceiptUploadResponse {
    key: string;
}

export interface ReceiptUrlResponse {
    url: string;
}

export interface BillStatusUpdateRequest {
    billStatus: string;
}

export interface BillStatusUpdateResponse {
    message: string;
    transaction: TransactionOrBillDocument;
}

export interface RecurringExpenseJobResponse {
    success: boolean;
    createdCount: number;
}

export interface DeleteResponse {
    message: string;
}
