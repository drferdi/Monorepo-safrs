import path from 'path';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { startMockCrewServer } from '../mock-crew-server';
import { getExtensionId, launchExtensionContext } from './chrome-extension-launch';
import {
  buildDailyReportPage,
  SYNTHETIC_DAILY_SERVICES,
  SYNTHETIC_IDENTITY,
} from './epuskesmas-daily-report-page';
import { buildEpuskesmasShapedResepPage } from './epuskesmas-resep-page';
import { buildDailyReportUrl } from '../../lib/statistics/daily-report';
import { SIDE_PANEL_TATALAKSANA_TRANSFER } from './side-panel-tatalaksana-transfer';
import { KB_J18_RESEP_MEDICATIONS } from './side-panel-kb-resep-transfer';

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

        <textarea name="Anamnesa[keluhan_utama]" maxlength="250"></textarea>
        <textarea name="Anamnesa[keluhan_tambahan]" maxlength="250"></textarea>
        <input name="Anamnesa[lama_sakit_hari]" />
        <textarea name="Anamnesa[rencana_tindakan]"></textarea>
        <textarea name="Anamnesa[edukasi]" id="text_edukasi"></textarea>
        <textarea name="MRiwayatPasien[Riwayat Penyakit Sekarang][value]" id="text_rps" maxlength="250"></textarea>
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

            const medicationOptions = ['Paracetamol 500mg', 'Amoxicillin 500mg', 'CTM Tablet', 'Amoksisilin kapsul/kaplet 500 mg'];

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
    return await new Promise<{ response: TResponse; lastError: string | null }>(
      (resolve, reject) => {
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
      }
    );
  }, payload);
}

function unwrapMessagingResponse<T>(response: unknown): T {
  if (
    typeof response === 'object' &&
    response !== null &&
    'res' in (response as Record<string, unknown>)
  ) {
    return (response as { res: T }).res;
  }
  return response as T;
}

test.describe.serial('Synthetic ePuskesmas integration', () => {
  let context: BrowserContext;

  test.beforeAll(async () => {
    context = await launchExtensionContext({ extensionPath: EXTENSION_PATH });
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
    await epPage.goto(
      'https://kotakediri.epuskesmas.id/anamnesa/create/82594?from=pelayanan&action=edit'
    );
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
      patient: {
        name: string;
        gender: string;
        age: number;
        rm: string;
        bpjsStatus: string;
        kelurahan: string;
        dob: string;
      };
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
    await epPage.goto(
      'https://kotakediri.epuskesmas.id/anamnesa/create/82594?from=pelayanan&action=edit'
    );
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
    await expect(epPage.locator('textarea[name="Anamnesa[keluhan_tambahan]"]')).toHaveValue(
      'Batuk pilek'
    );
    await expect(epPage.locator('textarea[name="Anamnesa[keluhan_utama]"]')).toHaveAttribute(
      'maxlength',
      '250'
    );
    const utamaLen = await epPage
      .locator('textarea[name="Anamnesa[keluhan_utama]"]')
      .inputValue()
      .then((value) => value.length);
    expect(utamaLen).toBeLessThanOrEqual(250);
    await expect(epPage.locator('input[name="Anamnesa[lama_sakit_hari]"]')).toHaveValue('3');
    await expect(epPage.locator('textarea[name="MAlergiPasien[Obat][value]"]')).toHaveValue(
      'Amoxicillin'
    );
    await expect(epPage.locator('input[name="PeriksaFisik[sistole]"]')).toHaveValue('120');
    await expect(epPage.locator('input[name="PeriksaFisik[diastole]"]')).toHaveValue('80');
    await expect(epPage.locator('input[name="PeriksaFisik[detak_nadi]"]')).toHaveValue('90');
    await expect(epPage.locator('input[name="PeriksaFisik[nafas]"]')).toHaveValue('18');
    await expect(epPage.locator('input[name="PeriksaFisik[suhu]"]')).toHaveValue('37.2');
    await expect(epPage.locator('input[name="PeriksaFisik[gula_darah]"]')).toHaveValue('110');
    await expect(epPage.locator('select[name="PeriksaFisik[kesadaran]"]')).toHaveValue(
      'COMPOS MENTIS'
    );
  });

  // Chief, 2026-10-03: the dashboard bridge auto-fill must be strong. An entry fills only the tab of
  // its own pelayanan, as soon as that page loads, and never the patient who happens to be open.
  test('fills a dashboard bridge entry only into the tab of its own patient', async () => {
    test.setTimeout(60_000);
    const anamnesa = (keluhan: string) => ({
      anamnesa: {
        keluhan_utama: keluhan,
        keluhan_tambahan: 'Batuk pilek',
        lama_sakit: { thn: 0, bln: 0, hr: 3 },
        alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
        is_pregnant: false,
      },
    });
    const server = await startMockCrewServer({
      bridgeEntries: [
        { id: 'entry-other', pelayananId: '90001', payload: anamnesa('Pasien lain') },
        { id: 'entry-match', pelayananId: '82594', payload: anamnesa('Demam dari dashboard') },
      ],
    });
    const entryRequests = (id: string, method: string) =>
      server.requests.filter(
        (request) => request.path === `/api/emr/bridge/${id}` && request.method === method
      );

    try {
      await context.unrouteAll({ behavior: 'ignoreErrors' });
      await context.route('https://kotakediri.epuskesmas.id/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: buildSyntheticAnamnesaPage(),
        });
      });

      const extensionId = await getExtensionId(context);
      const extensionPage = await openExtensionPage(context, extensionId, 'login.html');
      await extensionPage.evaluate(
        async (authConfig) => {
          const chromeApi = (
            window as unknown as {
              chrome: {
                storage: {
                  local: { set(items: Record<string, unknown>, callback: () => void): void };
                };
              };
            }
          ).chrome;
          await new Promise<void>((resolve) =>
            chromeApi.storage.local.set({ 'sentra:auth-config': authConfig }, resolve)
          );
        },
        { baseUrl: server.baseUrl, automationToken: 'local-automation-token' }
      );
      await extensionPage.close();

      const epPage = await context.newPage();
      await epPage.goto(
        'https://kotakediri.epuskesmas.id/anamnesa/create/82594?from=pelayanan&action=edit'
      );

      await expect(epPage.locator('textarea[name="Anamnesa[keluhan_utama]"]')).toHaveValue(
        'Demam dari dashboard',
        { timeout: 30_000 }
      );
      const actions = () =>
        entryRequests('entry-match', 'PATCH').map(
          (request) => (request.jsonBody as { action?: string }).action
        );
      // The dashboard learns the fill succeeded (the report used to be blocked by the PII guard).
      await expect.poll(actions).toEqual(['claim', 'processing', 'complete']);
      expect(entryRequests('entry-other', 'PATCH')).toHaveLength(0);
      expect(entryRequests('entry-other', 'GET')).toHaveLength(0);
    } finally {
      // The later tests run without a crew server.
      const cleanupPage = await openExtensionPage(
        context,
        await getExtensionId(context),
        'login.html'
      );
      await cleanupPage.evaluate(async () => {
        const chromeApi = (
          window as unknown as {
            chrome: { storage: { local: { remove(key: string, callback: () => void): void } } };
          }
        ).chrome;
        await new Promise<void>((resolve) =>
          chromeApi.storage.local.remove('sentra:auth-config', resolve)
        );
      });
      await cleanupPage.close();
      await server.close();
    }
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
    await epPage.goto(
      'https://kotakediri.epuskesmas.id/diagnosa/create/82594?from=pelayanan&action=edit'
    );
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
    await epPage.goto(
      'https://kotakediri.epuskesmas.id/resep/create/82594?from=pelayanan&action=edit'
    );
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
    // The payload's names win over the constants (DECISIONS 2026-09-27, signed-in Assist user).
    await expect(epPage.locator('input[name="dokter_nama_bpjs"]')).toHaveValue('dr. Test');
    await expect(epPage.locator('input[name="perawat_nama"]')).toHaveValue('Ns. Test');
    await expect(epPage.locator('select[name="obat_racikan[0]"]')).toHaveValue('0');
    await expect(epPage.locator('input[name="obat_jumlah_permintaan[0]"]')).toHaveValue('6');
    await expect(epPage.locator('input[name="obat_nama[0]"]')).toHaveValue('Paracetamol 500mg');
    await expect(epPage.locator('input[name="obat_jumlah[0]"]')).toHaveValue('6');
    await expect(epPage.locator('input[name="obat_signa[0]"]')).toHaveValue('3x1');
    await expect(epPage.locator('select[name="aturan_pakai[0]"]')).toHaveValue('2');
    await expect(epPage.locator('input[name="obat_keterangan[0]"]')).toHaveValue('Sesudah makan');
    await expect(epPage.locator('input[name="obat_nama[1]"]')).toHaveCount(1);
  });
  test('fills what the side panel sends for the whole Tatalaksana into anamnesa, diagnosa and resep', async () => {
    test.setTimeout(90_000);
    const expectations: Record<'anamnesa' | 'diagnosa' | 'resep', Array<[string, string]>> = {
      anamnesa: [
        [
          'textarea[name="Anamnesa[edukasi]"]',
          'Istirahat cukup, jangan bekerja/sekolah dulu hingga 24 jam bebas demam.',
        ],
        ['textarea[name="Anamnesa[rencana_tindakan]"]', 'Kontrol 2 minggu'],
      ],
      diagnosa: [
        ['input[name="diagnosa_id"]', 'J02'],
        ['input[name="diagnosa_nama"]', 'Faringitis akut'],
      ],
      resep: [
        ['input[name="obat_nama[0]"]', 'Amoksisilin kapsul/kaplet 500 mg'],
        ['input[name="obat_jumlah[0]"]', '10'],
        ['input[name="obat_signa[0]"]', '3x1'],
        ['select[name="aturan_pakai[0]"]', '2'],
      ],
    };
    const pages = [
      { step: 'anamnesa', body: buildSyntheticAnamnesaPage() },
      { step: 'diagnosa', body: buildSyntheticDiagnosaPage() },
      { step: 'resep', body: buildSyntheticResepPage() },
    ] as const;
    const extensionId = await getExtensionId(context);

    for (const { step, body } of pages) {
      await context.unrouteAll({ behavior: 'ignoreErrors' });
      await context.route('https://kotakediri.epuskesmas.id/**', async (route) => {
        await route.fulfill({ status: 200, contentType: 'text/html', body });
      });
      const epPage = await context.newPage();
      await epPage.goto(
        `https://kotakediri.epuskesmas.id/${step}/create/82594?from=pelayanan&action=edit`
      );
      await epPage.waitForLoadState('domcontentloaded');
      await epPage.waitForTimeout(2500);

      // The side panel sits beside the RME page: that page stays the active tab while it sends.
      const extensionPage = await openExtensionPage(context, extensionId, 'sidepanel.html');
      await epPage.bringToFront();
      const transferResponse = await sendRuntimeMessage<unknown>(extensionPage, {
        type: 'transferRME',
        timestamp: Date.now(),
        data: {
          [step]: SIDE_PANEL_TATALAKSANA_TRANSFER[step],
          options: {
            requestId: `side-panel-tatalaksana-${step}`,
            startFromStep: step,
            onlyStep: step,
          },
        },
      });
      const transferPayload = unwrapMessagingResponse<{
        steps: Record<string, { state: string }>;
      }>(transferResponse.response);
      expect(transferResponse.lastError).toBeNull();
      expect(transferPayload.steps[step].state, `${step}: ${JSON.stringify(transferPayload)}`).toBe(
        'success'
      );
      for (const [selector, value] of expectations[step]) {
        await expect(epPage.locator(selector)).toHaveValue(value);
      }
      await extensionPage.close();
      await epPage.close();
    }
  });

  // Chief, 2026-10-01: the live resep fill failed ("kalo tidak di tekan ya gak kepilih"). On a
  // page shaped like the live one (suggestions write the hidden obat_id / obat_signa; Tambah needs
  // them), the J18 knowledge-base row must be chosen from both suggestions and land in the table.
  test('adds the J18 knowledge-base row on a page shaped like the live ePuskesmas resep', async () => {
    test.setTimeout(90_000);
    await context.unrouteAll({ behavior: 'ignoreErrors' });
    await context.route('https://kotakediri.epuskesmas.id/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/html', body: buildEpuskesmasShapedResepPage() });
    });
    const epPage = await context.newPage();
    await epPage.goto('https://kotakediri.epuskesmas.id/resep/create/82594?from=pelayanan&action=edit');
    await epPage.waitForLoadState('domcontentloaded');
    await epPage.waitForTimeout(2500);

    const extensionPage = await openExtensionPage(context, await getExtensionId(context), 'sidepanel.html');
    await epPage.bringToFront();
    const transferResponse = await sendRuntimeMessage<unknown>(extensionPage, {
      type: 'transferRME',
      timestamp: Date.now(),
      data: {
        resep: {
          static: { no_resep: '', alergi: '' },
          ajax: { ruangan: '', dokter: 'dr. Test', perawat: 'Ns. Test' },
          medications: KB_J18_RESEP_MEDICATIONS,
          prioritas: '0',
        },
        options: { requestId: 'kb-j18-resep-live-shape', startFromStep: 'resep', onlyStep: 'resep' },
      },
    });
    const transferPayload = unwrapMessagingResponse<{ steps: Record<string, { state: string }> }>(
      transferResponse.response
    );
    expect(transferResponse.lastError).toBeNull();
    expect(transferPayload.steps.resep.state, JSON.stringify(transferPayload)).toBe('success');

    const rows = epPage.locator('#tabel_detail tr.resep-detail-row');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toHaveText('Amoksisilin kapsul/kaplet 500 mg');
    await expect(rows.first()).toHaveAttribute('data-obat-id', '20012');
    // The signa is the suggestion "3X1", chosen; a typed "3x1" would mean nothing was chosen.
    await expect(rows.first()).toHaveAttribute('data-signa', '3X1');
    await expect(rows.first()).toHaveAttribute('data-jumlah', '10');
    await expect(rows.first()).toHaveAttribute('data-aturan-pakai', '2');
    await extensionPage.close();
    await epPage.close();
  });

  // Chief, 2026-10-02 ("Di bagian terapi lagi lagi stuck"): after the first medication was added,
  // the second stayed in the entry row, name typed but not chosen, Jumlah and Signa empty. Every
  // medication of the visit must be chosen from its suggestion and land in the table, in order.
  test('adds every medication of a visit on a page shaped like the live ePuskesmas resep', async () => {
    test.setTimeout(150_000);
    await context.unrouteAll({ behavior: 'ignoreErrors' });
    await context.route('https://kotakediri.epuskesmas.id/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/html', body: buildEpuskesmasShapedResepPage() });
    });
    const epPage = await context.newPage();
    await epPage.goto('https://kotakediri.epuskesmas.id/resep/create/82594?from=pelayanan&action=edit');
    await epPage.waitForLoadState('domcontentloaded');
    await epPage.waitForTimeout(2500);

    const extensionPage = await openExtensionPage(context, await getExtensionId(context), 'sidepanel.html');
    await epPage.bringToFront();
    const medications = [
      {
        racikan: '0',
        jumlah_permintaan: 10,
        nama_obat: 'N-asetilsistein kapsul 200 mg',
        jumlah: 10,
        signa: '1x1',
        aturan_pakai: '2',
        keterangan: 'Lanjutan terapi kronis.',
      },
      {
        racikan: '0',
        jumlah_permintaan: 10,
        nama_obat: 'Klorfeniramin Maleat ( CTM ) tablet 4 mg',
        jumlah: 10,
        signa: '3x1',
        aturan_pakai: '2',
        keterangan: 'Antihistamin',
      },
      ...KB_J18_RESEP_MEDICATIONS,
    ];
    const transferResponse = await sendRuntimeMessage<unknown>(extensionPage, {
      type: 'transferRME',
      timestamp: Date.now(),
      data: {
        resep: {
          static: { no_resep: '', alergi: '' },
          ajax: { ruangan: '', dokter: 'dr. Test', perawat: 'Ns. Test' },
          medications,
          prioritas: '0',
        },
        options: { requestId: 'three-medications-live-shape', startFromStep: 'resep', onlyStep: 'resep' },
      },
    });
    const transferPayload = unwrapMessagingResponse<{ steps: Record<string, { state: string }> }>(
      transferResponse.response
    );
    expect(transferResponse.lastError).toBeNull();
    expect(transferPayload.steps.resep.state, JSON.stringify(transferPayload)).toBe('success');

    const rows = epPage.locator('#tabel_detail tr.resep-detail-row');
    await expect(rows).toHaveText([
      'N-asetilsistein kapsul 200 mg',
      'Klorfeniramin Maleat ( CTM ) tablet 4 mg',
      'Amoksisilin kapsul/kaplet 500 mg',
    ]);
    await expect(rows.nth(0)).toHaveAttribute('data-obat-id', '20144');
    await expect(rows.nth(0)).toHaveAttribute('data-signa', '1X1');
    await expect(rows.nth(1)).toHaveAttribute('data-obat-id', '20109');
    await expect(rows.nth(1)).toHaveAttribute('data-signa', '3X1');
    await expect(rows.nth(1)).toHaveAttribute('data-jumlah', '10');
    await expect(rows.nth(2)).toHaveAttribute('data-obat-id', '20012');
    await expect(epPage.locator('#page-alerts .alert')).toHaveCount(0);
    await extensionPage.close();
    await epPage.close();
  });

  // Chief, 2026-10-02 ("walah macet di vit b6"): the live catalogue offers nothing for "Vitamin B6"
  // (out of stock); the fill typed name variants until the step timed out. A medication the
  // catalogue does not offer is left out at once, named in the result, and the rest still land.
  test('leaves out a medication the ePuskesmas catalogue does not offer and fills the rest', async () => {
    test.setTimeout(150_000);
    await context.unrouteAll({ behavior: 'ignoreErrors' });
    await context.route('https://kotakediri.epuskesmas.id/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/html', body: buildEpuskesmasShapedResepPage() });
    });
    const epPage = await context.newPage();
    await epPage.goto('https://kotakediri.epuskesmas.id/resep/create/82594?from=pelayanan&action=edit');
    await epPage.waitForLoadState('domcontentloaded');
    await epPage.waitForTimeout(2500);

    const extensionPage = await openExtensionPage(context, await getExtensionId(context), 'sidepanel.html');
    await epPage.bringToFront();
    const row = (nama_obat: string, signa: string) => ({
      racikan: '0',
      jumlah_permintaan: 10,
      nama_obat,
      jumlah: 10,
      signa,
      aturan_pakai: '2',
      keterangan: 'Lanjutan terapi kronis.',
    });
    const startedAt = Date.now();
    const transferResponse = await sendRuntimeMessage<unknown>(extensionPage, {
      type: 'transferRME',
      timestamp: Date.now(),
      data: {
        resep: {
          static: { no_resep: '', alergi: '' },
          ajax: { ruangan: '', dokter: 'dr. Test', perawat: 'Ns. Test' },
          medications: [
            row('N-asetilsistein kapsul 200 mg', '2x1'),
            row('Vitamin B6 kapsul 10 mg', '1x1'),
            row('Klorfeniramin Maleat ( CTM ) tablet 4 mg', '3x1'),
          ],
          prioritas: '0',
        },
        options: { requestId: 'out-of-stock-live-shape', startFromStep: 'resep', onlyStep: 'resep' },
      },
    });
    const elapsedMs = Date.now() - startedAt;
    const transferPayload = unwrapMessagingResponse<{
      steps: Record<string, { state: string; message?: string }>;
    }>(transferResponse.response);
    expect(transferResponse.lastError).toBeNull();
    expect(transferPayload.steps.resep.state, JSON.stringify(transferPayload)).toBe('partial');
    expect(transferPayload.steps.resep.message).toContain('Vitamin B6');
    expect(transferPayload.steps.resep.message).toContain('tidak ada di daftar stok');

    const rows = epPage.locator('#tabel_detail tr.resep-detail-row');
    await expect(rows).toHaveText(['N-asetilsistein kapsul 200 mg', 'Klorfeniramin Maleat ( CTM ) tablet 4 mg']);
    await expect(epPage.locator('#page-alerts .alert')).toHaveCount(0);
    await expect(epPage.locator('input[name="obat_nama"]')).toHaveValue('');
    // Two medications at about 5 s each, the missing one in about one search.
    expect(elapsedMs).toBeLessThan(25_000);
    await extensionPage.close();
    await epPage.close();
  });

  // Chief, 2026-10-02 ("Buatkan daily statistic ... yang mengambil data dari RME"): the STATS page
  // reads the day's "Laporan Harian - Pelayanan Pasien" and keeps only the identity-free columns.
  // The background opens that report in a hidden tab, whose first navigation Playwright cannot
  // route (it reached the live server); so the built content script scans the same URL opened here.
  test('scans the daily service report without any patient identity', async () => {
    test.setTimeout(60_000);
    await context.unrouteAll({ behavior: 'ignoreErrors' });
    await context.route('https://kotakediri.epuskesmas.id/**', async (route) => {
      const isReport = new URL(route.request().url()).pathname === '/laporanpelayananpasien';
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: isReport
          ? buildDailyReportPage(SYNTHETIC_DAILY_SERVICES)
          : '<!doctype html><html><body></body></html>',
      });
    });
    const epPage = await context.newPage();
    await epPage.goto(buildDailyReportUrl('https://kotakediri.epuskesmas.id', '2026-10-02'));
    await epPage.waitForLoadState('domcontentloaded');
    await epPage.waitForTimeout(1500);

    const extensionPage = await openExtensionPage(context, await getExtensionId(context), 'sidepanel.html');
    const scan = await sendMessageToEpuskesmasTab<{
      success: boolean;
      rows: Array<{ jenisKelamin: string; dokter: string; diagnosa: Array<{ icd: string }> }>;
    }>(extensionPage, { type: 'scanDailyServiceReport' });

    expect(scan.lastError).toBeNull();
    expect(scan.response.success, JSON.stringify(scan.response)).toBe(true);
    expect(scan.response.rows.map((row) => row.diagnosa[0]?.icd)).toEqual(['I10', 'I10', 'J06.9', '']);
    expect(scan.response.rows.map((row) => row.dokter)).toEqual(['dr. Satu', 'dr. Satu', 'dr. Dua', '']);
    const serialized = JSON.stringify(scan.response);
    for (const value of Object.values(SYNTHETIC_IDENTITY)) {
      expect(serialized).not.toContain(value);
    }
    await extensionPage.close();
    await epPage.close();
  });
});
