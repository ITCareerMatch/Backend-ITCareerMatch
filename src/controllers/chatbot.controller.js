import Groq from "groq-sdk";
import { supabase } from "../lib/supabase.js";
import { getLatestCv } from "../services/cv.service.js";

let groqClient = null;

function getGroqClient() {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY tidak ditemukan di .env");
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

const SYSTEM_PROMPT = `Kamu adalah asisten karir dan pasar kerja yang bernama JobBot.
Kamu membantu user memahami tren pasar kerja, skill yang dibutuhkan di industri IT, 
tips karir, informasi gaji, dan hal-hal seputar dunia kerja IT. Kamu hanya menjawab seputar industri IT

Jika terdapat bagian [Konteks CV User] di pesan, gunakan informasi tersebut 
untuk memberikan saran yang dipersonalisasi — misalnya menilai kesesuaian skill 
user dengan posisi tertentu, atau merekomendasikan langkah karir berdasarkan 
pengalaman mereka.

Jika tidak ada konteks CV, tetap bantu user dengan informasi umum seputar 
pasar kerja IT.

Panduan menjawab:
- Gunakan Bahasa Indonesia yang ramah dan mudah dipahami
- Berikan jawaban yang konkret dan actionable, bukan hanya teori
- Jika ditanya skill, sebutkan skill spesifik yang relevan
- Jika ditanya gaji, berikan range umum dan faktor yang mempengaruhinya
- Akui keterbatasan jika pertanyaan di luar domain karir/pekerjaan IT
- Jika ditanya diluar industri IT, akui keterbatasan
- Jawab dengan ringkas tapi lengkap, maksimal 3-4 paragraf

Contoh topik yang bisa kamu bantu:
- "Skill apa yang dibutuhkan untuk jadi Data Engineer?"
- "Berapa gaji rata-rata Software Engineer di Jakarta?"
- "Bagaimana cara pindah karir ke bidang AI?"
- "Industri apa yang sedang banyak hiring sekarang?"`;

const MAX_CHUNK = 190;

function cleanTextForTts(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/#+\s*/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

function splitIntoChunks(text, maxChars = MAX_CHUNK) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = "";

  for (let sent of sentences) {
    sent = sent.trim();
    if (!sent) continue;

    if (sent.length > maxChars) {
      const parts = sent
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      for (let part of parts) {
        if ((current + ", " + part).trim().length <= maxChars) {
          current = current ? `${current}, ${part}` : part;
        } else {
          if (current) chunks.push(current);
          while (part.length > maxChars) {
            chunks.push(part.slice(0, maxChars));
            part = part.slice(maxChars);
          }
          current = part;
        }
      }
    } else {
      if ((current + " " + sent).trim().length <= maxChars) {
        current = current ? `${current} ${sent}` : sent;
      } else {
        if (current) chunks.push(current);
        current = sent;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks.filter((c) => c.trim());
}

function extractWavData(buffer) {
  if (buffer.toString("utf8", 0, 4) !== "RIFF") throw new Error("Not RIFF");
  if (buffer.toString("utf8", 8, 12) !== "WAVE") throw new Error("Not WAVE");

  let fmt = null;
  let data = null;

  let offset = 12;
  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString("utf8", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    // Groq TTS stream uses 0xFFFFFFFF for chunk sizes, we calculate actual if so
    const actualChunkSize = chunkSize === 0xFFFFFFFF ? buffer.length - offset - 8 : chunkSize;
    
    if (chunkId === "fmt ") {
      fmt = buffer.slice(offset + 8, offset + 8 + actualChunkSize);
    } else if (chunkId === "data") {
      data = buffer.slice(offset + 8, Math.min(offset + 8 + actualChunkSize, buffer.length));
      break; 
    }
    offset += 8 + actualChunkSize;
    if (actualChunkSize % 2 !== 0) offset += 1;
  }
  return { fmt, data };
}

function combineWavBuffers(buffers) {
  if (!buffers || buffers.length === 0) return Buffer.alloc(0);

  let fmt = null;
  const audioDataParts = [];

  for (const buf of buffers) {
    const parsed = extractWavData(buf);
    if (!fmt && parsed.fmt) fmt = parsed.fmt;
    if (parsed.data) audioDataParts.push(parsed.data);
  }

  if (!fmt || audioDataParts.length === 0) {
    throw new Error("Invalid WAV buffers: missing fmt or data chunks");
  }

  const audioData = Buffer.concat(audioDataParts);
  const dataSize = audioData.length;
  // fileSize = 4 (WAVE) + 8 (fmt chunk header) + fmt.length + 8 (data chunk header) + dataSize
  const fileSize = 4 + 8 + fmt.length + 8 + dataSize;

  const header = Buffer.alloc(12 + 8 + fmt.length + 8);
  
  header.write("RIFF", 0);
  header.writeUInt32LE(fileSize, 4);
  header.write("WAVE", 8);
  
  header.write("fmt ", 12);
  header.writeUInt32LE(fmt.length, 16);
  fmt.copy(header, 20);
  
  const dataOffset = 20 + fmt.length;
  header.write("data", dataOffset);
  header.writeUInt32LE(dataSize, dataOffset + 4);

  return Buffer.concat([header, audioData]);
}

async function chat(req, res, next) {
  try {
    const { message, history, cvContext } = req.body || {};

    if (!message || typeof message !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "message is required" });
    }

    // Resolve user identity: session → Bearer token
    let userId = null;
    if (req.session?.user?.id) {
      userId = req.session.user.id;
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const { data, error } = await supabase.auth.getUser(token);
          if (!error && data?.user) userId = data.user.id;
        } catch (e) {
          console.warn("[Chatbot] Auth check failed:", e.message);
        }
      }
    }

    let rawText = cvContext || null;
    if (!rawText && userId) {
      try {
        const cv = await getLatestCv(userId);
        console.log(
          `[Chatbot] Found CV for user ${userId}:`,
          cv ? "YES" : "NO",
        );
        if (cv?.raw_text) {
          rawText = cv.raw_text;
          console.log(
            `[Chatbot] Successfully extracted rawText (length: ${rawText.length})`,
          );
        } else {
          console.log(`[Chatbot] CV does not have raw_text`);
        }
      } catch (e) {
        console.warn("[Chatbot] Failed to get latest CV:", e.message);
      }
    } else {
      console.log(
        `[Chatbot] No userId found in request. Headers:`,
        !!req.headers.authorization,
      );
    }

    const userMessage = rawText
      ? `[Konteks CV User: ${rawText}]\n\n${message}`
      : message;

    const messages = [{ role: "system", content: SYSTEM_PROMPT }];
    const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: "user", content: userMessage });

    try {
      const groq = getGroqClient();
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      });

      const reply = response.choices[0].message.content;

      // Update history
      const updatedHistory = [
        ...recentHistory,
        { role: "user", content: userMessage },
        { role: "assistant", content: reply },
      ];

      return res.json({ success: true, reply, history: updatedHistory });
    } catch (err) {
      console.error("[Chatbot] Groq API error:", err.message);
      return res.status(503).json({
        success: false,
        message:
          "Layanan AI sedang tidak tersedia. Silakan coba beberapa saat lagi.",
      });
    }
  } catch (err) {
    next(err);
  }
}

async function tts(req, res, next) {
  try {
    const { text, voice = "diana" } = req.body || {};

    if (!text || typeof text !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "text is required" });
    }

    const clean = cleanTextForTts(text);
    const chunks = splitIntoChunks(clean);

    if (!chunks.length) {
      return res
        .status(400)
        .json({ success: false, message: "Teks kosong setelah dibersihkan." });
    }

    try {
      const groq = getGroqClient();
      const wavBuffers = [];

      for (const chunk of chunks) {
        const resp = await groq.audio.speech.create({
          model: "canopylabs/orpheus-v1-english",
          voice,
          input: chunk,
          response_format: "wav",
        });
        const buffer = Buffer.from(await resp.arrayBuffer());
        wavBuffers.push(buffer);
      }

      const combined = combineWavBuffers(wavBuffers);

      res.set("Content-Type", "audio/wav");
      res.set("Content-Disposition", "inline; filename=speech.wav");
      res.set("Content-Length", combined.length);
      return res.send(combined);
    } catch (err) {
      console.error("[Chatbot TTS] Groq TTS error:", err.message);
      return res.status(503).json({
        success: false,
        message: "Layanan TTS sedang tidak tersedia.",
      });
    }
  } catch (err) {
    next(err);
  }
}

function voices(req, res) {
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

export const chatbotController = { chat, tts, voices };
