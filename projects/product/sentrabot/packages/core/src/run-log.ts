export type RunLogFields = Record<string, string | number | boolean | null | undefined>;
export interface RunLogSink {
  write(line: string): void;
}
let sink: RunLogSink = { write: (line) => console.log(line) };
/** Test seam; production keeps stdout. */
export function setRunLogSink(next: RunLogSink | null): void {
  sink = next ?? { write: (line) => console.log(line) };
}
/** One JSON line per event: { ts, level, event, ...fields }. Fields are identifiers and enums only. */
export function runLog(
  event: string,
  fields: RunLogFields,
  level: "info" | "warn" | "error" = "info",
): void {
  const entry: Record<string, unknown> = { ts: new Date().toISOString(), level, event };
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) entry[key] = value;
  try {
    sink.write(JSON.stringify(entry));
  } catch {
    /* logging must never fail a run */
  }
}
