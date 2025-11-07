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
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authenticateToken } from "./middleware/auth.middleware";

dotenv.config();

const app = express();

// CORS must be first to handle preflight requests
app.use(
    cors({
        origin: ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://localhost:3002"],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        exposedHeaders: ["Content-Range", "X-Content-Range"],
        optionsSuccessStatus: 200,
    })
);

app.use(morgan(`[${process.env.NODE_ENV}] :method :url :status :response-time ms :date[iso]`));

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'https://cdn.jsdelivr.net'"],
                styleSrc: ["'self'", "'unsafe-inline'", "'https://fonts.googleapis.com'"],
                imgSrc: ["'self'", "data:", "https://*"],
                fontSrc: ["'self'", "'fonts.gstatic.com'"],
                connectSrc: ["'self'", "'api.fxratesapi.com'", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
            },
        },
        crossOriginResourcePolicy: {
            policy: "cross-origin",
        },
        xDnsPrefetchControl: { allow: true },
        hidePoweredBy: true,
    })
);

app.use("/status", authenticateToken, expressStatusMonitor());
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware - must come before passport
app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            (() => {
                throw new Error("SESSION_SECRET environment variable is required");
            })(),
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            maxAge: 24 * 60 * 60 * 1000,
        },
    })
);

// Passport middleware - must come after session
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
mongoose
    .connect(
        process.env.MONGODB_URI ||
            (() => {
                throw new Error("MONGODB_URI environment variable is required");
            })()
    )
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

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === "production" ? 5 : 50, // 5 in production, 50 in development
    message: "Too many login attempts, please try again later",
});

// Test CORS endpoint
app.get("/api/test-cors", (req, res) => {
    res.json({ message: "CORS is working!", origin: req.headers.origin });
});

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/analytics", analyticsRoutes);

const PORT = process.env.PORT || 8000;

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}, environment: ${process.env.NODE_ENV}`);
});
