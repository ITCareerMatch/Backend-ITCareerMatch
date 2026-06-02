import express from "express";
import rateLimit from "express-rate-limit";
import { chatbotController } from "../controllers/chatbot.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

const ttsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many TTS requests, please try again later.",
  },
});

/**
 * @swagger
 * /api/v1/chatbot/chat:
 *   post:
 *     summary: Chat with optional CV personalization
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       If an access token is provided, the backend attaches the user's latest CV text
 *       as `raw_text` to the AI request for a personalized reply. Otherwise it returns a general reply.
 *       Both guests and authenticated users can access this endpoint.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *             example:
 *               message: "Are my skills suitable for a Data Engineer position?"
 *               history: []
 *     responses:
 *       200:
 *         description: Chat reply returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reply:
 *                   type: string
 *                 history:
 *                   type: array
 */

/**
 * @swagger
 * /api/v1/chatbot/tts:
 *   post:
 *     summary: Convert text to speech
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Convert text to a WAV audio response.
 *       Handle the response as a blob or arraybuffer on the frontend, not as JSON.
 *       The request may take a few seconds because the text is processed in chunks.
 *       Both guests and authenticated users can access this endpoint.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *               voice:
 *                 type: string
 *                 description: "Voice ID. Default: diana"
 *             example:
 *               text: "Hello! Welcome to ITCareerMatch."
 *               voice: "diana"
 *     responses:
 *       200:
 *         description: Binary WAV audio file
 *         content:
 *           audio/wav:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @swagger
 * /api/v1/chatbot/voices:
 *   get:
 *     summary: List available TTS voices
 *     tags: [Chatbot]
 *     security: []
 *     responses:
 *       200:
 *         description: Available voices returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 voices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 */

router.post("/chat", chatLimiter, optionalAuth, chatbotController.chat);
router.post("/tts", ttsLimiter, chatbotController.tts);
router.get("/voices", chatbotController.voices);

export default router;
