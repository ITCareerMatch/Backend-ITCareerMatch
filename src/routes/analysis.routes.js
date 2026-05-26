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
 *     summary: Get User's Analysis History
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve the list of all previous CV and job matching analyses performed by the authenticated user
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
 *                       job_title_snapshot:
 *                         type: string
 *                       company_snapshot:
 *                         type: string
 *                       match_score:
 *                         type: number
 *                         example: 85.5
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
 *     summary: Get Analysis Details
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve detailed analysis results for a specific CV-job matching analysis, including skill match, skill gap, and AI insights
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
 *                     job_title_snapshot:
 *                       type: string
 *                     company_snapshot:
 *                       type: string
 *                     match_score:
 *                       type: number
 *                       example: 85.5
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
 *                     ai_insight:
 *                       type: string
 *                       description: Detailed AI analysis and recommendations
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
