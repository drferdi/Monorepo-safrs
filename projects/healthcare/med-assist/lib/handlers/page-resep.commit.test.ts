import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/filler/main-world-bridge', () => ({ fillViaMainWorld: vi.fn() }));

import { __resepInternals } from '@/lib/handlers/page-resep';

// The live ePuskesmas Tambah (setTambahObat) adds the entry row and empties it at once; a second
// press on the emptied row raises "Nama obat tidak boleh kosong" (seen 2026-10-02 on a page shaped
// like the live one, once per medication).
describe('clickAddResepButton', () => {
  const offsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      configurable: true,
      get() {
        return document.body;
      },
    });
    document.body.innerHTML = `
      <div class="box">
        <table><tbody id="tabel_detail"><tr>
          <td><input type="text" name="obat_nama" placeholder="🔍 Nama Obat"></td>
        </tr></tbody></table>
        <button id="button_add_obat" type="button">Tambah</button>
      </div>`;
  });

  afterEach(() => {
    if (offsetParent) Object.defineProperty(HTMLElement.prototype, 'offsetParent', offsetParent);
  });

  it('presses Tambah once', async () => {
    const presses = vi.fn();
    document.getElementById('button_add_obat')!.addEventListener('click', presses);

    expect(await __resepInternals.clickAddResepButton()).toBe(true);

    expect(presses).toHaveBeenCalledTimes(1);
  });
});
