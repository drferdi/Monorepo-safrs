import { describe, expect, it, vi } from 'vitest';

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      sendMessage: vi.fn(),
    },
  },
}));

vi.mock('@webext-core/messaging', () => ({
  defineExtensionMessaging: () => ({
    sendMessage: vi.fn(),
    onMessage: vi.fn(),
  }),
}));

import { PROTOCOL_MESSAGE_NAMES } from '@/utils/messaging';

describe('extension message contract names', () => {
  it('keeps ProtocolMap message names unique and explicit', () => {
    expect(new Set(PROTOCOL_MESSAGE_NAMES).size).toBe(PROTOCOL_MESSAGE_NAMES.length);
    expect(PROTOCOL_MESSAGE_NAMES).toEqual([
      'fillResep',
      'fillAnamnesa',
      'fillDiagnosa',
      'transferRME',
      'cancelRMETransfer',
      'pageReady',
      'scrapeResult',
      'execFill',
      'execScrape',
      'getSuggestions',
      'getRecommendations',
      'checkInteractions',
      'checkAllergies',
      'calculatePediatricDose',
      'getCDSSStatus',
      'initializeCDSS',
      'miraEnsure',
      'prefetchDiagnosis',
      'getConsultMiraDifferential',
      'scanFields',
      'scanMedicalHistory',
      'scanVisitHistory',
      'scanClinicalContext',
      'scanVitalSigns',
      'resolveTenagaMedis',
      'visitHistoryScraped',
      'scanQueueStatistics',
      'scanReferralStatistics',
      'scanStockStatistics',
      'collectShiftOverview',
      'scanDailyServiceReport',
      'collectDailyStatistics',
    ]);
  });
});
