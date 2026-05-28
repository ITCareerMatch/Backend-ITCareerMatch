import dotenv from "dotenv";
import { Queue } from "bullmq";
import IORedis from "ioredis";

dotenv.config();

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
);
const aiQueue = new Queue("aiQueue", { connection });

async function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error("Usage: node scripts/check_job.js <jobId>");
    process.exit(1);
  }

  const job = await aiQueue.getJob(jobId);
  if (!job) {
    console.log("Job not found in queue");
    process.exit(0);
  }

  const state = await job.getState();
  console.log("Job state:", state);
  console.log("Job data:", job.data);
  process.exit(0);
}

main();
