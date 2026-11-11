import { ChevronDown, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import '../sentra-panel.css';

type TabId = 'inferen' | 'emergency' | 'pengaturan' | 'ocr' | 'demograf' | 'dokteroff';
type SystemState = 'standby' | 'randomizing' | 'processing' | 'ready' | 'active' | 'alert';
const INFEREN_BOOT_SEQUENCE_MS = 2400;

const TABS_ROW_1: { id: TabId; label: string }[] = [
  { id: 'inferen', label: 'INFEREN' },
  { id: 'emergency', label: 'EMERGENCY' },
  { id: 'pengaturan', label: 'PENGATURAN' },
];

const TABS_ROW_2: { id: TabId; label: string }[] = [
  { id: 'ocr', label: 'OCR' },
  { id: 'demograf', label: 'DEMOGRAF' },
  { id: 'dokteroff', label: 'DOKTER OFF' },
];

/* ─── Scramble characters pool ─────────────────────────────── */
const SCRAMBLE_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
const FIELD_IDS = [
  'gejala',
  'riwayatAlergi',
  'statusKehamilan',
  'disabilitas',
  'obesitas',
  'beratBadan',
  'sistolik',
  'diastolik',
  'nadi',
  'suhu',
  'gula',
  'pernafasan',
  'saturasi',
] as const;
type FieldId = (typeof FIELD_IDS)[number];

export interface SentraAssistPanelInputSnapshot {
  gejala: string;
  riwayatAlergi: string;
  statusKehamilan: string;
  disabilitas: string;
  obesitas: string;
  beratBadan: string;
  sistolik: string;
  diastolik: string;
  nadi: string;
  suhu: string;
  gula: string;
  pernafasan: string;
  saturasi: string;
}

export interface SentraAssistPanelStatusData {
  patientName?: string;
  historySummary?: string;
  contextLabel?: string;
}

type SentraAssistPanelActionResult =
  | void
  | Partial<SentraAssistPanelInputSnapshot>
  | Promise<void | Partial<SentraAssistPanelInputSnapshot>>;

type SentraAssistPanelActionHandler = (
  snapshot: SentraAssistPanelInputSnapshot
) => SentraAssistPanelActionResult;

const generateScramble = (len: number): string =>
  Array.from(
    { length: len },
    () => SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
  ).join('');

/* ─── Field validation helper ────────────────────────────────── */
const fv = (v: string | undefined): 'filled' | 'empty' =>
  v && v.trim().length > 0 ? 'filled' : 'empty';

/* ─── LED Indicator ─────────────────────────────────────────── */
const Led = ({ color }: { color: 'blue' | 'cyan' | 'dim' | 'red' }) => (
  <span className={`sentra-led sentra-led-${color}`} aria-hidden="true" />
);

/* ─── Random LED — cycling colors during boot sequence ──────── */
const RandomLed = () => {
  const RANDOM_COLORS: ('blue' | 'cyan' | 'dim')[] = ['blue', 'cyan', 'dim'];
  const [color, setColor] = useState<(typeof RANDOM_COLORS)[number]>(RANDOM_COLORS[0]);
  useEffect(() => {
    const interval = setInterval(() => {
      setColor(RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)]);
    }, 80);
    return () => clearInterval(interval);
  }, []);
  return <Led color={color} />;
};

/* ─── FieldLed — auto-random during boot, normal otherwise ──── */
const FieldLed = ({
  systemState,
  normalColor,
}: {
  systemState: SystemState;
  normalColor: 'blue' | 'cyan' | 'dim' | 'red';
}) => {
  if (systemState === 'randomizing') return <RandomLed />;
  return <Led color={normalColor} />;
};

/* ─── LED Status Strip — supports randomizing boot mode ─────── */
const StatusStrip = ({ state }: { state: SystemState }) => {
  const RANDOM_COLORS: ('blue' | 'cyan' | 'dim')[] = ['blue', 'cyan', 'dim'];
  const generateRandomPattern = (): (typeof RANDOM_COLORS)[number][] =>
    Array.from(
      { length: 8 },
      () => RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)]
    );

  const [randomPattern, setRandomPattern] =
    useState<(typeof RANDOM_COLORS)[number][]>(generateRandomPattern());

  useEffect(() => {
    if (state !== 'randomizing') return;
    const interval = setInterval(() => {
      setRandomPattern(generateRandomPattern());
    }, 80);
    return () => clearInterval(interval);
  }, [state]);

  const staticPatterns: Record<
    Exclude<SystemState, 'randomizing'>,
    ('blue' | 'cyan' | 'dim' | 'red')[]
  > = {
    standby: ['dim', 'dim', 'dim', 'dim', 'dim', 'dim', 'dim', 'dim'],
    ready: ['cyan', 'cyan', 'dim', 'dim', 'dim', 'dim', 'cyan', 'cyan'],
    processing: ['blue', 'blue', 'blue', 'dim', 'blue', 'blue', 'dim', 'blue'],
    active: ['blue', 'blue', 'cyan', 'blue', 'cyan', 'blue', 'cyan', 'blue'],
    alert: ['red', 'blue', 'red', 'blue', 'red', 'blue', 'red', 'blue'],
  };

  const pattern = state === 'randomizing' ? randomPattern : staticPatterns[state];

  return (
    <div className={`sentra-led-strip sentra-strip-${state}`} data-metric="ui.ledStrip.render">
      {pattern.map((c, i) => (
        <Led key={i} color={c === 'red' ? 'blue' : c} />
      ))}
    </div>
  );
};

/* ─── AutoComplete Badge ────────────────────────────────────── */
const AutoCompleteBadge = ({
  state,
  ariaLabel,
  onClick,
}: {
  state: SystemState;
  ariaLabel: string;
  onClick?: () => void;
}) => (
  <button
    className={`sentra-badge-live ${state === 'active' ? 'sentra-badge-active' : ''}`}
    data-metric="ui.badge.autocomplete.render"
    type="button"
    aria-label={ariaLabel}
    onClick={onClick}
  >
    <span className="sentra-badge-live-dot" aria-hidden="true" />
    <span className="sentra-badge-live-text">AutoComplete+</span>
    <span className="sentra-badge-live-signal" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  </button>
);

/* ─── Status Bar ────────────────────────────────────────────── */
const StatusBar = ({
  state,
  statusData,
}: {
  state: SystemState;
  statusData?: SentraAssistPanelStatusData;
}) => (
  <div className={`sentra-status-bar sentra-bar-${state}`} data-metric="ui.statusBar.render">
    <div className="sentra-status-col">
      <div className="sentra-status-row">
        <FieldLed systemState={state} normalColor={state === 'standby' ? 'dim' : 'blue'} />
        <span className="sentra-status-label">NAMA</span>
        <span className="sentra-status-dots">....</span>
        <span
          className={`sentra-status-value ${state === 'processing' ? 'loading' : state === 'ready' ? 'ready' : ''}`}
        >
          {state === 'standby' || state === 'randomizing'
            ? 'Menunggu'
            : state === 'processing'
              ? 'Memuat'
              : statusData?.patientName || (state === 'alert' ? 'Error' : 'Siap')}
        </span>
      </div>
      <div className="sentra-status-row">
        <FieldLed systemState={state} normalColor={state === 'standby' ? 'dim' : 'cyan'} />
        <span className="sentra-status-label">RIWAYAT</span>
        <span className="sentra-status-dots">....</span>
        <span className={`sentra-status-value ${state === 'processing' ? 'loading' : ''}`}>
          {state === 'standby' || state === 'randomizing'
            ? 'Idle'
            : state === 'processing'
              ? 'Scanning'
              : statusData?.historySummary || (state === 'alert' ? 'Check' : 'OK')}
        </span>
      </div>
    </div>
    <div className="sentra-status-divider" />
    <div className="sentra-status-col" style={{ alignItems: 'flex-end' }}>
      <div className="sentra-status-row">
        <FieldLed systemState={state} normalColor="dim" />
        <span className="sentra-status-label">USTA</span>
        <span className="sentra-status-dots">....</span>
        <span className="sentra-status-value empty">
          {state === 'standby' || state === 'randomizing' ? '--' : statusData?.contextLabel || '--'}
        </span>
      </div>
    </div>
  </div>
);

/* ─── DropdownField ─────────────────────────────────────────── */
const DROPDOWN_OPTIONS: Record<string, string[]> = {
  alergi: ['Tidak ada alergi', 'Alergi obat', 'Alergi makanan', 'Alergi debu', 'Alergi lainnya'],
  kehamilan: [
    'Tidak relevan',
    'Tidak hamil',
    'Hamil trimester 1',
    'Hamil trimester 2',
    'Hamil trimester 3',
  ],
  disabilitas: ['Tidak', 'Disabilitas fisik', 'Disabilitas sensorik', 'Disabilitas intelektual'],
  obesitas: ['Normal', 'Overweight', 'Obesitas I', 'Obesitas II'],
};

const DropdownField = ({
  label,
  value,
  placeholder = 'Pilih di sini',
  metricId,
  ledColor = 'red',
  state,
  onChange,
  scrambleText,
  isScrambling,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  metricId: string;
  ledColor?: 'blue' | 'cyan' | 'dim' | 'red';
  state: SystemState;
  onChange: (v: string) => void;
  scrambleText: string;
  isScrambling: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const options = DROPDOWN_OPTIONS[metricId] || [];
  return (
    <div className="sentra-form-group" data-metric={`ui.dropdown.${metricId}`}>
      <label className="sentra-section-label">
        <Led color={ledColor} />
        {label}
      </label>
      <button
        className={`sentra-dropdown-trigger sentra-input-${state} ${isScrambling ? 'sentra-scramble-active' : ''}`}
        type="button"
        aria-label={`Pilih ${label}`}
        onClick={() => setOpen(!open)}
      >
        <span className={isScrambling ? 'sentra-scramble-text' : value ? 'value' : 'placeholder'}>
          {isScrambling ? scrambleText : value || placeholder}
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="sentra-dropdown-menu">
          {options.map((opt) => (
            <button
              key={opt}
              className={`sentra-dropdown-item ${value === opt ? 'active' : ''}`}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── VitalInput ────────────────────────────────────────────── */
const VitalInput = ({
  label,
  unit,
  placeholder = '---',
  metricId,
  ledColor,
  state,
  value,
  onChange,
  scrambleText,
  isScrambling,
}: {
  label: string;
  unit?: string;
  placeholder?: string;
  metricId: string;
  ledColor?: 'blue' | 'cyan' | 'dim' | 'red';
  state: SystemState;
  value: string;
  onChange: (v: string) => void;
  scrambleText: string;
  isScrambling: boolean;
}) => {
  return (
    <div
      className={`sentra-vital-input sentra-vital-${state} ${isScrambling ? 'sentra-scramble-active' : ''}`}
      data-metric={`ui.vital.${metricId}`}
    >
      <div className="sentra-vital-inner">
        <span className="sentra-vital-label">
          {ledColor && <Led color={ledColor} />}
          {label}
        </span>
        <input
          type="text"
          value={isScrambling ? scrambleText : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`sentra-vital-field ${isScrambling ? 'sentra-scramble-text' : ''}`}
          aria-label={label}
          readOnly={isScrambling}
        />
      </div>
      {unit && <span className="sentra-vital-unit">{unit}</span>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SENTRA ASSIST PANEL — Main Component
   ═══════════════════════════════════════════════════════════════ */
export const SentraAssistPanel = ({
  activeTab,
  onTabChange,
  value,
  onInputChange,
  statusData,
  workbench,
  emergencyContent,
  settingsContent,
  ocrContent,
  demografContent,
  dokterOffContent,
  onAutocompleteGejala,
  onAutocompleteVitals,
  onUplink,
  onDemograf,
  onOcr,
  onDokterOff,
}: {
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  value?: SentraAssistPanelInputSnapshot;
  onInputChange?: (snapshot: SentraAssistPanelInputSnapshot) => void;
  statusData?: SentraAssistPanelStatusData;
  workbench?: ReactNode;
  emergencyContent?: ReactNode;
  settingsContent?: ReactNode;
  ocrContent?: ReactNode;
  demografContent?: ReactNode;
  dokterOffContent?: ReactNode;
  onAutocompleteGejala?: SentraAssistPanelActionHandler;
  onAutocompleteVitals?: SentraAssistPanelActionHandler;
  onUplink?: SentraAssistPanelActionHandler;
  onDemograf?: SentraAssistPanelActionHandler;
  onOcr?: SentraAssistPanelActionHandler;
  onDokterOff?: SentraAssistPanelActionHandler;
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<TabId>('inferen');
  const [gejala, setGejala] = useState('');
  const [systemState, setSystemState] = useState<SystemState>('standby');
  const resolvedActiveTab = activeTab ?? internalActiveTab;

  /* ─── Pre-loaded audio buffers — instant playback ─────────── */
  const clickBufferRef = useRef<AudioBuffer | null>(null);
  const bootAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Pre-decode click sound for instant playback
    const ctx = new AudioContext();
    fetch('/click.mp3')
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => {
        clickBufferRef.current = decoded;
      })
      .catch(() => {});
    // Pre-load boot sound
    bootAudioRef.current = new Audio('/boot-sound.mp3');
    bootAudioRef.current.volume = 0.7;
  }, []);

  const playClick = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const source = ctx.createBufferSource();
      source.buffer = clickBufferRef.current;
      if (!source.buffer) return; // not loaded yet
      source.connect(ctx.destination);
      source.start(0);
      setTimeout(() => ctx.close(), 200);
    } catch {
      /* ignore */
    }
  }, []);

  const playBoot = useCallback(() => {
    try {
      bootAudioRef.current?.play().catch(() => {});
    } catch {
      /* ignore */
    }
  }, []);

  /* ─── Field values ────────────────────────────────────────── */
  const [riwayatAlergi, setRiwayatAlergi] = useState('');
  const [statusKehamilan, setStatusKehamilan] = useState('Tidak relevan');
  const [disabilitas, setDisabilitas] = useState('');
  const [obesitas, setObesitas] = useState('');

  const [beratBadan, setBeratBadan] = useState('');
  const [sistolik, setSistolik] = useState('');
  const [diastolik, setDiastolik] = useState('');
  const [nadi, setNadi] = useState('');
  const [suhu, setSuhu] = useState('');
  const [gula, setGula] = useState('');
  const [pernafasan, setPernafasan] = useState('');
  const [saturasi, setSaturasi] = useState('');

  useEffect(() => {
    if (!value) return;
    setGejala(value.gejala);
    setRiwayatAlergi(value.riwayatAlergi);
    setStatusKehamilan(value.statusKehamilan);
    setDisabilitas(value.disabilitas);
    setObesitas(value.obesitas);
    setBeratBadan(value.beratBadan);
    setSistolik(value.sistolik);
    setDiastolik(value.diastolik);
    setNadi(value.nadi);
    setSuhu(value.suhu);
    setGula(value.gula);
    setPernafasan(value.pernafasan);
    setSaturasi(value.saturasi);
  }, [value]);

  /* ─── Text scramble state ─────────────────────────────────── */
  const [scrambleMap, setScrambleMap] = useState<Record<FieldId, string>>({
    gejala: '',
    riwayatAlergi: '',
    statusKehamilan: '',
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
  });
  const [activeScrambleField, setActiveScrambleField] = useState<FieldId | null>(null);
  const scrambleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Scramble effect during randomizing */
  useEffect(() => {
    if (systemState !== 'randomizing') {
      setScrambleMap({
        gejala: '',
        riwayatAlergi: '',
        statusKehamilan: '',
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
      });
      setActiveScrambleField(null);
      if (scrambleIntervalRef.current) {
        clearInterval(scrambleIntervalRef.current);
        scrambleIntervalRef.current = null;
      }
      return;
    }

    /* Pick random field every 150ms, fill with random chars */
    scrambleIntervalRef.current = setInterval(() => {
      const field = FIELD_IDS[Math.floor(Math.random() * FIELD_IDS.length)];
      const lenMap: Record<FieldId, number> = {
        gejala: 20,
        riwayatAlergi: 14,
        statusKehamilan: 16,
        disabilitas: 12,
        obesitas: 10,
        beratBadan: 5,
        sistolik: 3,
        diastolik: 3,
        nadi: 3,
        suhu: 4,
        gula: 3,
        pernafasan: 3,
        saturasi: 3,
      };
      const len = lenMap[field];
      setActiveScrambleField(field);
      setScrambleMap((prev) => ({ ...prev, [field]: generateScramble(len) }));
    }, 150);

    return () => {
      if (scrambleIntervalRef.current) {
        clearInterval(scrambleIntervalRef.current);
        scrambleIntervalRef.current = null;
      }
    };
  }, [systemState]);

  const gejalaStatus = useMemo(() => fv(gejala), [gejala]);
  const inputSnapshot = useMemo(
    () => ({
      gejala,
      riwayatAlergi,
      statusKehamilan,
      disabilitas,
      obesitas,
      beratBadan,
      sistolik,
      diastolik,
      nadi,
      suhu,
      gula,
      pernafasan,
      saturasi,
    }),
    [
      beratBadan,
      diastolik,
      disabilitas,
      gejala,
      gula,
      nadi,
      obesitas,
      pernafasan,
      riwayatAlergi,
      saturasi,
      sistolik,
      statusKehamilan,
      suhu,
    ]
  );

  const applySnapshotPatch = useCallback(
    (patch?: Partial<SentraAssistPanelInputSnapshot> | void) => {
      if (!patch) return;

      if (Object.prototype.hasOwnProperty.call(patch, 'gejala')) setGejala(patch.gejala ?? '');
      if (Object.prototype.hasOwnProperty.call(patch, 'riwayatAlergi')) {
        setRiwayatAlergi(patch.riwayatAlergi ?? '');
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'statusKehamilan')) {
        setStatusKehamilan(patch.statusKehamilan ?? 'Tidak relevan');
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'disabilitas')) {
        setDisabilitas(patch.disabilitas ?? '');
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'obesitas')) {
        setObesitas(patch.obesitas ?? '');
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'beratBadan')) {
        setBeratBadan(patch.beratBadan ?? '');
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'sistolik')) {
        setSistolik(patch.sistolik ?? '');
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'diastolik')) {
        setDiastolik(patch.diastolik ?? '');
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'nadi')) setNadi(patch.nadi ?? '');
      if (Object.prototype.hasOwnProperty.call(patch, 'suhu')) setSuhu(patch.suhu ?? '');
      if (Object.prototype.hasOwnProperty.call(patch, 'gula')) setGula(patch.gula ?? '');
      if (Object.prototype.hasOwnProperty.call(patch, 'pernafasan')) {
        setPernafasan(patch.pernafasan ?? '');
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'saturasi')) {
        setSaturasi(patch.saturasi ?? '');
      }
    },
    []
  );

  const runActionHandler = useCallback(
    async (
      handler: SentraAssistPanelActionHandler | undefined,
      options?: { applyPatch?: boolean }
    ) => {
      if (!handler) return;
      const result = await handler(inputSnapshot);
      if (options?.applyPatch) {
        applySnapshotPatch(result);
      }
    },
    [applySnapshotPatch, inputSnapshot]
  );

  const setResolvedTab = useCallback(
    (tab: TabId) => {
      if (activeTab === undefined) {
        setInternalActiveTab(tab);
      }
      onTabChange?.(tab);
    },
    [activeTab, onTabChange]
  );

  /* ─── Simulate state transitions ──────────────────────────── */
  const handleTabClick = useCallback(
    (tab: TabId) => {
      setResolvedTab(tab);
      if (tab === 'demograf') {
        void runActionHandler(onDemograf);
      } else if (tab === 'ocr') {
        void runActionHandler(onOcr, { applyPatch: true });
      } else if (tab === 'dokteroff') {
        void runActionHandler(onDokterOff);
      }
      if (tab === 'emergency') {
        setSystemState('alert');
      } else if (tab === 'inferen') {
        /* CLICK! (instant) → jeda 1 detik → boot sound + visual */
        playClick();
        setTimeout(() => {
          playBoot();
          setSystemState('randomizing');
        }, 1000);
        setTimeout(() => {
          setSystemState('processing');
          setTimeout(() => setSystemState('ready'), 800);
          setTimeout(() => setSystemState('active'), 1600);
        }, INFEREN_BOOT_SEQUENCE_MS);
      } else {
        setSystemState('processing');
        setTimeout(() => setSystemState('ready'), 800);
        setTimeout(() => setSystemState('active'), 1600);
      }
    },
    [onDemograf, onDokterOff, onOcr, playClick, playBoot, runActionHandler, setResolvedTab]
  );

  const handleGejalaFocus = useCallback(() => {
    if (systemState === 'standby') {
      setSystemState('processing');
      setTimeout(() => setSystemState('active'), 1200);
    }
  }, [systemState]);

  const handleUplink = useCallback(() => {
    setSystemState('processing');
    void runActionHandler(onUplink);
    setTimeout(() => setSystemState('active'), 2000);
  }, [onUplink, runActionHandler]);

  const handleAutocompleteGejalaClick = useCallback(() => {
    void runActionHandler(onAutocompleteGejala, { applyPatch: true });
  }, [onAutocompleteGejala, runActionHandler]);

  const handleAutocompleteVitalsClick = useCallback(() => {
    void runActionHandler(onAutocompleteVitals, { applyPatch: true });
  }, [onAutocompleteVitals, runActionHandler]);

  /* Auto-recover from alert */
  useEffect(() => {
    if (systemState === 'alert') {
      const t = setTimeout(() => setSystemState('standby'), 4000);
      return () => clearTimeout(t);
    }
  }, [systemState]);

  useEffect(() => {
    onInputChange?.(inputSnapshot);
  }, [inputSnapshot, onInputChange]);

  return (
    <div
      className={`sentra-panel sentra-panel-${systemState}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="panel-title"
      data-metric="ui.panel.render"
      data-compliance="HIPAA"
    >
      {/* Hardware: Screw heads */}
      <span className="sentra-screw" style={{ top: 10, left: 10 }} aria-hidden="true" />
      <span className="sentra-screw" style={{ top: 10, right: 10 }} aria-hidden="true" />
      <span className="sentra-screw" style={{ bottom: 10, left: 10 }} aria-hidden="true" />
      <span className="sentra-screw" style={{ bottom: 10, right: 10 }} aria-hidden="true" />
      <span className="sentra-bezel" aria-hidden="true" />
      <span className="sentra-serial-plate" aria-hidden="true">
        SN-2026-XA-0047
      </span>

      {/* ─── HEADER ───────────────────────────── */}
      <div className="sentra-panel-header">
        <h1 className="sentra-panel-title" id="panel-title">
          Sentra Assist
        </h1>
        <p className="sentra-panel-subtitle">
          Architected by dr Ferdi Iskandar
          <br />
          <span className="sentra-panel-subtitle__motto" lang="la">
            <em>Primum non nocere</em>
          </span>
        </p>
        <StatusStrip state={systemState} />
        <div className="sentra-header-divider" />
      </div>

      {/* ─── TAB NAVIGATION ───────────────────── */}
      <div
        className={`sentra-tabs-container sentra-tabs-${systemState}`}
        data-metric="ui.tabs.render"
      >
        <div className="sentra-tab-row">
          {TABS_ROW_1.map((tab) => (
            <button
              key={tab.id}
              className={`sentra-tab-btn ${resolvedActiveTab === tab.id ? 'active' : ''} ${tab.id === 'emergency' ? 'sentra-tab-emergency' : ''}`}
              onClick={() => handleTabClick(tab.id)}
              data-metric={`ui.tab.${tab.id}`}
              type="button"
            >
              {tab.id === 'emergency' && systemState === 'alert' && <Led color="blue" />}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="sentra-tab-row">
          {TABS_ROW_2.map((tab) => (
            <button
              key={tab.id}
              className={`sentra-tab-btn ${resolvedActiveTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
              data-metric={`ui.tab.${tab.id}`}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── STATUS BAR ───────────────────────── */}
      <StatusBar state={systemState} statusData={statusData} />

      {/* ─── GEJALA / KELUHAN ─────────────────── */}
      <div
        className={`sentra-section sentra-section-${systemState}`}
        data-metric="ui.section.gejala"
      >
        <div className="sentra-section-header">
          <label className="sentra-section-label" htmlFor="gejala-textarea">
            <FieldLed
              systemState={systemState}
              normalColor={
                systemState === 'standby' ? 'dim' : gejalaStatus === 'filled' ? 'blue' : 'red'
              }
            />
            GEJALA / KELUHAN
          </label>
          <AutoCompleteBadge
            state={systemState}
            ariaLabel="AutoComplete+ Gejala"
            onClick={handleAutocompleteGejalaClick}
          />
        </div>
        <textarea
          id="gejala-textarea"
          value={systemState === 'randomizing' ? scrambleMap.gejala : gejala}
          onChange={(e) => setGejala(e.target.value)}
          onFocus={handleGejalaFocus}
          placeholder="Ketik keluhan utama, durasi, dan konteks klinis singkat..."
          className={`sentra-textarea sentra-textarea-${systemState} ${systemState === 'randomizing' && activeScrambleField === 'gejala' ? 'sentra-scramble-active' : ''}`}
          data-metric="ui.input.gejala.latency"
          aria-label="Gejala atau keluhan pasien"
          readOnly={systemState === 'randomizing'}
        />
      </div>

      {/* ─── DROPDOWN GRID ────────────────────── */}
      <div className="sentra-form-grid sentra-section" data-metric="ui.section.dropdowns">
        <DropdownField
          label="RIWAYAT ALERGI"
          value={riwayatAlergi}
          placeholder="Pilih status alergi"
          metricId="alergi"
          ledColor={
            systemState === 'standby'
              ? 'dim'
              : systemState === 'randomizing'
                ? 'dim'
                : fv(riwayatAlergi) === 'filled'
                  ? 'blue'
                  : 'red'
          }
          state={systemState}
          onChange={setRiwayatAlergi}
          scrambleText={scrambleMap.riwayatAlergi}
          isScrambling={systemState === 'randomizing' && activeScrambleField === 'riwayatAlergi'}
        />
        <DropdownField
          label="STATUS KEHAMILAN"
          value={statusKehamilan}
          metricId="kehamilan"
          ledColor={
            systemState === 'standby'
              ? 'dim'
              : systemState === 'randomizing'
                ? 'dim'
                : fv(statusKehamilan) === 'filled'
                  ? 'blue'
                  : 'red'
          }
          state={systemState}
          onChange={setStatusKehamilan}
          scrambleText={scrambleMap.statusKehamilan}
          isScrambling={systemState === 'randomizing' && activeScrambleField === 'statusKehamilan'}
        />
        <DropdownField
          label="DISABILITAS"
          value={disabilitas}
          placeholder="Pilih status"
          metricId="disabilitas"
          ledColor={
            systemState === 'standby'
              ? 'dim'
              : systemState === 'randomizing'
                ? 'dim'
                : fv(disabilitas) === 'filled'
                  ? 'blue'
                  : 'red'
          }
          state={systemState}
          onChange={setDisabilitas}
          scrambleText={scrambleMap.disabilitas}
          isScrambling={systemState === 'randomizing' && activeScrambleField === 'disabilitas'}
        />
        <DropdownField
          label="OBESITAS"
          value={obesitas}
          placeholder="Pilih status"
          metricId="obesitas"
          ledColor={
            systemState === 'standby'
              ? 'dim'
              : systemState === 'randomizing'
                ? 'dim'
                : fv(obesitas) === 'filled'
                  ? 'blue'
                  : 'red'
          }
          state={systemState}
          onChange={setObesitas}
          scrambleText={scrambleMap.obesitas}
          isScrambling={systemState === 'randomizing' && activeScrambleField === 'obesitas'}
        />
      </div>

      {/* ─── AUTOSENS PRESET ──────────────────── */}
      <div className="sentra-section" data-metric="ui.section.autosens">
        <div className="sentra-section-header">
          <span className="sentra-section-label">
            <Led color="cyan" />
            AUTOSEN PRESET
          </span>
        </div>

        <div className={`sentra-autosens-card sentra-card-${systemState}`}>
          <div className="sentra-autosens-subheader">
            <span className="sentra-autosens-title">VITAL SIGNS - CARDIOPULMONARY METRICS</span>
            <AutoCompleteBadge
              state={systemState}
              ariaLabel="AutoComplete+ Vital Signs"
              onClick={handleAutocompleteVitalsClick}
            />
          </div>

          <div className="sentra-vital-grid-1" style={{ marginBottom: 8 }}>
            <VitalInput
              label="BERAT BADAN AKTUAL"
              unit="kg"
              placeholder="kg"
              metricId="berat"
              ledColor={
                systemState === 'standby'
                  ? 'dim'
                  : systemState === 'randomizing'
                    ? 'dim'
                    : fv(beratBadan) === 'filled'
                      ? 'blue'
                      : 'red'
              }
              state={systemState}
              value={beratBadan}
              onChange={setBeratBadan}
              scrambleText={scrambleMap.beratBadan}
              isScrambling={systemState === 'randomizing' && activeScrambleField === 'beratBadan'}
            />
          </div>
          <div className="sentra-vital-grid-2" style={{ marginBottom: 8 }}>
            <VitalInput
              label="SISTOLIK"
              metricId="sistolik"
              ledColor={
                systemState === 'standby'
                  ? 'dim'
                  : systemState === 'randomizing'
                    ? 'dim'
                    : fv(sistolik) === 'filled'
                      ? 'blue'
                      : 'red'
              }
              state={systemState}
              value={sistolik}
              onChange={setSistolik}
              scrambleText={scrambleMap.sistolik}
              isScrambling={systemState === 'randomizing' && activeScrambleField === 'sistolik'}
            />
            <VitalInput
              label="DIASTOLIK"
              metricId="diastolik"
              ledColor={
                systemState === 'standby'
                  ? 'dim'
                  : systemState === 'randomizing'
                    ? 'dim'
                    : fv(diastolik) === 'filled'
                      ? 'blue'
                      : 'red'
              }
              state={systemState}
              value={diastolik}
              onChange={setDiastolik}
              scrambleText={scrambleMap.diastolik}
              isScrambling={systemState === 'randomizing' && activeScrambleField === 'diastolik'}
            />
          </div>
          <div className="sentra-vital-grid-3" style={{ marginBottom: 8 }}>
            <VitalInput
              label="NADI"
              metricId="nadi"
              ledColor={
                systemState === 'standby'
                  ? 'dim'
                  : systemState === 'randomizing'
                    ? 'dim'
                    : fv(nadi) === 'filled'
                      ? 'blue'
                      : 'red'
              }
              state={systemState}
              value={nadi}
              onChange={setNadi}
              scrambleText={scrambleMap.nadi}
              isScrambling={systemState === 'randomizing' && activeScrambleField === 'nadi'}
            />
            <VitalInput
              label="SUHU"
              metricId="suhu"
              ledColor={
                systemState === 'standby'
                  ? 'dim'
                  : systemState === 'randomizing'
                    ? 'dim'
                    : fv(suhu) === 'filled'
                      ? 'blue'
                      : 'red'
              }
              state={systemState}
              value={suhu}
              onChange={setSuhu}
              scrambleText={scrambleMap.suhu}
              isScrambling={systemState === 'randomizing' && activeScrambleField === 'suhu'}
            />
            <VitalInput
              label="GULA"
              metricId="gula"
              ledColor={
                systemState === 'standby'
                  ? 'dim'
                  : systemState === 'randomizing'
                    ? 'dim'
                    : fv(gula) === 'filled'
                      ? 'blue'
                      : 'red'
              }
              state={systemState}
              value={gula}
              onChange={setGula}
              scrambleText={scrambleMap.gula}
              isScrambling={systemState === 'randomizing' && activeScrambleField === 'gula'}
            />
          </div>
          <div className="sentra-vital-grid-2">
            <VitalInput
              label="PERNAFASAN"
              metricId="pernafasan"
              ledColor={
                systemState === 'standby'
                  ? 'dim'
                  : systemState === 'randomizing'
                    ? 'dim'
                    : fv(pernafasan) === 'filled'
                      ? 'blue'
                      : 'red'
              }
              state={systemState}
              value={pernafasan}
              onChange={setPernafasan}
              scrambleText={scrambleMap.pernafasan}
              isScrambling={systemState === 'randomizing' && activeScrambleField === 'pernafasan'}
            />
            <VitalInput
              label="SATURASI O₂"
              metricId="saturasi"
              ledColor={
                systemState === 'standby'
                  ? 'dim'
                  : systemState === 'randomizing'
                    ? 'dim'
                    : fv(saturasi) === 'filled'
                      ? 'blue'
                      : 'red'
              }
              state={systemState}
              value={saturasi}
              onChange={setSaturasi}
              scrambleText={scrambleMap.saturasi}
              isScrambling={systemState === 'randomizing' && activeScrambleField === 'saturasi'}
            />
          </div>
        </div>
      </div>

      {/* ─── FOOTER ACTIONS ───────────────────── */}
      <div className="sentra-panel-footer" data-metric="ui.footer.render">
        <button
          className={`sentra-btn-primary sentra-cta-${systemState}`}
          type="button"
          data-metric="ui.uplink.submit"
          data-slo="ui.uplink.submit.p95"
          onClick={handleUplink}
          disabled={systemState === 'processing'}
        >
          {systemState === 'processing' ? (
            <>
              <Loader2 size={14} className="sentra-spinner" />
              UPLINKING...
            </>
          ) : (
            <>
              SENTRA UPLINK
              <span className="sentra-uplink-glow" aria-hidden="true" />
            </>
          )}
        </button>

        <p className="sentra-footer-note">
          {systemState === 'standby' && 'System standby — awaiting input'}
          {systemState === 'randomizing' && 'Boot sequence — initializing neural array...'}
          {systemState === 'ready' && 'System ready — all sensors nominal'}
          {systemState === 'processing' && 'AI processing — scanning vitals'}
          {systemState === 'active' && 'System active — complete Uplink to enable'}
          {systemState === 'alert' && 'ALERT — emergency mode activated'}
        </p>
      </div>

      {resolvedActiveTab === 'inferen' && workbench ? (
        <div data-testid="sentra-approved-workbench-slot" style={{ marginTop: 14 }}>
          {workbench}
        </div>
      ) : null}

      {resolvedActiveTab === 'emergency' && emergencyContent ? (
        <div data-testid="sentra-approved-emergency-slot" style={{ marginTop: 14 }}>
          {emergencyContent}
        </div>
      ) : null}

      {resolvedActiveTab === 'pengaturan' && settingsContent ? (
        <div data-testid="sentra-approved-settings-slot" style={{ marginTop: 14 }}>
          {settingsContent}
        </div>
      ) : null}

      {resolvedActiveTab === 'ocr' && ocrContent ? (
        <div data-testid="sentra-approved-ocr-slot" style={{ marginTop: 14 }}>
          {ocrContent}
        </div>
      ) : null}

      {resolvedActiveTab === 'demograf' && demografContent ? (
        <div data-testid="sentra-approved-demograf-slot" style={{ marginTop: 14 }}>
          {demografContent}
        </div>
      ) : null}

      {resolvedActiveTab === 'dokteroff' && dokterOffContent ? (
        <div data-testid="sentra-approved-dokteroff-slot" style={{ marginTop: 14 }}>
          {dokterOffContent}
        </div>
      ) : null}
    </div>
  );
};
