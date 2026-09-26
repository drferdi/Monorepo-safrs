// Designed and constructed by Drferdi.

import { useMemo, useState } from 'react';
import { sendMessage } from '@/utils/messaging';
import type { AturanPakai, FillResult, Prioritas, ResepFillPayload } from '@/utils/types';

interface MedicationRow {
  id: string;
  racikan: string;
  jumlah_permintaan: number;
  nama_obat: string;
  jumlah: number;
  signa: string;
  aturan_pakai: AturanPakai;
  keterangan: string;
}

interface FillStatus {
  loading: boolean;
  result: FillResult | null;
  error: string | null;
}

const ATURAN_PAKAI_OPTIONS: Record<AturanPakai, string> = {
  '1': 'Sebelum Makan',
  '2': 'Sesudah Makan',
  '3': 'Pemakaian Luar',
  '4': 'Jika Diperlukan',
  '5': 'Saat Makan',
};

const createEmptyMedication = (): MedicationRow => ({
  id: crypto.randomUUID(),
  racikan: '',
  jumlah_permintaan: 0,
  nama_obat: '',
  jumlah: 1,
  signa: '',
  aturan_pakai: '2',
  keterangan: '',
});

const surfaceClass =
  'rounded-[12px] border border-[var(--border-glow)] bg-[var(--bg-card)] px-4 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_16px_30px_-16px_rgba(0,0,0,0.75)]';

const insetClass =
  'rounded-[10px] border border-[var(--border-subtle)] bg-[var(--neu-inset-bg)] px-3 py-3';

const labelClass =
  'mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]';

/**
 * ResepForm
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function ResepForm() {
  const [medications, setMedications] = useState<MedicationRow[]>([createEmptyMedication()]);
  const [alergi, setAlergi] = useState('');
  const [ruangan, setRuangan] = useState('APOTEK');
  const [dokter, setDokter] = useState('');
  const [perawat, setPerawat] = useState('');
  const [prioritas, setPrioritas] = useState<Prioritas>('0');
  const [status, setStatus] = useState<FillStatus>({ loading: false, result: null, error: null });

  const readyMedicationCount = useMemo(
    () => medications.filter((item) => item.nama_obat.trim()).length,
    [medications]
  );

  const addMedication = () => {
    setMedications((prev) => [...prev, createEmptyMedication()]);
  };

  const removeMedication = (id: string) => {
    setMedications((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  const updateMedication = (id: string, field: keyof MedicationRow, value: string | number) => {
    setMedications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleFill = async () => {
    setStatus({ loading: true, result: null, error: null });

    const payload: ResepFillPayload = {
      static: {
        no_resep: '',
        alergi,
      },
      ajax: {
        ruangan,
        dokter,
        perawat,
      },
      medications: medications.map((medication) => ({
        racikan: medication.racikan,
        jumlah_permintaan: medication.jumlah_permintaan,
        nama_obat: medication.nama_obat,
        jumlah: medication.jumlah,
        signa: medication.signa,
        aturan_pakai: medication.aturan_pakai,
        keterangan: medication.keterangan,
      })),
      prioritas,
    };

    try {
      const result = await sendMessage('fillResep', payload);
      setStatus({ loading: false, result, error: null });
    } catch (error) {
      setStatus({ loading: false, result: null, error: String(error) });
    }
  };

  return (
    <div className="fade-in space-y-4">
      <section className={surfaceClass}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-caption">Prescription Uplink</div>
            <h3 className="mt-1 text-[15px] font-semibold text-[var(--text-main)]">
              Pharmacy Preparation Surface
            </h3>
            <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">
              Siapkan metadata resep, verifikasi provider, lalu susun item obat sebelum dikirim ke
              workflow ePuskesmas.
            </p>
          </div>

          <div className={`${insetClass} min-w-[112px] px-3 py-2 text-right`}>
            <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Ready Items
            </div>
            <div className="mt-1 text-[18px] font-semibold text-[var(--text-main)]">
              {readyMedicationCount}/{medications.length}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={insetClass}>
            <label className={labelClass} htmlFor="ruangan">
              Ruangan
            </label>
            <input
              id="ruangan"
              type="text"
              value={ruangan}
              onChange={(event) => setRuangan(event.target.value)}
              className="neu-input w-full rounded-lg px-3 py-2 text-small bg-transparent"
            />
          </div>

          <div className={insetClass}>
            <label className={labelClass} htmlFor="dokter">
              Dokter
            </label>
            <input
              id="dokter"
              type="text"
              value={dokter}
              onChange={(event) => setDokter(event.target.value)}
              className="neu-input w-full rounded-lg px-3 py-2 text-small bg-transparent"
            />
          </div>

          <div className={insetClass}>
            <label className={labelClass} htmlFor="perawat">
              Perawat
            </label>
            <input
              id="perawat"
              type="text"
              value={perawat}
              onChange={(event) => setPerawat(event.target.value)}
              className="neu-input w-full rounded-lg px-3 py-2 text-small bg-transparent"
            />
          </div>

          <div className={insetClass}>
            <label className={labelClass} htmlFor="alergi">
              Allergy Note
            </label>
            <textarea
              id="alergi"
              rows={2}
              value={alergi}
              onChange={(event) => setAlergi(event.target.value)}
              placeholder="Contoh: penicillin, NSAID, seafood"
              className="neu-input w-full resize-none rounded-lg px-3 py-2 text-small bg-transparent"
            />
          </div>
        </div>
      </section>

      <section className={surfaceClass}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-caption">Medication Matrix</div>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Lengkapi item wajib dulu, lalu tambah baris bila perlu racikan atau obat tambahan.
            </p>
          </div>

          <button
            type="button"
            onClick={addMedication}
            className="engine-btn min-w-[120px] px-3 py-2 text-[10px]"
          >
            + Add Medication
          </button>
        </div>

        <div className="space-y-3">
          {medications.map((medication, index) => (
            <article key={medication.id} className={`${insetClass} space-y-3`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Obat #{index + 1}
                  </div>
                  <div className="mt-1 text-[12px] font-medium text-[var(--text-main)]">
                    {medication.nama_obat.trim() || 'Item belum diisi'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeMedication(medication.id)}
                  disabled={medications.length === 1}
                  className="engine-btn px-3 py-2 text-[10px] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Hapus obat ${index + 1}`}
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor={`nama-obat-${medication.id}`}>
                    Nama Obat
                  </label>
                  <input
                    id={`nama-obat-${medication.id}`}
                    type="text"
                    value={medication.nama_obat}
                    onChange={(event) =>
                      updateMedication(medication.id, 'nama_obat', event.target.value)
                    }
                    placeholder="Mis. Amoksisilin 500 mg"
                    className="neu-input w-full rounded-lg px-3 py-2 text-small bg-transparent"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor={`keterangan-${medication.id}`}>
                    Keterangan
                  </label>
                  <input
                    id={`keterangan-${medication.id}`}
                    type="text"
                    value={medication.keterangan}
                    onChange={(event) =>
                      updateMedication(medication.id, 'keterangan', event.target.value)
                    }
                    placeholder="Catatan tambahan"
                    className="neu-input w-full rounded-lg px-3 py-2 text-small bg-transparent"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor={`jumlah-${medication.id}`}>
                    Jumlah
                  </label>
                  <input
                    id={`jumlah-${medication.id}`}
                    type="number"
                    min={1}
                    value={medication.jumlah || ''}
                    onChange={(event) =>
                      updateMedication(
                        medication.id,
                        'jumlah',
                        Number.parseInt(event.target.value, 10) || 0
                      )
                    }
                    className="neu-input w-full rounded-lg px-3 py-2 text-small bg-transparent"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor={`permintaan-${medication.id}`}>
                    Permintaan
                  </label>
                  <input
                    id={`permintaan-${medication.id}`}
                    type="number"
                    min={0}
                    value={medication.jumlah_permintaan || ''}
                    onChange={(event) =>
                      updateMedication(
                        medication.id,
                        'jumlah_permintaan',
                        Number.parseInt(event.target.value, 10) || 0
                      )
                    }
                    className="neu-input w-full rounded-lg px-3 py-2 text-small bg-transparent"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor={`signa-${medication.id}`}>
                    Signa
                  </label>
                  <input
                    id={`signa-${medication.id}`}
                    type="text"
                    value={medication.signa}
                    onChange={(event) =>
                      updateMedication(medication.id, 'signa', event.target.value)
                    }
                    placeholder="Contoh: 3x1"
                    className="neu-input w-full rounded-lg px-3 py-2 text-small bg-transparent"
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor={`aturan-${medication.id}`}>
                    Aturan Pakai
                  </label>
                  <select
                    id={`aturan-${medication.id}`}
                    value={medication.aturan_pakai}
                    onChange={(event) =>
                      updateMedication(medication.id, 'aturan_pakai', event.target.value)
                    }
                    className="neu-input w-full rounded-lg px-3 py-2 text-small bg-[var(--neu-inset-bg)]"
                  >
                    {Object.entries(ATURAN_PAKAI_OPTIONS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={surfaceClass}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-caption">Dispatch Priority</div>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Tandai resep cito bila butuh proses cepat di farmasi.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPrioritas('0')}
              className={`engine-btn px-4 py-2 text-[10px] ${prioritas === '0' ? 'active' : ''}`}
              aria-pressed={prioritas === '0'}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setPrioritas('1')}
              className={`engine-btn px-4 py-2 text-[10px] ${
                prioritas === '1'
                  ? 'border-[rgba(239,68,68,0.35)] text-[#ef4444] shadow-[0_0_12px_rgba(239,68,68,0.12)]'
                  : ''
              }`}
              aria-pressed={prioritas === '1'}
            >
              CITO
            </button>
          </div>
        </div>

        <div className={`${insetClass} flex items-center justify-between gap-3`}>
          <div className="text-[11px] leading-5 text-[var(--text-muted)]">
            Status siap kirim:
            <span className="ml-2 font-semibold text-[var(--text-main)]">
              {readyMedicationCount > 0 ? 'Ada item siap diproses' : 'Lengkapi minimal satu obat'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void handleFill()}
            disabled={status.loading || medications.every((item) => !item.nama_obat.trim())}
            className="shell-primary-button min-w-[164px]"
          >
            {status.loading ? 'Filling...' : 'Fill Prescription'}
          </button>
        </div>
      </section>

      {status.result ? (
        <section className={surfaceClass}>
          <div className="text-caption">Fill Result</div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className={insetClass}>
              <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Success
              </div>
              <div className="mt-1 text-[18px] font-semibold text-[var(--text-main)]">
                {status.result.success.length}
              </div>
            </div>
            <div className={insetClass}>
              <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Failed
              </div>
              <div className="mt-1 text-[18px] font-semibold text-[#ef4444]">
                {status.result.failed.length}
              </div>
            </div>
            <div className={insetClass}>
              <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Skipped
              </div>
              <div className="mt-1 text-[18px] font-semibold text-[#f59e0b]">
                {status.result.skipped.length}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {status.error ? (
        <section className="rounded-[12px] border border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-[11px] leading-5 text-[#ef4444]">
          {status.error}
        </section>
      ) : null}
    </div>
  );
}
