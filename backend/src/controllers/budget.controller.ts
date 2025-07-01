import { Response } from "express";
import { Budget } from "../models/budget.model";
import { AuthRequest } from "../types/auth";
import { BudgetRequest } from "../types/budget";
import mongoose from "mongoose";

export const createBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { amount, frequency }: BudgetRequest = req.body;
    if (!amount || !frequency) {
      return res
        .status(400)
        .json({ message: "Amount and frequency are required." });
    }

    const budget = new Budget({
      userId: new mongoose.Types.ObjectId(userId),
      amount,
      frequency,
    });

    const savedBudget = await budget.save();
    res.status(201).json(savedBudget);
  } catch (error) {
    console.error("Budget creation error:", error);
    res.status(500).json({ message: "Failed to create budget." });
  }
};

export const updateBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { id } = req.params;
    const { amount, frequency }: BudgetRequest = req.body;

    if (!amount || !frequency) {
      return res
        .status(400)
        .json({ message: "Amount and frequency are required." });
    }

    const budget = await Budget.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(userId),
      },
      { amount, frequency },
      { new: true }
    );

    if (!budget) {
      return res.status(404).json({ message: "Budget not found." });
    }

    res.status(200).json(budget);
  } catch (error) {
    console.error("Budget update error:", error);
    res.status(500).json({ message: "Failed to update budget." });
  }
};

export const deleteBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { id } = req.params;

    const budget = await Budget.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!budget) {
      return res.status(404).json({ message: "Budget not found." });
    }

    res.status(200).json({ message: "Budget deleted successfully." });
  } catch (error) {
    console.error("Budget deletion error:", error);
    res.status(500).json({ message: "Failed to delete budget." });
  }
};

export const getBudgets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const budgets = await Budget.find({
      userId: new mongoose.Types.ObjectId(userId),
    });
    res.status(200).json(budgets);
  } catch (error) {
    console.error("Budget fetch error:", error);
    res.status(500).json({ message: "Failed to fetch budgets." });
  }
};

export const getBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { id } = req.params;

    const budget = await Budget.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!budget) {
      return res.status(404).json({ message: "Budget not found." });
    }

    res.status(200).json(budget);
  } catch (error) {
    console.error("Budget fetch error:", error);
    res.status(500).json({ message: "Failed to fetch budget." });
  }
};
