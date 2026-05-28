import { Worker } from "bullmq";
import IORedis from "ioredis";
import { processJobToAi } from "./services/ai.service.js";
import cvRepository from "./repositories/cv.repository.js";
import { updateTaskStatus } from "./lib/queue.js";

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  },
);

console.log("AI Worker is running...");

const worker = new Worker(
  "aiQueue",
  async (job) => {
    if (job.name === "match-job") {
      try {
        console.log(
          `Processing AI job for user: ${job.data.userId}, cvId: ${job.data.cvId}`,
        );
        const result = await processJobToAi(job.data);
        if (job.data.cvId) {
          await cvRepository.updateCvArchiveStatus(job.data.cvId, "completed");
        }
        if (job.data.taskId) {
          updateTaskStatus(job.data.taskId, "completed", result);
        }
        console.log("AI Job processed successfully:", result);
        return result;
      } catch (error) {
        console.error(
          `Failed to process AI job for user: ${job.data.userId}`,
          error,
        );
        if (job.data.cvId) {
          await cvRepository.updateCvArchiveStatus(job.data.cvId, "failed");
        }
        if (job.data.taskId) {
          updateTaskStatus(job.data.taskId, "failed", {
            message: error.message,
          });
        }
        throw error; // Throw error to let BullMQ handle retry logic
      }
    }
  },
  { connection },
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.log(`Job ${job.id} has failed with ${err.message}`);
});
