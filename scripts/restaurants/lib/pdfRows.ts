/** Reads a PDF into positioned text rows with pdfjs-dist. Node-only (used by extract.ts). */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

import type { Row } from './table';

/** Items whose baselines are within this many points share a row. */
const ROW_TOLERANCE = 2.5;

export async function readPdfRows(data: Uint8Array, pages?: number[]): Promise<Row[]> {
  const task = getDocument({ data, verbosity: 0 });
  const doc = await task.promise;
  const pageNumbers = pages ?? Array.from({ length: doc.numPages }, (_, i) => i + 1);
  const rows: Row[] = [];
  for (const pageNumber of pageNumbers) {
    if (pageNumber < 1 || pageNumber > doc.numPages) continue;
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageRows: Row[] = [];
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const x = Math.round(item.transform[4] as number);
      const y = Math.round(item.transform[5] as number);
      let row = pageRows.find((r) => Math.abs(r.y - y) <= ROW_TOLERANCE);
      if (!row) {
        row = { page: pageNumber, y, cells: [] };
        pageRows.push(row);
      }
      row.cells.push({ x, text: item.str.trim() });
    }
    for (const row of pageRows) row.cells.sort((a, b) => a.x - b.x);
    rows.push(...pageRows);
  }
  await task.destroy();
  return rows;
}
