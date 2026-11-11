import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const scrapeAnamnesa = vi.fn();
const sendMessage = vi.fn();
const initAnamnesaPage = vi.fn();
const extractVisitFromRoot = vi.fn();
const scanVitalSignsFromRoot = vi.fn(() => ({ sbp: '150', dbp: '95' }));

vi.mock('@/lib/scraper/anamnesa', () => ({
  scrapeAnamnesa,
}));

vi.mock('@/lib/handlers/page-anamnesa', () => ({
  fillAnamnesaForm: vi.fn(),
  initAnamnesaPage,
}));

vi.mock('@/lib/handlers/page-diagnosa', () => ({
  fillDiagnosaForm: vi.fn(),
  initDiagnosaPage: vi.fn(),
  scrapeDiagnosaForm: vi.fn(),
}));

vi.mock('@/lib/handlers/page-resep', () => ({
  fillResepForm: vi.fn(),
  initResepPage: vi.fn(),
  scrapeResepForm: vi.fn(),
}));

vi.mock('@/lib/scraper/medical-history', () => ({
  scanMedicalHistoryFromRoot: vi.fn(),
}));

vi.mock('@/lib/scraper/extractors', () => ({
  extractVisitFromRoot,
}));

vi.mock('@/lib/scraper/page-context', () => ({
  extractClinicalContextFromDocument: vi.fn(),
  extractPatientInfoFromDocument: vi.fn(),
  extractTenagaMedisFromDocument: vi.fn(),
}));

vi.mock('@/lib/scraper/vital-signs', () => ({
  scanVitalSignsFromRoot,
}));

vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('@/utils/messaging', () => ({
  sendMessage,
}));

type RuntimeListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: unknown) => void
) => boolean | void;

function createRuntimeMessageHarness() {
  let listener: RuntimeListener | null = null;

  const browserApi = {
    runtime: {
      onMessage: {
        addListener: vi.fn((cb: RuntimeListener) => {
          listener = cb;
        }),
      },
    },
  };

  return {
    browserApi,
    getListener: () => listener,
  };
}

async function dispatchRuntimeMessage(
  listener: RuntimeListener,
  message: unknown
): Promise<unknown> {
  return await new Promise((resolve) => {
    listener(message, {}, resolve);
  });
}

interface ScanVisitHistoryResponse {
  success: boolean;
  visits: Array<{ encounter_id: string; date: string }>;
  diagnostics?: string[];
}

function mountContentScript(browserApi: unknown): Promise<RuntimeListener> {
  vi.stubGlobal('defineContentScript', (config: unknown) => config);
  vi.stubGlobal('browser', browserApi);

  return import('../../entrypoints/content').then((module) => {
    const contentModule = module.default as { main: () => void };
    contentModule.main();

    const listener = (browserApi as ReturnType<typeof createRuntimeMessageHarness>['browserApi'])
      .runtime.onMessage.addListener.mock.calls[0]?.[0] as RuntimeListener | undefined;
    expect(listener).toBeDefined();
    return listener!;
  });
}

describe('content execScrape', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/anamnesa/create/82594');
    document.body.innerHTML = '<div id="form-anamnesa-container"></div>';
    scrapeAnamnesa.mockResolvedValue({
      anamnesa: {
        keluhan_utama: 'Demam',
        keluhan_tambahan: 'Batuk pilek',
      },
      vital_signs: {
        tekanan_darah_sistolik: 120,
        tekanan_darah_diastolik: 80,
      },
      patient_demographics: {
        nama: 'Budi',
        umur: 44,
        jenis_kelamin: 'L',
      },
    });
    sendMessage.mockResolvedValue(undefined);
    extractVisitFromRoot.mockImplementation(
      (_root: ParentNode, encounterId: string, date: string) => ({
        encounter_id: encounterId,
        date,
        vitals: { sbp: 120, dbp: 80, hr: 82, rr: 20, temp: 36.7, glucose: 110 },
        keluhan_utama: 'Kontrol',
        diagnosa: null,
        terapi_obat: 'Amlodipin 1x10mg',
        dokter_penanganan: '',
        perawat_penanganan: '',
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns a protocol-shaped scrape payload for anamnesa pages', async () => {
    const harness = createRuntimeMessageHarness();

    const listener = await mountContentScript(harness.browserApi);

    const response = await dispatchRuntimeMessage(listener, {
      type: 'execScrape',
      data: { pageType: 'anamnesa' },
    });

    expect(initAnamnesaPage).toHaveBeenCalledOnce();
    expect(scrapeAnamnesa).toHaveBeenCalledOnce();
    expect(response).toMatchObject({
      pageType: 'anamnesa',
      data: expect.objectContaining({
        anamnesa: expect.objectContaining({
          keluhan_utama: 'Demam',
          keluhan_tambahan: 'Batuk pilek',
        }),
        vital_signs: expect.objectContaining({
          tekanan_darah_sistolik: 120,
          tekanan_darah_diastolik: 80,
        }),
      }),
    });
    expect(response).toEqual(
      expect.objectContaining({
        timestamp: expect.any(String),
      })
    );
    expect(response).not.toHaveProperty('success');
  });

  it('returns the scraped vitals wrapped as a success response for scanVitalSigns', async () => {
    const harness = createRuntimeMessageHarness();
    const listener = await mountContentScript(harness.browserApi);

    const response = await dispatchRuntimeMessage(listener, { type: 'scanVitalSigns' });

    expect(scanVitalSignsFromRoot).toHaveBeenCalledWith(document);
    expect(response).toEqual({ success: true, vitals: { sbp: '150', dbp: '95' } });
  });

  it('excludes the browser-local current visit date from visit history scraping', async () => {
    class BrowserLocalDate extends Date {
      constructor() {
        super(2026, 5, 30, 0, 30, 0);
      }

      override toISOString(): string {
        return '2026-06-29T17:30:00.000Z';
      }

      static override now(): number {
        return new Date(2026, 5, 30, 0, 30, 0).getTime();
      }
    }

    const harness = createRuntimeMessageHarness();
    vi.stubGlobal('Date', BrowserLocalDate);
    document.body.innerHTML = `
      <div id="form-anamnesa-container"></div>
      <div id="data_riwayat">
        <a class="riwayat" data-id="today">30-06-2026 Kunjungan hari ini</a>
        <a class="riwayat" data-id="past">29-06-2026 Kunjungan kemarin</a>
        <span>padding supaya sidebar dianggap sudah termuat oleh scanner riwayat kunjungan</span>
      </div>
    `;

    const nativeFetchResponder = (event: MessageEvent): void => {
      const msg = event.data as { type?: string; dataId?: string };
      if (msg.type !== 'sentra-native-fetch-request' || !msg.dataId) return;

      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'sentra-native-fetch-response',
            dataId: msg.dataId,
            success: true,
            content: `<table><tr><td>${msg.dataId}</td></tr></table>`,
          },
          source: window,
        })
      );
    };
    window.addEventListener('message', nativeFetchResponder);

    try {
      const listener = await mountContentScript(harness.browserApi);

      const response = (await dispatchRuntimeMessage(listener, {
        type: 'scanVisitHistory',
      })) as ScanVisitHistoryResponse;

      expect(response.success).toBe(true);
      expect(response.visits.map((visit) => visit.encounter_id)).toEqual(['past']);
    } finally {
      window.removeEventListener('message', nativeFetchResponder);
    }
  });

  it('removes native fetch response listeners when visit history fetch times out', async () => {
    vi.useFakeTimers();
    const harness = createRuntimeMessageHarness();
    document.body.innerHTML = `
      <div id="form-anamnesa-container"></div>
      <div id="data_riwayat">
        <a class="riwayat" data-id="stale">28-06-2026 Kunjungan lama</a>
        <span>padding supaya sidebar dianggap sudah termuat oleh scanner riwayat kunjungan</span>
      </div>
    `;
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const listener = await mountContentScript(harness.browserApi);

    const responsePromise = dispatchRuntimeMessage(listener, {
      type: 'scanVisitHistory',
    }) as Promise<ScanVisitHistoryResponse>;

    await vi.advanceTimersByTimeAsync(8000);
    const response = await responsePromise;

    expect(response).toEqual(expect.objectContaining({ success: true, visits: [] }));
    expect(addSpy.mock.calls.filter(([type]) => type === 'message')).toHaveLength(1);
    expect(removeSpy.mock.calls.filter(([type]) => type === 'message')).toHaveLength(1);
  });
});
