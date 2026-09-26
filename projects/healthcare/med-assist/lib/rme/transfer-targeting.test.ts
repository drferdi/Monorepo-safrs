import { describe, expect, it } from 'vitest';

import { detectEpuskesmasPageType, selectBestTransferTab } from '@/lib/rme/transfer-targeting';

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
