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
    HOUSING = "Housing",
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
