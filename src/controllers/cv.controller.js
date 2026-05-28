import { parsePdfToText, quickScorePreview } from "../lib/cv.utils.js";
import {
  saveCvArchive,
  createAnalysisTask,
  getTaskStatusAndResult,
  getUserIdFromReq,
  convertFormToCvText,
  createGuestPreviewSession,
  claimGuestSession,
  getCvArchives,
  deleteCvArchive,
} from "../services/cv.service.js";
import {
  validateATSFormat,
  validateCVJsonFormat,
} from "../lib/ats-validation.js";

class CvController {
  /**
   * Preview CV as guest (no DB save, temp session in Redis)
   * Supports both file upload and manual form input
   */
  async preview(req, res, next) {
    try {
      let cvText = null;

      // Check if file upload or form input
      if (req.file) {
        // File upload path
        const file = req.file;

        // Parse PDF to text
        cvText = await parsePdfToText(file.buffer);

        if (!cvText || cvText.trim().length < 50) {
          return res.status(400).json({
            success: false,
            message:
              "CV cannot be read. Please upload a text-based PDF instead of a scanned/image PDF.",
          });
        }
      } else if (req.body.cv_data) {
        // Manual form input path - convert form to text
        let cvData = req.body.cv_data;

        // DEBUG: Log what we receive
        if (typeof cvData === "string") {
          try {
            cvData = JSON.parse(cvData);
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: "cv_data must be valid JSON",
              error: e.message,
              received: typeof req.body.cv_data,
              raw: req.body.cv_data?.substring(0, 100),
            });
          }
        }

        cvText = convertFormToCvText(cvData);

        if (!cvText || cvText.trim().length < 50) {
          return res.status(400).json({
            success: false,
            message:
              "CV data is too short. Please provide more information (minimum 50 characters).",
            debug: {
              cvTextLength: cvText?.length || 0,
              cvTextPreview: cvText?.substring(0, 200),
              cvDataKeys: Object.keys(cvData || {}),
              cvData: cvData,
            },
          });
        }

        // Validate JSON CV format
        try {
          validateCVJsonFormat(cvData);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: "CV format tidak valid: " + e.message,
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "Either file upload or cv_data form is required",
        });
      }

      // Validate ATS format for all CVs (both file and manual input)
      try {
        const atsValidation = validateATSFormat(cvText);
        console.log("✓ ATS Validation passed:", atsValidation);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: "CV format tidak sesuai ATS: " + e.message,
          hint: "Pastikan CV dalam format text yang rapi dan terstruktur (bukan scanned image)",
        });
      }

      // For preview, use local quick scoring (no AI service call needed)
      // AI service (/internal/ai/match) is only for full batch analysis with job matching
      const aiResponse = {
        preview_score: 65, // Basic score based on CV structure
        extracted_skills: [], // Skills will be extracted during full analysis
        skill_gap: [],
        ai_insight: [
          "Preview mode: Full analysis requires login and file upload",
        ],
        summary: "Basic CV preview",
      };

      // Create temporary guest session in Redis
      const { tempToken, preview } = await createGuestPreviewSession({
        cvText,
        aiResponse,
      });

      res.json({
        success: true,
        temp_token: tempToken,
        preview,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Analyze CV for authenticated user (full analysis)
   * Supports both file upload and manual form input
   */
  async analyze(req, res, next) {
    try {
      const userId = getUserIdFromReq(req);
      let cvText = null;

      // Check if file upload or form input
      if (req.file) {
        // File upload path
        const file = req.file;
        console.log(
          `\n📄 FILE UPLOAD: ${file.originalname} (${file.size} bytes)`,
        );

        // Parse PDF to text
        cvText = await parsePdfToText(file.buffer);
        console.log(`✓ Parsed text length: ${cvText?.length || 0} characters`);

        if (!cvText || cvText.trim().length < 50) {
          console.error("❌ Parsed text too short or empty");
          return res.status(400).json({
            success: false,
            message:
              "CV cannot be read. Please upload a text-based PDF instead of a scanned/image PDF.",
          });
        }

        // Validate ATS format
        try {
          const atsValidation = validateATSFormat(cvText);
          console.log("✓ ATS Validation passed:", atsValidation);
        } catch (e) {
          console.error("❌ ATS Validation failed:", e.message);
          return res.status(400).json({
            success: false,
            message: "CV format tidak sesuai ATS: " + e.message,
            hint: "Pastikan CV dalam format text yang rapi dan terstruktur (bukan scanned image)",
          });
        }

        // Save to DB (cv_archives)
        console.log(
          `\n💾 Saving to database: userId=${userId}, cvText length=${cvText?.length || 0}`,
        );
        const cvArchive = await saveCvArchive({
          userId,
          file,
          cvText,
          cvSource: "upload",
        });
        console.log(
          `✓ Saved to cv_archives: id=${cvArchive.id}, raw_text length=${cvArchive.raw_text?.length || 0}`,
        );

        // Trigger async AI analysis (queue)
        const taskId = await createAnalysisTask({
          userId,
          cvId: cvArchive.id,
          cvText,
        });

        return res.json({ success: true, task_id: taskId });
      } else if (req.body.cv_data) {
        // Manual form input path
        let cvData = req.body.cv_data;

        // Parse JSON string if it comes as string from multipart/form-data
        if (typeof cvData === "string") {
          try {
            cvData = JSON.parse(cvData);
          } catch (e) {
            console.error("JSON parse error:", e.message, "Raw:", cvData);
            return res.status(400).json({
              success: false,
              message: "cv_data must be valid JSON",
              error: e.message,
            });
          }
        }

        console.log("Parsed cvData:", cvData);
        cvText = convertFormToCvText(cvData);
        console.log(
          "Generated cvText length:",
          cvText.length,
          "cvText:",
          cvText,
        );

        if (!cvText || cvText.trim().length < 50) {
          return res.status(400).json({
            success: false,
            message:
              "CV data is too short. Please provide more information (minimum 50 characters).",
            debug: {
              cvTextLength: cvText?.length || 0,
              cvData,
            },
          });
        }

        // Validate JSON CV format
        try {
          validateCVJsonFormat(cvData);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: "CV format tidak valid: " + e.message,
          });
        }

        // Validate ATS format
        try {
          const atsValidation = validateATSFormat(cvText);
          console.log("✓ ATS Validation passed:", atsValidation);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: "CV format tidak sesuai ATS: " + e.message,
            hint: "Pastikan CV dalam format text yang rapi dan terstruktur (bukan scanned image)",
          });
        }

        // Save to DB (cv_archives) without file
        const cvArchive = await saveCvArchive({
          userId,
          file: null,
          cvText,
          cvSource: "manual",
        });

        // Trigger async AI analysis (queue)
        const taskId = await createAnalysisTask({
          userId,
          cvId: cvArchive.id,
          cvText,
        });

        return res.json({ success: true, task_id: taskId });
      } else {
        return res.status(400).json({
          success: false,
          message: "Either file upload or cv_data form is required",
        });
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * Claim temporary guest session and upgrade to full analysis
   * Authenticated users can claim their preview session to get full recommendations
   */
  async claim(req, res, next) {
    try {
      const userId = getUserIdFromReq(req);
      const { temp_token } = req.body;

      if (!temp_token) {
        return res.status(400).json({
          success: false,
          message: "temp_token is required",
        });
      }

      // Claim session and create full analysis task
      const taskId = await claimGuestSession({
        userId,
        tempToken: temp_token,
      });

      res.json({ success: true, task_id: taskId });
    } catch (err) {
      if (err.message === "Session expired or not found") {
        return res.status(410).json({
          success: false,
          message:
            "Preview session has expired. Please upload/input your CV again.",
        });
      }
      next(err);
    }
  }

  /**
   * Get status of AI analysis
   */
  async status(req, res, next) {
    try {
      const { task_id } = req.params;
      const userId = getUserIdFromReq(req);
      const { status, result } = await getTaskStatusAndResult({
        userId,
        taskId: task_id,
      });
      res.json({ success: true, status, result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all CV archives for authenticated user
   */
  async archives(req, res, next) {
    try {
      const userId = getUserIdFromReq(req);
      const data = await getCvArchives(userId);

      res.json({
        success: true,
        data: data.map((cv) => ({
          id: cv.id,
          file_name: cv.file_name,
          file_url: cv.file_url,
          cv_source: cv.cv_source,
          status: cv.status,
          uploaded_at: cv.uploaded_at,
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete a specific CV archive and related analysis data
   */
  async deleteArchive(req, res, next) {
    try {
      const userId = getUserIdFromReq(req);
      const { id } = req.params;

      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!uuidPattern.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid CV ID format",
        });
      }

      await deleteCvArchive({ userId, cvId: id });

      res.json({
        success: true,
        message: "CV archive and related data deleted successfully",
      });
    } catch (err) {
      if (err.message === "CV archive not found") {
        return res.status(404).json({
          success: false,
          message: "CV archive not found",
        });
      }

      next(err);
    }
  }

  /**
   * Analyze single CV against single job for gap skill analysis
   * Internal endpoint used when user clicks "Lihat Detail" on job listing
   */
  async analyzeSingle(req, res, next) {
    try {
      const { cv_text, job } = req.body;

      // Validate inputs
      if (!cv_text || !cv_text.trim()) {
        return res.status(400).json({
          success: false,
          message: "cv_text is required",
        });
      }

      if (!job || !job.job_id || !job.title || !job.description) {
        return res.status(400).json({
          success: false,
          message: "job object with job_id, title, and description is required",
        });
      }

      // Import analyzeGapSkill from ai.service
      const { analyzeGapSkill } = await import("../services/ai.service.js");
      const analysisResult = await analyzeGapSkill(cv_text, job);

      res.json({
        success: true,
        data: analysisResult,
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new CvController();
