import { Transaction, TransactionResponse } from "./transaction";

export type BillStatus = "unpaid" | "paid" | "overdue" | "pending";
export type BillFrequency = "monthly" | "quarterly" | "yearly" | "one-time";
export type PaymentMethod = "manual" | "auto-pay" | "bank-transfer" | "credit-card" | "debit-card" | "cash";

// Bill type extends Transaction with bill-specific overrides
export interface BillType extends Omit<Transaction, "type" | "date" | "dueDate" | "nextDueDate" | "lastPaidDate"> {
    // Bill-specific fields
    dueDate: string; // Format: dd/MM/yyyy
    billStatus: BillStatus;
    billFrequency: BillFrequency;
    nextDueDate?: string;
    lastPaidDate?: string;
    paymentMethod?: PaymentMethod;
}

// Bill response type extends TransactionResponse with bill-specific overrides
export interface BillResponseType
    extends Omit<TransactionResponse, "type" | "date" | "dueDate" | "nextDueDate" | "lastPaidDate"> {
    // Bill-specific fields
    dueDate: Date;
    billStatus: BillStatus;
    billFrequency: BillFrequency;
    nextDueDate?: Date;
    lastPaidDate?: Date;
    paymentMethod?: PaymentMethod;
}

export interface BillStats {
    totalBills: number;
    unpaidBills: number;
    overdueBills: number;
    upcomingBills: number;
}
