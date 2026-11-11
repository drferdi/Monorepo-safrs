import { describe, expect, it } from 'vitest';

import {
  detectEpuskesmasPageType,
  selectBestTransferTab,
  selectBridgeTransferTab,
  pelayananIdFromUrl,
  selectPanelTransferTab,
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

describe('panel transfer targeting', () => {
  const host = 'https://kotakediri.epuskesmas.id';

  it("fills the encounter's pelayanan tab, not the active tab of another patient", () => {
    const selected = selectPanelTransferTab(
      [
        { id: 61, active: true, url: `${host}/resep/create/90001?from=pelayanan` },
        { id: 62, active: false, url: `${host}/resep/create/83206?from=pelayanan` },
      ],
      { encounterId: '83206', step: 'resep', activeTabId: 61 }
    );

    expect(selected).toBe(62);
  });

  it("returns no tab when the encounter's page is closed, even with another patient active", () => {
    const selected = selectPanelTransferTab(
      [{ id: 71, active: true, url: `${host}/anamnesa/create/90001?from=pelayanan` }],
      { encounterId: '83206', step: 'anamnesa', activeTabId: 71 }
    );

    expect(selected).toBeUndefined();
  });

  it('keeps the best ePuskesmas tab, then the active tab, without an encounter id', () => {
    const candidates = [
      { id: 81, active: true, url: 'chrome-extension://sentra/sidepanel.html' },
      { id: 82, active: false, url: `${host}/anamnesa/create/90001` },
    ];
    expect(selectPanelTransferTab(candidates, { step: 'anamnesa', activeTabId: 81 })).toBe(82);
    expect(
      selectPanelTransferTab(candidates, { encounterId: ' ', step: 'anamnesa', activeTabId: 81 })
    ).toBe(82);
    expect(
      selectPanelTransferTab([{ id: 91, active: true, url: 'https://example.org/' }], {
        activeTabId: 91,
      })
    ).toBe(91);
  });

  // getSuggestions makes `alpha-v3-<ts>` when no page named a pelayanan: it binds to no tab.
  it('keeps the old choice for a generated encounter id', () => {
    const candidates = [{ id: 82, active: true, url: `${host}/anamnesa/create/90001` }];
    expect(
      selectPanelTransferTab(candidates, { encounterId: 'alpha-v3-1759700000000', activeTabId: 82 })
    ).toBe(82);
  });
});

// The live ePuskesmas pages carry a query after the id (`?from=pelayanan&action=edit`).
describe('pelayananIdFromUrl', () => {
  it.each([
    ['https://kotakediri.epuskesmas.id/anamnesa/create/83206?from=pelayanan&action=edit', '83206'],
    ['https://kotakediri.epuskesmas.id/resep/create/83206', '83206'],
    ['https://kotakediri.epuskesmas.id/diagnosa/create/83206#top', '83206'],
    ['https://kotakediri.epuskesmas.id/pelayanan', null],
  ])('%s -> %s', (url, id) => {
    expect(pelayananIdFromUrl(url)).toBe(id);
  });
});
