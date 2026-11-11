import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fillAutocompleteMock, fillSelectMock, fillViaMainWorldMock } = vi.hoisted(() => ({
  fillAutocompleteMock: vi.fn(),
  fillSelectMock: vi.fn(),
  fillViaMainWorldMock: vi.fn(),
}));

vi.mock('@/lib/filler/filler-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/filler/filler-core')>()),
  fillAutocomplete: fillAutocompleteMock,
  fillSelect: fillSelectMock,
}));

vi.mock('@/lib/filler/main-world-bridge', () => ({
  fillViaMainWorld: fillViaMainWorldMock,
}));

import { RESEP_FIELDS } from '@/data/field-mappings';
import { PERAWAT_NAMA } from '@/lib/clinical/tenaga-medis';
import { fillResepForm } from '@/lib/handlers/page-resep';
import type { ResepFillPayload } from '@/utils/types';

const EXACT_MATCH_ERROR = 'Nama tenaga medis tidak cocok persis di ePuskesmas';
const dokterSelector = RESEP_FIELDS.dokter_nama_bpjs.selector;
const perawatSelector = RESEP_FIELDS.perawat_nama.selector;

const payload: ResepFillPayload = {
  static: { no_resep: '', alergi: '' },
  ajax: { ruangan: '', dokter: 'dr. Budi', perawat: PERAWAT_NAMA },
  medications: [],
  prioritas: '0',
};

describe('fillResepForm practitioner fields', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    fillAutocompleteMock.mockReset();
    fillSelectMock.mockReset();
    fillViaMainWorldMock.mockReset();
    fillSelectMock.mockResolvedValue({
      success: true,
      field: 'prioritas',
      value: '0',
      method: 'select',
    });
  });

  it('sends the payload names to the bridge with the exact-match rule', async () => {
    fillViaMainWorldMock.mockResolvedValue({ success: [], failed: [] });

    await fillResepForm(payload);

    expect(fillViaMainWorldMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          selector: dokterSelector,
          value: 'dr. Budi',
          requireExactMatch: true,
        }),
        expect.objectContaining({
          selector: perawatSelector,
          value: PERAWAT_NAMA,
          requireExactMatch: true,
        }),
      ],
      25000,
      220
    );
  });

  it('retries a failed practitioner with the configured name and the exact-match rule, never the first item', async () => {
    fillViaMainWorldMock.mockResolvedValue({
      success: [
        { success: true, field: perawatSelector, value: PERAWAT_NAMA, method: 'jq-autocomplete' },
      ],
      failed: [
        {
          success: false,
          field: dokterSelector,
          value: '',
          error: EXACT_MATCH_ERROR,
          method: 'jq-autocomplete-fail',
        },
      ],
    });
    fillAutocompleteMock.mockResolvedValue({
      success: false,
      field: `autocomplete:${dokterSelector}`,
      value: 'dr. Budi',
      method: 'autocomplete',
      error: EXACT_MATCH_ERROR,
    });

    const result = await fillResepForm(payload);

    expect(fillAutocompleteMock).toHaveBeenCalledTimes(1);
    expect(fillAutocompleteMock).toHaveBeenCalledWith(
      dokterSelector,
      'dr. Budi',
      expect.objectContaining({ requireExactMatch: true })
    );
    expect(result.failed).toEqual([
      expect.objectContaining({
        field: `autocomplete:${dokterSelector}`,
        error: expect.stringContaining(EXACT_MATCH_ERROR),
      }),
    ]);
  });
});
