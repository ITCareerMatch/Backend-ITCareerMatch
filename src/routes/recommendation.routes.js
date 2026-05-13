import express from "express";
import jobController from "../controllers/job.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/jobs/recommendations:
 *   get:
 *     summary: Get Top-20 Job Recommendations
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieve the top 20 job recommendations most relevant to the authenticated user's CV.
 *       Results are sorted by match score in descending order.
 *       Requires that the user has completed a prior CV analysis.
 *     responses:
 *       200:
 *         description: List of recommended jobs with match analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       job_id:
 *                         type: string
 *                         format: uuid
 *                       job_title:
 *                         type: string
 *                       company:
 *                         type: string
 *                       match_score:
 *                         type: number
 *                         example: 88.5
 *                       skill_match:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Skills matching job requirements
 *                       skill_gap:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Skills needed for the job
 *                       ai_insight:
 *                         type: string
 *                         description: AI-generated recommendation insight
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/recommendations", authenticate, jobController.recommendations);

export default router;
