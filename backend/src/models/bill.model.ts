import mongoose, { Schema } from "mongoose";
import BillType from "../types/bill";

const billSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
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
      required: true,
    },

    // Bill-specific fields
    dueDate: {
      type: Date,
      required: true,
    },
    billStatus: {
      type: String,
      enum: ["unpaid", "paid", "overdue", "pending"],
      default: "unpaid",
    },
    billFrequency: {
      type: String,
      enum: ["monthly", "quarterly", "yearly", "one-time"],
      default: "monthly",
    },
    isRecurring: {
      type: Boolean,
      default: true,
    },
    nextDueDate: {
      type: Date,
    },
    lastPaidDate: {
      type: Date,
    },
    reminderDays: {
      type: Number,
      default: 3, // Default reminder 3 days before due date
    },
    receipts: {
      type: [String],
      default: [],
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "Bill",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
billSchema.index({ userId: 1, dueDate: 1 });
billSchema.index({ userId: 1, billStatus: 1 });

export const Bill = mongoose.model<BillType>("Bill", billSchema);
