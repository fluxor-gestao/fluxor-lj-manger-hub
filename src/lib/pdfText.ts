// Local PDF text extraction in the browser using pdfjs-dist.
// Returns text grouped by page, where each page is an array of lines (top -> bottom).
import * as pdfjsLib from "pdfjs-dist";
// Vite-friendly worker URL
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - ?url import handled by Vite
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface PdfTextResult {
  pages: string[][]; // each page = array of lines
  fullText: string;
}

export async function extractPdfText(file: File | ArrayBuffer): Promise<PdfTextResult> {
  const data = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[][] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // group items by Y coordinate (line) — pdfjs returns items in reading order most of the time,
    // but we sort by -y then x to be safe.
    const items = content.items
      .filter((it: any) => typeof it.str === "string")
      .map((it: any) => ({
        str: it.str as string,
        x: it.transform[4] as number,
        y: it.transform[5] as number,
      }));

    // Bucket by rounded y (PDF coordinates: higher y = higher on page)
    const buckets = new Map<number, { x: number; str: string }[]>();
    for (const it of items) {
      const key = Math.round(it.y);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push({ x: it.x, str: it.str });
    }
    const lines = Array.from(buckets.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) =>
        parts
          .sort((a, b) => a.x - b.x)
          .map((p) => p.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter((l) => l.length > 0);

    pages.push(lines);
  }

  return { pages, fullText: pages.map((p) => p.join("\n")).join("\n\n") };
}
