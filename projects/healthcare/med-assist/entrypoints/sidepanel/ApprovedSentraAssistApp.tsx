import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  SentraAssistPanel,
  type SentraAssistPanelInputSnapshot,
} from './components/SentraAssistPanel';

import { OperationalSettingsConsole } from '@/components/clinical/OperationalSettingsConsole';
import type { ScreeningAlert } from '@/components/clinical/TTVInferenceUI';
import { ClinicalReasoningWorkbench } from '@/components/sidepanel/ClinicalReasoningWorkbench';
import { extractClinicalAnamnesis } from '@/lib/api/bridge-client';
import {
  composeAnamnesaDraft,
  composeAnamnesaDraftFromExtraction,
} from '@/lib/clinical/anamnesa-composer';
import type {
  AutosenPreset,
  DisabilityType,
  ObesityConfirmation,
} from '@/lib/clinical/autosen-types';
import { buildVitalAutofill } from '@/lib/clinical/vital-autocomplete';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';
import { createLogger } from '@/utils/logger';
import { sendMessage } from '@/utils/messaging';

interface PatientData {
  name: string;
  gender: 'L' | 'P';
  age: number;
  rm: string;
  dob: string;
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
  patient?: {
    name: string;
    gender: 'L' | 'P';
    age: number;
    rm: string;
    dob: string;
    bpjsStatus: PatientData['bpjsStatus'];
    kelurahan: string;
  };
};
type ExtractedClinicalContext = {
  facilityName: string;
  payerLabel: string;
  specialConditions: string[];
  pregnancyRisk: string;
  allergies: string[];
  pregnancyStatus: boolean | null;
};
type ChromeTabsApi = {
  query: (queryInfo: {
    active?: boolean;
    currentWindow?: boolean;
  }) => Promise<Array<{ id?: number }>>;
  sendMessage: <T = unknown>(tabId: number, message: unknown) => Promise<T>;
};

const CHRONIC_FLAG_ORDER = ['dm', 'ht', 'jantung', 'stroke', 'ginjal', 'asma'] as const;
const HISTORY_FLAG_META: Record<
  (typeof CHRONIC_FLAG_ORDER)[number],
  { labels: string[]; display: string }
> = {
  dm: { labels: ['DM'], display: 'DM' },
  ht: { labels: ['HT'], display: 'HT' },
  jantung: { labels: ['HF', 'CHD', 'JANTUNG'], display: 'Jantung' },
  stroke: { labels: ['STROKE'], display: 'Stroke' },
  ginjal: { labels: ['CKD', 'GINJAL'], display: 'Ginjal' },
  asma: { labels: ['ASTHMA', 'ASMA'], display: 'Asma' },
};

const logger = createLogger('ApprovedSentraAssistApp', 'global');

const DEFAULT_PANEL_INPUT: SentraAssistPanelInputSnapshot = {
  gejala: '',
  riwayatAlergi: '',
  statusKehamilan: 'Tidak relevan',
  disabilitas: '',
  obesitas: '',
  beratBadan: '',
  sistolik: '',
  diastolik: '',
  nadi: '',
  suhu: '',
  gula: '',
  pernafasan: '',
  saturasi: '',
};

const defaultPatient: PatientData = {
  name: 'Memuat...',
  gender: 'L',
  age: 0,
  rm: '-',
  dob: '',
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

function buildHistorySummary(flags: PrefilledHistoryFlags): string {
  const selected = CHRONIC_FLAG_ORDER.filter((key) => flags[key]).map(
    (key) => HISTORY_FLAG_META[key].display
  );
  return selected.length > 0 ? selected.join(', ') : 'Menunggu Input';
}

function normalizeAllergyInput(value: string, extracted: string[]): string[] {
  const fromField = value.trim();
  if (fromField && !/tidak ada alergi|tidak relevan|tidak/i.test(fromField)) {
    return [fromField];
  }
  return extracted;
}

function resolvePregnancyStatus(
  inputValue: string,
  patientGender: 'L' | 'P',
  extractedStatus: boolean | null
): boolean | null {
  if (patientGender === 'L') {
    return false;
  }

  if (/tidak hamil/i.test(inputValue)) {
    return false;
  }

  if (/hamil/i.test(inputValue)) {
    return true;
  }

  return extractedStatus;
}

function mapDisabilityType(inputValue: string): DisabilityType {
  if (/fisik/i.test(inputValue)) {
    return 'Daksa';
  }
  if (/sensorik/i.test(inputValue)) {
    return 'Rungu';
  }
  if (/intelektual/i.test(inputValue)) {
    return 'Intelektual';
  }
  return '';
}

function mapObesityConfirmation(inputValue: string): ObesityConfirmation {
  if (/morbid|obesitas\s*ii/i.test(inputValue)) {
    return 'morbid_obesity';
  }
  if (/obesitas/i.test(inputValue)) {
    return 'confirmed';
  }
  if (/normal|overweight/i.test(inputValue)) {
    return 'not_confirmed';
  }
  return '';
}

function buildAutosenPreset(input: SentraAssistPanelInputSnapshot): AutosenPreset {
  const glucose = Number.parseInt(input.gula, 10);
  const systolic = Number.parseInt(input.sistolik, 10);

  if (Number.isFinite(glucose) && glucose >= 200) {
    return 'hyperglycemia';
  }

  if (Number.isFinite(systolic) && systolic >= 140) {
    return 'hypertension';
  }

  return 'adl';
}

function parseChronicDiseases(summary: string): string[] {
  if (!summary || summary === 'Menunggu Input') {
    return [];
  }

  return summary
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toVitalsFromSnapshot(snapshot: SentraAssistPanelInputSnapshot) {
  return {
    sbp: Number.parseInt(snapshot.sistolik, 10) || 0,
    dbp: Number.parseInt(snapshot.diastolik, 10) || 0,
    hr: Number.parseInt(snapshot.nadi, 10) || 0,
    rr: Number.parseInt(snapshot.pernafasan, 10) || 0,
    temp: Number.parseFloat(snapshot.suhu) || 0,
    spo2: Number.parseInt(snapshot.saturasi, 10) || 0,
    glucose: Number.parseInt(snapshot.gula, 10) || 0,
  };
}

export function ApprovedSentraAssistApp(): JSX.Element {
  const [panelInput, setPanelInput] = useState<SentraAssistPanelInputSnapshot>(DEFAULT_PANEL_INPUT);
  const [patientData, setPatientData] = useState<PatientData>(defaultPatient);
  const [patientHistorySummary, setPatientHistorySummary] = useState('Menunggu Input');
  const [clinicalContext, setClinicalContext] =
    useState<ExtractedClinicalContext>(defaultClinicalContext);
  const [prefetchedVisitHistory, setPrefetchedVisitHistory] =
    useState<PrefetchedVisitHistory | null>(null);
  const [emergencyAlerts] = useState<ScreeningAlert[]>([]);

  const allergyList = useMemo(
    () => normalizeAllergyInput(panelInput.riwayatAlergi, clinicalContext.allergies),
    [clinicalContext.allergies, panelInput.riwayatAlergi]
  );

  const pregnancyStatus = useMemo(
    () =>
      resolvePregnancyStatus(
        panelInput.statusKehamilan,
        patientData.gender,
        clinicalContext.pregnancyStatus
      ),
    [clinicalContext.pregnancyStatus, panelInput.statusKehamilan, patientData.gender]
  );

  const disabilityType = useMemo(
    () => mapDisabilityType(panelInput.disabilitas),
    [panelInput.disabilitas]
  );

  const obesityConfirmation = useMemo(
    () => mapObesityConfirmation(panelInput.obesitas),
    [panelInput.obesitas]
  );

  const autosenPreset = useMemo(() => buildAutosenPreset(panelInput), [panelInput]);

  const anamnesaDraft = useMemo(() => {
    const symptomText = panelInput.gejala.trim();
    if (!symptomText) {
      return null;
    }

    return composeAnamnesaDraft({
      symptomText,
      patientGender: patientData.gender,
      chronicDiseases: parseChronicDiseases(patientHistorySummary),
      allergies: allergyList,
      pregnancyStatus,
      specialConditions: clinicalContext.specialConditions,
      pregnancyRisk: clinicalContext.pregnancyRisk,
      vitals: {
        sbp: Number.parseInt(panelInput.sistolik, 10) || 0,
        dbp: Number.parseInt(panelInput.diastolik, 10) || 0,
        hr: Number.parseInt(panelInput.nadi, 10) || 0,
        rr: Number.parseInt(panelInput.pernafasan, 10) || 0,
        temp: Number.parseFloat(panelInput.suhu) || 0,
        spo2: Number.parseInt(panelInput.saturasi, 10) || 0,
        glucose: Number.parseInt(panelInput.gula, 10) || 0,
      },
      disabilityType,
      obesityConfirmation,
      autosenPresetLabel: autosenPreset,
    });
  }, [
    allergyList,
    autosenPreset,
    clinicalContext.pregnancyRisk,
    clinicalContext.specialConditions,
    disabilityType,
    obesityConfirmation,
    panelInput.diastolik,
    panelInput.gejala,
    panelInput.gula,
    panelInput.nadi,
    panelInput.pernafasan,
    panelInput.saturasi,
    panelInput.sistolik,
    panelInput.suhu,
    patientData.gender,
    patientHistorySummary,
    pregnancyStatus,
  ]);

  const fetchPatientData = useCallback(async () => {
    setPatientHistorySummary('Menunggu Input');
    setClinicalContext(defaultClinicalContext);

    try {
      const chromeTabs = getChromeTabsApi();
      if (!chromeTabs) {
        return;
      }

      const [tab] = await chromeTabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        return;
      }

      const [patientResponse, medicalHistoryResponse, visitHistoryResponse, contextResponse] =
        await Promise.allSettled([
          chromeTabs.sendMessage(tab.id, { type: 'getPatientInfo' }),
          sendMessage('scanMedicalHistory', undefined),
          sendMessage('scanVisitHistory', undefined),
          sendMessage('scanClinicalContext', undefined),
        ]);

      let resolvedPatientRM = defaultPatient.rm;

      if (patientResponse.status === 'fulfilled') {
        const payload = patientResponse.value as PatientInfoResponse;
        if (payload.success && payload.patient) {
          const patient = payload.patient;
          resolvedPatientRM = patient.rm;
          setPatientData({
            name: patient.name,
            gender: patient.gender,
            age: patient.age,
            rm: patient.rm,
            dob: patient.dob,
            bpjsStatus: patient.bpjsStatus,
            kelurahan: patient.kelurahan,
          });
        }
      }

      if (medicalHistoryResponse.status === 'fulfilled' && medicalHistoryResponse.value?.success) {
        const flags = mapMedicalHistoryToFlags(medicalHistoryResponse.value.history);
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
    } catch (error) {
      logger.warn('fetchPatientData failed', {
        message: error instanceof Error ? error.message : 'unknown error',
      });
    }
  }, []);

  useEffect(() => {
    void fetchPatientData();
  }, [fetchPatientData]);

  const handleAutocompleteGejala = useCallback(
    async (snapshot: SentraAssistPanelInputSnapshot) => {
      const symptomText = snapshot.gejala.trim();
      if (!symptomText) {
        return;
      }

      const allergies = normalizeAllergyInput(snapshot.riwayatAlergi, clinicalContext.allergies);
      const pregnancyStatus = resolvePregnancyStatus(
        snapshot.statusKehamilan,
        patientData.gender,
        clinicalContext.pregnancyStatus
      );
      const disabilityType = mapDisabilityType(snapshot.disabilitas);
      const obesityConfirmation = mapObesityConfirmation(snapshot.obesitas);
      const autosenPreset = buildAutosenPreset(snapshot);

      const composeLocalDraft = () =>
        composeAnamnesaDraft({
          symptomText,
          patientGender: patientData.gender,
          chronicDiseases: parseChronicDiseases(patientHistorySummary),
          allergies,
          pregnancyStatus,
          specialConditions: clinicalContext.specialConditions,
          pregnancyRisk: clinicalContext.pregnancyRisk,
          vitals: toVitalsFromSnapshot(snapshot),
          disabilityType,
          obesityConfirmation,
          autosenPresetLabel: autosenPreset,
        });

      try {
        const extraction = await extractClinicalAnamnesis(symptomText);
        const draft = composeAnamnesaDraftFromExtraction(extraction, {
          symptomText,
          patientGender: patientData.gender,
          chronicDiseases: parseChronicDiseases(patientHistorySummary),
          allergies,
          pregnancyStatus,
          specialConditions: clinicalContext.specialConditions,
          pregnancyRisk: clinicalContext.pregnancyRisk,
          vitals: toVitalsFromSnapshot(snapshot),
          disabilityType,
          obesityConfirmation,
          autosenPresetLabel: autosenPreset,
        });

        return { gejala: draft.payload.keluhan_tambahan || symptomText };
      } catch (error) {
        logger.warn('Autocomplete extraction fallback to local composer', {
          message: error instanceof Error ? error.message : 'unknown error',
        });

        const draft = composeLocalDraft();
        return { gejala: draft.payload.keluhan_tambahan || symptomText };
      }
    },
    [
      clinicalContext.allergies,
      clinicalContext.pregnancyRisk,
      clinicalContext.pregnancyStatus,
      clinicalContext.specialConditions,
      patientData.gender,
      patientHistorySummary,
    ]
  );

  const handleAutocompleteVitals = useCallback(
    async (snapshot: SentraAssistPanelInputSnapshot) => {
      const generated = buildVitalAutofill(
        buildAutosenPreset(snapshot) || 'adl',
        patientData.age,
        Date.now()
      );

      return {
        sistolik: generated.vitals.sbp,
        diastolik: generated.vitals.dbp,
        nadi: generated.vitals.hr,
        suhu: generated.vitals.temp,
        gula: generated.vitals.glucose,
        pernafasan: generated.vitals.rr,
        saturasi: generated.vitals.spo2,
      };
    },
    [patientData.age]
  );

  const handleUplink = useCallback(async (snapshot: SentraAssistPanelInputSnapshot) => {
    setPanelInput(snapshot);
  }, []);

  const handleOcr = useCallback(
    async (snapshot: SentraAssistPanelInputSnapshot) => handleAutocompleteGejala(snapshot),
    [handleAutocompleteGejala]
  );

  return (
    <div className="sidepanel-shell min-h-screen px-4 py-4">
      <SentraAssistPanel
        onInputChange={setPanelInput}
        onAutocompleteGejala={handleAutocompleteGejala}
        onAutocompleteVitals={handleAutocompleteVitals}
        onUplink={handleUplink}
        onDemograf={fetchPatientData}
        onOcr={handleOcr}
        settingsContent={<OperationalSettingsConsole />}
        workbench={
          <ClinicalReasoningWorkbench
            vitals={{
              sbp: panelInput.sistolik,
              dbp: panelInput.diastolik,
              hr: panelInput.nadi,
              rr: panelInput.pernafasan,
              temp: panelInput.suhu,
              spo2: panelInput.saturasi,
              glucose: panelInput.gula,
            }}
            symptomText={panelInput.gejala}
            allergies={allergyList}
            pregnancyStatus={pregnancyStatus}
            disabilityType={disabilityType}
            obesityConfirmation={obesityConfirmation}
            autosenPreset={autosenPreset}
            patient={patientData}
            clinicalContext={clinicalContext}
            chronicHistorySummary={patientHistorySummary}
            anamnesaDraft={anamnesaDraft}
            emergencyAlerts={emergencyAlerts}
            prefetchedVisitHistory={prefetchedVisitHistory}
          />
        }
      />
    </div>
  );
}
