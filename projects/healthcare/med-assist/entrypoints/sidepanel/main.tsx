import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { browser } from 'wxt/browser';

import { ClinicalDifferential } from '@/components/clinical/ClinicalDifferential';
import { MedLensConsole } from '@/components/clinical/medlens';
import { TTVInferenceUI, type ScreeningAlert } from '@/components/clinical/TTVInferenceUI';
import ThemeProvider from '@/components/providers/ThemeProvider';
import { ClinicalReasoningWorkbench } from '@/components/sidepanel/ClinicalReasoningWorkbench';
import { ConsoleLogin } from '@/components/sidepanel/ConsoleLogin';
import { CreditsView } from '@/components/sidepanel/CreditsView';
import { DashboardView } from '@/components/sidepanel/DashboardView';
import { SidePanelFooter } from '@/components/sidepanel/SidePanelFooter';
import { SidePanelHeader } from '@/components/sidepanel/SidePanelHeader';
import { StatisticSection } from '@/components/sidepanel/statistics/StatisticSection';
import { useOnlineDoctorCount } from '@/components/sidepanel/useOnlineDoctorCount';
import type { AuthUser } from '@/lib/api/auth-store';
import { getOnlineDoctors } from '@/lib/api/bridge-client';
import { migrateLegacyAppStorageKeys } from '@/lib/app-identity';
import type { ComposedAnamnesaDraft } from '@/lib/clinical/anamnesa-composer';
import type {
  AutosenPreset,
  DisabilityType,
  ObesityConfirmation,
} from '@/lib/clinical/autosen-types';
import { extractChronicTherapiesFromHistory } from '@/lib/clinical/chronic-therapy-history';
import { formatVisitRelativeDay, getVisitTimestampMs } from '@/lib/clinical/visit-history-format';
import { assessVitalGuardrails } from '@/lib/clinical/vital-guardrails';
import { selectVitalWarnings } from '@/lib/clinical/vital-warning-selector';
import {
  getActionProtocol,
  type ABCDEPhase,
  type ActionStep,
} from '@/lib/emergency-detector/action-protocols';
import { formatRecommendationLines } from '@/lib/emergency-detector/recommendation-formatter';
import type { TriageVerdict } from '@/lib/emergency-detector/triage-verdict';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';
import { buildRMETransferPayload } from '@/lib/rme/payload-mapper';
import {
  isReliablePatientExtract,
  PATIENT_EXTRACT_FAILURE_MESSAGE,
} from '@/lib/scraper/patient-extract-reliability';
import { bootstrapThemeDocument } from '@/lib/theme-store';
import { createLogger } from '@/utils/logger';
import { sendMessage } from '@/utils/messaging';
import { SendToDoctorsButton } from './components/SendToDoctorsButton';
import { playSound, primeSound } from '@/utils/sound';
import type { RMETransferResult } from '@/utils/types';

migrateLegacyAppStorageKeys();

import './globals.css';
import './style.css';

type EngineId = 'vs' | 'emergency' | 'medlens';
type InferenceSurface = 'main' | 'workbench' | 'differential' | 'statistics';
type ClinicalSurfaceRoute = { engine: EngineId; surface: InferenceSurface };

interface PatientData {
  name: string;
  gender: 'L' | 'P';
  age: number;
  rm: string;
  dob: string;
  bloodType: string;
  bpjsStatus: 'aktif' | 'nonaktif' | 'mandiri' | null;
  kelurahan: string;
}

type MedicalHistoryEntry = { code: string; description: string; shortLabel: string };
type PrefilledHistoryFlags = Record<string, boolean>;
type PrefetchedVisitHistory = {
  visits: VisitRecord[];
  diagnostics: string[];
  status: 'ready' | 'insufficient';
};
type PatientInfoResponse = {
  success?: boolean;
  error?: string;
  patient?: {
    name: string;
    gender: 'L' | 'P';
    age: number;
    ageParsed?: boolean;
    rm: string;
    dob: string;
    bpjsStatus: PatientData['bpjsStatus'];
    kelurahan: string;
  };
};

const STANDBY_TRIAGE_VERDICT: TriageVerdict<ScreeningAlert> = {
  zone: 'standby',
  headlineAlert: null,
  sortedAlerts: [],
};
type ExtractedClinicalContext = {
  facilityName: string;
  payerLabel: string;
  specialConditions: string[];
  pregnancyRisk: string;
  allergies: string[];
  pregnancyStatus: boolean | null;
};
type HeaderVisitHistorySection = {
  key: string;
  title: string;
  rows: Array<{ label: string; value: string }>;
};
type EncounterComplaintSnapshot = {
  keluhan_utama: string;
  keluhan_tambahan: string;
  diagnosa?: {
    icd_x: string;
    nama: string;
  };
};
type ChromeTabsApi = {
  query: (queryInfo: {
    active?: boolean;
    currentWindow?: boolean;
  }) => Promise<Array<{ id?: number }>>;
  sendMessage: <T = unknown>(tabId: number, message: unknown) => Promise<T>;
};

interface TTVFormState {
  gcs?: string;
  sbp: string;
  dbp: string;
  hr: string;
  rr: string;
  temp: string;
  spo2: string;
  glucose: string;
  symptomText: string;
  allergies: string[];
  pregnancyStatus: boolean | null;
  disabilityType: DisabilityType;
  obesityConfirmation: ObesityConfirmation;
  autosenPreset: AutosenPreset;
  avpu: 'A' | 'C' | 'V' | 'P' | 'U';
  supplemental_o2: boolean;
  pain_score: string;
}

type RmeVitalFieldKey = 'sbp' | 'dbp' | 'hr' | 'rr' | 'temp' | 'spo2' | 'glucose';

const CHRONIC_FLAG_ORDER = ['dm', 'ht', 'jantung', 'stroke', 'ginjal', 'asma'] as const;
const HISTORY_FLAG_META: Record<
  (typeof CHRONIC_FLAG_ORDER)[number],
  { labels: string[]; display: string }
> = {
  dm: { labels: ['DM'], display: 'DM' },
  ht: { labels: ['HT'], display: 'HIPERTENSI' },
  jantung: { labels: ['HF', 'CHD', 'JANTUNG'], display: 'Jantung' },
  stroke: { labels: ['STROKE'], display: 'Stroke' },
  ginjal: { labels: ['CKD', 'GINJAL'], display: 'Ginjal' },
  asma: { labels: ['ASTHMA', 'ASMA'], display: 'Asma' },
};

const initialTTVState: TTVFormState = {
  gcs: '',
  sbp: '',
  dbp: '',
  hr: '',
  rr: '',
  temp: '',
  spo2: '',
  glucose: '',
  symptomText: '',
  allergies: [],
  pregnancyStatus: null,
  disabilityType: '',
  obesityConfirmation: '',
  autosenPreset: 'adl',
  avpu: 'A',
  supplemental_o2: false,
  pain_score: '',
};

const defaultPatient: PatientData = {
  name: 'Memuat...',
  gender: 'L',
  age: 0,
  rm: '-',
  dob: '',
  bloodType: '',
  bpjsStatus: null,
  kelurahan: '',
};

const defaultClinicalContext: ExtractedClinicalContext = {
  facilityName: '',
  payerLabel: '',
  specialConditions: [],
  pregnancyRisk: '',
  allergies: [],
  pregnancyStatus: null,
};
const emptyEncounterComplaint: EncounterComplaintSnapshot = {
  keluhan_utama: '',
  keluhan_tambahan: '',
};

async function readEncounterComplaintSnapshot(): Promise<EncounterComplaintSnapshot> {
  const raw = await browser.storage.local.get('sentra:encounter').catch(() => ({}));
  const wrapper = (raw as Record<string, unknown>)?.['sentra:encounter'] as
    | {
        encounter?: {
          anamnesa?: {
            keluhan_utama?: unknown;
            keluhan_tambahan?: unknown;
          };
          diagnosa?: {
            icd_x?: unknown;
            nama?: unknown;
          };
        };
      }
    | undefined;

  const result: EncounterComplaintSnapshot = {
    keluhan_utama:
      typeof wrapper?.encounter?.anamnesa?.keluhan_utama === 'string'
        ? wrapper.encounter.anamnesa.keluhan_utama
        : '',
    keluhan_tambahan:
      typeof wrapper?.encounter?.anamnesa?.keluhan_tambahan === 'string'
        ? wrapper.encounter.anamnesa.keluhan_tambahan
        : '',
  };

  const diag = wrapper?.encounter?.diagnosa;
  if (diag && typeof diag.icd_x === 'string' && diag.icd_x.trim()) {
    result.diagnosa = {
      icd_x: diag.icd_x.trim(),
      nama: typeof diag.nama === 'string' ? diag.nama.trim() : '',
    };
  }

  return result;
}

const engineConfig: Record<EngineId, { section: string }> = {
  vs: { section: 'START' },
  emergency: { section: 'CODE RED' },
  medlens: { section: 'MEDLENS' },
};

const DASHBOARD_CLINICAL_TRAJECTORY_ROUTE: ClinicalSurfaceRoute = {
  engine: 'vs',
  surface: 'workbench',
};

const sidepanelLog = createLogger('SentraAssistSidepanel', 'global');
const LAUNCH_BOOT_SEQUENCE_MS = 2400;
const LAUNCH_OPENING_SOUND_MS = 2200;
const LAUNCH_OPENING_SOUND_VOLUME = 0.62;
const LAUNCH_OPENING_SOUND_FADE_OUT_MS = 520;

function getChromeTabsApi(): ChromeTabsApi | undefined {
  return (globalThis as { chrome?: { tabs?: ChromeTabsApi } }).chrome?.tabs;
}

function mapMedicalHistoryToFlags(entries: MedicalHistoryEntry[]): PrefilledHistoryFlags {
  const flags: PrefilledHistoryFlags = {};
  const labels = new Set(entries.map((entry) => entry.shortLabel.toUpperCase().trim()));
  for (const key of CHRONIC_FLAG_ORDER) {
    flags[key] = HISTORY_FLAG_META[key].labels.some((label) => labels.has(label));
  }
  return flags;
}

function createEmptyHistoryFlags(): PrefilledHistoryFlags {
  return CHRONIC_FLAG_ORDER.reduce((accumulator, key) => {
    accumulator[key] = false;
    return accumulator;
  }, {} as PrefilledHistoryFlags);
}

function buildHistorySummary(flags: PrefilledHistoryFlags): string {
  const selected = CHRONIC_FLAG_ORDER.filter((key) => flags[key]).map(
    (key) => HISTORY_FLAG_META[key].display
  );
  return selected.length > 0 ? selected.join(', ') : 'Menunggu Input';
}

function normalizePatientNameForDisplay(name?: string): string {
  const normalized = name?.trim();
  return !normalized || normalized.includes('Error') || normalized.includes('tidak ditemukan')
    ? '---'
    : normalized;
}

function parseIntOrUndefined(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFloatOrUndefined(value: string): number | undefined {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildHeaderVisitHistorySections(
  visits?: VisitRecord[],
  limit = 3
): HeaderVisitHistorySection[] {
  if (!visits?.length || limit < 1) {
    return [];
  }

  return [...visits]
    .sort(
      (left, right) => getVisitTimestampMs(right.timestamp) - getVisitTimestampMs(left.timestamp)
    )
    .slice(0, limit)
    .map((visit, index) => {
      const rows = [
        visit.timestamp ? { label: 'Kapan', value: formatVisitRelativeDay(visit.timestamp) } : null,
        visit.diagnosa?.nama
          ? {
              label: 'Diagnosa',
              value: visit.diagnosa.icd_x
                ? `${visit.diagnosa.icd_x} — ${visit.diagnosa.nama}`
                : visit.diagnosa.nama,
            }
          : null,
        visit.terapi_obat ? { label: 'Terapi', value: visit.terapi_obat } : null,
        visit.dokter_penanganan ? { label: 'Dokter', value: visit.dokter_penanganan } : null,
      ].filter(Boolean) as HeaderVisitHistorySection['rows'];

      return {
        key: visit.encounter_id || `${visit.timestamp || 'visit'}-${index}`,
        title: `Kunjungan ${index + 1}`,
        rows,
      };
    })
    .filter((section) => section.rows.length > 0);
}

export function SentraAssistSidepanelApp(): JSX.Element {
  const reduceMotion = useReducedMotion() === true;
  const pageVariants = useMemo(
    () =>
      reduceMotion
        ? {
            initial: { opacity: 0 },
            enter: { opacity: 1, transition: { duration: 0.15, ease: 'easeOut' as const } },
            exit: { opacity: 0, transition: { duration: 0.12, ease: 'easeIn' as const } },
          }
        : {
            initial: { opacity: 0, y: 10 },
            enter: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] as const },
            },
            exit: {
              opacity: 0,
              y: -6,
              transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as const },
            },
          },
    [reduceMotion]
  );
  const tabPanelVariants = useMemo(
    () =>
      reduceMotion
        ? {
            initial: { opacity: 0 },
            enter: { opacity: 1, transition: { duration: 0.12, ease: 'easeOut' as const } },
            exit: { opacity: 0, transition: { duration: 0.1, ease: 'easeIn' as const } },
          }
        : {
            initial: { opacity: 0, y: 10 },
            enter: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] as const },
            },
            exit: {
              opacity: 0,
              y: -8,
              transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as const },
            },
          },
    [reduceMotion]
  );

  const [showDashboard, setShowDashboard] = useState(true);
  const [showCredits, setShowCredits] = useState(false);
  const [buttonSoundsEnabled, setButtonSoundsEnabled] = useState(false);
  const [bootSequenceActive, setBootSequenceActive] = useState(false);
  const [ocrLightingActive, setOcrLightingActive] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeEngine, setActiveEngine] = useState<EngineId>('vs');
  const [activeInferenceSurface, setActiveInferenceSurface] = useState<InferenceSurface>('main');
  const [ttvState, setTTVState] = useState<TTVFormState>(initialTTVState);
  const [patientData, setPatientData] = useState<PatientData>(defaultPatient);
  const [rmeVitalFieldKeys, setRmeVitalFieldKeys] = useState<RmeVitalFieldKey[]>([]);
  const [isLoadingPatient, setIsLoadingPatient] = useState(true);
  const [patientAgeKnown, setPatientAgeKnown] = useState(false);
  const [patientExtractError, setPatientExtractError] = useState<string | null>(null);
  const [patientHistorySummary, setPatientHistorySummary] = useState('Menunggu Input');
  const [prefilledHistoryFlags, setPrefilledHistoryFlags] =
    useState<PrefilledHistoryFlags>(createEmptyHistoryFlags);
  const [clinicalContext, setClinicalContext] =
    useState<ExtractedClinicalContext>(defaultClinicalContext);
  const [prefetchedVisitHistory, setPrefetchedVisitHistory] =
    useState<PrefetchedVisitHistory | null>(null);
  const [anamnesaDraft, setAnamnesaDraft] = useState<ComposedAnamnesaDraft | null>(null);
  const [encounterComplaint, setEncounterComplaint] =
    useState<EncounterComplaintSnapshot>(emptyEncounterComplaint);
  const [emergencyAlerts, setEmergencyAlerts] = useState<ScreeningAlert[]>([]);
  const doctorOnlineCount = useOnlineDoctorCount(getOnlineDoctors);
  const [triageVerdict, setTriageVerdict] =
    useState<TriageVerdict<ScreeningAlert>>(STANDBY_TRIAGE_VERDICT);

  const visiblePatientName = normalizePatientNameForDisplay(patientData.name);

  const vitalWarnings = useMemo(() => {
    // Fail closed: never score vitals against unknown age (age:0 ≈ infant).
    if (!patientAgeKnown) return [];

    const assessment = assessVitalGuardrails(
      {
        sbp: ttvState.sbp,
        dbp: ttvState.dbp,
        hr: ttvState.hr,
        rr: ttvState.rr,
        temp: ttvState.temp,
        spo2: ttvState.spo2,
        glucose: ttvState.glucose,
      },
      { age: patientData.age, gender: patientData.gender }
    );
    return selectVitalWarnings(assessment.fieldStatus);
  }, [
    ttvState.sbp,
    ttvState.dbp,
    ttvState.hr,
    ttvState.rr,
    ttvState.temp,
    ttvState.spo2,
    ttvState.glucose,
    patientData.age,
    patientData.gender,
    patientAgeKnown,
  ]);

  const demographicStatus = isLoadingPatient
    ? 'syncing'
    : patientExtractError
      ? 'insufficient'
      : visiblePatientName !== '---' && patientData.rm !== '-'
        ? 'ready'
        : 'standby';
  const historyStatus = isLoadingPatient
    ? 'syncing'
    : patientExtractError
      ? 'insufficient'
      : prefetchedVisitHistory?.status === 'ready'
        ? 'ready'
        : prefetchedVisitHistory?.status === 'insufficient'
          ? 'insufficient'
          : 'standby';
  const headerVisitHistorySections = useMemo(
    () => buildHeaderVisitHistorySections(prefetchedVisitHistory?.visits),
    [prefetchedVisitHistory?.visits]
  );
  const chronicTherapyNames = useMemo(
    () =>
      extractChronicTherapiesFromHistory(prefetchedVisitHistory?.visits).medications.map(
        (medication) => medication.displayName
      ),
    [prefetchedVisitHistory?.visits]
  );
  const bootSequenceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const { getStoredSession } = await import('@/lib/api/auth-client');
        const session = await getStoredSession();
        setAuthUser(session?.user ?? null);
      } catch {
        setAuthUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    })();
  }, []);

  const handleConsoleLoginSuccess = useCallback((user: AuthUser) => {
    setAuthUser(user);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncEncounterComplaint = async (): Promise<void> => {
      const snapshot = await readEncounterComplaintSnapshot();
      if (cancelled) return;

      setEncounterComplaint(snapshot);
    };

    void syncEncounterComplaint();

    const listener = (): void => {
      void syncEncounterComplaint();
    };

    browser.storage.onChanged.addListener(listener);
    return () => {
      cancelled = true;
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (bootSequenceTimeoutRef.current !== null) {
        window.clearTimeout(bootSequenceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!buttonSoundsEnabled) return;
    primeSound('button5.mp3');

    const playButtonSound = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return;

      const button = target.closest('button');
      if (!button || button.disabled) return;

      const sound = button.dataset.sound || 'button5.mp3';
      if (sound === 'none') return;

      playSound(sound);
    };
    // Sound on press, not on release: a mouse click ends ~100 ms after the button goes down.
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button > 0) return; // right or middle button
      playButtonSound(event.target);
    };
    // Keyboard activation (Enter/Space) fires a click with detail 0 and no pointerdown.
    const handleKeyboardClick = (event: MouseEvent) => {
      if (event.detail === 0) playButtonSound(event.target);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('click', handleKeyboardClick, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('click', handleKeyboardClick, true);
    };
  }, [buttonSoundsEnabled]);

  const runLaunchSequence = useCallback(() => {
    playSound('opening.mp3', {
      maxDurationMs: LAUNCH_OPENING_SOUND_MS,
      volume: LAUNCH_OPENING_SOUND_VOLUME,
      fadeOutMs: LAUNCH_OPENING_SOUND_FADE_OUT_MS,
    });
    setButtonSoundsEnabled(true);
    setBootSequenceActive(true);
    if (bootSequenceTimeoutRef.current !== null) {
      window.clearTimeout(bootSequenceTimeoutRef.current);
    }
    bootSequenceTimeoutRef.current = window.setTimeout(() => {
      setBootSequenceActive(false);
      bootSequenceTimeoutRef.current = null;
    }, LAUNCH_BOOT_SEQUENCE_MS);
    setActiveEngine('vs');
    setActiveInferenceSurface('main');
    setShowDashboard(false);
  }, []);

  const handleLaunchConsole = useCallback(() => {
    runLaunchSequence();
  }, [runLaunchSequence]);

  const handleOpenDiagnosis = useCallback(() => {
    setActiveEngine('vs');
    setActiveInferenceSurface('differential');
  }, []);

  const handleOpenStats = useCallback(() => {
    setActiveEngine('vs');
    setActiveInferenceSurface('statistics');
  }, []);

  const handleLogout = useCallback(() => {
    void (async () => {
      try {
        const { logout } = await import('@/lib/api/auth-client');
        await logout();
      } catch {
        /* best-effort logout */
      }
      setAuthUser(null);
      setButtonSoundsEnabled(false);
      setBootSequenceActive(false);
      if (bootSequenceTimeoutRef.current !== null) {
        window.clearTimeout(bootSequenceTimeoutRef.current);
        bootSequenceTimeoutRef.current = null;
      }
      setShowDashboard(true);
    })();
  }, []);

  const handleEngineChange = useCallback((engineId: string) => {
    if (engineId === 'vs' || engineId === 'emergency' || engineId === 'medlens') {
      setActiveEngine(engineId);
      if (engineId === 'vs') {
        setActiveInferenceSurface('main');
      }
    }
  }, []);

  const handleOpenDashboardTrajectory = useCallback(() => {
    setActiveEngine(DASHBOARD_CLINICAL_TRAJECTORY_ROUTE.engine);
    setActiveInferenceSurface(DASHBOARD_CLINICAL_TRAJECTORY_ROUTE.surface);
  }, []);

  const fetchPatientData = useCallback(async (options?: { patientLoadedSound?: boolean }) => {
    setIsLoadingPatient(true);
    setPrefilledHistoryFlags(createEmptyHistoryFlags());
    setPatientHistorySummary('Menunggu Input');
    setClinicalContext(defaultClinicalContext);
    setPatientExtractError(null);

    const failClosedPatientExtract = (message: string) => {
      // Incomplete OCR must not feed vitals into infant-default age:0 triage.
      setPatientData(defaultPatient);
      setPatientAgeKnown(false);
      setTTVState(initialTTVState);
      setRmeVitalFieldKeys([]);
      setEmergencyAlerts([]);
      setTriageVerdict(STANDBY_TRIAGE_VERDICT);
      setPrefetchedVisitHistory(null);
      setPatientExtractError(message);
      setOcrLightingActive(false);
    };

    try {
      const chromeTabs = getChromeTabsApi();
      if (!chromeTabs) {
        failClosedPatientExtract(PATIENT_EXTRACT_FAILURE_MESSAGE);
        return;
      }

      const [tab] = await chromeTabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        failClosedPatientExtract(PATIENT_EXTRACT_FAILURE_MESSAGE);
        return;
      }

      const [
        patientResponse,
        medicalHistoryResponse,
        visitHistoryResponse,
        contextResponse,
        vitalSignsResponse,
      ] = await Promise.allSettled([
        chromeTabs.sendMessage(tab.id, { type: 'getPatientInfo' }),
        sendMessage('scanMedicalHistory', undefined),
        sendMessage('scanVisitHistory', undefined),
        sendMessage('scanClinicalContext', undefined),
        sendMessage('scanVitalSigns', undefined),
      ]);

      let resolvedPatientRM = defaultPatient.rm;
      let patientExtractOk = false;

      if (patientResponse.status === 'fulfilled') {
        const payload = patientResponse.value as PatientInfoResponse;
        if (payload.success && payload.patient && isReliablePatientExtract(payload.patient)) {
          const patient = payload.patient;
          resolvedPatientRM = patient.rm;
          patientExtractOk = true;
          setPatientAgeKnown(true);
          setPatientExtractError(null);
          setPatientData({
            name: patient.name,
            gender: patient.gender,
            age: patient.age,
            rm: patient.rm,
            dob: patient.dob,
            bloodType: '',
            bpjsStatus: patient.bpjsStatus,
            kelurahan: patient.kelurahan,
          });
          if (options?.patientLoadedSound) {
            playSound('beep.mp3');
          }
          setOcrLightingActive(false);
        }
      }

      if (!patientExtractOk) {
        failClosedPatientExtract(PATIENT_EXTRACT_FAILURE_MESSAGE);
        return;
      }

      if (medicalHistoryResponse.status === 'fulfilled' && medicalHistoryResponse.value?.success) {
        const flags = mapMedicalHistoryToFlags(medicalHistoryResponse.value.history);
        setPrefilledHistoryFlags(flags);
        setPatientHistorySummary(buildHistorySummary(flags));
      }

      if (visitHistoryResponse.status === 'fulfilled' && visitHistoryResponse.value?.success) {
        type Row = {
          encounter_id: string;
          date: string;
          vitals: VisitRecord['vitals'];
          keluhan_utama: string;
          diagnosa?: VisitRecord['diagnosa'];
          terapi_obat?: string;
          dokter_penanganan?: string;
          perawat_penanganan?: string;
        };

        const rows = (visitHistoryResponse.value.visits || []) as Row[];
        const visits: VisitRecord[] = rows.slice(0, 5).map((visit) => ({
          patient_id: resolvedPatientRM,
          encounter_id: visit.encounter_id,
          timestamp: visit.date,
          vitals: visit.vitals,
          keluhan_utama: visit.keluhan_utama,
          diagnosa: visit.diagnosa,
          terapi_obat: visit.terapi_obat,
          dokter_penanganan: visit.dokter_penanganan,
          perawat_penanganan: visit.perawat_penanganan,
          source: 'scrape',
        }));

        setPrefetchedVisitHistory({
          visits,
          diagnostics: visitHistoryResponse.value.diagnostics || [],
          status: visits.length >= 1 ? 'ready' : 'insufficient',
        });
      }

      if (contextResponse.status === 'fulfilled' && contextResponse.value?.success) {
        const context = contextResponse.value.context;
        if (context) {
          setClinicalContext({
            facilityName: context.facilityName ?? '',
            payerLabel: context.payerLabel ?? '',
            pregnancyRisk: context.pregnancyRisk ?? '',
            specialConditions: context.specialConditions ?? [],
            allergies: context.allergies ?? [],
            pregnancyStatus: context.pregnancyStatus === undefined ? null : context.pregnancyStatus,
          });
        }
      }

      if (vitalSignsResponse.status === 'fulfilled' && vitalSignsResponse.value?.success) {
        const vitals = vitalSignsResponse.value.vitals ?? {};
        const extractedKeys = (Object.keys(vitals) as RmeVitalFieldKey[]).filter((key) =>
          Boolean(vitals[key])
        );

        if (extractedKeys.length > 0) {
          setTTVState((prev) => ({ ...prev, ...vitals }));
          setRmeVitalFieldKeys(extractedKeys);
        }
      }
    } catch (error) {
      sidepanelLog.warn('fetchPatientData failed', {
        message: error instanceof Error ? error.message : 'unknown error',
      });
      failClosedPatientExtract(PATIENT_EXTRACT_FAILURE_MESSAGE);
    } finally {
      setIsLoadingPatient(false);
    }
  }, []);

  const handleSentraUplink = useCallback(async () => {
    const tenagaMedisResponse = await sendMessage('resolveTenagaMedis', undefined).catch(
      () => null
    );
    const tenagaMedis =
      tenagaMedisResponse?.success && tenagaMedisResponse.tenagaMedis
        ? {
            dokterNama: tenagaMedisResponse.tenagaMedis.dokterNama || undefined,
            perawatNama: tenagaMedisResponse.tenagaMedis.perawatNama || undefined,
          }
        : {};

    const { payload } = buildRMETransferPayload({
      keluhanUtama:
        anamnesaDraft?.payload.keluhan_utama ||
        encounterComplaint.keluhan_utama ||
        ttvState.symptomText ||
        '',
      keluhanTambahan:
        anamnesaDraft?.payload.keluhan_tambahan || encounterComplaint.keluhan_tambahan || '',
      patientGender: patientData.gender || 'L',
      patientAge: patientData.age,
      pregnancyStatus: ttvState.pregnancyStatus,
      allergies: ttvState.allergies,
      vitalSigns: {
        sbp: parseIntOrUndefined(ttvState.sbp),
        dbp: parseIntOrUndefined(ttvState.dbp),
        hr: parseIntOrUndefined(ttvState.hr),
        rr: parseIntOrUndefined(ttvState.rr),
        temp: parseFloatOrUndefined(ttvState.temp),
        glucose: parseIntOrUndefined(ttvState.glucose),
      },
      tenagaMedis,
      hasVisitHistory: Boolean(prefetchedVisitHistory?.visits?.length),
      spo2: parseIntOrUndefined(ttvState.spo2),
      avpu: ttvState.avpu,
      painScore: parseIntOrUndefined(ttvState.pain_score),
      disabilityType: ttvState.disabilityType || undefined,
      obesityConfirmation:
        ttvState.obesityConfirmation === 'confirmed' ||
        ttvState.obesityConfirmation === 'morbid_obesity',
      anamnesaDraftPayload: anamnesaDraft?.payload,
    });

    const result = (await sendMessage('transferRME', {
      ...payload,
      options: {
        ...payload.options,
        startFromStep: 'anamnesa',
        onlyStep: 'anamnesa',
      },
    })) as RMETransferResult | null;
    if (result && result.state === 'failed') {
      const reason = result.reasonCodes?.join(', ') || 'unknown';
      throw new Error(`Gagal mengisi RME (${reason}). Reload halaman ePuskesmas lalu coba lagi.`);
    }
  }, [
    anamnesaDraft,
    encounterComplaint.keluhan_tambahan,
    encounterComplaint.keluhan_utama,
    patientData.gender,
    prefetchedVisitHistory?.visits?.length,
    ttvState,
  ]);

  return (
    <div className="shell-route-stage">
      <AnimatePresence mode="wait" initial={false}>
        {showCredits ? (
          <motion.div
            key="credits"
            role="presentation"
            initial="initial"
            animate="enter"
            exit="exit"
            variants={pageVariants}
            className="shell-route-motion w-full min-h-screen"
          >
            <CreditsView onBack={() => setShowCredits(false)} />
          </motion.div>
        ) : isCheckingAuth ? (
          <motion.div
            key="auth-check"
            role="presentation"
            initial="initial"
            animate="enter"
            exit="exit"
            variants={pageVariants}
            className="shell-route-motion w-full min-h-screen"
          />
        ) : authUser === null ? (
          <motion.div
            key="login"
            role="presentation"
            initial="initial"
            animate="enter"
            exit="exit"
            variants={pageVariants}
            className="shell-route-motion w-full min-h-screen"
          >
            <ConsoleLogin onLoginSuccess={handleConsoleLoginSuccess} />
          </motion.div>
        ) : showDashboard ? (
          <motion.div
            key="dash"
            role="presentation"
            initial="initial"
            animate="enter"
            exit="exit"
            variants={pageVariants}
            className="shell-route-motion w-full min-h-screen"
          >
            <DashboardView
              user={authUser}
              onLaunchConsole={handleLaunchConsole}
              onLogout={handleLogout}
            />
          </motion.div>
        ) : (
          <motion.div
            key="main"
            role="presentation"
            initial="initial"
            animate="enter"
            exit="exit"
            variants={pageVariants}
            className="shell-route-motion w-full min-h-screen"
          >
            <div className="sidepanel-shell p-4 flex flex-col gap-4 overflow-y-auto min-h-screen">
              <div
                className={`sentra-card flex flex-col h-full ${
                  bootSequenceActive ? 'sentra-card--boot-sequence' : ''
                }`}
                data-sentra-id="main-container"
              >
                <SidePanelHeader
                  activeEngine={activeEngine}
                  activeSurface={activeInferenceSurface}
                  onEngineChange={handleEngineChange}
                  showPatientSummary={activeInferenceSurface === 'main'}
                  showVisitHistoryTrigger={activeInferenceSurface === 'main'}
                  patientName={visiblePatientName}
                  patientAge={patientData.age}
                  patientRM={patientData.rm}
                  patientGender={patientData.gender}
                  patientFacilityName={clinicalContext.facilityName}
                  chronicHistorySummary={patientHistorySummary}
                  onRefreshPatient={fetchPatientData}
                  isLoadingPatient={isLoadingPatient}
                  demographicStatus={demographicStatus}
                  historyStatus={historyStatus}
                  doctorOnlineCount={doctorOnlineCount}
                  alertCount={emergencyAlerts.length}
                  triageZone={triageVerdict.zone}
                  previousVisitSections={headerVisitHistorySections}
                  vitalWarnings={vitalWarnings}
                  ocrActive={ocrLightingActive}
                  onOpenDashboard={handleOpenDashboardTrajectory}
                  onOpenDiagnosis={handleOpenDiagnosis}
                  onOpenStats={handleOpenStats}
                  onInitialisasi={() => {
                    setOcrLightingActive(true);
                    setPatientData(defaultPatient);
                    setPatientAgeKnown(false);
                    setPatientExtractError(null);
                    setTTVState(initialTTVState);
                    setRmeVitalFieldKeys([]);
                    setEmergencyAlerts([]);
                    setTriageVerdict(STANDBY_TRIAGE_VERDICT);
                    setAnamnesaDraft(null);
                    setActiveInferenceSurface('main');
                    void fetchPatientData({ patientLoadedSound: true });
                  }}
                />
                {patientExtractError ? (
                  <div
                    role="alert"
                    data-testid="patient-extract-error"
                    className="px-4 pt-2 text-sm"
                    style={{ color: 'var(--danger, #b42318)' }}
                  >
                    {patientExtractError}
                  </div>
                ) : null}
                <section
                  className="flex-1 min-h-0 overflow-y-auto p-4 relative"
                  aria-label="Konten tab engine"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {activeEngine === 'vs' ? (
                      <motion.div
                        key="tab-ttv"
                        role="tabpanel"
                        id="sidepanel-tabpanel-ttv"
                        aria-labelledby="sidepanel-tab-ttv"
                        initial="initial"
                        animate="enter"
                        exit="exit"
                        variants={tabPanelVariants}
                        className="shell-tab-panel w-full"
                      >
                        {activeInferenceSurface === 'main' ? (
                          <TTVInferenceUI
                            patientName={visiblePatientName}
                            patientGender={patientData.gender}
                            patientAge={patientData.age}
                            patientAgeKnown={patientAgeKnown}
                            patientRM={patientData.rm}
                            patientDOB={patientData.dob}
                            patientBloodType={patientData.bloodType}
                            patientBPJSStatus={patientData.bpjsStatus}
                            patientKelurahan={patientData.kelurahan}
                            rmeVitalFieldKeys={rmeVitalFieldKeys}
                            onComplete={(data) => setAnamnesaDraft(data.anamnesaDraft)}
                            onAlertsChange={setEmergencyAlerts}
                            onTriageVerdictChange={setTriageVerdict}
                            onAccessEmergency={() => {
                              setActiveInferenceSurface('main');
                              setActiveEngine('emergency');
                            }}
                            ttvState={ttvState}
                            onTTVStateChange={setTTVState}
                            onRefreshPatient={fetchPatientData}
                            isLoadingPatient={isLoadingPatient}
                            onChronicHistoryChange={setPatientHistorySummary}
                            prefilledHistoryFlags={prefilledHistoryFlags}
                            extractedSpecialConditions={clinicalContext.specialConditions}
                            extractedPregnancyRisk={clinicalContext.pregnancyRisk}
                            extractedFacilityName={clinicalContext.facilityName}
                            extractedPayerLabel={clinicalContext.payerLabel}
                            extractedAllergies={clinicalContext.allergies}
                            extractedPregnancyStatus={clinicalContext.pregnancyStatus}
                            prefetchedVisits={prefetchedVisitHistory?.visits}
                            bootSequenceActive={bootSequenceActive}
                            onSentraUplink={handleSentraUplink}
                            onNavigateToTrajectory={() => setActiveInferenceSurface('workbench')}
                            getMiraDifferential={async () =>
                              sendMessage('getConsultMiraDifferential', undefined)
                            }
                          />
                        ) : activeInferenceSurface === 'workbench' ? (
                          <div data-testid="sentra-approved-workbench-slot">
                            <ClinicalReasoningWorkbench
                              vitals={{
                                sbp: ttvState.sbp,
                                dbp: ttvState.dbp,
                                hr: ttvState.hr,
                                rr: ttvState.rr,
                                temp: ttvState.temp,
                                spo2: ttvState.spo2,
                                glucose: ttvState.glucose,
                                avpu: ttvState.avpu,
                                supplemental_o2: ttvState.supplemental_o2,
                              }}
                              symptomText={ttvState.symptomText}
                              allergies={ttvState.allergies}
                              pregnancyStatus={ttvState.pregnancyStatus}
                              disabilityType={ttvState.disabilityType}
                              obesityConfirmation={ttvState.obesityConfirmation}
                              autosenPreset={ttvState.autosenPreset}
                              patient={{
                                name: visiblePatientName,
                                gender: patientData.gender,
                                age: patientData.age,
                                rm: patientData.rm,
                                dob: patientData.dob,
                                bpjsStatus: patientData.bpjsStatus,
                                kelurahan: patientData.kelurahan,
                              }}
                              clinicalContext={clinicalContext}
                              chronicHistorySummary={patientHistorySummary}
                              anamnesaDraft={anamnesaDraft}
                              emergencyAlerts={emergencyAlerts}
                              prefetchedVisitHistory={prefetchedVisitHistory}
                              onOpenDifferential={handleOpenDiagnosis}
                            />
                          </div>
                        ) : activeInferenceSurface === 'statistics' ? (
                          <div data-testid="sentra-statistic-surface">
                            <StatisticSection />
                          </div>
                        ) : (
                          <ClinicalDifferential
                            keluhanUtama={
                              anamnesaDraft?.payload.keluhan_utama ||
                              encounterComplaint.keluhan_utama ||
                              ttvState.symptomText ||
                              '-'
                            }
                            keluhanTambahan={
                              anamnesaDraft?.payload.keluhan_tambahan ||
                              encounterComplaint.keluhan_tambahan ||
                              ''
                            }
                            patientAge={patientData.age}
                            patientGender={patientData.gender}
                            patientRM={patientData.rm}
                            allergies={
                              ttvState.allergies.length > 0
                                ? ttvState.allergies
                                : clinicalContext.allergies
                            }
                            confirmedPregnancyStatus={
                              patientData.gender === 'L'
                                ? false
                                : (ttvState.pregnancyStatus ?? clinicalContext.pregnancyStatus)
                            }
                            vitals={{
                              sbp: parseIntOrUndefined(ttvState.sbp) ?? 0,
                              dbp: parseIntOrUndefined(ttvState.dbp) ?? 0,
                              hr: parseIntOrUndefined(ttvState.hr) ?? 0,
                              rr: parseIntOrUndefined(ttvState.rr) ?? 0,
                              temp: parseFloatOrUndefined(ttvState.temp) ?? 0,
                              glucose: parseIntOrUndefined(ttvState.glucose) ?? 0,
                            }}
                            hasVisitHistory={Boolean(prefetchedVisitHistory?.visits?.length)}
                            chronicTherapies={chronicTherapyNames}
                            visitSummaryContext={{
                              facilityName: clinicalContext.facilityName,
                              triage: {
                                zone: triageVerdict.zone,
                                headline: triageVerdict.headlineAlert?.title ?? null,
                              },
                              spo2: parseIntOrUndefined(ttvState.spo2) ?? null,
                              visitHistory: prefetchedVisitHistory?.visits ?? [],
                            }}
                            onBack={() => setActiveInferenceSurface('workbench')}
                          />
                        )}
                      </motion.div>
                    ) : activeEngine === 'emergency' ? (
                      <motion.div
                        key="tab-emergency"
                        role="tabpanel"
                        id="sidepanel-tabpanel-emergency"
                        aria-labelledby="sidepanel-tab-emergency"
                        initial="initial"
                        animate="enter"
                        exit="exit"
                        variants={tabPanelVariants}
                        className="shell-tab-panel w-full"
                      >
                        <EmergencyDashboard
                          alerts={triageVerdict.sortedAlerts}
                          verdict={triageVerdict}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="tab-medlens"
                        role="tabpanel"
                        id="sidepanel-tabpanel-medlens"
                        aria-labelledby="sidepanel-tab-medlens"
                        initial="initial"
                        animate="enter"
                        exit="exit"
                        variants={tabPanelVariants}
                        className="shell-tab-panel w-full"
                      >
                        <Suspense
                          fallback={
                            <div className="animate-pulse text-center py-10 text-[var(--text-muted)] text-xs">
                              Loading...
                            </div>
                          }
                        >
                          <MedLensConsole />
                        </Suspense>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
                <SidePanelFooter
                  workspace="Puskesmas Balowerti"
                  section={engineConfig[activeEngine].section}
                  loadingPatient={isLoadingPatient}
                  onShowCredits={() => setShowCredits(true)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ABCDE_PHASE_ORDER: ABCDEPhase[] = ['A', 'B', 'C', 'D', 'E', 'other'];

function groupStepsByPhase(steps: ActionStep[]): { phase: ABCDEPhase; actions: string[] }[] {
  return ABCDE_PHASE_ORDER.map((phase) => ({
    phase,
    actions: steps.filter((step) => step.phase === phase).map((step) => step.action),
  })).filter((group) => group.actions.length > 0);
}

const REASSESSMENT_TIMER_BY_SEVERITY: Record<ScreeningAlert['severity'], string> = {
  critical: 'Reevaluasi dalam 5 menit',
  high: 'Reevaluasi dalam 15 menit',
  warning: 'Reevaluasi dalam 30 menit',
};

const ZONE_LABEL: Record<TriageVerdict<ScreeningAlert>['zone'], string> = {
  merah: 'MERAH',
  kuning: 'KUNING',
  hijau: 'HIJAU',
  standby: 'STANDBY',
};

export function EmergencyDashboard({
  alerts,
  verdict,
}: {
  alerts: ScreeningAlert[];
  verdict: TriageVerdict<ScreeningAlert>;
}) {
  return (
    <div className="emg-timeline mt-4" data-testid="sentra-emergency-surface">
      <div className={`emg-verdict emg-verdict--${verdict.zone}`}>
        <div className="emg-verdict__header">
          <div className="emg-verdict__zone">{ZONE_LABEL[verdict.zone]}</div>
          {verdict.headlineAlert ? (
            <div className="emg-verdict__title">{verdict.headlineAlert.title}</div>
          ) : null}
        </div>
        {verdict.headlineAlert ? (
          <>
            <section className="emg-verdict__why emg-verdict__section">
              <h4 className="emg-verdict__label emg-verdict__heading">Mengapa penting</h4>
              <span>{verdict.headlineAlert.reasoning}</span>
            </section>
            {(() => {
              const protocol = verdict.headlineAlert.actionProtocolId
                ? getActionProtocol(verdict.headlineAlert.actionProtocolId)
                : undefined;
              return (
                <>
                  <section className="emg-verdict__donow emg-verdict__section">
                    <h4 className="emg-verdict__label emg-verdict__heading">Lakukan sekarang</h4>
                    {protocol ? (
                      groupStepsByPhase(protocol.steps).map((group) => (
                        <div key={group.phase} className="emg-verdict__phase-group">
                          <span className="emg-verdict__phase-tag">{group.phase}</span>
                          <ul>
                            {group.actions.map((action, i) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      ))
                    ) : (
                      <ul>
                        {verdict.headlineAlert.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                  {protocol?.contraindications && protocol.contraindications.length > 0 ? (
                    <section className="emg-verdict__donot emg-verdict__section">
                      <h4 className="emg-verdict__label emg-verdict__heading">Jangan lakukan</h4>
                      <ul>
                        {protocol.contraindications.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {protocol ? (
                    <section className="emg-verdict__refer emg-verdict__section">
                      <h4 className="emg-verdict__label emg-verdict__heading">Pemicu rujukan</h4>
                      <ul>
                        {protocol.referralCriteria.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  <section className="emg-verdict__timer emg-verdict__section">
                    <h4 className="emg-verdict__label emg-verdict__heading">Evaluasi ulang</h4>
                    <span>{REASSESSMENT_TIMER_BY_SEVERITY[verdict.headlineAlert.severity]}</span>
                  </section>
                  {protocol ? (
                    <section className="emg-verdict__evidence emg-verdict__section">
                      <h4 className="emg-verdict__label emg-verdict__heading">Dasar bukti</h4>
                      <span>{protocol.source}</span>
                    </section>
                  ) : null}
                </>
              );
            })()}
            {verdict.zone === 'merah' || verdict.zone === 'kuning' ? (
              <SendToDoctorsButton zone={verdict.zone} />
            ) : null}
          </>
        ) : (
          <div className="emg-verdict__empty">
            {verdict.zone === 'standby'
              ? 'Belum ada data vital — masukkan tanda vital untuk memulai skrining.'
              : 'Tidak ada temuan darurat aktif.'}
          </div>
        )}
      </div>
      <div className="emg-timeline__header">
        <span
          className={`emg-timeline__eyebrow${alerts.length > 0 ? ' emg-timeline__eyebrow--active' : ''}`}
        >
          SENTRA ASSIST · STATUS DARURAT
        </span>
        {alerts.length > 0 ? (
          <span className="emg-timeline__tally">{alerts.length} temuan</span>
        ) : null}
      </div>

      {alerts.length === 0 ? (
        <div className="emg-timeline__empty">
          <span className="emg-timeline__empty-line">— Tidak ada temuan darurat aktif</span>
          <span className="emg-timeline__empty-sub">
            Masukkan tanda vital untuk memulai skrining klinis
          </span>
        </div>
      ) : (
        <div className="emg-timeline__track">
          {alerts.map((alert, index) => (
            <div key={alert.id} className="emg-entry" style={{ animationDelay: `${index * 60}ms` }}>
              <div className="emg-entry__spine">
                <div className={`emg-entry__dot emg-entry__dot--${alert.severity}`} />
                {index < alerts.length - 1 ? <div className="emg-entry__line" /> : null}
              </div>
              <div className="emg-entry__content">
                <div className="emg-entry__meta">
                  <span className="emg-entry__gate">
                    {alert.gate.replace('GATE_', 'G').replace(/_/g, '·')}
                  </span>
                </div>
                <div className="emg-entry__title">{alert.title}</div>
                <div className="emg-entry__reasoning">{alert.reasoning}</div>
                {alert.recommendations.length > 0 ? (
                  <div className="emg-entry__recs">
                    {formatRecommendationLines(alert.recommendations).map((line, lineIndex) =>
                      line.kind === 'section' ? (
                        <div key={lineIndex} className="emg-entry__rec--section">
                          {line.text}
                        </div>
                      ) : (
                        <div
                          key={lineIndex}
                          className={`emg-entry__rec${line.kind === 'note' ? ' emg-entry__rec--note' : ''}`}
                        >
                          {line.kind === 'item' ? (
                            <span className="emg-entry__rec-index">{line.index}</span>
                          ) : (
                            <span className="emg-entry__rec-bullet" />
                          )}
                          <span className="emg-entry__rec-text">{line.text}</span>
                        </div>
                      )
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-black text-red-500 font-mono text-xs" role="alert">
          <h1 className="text-orange-500 text-lg mb-4">Sentra Assist membutuhkan reload</h1>
          <p className="text-red-300">
            Console klinis tidak dapat dimuat. Reload panel dan ulangi sinkronisasi pasien.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded"
          >
            REBOOT SYSTEM
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

bootstrapThemeDocument();

const rootEl = document.getElementById('root');

if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <ThemeProvider>
          <SentraAssistSidepanelApp />
        </ThemeProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
