import { v4 as uuidv4 } from "uuid";
import cvRepository from "../repositories/cv.repository.js";
import { addTaskToQueue, getTaskStatus, getTaskResult } from "../lib/queue.js";
import { supabase } from "../lib/supabase.js";
import {
  createGuestSession,
  getGuestSession,
  deleteGuestSession,
} from "../lib/redis-session.js";

// Convert form data to CV text format for analysis
export function convertFormToCvText(formData) {
  if (formData.text && typeof formData.text === "string") {
    return formData.text;
  }

  const parts = [];

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

  if (formData.summary) {
    parts.push("=== RINGKASAN PROFESIONAL ===");
    parts.push(formData.summary);
  }

  const result = parts.join("\n");

  return result;
}

// Save cv archive to database and return the saved record
export async function saveCvArchive({
  userId,
  file,
  cvText,
  cvSource = "upload",
  existingFileUrl = null,
  existingFileName = null,
}) {
  try {
    let fileUrl = existingFileUrl;
    let fileName = existingFileName;

    if (file && file.buffer) {
      fileUrl = await cvRepository.uploadToSupabase(file);
      fileName = file.originalname;
    }

    if (!fileName) {
      if (cvSource === "manual") {
        const count = await cvRepository.countManualCvsByUserId(userId);
        fileName = `CV Manual ${count + 1}`;
      } else if (cvSource === "preview_upgrade") {
        const count = await cvRepository.countManualCvsByUserId(userId);
        fileName = `CV Manual ${count + 1}`;
      }
    }

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

// Create analysis task in queue and return task ID
export async function createAnalysisTask({ userId, cvId, cvText }) {
  try {
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

// Get task status and result
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
 * If the guest uploaded a file, the file is first stored in Supabase storage
 */
export async function createGuestPreviewSession({ cvText, file }) {
  try {
    let fileUrl = null;
    let fileName = null;

    if (file) {
      fileUrl = await cvRepository.uploadToSupabase(file);
      fileName = file.originalname;
    }

    const tempToken = await createGuestSession({
      raw_text: cvText,
      file_url: fileUrl,
      file_name: fileName,
    });

    // Only return the temp token for the guest preview flow. All preview
    // details (scores, skills, insights) are intentionally NOT persisted
    // or returned for guest previews.
    return { tempToken };
  } catch (error) {
    console.error("Error creating guest preview session:", error);
    throw error;
  }
}

// Claim guest session and convert to real CV archive + analysis task
export async function claimGuestSession({ userId, tempToken }) {
  try {
    const session = await getGuestSession(tempToken);

    if (!session) {
      throw new Error("Session expired or not found");
    }

    const cvArchive = await saveCvArchive({
      userId,
      file: null,
      cvText: session.raw_text,
      cvSource: "preview_upgrade",
      existingFileUrl: session.file_url || null,
      existingFileName: session.file_name || null,
    });

    const taskId = await createAnalysisTask({
      userId,
      cvId: cvArchive.id,
      cvText: session.raw_text,
    });

    await deleteGuestSession(tempToken);

    return taskId;
  } catch (error) {
    console.error("Error claiming guest session:", error);
    throw error;
  }
}

export function getUserIdFromReq(req) {
  return req.user?.id;
}

export async function getLatestCv(userId) {
  return cvRepository.getLatestCvByUserId(userId);
}

export async function getCvArchives(userId) {
  return cvRepository.getCvArchivesByUserId(userId);
}

export async function deleteCvArchive({ userId, cvId }) {
  try {
    const archive = await cvRepository.getCvArchiveById(cvId);

    if (!archive || archive.user_id !== userId) {
      throw new Error("CV archive not found");
    }

    if (archive.file_url) {
      try {
        const { error: storageError } = await supabase.storage
          .from("cv-uploads")
          .remove([archive.file_url]);

        if (storageError) {
          throw storageError;
        }
      } catch (storageError) {
        console.warn(
          `Warning: Failed to delete CV file from storage for cv ${cvId}:`,
          storageError,
        );
      }
    }

    const deletedArchive = await cvRepository.deleteCvArchiveById(cvId, userId);
    if (!deletedArchive) {
      throw new Error("CV archive not found");
    }

    return deletedArchive;
  } catch (error) {
    console.error(`Error deleting CV archive ${cvId}:`, error);
    throw error;
  }
}
