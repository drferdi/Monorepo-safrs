// Minimal, dependency-free CSV export for the Platform Admin Console.
// Client-side only: serializes already-fetched, admin-authorized rows.

export function toCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export interface CsvColumn<T> {
  label: string;
  get: (row: T) => unknown;
}

export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const header = columns.map((c) => toCsvCell(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => toCsvCell(c.get(row))).join(","))
    .join("\r\n");
  return body ? `${header}\r\n${body}` : header;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}
