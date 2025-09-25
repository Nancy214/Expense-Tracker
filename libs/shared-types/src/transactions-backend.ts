import {
    RecurringFrequency,
    TransactionType,
    BillStatus,
    BillFrequency,
    PaymentMethod,
    Transaction,
    Bill,
    TransactionSummary,
} from "./transactions-frontend";

/* export interface Transaction {
    date: Date;
    title: string;
    amount: number;
    description: string;
    category: string;
    currency: string;
    type: TransactionType;
    fromRate?: number;
    toRate?: number;
    userId: string;
    isRecurring?: boolean;
    recurringFrequency?: RecurringFrequency;
    endDate?: Date;
    templateId?: string;
    receipts?: string[];
} */

/* export type Bill = Omit<Transaction, "isRecurring" | "recurringFrequency" | "endDate" | "templateId"> & {
    billCategory?: string;
    reminderDays?: number;
    dueDate?: Date;
    billStatus?: BillStatus;
    billFrequency?: BillFrequency;
    nextDueDate?: Date;
    lastPaidDate?: Date;
    paymentMethod?: PaymentMethod;
};
 */
// Extended types for better type safety
export interface TransactionDocument extends Transaction {
    _id: string;
}

export interface BillDocument extends Bill {
    _id: string;
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

/* export interface TransactionSummary {
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
} */

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
