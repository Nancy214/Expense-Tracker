export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type TransactionType = "income" | "expense";

// Bill-related types
export type BillStatus = "unpaid" | "paid" | "overdue" | "pending";
export type BillFrequency = "monthly" | "quarterly" | "yearly" | "one-time";
export type PaymentMethod = "manual" | "auto-pay" | "bank-transfer" | "credit-card" | "debit-card" | "cash";

// Base transaction interface - single source of truth
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
    userId: string;
    isRecurring?: boolean;
    recurringFrequency?: RecurringFrequency;
    endDate?: Date;
    templateId?: string;
    receipts?: string[];
}

// Bill type extends Transaction
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

// API Response type - extends base with database fields
export interface TransactionResponse extends Transaction {
    _id: string;
    createdAt: Date;
    updatedAt: Date;
}

// Component usage type - for state management
export type TransactionWithId = Transaction & { _id?: string };

// Form handling type - with string dates for UI
export type TransactionFormData = Omit<Transaction, "date" | "endDate" | "dueDate" | "nextDueDate" | "lastPaidDate"> & {
    date: string;
    endDate?: string;
    dueDate?: string;
    nextDueDate?: string;
    lastPaidDate?: string;
};
