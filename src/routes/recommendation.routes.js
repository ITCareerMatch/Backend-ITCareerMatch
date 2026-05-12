import express from "express";
import jobController from "../controllers/job.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Recommendations
 *   description: Job recommendations for user (AI)
 */

/**
 * @swagger
 * /api/v1/jobs/recommendations:
 *   get:
 *     summary: Get Top-20 job recommendations for user
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     description: List Top-20 jobs most relevant to the user's CV, sorted by match_score. Requires prior CV analysis.
 *     responses:
 *       200:
 *         description: List of recommended jobs
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
 *                       job_id:
 *                         type: string
 *                       job_title:
 *                         type: string
 *                       company:
 *                         type: string
 *                       match_score:
 *                         type: number
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
 */
router.get("/recommendations", authenticate, jobController.recommendations);

export default router;
