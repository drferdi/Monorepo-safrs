import { describe, expect, it } from 'vitest';

import {
  detectEpuskesmasPageType,
  selectBestTransferTab,
  selectBridgeTransferTab,
} from '@/lib/rme/transfer-targeting';

describe('transfer targeting', () => {
  it('prefers the anamnesa tab for the active encounter over unrelated pemeriksaan tabs', () => {
    const selected = selectBestTransferTab(
      [
        {
          id: 11,
          active: false,
          url: 'https://kotakediri.epuskesmas.id/pemeriksaan/laboratorium/99111',
        },
        {
          id: 12,
          active: false,
          url: 'https://kotakediri.epuskesmas.id/anamnesa/create/83206?from=pelayanan&action=edit',
        },
        {
          id: 13,
          active: false,
          url: 'chrome-extension://sentra/sidepanel.html',
        },
      ],
      {
        encounterId: '83206',
        step: 'anamnesa',
      }
    );

    expect(selected).toBe(12);
  });

  it('does not classify generic pemeriksaan pages as anamnesa without anamnesa DOM hints', () => {
    document.body.innerHTML = '<div class="lab-shell"><input name="hasil_lab" /></div>';

    const pageType = detectEpuskesmasPageType(
      'https://kotakediri.epuskesmas.id/pemeriksaan/laboratorium/83206',
      document
    );

    expect(pageType).toBeNull();
  });

  it('still classifies pemeriksaan pages as anamnesa when anamnesa DOM hints are present', () => {
    document.body.innerHTML = '<form><textarea name="anamnesa[keluhan_utama]"></textarea></form>';

    const pageType = detectEpuskesmasPageType(
      'https://kotakediri.epuskesmas.id/pemeriksaan/umum/83206',
      document
    );

    expect(pageType).toBe('anamnesa');
  });
});

describe('bridge transfer targeting', () => {
  const host = 'https://kotakediri.epuskesmas.id';

  it("picks the tab of the entry's pelayanan, its step page first", () => {
    const selected = selectBridgeTransferTab(
      [
        { id: 21, active: true, url: `${host}/anamnesa/create/90001?from=pelayanan` },
        { id: 22, active: false, url: `${host}/pemeriksaan/umum/83206` },
        { id: 23, active: false, url: `${host}/diagnosa/create/83206?from=pelayanan` },
      ],
      { pelayananId: '83206', step: 'diagnosa' }
    );

    expect(selected).toBe(23);
  });

  it("returns no tab when only another patient's page is open, even the active one", () => {
    const selected = selectBridgeTransferTab(
      [
        { id: 31, active: true, url: `${host}/anamnesa/create/90001?from=pelayanan` },
        { id: 32, active: false, url: 'https://example.org/anamnesa/create/83206' },
      ],
      { pelayananId: '83206', step: 'anamnesa' }
    );

    expect(selected).toBeUndefined();
  });

  it('does not take a pelayanan id that only starts with the entry id', () => {
    const selected = selectBridgeTransferTab(
      [{ id: 41, active: true, url: `${host}/anamnesa/create/832061?from=pelayanan` }],
      { pelayananId: '83206', step: 'anamnesa' }
    );

    expect(selected).toBeUndefined();
  });

  it('returns no tab for an empty pelayanan id', () => {
    const selected = selectBridgeTransferTab(
      [{ id: 51, active: true, url: `${host}/anamnesa/create/83206?from=pelayanan` }],
      { pelayananId: ' ' }
    );

    expect(selected).toBeUndefined();
  });
});
