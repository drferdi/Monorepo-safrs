// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

// Typed chrome.storage.local wrapper
// Based on SENTRA-SPEC-001 v1.2.0 Section 3.3 & 11.2
// Provides type-safe encounter persistence with 24h TTL

import type { Encounter } from './types';

const STORAGE_KEY = 'sentra:encounter';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StorageWrapper {
  encounter: Encounter | null;
  timestamp: number;
}

// Validate encounter structure
function isValidEncounter(data: unknown): data is Encounter {
  if (typeof data !== 'object' || data === null) return false;
  const e = data as Partial<Encounter>;
  return !!(
    e.id &&
    e.patient_id &&
    e.timestamp &&
    e.dokter &&
    e.anamnesa &&
    e.diagnosa &&
    Array.isArray(e.resep)
  );
}

// Get current encounter from storage
export async function getEncounter(): Promise<Encounter | null> {
  try {
    const result = await browser.storage.local.get(STORAGE_KEY);
    const wrapper = result[STORAGE_KEY] as StorageWrapper | undefined;

    if (!wrapper) return null;

    // Check TTL
    const age = Date.now() - wrapper.timestamp;
    if (age > TTL_MS) {
      await clearEncounter();
      return null;
    }

    // Validate structure
    if (!isValidEncounter(wrapper.encounter)) {
      console.warn('[Storage] Invalid encounter structure, clearing');
      await clearEncounter();
      return null;
    }

    return wrapper.encounter;
  } catch (error) {
    console.error('[Storage] Failed to get encounter:', error);
    return null;
  }
}

// Save encounter to storage
export async function saveEncounter(encounter: Encounter): Promise<boolean> {
  try {
    if (!isValidEncounter(encounter)) {
      console.error('[Storage] Invalid encounter structure');
      return false;
    }

    const wrapper: StorageWrapper = {
      encounter,
      timestamp: Date.now(),
    };

    await browser.storage.local.set({ [STORAGE_KEY]: wrapper });
    return true;
  } catch (error) {
    console.error('[Storage] Failed to save encounter:', error);
    return false;
  }
}

// Update partial encounter data
export async function updateEncounter(partial: Partial<Encounter>): Promise<boolean> {
  try {
    const current = await getEncounter();
    if (!current) {
      console.error('[Storage] No encounter to update');
      return false;
    }

    // Deep merge
    const updated: Encounter = {
      ...current,
      ...partial,
      anamnesa: {
        ...current.anamnesa,
        ...(partial.anamnesa || {}),
        alergi: {
          ...current.anamnesa.alergi,
          ...(partial.anamnesa?.alergi || {}),
        },
        lama_sakit: {
          ...current.anamnesa.lama_sakit,
          ...(partial.anamnesa?.lama_sakit || {}),
        },
      },
      diagnosa: {
        ...current.diagnosa,
        ...(partial.diagnosa || {}),
      },
      resep: partial.resep || current.resep,
    };

    return await saveEncounter(updated);
  } catch (error) {
    console.error('[Storage] Failed to update encounter:', error);
    return false;
  }
}

// Clear encounter from storage
export async function clearEncounter(): Promise<void> {
  try {
    await browser.storage.local.remove(STORAGE_KEY);
  } catch (error) {
    console.error('[Storage] Failed to clear encounter:', error);
  }
}

// Create new empty encounter
export function createEmptyEncounter(pelayananId: string, patientId: string): Encounter {
  return {
    id: pelayananId,
    patient_id: patientId,
    timestamp: new Date().toISOString(),
    dokter: { id: '', nama: '' },
    perawat: { id: '', nama: '' },
    anamnesa: {
      keluhan_utama: '',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 0 },
      riwayat_penyakit: null,
      alergi: {
        obat: [],
        makanan: [],
        udara: [],
        lainnya: [],
      },
    },
    diagnosa: {
      icd_x: '',
      nama: '',
      jenis: 'PRIMER',
      kasus: 'BARU',
      prognosa: '',
      penyakit_kronis: [],
    },
    resep: [],
  };
}
