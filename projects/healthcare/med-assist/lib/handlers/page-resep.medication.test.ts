import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fillViaMainWorldMock } = vi.hoisted(() => ({ fillViaMainWorldMock: vi.fn() }));

vi.mock('@/lib/filler/main-world-bridge', () => ({ fillViaMainWorld: fillViaMainWorldMock }));

import { getResepRowSelectors } from '@/data/field-mappings';
import { __resepInternals } from '@/lib/handlers/page-resep';

// The live ePuskesmas entry row (read 2026-10-02): the "Nama Obat" autocomplete writes the hidden
// ResepDetail[1][obat_id] only when a suggestion is chosen; Tambah refuses the row while it is
// empty ("Nama obat tidak boleh kosong"). Chief, 2026-10-02: type a few words, wait for the
// suggestions, then click the medication.
function renderEntryRow() {
  document.body.innerHTML = `
    <table><tbody id="tabel_detail"><tr>
      <td>
        <input type="text" name="ResepDetail[1][obat_id]" data-for="obat_id" style="display:none">
        <input type="text" name="obat_nama" data-for="obat_nama" class="form-control ui-autocomplete-input" placeholder="🔍 Nama Obat">
      </td>
    </tr></tbody></table>`;
}

const obatId = () => document.querySelector<HTMLInputElement>('input[data-for="obat_id"]')!;

describe('pickMedicationInPage on the ePuskesmas Nama Obat autocomplete', () => {
  beforeEach(() => {
    fillViaMainWorldMock.mockReset();
    renderEntryRow();
  });

  it('chooses the medication from the suggestions and confirms the page wrote its obat_id', async () => {
    fillViaMainWorldMock.mockImplementation(async () => {
      obatId().value = '20109';
      return {
        success: [
          {
            success: true,
            field: 'input[name="obat_nama"]',
            value: 'Klorfeniramin Maleat ( CTM ) tablet 4 mg',
            method: 'jq-autocomplete',
          },
        ],
        failed: [],
      };
    });

    const result = await __resepInternals.pickMedicationInPage(
      getResepRowSelectors(0).obat_nama,
      'Klorfeniramin Maleat ( CTM ) tablet 4 mg'
    );

    expect(fillViaMainWorldMock.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({
        selector: 'input[name="obat_nama"]',
        value: 'Klorfeniramin Maleat ( CTM ) tablet 4 mg',
        type: 'autocomplete',
        matchMode: 'medication',
      }),
    ]);
    expect(result.success).toBe(true);
  });

  it('fails when the page wrote no obat_id, so Tambah is never pressed on a typed name', async () => {
    fillViaMainWorldMock.mockResolvedValue({
      success: [
        {
          success: true,
          field: 'input[name="obat_nama"]',
          value: 'Klorfeniramin Maleat ( CTM ) tablet 4 mg',
          method: 'jq-autocomplete',
        },
      ],
      failed: [],
    });

    const result = await __resepInternals.pickMedicationInPage(
      getResepRowSelectors(0).obat_nama,
      'Klorfeniramin Maleat ( CTM ) tablet 4 mg'
    );

    expect(result.success).toBe(false);
  });

  it('leaves a page without a jQuery UI Nama Obat to the typed path', async () => {
    document.querySelector('input[name="obat_nama"]')!.classList.remove('ui-autocomplete-input');

    const result = await __resepInternals.pickMedicationInPage(
      getResepRowSelectors(0).obat_nama,
      'Parasetamol'
    );

    expect(fillViaMainWorldMock).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });
});
