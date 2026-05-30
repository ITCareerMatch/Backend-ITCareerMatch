import axios from "axios";
import { supabase } from "../lib/supabase.js";
import { getLatestCv } from "../services/cv.service.js";
import config from "../config/config.js";

async function chat(req, res, next) {
  try {
    const { message, history } = req.body || {};

    if (!message || typeof message !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "message is required" });
    }

    let user = null;
    let userId = null;

    if (req.session?.user?.id) {
      userId = req.session.user.id;
      user = { id: userId };
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const { data, error } = await supabase.auth.getUser(token);
          if (!error && data?.user) {
            user = data.user;
            userId = data.user.id;
          }
        } catch (e) {
          console.warn("[Chatbot] Auth check failed:", e.message);
        }
      }
    }

    let rawText = null;
    if (userId) {
      try {
        const cv = await getLatestCv(userId);
        if (cv?.raw_text) rawText = cv.raw_text;
      } catch (e) {
        console.warn("[Chatbot] Failed to get latest CV:", e.message);
      }
    }

    const aiPayload = {
      message,
      history: Array.isArray(history) ? history : [],
      raw_text: rawText || null,
    };

    try {
      const url = `${config.aiApiUrl.replace(/\/$/, "")}/api/chatbot/chat`;

      const { data } = await axios.post(url, aiPayload, {
        headers: {
          "Content-Type": "application/json",
          ...(config.internalApiKey
            ? { "X-Internal-Request": config.internalApiKey }
            : {}),
        },
        timeout: 20000,
      });

      if (!data?.reply) {
        console.warn("[Chatbot] AI response missing 'reply' field:", data);
        return res.status(502).json({
          success: false,
          message: "Invalid response from AI service",
        });
      }

      return res.json({
        success: true,
        reply: data.reply,
        history: data.history || [],
      });
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data || err.message;
      console.error(`[Chatbot] AI proxy failed (${status}):`, detail);

      const fallbackReply = rawText
        ? "Maaf, layanan AI sedang tidak tersedia. Silakan coba beberapa saat lagi."
        : "Halo! Saya belum menemukan CV yang terhubung ke akunmu. Silakan upload CV agar saya bisa menjawab secara personal.";

      return res.status(503).json({
        success: false,
        message: fallbackReply,
        fallback: true,
      });
    }
  } catch (err) {
    next(err);
  }
}

async function tts(req, res, next) {
  try {
    const { text, voice } = req.body || {};

    if (!text || typeof text !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "text is required" });
    }

    try {
      const url = `${config.aiApiUrl.replace(/\/$/, "")}/api/chatbot/tts`;

      const { data, headers } = await axios.post(
        url,
        { text, voice: voice || "diana" },
        {
          headers: {
            "Content-Type": "application/json",
            ...(config.internalApiKey
              ? { "X-Internal-Request": config.internalApiKey }
              : {}),
          },
          responseType: "arraybuffer",
          timeout: 30000,
        },
      );

      res.set("Content-Type", headers["content-type"] || "audio/wav");
      res.set("Content-Length", data.byteLength);
      return res.send(Buffer.from(data));
    } catch (err) {
      const status = err.response?.status;
      console.error(`[Chatbot TTS] AI proxy failed (${status}):`, err.message);
      return res.status(503).json({
        success: false,
        message: "Layanan text-to-speech sedang tidak tersedia.",
      });
    }
  } catch (err) {
    next(err);
  }
}

async function voices(req, res, next) {
  try {
    try {
      const url = `${config.aiApiUrl.replace(/\/$/, "")}/api/chatbot/voices`;

      const { data } = await axios.get(url, {
        headers: {
          ...(config.internalApiKey
            ? { "X-Internal-Request": config.internalApiKey }
            : {}),
        },
        timeout: 10000,
      });

      return res.json(data);
    } catch (err) {
      const status = err.response?.status;
      console.error(
        `[Chatbot Voices] AI proxy failed (${status}):`,
        err.message,
      );

      return res.json({
        voices: [
          { id: "autumn", name: "Autumn (Female)" },
          { id: "diana", name: "Diana (Female)" },
          { id: "hannah", name: "Hannah (Female)" },
          { id: "austin", name: "Austin (Male)" },
          { id: "daniel", name: "Daniel (Male)" },
          { id: "troy", name: "Troy (Male)" },
        ],
      });
    }
  } catch (err) {
    next(err);
  }
}

export const chatbotController = { chat, tts, voices };
