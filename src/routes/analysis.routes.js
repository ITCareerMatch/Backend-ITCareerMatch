import express from "express";
import analysisController from "../controllers/analysis.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Analysis
 *   description: AI analysis history and details
 */

/**
 * @swagger
 * /api/v1/analysis/history:
 *   get:
 *     summary: List all analysis history for user
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     description: List all previous AI analysis jobs for the user (CV/job matching history)
 *     responses:
 *       200:
 *         description: List of analysis history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       job_title_snapshot:
 *                         type: string
 *                       company_snapshot:
 *                         type: string
 *                       match_score:
 *                         type: number
 *                       analyzed_at:
 *                         type: string
 *                         format: date-time
 */
router.get("/history", authenticate, analysisController.history);

/**
 * @swagger
 * /api/v1/analysis/{id}:
 *   get:
 *     summary: Get detail for one analysis
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Analysis ID
 *     responses:
 *       200:
 *         description: Analysis detail (skill match, gap, insight)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     job_title_snapshot:
 *                       type: string
 *                     company_snapshot:
 *                       type: string
 *                     match_score:
 *                       type: number
 *                     analyzed_at:
 *                       type: string
 *                       format: date-time
 *                     skill_match:
 *                       type: array
 *                       items:
 *                         type: string
 *                     skill_gap:
 *                       type: array
 *                       items:
 *                         type: string
 *                     ai_insight:
 *                       type: string
 */
router.get("/:id", authenticate, analysisController.detail);

export default router;
