import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { csrfProtect } from "./middleware/csrf";

import { errorHandler } from "./middleware/errorHandler";
import { NotFoundError } from "./utils/errors";
import { config } from "./config/env";

import authRoutes from "./routes/auth.routes";
import tasksRoutes from "./routes/tasks.routes";
import adminRoutes from "./routes/admin.routes";

const app = express();

// ─── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  }),
);

// ─── Cookie parsing ────────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── CSRF protection (Double Submit Cookie pattern) ────────────────────────────
app.use(csrfProtect);

// ─── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: {
    status: "fail",
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    status: "fail",
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter);
app.use("/api", generalLimiter);

// ─── Request parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (config.nodeEnv !== "test") {
  app.use(morgan("dev"));
}

// ─── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Task Tracker API is running",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/admin", adminRoutes);

// ─── Serve Static Frontend (Production) ─────────────────────────────────────────
if (config.nodeEnv === "production") {
  const publicPath = path.join(__dirname, "../public");
  app.use(express.static(publicPath));

  app.get("*", (req: Request, res: Response, next: NextFunction) => {
    // Exclude /api routes from the SPA catch-all
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(publicPath, "index.html"));
  });
}

// ─── 404 handler for API routes ───────────────────────────────────────────────
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
