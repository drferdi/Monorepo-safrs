// How encounters read in the sidebar and the full list: Indonesian dates in Jakarta time ("9 Okt 2026", "13.39"),
// a clear title when an encounter has none of its own, the five most recent, and the list's search and patient filter.
import type { Encounter, Patient } from "./workspace";

const zone = "Asia/Jakarta";
const shortDay = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: zone });
const fullDay = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: zone });
const clock = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone });

/** Title for an encounter made on `date` before anyone names it. */
export const fallbackTitle = (date: Date) => `Encounter • ${shortDay.format(date)}`;

/** Titles from older builds ("Encounter (10/09 01:39 PM)") and empty ones read as the fallback. */
export function encounterTitle(encounter: Encounter): string {
  const title = encounter.title.trim();
  return !title || /^Encounter \(/.test(title) ? fallbackTitle(new Date(encounter.createdAt)) : title;
}

export const encounterDate = (encounter: Encounter) => fullDay.format(new Date(encounter.createdAt));

export function encounterMeta(encounter: Encounter, patients: Patient[]): string {
  const patient = patients.find((item) => item.id === encounter.patientId);
  return `${clock.format(new Date(encounter.createdAt))} · ${patient?.name ?? "Tanpa pasien"}`;
}

const newestFirst = (list: Encounter[]) => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const recentEncounters = (list: Encounter[], count = 5) => newestFirst(list).slice(0, count);

/** `patientId` is a patient's id, "none" for encounters without one, or "" for all. */
export function filterEncounters(list: Encounter[], patients: Patient[], { query, patientId }: { query: string; patientId: string }): Encounter[] {
  const term = query.trim().toLowerCase();
  return newestFirst(list).filter((encounter) => {
    if (patientId === "none" ? encounter.patientId !== null && patients.some((item) => item.id === encounter.patientId) : patientId && encounter.patientId !== patientId) return false;
    const patient = patients.find((item) => item.id === encounter.patientId);
    return !term || `${encounterTitle(encounter)} ${encounter.context} ${patient?.name ?? ""}`.toLowerCase().includes(term);
  });
}
