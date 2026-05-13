import { v4 as uuidv4 } from "uuid";
import cvRepository from "../repositories/cv.repository.js";
import { addTaskToQueue, getTaskStatus, getTaskResult } from "../lib/queue.js";

export async function saveCvArchive({ userId, file, cvText }) {
  try {
    // Upload file to Supabase Storage
    const fileUrl = await cvRepository.uploadToSupabase(file);

    // Save metadata to DB
    return cvRepository.saveCvArchive({
      userId,
      fileName: file.originalname,
      fileUrl,
      rawText: cvText,
      status: "processing",
    });
  } catch (error) {
    console.error("Error saving CV archive:", error);
    throw error;
  }
}

export async function createAnalysisTask({ userId, cvId, cvText }) {
  try {
    // Add to queue, return taskId
    const taskId = await addTaskToQueue({
      taskId: uuidv4(),
      userId,
      cvId,
      cvText,
    });
    return taskId;
  } catch (error) {
    console.error("Error creating analysis task:", error);
    throw error;
  }
}

export async function getTaskStatusAndResult({ userId, taskId }) {
  try {
    // Get status from queue/db
    const status = await getTaskStatus(taskId);
    let result = null;
    if (status === "completed") {
      result = await getTaskResult(taskId);
    }
    return { status, result };
  } catch (error) {
    console.error("Error getting task status:", error);
    throw error;
  }
}

export function getUserIdFromReq(req) {
  // Assume req.user injected by auth middleware
  return req.user?.id;
}

export async function getLatestCv(userId) {
  return cvRepository.getLatestCvByUserId(userId);
}

export async function getCvArchives(userId) {
  return cvRepository.getCvArchivesByUserId(userId);
}
