export enum RecurringFrequency {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    YEARLY = "yearly",
}
export enum TransactionType {
    INCOME = "income",
    EXPENSE = "expense",
}

// Bill-related types
export enum BillStatus {
    UNPAID = "unpaid",
    PAID = "paid",
    OVERDUE = "overdue",
    PENDING = "pending",
}
export enum BillFrequency {
    MONTHLY = "monthly",
    QUARTERLY = "quarterly",
    YEARLY = "yearly",
    ONE_TIME = "one-time",
}
export enum PaymentMethod {
    MANUAL = "manual",
    AUTO_PAY = "auto-pay",
    BANK_TRANSFER = "bank-transfer",
    CREDIT_CARD = "credit-card",
    DEBIT_CARD = "debit-card",
    CASH = "cash",
    OTHER = "other",
}

export enum ExpenseCategory {
    FOOD_DINING = "Food & Dining",
    GROCERIES = "Groceries",
    TRANSPORT = "Transport",
    SHOPPING = "Shopping",
    WORK = "Work",
    HOUSEHOLD = "Household",
    CAR = "Car",
    ENTERTAINMENT = "Entertainment",
    UTILITIES = "Utilities",
    HEALTHCARE = "Healthcare",
    VACATION = "Vacation",
    EDUCATION = "Education",
    PERSONAL_CARE = "Personal Care",
    GIFTS = "Gifts",
    OTHER = "Other",
    BILLS = "Bills",
}

export enum BillCategory {
    RENT_MORTGAGE = "Rent/Mortgage",
    ELECTRICITY = "Electricity",
    WATER = "Water",
    GAS = "Gas",
    INTERNET = "Internet",
    PHONE = "Phone",
    INSURANCE = "Insurance",
    SUBSCRIPTIONS = "Subscriptions",
    CREDIT_CARD = "Credit Card",
    LOAN_PAYMENT = "Loan Payment",
    TAXES = "Taxes",
}

export enum IncomeCategory {
    SALARY = "Salary",
    FREELANCE = "Freelance",
    BUSINESS = "Business",
    INVESTMENT = "Investment",
    RENTAL_INCOME = "Rental Income",
    GIFTS = "Gifts",
    REFUNDS = "Refunds",
    OTHER_INCOME = "Other Income",
}

// Base transaction interface - single source of truth
export interface Transaction {
    id?: string;
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

export type TransactionOrBill = Transaction | Bill;

// API Response type - extends base with database fields
export interface TransactionResponse extends Transaction {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

// Pagination types

export interface PaginationResponse {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface PaginationQuery {
    page?: string;
    limit?: string;
}

export interface PaginationInfo extends PaginationResponse {
    currentPage?: number;
    itemsPerPage?: number;
}

// Response types
export interface PaginatedResponse<T> {
    [key: string]: T[] | PaginationResponse;
    pagination: PaginationResponse;
}

// Transaction summary types
export interface TransactionSummary {
    totalTransactions: number;
    totalIncome: number;
    totalExpenses: number;
    totalIncomeAmount: number;
    totalExpenseAmount: number;
    totalRecurringTemplates: number;
    totalRecurringAmount: number;
    totalBills: number;
    totalBillsAmount: number;
    averageTransactionAmount: number;
}

// Monthly stats interface
export interface MonthlyStats {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    transactionCount: number;
}

// Recurring transaction template type
export interface RecurringTransactionTemplate extends Transaction {
    isRecurring: true;
    recurringFrequency: RecurringFrequency;
    endDate?: Date;
}

export enum ActiveTab {
    ALL = "all",
    RECURRING = "recurring",
    BILLS = "bills",
}
