import { Schema } from "mongoose";

interface ExpenseType {
  date: Date;
  title: string;
  amount: number;
  description: string;
  category: string;
  userId: Schema.Types.ObjectId;
}
export default ExpenseType;
