import type {
  SymphonyEarlyWarningBurden,
  SymphonyMortalityProxyRisk,
  SymphonyTreatmentResponse,
  SymphonyVitalsInput,
} from './symphony-trajectory-core';

export type ClinicalNEWS2RiskLevel = 'low' | 'low_medium' | 'medium' | 'high';
export type ClinicalEarlyWarningSeverity = 'warning' | 'high' | 'critical';
export type ClinicalTrajectorySignalId =
  | 'T-13'
  | 'T-25'
  | 'T-38'
  | 'T-16'
  | 'T-45'
  | 'T-46'
  | 'T-50'
  | 'T-51'
  | 'T-52'
  | 'T-54'
  | 'T-59'
  | 'T-58';
export type ClinicalTrajectorySignalSeverity = 'low' | 'moderate' | 'high' | 'critical';
export type ClinicalSelectedPatternId =
  | 'CP-001'
  | 'CP-002'
  | 'CP-003'
  | 'CP-008'
  | 'CP-009'
  | 'CP-010'
  | 'CP-011'
  | 'CP-012'
  | 'CP-013'
  | 'CP-014'
  | 'CP-063'
  | 'CP-064'
  | 'CP-066';
export type ClinicalSelectedPatternGate =
  | 'GATE_SEPSIS_EARLY'
  | 'GATE_SEPTIC_SHOCK_HIGH'
  | 'GATE_SHOCK_INDEX'
  | 'GATE_RESP_FAILURE'
  | 'GATE_ACS';

export interface ClinicalNEWS2ParameterScore {
  parameter: string;
  value: number | string | undefined;
  score: number;
  unit: string;
}

export interface ClinicalNEWS2Result {
  aggregateScore: number;
  riskLevel: ClinicalNEWS2RiskLevel;
  parameterScores: ClinicalNEWS2ParameterScore[];
  hasExtremeSingle: boolean;
  monitoringRecommendation: string;
  clinicalResponse: string;
  scoreableParameters: number;
}

export interface ClinicalEarlyWarningMatch {
  patternId: string;
  patternName: string;
  severity: ClinicalEarlyWarningSeverity;
  condition: string;
  action: string;
  criteriaMet: string[];
  leadTime: string;
  clinicalBasis: string;
}

export interface ClinicalShockIndexResult {
  value: number;
  severity: ClinicalEarlyWarningSeverity;
  criteriaMet: string[];
}

export interface ClinicalSelectedPatternMatch {
  id: ClinicalSelectedPatternId;
  gate: ClinicalSelectedPatternGate;
  severity: ClinicalEarlyWarningSeverity;
  title: string;
  reasoning: string;
  criteriaMet: string[];
  trajectoryIds: string[];
}

export interface ClinicalLongitudinalContext {
  visitCount: number;
  spanDays: number | null;
  hasDiabetes: boolean;
  hasChronicKidney: boolean;
  hasRenalHistory: boolean;
  repeatedDiagnosisCount: number;
}

export interface ClinicalTrajectorySignal {
  id: ClinicalTrajectorySignalId;
  label: string;
  severity: ClinicalTrajectorySignalSeverity;
  rationale: string;
  evidence: string[];
}

export interface ClinicalTrajectoryIntelligenceInput {
  latestVitals?: SymphonyVitalsInput;
  chiefComplaint?: string;
  additionalComplaint?: string;
  medicalHistory?: string[];
  hasCOPD?: boolean;
  ageYears?: number;
  longitudinalContext?: ClinicalLongitudinalContext;
  mortalityProxy?: SymphonyMortalityProxyRisk;
  treatmentResponse?: SymphonyTreatmentResponse;
  earlyWarningBurden?: SymphonyEarlyWarningBurden;
}

export interface ClinicalTrajectoryIntelligenceResult {
  news2: ClinicalNEWS2Result;
  earlyWarnings: ClinicalEarlyWarningMatch[];
  selectedPatterns: ClinicalSelectedPatternMatch[];
  trajectorySignals: ClinicalTrajectorySignal[];
  shockIndex?: ClinicalShockIndexResult;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeClinicalText(input: ClinicalTrajectoryIntelligenceInput): string {
  return [input.chiefComplaint, input.additionalComplaint, ...(input.medicalHistory ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function hasInfectionContext(text: string, medicalHistory: string[] = []): boolean {
  return /infeksi|demam|sepsis|isk|ispa|pneumoni|selulitis|abses|batuk/i.test(
    `${text} ${medicalHistory.join(' ')}`
  );
}

function hasRespiratoryContext(text: string): boolean {
  return /sesak|napas|asma|batuk|pneumoni|covid|paru|wheezing|mengi|sulit bicara/i.test(text);
}

function hasChestPainContext(text: string): boolean {
  return /nyeri dada|dada sakit|dada berat|angina|palpitasi|mau pingsan|sinkop|syncope/i.test(text);
}

function hasDiabeticInfectionContext(text: string): boolean {
  return /luka|ulkus|kaki diabetes|diabetic foot|gangren|selulitis|abses/i.test(text);
}

function scoreRespiratoryRate(rr: number | undefined): ClinicalNEWS2ParameterScore {
  if (rr === undefined)
    return { parameter: 'respiratory_rate', value: undefined, score: 0, unit: 'x/mnt' };
  let score = 0;
  if (rr <= 8) score = 3;
  else if (rr <= 11) score = 1;
  else if (rr <= 20) score = 0;
  else if (rr <= 24) score = 2;
  else score = 3;
  return { parameter: 'respiratory_rate', value: rr, score, unit: 'x/mnt' };
}

function scoreSpo2Scale1(spo2: number | undefined): ClinicalNEWS2ParameterScore {
  if (spo2 === undefined) return { parameter: 'spo2', value: undefined, score: 0, unit: '%' };
  let score = 0;
  if (spo2 <= 91) score = 3;
  else if (spo2 <= 93) score = 2;
  else if (spo2 <= 95) score = 1;
  return { parameter: 'spo2', value: spo2, score, unit: '%' };
}

/**
 * RCP NEWS2 (2017) Scale 2: 93 % and above scores only on oxygen (93-94: 1, 95-96: 2, >=97: 3);
 * on air it scores 0. Oxygen not recorded keeps the oxygen bands, the safer miss.
 */
function scoreSpo2Scale2(
  spo2: number | undefined,
  onO2: boolean | undefined
): ClinicalNEWS2ParameterScore {
  if (spo2 === undefined)
    return { parameter: 'spo2_scale2', value: undefined, score: 0, unit: '%' };
  let score = 0;
  if (spo2 <= 83) score = 3;
  else if (spo2 <= 85) score = 2;
  else if (spo2 <= 87) score = 1;
  else if (spo2 <= 92 || onO2 === false) score = 0;
  else if (spo2 <= 94) score = 1;
  else if (spo2 <= 96) score = 2;
  else score = 3;
  return { parameter: 'spo2_scale2', value: spo2, score, unit: '%' };
}

function scoreSystolic(systolic: number | undefined): ClinicalNEWS2ParameterScore {
  if (systolic === undefined)
    return { parameter: 'systolic', value: undefined, score: 0, unit: 'mmHg' };
  let score = 0;
  if (systolic <= 90) score = 3;
  else if (systolic <= 100) score = 2;
  else if (systolic <= 110) score = 1;
  else if (systolic > 219) score = 3;
  return { parameter: 'systolic', value: systolic, score, unit: 'mmHg' };
}

function scoreHeartRate(hr: number | undefined): ClinicalNEWS2ParameterScore {
  if (hr === undefined) return { parameter: 'heart_rate', value: undefined, score: 0, unit: 'bpm' };
  let score = 0;
  if (hr <= 40) score = 3;
  else if (hr <= 50) score = 1;
  else if (hr <= 90) score = 0;
  else if (hr <= 110) score = 1;
  else if (hr <= 130) score = 2;
  else score = 3;
  return { parameter: 'heart_rate', value: hr, score, unit: 'bpm' };
}

function scoreTemperature(temp: number | undefined): ClinicalNEWS2ParameterScore {
  if (temp === undefined)
    return { parameter: 'temperature', value: undefined, score: 0, unit: 'C' };
  let score = 0;
  if (temp <= 35) score = 3;
  else if (temp <= 36) score = 1;
  else if (temp <= 38) score = 0;
  else if (temp <= 39) score = 1;
  else score = 2;
  return { parameter: 'temperature', value: temp, score, unit: 'C' };
}

function scoreConsciousness(
  consciousness: SymphonyVitalsInput['consciousness']
): ClinicalNEWS2ParameterScore {
  // Unknown consciousness is missing data, not a normal finding.
  if (consciousness === undefined || consciousness === 'unknown') {
    return { parameter: 'consciousness', value: undefined, score: 0, unit: 'ACVPU' };
  }
  return {
    parameter: 'consciousness',
    value: consciousness,
    score: consciousness === 'alert' ? 0 : 3,
    unit: 'ACVPU',
  };
}

function scoreSupplementalO2(onO2: boolean | undefined): ClinicalNEWS2ParameterScore {
  if (onO2 === undefined) {
    return { parameter: 'supplementalO2', value: undefined, score: 0, unit: '' };
  }
  return {
    parameter: 'supplementalO2',
    value: onO2 ? 'ya' : 'tidak',
    score: onO2 ? 2 : 0,
    unit: '',
  };
}

function determineNews2RiskLevel(
  aggregateScore: number,
  hasExtremeSingle: boolean
): ClinicalNEWS2RiskLevel {
  if (aggregateScore >= 7) return 'high';
  if (aggregateScore >= 5) return 'medium';
  if (hasExtremeSingle) return 'low_medium';
  return 'low';
}

function getMonitoringRecommendation(risk: ClinicalNEWS2RiskLevel): string {
  switch (risk) {
    case 'high':
      return 'Monitoring vital signs kontinu dan pertimbangkan eskalasi/rujukan sesuai kondisi.';
    case 'medium':
      return 'Monitoring vital signs tiap 1 jam dan review klinis urgent.';
    case 'low_medium':
      return 'Monitoring vital signs tiap 1 jam dan tentukan kebutuhan eskalasi.';
    case 'low':
      return 'Monitoring vital signs berkala sesuai konteks klinis.';
  }
}

function getClinicalResponse(risk: ClinicalNEWS2RiskLevel): string {
  switch (risk) {
    case 'high':
      return 'Asesmen emergensi oleh klinisi dan korelasi dengan pemeriksaan langsung.';
    case 'medium':
      return 'Review urgent oleh dokter atau perawat senior.';
    case 'low_medium':
      return 'Review klinis untuk menentukan penyebab dan frekuensi monitoring.';
    case 'low':
      return 'Lanjutkan asesmen klinis rutin bila konteks mendukung.';
  }
}

export function calculateClinicalNEWS2(
  vitals: SymphonyVitalsInput | undefined,
  hasCOPD = false
): ClinicalNEWS2Result {
  if (!vitals) {
    return {
      aggregateScore: 0,
      riskLevel: 'low',
      parameterScores: [],
      hasExtremeSingle: false,
      monitoringRecommendation: 'Tanda vital belum tersedia. Lengkapi pengukuran vital signs.',
      clinicalResponse: 'Tidak dapat menilai risiko tanpa data tanda vital.',
      scoreableParameters: 0,
    };
  }

  const parameterScores = [
    scoreRespiratoryRate(vitals.respiratoryRate),
    hasCOPD
      ? scoreSpo2Scale2(vitals.spo2, vitals.supplementalO2)
      : scoreSpo2Scale1(vitals.spo2),
    scoreSystolic(vitals.systolicBp),
    scoreHeartRate(vitals.heartRate),
    scoreTemperature(vitals.temperatureC),
    scoreConsciousness(vitals.consciousness),
    scoreSupplementalO2(vitals.supplementalO2),
  ];
  const scoreableParameters = parameterScores.filter((parameter) => parameter.value !== undefined);
  const aggregateScore = parameterScores.reduce((sum, parameter) => sum + parameter.score, 0);
  const hasExtremeSingle = parameterScores.some((parameter) => parameter.score === 3);
  const riskLevel = determineNews2RiskLevel(aggregateScore, hasExtremeSingle);

  return {
    aggregateScore,
    riskLevel,
    parameterScores: scoreableParameters,
    hasExtremeSingle,
    monitoringRecommendation: getMonitoringRecommendation(riskLevel),
    clinicalResponse: getClinicalResponse(riskLevel),
    scoreableParameters: scoreableParameters.length,
  };
}

function isAlteredConsciousness(value: SymphonyVitalsInput['consciousness']): boolean {
  return value !== undefined && value !== 'alert' && value !== 'unknown';
}

function makeEarlyWarningMatch(
  patternId: string,
  patternName: string,
  severity: ClinicalEarlyWarningSeverity,
  condition: string,
  action: string,
  criteriaMet: string[],
  leadTime: string,
  clinicalBasis: string
): ClinicalEarlyWarningMatch {
  return {
    patternId,
    patternName,
    severity,
    condition,
    action,
    criteriaMet,
    leadTime,
    clinicalBasis,
  };
}

function checkSepsisPatterns(
  input: ClinicalTrajectoryIntelligenceInput,
  vitals: SymphonyVitalsInput,
  text: string,
  news2: ClinicalNEWS2Result
): ClinicalEarlyWarningMatch[] {
  const matches: ClinicalEarlyWarningMatch[] = [];
  const qsofaCriteria: string[] = [];
  if ((vitals.respiratoryRate ?? 0) >= 22)
    qsofaCriteria.push(`RR ${vitals.respiratoryRate}/menit >=22`);
  if ((vitals.systolicBp ?? 999) <= 100)
    qsofaCriteria.push(`Sistolik ${vitals.systolicBp} mmHg <=100`);
  if (isAlteredConsciousness(vitals.consciousness))
    qsofaCriteria.push(`Kesadaran berubah: ${vitals.consciousness}`);

  if (qsofaCriteria.length >= 2) {
    matches.push(
      makeEarlyWarningMatch(
        'SEPSIS_QSOFA',
        'qSOFA positif',
        'critical',
        `qSOFA ${qsofaCriteria.length}/3; suspek sepsis perlu dikaji segera`,
        'Evaluasi sumber infeksi, resusitasi sesuai kondisi, dan eskalasi/rujuk sesuai indikasi.',
        [...qsofaCriteria, `qSOFA skor: ${qsofaCriteria.length}/3`],
        'Sepsis mungkin sudah berlangsung - tindakan segera',
        'Sepsis-3 qSOFA bedside criteria; Jewel parity slice.'
      )
    );
  }

  const sirsCriteria: string[] = [];
  if (vitals.temperatureC !== undefined && (vitals.temperatureC > 38 || vitals.temperatureC < 36)) {
    sirsCriteria.push(`Suhu ${vitals.temperatureC}C`);
  }
  if ((vitals.heartRate ?? 0) > 90) sirsCriteria.push(`HR ${vitals.heartRate} bpm >90`);
  if ((vitals.respiratoryRate ?? 0) > 20)
    sirsCriteria.push(`RR ${vitals.respiratoryRate}/menit >20`);

  if (sirsCriteria.length >= 2 && hasInfectionContext(text, input.medicalHistory)) {
    matches.push(
      makeEarlyWarningMatch(
        'SEPSIS_SIRS',
        'SIRS + konteks infeksi',
        'high',
        'SIRS >=2 dengan konteks infeksi',
        'Monitoring ketat, evaluasi sumber infeksi, dan pertimbangkan eskalasi sesuai kondisi.',
        [...sirsCriteria, `SIRS skor: ${sirsCriteria.length}/3`],
        '5-48 jam sebelum sepsis berat bila tidak tertangani',
        'SIRS criteria; Jewel parity slice.'
      )
    );
  } else if (sirsCriteria.length >= 2 && news2.aggregateScore >= 4) {
    matches.push(
      makeEarlyWarningMatch(
        'SIRS_ELEVATED',
        'SIRS + NEWS2 elevasi',
        'warning',
        `SIRS >=2 dengan NEWS2 skor ${news2.aggregateScore}`,
        'Evaluasi sumber infeksi dan monitoring serial.',
        [...sirsCriteria, `NEWS2 aggregate: ${news2.aggregateScore}`],
        'Observasi - cari sumber infeksi',
        'SIRS criteria and NEWS2 aggregate risk; Jewel parity slice.'
      )
    );
  }

  return matches;
}

function checkRespiratoryDeterioration(
  vitals: SymphonyVitalsInput,
  text: string
): ClinicalEarlyWarningMatch | null {
  if (!/sesak|napas|asma|batuk|pneumoni|covid|paru|wheezing|mengi/i.test(text)) return null;

  const tachypnea = (vitals.respiratoryRate ?? 0) > 24;
  const lowSpo2 = (vitals.spo2 ?? 100) < 94;
  const tachycardia = (vitals.heartRate ?? 0) > 100;

  if (tachypnea && lowSpo2 && tachycardia) {
    return makeEarlyWarningMatch(
      'RESP_FAILURE_IMMINENT',
      'Deteriorasi respirasi berat',
      'critical',
      'Trias respirasi: takipnea + hipoksia + takikardia',
      'Oksigenasi segera, posisi optimal, terapi penyebab, dan rujuk emergensi bila sesuai indikasi.',
      [
        `RR ${vitals.respiratoryRate}/menit`,
        `SpO2 ${vitals.spo2}% <94`,
        `HR ${vitals.heartRate} bpm`,
      ],
      'Menit hingga jam sebelum gagal napas total',
      'Respiratory deterioration pathway; Jewel parity slice.'
    );
  }

  const count = [tachypnea, lowSpo2, tachycardia].filter(Boolean).length;
  if (count >= 2) {
    return makeEarlyWarningMatch(
      'RESP_DETERIORATION',
      'Deteriorasi respirasi',
      'high',
      'Deteriorasi respirasi - dua dari tiga tanda positif',
      'Oksigen bila hipoksemia, evaluasi penyebab, dan monitoring ketat.',
      [
        tachypnea ? `RR ${vitals.respiratoryRate}/menit` : '',
        lowSpo2 ? `SpO2 ${vitals.spo2}%` : '',
        tachycardia ? `HR ${vitals.heartRate} bpm` : '',
      ].filter(Boolean),
      'Jam sebelum deteriorasi signifikan',
      'Respiratory deterioration pathway; Jewel parity slice.'
    );
  }

  return null;
}

function calculateShockIndex(
  vitals: SymphonyVitalsInput | undefined
): ClinicalShockIndexResult | undefined {
  if (
    vitals?.heartRate === undefined ||
    vitals.systolicBp === undefined ||
    vitals.heartRate <= 0 ||
    vitals.systolicBp <= 0
  ) {
    return undefined;
  }

  const value = round(vitals.heartRate / vitals.systolicBp, 2);
  if (value < 0.9) return undefined;
  const severity: ClinicalEarlyWarningSeverity =
    value >= 1.2 ? 'critical' : value >= 1 ? 'high' : 'warning';
  return {
    value,
    severity,
    criteriaMet: [`Shock Index ${value} = HR ${vitals.heartRate} / SBP ${vitals.systolicBp}`],
  };
}

function makeSelectedPattern(
  id: ClinicalSelectedPatternId,
  gate: ClinicalSelectedPatternGate,
  severity: ClinicalEarlyWarningSeverity,
  title: string,
  reasoning: string,
  criteriaMet: string[],
  trajectoryIds: string[]
): ClinicalSelectedPatternMatch {
  return {
    id,
    gate,
    severity,
    title,
    reasoning,
    criteriaMet,
    trajectoryIds,
  };
}

function makeTrajectorySignal(
  id: ClinicalTrajectorySignalId,
  label: string,
  severity: ClinicalTrajectorySignalSeverity,
  rationale: string,
  evidence: string[]
): ClinicalTrajectorySignal {
  return {
    id,
    label,
    severity,
    rationale,
    evidence,
  };
}

function buildTreatmentResponseSignals(
  treatmentResponse: SymphonyTreatmentResponse | undefined
): ClinicalTrajectorySignal[] {
  if (!treatmentResponse?.detected) return [];

  if (
    treatmentResponse.interpretation === 'effective' ||
    treatmentResponse.interpretation === 'partially_effective'
  ) {
    return [
      makeTrajectorySignal(
        'T-51',
        'Respons terapi baik',
        treatmentResponse.interpretation === 'effective' ? 'low' : 'moderate',
        'Kecepatan perburukan turun setelah titik tengah observasi; gunakan sebagai evidence respons, bukan diagnosis otomatis.',
        [
          `Interpretasi: ${treatmentResponse.interpretation}`,
          `Velocity change ${treatmentResponse.velocityChangePercent}%`,
          treatmentResponse.narrative,
        ].filter(Boolean)
      ),
    ];
  }

  if (
    treatmentResponse.interpretation === 'ineffective' ||
    treatmentResponse.interpretation === 'worsening'
  ) {
    return [
      makeTrajectorySignal(
        'T-52',
        'Respons terapi buruk',
        treatmentResponse.interpretation === 'worsening' ? 'high' : 'moderate',
        'Trajectory belum menunjukkan perlambatan bermakna setelah terapi tercatat; perlu korelasi klinis dan review regimen.',
        [
          `Interpretasi: ${treatmentResponse.interpretation}`,
          `Velocity change ${treatmentResponse.velocityChangePercent}%`,
          treatmentResponse.narrative,
        ].filter(Boolean)
      ),
    ];
  }

  return [];
}

function buildRespiratoryTrajectorySignals(
  input: ClinicalTrajectoryIntelligenceInput,
  text: string
): ClinicalTrajectorySignal[] {
  const vitals = input.latestVitals;
  if (!vitals || !hasRespiratoryContext(text)) return [];

  const tachypnea = (vitals.respiratoryRate ?? 0) > 24;
  const lowSpo2 = (vitals.spo2 ?? 100) < 94;
  const tachycardia = (vitals.heartRate ?? 0) > 100;
  const evidence = [
    tachypnea ? `RR ${vitals.respiratoryRate}/menit` : '',
    lowSpo2 ? `SpO2 ${vitals.spo2}%` : '',
    tachycardia ? `HR ${vitals.heartRate} bpm` : '',
  ].filter(Boolean);

  if (evidence.length < 2) return [];

  const severity: ClinicalTrajectorySignalSeverity =
    tachypnea && lowSpo2 && tachycardia ? 'critical' : 'high';

  return [
    makeTrajectorySignal(
      'T-45',
      'Respiratory worsening concern',
      severity,
      'Konteks respirasi dengan takipnea, hipoksemia, atau takikardia mendukung respiratory worsening concern; perlu korelasi klinis dan monitoring serial.',
      evidence
    ),
  ];
}

function buildHemodynamicTrajectorySignals(
  shockIndex: ClinicalShockIndexResult | undefined
): ClinicalTrajectorySignal[] {
  if (!shockIndex) return [];

  const severity: ClinicalTrajectorySignalSeverity =
    shockIndex.severity === 'critical'
      ? 'critical'
      : shockIndex.severity === 'high'
        ? 'high'
        : 'moderate';

  return [
    makeTrajectorySignal(
      'T-46',
      'Hemodynamic instability concern',
      severity,
      'Shock Index non-rendah mendukung hemodynamic instability concern; perlu korelasi klinis, evaluasi perfusi, dan monitoring serial.',
      shockIndex.criteriaMet
    ),
  ];
}

function buildCardiovascularShockTrajectorySignals(
  shockIndex: ClinicalShockIndexResult | undefined,
  selectedPatterns: ClinicalSelectedPatternMatch[]
): ClinicalTrajectorySignal[] {
  const shockPatterns = selectedPatterns.filter(
    (pattern) => pattern.trajectoryIds.includes('T-59') && pattern.gate === 'GATE_SHOCK_INDEX'
  );
  if (shockPatterns.length === 0) return [];

  const hasCritical = shockPatterns.some((pattern) => pattern.severity === 'critical');
  const hasHigh = shockPatterns.some((pattern) => pattern.severity === 'high');
  const severity: ClinicalTrajectorySignalSeverity =
    hasCritical || shockIndex?.severity === 'critical'
      ? 'critical'
      : hasHigh || shockIndex?.severity === 'high'
        ? 'high'
        : 'moderate';
  const selectedPatternEvidence = uniqueStrings(
    shockPatterns.map((pattern) => `Selected CP ${pattern.id}`)
  ).slice(0, 3);
  const criteriaEvidence = uniqueStrings([
    ...(shockIndex?.criteriaMet ?? []),
    ...shockPatterns.flatMap((pattern) => pattern.criteriaMet),
  ]).slice(0, 4);

  return [
    makeTrajectorySignal(
      'T-59',
      'Cardiovascular shock trajectory concern',
      severity,
      'Selected CP Shock Index dengan parameter hemodinamik abnormal mendukung cardiovascular shock trajectory concern; perlu korelasi perfusi dan monitoring serial, bukan diagnosis otomatis.',
      [...selectedPatternEvidence, ...criteriaEvidence]
    ),
  ];
}

function buildImminentCardiacArrestTrajectorySignals(
  selectedPatterns: ClinicalSelectedPatternMatch[]
): ClinicalTrajectorySignal[] {
  const criticalCollapsePatterns = selectedPatterns.filter(
    (pattern) => pattern.trajectoryIds.includes('T-13') && pattern.severity === 'critical'
  );
  if (criticalCollapsePatterns.length === 0) return [];

  const selectedPatternEvidence = uniqueStrings(
    criticalCollapsePatterns.map((pattern) => `Selected CP ${pattern.id}`)
  ).slice(0, 3);
  const criteriaEvidence = uniqueStrings(
    criticalCollapsePatterns.flatMap((pattern) => pattern.criteriaMet)
  ).slice(0, 4);

  return [
    makeTrajectorySignal(
      'T-13',
      'Imminent cardiac arrest proxy concern',
      'critical',
      'Selected CP critical dengan trajectory collapse-risk mendukung imminent cardiac arrest proxy concern; gunakan untuk prioritas review segera, bukan diagnosis otomatis.',
      [...selectedPatternEvidence, ...criteriaEvidence]
    ),
  ];
}

function buildFeverTrajectorySignals(
  input: ClinicalTrajectoryIntelligenceInput
): ClinicalTrajectorySignal[] {
  const feverCount = input.earlyWarningBurden?.breachBreakdown.tempGe385Count ?? 0;
  const latestTemperature = input.latestVitals?.temperatureC;
  if (feverCount <= 0 && (latestTemperature === undefined || latestTemperature < 38)) return [];

  const severity: ClinicalTrajectorySignalSeverity =
    (latestTemperature ?? 0) >= 40 || feverCount >= 3
      ? 'critical'
      : feverCount >= 2
        ? 'high'
        : 'moderate';
  const evidence = [
    feverCount > 0 ? `Suhu >=38.5C pada ${feverCount} titik` : '',
    latestTemperature !== undefined ? `Suhu terbaru ${latestTemperature}C` : '',
  ].filter(Boolean);

  return [
    makeTrajectorySignal(
      'T-54',
      'Fever burden concern',
      severity,
      'Beban demam serial mendukung fever burden concern; perlu korelasi sumber infeksi/inflamasi dan monitoring serial.',
      evidence
    ),
  ];
}

function buildNews2TrajectorySignals(news2: ClinicalNEWS2Result): ClinicalTrajectorySignal[] {
  if (news2.scoreableParameters < 2 || news2.riskLevel === 'low') return [];

  const severity: ClinicalTrajectorySignalSeverity =
    news2.riskLevel === 'high' ? 'high' : news2.riskLevel === 'medium' ? 'moderate' : 'low';
  const activeParameters = news2.parameterScores
    .filter((item) => item.score > 0)
    .map((item) => `${item.parameter} ${item.value} (${item.score})`)
    .slice(0, 4);

  return [
    makeTrajectorySignal(
      'T-50',
      'NEWS2 aggregate proxy concern',
      severity,
      'NEWS2 aggregate non-rendah mendukung proxy acute deterioration burden; gunakan sebagai prioritas review, bukan diagnosis otomatis.',
      [
        `NEWS2 aggregate ${news2.aggregateScore}`,
        `Risk level ${news2.riskLevel}`,
        ...activeParameters,
      ]
    ),
  ];
}

function buildSepsisNoReturnTrajectorySignals(
  news2: ClinicalNEWS2Result,
  selectedPatterns: ClinicalSelectedPatternMatch[]
): ClinicalTrajectorySignal[] {
  const sepsisPatterns = selectedPatterns.filter(
    (pattern) =>
      pattern.trajectoryIds.includes('T-16') &&
      (pattern.gate === 'GATE_SEPSIS_EARLY' || pattern.gate === 'GATE_SEPTIC_SHOCK_HIGH')
  );
  if (sepsisPatterns.length === 0) return [];

  const hasCritical = sepsisPatterns.some((pattern) => pattern.severity === 'critical');
  const hasHigh = sepsisPatterns.some((pattern) => pattern.severity === 'high');
  const severity: ClinicalTrajectorySignalSeverity = hasCritical
    ? 'critical'
    : hasHigh || news2.riskLevel === 'high'
      ? 'high'
      : 'moderate';
  const selectedPatternEvidence = uniqueStrings(
    sepsisPatterns.map((pattern) => `Selected CP ${pattern.id}`)
  ).slice(0, 3);
  const criteriaEvidence = uniqueStrings(
    sepsisPatterns.flatMap((pattern) => pattern.criteriaMet)
  ).slice(0, 3);

  return [
    makeTrajectorySignal(
      'T-16',
      'Sepsis no-return proxy concern',
      severity,
      'Selected CP sepsis/infeksi dengan NEWS2 non-rendah mendukung sepsis no-return proxy concern; gunakan untuk prioritas review, bukan diagnosis otomatis.',
      [
        ...selectedPatternEvidence,
        `NEWS2 aggregate ${news2.aggregateScore}`,
        `Risk level ${news2.riskLevel}`,
        ...criteriaEvidence,
      ]
    ),
  ];
}

function buildContextTrajectorySignals(
  input: ClinicalTrajectoryIntelligenceInput
): ClinicalTrajectorySignal[] {
  const signals: ClinicalTrajectorySignal[] = [];
  const context = input.longitudinalContext;
  if (!context) return signals;

  if (context.hasDiabetes && (context.hasChronicKidney || context.hasRenalHistory)) {
    signals.push(
      makeTrajectorySignal(
        'T-25',
        'DM-to-renal baseline proxy',
        'moderate',
        'Riwayat DM dengan CKD/renal history mendukung baseline renal-risk proxy; tidak menyimpulkan ESRD tanpa data renal/lab.',
        [
          'Riwayat diabetes terdeteksi',
          context.hasChronicKidney ? 'Riwayat CKD terdeteksi' : 'Terminologi renal terdeteksi',
        ]
      )
    );
  }

  if (context.visitCount >= 4 && (context.spanDays ?? 999) <= 30) {
    signals.push(
      makeTrajectorySignal(
        'T-38',
        '30-day readmission risk proxy',
        context.repeatedDiagnosisCount >= 2 ? 'high' : 'moderate',
        'Frekuensi kunjungan berulang dalam 30 hari mendukung proxy risiko revisit/readmission; gunakan sebagai prioritas follow-up.',
        [
          `${context.visitCount} kunjungan dalam ${context.spanDays} hari`,
          `Diagnosis berulang ${context.repeatedDiagnosisCount} kali`,
        ]
      )
    );
  }

  if (
    (input.ageYears ?? 0) >= 65 &&
    input.mortalityProxy &&
    (input.mortalityProxy.score >= 25 || input.mortalityProxy.clinicalUrgencyTier !== 'low')
  ) {
    signals.push(
      makeTrajectorySignal(
        'T-58',
        'Mortality risk usia lanjut proxy',
        input.mortalityProxy.score >= 50 ? 'high' : 'moderate',
        'Usia lanjut dikombinasikan dengan mortality proxy non-rendah menaikkan prioritas review; bukan prediksi mortalitas individual.',
        [
          `Usia ${input.ageYears} tahun`,
          `Mortality proxy ${input.mortalityProxy.score}/100`,
          `Urgency ${input.mortalityProxy.clinicalUrgencyTier}`,
        ]
      )
    );
  }

  return signals;
}

function buildSelectedParityPatterns(
  input: ClinicalTrajectoryIntelligenceInput,
  text: string,
  shockIndex: ClinicalShockIndexResult | undefined
): ClinicalSelectedPatternMatch[] {
  const vitals = input.latestVitals;
  if (!vitals) return [];

  const matches: ClinicalSelectedPatternMatch[] = [];
  const qsofaCriteria = [
    (vitals.respiratoryRate ?? 0) >= 22 ? `RR ${vitals.respiratoryRate} >= 22` : '',
    (vitals.systolicBp ?? 999) <= 100 ? `SBP ${vitals.systolicBp} <= 100` : '',
    isAlteredConsciousness(vitals.consciousness) ? `AVPU ${vitals.consciousness}` : '',
  ].filter(Boolean);
  const infectionContext = hasInfectionContext(text, input.medicalHistory);

  if (qsofaCriteria.length >= 2) {
    matches.push(
      makeSelectedPattern(
        'CP-001',
        'GATE_SEPSIS_EARLY',
        'high',
        'Sepsis suspected - qSOFA',
        'qSOFA >=2 berdasarkan RR, SBP, atau kesadaran.',
        qsofaCriteria,
        ['T-16', 'T-50']
      )
    );
    if (infectionContext) {
      matches.push(
        makeSelectedPattern(
          'CP-002',
          'GATE_SEPSIS_EARLY',
          'critical',
          'Sepsis suspected + tanda infeksi',
          'qSOFA >=2 dengan dugaan infeksi aktif.',
          [...qsofaCriteria, 'Konteks infeksi/demam'],
          ['T-16', 'T-50', 'T-58']
        )
      );
    }
  }

  if (
    (vitals.temperatureC ?? 0) >= 38 &&
    (vitals.heartRate ?? 0) > 90 &&
    (vitals.respiratoryRate ?? 0) >= 20
  ) {
    matches.push(
      makeSelectedPattern(
        'CP-003',
        'GATE_SEPSIS_EARLY',
        'warning',
        'Infeksi sistemik / sepsis awal',
        'Demam + HR >90 + RR >=20 mendukung burden infeksi sistemik.',
        [`Temp ${vitals.temperatureC}`, `HR ${vitals.heartRate}`, `RR ${vitals.respiratoryRate}`],
        ['T-54', 'T-16', 'T-50']
      )
    );
  }

  if (shockIndex) {
    if (shockIndex.value >= 1.2) {
      matches.push(
        makeSelectedPattern(
          'CP-010',
          'GATE_SHOCK_INDEX',
          'critical',
          'Syok hemodinamik - Shock Index',
          'Shock Index >=1.2 memberi sinyal instabilitas hemodinamik berat.',
          shockIndex.criteriaMet,
          ['T-46', 'T-59', 'T-13']
        )
      );
    } else if (shockIndex.value >= 1) {
      matches.push(
        makeSelectedPattern(
          'CP-009',
          'GATE_SHOCK_INDEX',
          'high',
          'Hemodynamic instability - Shock Index',
          'Shock Index >=1.0 memberi sinyal instabilitas hemodinamik.',
          shockIndex.criteriaMet,
          ['T-46', 'T-59']
        )
      );
    } else {
      matches.push(
        makeSelectedPattern(
          'CP-008',
          'GATE_SHOCK_INDEX',
          'warning',
          'Hemodynamic risk - Shock Index',
          'Shock Index >=0.9 memberi sinyal risiko hemodinamik.',
          shockIndex.criteriaMet,
          ['T-46']
        )
      );
    }
  }

  if (
    (vitals.heartRate ?? 0) >= 120 &&
    (vitals.systolicBp ?? 999) >= 60 &&
    (vitals.systolicBp ?? 999) <= 100
  ) {
    matches.push(
      makeSelectedPattern(
        'CP-011',
        'GATE_SHOCK_INDEX',
        'critical',
        'Shock concern - HR + SBP',
        'HR >=120 dengan SBP 60-100 memberi sinyal syok klinis.',
        [`HR ${vitals.heartRate} >=120`, `SBP ${vitals.systolicBp} 60-100`],
        ['T-46', 'T-59', 'T-13']
      )
    );
  }

  if ((vitals.respiratoryRate ?? 0) >= 30 && (vitals.spo2 ?? 100) < 90) {
    matches.push(
      makeSelectedPattern(
        'CP-012',
        'GATE_RESP_FAILURE',
        'critical',
        'Respiratory failure concern akut',
        'RR >=30 dengan SpO2 <90%.',
        [`RR ${vitals.respiratoryRate} >=30`, `SpO2 ${vitals.spo2} <90`],
        ['T-45', 'T-13']
      )
    );
  }

  if ((vitals.respiratoryRate ?? 0) >= 25 && (vitals.spo2 ?? 100) < 94) {
    matches.push(
      makeSelectedPattern(
        'CP-013',
        'GATE_RESP_FAILURE',
        'high',
        'Distress respirasi',
        'RR >=25 dengan SpO2 <94%.',
        [`RR ${vitals.respiratoryRate} >=25`, `SpO2 ${vitals.spo2} <94`],
        ['T-45', 'T-50']
      )
    );
  }

  if (
    hasRespiratoryContext(text) &&
    (vitals.respiratoryRate ?? 0) >= 25 &&
    ((vitals.spo2 ?? 100) < 92 || isAlteredConsciousness(vitals.consciousness))
  ) {
    matches.push(
      makeSelectedPattern(
        'CP-014',
        'GATE_RESP_FAILURE',
        'critical',
        'Respiratory failure concern - distress klinis',
        'RR >=25 dengan SpO2 rendah atau perubahan kesadaran mendukung respiratory failure concern.',
        [
          `RR ${vitals.respiratoryRate} >=25`,
          (vitals.spo2 ?? 100) < 92 ? `SpO2 ${vitals.spo2} <92` : '',
          isAlteredConsciousness(vitals.consciousness) ? `Kesadaran ${vitals.consciousness}` : '',
        ].filter(Boolean),
        ['T-45', 'T-13']
      )
    );
  }

  if (
    hasChestPainContext(text) &&
    ((vitals.heartRate ?? 0) > 100 || (vitals.systolicBp ?? 0) >= 160)
  ) {
    matches.push(
      makeSelectedPattern(
        'CP-063',
        'GATE_ACS',
        'high',
        'Aritmia/ACS concern - nyeri dada + vital abnormal',
        'Nyeri dada/palpitasi dengan HR atau SBP abnormal mendukung review kardiak.',
        [
          'Konteks nyeri dada/palpitasi',
          (vitals.heartRate ?? 0) > 100 ? `HR ${vitals.heartRate} >100` : '',
          (vitals.systolicBp ?? 0) >= 160 ? `SBP ${vitals.systolicBp} >=160` : '',
        ].filter(Boolean),
        ['T-46', 'T-59', 'T-13']
      )
    );
  }

  if ((input.ageYears ?? 0) >= 65 && isAlteredConsciousness(vitals.consciousness)) {
    matches.push(
      makeSelectedPattern(
        'CP-064',
        'GATE_SEPSIS_EARLY',
        'high',
        'Delirium concern pada lansia',
        'Usia lanjut dengan perubahan kesadaran perlu review serius meski vital parsial.',
        [`Usia ${input.ageYears} tahun`, `Kesadaran ${vitals.consciousness}`],
        ['T-58', 'T-16', 'T-50']
      )
    );
  }

  if (
    input.longitudinalContext?.hasDiabetes === true &&
    hasDiabeticInfectionContext(text) &&
    ((vitals.temperatureC ?? 0) >= 37.8 || (vitals.glucoseMgDl ?? 0) >= 200)
  ) {
    matches.push(
      makeSelectedPattern(
        'CP-066',
        'GATE_SEPSIS_EARLY',
        'warning',
        'Tissue infection concern pada DM - review komplikasi',
        'DM dengan konteks luka/infeksi dan demam ringan atau hiperglikemia mendukung review infeksi.',
        [
          'Riwayat/konteks DM',
          (vitals.temperatureC ?? 0) >= 37.8 ? `Temp ${vitals.temperatureC} >=37.8` : '',
          (vitals.glucoseMgDl ?? 0) >= 200 ? `Glucose ${vitals.glucoseMgDl} >=200` : '',
        ].filter(Boolean),
        ['T-25', 'T-16', 'T-38']
      )
    );
  }

  const severityOrder: Record<ClinicalEarlyWarningSeverity, number> = {
    critical: 0,
    high: 1,
    warning: 2,
  };
  return matches.sort(
    (left, right) => severityOrder[left.severity] - severityOrder[right.severity]
  );
}

export function buildClinicalTrajectoryIntelligence(
  input: ClinicalTrajectoryIntelligenceInput
): ClinicalTrajectoryIntelligenceResult {
  const news2 = calculateClinicalNEWS2(input.latestVitals, input.hasCOPD);
  const text = normalizeClinicalText(input);
  const shockIndex = calculateShockIndex(input.latestVitals);
  const selectedPatterns = buildSelectedParityPatterns(input, text, shockIndex);
  const earlyWarnings = input.latestVitals
    ? [
        ...checkSepsisPatterns(input, input.latestVitals, text, news2),
        checkRespiratoryDeterioration(input.latestVitals, text),
      ].filter((item): item is ClinicalEarlyWarningMatch => item !== null)
    : [];
  const severityOrder: Record<ClinicalEarlyWarningSeverity, number> = {
    critical: 0,
    high: 1,
    warning: 2,
  };

  return {
    news2,
    earlyWarnings: earlyWarnings.sort(
      (left, right) => severityOrder[left.severity] - severityOrder[right.severity]
    ),
    selectedPatterns,
    trajectorySignals: [
      ...buildRespiratoryTrajectorySignals(input, text),
      ...buildHemodynamicTrajectorySignals(shockIndex),
      ...buildCardiovascularShockTrajectorySignals(shockIndex, selectedPatterns),
      ...buildImminentCardiacArrestTrajectorySignals(selectedPatterns),
      ...buildFeverTrajectorySignals(input),
      ...buildNews2TrajectorySignals(news2),
      ...buildSepsisNoReturnTrajectorySignals(news2, selectedPatterns),
      ...buildTreatmentResponseSignals(input.treatmentResponse),
      ...buildContextTrajectorySignals(input),
    ],
    shockIndex,
  };
}
