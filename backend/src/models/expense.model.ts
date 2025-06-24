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
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

export const Expense = mongoose.model<ExpenseType>("Expense", expenseSchema);
