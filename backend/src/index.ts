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
import axios from "axios";
import currencyRoutes from "./routes/currency.routes";
import cron from "node-cron";
import { TransactionModel } from "./models/transaction.model";

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
    const now = new Date();
    return now.toISOString().slice(0, 10);
}

cron.schedule("0 0 * * *", async () => {
    // Recurring Expenses only
    const recurringExpenses = await TransactionModel.find({ isRecurring: true });
    const today = getToday();

    for (const template of recurringExpenses) {
        // Check if an instance for today exists
        const exists = await TransactionModel.findOne({
            templateId: template._id,
            date: today,
        });
        if (!exists) {
            await TransactionModel.create({
                ...template.toObject(),
                _id: undefined,
                date: today,
                templateId: template._id,
                isRecurring: false,
            });
        }
    }
    //console.log("Recurring expenses processed for", today);
});

// Helper to get next date for a given frequency
function getNextDate(date: Date, frequency: string) {
    const d = new Date(date);
    if (frequency === "daily") d.setDate(d.getDate() + 1);
    else if (frequency === "weekly") d.setDate(d.getDate() + 7);
    else if (frequency === "monthly") d.setMonth(d.getMonth() + 1);
    else if (frequency === "yearly") d.setFullYear(d.getFullYear() + 1);
    return d;
}

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
