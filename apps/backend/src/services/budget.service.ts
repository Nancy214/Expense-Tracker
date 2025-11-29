import type {
    BudgetChange,
    BudgetFormData,
    BudgetProgress,
    BudgetType,
    Transaction,
} from "@expense-tracker/shared-types";
import mongoose from "mongoose";
import { BudgetDAO } from "../daos/budget.dao";
import { parseDateFromAPI } from "../utils/dateUtils";
import {
    startOfDay,
    endOfWeek,
    startOfMonth,
    endOfDay,
    startOfWeek,
    startOfYear,
    endOfYear,
    endOfMonth,
} from "date-fns";

export class BudgetService {
    async createBudget(userId: string, budgetData: BudgetFormData, reason?: string) {
        const { title, amount, currency, recurrence, startDate, category } = budgetData;

        if (!title || !amount || !currency || !recurrence || !startDate || !category) {
            throw new Error("Title, amount, currency, recurrence, start date, and category are required.");
        }

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
        const preparedData = {
            ...budgetData,
            startDate: parseDateFromAPI(startDate),
        } as any;

        // Update the budget using DAO
        const updatedBudget = await BudgetDAO.updateBudget(userId, id, preparedData);
        if (!updatedBudget) {
            throw new Error("Budget not found.");
        }

        // Detect changes and create log
        // Convert both budgets to a comparable format for change detection
        const oldBudgetForComparison = {
            ...oldBudget,
            startDate: oldBudget.startDate, // Keep as Date object
        };
        const newBudgetForComparison = {
            ...preparedData,
            startDate: preparedData.startDate, // Already a Date object from parseDateFromAPI
        };
        const changes = this.detectBudgetChanges(oldBudgetForComparison, newBudgetForComparison);

        if (changes.length > 0) {
            await BudgetDAO.createBudgetLog(updatedBudget.id, userId, "updated", changes, reason || "Budget update");
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
        const budgetProgress = await this.calculateBudgetProgress(userId);
        return budgetProgress;
    }

    /**
     * Calculate period dates based on recurrence
     */
    calculatePeriodDates(
        recurrence: string,
        now: Date
    ): {
        periodStart: Date;
        periodEnd: Date;
    } {
        let periodStart: Date;
        let periodEnd: Date;

        switch (recurrence) {
            case "daily":
                periodStart = startOfDay(now);
                periodEnd = endOfDay(now);
                break;
            case "weekly":
                periodStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
                periodEnd = endOfWeek(now, { weekStartsOn: 1 });
                break;

            case "yearly":
                periodStart = startOfYear(now);
                periodEnd = endOfYear(now);
                break;
            default:
                periodStart = startOfMonth(now);
                periodEnd = endOfMonth(now);
        }

        return { periodStart, periodEnd };
    }

    /**
     * Filter expenses for a budget based on date range and category
     */
    filterBudgetExpenses(expenses: Transaction[], budget: BudgetType, budgetStartDate: Date, now: Date): Transaction[] {
        return expenses.filter((expense: Transaction) => {
            const expenseDate: Date = new Date(expense.date);
            // Set time to start of day for consistent comparison
            const expenseDateStart: Date = new Date(
                expenseDate.getFullYear(),
                expenseDate.getMonth(),
                expenseDate.getDate()
            );
            const budgetStartDateStart: Date = new Date(
                budgetStartDate.getFullYear(),
                budgetStartDate.getMonth(),
                budgetStartDate.getDate()
            );
            const nowStart: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const isInRange: boolean = expenseDateStart >= budgetStartDateStart && expenseDateStart <= nowStart;
            const matchesCategory: boolean =
                budget.category === "All Categories" || expense.category === budget.category;

            return isInRange && matchesCategory;
        });
    }

    /**
     * Calculate total spent amount for budget expenses
     */
    calculateTotalSpent(budgetExpenses: Transaction[]): number {
        return budgetExpenses.reduce((sum: number, expense: Transaction) => {
            // Convert to budget's currency if different
            let amount: number = expense.amount;
            return sum + amount;
        }, 0);
    }

    /**
     * Calculate days until next budget reset
     */
    calculateDaysUntilReset(budgets: BudgetProgress[], now: Date): number | null {
        if (budgets.length === 0) return null;

        // Find the earliest reset date among all budgets
        const resetDates = budgets.map((budget) => {
            const { periodEnd } = this.calculatePeriodDates(budget.recurrence, now);
            return periodEnd;
        });

        const earliestReset = new Date(Math.min(...resetDates.map((d) => d.getTime())));
        const daysUntilReset = Math.ceil((earliestReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return daysUntilReset;
    }

    /**
     * Calculate budget health score using Option 1: Simple Weighted Score
     */
    calculateBudgetHealth(budgets: BudgetProgress[]): {
        score: number;
        label: string;
        color: string;
        breakdown: {
            baseScore: number;
            overBudgetPenalty: number;
            highUsagePenalty: number;
            mediumUsagePenalty: number;
            lowUsageBonus: number;
            perfectRecordBonus: number;
            overBudgetCount: number;
            highUsageCount: number;
            mediumUsageCount: number;
            lowUsageCount: number;
        };
    } {
        if (budgets.length === 0) {
            return {
                score: 0,
                label: "No Data",
                color: "gray",
                breakdown: {
                    baseScore: 0,
                    overBudgetPenalty: 0,
                    highUsagePenalty: 0,
                    mediumUsagePenalty: 0,
                    lowUsageBonus: 0,
                    perfectRecordBonus: 0,
                    overBudgetCount: 0,
                    highUsageCount: 0,
                    mediumUsageCount: 0,
                    lowUsageCount: 0,
                },
            };
        }

        const baseScore = 100;

        // Count budgets in each category
        const overBudgetCount = budgets.filter((b) => b.isOverBudget).length;
        const highUsageCount = budgets.filter((b) => !b.isOverBudget && b.progress >= 80).length;
        const mediumUsageCount = budgets.filter((b) => !b.isOverBudget && b.progress >= 60 && b.progress < 80).length;
        const lowUsageCount = budgets.filter((b) => b.progress < 40).length;

        // Calculate penalties and bonuses
        const overBudgetPenalty = overBudgetCount * 20;
        const highUsagePenalty = highUsageCount * 10;
        const mediumUsagePenalty = mediumUsageCount * 5;
        const lowUsageBonus = lowUsageCount * 5;
        const perfectRecordBonus = overBudgetCount === 0 ? 10 : 0;

        // Calculate final score
        let score =
            baseScore - overBudgetPenalty - highUsagePenalty - mediumUsagePenalty + lowUsageBonus + perfectRecordBonus;

        // Cap between 0-100
        score = Math.max(0, Math.min(100, score));

        // Determine label and color
        let label: string;
        let color: string;

        if (score >= 90) {
            label = "Excellent!";
            color = "green";
        } else if (score >= 75) {
            label = "Great!";
            color = "green";
        } else if (score >= 60) {
            label = "Good";
            color = "blue";
        } else if (score >= 40) {
            label = "Fair";
            color = "yellow";
        } else if (score >= 20) {
            label = "Poor";
            color = "orange";
        } else {
            label = "Critical";
            color = "red";
        }

        return {
            score,
            label,
            color,
            breakdown: {
                baseScore,
                overBudgetPenalty,
                highUsagePenalty,
                mediumUsagePenalty,
                lowUsageBonus,
                perfectRecordBonus,
                overBudgetCount,
                highUsageCount,
                mediumUsageCount,
                lowUsageCount,
            },
        };
    }

    /**
     * Calculate budget progress - unified function for single budget or all budgets
     * @param userId - User ID to get budgets and expenses for
     * @param budgetId - Optional specific budget ID. If provided, returns progress for that budget only
     * @returns Budget progress data for single budget or all budgets with overall totals
     */
    async calculateBudgetProgress(userId: string): Promise<
        | BudgetProgress
        | {
              budgets: BudgetProgress[];
              totalProgress: number;
              totalBudgetAmount: number;
              totalSpent: number;
              activeBudgetsThisMonth: number;
              savingsAchieved: number;
              daysUntilReset: number | null;
              onTrackBudgets: number;
              budgetHealth: {
                  score: number;
                  label: string;
                  color: string;
                  breakdown: {
                      baseScore: number;
                      overBudgetPenalty: number;
                      highUsagePenalty: number;
                      mediumUsagePenalty: number;
                      lowUsageBonus: number;
                      perfectRecordBonus: number;
                      overBudgetCount: number;
                      highUsageCount: number;
                      mediumUsageCount: number;
                      lowUsageCount: number;
                  };
              };
          }
    > {
        // Get budgets - either specific one or all for user
        let budgets: BudgetType[];

        budgets = await BudgetDAO.findBudgetsByUserId(userId);

        if (budgets.length === 0) {
            return {
                budgets: [],
                totalProgress: 0,
                totalBudgetAmount: 0,
                totalSpent: 0,
                activeBudgetsThisMonth: 0,
                savingsAchieved: 0,
                daysUntilReset: null,
                onTrackBudgets: 0,
                budgetHealth: {
                    score: 0,
                    label: "No Data",
                    color: "gray",
                    breakdown: {
                        baseScore: 0,
                        overBudgetPenalty: 0,
                        highUsagePenalty: 0,
                        mediumUsagePenalty: 0,
                        lowUsageBonus: 0,
                        perfectRecordBonus: 0,
                        overBudgetCount: 0,
                        highUsageCount: 0,
                        mediumUsageCount: 0,
                        lowUsageCount: 0,
                    },
                },
            };
        }

        // Get all expenses for the user
        const expenses: Transaction[] = await BudgetDAO.getUserExpenses(userId);
        const now: Date = new Date();

        // Calculate progress for each budget
        const budgetProgress = budgets.map((budget: BudgetType) => {
            const budgetStartDate: Date = new Date(budget.startDate);
            const { periodStart } = this.calculatePeriodDates(budget.recurrence, now);

            // Filter expenses from the budget start date to now (not just current period)
            // and match the budget category
            const budgetExpenses: Transaction[] = this.filterBudgetExpenses(expenses, budget, budgetStartDate, now);

            // Calculate total spent from budget start date
            const totalSpent: number = this.calculateTotalSpent(budgetExpenses);

            const progress: number = (totalSpent / budget.amount) * 100;
            const remaining: number = budget.amount - totalSpent;
            const isOverBudget: boolean = totalSpent > budget.amount;

            return {
                id: budget.id,
                title: budget.title,
                amount: budget.amount,
                currency: budget.currency,
                fromRate: budget.fromRate || 1,
                toRate: budget.toRate || 1,
                recurrence: budget.recurrence,
                startDate: budget.startDate,
                category: budget.category,
                createdAt: budget.createdAt,
                periodStart,
                totalSpent,
                remaining,
                progress: Math.min(progress, 100), // Cap at 100%
                isOverBudget,
                expensesCount: budgetExpenses.length,
            } as BudgetProgress;
        });

        // Calculate overall progress for all budgets
        const totalBudgetAmount: number = budgetProgress.reduce(
            (sum: number, budget: BudgetProgress) => sum + budget.amount,
            0
        );
        const totalSpent: number = budgetProgress.reduce(
            (sum: number, budget: BudgetProgress) => sum + budget.totalSpent,
            0
        );
        const totalProgress: number = totalBudgetAmount > 0 ? (totalSpent / totalBudgetAmount) * 100 : 0;
        const activeBudgetsThisMonth: number = budgetProgress.reduce((count: number, budget: BudgetProgress) => {
            const periodStartDate =
                budget.periodStart instanceof Date ? budget.periodStart : new Date(budget.periodStart);
            if (Number.isNaN(periodStartDate.getTime())) {
                return count;
            }
            const hasStarted = new Date(budget.startDate).getTime() <= now.getTime();
            const isCurrentMonth =
                periodStartDate.getMonth() === now.getMonth() && periodStartDate.getFullYear() === now.getFullYear();
            return hasStarted && isCurrentMonth ? count + 1 : count;
        }, 0);

        // Calculate new statistics
        // 1. Savings Achieved - sum of all positive remaining amounts
        const savingsAchieved: number = budgetProgress.reduce((sum: number, budget: BudgetProgress) => {
            return budget.remaining > 0 ? sum + budget.remaining : sum;
        }, 0);

        // 2. Days Until Next Budget Reset
        const daysUntilReset: number | null = this.calculateDaysUntilReset(budgetProgress, now);

        // 3. On-Track Budgets Count (budgets under 80% usage and not over budget)
        const onTrackBudgets: number = budgetProgress.filter((b) => !b.isOverBudget && b.progress < 80).length;

        // 4. Budget Health Score
        const budgetHealth = this.calculateBudgetHealth(budgetProgress);

        return {
            budgets: budgetProgress,
            totalProgress: Math.min(totalProgress, 100),
            totalBudgetAmount,
            totalSpent,
            activeBudgetsThisMonth,
            savingsAchieved: Math.round(savingsAchieved * 100) / 100,
            daysUntilReset,
            onTrackBudgets,
            budgetHealth,
        };
    }

    /**
     * Compare old and new budget values to detect changes
     * Both oldBudget and newBudgetData should have startDate as Date objects
     */
    detectBudgetChanges(oldBudget: any, newBudgetData: any): BudgetChange[] {
        const changes: BudgetChange[] = [];

        if (oldBudget.title !== newBudgetData.title) {
            changes.push({
                field: "title",
                oldValue: oldBudget.title,
                newValue: newBudgetData.title,
            });
        }
        if (oldBudget.amount !== newBudgetData.amount) {
            changes.push({
                field: "amount",
                oldValue: oldBudget.amount,
                newValue: newBudgetData.amount,
            });
        }
        if (oldBudget.recurrence !== newBudgetData.recurrence) {
            changes.push({
                field: "recurrence",
                oldValue: oldBudget.recurrence,
                newValue: newBudgetData.recurrence,
            });
        }
        // Compare dates properly - both should be Date objects at this point
        const oldDate = oldBudget.startDate instanceof Date ? oldBudget.startDate : new Date(oldBudget.startDate);
        const newDate =
            newBudgetData.startDate instanceof Date ? newBudgetData.startDate : new Date(newBudgetData.startDate);
        if (oldDate.getTime() !== newDate.getTime()) {
            changes.push({
                field: "startDate",
                oldValue: oldBudget.startDate,
                newValue: newBudgetData.startDate,
            });
        }
        if (oldBudget.category !== newBudgetData.category) {
            changes.push({
                field: "category",
                oldValue: oldBudget.category,
                newValue: newBudgetData.category,
            });
        }

        return changes;
    }
}
