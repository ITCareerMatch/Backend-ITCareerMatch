import express from "express";
import cvController from "../controllers/cv.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { uploadCv } from "../middlewares/upload.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/cv/preview:
 *   post:
 *     summary: Preview CV (Guest or Manual Input)
 *     tags: [CV]
 *     description: |
 *       Upload a PDF or submit manual CV input as a guest user for quick preview.
 *       No data is saved to the database. Results are stored temporarily in Redis (TTL 30 minutes).
 *       Returns a temp_token that can be used to claim the session after login.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to upload (max 1 MB, text-based PDF only) - OR use cv_data below
 *               cv_data:
 *                 type: string
 *                 description: JSON stringified manual CV data - OR use file above
 *                 example: '{"name":"John Doe","email":"john@example.com","skills":"Python, SQL"}'
 *     responses:
 *       200:
 *         description: CV preview processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 temp_token:
 *                   type: string
 *                   format: uuid
 *                   description: Token to claim session after login (valid for 30 minutes)
 *                 preview:
 *                   type: object
 *                   properties:
 *                     score:
 *                       type: number
 *                       description: Match score (0-100)
 *                       example: 75
 *                     extracted_skills:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Python", "SQL"]
 *                     skill_gap:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Docker", "Kubernetes"]
 *                     ai_insight:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Your Python skills are strong", "Consider learning Docker"]
 *                     summary:
 *                       type: string
 *                       example: "Good CV with relevant IT skills"
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 */

/**
 * @swagger
 * /api/v1/cv/analyze:
 *   post:
 *     summary: Analyze CV (Authenticated User - Full Analysis)
 *     tags: [CV]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Upload a PDF or submit manual CV input for full AI analysis.
 *       CV is saved to the database and analysis is triggered asynchronously via job queue.
 *       Returns a task_id for polling analysis status.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to upload (max 1 MB, text-based PDF only) - OR use cv_data below
 *               cv_data:
 *                 type: string
 *                 description: JSON stringified manual CV data - OR use file above
 *                 example: '{"name":"John Doe","email":"john@example.com","skills":"Python, SQL"}'
 *     responses:
 *       200:
 *         description: CV uploaded successfully, analysis task created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 task_id:
 *                   type: string
 *                   format: uuid
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/cv/claim:
 *   post:
 *     summary: Claim Preview Session and Upgrade to Full Analysis
 *     tags: [CV]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Authenticated users can claim their temporary preview session using temp_token
 *       received from /preview endpoint. This will:
 *       1. Attach the CV to their user account
 *       2. Trigger full AI analysis with job recommendations
 *       Returns a task_id for polling full analysis status.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - temp_token
 *             properties:
 *               temp_token:
 *                 type: string
 *                 format: uuid
 *                 description: Token from /preview endpoint
 *     responses:
 *       200:
 *         description: Session claimed successfully, full analysis started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 task_id:
 *                   type: string
 *                   format: uuid
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       410:
 *         description: Session has expired
 */

/**
 * @swagger
 * /api/v1/cv/status/{task_id}:
 *   get:
 *     summary: Get CV Analysis Status
 *     tags: [CV]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Check the status of an ongoing CV analysis task.
 *       Returns current status (processing, completed, or failed) and results if complete.
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID returned from /analyze or /claim endpoint
 *     responses:
 *       200:
 *         description: Task status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   enum: [processing, completed, failed]
 *                   example: "completed"
 *                 result:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     cv_id:
 *                       type: string
 *                       format: uuid
 *                     extracted_skills:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           confidence:
 *                             type: number
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

// Public endpoint - guest preview (no auth required)
router.post("/preview", uploadCv, cvController.preview);

// Protected endpoints - authenticated users only
router.post("/analyze", authenticate, uploadCv, cvController.analyze);
router.post("/claim", authenticate, cvController.claim);
router.get("/status/:task_id", authenticate, cvController.status);

export default router;
