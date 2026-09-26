// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Unified Clinical Encounter State Store
 * Zustand + chrome.storage.local persistence with 24h TTL
 *
 * @module lib/store
 */

import { create } from 'zustand';
import type { DiagnosisSuggestion, VitalSigns } from '@/types/api';

// =============================================================================
// TYPES
// =============================================================================

export type PageType = 'anamnesa' | 'diagnosa' | 'resep' | 'unknown';
/**
 * Gender type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export type Gender = 'L' | 'P';

/**
 * PatientContext interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface PatientContext {
  patientId: string;
  patientName: string;
  age: number;
  gender: Gender;
  medicalRecordNumber?: string;
}

/**
 * AnamnesaData interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface AnamnesaData {
  complaint: string;
  additionalComplaints?: string;
  vitals: VitalSigns;
  allergies: string[];
  chronicDiseases: string[];
  history?: string;
}

/**
 * DiagnosisData interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface DiagnosisData {
  recommendations: DiagnosisSuggestion[];
  selectedDiagnosis: string | null;
  selectedICD10: string | null;
  confidence: number | null;
}

/**
 * MedicationRow interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface MedicationRow {
  id: string;
  racikan: string;
  jumlah_permintaan: number;
  nama_obat: string;
  jumlah: number;
  signa: string;
  aturan_pakai: string;
  keterangan: string;
}

/**
 * TherapyData interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface TherapyData {
  medications: MedicationRow[];
  prioritas: '0' | '1';
  ruangan: string;
  dokter: string;
  perawat: string;
}

/**
 * EncounterMetadata interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface EncounterMetadata {
  pelayananId: string | null;
  currentPage: PageType;
  timestamp: string;
  lastUpdated: string;
  expiresAt: string; // 24h from creation
}

// =============================================================================
// STATE INTERFACE
// =============================================================================

export interface EncounterState {
  // Patient context
  patient: PatientContext | null;

  // Clinical data by phase
  anamnesa: AnamnesaData | null;
  diagnosis: DiagnosisData | null;
  therapy: TherapyData | null;

  // Metadata
  meta: EncounterMetadata;

  // Loading states
  isScrapingAnamnesa: boolean;
  isAnalyzingDiagnosis: boolean;
  isFillingForm: boolean;

  // Actions - Patient Context
  setPatientContext: (patient: PatientContext) => void;
  clearPatientContext: () => void;

  // Actions - Page Navigation
  setCurrentPage: (page: PageType) => void;
  setPelayananId: (id: string) => void;

  // Actions - Anamnesa
  setAnamnesaData: (data: AnamnesaData) => void;
  updateVitals: (vitals: Partial<VitalSigns>) => void;
  addAllergy: (allergy: string) => void;
  removeAllergy: (allergy: string) => void;
  setScrapingAnamnesa: (loading: boolean) => void;

  // Actions - Diagnosis
  setDiagnosisRecommendations: (recommendations: DiagnosisSuggestion[]) => void;
  selectDiagnosis: (icd10: string, name: string, confidence: number) => void;
  clearDiagnosisSelection: () => void;
  setAnalyzingDiagnosis: (loading: boolean) => void;

  // Actions - Therapy
  setTherapyData: (data: Partial<TherapyData>) => void;
  addMedication: (medication: MedicationRow) => void;
  updateMedication: (id: string, updates: Partial<MedicationRow>) => void;
  removeMedication: (id: string) => void;
  setFillingForm: (loading: boolean) => void;

  // Actions - Session Management
  resetEncounter: () => void;
  isExpired: () => boolean;
  refreshExpiry: () => void;

  // Actions - Persistence
  saveToStorage: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

// =============================================================================
// STORAGE HELPERS
// =============================================================================

const STORAGE_KEY = 'sentra_encounter_state';
const TTL_HOURS = 24;

function createExpiryTimestamp(): string {
  const now = new Date();
  now.setHours(now.getHours() + TTL_HOURS);
  return now.toISOString();
}

function isTimestampExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const createInitialMeta = (): EncounterMetadata => ({
  pelayananId: null,
  currentPage: 'unknown',
  timestamp: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
  expiresAt: createExpiryTimestamp(),
});

const initialState = {
  patient: null,
  anamnesa: null,
  diagnosis: null,
  therapy: null,
  meta: createInitialMeta(),
  isScrapingAnamnesa: false,
  isAnalyzingDiagnosis: false,
  isFillingForm: false,
};

// =============================================================================
// ZUSTAND STORE
// =============================================================================

export const useEncounterStore = create<EncounterState>((set, get) => ({
  ...initialState,

  // Patient Context Actions
  setPatientContext: (patient) => {
    set({ patient });
    get().saveToStorage();
  },

  clearPatientContext: () => {
    set({ patient: null });
    get().saveToStorage();
  },

  // Page Navigation Actions
  setCurrentPage: (page) => {
    set((state) => ({
      meta: { ...state.meta, currentPage: page, lastUpdated: new Date().toISOString() },
    }));
    get().saveToStorage();
  },

  setPelayananId: (id) => {
    set((state) => ({
      meta: { ...state.meta, pelayananId: id, lastUpdated: new Date().toISOString() },
    }));
    get().saveToStorage();
  },

  // Anamnesa Actions
  setAnamnesaData: (data) => {
    set({ anamnesa: data });
    get().saveToStorage();
  },

  updateVitals: (vitals) => {
    set((state) => ({
      anamnesa: state.anamnesa
        ? { ...state.anamnesa, vitals: { ...state.anamnesa.vitals, ...vitals } }
        : null,
    }));
    get().saveToStorage();
  },

  addAllergy: (allergy) => {
    set((state) => ({
      anamnesa: state.anamnesa
        ? { ...state.anamnesa, allergies: [...state.anamnesa.allergies, allergy] }
        : null,
    }));
    get().saveToStorage();
  },

  removeAllergy: (allergy) => {
    set((state) => ({
      anamnesa: state.anamnesa
        ? { ...state.anamnesa, allergies: state.anamnesa.allergies.filter((a) => a !== allergy) }
        : null,
    }));
    get().saveToStorage();
  },

  setScrapingAnamnesa: (loading) => {
    set({ isScrapingAnamnesa: loading });
  },

  // Diagnosis Actions
  setDiagnosisRecommendations: (recommendations) => {
    set((state) => ({
      diagnosis: {
        ...state.diagnosis,
        recommendations,
        selectedDiagnosis: state.diagnosis?.selectedDiagnosis || null,
        selectedICD10: state.diagnosis?.selectedICD10 || null,
        confidence: state.diagnosis?.confidence || null,
      },
    }));
    get().saveToStorage();
  },

  selectDiagnosis: (icd10, name, confidence) => {
    set((state) => ({
      diagnosis: {
        recommendations: state.diagnosis?.recommendations || [],
        selectedDiagnosis: name,
        selectedICD10: icd10,
        confidence,
      },
    }));
    get().saveToStorage();
  },

  clearDiagnosisSelection: () => {
    set((state) => ({
      diagnosis: state.diagnosis
        ? { ...state.diagnosis, selectedDiagnosis: null, selectedICD10: null, confidence: null }
        : null,
    }));
    get().saveToStorage();
  },

  setAnalyzingDiagnosis: (loading) => {
    set({ isAnalyzingDiagnosis: loading });
  },

  // Therapy Actions
  setTherapyData: (data) => {
    set((state) => ({
      therapy: state.therapy ? { ...state.therapy, ...data } : null,
    }));
    get().saveToStorage();
  },

  addMedication: (medication) => {
    set((state) => ({
      therapy: state.therapy
        ? { ...state.therapy, medications: [...state.therapy.medications, medication] }
        : { medications: [medication], prioritas: '0', ruangan: 'APOTEK', dokter: '', perawat: '' },
    }));
    get().saveToStorage();
  },

  updateMedication: (id, updates) => {
    set((state) => ({
      therapy: state.therapy
        ? {
            ...state.therapy,
            medications: state.therapy.medications.map((m) =>
              m.id === id ? { ...m, ...updates } : m
            ),
          }
        : null,
    }));
    get().saveToStorage();
  },

  removeMedication: (id) => {
    set((state) => ({
      therapy: state.therapy
        ? { ...state.therapy, medications: state.therapy.medications.filter((m) => m.id !== id) }
        : null,
    }));
    get().saveToStorage();
  },

  setFillingForm: (loading) => {
    set({ isFillingForm: loading });
  },

  // Session Management
  resetEncounter: () => {
    set({ ...initialState, meta: createInitialMeta() });
    browser.storage.local.remove(STORAGE_KEY);
  },

  isExpired: () => {
    const { meta } = get();
    return isTimestampExpired(meta.expiresAt);
  },

  refreshExpiry: () => {
    set((state) => ({
      meta: {
        ...state.meta,
        expiresAt: createExpiryTimestamp(),
        lastUpdated: new Date().toISOString(),
      },
    }));
    get().saveToStorage();
  },

  // Persistence
  saveToStorage: async () => {
    const state = get();
    const dataToSave = {
      patient: state.patient,
      anamnesa: state.anamnesa,
      diagnosis: state.diagnosis,
      therapy: state.therapy,
      meta: state.meta,
    };

    try {
      await browser.storage.local.set({ [STORAGE_KEY]: dataToSave });
      console.warn('[Store] State saved to browser.storage.local');
    } catch (error) {
      console.error('[Store] Failed to save state:', error);
    }
  },

  loadFromStorage: async () => {
    try {
      const result = await browser.storage.local.get(STORAGE_KEY);
      const savedState = result[STORAGE_KEY] as
        | {
            patient: PatientContext | null;
            anamnesa: AnamnesaData | null;
            diagnosis: DiagnosisData | null;
            therapy: TherapyData | null;
            meta: EncounterMetadata;
          }
        | undefined;

      if (!savedState) {
        console.warn('[Store] No saved state found');
        return;
      }

      // Check expiry
      if (isTimestampExpired(savedState.meta.expiresAt)) {
        console.warn('[Store] Saved state expired, clearing...');
        await browser.storage.local.remove(STORAGE_KEY);
        return;
      }

      // Restore state
      set({
        patient: savedState.patient,
        anamnesa: savedState.anamnesa,
        diagnosis: savedState.diagnosis,
        therapy: savedState.therapy,
        meta: savedState.meta,
      });

      console.warn('[Store] State loaded from browser.storage.local');
    } catch (error) {
      console.error('[Store] Failed to load state:', error);
    }
  },
}));

// =============================================================================
// AUTO-LOAD ON INIT
// =============================================================================

// Auto-load state when store is first accessed
useEncounterStore.getState().loadFromStorage();
