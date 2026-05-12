import express from "express";
import cors from "cors";
import jobRoutes from "./routes/job.routes.js";
import userRoutes from "./routes/user.routes.js";
import cvRoutes from "./routes/cv.routes.js";
import recommendationRoutes from "./routes/recommendation.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";
import { swaggerUi, swaggerSpec } from "./config/swagger.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// v1 API structure
app.use("/api/v1/cv", cvRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/jobs", recommendationRoutes); // /recommendations
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/analysis", analysisRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.json({ message: "ITCareerMatch API is running!" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;
