import express from "express";
import { internalOnly } from "../middlewares/internal.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /internal/ai/preview:
 *   post:
 *     summary: Preview Analysis (Guest - No Job Matching)
 *     tags: [Internal]
 *     description: |
 *       **INTERNAL ENDPOINT - NOT FOR PUBLIC USE**
 *
 *       Called by Backend for guest preview analysis.
 *       Performs preprocessing, skill extraction, and skill gap analysis WITHOUT job matching.
 *       Returns basic CV insights and skills only (no job recommendations).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cv_text
 *             properties:
 *               cv_text:
 *                 type: string
 *                 description: Parsed CV text content
 *                 example: "Experienced Software Engineer with 5 years in Node.js, React, and PostgreSQL"
 *     responses:
 *       200:
 *         description: Preview analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 preview_score:
 *                   type: number
 *                   description: CV quality score (0-100)
 *                   example: 75
 *                 extracted_skills:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Node.js", "React", "PostgreSQL"]
 *                 skill_gap:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Skills the CV is missing
 *                   example: ["Docker", "Kubernetes"]
 *                 ai_insight:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Your backend skills are solid", "Consider learning Docker"]
 *                 summary:
 *                   type: string
 *                   example: "Good CV with relevant IT skills"
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       501:
 *         description: AI service not available
 */

/**
 * @swagger
 * /internal/ai/extract:
 *   post:
 *     summary: Extract Skills from CV Text
 *     tags: [Internal]
 *     description: |
 *       **INTERNAL ENDPOINT - NOT FOR PUBLIC USE**
 *
 *       Backend-only endpoint called by the background worker to extract skills from parsed CV text and map them to skill IDs.
 *       Uses NLP/NER to identify technical and professional skills mentioned in the CV.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cv_text
 *               - user_id
 *               - cv_id
 *             properties:
 *               cv_text:
 *                 type: string
 *                 description: Parsed CV text content
 *                 example: "Experienced Software Engineer with 5 years in Node.js, React, and PostgreSQL development"
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the user who owns the CV
 *               cv_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the CV being analyzed
 *     responses:
 *       200:
 *         description: Skills extracted successfully with confidence scores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 extracted_skills:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       skill_id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                         example: "Node.js"
 *                       confidence:
 *                         type: number
 *                         example: 0.95
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       501:
 *         description: AI service not available
 */

/**
 * @swagger
 * /internal/ai/match:
 *   post:
 *     summary: Match CV with Jobs
 *     tags: [Internal]
 *     description: |
 *       **INTERNAL ENDPOINT - NOT FOR PUBLIC USE**
 *
 *       Backend-only endpoint called by the background worker to match a user's CV against filtered job listings.
 *       Uses SBERT (Sentence-BERT) for semantic similarity scoring and generates skill gap analysis.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cv_text
 *               - cv_id
 *               - user_id
 *               - filtered_jobs
 *             properties:
 *               cv_text:
 *                 type: string
 *                 description: Parsed CV text content
 *               cv_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the CV being matched
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the user
 *               filtered_jobs:
 *                 type: array
 *                 description: Pre-filtered jobs to match against
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     title:
 *                       type: string
 *                     requirements:
 *                       type: string
 *     responses:
 *       200:
 *         description: Match results with scores and skill gap analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 matches:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       job_id:
 *                         type: string
 *                         format: uuid
 *                       match_score:
 *                         type: number
 *                         example: 85.5
 *                       skill_match:
 *                         type: array
 *                         items:
 *                           type: string
 *                       skill_gap:
 *                         type: array
 *                         items:
 *                           type: string
 *                       ai_insight:
 *                         type: string
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       501:
 *         description: AI service not available
 */

// Preview endpoint - for guest quick analysis (no job matching)
router.post("/preview", internalOnly, async (req, res, next) => {
  try {
    const { cv_text } = req.body;

    if (!cv_text) {
      return res.status(400).json({
        success: false,
        message: "cv_text is required",
      });
    }

    // In production, this would call the Python AI service
    // for preview analysis without job matching
    res.status(501).json({
      success: false,
      message: "This endpoint requires AI service to be running",
    });
  } catch (error) {
    next(error);
  }
});

// Extract skills endpoint
router.post("/extract", internalOnly, async (req, res, next) => {
  try {
    const { cv_text, user_id, cv_id } = req.body;

    if (!cv_text) {
      return res.status(400).json({
        success: false,
        message: "cv_text is required",
      });
    }

    // In production, this would call the Python AI service
    // or local NLP model to extract skills
    res.status(501).json({
      success: false,
      message: "This endpoint requires AI service to be running",
    });
  } catch (error) {
    next(error);
  }
});

// Match endpoint
router.post("/match", internalOnly, async (req, res, next) => {
  try {
    const { cv_text, cv_id, user_id, filtered_jobs } = req.body;

    if (!cv_text || !filtered_jobs) {
      return res.status(400).json({
        success: false,
        message: "cv_text and filtered_jobs are required",
      });
    }

    // In production, this would call the Python AI service
    // to perform SBERT similarity scoring and skill gap analysis
    res.status(501).json({
      success: false,
      message: "This endpoint requires AI service to be running",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
