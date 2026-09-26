import { beforeEach, describe, expect, it, vi } from 'vitest';

const { activateCheckboxWithOnclickMock, fillFieldsMock, fillRangeSliderMock } = vi.hoisted(() => ({
  activateCheckboxWithOnclickMock: vi.fn(),
  fillFieldsMock: vi.fn(),
  fillRangeSliderMock: vi.fn(),
}));

const { fillViaMainWorldMock } = vi.hoisted(() => ({
  fillViaMainWorldMock: vi.fn(),
}));

vi.mock('@/lib/filler/filler-core', () => ({
  activateCheckboxWithOnclick: activateCheckboxWithOnclickMock,
  fillFields: fillFieldsMock,
  fillRangeSlider: fillRangeSliderMock,
}));

vi.mock('@/lib/filler/main-world-bridge', () => ({
  fillViaMainWorld: fillViaMainWorldMock,
}));

import { fillAnamnesaForm } from '@/lib/handlers/page-anamnesa';

describe('fillAnamnesaForm live parity selectors', () => {
  beforeEach(() => {
    document.body.innerHTML = '';

    activateCheckboxWithOnclickMock.mockReset();
    fillFieldsMock.mockReset();
    fillRangeSliderMock.mockReset();
    fillViaMainWorldMock.mockReset();

    activateCheckboxWithOnclickMock.mockResolvedValue({ success: true });
    fillFieldsMock.mockResolvedValue([]);
    fillRangeSliderMock.mockResolvedValue({
      success: true,
      field: 'slider',
      value: '0',
      method: 'direct',
    });
    fillViaMainWorldMock.mockResolvedValue({ success: [], failed: [] });
  });

  it('targets live ePuskesmas pregnancy radios under PeriksaFisik[status_hamil]', async () => {
    await fillAnamnesaForm({
      keluhan_utama: 'Kontrol kehamilan',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 1 },
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
      is_pregnant: true,
    });

    expect(fillFieldsMock).toHaveBeenCalled();
    const firstCallMappings = fillFieldsMock.mock.calls[0][0] as Array<{ selector: string }>;
    const pregnancyMapping = firstCallMappings.find((item) =>
      item.selector.includes('PeriksaFisik[status_hamil]')
    );

    expect(pregnancyMapping).toBeDefined();
    expect(pregnancyMapping?.selector).toContain('value="1"');
  });

  it('caps keluhan_utama, keluhan_tambahan, and RPS via RME SSOT (≤220 words / ≤250 chars)', async () => {
    const longUtama = `demam ${Array.from({ length: 240 }, (_, i) => `suhu${i + 1}`).join(' ')}`;
    const longTambahan = Array.from({ length: 230 }, (_, i) => `tambahan${i + 1}`).join(' ');
    const longRps = Array.from({ length: 230 }, (_, i) => `rps${i + 1}`).join(' ');

    await fillAnamnesaForm({
      keluhan_utama: longUtama,
      keluhan_tambahan: longTambahan,
      lama_sakit: { thn: 0, bln: 0, hr: 1 },
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
      riwayat_penyakit: { sekarang: longRps, dahulu: '', keluarga: '' },
    });

    const mappings = fillFieldsMock.mock.calls[0][0] as Array<{
      selector: string;
      value: string;
    }>;

    const utama = mappings.find((item) => item.selector.includes('keluhan_utama'));
    const tambahan = mappings.find((item) => item.selector.includes('keluhan_tambahan'));
    const rps = mappings.find((item) => item.selector.includes('Riwayat Penyakit Sekarang'));

    expect(utama?.value.charAt(0)).toBe('D'); // sentence-case preserved
    for (const field of [utama, tambahan, rps]) {
      expect(field?.value.split(/\s+/).length).toBeLessThanOrEqual(220);
      expect(field?.value.length).toBeLessThanOrEqual(250);
    }
  });

  it('does not count autocomplete dokter/perawat as failure when direct fill already succeeded', async () => {
    fillFieldsMock
      .mockResolvedValueOnce([
        {
          success: true,
          field: 'textarea[name="Anamnesa[keluhan_utama]"], textarea#keluhan',
          value: 'Demam',
          method: 'direct',
        },
      ])
      .mockResolvedValueOnce([
        {
          success: true,
          field: 'input[name="dokter_nama_bpjs"], input[name="dokter_nama"], input[name="dokter"]',
          value: 'dr. Ferdi Iskandar',
          method: 'direct',
        },
        {
          success: true,
          field: 'input[name="perawat_nama"], input[name="perawat"], input[name*="bidan"]',
          value: 'Dian Sunardi',
          method: 'direct',
        },
      ]);
    fillViaMainWorldMock.mockResolvedValue({
      success: [],
      failed: [
        {
          success: false,
          field: 'input[name="dokter_nama_bpjs"], input[name="dokter_nama"], input[name="dokter"]',
          value: 'dr. Ferdi Iskandar',
          error: 'jQuery not available',
          method: 'autocomplete',
        },
        {
          success: false,
          field: 'input[name="perawat_nama"], input[name="perawat"], input[name*="bidan"]',
          value: 'Dian Sunardi',
          error: 'jQuery not available',
          method: 'autocomplete',
        },
      ],
    });

    const result = await fillAnamnesaForm({
      keluhan_utama: 'Demam',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 0 },
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
    });

    expect(result.failed).toEqual([]);
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        expect.stringContaining('dokter_nama_bpjs'),
        expect.stringContaining('perawat_nama'),
      ])
    );
  });

  it('uses payload terapi text when filling Asuhan Keperawatan therapy field', async () => {
    await fillAnamnesaForm({
      keluhan_utama: 'Demam',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 0 },
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
      lainnya: {
        terapi: 'Terapi farmakologis mengikuti rencana dokter dan respons pasien dipantau.',
        terapi_non_obat: 'Istirahat cukup.',
        bmhp: 'Kassa steril.',
        rencana_tindakan: 'Kontrol ulang.',
        merokok: '0',
        konsumsi_alkohol: '0',
        kurang_sayur_buah: '0',
        edukasi: 'Edukasi diberikan.',
        askep: 'Askep diberikan.',
        observasi: 'Observasi tanda vital.',
        keterangan: 'Pasien memahami instruksi.',
        biopsikososial: 'Pasien kooperatif.',
        tindakan_keperawatan: 'Mengukur tanda vital.',
      },
    });

    const firstCallMappings = fillFieldsMock.mock.calls[0][0] as Array<{
      selector: string;
      value: unknown;
    }>;
    const terapiMapping = firstCallMappings.find((item) =>
      item.selector.includes('Anamnesa[terapi]')
    );

    expect(terapiMapping?.value).toBe(
      'Terapi farmakologis mengikuti rencana dokter dan respons pasien dipantau.'
    );
  });

  it('targets all latest live PENGKAJIAN AWAL fields from rme-puskesmas map', async () => {
    await fillAnamnesaForm({
      keluhan_utama: 'Nyeri perut',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 2 },
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
      vital_signs: {
        tekanan_darah_sistolik: 131,
        tekanan_darah_diastolik: 71,
        nadi: 88,
        respirasi: 22,
        suhu: 37.2,
        gula_darah: 140,
        kesadaran: 'COMPOS MENTIS',
        map: 91,
        detak_jantung: 'REGULAR',
      },
      periksa_fisik: {
        gcs_membuka_mata: '4',
        gcs_respon_verbal: '5',
        gcs_respon_motorik: '6',
        tinggi: 155,
        berat: 61,
        lingkar_perut: 82,
        imt: 25.4,
        hasil_imt: 'BB Lebih',
        saturasi: 98,
        mobilisasi: '0',
        toileting: '0',
        makan_minum: '0',
        mandi: '0',
        berpakaian: '0',
        aktifitas_fisik: 'Pasien dapat beraktivitas secara mandiri',
        cara_ukur: 'berdiri',
        triage: 'TIDAK GAWAT DARURAT',
      },
      assesmen_nyeri: {
        merasakan_nyeri: '1',
        skala_nyeri: 6,
        pencetus: 'Diperberat oleh aktivitas',
        kualitas: 'Tumpul',
        lokasi: 'Abdomen',
        waktu: '0',
      },
    });

    const allMappings = fillFieldsMock.mock.calls.flatMap((call) => call[0]) as Array<{
      selector: string;
      value: unknown;
    }>;

    expect(allMappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          selector: expect.stringContaining('PeriksaFisik[map]'),
          value: 91,
        }),
        expect.objectContaining({
          selector: expect.stringContaining('PeriksaFisik[detak_jantung]'),
          value: 'REGULAR',
        }),
        expect.objectContaining({
          selector: expect.stringContaining('PeriksaFisik[cara_ukur]'),
          value: 'berdiri',
        }),
        expect.objectContaining({
          selector: expect.stringContaining('PeriksaFisik[triage]'),
          value: 'TIDAK GAWAT DARURAT',
        }),
        expect.objectContaining({
          selector: expect.stringContaining('input#tinggi_badan'),
          value: 155,
        }),
        expect.objectContaining({
          selector: expect.stringContaining('input#berat_badan'),
          value: 61,
        }),
        expect.objectContaining({
          selector: expect.stringContaining('input[name="PeriksaFisik[hasil_imt]"]'),
          value: 'BB Lebih',
        }),
        expect.objectContaining({
          selector: expect.stringContaining('input[name="PeriksaFisik[pencetus]"]'),
          value: 'Diperberat oleh aktivitas',
        }),
        expect.objectContaining({
          selector: expect.stringContaining('select[name="PeriksaFisik[kualitas]"]'),
          value: 'Tumpul',
        }),
        expect.objectContaining({
          selector: expect.stringContaining('input[name="PeriksaFisik[lokasi]"]'),
          value: 'Abdomen',
        }),
        expect.objectContaining({
          selector: expect.stringContaining('PeriksaFisik[waktu]'),
          value: '0',
        }),
      ])
    );
  });

  it('selects pain yes before filling pain detail fields and slider', async () => {
    await fillAnamnesaForm({
      keluhan_utama: 'Nyeri perut',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 1 },
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
      assesmen_nyeri: {
        merasakan_nyeri: '1',
        skala_nyeri: 6,
        pencetus: 'Diperberat oleh aktivitas',
        kualitas: 'Melilit',
        lokasi: 'Perut kanan bawah',
        waktu: '0',
      },
    });

    const calls = fillFieldsMock.mock.calls.map((call) => call[0] as Array<{ selector: string }>);
    const mainCall = calls[0];
    const painRadioCallIndex = calls.findIndex((mappings) =>
      mappings.some((mapping) => mapping.selector.includes('PeriksaFisik[merasakan_nyeri]'))
    );
    const painDetailCallIndex = calls.findIndex((mappings) =>
      mappings.some((mapping) => mapping.selector.includes('PeriksaFisik[pencetus]'))
    );

    expect(mainCall).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          selector: expect.stringContaining('PeriksaFisik[merasakan_nyeri]'),
        }),
        expect.objectContaining({
          selector: expect.stringContaining('PeriksaFisik[pencetus]'),
        }),
        expect.objectContaining({
          selector: expect.stringContaining('PeriksaFisik[lokasi]'),
        }),
      ])
    );
    expect(painRadioCallIndex).toBeGreaterThan(0);
    expect(painDetailCallIndex).toBeGreaterThan(0);
    expect(painDetailCallIndex).toBeGreaterThan(painRadioCallIndex);
    expect(calls[painRadioCallIndex]).toEqual([
      expect.objectContaining({
        selector: expect.stringContaining('PeriksaFisik[merasakan_nyeri]'),
        value: '1',
      }),
    ]);
    expect(calls[painDetailCallIndex]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          selector: expect.stringContaining('input[name="PeriksaFisik[pencetus]"]'),
        }),
        expect.objectContaining({
          selector: expect.stringContaining('input[name="PeriksaFisik[lokasi]"]'),
        }),
      ])
    );
    expect(fillRangeSliderMock).toHaveBeenCalledWith(
      'input#skala_nyeri, input[name="PeriksaFisik[skala_nyeri]"]',
      'input#range-slider, input[name="PeriksaFisik[skala_nyeri_slider]"]',
      6
    );
    expect(fillFieldsMock.mock.invocationCallOrder[painDetailCallIndex]).toBeLessThan(
      fillRangeSliderMock.mock.invocationCallOrder[0]
    );
  });

  it('uses fast delays for direct anamnesa fills while keeping interactive pain and bridge delays safe', async () => {
    await fillAnamnesaForm({
      keluhan_utama: 'Nyeri perut',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 1 },
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
      assesmen_nyeri: {
        merasakan_nyeri: '1',
        skala_nyeri: 5,
        pencetus: 'Diperberat oleh aktivitas',
        kualitas: 'Melilit',
        lokasi: 'Perut kanan bawah',
        waktu: '0',
      },
      keadaan_fisik: {
        kepala: {
          inspeksi: 'Kepala simetris.',
          palpasi: '',
        },
      },
      tenaga_medis: {
        dokter_nama: 'dr. Ferdi Iskandar',
        perawat_nama: 'Dian Sunardi',
      },
    });

    const calls = fillFieldsMock.mock.calls;
    const findDelayBySelector = (selectorText: string) => {
      const call = calls.find(([mappings]) =>
        (mappings as Array<{ selector: string }>).some((mapping) =>
          mapping.selector.includes(selectorText)
        )
      );
      return call?.[1] as number | undefined;
    };

    expect(findDelayBySelector('Anamnesa[keluhan_utama]')).toBeLessThan(100);
    expect(findDelayBySelector('PeriksaFisik[kepala][Inspeksi]')).toBeLessThan(100);
    expect(findDelayBySelector('dokter_nama_bpjs')).toBeLessThan(100);
    expect(findDelayBySelector('PeriksaFisik[merasakan_nyeri]')).toBe(100);
    expect(findDelayBySelector('PeriksaFisik[pencetus]')).toBe(100);
    expect(fillViaMainWorldMock).toHaveBeenCalledWith(expect.any(Array), 25000, 220);
  });

  it('fills physical exam textareas only after activating their checkboxes', async () => {
    await fillAnamnesaForm({
      keluhan_utama: 'Sakit kepala',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 1 },
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
      keadaan_fisik: {
        kepala: {
          inspeksi: 'Kepala tampak simetris, tidak tampak luka.',
          palpasi: 'Nyeri tekan ringan pada regio frontal.',
        },
      },
    });

    expect(activateCheckboxWithOnclickMock).toHaveBeenCalledWith(
      'input#textareaFisik\\[3\\], input[id="textareaFisik[3]"]',
      true
    );

    const calls = fillFieldsMock.mock.calls.map((call) => call[0] as Array<{ selector: string }>);
    const physicalExamCallIndex = calls.findIndex((mappings) =>
      mappings.some((mapping) => mapping.selector.includes('PeriksaFisik[kepala][Inspeksi]'))
    );

    expect(physicalExamCallIndex).toBeGreaterThan(0);
    expect(calls[0]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          selector: expect.stringContaining('PeriksaFisik[kepala][Inspeksi]'),
        }),
      ])
    );
    expect(activateCheckboxWithOnclickMock.mock.invocationCallOrder[0]).toBeLessThan(
      fillFieldsMock.mock.invocationCallOrder[physicalExamCallIndex]
    );
  });

  it('fills anatomy popup from visible markers selected by complaints', async () => {
    document.body.innerHTML = `
      <section aria-label="Anatomi Tubuh">
        <h3>Anatomi Tubuh</h3>
        <button type="button" class="anatomy-marker" data-body-part="Kepala">Kepala</button>
        <button type="button" class="anatomy-marker" data-body-part="Perut">Perut</button>
        <button type="button" class="anatomy-marker" data-body-part="Tangan" hidden>Tangan</button>
      </section>
      <div id="anatomy-popup" role="dialog" style="display: none">
        <label>
          Bagian Tubuh
          <input name="Anatomi[bagian_tubuh]" />
        </label>
        <label>
          Keterangan
          <textarea name="Anatomi[keterangan]"></textarea>
        </label>
        <button type="button" id="save-anatomy">Simpan</button>
      </div>
    `;

    const popup = document.querySelector<HTMLElement>('#anatomy-popup');
    const savedRows: Array<{ bagianTubuh: string; keterangan: string }> = [];

    for (const marker of document.querySelectorAll<HTMLButtonElement>('.anatomy-marker')) {
      marker.addEventListener('click', () => {
        if (!popup) return;
        popup.style.display = 'block';
        popup.querySelector<HTMLInputElement>('input')!.value = '';
        popup.querySelector<HTMLTextAreaElement>('textarea')!.value = '';
      });
    }

    document.querySelector<HTMLButtonElement>('#save-anatomy')?.addEventListener('click', () => {
      if (!popup) return;
      savedRows.push({
        bagianTubuh: popup.querySelector<HTMLInputElement>('input')?.value ?? '',
        keterangan: popup.querySelector<HTMLTextAreaElement>('textarea')?.value ?? '',
      });
      popup.style.display = 'none';
    });

    const result = await fillAnamnesaForm({
      keluhan_utama: 'Sakit kepala dan nyeri perut sejak pagi',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 1 },
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
    });

    expect(savedRows).toEqual([
      {
        bagianTubuh: 'Kepala',
        keterangan: 'Sakit kepala dan nyeri perut sejak pagi',
      },
      {
        bagianTubuh: 'Perut',
        keterangan: 'Sakit kepala dan nyeri perut sejak pagi',
      },
    ]);
    expect(savedRows).not.toContainEqual(
      expect.objectContaining({
        bagianTubuh: 'Tangan',
      })
    );
    expect(result.success).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'anatomi:Kepala',
          value: 'Sakit kepala dan nyeri perut sejak pagi',
        }),
        expect.objectContaining({
          field: 'anatomi:Perut',
          value: 'Sakit kepala dan nyeri perut sejak pagi',
        }),
      ])
    );
  });

  it('uses structured anatomy payload before falling back to complaint text inference', async () => {
    document.body.innerHTML = `
      <section aria-label="Anatomi Tubuh">
        <h3>Anatomi Tubuh</h3>
        <button type="button" class="anatomy-marker" data-body-part="Perut">Perut</button>
      </section>
      <div id="anatomy-popup" role="dialog" style="display: none">
        <label>Bagian Tubuh<input name="Anatomi[bagian_tubuh]" /></label>
        <label>Keterangan<textarea name="Anatomi[keterangan]"></textarea></label>
        <button type="button" id="save-anatomy">Simpan</button>
      </div>
    `;

    const popup = document.querySelector<HTMLElement>('#anatomy-popup');
    const savedRows: Array<{ bagianTubuh: string; keterangan: string }> = [];

    document.querySelector<HTMLButtonElement>('.anatomy-marker')?.addEventListener('click', () => {
      if (!popup) return;
      popup.style.display = 'block';
    });

    document.querySelector<HTMLButtonElement>('#save-anatomy')?.addEventListener('click', () => {
      if (!popup) return;
      savedRows.push({
        bagianTubuh: popup.querySelector<HTMLInputElement>('input')?.value ?? '',
        keterangan: popup.querySelector<HTMLTextAreaElement>('textarea')?.value ?? '',
      });
      popup.style.display = 'none';
    });

    const result = await fillAnamnesaForm({
      keluhan_utama: 'Kontrol umum',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 1 },
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
      anatomi_tubuh: [
        {
          bagian_tubuh: 'Perut',
          keterangan: 'Nyeri perut kanan bawah sejak pagi',
          confidence: 'high',
          source: 'keluhan',
        },
      ],
    });

    expect(savedRows).toEqual([
      {
        bagianTubuh: 'Perut',
        keterangan: 'Nyeri perut kanan bawah sejak pagi',
      },
    ]);
    expect(result.success).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'anatomi:Perut',
          value: 'Nyeri perut kanan bawah sejak pagi',
        }),
      ])
    );
  });

  it('falls back to nearest visible anatomy marker when marker labels are absent', async () => {
    document.body.innerHTML = `
      <section id="anatomy-map" aria-label="Anatomi Tubuh">
        <h3>Anatomi Tubuh</h3>
        <button type="button" class="marker" id="dot-a"></button>
        <button type="button" class="marker" id="dot-b"></button>
        <button type="button" class="marker" id="dot-c"></button>
      </section>
      <div id="anatomy-popup" role="dialog" style="display: none">
        <label>Bagian Tubuh<input name="Anatomi[bagian_tubuh]" /></label>
        <label>Keterangan<textarea name="Anatomi[keterangan]"></textarea></label>
        <button type="button" id="save-anatomy">Simpan</button>
      </div>
    `;

    const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
      x: left,
      y: top,
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      toJSON: () => ({}),
    });

    const anatomyMap = document.querySelector<HTMLElement>('#anatomy-map');
    const headMarker = document.querySelector<HTMLElement>('#dot-a');
    const abdomenMarker = document.querySelector<HTMLElement>('#dot-b');
    const footMarker = document.querySelector<HTMLElement>('#dot-c');

    vi.spyOn(anatomyMap!, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 200, 200));
    vi.spyOn(headMarker!, 'getBoundingClientRect').mockReturnValue(rect(40, 20, 10, 10));
    vi.spyOn(abdomenMarker!, 'getBoundingClientRect').mockReturnValue(rect(40, 90, 10, 10));
    vi.spyOn(footMarker!, 'getBoundingClientRect').mockReturnValue(rect(40, 180, 10, 10));

    const popup = document.querySelector<HTMLElement>('#anatomy-popup');
    const clickedMarkers: string[] = [];
    const savedRows: Array<{ bagianTubuh: string; keterangan: string }> = [];

    for (const marker of document.querySelectorAll<HTMLButtonElement>('.marker')) {
      marker.addEventListener('click', () => {
        clickedMarkers.push(marker.id);
        if (!popup) return;
        popup.style.display = 'block';
      });
    }

    document.querySelector<HTMLButtonElement>('#save-anatomy')?.addEventListener('click', () => {
      if (!popup) return;
      savedRows.push({
        bagianTubuh: popup.querySelector<HTMLInputElement>('input')?.value ?? '',
        keterangan: popup.querySelector<HTMLTextAreaElement>('textarea')?.value ?? '',
      });
      popup.style.display = 'none';
    });

    await fillAnamnesaForm({
      keluhan_utama: 'Nyeri perut dan mual',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 1 },
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
    });

    expect(clickedMarkers).toEqual(['dot-b']);
    expect(savedRows).toEqual([
      {
        bagianTubuh: 'Perut',
        keterangan: 'Nyeri perut dan mual',
      },
    ]);
  });

  it('uses nearest onclick anatomy marker when visible markers have no class or text label', async () => {
    document.body.innerHTML = `
      <section id="anatomy-map" aria-label="Anatomi Tubuh">
        <h3>Anatomi Tubuh</h3>
        <span id="dot-a" onclick="return false"></span>
        <span id="dot-b" onclick="return false"></span>
        <span id="dot-c" onclick="return false"></span>
      </section>
      <div id="anatomy-popup" role="dialog" style="display: none">
        <label>Bagian Tubuh<input name="Anatomi[bagian_tubuh]" /></label>
        <label>Keterangan<textarea name="Anatomi[keterangan]"></textarea></label>
        <button type="button" id="save-anatomy">Simpan</button>
      </div>
    `;

    const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
      x: left,
      y: top,
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      toJSON: () => ({}),
    });

    vi.spyOn(
      document.querySelector<HTMLElement>('#anatomy-map')!,
      'getBoundingClientRect'
    ).mockReturnValue(rect(0, 0, 200, 200));
    vi.spyOn(
      document.querySelector<HTMLElement>('#dot-a')!,
      'getBoundingClientRect'
    ).mockReturnValue(rect(40, 20, 10, 10));
    vi.spyOn(
      document.querySelector<HTMLElement>('#dot-b')!,
      'getBoundingClientRect'
    ).mockReturnValue(rect(40, 90, 10, 10));
    vi.spyOn(
      document.querySelector<HTMLElement>('#dot-c')!,
      'getBoundingClientRect'
    ).mockReturnValue(rect(40, 180, 10, 10));

    const popup = document.querySelector<HTMLElement>('#anatomy-popup');
    const clickedMarkers: string[] = [];
    const savedRows: Array<{ bagianTubuh: string; keterangan: string }> = [];

    for (const marker of document.querySelectorAll<HTMLElement>('[onclick]')) {
      marker.addEventListener('click', () => {
        clickedMarkers.push(marker.id);
        if (!popup) return;
        popup.style.display = 'block';
      });
    }

    document.querySelector<HTMLButtonElement>('#save-anatomy')?.addEventListener('click', () => {
      if (!popup) return;
      savedRows.push({
        bagianTubuh: popup.querySelector<HTMLInputElement>('input')?.value ?? '',
        keterangan: popup.querySelector<HTMLTextAreaElement>('textarea')?.value ?? '',
      });
      popup.style.display = 'none';
    });

    await fillAnamnesaForm({
      keluhan_utama: 'Nyeri perut dan mual',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 1 },
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
    });

    expect(clickedMarkers).toEqual(['dot-b']);
    expect(savedRows).toEqual([
      {
        bagianTubuh: 'Perut',
        keterangan: 'Nyeri perut dan mual',
      },
    ]);
  });

  it('does not click unrelated pemeriksaan navigation when anatomy heading lives inside a larger form', async () => {
    document.body.innerHTML = `
      <form id="anamnesa-form" aria-label="Anatomi Tubuh">
        <a id="nav-lab" href="/pemeriksaan/laboratorium/83206" onclick="return false">Laboratorium</a>
        <section id="anatomy-map">
          <h3>Anatomi Tubuh</h3>
          <span id="dot-a" onclick="return false"></span>
          <span id="dot-b" onclick="return false"></span>
        </section>
      </form>
      <div id="anatomy-popup" role="dialog" style="display: none">
        <label>Bagian Tubuh<input name="Anatomi[bagian_tubuh]" /></label>
        <label>Keterangan<textarea name="Anatomi[keterangan]"></textarea></label>
        <button type="button" id="save-anatomy">Simpan</button>
      </div>
    `;

    const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
      x: left,
      y: top,
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      toJSON: () => ({}),
    });

    vi.spyOn(
      document.querySelector<HTMLElement>('#anamnesa-form')!,
      'getBoundingClientRect'
    ).mockReturnValue(rect(0, 0, 1000, 1000));
    vi.spyOn(
      document.querySelector<HTMLElement>('#anatomy-map')!,
      'getBoundingClientRect'
    ).mockReturnValue(rect(300, 200, 220, 320));
    vi.spyOn(
      document.querySelector<HTMLElement>('#nav-lab')!,
      'getBoundingClientRect'
    ).mockReturnValue(rect(210, 440, 20, 20));
    vi.spyOn(
      document.querySelector<HTMLElement>('#dot-a')!,
      'getBoundingClientRect'
    ).mockReturnValue(rect(340, 260, 10, 10));
    vi.spyOn(
      document.querySelector<HTMLElement>('#dot-b')!,
      'getBoundingClientRect'
    ).mockReturnValue(rect(340, 340, 10, 10));

    const popup = document.querySelector<HTMLElement>('#anatomy-popup');
    const clickedIds: string[] = [];

    for (const marker of document.querySelectorAll<HTMLElement>('#nav-lab, #dot-a, #dot-b')) {
      marker.addEventListener('click', () => {
        clickedIds.push(marker.id);
        if (marker.id === 'nav-lab' || !popup) return;
        popup.style.display = 'block';
      });
    }

    await fillAnamnesaForm({
      keluhan_utama: 'Nyeri perut dan mual',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 1 },
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
    });

    expect(clickedIds).not.toContain('nav-lab');
    expect(clickedIds).toContain('dot-b');
  });

  it('does not invoke default anchor activation when using href anatomy markers', async () => {
    document.body.innerHTML = `
      <section id="anatomy-map" aria-label="Anatomi Tubuh">
        <h3>Anatomi Tubuh</h3>
        <a id="dot-a" class="marker" href="/pemeriksaan/laboratorium/83206"></a>
        <a id="dot-b" class="marker" href="/pemeriksaan/laboratorium/83206"></a>
      </section>
      <div id="anatomy-popup" role="dialog" style="display: none">
        <label>Bagian Tubuh<input name="Anatomi[bagian_tubuh]" /></label>
        <label>Keterangan<textarea name="Anatomi[keterangan]"></textarea></label>
        <button type="button" id="save-anatomy">Simpan</button>
      </div>
    `;

    const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
      x: left,
      y: top,
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      toJSON: () => ({}),
    });

    vi.spyOn(
      document.querySelector<HTMLElement>('#anatomy-map')!,
      'getBoundingClientRect'
    ).mockReturnValue(rect(0, 0, 200, 200));
    vi.spyOn(
      document.querySelector<HTMLElement>('#dot-a')!,
      'getBoundingClientRect'
    ).mockReturnValue(rect(40, 20, 10, 10));
    vi.spyOn(
      document.querySelector<HTMLElement>('#dot-b')!,
      'getBoundingClientRect'
    ).mockReturnValue(rect(40, 90, 10, 10));

    const popup = document.querySelector<HTMLElement>('#anatomy-popup');
    const clickedIds: string[] = [];
    let defaultAnchorActivationCount = 0;

    for (const marker of document.querySelectorAll<HTMLAnchorElement>('.marker')) {
      marker.click = function click() {
        defaultAnchorActivationCount += 1;
        HTMLElement.prototype.click.call(this);
      };
      marker.addEventListener('click', () => {
        clickedIds.push(marker.id);
        if (!popup) return;
        popup.style.display = 'block';
      });
    }

    document.querySelector<HTMLButtonElement>('#save-anatomy')?.addEventListener('click', () => {
      if (!popup) return;
      popup.style.display = 'none';
    });

    await fillAnamnesaForm({
      keluhan_utama: 'Nyeri perut dan mual',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 1 },
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
    });

    expect(clickedIds).toContain('dot-b');
    expect(defaultAnchorActivationCount).toBe(0);
  });

  it('does not fall back to document scope and click the page submit button when anatomy popup is absent', async () => {
    document.body.innerHTML = `
      <form id="anamnesa-form" aria-label="Anatomi Tubuh">
        <section id="anatomy-map">
          <h3>Anatomi Tubuh</h3>
          <span id="dot-b" class="marker"></span>
        </section>
        <label>Bagian Tubuh<input name="Anatomi[bagian_tubuh]" /></label>
        <label>Keterangan<textarea name="Anatomi[keterangan]"></textarea></label>
        <button type="submit" id="page-save">Simpan</button>
      </form>
    `;

    const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
      x: left,
      y: top,
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      toJSON: () => ({}),
    });

    vi.spyOn(
      document.querySelector<HTMLElement>('#anatomy-map')!,
      'getBoundingClientRect'
    ).mockReturnValue(rect(0, 0, 200, 200));
    vi.spyOn(
      document.querySelector<HTMLElement>('#dot-b')!,
      'getBoundingClientRect'
    ).mockReturnValue(rect(40, 90, 10, 10));

    const pageSave = document.querySelector<HTMLButtonElement>('#page-save')!;
    let pageSubmitClickCount = 0;
    pageSave.click = function click() {
      pageSubmitClickCount += 1;
      HTMLElement.prototype.click.call(this);
    };

    const result = await fillAnamnesaForm({
      keluhan_utama: 'Nyeri perut dan mual',
      keluhan_tambahan: '',
      lama_sakit: { thn: 0, bln: 0, hr: 1 },
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
    });

    expect(pageSubmitClickCount).toBe(0);
    expect(result.failed).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: expect.stringContaining('anatomi:'),
        }),
      ])
    );
    expect(result.skipped).toEqual(
      expect.arrayContaining([expect.stringContaining('popup anatomi valid tidak ditemukan')])
    );
  });
});
