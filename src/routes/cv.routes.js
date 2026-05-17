import express from "express";
import cvController from "../controllers/cv.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { uploadCv } from "../middlewares/upload.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/cv/upload:
 *   post:
 *     summary: Upload CV as Guest (Preview Only)
 *     tags: [CV]
 *     description: Upload and parse a CV file as a guest user for quick preview. No data is saved to the database. Returns a quick score preview based on CV content.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to upload (max 1 MB, text-based PDF only)
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
 *                 preview:
 *                   type: object
 *                   properties:
 *                     score:
 *                       type: number
 *                       example: 75
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
 *     summary: Upload CV as Authenticated User (Full Analysis)
 *     tags: [CV]
 *     security:
 *       - bearerAuth: []
 *     description: Upload and analyze a CV file for authenticated users. The CV is saved to the database and AI analysis is triggered asynchronously. Returns a task_id for polling analysis status.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to upload (max 1 MB, text-based PDF only)
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
 * /api/v1/cv/status/{task_id}:
 *   get:
 *     summary: Get CV Analysis Status
 *     tags: [CV]
 *     security:
 *       - bearerAuth: []
 *     description: Check the status of an ongoing CV analysis task. Returns the current status (processing, completed, or failed) and results if analysis is complete.
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Task ID returned from CV upload
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
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post("/upload", uploadCv, cvController.uploadPreview);
router.post("/analyze", authenticate, uploadCv, cvController.analyze);
router.get("/status/:task_id", authenticate, cvController.status);

export default router;
