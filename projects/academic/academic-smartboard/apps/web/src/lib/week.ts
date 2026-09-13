import type { Schedule } from "./api";

/** Minggu dimulai Senin — pola arsip Jadwal.jsx. */
export function startOfWeek(anchor: Date): Date {
  const d = new Date(anchor);
  d.setHours(12, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow);
  return d;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function schedulesInDay(
  schedules: Schedule[],
  isoDate: string,
): Schedule[] {
  return schedules.filter((s) => s.date === isoDate);
}
