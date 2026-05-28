import dotenv from "dotenv";

dotenv.config();

await import("./ai.worker.js");

console.log("Starting ITCareerMatch Worker...");
console.log("Redis Host:", process.env.REDIS_HOST || "localhost");
console.log("Redis Port:", process.env.REDIS_PORT || "6379");
console.log(
  "AI Service URL:",
  process.env.AI_API_URL || "http://localhost:8000",
);
console.log("✓ AI Worker initialized and listening for jobs...");

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  process.exit(0);
});
