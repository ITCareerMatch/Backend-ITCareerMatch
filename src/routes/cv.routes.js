import express from "express";
import cvController from "../controllers/cv.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { uploadCv } from "../middlewares/upload.middleware.js";
import { internalOnly } from "../middlewares/internal.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/cv/preview:
 *   post:
 *     summary: Create a guest CV preview session
 *     tags: [CV]
 *     security: []
 *     description: |
 *       Upload a PDF or submit manual CV input as a guest to create a temporary preview session.
 *       The CV is not saved to the database.
 *       Session data is stored in Redis for 30 minutes and can be claimed after login with `temp_token`.
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
 *                 description: |
 *                   JSON stringified CV data. Supports two formats:
 *                   1. Raw text: `{"text": "Work Experience:\n..."}`
 *                   2. Structured form: `{"name":"John","email":"john@example.com","skills":"Python, SQL"}`
 *                 example: '{"text":"Work Experience:\n1. Web Developer at PT Angin Ribut\nSkills: React, Node.js, PostgreSQL"}'
 *     responses:
 *       200:
 *         description: Guest preview session created successfully
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
 *                   description: Temporary token used to claim the session after login
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 */

/**
 * @swagger
 * /api/v1/cv/analyze:
 *   post:
 *     summary: Analyze a CV for an authenticated user
 *     tags: [CV]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Upload a PDF or submit manual CV input for full analysis.
 *       The CV is saved to the database and analysis is triggered asynchronously through the job queue.
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
 *                 description: |
 *                   JSON stringified CV data. Supports two formats:
 *                   1. Raw text: `{"text": "Work Experience:\n..."}`
 *                   2. Structured form: `{"name":"John","email":"john@example.com","skills":"Python, SQL"}`
 *                 example: '{"text":"Work Experience:\n1. Web Developer at PT Angin Ribut\nSkills: React, Node.js, PostgreSQL"}'
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
 *     summary: Claim a guest preview session
 *     tags: [CV]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Authenticated users can claim a temporary preview session using the `temp_token`
 *       returned by the preview endpoint. This will attach the CV to the user account
 *       and trigger full analysis.
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
 *         description: Session claimed successfully and full analysis started
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
 *     summary: Get CV analysis status
 *     tags: [CV]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Check the status of an ongoing CV analysis task.
 *       Returns the current status and the result when processing is complete.
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

/**
 * @swagger
 * /api/v1/cv/archives:
 *   get:
 *     summary: Get the current user's CV archives
 *     tags: [CV]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all CV archives for the authenticated user so the frontend can select a specific `cv_id` for recommendations.
 *     responses:
 *       200:
 *         description: CV archives retrieved successfully
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
 *                       file_name:
 *                         type: string
 *                         nullable: true
 *                       file_url:
 *                         type: string
 *                         nullable: true
 *                       cv_source:
 *                         type: string
 *                       status:
 *                         type: string
 *                       uploaded_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/cv/archives/{id}:
 *   delete:
 *     summary: Delete a CV archive
 *     tags: [CV]
 *     security:
 *       - bearerAuth: []
 *     description: Delete a CV archive, its uploaded file in storage, and all related analysis data.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: CV archive ID
 *     responses:
 *       200:
 *         description: CV archive deleted successfully
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: CV archive not found
 */

/**
 * @swagger
 * /api/v1/cv/analyze-single:
 *   post:
 *     summary: Analyze one CV against one job
 *     tags: [CV]
 *     security:
 *       - internalApiKey: []
 *     description: |
 *       Internal endpoint for analyzing a single CV against a single job.
 *       Used by backend services or worker jobs as a helper or fallback for single-job gap analysis.
 *       Not meant to be called directly from the frontend.
 *       Requires internal API authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cv_text
 *               - job
 *             properties:
 *               cv_text:
 *                 type: string
 *                 description: Raw CV text from parsing
 *                 example: "John Doe\nSkills: Python, JavaScript\nExperience: 5 years"
 *               job:
 *                 type: object
 *                 required:
 *                   - job_id
 *                   - title
 *                   - description
 *                 properties:
 *                   job_id:
 *                     type: string
 *                     example: "job-001"
 *                   title:
 *                     type: string
 *                     example: "Backend Developer"
 *                   company_name:
 *                     type: string
 *                     example: "PT Tech Indonesia"
 *                   description:
 *                     type: string
 *                     example: "Requirements: Node.js, SQL, Docker"
 *     responses:
 *       200:
 *         description: Gap analysis completed successfully
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
 *                     extracted_skills:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Python", "JavaScript"]
 *                     analysis:
 *                       type: object
 *                       properties:
 *                         job_id:
 *                           type: string
 *                         job_title:
 *                           type: string
 *                         company:
 *                           type: string
 *                         match_score:
 *                           type: number
 *                           format: float
 *                           example: 85.50
 *                         skill_match:
 *                           type: array
 *                           items:
 *                             type: string
 *                         skill_gap:
 *                           type: array
 *                           items:
 *                             type: string
 *                         ai_insight:
 *                           type: string
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

// Public endpoint - guest preview (no auth required)
router.post("/preview", uploadCv, cvController.preview);

// Protected endpoints - authenticated users only
router.post("/analyze", authenticate, uploadCv, cvController.analyze);
router.post("/claim", authenticate, cvController.claim);
router.get("/status/:task_id", authenticate, cvController.status);
router.get("/archives", authenticate, cvController.archives);
router.delete("/archives/:id", authenticate, cvController.deleteArchive);

// Internal endpoint - gap skill analysis
router.post("/analyze-single", internalOnly, cvController.analyzeSingle);

export default router;
