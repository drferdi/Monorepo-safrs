// Ghost Protocols — Iskandar Diagnosis Engine V1
// Ported 1:1 from console-boot-demo.html reference design

import { ChevronDown } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { MiraStatusDot } from './MiraStatusDot';
import ThemeToggle from '../ui/ThemeToggle';

import type { VitalWarningSlot } from '@/lib/clinical/vital-warning-selector';
import type { TriageZone } from '@/lib/emergency-detector/triage-verdict';
import { getDiagnosisEngineConfig } from '@/lib/iskandar-diagnosis-engine/feature-flags';
import { sendMessage } from '@/utils/messaging';

interface EngineButton {
  id: string;
  label: string;
}

type ShellStatus = 'standby' | 'syncing' | 'ready' | 'insufficient';

export interface HeaderVisitHistorySection {
  key: string;
  title: string;
  rows: Array<{ label: string; value: string }>;
}

/** Matches `id` on tabpanels in main.tsx (`sidepanel-tabpanel-*`). */
const ENGINE_TAB_PANEL_ID: Record<string, string> = {
  vs: 'sidepanel-tabpanel-ttv',
  emergency: 'sidepanel-tabpanel-emergency',
  medlens: 'sidepanel-tabpanel-medlens',
};

const ENGINE_TAB_TRIGGER_ID: Record<string, string> = {
  vs: 'sidepanel-tab-ttv',
  emergency: 'sidepanel-tab-emergency',
  medlens: 'sidepanel-tab-medlens',
};

const ENGINE_TAB_ORDER = ['vs', 'emergency', 'medlens'] as const;

interface SidePanelHeaderProps {
  activeEngine: string;
  /** The page shown under the START engine; its header button is lit (Chief, 2026-10-02). */
  activeSurface?: 'main' | 'workbench' | 'differential' | 'statistics';
  onEngineChange: (engineId: string) => void;
  showPatientSummary?: boolean;
  showVisitHistoryTrigger?: boolean;
  patientName?: string;
  patientAge?: number;
  patientRM?: string;
  patientGender?: 'L' | 'P' | string;
  patientFacilityName?: string;
  chronicHistorySummary?: string;
  onRefreshPatient?: () => void | Promise<void>;
  isLoadingPatient?: boolean;
  demographicStatus?: ShellStatus;
  historyStatus?: ShellStatus;
  doctorOnlineCount?: number;
  onInitialisasi?: () => void;
  onOpenDashboard?: () => void;
  onOpenDiagnosis?: () => void;
  onOpenStats?: () => void;
  ocrActive?: boolean;
  alertCount?: number;
  previousVisitSections?: HeaderVisitHistorySection[];
  vitalWarnings?: VitalWarningSlot[];
  triageZone?: TriageZone;
}

const engineButtons: EngineButton[] = [
  { id: 'vs', label: 'START' },
  { id: 'emergency', label: 'TRIAGE' },
  { id: 'medlens', label: 'MEDLENS' },
];

export const SidePanelHeader: React.FC<SidePanelHeaderProps> = ({
  activeEngine,
  activeSurface = 'main',
  onEngineChange,
  showPatientSummary = true,
  showVisitHistoryTrigger = true,
  patientName = '---',
  patientAge = 0,
  patientRM = '',
  patientGender = '',
  patientFacilityName = '',
  chronicHistorySummary = 'Menunggu Input',
  onRefreshPatient,
  isLoadingPatient = false,
  demographicStatus = 'standby',
  doctorOnlineCount = 0,
  onInitialisasi,
  onOpenDashboard,
  onOpenDiagnosis,
  onOpenStats,
  ocrActive = false,
  alertCount = 0,
  previousVisitSections = [],
  vitalWarnings = [],
  triageZone = 'standby',
}) => {
  const isReady = demographicStatus === 'ready';
  const onPage = (surface: NonNullable<SidePanelHeaderProps['activeSurface']>) =>
    activeEngine === 'vs' && activeSurface === surface;
  const doctorOnline = doctorOnlineCount > 0;
  const doctorStatusLabel = doctorOnline ? 'Online' : 'Offline';
  const [isVisitHistoryOpen, setIsVisitHistoryOpen] = useState(false);
  const normalizedPatientName = patientName.trim();
  const hasPatientName =
    normalizedPatientName &&
    !/^memuat/i.test(normalizedPatientName) &&
    !/^pasien belum terhubung/i.test(normalizedPatientName) &&
    normalizedPatientName !== '---';
  const patientNameDisplay = hasPatientName ? normalizedPatientName : '';
  const patientAgeDisplay = hasPatientName && patientAge > 0 ? `${patientAge} tahun` : '';
  const normalizedPatientRM = patientRM.trim();
  const patientRMDisplay =
    hasPatientName && normalizedPatientRM && normalizedPatientRM !== '-' ? normalizedPatientRM : '';
  const normalizedPatientGender = patientGender.trim().toUpperCase();
  const patientGenderDisplay =
    hasPatientName && (normalizedPatientGender === 'L' || normalizedPatientGender === 'P')
      ? `Sex: ${normalizedPatientGender}`
      : '';
  const normalizedPatientFacilityName = patientFacilityName.trim();
  const patientFacilityDisplay =
    hasPatientName && normalizedPatientFacilityName ? normalizedPatientFacilityName : '';
  const nameTooltipParts = [
    patientRMDisplay ? `RM ${patientRMDisplay}` : '',
    patientFacilityDisplay,
  ].filter(Boolean);
  const nameTooltip = nameTooltipParts.join(' — ') || undefined;
  const normalizedHistorySummary = chronicHistorySummary.trim();
  const patientHistoryDisplay =
    hasPatientName &&
    normalizedHistorySummary &&
    !/^menunggu input$/i.test(normalizedHistorySummary)
      ? normalizedHistorySummary
      : '';
  const chronicHistorySlots = patientHistoryDisplay
    ? patientHistoryDisplay
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];
  const chronicHistoryTopSlots = chronicHistorySlots.slice(0, 3);
  const chronicHistoryBottomSlots = chronicHistorySlots.slice(3, 6);
  const hasVisitHistoryData = previousVisitSections.some((section) => section.rows.length > 0);
  const showPatientContext = activeEngine !== 'medlens';
  const canOpenVisitHistory = Boolean(showPatientContext && hasPatientName && hasVisitHistoryData);

  const skipFocusSyncRef = useRef(true);

  const handleEngineTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, engineId: string) => {
      const order = ENGINE_TAB_ORDER;
      const i = order.indexOf(engineId as (typeof order)[number]);
      if (i < 0) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next =
          e.key === 'ArrowRight' ? (i + 1) % order.length : (i - 1 + order.length) % order.length;
        onEngineChange(order[next]);
        return;
      }

      if (e.key === 'Home') {
        e.preventDefault();
        onEngineChange(order[0]);
        return;
      }

      if (e.key === 'End') {
        e.preventDefault();
        onEngineChange(order[order.length - 1]);
      }
    },
    [onEngineChange]
  );

  useEffect(() => {
    if (skipFocusSyncRef.current) {
      skipFocusSyncRef.current = false;
      return;
    }
    const id = ENGINE_TAB_TRIGGER_ID[activeEngine];
    if (!id) return;
    document.getElementById(id)?.focus({ preventScroll: true });
  }, [activeEngine]);

  useEffect(() => {
    if (!canOpenVisitHistory && isVisitHistoryOpen) {
      setIsVisitHistoryOpen(false);
    }
  }, [canOpenVisitHistory, isVisitHistoryOpen]);

  useEffect(() => {
    if (getDiagnosisEngineConfig().diagnosisEngine === 'legacy') return;
    sendMessage('miraEnsure', undefined).catch(() => undefined);
  }, []);

  return (
    <div className="card-header">
      {/* Title — knob kiri atas, judul tengah */}
      <div className="header-top relative flex justify-center items-start">
        <div className="absolute left-0 top-0">
          <ThemeToggle />
          <MiraStatusDot />
        </div>
        <div className="title-group text-center">
          <h1 className="card-title-main">Sentra Assist</h1>
          <p className="card-title-sub">Architected by dr Ferdi Iskandar</p>
          <p className="card-title-sub card-title-sub--motto" lang="la">
            <em>Primum non nocere</em>
          </p>
        </div>
      </div>

      {/* Engine tabs — paired with tabpanels in main.tsx (sidepanel-tabpanel-*) */}
      <div className="engine-row engine-tablist" role="tablist" aria-label="Modul engine klinis">
        {engineButtons.map((engine) => {
          const selected = activeEngine === engine.id;
          // START is lit only on its own page; Trajectory, Diagnosis and Stats light their buttons.
          const lit = engine.id === 'vs' ? onPage('main') : selected;
          const panelId = ENGINE_TAB_PANEL_ID[engine.id];
          const triggerId = ENGINE_TAB_TRIGGER_ID[engine.id];
          return (
            <button
              key={engine.id}
              id={triggerId}
              type="button"
              role="tab"
              tabIndex={selected ? 0 : -1}
              aria-selected={selected}
              aria-controls={panelId}
              className={`engine-btn engine-tab ${lit ? 'active' : ''}${
                engine.id === 'emergency'
                  ? triageZone === 'merah'
                    ? ' engine-btn--triage-merah'
                    : triageZone === 'kuning'
                      ? ' engine-btn--triage-kuning'
                      : triageZone === 'hijau'
                        ? ' engine-btn--triage-hijau'
                        : ''
                  : ''
              }`}
              onClick={() => onEngineChange(engine.id)}
              onKeyDown={(e) => handleEngineTabKeyDown(e, engine.id)}
            >
              {engine.label}
              {engine.id === 'emergency' && triageZone !== 'standby' && (
                <span className="engine-tab-dot" aria-label={`${alertCount} temuan klinis aktif`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Status bar — OCR | patient sync | dashboard */}
      <div className="hdr-statusbar" role="group" aria-label="Status sistem">
        <button
          type="button"
          className={`engine-btn engine-tab ${ocrActive ? 'active' : ''}`}
          onClick={onInitialisasi}
          aria-label="OCR — reset dan muat ulang data RME"
        >
          OCR
        </button>

        <button
          type="button"
          className={`engine-btn engine-tab ${isReady ? 'active' : ''}`}
          aria-label={`SYN PATIENT: ${isReady ? 'Siap' : 'Sinkronisasi'}`}
          onClick={() => void onRefreshPatient?.()}
          disabled={!onRefreshPatient || isLoadingPatient}
        >
          SYN PATIENT
        </button>

        <button
          type="button"
          className={`engine-btn engine-tab doctor-avail-chip ${
            doctorOnline ? 'doctor-avail-chip--available' : 'doctor-avail-chip--unavailable'
          }${onPage('workbench') ? ' active' : ''}`}
          aria-current={onPage('workbench') ? 'page' : undefined}
          onClick={onOpenDashboard}
          aria-label={`TRAJECTORY - buka Clinical Trajectory; Dokter: ${doctorStatusLabel}`}
        >
          TRAJECTORY
        </button>
      </div>

      <div className="hdr-statusbar" role="group" aria-label="Aksi review klinis">
        <button
          type="button"
          className={`engine-btn engine-tab${onPage('differential') ? ' active' : ''}`}
          aria-current={onPage('differential') ? 'page' : undefined}
          onClick={onOpenDiagnosis}
          aria-label="DIAGNOSIS - buka Diagnosis & Therapy"
        >
          DIAGNOSIS
        </button>

        <button
          type="button"
          className={`engine-btn engine-tab${onPage('statistics') ? ' active' : ''}`}
          aria-current={onPage('statistics') ? 'page' : undefined}
          aria-label="STATS"
          onClick={onOpenStats}
        >
          STATS
        </button>

        <button type="button" className="engine-btn engine-tab" aria-label="DASHBOARD">
          DASHBOARD
        </button>
      </div>

      {showPatientContext ? (
        <>
          {/* Patient info — values only after demographic data is available */}
          {showPatientSummary ? (
            <div className="patient-bar">
              <span
                className="patient-field patient-field--identity patient-cell patient-cell--name"
                title={nameTooltip}
              >
                {patientNameDisplay}
              </span>
              <span className="patient-cell patient-cell--warning patient-cell--warning-1">
                {vitalWarnings[0] ? `${vitalWarnings[0].label} ${vitalWarnings[0].value}` : ''}
              </span>
              <div
                className="patient-cell patient-cell--history patient-cell--history-top"
                aria-label="Riwayat kronis slot 1 sampai 3"
              >
                {[0, 1, 2].map((slotIndex) => {
                  const value = chronicHistoryTopSlots[slotIndex] ?? '';
                  return (
                    <span
                      key={`history-top-${slotIndex}`}
                      className={`patient-history-slot${value ? '' : ' patient-history-slot--empty'}`}
                      title={value}
                      aria-hidden={value ? undefined : true}
                    >
                      {value}
                    </span>
                  );
                })}
              </div>
              <div
                className="patient-cell patient-cell--meta"
                aria-label="Usia dan jenis kelamin pasien"
              >
                {patientAgeDisplay ? (
                  <span
                    className="patient-field patient-cell patient-cell--age"
                    title={patientAgeDisplay}
                  >
                    {patientAgeDisplay}
                  </span>
                ) : null}
                {patientGenderDisplay ? (
                  <span
                    className="patient-field patient-cell patient-cell--sex"
                    title={patientGenderDisplay}
                  >
                    {patientGenderDisplay}
                  </span>
                ) : null}
              </div>
              <span className="patient-cell patient-cell--warning patient-cell--warning-2">
                {vitalWarnings[1] ? `${vitalWarnings[1].label} ${vitalWarnings[1].value}` : ''}
              </span>
              <div
                className="patient-cell patient-cell--history patient-cell--history-bottom"
                aria-label="Riwayat kronis slot 4 sampai 6"
              >
                {[0, 1, 2].map((slotIndex) => {
                  const value = chronicHistoryBottomSlots[slotIndex] ?? '';
                  return (
                    <span
                      key={`history-bottom-${slotIndex}`}
                      className={`patient-history-slot${value ? '' : ' patient-history-slot--empty'}`}
                      title={value}
                      aria-hidden={value ? undefined : true}
                    >
                      {value}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}
          {showVisitHistoryTrigger ? (
            <button
              type="button"
              className={`engine-btn engine-tab ${canOpenVisitHistory ? 'active' : ''} patient-history-trigger ${
                isVisitHistoryOpen ? 'patient-history-trigger--open' : ''
              }${canOpenVisitHistory ? '' : ' patient-history-trigger--disabled'}`}
              onClick={() => {
                if (!canOpenVisitHistory) return;
                setIsVisitHistoryOpen((current) => !current);
              }}
              disabled={!canOpenVisitHistory}
              aria-disabled={!canOpenVisitHistory}
              aria-expanded={canOpenVisitHistory && isVisitHistoryOpen}
              aria-controls="patient-visit-history-panel"
            >
              <span>RIWAYAT KUNJUNGAN PASIEN</span>
              <ChevronDown
                className={`patient-history-trigger__icon ${
                  isVisitHistoryOpen ? 'patient-history-trigger__icon--open' : ''
                }`}
              />
            </button>
          ) : null}
        </>
      ) : null}
      {showPatientContext && canOpenVisitHistory && isVisitHistoryOpen ? (
        <div
          id="patient-visit-history-panel"
          className="patient-visit-history-panel"
          aria-label="Riwayat kunjungan pasien sebelumnya"
        >
          {previousVisitSections.length > 0 ? (
            previousVisitSections.map((section) => (
              <section key={section.key} className="patient-visit-history-panel__section">
                <div className="patient-visit-history-panel__title">{section.title}</div>
                <div className="patient-visit-history-panel__rows">
                  {section.rows.map((row) => (
                    <div
                      key={`${section.key}-${row.label}`}
                      className="patient-visit-history-panel__row"
                    >
                      <span className="patient-visit-history-panel__label">{row.label}</span>
                      <span className="patient-visit-history-panel__value" title={row.value}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="patient-visit-history-panel__empty">
              Riwayat kunjungan sebelumnya belum tersedia.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export { SidePanelHeader as default };
