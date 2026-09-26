// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Sentra API Client
 * CDSS Backend Integration with Mock Support
 *
 * @module lib/api/sentra-api
 * @version 1.0.0
 */

// Import DDInter-based DDI checker (173K+ interactions)
import {
  buildMockDiagnosisResponse,
  buildMockPrescriptionResponse,
  checkMockDDI,
  combineAndSortAlerts,
  generateAllergyAlerts,
  generateChronicDiseaseAlerts,
  generateGeriatricAlert,
  generatePediatricAlert,
  generateSepsisAlert,
  generateVitalSignAlerts,
} from './mocks';
import { PIILeakError, assertNoPII } from './pii-guard';

import {
  checkDrugInteractions as checkDDInterInteractions,
  loadDDIDatabase,
} from '@/lib/iskandar-diagnosis-engine/ddi-checker';
import {
  generatePharmacotherapyPlan,
  type PharmacotherapyPlan,
} from '@/lib/iskandar-diagnosis-engine/pharmacotherapy-reasoner';
import { getICD10Details, searchForDiagnosisSuggestions, searchICD10 } from '@/lib/rag';
import type {
  AllergyCheckRequest,
  APIError,
  APIResponse,
  CDSSAlert,
  CDSSResponse,
  DDICheckRequest,
  DiagnosisRequestContext,
  DrugInteraction,
  PediatricDose,
  PediatricDoseRequest,
  PharmacotherapyExplainability,
  PrescriptionRequestContext,
} from '@/types/api';
import { createLogger } from '@/utils/logger';

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE = import.meta.env.VITE_SENTRA_API_URL || 'https://api.sentra.local';
const API_KEY = import.meta.env.VITE_SENTRA_API_KEY || '';
const FACILITY_ID = import.meta.env.VITE_FACILITY_ID || 'PUSKESMAS_DEFAULT';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const API_TIMEOUT = Number.parseInt(import.meta.env.VITE_API_TIMEOUT || '10000', 10);
const DEBUG = import.meta.env.VITE_DEBUG === 'true';

// Feature flags
const FEATURE_DIAGNOSIS_AI = import.meta.env.VITE_FEATURE_DIAGNOSIS_AI !== 'false';
const FEATURE_PRESCRIPTION_AI = import.meta.env.VITE_FEATURE_PRESCRIPTION_AI !== 'false';
const FEATURE_DDI_CHECK = import.meta.env.VITE_FEATURE_DDI_CHECK !== 'false';
const FEATURE_PEDIATRIC_DOSE = import.meta.env.VITE_FEATURE_PEDIATRIC_DOSE !== 'false';
const apiLog = createLogger('SentraAPI', 'global');

// =============================================================================
// LOGGING
// =============================================================================

function log(message: string, data?: unknown): void {
  if (DEBUG) {
    apiLog.debug(message, data || '');
  }
}

function deriveAturanPakai(namaObat: string): 'Sebelum makan' | 'Sesudah makan' | 'Pemakaian luar' {
  const normalized = namaObat.toLowerCase();
  if (
    normalized.includes('cream') ||
    normalized.includes('krim') ||
    normalized.includes('salep') ||
    normalized.includes('ointment')
  ) {
    return 'Pemakaian luar';
  }
  return 'Sesudah makan';
}

interface KnowledgeTherapyDetail {
  code: string;
  name_id?: string;
  name_en?: string;
  terapi?: Array<{ obat: string; frek?: string; dosis?: string }>;
}

const FKTP_PRIORITY_KNOWLEDGE_CODES = {
  ischemic: ['I20.9', 'I21.9', 'I22.9', 'I24.9'],
  hypertension: ['I10', 'I11.9', 'I12.9', 'I15.9'],
  diabetes: ['E11.9', 'E14.9'],
} as const;

function buildKnowledgeCandidateCodes(code: string): string[] {
  const normalized = code.toUpperCase().trim();
  const base3 = normalized.includes('.') ? normalized.split('.')[0] : normalized.substring(0, 3);
  const candidates = new Set<string>([
    normalized,
    normalized.includes('.') ? normalized.split('.')[0] : normalized,
    base3,
  ]);

  if (/^I2[0-4]/.test(normalized)) {
    FKTP_PRIORITY_KNOWLEDGE_CODES.ischemic.forEach((item) => candidates.add(item));
  } else if (/^I1[0-6]/.test(normalized)) {
    FKTP_PRIORITY_KNOWLEDGE_CODES.hypertension.forEach((item) => candidates.add(item));
  } else if (/^E1[0-4]/.test(normalized)) {
    FKTP_PRIORITY_KNOWLEDGE_CODES.diabetes.forEach((item) => candidates.add(item));
  }

  return Array.from(candidates).filter(Boolean);
}

function rankKnowledgeDetail(
  detail: KnowledgeTherapyDetail,
  candidateCodes: string[],
  base3: string
): number {
  const code = detail.code.toUpperCase();
  let score = 0;

  const candidateIndex = candidateCodes.findIndex((candidate) => candidate.toUpperCase() === code);
  if (candidateIndex >= 0) {
    score += Math.max(30, 90 - candidateIndex * 8);
  }
  if (code.startsWith(base3)) score += 24;
  if (Array.isArray(detail.terapi)) score += Math.min(20, detail.terapi.length * 5);
  return score;
}

function pickBestKnowledgeDetail(
  details: KnowledgeTherapyDetail[],
  candidateCodes: string[],
  base3: string
): KnowledgeTherapyDetail | null {
  const withTherapy = details.filter(
    (detail) => Array.isArray(detail.terapi) && detail.terapi.length > 0
  );
  if (withTherapy.length === 0) return null;

  return [...withTherapy].sort(
    (a, b) =>
      rankKnowledgeDetail(b, candidateCodes, base3) - rankKnowledgeDetail(a, candidateCodes, base3)
  )[0];
}

async function resolveKnowledgeTherapyDetail(
  context: PrescriptionRequestContext,
  code: string
): Promise<KnowledgeTherapyDetail | null> {
  const candidateCodes = buildKnowledgeCandidateCodes(code);
  const base3 = code.includes('.') ? code.split('.')[0] : code.substring(0, 3);

  const directDetails = await getICD10Details(candidateCodes);
  const directBest = pickBestKnowledgeDetail(directDetails, candidateCodes, base3);
  if (directBest) return directBest;

  try {
    const codeSearchResults = await searchICD10(base3, {
      limit: 15,
      leaf_only: true,
      min_score: 0.1,
      boost_common: true,
    });
    const codeSearchBest = pickBestKnowledgeDetail(
      codeSearchResults.map((result) => result.entry),
      candidateCodes,
      base3
    );
    if (codeSearchBest) return codeSearchBest;
  } catch {
    // Continue to narrative search fallback
  }

  const narrative = [context.selected_diagnosis_name, context.keluhan_utama]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (!narrative) return null;

  try {
    const complaintResults = await searchForDiagnosisSuggestions(
      narrative,
      context.keluhan_utama,
      15
    );
    const complaintBest = pickBestKnowledgeDetail(
      complaintResults.map((result) => result.entry),
      candidateCodes,
      base3
    );
    return complaintBest;
  } catch {
    return null;
  }
}

async function buildKnowledgePrescriptionResponse(
  context: PrescriptionRequestContext
): Promise<CDSSResponse | null> {
  const code = context.icd_x.toUpperCase().trim();
  if (!code) return null;

  const detail = await resolveKnowledgeTherapyDetail(context, code);
  if (!detail?.terapi || detail.terapi.length === 0) {
    return null;
  }

  const medications = detail.terapi.slice(0, 6).map((item) => ({
    nama_obat: item.obat,
    dosis: item.frek || item.dosis || '-',
    aturan_pakai: deriveAturanPakai(item.obat),
    durasi: '3-5 hari',
    rationale: `Terapi farmakologi awal berbasis knowledge ICD (${detail.code}).`,
    safety_check: 'safe' as const,
    contraindications: [] as string[],
  }));

  const alerts = generateAllergyAlerts(medications, context.alergi);

  return {
    diagnosis_suggestions: [],
    medication_recommendations: medications,
    alerts,
    clinical_guidelines: [
      `Basis knowledge: ${detail.code} - ${detail.name_id || detail.name_en || 'Diagnosis'}`,
      'Konfirmasi dengan pemeriksaan fisik dan pemeriksaan penunjang sesuai konteks klinis.',
      'Rujuk sesuai red flag dan kriteria rujukan FKTP.',
    ],
    meta: {
      processing_time_ms: 200,
      model_version: 'knowledge-db-v1',
      timestamp: new Date().toISOString(),
      is_mock: true,
    },
  };
}

function normalizeDrugName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function mergeMedicationRecommendations(
  primary: CDSSResponse['medication_recommendations'],
  secondary: CDSSResponse['medication_recommendations'],
  limit = 6
): CDSSResponse['medication_recommendations'] {
  const merged = [...primary, ...secondary];
  const unique = new Map<string, CDSSResponse['medication_recommendations'][number]>();
  for (const med of merged) {
    const key = normalizeDrugName(med.nama_obat);
    const existing = unique.get(key);
    if (!existing) {
      unique.set(key, med);
      continue;
    }
    unique.set(key, {
      ...existing,
      role: existing.role || med.role,
      isChronicContinuation:
        existing.isChronicContinuation || med.isChronicContinuation || undefined,
    });
  }
  return Array.from(unique.values()).slice(0, limit);
}

type MedicationComponentRole = 'utama' | 'adjuvant' | 'vitamin';

interface CuratedMedicationCandidate {
  role: MedicationComponentRole;
  medication: CDSSResponse['medication_recommendations'][number];
}

interface RegimenCompositionResult {
  medications: CDSSResponse['medication_recommendations'];
  alerts: CDSSAlert[];
  drivers: string[];
}

const VITAMIN_MEDICATION_KEYWORDS = ['vitamin', 'ascorb', 'multivit', 'b complex', 'vit c', 'zinc'];
const ADJUVANT_MEDICATION_KEYWORDS = [
  'paracetamol',
  'acetaminophen',
  'ambroxol',
  'cetirizine',
  'ctm',
  'chlorpheniramine',
  'domperidone',
  'attapulgite',
  'oralit',
  'omeprazole',
  'lansoprazole',
];

const CURATED_ADJUVANT_CANDIDATES: CuratedMedicationCandidate[] = [
  {
    role: 'adjuvant',
    medication: {
      nama_obat: 'Paracetamol 500mg',
      dosis: '3x1',
      aturan_pakai: 'Sesudah makan',
      durasi: '3 hari',
      rationale: 'Komponen adjuvant simptomatik untuk kenyamanan pasien.',
      safety_check: 'safe',
      contraindications: [],
    },
  },
  {
    role: 'adjuvant',
    medication: {
      nama_obat: 'Cetirizine 10mg',
      dosis: '1x1',
      aturan_pakai: 'Sesudah makan',
      durasi: '3-5 hari',
      rationale: 'Komponen adjuvant untuk kontrol gejala alergik/pernapasan ringan.',
      safety_check: 'safe',
      contraindications: [],
    },
  },
];

const CURATED_VITAMIN_CANDIDATES: CuratedMedicationCandidate[] = [
  {
    role: 'vitamin',
    medication: {
      nama_obat: 'Vitamin C 500mg',
      dosis: '1x1',
      aturan_pakai: 'Sesudah makan',
      durasi: '5 hari',
      rationale: 'Komponen vitamin suportif untuk fase pemulihan klinis.',
      safety_check: 'safe',
      contraindications: [],
    },
  },
  {
    role: 'vitamin',
    medication: {
      nama_obat: 'Vitamin B Complex',
      dosis: '1x1',
      aturan_pakai: 'Sesudah makan',
      durasi: '5 hari',
      rationale: 'Komponen vitamin suportif sesuai praktik formulary umum.',
      safety_check: 'safe',
      contraindications: [],
    },
  },
];

function classifyMedicationRole(
  medication: CDSSResponse['medication_recommendations'][number]
): MedicationComponentRole {
  const normalized = normalizeDrugName(medication.nama_obat);
  if (VITAMIN_MEDICATION_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'vitamin';
  if (ADJUVANT_MEDICATION_KEYWORDS.some((keyword) => normalized.includes(keyword)))
    return 'adjuvant';
  return 'utama';
}

function summarizeMedicationRoles(
  medications: CDSSResponse['medication_recommendations']
): Record<MedicationComponentRole, number> {
  return medications.reduce<Record<MedicationComponentRole, number>>(
    (acc, medication) => {
      const role = classifyMedicationRole(medication);
      acc[role] += 1;
      return acc;
    },
    { utama: 0, adjuvant: 0, vitamin: 0 }
  );
}

function buildCompositionAlert(message: string): CDSSAlert {
  return {
    id: `regimen-composition-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type: 'guideline',
    severity: 'info',
    title: 'Komposisi Regimen Klinis',
    message,
    action:
      'Validasi kembali kesesuaian klinis dan kebijakan formularium lokal sebelum finalisasi resep.',
  };
}

function withRoleRationale(
  medication: CDSSResponse['medication_recommendations'][number],
  role: MedicationComponentRole
): CDSSResponse['medication_recommendations'][number] {
  return {
    ...medication,
    role,
    rationale: `${medication.rationale} [Komponen: ${role}]`,
  };
}

function enforceMedicationComposition(
  medications: CDSSResponse['medication_recommendations'],
  context: PrescriptionRequestContext,
  minCount = 3
): RegimenCompositionResult {
  const alerts: CDSSAlert[] = [];
  const drivers: string[] = [];

  if (medications.length === 0) {
    alerts.push(
      buildCompositionAlert(
        'Regimen kosong, komposisi minimal Utama + Adjuvant + Vitamin belum dapat dipenuhi secara otomatis.'
      )
    );
    drivers.push('Regimen composition: skip autofill karena regimen awal kosong.');
    return { medications, alerts, drivers };
  }

  const unique = new Map<string, CDSSResponse['medication_recommendations'][number]>();
  for (const medication of medications) {
    const key = normalizeDrugName(medication.nama_obat);
    if (!unique.has(key)) unique.set(key, medication);
  }
  const composed = Array.from(unique.values());

  const tryAppendCandidate = (candidate: CuratedMedicationCandidate): boolean => {
    if (composed.length >= 6) return false;
    const normalizedName = normalizeDrugName(candidate.medication.nama_obat);
    if (composed.some((item) => normalizeDrugName(item.nama_obat) === normalizedName)) return false;
    const blockReason = getMedicationSafetyBlockReason(candidate.medication.nama_obat, context);
    if (blockReason) {
      drivers.push(
        `Regimen composition: kandidat ${candidate.role} ${candidate.medication.nama_obat} diblok safety (${blockReason}).`
      );
      return false;
    }
    composed.push(withRoleRationale(candidate.medication, candidate.role));
    drivers.push(
      `Regimen composition: menambah ${candidate.role} -> ${candidate.medication.nama_obat}.`
    );
    return true;
  };

  const rolesAfterInitial = summarizeMedicationRoles(composed);
  if (rolesAfterInitial.adjuvant === 0) {
    for (const candidate of CURATED_ADJUVANT_CANDIDATES) {
      if (tryAppendCandidate(candidate)) break;
    }
  }
  if (rolesAfterInitial.vitamin === 0) {
    for (const candidate of CURATED_VITAMIN_CANDIDATES) {
      if (tryAppendCandidate(candidate)) break;
    }
  }

  // Maintain minimum 3 medications while still respecting safety + uniqueness constraints.
  const supplementalPool = [...CURATED_ADJUVANT_CANDIDATES, ...CURATED_VITAMIN_CANDIDATES];
  for (const candidate of supplementalPool) {
    if (composed.length >= minCount) break;
    tryAppendCandidate(candidate);
  }

  const finalRoles = summarizeMedicationRoles(composed);
  const unmetRoles: MedicationComponentRole[] = [];
  if (finalRoles.utama === 0) unmetRoles.push('utama');
  if (finalRoles.adjuvant === 0) unmetRoles.push('adjuvant');
  if (finalRoles.vitamin === 0) unmetRoles.push('vitamin');

  if (unmetRoles.length > 0 || composed.length < minCount) {
    alerts.push(
      buildCompositionAlert(
        `Komposisi regimen belum lengkap (${finalRoles.utama} utama, ${finalRoles.adjuvant} adjuvant, ${finalRoles.vitamin} vitamin; total ${composed.length}).`
      )
    );
    drivers.push(
      `Regimen composition: belum terpenuhi penuh (missing role: ${unmetRoles.join(', ') || 'none'}).`
    );
  } else {
    drivers.push(
      'Regimen composition: target minimal 3 komponen (utama + adjuvant + vitamin) terpenuhi.'
    );
  }

  return {
    medications: composed.slice(0, 6),
    alerts,
    drivers,
  };
}

const HIGH_PRIORITY_FKTP_PATTERNS = [/^I10/, /^I20/, /^I21/, /^I22/, /^I24/];
const CARDIAC_EMERGENCY_PATTERNS = [/^I20/, /^I21/, /^I22/, /^I24/];
const SAFETY_ALLERGY_MAP: Record<string, string[]> = {
  aspirin_family: ['aspirin', 'asetosal', 'salisilat', 'nsaid'],
  nitrate_family: ['nitro', 'nitroglycerin', 'isosorbid'],
  ace_inhibitor: ['captopril', 'lisinopril', 'enalapril', 'ramipril'],
  ccb: ['amlodipin', 'amlodipine', 'amlodip'],
  beta_blocker: ['bisoprolol', 'metoprolol', 'atenolol', 'carvedilol', 'propranolol'],
  sulfonylurea: ['glimepirid', 'glimepiride', 'glibenclamide'],
  metformin: ['metformin'],
};
const SAFETY_ACE_ARB_KEYWORDS = [
  'captopril',
  'lisinopril',
  'enalapril',
  'ramipril',
  'valsartan',
  'losartan',
  'telmisartan',
  'candesartan',
  'irbesartan',
  'olmesartan',
];
const PREGNANCY_KEYWORDS = [
  'hamil',
  'kehamilan',
  'pregnan',
  'obstetri',
  'antenatal',
  'intrapartum',
  'postpartum',
  'trimester',
  'gestasi',
  'gravida',
];

function isHighPriorityFktpCode(icdCode: string): boolean {
  return HIGH_PRIORITY_FKTP_PATTERNS.some((pattern) => pattern.test(icdCode.toUpperCase().trim()));
}

function isCardiacEmergencyCode(icdCode: string): boolean {
  return CARDIAC_EMERGENCY_PATTERNS.some((pattern) => pattern.test(icdCode.toUpperCase().trim()));
}

function matchAllergyCluster(medicationName: string, allergies: string[]): string | null {
  if (!allergies.length) return null;
  const normalizedMedication = normalizeDrugName(medicationName);
  const normalizedAllergies = allergies.map((item) => normalizeDrugName(item)).filter(Boolean);

  for (const allergy of normalizedAllergies) {
    if (allergy.length >= 4 && normalizedMedication.includes(allergy)) return allergy;
  }

  for (const [cluster, aliases] of Object.entries(SAFETY_ALLERGY_MAP)) {
    const allergyMatch = normalizedAllergies.some((allergy) => {
      if (allergy.includes(cluster)) return true;
      return aliases.some((alias) => allergy.includes(alias));
    });
    if (!allergyMatch) continue;
    if (aliases.some((alias) => normalizedMedication.includes(alias))) return cluster;
  }

  return null;
}

function isPregnancyContext(context: PrescriptionRequestContext): boolean {
  if (typeof context.is_pregnant === 'boolean') return context.is_pregnant;
  if (/^O\d{2}/.test(context.icd_x.toUpperCase().trim())) return true;
  const narrative = normalizeDrugName(
    [context.keluhan_utama, context.selected_diagnosis_name, context.penyakit_kronis.join(' ')]
      .filter(Boolean)
      .join(' ')
  );
  return PREGNANCY_KEYWORDS.some((keyword) => narrative.includes(keyword));
}

function getMedicationSafetyBlockReason(
  medicationName: string,
  context: PrescriptionRequestContext
): string | null {
  const allergyCluster = matchAllergyCluster(medicationName, context.alergi);
  if (allergyCluster) {
    return `diblok oleh safety filter karena riwayat alergi (${allergyCluster})`;
  }

  const normalizedMedication = normalizeDrugName(medicationName);
  if (
    (normalizedMedication.includes('nitro') || normalizedMedication.includes('isosorbid')) &&
    typeof context.vital_signs?.systolic === 'number' &&
    context.vital_signs.systolic < 90
  ) {
    return `diblok oleh safety filter karena SBP ${context.vital_signs.systolic} mmHg (< 90)`;
  }
  if (
    SAFETY_ALLERGY_MAP.beta_blocker.some((keyword) => normalizedMedication.includes(keyword)) &&
    typeof context.vital_signs?.heart_rate === 'number' &&
    context.vital_signs.heart_rate < 50
  ) {
    return `diblok oleh safety filter karena HR ${context.vital_signs.heart_rate}/mnt (< 50)`;
  }
  if (
    isPregnancyContext(context) &&
    SAFETY_ACE_ARB_KEYWORDS.some((keyword) => normalizedMedication.includes(keyword))
  ) {
    return 'diblok oleh safety filter karena kontraindikasi ACE inhibitor/ARB pada kehamilan';
  }

  return null;
}

function applyMedicationSafetyFilter(
  medications: CDSSResponse['medication_recommendations'],
  context: PrescriptionRequestContext
): {
  filtered: CDSSResponse['medication_recommendations'];
  alerts: CDSSAlert[];
  blockedDrivers: string[];
} {
  const alerts: CDSSAlert[] = [];
  const blockedDrivers: string[] = [];
  const filtered = medications.filter((medication) => {
    const reason = getMedicationSafetyBlockReason(medication.nama_obat, context);
    if (!reason) return true;
    alerts.push({
      id: `safety-block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: 'validation_warning',
      severity: 'high',
      title: 'Safety Filter: Rekomendasi Obat Diblok',
      message: `${medication.nama_obat} ${reason}.`,
      action: 'Verifikasi ulang alergi, hemodinamik, dan pilih alternatif yang aman.',
    });
    blockedDrivers.push(`${medication.nama_obat} ${reason}`);
    return false;
  });

  return { filtered, alerts, blockedDrivers };
}

function ensureHighPriorityEscalationAlert(
  responseData: CDSSResponse,
  context: PrescriptionRequestContext
): void {
  const normalizedCode = context.icd_x.toUpperCase().trim();
  if (!isCardiacEmergencyCode(normalizedCode)) return;

  const hasEscalation = responseData.alerts.some(
    (alert) => alert.type === 'red_flag' && alert.severity === 'emergency'
  );
  if (hasEscalation) return;

  responseData.alerts.push({
    id: `acs-escalation-${Date.now()}`,
    type: 'red_flag',
    severity: 'emergency',
    title: 'Suspek ACS: Stabilize and Refer',
    message:
      'Output farmakoterapi ini adalah dukungan stabilisasi awal, bukan terapi definitif. Evaluasi EKG 12 sadapan dan rujukan emergensi tetap prioritas.',
    action:
      'Lakukan monitoring serial TTV, evaluasi nyeri dada persisten, dan eskalasi rujukan bila ada instabilitas.',
  });
}

function deriveFallbackRiskTier(icdCode: string): PharmacotherapyExplainability['risk_tier'] {
  const normalized = icdCode.toUpperCase().trim();
  if (isCardiacEmergencyCode(normalized)) return 'emergency';
  if (/^I10/.test(normalized)) return 'urgent';
  return 'routine';
}

function deriveFallbackReviewWindow(
  riskTier: PharmacotherapyExplainability['risk_tier']
): PharmacotherapyExplainability['review_window'] {
  if (riskTier === 'emergency') return '6h';
  if (riskTier === 'urgent') return '24h';
  return '48h';
}

function buildPharmacotherapyExplainability(
  context: PrescriptionRequestContext,
  reasonerPlan: PharmacotherapyPlan | null,
  pathway: PharmacotherapyExplainability['pathway'],
  pipelineDrivers: string[]
): PharmacotherapyExplainability {
  const riskTier = reasonerPlan?.riskTier ?? deriveFallbackRiskTier(context.icd_x);
  const reviewWindow = reasonerPlan?.reviewWindow ?? deriveFallbackReviewWindow(riskTier);
  const baseConfidence =
    reasonerPlan?.confidence ??
    (pathway === 'legacy-fallback' ? 20 : pathway === 'knowledge-only' ? 50 : 42);

  return {
    confidence: baseConfidence,
    drivers: [...(reasonerPlan?.drivers ?? []), ...pipelineDrivers].slice(0, 16),
    missing_data: reasonerPlan?.missingData ?? [],
    risk_tier: riskTier,
    review_window: reviewWindow,
    pathway,
  };
}

function buildMockBlockedResponse(title: string, message: string): APIResponse<CDSSResponse> {
  return {
    success: true,
    data: {
      diagnosis_suggestions: [],
      medication_recommendations: [],
      alerts: [
        {
          id: `mock-blocked-${Date.now()}`,
          type: 'validation_warning',
          severity: 'high',
          title,
          message,
        },
      ],
      clinical_guidelines: ['Keputusan akhir tetap pada dokter penanggung jawab pasien.'],
      meta: {
        processing_time_ms: 0,
        model_version: 'sentra-api-mock-blocked',
        timestamp: new Date().toISOString(),
        is_mock: false,
        is_local: true,
      },
    },
  };
}

// =============================================================================
// HTTP CLIENT
// =============================================================================

interface FetchOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  timeout?: number;
}

async function fetchWithTimeout<T>(
  endpoint: string,
  options: FetchOptions
): Promise<APIResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || API_TIMEOUT);

  try {
    if (options.body !== undefined && options.body !== null) {
      assertNoPII(options.body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        'X-Facility-ID': FACILITY_ID,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: response.statusText,
          details: errorData,
        },
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof PIILeakError) {
      return {
        success: false,
        error: {
          code: 'PII_LEAK_DETECTED',
          message: error.message,
        },
      };
    }

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'Request timeout - API tidak merespon dalam waktu yang ditentukan',
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// =============================================================================
// RETRY LOGIC
// =============================================================================

async function withRetry<T>(
  operation: () => Promise<APIResponse<T>>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<APIResponse<T>> {
  let lastError: APIError | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await operation();

    if (result.success) {
      return result;
    }

    lastError = result.error;

    // Don't retry on client errors (4xx)
    if (result.error?.code?.startsWith('HTTP_4')) {
      return result;
    }

    if (attempt < maxRetries) {
      log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  return { success: false, error: lastError };
}

// =============================================================================
// API METHODS
// =============================================================================

/**
 * Sentra API Client
 * Provides CDSS capabilities with automatic mock fallback
 */
export const SentraAPI = {
  /**
   * Check if mock mode is enabled
   */
  isMockMode(): boolean {
    return USE_MOCK;
  },

  /**
   * Get diagnosis suggestions based on chief complaint
   */
  async suggestDiagnosis(context: DiagnosisRequestContext): Promise<APIResponse<CDSSResponse>> {
    if (!FEATURE_DIAGNOSIS_AI) {
      return {
        success: false,
        error: { code: 'FEATURE_DISABLED', message: 'Diagnosis AI feature is disabled' },
      };
    }

    log('suggestDiagnosis', context);

    if (USE_MOCK) {
      return buildMockBlockedResponse(
        'Diagnosis Mock Diblok',
        'Runtime masih berada pada mock mode. Jalur diagnosis placeholder diblok agar tidak menampilkan output klinis palsu.'
      );
    }

    // Use mock if enabled
    if (USE_MOCK) {
      log('Using mock response for diagnosis');
      const mockResponse = buildMockDiagnosisResponse(context.keluhan_utama);

      // Add age-based alerts
      const alerts: CDSSAlert[] = [...mockResponse.alerts];

      const pediatricAlert = generatePediatricAlert(context.patient_age);
      if (pediatricAlert) alerts.push(pediatricAlert);

      const geriatricAlert = generateGeriatricAlert(context.patient_age);
      if (geriatricAlert) alerts.push(geriatricAlert);

      // Add vital sign alerts if provided
      if (context.vital_signs) {
        const vitalAlerts = generateVitalSignAlerts(context.vital_signs);
        alerts.push(...vitalAlerts);

        const sepsisAlert = generateSepsisAlert(context.vital_signs);
        if (sepsisAlert) alerts.push(sepsisAlert);
      }

      // Add chronic disease alerts
      if (context.chronic_diseases) {
        const chronicAlerts = generateChronicDiseaseAlerts(context.chronic_diseases);
        alerts.push(...chronicAlerts);
      }

      mockResponse.alerts = combineAndSortAlerts(alerts);

      return { success: true, data: mockResponse };
    }

    // Real API call
    return withRetry(() =>
      fetchWithTimeout<CDSSResponse>('/v1/cdss/diagnose', {
        method: 'POST',
        body: context,
      })
    );
  },

  /**
   * Get prescription recommendations based on diagnosis
   */
  async recommendPrescription(
    context: PrescriptionRequestContext
  ): Promise<APIResponse<CDSSResponse>> {
    if (!FEATURE_PRESCRIPTION_AI) {
      return {
        success: false,
        error: { code: 'FEATURE_DISABLED', message: 'Prescription AI feature is disabled' },
      };
    }

    log('recommendPrescription', context);

    if (USE_MOCK) {
      return buildMockBlockedResponse(
        'Farmakoterapi Mock Diblok',
        'Runtime masih berada pada mock mode. Sistem menahan farmakoterapi otomatis agar tidak memakai template atau placeholder.'
      );
    }

    // Use mock if enabled
    if (USE_MOCK) {
      log(
        'Using AI-driven local prescription flow (knowledge -> syndrome-intent -> legacy fallback)'
      );

      let responseData: CDSSResponse | null = null;
      let reasonerPlan: PharmacotherapyPlan | null = null;
      let reasonerMerged = false;
      const reasonerWarnings: string[] = [];
      const pipelineDrivers: string[] = [];
      let pathway: PharmacotherapyExplainability['pathway'] = 'legacy-fallback';

      try {
        responseData = await buildKnowledgePrescriptionResponse(context);
        if (responseData) {
          pathway = 'knowledge-only';
          pipelineDrivers.push('Knowledge-based therapy menghasilkan regimen awal.');
        } else {
          pipelineDrivers.push('Knowledge-based therapy tidak menemukan paket terapi yang cocok.');
        }
      } catch (error) {
        log('Knowledge DB lookup failed', error);
        pipelineDrivers.push('Knowledge-based therapy gagal dieksekusi.');
      }

      reasonerPlan = await generatePharmacotherapyPlan(context).catch((error) => {
        reasonerWarnings.push(
          error instanceof Error
            ? `Syndrome-intent reasoner gagal dijalankan: ${error.message}`
            : 'Syndrome-intent reasoner gagal dijalankan.'
        );
        return null;
      });

      if (reasonerPlan) {
        pipelineDrivers.push(
          `Syndrome-intent reasoner dieksekusi (${reasonerPlan.medications.length} kandidat obat).`
        );
        if (responseData) {
          responseData.medication_recommendations = mergeMedicationRecommendations(
            responseData.medication_recommendations,
            reasonerPlan.medications,
            6
          );
          responseData.alerts.push(...reasonerPlan.alerts);
          responseData.clinical_guidelines = Array.from(
            new Set([...(responseData.clinical_guidelines || []), ...reasonerPlan.guidelines])
          );
          reasonerMerged = true;
          pathway = 'knowledge+syndrome-intent';
        } else if (reasonerPlan.medications.length > 0) {
          responseData = {
            diagnosis_suggestions: [],
            medication_recommendations: reasonerPlan.medications,
            alerts: [...reasonerPlan.alerts],
            clinical_guidelines: [...reasonerPlan.guidelines],
            meta: {
              processing_time_ms: 220,
              model_version: 'pharmacotherapy-reasoner-v2',
              timestamp: new Date().toISOString(),
              is_mock: true,
            },
          };
          reasonerMerged = true;
          pathway = 'syndrome-intent-only';
        } else {
          pipelineDrivers.push('Syndrome-intent reasoner tidak menemukan regimen aman.');
        }
      }

      if (!responseData) {
        log('Knowledge + reasoner tidak menghasilkan regimen operasional, gunakan legacy fallback');
        responseData = buildMockPrescriptionResponse(
          context.icd_x,
          context.alergi,
          context.penyakit_kronis
        );
        pathway = 'legacy-fallback';
        pipelineDrivers.push('Legacy fallback dipakai sebagai jalur terakhir.');
      }

      if (reasonerPlan && !reasonerMerged) {
        responseData.alerts.push(...reasonerPlan.alerts);
        responseData.clinical_guidelines = Array.from(
          new Set([...(responseData.clinical_guidelines || []), ...reasonerPlan.guidelines])
        );
      }

      const safetyResult = applyMedicationSafetyFilter(
        responseData.medication_recommendations,
        context
      );
      responseData.medication_recommendations = safetyResult.filtered;
      responseData.alerts.push(...safetyResult.alerts);
      if (safetyResult.blockedDrivers.length > 0) {
        pipelineDrivers.push(
          ...safetyResult.blockedDrivers.map((line) => `Safety filter: ${line}`)
        );
      }

      if (responseData.medication_recommendations.length === 0 && pathway !== 'legacy-fallback') {
        const legacyResponse = buildMockPrescriptionResponse(
          context.icd_x,
          context.alergi,
          context.penyakit_kronis
        );
        const legacySafety = applyMedicationSafetyFilter(
          legacyResponse.medication_recommendations,
          context
        );
        responseData.medication_recommendations = legacySafety.filtered;
        responseData.alerts.push(...legacyResponse.alerts, ...legacySafety.alerts);
        responseData.clinical_guidelines = Array.from(
          new Set([
            ...(responseData.clinical_guidelines || []),
            ...(legacyResponse.clinical_guidelines || []),
          ])
        );
        pathway = 'legacy-fallback';
        pipelineDrivers.push(
          'Legacy fallback dieksekusi setelah jalur knowledge + reasoner tidak menghasilkan regimen aman.'
        );
      }

      const composition = enforceMedicationComposition(
        responseData.medication_recommendations,
        context,
        3
      );
      responseData.medication_recommendations = composition.medications;
      responseData.alerts.push(...composition.alerts);
      if (composition.drivers.length > 0) {
        pipelineDrivers.push(...composition.drivers);
      }

      const allergyAlerts = generateAllergyAlerts(
        responseData.medication_recommendations,
        context.alergi
      );
      responseData.alerts.push(...allergyAlerts);

      if (
        responseData.medication_recommendations.length === 0 &&
        isHighPriorityFktpCode(context.icd_x)
      ) {
        responseData.alerts.push({
          id: `high-priority-empty-${Date.now()}`,
          type: isCardiacEmergencyCode(context.icd_x) ? 'red_flag' : 'validation_warning',
          severity: isCardiacEmergencyCode(context.icd_x) ? 'emergency' : 'high',
          title: 'Tidak Ada Regimen Otomatis yang Aman',
          message:
            'Diagnosis prioritas FKTP tidak menghasilkan regimen farmakoterapi aman dari data saat ini. Output ini harus diperlakukan sebagai kebutuhan re-assessment klinis segera.',
          action:
            'Verifikasi ulang alergi, TTV, dan diagnosis kerja. Lakukan eskalasi rujukan bila ada instabilitas klinis.',
        });
        pipelineDrivers.push(
          'High-priority guardrail aktif: regimen kosong diberi alasan klinis eksplisit.'
        );
      }

      ensureHighPriorityEscalationAlert(responseData, context);

      responseData.clinical_guidelines = Array.from(
        new Set([
          ...(responseData.clinical_guidelines || []),
          'Output farmakoterapi ini adalah dukungan keputusan klinis, bukan diagnosis final.',
        ])
      );

      responseData.pharmacotherapy_explainability = buildPharmacotherapyExplainability(
        context,
        reasonerPlan,
        pathway,
        pipelineDrivers
      );

      if (reasonerWarnings.length > 0) {
        responseData.alerts.push({
          id: `reasoner-warning-${Date.now()}`,
          type: 'validation_warning',
          severity: 'info',
          title: 'Reasoner Warning',
          message: reasonerWarnings.join(' '),
        });
      }

      // Add age-based alerts
      const pediatricAlert = generatePediatricAlert(context.patient_age);
      if (pediatricAlert) responseData.alerts.push(pediatricAlert);

      const geriatricAlert = generateGeriatricAlert(context.patient_age);
      if (geriatricAlert) responseData.alerts.push(geriatricAlert);

      // Check DDI for recommended medications
      if (context.current_medications && context.current_medications.length > 0) {
        const allDrugs = [
          ...context.current_medications,
          ...responseData.medication_recommendations.map((m) => m.nama_obat),
        ];
        const interactions = checkMockDDI(allDrugs);

        if (interactions.length > 0) {
          responseData.drug_interactions = interactions;
          interactions.forEach((i) => {
            if (i.severity === 'contraindicated' || i.severity === 'major') {
              responseData.alerts.push({
                id: `ddi-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                type: 'ddi',
                severity: 'emergency',
                title: 'Interaksi Obat Berbahaya',
                message: `INTERAKSI OBAT: ${i.drug_a} + ${i.drug_b} - ${i.description}`,
                action: 'Ganti salah satu obat atau konsultasi apoteker',
              });
            } else if (i.severity === 'moderate') {
              responseData.alerts.push({
                id: `ddi-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                type: 'ddi',
                severity: 'medium',
                title: 'Interaksi Obat Moderat',
                message: `Interaksi: ${i.drug_a} + ${i.drug_b} - ${i.recommendation}`,
              });
            }
          });
        }
      }

      responseData.alerts = combineAndSortAlerts(responseData.alerts);

      return { success: true, data: responseData };
    }

    // Real API call
    return withRetry(() =>
      fetchWithTimeout<CDSSResponse>('/v1/cdss/prescribe', {
        method: 'POST',
        body: context,
      })
    );
  },

  /**
   * Check drug-drug interactions
   * Uses DDInter 2.0 database (173K+ interactions) for local checking
   */
  async checkDrugInteractions(request: DDICheckRequest): Promise<APIResponse<DrugInteraction[]>> {
    if (!FEATURE_DDI_CHECK) {
      return {
        success: false,
        error: { code: 'FEATURE_DISABLED', message: 'DDI check feature is disabled' },
      };
    }

    log('checkDrugInteractions', request);

    // Always use DDInter database (173K+ interactions) for comprehensive coverage
    // This replaces the old 30-entry mock with clinical-grade data
    try {
      await loadDDIDatabase(); // Ensure database is loaded
      const result = await checkDDInterInteractions(request.drugs);

      log(
        `DDI check: ${result.stats.total} interactions found (${result.stats.major} major, ${result.stats.moderate} moderate)`
      );

      return {
        success: true,
        data: result.interactions,
      };
    } catch (error) {
      log('DDInter check failed, falling back to mock:', error);

      // Fallback to old mock if DDInter fails
      const interactions = checkMockDDI(request.drugs);
      return { success: true, data: interactions };
    }
  },

  /**
   * Check allergy contraindications
   */
  async checkAllergies(request: AllergyCheckRequest): Promise<APIResponse<CDSSAlert[]>> {
    log('checkAllergies', request);

    // Use mock if enabled
    if (USE_MOCK) {
      log('Using mock response for allergy check');
      const alerts = generateAllergyAlerts(
        request.medications.map((m) => ({
          nama_obat: m,
          dosis: '',
          aturan_pakai: 'Sesudah makan' as const,
          rationale: '',
          safety_check: 'safe' as const,
        })),
        request.allergies
      );
      return { success: true, data: alerts };
    }

    // Real API call
    return withRetry(() =>
      fetchWithTimeout<CDSSAlert[]>('/v1/cdss/check-allergy', {
        method: 'POST',
        body: request,
      })
    );
  },

  /**
   * Calculate pediatric dose
   */
  async calculatePediatricDose(request: PediatricDoseRequest): Promise<APIResponse<PediatricDose>> {
    if (!FEATURE_PEDIATRIC_DOSE) {
      return {
        success: false,
        error: { code: 'FEATURE_DISABLED', message: 'Pediatric dose feature is disabled' },
      };
    }

    log('calculatePediatricDose', request);

    // Use mock if enabled
    if (USE_MOCK) {
      log('Using mock response for pediatric dose');

      // Simple Clark's rule calculation
      const adultDose = 500; // Assume 500mg adult dose
      const childDose = (request.patient_weight_kg / 70) * adultDose;

      const mockDose: PediatricDose = {
        drug: request.drug,
        recommended_dose: `${Math.round(childDose)}mg`,
        max_dose: `${Math.round(childDose * 1.5)}mg`,
        formulation: 'Sirup 125mg/5mL',
        method: 'weight_based',
        warnings:
          request.patient_age_months < 24
            ? ['Konsultasikan dengan dokter anak untuk usia < 2 tahun']
            : undefined,
      };

      return { success: true, data: mockDose };
    }

    // Real API call
    return withRetry(() =>
      fetchWithTimeout<PediatricDose>('/v1/cdss/pediatric-dose', {
        method: 'POST',
        body: request,
      })
    );
  },

  /**
   * Health check for API availability
   */
  async healthCheck(): Promise<boolean> {
    if (USE_MOCK) {
      return true;
    }

    try {
      const response = await fetchWithTimeout<{ status: string }>('/health', {
        method: 'GET',
        timeout: 5000,
      });
      return response.success && response.data?.status === 'ok';
    } catch {
      return false;
    }
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Map aturan pakai text to ePuskesmas dropdown value
 */
export function mapAturanPakaiToValue(text: string): string {
  const mapping: Record<string, string> = {
    'Sebelum makan': '1',
    'Sesudah makan': '2',
    'Pemakaian luar': '3',
    'Jika diperlukan': '4',
    'Saat makan': '5',
  };
  return mapping[text] || '2'; // Default: Sesudah makan
}

/**
 * Calculate medication quantity from dosage and duration
 */
export function calculateQuantity(dosis: string, durasi?: string): number {
  // Parse "3x1" = 3 times per day, 1 tablet per dose
  const dosisMatch = dosis.match(/(\d+)\s*x\s*(\d+)/);
  const durasiMatch = durasi?.match(/(\d+)/);

  if (!dosisMatch) return 10; // Default

  const timesPerDay = Number.parseInt(dosisMatch[1], 10);
  const tabletsPerDose = Number.parseInt(dosisMatch[2], 10);
  const days = durasiMatch ? Number.parseInt(durasiMatch[1], 10) : 3;

  return timesPerDay * tabletsPerDose * days;
}

export const __sentraApiInternals = {
  enforceMedicationComposition,
  mergeMedicationRecommendations,
};

// Export types for convenience
export type { CDSSResponse, DiagnosisRequestContext, PrescriptionRequestContext };
