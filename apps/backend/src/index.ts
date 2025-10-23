import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import expressStatusMonitor from "express-status-monitor";
import mongoose from "mongoose";
import morgan from "morgan";
import cron from "node-cron";
import passport from "./config/passport";
import analyticsRoutes from "./routes/analytics.routes";
import authRoutes from "./routes/auth.routes";
import budgetRoutes from "./routes/budget.routes";
import currencyRoutes from "./routes/currency.routes";
import profileRoutes from "./routes/profile.routes";
import expenseRoutes from "./routes/transaction.routes";
import { RecurringTransactionJobService } from "./services/recurringTransactionJob.service";

dotenv.config();

const app = express();

app.use(morgan("method :url :status - :response-time ms :date[iso]"));
app.use(expressStatusMonitor());
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
});
