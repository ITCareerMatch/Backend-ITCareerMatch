import { Worker } from "bullmq";
import axios from "axios";
import { cvAnalysisQueue, updateTaskStatus } from "./queue.js";
import cvRepository from "../repositories/cv.repository.js";
import analysisRepository from "../repositories/analysis.repository.js";
import jobRepository from "../repositories/job.repository.js";

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};

// AI Service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export async function setupWorker() {
  const worker = new Worker("cv-analysis", processJob, {
    connection: redisConnection,
    concurrency: 2,
  });

  worker.on("completed", (job) => {
    console.log(`✓ Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    console.error(`✗ Job ${job.id} failed:`, err.message);
  });

  worker.on("error", (error) => {
    console.error("Worker error:", error);
  });

  return worker;
}

async function processJob(job) {
  const { taskId, userId, cvId, cvText } = job.data;

  try {
    console.log(`Processing job ${taskId} for user ${userId}`);

    // Step 1: Get CV Archive
    const cvArchive = await cvRepository.getCvArchiveById(cvId);
    if (!cvArchive) {
      throw new Error("CV archive not found");
    }

    // Step 2: Call AI Service to extract skills and analyze
    console.log("Calling AI service...");
    const aiResponse = await callAIService({
      cv_text: cvText,
      user_id: userId,
      cv_id: cvId,
    });

    // Step 3: Save extracted skills to cv_skills
    if (aiResponse.extracted_skills && aiResponse.extracted_skills.length > 0) {
      console.log("Saving extracted skills...");
      await cvRepository.saveCvSkills(cvId, aiResponse.extracted_skills);
    }

    // Step 4: Save analysis results for each recommendation
    if (aiResponse.recommendations && aiResponse.recommendations.length > 0) {
      console.log(
        `Processing ${aiResponse.recommendations.length} recommendations...`,
      );

      for (const rec of aiResponse.recommendations) {
        try {
          // Check if analysis already exists
          const existing = await analysisRepository.checkAnalysisExists(
            cvId,
            rec.job_id,
          );
          if (existing) continue;

          // Create analysis history
          const analysis = await analysisRepository.createAnalysisHistory({
            userId,
            cvId,
            jobId: rec.job_id,
            matchScore: rec.match_score,
            jobTitleSnapshot: rec.job_title,
            companySnapshot: rec.company,
          });

          // Save skill details
          const skillDetails = [];
          if (rec.skill_match && rec.skill_match.length > 0) {
            rec.skill_match.forEach((skill) => {
              skillDetails.push({
                skill_id: skill.skill_id,
                skill_name_snapshot: skill.name,
                status: "match",
                ai_insight: skill.insight || null,
              });
            });
          }
          if (rec.skill_gap && rec.skill_gap.length > 0) {
            rec.skill_gap.forEach((skill) => {
              skillDetails.push({
                skill_id: skill.skill_id,
                skill_name_snapshot: skill.name,
                status: "gap",
                ai_insight: skill.insight || null,
              });
            });
          }

          if (skillDetails.length > 0) {
            await analysisRepository.createAnalysisDetails(
              analysis.id,
              skillDetails,
            );
          }
        } catch (error) {
          console.error(
            `Error saving analysis for job ${rec.job_id}:`,
            error.message,
          );
        }
      }
    }

    // Step 5: Update CV archive status to active
    await cvRepository.updateCvArchiveStatus(cvId, "active");

    // Step 6: Update task status
    updateTaskStatus(taskId, "completed", {
      recommendations: aiResponse.recommendations || [],
      extracted_skills: aiResponse.extracted_skills || [],
    });

    console.log(`✓ Task ${taskId} completed`);
    return {
      success: true,
      taskId,
      recommendationCount: aiResponse.recommendations?.length || 0,
    };
  } catch (error) {
    console.error(`✗ Error processing task ${taskId}:`, error);
    updateTaskStatus(taskId, "failed", {
      error: error.message,
    });
    throw error;
  }
}

async function callAIService(payload) {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/analyze`,
      payload,
      {
        timeout: 30000,
      },
    );
    return response.data;
  } catch (error) {
    console.error("AI Service error:", error.message);
    throw new Error(`AI Service failed: ${error.message}`);
  }
}

// For development: start worker directly
if (process.env.NODE_ENV !== "test") {
  setupWorker().then(() => {
    console.log("Worker started and listening for jobs...");
  });
}
