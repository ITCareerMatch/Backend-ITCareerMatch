import { v4 as uuidv4 } from "uuid";
import {
  uploadToSupabase,
  saveCvArchiveToDb,
  getCvArchiveById,
} from "../repositories/cv.repository.js";
import { addTaskToQueue, getTaskStatus, getTaskResult } from "../lib/queue.js";

export async function saveCvArchive({ userId, file, cvText }) {
  // Upload file to Supabase Storage
  const fileUrl = await uploadToSupabase(file);
  // Save metadata to DB
  return saveCvArchiveToDb({
    userId,
    fileUrl,
    fileName: file.originalname,
    rawText: cvText,
    status: "processing",
  });
}

export async function createAnalysisTask({ userId, cvId, cvText }) {
  // Add to queue, return taskId
  const taskId = uuidv4();
  await addTaskToQueue({ taskId, userId, cvId, cvText });
  return taskId;
}

export async function getTaskStatusAndResult({ userId, taskId }) {
  // Get status from queue/db
  const status = await getTaskStatus(taskId);
  let result = null;
  if (status === "completed") {
    result = await getTaskResult(taskId);
  }
  return { status, result };
}

export function getUserIdFromReq(req) {
  // Assume req.user injected by auth middleware
  return req.user?.id;
}
