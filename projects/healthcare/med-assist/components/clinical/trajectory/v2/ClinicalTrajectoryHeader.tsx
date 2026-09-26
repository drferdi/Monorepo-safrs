import type { HybridTrajectoryResult } from '@/lib/iskandar-diagnosis-engine/hybrid-trajectory';
import {
  sanitizeTrajectoryPresentationText,
  type PhysicianSafeTrajectoryPresentation,
} from '@/lib/iskandar-diagnosis-engine/presentation-safety';

const STATE_META: Record<
  HybridTrajectoryResult['integratedAssessment']['finalState'],
  { label: string }
> = {
  improving: { label: 'Membaik' },
  stable: { label: 'Stabil' },
  deteriorating: { label: 'Perlu perhatian' },
  critical: { label: 'Prioritas tinggi' },
};

const URGENCY_META: Record<PhysicianSafeTrajectoryPresentation['urgencyTier'], { label: string }> =
  {
    low: { label: 'Review rutin 24 jam' },
    moderate: { label: 'Review hari ini' },
    high: { label: 'Review segera < 6 jam' },
    immediate: { label: 'Review segera sekarang' },
  };

function stripTrailingDetails(text: string): string {
  return text
    .replace(/[:.;].*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function lowerCaseFirst(text: string): string {
  if (!text) return text;
  return `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function buildMainConcern(
  hybridResult: HybridTrajectoryResult,
  physicianPresentation: PhysicianSafeTrajectoryPresentation
): string {
  const redFlagTitle = hybridResult.redFlags[0]?.title;
  if (redFlagTitle) {
    return `Perhatian pada ${lowerCaseFirst(stripTrailingDetails(sanitizeTrajectoryPresentationText(redFlagTitle)))}`;
  }

  const primaryDriver = physicianPresentation.drivers[0];
  if (primaryDriver) {
    return capitalizeFirst(stripTrailingDetails(sanitizeTrajectoryPresentationText(primaryDriver)));
  }

  if (hybridResult.integratedAssessment.finalState === 'improving') {
    return 'Perubahan saat ini masih memerlukan korelasi klinis';
  }

  if (hybridResult.integratedAssessment.finalState === 'stable') {
    return 'Belum ada sinyal dominan yang menonjol';
  }

  return 'Perlu korelasi klinis segera pada perubahan pola saat ini';
}

function buildClinicalMeaning(
  hybridResult: HybridTrajectoryResult,
  physicianPresentation: PhysicianSafeTrajectoryPresentation
): string {
  const { finalState, confidence } = hybridResult.integratedAssessment;

  let summary = 'Pola saat ini perlu korelasi klinis terarah';
  if (finalState === 'improving') {
    summary = 'Pola saat ini cenderung membaik';
  } else if (finalState === 'stable') {
    summary = 'Pola saat ini relatif stabil';
  } else if (finalState === 'deteriorating') {
    summary = 'Pola memburuk pada kunjungan ini';
  } else if (finalState === 'critical') {
    summary = 'Pola saat ini memerlukan perhatian terhadap deteriorasi klinis';
  }

  if (confidence < 0.6 || physicianPresentation.urgencyTier === 'moderate') {
    return `${summary}. Verifikasi dengan pemeriksaan langsung.`;
  }

  return `${summary}. Korelasikan dengan keluhan, riwayat diagnosis, dan terapi aktif.`;
}

export function buildPhysicianTrajectoryHeadline(
  hybridResult: HybridTrajectoryResult,
  physicianPresentation: PhysicianSafeTrajectoryPresentation
) {
  return {
    trajectoryLabel: STATE_META[hybridResult.integratedAssessment.finalState].label,
    reviewPriorityLabel: URGENCY_META[physicianPresentation.urgencyTier].label,
    mainConcern: buildMainConcern(hybridResult, physicianPresentation),
    clinicalMeaning: buildClinicalMeaning(hybridResult, physicianPresentation),
  };
}

function buildBriefInterpretation(
  hybridResult: HybridTrajectoryResult,
  physicianPresentation: PhysicianSafeTrajectoryPresentation
): string {
  const { finalState, confidence } = hybridResult.integratedAssessment;

  const opening =
    finalState === 'critical'
      ? 'Trajectory suggests a high-concern pattern on the latest visit'
      : finalState === 'deteriorating'
        ? 'Trajectory suggests a worsening pattern on the latest visit'
        : finalState === 'stable'
          ? 'Trajectory is relatively stable on the latest visit'
          : 'Trajectory shows a watch pattern on the latest visit';

  const followUp =
    confidence < 0.6 || physicianPresentation.urgencyTier === 'moderate'
      ? 'review latest complaint, vital trend, diagnosis, therapy, and escalation cues directly.'
      : 'review latest complaint, vital trend, active diagnosis, and current therapy.';

  return `${opening}; ${followUp}.`;
}

export function ClinicalTrajectoryHeader({
  hybridResult,
  physicianPresentation,
}: {
  hybridResult: HybridTrajectoryResult;
  physicianPresentation: PhysicianSafeTrajectoryPresentation;
}) {
  const interpretation = buildBriefInterpretation(hybridResult, physicianPresentation);

  return (
    <section className="ct-v2-interpretation" data-testid="clinical-trajectory-v2-header">
      <p className="text-small leading-relaxed text-platinum" style={{ marginBottom: 8 }}>
        {interpretation}
      </p>
    </section>
  );
}
