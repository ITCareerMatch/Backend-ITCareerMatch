import express from "express";
import analysisController from "../controllers/analysis.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  validateUUID,
  validatePagination,
} from "../middlewares/validator.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/analysis/history:
 *   get:
 *     summary: List analysis history
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve the authenticated user's previous CV and job matching analyses.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           format: int32
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           format: int32
 *         description: Number of items per page
 *       - in: query
 *         name: cvId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional filter by CV ID. If omitted, returns history for all CVs.
 *     responses:
 *       200:
 *         description: Analysis history retrieved successfully
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
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       user_id:
 *                         type: string
 *                         format: uuid
 *                       cv_id:
 *                         type: string
 *                         format: uuid
 *                       job_id:
 *                         type: string
 *                         format: uuid
 *                       match_score:
 *                         type: string
 *                         example: "85.5"
 *                       job_title_snapshot:
 *                         type: string
 *                       company_snapshot:
 *                         type: string
 *                       ai_insight:
 *                         type: string
 *                       analyzed_at:
 *                         type: string
 *                         format: date-time
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/analysis/{id}:
 *   get:
 *     summary: Get analysis details
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve detailed analysis results for a specific CV-job match, including skill match, skill gap, and AI insight.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Analysis ID
 *     responses:
 *       200:
 *         description: Analysis details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     user_id:
 *                       type: string
 *                       format: uuid
 *                     cv_id:
 *                       type: string
 *                       format: uuid
 *                     job_id:
 *                       type: string
 *                       format: uuid
 *                     match_score:
 *                       type: string
 *                       example: "97.82"
 *                     job_title_snapshot:
 *                       type: string
 *                     company_snapshot:
 *                       type: string
 *                     ai_insight:
 *                       type: string
 *                     analyzed_at:
 *                       type: string
 *                       format: date-time
 *                     skill_match:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Skills that match the job requirements
 *                     skill_gap:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Skills lacking compared to job requirements
 *                     skill_details:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           analysis_id:
 *                             type: string
 *                             format: uuid
 *                           skill_id:
 *                             type: string
 *                             format: uuid
 *                           skill_name_snapshot:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [match, gap]
 *                           ai_insight:
 *                             type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

router.get(
  "/history",
  authenticate,
  validatePagination,
  analysisController.history,
);

router.get("/:id", authenticate, validateUUID, analysisController.detail);

export default router;
