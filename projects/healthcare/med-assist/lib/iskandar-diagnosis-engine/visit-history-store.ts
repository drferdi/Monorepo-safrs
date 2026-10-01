// Designed and constructed by Drferdi.
/**
 * Visit History Store — IndexedDB persistence for encounter trajectory
 *
 * Stores vital signs + diagnoses from each completed encounter.
 * Indexed by patient_id for fast retrieval of last N visits.
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
// DATABASE
// ============================================================================

const DB_NAME = 'sentra-visit-history';
const DB_VERSION = 1;
const STORE_NAME = 'visits';

let db: IDBDatabase | null = null;

/**
 * initVisitHistoryStore
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export async function initVisitHistoryStore(): Promise<void> {
  if (db) return;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[VisitHistory] DB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.warn('[VisitHistory] Database initialized');
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('patient_id', 'patient_id', { unique: false });
        store.createIndex('encounter_id', 'encounter_id', { unique: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('patient_timestamp', ['patient_id', 'timestamp'], {
          unique: false,
        });
      }
    };
  });
}

function getDB(): IDBDatabase {
  if (!db) throw new Error('[VisitHistory] Database not initialized');
  return db;
}

// ============================================================================
// OPERATIONS
// ============================================================================

/**
 * Save a visit record. An encounter already saved is kept, except a scanned one whose therapy a new
 * scan reads differently: the riwayat Resep table replaces the free-text therapy with its signa
 * (Chief, 2026-10-02: "Pengisian dosis salah").
 */
export async function saveVisit(record: Omit<VisitRecord, 'id'>): Promise<void> {
  await initVisitHistoryStore();

  // Check duplicate by encounter_id
  const existing = await getVisitByEncounterId(record.encounter_id);
  if (existing) {
    const rescanned =
      existing.source === 'scrape' &&
      record.source === 'scrape' &&
      existing.terapi_obat !== record.terapi_obat;
    if (!rescanned) {
      console.warn('[VisitHistory] Encounter already saved:', record.encounter_id);
      return;
    }
    return new Promise((resolve, reject) => {
      const request = getDB()
        .transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME)
        .put({ ...record, id: existing.id });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  return new Promise((resolve, reject) => {
    const tx = getDB().transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(record);

    request.onsuccess = () => {
      console.warn('[VisitHistory] Visit saved:', record.encounter_id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get visit by encounter_id
 */
async function getVisitByEncounterId(encounterId: string): Promise<VisitRecord | null> {
  return new Promise((resolve, reject) => {
    const tx = getDB().transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('encounter_id');
    const request = index.get(encounterId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve last N visits for a patient, ordered by timestamp DESC.
 */
export async function getPatientVisits(
  patientId: string,
  limit: number = 3
): Promise<VisitRecord[]> {
  await initVisitHistoryStore();

  return new Promise((resolve, reject) => {
    const tx = getDB().transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('patient_id');
    const request = index.getAll(patientId);

    request.onsuccess = () => {
      const results = (request.result as VisitRecord[])
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save multiple visit records from scraping (batch insert).
 */
export async function saveScrapedVisits(records: Omit<VisitRecord, 'id'>[]): Promise<number> {
  await initVisitHistoryStore();
  let saved = 0;

  for (const record of records) {
    try {
      await saveVisit(record);
      saved++;
    } catch {
      // Skip duplicates silently
    }
  }

  console.warn(`[VisitHistory] Batch saved: ${saved}/${records.length}`);
  return saved;
}
