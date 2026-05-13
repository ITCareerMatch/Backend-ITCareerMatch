import { Queue } from "bullmq";
import IORedis from "ioredis";

// REDIS_URL includes port already
const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
);

// Queue untuk CV Analysis
export const cvAnalysisQueue = new Queue("cv-analysis", {
  connection,
});

// Store untuk task metadata (status, result)
const taskStore = new Map();

export async function addTaskToQueue({ taskId, userId, cvId, cvText }) {
  try {
    await cvAnalysisQueue.add(
      "analyze-cv",
      {
        taskId,
        userId,
        cvId,
        cvText,
      },
      {
        jobId: taskId,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    );

    taskStore.set(taskId, { status: "processing", result: null });
    return taskId;
  } catch (error) {
    console.error("Error adding task to queue:", error);
    throw error;
  }
}

export async function getTaskStatus(taskId) {
  const stored = taskStore.get(taskId);
  if (stored) return stored.status;

  // Try to get from queue
  const job = await cvAnalysisQueue.getJob(taskId);
  if (!job) return "not-found";

  const state = await job.getState();
  return state;
}

export async function getTaskResult(taskId) {
  const stored = taskStore.get(taskId);
  return stored?.result || null;
}

export function updateTaskStatus(taskId, status, result = null) {
  taskStore.set(taskId, { status, result });
}

export function getTaskStore() {
  return taskStore;
}
