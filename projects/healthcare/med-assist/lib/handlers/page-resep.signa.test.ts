import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fillViaMainWorldMock } = vi.hoisted(() => ({ fillViaMainWorldMock: vi.fn() }));

vi.mock('@/lib/filler/main-world-bridge', () => ({ fillViaMainWorld: fillViaMainWorldMock }));

import { getResepRowSelectors } from '@/data/field-mappings';
import { __resepInternals } from '@/lib/handlers/page-resep';

// The live ePuskesmas resep row (read 2026-10-01): the hidden ResepDetail[1][obat_signa] is written
// only by the "Cari Resep Signa" autocomplete's select; Tambah refuses the row while it is empty.
function renderSignaRow() {
  document.body.innerHTML = `
    <table><tr>
      <td><input type="text" name="ResepDetail[1][obat_signa]" data-for="obat_signa" style="display:none"></td>
      <td><input type="text" name="signa_nama" data-for="signa_nama" class="form-control ui-autocomplete-input" placeholder="🔍 Cari Resep Signa"></td>
    </tr></table>`;
}

describe('fillSignaField on the ePuskesmas signa autocomplete', () => {
  beforeEach(() => {
    fillViaMainWorldMock.mockReset();
    renderSignaRow();
  });

  it('chooses the signa from the visible autocomplete, exactly, before any typed fallback', async () => {
    fillViaMainWorldMock.mockResolvedValue({
      success: [{ success: true, field: 'input[name="signa_nama"]', value: '3X1', method: 'jq-autocomplete' }],
      failed: [],
    });

    const result = await __resepInternals.fillSignaField(getResepRowSelectors(0).obat_signa, '3x1');

    expect(fillViaMainWorldMock).toHaveBeenCalledTimes(1);
    expect(fillViaMainWorldMock.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({ selector: 'input[name="signa_nama"]', value: '3x1', type: 'autocomplete', matchMode: 'exact' }),
    ]);
    expect(result.success).toBe(true);
  });
});
