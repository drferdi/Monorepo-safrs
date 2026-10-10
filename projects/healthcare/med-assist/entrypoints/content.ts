// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Drferdi
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Sentra Assist - Main Content Script
 * Runs on ePuskesmas pages, handles DOM operations
 *
 * Message Protocol (aligned with utils/messaging.ts):
 * - execFill: Execute auto-fill on current page
 * - execScrape: Scrape data from current page
 * - pageReady: Notify background that page is ready
 */

// DAS - Data Ascension System
import { fillAnamnesaForm, initAnamnesaPage } from '@/lib/handlers/page-anamnesa';
import {
  fillDiagnosaForm,
  initDiagnosaPage,
  scrapeDiagnosaForm,
} from '@/lib/handlers/page-diagnosa';
import { fillResepForm, initResepPage, scrapeResepForm } from '@/lib/handlers/page-resep';
import { detectEpuskesmasPageType, pelayananIdFromUrl } from '@/lib/rme/transfer-targeting';
import type { MapperOptions, ScanOptions } from '@/lib/scraper/adaptive/types';
import { scrapeAnamnesa } from '@/lib/scraper/anamnesa';
import { scanMedicalHistoryFromRoot } from '@/lib/scraper/medical-history';
import {
  extractClinicalContextFromDocument,
  extractPatientInfoFromDocument,
  extractTenagaMedisFromDocument,
} from '@/lib/scraper/page-context';
import { isReliablePatientExtract } from '@/lib/scraper/patient-extract-reliability';
import { RME_STATISTIC_PAGES } from '@/lib/scraper/rme-statistic-mapping';
import {
  extractMappedTableRows,
  extractNextPaginationUrl,
} from '@/lib/scraper/rme-statistic-table';
import { scanVitalSignsFromRoot } from '@/lib/scraper/vital-signs';
import { extractDailyServiceRows } from '@/lib/statistics/daily-report';
import type {
  DailyServiceRow,
  QueueStatisticRow,
  ReferralStatisticRow,
  StatisticPageScanResult,
  StockStatisticRow,
} from '@/lib/statistics/types';
import { createLogger } from '@/utils/logger';
import { sendMessage } from '@/utils/messaging';
import type {
  AnamnesaFillPayload,
  DiagnosaFillPayload,
  PageReadyInfo,
  PageType,
  ResepFillPayload,
  ScrapePayload,
} from '@/utils/types';

const contentLog = createLogger('SentraContent', 'content');

function formatLocalDateYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default defineContentScript({
  matches: ['*://*.epuskesmas.id/*'],
  main() {
    // Page state
    let currentPage: string | null = null;
    let isReady = false;

    // Debug logging
    const debug = (msg: string, data?: unknown) => {
      contentLog.debug(`[SentraContent] ${msg}`, data ? data : '');
    };

    // Get current page type - Extended patterns for ePuskesmas
    const getCurrentPage = (): string | null =>
      detectEpuskesmasPageType(window.location.href, document);

    // Initialize content script
    const init = () => {
      contentLog.debug('Content script initialized on', window.location.href);
      debug('Initializing content script');

      // Check which page we're on
      currentPage = getCurrentPage();
      debug('Current page detected:', currentPage);

      // Initialize page-specific handlers
      if (currentPage === 'resep') {
        initResepPage();
      } else if (currentPage === 'anamnesa' || currentPage === 'soap') {
        initAnamnesaPage();
      } else if (currentPage === 'diagnosa') {
        initDiagnosaPage();
      }

      // Extract pelayananId from URL if present
      const getPelayananId = (): string | null => pelayananIdFromUrl(window.location.href);

      // Notify background script that we're ready
      sendMessage('pageReady', {
        pageType: (currentPage || 'unknown') as PageReadyInfo['pageType'],
        pelayananId: getPelayananId(),
        url: window.location.href,
      });

      isReady = true;
    };

    // Message handlers
    const messageHandlers: Record<string, (data: unknown) => unknown> = {
      execFill: async (data: unknown) => {
        const payload = data as { type: string; encounter: Record<string, unknown> };
        debug('Received execFill', payload);

        // Re-detect page type if null (handles SPA navigation or late init)
        if (!currentPage) {
          currentPage = getCurrentPage();
          debug('Re-detected page type:', currentPage);
        }

        try {
          // Route to page-specific handler based on PAYLOAD TYPE (not currentPage)
          // This allows explicit fill requests to proceed even if page detection fails
          if (payload.type === 'resep') {
            debug('Routing to fillResepForm');
            const result = await fillResepForm(payload.encounter as unknown as ResepFillPayload);
            return result;
          }

          if (payload.type === 'anamnesa') {
            // Use direct handler for anamnesa/TTV - DO NOT require currentPage match
            contentLog.debug('Content script received anamnesa fill request');
            contentLog.debug('Current page =', currentPage);
            contentLog.debug('Anamnesa payload received', {
              hasEncounter: Boolean(payload.encounter),
              keys:
                payload.encounter && typeof payload.encounter === 'object'
                  ? Object.keys(payload.encounter).slice(0, 10)
                  : [],
            });
            debug('Using direct Anamnesa handler with payload');
            const result = await fillAnamnesaForm(
              payload.encounter as unknown as AnamnesaFillPayload
            );
            contentLog.debug('fillAnamnesaForm completed', {
              successCount: Array.isArray((result as { success?: unknown }).success)
                ? (result as { success: unknown[] }).success.length
                : 0,
              failedCount: Array.isArray((result as { failed?: unknown }).failed)
                ? (result as { failed: unknown[] }).failed.length
                : 0,
            });
            return result;
          }

          if (payload.type === 'diagnosa') {
            // Use direct handler for diagnosa/ICD-10 - DO NOT require currentPage match
            contentLog.debug('Diagnosa fill request received');
            contentLog.debug('[SentraContent] Routing to fillDiagnosaForm');
            debug('Using Diagnosa handler with DAS integration');
            const result = await fillDiagnosaForm(
              payload.encounter as unknown as DiagnosaFillPayload
            );
            contentLog.debug('[SentraContent] fillDiagnosaForm completed', {
              successCount: Array.isArray((result as { success?: unknown }).success)
                ? (result as { success: unknown[] }).success.length
                : 0,
              failedCount: Array.isArray((result as { failed?: unknown }).failed)
                ? (result as { failed: unknown[] }).failed.length
                : 0,
            });
            return result;
          }

          return {
            success: false,
            error: `Unsupported fill type for ALPHA v3 runtime: ${String(payload.type || 'unknown')}`,
          };
        } catch (error) {
          debug('Fill error:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },

      execScrape: async (data: unknown) => {
        const payload = data as { type: string };
        debug('Received execScrape', payload);

        if (!currentPage) {
          throw new Error('Unknown page type');
        }

        try {
          let pageType: PageType;
          let scrapedData: ScrapePayload['data'];

          switch (currentPage) {
            case 'resep':
              pageType = 'resep';
              scrapedData = (await scrapeResepForm()).medications;
              break;
            case 'anamnesa':
            case 'soap':
              pageType = 'anamnesa';
              scrapedData = await scrapeAnamnesa();
              break;
            case 'diagnosa':
              pageType = 'diagnosa';
              scrapedData = await scrapeDiagnosaForm();
              break;
            default:
              throw new Error(`Scraping not implemented for ${currentPage}`);
          }

          return {
            pageType,
            data: scrapedData,
            timestamp: new Date().toISOString(),
          } satisfies ScrapePayload;
        } catch (error) {
          debug('Scrape error:', error);
          throw new Error(error instanceof Error ? error.message : 'Unknown error');
        }
      },

      getPageInfo: (_data: unknown) => {
        return {
          page: currentPage,
          url: window.location.href,
          title: document.title,
          isReady,
        };
      },

      getCurrentPageType: (_data: unknown) => {
        const detected = getCurrentPage();
        currentPage = detected;
        return {
          pageType: detected || 'unknown',
          url: window.location.href,
          isReady,
        };
      },

      resolveTenagaMedis: (_data: unknown) => {
        const tenagaMedis = extractTenagaMedisFromDocument(document);
        if (!tenagaMedis.dokterNama && !tenagaMedis.perawatNama) {
          return {
            success: false,
            error: 'Nama dokter/perawat tidak ditemukan di halaman aktif.',
            tenagaMedis: {
              dokterNama: '',
              perawatNama: '',
              source: tenagaMedis.source,
              capturedAt: new Date().toISOString(),
            },
          };
        }
        return {
          success: true,
          tenagaMedis: {
            dokterNama: tenagaMedis.dokterNama,
            perawatNama: tenagaMedis.perawatNama,
            source: tenagaMedis.source,
            capturedAt: new Date().toISOString(),
          },
        };
      },

      // Diagnostic: Scan all input fields on the page
      scanFields: (_data: unknown) => {
        debug('Scanning all input fields on page...');

        const fields: Array<{
          tag: string;
          type: string;
          name: string;
          id: string;
          placeholder: string;
          className: string;
        }> = [];

        // Scan all inputs
        document.querySelectorAll('input, textarea, select').forEach((el) => {
          const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          fields.push({
            tag: el.tagName.toLowerCase(),
            type: (input as HTMLInputElement).type || 'text',
            name: input.name || '',
            id: input.id || '',
            placeholder: (input as HTMLInputElement).placeholder || '',
            className: input.className || '',
          });
        });

        contentLog.debug('[SentraContent] Found fields:', fields);
        return { success: true, fields };
      },

      // Scan medical history from ePuskesmas page (riwayat penyakit table)
      scanMedicalHistory: (_data: unknown) => {
        debug('Scanning medical history from page...');
        const result = scanMedicalHistoryFromRoot(document);
        result.diagnostics.forEach((message) => debug(`Medical history: ${message}`));
        debug('Medical history scan complete:', `${result.history.length} items found`);
        return { success: true, history: result.history };
      },

      scanClinicalContext: (_data: unknown) => {
        debug('Scanning clinical context from page...');
        const {
          facilityName,
          payerLabel,
          specialConditions,
          pregnancyRisk,
          allergies,
          pregnancyStatus,
        } = extractClinicalContextFromDocument(document);

        debug('Clinical context scan result', {
          facilityName,
          payerLabel,
          specialConditions,
          pregnancyRisk,
          allergies,
          pregnancyStatus,
        });

        return {
          success: true,
          context: {
            facilityName,
            payerLabel,
            specialConditions,
            pregnancyRisk,
            allergies,
            pregnancyStatus,
          },
        };
      },

      scanVitalSigns: (_data: unknown) => {
        debug('Scanning vital signs from page...');
        const vitals = scanVitalSignsFromRoot(document);
        debug('Vital signs scan complete:', vitals);
        return { success: true, vitals };
      },

      scanQueueStatistics: (_data: unknown): StatisticPageScanResult<QueueStatisticRow> => {
        const table = document.querySelector(RME_STATISTIC_PAGES.pendaftaran.containerSelector);
        if (!table) {
          return {
            success: false,
            rows: [],
            error: 'Tabel pendaftaran tidak ditemukan pada halaman aktif.',
            diagnostics: [`container_missing:${window.location.pathname}`],
          };
        }

        const rows = extractMappedTableRows(
          document,
          RME_STATISTIC_PAGES.pendaftaran.rowSelector,
          RME_STATISTIC_PAGES.pendaftaran.columns
        ).map((row) => ({
          page: 'pendaftaran' as const,
          ...row,
        }));

        return {
          success: true,
          rows,
          nextPageUrl: extractNextPaginationUrl(document, window.location.href),
          diagnostics: [
            `container_ok:${window.location.pathname}`,
            `rows:${rows.length}`,
            `next:${extractNextPaginationUrl(document, window.location.href) || 'none'}`,
          ],
        };
      },

      scanReferralStatistics: (_data: unknown): StatisticPageScanResult<ReferralStatisticRow> => {
        const table = document.querySelector(RME_STATISTIC_PAGES.rujukanexternal.containerSelector);
        if (!table) {
          return {
            success: false,
            rows: [],
            error: 'Tabel rujukan external tidak ditemukan pada halaman aktif.',
            diagnostics: [`container_missing:${window.location.pathname}`],
          };
        }

        const rows = extractMappedTableRows(
          document,
          RME_STATISTIC_PAGES.rujukanexternal.rowSelector,
          RME_STATISTIC_PAGES.rujukanexternal.columns
        ).map((row) => ({
          page: 'rujukanexternal' as const,
          ...row,
        }));

        return {
          success: true,
          rows,
          nextPageUrl: extractNextPaginationUrl(document, window.location.href),
          diagnostics: [
            `container_ok:${window.location.pathname}`,
            `rows:${rows.length}`,
            `next:${extractNextPaginationUrl(document, window.location.href) || 'none'}`,
          ],
        };
      },

      scanStockStatistics: (_data: unknown): StatisticPageScanResult<StockStatisticRow> => {
        const table = document.querySelector(RME_STATISTIC_PAGES.stokobat.containerSelector);
        if (!table) {
          return {
            success: false,
            rows: [],
            error: 'Tabel stok obat tidak ditemukan pada halaman aktif.',
            diagnostics: [`container_missing:${window.location.pathname}`],
          };
        }

        const rows = extractMappedTableRows(
          document,
          RME_STATISTIC_PAGES.stokobat.rowSelector,
          RME_STATISTIC_PAGES.stokobat.columns
        ).map((row) => ({
          page: 'stokobat' as const,
          ...row,
        }));

        return {
          success: true,
          rows,
          nextPageUrl: extractNextPaginationUrl(document, window.location.href),
          diagnostics: [
            `container_ok:${window.location.pathname}`,
            `rows:${rows.length}`,
            `next:${extractNextPaginationUrl(document, window.location.href) || 'none'}`,
          ],
        };
      },

      // Only identity-free columns leave the page; see lib/statistics/daily-report.ts.
      scanDailyServiceReport: (_data: unknown): StatisticPageScanResult<DailyServiceRow> => {
        const { rows, missingHeaders } = extractDailyServiceRows(document);
        if (missingHeaders.length > 0) {
          return {
            success: false,
            rows: [],
            error: `Kolom laporan harian tidak ditemukan: ${missingHeaders.join(', ')}`,
            diagnostics: [`headers_missing:${window.location.pathname}`],
          };
        }
        return {
          success: true,
          rows,
          nextPageUrl: null,
          diagnostics: [`container_ok:${window.location.pathname}`, `rows:${rows.length}`],
        };
      },

      /**
       * Scan Visit History from ePuskesmas "Kunjungan 25 Tahun Terakhir" sidebar.
       *
       * Real DOM structure (verified from live ePuskesmas):
       * 1. Riwayat links: <a class="riwayat btn btn-default" data-id="18556"
       *    onclick="showRiwayatPelayanan(this)">
       * 2. After click → data loads into #anamnesa_riwayat, #diagnosa_riwayat
       * 3. Vitals in: #print_area_anamnesa table rows
       *    (Sistole, Diastole, Detak Nadi, Nafas, Suhu, Gula Darah)
       * 4. Keluhan in: #print_area_anamnesa "Keluhan Utama" row
       * 5. Diagnosa in: #diagnosa_riwayat "ICD-X" + "Diagnosa" rows
       *
       * IMPORTANT: Content scripts run in isolated world.
       * showRiwayatPelayanan() lives in page main world.
       * Must use script injection to call it.
       */
      scanVisitHistory: async (_data: unknown) => {
        const diag: string[] = [];
        const d = (msg: string) => {
          diag.push(msg);
          contentLog.debug('[SentraScrape]', msg);
        };
        d(`SCAN_START url=${window.location.href.slice(0, 80)}`);

        try {
          // === STEP 0: Check if sidebar container exists, wait if needed ===
          let sidebarContainer = document.querySelector('#data_riwayat');
          d(`SIDEBAR: #data_riwayat=${sidebarContainer ? 'FOUND' : 'NOT_FOUND'}`);

          if (!sidebarContainer) {
            // Also check alternative containers
            const altContainers = ['.tab-riwayat', '[class*="riwayat"]', '.col-sm-4 .box'];
            for (const sel of altContainers) {
              const el = document.querySelector(sel);
              if (el) {
                d(`SIDEBAR_ALT: ${sel}=FOUND innerHTML=${el.innerHTML.length}chars`);
                sidebarContainer = el;
                break;
              }
            }
          }

          // Wait up to 2s for sidebar to load (lazy AJAX)
          if (!sidebarContainer || sidebarContainer.innerHTML.trim().length < 50) {
            d('SIDEBAR_WAIT: waiting 2s for lazy load...');
            await new Promise((r) => setTimeout(r, 2000));
            sidebarContainer = document.querySelector('#data_riwayat, .tab-riwayat');
            d(
              `SIDEBAR_AFTER_WAIT: ${sidebarContainer ? `FOUND len=${sidebarContainer.innerHTML.length}` : 'STILL_NOT_FOUND'}`
            );
          }

          // === STEP 1: DOM PROBE — find ALL riwayat-related anchors ===
          const allAnchors = document.querySelectorAll('a');
          const riwayatAnchors = Array.from(allAnchors).filter(
            (a) =>
              a.className.includes('riwayat') ||
              a.getAttribute('onclick')?.toLowerCase().includes('riwayat') ||
              (a.getAttribute('data-id') && a.closest('.tab-riwayat, #data_riwayat'))
          );
          d(`DOM: ${allAnchors.length} total anchors, ${riwayatAnchors.length} riwayat-related`);
          riwayatAnchors.slice(0, 10).forEach((a, i) => {
            d(
              `  A[${i}] cls="${a.className.slice(0, 60)}" data-id="${a.getAttribute('data-id')}" ` +
                `onclick="${(a.getAttribute('onclick') || '').slice(0, 80)}" ` +
                `href="${(a.getAttribute('href') || '').slice(0, 60)}" ` +
                `text="${a.textContent?.trim().slice(0, 50)}"`
            );
          });

          // === STEP 2: Build candidate list with multiple ID extraction strategies ===
          // Broad selector: class, onclick, or links inside riwayat container
          const links = Array.from(
            document.querySelectorAll<HTMLAnchorElement>(
              'a.riwayat, a[onclick*="showRiwayatPelayanan"], a[onclick*="riwayat"], ' +
                'a[onclick*="Riwayat"], a[data-id][href*="printout"], ' +
                '#data_riwayat a, .tab-riwayat a[data-id]'
            )
          );
          // Deduplicate
          const uniqueLinks = [...new Set(links)];
          d(`Selector matched: ${links.length} raw, ${uniqueLinks.length} unique`);

          if (!uniqueLinks.length) {
            // Dump parent containers for debugging
            const boxes = document.querySelectorAll('.col-sm-4 .box');
            d(`EMPTY: 0 links. .col-sm-4 .box count=${boxes.length}`);
            boxes.forEach((b, i) => {
              const cls = b.className;
              const aCount = b.querySelectorAll('a').length;
              d(`  BOX[${i}] class="${cls}" anchors=${aCount} html=${b.innerHTML.slice(0, 100)}`);
            });
            return { success: true, visits: [], diagnostics: diag };
          }

          // === STEP 3: Parse each link — extract date + ID (data-id OR onclick OR href) ===
          const today = formatLocalDateYmd(new Date());
          d(`Today: ${today}`);

          const extractId = (a: HTMLAnchorElement): string => {
            // Priority 1: data-id attribute
            const dataId = a.getAttribute('data-id');
            if (dataId) return dataId;
            // Priority 2: parse from onclick — showRiwayatPelayanan(this) → look for data-id on parent
            const onclick = a.getAttribute('onclick') || '';
            // Pattern: showRiwayatPelayanan('12345') or showRiwayatPelayanan(12345)
            const onclickMatch = onclick.match(/showRiwayatPelayanan\s*\(\s*['"]?(\d+)['"]?\s*\)/i);
            if (onclickMatch) return onclickMatch[1];
            // Pattern: any function with numeric ID
            const genericMatch = onclick.match(/\(\s*['"]?(\d{3,})['"]?\s*\)/);
            if (genericMatch) return genericMatch[1];
            // Priority 3: href contains ID
            const href = a.getAttribute('href') || '';
            const hrefMatch = href.match(/\/(\d{3,})(?:[/?#]|$)/);
            if (hrefMatch) return hrefMatch[1];
            return '';
          };

          const candidates = uniqueLinks.map((a) => {
            const text = a.textContent?.trim() || '';
            const dateMatch = text.match(/(\d{2})-(\d{2})-(\d{4})/);
            const isoDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : '';
            const id = extractId(a);
            const href = a.getAttribute('href') || '';
            d(
              `  CAND: id=${id} date=${isoDate} href=${href.slice(0, 40)} text="${text.slice(0, 50)}"`
            );
            return { id, isoDate, linkText: text, href };
          });

          // Filter: must have date, exclude today
          const pastCandidates = candidates.filter((c) => c.isoDate && c.isoDate !== today);
          d(`Past (excl today): ${pastCandidates.length}`);

          // Must have ID or href to fetch
          const fetchable = pastCandidates.filter((c) => c.id || c.href);
          d(`Fetchable: ${fetchable.length}`);

          // Rollback to expected behavior: process up to 5 latest visits.
          const targets = fetchable.slice(0, 5);
          d(`Targets: ${targets.length}`);

          if (!targets.length) {
            d('NO_TARGETS: all filtered out');
            return { success: true, visits: [], diagnostics: diag };
          }

          // === STEP 4: Silent background fetch via main world bridge ===
          // Use main world's jQuery AJAX (with CSRF token) to fetch visit HTML
          // without triggering visual modal popup.
          const { extractVisitFromRoot } = await import('@/lib/scraper/extractors');
          const visits: NonNullable<ReturnType<typeof extractVisitFromRoot>>[] = [];
          const fetchPromises = targets.map(async (c) => {
            try {
              d(`BRIDGE_FETCH: id=${c.id} date=${c.isoDate}`);

              // Send message to main world bridge
              let cleanupFetchListener = (): void => undefined;
              let fetchTimeoutId: number | null = null;
              const fetchPromise = new Promise<{
                success: boolean;
                content?: string;
                error?: string;
              }>((resolve) => {
                const listener = (event: MessageEvent) => {
                  if (event.source !== window) return;
                  const msg = event.data;
                  if (msg?.type === 'sentra-native-fetch-response' && msg.dataId === c.id) {
                    window.removeEventListener('message', listener);
                    resolve(msg);
                  }
                };
                cleanupFetchListener = () => window.removeEventListener('message', listener);
                window.addEventListener('message', listener);

                // Trigger fetch
                window.postMessage(
                  {
                    type: 'sentra-native-fetch-request',
                    dataId: c.id,
                  },
                  '*'
                );
              });

              // Wait for response (with 8s timeout)
              const result = await Promise.race([
                fetchPromise,
                new Promise<{ success: false; error: string }>((resolve) => {
                  fetchTimeoutId = window.setTimeout(
                    () => resolve({ success: false, error: 'Timeout 8s' }),
                    8000
                  );
                }),
              ]);
              cleanupFetchListener();
              if (fetchTimeoutId !== null) window.clearTimeout(fetchTimeoutId);

              if (!result.success || !result.content) {
                d(`BRIDGE_FAIL: id=${c.id} error=${result.error || 'no content'}`);
                return null;
              }

              d(
                `BRIDGE_OK: id=${c.id} len=${result.content.length} first120="${result.content.slice(0, 120).replace(/\n/g, '\\n')}"`
              );

              // Parse HTML → extract vitals
              const doc = new DOMParser().parseFromString(result.content, 'text/html');
              const visit = extractVisitFromRoot(doc, c.id, c.isoDate);

              if (visit) {
                d(
                  `EXTRACT_OK: id=${c.id} date=${c.isoDate} sbp=${visit.vitals.sbp} dbp=${visit.vitals.dbp} hr=${visit.vitals.hr}`
                );
                return visit;
              } else {
                d(`EXTRACT_NULL: id=${c.id} — extractor returned null`);
                // Dump first table for debugging
                const firstTable = doc.querySelector('table');
                if (firstTable) {
                  d(`  TABLE_DUMP: ${firstTable.innerHTML.slice(0, 300).replace(/\n/g, '\\n')}`);
                }
                return null;
              }
            } catch (error) {
              d(`BRIDGE_ERR: id=${c.id} error=${String(error)}`);
              return null;
            }
          });

          const fetchResults = await Promise.all(fetchPromises);
          for (const visit of fetchResults) {
            if (visit) visits.push(visit);
          }

          d(`DONE: ${visits.length} visits extracted from ${targets.length} targets`);
          return { success: true, visits, diagnostics: diag };
        } catch (error) {
          d(`FATAL: ${error instanceof Error ? error.stack : String(error)}`);
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            visits: [],
            diagnostics: diag,
          };
        }
      },

      /**
       * Get Patient Info from ePuskesmas page header
       * Scrapes: name, gender, age, RM number, BPJS status, address
       */
      getPatientInfo: () => {
        debug('Scraping patient info from page...');
        try {
          const result = extractPatientInfoFromDocument(document);
          // Fail closed: incomplete OCR must not be treated as a successful
          // patient load (age:0 defaults were previously scored as infant).
          if (!isReliablePatientExtract(result)) {
            debug('Patient info incomplete — fail closed:', result);
            return {
              success: false,
              error: 'Incomplete patient extract',
              patient: result,
            };
          }
          debug('Patient info scraped:', result);
          return { success: true, patient: result };
        } catch (error) {
          debug('Error scraping patient info:', error);
          return { success: false, error: String(error), patient: undefined };
        }
      },

      /**
       * DAS - Data Ascension System: Advanced field scanning
       * Scans page fields with AI-ready signatures for intelligent mapping
       */
      scanFieldsDAS: async (data: unknown) => {
        debug('DAS: Scanning page fields...');
        const options = (data as ScanOptions) || {};

        try {
          // Dynamic import to reduce initial bundle size
          const { scanPageFields } = await import('@/lib/scraper/adaptive');
          const result = scanPageFields(options);

          debug(`DAS: Found ${result.fields.length} fields in ${result.scanDuration}ms`);
          return { success: true, ...result };
        } catch (error) {
          debug('DAS: Scan error:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'DAS scan failed',
          };
        }
      },

      /**
       * DAS Phase 2: AI-powered semantic field mapping
       * Maps payload data to form fields using the local semantic mapper
       */
      mapFieldsDAS: async (data: unknown) => {
        debug('DAS: AI semantic mapping...');
        const request = data as { payload: Record<string, unknown>; options?: MapperOptions };

        if (!request?.payload) {
          return { success: false, error: 'Missing payload data' };
        }

        try {
          const { mapPayloadToFields } = await import('@/lib/scraper/adaptive');
          const result = await mapPayloadToFields(request.payload, request.options);

          debug(`DAS: Mapped ${result.mappings.length} fields, ${result.unmapped.length} unmapped`);
          return { success: true, ...result };
        } catch (error) {
          debug('DAS: Mapping error:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'DAS mapping failed',
          };
        }
      },

      /**
       * DAS Phase 2: Preview mapping without executing
       */
      previewMappingDAS: async (data: unknown) => {
        debug('DAS: Previewing mapping...');
        const request = data as { payload: Record<string, unknown> };

        if (!request?.payload) {
          return { success: false, error: 'Missing payload data' };
        }

        try {
          const { previewMapping } = await import('@/lib/scraper/adaptive');
          const result = await previewMapping(request.payload);

          return { success: true, ...result };
        } catch (error) {
          debug('DAS: Preview error:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'DAS preview failed',
          };
        }
      },
    };

    // NOTE:
    // Keep content-side inbound messaging on native browser.runtime.onMessage only.
    // Mixing @webext-core listener with native tab messages can throw
    // "Unknown message format" for raw tab payloads that don't include timestamp.

    // Native message listener for background → content communication
    // This handles direct messages from background script via browser.tabs.sendMessage
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      const msg = message as { type?: string; data?: unknown };
      contentLog.debug('Native message received, type:', msg.type);
      debug('Native message received:', msg);

      if (msg.type === 'execFill' && msg.data) {
        contentLog.debug(
          'execFill handler triggered, data.type:',
          (msg.data as { type?: string })?.type
        );
        Promise.resolve(messageHandlers.execFill(msg.data))
          .then((result) => {
            debug('Fill result:', result);
            sendResponse(result);
          })
          .catch((error) => {
            debug('Fill error:', error);
            sendResponse({
              success: [],
              failed: [{ field: 'all', error: String(error) }],
              skipped: [],
            });
          });
        return true; // Keep channel open for async response
      }

      if (msg.type === 'execScrape' && msg.data) {
        Promise.resolve(messageHandlers.execScrape(msg.data))
          .then((result) => sendResponse(result))
          .catch((error) => sendResponse({ success: false, error: String(error) }));
        return true;
      }

      if (msg.type === 'scanFields') {
        const result = messageHandlers.scanFields(msg.data);
        sendResponse(result);
        return true;
      }

      if (msg.type === 'getCurrentPageType') {
        const result = messageHandlers.getCurrentPageType(msg.data);
        sendResponse(result);
        return true;
      }

      if (msg.type === 'resolveTenagaMedis') {
        const result = messageHandlers.resolveTenagaMedis(msg.data);
        sendResponse(result);
        return true;
      }

      if (msg.type === 'scanMedicalHistory') {
        const result = messageHandlers.scanMedicalHistory(msg.data);
        sendResponse(result);
        return true;
      }

      if (msg.type === 'scanClinicalContext') {
        const result = messageHandlers.scanClinicalContext(msg.data);
        sendResponse(result);
        return true;
      }

      if (msg.type === 'scanVitalSigns') {
        const result = messageHandlers.scanVitalSigns(msg.data);
        sendResponse(result);
        return true;
      }

      if (msg.type === 'scanQueueStatistics') {
        const result = messageHandlers.scanQueueStatistics(msg.data);
        sendResponse(result);
        return true;
      }

      if (msg.type === 'scanReferralStatistics') {
        const result = messageHandlers.scanReferralStatistics(msg.data);
        sendResponse(result);
        return true;
      }

      if (msg.type === 'scanStockStatistics') {
        const result = messageHandlers.scanStockStatistics(msg.data);
        sendResponse(result);
        return true;
      }

      if (msg.type === 'scanDailyServiceReport') {
        const result = messageHandlers.scanDailyServiceReport(msg.data);
        sendResponse(result);
        return true;
      }

      if (msg.type === 'getPatientInfo') {
        const result = messageHandlers.getPatientInfo(msg.data);
        sendResponse(result);
        return true;
      }

      if (msg.type === 'scanVisitHistory') {
        Promise.resolve(messageHandlers.scanVisitHistory(msg.data))
          .then((result) => sendResponse(result))
          .catch((error) => sendResponse({ success: false, error: String(error), visits: [] }));
        return true;
      }

      // DAS - Data Ascension System handlers
      if (msg.type === 'scanFieldsDAS') {
        Promise.resolve(messageHandlers.scanFieldsDAS(msg.data))
          .then((result) => sendResponse(result))
          .catch((error) => sendResponse({ success: false, error: String(error) }));
        return true;
      }

      if (msg.type === 'mapFieldsDAS') {
        Promise.resolve(messageHandlers.mapFieldsDAS(msg.data))
          .then((result) => sendResponse(result))
          .catch((error) => sendResponse({ success: false, error: String(error) }));
        return true;
      }

      if (msg.type === 'previewMappingDAS') {
        Promise.resolve(messageHandlers.previewMappingDAS(msg.data))
          .then((result) => sendResponse(result))
          .catch((error) => sendResponse({ success: false, error: String(error) }));
        return true;
      }

      return false;
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    debug('Content script loaded and waiting for messages');
  },
});
