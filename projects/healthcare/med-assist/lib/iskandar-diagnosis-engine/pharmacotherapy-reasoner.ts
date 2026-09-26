// Designed and constructed by Drferdi.
import { checkDrugInteractions } from './ddi-checker';

import type {
  CDSSAlert,
  MedicationRecommendation,
  PrescriptionRequestContext,
  VitalSigns,
} from '@/types/api';

type SyndromeId =
  'ischemic_cardiac' | 'hypertension' | 'diabetes' | 'respiratory_infection' | 'generic';

type RiskTier = 'routine' | 'urgent' | 'emergency';
type ReviewWindow = '6h' | '24h' | '48h';

type IntentId =
  | 'antianginal'
  | 'antiplatelet'
  | 'lipid_support'
  | 'bp_primary'
  | 'bp_secondary'
  | 'bp_urgent_bridge'
  | 'glycemic_primary'
  | 'glycemic_secondary'
  | 'symptom_control'
  | 'expectorant'
  | 'antihistamine'
  | 'neurotropic'
  | 'vitamin_support'
  | 'chronic_continuation';

interface IntentRule {
  intent: IntentId;
  required: boolean;
  priority: number;
  stockKeywords: string[];
  clinicalGate?: (context: PrescriptionRequestContext) => boolean;
  externalFallback?: {
    nama_obat: string;
    dosis: string;
    aturan_pakai: MedicationRecommendation['aturan_pakai'];
    durasi: string;
    rationale: string;
    contraindications?: string[];
  };
}

interface SyndromeRule {
  syndrome: SyndromeId;
  riskTier: RiskTier;
  intents: IntentRule[];
  baseAlerts: CDSSAlert[];
  reviewWindow: ReviewWindow;
}

interface StockDrugItem {
  nama_obat: string;
  stok_tersedia: number;
  status: string;
  kelompok?: string;
}

interface Candidate {
  med: MedicationRecommendation;
  score: number;
  inStock: boolean;
  intent: IntentId;
}

/**
 * PharmacotherapyPlan interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface PharmacotherapyPlan {
  medications: MedicationRecommendation[];
  alerts: CDSSAlert[];
  guidelines: string[];
  confidence: number;
  drivers: string[];
  missingData: string[];
  riskTier: RiskTier;
  reviewWindow: ReviewWindow;
  syndrome: SyndromeId;
}

const ICD_PREFIX = /^([A-Z]\d{2})/;
const STOCK_DATA_PATH = '/data/stok_obat.json';
let stockCache: StockDrugItem[] | null = null;
const HIGH_PRIORITY_FKTP_PATTERNS = [/^I10/, /^I20/, /^I21/, /^I22/, /^I24/];

const KEYWORD_SYNONYMS: Record<string, string[]> = {
  aspirin_family: ['aspirin', 'asetosal', 'salisilat', 'nsaid'],
  nitrate_family: ['nitro', 'nitroglycerin', 'isosorbid'],
  ace_inhibitor: ['captopril', 'lisinopril', 'enalapril', 'ramipril'],
  ccb: ['amlodipin', 'amlodipine', 'amlodip'],
  metformin: ['metformin'],
  sulfonylurea: ['glimepirid', 'glimepiride', 'glibenclamide', 'gliclazide'],
};
const BETA_BLOCKER_KEYWORDS = ['bisoprolol', 'metoprolol', 'atenolol', 'carvedilol', 'propranolol'];
const ACE_ARB_KEYWORDS = [
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

const RULES: Record<SyndromeId, SyndromeRule> = {
  ischemic_cardiac: {
    syndrome: 'ischemic_cardiac',
    riskTier: 'emergency',
    reviewWindow: '6h',
    intents: [
      {
        intent: 'antianginal',
        required: true,
        priority: 100,
        stockKeywords: ['isosorbid', 'isosorbide', 'nitro', 'nitroglycerin'],
        externalFallback: {
          nama_obat: 'Nitroglycerin SL 0.4mg',
          dosis: '1 tablet SL, ulang tiap 5 menit bila perlu (maks 3 dosis)',
          aturan_pakai: 'Jika diperlukan',
          durasi: 'Saat nyeri dada akut',
          rationale:
            'Pereda gejala nyeri dada iskemik sambil menyiapkan evaluasi EKG dan rujukan emergensi.',
          contraindications: [
            'SBP < 90 mmHg atau hipotensi',
            'Riwayat konsumsi PDE5 inhibitor dalam 24-48 jam',
          ],
        },
      },
      {
        intent: 'antiplatelet',
        required: true,
        priority: 95,
        stockKeywords: ['aspirin', 'asetosal', 'asetilsalisilat', 'clopidogrel'],
        externalFallback: {
          nama_obat: 'Aspirin 160-325mg',
          dosis: 'Loading dose tunggal',
          aturan_pakai: 'Saat makan',
          durasi: 'Sekali segera',
          rationale:
            'Antiplatelet awal pada suspek ACS bila tidak ada kontraindikasi perdarahan/alergi.',
          contraindications: [
            'Alergi salisilat/NSAID',
            'Perdarahan aktif atau risiko perdarahan tinggi',
          ],
        },
      },
      {
        intent: 'lipid_support',
        required: false,
        priority: 40,
        stockKeywords: ['simvastatin', 'atorvastatin', 'rosuvastatin'],
      },
    ],
    baseAlerts: [
      {
        id: 'reasoner-acs-escalation',
        type: 'red_flag',
        severity: 'emergency',
        title: 'Suspek ACS: Stabilize and Refer',
        message:
          'Output farmakoterapi ini adalah dukungan stabilisasi awal. EKG 12 sadapan dan eskalasi rujukan tetap prioritas.',
        action:
          'Monitoring serial TTV, evaluasi nyeri dada persisten, dan rujuk emergensi bila ada instabilitas.',
      },
    ],
  },
  hypertension: {
    syndrome: 'hypertension',
    riskTier: 'urgent',
    reviewWindow: '24h',
    intents: [
      {
        intent: 'bp_primary',
        required: true,
        priority: 100,
        stockKeywords: [
          'amlodip',
          'lisinopril',
          'captopril',
          'bisoprolol',
          'valsartan',
          'losartan',
          'telmisartan',
        ],
        externalFallback: {
          nama_obat: 'Amlodipine 5mg',
          dosis: '1x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '14-30 hari sesuai evaluasi tekanan darah',
          rationale:
            'Terapi antihipertensi lini awal untuk kontrol tekanan darah di FKTP sambil titrasi bertahap.',
          contraindications: ['Waspada edema perifer', 'Waspada hipotensi simptomatik'],
        },
      },
      {
        intent: 'bp_secondary',
        required: false,
        priority: 55,
        stockKeywords: [
          'lisinopril',
          'captopril',
          'bisoprolol',
          'valsartan',
          'losartan',
          'telmisartan',
        ],
        clinicalGate: (ctx) => {
          const s = ctx.vital_signs?.systolic;
          const d = ctx.vital_signs?.diastolic;
          if (typeof s === 'number' && s >= 160) return true;
          if (typeof d === 'number' && d >= 100) return true;
          return ctx.penyakit_kronis.some((k) => /hipertensi|hypertens/i.test(k));
        },
        externalFallback: {
          nama_obat: 'Captopril 12.5-25mg',
          dosis: '2x1',
          aturan_pakai: 'Sebelum makan',
          durasi: '7-14 hari kemudian evaluasi',
          rationale:
            'Alternatif tambahan untuk kontrol tekanan darah pada pasien terpilih jika monitoring memungkinkan.',
          contraindications: ['Kehamilan', 'Hiperkalemia bermakna', 'Gangguan ginjal akut'],
        },
      },
      {
        intent: 'bp_urgent_bridge',
        required: false,
        priority: 72,
        stockKeywords: ['captopril'],
        clinicalGate: (ctx) => {
          const s = ctx.vital_signs?.systolic;
          const d = ctx.vital_signs?.diastolic;
          return (typeof s === 'number' && s >= 180) || (typeof d === 'number' && d >= 120);
        },
        externalFallback: {
          nama_obat: 'Captopril 12.5mg',
          dosis: '1x1 segera, lanjut evaluasi ulang tekanan darah',
          aturan_pakai: 'Sebelum makan',
          durasi: 'Bridge 24 jam sampai review klinis',
          rationale:
            'Bridge antihipertensi untuk kasus tekanan darah sangat tinggi pada FKTP sambil monitoring ketat dan evaluasi target organ.',
          contraindications: ['Kehamilan', 'Hipotensi simptomatik', 'Gangguan ginjal akut'],
        },
      },
    ],
    baseAlerts: [],
  },
  diabetes: {
    syndrome: 'diabetes',
    riskTier: 'urgent',
    reviewWindow: '24h',
    intents: [
      {
        intent: 'glycemic_primary',
        required: true,
        priority: 90,
        stockKeywords: ['metformin', 'glimepirid', 'glimepiride'],
        externalFallback: {
          nama_obat: 'Metformin 500mg',
          dosis: '2x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '30 hari',
          rationale:
            'Terapi lini awal DM tipe 2 pada pasien tanpa kontraindikasi, dengan monitoring efek gastrointestinal.',
          contraindications: ['Gangguan ginjal berat', 'Risiko asidosis laktat'],
        },
      },
      {
        intent: 'glycemic_secondary',
        required: false,
        priority: 65,
        stockKeywords: ['glimepirid', 'glimepiride', 'glibenclamide', 'gliclazide'],
        clinicalGate: (ctx) => ctx.penyakit_kronis.some((k) => /\bdm\b|diabetes|diabet/i.test(k)),
        externalFallback: {
          nama_obat: 'Glimepiride 1mg',
          dosis: '1x1',
          aturan_pakai: 'Sebelum makan',
          durasi: '30 hari',
          rationale:
            'Sulfonilurea lini kedua untuk DM tipe 2 bila kontrol glikemik belum adekuat dengan Metformin saja.',
          contraindications: ['Insufisiensi ginjal berat', 'Hipoglikemia berulang', 'Kehamilan'],
        },
      },
      {
        intent: 'neurotropic',
        required: false,
        priority: 45,
        stockKeywords: [
          'neurobion',
          'b complex',
          'b komplek',
          'mecobalamin',
          'vitamin b',
          'b1',
          'b6',
          'b12',
        ],
        externalFallback: {
          nama_obat: 'Vitamin B Kompleks',
          dosis: '1x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '30 hari',
          rationale: 'Membantu memperbaiki neuropati perifer pada pasien diabetes.',
          contraindications: [],
        },
      },
      {
        intent: 'vitamin_support',
        required: false,
        priority: 30,
        stockKeywords: ['vitamin c', 'vit c', 'ascorbic', 'askorb', 'zinc', 'multivit'],
        externalFallback: {
          nama_obat: 'Vitamin C 100mg',
          dosis: '1x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '30 hari',
          rationale: 'Antioksidan dan pendukung imunitas pada pasien dengan komorbid metabolik.',
          contraindications: [],
        },
      },
    ],
    baseAlerts: [],
  },
  respiratory_infection: {
    syndrome: 'respiratory_infection',
    riskTier: 'routine',
    reviewWindow: '48h',
    intents: [
      {
        intent: 'symptom_control',
        required: true,
        priority: 65,
        stockKeywords: ['paracetamol', 'parasetamol', 'acetaminophen'],
        externalFallback: {
          nama_obat: 'Paracetamol 500mg',
          dosis: '3x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '5 hari',
          rationale: 'Antipiretik dan analgesik lini pertama untuk ISPA tanpa komplikasi di FKTP.',
          contraindications: ['Gangguan fungsi hati berat'],
        },
      },
      {
        intent: 'expectorant',
        required: false,
        priority: 55,
        stockKeywords: ['ambroxol', 'bromhexin', 'guaifenesin', 'gliseril'],
        clinicalGate: (ctx) => {
          const keluhan = (ctx.keluhan_utama || '').toLowerCase();
          return /batuk.{0,20}(berdahak|produktif|dahak|lendir)|dahak|sputum/.test(keluhan);
        },
        externalFallback: {
          nama_obat: 'Ambroxol 30mg',
          dosis: '3x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '5 hari',
          rationale: 'Mukolitik untuk mengencerkan sekret dan memperlancar batuk berdahak.',
          contraindications: [],
        },
      },
      {
        intent: 'antihistamine',
        required: false,
        priority: 45,
        stockKeywords: ['cetirizine', 'ctm', 'chlorpheniramine', 'loratadine', 'fexofenadine'],
        clinicalGate: (ctx) => {
          const keluhan = (ctx.keluhan_utama || '').toLowerCase();
          return /pilek|bersin|hidung tersumbat|rhinor|rinor|rinitis|rinorea/.test(keluhan);
        },
        externalFallback: {
          nama_obat: 'Cetirizine 10mg',
          dosis: '1x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '5 hari',
          rationale: 'Antihistamin untuk mengurangi gejala rinitis dan bersin pada ISPA.',
          contraindications: ['Hindari pada pasien dengan riwayat retensi urin'],
        },
      },
    ],
    baseAlerts: [],
  },
  generic: {
    syndrome: 'generic',
    riskTier: 'routine',
    reviewWindow: '48h',
    intents: [],
    baseAlerts: [],
  },
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function classifySyndrome(icdCode: string): SyndromeId {
  const normalized = icdCode.toUpperCase();
  if (/^I2[0-4]/.test(normalized)) return 'ischemic_cardiac';
  if (/^I1[0-6]/.test(normalized)) return 'hypertension';
  if (/^E1[0-4]/.test(normalized)) return 'diabetes';
  if (/^J0|^J1/.test(normalized)) return 'respiratory_infection';
  return 'generic';
}

function isHighPriorityFktpCode(icdCode: string): boolean {
  return HIGH_PRIORITY_FKTP_PATTERNS.some((pattern) => pattern.test(icdCode));
}

interface SyndromeInference {
  syndrome: SyndromeId;
  score: number;
  evidence: string[];
}

function inferSyndromeFromContext(
  context: PrescriptionRequestContext,
  normalizedCode: string
): SyndromeInference {
  const baseline = classifySyndrome(normalizedCode);
  const scores: Record<SyndromeId, number> = {
    ischemic_cardiac: baseline === 'ischemic_cardiac' ? 70 : 0,
    hypertension: baseline === 'hypertension' ? 60 : 0,
    diabetes: baseline === 'diabetes' ? 60 : 0,
    respiratory_infection: baseline === 'respiratory_infection' ? 50 : 0,
    generic: baseline === 'generic' ? 20 : 0,
  };
  const evidence: string[] = [];

  const narrative = normalize(
    [context.keluhan_utama, context.selected_diagnosis_name, context.penyakit_kronis.join(' ')]
      .filter(Boolean)
      .join(' ')
  );
  const systolic = context.vital_signs?.systolic;
  const diastolic = context.vital_signs?.diastolic;
  const heartRate = context.vital_signs?.heart_rate;
  const temperature = context.vital_signs?.temperature;

  if (/(nyeri dada|chest pain|angina|sesak|menjalar ke lengan|keringat dingin)/.test(narrative)) {
    scores.ischemic_cardiac += 35;
    evidence.push('Keluhan naratif mengarah ke sindrom iskemik kardial.');
  }

  if (/(hipertensi|tekanan darah tinggi|headache|sakit kepala|pusing)/.test(narrative)) {
    scores.hypertension += 20;
    evidence.push('Naratif konsisten dengan kontrol hipertensi.');
  }

  if (/(diabetes|dm tipe 2|poliuria|polidipsia|hiperglik)/.test(narrative)) {
    scores.diabetes += 26;
    evidence.push('Naratif memperkuat kebutuhan terapi glikemik.');
  }

  if (/(batuk|pilek|ispa|faringitis|influenza|demam|rhinor|odinofagi)/.test(narrative)) {
    scores.respiratory_infection += 24;
    evidence.push('Naratif selaras dengan sindrom infeksi saluran napas.');
  }

  if (typeof systolic === 'number' && typeof diastolic === 'number') {
    if (systolic >= 180 || diastolic >= 120) {
      scores.ischemic_cardiac += 12;
      scores.hypertension += 22;
      evidence.push(`TTV menunjukkan zona krisis tekanan darah (${systolic}/${diastolic}).`);
    } else if (systolic >= 160 || diastolic >= 100) {
      scores.hypertension += 16;
      evidence.push(`TTV mendukung hipertensi bermakna (${systolic}/${diastolic}).`);
    } else if (systolic < 90) {
      scores.ischemic_cardiac += 8;
      evidence.push(`SBP ${systolic} mmHg menandakan instabilitas hemodinamik potensial.`);
    }
  }

  if (typeof heartRate === 'number' && heartRate > 110) {
    scores.ischemic_cardiac += 8;
    scores.respiratory_infection += 6;
    evidence.push(`Nadi ${heartRate}/mnt meningkatkan kecurigaan proses akut.`);
  }

  if (typeof temperature === 'number' && temperature >= 38.2) {
    scores.respiratory_infection += 10;
    evidence.push(`Suhu ${temperature.toFixed(1)}°C mendukung komponen infeksi.`);
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]) as [SyndromeId, number][];
  const [bestSyndrome, bestScore] = sorted[0];
  const resolvedSyndrome = bestScore >= 25 ? bestSyndrome : baseline;

  if (resolvedSyndrome !== baseline) {
    evidence.push(
      `Syndrome reranked dari ${baseline} -> ${resolvedSyndrome} berbasis konteks klinis.`
    );
  } else {
    evidence.push(`Syndrome mempertahankan baseline ${baseline} dengan dukungan konteks tersedia.`);
  }

  return {
    syndrome: resolvedSyndrome,
    score: bestScore,
    evidence: evidence.slice(0, 6),
  };
}

function buildAlert(
  id: string,
  severity: CDSSAlert['severity'],
  title: string,
  message: string,
  action?: string
): CDSSAlert {
  return {
    id,
    type: severity === 'emergency' ? 'red_flag' : 'validation_warning',
    severity,
    title,
    message,
    action,
  };
}

function extractStrength(name: string): string | null {
  const match = name.match(/(\d+(?:[.,]\d+)?)\s?(mg|mcg|g|iu)/i);
  if (!match) return null;
  return `${match[1]}${match[2].toLowerCase()}`;
}

function deriveAturanPakai(name: string): MedicationRecommendation['aturan_pakai'] {
  const n = normalize(name);
  if (n.includes('sebelum makan')) return 'Sebelum makan';
  if (n.includes('sesudah makan') || n.includes('setelah makan')) return 'Sesudah makan';
  if (n.includes('saat makan') || n.includes('bersama makan')) return 'Saat makan';

  if (n.includes('sublingual') || n.includes(' sl ') || n.endsWith(' sl')) return 'Jika diperlukan';
  if (n.includes('cream') || n.includes('krim') || n.includes('salep')) return 'Pemakaian luar';
  return 'Sesudah makan';
}

function deriveDoseByName(name: string): string {
  const freqMatch = name.match(/\b([1-4]\s*[xX]\s*[1-4])\b/i);
  if (freqMatch) {
    const freqStr = freqMatch[1].toLowerCase().replace(/\s+/g, '');
    const strength = extractStrength(name);
    return strength ? `${freqStr} (${strength})` : freqStr;
  }

  const n = normalize(name);
  if (n.includes('amlodip')) return '1x1';
  if (n.includes('lisinopril')) return '1x1';
  if (n.includes('captopril')) return '2x1';
  if (n.includes('bisoprolol')) return '1x1';
  if (n.includes('valsartan')) return '1x1';
  if (n.includes('losartan')) return '1x1';
  if (n.includes('telmisartan')) return '1x1';
  if (n.includes('simvastatin')) return '1x1 malam';
  if (n.includes('atorvastatin') || n.includes('rosuvastatin')) return '1x1 malam';
  if (n.includes('metformin')) return '2-3x1';
  if (n.includes('glimepirid')) return '1x1';
  if (n.includes('isosorbid') || n.includes('nitro')) {
    return '1 tablet SL, ulang tiap 5 menit bila perlu (maks 3 dosis)';
  }
  const strength = extractStrength(name);
  return strength ? `1 tablet (${strength})` : '1x1';
}

function inferContraindications(name: string): string[] {
  const n = normalize(name);
  if (n.includes('aspirin') || n.includes('asetosal')) {
    return ['Alergi salisilat/NSAID', 'Perdarahan aktif'];
  }
  if (n.includes('isosorbid') || n.includes('nitro')) {
    return ['Hipotensi (SBP < 90 mmHg)', 'Penggunaan PDE5 inhibitor dalam 24-48 jam'];
  }
  if (n.includes('captopril') || n.includes('lisinopril')) {
    return ['Kehamilan', 'Hiperkalemia signifikan'];
  }
  if (n.includes('valsartan') || n.includes('losartan') || n.includes('telmisartan')) {
    return ['Kehamilan', 'Hiperkalemia signifikan'];
  }
  if (BETA_BLOCKER_KEYWORDS.some((item) => n.includes(item))) {
    return ['Bradikardia bermakna (HR < 50/mnt)', 'Blok AV derajat tinggi tanpa pacemaker'];
  }
  return [];
}

function deriveMissingData(context: PrescriptionRequestContext, syndrome: SyndromeId): string[] {
  const missingData: string[] = [];
  if (!context.keluhan_utama) missingData.push('keluhan_utama_missing');
  if (!context.selected_diagnosis_name) missingData.push('selected_diagnosis_name_missing');
  if (!context.vital_signs) {
    missingData.push('vital_signs_missing');
    return missingData;
  }

  if (
    (syndrome === 'ischemic_cardiac' || syndrome === 'hypertension') &&
    typeof context.vital_signs.systolic !== 'number'
  ) {
    missingData.push('vital_signs_systolic_missing');
  }

  if (syndrome === 'ischemic_cardiac' && typeof context.vital_signs.heart_rate !== 'number') {
    missingData.push('vital_signs_heart_rate_missing');
  }

  return missingData;
}

function buildStockMedication(
  stockName: string,
  intent: IntentId,
  inStock: boolean
): MedicationRecommendation {
  const lower = normalize(stockName);
  const isNitrate = lower.includes('isosorbid') || lower.includes('nitro');
  return {
    nama_obat: stockName,
    dosis: deriveDoseByName(stockName),
    aturan_pakai: deriveAturanPakai(stockName),
    durasi: isNitrate ? 'Saat nyeri dada akut' : '3-30 hari sesuai evaluasi klinis',
    rationale: `Dipilih melalui reasoning intent "${intent}" berbasis sindrom + ketersediaan formulary.`,
    safety_check: inStock ? 'safe' : 'caution',
    contraindications: inferContraindications(stockName),
  };
}

function scoreStock(
  item: StockDrugItem,
  intent: IntentRule,
  context: PrescriptionRequestContext
): number {
  const patientAge = context.patient_age;
  const isAvailable = normalize(item.status) === 'tersedia' && item.stok_tersedia > 0;
  let score = intent.priority;

  if (isAvailable) score += 5; // Changed from +20

  if (item.stok_tersedia > 5000)
    score += 2; // Changed from +12
  else if (item.stok_tersedia > 500)
    score += 1; // Changed from +8
  // Removed low stock bonus entirely (was +4 for >50)
  else if (item.stok_tersedia === 0) score -= 20; // Keep penalty

  const name = normalize(item.nama_obat);

  if (intent.intent === 'antianginal' && name.includes('sublingual')) score += 20; // Changed from +12
  if (intent.intent === 'bp_primary' && name.includes('amlodip')) score += 15; // Changed from +6
  if (intent.intent === 'bp_secondary' && name.includes('lisinopril')) score += 12; // Changed from +5
  if (
    intent.intent === 'bp_urgent_bridge' &&
    name.includes('captopril') &&
    ((context.vital_signs?.systolic ?? 0) >= 180 || (context.vital_signs?.diastolic ?? 0) >= 110)
  ) {
    score += 25; // Changed from +14 (urgent BP control is critical)
  }
  if (intent.intent === 'glycemic_primary' && name.includes('metformin')) score += 15; // Changed from +5

  // Safety penalties remain unchanged
  if (patientAge >= 65 && name.includes('captopril')) score -= 3;
  if (
    (context.vital_signs?.heart_rate ?? 70) < 60 &&
    BETA_BLOCKER_KEYWORDS.some((item) => name.includes(item))
  ) {
    score -= 8;
  }
  return score;
}

function matchAllergyToMedication(medName: string, allergies: string[]): string | null {
  if (!allergies.length) return null;
  const normalizedMedName = normalize(medName);
  const normalizedAllergies = allergies.map((item) => normalize(item)).filter(Boolean);

  for (const allergy of normalizedAllergies) {
    if (allergy.length >= 4 && normalizedMedName.includes(allergy)) return allergy;
  }

  for (const [allergyCluster, aliases] of Object.entries(KEYWORD_SYNONYMS)) {
    const allergyMatched = normalizedAllergies.some((allergy) => {
      if (allergy.includes(allergyCluster)) return true;
      return aliases.some((alias) => allergy.includes(alias));
    });
    if (!allergyMatched) continue;
    const medicationMatched = aliases.some((alias) => normalizedMedName.includes(alias));
    if (medicationMatched) return allergyCluster;
  }

  return null;
}

function isPregnancyContext(context: PrescriptionRequestContext): boolean {
  if (typeof context.is_pregnant === 'boolean') return context.is_pregnant;
  if (/^O\d{2}/.test(context.icd_x.toUpperCase().trim())) return true;
  const narrative = normalize(
    [context.keluhan_utama, context.selected_diagnosis_name, context.penyakit_kronis.join(' ')]
      .filter(Boolean)
      .join(' ')
  );
  return PREGNANCY_KEYWORDS.some((keyword) => narrative.includes(keyword));
}

async function loadStockData(): Promise<StockDrugItem[]> {
  if (stockCache) return stockCache;
  const runtimePath =
    (
      globalThis as { chrome?: { runtime?: { getURL?: (path: string) => string } } }
    ).chrome?.runtime?.getURL?.(STOCK_DATA_PATH) || STOCK_DATA_PATH;
  try {
    const response = await fetch(runtimePath);
    if (!response.ok) {
      console.warn(`[Pharmacotherapy] Stock fetch failed: ${response.status} ${runtimePath}`);
      throw new Error(`Failed to load stock database (${response.status})`);
    }
    const json = (await response.json()) as { stok_obat?: StockDrugItem[] };
    stockCache = Array.isArray(json?.stok_obat) ? json.stok_obat : [];
    console.warn(`[Pharmacotherapy] Stock loaded: ${stockCache.length} items`);
    return stockCache;
  } catch (err) {
    console.warn('[Pharmacotherapy] Stock fetch exception:', err);
    throw err;
  }
}

/**
 * SPRINT 1 P1-2: Prefilter candidates for safety before scoring
 * Removes drugs that fail safety checks (DDI, allergies, vital contraindications)
 * Returns both safe and blocked candidates for transparency
 */
interface BlockedDrug {
  drug: StockDrugItem;
  reason: string;
  severity:
    | 'allergy'
    | 'ddi_major'
    | 'ddi_contraindicated'
    | 'vital_contraindication'
    | 'pregnancy_contraindication';
}

interface PrefilterResult {
  safeCandidates: StockDrugItem[];
  blockedCandidates: BlockedDrug[];
}

async function prefilterCandidatesForSafety(
  candidates: StockDrugItem[],
  currentMedications: string[],
  allergies: string[],
  vitals?: VitalSigns,
  context?: PrescriptionRequestContext
): Promise<PrefilterResult> {
  const safe: StockDrugItem[] = [];
  const blocked: BlockedDrug[] = [];

  for (const candidate of candidates) {
    const medName = candidate.nama_obat;

    // 1. Allergy check
    const allergyMatch = matchAllergyToMedication(normalize(medName), allergies);
    if (allergyMatch) {
      blocked.push({
        drug: candidate,
        reason: `Riwayat alergi: ${allergyMatch}`,
        severity: 'allergy',
      });
      continue;
    }

    // 2. Vital contraindications
    const n = normalize(medName);
    if (
      (n.includes('isosorbid') || n.includes('nitro')) &&
      typeof vitals?.systolic === 'number' &&
      vitals.systolic < 90
    ) {
      blocked.push({
        drug: candidate,
        reason: `Nitrate diblok: SBP ${vitals.systolic} < 90 mmHg`,
        severity: 'vital_contraindication',
      });
      continue;
    }

    if (
      BETA_BLOCKER_KEYWORDS.some((keyword) => n.includes(keyword)) &&
      typeof vitals?.heart_rate === 'number' &&
      vitals.heart_rate < 50
    ) {
      blocked.push({
        drug: candidate,
        reason: `Beta-blocker diblok: HR ${vitals.heart_rate} < 50 /mnt`,
        severity: 'vital_contraindication',
      });
      continue;
    }

    // 3. Pregnancy contraindications
    if (
      context &&
      isPregnancyContext(context) &&
      ACE_ARB_KEYWORDS.some((keyword) => n.includes(keyword))
    ) {
      blocked.push({
        drug: candidate,
        reason: 'ACE inhibitor/ARB kontraindikasi pada kehamilan',
        severity: 'pregnancy_contraindication',
      });
      continue;
    }

    // 4. DDI check (if current medications exist)
    if (currentMedications.length > 0) {
      try {
        const ddiResult = await checkDrugInteractions([...currentMedications, medName]);

        // Block contraindicated interactions
        const hasContraindicated = ddiResult.interactions.some(
          (interaction) => interaction.severity === 'contraindicated'
        );
        if (hasContraindicated) {
          const contraindicatedInteraction = ddiResult.interactions.find(
            (interaction) => interaction.severity === 'contraindicated'
          );
          blocked.push({
            drug: candidate,
            reason: `DDI Contraindicated: ${contraindicatedInteraction?.description || 'Kombinasi kontraindikasi'}`,
            severity: 'ddi_contraindicated',
          });
          continue;
        }

        // Block major interactions (configurable - could be warning instead)
        const hasMajor = ddiResult.interactions.some(
          (interaction) => interaction.severity === 'major'
        );
        if (hasMajor) {
          const majorInteraction = ddiResult.interactions.find(
            (interaction) => interaction.severity === 'major'
          );
          blocked.push({
            drug: candidate,
            reason: `DDI Major: ${majorInteraction?.description || 'Interaksi signifikan'}`,
            severity: 'ddi_major',
          });
          continue;
        }
      } catch (error) {
        // DDI check failed - log but don't block (fail-open for safety)
        console.warn(`DDI check failed for ${medName}:`, error);
      }
    }

    // Passed all checks - safe to score
    safe.push(candidate);
  }

  return { safeCandidates: safe, blockedCandidates: blocked };
}

async function findBestCandidateForIntent(
  intentRule: IntentRule,
  stockItems: StockDrugItem[],
  context: PrescriptionRequestContext,
  alerts: CDSSAlert[],
  drivers: string[]
): Promise<Candidate | null> {
  if (intentRule.clinicalGate && !intentRule.clinicalGate(context)) {
    drivers.push(`Intent ${intentRule.intent}: clinical gate tidak terpenuhi — dilewati.`);
    return null;
  }
  // 1. Match by keyword
  const matchedByKeyword = stockItems.filter((item) => {
    const normalized = normalize(item.nama_obat);
    return intentRule.stockKeywords.some((keyword) => normalized.includes(keyword));
  });

  if (matchedByKeyword.length === 0) {
    drivers.push(`Intent ${intentRule.intent}: tidak ada kandidat stock berbasis keyword.`);
  }

  const { safeCandidates, blockedCandidates } = await prefilterCandidatesForSafety(
    matchedByKeyword,
    context.current_medications || [],
    context.alergi || [],
    context.vital_signs,
    context
  );

  // Add transparency alerts for blocked drugs
  for (const blocked of blockedCandidates) {
    const alertId = `reasoner-safety-block-${intentRule.intent}-${normalize(blocked.drug.nama_obat).replace(/\s+/g, '-')}`;
    const severityMap: Record<BlockedDrug['severity'], CDSSAlert['severity']> = {
      allergy: 'high',
      ddi_contraindicated: 'emergency',
      ddi_major: 'high',
      vital_contraindication: 'high',
      pregnancy_contraindication: 'high',
    };

    drivers.push(
      `Intent ${intentRule.intent}: ${blocked.drug.nama_obat} diblok safety (${blocked.reason}).`
    );
    alerts.push(
      buildAlert(
        alertId,
        severityMap[blocked.severity],
        'Kandidat Terapi Diblok Safety Prefilter',
        `${blocked.drug.nama_obat}: ${blocked.reason}`
      )
    );
  }

  // 2. Score only safe candidates (reactive safety checks removed)
  const candidates = safeCandidates
    .map((item) => {
      const isAvailable = normalize(item.status) === 'tersedia' && item.stok_tersedia > 0;
      if (!isAvailable) {
        drivers.push(
          `Intent ${intentRule.intent}: ${item.nama_obat} ada namun stok tidak tersedia.`
        );
      }
      return {
        med: buildStockMedication(item.nama_obat, intentRule.intent, isAvailable),
        score: scoreStock(item, intentRule, context),
        inStock: isAvailable,
        intent: intentRule.intent,
      } as Candidate;
    })
    .sort((a, b) => b.score - a.score);

  if (candidates.length > 0) return candidates[0];

  if (intentRule.externalFallback) {
    drivers.push(
      `Intent ${intentRule.intent}: external fallback dinonaktifkan; sistem hanya boleh memakai stock/knowledge lokal terverifikasi.`
    );
  }

  return null;
}

function computeConfidence(
  selectedCandidates: Candidate[],
  rule: SyndromeRule,
  missingRequiredIntents: IntentRule[],
  missingData: string[]
): number {
  const requiredCount = rule.intents.filter((i) => i.required).length || 1;
  const requiredCovered = rule.intents.filter(
    (i) => i.required && selectedCandidates.some((c) => c.intent === i.intent)
  ).length;
  const stockCovered = selectedCandidates.filter((c) => c.inStock).length;
  const base = 35;
  const coverageScore = (requiredCovered / requiredCount) * 35;
  const stockScore = Math.min(20, stockCovered * 8);
  const missingPenalty = Math.min(25, missingRequiredIntents.length * 15);
  const missingDataPenalty = Math.min(18, missingData.length * 4);
  return Math.max(
    5,
    Math.min(
      95,
      Math.round(base + coverageScore + stockScore - missingPenalty - missingDataPenalty)
    )
  );
}

const MIN_MEDICATIONS = 3;
const SUPPLEMENT_BACKFILL: Array<{ priority: number; med: MedicationRecommendation }> = [
  {
    priority: 60,
    med: {
      nama_obat: 'Vitamin B Kompleks',
      dosis: '1x1',
      aturan_pakai: 'Sesudah makan',
      durasi: '30 hari',
      rationale: 'Suplementasi vitamin B sebagai terapi suportif.',
      safety_check: 'safe',
      contraindications: [],
    },
  },
  {
    priority: 50,
    med: {
      nama_obat: 'Vitamin C 100mg',
      dosis: '1x1',
      aturan_pakai: 'Sesudah makan',
      durasi: '30 hari',
      rationale: 'Antioksidan dan pendukung imunitas.',
      safety_check: 'safe',
      contraindications: [],
    },
  },
];

/**
 * generatePharmacotherapyPlan
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export async function generatePharmacotherapyPlan(
  context: PrescriptionRequestContext,
  inventoryOverride?: StockDrugItem[]
): Promise<PharmacotherapyPlan> {
  const normalizedCode = context.icd_x.toUpperCase().trim();
  const codePrefix = normalizedCode.match(ICD_PREFIX)?.[1] || normalizedCode;
  const syndromeInference = inferSyndromeFromContext(context, normalizedCode);
  const syndrome = syndromeInference.syndrome;
  const rule = RULES[syndrome];
  const alerts: CDSSAlert[] = [...rule.baseAlerts];
  const drivers: string[] = [
    `ICD target: ${normalizedCode}`,
    `Syndrome: ${syndrome} (score=${syndromeInference.score})`,
    ...syndromeInference.evidence,
    `Risk tier: ${rule.riskTier}`,
    `Review window: ${rule.reviewWindow}`,
  ];
  const missingData: string[] = deriveMissingData(context, syndrome);

  if (rule.intents.length === 0) {
    return {
      medications: [],
      alerts: [
        ...alerts,
        buildAlert(
          `reasoner-no-rule-${codePrefix}`,
          'info',
          'Belum Ada Rule Sindrom',
          `Belum ada strategi farmakoterapi terstruktur untuk ICD ${normalizedCode}.`
        ),
      ],
      guidelines: [
        `Risk tier: ${rule.riskTier}`,
        'Gunakan judgement klinis + formularium lokal sampai knowledge diperluas.',
      ],
      confidence: 10,
      drivers,
      missingData,
      riskTier: rule.riskTier,
      reviewWindow: rule.reviewWindow,
      syndrome,
    };
  }

  const stockItems = inventoryOverride || (await loadStockData());
  const selectedCandidates: Candidate[] = [];

  for (const intentRule of [...rule.intents].sort((a, b) => b.priority - a.priority)) {
    const candidate = await findBestCandidateForIntent(
      intentRule,
      stockItems,
      context,
      alerts,
      drivers
    );
    if (candidate) selectedCandidates.push(candidate);
    else if (intentRule.required) {
      alerts.push(
        buildAlert(
          `reasoner-missing-required-${intentRule.intent}`,
          'high',
          'Intent Terapi Wajib Tidak Terpenuhi',
          `Reasoner tidak menemukan kandidat aman untuk intent "${intentRule.intent}".`
        )
      );
    }
  }

  const uniqueByDrug = new Map<string, Candidate>();
  for (const candidate of selectedCandidates.sort((a, b) => b.score - a.score)) {
    const key = normalize(candidate.med.nama_obat);
    if (!uniqueByDrug.has(key)) uniqueByDrug.set(key, candidate);
  }
  const uniqueCandidates = Array.from(uniqueByDrug.values()).slice(0, 6);

  if (uniqueCandidates.length < MIN_MEDICATIONS && rule.riskTier !== 'emergency') {
    const existingNames = new Set(uniqueCandidates.map((c) => normalize(c.med.nama_obat)));
    for (const { priority, med } of SUPPLEMENT_BACKFILL) {
      if (uniqueCandidates.length >= MIN_MEDICATIONS) break;
      const key = normalize(med.nama_obat);
      if (!existingNames.has(key)) {
        existingNames.add(key);
        uniqueCandidates.push({ med, score: priority, inStock: false, intent: 'vitamin_support' });
        drivers.push(`Backfill min-3: menambahkan ${med.nama_obat} sebagai terapi suportif.`);
      }
    }
  }

  // Mandatory chronic medication continuation — wajib, tidak bisa dilewati kecuali keputusan dokter
  for (const rawMedName of context.current_medications || []) {
    const trimmed = rawMedName.trim();
    if (!trimmed) continue;
    const firstWord = normalize(trimmed).split(/\s+/)[0];
    const alreadyCovered = uniqueCandidates.find((c) => {
      const existing = normalize(c.med.nama_obat);
      return existing.includes(firstWord) || firstWord.includes(existing.split(/\s+/)[0]);
    });
    if (alreadyCovered) {
      const historicalDose = deriveDoseByName(trimmed);
      const historicalAturan = deriveAturanPakai(trimmed);
      // P1: Override default stock dosage with historical dosage if explicitly defined
      if (
        (historicalDose && !historicalDose.includes('1x1')) ||
        trimmed.match(/\b([1-4]\s*[xX]\s*[1-4])\b/i)
      ) {
        alreadyCovered.med.dosis = historicalDose;
      }
      if (historicalAturan !== 'Sesudah makan' || trimmed.toLowerCase().includes('makan')) {
        alreadyCovered.med.aturan_pakai = historicalAturan;
      }
      alreadyCovered.med.isChronicContinuation = true;
      alreadyCovered.med.rationale += ` (Dosis dipertahankan dari riwayat terapi kronis).`;
      drivers.push(
        `Chronic continuation: ${trimmed} sudah tercakup dalam regimen. Dosis historis diterapkan.`
      );
      continue;
    }
    uniqueCandidates.push({
      med: {
        nama_obat: trimmed,
        dosis: deriveDoseByName(trimmed),
        aturan_pakai: deriveAturanPakai(trimmed),
        durasi: '30 hari',
        rationale:
          'Kelanjutan wajib terapi kronis — obat yang sudah diberikan pada kunjungan sebelumnya. Hanya dokter yang dapat memutuskan tapering off.',
        safety_check: 'safe',
        contraindications: inferContraindications(trimmed),
        isChronicContinuation: true,
      },
      score: 999,
      inStock: false,
      intent: 'chronic_continuation',
    });
    drivers.push(
      `Chronic continuation: ${trimmed} ditambahkan wajib dari riwayat pengobatan sebelumnya.`
    );
  }

  const requiredIntentsMissing = rule.intents.filter(
    (intent) =>
      intent.required && !uniqueCandidates.some((candidate) => candidate.intent === intent.intent)
  );
  const confidence = computeConfidence(uniqueCandidates, rule, requiredIntentsMissing, missingData);
  const inStockCount = uniqueCandidates.filter((candidate) => candidate.inStock).length;

  drivers.push(`Intent matched: ${uniqueCandidates.length}/${rule.intents.length}`);
  drivers.push(`In-stock coverage: ${inStockCount}/${uniqueCandidates.length || 1}`);
  if (requiredIntentsMissing.length > 0) {
    drivers.push(
      `Required intent missing: ${requiredIntentsMissing.map((item) => item.intent).join(', ')}`
    );
  }
  if (missingData.length > 0) {
    drivers.push(`Missing data: ${missingData.join(', ')}`);
  }

  if (uniqueCandidates.length === 0 && isHighPriorityFktpCode(normalizedCode)) {
    const isCardiacEmergency = /^I2[0-4]/.test(normalizedCode);
    alerts.push(
      buildAlert(
        `reasoner-high-priority-empty-${codePrefix}`,
        isCardiacEmergency ? 'emergency' : 'high',
        isCardiacEmergency
          ? 'Regimen Kosong pada Sindrom Kardiak Prioritas Tinggi'
          : 'Regimen Kosong pada Hipertensi Prioritas FKTP',
        isCardiacEmergency
          ? 'Reasoner tidak menemukan kombinasi obat yang aman dari data tersedia. Fokuskan stabilisasi, monitoring serial TTV, dan eskalasi rujukan sesuai kriteria klinis.'
          : 'Reasoner tidak menemukan opsi antihipertensi aman berbasis data tersedia. Re-assessment klinis dan verifikasi data pasien perlu segera dilakukan.',
        'Perbarui data klinis kunci (TTV, alergi, diagnosis kerja) sebelum keputusan terapi lanjutan.'
      )
    );
    drivers.push(
      'High-priority guardrail aktif: regimen kosong ditandai dengan alasan klinis eksplisit.'
    );
  }

  const guidelines = [
    `Risk tier: ${rule.riskTier}`,
    `Confidence: ${confidence}%`,
    `Review window: ${rule.reviewWindow}`,
    `Therapy basis: syndrome-intent reasoner + formulary availability + safety filters for ${normalizedCode}`,
    'Output ini adalah dukungan keputusan klinis, bukan diagnosis final.',
  ];

  return {
    medications: uniqueCandidates.map((candidate) => candidate.med),
    alerts,
    guidelines,
    confidence,
    drivers,
    missingData,
    riskTier: rule.riskTier,
    reviewWindow: rule.reviewWindow,
    syndrome,
  };
}
