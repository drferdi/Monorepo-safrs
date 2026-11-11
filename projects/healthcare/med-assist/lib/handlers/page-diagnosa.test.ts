// Designed and constructed by Drferdi.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fillFieldsMock, mapPayloadToFieldsMock } = vi.hoisted(() => ({
  fillFieldsMock: vi.fn(),
  mapPayloadToFieldsMock: vi.fn(),
}));

vi.mock('@/lib/filler/filler-core', () => ({
  fillFields: fillFieldsMock,
}));

vi.mock('@/lib/scraper/adaptive', () => ({
  mapPayloadToFields: mapPayloadToFieldsMock,
}));

import { fillDiagnosaForm } from '@/lib/handlers/page-diagnosa';

describe('fillDiagnosaForm fallback selector reliability', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    fillFieldsMock.mockReset();
    mapPayloadToFieldsMock.mockReset();
  });

  it('uses the selector that actually exists instead of hardcoding the first fallback selector', async () => {
    document.body.innerHTML = `
      <form>
        <input name="icd10" />
      </form>
    `;

    mapPayloadToFieldsMock.mockResolvedValue({
      mappings: [],
      unmapped: ['icd_x'],
      fromCache: false,
      latencyMs: 3,
    });

    fillFieldsMock.mockResolvedValue([
      {
        success: true,
        field: 'text:input[name="icd10"]',
        value: 'J18',
        method: 'direct',
      },
    ]);

    const result = await fillDiagnosaForm({
      icd_x: 'J18',
      nama: 'Pneumonia',
      jenis: 'PRIMER',
      kasus: 'BARU',
      prognosa: '',
      penyakit_kronis: [],
    });

    expect(fillFieldsMock).toHaveBeenCalledTimes(1);
    const mappings = fillFieldsMock.mock.calls[0][0] as Array<{ selector: string }>;
    const selectedToken = mappings[0]?.selector || '';
    expect(selectedToken).toMatch(/^\[data-sentra-target=/);
    const targetedElement = document.querySelector(selectedToken) as HTMLInputElement | null;
    expect(targetedElement?.name).toBe('icd10');
    expect(result.success.length).toBeGreaterThan(0);
  });
});
