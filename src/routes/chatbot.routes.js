import express from "express";
import rateLimit from "express-rate-limit";
import { chatbotController } from "../controllers/chatbot.controller.js";

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Terlalu banyak pesan, coba lagi nanti.",
  },
});

const ttsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Terlalu banyak request TTS, coba lagi nanti.",
  },
});

/**
 * @swagger
 * /api/v1/chatbot/chat:
 *   post:
 *     summary: Chat with optional personalization using user's latest CV
 *     tags: [Chatbot]
 *     security: []
 *     description: |
 *       Chat endpoint. If `Authorization: Bearer <token>` is provided, the backend
 *       will attempt to attach the user's latest CV text as `raw_text` to the
 *       AI request for personalized responses. Otherwise returns a general reply.
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
 *               message: "Apakah skill saya cocok untuk posisi Data Engineer?"
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
 *     summary: Convert text to speech (audio/wav)
 *     tags: [Chatbot]
 *     security: []
 *     description: |
 *       Converts text to audio. Response is a binary audio/wav file.
 *       Handle as blob/arraybuffer di FE, bukan JSON.
 *       TTS agak lambat (~2-5 detik) karena teks dipotong jadi beberapa chunk — ini normal.
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
 *               text: "Halo! Selamat datang di ITCareerMatch."
 *               voice: "diana"
 *     responses:
 *       200:
 *         description: Binary audio/wav file
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
 *     summary: Get list of available TTS voices
 *     tags: [Chatbot]
 *     security: []
 *     responses:
 *       200:
 *         description: List of available voices
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

router.post("/chat", chatLimiter, chatbotController.chat);
router.post("/tts", ttsLimiter, chatbotController.tts);
router.get("/voices", chatbotController.voices);

export default router;
