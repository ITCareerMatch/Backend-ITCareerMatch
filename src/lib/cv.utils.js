import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import path from "path";
import { fileURLToPath } from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const standardFontDataUrl = `${path.resolve(
  currentDir,
  "../../node_modules/pdfjs-dist/standard_fonts/",
)}${path.sep}`;

export const parsePdfToText = async (buffer) => {
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl,
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
