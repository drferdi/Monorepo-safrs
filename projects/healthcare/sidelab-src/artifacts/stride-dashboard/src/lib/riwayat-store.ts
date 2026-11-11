import type { ConsultResult, PatientData } from "@workspace/api-client-react";

export type SavedCase = {
  id: string;
  tanggal: string;
  complaint: string;
  patient: PatientData;
  result: ConsultResult;
};

const STORAGE_KEY = "cdss_riwayat_v1";

export function loadRiwayat(): SavedCase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedCase[]) : [];
  } catch {
    return [];
  }
}

export function saveToRiwayat(c: SavedCase) {
  const existing = loadRiwayat();
  const updated = [c, ...existing].slice(0, 200);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteFromRiwayat(id: string) {
  const updated = loadRiwayat().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

function apiUrl(path: string) {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/api/cdss${path}`;
}

export async function syncRiwayatFromServer(): Promise<SavedCase[]> {
  try {
    const resp = await fetch(apiUrl("/sessions"));
    if (!resp.ok) return loadRiwayat();
    const data = (await resp.json()) as {
      sessions: Array<{ id: string; filename: string; date: string; patient: string; preview: string }>;
    };
    const localCases = loadRiwayat();
    const localIds = new Set(localCases.map(c => c.id));
    const serverCases: SavedCase[] = data.sessions
      .filter(s => !localIds.has(s.filename))
      .map(s => ({
        id: s.filename,
        tanggal: s.date,
        complaint: s.preview.slice(0, 200),
        patient: { nama: s.patient.split("|")[0]?.replace("nama:", "").trim() ?? "" },
        result: { raw: s.preview, sections: {}, red_flags: [], history: [] },
      }));
    const merged = [...localCases, ...serverCases].slice(0, 200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return loadRiwayat();
  }
}

export async function saveSessionToServer(
  complaint: string,
  patient: PatientData,
  history: Array<{ role: string; content: string }>,
): Promise<void> {
  try {
    await fetch(apiUrl("/sessions/save"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complaint, patient, history, backend: "openrouter" }),
    });
  } catch {
    // best-effort — kegagalan sinkronisasi tidak boleh mengganggu alur klinis
  }
}
