// Designed and constructed by Drferdi.
/**
 * Visit History Store — the current patient's visits, kept in memory only
 *
 * ePuskesmas is the record of the patient's history; Assist reads the visits from the RME, uses
 * them and keeps nothing (Chief, 2026-10-03: "RME kan ada database untuk menyimpan data pasien?
 * Assist hanya mengambil dari rme lalu proses done"). The store therefore holds one patient's
 * visits for as long as the side panel is open, drops them when another patient's visits arrive,
 * and deletes the IndexedDB database earlier versions kept on the clinic PC.
 *
 * @module lib/iskandar-diagnosis-engine/visit-history-store
 */

// ============================================================================
// TYPES
// ============================================================================

export interface VisitRecord {
  /** Auto-generated key */
  id?: number;
  /** Patient identifier (RM number) */
  patient_id: string;
  /** Encounter/pelayanan ID */
  encounter_id: string;
  /** Visit timestamp (ISO string) */
  timestamp: string;
  /** Vital signs */
  vitals: {
    sbp: number;
    dbp: number;
    hr: number;
    rr: number;
    temp: number;
    glucose: number;
  };
  /** Chief complaint */
  keluhan_utama: string;
  /** Primary diagnosis */
  diagnosa?: {
    icd_x: string;
    nama: string;
  };
  /** Text-only therapy summary from previous visit */
  terapi_obat?: string;
  /** Clinician names captured from previous visit */
  dokter_penanganan?: string;
  perawat_penanganan?: string;
  /** Data source: 'scrape' (from ePuskesmas DOM) or 'uplink' (from current session) */
  source: 'scrape' | 'uplink';
}

// ============================================================================
// STORE
// ============================================================================

/** The IndexedDB database earlier versions kept every patient's visits in. */
const LEGACY_DB_NAME = 'sentra-visit-history';

let visits: VisitRecord[] = [];
let nextId = 1;
let legacyDropped = false;

function dropLegacyDatabase(): void {
  if (legacyDropped) return;
  legacyDropped = true;
  if (typeof indexedDB === 'undefined') return;
  const request = indexedDB.deleteDatabase(LEGACY_DB_NAME);
  request.onerror = () => console.error('[VisitHistory] Legacy database not deleted');
}

// ============================================================================
// OPERATIONS
// ============================================================================

/**
 * Save a visit record. Another patient's visits are dropped first. An encounter already saved is
 * kept, except a scanned one whose therapy a new scan reads differently: the riwayat Resep table
 * replaces the free-text therapy with its signa (Chief, 2026-10-02: "Pengisian dosis salah").
 */
export async function saveVisit(record: Omit<VisitRecord, 'id'>): Promise<void> {
  dropLegacyDatabase();
  if (visits.some((visit) => visit.patient_id !== record.patient_id)) {
    visits = [];
  }

  const index = visits.findIndex((visit) => visit.encounter_id === record.encounter_id);
  if (index === -1) {
    visits.push({ ...record, id: nextId++ });
    return;
  }

  const existing = visits[index];
  const rescanned =
    existing.source === 'scrape' &&
    record.source === 'scrape' &&
    existing.terapi_obat !== record.terapi_obat;
  if (rescanned) {
    visits[index] = { ...record, id: existing.id };
  }
}

/**
 * Retrieve last N visits for a patient, ordered by timestamp DESC.
 */
export async function getPatientVisits(
  patientId: string,
  limit: number = 3
): Promise<VisitRecord[]> {
  dropLegacyDatabase();
  return visits
    .filter((visit) => visit.patient_id === patientId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Save multiple visit records from scraping (batch insert).
 */
export async function saveScrapedVisits(records: Omit<VisitRecord, 'id'>[]): Promise<number> {
  for (const record of records) {
    await saveVisit(record);
  }
  return records.length;
}
