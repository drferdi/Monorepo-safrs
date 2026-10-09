import { describe, expect, it } from "vitest";
import { encounterDate, encounterMeta, encounterTitle, filterEncounters, recentEncounters } from "../lib/nav-format";
import type { Encounter, Patient } from "../lib/workspace";

const patients: Patient[] = [{ id: "p1", name: "Pasien uji", age: "", sex: "Female", notes: "" }];
const encounter = (id: string, createdAt: string, title = "", patientId: string | null = null, context = ""): Encounter => ({ id, patientId, title, createdAt, messages: [], context });

describe("sidebar encounter format", () => {
  it("names an encounter in Indonesian, falling back to its date when it has no title of its own", () => {
    expect(encounterTitle(encounter("a", "2026-10-09T06:39:00Z", "Pneumonia"))).toBe("Pneumonia");
    expect(encounterTitle(encounter("b", "2026-10-09T06:39:00Z", "Encounter (10/09 01:39 PM)"))).toBe("Encounter • 9 Okt");
    expect(encounterTitle(encounter("c", "2026-10-08T20:00:00Z", "  "))).toBe("Encounter • 9 Okt");
  });
  it("shows the time in Jakarta and the related patient, or that there is none", () => {
    expect(encounterMeta(encounter("a", "2026-10-09T06:39:00Z", "", "p1"), patients)).toBe("13.39 · Pasien uji");
    expect(encounterMeta(encounter("b", "2026-10-09T06:39:00Z"), patients)).toBe("13.39 · Tanpa pasien");
    expect(encounterMeta(encounter("c", "2026-10-09T06:39:00Z", "", "gone"), patients)).toBe("13.39 · Tanpa pasien");
    expect(encounterDate(encounter("d", "2026-10-09T06:39:00Z"))).toBe("9 Okt 2026");
  });
  it("lists at most five recent encounters, newest first", () => {
    const list = ["01", "05", "03", "07", "02", "06", "04"].map((day) => encounter(day, `2026-10-${day}T01:00:00Z`));
    expect(recentEncounters(list).map((item) => item.id)).toEqual(["07", "06", "05", "04", "03"]);
    expect(recentEncounters(list, 2).map((item) => item.id)).toEqual(["07", "06"]);
  });
  it("filters the full list by words in the title, context or patient, and by patient", () => {
    const list = [encounter("a", "2026-10-09T01:00:00Z", "Pneumonia", "p1"), encounter("b", "2026-10-08T01:00:00Z", "Demam", null, "anak batuk"), encounter("c", "2026-10-07T01:00:00Z", "Kontrol", "p1")];
    expect(filterEncounters(list, patients, { query: "PNEU", patientId: "" }).map((item) => item.id)).toEqual(["a"]);
    expect(filterEncounters(list, patients, { query: "batuk", patientId: "" }).map((item) => item.id)).toEqual(["b"]);
    expect(filterEncounters(list, patients, { query: "pasien uji", patientId: "" }).map((item) => item.id)).toEqual(["a", "c"]);
    expect(filterEncounters(list, patients, { query: "", patientId: "p1" }).map((item) => item.id)).toEqual(["a", "c"]);
    expect(filterEncounters(list, patients, { query: "", patientId: "none" }).map((item) => item.id)).toEqual(["b"]);
    expect(filterEncounters(list, patients, { query: "kontrol", patientId: "none" })).toEqual([]);
  });
});
