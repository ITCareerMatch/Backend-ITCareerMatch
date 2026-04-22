const express = require("express");
const cors = require("cors");
const jobRoutes = require("./routes/job.routes");
const { swaggerUi, swaggerSpec } = require("./config/swagger");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/v1/jobs", jobRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.json({ message: "ITCareerMatch API is running!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
