import type { BudgetFormData } from "@expense-tracker/shared-types";
import mongoose from "mongoose";
import { BudgetDAO } from "../daos/budget.dao";
import { parseDateFromAPI } from "../utils/dateUtils";

export class BudgetService {
    async createBudget(userId: string, budgetData: BudgetFormData, reason?: string) {
        const { title, amount, currency, recurrence, startDate, category } = budgetData;

        if (!title || !amount || !currency || !recurrence || !startDate || !category) {
            throw new Error("Title, amount, currency, recurrence, start date, and category are required.");
        }

        console.log("Creating budget:", budgetData);

        // Normalize types for DAO (expects Date for startDate)
        const preparedData = {
            ...budgetData,
            startDate: parseDateFromAPI(startDate),
        } as any;

        // Create the budget using DAO
        const savedBudget = await BudgetDAO.createBudget(userId, preparedData);

        // Create a log for the new budget
        await BudgetDAO.createBudgetLog(
            savedBudget.id,
            userId,
            "created",
            [
                {
                    field: "budget",
                    oldValue: null,
                    newValue: {
                        title,
                        amount,
                        recurrence,
                        startDate,
                        category,
                    },
                },
            ],
            reason || "Initial budget creation"
        );

        return savedBudget;
    }

    async updateBudget(userId: string, id: string, budgetData: BudgetFormData, reason?: string) {
        const { title, amount, currency, recurrence, startDate, category } = budgetData;

        if (!title || !amount || !currency || !recurrence || !startDate || !category) {
            throw new Error("Title, amount, currency, recurrence, start date, and category are required.");
        }

        // Get the old budget first
        const oldBudget = await BudgetDAO.findBudgetById(userId, id);
        if (!oldBudget) {
            throw new Error("Budget not found.");
        }

        // Normalize types for DAO (expects Date for startDate)
        const preparedData: BudgetFormData = {
            ...budgetData,
            startDate: startDate.toString(),
        };

        // Update the budget using DAO
        const updatedBudget = await BudgetDAO.updateBudget(userId, id, preparedData);
        if (!updatedBudget) {
            throw new Error("Budget not found.");
        }

        // Detect changes and create log
        // Convert oldBudget to BudgetFormData format for comparison
        const oldBudgetForComparison: BudgetFormData = {
            ...oldBudget,
            startDate: oldBudget.startDate.toISOString().split("T")[0], // Convert Date to YYYY-MM-DD string
        };
        const changes = BudgetDAO.detectBudgetChanges(oldBudgetForComparison, preparedData);

        if (changes.length > 0) {
            console.log("Creating budget update log...");
            await BudgetDAO.createBudgetLog(updatedBudget.id, userId, "updated", changes, reason || "Budget update");
            console.log("Budget update log created");
        } else {
            console.log("No changes detected, skipping log creation");
        }

        return updatedBudget;
    }

    async deleteBudget(userId: string, id: string, reason?: string) {
        // Validate ObjectId early to avoid cast errors
        if (!mongoose.isValidObjectId(id)) {
            throw new Error("Invalid budget id");
        }

        // Delete the budget using DAO
        const deletedBudget = await BudgetDAO.deleteBudget(userId, id);
        if (!deletedBudget) {
            throw new Error("Budget not found.");
        }

        // Create a log for the budget deletion
        const reasonForDeletion = reason || "Budget deletion";

        // Do not fail the deletion if log saving fails
        try {
            await BudgetDAO.createBudgetLog(
                deletedBudget.id,
                userId,
                "deleted",
                [
                    {
                        field: "budget",
                        oldValue: {
                            title: deletedBudget.title,
                            amount: deletedBudget.amount,
                            recurrence: deletedBudget.recurrence,
                            startDate: deletedBudget.startDate,
                            category: deletedBudget.category,
                        },
                        newValue: null,
                    },
                ],
                reasonForDeletion
            );
        } catch (logError) {
            console.error("Failed to save budget deletion log:", logError);
        }

        return { message: "Budget deleted successfully." };
    }

    async getBudgets(userId: string) {
        // Get budgets using DAO
        const budgets = await BudgetDAO.findBudgetsByUserId(userId);
        return budgets;
    }

    async getBudgetLogs(userId: string) {
        const logs = await BudgetDAO.getBudgetLogs(userId);
        return { logs };
    }

    async getBudgetProgress(userId: string) {
        // Get budget progress using DAO - unified function handles both single and overall progress
        const budgetProgress = await BudgetDAO.calculateBudgetProgress(userId);
        return budgetProgress;
    }
}
