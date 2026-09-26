import {
  buildPatientContextProfile,
  hasReducedConsciousnessSignal,
  needsPregnancyVerification,
} from './patient-context-profile';

export type VitalFieldKey = 'sbp' | 'dbp' | 'hr' | 'rr' | 'temp' | 'spo2' | 'glucose';
export type VitalSeverity = 'normal' | 'warning' | 'critical' | 'blocked';
export type VitalGuardrailIssueField =
  | VitalFieldKey
  | 'pain'
  | 'pregnancy'
  | 'symptom'
  | 'obesity'
  | 'disability'
  | 'autosen';

export interface VitalGuardrailState {
  sbp: string;
  dbp: string;
  hr: string;
  rr: string;
  temp: string;
  spo2: string;
  glucose: string;
  symptomText?: string;
  pregnancyStatus?: boolean | null;
  painScore?: string;
  disabilityType?: string;
  obesityConfirmation?: string;
  autosenPreset?: string;
}

export interface VitalGuardrailPatient {
  age: number;
  gender: 'L' | 'P';
}

export interface VitalFieldStatus {
  field: VitalFieldKey;
  severity: VitalSeverity;
  value?: number;
  label?: string;
  hardStop?: string;
  recommendation?: string;
}

export interface VitalGuardrailIssue {
  field: VitalGuardrailIssueField;
  severity: 'warning' | 'critical' | 'blocked';
  title: string;
  message: string;
  codeRedCue?: boolean;
}

export interface VitalGuardrailAssessment {
  fieldStatus: Record<VitalFieldKey, VitalFieldStatus>;
  hardStops: VitalGuardrailIssue[];
  softFlags: VitalGuardrailIssue[];
  codeRedCues: VitalGuardrailIssue[];
  contextNotes: VitalGuardrailIssue[];
  uiLocks: {
    painScore?: string;
  };
  uiRequired: {
    glucose?: boolean;
    pregnancyStatus?: boolean;
  };
  uiDefaults: {
    autosenPreset?: 'adl';
  };
  hasHardStop: boolean;
}

const VITAL_FIELDS: VitalFieldKey[] = ['sbp', 'dbp', 'hr', 'rr', 'temp', 'spo2', 'glucose'];

const CODE_RED_SYMPTOM_PHRASES = [
  'nyeri dada',
  'tidak sadar',
  'kejang',
  'sesak berat',
  'lemah separuh tubuh',
  'pendarahan hebat',
  'pingsan',
  'koma',
  'letargi',
] as const;

export function normalizeVitalInput(
  field: VitalFieldKey,
  rawValue: string
): { value: string; corrected: boolean; message?: string } {
  const value = rawValue.trim().replace(',', '.');
  if (field === 'temp' && /^\d{3}$/.test(value)) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 250 && parsed <= 450) {
      const corrected = (parsed / 10).toFixed(1);
      return {
        value: corrected,
        corrected: true,
        message: `Suhu ${value} dikoreksi otomatis menjadi ${corrected} C.`,
      };
    }
  }
  return { value, corrected: false };
}

function parseNumeric(value: string): number | undefined {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function isVitalFieldKey(field: VitalGuardrailIssueField): field is VitalFieldKey {
  return VITAL_FIELDS.includes(field as VitalFieldKey);
}

function buildInitialFieldStatus(
  state: VitalGuardrailState
): Record<VitalFieldKey, VitalFieldStatus> {
  return VITAL_FIELDS.reduce(
    (accumulator, field) => {
      accumulator[field] = {
        field,
        severity: 'normal',
        value: parseNumeric(state[field]),
      };
      return accumulator;
    },
    {} as Record<VitalFieldKey, VitalFieldStatus>
  );
}

function setSeverity(
  fieldStatus: Record<VitalFieldKey, VitalFieldStatus>,
  field: VitalFieldKey,
  severity: VitalSeverity,
  label?: string,
  recommendation?: string
): void {
  const rank: Record<VitalSeverity, number> = {
    normal: 0,
    warning: 1,
    critical: 2,
    blocked: 3,
  };

  if (rank[severity] >= rank[fieldStatus[field].severity]) {
    fieldStatus[field] = {
      ...fieldStatus[field],
      severity,
      ...(label ? { label } : {}),
      ...(recommendation ? { recommendation } : {}),
    };
  }
}

function addHardStop(
  assessment: VitalGuardrailAssessment,
  field: VitalFieldKey | 'pain' | 'pregnancy',
  title: string,
  message: string
): void {
  assessment.hardStops.push({ field, severity: 'blocked', title, message });
  if (field !== 'pain' && field !== 'pregnancy') {
    assessment.fieldStatus[field] = {
      ...assessment.fieldStatus[field],
      severity: 'blocked',
      hardStop: message,
    };
  }
}

function addContextNote(
  assessment: VitalGuardrailAssessment,
  field: VitalGuardrailIssueField,
  title: string,
  message: string,
  severity: 'warning' | 'critical' = 'warning'
): void {
  assessment.contextNotes.push({
    field,
    severity,
    title,
    message,
  });
}

function addSoftFlag(
  assessment: VitalGuardrailAssessment,
  field: VitalGuardrailIssue['field'],
  severity: 'warning' | 'critical',
  title: string,
  message: string,
  options: { codeRedCue?: boolean; fieldSeverity?: VitalSeverity; recommendation?: string } = {}
): void {
  const issue: VitalGuardrailIssue = {
    field,
    severity,
    title,
    message,
    ...(options.codeRedCue ? { codeRedCue: true } : {}),
  };
  assessment.softFlags.push(issue);
  if (options.codeRedCue) assessment.codeRedCues.push(issue);
  if (isVitalFieldKey(field)) {
    setSeverity(
      assessment.fieldStatus,
      field,
      options.fieldSeverity || severity,
      title,
      options.recommendation
    );
  }
}

function addCodeRedCue(
  assessment: VitalGuardrailAssessment,
  field: VitalGuardrailIssue['field'],
  title: string,
  message: string
): void {
  assessment.codeRedCues.push({
    field,
    severity: 'critical',
    title,
    message,
    codeRedCue: true,
  });
}

function parsePainScore(value?: string): number | undefined | 'invalid' {
  const normalized = (value || '').trim();
  if (!normalized) return undefined;
  if (!/^\d+$/.test(normalized)) return 'invalid';
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10) return 'invalid';
  return parsed;
}

function isObesitySelected(value?: string): boolean {
  const normalized = normalizeText(value || '').replace(/[-\s]+/g, '_');
  return ['confirmed', 'obesity', 'obesitas', 'morbid_obesity', 'obesitas_morbid'].includes(
    normalized
  );
}

function hasDisability(value?: string, expected?: string): boolean {
  const normalized = normalizeText(value || '');
  if (!expected) return Boolean(normalized);
  return normalized.includes(normalizeText(expected));
}

export function assessVitalGuardrails(
  state: VitalGuardrailState,
  patient: VitalGuardrailPatient
): VitalGuardrailAssessment {
  const assessment: VitalGuardrailAssessment = {
    fieldStatus: buildInitialFieldStatus(state),
    hardStops: [],
    softFlags: [],
    codeRedCues: [],
    contextNotes: [],
    uiLocks: {},
    uiRequired: {},
    uiDefaults: {},
    hasHardStop: false,
  };

  const sbp = assessment.fieldStatus.sbp.value;
  const dbp = assessment.fieldStatus.dbp.value;
  const hr = assessment.fieldStatus.hr.value;
  const rr = assessment.fieldStatus.rr.value;
  const temp = assessment.fieldStatus.temp.value;
  const spo2 = assessment.fieldStatus.spo2.value;
  const glucose = assessment.fieldStatus.glucose.value;
  const profile = buildPatientContextProfile(patient);
  const isAdult = patient.age >= 18;
  const isGeneralAdult = !profile.isInfant && !profile.isChild;
  const hasReducedConsciousness = hasReducedConsciousnessSignal(state.symptomText || '');
  const obesitySelected = isObesitySelected(state.obesityConfirmation);

  if (sbp !== undefined && sbp > 300) {
    addHardStop(
      assessment,
      'sbp',
      'Sistolik tidak masuk akal',
      'Sistolik > 300 mmHg tidak masuk akal secara klinis. Periksa ulang input.'
    );
  }
  if (dbp !== undefined && dbp > 200) {
    addHardStop(
      assessment,
      'dbp',
      'Diastolik tidak masuk akal',
      'Diastolik > 200 mmHg tidak masuk akal secara klinis. Periksa ulang input.'
    );
  }
  if (sbp !== undefined && sbp < 40) {
    addHardStop(
      assessment,
      'sbp',
      'Sistolik terlalu rendah untuk pembacaan alat',
      'Sistolik < 40 mmHg berada di bawah batas pembacaan tensi yang dapat diterima.'
    );
  }
  if (dbp !== undefined && dbp < 20) {
    addHardStop(
      assessment,
      'dbp',
      'Diastolik terlalu rendah untuk pembacaan alat',
      'Diastolik < 20 mmHg berada di bawah batas pembacaan tensi yang dapat diterima.'
    );
  }
  if (
    sbp !== undefined &&
    dbp !== undefined &&
    sbp >= 40 &&
    dbp >= 20 &&
    sbp <= 300 &&
    dbp <= 200 &&
    sbp <= dbp
  ) {
    const message =
      'Sistolik harus lebih besar dari diastolik. Periksa kemungkinan angka tertukar.';
    addHardStop(assessment, 'sbp', 'Tekanan darah tidak valid', message);
    addHardStop(assessment, 'dbp', 'Tekanan darah tidak valid', message);
  }

  if (hr !== undefined && hr > 300) {
    addHardStop(
      assessment,
      'hr',
      'Nadi tidak masuk akal',
      'Nadi > 300 x/menit berada di luar batas fisiologis manusia.'
    );
  }
  if (hr !== undefined && hr < 10) {
    addHardStop(
      assessment,
      'hr',
      'Nadi terlalu rendah untuk pembacaan alat',
      'Nadi < 10 x/menit perlu dianggap error input atau pembacaan alat.'
    );
  }

  if (temp !== undefined && temp > 45) {
    addHardStop(
      assessment,
      'temp',
      'Suhu tidak kompatibel',
      'Suhu > 45 C tidak kompatibel dengan kehidupan. Periksa ulang input.'
    );
  }
  if (temp !== undefined && temp < 25) {
    addHardStop(
      assessment,
      'temp',
      'Suhu terlalu rendah untuk pembacaan rutin',
      'Suhu < 25 C perlu dianggap error input atau pembacaan alat.'
    );
  }

  if (glucose !== undefined && glucose > 1500) {
    addHardStop(
      assessment,
      'glucose',
      'Gula darah tidak masuk akal',
      'GDS > 1500 mg/dL melampaui batas wajar pembacaan glukometer. Periksa typo.'
    );
  }
  if (glucose !== undefined && glucose < 10) {
    addHardStop(
      assessment,
      'glucose',
      'Gula darah terlalu rendah untuk pembacaan alat',
      'GDS < 10 mg/dL perlu dianggap error input atau pembacaan alat.'
    );
  }

  if (rr !== undefined && rr > 100) {
    addHardStop(
      assessment,
      'rr',
      'Pernafasan tidak masuk akal',
      'Frekuensi napas > 100 x/menit tidak masuk akal untuk input klinis rutin.'
    );
  }
  if (rr !== undefined && rr < 5) {
    addHardStop(
      assessment,
      'rr',
      'Pernafasan terlalu rendah',
      'Frekuensi napas < 5 x/menit perlu dianggap error input atau kondisi ekstrem.'
    );
  }

  if (spo2 !== undefined && spo2 > 100) {
    addHardStop(
      assessment,
      'spo2',
      'Saturasi tidak mungkin',
      'Saturasi O2 > 100% tidak mungkin secara fisika dan medis.'
    );
  }
  if (spo2 !== undefined && spo2 < 30) {
    addHardStop(
      assessment,
      'spo2',
      'Saturasi terlalu rendah untuk pembacaan oximeter',
      'Saturasi O2 < 30% biasanya menandakan gagal baca alat atau salah input.'
    );
  }

  if (patient.gender === 'L' && state.pregnancyStatus === true) {
    addHardStop(
      assessment,
      'pregnancy',
      'Status kehamilan tidak relevan',
      'Pasien laki-laki tidak dapat diberi status hamil. Sinkronisasi pasien mengunci field ini.'
    );
  }

  const painScore = parsePainScore(state.painScore);
  if (painScore === 'invalid') {
    assessment.hardStops.push({
      field: 'pain',
      severity: 'blocked',
      title: 'Skala nyeri tidak valid',
      message: 'Skala nyeri hanya menerima integer 0 sampai 10.',
    });
  }
  if (profile.usesFlaccPainScale) {
    assessment.uiLocks.painScore = 'Gunakan Skala FLACC, bukan angka 0-10';
  }
  if (hasReducedConsciousness) {
    assessment.uiLocks.painScore = 'Tidak relevan - Pasien tidak sadar';
    assessment.uiRequired.glucose = true;
    if (glucose === undefined) {
      addHardStop(
        assessment,
        'glucose',
        'Gula darah wajib pada pasien tidak sadar',
        'Cek Gula Darah Sewaktu (GDS) segera untuk pasien tidak sadar!'
      );
    }
  }
  if (needsPregnancyVerification(profile, state.symptomText || '', state.pregnancyStatus)) {
    assessment.uiRequired.pregnancyStatus = true;
    addHardStop(
      assessment,
      'pregnancy',
      'Status kehamilan wajib dikonfirmasi',
      'Pastikan status kehamilan: Hamil/Tidak Hamil sebelum SEND TO DOCTOR.'
    );
  }
  if (profile.isInfant && hr !== undefined && (hr < 60 || hr > 220)) {
    addHardStop(
      assessment,
      'hr',
      'Nadi bayi ekstrem',
      `Nadi bayi ${hr} x/menit berada di zona hard stop. Evaluasi segera dan pertimbangkan CODE RED.`
    );
  }
  if (profile.isInfant && rr !== undefined && rr > 80) {
    addHardStop(
      assessment,
      'rr',
      'Pernafasan bayi ekstrem',
      `Frekuensi napas bayi ${rr} x/menit berada di zona hard stop.`
    );
  }

  const blockedFields = new Set(assessment.hardStops.map((stop) => stop.field));

  if (
    isGeneralAdult &&
    sbp !== undefined &&
    dbp !== undefined &&
    !blockedFields.has('sbp') &&
    !blockedFields.has('dbp')
  ) {
    if (sbp < 90 || dbp < 60) {
      addSoftFlag(
        assessment,
        'sbp',
        'warning',
        'Hipotensi',
        `Tekanan darah ${sbp}/${dbp} mmHg masuk zona hipotensi.`,
        { fieldSeverity: 'warning' }
      );
      setSeverity(assessment.fieldStatus, 'dbp', 'warning', 'Hipotensi');
    }
    if (sbp >= 180 || dbp >= 120) {
      addSoftFlag(
        assessment,
        'sbp',
        'critical',
        'Krisis hipertensi',
        `Tekanan darah ${sbp}/${dbp} mmHg masuk zona krisis hipertensi. Rekomendasikan evaluasi CODE RED sesuai konteks.`,
        { fieldSeverity: 'critical', recommendation: 'Rekomendasikan tombol CODE RED.' }
      );
      setSeverity(
        assessment.fieldStatus,
        'dbp',
        'critical',
        'Krisis hipertensi',
        'Rekomendasikan tombol CODE RED.'
      );
    }
    if (sbp < 80 || sbp > 200) {
      addCodeRedCue(
        assessment,
        'sbp',
        'CODE RED tekanan darah',
        `Sistolik ${sbp} mmHg memenuhi trigger otomatis CODE RED.`
      );
    }
  }
  if (profile.isInfant && sbp !== undefined && !blockedFields.has('sbp')) {
    if (sbp < 70 || sbp > 100) {
      addSoftFlag(
        assessment,
        'sbp',
        'warning',
        'Tekanan darah bayi perlu review',
        `Sistolik bayi ${sbp} mmHg berada di luar rentang aman bayi.`,
        { fieldSeverity: 'warning' }
      );
    }
  }
  if (profile.isChild && sbp !== undefined && !blockedFields.has('sbp') && sbp > 120) {
    addSoftFlag(
      assessment,
      'sbp',
      'warning',
      'Tensi tinggi untuk usia anak',
      `Sistolik ${sbp} mmHg tinggi untuk usia anak. Pastikan ukuran manset tensimeter sesuai.`,
      {
        fieldSeverity: 'warning',
        recommendation:
          'Tensi tinggi untuk usia anak. Pastikan ukuran manset tensimeter sesuai (Manset Anak).',
      }
    );
  }
  if (profile.isGeriatric && sbp !== undefined && !blockedFields.has('sbp') && sbp < 100) {
    addSoftFlag(
      assessment,
      'sbp',
      'warning',
      'Risiko jatuh tinggi',
      `Sistolik ${sbp} mmHg pada pasien geriatri meningkatkan risiko jatuh.`,
      {
        fieldSeverity: 'warning',
        recommendation: 'Risiko jatuh tinggi. Awasi mobilitas.',
      }
    );
  }

  if (hr !== undefined && !blockedFields.has('hr')) {
    if (profile.isInfant && (hr < 90 || hr > 160)) {
      addSoftFlag(
        assessment,
        'hr',
        'warning',
        'Nadi bayi perlu review',
        `Nadi bayi ${hr} x/menit berada di luar rentang bayi.`,
        { fieldSeverity: 'warning' }
      );
    } else if (profile.isChild && (hr < 70 || hr > 120)) {
      addSoftFlag(
        assessment,
        'hr',
        'warning',
        'Nadi anak perlu review',
        `Nadi anak ${hr} x/menit berada di luar rentang anak.`,
        { fieldSeverity: 'warning' }
      );
    } else if (isGeneralAdult && hr < 60) {
      addSoftFlag(
        assessment,
        'hr',
        'warning',
        'Bradikardia',
        `Nadi ${hr} x/menit masuk zona bradikardia.`,
        { fieldSeverity: 'warning' }
      );
    }
    if (isAdult && hr > 130) {
      addSoftFlag(
        assessment,
        'hr',
        'critical',
        'Takikardia ekstrem',
        `Nadi ${hr} x/menit masuk zona takikardia ekstrem dewasa.`,
        { fieldSeverity: 'critical' }
      );
    }
    if (isAdult && (hr < 50 || hr > 140)) {
      addCodeRedCue(
        assessment,
        'hr',
        'CODE RED nadi',
        `Nadi ${hr} x/menit memenuhi trigger otomatis CODE RED dewasa.`
      );
    }
  }

  if (temp !== undefined && !blockedFields.has('temp')) {
    if (profile.isGeriatric && temp >= 37.3 && temp <= 40) {
      addSoftFlag(
        assessment,
        'temp',
        'warning',
        'Demam ringan bermakna pada geriatri',
        `Suhu ${temp} C pada pasien geriatri perlu dianggap bermakna meski tidak tinggi.`,
        { fieldSeverity: 'warning' }
      );
    }
    if (temp < 35) {
      addSoftFlag(
        assessment,
        'temp',
        'warning',
        'Hipotermia',
        `Suhu ${temp} C masuk zona hipotermia.`,
        { fieldSeverity: 'warning' }
      );
    }
    if (temp > 40) {
      addSoftFlag(
        assessment,
        'temp',
        'critical',
        'Hiperpireksia',
        `Suhu ${temp} C masuk zona hiperpireksia.`,
        { fieldSeverity: 'critical' }
      );
    }
  }

  if (glucose !== undefined && !blockedFields.has('glucose')) {
    if (glucose < 60) {
      addSoftFlag(
        assessment,
        'glucose',
        'critical',
        'Hipoglikemia bahaya',
        `GDS ${glucose} mg/dL masuk zona hipoglikemia bahaya.`,
        { fieldSeverity: 'critical' }
      );
    }
    if (glucose > 400) {
      addSoftFlag(
        assessment,
        'glucose',
        'critical',
        'Hiperglikemia ekstrem',
        `GDS ${glucose} mg/dL masuk zona hiperglikemia ekstrem.`,
        { fieldSeverity: 'critical' }
      );
    }
    if (glucose < 50) {
      addCodeRedCue(
        assessment,
        'glucose',
        'CODE RED gula darah',
        `GDS ${glucose} mg/dL memenuhi trigger otomatis CODE RED.`
      );
    }
  }

  if (rr !== undefined && !blockedFields.has('rr')) {
    if (profile.isInfant && (rr < 25 || rr > 60)) {
      addSoftFlag(
        assessment,
        'rr',
        'warning',
        'Pernafasan bayi perlu review',
        `Frekuensi napas bayi ${rr} x/menit berada di luar rentang bayi.`,
        { fieldSeverity: 'warning' }
      );
    } else if (profile.isChild && (rr < 18 || rr > 30)) {
      addSoftFlag(
        assessment,
        'rr',
        'warning',
        'Pernafasan anak perlu review',
        `Frekuensi napas anak ${rr} x/menit berada di luar rentang anak.`,
        { fieldSeverity: 'warning' }
      );
    } else if (isGeneralAdult && rr < 12) {
      addSoftFlag(
        assessment,
        'rr',
        'warning',
        'Bradipnea',
        `Frekuensi napas ${rr} x/menit masuk zona bradipnea.`,
        { fieldSeverity: 'warning' }
      );
    }
    if (isGeneralAdult && rr > 30) {
      addSoftFlag(
        assessment,
        'rr',
        'critical',
        'Takipnea berat / distres',
        `Frekuensi napas ${rr} x/menit masuk zona takipnea berat atau distres.`,
        { codeRedCue: true, fieldSeverity: 'critical' }
      );
    }
  }

  if (spo2 !== undefined && !blockedFields.has('spo2')) {
    const spo2WarningThreshold = obesitySelected ? 93 : 95;
    if (spo2 < spo2WarningThreshold || spo2 < 90) {
      addSoftFlag(
        assessment,
        'spo2',
        spo2 < 90 ? 'critical' : 'warning',
        spo2 < 90 ? 'Hipoksia berat' : 'Saturasi rendah',
        `Saturasi O2 ${spo2}% ${spo2 < 90 ? 'masuk zona hipoksia berat' : 'di bawah 95%'}.`,
        { codeRedCue: spo2 < 90, fieldSeverity: spo2 < 90 ? 'critical' : 'warning' }
      );
    }
  }

  if (
    patient.gender === 'P' &&
    state.pregnancyStatus === true &&
    !blockedFields.has('sbp') &&
    !blockedFields.has('dbp') &&
    ((sbp !== undefined && sbp >= 140) || (dbp !== undefined && dbp >= 90))
  ) {
    assessment.softFlags.push({
      field: 'pregnancy',
      severity: 'critical',
      title: 'WASPADA PREEKLAMPSIA',
      message: `Status hamil dengan tekanan darah ${sbp ?? '-'}/${dbp ?? '-'} mmHg memenuhi batas kewaspadaan preeklampsia.`,
    });
  }

  if (typeof painScore === 'number' && painScore >= 7) {
    assessment.softFlags.push({
      field: 'pain',
      severity: 'critical',
      title: 'Nyeri hebat',
      message: `Skala nyeri ${painScore}/10 perlu ditandai urgent pada ringkasan SEND TO DOCTOR.`,
    });
  }

  const normalizedSymptomText = normalizeText(state.symptomText || '');
  const matchedPhrase = CODE_RED_SYMPTOM_PHRASES.find((phrase) =>
    normalizedSymptomText.includes(phrase)
  );
  if (matchedPhrase) {
    addCodeRedCue(
      assessment,
      'symptom',
      'CODE RED dari keluhan',
      `Keluhan mengandung frasa kritis "${matchedPhrase}".`
    );
  }

  if (profile.isGeriatric && !state.autosenPreset) {
    assessment.uiDefaults.autosenPreset = 'adl';
  }
  if (obesitySelected) {
    addContextNote(
      assessment,
      'obesity',
      'Validasi manset tensi',
      'Pastikan menggunakan manset tensi ukuran besar. Manset kecil pada lengan besar dapat menghasilkan tensi tinggi palsu.'
    );
    addContextNote(
      assessment,
      'obesity',
      'Risiko sleep apnea',
      'Obesitas meningkatkan risiko sleep apnea; tandai risiko henti napas saat tidur pada rekam medis dokter.'
    );
    if (sbp !== undefined || dbp !== undefined) {
      setSeverity(
        assessment.fieldStatus,
        'sbp',
        assessment.fieldStatus.sbp.severity,
        assessment.fieldStatus.sbp.label,
        'Pastikan menggunakan manset tensi ukuran besar untuk mencegah false high.'
      );
      setSeverity(
        assessment.fieldStatus,
        'dbp',
        assessment.fieldStatus.dbp.severity,
        assessment.fieldStatus.dbp.label,
        'Pastikan menggunakan manset tensi ukuran besar untuk mencegah false high.'
      );
    }
  }
  if (hasDisability(state.disabilityType, 'Rungu')) {
    addContextNote(
      assessment,
      'disability',
      'Heteroanamnesa dianjurkan',
      'Pasien Rungu/Tuli/Bisu memerlukan heteroanamnesa dari pengantar bila komunikasi verbal standar terbatas.'
    );
  }
  if (hasDisability(state.disabilityType, 'Daksa')) {
    addContextNote(
      assessment,
      'disability',
      'Catatan antropometri',
      'Disabilitas fisik/amputasi dapat memengaruhi interpretasi berat badan dan antropometri.'
    );
  }

  assessment.hasHardStop = assessment.hardStops.length > 0;
  return assessment;
}
