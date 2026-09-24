import { toPng } from 'html-to-image';

// "Vertex" + "Vertex Sprint 13" -> "vertex-sprint-13"
export const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Release the file a moment later; revoking immediately can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csvCell = (c) => `"${String(c ?? '').replace(/"/g, '""')}"`;

// rows: array of arrays (first row = headers)
export function downloadCsv(rows, filename) {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv' }), filename);
}

// Snapshot of a DOM element (e.g. a chart card) as a PNG, without the export buttons.
export async function downloadPng(node, filename) {
  const dataUrl = await toPng(node, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    filter: (el) => !el.classList?.contains('export-actions'),
  });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
