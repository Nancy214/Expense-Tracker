import type { Transaction } from "@expense-tracker/shared-types";
import type { Document } from "mongoose";

/**
 * DataMapper DTO for Transaction entities
 * Provides utility methods for transforming transaction data
 */
export class TransactionDataMapper {
	/**
	 * Converts a transaction (Mongoose document or plain object) to a response format
	 * Handles conversion from Mongoose documents to plain objects
	 * @param transaction - The transaction to convert
	 * @returns The transaction as a plain object
	 */
	static toResponse(transaction: Transaction | Document): Transaction {
		// Convert Mongoose document to plain object if needed
		if (transaction && typeof (transaction as any).toObject === "function") {
			return (transaction as any).toObject({ virtuals: true }) as Transaction;
		}
		return transaction as Transaction;
	}

	/**
	 * Sets the exchange rate (toRate) on a transaction
	 * @param transaction - The transaction to update
	 * @param exchangeRate - The exchange rate to set
	 * @returns The transaction with the toRate property set
	 */
	static setToRate(transaction: Transaction | Document, exchangeRate: number): Transaction {
		const plainTransaction = this.toResponse(transaction);
		return {
			...plainTransaction,
			toRate: exchangeRate,
		};
	}
}
