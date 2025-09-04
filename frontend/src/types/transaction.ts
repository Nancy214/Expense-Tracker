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

// Form handling type - with string dates for UI
export interface TransactionFormData {
    title: string;
    type: "expense" | "income";
    amount: number;
    currency: string;
    category: string;
    billCategory?: string;
    paymentMethod?: string;
    date: string;
    dueDate?: string;
    billFrequency?: string;
    reminderDays?: number;
    description?: string;
    isRecurring?: boolean;
    recurringFrequency?: string;
    endDate?: string;
    receipts?: File[];
    fromRate?: number;
    toRate?: number;
    nextDueDate?: string;
    lastPaidDate?: string;
}

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
    total: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
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

// User settings types
export interface UserSettings {
    billsAndBudgetsAlert?: boolean;
    monthlyReports?: boolean;
}

// User context type - allow null to match useAuth return type
export interface User {
    id: string;
    currency?: string;
    settings?: UserSettings;
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

// Table column types
export interface TableColumn<T> {
    accessorKey: keyof T;
    header: React.ReactNode | ((props: { column: any }) => React.ReactNode);
    size?: number;
    cell?: (props: { row: any }) => React.ReactNode;
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
    category: "Bill";
    billCategory: string;
    billStatus: BillStatus;
    dueDate: Date;
    billFrequency: BillFrequency;
    paymentMethod: PaymentMethod;
    reminderDays?: number;
}

// Dialog props types
export interface AddExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingExpense?: TransactionWithId | null;
    onSuccess?: () => void;
    triggerButton?: React.ReactNode;
    preselectedCategory?: string;
    isAddBill?: boolean;
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
    user?: User | null;
    activeTab?: "all" | "recurring" | "bills";
    setActiveTab?: (tab: "all" | "recurring" | "bills") => void;
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
}

// Form field change handlers
export interface FormFieldHandlers {
    handleCurrencyChange: (value: string) => void;
    handleRecurringToggle: (checked: boolean) => void;
}

// Form state
export interface FormState {
    category: string;
    type: "expense" | "income";
    isRecurring: boolean;
    currency: string;
}

// Transaction mutations
export interface TransactionMutations {
    createTransaction: (data: TransactionFormData) => Promise<void>;
    updateTransaction: (params: { id: string; data: TransactionFormData }) => Promise<void>;
    isCreating: boolean;
    isUpdating: boolean;
}

// Form hook return type
export interface TransactionFormHook {
    form: any; // React Hook Form instance
    category: string;
    type: "expense" | "income";
    isRecurring: boolean;
    currency: string;
    resetForm: () => void;
    isEditing: boolean;
    handleCurrencyChange: (value: string) => void;
    handleRecurringToggle: (checked: boolean) => void;
}

// Currency option type
export interface CurrencyOption {
    value: string;
    label: string;
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
    type: "expense" | "income";
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
