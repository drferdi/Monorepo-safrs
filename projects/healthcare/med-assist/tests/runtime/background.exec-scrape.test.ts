import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const registeredHandlers = new Map<
  string,
  (message: { data: unknown; sender?: unknown }) => unknown
>();
const sendMessage = vi.fn();
const sendMessageToTabWithTimeout = vi.fn();
const getEncounter = vi.fn();
const saveEncounter = vi.fn();
const updateEncounter = vi.fn();
const createEmptyEncounter = vi.fn();
const parseAnamnesaData = vi.fn();
const syncPatientToDashboard = vi.fn();
const requestBridgePoll = vi.fn();

vi.mock('@/lib/api/auth-store', () => ({
  AUTH_STORE_KEYS: {
    persist: 'persist',
    session: 'session',
  },
}));

vi.mock('@/lib/api/bridge-client', () => ({
  syncPatientToDashboard,
}));

vi.mock('@/lib/api/bridge-poller', () => ({
  attachBridgeAlarmListener: vi.fn(),
  registerBridgeExecutor: vi.fn(),
  requestBridgePoll,
  startBridgePoller: vi.fn().mockResolvedValue(undefined),
  stopBridgePoller: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/api/patient-sync-payload', () => ({
  buildPatientSyncPayload: vi.fn((input: unknown) => input),
}));

vi.mock('@/lib/api/sentra-api', () => ({
  SentraAPI: class {},
}));

vi.mock('@/lib/iskandar-diagnosis-engine', () => ({
  getCDSSEngineStatus: vi.fn().mockResolvedValue({}),
  initCDSSEngine: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/iskandar-diagnosis-engine/get-suggestions-flow', () => ({
  runGetSuggestionsFlow: vi.fn(),
}));

vi.mock('@/lib/rme/transfer-orchestrator', () => ({
  RMETransferOrchestrator: class {},
}));

vi.mock('@/lib/api/audit-service', () => ({
  auditService: {
    log: vi.fn(),
  },
}));

vi.mock('~/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('~/utils/messaging', () => ({
  classifyTabMessageError: vi.fn(() => 'UNKNOWN'),
  MESSAGE_TIMEOUTS: {
    default: 10000,
    fill: 8000,
    scrape: 5000,
    visitFetch: 15000,
    ai: 30000,
  },
  onMessage: vi.fn(
    (messageType: string, handler: (message: { data: unknown; sender?: unknown }) => unknown) => {
      registeredHandlers.set(messageType, handler);
    }
  ),
  parseAnamnesaData,
  parseDiagnosaData: vi.fn(),
  parseResepData: vi.fn(),
  sendMessage,
  sendMessageToTabWithTimeout,
}));

vi.mock('~/utils/storage', () => ({
  createEmptyEncounter,
  getEncounter,
  saveEncounter,
  updateEncounter,
}));

function buildEncounter(id: string) {
  return {
    id,
    patient_id: 'PATIENT_TBD',
    timestamp: new Date().toISOString(),
    dokter: { id: '', nama: '' },
    perawat: { id: '', nama: '' },
    anamnesa: {
      keluhan_utama: '',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 0 },
      riwayat_penyakit: null,
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
    },
    diagnosa: {
      icd_x: '',
      nama: '',
      jenis: 'PRIMER',
      kasus: 'BARU',
      prognosa: '',
      penyakit_kronis: [],
    },
    resep: [],
  };
}

describe('background pageReady execScrape relay', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    registeredHandlers.clear();

    createEmptyEncounter.mockImplementation((id: string) => buildEncounter(id));
    getEncounter.mockResolvedValueOnce(null).mockResolvedValue(buildEncounter('82594'));
    saveEncounter.mockResolvedValue(true);
    updateEncounter.mockResolvedValue(true);
    parseAnamnesaData.mockReturnValue({
      ok: true,
      reasons: [],
      value: {
        keluhan_utama: 'Demam',
        keluhan_tambahan: 'Batuk pilek',
        lama_sakit: { thn: 0, bln: 0, hr: 3 },
        alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
      },
    });
    sendMessage.mockResolvedValue(undefined);
    sendMessageToTabWithTimeout.mockResolvedValue({
      pageType: 'anamnesa',
      data: {
        anamnesa: {
          keluhan_utama: 'Demam',
          keluhan_tambahan: 'Batuk pilek',
        },
        vital_signs: {
          tekanan_darah_sistolik: 120,
          tekanan_darah_diastolik: 80,
          nadi: 90,
          respirasi: 18,
          suhu: 37.1,
          gula_darah: 110,
        },
        patient_demographics: {
          nama: 'Budi',
          umur: 44,
          jenis_kelamin: 'L',
          no_rm: 'RM-77',
        },
      },
      timestamp: '2026-06-17T10:00:00.000Z',
    });
    syncPatientToDashboard.mockResolvedValue({ ok: true, id: 'sync-1' });

    vi.stubGlobal('defineBackground', (main: unknown) => main);
    vi.stubGlobal('chrome', {
      scripting: {
        executeScript: vi.fn(),
      },
    });
    vi.stubGlobal('browser', {
      action: {
        onClicked: {
          addListener: vi.fn(),
        },
      },
      runtime: {
        onMessage: {
          addListener: vi.fn(),
        },
        sendMessage: vi.fn().mockResolvedValue(undefined),
      },
      storage: {
        onChanged: {
          addListener: vi.fn(),
        },
      },
      tabs: {
        query: vi.fn().mockResolvedValue([]),
        get: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('scrapes anamnesa payload when pageReady arrives from an anamnesa tab', async () => {
    const backgroundMain = (await import('../../entrypoints/background'))
      .default as unknown as () => void;
    backgroundMain();

    const pageReadyHandler = registeredHandlers.get('pageReady');
    expect(pageReadyHandler).toBeDefined();

    await pageReadyHandler!({
      data: {
        pageType: 'anamnesa',
        pelayananId: '82594',
        url: 'https://demo.epuskesmas.id/anamnesa/create/82594',
      },
      sender: {
        tab: {
          id: 77,
        },
      },
    });

    expect(createEmptyEncounter).toHaveBeenCalledWith('82594', 'PATIENT_TBD');
    expect(saveEncounter).toHaveBeenCalledOnce();
    // A dashboard entry waiting for this patient is polled for at once.
    expect(requestBridgePoll).toHaveBeenCalledOnce();
    expect(sendMessageToTabWithTimeout).toHaveBeenCalledWith(
      77,
      {
        type: 'execScrape',
        data: {
          pageType: 'anamnesa',
        },
      },
      5000
    );
    expect(updateEncounter).toHaveBeenCalledWith({
      anamnesa: {
        keluhan_utama: 'Demam',
        keluhan_tambahan: 'Batuk pilek',
        lama_sakit: { thn: 0, bln: 0, hr: 3 },
        alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
      },
    });
  });
});
