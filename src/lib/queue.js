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

// Task metadata store in Redis (persistent)
const TASK_PREFIX = "task:";
const TASK_TTL = 7 * 24 * 60 * 60; // 7 days

export async function addTaskToQueue({ taskId, userId, cvId, cvText }) {
  try {
    // Add job to queue
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
        // Add timeout of 5 minutes per job
        timeout: 5 * 60 * 1000,
      },
    );

    // Store task metadata in Redis with TTL
    const taskKey = `${TASK_PREFIX}${taskId}`;
    await connection.setex(
      taskKey,
      TASK_TTL,
      JSON.stringify({
        status: "processing",
        result: null,
        created_at: new Date().toISOString(),
      }),
    );

    return taskId;
  } catch (error) {
    console.error("Error adding task to queue:", error);
    throw error;
  }
}

export async function getTaskStatus(taskId) {
  try {
    const taskKey = `${TASK_PREFIX}${taskId}`;
    const data = await connection.get(taskKey);

    if (data) {
      const parsed = JSON.parse(data);
      return parsed.status;
    }

    // Fallback to queue status if not in Redis
    const job = await cvAnalysisQueue.getJob(taskId);
    if (!job) return "not-found";

    const state = await job.getState();
    return state;
  } catch (error) {
    console.error("Error getting task status:", error);
    throw error;
  }
}

export async function getTaskResult(taskId) {
  try {
    const taskKey = `${TASK_PREFIX}${taskId}`;
    const data = await connection.get(taskKey);

    if (data) {
      const parsed = JSON.parse(data);
      return parsed.result || null;
    }

    return null;
  } catch (error) {
    console.error("Error getting task result:", error);
    throw error;
  }
}

export function updateTaskStatus(taskId, status, result = null) {
  const taskKey = `${TASK_PREFIX}${taskId}`;

  connection
    .setex(
      taskKey,
      TASK_TTL,
      JSON.stringify({
        status,
        result,
        updated_at: new Date().toISOString(),
      }),
    )
    .catch((err) => {
      console.error(`Error updating task status for ${taskId}:`, err);
    });
}
