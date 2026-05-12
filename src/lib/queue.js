// Dummy queue implementation, replace with BullMQ/Redis
const taskStore = {};

export async function addTaskToQueue({ taskId, userId, cvId, cvText }) {
  // Simulate async processing
  taskStore[taskId] = { status: "processing", result: null };
  setTimeout(() => {
    taskStore[taskId] = {
      status: "completed",
      result: {
        recommendations: [], // Fill with dummy data if needed
      },
    };
  }, 2000); // Simulate 2s processing
}

export async function getTaskStatus(taskId) {
  return taskStore[taskId]?.status || "processing";
}

export async function getTaskResult(taskId) {
  return taskStore[taskId]?.result || null;
}
