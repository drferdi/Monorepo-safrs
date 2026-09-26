import type {
  ClinicalSafeOutput,
  ClinicalUrgencyTier,
  RiskLevel,
  TimeToCriticalEstimate,
  TrajectoryAnalysis,
  TrajectoryRecommendation,
} from './trajectory-analyzer';

const PHYSICIAN_TEXT_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bcritical trajectory\b/gi, replacement: 'significant clinical trajectory concern' },
  { pattern: /\bdrifting momentum\b/gi, replacement: 'unstable trend pattern' },
  {
    pattern: /\btreatment response ineffective\b/gi,
    replacement: 'limited improvement after prior treatment',
  },
  { pattern: /\bjewel physiology\b/gi, replacement: 'pola fisiologis' },
  { pattern: /\bdeath\b/gi, replacement: 'severe outcome' },
  { pattern: /\bacute peak\b/gi, replacement: 'acute physiology concern' },
  { pattern: /\bdrifting\b/gi, replacement: 'unstable' },
  { pattern: /\bineffective\b/gi, replacement: 'limited response' },
];

export const FORBIDDEN_PHYSICIAN_TRAJECTORY_PATTERNS: RegExp[] = [
  /\bdeath\b/i,
  /\bcritical trajectory\b/i,
  /\bDRIFTING\b/i,
  /\bineffective\b/i,
  /\bacute peak\b/i,
];

export interface PhysicianSafeTrajectoryPresentation {
  summary: string;
  recommendedAction: string;
  drivers: string[];
  missingData: string[];
  recommendations: TrajectoryRecommendation[];
  urgencyTier: ClinicalUrgencyTier;
  timeSensitiveReview: {
    sectionTitle: string;
    entries: Array<{
      key: keyof TimeToCriticalEstimate;
      label: string;
      hours: number;
    }>;
  };
  showPrognosticProxy: false;
}

function normalizePresentationText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function urgencyFromRisk(risk: RiskLevel, score: number): ClinicalUrgencyTier {
  if (risk === 'critical' || score >= 80) return 'immediate';
  if (risk === 'high' || score >= 60) return 'high';
  if (risk === 'moderate' || score >= 40) return 'moderate';
  return 'low';
}

function timeSensitiveLabel(key: keyof TimeToCriticalEstimate): string {
  return key.replace('_hours_to_critical', '').replace(/_/g, ' ').trim().toUpperCase();
}

export function sanitizeTrajectoryPresentationText(text: string): string {
  let next = text;
  for (const { pattern, replacement } of PHYSICIAN_TEXT_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  return normalizePresentationText(next);
}

export function sanitizeTrajectoryPresentationLines(lines: string[]): string[] {
  return uniqueStrings(lines.map((line) => sanitizeTrajectoryPresentationText(line)));
}

export function sanitizeTrajectoryRecommendations(
  recommendations: TrajectoryRecommendation[]
): TrajectoryRecommendation[] {
  return recommendations.map((recommendation) => ({
    ...recommendation,
    text: sanitizeTrajectoryPresentationText(recommendation.text),
  }));
}

export function findForbiddenPhysicianTrajectoryTerms(text: string): string[] {
  return FORBIDDEN_PHYSICIAN_TRAJECTORY_PATTERNS.filter((pattern) => pattern.test(text)).map(
    (pattern) => pattern.source
  );
}

export function serializePhysicianSafeTrajectoryPresentation(
  presentation: PhysicianSafeTrajectoryPresentation
): string {
  return [
    presentation.summary,
    presentation.recommendedAction,
    ...presentation.drivers,
    ...presentation.missingData,
    ...presentation.recommendations.map((item) => item.text),
    ...presentation.timeSensitiveReview.entries.map((item) => `${item.label}: ${item.hours}h`),
  ].join(' | ');
}

export function buildPhysicianSafeTrajectoryPresentation(
  analysis: Pick<
    TrajectoryAnalysis,
    'summary' | 'clinical_safe_output' | 'recommendations' | 'global_deterioration' | 'overallRisk' | 'time_to_critical_estimate'
  >
): PhysicianSafeTrajectoryPresentation {
  const clinicalSafeOutput: ClinicalSafeOutput = analysis.clinical_safe_output;
  const summary = sanitizeTrajectoryPresentationText(analysis.summary);
  const recommendedAction = sanitizeTrajectoryPresentationText(
    clinicalSafeOutput.recommended_action
  );
  const drivers = sanitizeTrajectoryPresentationLines(clinicalSafeOutput.drivers);
  const recommendations = sanitizeTrajectoryRecommendations(analysis.recommendations);
  const timeSensitiveEntries = Object.entries(analysis.time_to_critical_estimate)
    .filter((entry): entry is [keyof TimeToCriticalEstimate, number] => entry[1] !== null)
    .map(([key, hours]) => ({
      key,
      label: timeSensitiveLabel(key),
      hours,
    }));

  return {
    summary,
    recommendedAction,
    drivers,
    missingData: sanitizeTrajectoryPresentationLines(clinicalSafeOutput.missing_data),
    recommendations,
    urgencyTier: urgencyFromRisk(
      clinicalSafeOutput.risk_tier,
      analysis.global_deterioration.deterioration_score
    ),
    timeSensitiveReview: {
      sectionTitle: 'TIME TO CRITICAL',
      entries: timeSensitiveEntries,
    },
    showPrognosticProxy: false,
  };
}
