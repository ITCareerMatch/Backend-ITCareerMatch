import express from "express";
import cvController from "../controllers/cv.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: CV
 *   description: CV upload, analysis, and AI status
 */

/**
 * @swagger
 * /api/v1/cv/upload:
 *   post:
 *     summary: Upload CV (guest, preview only)
 *     tags: [CV]
 *     description: Upload CV as guest, parse PDF in memory, return quick score preview. No data is saved to DB.
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
 *                 description: PDF file to upload
 *     responses:
 *       200:
 *         description: Quick score preview
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 preview:
 *                   type: object
 *                   properties:
 *                     score:
 *                       type: number
 *                     summary:
 *                       type: string
 */
router.post("/upload", cvController.uploadPreview);

/**
 * @swagger
 * /api/v1/cv/analyze:
 *   post:
 *     summary: Upload CV (user, analyze & save)
 *     tags: [CV]
 *     security:
 *       - bearerAuth: []
 *     description: Upload CV as logged-in user, save to DB, trigger async AI analysis, return task_id for polling.
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
 *                 description: PDF file to upload
 *     responses:
 *       200:
 *         description: Task created, return task_id
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 task_id:
 *                   type: string
 */
router.post("/analyze", authenticate, cvController.analyze);

/**
 * @swagger
 * /api/v1/cv/status/{task_id}:
 *   get:
 *     summary: Get AI analysis status
 *     tags: [CV]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: task_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID to check status
 *     responses:
 *       200:
 *         description: Status of AI analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                   enum: [processing, completed, failed]
 *                 result:
 *                   type: object
 *                   nullable: true
 */
router.get("/status/:task_id", authenticate, cvController.status);

export default router;
