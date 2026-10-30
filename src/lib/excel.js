// Excel (.xlsx) downloads. The writer is loaded on first use, so it doesn't add to the page load.
// sheets: [{ name, rows, columns? }] where rows are arrays of cells (value, or { value, format, fontWeight, ... })
export async function downloadXlsx(sheets, fileName) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  await writeExcelFile(sheets.map((s) => ({ data: s.rows, sheet: s.name.slice(0, 31), columns: s.columns, stickyRowsCount: s.sticky ?? 0 })),
    { fontFamily: 'Calibri', fontSize: 11 }).toFile(fileName);
}

export const bold = (value) => ({ value, fontWeight: 'bold' });
export const hours = (value) => (value == null ? null : { value: Number(value), type: Number, format: '#,##0.00' });
export const percent = (value) => (value == null ? null : { value: value / 100, type: Number, format: '0%' });
export const fte = (value) => (value == null ? null : { value: Number(value), type: Number, format: '0.00' });
