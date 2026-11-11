/**
 * Disease-Specific Early Warning Patterns
 *
 * Layer di atas NEWS2 — mendeteksi pola vital signs yang khas
 * untuk penyakit tertentu, terutama yang time-critical di Puskesmas.
 *
 * Setiap pattern memiliki:
 * - Trigger conditions (vital sign combinations)
 * - Associated ICD-10 codes
 * - Clinical significance dan lead time
 * - Recommended actions
 *
 * Evidence basis:
 * - Ahmed et al. 2025: Wearable sensors for dengue/sepsis
 * - NEWS2 sepsis pathway (RCP UK)
 * - PPK IDI 2013/2022 red flag criteria
 */

import { getBestGCSTotal } from '../vitals/avpu-gcs-mapper'
import type { NEWS2Result } from './news2'
import type { CDSSEngineInput, VitalSigns } from './types'

// ── Types ────────────────────────────────────────────────────────────────────

export type EarlyWarningMatch = {
  pattern_id: string
  pattern_name: string
  severity: 'emergency' | 'urgent' | 'warning'
  condition: string
  action: string
  criteria_met: string[]
  icd_codes: string[]
  lead_time: string
  clinical_basis: string
}

// ── Pattern Definitions ──────────────────────────────────────────────────────

/**
 * DHF → Dengue Shock Syndrome
 *
 * Khas: suhu TURUN dari demam + takikardia NAIK = warning plasma leakage.
 * Di Puskesmas Indonesia, ini pola yang paling sering terlewat.
 * Lead time: 2-6 jam sebelum syok dengue.
 */
function checkDengueShockPattern(input: CDSSEngineInput, v: VitalSigns): EarlyWarningMatch | null {
  const hasDengueContext = /dengue|dbd|demam berdarah|trombosit|peteki/i.test(
    [input.keluhan_utama, input.keluhan_tambahan ?? '', ...(input.chronic_diseases ?? [])].join(' ')
  )

  // Pattern: suhu turun ke subfebris/normal + takikardia
  const tempDropping = v.temperature !== undefined && v.temperature >= 35.5 && v.temperature <= 37.5
  const tachycardia = v.heart_rate !== undefined && v.heart_rate > 100
  const hypotension = v.systolic !== undefined && v.systolic < 100
  const narrowPulsePressure =
    v.systolic !== undefined && v.diastolic !== undefined && v.systolic - v.diastolic <= 20

  if (!hasDengueContext) return null

  // Strong pattern: temp dropping + tachycardia + any hypotension sign
  if (tempDropping && tachycardia && (hypotension || narrowPulsePressure)) {
    return {
      pattern_id: 'DHF_SHOCK_IMMINENT',
      pattern_name: 'Dengue Shock Syndrome — Imminent',
      severity: 'emergency',
      condition: 'Suspek Fase Kritis DHF — Syok Dengue Iminen',
      action:
        'Resusitasi cairan agresif (RL/NS 20ml/kgBB bolus), monitoring tiap 15 menit, siapkan rujukan emergensi',
      criteria_met: [
        `Suhu turun ke ${v.temperature}°C (fase defervescence)`,
        `Takikardia ${v.heart_rate} bpm`,
        hypotension ? `Hipotensi sistolik ${v.systolic} mmHg` : '',
        narrowPulsePressure && v.systolic !== undefined && v.diastolic !== undefined
          ? `Tekanan nadi sempit: ${v.systolic - v.diastolic} mmHg (≤20)`
          : '',
        'Konteks klinis: suspek/konfirmasi dengue',
      ].filter(Boolean),
      icd_codes: ['A91'],
      lead_time: '2-6 jam sebelum syok dengue manifest',
      clinical_basis: 'WHO Dengue Guidelines 2009; Ahmed et al. 2025 (precision 0.79)',
    }
  }

  // Moderate pattern: temp dropping + tachycardia (tanpa hipotensi yet)
  if (tempDropping && tachycardia) {
    return {
      pattern_id: 'DHF_WARNING',
      pattern_name: 'Dengue — Warning Phase Kritis',
      severity: 'urgent',
      condition: 'Warning: Fase Kritis DHF Mungkin Dimulai',
      action:
        'Tingkatkan monitoring tiap 1 jam, cek hematokrit serial, siapkan akses IV, hitung balance cairan',
      criteria_met: [
        `Suhu turun ke ${v.temperature}°C (mulai defervescence)`,
        `Takikardia ${v.heart_rate} bpm (kompensasi awal)`,
        'Konteks klinis: suspek/konfirmasi dengue',
      ],
      icd_codes: ['A91'],
      lead_time: '6-12 jam sebelum kemungkinan syok',
      clinical_basis: 'WHO Dengue Guidelines 2009; PPK IDI',
    }
  }

  return null
}

/**
 * Sepsis Pattern (SIRS + qSOFA inspired)
 *
 * SIRS: ≥2 dari (temp >38/<36, HR >90, RR >20)
 * qSOFA: ≥2 dari (RR ≥22, sistolik ≤100, altered mental status)
 * Lead time: 5-48 jam sebelum sepsis berat.
 */
function checkSepsisPattern(
  input: CDSSEngineInput,
  v: VitalSigns,
  news2: NEWS2Result
): EarlyWarningMatch | null {
  // SIRS criteria
  let sirsCount = 0
  const sirsCriteria: string[] = []

  if (v.temperature !== undefined) {
    if (v.temperature > 38) {
      sirsCount++
      sirsCriteria.push(`Suhu ${v.temperature}°C > 38`)
    } else if (v.temperature < 36) {
      sirsCount++
      sirsCriteria.push(`Suhu ${v.temperature}°C < 36 (hipotermia)`)
    }
  }
  if (v.heart_rate !== undefined && v.heart_rate > 90) {
    sirsCount++
    sirsCriteria.push(`HR ${v.heart_rate} bpm > 90`)
  }
  if (v.respiratory_rate !== undefined && v.respiratory_rate > 20) {
    sirsCount++
    sirsCriteria.push(`RR ${v.respiratory_rate} x/mnt > 20`)
  }

  // qSOFA criteria (Sepsis-3: 3 bedside criteria)
  let qsofaCount = 0
  const qsofaCriteria: string[] = []

  if (v.respiratory_rate !== undefined && v.respiratory_rate >= 22) {
    qsofaCount++
    qsofaCriteria.push(`RR ${v.respiratory_rate} x/mnt ≥ 22`)
  }
  if (v.systolic !== undefined && v.systolic <= 100) {
    qsofaCount++
    qsofaCriteria.push(`Sistolik ${v.systolic} mmHg ≤ 100`)
  }
  // Phase 1A: qSOFA criterion #3 — altered mental status (GCS ≤ 14)
  // Previously missing — qSOFA was only scored on 2 of 3 criteria
  if (v.avpu !== undefined) {
    const gcsTotal = getBestGCSTotal(v.avpu, v.gcs)
    if (gcsTotal <= 14) {
      qsofaCount++
      qsofaCriteria.push(`Altered mental status: GCS ${gcsTotal} ≤ 14 (AVPU: ${v.avpu})`)
    }
  }

  // Infection context
  const hasInfectionContext =
    /infeksi|demam|sepsis|isk|ispa|pneumoni|selulitis|abses|luka infeksi|peritonitis/i.test(
      [input.keluhan_utama, input.keluhan_tambahan ?? '', ...(input.chronic_diseases ?? [])].join(
        ' '
      )
    )

  // High suspicion: qSOFA ≥2 (sepsis highly likely)
  if (qsofaCount >= 2) {
    return {
      pattern_id: 'SEPSIS_QSOFA',
      pattern_name: 'qSOFA Positif — Suspek Sepsis',
      severity: 'emergency',
      condition: `qSOFA ${qsofaCount}/3: Suspek Kuat Sepsis`,
      action:
        'Kultur darah (jika tersedia), antibiotik empiris dalam 1 jam, resusitasi cairan 30ml/kgBB, rujuk segera',
      criteria_met: [...qsofaCriteria, `qSOFA skor: ${qsofaCount}/3 (RR≥22 + SBP≤100 + GCS≤14)`],
      icd_codes: ['A41.9', 'R65.1'],
      lead_time: 'Sepsis mungkin sudah berlangsung — tindakan segera',
      clinical_basis: 'Sepsis-3 Definition (JAMA 2016); NEWS2 sepsis pathway',
    }
  }

  // Moderate: SIRS ≥2 with infection context
  if (sirsCount >= 2 && hasInfectionContext) {
    return {
      pattern_id: 'SEPSIS_SIRS',
      pattern_name: 'SIRS + Konteks Infeksi — Waspada Sepsis',
      severity: 'urgent',
      condition: `SIRS ≥2 Kriteria dengan Konteks Infeksi`,
      action:
        'Monitoring ketat tiap 1 jam, pertimbangkan antibiotik empiris, evaluasi sumber infeksi, siapkan rujukan',
      criteria_met: [
        ...sirsCriteria,
        `SIRS skor: ${sirsCount}/3`,
        `NEWS2 aggregate: ${news2.aggregate_score}`,
        'Konteks klinis mendukung infeksi',
      ],
      icd_codes: ['A41.9', 'R65.0'],
      lead_time: '5-48 jam sebelum sepsis berat jika tidak ditangani',
      clinical_basis: 'SIRS criteria (ACCP/SCCM); NEWS2 sensitivity 96% untuk sepsis',
    }
  }

  // Low: SIRS ≥2 without clear infection context but NEWS2 elevated
  if (sirsCount >= 2 && news2.aggregate_score >= 4) {
    return {
      pattern_id: 'SIRS_ELEVATED',
      pattern_name: 'SIRS + NEWS2 Elevasi — Observasi Ketat',
      severity: 'warning',
      condition: `SIRS ≥2 Kriteria dengan NEWS2 Skor ${news2.aggregate_score}`,
      action: 'Evaluasi sumber infeksi, cek lab darah lengkap, monitoring tiap 2 jam',
      criteria_met: [...sirsCriteria, `NEWS2 aggregate: ${news2.aggregate_score}`],
      icd_codes: ['R65.0'],
      lead_time: 'Observasi — cari sumber infeksi',
      clinical_basis: 'SIRS criteria; NEWS2 aggregate risk stratification',
    }
  }

  return null
}

/**
 * Respiratory Deterioration Pattern
 *
 * Asma eksaserbasi, pneumonia, ARDS early signs.
 * Khas: takipnea + SpO2 turun + takikardia.
 */
function checkRespiratoryDeterioration(
  input: CDSSEngineInput,
  v: VitalSigns
): EarlyWarningMatch | null {
  const tachypnea = v.respiratory_rate !== undefined && v.respiratory_rate > 24
  const lowSpO2 = v.spo2 !== undefined && v.spo2 < 94
  const tachycardia = v.heart_rate !== undefined && v.heart_rate > 100

  const hasRespContext = /sesak|napas|asma|batuk|pneumoni|covid|paru|wheezing|mengi/i.test(
    [input.keluhan_utama, input.keluhan_tambahan ?? ''].join(' ')
  )

  if (!hasRespContext) return null

  // Severe: all three present
  if (tachypnea && lowSpO2 && tachycardia) {
    return {
      pattern_id: 'RESP_FAILURE_IMMINENT',
      pattern_name: 'Gagal Napas Iminen',
      severity: 'emergency',
      condition: 'Trias Gagal Napas: Takipnea + Hipoksia + Takikardia',
      action:
        'Oksigen segera (target SpO₂ ≥94%), posisi semi-Fowler, bronkodilator jika asma, rujuk emergensi',
      criteria_met: [
        `Takipnea RR ${v.respiratory_rate} x/mnt`,
        `SpO₂ ${v.spo2}% < 94`,
        `Takikardia HR ${v.heart_rate} bpm`,
        `Konteks: keluhan respirasi`,
      ],
      icd_codes: ['J96.0', 'J45', 'J18'],
      lead_time: 'Menit hingga jam sebelum gagal napas total',
      clinical_basis: 'BTS Guidelines; PPK Asma IDI',
    }
  }

  // Moderate: two of three
  const count = [tachypnea, lowSpO2, tachycardia].filter(Boolean).length
  if (count >= 2) {
    return {
      pattern_id: 'RESP_DETERIORATION',
      pattern_name: 'Deteriorasi Respirasi',
      severity: 'urgent',
      condition: 'Deteriorasi Respirasi — 2 dari 3 Tanda Positif',
      action:
        'Oksigen jika SpO₂ <94%, evaluasi penyebab (asma/pneumonia/efusi), monitoring tiap 1 jam',
      criteria_met: [
        tachypnea ? `Takipnea RR ${v.respiratory_rate} x/mnt` : null,
        lowSpO2 ? `SpO₂ ${v.spo2}%` : null,
        tachycardia ? `Takikardia HR ${v.heart_rate} bpm` : null,
        'Konteks: keluhan respirasi',
      ].filter(Boolean) as string[],
      icd_codes: ['J45', 'J18', 'J06'],
      lead_time: 'Jam sebelum deteriorasi signifikan',
      clinical_basis: 'BTS Guidelines; NEWS2 respiratory pathway',
    }
  }

  return null
}

/**
 * Cardiovascular Emergency Pattern
 *
 * ACS: takikardia + hipotensi + nyeri dada
 * Heart Failure: takipnea + takikardia + SpO2 turun
 */
function checkCardiovascularPattern(
  input: CDSSEngineInput,
  v: VitalSigns
): EarlyWarningMatch | null {
  const hasChestPain = /nyeri dada|dada sakit|dada terasa berat|sesak dada|angina/i.test(
    [input.keluhan_utama, input.keluhan_tambahan ?? ''].join(' ')
  )
  const hasHFContext = /sesak|bengkak kaki|orthopnea|tidur bantal tinggi|gagal jantung/i.test(
    [input.keluhan_utama, input.keluhan_tambahan ?? '', ...(input.chronic_diseases ?? [])].join(' ')
  )

  const tachycardia = v.heart_rate !== undefined && v.heart_rate > 100
  const hypotension = v.systolic !== undefined && v.systolic < 100
  const hypertension = v.systolic !== undefined && v.systolic >= 160
  const tachypnea = v.respiratory_rate !== undefined && v.respiratory_rate > 22
  const lowSpO2 = v.spo2 !== undefined && v.spo2 < 94

  // ACS pattern: chest pain + tachycardia + hypotension
  if (hasChestPain && tachycardia && hypotension) {
    return {
      pattern_id: 'ACS_SHOCK',
      pattern_name: 'Suspek ACS dengan Syok Kardiogenik',
      severity: 'emergency',
      condition: 'Nyeri Dada + Takikardia + Hipotensi — Suspek ACS/Syok Kardiogenik',
      action:
        'Aspirin 320mg kunyah, oksigen jika SpO₂ <94%, pasang IV line, EKG jika tersedia, RUJUK IGD SEGERA',
      criteria_met: [
        'Nyeri dada sebagai keluhan',
        `Takikardia HR ${v.heart_rate} bpm`,
        `Hipotensi sistolik ${v.systolic} mmHg`,
      ],
      icd_codes: ['I21', 'I20'],
      lead_time: 'Menit — kegawatan kardiovaskular',
      clinical_basis: 'AHA/ACC STEMI Guidelines; PPK IDI Sindrom Koroner Akut',
    }
  }

  // ACS pattern: chest pain + hypertension + tachycardia
  if (hasChestPain && hypertension && tachycardia) {
    return {
      pattern_id: 'ACS_HYPERTENSIVE',
      pattern_name: 'Suspek ACS Hipertensif',
      severity: 'urgent',
      condition: 'Nyeri Dada + Hipertensi + Takikardia',
      action:
        'Aspirin 320mg kunyah, nitrogliserin sublingual jika sistolik >110, EKG, rujuk segera',
      criteria_met: [
        'Nyeri dada sebagai keluhan',
        `Hipertensi sistolik ${v.systolic} mmHg`,
        `Takikardia HR ${v.heart_rate} bpm`,
      ],
      icd_codes: ['I20', 'I21'],
      lead_time: 'Menit hingga jam',
      clinical_basis: 'AHA/ACC Guidelines',
    }
  }

  // Heart failure exacerbation: dyspnea + tachypnea + tachycardia + low SpO2
  if (hasHFContext && tachypnea && tachycardia) {
    return {
      pattern_id: 'HF_EXACERBATION',
      pattern_name: 'Eksaserbasi Gagal Jantung',
      severity: lowSpO2 ? 'emergency' : 'urgent',
      condition: 'Deteriorasi Gagal Jantung — Sesak + Takipnea + Takikardia',
      action:
        'Posisi semi-Fowler, oksigen, furosemid IV jika tersedia, monitoring tiap 30 menit, rujuk',
      criteria_met: [
        `Takipnea RR ${v.respiratory_rate} x/mnt`,
        `Takikardia HR ${v.heart_rate} bpm`,
        lowSpO2 ? `SpO₂ ${v.spo2}%` : null,
        'Konteks: riwayat/gejala gagal jantung',
      ].filter(Boolean) as string[],
      icd_codes: ['I50'],
      lead_time: 'Jam sebelum edema paru akut',
      clinical_basis: 'ESC Heart Failure Guidelines; PPK IDI',
    }
  }

  return null
}

/**
 * Hemorrhagic Shock Pattern
 *
 * GI bleeding, KET, aborsi, trauma — progressive tachycardia then hypotension.
 * Takikardia kompensasi muncul SEBELUM hipotensi.
 */
function checkHemorrhagicShockPattern(
  input: CDSSEngineInput,
  v: VitalSigns
): EarlyWarningMatch | null {
  const hasBleedContext =
    /darah|perdarahan|hematemesis|melena|bab hitam|bab darah|haid banyak|flek|nifas|pasca operasi|trauma/i.test(
      [input.keluhan_utama, input.keluhan_tambahan ?? ''].join(' ')
    )
  const hasObstetricContext = /hamil|kehamilan|ektopik|aborsi|keguguran|nifas|persalinan/i.test(
    [input.keluhan_utama, input.keluhan_tambahan ?? ''].join(' ')
  )

  const tachycardia = v.heart_rate !== undefined && v.heart_rate > 100
  const severeTachycardia = v.heart_rate !== undefined && v.heart_rate > 120
  const hypotension = v.systolic !== undefined && v.systolic < 100

  if (!hasBleedContext && !hasObstetricContext) return null

  // Decompensated: tachycardia + hypotension
  if (severeTachycardia && hypotension) {
    return {
      pattern_id: 'HEMORRHAGIC_SHOCK',
      pattern_name: 'Syok Hemoragik',
      severity: 'emergency',
      condition: 'Takikardia Berat + Hipotensi pada Konteks Perdarahan',
      action:
        '2 jalur IV line besar, bolus kristaloid 1-2L, posisi Trendelenburg, RUJUK IGD SEGERA',
      criteria_met: [
        `Takikardia berat HR ${v.heart_rate} bpm`,
        `Hipotensi sistolik ${v.systolic} mmHg`,
        hasObstetricContext ? 'Konteks obstetri' : 'Konteks perdarahan',
      ],
      icd_codes: hasObstetricContext ? ['O00.1', 'O03', 'O72'] : ['K92.0', 'R57.1'],
      lead_time: 'Syok sudah berlangsung — tindakan SEGERA',
      clinical_basis: 'ATLS Guidelines; PPK IDI Syok Hemoragik',
    }
  }

  // Compensated: tachycardia without hypotension yet (EARLY detection)
  if (tachycardia && !hypotension) {
    return {
      pattern_id: 'HEMORRHAGIC_COMPENSATED',
      pattern_name: 'Syok Hemoragik Kompensasi',
      severity: 'urgent',
      condition: 'Takikardia Kompensasi pada Konteks Perdarahan — Hipotensi Belum Muncul',
      action:
        'Pasang akses IV, cek Hb jika tersedia, monitoring VS tiap 15-30 menit, siapkan rujukan',
      criteria_met: [
        `Takikardia HR ${v.heart_rate} bpm (kompensasi)`,
        `Sistolik ${v.systolic ?? 'tidak diukur'} mmHg (belum hipotensi)`,
        hasObstetricContext ? 'Konteks obstetri' : 'Konteks perdarahan',
        'PENTING: Hipotensi adalah tanda LANJUT — takikardia lebih sensitif',
      ],
      icd_codes: hasObstetricContext ? ['O00.1', 'O03'] : ['K92.0'],
      lead_time: '30 menit - 2 jam sebelum dekompensasi',
      clinical_basis: 'ATLS: kehilangan darah 15-30% = takikardia kompensasi sebelum hipotensi',
    }
  }

  return null
}

/**
 * Preeclampsia/Eclampsia Pattern
 *
 * Hipertensi pada wanita hamil + gejala neurologis.
 */
function checkPreeclampsiaPattern(input: CDSSEngineInput, v: VitalSigns): EarlyWarningMatch | null {
  if (input.jenis_kelamin !== 'P') return null
  // Anak < 12 tahun bukan target preeklampsia (belum menarche)
  if (input.usia < 12) return null

  const hasPregnancyContext =
    input.is_pregnant ||
    /hamil|kehamilan|trimester|janin/i.test(
      [input.keluhan_utama, input.keluhan_tambahan ?? ''].join(' ')
    )

  if (!hasPregnancyContext) return null

  const hypertension = v.systolic !== undefined && v.systolic >= 140
  const severeHypertension = v.systolic !== undefined && v.systolic >= 160
  const diastolicHigh = v.diastolic !== undefined && v.diastolic >= 90
  const severeDiastolic = v.diastolic !== undefined && v.diastolic >= 110

  const hasNeuroSymptoms =
    /sakit kepala|kepala pusing|pandangan kabur|mata berkunang|kejang|gelisah|nyeri ulu hati/i.test(
      [input.keluhan_utama, input.keluhan_tambahan ?? ''].join(' ')
    )

  // Severe: severe hypertension + neuro symptoms
  if ((severeHypertension || severeDiastolic) && hasNeuroSymptoms) {
    return {
      pattern_id: 'ECLAMPSIA_IMMINENT',
      pattern_name: 'Preeklampsia Berat / Eklampsia Iminen',
      severity: 'emergency',
      condition: 'Hipertensi Berat + Gejala Neurologis pada Kehamilan',
      action:
        'MgSO₄ loading dose, antihipertensi (nifedipine 10mg), posisi miring kiri, RUJUK SEGERA ke RS dengan SpOG',
      criteria_met: [
        severeHypertension ? `Sistolik ${v.systolic} mmHg ≥ 160` : '',
        severeDiastolic ? `Diastolik ${v.diastolic} mmHg ≥ 110` : '',
        'Gejala neurologis: ' + (hasNeuroSymptoms ? 'positif' : 'negatif'),
        'Status: hamil/suspek hamil',
      ].filter(Boolean),
      icd_codes: ['O14.1', 'O15'],
      lead_time: 'Menit hingga jam sebelum eklampsia (kejang)',
      clinical_basis: 'ACOG Guidelines; PPK IDI Preeklampsia Berat',
    }
  }

  // Moderate: hypertension in pregnancy
  if ((hypertension || diastolicHigh) && hasPregnancyContext) {
    return {
      pattern_id: 'PREECLAMPSIA_WARNING',
      pattern_name: 'Suspek Preeklampsia',
      severity: 'urgent',
      condition: 'Hipertensi pada Kehamilan',
      action:
        'Cek proteinuria, monitoring VS tiap 1 jam, evaluasi gejala impending eklampsia, rujuk ke SpOG',
      criteria_met: [
        hypertension ? `Sistolik ${v.systolic} mmHg ≥ 140` : '',
        diastolicHigh ? `Diastolik ${v.diastolic} mmHg ≥ 90` : '',
        'Status: hamil/suspek hamil',
      ].filter(Boolean),
      icd_codes: ['O14.0', 'O13'],
      lead_time: 'Hari hingga minggu jika tidak ditangani',
      clinical_basis: 'ACOG Guidelines; POGI Guidelines',
    }
  }

  return null
}

/**
 * Malaria Berat Pattern
 *
 * Demam siklik + takikardia persisten + tanda berat (hipotermia, altered consciousness).
 */
function checkMalariaPattern(input: CDSSEngineInput, v: VitalSigns): EarlyWarningMatch | null {
  const hasMalariaContext =
    /malaria|gigitan nyamuk|daerah endemis|demam menggigil|demam periodik/i.test(
      [input.keluhan_utama, input.keluhan_tambahan ?? '', ...(input.chronic_diseases ?? [])].join(
        ' '
      )
    )

  if (!hasMalariaContext) return null

  const hypothermia = v.temperature !== undefined && v.temperature < 36
  const highFever = v.temperature !== undefined && v.temperature >= 39
  const tachycardia = v.heart_rate !== undefined && v.heart_rate > 110
  const hypotension = v.systolic !== undefined && v.systolic < 100
  const lowSpO2 = v.spo2 !== undefined && v.spo2 < 94

  // Severe: hypothermia OR hypotension OR low SpO2 in malaria context
  if (hypothermia || (tachycardia && hypotension) || lowSpO2) {
    return {
      pattern_id: 'MALARIA_SEVERE',
      pattern_name: 'Malaria Berat',
      severity: 'emergency',
      condition: 'Tanda Malaria Berat — Tanda Syok/Komplikasi',
      action: 'Artesunate IV/IM jika tersedia, pasang IV line, rujuk SEGERA ke RS',
      criteria_met: [
        hypothermia ? `Hipotermia ${v.temperature}°C (tanda berat)` : null,
        tachycardia ? `Takikardia ${v.heart_rate} bpm` : null,
        hypotension ? `Hipotensi ${v.systolic} mmHg` : null,
        lowSpO2 ? `SpO₂ ${v.spo2}%` : null,
        'Konteks malaria',
      ].filter(Boolean) as string[],
      icd_codes: ['B54'],
      lead_time: 'Jam — malaria berat dapat fatal dalam 24 jam',
      clinical_basis: 'WHO Malaria Treatment Guidelines 2022; PPK IDI',
    }
  }

  // Warning: high fever + tachycardia
  if (highFever && tachycardia) {
    return {
      pattern_id: 'MALARIA_WORSENING',
      pattern_name: 'Malaria — Tanda Perburukan',
      severity: 'urgent',
      condition: 'Demam Tinggi + Takikardia pada Konteks Malaria',
      action:
        'Konfirmasi RDT/mikroskopis, mulai antimalaria sesuai protokol, monitoring tiap 2 jam',
      criteria_met: [
        `Demam tinggi ${v.temperature}°C`,
        `Takikardia ${v.heart_rate} bpm`,
        'Konteks malaria',
      ],
      icd_codes: ['B54'],
      lead_time: '6-24 jam sebelum komplikasi berat',
      clinical_basis: 'WHO Malaria Guidelines',
    }
  }

  return null
}

// ── Main Export ──────────────────────────────────────────────────────────────

export function detectEarlyWarningPatterns(
  input: CDSSEngineInput,
  news2: NEWS2Result
): EarlyWarningMatch[] {
  const v = input.vital_signs
  if (!v) return []

  const matches: EarlyWarningMatch[] = []

  // Run all pattern detectors (order: most urgent first)
  const checks = [
    checkDengueShockPattern(input, v),
    checkSepsisPattern(input, v, news2),
    checkRespiratoryDeterioration(input, v),
    checkCardiovascularPattern(input, v),
    checkHemorrhagicShockPattern(input, v),
    checkPreeclampsiaPattern(input, v),
    checkMalariaPattern(input, v),
  ]

  for (const match of checks) {
    if (match) matches.push(match)
  }

  // Sort: emergency first, then urgent, then warning
  const severityOrder = { emergency: 0, urgent: 1, warning: 2 }
  matches.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return matches
}

// ── Convert to engine red_flags format ───────────────────────────────────────

export function earlyWarningsToRedFlags(matches: EarlyWarningMatch[]): Array<{
  severity: 'emergency' | 'urgent' | 'warning'
  condition: string
  action: string
  criteria_met: string[]
  icd_codes?: string[]
}> {
  return matches.map(m => ({
    severity: m.severity,
    condition: `[Early Detection] ${m.condition}`,
    action: m.action,
    criteria_met: [...m.criteria_met, `Lead time: ${m.lead_time}`],
    icd_codes: m.icd_codes,
  }))
}
