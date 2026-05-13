import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export const parsePdfToText = async (buffer) => {
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  }).promise;

  let text = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    const content = await page.getTextContent();

    const strings = content.items.map((item) => item.str);

    text += strings.join(" ") + "\n";
  }

  return text;
};

export async function quickScorePreview(cvText) {
  const wordCount = cvText.split(/\s+/).length;

  const score = Math.min(100, Math.round(wordCount / 10 + Math.random() * 10));

  return {
    score,
    summary: `CV contains ${wordCount} words. (Dummy preview)`,
  };
}
