// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { EncounterOverview } from "../../src/components/encounter-overview";
import { emptyCase, type AadiResult } from "../../src/lib/aadi/contract";
import { aadiMessage } from "../../src/lib/aadi/presentation";
import { initialWorkspace, type Encounter, type Patient, type Workspace } from "../../src/lib/workspace";

afterEach(cleanup);

const result: AadiResult = { contractVersion: "1", status: "ok", differential: { likely: [{ icd10: "J00", label: "Diagnosis sintetis", confidenceTier: "low" }], alternatives: [], cannotMiss: [] }, evidence: [], missingInformation: [], nextBestActions: [{ kind: "exam", item: "Foto toraks", reason: "" }, { kind: "question", item: "Durasi batuk", reason: "" }], disposition: null, unfilled: [], meta: { version: "test", model: "mock", costUsd: null } };
const document = aadiMessage({ case: { ...emptyCase(), chiefComplaint: "Batuk" }, result, traceId: "t", createdAt: "2026-10-21T05:00:00.000Z" });
const patient: Patient = { id: "p1", name: "Budi Santoso", age: "42", sex: "Male", notes: "Alergi: Penisilin" };
const encounter = (over: Partial<Encounter> = {}): Encounter => ({ id: "e1", patientId: "p1", title: "Batuk 3 hari", createdAt: "2026-10-21T04:00:00.000Z", messages: [document], context: "Keluhan utama: Batuk berdahak", ...over });
const props = (current: Encounter, linked?: Patient) => {
  const state: Workspace = { ...initialWorkspace, patients: linked ? [linked] : [], encounters: [current], activeEncounterId: current.id };
  return { state, encounter: current, patient: linked, onContext: vi.fn(), onPatient: vi.fn(), onSelect: vi.fn(), onMakeTasks: vi.fn() };
};
const block = (name: string) => screen.getByRole("region", { name });

describe("EncounterOverview", () => {
  it("shows timeline, source summary, patient and the task draft, and Buat makes a tasks document", () => {
    const p = props(encounter(), patient);
    render(<EncounterOverview {...p}/>);
    expect(within(block("Timeline")).getByText("Batuk 3 hari")).toBeTruthy();
    expect(within(block("Ringkasan sumber")).getByText("Batuk berdahak")).toBeTruthy();
    fireEvent.click(within(block("Ringkasan sumber")).getByRole("button", { name: /Edit konteks/ }));
    expect(p.onContext).toHaveBeenCalled();
    expect(within(block("Pasien")).getByText("Budi Santoso")).toBeTruthy();
    fireEvent.click(within(block("Pasien")).getByRole("button", { name: /Edit detail pasien/i }));
    expect(p.onPatient).toHaveBeenCalled();
    const tasks = block("Daftar tugas");
    expect(within(tasks).getByText("Periksa: Foto toraks")).toBeTruthy();
    expect(within(tasks).getByText("Tanyakan: Durasi batuk")).toBeTruthy();
    fireEvent.click(within(tasks).getByRole("button", { name: "Buat" }));
    expect(p.onMakeTasks).toHaveBeenCalledWith("Periksa: Foto toraks\nTanyakan: Durasi batuk");
    expect(screen.getByText("Tersimpan di browser")).toBeTruthy();
    fireEvent.click(within(block("Timeline")).getByRole("button", { name: /Batuk 3 hari/ }));
    expect(p.onSelect).toHaveBeenCalledWith("e1");
  });

  it("shows the link control when the encounter has no patient", () => {
    const p = props(encounter({ patientId: null }));
    render(<EncounterOverview {...p}/>);
    fireEvent.click(within(block("Pasien")).getByRole("button", { name: "Hubungkan Pasien" }));
    expect(p.onPatient).toHaveBeenCalled();
  });

  it("says there are no tasks until an analysis with next actions exists", () => {
    render(<EncounterOverview {...props(encounter({ messages: [] }), patient)}/>);
    expect(within(block("Daftar tugas")).getByText("Belum ada tugas")).toBeTruthy();
    expect(within(block("Daftar tugas")).queryByRole("button", { name: "Buat" })).toBeNull();
  });
});
