import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export async function parsePdfToText(buffer) {
  const data = await pdfParse(buffer);
  return data.text;
}

export async function quickScorePreview(cvText) {
  // Dummy logic: count words, return random score
  const wordCount = cvText.split(/\s+/).length;
  const score = Math.min(100, Math.round(wordCount / 10 + Math.random() * 10));
  return {
    score,
    summary: `CV contains ${wordCount} words. (Dummy preview)`,
  };
}
