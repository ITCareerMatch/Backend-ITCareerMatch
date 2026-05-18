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

app.use(cors());
app.use(express.json());

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
