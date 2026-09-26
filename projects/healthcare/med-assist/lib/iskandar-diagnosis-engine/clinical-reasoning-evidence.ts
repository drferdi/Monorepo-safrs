import type { ClinicalTrajectorySignal } from './clinical-trajectory-intelligence';
import type {
  HybridTrajectoryRedFlag,
  HybridTrajectoryResult,
} from './hybrid-trajectory';
import type {
  PriorityTrajectoryCoverageItem,
  TrajectoryDriverContribution,
  TrajectoryVisualizationViewModel,
} from './trajectory-visualization-view-model';

export type ClinicalReasoningFactKey =
  | 'respiratory_worsening'
  | 'hemodynamic_instability'
  | 'shock_watch'
  | 'critical_deterioration'
  | 'infection_or_physiologic_burden'
  | 'treatment_response_good'
  | 'treatment_response_poor'
  | 'baseline_or_planning_risk_context';

export type ClinicalReasoningFactCategory =
  | 'acute_deterioration'
  | 'infection_or_physiologic_burden'
  | 'treatment_response'
  | 'baseline_planning_context';

export type ClinicalReasoningFactSeverity = 'low' | 'moderate' | 'high' | 'critical';

export interface ClinicalFact {
  key: ClinicalReasoningFactKey;
  label: string;
  category: ClinicalReasoningFactCategory;
  severity: ClinicalReasoningFactSeverity;
  value: true;
  acuteDeterioration: boolean;
  trajectoryIds: string[];
  evidence: string[];
  sourceRefs: string[];
}

export interface ReasoningEvidenceSourceMapEntry {
  sourceRef: string;
  targetFactKeys: ClinicalReasoningFactKey[];
}

export interface ReasoningEvidencePack {
  clinicalFacts: ClinicalFact[];
  activeTrajectorySignals: ClinicalTrajectorySignal[];
  redFlags: HybridTrajectoryRedFlag[];
  driverContributions: TrajectoryDriverContribution[];
  missingCriticalInputs: string[];
  trajectoryCoverage: PriorityTrajectoryCoverageItem[];
  sourceMap: ReasoningEvidenceSourceMapEntry[];
  safetyDominance: {
    criticalAlert: boolean;
    mustNotMissPresent: boolean;
    unstablePatient: boolean;
    treatmentResponseConflict: boolean;
  };
  therapySupportReady: false;
  therapySupportRequirement: 'physician_selected_working_diagnosis_required';
}

export interface BuildReasoningEvidencePackInput {
  hybridResult: HybridTrajectoryResult;
  viewModel: TrajectoryVisualizationViewModel;
}

type SignalToFactRule = {
  key: ClinicalReasoningFactKey;
  label: string;
  category: ClinicalReasoningFactCategory;
  acuteDeterioration: boolean;
};

const SIGNAL_FACT_RULES: Record<string, SignalToFactRule[]> = {
  'T-45': [
    {
      key: 'respiratory_worsening',
      label: 'Respiratory worsening',
      category: 'acute_deterioration',
      acuteDeterioration: true,
    },
  ],
  'T-46': [
    {
      key: 'hemodynamic_instability',
      label: 'Hemodynamic instability',
      category: 'acute_deterioration',
      acuteDeterioration: true,
    },
  ],
  'T-59': [
    {
      key: 'shock_watch',
      label: 'Shock watch',
      category: 'acute_deterioration',
      acuteDeterioration: true,
    },
  ],
  'T-13': [
    {
      key: 'critical_deterioration',
      label: 'Critical deterioration support',
      category: 'acute_deterioration',
      acuteDeterioration: true,
    },
  ],
  'T-16': [
    {
      key: 'infection_or_physiologic_burden',
      label: 'Infection or physiologic burden',
      category: 'infection_or_physiologic_burden',
      acuteDeterioration: true,
    },
  ],
  'T-54': [
    {
      key: 'infection_or_physiologic_burden',
      label: 'Infection or physiologic burden',
      category: 'infection_or_physiologic_burden',
      acuteDeterioration: true,
    },
  ],
  'T-50': [
    {
      key: 'infection_or_physiologic_burden',
      label: 'Infection or physiologic burden',
      category: 'infection_or_physiologic_burden',
      acuteDeterioration: true,
    },
  ],
  'T-51': [
    {
      key: 'treatment_response_good',
      label: 'Treatment response good',
      category: 'treatment_response',
      acuteDeterioration: false,
    },
  ],
  'T-52': [
    {
      key: 'treatment_response_poor',
      label: 'Treatment response poor',
      category: 'treatment_response',
      acuteDeterioration: true,
    },
  ],
  'T-25': [
    {
      key: 'baseline_or_planning_risk_context',
      label: 'Baseline or planning risk context',
      category: 'baseline_planning_context',
      acuteDeterioration: false,
    },
  ],
  'T-38': [
    {
      key: 'baseline_or_planning_risk_context',
      label: 'Baseline or planning risk context',
      category: 'baseline_planning_context',
      acuteDeterioration: false,
    },
  ],
  'T-58': [
    {
      key: 'baseline_or_planning_risk_context',
      label: 'Baseline or planning risk context',
      category: 'baseline_planning_context',
      acuteDeterioration: false,
    },
  ],
};

const SEVERITY_RANK: Record<ClinicalReasoningFactSeverity, number> = {
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function mergeSeverity(
  current: ClinicalReasoningFactSeverity,
  next: ClinicalReasoningFactSeverity
): ClinicalReasoningFactSeverity {
  return SEVERITY_RANK[next] > SEVERITY_RANK[current] ? next : current;
}

function isActiveSignal(signal: ClinicalTrajectorySignal): boolean {
  return signal.severity !== 'low' || signal.id === 'T-51' || signal.id === 'T-25';
}

function appendSourceMap(
  sourceMap: Map<string, Set<ClinicalReasoningFactKey>>,
  sourceRef: string,
  factKey: ClinicalReasoningFactKey
): void {
  const current = sourceMap.get(sourceRef) ?? new Set<ClinicalReasoningFactKey>();
  current.add(factKey);
  sourceMap.set(sourceRef, current);
}

function buildClinicalFacts(
  signals: ClinicalTrajectorySignal[]
): {
  facts: ClinicalFact[];
  sourceMap: ReasoningEvidenceSourceMapEntry[];
} {
  const factByKey = new Map<ClinicalReasoningFactKey, ClinicalFact>();
  const sourceMap = new Map<string, Set<ClinicalReasoningFactKey>>();

  for (const signal of signals) {
    const rules = SIGNAL_FACT_RULES[signal.id] ?? [];
    for (const rule of rules) {
      const sourceRef = `trajectory_signal:${signal.id}`;
      const current = factByKey.get(rule.key);
      const nextEvidence = uniqueStrings([
        ...(current?.evidence ?? []),
        signal.rationale,
        ...signal.evidence,
      ]);
      const nextSourceRefs = uniqueStrings([...(current?.sourceRefs ?? []), sourceRef]);
      const nextTrajectoryIds = uniqueStrings([...(current?.trajectoryIds ?? []), signal.id]);

      factByKey.set(rule.key, {
        key: rule.key,
        label: rule.label,
        category: rule.category,
        severity: current ? mergeSeverity(current.severity, signal.severity) : signal.severity,
        value: true,
        acuteDeterioration: current
          ? current.acuteDeterioration || rule.acuteDeterioration
          : rule.acuteDeterioration,
        trajectoryIds: nextTrajectoryIds,
        evidence: nextEvidence,
        sourceRefs: nextSourceRefs,
      });
      appendSourceMap(sourceMap, sourceRef, rule.key);
    }
  }

  return {
    facts: Array.from(factByKey.values()),
    sourceMap: Array.from(sourceMap.entries()).map(([sourceRef, targetFactKeys]) => ({
      sourceRef,
      targetFactKeys: Array.from(targetFactKeys),
    })),
  };
}

export function buildReasoningEvidencePackFromTrajectoryV2({
  hybridResult,
  viewModel,
}: BuildReasoningEvidencePackInput): ReasoningEvidencePack {
  const activeTrajectorySignals = hybridResult.clinicalIntelligence.trajectorySignals.filter(
    isActiveSignal
  );
  const { facts, sourceMap } = buildClinicalFacts(activeTrajectorySignals);
  const factKeys = new Set(facts.map((fact) => fact.key));

  return {
    clinicalFacts: facts,
    activeTrajectorySignals,
    redFlags: hybridResult.redFlags,
    driverContributions: viewModel.keyDriverContributions,
    missingCriticalInputs: uniqueStrings([
      ...hybridResult.missingDataWarnings,
      ...hybridResult.uncertaintyNotes,
      ...viewModel.dataQualityWarnings,
      ...viewModel.uncertaintyNotes,
      ...viewModel.vitalTrendMeta.missingVitalWarnings,
    ]),
    trajectoryCoverage: viewModel.priorityTrajectoryCoverage,
    sourceMap,
    safetyDominance: {
      criticalAlert:
        hybridResult.redFlags.some((flag) => flag.severity === 'critical') ||
        factKeys.has('critical_deterioration'),
      mustNotMissPresent: factKeys.has('critical_deterioration') || factKeys.has('shock_watch'),
      unstablePatient: facts.some(
        (fact) =>
          fact.acuteDeterioration &&
          (fact.severity === 'high' || fact.severity === 'critical')
      ),
      treatmentResponseConflict:
        factKeys.has('treatment_response_good') && factKeys.has('treatment_response_poor'),
    },
    therapySupportReady: false,
    therapySupportRequirement: 'physician_selected_working_diagnosis_required',
  };
}
