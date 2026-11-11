export type CalculatorCategory =
  | 'Umum'
  | 'Kardiovaskular'
  | 'Ginjal'
  | 'Obstetri'
  | 'Critical Care'
  | 'Neurologi'
  | 'Pulmonologi'
  | 'Metabolik'
  | 'Skrining Mental'

export type CalculatorTone = 'normal' | 'warning' | 'critical'

export type CalculatorFieldOption = {
  label: string
  value: string
}

export type CalculatorField =
  | {
      id: string
      label: string
      type: 'number'
      placeholder?: string
      step?: string
      min?: number
      suffix?: string
    }
  | {
      id: string
      label: string
      type: 'date'
    }
  | {
      id: string
      label: string
      type: 'toggle'
      options: CalculatorFieldOption[]
    }

export type CalculatorResult = {
  primaryValue: string
  primaryUnit?: string
  secondaryValue?: string
  secondaryLabel?: string
  interpretation: string
  tone: CalculatorTone
  detailItems: Array<{ label: string; value: string }>
  notes: string[]
}

export type CalculatorDefinition = {
  slug: string
  title: string
  category: CalculatorCategory
  summary: string
  clinicalUse: string
  sourcePath: string
  fields: CalculatorField[]
  compute: (values: Record<string, string>) => CalculatorResult | null
}

function num(values: Record<string, string>, key: string): number {
  return Number.parseFloat(values[key] ?? '')
}

function isPositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

function toIdDate(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function classifyBmi(bmi: number): { label: string; tone: CalculatorTone } {
  if (bmi < 18.5) return { label: 'Kurus', tone: 'warning' }
  if (bmi < 25) return { label: 'Normal', tone: 'normal' }
  if (bmi < 30) return { label: 'Gemuk', tone: 'warning' }
  return { label: 'Obesitas', tone: 'critical' }
}

function egfrStage(value: number): { label: string; tone: CalculatorTone } {
  if (value >= 90) return { label: 'G1 - Normal / tinggi', tone: 'normal' }
  if (value >= 60) return { label: 'G2 - Menurun ringan', tone: 'normal' }
  if (value >= 45) return { label: 'G3a - Menurun ringan-sedang', tone: 'warning' }
  if (value >= 30) return { label: 'G3b - Menurun sedang-berat', tone: 'warning' }
  if (value >= 15) return { label: 'G4 - Menurun berat', tone: 'critical' }
  return { label: 'G5 - Gagal ginjal', tone: 'critical' }
}

function calculateBmi(values: Record<string, string>): CalculatorResult | null {
  const weight = num(values, 'weight')
  const heightCm = num(values, 'height')
  if (!isPositiveNumber(weight) || !isPositiveNumber(heightCm)) return null

  const heightM = heightCm / 100
  const bmi = weight / (heightM * heightM)
  const category = classifyBmi(bmi)

  return {
    primaryValue: bmi.toFixed(1),
    primaryUnit: 'kg/m²',
    interpretation: category.label,
    tone: category.tone,
    detailItems: [
      { label: 'Berat badan', value: `${weight.toFixed(0)} kg` },
      { label: 'Tinggi badan', value: `${heightCm.toFixed(0)} cm` },
      { label: 'Kategori', value: category.label },
    ],
    notes: [
      'BMI adalah alat skrining, bukan diagnosis komposisi tubuh.',
      'Interpretasi akhir tetap mempertimbangkan massa otot, edema, dan konteks klinis.',
    ],
  }
}

function calculateMap(values: Record<string, string>): CalculatorResult | null {
  const systolic = num(values, 'systolic')
  const diastolic = num(values, 'diastolic')
  if (!isPositiveNumber(systolic) || !isPositiveNumber(diastolic)) return null

  const result = (systolic + 2 * diastolic) / 3
  const tone: CalculatorTone = result >= 65 ? 'normal' : 'critical'

  return {
    primaryValue: `${Math.round(result)}`,
    primaryUnit: 'mmHg',
    interpretation: result >= 65 ? 'Perfusi organ memadai' : 'Perfusi perlu perhatian',
    tone,
    detailItems: [
      { label: 'Sistolik', value: `${systolic.toFixed(0)} mmHg` },
      { label: 'Diastolik', value: `${diastolic.toFixed(0)} mmHg` },
      { label: 'Formula', value: '[SBP + 2(DBP)] / 3' },
    ],
    notes: [
      'MAP ≥ 65 mmHg umumnya dipakai sebagai target perfusi minimal.',
      'Keputusan klinis tidak boleh hanya berdasar satu angka MAP.',
    ],
  }
}

function calculateBmr(values: Record<string, string>): CalculatorResult | null {
  const age = num(values, 'age')
  const weight = num(values, 'weight')
  const height = num(values, 'height')
  const sex = values.sex
  if (!isPositiveNumber(age) || !isPositiveNumber(weight) || !isPositiveNumber(height) || !sex)
    return null

  let result = 10 * weight + 6.25 * height - 5 * age
  result += sex === 'male' ? 5 : -161

  return {
    primaryValue: `${Math.round(result)}`,
    primaryUnit: 'kkal/hari',
    interpretation:
      sex === 'male' ? 'Estimasi kebutuhan basal laki-laki' : 'Estimasi kebutuhan basal perempuan',
    tone: 'normal',
    detailItems: [
      { label: 'Usia', value: `${age.toFixed(0)} tahun` },
      { label: 'Berat', value: `${weight.toFixed(0)} kg` },
      { label: 'Tinggi', value: `${height.toFixed(0)} cm` },
    ],
    notes: [
      'Menggunakan rumus Mifflin-St Jeor.',
      'Belum memasukkan faktor aktivitas fisik harian.',
    ],
  }
}

function calculateEgfr(values: Record<string, string>): CalculatorResult | null {
  const creatinine = num(values, 'creatinine')
  const age = num(values, 'age')
  const sex = values.sex
  if (!isPositiveNumber(creatinine) || !isPositiveNumber(age) || !sex) return null

  const kappa = sex === 'female' ? 0.7 : 0.9
  const alpha = sex === 'female' ? -0.241 : -0.302
  const multiplier = sex === 'female' ? 1.012 : 1
  const term1 = Math.min(creatinine / kappa, 1) ** alpha
  const term2 = Math.max(creatinine / kappa, 1) ** -1.2
  const term3 = 0.9938 ** age
  const result = 142 * term1 * term2 * term3 * multiplier
  const stage = egfrStage(result)

  return {
    primaryValue: `${Math.round(result)}`,
    primaryUnit: 'mL/min/1.73m²',
    interpretation: stage.label,
    tone: stage.tone,
    detailItems: [
      { label: 'Kreatinin serum', value: `${creatinine.toFixed(2)} mg/dL` },
      { label: 'Usia', value: `${age.toFixed(0)} tahun` },
      {
        label: 'Jenis kelamin',
        value: sex === 'male' ? 'Laki-laki' : 'Perempuan',
      },
    ],
    notes: [
      'Menggunakan CKD-EPI 2021 race-free formula.',
      'Untuk penyesuaian dosis obat, tetap cocokkan dengan protokol lokal.',
    ],
  }
}

function calculateCrCl(values: Record<string, string>): CalculatorResult | null {
  const age = num(values, 'age')
  const weight = num(values, 'weight')
  const creatinine = num(values, 'creatinine')
  const sex = values.sex
  if (!isPositiveNumber(age) || !isPositiveNumber(weight) || !isPositiveNumber(creatinine) || !sex)
    return null

  let result = ((140 - age) * weight) / (72 * creatinine)
  if (sex === 'female') result *= 0.85
  const tone: CalculatorTone = result >= 60 ? 'normal' : result >= 30 ? 'warning' : 'critical'

  return {
    primaryValue: result.toFixed(1),
    primaryUnit: 'mL/min',
    interpretation:
      result >= 60
        ? 'Fungsi filtrasi cukup untuk banyak regimen standar'
        : 'Perlu review penyesuaian dosis',
    tone,
    detailItems: [
      { label: 'Usia', value: `${age.toFixed(0)} tahun` },
      { label: 'Berat badan', value: `${weight.toFixed(0)} kg` },
      { label: 'Kreatinin', value: `${creatinine.toFixed(2)} mg/dL` },
    ],
    notes: [
      'Menggunakan rumus Cockcroft-Gault.',
      'Cocok untuk pertimbangan dosis obat, bukan staging CKD utama.',
    ],
  }
}

function calculateDueDate(values: Record<string, string>): CalculatorResult | null {
  const lmp = values.lmp
  if (!lmp) return null
  const lmpDate = new Date(lmp)
  if (Number.isNaN(lmpDate.getTime())) return null

  const dueDate = new Date(lmpDate)
  dueDate.setDate(dueDate.getDate() + 7)
  dueDate.setMonth(dueDate.getMonth() + 9)

  const now = new Date()
  const diffDays = Math.max(
    0,
    Math.floor((now.getTime() - lmpDate.getTime()) / (1000 * 60 * 60 * 24))
  )
  const weeks = Math.floor(diffDays / 7)
  const days = diffDays % 7

  return {
    primaryValue: toIdDate(dueDate),
    primaryUnit: 'HPL',
    secondaryValue: `${weeks} minggu ${days} hari`,
    secondaryLabel: 'Usia kehamilan',
    interpretation: 'Perkiraan berdasarkan rumus Naegele',
    tone: 'normal',
    detailItems: [
      { label: 'HPHT', value: toIdDate(lmpDate) },
      { label: 'Usia kehamilan', value: `${weeks} minggu ${days} hari` },
      { label: 'Metode', value: 'HPHT + 7 hari + 9 bulan' },
    ],
    notes: [
      'Asumsi siklus 28 hari dan ovulasi hari ke-14.',
      'USG tetap dianjurkan bila tanggal haid tidak pasti atau siklus tidak teratur.',
    ],
  }
}

function calculateQsofa(values: Record<string, string>): CalculatorResult | null {
  const rr = values.rr === 'yes' ? 1 : 0
  const mental = values.mental === 'yes' ? 1 : 0
  const sbp = values.sbp === 'yes' ? 1 : 0
  const answered = [values.rr, values.mental, values.sbp].every(Boolean)
  if (!answered) return null

  const score = rr + mental + sbp
  const tone: CalculatorTone = score >= 2 ? 'critical' : 'warning'

  return {
    primaryValue: `${score}`,
    primaryUnit: '/3',
    interpretation:
      score >= 2
        ? 'Risiko buruk tinggi, evaluasi sepsis segera'
        : 'Risiko lebih rendah, tetap pantau klinis',
    tone,
    detailItems: [
      { label: 'RR ≥ 22', value: rr ? 'Ya' : 'Tidak' },
      { label: 'Perubahan mental', value: mental ? 'Ya' : 'Tidak' },
      { label: 'SBP ≤ 100', value: sbp ? 'Ya' : 'Tidak' },
    ],
    notes: [
      'qSOFA adalah alat skrining cepat, bukan diagnosis sepsis.',
      'Skor ≥ 2 perlu evaluasi organ dysfunction dan eskalasi tata laksana.',
    ],
  }
}

function calculateGcs(values: Record<string, string>): CalculatorResult | null {
  const eye = num(values, 'eye')
  const verbal = num(values, 'verbal')
  const motor = num(values, 'motor')
  if (!isPositiveNumber(eye) || !isPositiveNumber(verbal) || !isPositiveNumber(motor)) return null

  const total = eye + verbal + motor
  const tone: CalculatorTone = total >= 13 ? 'normal' : total >= 9 ? 'warning' : 'critical'
  const interpretation =
    total >= 13
      ? 'Cedera otak ringan'
      : total >= 9
        ? 'Cedera otak sedang'
        : 'Cedera otak berat / koma'

  return {
    primaryValue: `${total}`,
    primaryUnit: '/15',
    interpretation,
    tone,
    detailItems: [
      { label: 'Mata', value: `${eye}` },
      { label: 'Verbal', value: `${verbal}` },
      { label: 'Motorik', value: `${motor}` },
    ],
    notes: [
      'Total GCS = Mata + Verbal + Motorik.',
      'Konteks intubasi, afasia, dan sedasi tetap perlu dicatat terpisah.',
    ],
  }
}

// ─── CURB-65: Keparahan Pneumonia Komunitas ─────────────────────────────
function calculateCurb65(values: Record<string, string>): CalculatorResult | null {
  const confusion = values.confusion === 'ya' ? 1 : 0
  const urea = values.urea === 'ya' ? 1 : 0
  const rr = values.rr === 'ya' ? 1 : 0
  const bp = values.bp === 'ya' ? 1 : 0
  const age = values.age === 'ya' ? 1 : 0
  const answered = [values.confusion, values.urea, values.rr, values.bp, values.age].every(Boolean)
  if (!answered) return null

  const score = confusion + urea + rr + bp + age
  const tone: CalculatorTone = score >= 3 ? 'critical' : score >= 2 ? 'warning' : 'normal'
  const interpretation =
    score <= 1 ? 'Rawat jalan' : score === 2 ? 'Pertimbangkan rawat inap' : 'Rawat inap / ICU'

  return {
    primaryValue: `${score}`,
    primaryUnit: '/5',
    interpretation,
    tone,
    detailItems: [
      { label: 'Kebingungan', value: confusion ? 'Ya' : 'Tidak' },
      { label: 'Ureum > 50 mg/dL', value: urea ? 'Ya' : 'Tidak' },
      { label: 'Frekuensi napas ≥ 30/menit', value: rr ? 'Ya' : 'Tidak' },
      { label: 'TD sistolik < 90 atau diastolik ≤ 60', value: bp ? 'Ya' : 'Tidak' },
      { label: 'Usia ≥ 65 tahun', value: age ? 'Ya' : 'Tidak' },
    ],
    notes: [
      'CURB-65 untuk pneumonia komunitas.',
      'Skor 0–1: rawat jalan. Skor 2: pertimbangkan rawat inap. Skor 3–5: rawat inap.',
    ],
  }
}

// ─── CHA₂DS₂-VASc: Risiko Stroke pada Fibrilasi Atrium ─────────────────
function calculateChads2Vasc(values: Record<string, string>): CalculatorResult | null {
  const chf = values.chf === 'ya' ? 1 : 0
  const hypertension = values.hypertension === 'ya' ? 1 : 0
  const age75 = values.age75 === 'ya' ? 2 : 0
  const diabetes = values.diabetes === 'ya' ? 1 : 0
  const stroke = values.stroke === 'ya' ? 2 : 0
  const vascular = values.vascular === 'ya' ? 1 : 0
  const age65 = values.age65 === 'ya' ? 1 : 0
  const female = values.female === 'ya' ? 1 : 0
  const answered = [
    values.chf,
    values.hypertension,
    values.age75,
    values.diabetes,
    values.stroke,
    values.vascular,
    values.age65,
    values.female,
  ].every(Boolean)
  if (!answered) return null

  const score = chf + hypertension + age75 + diabetes + stroke + vascular + age65 + female
  const tone: CalculatorTone = score >= 2 ? 'critical' : score >= 1 ? 'warning' : 'normal'
  const interpretation =
    score === 0
      ? 'Risiko rendah'
      : score === 1
        ? 'Pertimbangkan antikoagulan'
        : 'Antikoagulan disarankan'

  return {
    primaryValue: `${score}`,
    primaryUnit: '/9',
    interpretation,
    tone,
    detailItems: [
      { label: 'Gagal jantung', value: chf ? 'Ya' : 'Tidak' },
      { label: 'Hipertensi', value: hypertension ? 'Ya' : 'Tidak' },
      { label: 'Usia ≥ 75 tahun', value: age75 ? 'Ya' : 'Tidak' },
      { label: 'Diabetes', value: diabetes ? 'Ya' : 'Tidak' },
      { label: 'Stroke/TIA sebelumnya', value: stroke ? 'Ya' : 'Tidak' },
      { label: 'Penyakit vaskular', value: vascular ? 'Ya' : 'Tidak' },
      { label: 'Usia 65–74 tahun', value: age65 ? 'Ya' : 'Tidak' },
      { label: 'Perempuan', value: female ? 'Ya' : 'Tidak' },
    ],
    notes: [
      'CHA₂DS₂-VASc untuk risiko stroke pada FA non-valvular.',
      'Skor ≥ 2 (pria) atau ≥ 3 (wanita): antikoagulan umumnya disarankan.',
    ],
  }
}

// ─── HAS-BLED: Risiko Perdarahan pada Antikoagulan ─────────────────────
function calculateHasBled(values: Record<string, string>): CalculatorResult | null {
  const h = values.h === 'ya' ? 1 : 0
  const a = values.a === 'ya' ? 1 : 0
  const s = values.s === 'ya' ? 1 : 0
  const b = values.b === 'ya' ? 1 : 0
  const l = values.l === 'ya' ? 1 : 0
  const e = values.e === 'ya' ? 1 : 0
  const d = values.d === 'ya' ? 1 : 0
  const answered = [values.h, values.a, values.s, values.b, values.l, values.e, values.d].every(
    Boolean
  )
  if (!answered) return null

  const score = h + a + s + b + l + e + d
  const tone: CalculatorTone = score >= 3 ? 'critical' : score >= 1 ? 'warning' : 'normal'
  const interpretation =
    score >= 3
      ? 'Risiko perdarahan tinggi'
      : score >= 1
        ? 'Risiko perdarahan sedang'
        : 'Risiko perdarahan rendah'

  return {
    primaryValue: `${score}`,
    primaryUnit: '/9',
    interpretation,
    tone,
    detailItems: [
      { label: 'Hipertensi', value: h ? 'Ya' : 'Tidak' },
      { label: 'Gangguan ginjal/hati', value: a ? 'Ya' : 'Tidak' },
      { label: 'Stroke sebelumnya', value: s ? 'Ya' : 'Tidak' },
      { label: 'Riwayat perdarahan', value: b ? 'Ya' : 'Tidak' },
      { label: 'INR labil', value: l ? 'Ya' : 'Tidak' },
      { label: 'Usia > 65 tahun', value: e ? 'Ya' : 'Tidak' },
      { label: 'Obat/alkohol', value: d ? 'Ya' : 'Tidak' },
    ],
    notes: [
      'HAS-BLED menilai risiko perdarahan mayor pada antikoagulan.',
      'Skor ≥ 3: perhatian modifikasi faktor risiko, bukan kontraindikasi mutlak.',
    ],
  }
}

// ─── HEART Score: Risiko Nyeri Dada ────────────────────────────────────
function calculateHeartScore(values: Record<string, string>): CalculatorResult | null {
  const history = num(values, 'history')
  const ecg = num(values, 'ecg')
  const age = num(values, 'age')
  const risk = num(values, 'risk')
  const troponin = num(values, 'troponin')
  if (
    !Number.isFinite(history) ||
    !Number.isFinite(ecg) ||
    !Number.isFinite(age) ||
    !Number.isFinite(risk) ||
    !Number.isFinite(troponin)
  )
    return null

  const score = history + ecg + age + risk + troponin
  const tone: CalculatorTone = score >= 7 ? 'critical' : score >= 4 ? 'warning' : 'normal'
  const interpretation =
    score <= 3 ? 'Risiko rendah' : score <= 6 ? 'Risiko sedang' : 'Risiko tinggi'

  return {
    primaryValue: `${score}`,
    primaryUnit: '/10',
    interpretation,
    tone,
    detailItems: [
      { label: 'Anamnesis', value: `${history}` },
      { label: 'EKG', value: `${ecg}` },
      { label: 'Usia', value: `${age}` },
      { label: 'Faktor risiko', value: `${risk}` },
      { label: 'Troponin', value: `${troponin}` },
    ],
    notes: [
      'HEART Score: prediksi risiko MACE 6 minggu pada nyeri dada.',
      'Skor 0–3: risiko rendah. 4–6: sedang. 7–10: tinggi.',
    ],
  }
}

// ─── Wells DVT: Kriteria DVT ──────────────────────────────────────────
function calculateWellsDvt(values: Record<string, string>): CalculatorResult | null {
  const cancer = values.cancer === 'ya' ? 1 : 0
  const paralysis = values.paralysis === 'ya' ? 1 : 0
  const bedridden = values.bedridden === 'ya' ? 1 : 0
  const tenderness = values.tenderness === 'ya' ? 1 : 0
  const legSwelling = values.legSwelling === 'ya' ? 1 : 0
  const calfSwelling = values.calfSwelling === 'ya' ? 1 : 0
  const pitting = values.pitting === 'ya' ? 1 : 0
  const collaterals = values.collaterals === 'ya' ? 1 : 0
  const alternative = values.alternative === 'ya' ? -2 : 0
  const answered = [
    values.cancer,
    values.paralysis,
    values.bedridden,
    values.tenderness,
    values.legSwelling,
    values.calfSwelling,
    values.pitting,
    values.collaterals,
    values.alternative,
  ].every(Boolean)
  if (!answered) return null

  const score =
    cancer +
    paralysis +
    bedridden +
    tenderness +
    legSwelling +
    calfSwelling +
    pitting +
    collaterals +
    alternative
  const tone: CalculatorTone = score >= 2 ? 'critical' : score >= 1 ? 'warning' : 'normal'
  const interpretation =
    score >= 2
      ? 'Probabilitas DVT tinggi'
      : score >= 1
        ? 'Probabilitas DVT sedang'
        : 'Probabilitas DVT rendah'

  return {
    primaryValue: `${score}`,
    primaryUnit: 'poin',
    interpretation,
    tone,
    detailItems: [
      { label: 'Kanker aktif', value: cancer ? 'Ya' : 'Tidak' },
      { label: 'Paralisis/plaster', value: paralysis ? 'Ya' : 'Tidak' },
      { label: 'Tirah baring > 3 hari', value: bedridden ? 'Ya' : 'Tidak' },
      { label: 'Nyeri tekan vena dalam', value: tenderness ? 'Ya' : 'Tidak' },
      { label: 'Pembengkakan seluruh kaki', value: legSwelling ? 'Ya' : 'Tidak' },
      { label: 'Pembengkakan betis > 3 cm', value: calfSwelling ? 'Ya' : 'Tidak' },
      { label: 'Edema pitting', value: pitting ? 'Ya' : 'Tidak' },
      { label: 'Vena kolateral', value: collaterals ? 'Ya' : 'Tidak' },
      { label: 'Diagnosis lain lebih mungkin', value: alternative ? 'Ya (-2)' : 'Tidak' },
    ],
    notes: ['Kriteria Wells untuk DVT.', 'Skor ≥ 2: pertimbangkan USG Doppler. Skor < 2: D-dimer.'],
  }
}

// ─── Wells PE: Kriteria Emboli Paru ───────────────────────────────────
function calculateWellsPe(values: Record<string, string>): CalculatorResult | null {
  const dvtSigns = values.dvtSigns === 'ya' ? 3 : 0
  const peFirst = values.peFirst === 'ya' ? 3 : 0
  const hr = values.hr === 'ya' ? 1.5 : 0
  const surgery = values.surgery === 'ya' ? 1.5 : 0
  const priorDvt = values.priorDvt === 'ya' ? 1.5 : 0
  const hemoptysis = values.hemoptysis === 'ya' ? 1 : 0
  const malignancy = values.malignancy === 'ya' ? 1 : 0
  const answered = [
    values.dvtSigns,
    values.peFirst,
    values.hr,
    values.surgery,
    values.priorDvt,
    values.hemoptysis,
    values.malignancy,
  ].every(Boolean)
  if (!answered) return null

  const score = dvtSigns + peFirst + hr + surgery + priorDvt + hemoptysis + malignancy
  const tone: CalculatorTone = score > 6 ? 'critical' : score > 4 ? 'warning' : 'normal'
  const interpretation =
    score > 6
      ? 'Probabilitas PE tinggi'
      : score > 4
        ? 'Probabilitas PE sedang'
        : 'Probabilitas PE rendah'

  return {
    primaryValue: score.toFixed(1),
    primaryUnit: 'poin',
    interpretation,
    tone,
    detailItems: [
      { label: 'Tanda klinis DVT', value: dvtSigns ? 'Ya' : 'Tidak' },
      { label: 'PE diagnosis utama', value: peFirst ? 'Ya' : 'Tidak' },
      { label: 'Nadi > 100', value: hr ? 'Ya' : 'Tidak' },
      { label: 'Bed rest/operasi 4 minggu', value: surgery ? 'Ya' : 'Tidak' },
      { label: 'DVT/PE sebelumnya', value: priorDvt ? 'Ya' : 'Tidak' },
      { label: 'Hemoptisis', value: hemoptysis ? 'Ya' : 'Tidak' },
      { label: 'Malignansi', value: malignancy ? 'Ya' : 'Tidak' },
    ],
    notes: ['Kriteria Wells untuk emboli paru.', 'Skor > 6: CT angiografi. Skor 2–6: D-dimer.'],
  }
}

// ─── Centor: Skor Faringitis Streptokokus ──────────────────────────────
function calculateCentor(values: Record<string, string>): CalculatorResult | null {
  const cough = values.cough === 'tidak' ? 1 : 0
  const nodes = values.nodes === 'ya' ? 1 : 0
  const fever = values.fever === 'ya' ? 1 : 0
  const age = values.age
  const ageScore = age === '3-14' ? 1 : age === '15-44' ? 0 : -1
  const answered = [values.cough, values.nodes, values.fever, values.age].every(Boolean)
  if (!answered) return null

  const score = cough + nodes + fever + ageScore
  const tone: CalculatorTone = score >= 3 ? 'warning' : score >= 1 ? 'normal' : 'normal'
  const interpretation =
    score >= 4
      ? 'Pertimbangkan antibiotik tanpa tes'
      : score >= 2
        ? 'Tes cepat atau kultur'
        : 'Tidak perlu antibiotik'

  return {
    primaryValue: `${score}`,
    primaryUnit: '/4',
    interpretation,
    tone,
    detailItems: [
      { label: 'Tidak batuk', value: cough ? 'Ya (+1)' : 'Tidak' },
      { label: 'Pembesaran anterior nodes', value: nodes ? 'Ya' : 'Tidak' },
      { label: 'Demam > 38°C', value: fever ? 'Ya' : 'Tidak' },
      {
        label: 'Usia',
        value: age === '3-14' ? '3–14 (+1)' : age === '15-44' ? '15–44 (0)' : '≥45 (-1)',
      },
    ],
    notes: [
      'Skor Centor (McIsaac) untuk faringitis streptokokus.',
      'Skor ≥ 4: pertimbangkan antibiotik. Skor 2–3: tes cepat.',
    ],
  }
}

// ─── PHQ-9: Skrining Depresi ───────────────────────────────────────────
function calculatePhq9(values: Record<string, string>): CalculatorResult | null {
  const q1 = num(values, 'q1')
  const q2 = num(values, 'q2')
  const q3 = num(values, 'q3')
  const q4 = num(values, 'q4')
  const q5 = num(values, 'q5')
  const q6 = num(values, 'q6')
  const q7 = num(values, 'q7')
  const q8 = num(values, 'q8')
  const q9 = num(values, 'q9')
  const allAnswered = [q1, q2, q3, q4, q5, q6, q7, q8, q9].every(
    v => Number.isFinite(v) && v >= 0 && v <= 3
  )
  if (!allAnswered) return null

  const score = q1 + q2 + q3 + q4 + q5 + q6 + q7 + q8 + q9
  const tone: CalculatorTone = score >= 20 ? 'critical' : score >= 10 ? 'warning' : 'normal'
  const interpretation =
    score >= 20
      ? 'Depresi berat'
      : score >= 15
        ? 'Depresi sedang-berat'
        : score >= 10
          ? 'Depresi sedang'
          : score >= 5
            ? 'Depresi ringan'
            : 'Minimal/tidak ada'

  return {
    primaryValue: `${score}`,
    primaryUnit: '/27',
    interpretation,
    tone,
    detailItems: [
      { label: 'Total skor', value: `${score}` },
      { label: 'Kategori', value: interpretation },
    ],
    notes: [
      'PHQ-9: skrining depresi 2 minggu terakhir.',
      'Skor ≥ 10: pertimbangkan evaluasi lebih lanjut dan tatalaksana.',
    ],
  }
}

// ─── Berat Badan Ideal (Devine) ────────────────────────────────────────
function calculateIdealBodyWeight(values: Record<string, string>): CalculatorResult | null {
  const heightCm = num(values, 'height')
  const sex = values.sex
  const actualWeight = num(values, 'weight')
  if (!isPositiveNumber(heightCm) || !sex) return null

  const heightInches = heightCm / 2.54
  const ibw = sex === 'male' ? 50 + 2.3 * (heightInches - 60) : 45.5 + 2.3 * (heightInches - 60)
  const adjustedBw =
    isPositiveNumber(actualWeight) && actualWeight > ibw ? ibw + 0.4 * (actualWeight - ibw) : null

  const tone: CalculatorTone = 'normal'
  return {
    primaryValue: ibw.toFixed(1),
    primaryUnit: 'kg',
    secondaryValue: adjustedBw != null ? adjustedBw.toFixed(1) : '—',
    secondaryLabel: 'Berat badan disesuaikan',
    interpretation: 'Perkiraan berat badan ideal (rumus Devine)',
    tone,
    detailItems: [
      { label: 'Tinggi badan', value: `${heightCm.toFixed(0)} cm` },
      { label: 'Jenis kelamin', value: sex === 'male' ? 'Laki-laki' : 'Perempuan' },
      ...(isPositiveNumber(actualWeight)
        ? [{ label: 'Berat aktual', value: `${actualWeight.toFixed(0)} kg` }]
        : []),
    ],
    notes: [
      'Rumus Devine untuk perkiraan berat badan ideal.',
      'Berat disesuaikan untuk pasien obesitas (dosis obat).',
    ],
  }
}

// ─── Koreksi Natrium pada Hiperglikemia ─────────────────────────────────
function calculateSodiumCorrection(values: Record<string, string>): CalculatorResult | null {
  const sodium = num(values, 'sodium')
  const glucose = num(values, 'glucose')
  if (!isPositiveNumber(sodium) || !Number.isFinite(glucose)) return null

  const corrected = sodium + 0.024 * (glucose - 100)
  const tone: CalculatorTone = corrected < 135 ? 'warning' : corrected > 145 ? 'warning' : 'normal'
  const interpretation =
    corrected < 135 ? 'Hiponatremia' : corrected > 145 ? 'Hipernatremia' : 'Normal'

  return {
    primaryValue: corrected.toFixed(1),
    primaryUnit: 'mEq/L',
    interpretation,
    tone,
    detailItems: [
      { label: 'Natrium terukur', value: `${sodium.toFixed(0)} mEq/L` },
      { label: 'Glukosa', value: `${glucose.toFixed(0)} mg/dL` },
      { label: 'Formula', value: 'Na + 0,024 × (GDS - 100)' },
    ],
    notes: [
      'Koreksi natrium untuk pseudohiponatremia pada hiperglikemia.',
      'Glukosa > 100 mg/dL mempengaruhi nilai natrium terukur.',
    ],
  }
}

export const MEDICAL_CALCULATORS: CalculatorDefinition[] = [
  {
    slug: 'bmi-calculator',
    title: 'Indeks Massa Tubuh (BMI)',
    category: 'Umum',
    summary: 'Indeks massa tubuh untuk skrining status gizi dewasa.',
    clinicalUse: 'Skrining status gizi dan konseling faktor risiko metabolik.',
    sourcePath: 'src/app/calculator/bmi-calculator/page.tsx',
    fields: [
      {
        id: 'weight',
        label: 'Berat badan',
        type: 'number',
        placeholder: '70',
        suffix: 'kg',
      },
      {
        id: 'height',
        label: 'Tinggi badan',
        type: 'number',
        placeholder: '170',
        suffix: 'cm',
      },
    ],
    compute: calculateBmi,
  },
  {
    slug: 'map-calculation',
    title: 'Tekanan Arteri Rata-rata (MAP)',
    category: 'Kardiovaskular',
    summary: 'Mean arterial pressure untuk perfusi organ.',
    clinicalUse: 'Membantu melihat kecukupan perfusi pada pasien akut.',
    sourcePath: 'src/app/calculator/map-calculation/page.tsx',
    fields: [
      {
        id: 'systolic',
        label: 'Tekanan sistolik',
        type: 'number',
        placeholder: '120',
        suffix: 'mmHg',
      },
      {
        id: 'diastolic',
        label: 'Tekanan diastolik',
        type: 'number',
        placeholder: '80',
        suffix: 'mmHg',
      },
    ],
    compute: calculateMap,
  },
  {
    slug: 'basal-metabolic-rate',
    title: 'Laju Metabolik Basal (BMR)',
    category: 'Umum',
    summary: 'Estimasi kebutuhan energi basal harian.',
    clinicalUse: 'Dasar edukasi nutrisi dan estimasi kebutuhan kalori awal.',
    sourcePath: 'src/app/calculator/basal-metabolic-rate/page.tsx',
    fields: [
      {
        id: 'sex',
        label: 'Jenis kelamin',
        type: 'toggle',
        options: [
          { label: 'Laki-laki', value: 'male' },
          { label: 'Perempuan', value: 'female' },
        ],
      },
      {
        id: 'age',
        label: 'Usia',
        type: 'number',
        placeholder: '35',
        suffix: 'tahun',
      },
      {
        id: 'weight',
        label: 'Berat badan',
        type: 'number',
        placeholder: '70',
        suffix: 'kg',
      },
      {
        id: 'height',
        label: 'Tinggi badan',
        type: 'number',
        placeholder: '170',
        suffix: 'cm',
      },
    ],
    compute: calculateBmr,
  },
  {
    slug: 'egfr-ckd-epi',
    title: 'eGFR (CKD-EPI 2021)',
    category: 'Ginjal',
    summary: 'Estimasi laju filtrasi glomerulus tanpa ras.',
    clinicalUse: 'Skrining CKD dan interpretasi fungsi ginjal.',
    sourcePath: 'src/app/calculator/egfr-ckd-epi/page.tsx',
    fields: [
      {
        id: 'sex',
        label: 'Jenis kelamin',
        type: 'toggle',
        options: [
          { label: 'Laki-laki', value: 'male' },
          { label: 'Perempuan', value: 'female' },
        ],
      },
      {
        id: 'creatinine',
        label: 'Kreatinin serum',
        type: 'number',
        placeholder: '1.1',
        step: '0.01',
        suffix: 'mg/dL',
      },
      {
        id: 'age',
        label: 'Usia',
        type: 'number',
        placeholder: '45',
        suffix: 'tahun',
      },
    ],
    compute: calculateEgfr,
  },
  {
    slug: 'creatinine-clearance',
    title: 'Creatinine Clearance',
    category: 'Ginjal',
    summary: 'Cockcroft-Gault untuk estimasi clearance kreatinin.',
    clinicalUse: 'Pertimbangan penyesuaian dosis obat berbasis fungsi ginjal.',
    sourcePath: 'src/app/calculator/creatinine-clearance/page.tsx',
    fields: [
      {
        id: 'sex',
        label: 'Jenis kelamin',
        type: 'toggle',
        options: [
          { label: 'Laki-laki', value: 'male' },
          { label: 'Perempuan', value: 'female' },
        ],
      },
      {
        id: 'age',
        label: 'Usia',
        type: 'number',
        placeholder: '45',
        suffix: 'tahun',
      },
      {
        id: 'weight',
        label: 'Berat badan',
        type: 'number',
        placeholder: '70',
        suffix: 'kg',
      },
      {
        id: 'creatinine',
        label: 'Kreatinin serum',
        type: 'number',
        placeholder: '1.1',
        step: '0.01',
        suffix: 'mg/dL',
      },
    ],
    compute: calculateCrCl,
  },
  {
    slug: 'due-date-lmp',
    title: 'Due Date (LMP)',
    category: 'Obstetri',
    summary: 'Perkiraan HPL dan usia kehamilan berdasar HPHT.',
    clinicalUse: 'Estimasi awal obstetri sebelum konfirmasi USG.',
    sourcePath: 'src/app/calculator/due-date-lmp/page.tsx',
    fields: [{ id: 'lmp', label: 'HPHT', type: 'date' }],
    compute: calculateDueDate,
  },
  {
    slug: 'qsofa-score',
    title: 'qSOFA Score',
    category: 'Critical Care',
    summary: 'Skor cepat untuk menilai risiko luaran buruk pada dugaan sepsis.',
    clinicalUse: 'Triage awal pasien infeksi dengan risiko deteriorasi.',
    sourcePath: 'src/app/calculator/qsofa-score/page.tsx',
    fields: [
      {
        id: 'rr',
        label: 'Respiratory rate ≥ 22/menit',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'no' },
          { label: 'Ya', value: 'yes' },
        ],
      },
      {
        id: 'mental',
        label: 'Perubahan status mental',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'no' },
          { label: 'Ya', value: 'yes' },
        ],
      },
      {
        id: 'sbp',
        label: 'Sistolik ≤ 100 mmHg',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'no' },
          { label: 'Ya', value: 'yes' },
        ],
      },
    ],
    compute: calculateQsofa,
  },
  {
    slug: 'glasgow-coma-scale',
    title: 'Skala Koma Glasgow (GCS)',
    category: 'Neurologi',
    summary: 'Penilaian kesadaran berbasis respons mata, verbal, dan motorik.',
    clinicalUse: 'Menilai tingkat kesadaran dan severitas gangguan neurologis.',
    sourcePath: 'src/app/calculator/glasgow-coma-scale/page.tsx',
    fields: [
      {
        id: 'eye',
        label: 'Membuka mata (E)',
        type: 'toggle',
        options: [
          { label: '4 Spontan', value: '4' },
          { label: '3 Terhadap suara', value: '3' },
          { label: '2 Terhadap nyeri', value: '2' },
          { label: '1 Tidak ada', value: '1' },
        ],
      },
      {
        id: 'verbal',
        label: 'Respons verbal (V)',
        type: 'toggle',
        options: [
          { label: '5 Orientasi baik', value: '5' },
          { label: '4 Bingung', value: '4' },
          { label: '3 Kata tidak tepat', value: '3' },
          { label: '2 Suara tak bermakna', value: '2' },
          { label: '1 Tidak ada', value: '1' },
        ],
      },
      {
        id: 'motor',
        label: 'Respons motorik (M)',
        type: 'toggle',
        options: [
          { label: '6 Patuh perintah', value: '6' },
          { label: '5 Lokalisir nyeri', value: '5' },
          { label: '4 Fleksi normal', value: '4' },
          { label: '3 Fleksi abnormal', value: '3' },
          { label: '2 Ekstensi', value: '2' },
          { label: '1 Tidak ada', value: '1' },
        ],
      },
    ],
    compute: calculateGcs,
  },
  // ─── 10 kalkulator baru (batch 2) ────────────────────────────────────
  {
    slug: 'curb-65',
    title: 'CURB-65',
    category: 'Pulmonologi',
    summary: 'Skor keparahan pneumonia komunitas untuk keputusan rawat jalan vs inap.',
    clinicalUse: 'Stratifikasi risiko dan triase pneumonia komunitas.',
    sourcePath: 'MDCalc / panduan IDSA',
    fields: [
      {
        id: 'confusion',
        label: 'Kebingungan (baru onset)',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'urea',
        label: 'Ureum > 50 mg/dL',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'rr',
        label: 'Frekuensi napas ≥ 30/menit',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'bp',
        label: 'TD sistolik < 90 atau diastolik ≤ 60 mmHg',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'age',
        label: 'Usia ≥ 65 tahun',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
    ],
    compute: calculateCurb65,
  },
  {
    slug: 'chads2-vasc',
    title: 'CHA₂DS₂-VASc',
    category: 'Kardiovaskular',
    summary: 'Risiko stroke pada fibrilasi atrium non-valvular.',
    clinicalUse: 'Indikasi antikoagulan pada pasien FA.',
    sourcePath: 'MDCalc / panduan ESC',
    fields: [
      {
        id: 'chf',
        label: 'Gagal jantung',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'hypertension',
        label: 'Hipertensi',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'age75',
        label: 'Usia ≥ 75 tahun',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'diabetes',
        label: 'Diabetes',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'stroke',
        label: 'Stroke/TIA sebelumnya',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'vascular',
        label: 'Penyakit vaskular (PAD, MI, Ao plaque)',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'age65',
        label: 'Usia 65–74 tahun',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'female',
        label: 'Perempuan',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
    ],
    compute: calculateChads2Vasc,
  },
  {
    slug: 'has-bled',
    title: 'HAS-BLED',
    category: 'Kardiovaskular',
    summary: 'Risiko perdarahan mayor pada terapi antikoagulan.',
    clinicalUse: 'Modifikasi faktor risiko perdarahan, bukan kontraindikasi mutlak.',
    sourcePath: 'MDCalc / panduan ESC',
    fields: [
      {
        id: 'h',
        label: 'Hipertensi',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'a',
        label: 'Gangguan ginjal atau hati',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 's',
        label: 'Stroke sebelumnya',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'b',
        label: 'Riwayat perdarahan',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'l',
        label: 'INR labil',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'e',
        label: 'Usia > 65 tahun',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'd',
        label: 'Obat antiplatelet/NSAID atau alkohol',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
    ],
    compute: calculateHasBled,
  },
  {
    slug: 'heart-score',
    title: 'HEART Score',
    category: 'Kardiovaskular',
    summary: 'Prediksi risiko MACE 6 minggu pada nyeri dada akut.',
    clinicalUse: 'Stratifikasi pasien nyeri dada di IGD.',
    sourcePath: 'MDCalc',
    fields: [
      {
        id: 'history',
        label: 'Anamnesis (0: sedikit mencurigakan, 1: sedang, 2: sangat mencurigakan)',
        type: 'number',
        placeholder: '0',
        min: 0,
        suffix: '',
        step: '1',
      },
      {
        id: 'ecg',
        label: 'EKG (0: normal, 1: repolarisasi, 2: signifikan)',
        type: 'number',
        placeholder: '0',
        min: 0,
        suffix: '',
        step: '1',
      },
      {
        id: 'age',
        label: 'Usia (0: <45, 1: 45–64, 2: ≥65)',
        type: 'number',
        placeholder: '0',
        min: 0,
        suffix: '',
        step: '1',
      },
      {
        id: 'risk',
        label: 'Faktor risiko (0: 0–1, 1: 2–3, 2: ≥4)',
        type: 'number',
        placeholder: '0',
        min: 0,
        suffix: '',
        step: '1',
      },
      {
        id: 'troponin',
        label: 'Troponin (0: normal, 1: 1–3×, 2: >3×)',
        type: 'number',
        placeholder: '0',
        min: 0,
        suffix: '',
        step: '1',
      },
    ],
    compute: calculateHeartScore,
  },
  {
    slug: 'wells-dvt',
    title: 'Wells DVT',
    category: 'Pulmonologi',
    summary: 'Kriteria Wells untuk probabilitas trombosis vena dalam.',
    clinicalUse: 'Algoritma D-dimer vs USG Doppler.',
    sourcePath: 'MDCalc',
    fields: [
      {
        id: 'cancer',
        label: 'Kanker aktif',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'paralysis',
        label: 'Paralisis, paresis, atau plaster baru',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'bedridden',
        label: 'Tirah baring > 3 hari atau operasi besar 4 minggu',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'tenderness',
        label: 'Nyeri tekan sepanjang sistem vena dalam',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'legSwelling',
        label: 'Seluruh kaki bengkak',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'calfSwelling',
        label: 'Pembengkakan betis > 3 cm',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'pitting',
        label: 'Edema pitting',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'collaterals',
        label: 'Vena kolateral superfisial',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'alternative',
        label: 'Diagnosis alternatif sama atau lebih mungkin',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya (-2)', value: 'ya' },
        ],
      },
    ],
    compute: calculateWellsDvt,
  },
  {
    slug: 'wells-pe',
    title: 'Wells PE',
    category: 'Pulmonologi',
    summary: 'Kriteria Wells untuk probabilitas emboli paru.',
    clinicalUse: 'Algoritma D-dimer vs CT angiografi.',
    sourcePath: 'MDCalc',
    fields: [
      {
        id: 'dvtSigns',
        label: 'Tanda klinis DVT',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'peFirst',
        label: 'PE sebagai diagnosis utama',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'hr',
        label: 'Nadi > 100/menit',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'surgery',
        label: 'Bed rest atau operasi 4 minggu terakhir',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'priorDvt',
        label: 'DVT atau PE sebelumnya',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'hemoptysis',
        label: 'Hemoptisis',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'malignancy',
        label: 'Malignansi',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
    ],
    compute: calculateWellsPe,
  },
  {
    slug: 'centor-score',
    title: 'Skor Centor',
    category: 'Pulmonologi',
    summary: 'Skor Centor (McIsaac) untuk faringitis streptokokus.',
    clinicalUse: 'Keputusan tes cepat atau antibiotik empiris.',
    sourcePath: 'MDCalc',
    fields: [
      {
        id: 'cough',
        label: 'Batuk',
        type: 'toggle',
        options: [
          { label: 'Ya', value: 'ya' },
          { label: 'Tidak (+1)', value: 'tidak' },
        ],
      },
      {
        id: 'nodes',
        label: 'Pembesaran nodus servikal anterior',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'fever',
        label: 'Demam > 38°C',
        type: 'toggle',
        options: [
          { label: 'Tidak', value: 'tidak' },
          { label: 'Ya', value: 'ya' },
        ],
      },
      {
        id: 'age',
        label: 'Usia',
        type: 'toggle',
        options: [
          { label: '3–14 tahun (+1)', value: '3-14' },
          { label: '15–44 tahun (0)', value: '15-44' },
          { label: '≥ 45 tahun (-1)', value: '45' },
        ],
      },
    ],
    compute: calculateCentor,
  },
  {
    slug: 'phq-9',
    title: 'PHQ-9',
    category: 'Skrining Mental',
    summary: 'Skrining depresi 9 item (2 minggu terakhir).',
    clinicalUse: 'Skrining depresi dan follow-up pengobatan.',
    sourcePath: 'MDCalc / DSM',
    fields: [
      {
        id: 'q1',
        label: 'Q1: Sedikit minat/kesenangan',
        type: 'number',
        placeholder: '0–3',
        min: 0,
        suffix: '',
        step: '1',
      },
      {
        id: 'q2',
        label: 'Q2: Perasaan down/depresi',
        type: 'number',
        placeholder: '0–3',
        min: 0,
        suffix: '',
        step: '1',
      },
      {
        id: 'q3',
        label: 'Q3: Tidur',
        type: 'number',
        placeholder: '0–3',
        min: 0,
        suffix: '',
        step: '1',
      },
      {
        id: 'q4',
        label: 'Q4: Merasa lelah',
        type: 'number',
        placeholder: '0–3',
        min: 0,
        suffix: '',
        step: '1',
      },
      {
        id: 'q5',
        label: 'Q5: Nafsu makan',
        type: 'number',
        placeholder: '0–3',
        min: 0,
        suffix: '',
        step: '1',
      },
      {
        id: 'q6',
        label: 'Q6: Merasa gagal',
        type: 'number',
        placeholder: '0–3',
        min: 0,
        suffix: '',
        step: '1',
      },
      {
        id: 'q7',
        label: 'Q7: Konsentrasi',
        type: 'number',
        placeholder: '0–3',
        min: 0,
        suffix: '',
        step: '1',
      },
      {
        id: 'q8',
        label: 'Q8: Bergerak lambat/gelisah',
        type: 'number',
        placeholder: '0–3',
        min: 0,
        suffix: '',
        step: '1',
      },
      {
        id: 'q9',
        label: 'Q9: Pikiran bunuh diri',
        type: 'number',
        placeholder: '0–3',
        min: 0,
        suffix: '',
        step: '1',
      },
    ],
    compute: calculatePhq9,
  },
  {
    slug: 'ideal-body-weight',
    title: 'Berat Badan Ideal',
    category: 'Metabolik',
    summary: 'Perkiraan berat badan ideal (rumus Devine) dan berat disesuaikan.',
    clinicalUse: 'Dosis obat, nutrisi, dan perhitungan dosis berbasis berat.',
    sourcePath: 'MDCalc',
    fields: [
      {
        id: 'sex',
        label: 'Jenis kelamin',
        type: 'toggle',
        options: [
          { label: 'Laki-laki', value: 'male' },
          { label: 'Perempuan', value: 'female' },
        ],
      },
      { id: 'height', label: 'Tinggi badan', type: 'number', placeholder: '170', suffix: 'cm' },
      {
        id: 'weight',
        label: 'Berat badan aktual (opsional)',
        type: 'number',
        placeholder: '—',
        suffix: 'kg',
      },
    ],
    compute: calculateIdealBodyWeight,
  },
  {
    slug: 'sodium-correction',
    title: 'Koreksi Natrium',
    category: 'Metabolik',
    summary: 'Koreksi natrium serum pada hiperglikemia (pseudohiponatremia).',
    clinicalUse: 'Interpretasi natrium pada pasien DM dengan GDS tinggi.',
    sourcePath: 'MDCalc',
    fields: [
      { id: 'sodium', label: 'Natrium serum', type: 'number', placeholder: '130', suffix: 'mEq/L' },
      {
        id: 'glucose',
        label: 'Glukosa darah',
        type: 'number',
        placeholder: '400',
        suffix: 'mg/dL',
      },
    ],
    compute: calculateSodiumCorrection,
  },
]

export function getCalculatorBySlug(slug: string): CalculatorDefinition | undefined {
  return MEDICAL_CALCULATORS.find(calculator => calculator.slug === slug)
}
