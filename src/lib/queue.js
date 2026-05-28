import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
);

export const aiQueue = new Queue("aiQueue", {
  connection,
});

const TASK_PREFIX = "task:";
const TASK_TTL = 7 * 24 * 60 * 60; // 7 days

export async function addTaskToQueue({ taskId, userId, cvId, cvText }) {
  try {
    await aiQueue.add(
      "match-job",
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
        timeout: 5 * 60 * 1000,
      },
    );

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
    const job = await aiQueue.getJob(taskId);
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

export async function cleanupUserQueueJobs(userId, cvIds = []) {
  try {
    const jobs = await aiQueue.getJobs([
      "waiting",
      "delayed",
      "paused",
      "completed",
      "failed",
    ]);

    let removedCount = 0;

    for (const job of jobs) {
      const jobUserId = job.data?.userId;
      const jobCvId = job.data?.cvId;

      if (jobUserId !== userId) {
        continue;
      }

      if (cvIds.length > 0 && jobCvId && !cvIds.includes(jobCvId)) {
        continue;
      }

      try {
        if (job.data?.taskId) {
          await connection.del(`${TASK_PREFIX}${job.data.taskId}`);
        }

        await job.remove();
        removedCount++;
      } catch (removeError) {
        console.warn(
          `Warning: Failed to remove queue job ${job.id} for user ${userId}:`,
          removeError,
        );
      }
    }

    return removedCount;
  } catch (error) {
    console.error(`Error cleaning up queue jobs for user ${userId}:`, error);
    throw error;
  }
}
