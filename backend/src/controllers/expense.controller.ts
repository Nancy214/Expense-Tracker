import { Request, Response } from "express";
import { Expense } from "../models/expense.model";
import { AuthRequest } from "../types/auth";

export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const expenses = await Expense.find({ userId: req.user?.id });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const expense = await Expense.create({
      ...req.body,
      userId: req.user?.id,
    });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ message: error });
  }
};
