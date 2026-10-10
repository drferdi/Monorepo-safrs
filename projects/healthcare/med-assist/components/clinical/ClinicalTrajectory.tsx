// Designed and constructed by Drferdi.
import React, { useEffect, useMemo, useState } from 'react';

import { AssistShell } from '../ui/AssistShell';

import { ClinicalTrajectoryV2 } from './trajectory/v2';
import type { ScreeningAlert } from './TTVInferenceUI';

import {
  evaluateCanonicalClinicalEngine,
  type CanonicalClinicalEngineOutput,
} from '@/lib/api/bridge-client';
import type {
  AutosenPreset,
  DisabilityType,
  ObesityConfirmation,
} from '@/lib/clinical/autosen-types';
import {
  buildCanonicalRequestId,
  buildCanonicalTriageInput,
} from '@/lib/clinical/canonical-triage-builder';
import {
  analyzeHybridTrajectory,
  avpuToConsciousness,
  compareTrajectoryEngines,
  type HybridTrajectoryResult,
  isTrajectoryCompareModeEnabled,
  mapHybridTrajectoryToLegacyAnalysis,
} from '@/lib/iskandar-diagnosis-engine/hybrid-trajectory';
import { buildPhysicianSafeTrajectoryPresentation } from '@/lib/iskandar-diagnosis-engine/presentation-safety';
import {
  analyzeTrajectory,
  type TrajectoryAnalysis,
} from '@/lib/iskandar-diagnosis-engine/trajectory-analyzer';
import {
  buildTrajectoryVisualizationViewModel,
  type TrajectoryVisualizationViewModel,
} from '@/lib/iskandar-diagnosis-engine/trajectory-visualization-view-model';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';
import { createLogger } from '@/utils/logger';

const trajectoryLog = createLogger('Trajectory', 'content');

/**
 * ClinicalTrajectoryProps interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface ClinicalTrajectoryProps {
  vitals: {
    sbp: number;
    dbp: number;
    hr: number;
    rr: number;
    temp: number;
    spo2: number;
    glucose: number;
    /** Observed ACVPU from the TTV form, for NEWS2. */
    avpu?: 'A' | 'C' | 'V' | 'P' | 'U';
    supplementalO2?: boolean;
  };
  keluhanUtama: string;
  keluhanTambahan?: string;
  narrative: {
    keluhan_utama: string;
    lama_sakit: string;
    is_akut: boolean;
    confidence: number;
  };
  alerts: ScreeningAlert[];
  patientAge: number;
  patientGender: 'L' | 'P';
  patientName: string;
  patientRM: string;
  patientDOB?: string;
  patientBPJSStatus?: 'aktif' | 'nonaktif' | 'mandiri' | null;
  patientKelurahan?: string;
  patientFacilityName?: string;
  patientPayerLabel?: string;
  allergies?: string[];
  pregnancyStatus?: boolean | null;
  chronicHistorySummary?: string;
  extractedPregnancyRisk?: string;
  extractedSpecialConditions?: string[];
  disabilityType?: DisabilityType;
  obesityConfirmation?: ObesityConfirmation;
  autosenPreset?: AutosenPreset;
  symptomTextRaw?: string;
  encounterId?: string;
  prefetchedVisits?: VisitRecord[];
  prefetchedDiagnostics?: string[];
  prefetchedVisitStatus?: 'ready' | 'insufficient';
  shellMode?: 'standalone' | 'embedded';
  onBack?: () => void;
  onNextDifferential?: (
    trajectory: TrajectoryAnalysis,
    visitCount: number,
    canonicalOutput: CanonicalClinicalEngineOutput | null
  ) => void;
}

type Phase = 'loading' | 'error' | 'ready';
type VisitHistoryRow = {
  encounter_id: string;
  date: string;
  vitals: VisitRecord['vitals'];
  keluhan_utama: string;
  diagnosa: VisitRecord['diagnosa'] | null;
  terapi_obat?: string;
  dokter_penanganan?: string;
  perawat_penanganan?: string;
};

type VisitHistoryScanResult = {
  success?: boolean;
  error?: string;
  diagnostics?: string[];
  visits?: VisitHistoryRow[];
};

// PAGE_BG_STYLE → .ct-neu-shell (style.css)
// PAGE_TOP_GLOW_STYLE → .ct-top-glow (style.css)

function normalizeVisitHistoryScanResult(
  result: VisitHistoryScanResult | undefined
): VisitHistoryScanResult {
  if (result) return result;

  return {
    success: false,
    error: 'Visit history scan returned no response',
    diagnostics: ['NO_VISIT_HISTORY_RESPONSE'],
    visits: [],
  };
}

function buildFallbackTrajectoryViewModel(
  result: HybridTrajectoryResult
): TrajectoryVisualizationViewModel {
  const latestState = result.integratedAssessment.finalState;
  const timelineState =
    latestState === 'critical'
      ? 'high_concern'
      : latestState === 'deteriorating'
        ? 'worsening'
        : latestState === 'improving'
          ? 'mild_concern'
          : 'stable';

  return {
    trajectoryTimeline: [
      {
        visitLabel: 'Saat ini',
        state: timelineState,
        displayLabel: latestState === 'critical' ? 'Prioritas tinggi' : 'Pola saat ini',
        score: result.integratedAssessment.confidence,
      },
    ],
    vitalTrends: [],
    vitalTrendMeta: {
      primaryVitalDrivers: [],
      missingVitalWarnings: result.missingDataWarnings.slice(0, 2),
    },
    priorityTrajectoryCoverage: [],
    keyDriverContributions: result.redFlags.slice(0, 3).map((flag) => {
      const severity = flag.severity === 'critical' ? 'high' : flag.severity;

      return {
        driver: flag.title,
        contribution: severity === 'high' ? 0.78 : severity === 'moderate' ? 0.58 : 0.36,
        severity,
        explanation: flag.rationale,
      };
    }),
    baselineDeviation: [],
    baselineAvailability: {
      available: false,
      message: 'Baseline personal belum cukup untuk interpretasi chart yang lebih rinci.',
    },
    mortalityProxy: {
      tier: result.physiologicalResult.mortalityProxy.tier,
      score: result.physiologicalResult.mortalityProxy.score,
      clinicalUrgencyTier: result.physiologicalResult.mortalityProxy.clinicalUrgencyTier,
    },
    timeToCritical: [],
    dataQualityWarnings: [],
    uncertaintyNotes: result.uncertaintyNotes,
  };
}

function renderTrajectorySurface(
  shellMode: 'standalone' | 'embedded',
  content: React.ReactNode
): JSX.Element {
  if (shellMode === 'embedded') {
    return <>{content}</>;
  }

  return (
    <AssistShell
      className="assist-shell--trajectory-v2"
      cardClassName="sentra-card--trajectory-v2"
      fillCardHeight={false}
    >
      {content}
    </AssistShell>
  );
}

async function scanVisitHistoryViaExtension() {
  const { sendMessage } = await import('@/utils/messaging');
  return sendMessage('scanVisitHistory', undefined);
}

export const ClinicalTrajectory: React.FC<ClinicalTrajectoryProps> = ({
  vitals,
  keluhanUtama,
  keluhanTambahan,
  patientAge,
  patientGender,
  patientName,
  patientRM,
  patientDOB,
  patientBPJSStatus,
  patientKelurahan,
  patientFacilityName,
  patientPayerLabel,
  allergies,
  pregnancyStatus,
  chronicHistorySummary,
  extractedPregnancyRisk,
  extractedSpecialConditions,
  disabilityType,
  obesityConfirmation,
  autosenPreset,
  symptomTextRaw,
  encounterId,
  prefetchedVisits,
  prefetchedDiagnostics,
  prefetchedVisitStatus,
  shellMode = 'standalone',
  onBack,
  onNextDifferential,
}) => {
  const [phase, setPhase] = useState<Phase>('loading');
  const [analysis, setAnalysis] = useState<TrajectoryAnalysis | null>(null);
  const [hybridTrajectoryResult, setHybridTrajectoryResult] =
    useState<HybridTrajectoryResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [visitCount, setVisitCount] = useState(0);
  const [, setScrapeLog] = useState<string[]>([]);
  const [canonicalOutput, setCanonicalOutput] = useState<CanonicalClinicalEngineOutput | null>(
    null
  );
  const [canonicalError, setCanonicalError] = useState('');
  const [isCanonicalLoading, setIsCanonicalLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadTrajectory = async () => {
      trajectoryLog.debug('Loading visit history...');
      setPhase('loading');
      setHybridTrajectoryResult(null);
      setCanonicalError('');
      setCanonicalOutput(null);
      setIsCanonicalLoading(true);

      try {
        if (prefetchedVisitStatus === 'insufficient') {
          const diagLines =
            prefetchedDiagnostics && prefetchedDiagnostics.length > 0
              ? prefetchedDiagnostics
              : ['INSUFFICIENT_HISTORY: tidak ada kunjungan historis tersedia'];
          setScrapeLog(diagLines);
          setVisitCount(prefetchedVisits?.length ?? 0);
          setErrorMsg('Data not available');
          setPhase('error');
          setIsCanonicalLoading(false);
          return;
        }

        const result = normalizeVisitHistoryScanResult(
          prefetchedVisitStatus === 'ready' && prefetchedVisits && prefetchedDiagnostics
            ? {
                success: true,
                diagnostics: prefetchedDiagnostics,
                visits: prefetchedVisits.map((visit) => ({
                  encounter_id: visit.encounter_id,
                  date: visit.timestamp,
                  vitals: visit.vitals,
                  keluhan_utama: visit.keluhan_utama,
                  diagnosa: visit.diagnosa ?? null,
                  terapi_obat: visit.terapi_obat || '',
                  dokter_penanganan: visit.dokter_penanganan || '',
                  perawat_penanganan: visit.perawat_penanganan || '',
                })),
              }
            : await scanVisitHistoryViaExtension()
        );
        if (cancelled) return;

        // Capture diagnostics
        const diagLines = result.diagnostics || [];
        if (result.error) {
          diagLines.unshift(`ERROR: ${result.error}`);
        }
        if (diagLines.length === 0) {
          diagLines.push('No diagnostics returned — pipeline may have failed silently');
        }
        setScrapeLog(diagLines);
        trajectoryLog.debug('Diagnostics:\n' + diagLines.join('\n'));
        trajectoryLog.debug(`RECV: ${result.visits?.length ?? 0} visits`);

        const visitRows = (result.visits || []) as VisitHistoryRow[];
        const pastVisits: VisitRecord[] = visitRows.map((v) => ({
          patient_id: patientRM,
          encounter_id: v.encounter_id,
          timestamp: v.date,
          vitals: v.vitals,
          keluhan_utama: v.keluhan_utama,
          diagnosa: v.diagnosa || undefined,
          terapi_obat: v.terapi_obat || undefined,
          dokter_penanganan: v.dokter_penanganan || undefined,
          perawat_penanganan: v.perawat_penanganan || undefined,
          source: 'scrape' as const,
        }));

        const currentVisit: VisitRecord = {
          patient_id: patientRM,
          encounter_id: encounterId || `current-${Date.now()}`,
          timestamp: new Date().toISOString(),
          vitals,
          keluhan_utama: keluhanUtama,
          source: 'uplink',
        };

        const visitMap = new Map<string, VisitRecord>();
        for (const v of pastVisits) visitMap.set(v.encounter_id, v);
        visitMap.set(currentVisit.encounter_id, currentVisit);

        const allVisits = Array.from(visitMap.values()).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        trajectoryLog.debug(`Analyzing ${allVisits.length} unique visits`);
        setVisitCount(allVisits.length);

        if (allVisits.length < 2) {
          setErrorMsg('Data trajectory tidak cukup');
          setPhase('error');
          setIsCanonicalLoading(false);
          return;
        }

        const hybridInput = {
          visits: allVisits,
          currentEncounter: {
            keluhanUtama,
            keluhanTambahan,
            spo2: vitals.spo2,
            consciousness: vitals.avpu ? avpuToConsciousness(vitals.avpu) : undefined,
            supplementalO2: vitals.supplementalO2,
            ageYears: patientAge,
          },
        };
        const useHybridTrajectory = true;
        let nextHybridTrajectoryResult: HybridTrajectoryResult | null = null;
        const trajectoryAnalysis = useHybridTrajectory
          ? (() => {
              nextHybridTrajectoryResult = analyzeHybridTrajectory(hybridInput);
              return mapHybridTrajectoryToLegacyAnalysis(nextHybridTrajectoryResult);
            })()
          : analyzeTrajectory(allVisits);

        if (useHybridTrajectory && isTrajectoryCompareModeEnabled()) {
          const comparison = compareTrajectoryEngines(hybridInput);
          trajectoryLog.debug('[Compare]\n' + comparison.evaluationReport.join('\n'));
        }

        trajectoryLog.debug(
          `ANALYZED: trend=${trajectoryAnalysis.overallTrend}, risk=${trajectoryAnalysis.overallRisk}`
        );

        setAnalysis(trajectoryAnalysis);
        setHybridTrajectoryResult(nextHybridTrajectoryResult);
        setPhase('ready');

        const requestId = buildCanonicalRequestId(patientRM);
        const requestTime = new Date().toISOString();
        const canonicalInput = buildCanonicalTriageInput({
          requestId,
          requestTime,
          patientName,
          patientGender,
          patientAge,
          patientRM,
          patientDOB,
          patientBPJSStatus,
          patientKelurahan,
          patientFacilityName,
          patientPayerLabel,
          vitals,
          symptomTextRaw,
          keluhanUtama,
          keluhanTambahan,
          chronicHistorySummary,
          allergies,
          pregnancyStatus,
          extractedPregnancyRisk,
          extractedSpecialConditions,
          disabilityType,
          obesityConfirmation,
          autosenPreset,
          prefetchedVisits: pastVisits,
        });

        try {
          const canonical = await evaluateCanonicalClinicalEngine(canonicalInput);
          if (!cancelled) {
            setCanonicalOutput(canonical);
          }
        } catch (error) {
          if (!cancelled) {
            // Canonical engine optional; keep UI fallback generic and non-sensitive.
            trajectoryLog.debug(
              'Canonical engine fallback to local:',
              error instanceof Error ? error.name : 'Unavailable'
            );
            setCanonicalError(
              'hasil lokal ditampilkan sebagai preview pendukung review klinis; keputusan akhir tetap pada dokter.'
            );
          }
        } finally {
          if (!cancelled) {
            setIsCanonicalLoading(false);
          }
        }
      } catch (error) {
        if (cancelled) return;
        const errStr = error instanceof Error ? error.message : String(error);
        console.error('[Trajectory] Load error:', errStr);
        setErrorMsg(errStr);
        setScrapeLog((prev) => (prev.length > 0 ? prev : [`PIPELINE_ERROR: ${errStr}`]));
        setPhase('error');
        setIsCanonicalLoading(false);
      }
    };

    loadTrajectory();
    return () => {
      cancelled = true;
    };
  }, [
    patientRM,
    encounterId,
    vitals,
    keluhanUtama,
    prefetchedVisits,
    prefetchedDiagnostics,
    prefetchedVisitStatus,
    patientName,
    patientGender,
    patientAge,
    patientDOB,
    patientBPJSStatus,
    patientKelurahan,
    patientFacilityName,
    patientPayerLabel,
    allergies,
    pregnancyStatus,
    chronicHistorySummary,
    extractedPregnancyRisk,
    extractedSpecialConditions,
    disabilityType,
    obesityConfirmation,
    autosenPreset,
    symptomTextRaw,
    keluhanTambahan,
  ]);

  const trajectoryVisualizationViewModel = useMemo(() => {
    if (!hybridTrajectoryResult) {
      return null;
    }

    try {
      return buildTrajectoryVisualizationViewModel(hybridTrajectoryResult);
    } catch (error) {
      console.warn(
        '[Trajectory] Visualization panel fallback:',
        error instanceof Error ? error.message : String(error)
      );
      return buildFallbackTrajectoryViewModel(hybridTrajectoryResult);
    }
  }, [hybridTrajectoryResult]);

  // Render: Loading
  if (phase === 'loading') {
    return renderTrajectorySurface(
      shellMode,
      <div
        className="ct-neu-shell ct-v2-layout flex flex-col gap-3"
        data-testid="clinical-trajectory-v2-loading"
      >
        <div className="ct-v2-workspace-head flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="ttv-label text-tertiary mb-1">Sentra Assist</div>
            <h1 className="ct-v2-workspace-title">Clinical Reasoning Workbench</h1>
            <p className="ct-v2-workspace-subtitle">
              Analisis perjalanan klinis dan risiko perburukan pasien.
            </p>
          </div>
          {onBack ? (
            <div className="ct-v2-workspace-actions">
              <button
                type="button"
                className="engine-btn ct-v2-back"
                aria-label="Kembali"
                onClick={onBack}
              >
                &lt;
              </button>
            </div>
          ) : null}
        </div>

        <section className="ct-v2-panel">
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="grid w-full max-w-sm gap-2">
              <div className="ct-v2-skeleton-line h-3" />
              <div className="ct-v2-skeleton-line h-3 w-4/5" />
              <div className="ct-v2-skeleton-block h-24" />
            </div>
            <p className="text-small text-muted">Menganalisis riwayat kunjungan...</p>
          </div>
        </section>
      </div>
    );
  }

  // Render: Error
  if (phase === 'error') {
    return renderTrajectorySurface(
      shellMode,
      <div
        className="ct-neu-shell ct-v2-layout flex flex-col gap-3"
        data-testid="clinical-trajectory-v2-error"
      >
        <div className="ct-v2-workspace-head flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="ttv-label text-tertiary mb-1">Sentra Assist</div>
            <h1 className="ct-v2-workspace-title">Clinical Reasoning Workbench</h1>
            <p className="ct-v2-workspace-subtitle">
              Analisis perjalanan klinis dan risiko perburukan pasien.
            </p>
          </div>
          {onBack ? (
            <div className="ct-v2-workspace-actions">
              <button
                type="button"
                className="engine-btn ct-v2-back"
                aria-label="Kembali"
                onClick={onBack}
              >
                &lt;
              </button>
            </div>
          ) : null}
        </div>

        <section className="ct-v2-panel">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="ct-v2-danger-mark">!</div>
            <p className="text-small ct-v2-danger-text">
              {errorMsg || 'Gagal memuat data trajectory'}
            </p>
            <p className="text-small text-muted text-center leading-relaxed">
              Data trajectory belum cukup untuk review terstruktur. Lengkapi data klinis dan
              konfirmasi ulang sebelum menggunakan dukungan reasoning.
            </p>
            <button
              type="button"
              onClick={() => setPhase('loading')}
              className="engine-btn ct-v2-action"
            >
              Coba Lagi
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Render: Ready
  if (!analysis) return null;

  const physicianPresentation = buildPhysicianSafeTrajectoryPresentation(analysis);
  const displayPatientContext =
    shellMode === 'embedded'
      ? undefined
      : {
          name: patientName,
          gender: patientGender,
          age: patientAge,
          rm: patientRM,
          dob: patientDOB,
          bpjsStatus: patientBPJSStatus,
          kelurahan: patientKelurahan,
          facilityName: patientFacilityName,
          payerLabel: patientPayerLabel,
          visitCount,
        };
  if (hybridTrajectoryResult && trajectoryVisualizationViewModel) {
    return renderTrajectorySurface(
      shellMode,
      <ClinicalTrajectoryV2
        hybridResult={hybridTrajectoryResult}
        viewModel={trajectoryVisualizationViewModel}
        physicianPresentation={physicianPresentation}
        canonicalOutput={canonicalOutput}
        canonicalError={canonicalError}
        isCanonicalLoading={isCanonicalLoading}
        visitCount={visitCount}
        workflowAuditSessionId={encounterId || patientRM}
        patientContext={displayPatientContext}
        onBack={onBack}
        onOpenDifferential={
          onNextDifferential
            ? () => onNextDifferential(analysis, visitCount, canonicalOutput)
            : undefined
        }
      />
    );
  }

  return renderTrajectorySurface(
    shellMode,
    <div
      className="ct-neu-shell ct-v2-layout flex flex-col gap-3"
      data-testid="clinical-trajectory-v2"
    >
      <div className="ct-v2-workspace-head flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="ttv-label text-tertiary mb-1">Sentra Assist</div>
          <h1 className="ct-v2-workspace-title">Clinical Reasoning Workbench</h1>
          <p className="ct-v2-workspace-subtitle">
            Evidence-informed reasoning support. Physician final judgment preserved.
          </p>
        </div>
        {onBack ? (
          <button
            type="button"
            className="engine-btn ct-v2-back"
            aria-label="Kembali"
            onClick={onBack}
          >
            &lt;
          </button>
        ) : null}
      </div>
      <section className="ct-v2-panel">
        <div className="ttv-section-title mb-1">Data V2 belum siap</div>
        <p className="text-small text-muted leading-relaxed">
          Ringkasan trajectory V2 belum dapat dibangun dari data saat ini. Gunakan temuan
          pemeriksaan, riwayat diagnosis, dan penilaian dokter sebagai dasar keputusan klinis.
        </p>
      </section>
    </div>
  );
};
