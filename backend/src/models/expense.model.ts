import mongoose, { Schema } from "mongoose";
import ExpenseType from "../types/expense";

const expenseSchema = new Schema({
  date: {
    type: Date,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
  },
  category: {
    type: String,
    required: true,
  },
  currency: {
    type: String,
    default: "INR",
  },
  type: {
    type: String,
    enum: ["income", "expense"],
    default: "expense",
    required: true,
  },
  fromRate: {
    type: Number,
    default: 1,
  },
  toRate: {
    type: Number,
    default: 1,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurringFrequency: {
    type: String,
    enum: ["daily", "weekly", "monthly", "yearly"],
    required: false,
  },
  endDate: {
    type: Date,
    required: false,
  },
  templateId: {
    type: Schema.Types.ObjectId,
    ref: "Expense",
    default: null,
  },
  receipts: {
    type: [String],
    default: [],
  },
});

export const Expense = mongoose.model<ExpenseType>("Expense", expenseSchema);
