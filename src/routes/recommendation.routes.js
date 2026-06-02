import express from "express";
import jobController from "../controllers/job.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/jobs/recommendations:
 *   get:
 *     summary: Get top-20 job recommendations
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieve the most relevant job recommendations for a specific CV.
 *       Results are sorted by match score in descending order.
 *       The user must have completed at least one CV analysis first.
 *     parameters:
 *       - in: query
 *         name: cv_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: CV ID to scope recommendations to a specific uploaded CV
 *     responses:
 *       200:
 *         description: Recommended jobs with match analysis
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
 *                       analysis_id:
 *                         type: string
 *                         format: uuid
 *                       job_id:
 *                         type: string
 *                         format: uuid
 *                       job_title:
 *                         type: string
 *                       company:
 *                         type: string
 *                       match_score:
 *                         type: number
 *                         example: 97.82
 *                       location:
 *                         type: string
 *                         example: "Jakarta Selatan, DKI Jakarta"
 *                       external_url:
 *                         type: string
 *                         format: uri
 *                       skill_match_count:
 *                         type: integer
 *                         example: 1
 *                       skill_gap_count:
 *                         type: integer
 *                         example: 0
 *                       analyzed_at:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Missing or invalid cv_id
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

router.get("/recommendations", authenticate, jobController.recommendations);

export default router;
