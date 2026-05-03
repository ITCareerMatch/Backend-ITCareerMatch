import express from "express";
import cors from "cors";
import jobRoutes from "./routes/job.routes.js";
import { swaggerUi, swaggerSpec } from "./config/swagger.js";

const app = express();
app.use(cors());
app.use(express.json());

// routes utama
app.use("/api/v1/jobs", jobRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// root
app.get("/", (req, res) => {
  res.json({ message: "ITCareerMatch API is running!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
