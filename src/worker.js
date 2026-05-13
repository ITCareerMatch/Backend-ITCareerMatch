import dotenv from "dotenv";
import { setupWorker } from "./lib/worker.js";

dotenv.config();

console.log("Starting ITCareerMatch Worker...");
console.log("Redis Host:", process.env.REDIS_HOST || "localhost");
console.log("Redis Port:", process.env.REDIS_PORT || "6379");
console.log(
  "AI Service URL:",
  process.env.AI_SERVICE_URL || "http://localhost:8000",
);

setupWorker()
  .then((worker) => {
    console.log("✓ Worker initialized and listening for jobs...");
  })
  .catch((error) => {
    console.error("✗ Failed to start worker:", error);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  process.exit(0);
});
