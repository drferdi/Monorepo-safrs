import fs from 'fs';
import path from 'path';
import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';

type ChromeRuntimeApi = {
  runtime: {
    lastError?: { message?: string };
    sendMessage(payload: Record<string, unknown>, callback: (response: unknown) => void): void;
  };
  tabs: {
    query(
      queryInfo: Record<string, unknown>,
      callback: (tabs: Array<{ id?: number; url?: string }>) => void
    ): void;
    sendMessage(
      tabId: number,
      message: Record<string, unknown>,
      callback: (response: unknown) => void
    ): void;
  };
};

const EXTENSION_PATH = path.resolve(__dirname, '../../.output/chrome-mv3-dev');
const LOCAL_BROWSER_CANDIDATES = [
  'C:\\Users\\drfer\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const localBrowserExecutable = LOCAL_BROWSER_CANDIDATES.find((candidate) => fs.existsSync(candidate));

const SYNTHETIC_VISIT_HTML = `
  <div class="modal-content">
    <table>
      <tr><td>Keluhan Utama</td><td>:</td><td>kontrol rujukan</td></tr>
      <tr><td>Si tole</td><td>:</td><td>173 mm</td><td>Suhu</td><td>:</td><td>36.8</td></tr>
      <tr><td>Dia tole</td><td>:</td><td>98 Hg</td><td>Detak Jantung</td><td>:</td><td>REGULAR</td></tr>
      <tr><td>Detak Nadi</td><td>:</td><td>100 /menit</td></tr>
      <tr><td>Nafa</td><td>:</td><td>20 /menit</td></tr>
      <tr><td>ID Diagno a</td><td>:</td><td>69261</td><td>ICD-X</td><td>:</td><td>I20</td></tr>
      <tr><td>Tanggal</td><td>:</td><td>25-03-2026 10:04:07</td><td>Diagno a</td><td>:</td><td>Angina pectori</td></tr>
      <tr>
        <td>Dokter / Tenaga Medi</td><td>:</td><td>dr. Ferdi I kandar, S.H., M.Kn., C.LM., CMDC</td>
        <td>Perawat / Bidan / Nutri ioni t / Sanitarian</td><td>:</td><td>DIAN SUNARDI</td>
      </tr>
      <tr><td>Terapi Obat</td><td>:</td><td>e uai advi dokter</td></tr>
    </table>
  </div>
`;

function buildSyntheticAnamnesaPage(): string {
  const visitHtmlJs = JSON.stringify(SYNTHETIC_VISIT_HTML);

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>ePuskesmas Synthetic</title>
      </head>
      <body>
        <div>
          Nama : Ny. Siti Aminah
          RM : 00001033231
          Usia : 34 tahun
          Jenis Kelamin : Perempuan
          Kelurahan : Balowerti
          BPJS : Aktif
          Tgl Lahir : 13-08-1991
        </div>

        <div>
          <label>Penyakit Kronis</label>
          <div>Diabetes Mellitus</div>
        </div>

        <table>
          <tr><td>Nama Faskes</td><td>Puskesmas Balowerti</td></tr>
          <tr><td>Status BPJS</td><td>BPJS Aktif</td></tr>
          <tr><td>Penyakit Khusus</td><td>Kehamilan, Obesitas</td></tr>
          <tr><td>Risiko Kehamilan</td><td>Risiko tinggi trimester 3</td></tr>
          <tr><td>Riwayat Alergi</td><td>Alergi obat, debu</td></tr>
          <tr><td>Status Hamil</td><td>Hamil</td></tr>
          <tr>
            <td>Riwayat Penyakit Sekarang</td>
            <td>Pasien memiliki hiperten si sejak lama.</td>
            <td>18-04-2026</td>
          </tr>
          <tr>
            <td>Riwayat Penyakit Dulu</td>
            <td>Riwayat penyakit kronis: DM.</td>
            <td>18-04-2026</td>
          </tr>
        </table>

        <div id="data_riwayat" class="tab-riwayat">
          <a class="riwayat btn btn-default" data-id="69915" onclick="showRiwayatPelayanan(this)">25-03-2026 Kunjungan Lama</a>
        </div>

        <textarea name="Anamnesa[keluhan_utama]"></textarea>
        <textarea name="Anamnesa[keluhan_tambahan]"></textarea>
        <input name="Anamnesa[lama_sakit_hari]" />
        <textarea name="MRiwayatPasien[Riwayat Penyakit Sekarang][value]" id="text_rps"></textarea>
        <textarea name="MRiwayatPasien[Riwayat Penyakit Dulu][value]" id="text_rpd"></textarea>
        <textarea name="MRiwayatPasien[Riwayat Penyakit Keluarga][value]" id="text_rpk"></textarea>
        <textarea name="MAlergiPasien[Obat][value]" id="text_alergiobat"></textarea>
        <textarea name="MAlergiPasien[Makanan][value]" id="text_alergimakanan"></textarea>
        <textarea name="MAlergiPasien[Udara][value]" id="text_alergiudara"></textarea>
        <textarea name="MAlergiPasien[Umum][value]" id="text_alergiumum"></textarea>
        <input type="radio" name="PeriksaFisik[status_hamil]" value="1" />
        <input type="radio" name="PeriksaFisik[status_hamil]" value="0" />
        <input name="PeriksaFisik[sistole]" id="sistole" />
        <input name="PeriksaFisik[diastole]" id="diastole" />
        <input name="PeriksaFisik[detak_nadi]" id="detak-nadi" />
        <input name="PeriksaFisik[nafas]" id="nafas" />
        <input name="PeriksaFisik[suhu]" id="suhu" />
        <input name="PeriksaFisik[gula_darah]" id="gula-darah" />
        <select name="PeriksaFisik[kesadaran]">
          <option value="">-</option>
          <option value="COMPOS MENTIS">COMPOS MENTIS</option>
          <option value="SOMNOLEN">SOMNOLEN</option>
        </select>
        <input name="PeriksaFisik[saturasi]" id="saturasi" />

        <input name="dokter_nama_bpjs" value="dr. Ferdi Iskandar" />
        <input name="perawat_nama" value="Dian Sunardi" />

        <script>
          window.showRiwayatPelayanan = function () { return true; };
          window.addEventListener('message', function (event) {
            if (event.source !== window) return;
            if (event.data && event.data.type === 'sentra-native-fetch-request') {
              window.postMessage({
                type: 'sentra-native-fetch-response',
                dataId: event.data.dataId,
                success: true,
                content: ${visitHtmlJs}
              }, '*');
            }
          });
        </script>
      </body>
    </html>
  `;
}

function buildSyntheticDiagnosaPage(): string {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>ePuskesmas Synthetic Diagnosa</title>
      </head>
      <body>
        <section class="diagnosa-panel">
          <h1>Form Diagnosa</h1>
          <label>Dokter
            <input name="dokter_nama_bpjs" />
          </label>
          <label>Perawat
            <input name="perawat_nama" />
          </label>
          <label>Kode Diagnosa
            <input name="diagnosa_id" />
          </label>
          <label>Nama Diagnosa
            <input name="diagnosa_nama" />
          </label>
          <label>Jenis Diagnosa
            <select name="diagnosa_jenis">
              <option value="">-</option>
              <option value="1">PRIMER</option>
              <option value="2">SEKUNDER</option>
            </select>
          </label>
          <label>Kasus Diagnosa
            <select name="diagnosa_kasus">
              <option value="">-</option>
              <option value="1">BARU</option>
              <option value="2">LAMA</option>
            </select>
          </label>
          <label>Prognosa
            <select id="prognosa" name="prognosa">
              <option value="">-</option>
              <option value="1">Sanam (Sembuh)</option>
              <option value="2">Bonam (Baik)</option>
              <option value="3">Malam (Buruk/Jelek)</option>
              <option value="4">Dubia Ad Sanam/Bonam (Tidak tentu/Ragu-ragu, Cenderung Sembuh/Baik)</option>
              <option value="5">Dubia Ad Malam (Tidak Tentu/Ragu-ragu, Cenderung Memburuk)</option>
            </select>
          </label>

          <div class="chronic-disease-list">
            <label for="chronic-dm">Diabetes Mellitus</label>
            <input id="chronic-dm" type="checkbox" value="Diabetes Mellitus" />
          </div>

          <button id="tambah-diagnosa" type="button">Tambah</button>
        </section>
      </body>
    </html>
  `;
}

function buildSyntheticResepPage(): string {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>ePuskesmas Synthetic Resep</title>
      </head>
      <body>
        <form id="synthetic-resep-form">
          <label>No Resep
            <input name="no_resep" />
          </label>
          <label>Alergi
            <textarea name="alergi"></textarea>
          </label>
          <label>Prioritas
            <select name="prioritas">
              <option value="">-</option>
              <option value="0">Normal</option>
              <option value="1">Prioritas</option>
            </select>
          </label>
          <label>Dokter
            <input name="dokter_nama_bpjs" />
          </label>
          <label>Perawat
            <input name="perawat_nama" />
          </label>

          <div id="medication-rows">
            <div class="medication-row" data-row-index="0">
              <label>Racikan
                <select name="obat_racikan[0]">
                  <option value="0">Non-racikan</option>
                  <option value="1">Racikan</option>
                </select>
              </label>
              <label>Jumlah Permintaan
                <input name="obat_jumlah_permintaan[0]" />
              </label>
              <label>Nama Obat
                <input
                  name="obat_nama[0]"
                  placeholder="Nama Obat"
                  autocomplete="off"
                />
              </label>
              <label>Jumlah
                <input name="obat_jumlah[0]" />
              </label>
              <label>Signa
                <input name="obat_signa[0]" placeholder="Cari Resep" />
              </label>
              <label>Aturan Pakai
                <select name="aturan_pakai[0]">
                  <option value="">-</option>
                  <option value="1">Sebelum Makan</option>
                  <option value="2">Sesudah Makan</option>
                  <option value="3">Pemakaian Luar</option>
                  <option value="4">Jika Diperlukan</option>
                  <option value="5">Saat Makan</option>
                </select>
              </label>
              <label>Keterangan
                <input name="obat_keterangan[0]" />
              </label>
            </div>
          </div>

          <button id="add-obat" type="button">Tambah</button>
        </form>

        <script>
          (function () {
            if (!(window.$ || window.jQuery)) {
              function wrap(elements) {
                const api = {
                  length: elements.length,
                  autocomplete: function () { return api; },
                  data: function () { return undefined; },
                  each: function (callback) {
                    elements.forEach(function (element, index) {
                      callback.call(element, index, element);
                    });
                    return api;
                  },
                  find: function (selector) {
                    return wrap(elements.flatMap(function (element) {
                      return Array.from(element.querySelectorAll(selector));
                    }));
                  },
                  first: function () {
                    return wrap(elements.length > 0 ? [elements[0]] : []);
                  },
                  text: function () {
                    return elements.map(function (element) {
                      return element.textContent || '';
                    }).join('');
                  },
                  trigger: function (eventName) {
                    elements.forEach(function (element) {
                      element.dispatchEvent(new Event(eventName, { bubbles: true }));
                    });
                    return api;
                  },
                  val: function (value) {
                    if (arguments.length === 0) {
                      const first = elements[0];
                      return first && 'value' in first ? first.value : '';
                    }
                    elements.forEach(function (element) {
                      if ('value' in element) {
                        element.value = value;
                      }
                    });
                    return api;
                  },
                };
                return api;
              }

              function $(selector) {
                if (typeof selector === 'string') {
                  return wrap(Array.from(document.querySelectorAll(selector)));
                }
                if (selector instanceof Element) {
                  return wrap([selector]);
                }
                return wrap([]);
              }

              window.$ = $;
              window.jQuery = $;
            }

            const medicationOptions = ['Paracetamol 500mg', 'Amoxicillin 500mg', 'CTM Tablet'];

            function removeMenu() {
              const existing = document.querySelector('.ui-autocomplete');
              if (existing) existing.remove();
            }

            function showMenu(input) {
              removeMenu();
              const query = (input.value || '').toLowerCase();
              const matches = medicationOptions.filter(function (item) {
                return !query || item.toLowerCase().includes(query);
              });
              if (matches.length === 0) return;

              const menu = document.createElement('ul');
              menu.className = 'ui-autocomplete';
              menu.style.display = 'block';

              matches.forEach(function (item) {
                const option = document.createElement('li');
                option.className = 'ui-menu-item';
                option.textContent = item;
                option.addEventListener('click', function () {
                  input.value = item;
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                  input.dispatchEvent(new Event('blur', { bubbles: true }));
                  removeMenu();
                });
                menu.appendChild(option);
              });

              document.body.appendChild(menu);
            }

            function wireMedicationAutocomplete(input) {
              input.addEventListener('input', function () {
                showMenu(input);
              });
              input.addEventListener('keydown', function (event) {
                if (event.key === 'ArrowDown') {
                  showMenu(input);
                }
              });
              input.addEventListener('blur', function () {
                setTimeout(removeMenu, 50);
              });
            }

            function wireRow(row) {
              const input = row.querySelector('input[name*="obat_nama"]');
              if (input) wireMedicationAutocomplete(input);
            }

            function cloneRow(index) {
              const template = document.querySelector('.medication-row');
              const clone = template.cloneNode(true);
              clone.setAttribute('data-row-index', String(index));
              clone.querySelectorAll('input, select, textarea').forEach(function (field) {
                if (field.name) {
                  field.name = field.name.replace(/\\[\\d+\\]/g, '[' + index + ']');
                }
                if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
                  field.value = '';
                }
                if (field instanceof HTMLSelectElement) {
                  field.selectedIndex = 0;
                }
              });
              wireRow(clone);
              return clone;
            }

            wireRow(document.querySelector('.medication-row'));

            document.getElementById('add-obat').addEventListener('click', function () {
              const rows = document.getElementById('medication-rows');
              const nextIndex = rows.querySelectorAll('.medication-row').length;
              rows.appendChild(cloneRow(nextIndex));
            });
          })();
        </script>
      </body>
    </html>
  `;
}

async function launchExtensionContext(): Promise<BrowserContext> {
  return chromium.launchPersistentContext('', {
    ...(localBrowserExecutable ? { executablePath: localBrowserExecutable } : {}),
    headless: false,
    args: [
      `--load-extension=${EXTENSION_PATH}`,
      `--disable-extensions-except=${EXTENSION_PATH}`,
      '--no-first-run',
    ],
  });
}

async function getExtensionId(context: BrowserContext): Promise<string> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const worker = context.serviceWorkers()[0];
    if (worker) {
      return new URL(worker.url()).host;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Extension service worker did not appear within 15 seconds.');
}

async function openExtensionPage(
  context: BrowserContext,
  extensionId: string,
  pageName: 'sidepanel.html' | 'login.html'
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/${pageName}`);
  await page.waitForLoadState('domcontentloaded');
  return page;
}

async function sendRuntimeMessage<TResponse>(
  page: Page,
  payload: Record<string, unknown>
): Promise<{ response: TResponse; lastError: string | null }> {
  return page.evaluate(async (message) => {
    const chromeApi = (window as unknown as { chrome: ChromeRuntimeApi }).chrome;
    return await new Promise<{ response: TResponse; lastError: string | null }>((resolve) => {
      chromeApi.runtime.sendMessage(message, (response: unknown) => {
        resolve({
          response: response as TResponse,
          lastError: chromeApi.runtime.lastError?.message ?? null,
        });
      });
    });
  }, payload);
}

async function sendMessageToEpuskesmasTab<TResponse>(
  page: Page,
  payload: Record<string, unknown>
): Promise<{ response: TResponse; lastError: string | null }> {
  return page.evaluate(async (message) => {
    const chromeApi = (window as unknown as { chrome: ChromeRuntimeApi }).chrome;
    return await new Promise<{ response: TResponse; lastError: string | null }>((resolve, reject) => {
      chromeApi.tabs.query({}, (tabs) => {
        const target = tabs.find((tab) => (tab.url || '').includes('epuskesmas.id'));
        if (!target?.id) {
          reject(new Error('No synthetic ePuskesmas tab found'));
          return;
        }
        chromeApi.tabs.sendMessage(target.id, message, (response: unknown) => {
          resolve({
            response: response as TResponse,
            lastError: chromeApi.runtime.lastError?.message ?? null,
          });
        });
      });
    });
  }, payload);
}

function unwrapMessagingResponse<T>(response: unknown): T {
  if (typeof response === 'object' && response !== null && 'res' in (response as Record<string, unknown>)) {
    return (response as { res: T }).res;
  }
  return response as T;
}

test.describe.serial('Synthetic ePuskesmas integration', () => {
  let context: BrowserContext;

  test.beforeAll(async () => {
    context = await launchExtensionContext();
  });

  test.afterEach(async () => {
    const pages = context.pages();
    for (const page of pages) {
      if (page.url() === 'about:blank') {
        continue;
      }
      await page.close().catch(() => undefined);
    }
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('scrapes patient, clinical context, medical history, visit history, and tenaga medis end-to-end', async () => {
    await context.route('https://kotakediri.epuskesmas.id/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: buildSyntheticAnamnesaPage(),
      });
    });

    const extensionId = await getExtensionId(context);
    const epPage = await context.newPage();
    await epPage.goto('https://kotakediri.epuskesmas.id/anamnesa/create/82594?from=pelayanan&action=edit');
    await epPage.waitForLoadState('domcontentloaded');
    await epPage.waitForTimeout(2500);

    const extensionPage = await openExtensionPage(context, extensionId, 'sidepanel.html');

    const patientInfo = await sendMessageToEpuskesmasTab<unknown>(extensionPage, {
      type: 'getPatientInfo',
    });
    const medicalHistory = await sendRuntimeMessage<unknown>(extensionPage, {
      type: 'scanMedicalHistory',
      timestamp: Date.now(),
    });
    const clinicalContext = await sendRuntimeMessage<unknown>(extensionPage, {
      type: 'scanClinicalContext',
      timestamp: Date.now(),
    });
    const visitHistory = await sendRuntimeMessage<unknown>(extensionPage, {
      type: 'scanVisitHistory',
      timestamp: Date.now(),
    });
    const tenagaMedis = await sendRuntimeMessage<unknown>(extensionPage, {
      type: 'resolveTenagaMedis',
      timestamp: Date.now(),
    });

    const patientPayload = unwrapMessagingResponse<{
      success: boolean;
      patient: { name: string; gender: string; age: number; rm: string; bpjsStatus: string; kelurahan: string; dob: string };
    }>(patientInfo.response);
    const medicalPayload = unwrapMessagingResponse<{
      success: boolean;
      history: Array<{ shortLabel: string }>;
    }>(medicalHistory.response);
    const contextPayload = unwrapMessagingResponse<{
      success: boolean;
      context: {
        facilityName: string;
        payerLabel: string;
        pregnancyRisk: string;
        specialConditions: string[];
        allergies: string[];
        pregnancyStatus: boolean | null;
      };
    }>(clinicalContext.response);
    const visitPayload = unwrapMessagingResponse<{
      success: boolean;
      visits: Array<{
        encounter_id: string;
        date: string;
        terapi_obat: string;
        dokter_penanganan: string;
        perawat_penanganan: string;
        diagnosa: { icd_x: string; nama: string } | null;
      }>;
    }>(visitHistory.response);
    const tenagaPayload = unwrapMessagingResponse<{
      success: boolean;
      tenagaMedis: { dokterNama: string; perawatNama: string; source: string[] };
    }>(tenagaMedis.response);

    expect(patientInfo.lastError).toBeNull();
    expect(medicalHistory.lastError).toBeNull();
    expect(clinicalContext.lastError).toBeNull();
    expect(visitHistory.lastError).toBeNull();
    expect(tenagaMedis.lastError).toBeNull();

    expect(patientPayload).toMatchObject({
      success: true,
      patient: {
        name: 'Ny. Siti Aminah',
        gender: 'P',
        age: 34,
        rm: '00001033231',
        bpjsStatus: 'aktif',
        kelurahan: 'Balowerti',
        dob: '13-08-1991',
      },
    });
    expect(medicalPayload.success).toBe(true);
    expect(medicalPayload.history.map((item) => item.shortLabel)).toEqual(['DM', 'HT']);
    expect(contextPayload).toMatchObject({
      success: true,
      context: {
        facilityName: 'Puskesmas Balowerti',
        payerLabel: 'BPJS Aktif',
        pregnancyRisk: 'Risiko tinggi trimester 3',
        pregnancyStatus: true,
      },
    });
    expect(contextPayload.context.specialConditions).toEqual(['Kehamilan', 'Obesitas']);
    expect(contextPayload.context.allergies).toEqual(['Debu', 'Obat']);
    expect(visitPayload).toMatchObject({
      success: true,
      visits: [
        {
          encounter_id: '69915',
          date: '2026-03-25',
          terapi_obat: 'e uai advi dokter',
          dokter_penanganan: 'dr. Ferdi I kandar, S.H., M.Kn., C.LM., CMDC',
          perawat_penanganan: 'DIAN SUNARDI',
          diagnosa: {
            icd_x: 'I20',
            nama: 'Angina pectori',
          },
        },
      ],
    });
    expect(tenagaPayload).toMatchObject({
      success: true,
      tenagaMedis: {
        dokterNama: 'dr. Ferdi Iskandar',
        perawatNama: 'Dian Sunardi',
      },
    });
    expect(tenagaPayload.tenagaMedis.source).toEqual(
      expect.arrayContaining(['dom-input:dokter', 'dom-input:perawat'])
    );
  });

  test('fills synthetic anamnesa page through transferRME only-step flow', async () => {
    await context.unrouteAll({ behavior: 'ignoreErrors' });
    await context.route('https://kotakediri.epuskesmas.id/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: buildSyntheticAnamnesaPage(),
      });
    });

    const extensionId = await getExtensionId(context);
    const epPage = await context.newPage();
    await epPage.goto('https://kotakediri.epuskesmas.id/anamnesa/create/82594?from=pelayanan&action=edit');
    await epPage.waitForLoadState('domcontentloaded');
    await epPage.waitForTimeout(2500);

    const extensionPage = await openExtensionPage(context, extensionId, 'sidepanel.html');
    const transferResponse = await sendRuntimeMessage<unknown>(extensionPage, {
      type: 'transferRME',
      timestamp: Date.now(),
      data: {
        anamnesa: {
          keluhan_utama: 'Demam',
          keluhan_tambahan: 'Batuk pilek',
          lama_sakit: { thn: 0, bln: 0, hr: 3 },
          alergi: { obat: ['Amoxicillin'], makanan: [], udara: [], lainnya: [] },
          is_pregnant: false,
          vital_signs: {
            tekanan_darah_sistolik: 120,
            tekanan_darah_diastolik: 80,
            nadi: 90,
            respirasi: 18,
            suhu: 37.2,
            gula_darah: 110,
            kesadaran: 'COMPOS MENTIS',
          },
        },
        options: {
          requestId: 'synthetic-anamnesa-only',
          startFromStep: 'anamnesa',
          onlyStep: 'anamnesa',
        },
      },
    });

    const transferPayload = unwrapMessagingResponse<{
      state: string;
      steps: Record<string, { state: string; failedCount: number }>;
      reasonCodes: string[];
    }>(transferResponse.response);

    expect(transferResponse.lastError).toBeNull();
    expect(transferPayload.state).toBe('success');
    expect(transferPayload.steps.anamnesa.state).toBe('success');

    await expect(epPage.locator('textarea[name="Anamnesa[keluhan_utama]"]')).toHaveValue('Demam');
    await expect(epPage.locator('textarea[name="Anamnesa[keluhan_tambahan]"]')).toHaveValue('Batuk pilek');
    await expect(epPage.locator('input[name="Anamnesa[lama_sakit_hari]"]')).toHaveValue('3');
    await expect(epPage.locator('textarea[name="MAlergiPasien[Obat][value]"]')).toHaveValue('Amoxicillin');
    await expect(epPage.locator('input[name="PeriksaFisik[sistole]"]')).toHaveValue('120');
    await expect(epPage.locator('input[name="PeriksaFisik[diastole]"]')).toHaveValue('80');
    await expect(epPage.locator('input[name="PeriksaFisik[detak_nadi]"]')).toHaveValue('90');
    await expect(epPage.locator('input[name="PeriksaFisik[nafas]"]')).toHaveValue('18');
    await expect(epPage.locator('input[name="PeriksaFisik[suhu]"]')).toHaveValue('37.2');
    await expect(epPage.locator('input[name="PeriksaFisik[gula_darah]"]')).toHaveValue('110');
    await expect(epPage.locator('select[name="PeriksaFisik[kesadaran]"]')).toHaveValue('COMPOS MENTIS');
  });

  test('fills synthetic diagnosa page through transferRME only-step flow', async () => {
    await context.unrouteAll({ behavior: 'ignoreErrors' });
    await context.route('https://kotakediri.epuskesmas.id/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: buildSyntheticDiagnosaPage(),
      });
    });

    const extensionId = await getExtensionId(context);
    const epPage = await context.newPage();
    await epPage.goto('https://kotakediri.epuskesmas.id/diagnosa/create/82594?from=pelayanan&action=edit');
    await epPage.waitForLoadState('domcontentloaded');
    await epPage.waitForTimeout(2500);

    const extensionPage = await openExtensionPage(context, extensionId, 'sidepanel.html');
    const transferResponse = await sendRuntimeMessage<unknown>(extensionPage, {
      type: 'transferRME',
      timestamp: Date.now(),
      data: {
        diagnosa: {
          icd_x: 'J06.9',
          nama: 'ISPA',
          jenis: 'PRIMER',
          kasus: 'BARU',
          prognosa: 'Bonam (Baik)',
          penyakit_kronis: [],
        },
        options: {
          requestId: 'synthetic-diagnosa-only',
          startFromStep: 'diagnosa',
          onlyStep: 'diagnosa',
        },
      },
    });

    const transferPayload = unwrapMessagingResponse<{
      state: string;
      steps: Record<string, { state: string; failedCount: number }>;
      reasonCodes: string[];
    }>(transferResponse.response);

    expect(transferResponse.lastError).toBeNull();
    expect(transferPayload.state).toBe('success');
    expect(transferPayload.steps.diagnosa.state).toBe('success');

    await expect(epPage.locator('input[name="dokter_nama_bpjs"]')).toHaveValue(
      'dr. Ferdi Iskandar, S.H., M.Kn., C.LM., CMDC'
    );
    await expect(epPage.locator('input[name="perawat_nama"]')).toHaveValue('JOSEP ARIANTO, A.Md');
    await expect(epPage.locator('input[name="diagnosa_id"]')).toHaveValue('J06.9');
    await expect(epPage.locator('input[name="diagnosa_nama"]')).toHaveValue('ISPA');
    await expect(epPage.locator('select[name="diagnosa_jenis"]')).toHaveValue('1');
    await expect(epPage.locator('select[name="diagnosa_kasus"]')).toHaveValue('1');
    await expect(epPage.locator('select#prognosa')).toHaveValue('2');
  });

  test('fills synthetic resep page through transferRME only-step flow', async () => {
    await context.unrouteAll({ behavior: 'ignoreErrors' });
    await context.route('https://kotakediri.epuskesmas.id/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: buildSyntheticResepPage(),
      });
    });

    const extensionId = await getExtensionId(context);
    const epPage = await context.newPage();
    await epPage.goto('https://kotakediri.epuskesmas.id/resep/create/82594?from=pelayanan&action=edit');
    await epPage.waitForLoadState('domcontentloaded');
    await epPage.waitForTimeout(2500);

    const extensionPage = await openExtensionPage(context, extensionId, 'sidepanel.html');
    const transferResponse = await sendRuntimeMessage<unknown>(extensionPage, {
      type: 'transferRME',
      timestamp: Date.now(),
      data: {
        resep: {
          static: {
            no_resep: 'AUTO-1',
            alergi: 'Penicillin',
          },
          ajax: {
            ruangan: 'POLI UMUM',
            dokter: 'dr. Test',
            perawat: 'Ns. Test',
          },
          medications: [
            {
              racikan: '0',
              jumlah_permintaan: 6,
              nama_obat: 'Paracetamol 500mg',
              jumlah: 6,
              signa: '3x1',
              aturan_pakai: '2',
              keterangan: 'Sesudah makan',
            },
          ],
          prioritas: '0',
        },
        options: {
          requestId: 'synthetic-resep-only',
          startFromStep: 'resep',
          onlyStep: 'resep',
        },
      },
    });

    const transferPayload = unwrapMessagingResponse<{
      state: string;
      steps: Record<string, { state: string; failedCount: number }>;
      reasonCodes: string[];
    }>(transferResponse.response);

    expect(transferResponse.lastError).toBeNull();
    expect(transferPayload.state).toBe('success');
    expect(transferPayload.steps.resep.state).toBe('success');

    await expect(epPage.locator('input[name="no_resep"]')).toHaveValue('AUTO-1');
    await expect(epPage.locator('textarea[name="alergi"]')).toHaveValue('Penicillin');
    await expect(epPage.locator('select[name="prioritas"]')).toHaveValue('0');
    await expect(epPage.locator('input[name="dokter_nama_bpjs"]')).toHaveValue(
      'dr. Ferdi Iskandar, S.H., M.Kn., C.LM., CMDC'
    );
    await expect(epPage.locator('input[name="perawat_nama"]')).toHaveValue('JOSEP ARIANTO, A.Md');
    await expect(epPage.locator('select[name="obat_racikan[0]"]')).toHaveValue('0');
    await expect(epPage.locator('input[name="obat_jumlah_permintaan[0]"]')).toHaveValue('6');
    await expect(epPage.locator('input[name="obat_nama[0]"]')).toHaveValue('Paracetamol 500mg');
    await expect(epPage.locator('input[name="obat_jumlah[0]"]')).toHaveValue('6');
    await expect(epPage.locator('input[name="obat_signa[0]"]')).toHaveValue('3x1');
    await expect(epPage.locator('select[name="aturan_pakai[0]"]')).toHaveValue('2');
    await expect(epPage.locator('input[name="obat_keterangan[0]"]')).toHaveValue('Sesudah makan');
    await expect(epPage.locator('input[name="obat_nama[1]"]')).toHaveCount(1);
  });
});
