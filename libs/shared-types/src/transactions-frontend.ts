import { UserType } from "./auth";

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
    _id?: string;
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
export type TransactionWithId = Transaction & {
    _id?: string;
    // Bill-related properties
    billCategory?: string;
    billStatus?: BillStatus;
    dueDate?: Date;
    billFrequency?: BillFrequency;
    nextDueDate?: Date;
    lastPaidDate?: Date;
    paymentMethod?: PaymentMethod;
    reminderDays?: number;
};

// Financial overview data type for home page
export interface FinancialOverviewData {
    savingsRate: number;
    expenseRate: number;
    totalBudgets: number;
    overBudgetCount: number;
    warningBudgetCount: number;
    onTrackBudgetCount: number;
    averageBudgetProgress: number;
}

// Pagination types
export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    currentPage?: number;
    itemsPerPage?: number;
}

// Currency summary types
export interface CurrencySummary {
    income: number;
    expense: number;
    net: number;
}

export interface TotalExpensesByCurrency {
    [currency: string]: CurrencySummary;
}

// Month filter types
export interface MonthFilter {
    label: string;
    value: {
        year: number;
        month: number;
    };
    sortKey: number;
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

// Monthly statement PDF options
export interface MonthlyStatementPDFOptions {
    allExpenses: TransactionWithId[];
    filteredTransactions: TransactionWithId[];
    userCurrency: string;
    now: Date;
    monthName: string;
    currentYear: number;
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    savingsRate: number;
    totalTransactions: number;
    avgTransaction: number;
    expenseByCategory: Record<string, number>;
    totalExpenseForBreakdown: number;
}

// Filter state types
export interface FilterState {
    selectedCategories: string[];
    selectedTypes: string[];
    selectedStatuses: string[];
    searchQuery: string;
    dateRangeForFilter?: DateRange;
}

// Date range type (from react-day-picker)
export interface DateRange {
    from: Date;
    to?: Date;
}

// Export data types
export interface ExportData {
    [key: string]: string | number | boolean | Date | string[] | undefined;
}

// Recurring transaction template type
export interface RecurringTransactionTemplate extends TransactionWithId {
    isRecurring: true;
    recurringFrequency: RecurringFrequency;
    endDate?: Date;
}

// Bill transaction type
export interface BillTransaction extends TransactionWithId {
    category: "Bills";
    billCategory: string;
    billStatus: BillStatus;
    dueDate: Date;
    billFrequency: BillFrequency;
    paymentMethod: PaymentMethod;
    reminderDays?: number;
}

// Tab component props types
export interface TabComponentProps {
    data: TransactionWithId[];
    onEdit: (expense: TransactionWithId) => void;
    showRecurringIcon?: boolean;
    showRecurringBadge?: boolean;
    refreshAllTransactions?: () => void;
}

// Data table props types
export interface DataTableProps {
    data: TransactionWithId[];
    onEdit: (expense: TransactionWithId) => void;
    onDelete: (expenseId: string) => void;
    showRecurringIcon?: boolean;
    showRecurringBadge?: boolean;
    isRecurringTab?: boolean;
    parse?: (date: string, format: string, baseDate: Date) => Date;
    onRefresh?: () => void;
    setAllExpenses?: (expenses: TransactionWithId[]) => void;
    setAvailableMonths?: (months: MonthFilter[]) => void;
    recurringTransactions?: TransactionWithId[];
    totalExpensesByCurrency?: TotalExpensesByCurrency;
    refreshAllTransactions?: () => void;
    activeTab?: "all" | "recurring" | "bills";
    setActiveTab?: (tab: "all" | "recurring" | "bills") => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
    apiRecurringTemplates?: TransactionWithId[];
    isLoading?: boolean;
}

export enum ActiveTab {
    ALL = "all",
    RECURRING = "recurring",
    BILLS = "bills",
}

// Filters section props types
export interface FiltersSectionProps {
    filteredTransactions: TransactionWithId[];
    handleEdit: (expense: TransactionWithId) => void;
    handleDelete: (id: string) => void;
    handleDeleteRecurring: (templateId: string) => void;
    recurringTransactions?: TransactionWithId[];
    totalExpensesByCurrency: TotalExpensesByCurrency;
    parse?: (date: string, format: string, baseDate: Date) => Date;
    loadingMonths?: boolean;
    availableMonths?: MonthFilter[];
    downloadMonthlyStatementForMonth?: (month: { year: number; month: number }) => void;
    user?: UserType | null;
    activeTab?: ActiveTab;
    setActiveTab?: (tab: ActiveTab) => void;
    onRefresh?: () => void;
    setAllExpenses?: (expenses: TransactionWithId[]) => void;
    setAvailableMonths?: (months: MonthFilter[]) => void;
    refreshAllTransactions?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
    apiRecurringTemplates?: TransactionWithId[];
    isLoading?: boolean;
}

// Form field change handlers
export interface FormFieldHandlers {
    handleCurrencyChange: (value: string) => void;
    handleRecurringToggle: (checked: boolean) => void;
}

// Form state
export interface FormState {
    category: string;
    type: TransactionType;
    isRecurring: boolean;
    currency: string;
}

// Transaction mutations
/* export interface TransactionMutations {
    createTransaction: (data: TransactionFormData) => Promise<void>;
    updateTransaction: (params: { id: string; data: TransactionFormData }) => Promise<void>;
    isCreating: boolean;
    isUpdating: boolean;
} */

// Form hook return type
export interface TransactionFormHook {
    form: any; // React Hook Form instance
    category: string;
    type: TransactionType;
    isRecurring: boolean;
    currency: string;
    resetForm: () => void;
    isEditing: boolean;
    handleCurrencyChange: (value: string) => void;
    handleRecurringToggle: (checked: boolean) => void;
}

// Category option type
export interface CategoryOption {
    value: string;
    label: string;
}

// Receipt upload result
export interface ReceiptUploadResult {
    receiptKeys: string[];
}

// Transaction submission data - extends form data with processed fields
export interface TransactionSubmissionData {
    title: string;
    type: TransactionType;
    amount: number;
    currency: string;
    category: string;
    billCategory?: string;
    paymentMethod?: string;
    billFrequency?: string;
    reminderDays?: number;
    description?: string;
    isRecurring?: boolean;
    recurringFrequency?: string;
    fromRate?: number;
    toRate?: number;
    date: string;
    endDate?: string;
    dueDate?: string;
    nextDueDate?: string;
    lastPaidDate?: string;
    receipts: string[];
    userId?: string; // Optional since it will be added by the service
}
