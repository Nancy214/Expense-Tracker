import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import passport from "./config/passport";
import session from "express-session";
import expenseRoutes from "./routes/transaction.routes";
import budgetRoutes from "./routes/budget.routes";
import profileRoutes from "./routes/profile.routes";
import analyticsRoutes from "./routes/analytics.routes";
import currencyRoutes from "./routes/currency.routes";
import cron from "node-cron";
import { TransactionModel } from "./models/transaction.model";
import { TransactionOrBillDocument } from "./types/transactions";
import { User } from "./models/user.model";
import { BudgetLog } from "./models/budget-log.model";
import { getTodayInTimezone } from "./utils/timezoneUtils";
import { RecurringTransactionJobService } from "./services/recurringTransactionJob.service";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(
    cors({
        origin: ["http://localhost:3000", "http://localhost:8000"],
        credentials: true,
    })
);

// Session middleware - must come before passport
app.use(
    session({
        secret: process.env.SESSION_SECRET || "your-session-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false, // Set to true in production with HTTPS
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    })
);

// Passport middleware - must come after session
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI || "")
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });

// Helper to get today's date in YYYY-MM-DD
function getToday() {
    const now: Date = new Date();
    return now.toISOString().slice(0, 10);
}

// Recurring transaction job - runs every hour to process recurring transactions
cron.schedule("0 * * * *", async () => {
    try {
        console.log(`[CronJob] Starting recurring transaction job at ${new Date().toISOString()}`);
        await RecurringTransactionJobService.processAllRecurringTransactions();
        console.log(`[CronJob] Recurring transaction job completed at ${new Date().toISOString()}`);
    } catch (error) {
        console.error("[CronJob] Error in recurring transaction job:", error);
    }
});

// Helper to get next date for a given frequency
/* function getNextDate(date: Date, frequency: string) {
    const d = new Date(date);
    if (frequency === "daily") d.setDate(d.getDate() + 1);
    else if (frequency === "weekly") d.setDate(d.getDate() + 7);
    else if (frequency === "monthly") d.setMonth(d.getMonth() + 1);
    else if (frequency === "yearly") d.setFullYear(d.getFullYear() + 1);
    return d;
} */

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/analytics", analyticsRoutes);

const PORT = process.env.PORT || 8000;

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);

    /* try {
    await axios.post(`http://localhost:${PORT}/api/currency/init`);
    console.log("Currencies initialized");
  } catch (error) {
    console.error("Error initializing currencies:", error);
  } */
});
