import express from "express";
import { aiController } from "../controllers/ai.controller.js";
import { internalOnly } from "../middlewares/internal.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /internal/ai/match:
 *   post:
 *     summary: Enqueue AI matching for a user and CV
 *     tags: [Internal]
 *     security:
 *       - internalApiKey: []
 *     description: |
 *       Internal backend endpoint that only enqueues an AI matching job to BullMQ.
 *       This is not a public API and should only be called by trusted backend services.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - cvId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID.
 *               cvId:
 *                 type: string
 *                 description: CV ID to analyze.
 *             example:
 *               userId: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *               cvId: "b2c3d4e5-f6a7-8901-2345-67890abcdef1"
 *     responses:
 *       "202":
 *         description: Accepted. The AI matching job has been queued.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: AI matching job has been queued.
 *       "400":
 *         description: Bad Request. Missing userId or cvId.
 *       "401":
 *         description: Unauthorized. Invalid or missing internal API key.
 */
router.post("/match", internalOnly, aiController.triggerAiMatching);

export default router;
