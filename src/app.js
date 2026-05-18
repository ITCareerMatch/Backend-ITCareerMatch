import express from "express";
import cors from "cors";
import jobRoutes from "./routes/job.routes.js";
import userRoutes from "./routes/user.routes.js";
import cvRoutes from "./routes/cv.routes.js";
import recommendationRoutes from "./routes/recommendation.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";
import internalRoutes from "./routes/internal.routes.js";
import { swaggerUi, swaggerSpec } from "./config/swagger.js";

const app = express();

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow all origins in development, restrict in production
    if (process.env.NODE_ENV === "development") {
      return callback(null, true);
    }

    // Production: Allow specific origins
    const allowedOrigins = [
      "https://itcareermatch.up.railway.app",
      "https://itcareermatch.com",
      "https://www.itcareermatch.com",
      "http://localhost:3000",
      "http://localhost:3001",
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS rejected origin: ${origin}`);
      callback(null, true); // Still allow to prevent blocking, but log it
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  optionsSuccessStatus: 200,
  preflightContinue: false,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Debug middleware - log incoming requests
app.use((req, res, next) => {
  if (req.path.includes("/cv/preview")) {
    console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log("Headers:", {
      "content-type": req.headers["content-type"],
      "content-length": req.headers["content-length"],
    });
  }
  next();
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// v1 API structure
app.use("/api/v1/cv", cvRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/jobs", recommendationRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/analysis", analysisRoutes);

// Internal endpoints (Backend & Worker only)
app.use("/internal/ai", internalRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.json({ message: "ITCareerMatch API is running!" });
});

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error(`[${status}] ${message}`, err.stack);

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;
