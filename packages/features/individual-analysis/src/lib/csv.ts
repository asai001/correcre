export type CsvCell = string | number | boolean | null | undefined;

function escapeCsvField(value: CsvCell) {
  const normalized = value == null ? "" : String(value).replaceAll('"', '""');
  return `"${normalized}"`;
}

export function downloadCsv(filename: string, rows: CsvCell[][]) {
  const csv = `\uFEFF${rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  window.URL.revokeObjectURL(url);
}
