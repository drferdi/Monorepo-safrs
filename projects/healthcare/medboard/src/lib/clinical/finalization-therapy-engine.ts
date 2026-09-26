import newDiseaseDatabase from '../../../public/data/144_penyakit_puskesmas.json'
import legacyDiseaseDatabase from '../../../public/data/penyakit.json'
import { resolveDrug } from './formulary-resolver'
import type { DrugAvailabilityStatus, ResolvedDrug } from './types/formulary.types'

/* ── New 144-disease schema ── */

interface NewDrugItem {
  drug: string
  dose: string
  route: string
  frequency: string
  duration?: string
  max_dose?: string
}

interface NewDiseaseEntry {
  id: number
  system: string
  name: string
  icd10: string
  pharmacotherapy: {
    first_line?: NewDrugItem[]
    second_line?: NewDrugItem[]
    prophylaxis?: NewDrugItem[]
  }
  non_pharmacotherapy: string[]
  referral_criteria: string[]
  tags: string[]
}

/* ── Legacy penyakit.json schema ── */

interface LegacyTherapyItem {
  obat: string
  dosis?: string
  frek?: string
}

interface LegacyDiseaseEntry {
  nama: string
  icd10: string
  body_system?: string
  kompetensi?: string
  terapi?: LegacyTherapyItem[]
  kriteria_rujukan?: string
}

/* ── Exported types ── */

export type PrescriptionSlot = 'utama' | 'adjuvant' | 'vitamin'

export interface FinalizationTherapySuggestionLike {
  icd10_code: string
  diagnosis_name: string
  confidence: number
  decision_status?: 'recommended' | 'review' | 'must_not_miss' | 'deferred'
  reasoning?: string
  decision_reason?: string
  red_flags?: string[]
  recommended_actions?: string[]
}

export interface FinalizationMedicationItem {
  name: string
  canonicalName: string | null
  dose: string
  frequency: string
  route: string
  category: string
  prescriptionSlot: PrescriptionSlot
  stockStatus: DrugAvailabilityStatus
  stockLabel: string
  stockQuantity: number | null
  stockUnit: string | null
  isPuskesmasFormulary: boolean
  confidenceScore: number
  notes?: string
  contraindications: string[]
}

export interface FinalizationTherapyPlan {
  sourceLabel: string
  bodySystem: string
  competence: string
  careMode: {
    label: string
    note: string
    tone: 'critical' | 'referral' | 'primary'
  }
  immediateActions: string[]
  supportive: string[]
  medications: FinalizationMedicationItem[]
  monitoring: string[]
  referral: string[]
  referralDiagnoses: string[]
  safetyChecks: string[]
  stockCoverageLabel: string
  note: string
}

interface BuildTherapyPlanInput {
  suggestion: FinalizationTherapySuggestionLike | null
  keluhanUtama: string
  referralDiagnosisCandidates?: string[]
  allergies?: string[]
  chronicDiseases?: string[]
  patientAge?: number
  patientGender?: 'L' | 'P'
  isPregnant?: boolean
}

interface MedicationContext {
  allergies: string[]
  chronicDiseases: string[]
  patientAge?: number
  patientGender?: 'L' | 'P'
  isPregnant?: boolean
}

/* ── Database loading ── */

const newDiseases = (newDiseaseDatabase as { diseases: NewDiseaseEntry[] }).diseases ?? []
const legacyDiseases = (legacyDiseaseDatabase as { penyakit: LegacyDiseaseEntry[] }).penyakit ?? []

/* ── Clinical term lists ── */

const supportiveTerms = [
  'oksigen',
  'oksigenasi',
  'cairan iv',
  'cairan isotonik',
  'iv fluid',
  'iv line',
  'resusitasi cairan',
  'npo',
  'puasa',
  'puasa total',
  'ngt',
  'kateter',
  'dekompresi',
  'edukasi',
  'hidrasi',
  'istirahat',
  'modifikasi gaya hidup',
  'head up',
  'head up 30',
  'head-up',
  'sadari',
] as const

const monitoringTerms = [
  'monitor',
  'observasi',
  'follow up',
  'follow-up',
  'kontrol',
  'ulang',
  'evaluasi',
  'pantau',
  'vital',
  'serial',
  'cek ulang',
  'review ulang',
] as const

const referralTerms = [
  'rujuk',
  'cito',
  'rawat inap',
  'igd',
  'eskalasi',
  'iccu',
  'cath lab',
  'cath-lab',
  'spesialis',
  ' rs ',
  'rumah sakit',
  'operasi',
  'bedah',
] as const

const vitaminKeywords = [
  'vitamin',
  'asam folat',
  'folic acid',
  'ferrous',
  'ferro sulfat',
  'tablet fe',
  'tablet tambah darah',
  'ttd',
  'zinc',
  'zink',
  'kalsium',
  'calcium',
  'calci',
  'suplemen',
  'mineral',
] as const

/* ── Utility functions ── */

function normalizeTerm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function uniqPush(target: string[], value: string) {
  if (!value.trim()) return
  if (!target.includes(value)) target.push(value)
}

function buildReferralDiagnoses(
  suggestion: FinalizationTherapySuggestionLike | null,
  candidates: string[] = []
): string[] {
  const diagnoses: string[] = []

  if (suggestion?.diagnosis_name) {
    uniqPush(diagnoses, suggestion.diagnosis_name)
  }

  candidates.forEach(candidate => uniqPush(diagnoses, candidate))

  if (diagnoses.length < 2 && suggestion?.diagnosis_name) {
    uniqPush(diagnoses, `Komplikasi / perburukan ${suggestion.diagnosis_name}`)
  }

  if (diagnoses.length < 2) {
    uniqPush(diagnoses, 'Kondisi akut yang memerlukan observasi spesialistik')
  }

  return diagnoses.slice(0, 3)
}

function includesClinicalTerm(value: string, terms: readonly string[]): boolean {
  const normalizedValue = ` ${normalizeTerm(value)} `
  return terms.some(term => normalizedValue.includes(` ${normalizeTerm(term)} `))
}

function includesAnyKeyword(sources: string[], keywords: string[]): boolean {
  const normalizedSources = sources.map(s => normalizeTerm(s)).filter(Boolean)
  return keywords.some(keyword => {
    const nk = normalizeTerm(keyword)
    return nk.length > 0 && normalizedSources.some(s => s.includes(nk))
  })
}

function isVitaminDrug(name: string): boolean {
  const n = ` ${normalizeTerm(name)} `
  return vitaminKeywords.some(kw => {
    const nk = normalizeTerm(kw)
    return nk.length > 2 && n.includes(nk)
  })
}

const topicalKeywords = [
  'topikal',
  'topical',
  'krim',
  'cream',
  'salep',
  'ointment',
  'gel ',
  'lotion',
  'oles',
  'tetes mata',
  'tetes telinga',
  'obat luar',
  'patch',
  'plester',
] as const

function isTopicalDrug(name: string): boolean {
  const n = ` ${normalizeTerm(name)} `
  return topicalKeywords.some(kw => {
    const nk = normalizeTerm(kw)
    return nk.length > 2 && n.includes(nk)
  })
}

function inferSlot(
  drugName: string,
  lineType: 'first' | 'second' | 'prophylaxis'
): PrescriptionSlot {
  if (isVitaminDrug(drugName)) return 'vitamin'
  if (lineType === 'first') return 'utama'
  return 'adjuvant'
}

function normalizePrescriptionSlots(
  medications: FinalizationMedicationItem[]
): FinalizationMedicationItem[] {
  let utamaCount = medications.filter(item => item.prescriptionSlot === 'utama').length

  return medications.map(item => {
    if (item.prescriptionSlot !== 'adjuvant') {
      return item
    }

    const normalizedRoute = normalizeTerm(item.route || 'oral')
    const canPromoteToUtama =
      utamaCount < 3 && normalizedRoute !== 'topikal' && normalizedRoute !== 'topical'
    if (!canPromoteToUtama) {
      return item
    }

    utamaCount += 1
    return {
      ...item,
      prescriptionSlot: 'utama',
    }
  })
}

/* ── Default Puskesmas vitamin catalog (from formularium aktif) ── */

const defaultVitaminCatalog: {
  name: string
  dose: string
  frequency: string
}[] = [
  { name: 'Vitamin B Komplek', dose: '1 tablet', frequency: '1x/hari' },
  { name: 'Multivitamin MMS', dose: '1 tablet', frequency: '1x/hari' },
  { name: 'Vitamin C', dose: '50 mg', frequency: '1x/hari' },
]

function pickDefaultVitamin(): {
  name: string
  dose: string
  frequency: string
} | null {
  for (const vit of defaultVitaminCatalog) {
    if (resolveDrug(vit.name).is_puskesmas_formulary) {
      return vit
    }
  }
  return null
}

/* ── Contraindication builder ── */

function buildMedicationContraindications(
  medicationName: string,
  resolvedDrug: ResolvedDrug,
  context: MedicationContext
): string[] {
  const profile = resolvedDrug.contraindications
  if (!profile) return []

  const warnings: string[] = []
  const patientSignals = [...context.allergies, ...context.chronicDiseases]
  const medicationSignals = [
    medicationName,
    resolvedDrug.canonical_name ?? '',
    ...resolvedDrug.aliases,
  ]

  const pushWarning = (value?: string) => {
    const trimmed = value?.trim()
    if (trimmed && !warnings.includes(trimmed)) warnings.push(trimmed)
  }

  profile.absolute?.slice(0, 1).forEach(pushWarning)
  profile.caution?.slice(0, 1).forEach(pushWarning)

  if (
    profile.allergy?.length &&
    (includesAnyKeyword(context.allergies, medicationSignals) ||
      (includesAnyKeyword(context.allergies, ['nsaid', 'asetosal', 'aspirin', 'salisilat']) &&
        includesAnyKeyword(medicationSignals, [
          'aspirin',
          'asetosal',
          'salisilat',
          'ibuprofen',
          'asam mefenamat',
        ])) ||
      (includesAnyKeyword(context.allergies, [
        'penisilin',
        'penicillin',
        'beta laktam',
        'amoksisilin',
        'amoxicillin',
      ]) &&
        includesAnyKeyword(medicationSignals, [
          'amoxicillin',
          'amoksisilin',
          'ampicillin',
          'ampisilin',
        ])))
  ) {
    profile.allergy.slice(0, 1).forEach(pushWarning)
  }

  if (context.isPregnant && context.patientGender === 'P') {
    profile.pregnancy?.slice(0, 1).forEach(pushWarning)
  }
  if ((context.patientAge ?? 0) >= 60) {
    profile.elderly?.slice(0, 1).forEach(pushWarning)
  }
  profile.comorbidity?.forEach(rule => {
    if (includesAnyKeyword(patientSignals, rule.match)) pushWarning(rule.reason)
  })

  return warnings.slice(0, 3)
}

/* ── Disease lookup: new DB first, fallback to legacy ── */

function findNewDiseaseEntry(
  suggestion: FinalizationTherapySuggestionLike | null
): NewDiseaseEntry | null {
  if (!suggestion) return null
  const nd = normalizeTerm(suggestion.diagnosis_name)
  // Exact ICD-10 match first
  const byIcd = newDiseases.find(e => e.icd10 === suggestion.icd10_code)
  if (byIcd) return byIcd
  // Partial ICD-10 prefix match (e.g. J06 matches J06.9)
  const byIcdPrefix = newDiseases.find(
    e => e.icd10.startsWith(suggestion.icd10_code) || suggestion.icd10_code.startsWith(e.icd10)
  )
  if (byIcdPrefix) return byIcdPrefix
  // Name match
  return (
    newDiseases.find(e => {
      const ne = normalizeTerm(e.name)
      return ne === nd || ne.includes(nd) || nd.includes(ne)
    }) ?? null
  )
}

function findLegacyDiseaseEntry(
  suggestion: FinalizationTherapySuggestionLike | null
): LegacyDiseaseEntry | null {
  if (!suggestion) return null
  const nd = normalizeTerm(suggestion.diagnosis_name)
  return (
    legacyDiseases.find(e => e.icd10 === suggestion.icd10_code) ??
    legacyDiseases.find(e => {
      const ne = normalizeTerm(e.nama)
      return ne === nd || ne.includes(nd) || nd.includes(ne)
    }) ??
    null
  )
}

/* ── Complaint fallbacks ── */

function complaintFallbacks(
  complaint: string,
  supportive: string[],
  monitoring: string[],
  immediate: string[]
) {
  const nc = normalizeTerm(complaint)
  if (nc.includes('demam')) {
    uniqPush(
      immediate,
      'Pastikan hidrasi adekuat, antipiretik bila perlu, dan evaluasi sumber demam.'
    )
    uniqPush(
      monitoring,
      'Pantau suhu ulang, nadi, laju napas, dan respons klinis setelah terapi awal.'
    )
  }
  if (nc.includes('nyeri dada') || nc.includes('angina')) {
    uniqPush(
      immediate,
      'Jangan tunda ECG/rujukan bila nyeri dada persisten atau disertai gejala vegetatif.'
    )
    uniqPush(
      supportive,
      'Observasi ketat, istirahat total, dan minimalkan aktivitas fisik selama evaluasi.'
    )
  }
  if (nc.includes('sesak') || nc.includes('batuk')) {
    uniqPush(
      immediate,
      'Pastikan jalan napas, pola napas, dan kebutuhan oksigenasi sebelum final sign-off.'
    )
  }
  if (nc.includes('nyeri perut') || nc.includes('apendis')) {
    uniqPush(
      supportive,
      'Pertahankan puasa dan observasi abdomen serial bila dicurigai abdomen akut.'
    )
  }
}

/* ── Main builder ── */

export function buildFinalizationTherapyPlan({
  suggestion,
  keluhanUtama,
  referralDiagnosisCandidates = [],
  allergies = [],
  chronicDiseases = [],
  patientAge,
  patientGender,
  isPregnant,
}: BuildTherapyPlanInput): FinalizationTherapyPlan {
  const newEntry = findNewDiseaseEntry(suggestion)
  const legacyEntry = findLegacyDiseaseEntry(suggestion)
  const immediateActions: string[] = []
  const supportive: string[] = []
  const monitoring: string[] = []
  const referral: string[] = []
  const safetyChecks: string[] = []
  const medications: FinalizationMedicationItem[] = []
  const medContext: MedicationContext = {
    allergies,
    chronicDiseases,
    patientAge,
    patientGender,
    isPregnant,
  }
  let excludedMedicationCount = 0

  const addMedication = (
    drugName: string,
    dose: string,
    frequency: string,
    route: string,
    slot: PrescriptionSlot
  ) => {
    const resolved = resolveDrug(drugName)
    const normalizedMedicationName = resolved.canonical_name?.trim() || ''
    if (!resolved.is_puskesmas_formulary || !normalizedMedicationName) {
      excludedMedicationCount += 1
      return
    }
    if (medications.some(m => normalizeTerm(m.name) === normalizeTerm(normalizedMedicationName)))
      return
    medications.push({
      name: normalizedMedicationName,
      canonicalName: resolved.canonical_name,
      dose: dose || '-',
      frequency: frequency || '-',
      route: route || 'oral',
      category: resolved.category,
      prescriptionSlot: isVitaminDrug(drugName) ? 'vitamin' : slot,
      stockStatus: resolved.status,
      stockLabel: resolved.display_label,
      stockQuantity: resolved.stock_item?.quantity ?? null,
      stockUnit: resolved.stock_item?.unit ?? null,
      isPuskesmasFormulary: resolved.is_puskesmas_formulary,
      confidenceScore: resolved.confidence_score,
      notes: resolved.notes,
      contraindications: buildMedicationContraindications(
        normalizedMedicationName,
        resolved,
        medContext
      ),
    })
  }

  /* ── Process new 144-disease database (primary source) ── */
  if (newEntry) {
    const pharma = newEntry.pharmacotherapy

    // First-line drugs
    ;(pharma.first_line ?? []).forEach((item, idx) => {
      void idx
      addMedication(item.drug, item.dose, item.frequency, item.route, inferSlot(item.drug, 'first'))
    })

    // Second-line drugs → adjuvant
    ;(pharma.second_line ?? []).forEach((item, idx) => {
      void idx
      addMedication(
        item.drug,
        item.dose,
        item.frequency,
        item.route,
        inferSlot(item.drug, 'second')
      )
    })

    // Prophylaxis → adjuvant (if present)
    ;(pharma.prophylaxis ?? []).forEach((item, idx) => {
      void idx
      addMedication(
        item.drug,
        item.dose,
        item.frequency,
        item.route,
        inferSlot(item.drug, 'prophylaxis')
      )
    })

    // Non-pharmacotherapy → supportive
    for (const npt of newEntry.non_pharmacotherapy) {
      uniqPush(supportive, npt)
    }

    // Referral criteria
    for (const rc of newEntry.referral_criteria) {
      uniqPush(referral, rc)
    }
  } else if (legacyEntry?.terapi) {
    /* ── Fallback to legacy penyakit.json ── */
    let utamaCount = 0
    legacyEntry.terapi.forEach(item => {
      const label = [item.obat, item.dosis, item.frek].filter(Boolean).join(' • ')
      const resolved = resolveDrug(item.obat)
      const isMapped = resolved.is_puskesmas_formulary

      if (includesClinicalTerm(label, referralTerms)) {
        uniqPush(referral, label)
        return
      }
      if (
        !isMapped &&
        (includesClinicalTerm(label, supportiveTerms) ||
          includesClinicalTerm(item.obat, supportiveTerms) ||
          includesClinicalTerm(label, monitoringTerms))
      ) {
        if (includesClinicalTerm(label, monitoringTerms)) uniqPush(monitoring, label)
        else {
          uniqPush(immediateActions, label)
          uniqPush(supportive, label)
        }
        return
      }

      // Smart slot inference for legacy flat data
      const topical = isTopicalDrug(item.obat)
      const route = topical ? 'topikal' : 'oral'
      let slot: PrescriptionSlot
      if (isVitaminDrug(item.obat)) {
        slot = 'vitamin'
      } else if (topical) {
        slot = 'adjuvant'
      } else if (utamaCount < 3) {
        slot = 'utama'
        utamaCount += 1
      } else {
        slot = 'adjuvant'
      }
      addMedication(item.obat, item.dosis?.trim() || '-', item.frek?.trim() || '-', route, slot)
    })

    if (legacyEntry.kriteria_rujukan) {
      uniqPush(referral, legacyEntry.kriteria_rujukan)
    }
  }

  /* ── Auto-inject default vitamin if none present ── */
  const hasVitamin = medications.some(m => m.prescriptionSlot === 'vitamin')
  if (!hasVitamin && medications.length > 0) {
    const vit = pickDefaultVitamin()
    if (vit) {
      addMedication(vit.name, vit.dose, vit.frequency, 'oral', 'vitamin')
    }
  }

  /* ── Process CDSS recommended actions ── */
  for (const action of suggestion?.recommended_actions ?? []) {
    const label = action.trim()
    if (!label) continue
    if (includesClinicalTerm(label, referralTerms)) {
      uniqPush(referral, label)
      continue
    }
    if (includesClinicalTerm(label, monitoringTerms)) {
      uniqPush(monitoring, label)
      continue
    }
    if (includesClinicalTerm(label, supportiveTerms)) {
      uniqPush(immediateActions, label)
      uniqPush(supportive, label)
      continue
    }
    uniqPush(immediateActions, label)
  }

  /* ── Fallbacks ── */
  complaintFallbacks(keluhanUtama, supportive, monitoring, immediateActions)

  if (supportive.length === 0) {
    uniqPush(
      supportive,
      'Edukasi, istirahat, hidrasi, dan modifikasi aktivitas disesuaikan dengan diagnosis kerja.'
    )
  }
  if (monitoring.length === 0) {
    uniqPush(
      monitoring,
      'Pantau keluhan utama, TTV, dan respons klinis sebelum pasien dipulangkan atau dirujuk.'
    )
  }
  if (immediateActions.length === 0) {
    uniqPush(
      immediateActions,
      'Final check diagnosis kerja, terapi awal, dan disposisi pasien sebelum sign-off.'
    )
  }

  /* ── Safety checks ── */
  if (allergies.length > 0) {
    uniqPush(
      safetyChecks,
      `Verifikasi alergi tercatat sebelum memberi obat: ${allergies.join(', ')}.`
    )
  }
  if (isPregnant && patientGender === 'P') {
    uniqPush(
      safetyChecks,
      'Pastikan keamanan terapi farmakologis terhadap kehamilan sebelum resep diberikan.'
    )
  }
  if ((patientAge ?? 0) >= 60) {
    uniqPush(
      safetyChecks,
      'Pertimbangkan frailty, hipotensi, dan toleransi obat pada pasien usia lanjut.'
    )
  }
  if (chronicDiseases.length > 0) {
    uniqPush(safetyChecks, `Sesuaikan terapi dengan komorbid utama: ${chronicDiseases.join(', ')}.`)
  }
  if (suggestion?.decision_status === 'must_not_miss') {
    uniqPush(
      safetyChecks,
      'Diagnosis kritis dipilih. Jangan tunda rujukan atau observasi ketat hanya untuk melengkapi dokumentasi.'
    )
  }
  if (safetyChecks.length === 0) {
    uniqPush(
      safetyChecks,
      'Lakukan verifikasi alergi, kontraindikasi, dan kesiapan follow-up sebelum sign-off.'
    )
  }

  const normalizedMedications = normalizePrescriptionSlots(medications)

  /* ── Formularium coverage ── */
  const mappedCount = normalizedMedications.filter(
    m => m.stockStatus !== 'not_mapped_to_formulary'
  ).length
  const limitedCount = normalizedMedications.filter(m => m.stockStatus === 'mapped_limited').length
  const unavailableCount = normalizedMedications.filter(
    m => m.stockStatus === 'mapped_not_in_stock'
  ).length
  const stockCoverageLabel =
    normalizedMedications.length === 0
      ? excludedMedicationCount > 0
        ? `${excludedMedicationCount} item terapi di luar formularium aktif disembunyikan`
        : 'Belum ada obat spesifik yang terpetakan'
      : excludedMedicationCount > 0
        ? `${mappedCount}/${normalizedMedications.length} item masuk formularium aktif • ${excludedMedicationCount} item di luar formularium disembunyikan`
        : unavailableCount > 0
          ? `${mappedCount}/${normalizedMedications.length} item masuk formularium aktif`
          : limitedCount > 0
            ? `${mappedCount}/${normalizedMedications.length} item masuk formularium aktif`
            : `${mappedCount}/${normalizedMedications.length} item masuk formularium aktif`

  /* ── Care mode ── */
  const careMode =
    referral.length > 0 || suggestion?.decision_status === 'must_not_miss'
      ? {
          label: 'Rujuk / eskalasi tersedia',
          note:
            newEntry?.referral_criteria[0]?.trim() ||
            legacyEntry?.kriteria_rujukan?.trim() ||
            'Ada sinyal klinis yang memerlukan eskalasi atau setidaknya observasi ketat sebelum pasien dipulangkan.',
          tone:
            suggestion?.decision_status === 'must_not_miss'
              ? ('critical' as const)
              : ('referral' as const),
        }
      : {
          label: 'Kelola di Puskesmas',
          note: 'Dapat ditatalaksana di layanan primer bila respons klinis stabil dan monitoring tetap terpenuhi.',
          tone: 'primary' as const,
        }

  const sourceLabel = newEntry
    ? '144 Penyakit SKDI 4A + reasoning engine'
    : legacyEntry
      ? 'KB lokal + reasoning engine'
      : 'Reasoning engine + fallback heuristik'
  const referralDiagnoses = buildReferralDiagnoses(suggestion, referralDiagnosisCandidates)

  return {
    sourceLabel,
    bodySystem: newEntry?.system || legacyEntry?.body_system || 'GENERAL',
    competence: legacyEntry?.kompetensi || (newEntry ? '4A' : '-'),
    careMode,
    immediateActions,
    supportive,
    medications: normalizedMedications,
    monitoring,
    referral,
    referralDiagnoses,
    safetyChecks,
    stockCoverageLabel,
    note: newEntry
      ? `Rencana terapi berdasarkan 144 Penyakit SKDI 4A (PPK + Fornas). Resep disusun: Obat Utama -> Obat Adjuvant -> Vitamin. Verifikasi akhir tetap mengikuti judgement dokter.${excludedMedicationCount > 0 ? ' Obat di luar formularium aktif otomatis tidak ditampilkan pada rekomendasi.' : ''}`
      : legacyEntry
        ? `Rencana finalisasi dari knowledge base lokal. Resep disusun: Obat Utama -> Obat Adjuvant -> Vitamin. Verifikasi akhir tetap mengikuti judgement dokter serta formularium aktif.${excludedMedicationCount > 0 ? ' Obat di luar formularium aktif otomatis tidak ditampilkan pada rekomendasi.' : ''}`
        : `Belum ada terapi terstruktur dari knowledge base. Gunakan hasil ini sebagai assist awal dan verifikasi manual sebelum sign-off.${excludedMedicationCount > 0 ? ' Obat di luar formularium aktif otomatis tidak ditampilkan pada rekomendasi.' : ''}`,
  }
}
