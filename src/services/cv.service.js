import { v4 as uuidv4 } from "uuid";
import cvRepository from "../repositories/cv.repository.js";
import { addTaskToQueue, getTaskStatus, getTaskResult } from "../lib/queue.js";
import {
  createGuestSession,
  getGuestSession,
  deleteGuestSession,
} from "../lib/redis-session.js";

/**
 * Convert form input to structured CV text format
 * @param {Object} formData - Form fields from manual CV input
 * @returns {String} Structured CV text
 */
export function convertFormToCvText(formData) {
  const parts = [];

  // Header section
  if (formData.name) {
    parts.push(`NAMA LENGKAP: ${formData.name}`);
  }

  if (formData.email) {
    parts.push(`EMAIL: ${formData.email}`);
  }

  if (formData.phone) {
    parts.push(`NO. TELEPON: ${formData.phone}`);
  }

  if (formData.location) {
    parts.push(`LOKASI: ${formData.location}`);
  }

  // Education section
  if (formData.education && formData.education.length > 0) {
    parts.push("=== PENDIDIKAN ===");
    if (Array.isArray(formData.education)) {
      formData.education.forEach((edu) => {
        const eduParts = [];
        if (edu.degree) eduParts.push(edu.degree);
        if (edu.institution) eduParts.push(`dari ${edu.institution}`);
        if (edu.year) eduParts.push(`(${edu.year})`);
        if (eduParts.length > 0) {
          parts.push(eduParts.join(" "));
        }
      });
    }
  }

  // Experience section
  if (formData.experience && formData.experience.length > 0) {
    parts.push("=== PENGALAMAN KERJA ===");
    if (Array.isArray(formData.experience)) {
      formData.experience.forEach((exp) => {
        if (exp.position || exp.company) {
          const expParts = [];
          if (exp.position) expParts.push(exp.position);
          if (exp.company) expParts.push(`di ${exp.company}`);
          if (exp.duration) expParts.push(`(${exp.duration})`);
          parts.push(expParts.join(" "));
        }
        if (exp.description) {
          parts.push(`Deskripsi: ${exp.description}`);
        }
      });
    }
  }

  // Skills section
  if (formData.skills) {
    parts.push("=== SKILL & KEMAMPUAN ===");
    if (Array.isArray(formData.skills)) {
      parts.push("Skills: " + formData.skills.join(", "));
    } else if (typeof formData.skills === "string") {
      parts.push("Skills: " + formData.skills);
    }
  }

  // Summary section
  if (formData.summary) {
    parts.push("=== RINGKASAN PROFESIONAL ===");
    parts.push(formData.summary);
  }

  // Combine all parts with proper spacing
  const result = parts.join("\n");

  return result;
}

/**
 * Save CV archive to database
 * @param {Object} params - {userId, file?, cvText, cvSource}
 * @returns {Object} CV archive record
 */
export async function saveCvArchive({
  userId,
  file,
  cvText,
  cvSource = "upload",
}) {
  try {
    let fileUrl = null;
    let fileName = null;

    // Upload file to Supabase Storage only if provided
    if (file) {
      fileUrl = await cvRepository.uploadToSupabase(file);
      fileName = file.originalname;
    }

    // Save metadata to DB
    return cvRepository.saveCvArchive({
      userId,
      fileName,
      fileUrl,
      rawText: cvText,
      cvSource,
      status: "processing",
    });
  } catch (error) {
    console.error("Error saving CV archive:", error);
    throw error;
  }
}

/**
 * Create analysis task for authenticated user
 * @param {Object} params - {userId, cvId, cvText}
 * @returns {String} Task ID
 */
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

/**
 * Get task status and result
 * @param {Object} params - {userId, taskId}
 * @returns {Object} {status, result}
 */
export async function getTaskStatusAndResult({ userId, taskId }) {
  try {
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

/**
 * Create guest preview session (temporary, no DB save)
 * @param {Object} params - AI service response data
 * @returns {Object} {tempToken, preview}
 */
export async function createGuestPreviewSession({ cvText, aiResponse }) {
  try {
    // Create temporary session in Redis (TTL 30 minutes)
    const tempToken = await createGuestSession({
      raw_text: cvText,
      extracted_skills: aiResponse.extracted_skills || [],
      skill_gap: aiResponse.skill_gap || [],
      ai_insight: aiResponse.ai_insight || [],
      preview_score: aiResponse.preview_score || 0,
    });

    return {
      tempToken,
      preview: {
        score: aiResponse.preview_score || 0,
        extracted_skills: aiResponse.extracted_skills || [],
        skill_gap: aiResponse.skill_gap || [],
        ai_insight: aiResponse.ai_insight || [],
        summary: aiResponse.summary || "CV preview processed successfully",
      },
    };
  } catch (error) {
    console.error("Error creating guest preview session:", error);
    throw error;
  }
}

/**
 * Claim guest session and upgrade to full analysis
 * @param {Object} params - {userId, tempToken}
 * @returns {String} New task ID for full analysis
 */
export async function claimGuestSession({ userId, tempToken }) {
  try {
    // Get session from Redis
    const session = await getGuestSession(tempToken);

    if (!session) {
      throw new Error("Session expired or not found");
    }

    // Save CV to permanent storage
    const cvArchive = await cvRepository.saveCvArchive({
      userId,
      fileName: null, // No file for manual input in preview
      fileUrl: null,
      rawText: session.raw_text,
      cvSource: "preview_upgrade",
      status: "processing",
    });

    // Create full analysis task
    const taskId = await createAnalysisTask({
      userId,
      cvId: cvArchive.id,
      cvText: session.raw_text,
    });

    // Delete session after claim
    await deleteGuestSession(tempToken);

    return taskId;
  } catch (error) {
    console.error("Error claiming guest session:", error);
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
