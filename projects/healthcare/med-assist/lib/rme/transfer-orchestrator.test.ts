// Designed and constructed by Drferdi.
import { describe, expect, it, vi } from 'vitest';
import { RMETransferOrchestrator } from '@/lib/rme/transfer-orchestrator';
import type { RMETransferPayload } from '@/utils/types';

function samplePayload(overrides?: Partial<RMETransferPayload>): RMETransferPayload {
  return {
    anamnesa: {
      keluhan_utama: 'Demam',
      keluhan_tambahan: 'Batuk',
      lama_sakit: { thn: 0, bln: 0, hr: 2 },
      alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
      is_pregnant: false,
    },
    diagnosa: {
      icd_x: 'J06.9',
      nama: 'ISPA',
      jenis: 'PRIMER',
      kasus: 'BARU',
      prognosa: '',
      penyakit_kronis: [],
    },
    resep: {
      static: { no_resep: 'AUTO-1', alergi: '' },
      ajax: { ruangan: 'POLI UMUM', dokter: 'dr. Test', perawat: 'Ns. Test' },
      medications: [
        {
          racikan: '0',
          jumlah_permintaan: 6,
          nama_obat: 'Paracetamol 500mg',
          jumlah: 6,
          signa: '3x1',
          aturan_pakai: '2',
          keterangan: '',
        },
      ],
      prioritas: '0',
    },
    ...overrides,
  };
}

describe('RMETransferOrchestrator', () => {
  it('accepts wrapped tab responses (res envelope) from messaging bridge', async () => {
    const orchestrator = new RMETransferOrchestrator();
    const exec = vi.fn(async () => ({
      res: {
        success: [{ field: 'ok', value: 'ok', method: 'direct' }],
        failed: [],
        skipped: [],
      },
    }));

    const result = await orchestrator.run(samplePayload(), exec);

    expect(result.state).toBe('success');
    expect(result.steps.anamnesa.state).toBe('success');
    expect(result.steps.diagnosa.state).toBe('success');
    expect(result.steps.resep.state).toBe('success');
  });

  it('keeps legacy error message from handler instead of generic no-fields fallback', async () => {
    const orchestrator = new RMETransferOrchestrator();
    const exec = vi.fn(async (step: string) => {
      if (step === 'anamnesa') {
        return { success: false, error: 'Field diagnosa tidak ditemukan' };
      }
      return {
        success: [{ field: 'ok', value: 'ok', method: 'direct' }],
        failed: [],
        skipped: [],
      };
    });

    const result = await orchestrator.run(samplePayload(), exec);

    expect(result.steps.anamnesa.state).toBe('failed');
    expect(result.steps.anamnesa.message).toContain('Field diagnosa tidak ditemukan');
    expect(result.reasonCodes).toContain('FIELD_NOT_FOUND');
  });

  it('marks step-level partial failure and keeps per-step visibility', async () => {
    const orchestrator = new RMETransferOrchestrator();
    const exec = vi.fn(async (step: string) => {
      if (step === 'anamnesa') {
        return {
          success: [{ field: 'keluhan_utama', value: 'Demam', method: 'direct' }],
          failed: [{ field: 'keluhan_tambahan', error: 'Element not found' }],
          skipped: [],
        };
      }
      return {
        success: [{ field: 'ok', value: 'ok', method: 'direct' }],
        failed: [],
        skipped: [],
      };
    });

    const result = await orchestrator.run(samplePayload(), exec);

    expect(result.state).toBe('partial');
    expect(result.steps.anamnesa.state).toBe('partial');
    expect(result.steps.anamnesa.failedCount).toBeGreaterThan(0);
    expect(result.reasonCodes).toContain('FIELD_NOT_FOUND');
  });

  it('downgrades readonly-only field errors into skipped step classification', async () => {
    const orchestrator = new RMETransferOrchestrator();
    const exec = vi.fn(async (step: string) => {
      if (step === 'diagnosa') {
        return {
          success: [],
          failed: [{ field: 'diagnosa_id', error: 'Field is readonly' }],
          skipped: [],
        };
      }
      return {
        success: [{ field: 'ok', value: 'ok', method: 'direct' }],
        failed: [],
        skipped: [],
      };
    });

    const result = await orchestrator.run(samplePayload(), exec);

    expect(result.state).toBe('partial');
    expect(result.steps.diagnosa.state).toBe('skipped');
    expect(result.steps.diagnosa.failedCount).toBe(0);
    expect(result.steps.diagnosa.skippedCount).toBeGreaterThan(0);
    expect(result.reasonCodes).toContain('NO_FIELDS_FILLED');
    expect(result.reasonCodes).not.toContain('UNKNOWN_STEP_FAILURE');
  });

  it('handles readonly failures when failed items are returned as plain strings', async () => {
    const orchestrator = new RMETransferOrchestrator();
    const exec = vi.fn(async (step: string) => {
      if (step === 'diagnosa') {
        return {
          success: [],
          failed: ['Field is readonly'],
          skipped: [],
        };
      }
      return {
        success: [{ field: 'ok', value: 'ok', method: 'direct' }],
        failed: [],
        skipped: [],
      };
    });

    const result = await orchestrator.run(samplePayload(), exec);

    expect(result.state).toBe('partial');
    expect(result.steps.diagnosa.state).toBe('skipped');
    expect(result.steps.diagnosa.failedCount).toBe(0);
    expect(result.steps.diagnosa.skippedCount).toBe(1);
    expect(result.reasonCodes).toContain('NO_FIELDS_FILLED');
    expect(result.reasonCodes).not.toContain('UNKNOWN_STEP_FAILURE');
  });

  it('prevents duplicate transfer in short window unless forceRun is explicit', async () => {
    const orchestrator = new RMETransferOrchestrator();
    const exec = vi.fn(async () => ({
      success: [{ field: 'ok', value: 'ok', method: 'direct' }],
      failed: [],
      skipped: [],
    }));

    const now = (() => {
      let t = 1000;
      return () => {
        t += 10;
        return t;
      };
    })();

    const first = await orchestrator.run(samplePayload(), exec, { now });
    const duplicate = await orchestrator.run(samplePayload(), exec, { now });
    const forced = await orchestrator.run(
      samplePayload({
        options: { requestId: 'force-1', forceRun: true },
      }),
      exec,
      { now }
    );

    expect(first.state).toBe('success');
    expect(duplicate.state).toBe('failed');
    expect(duplicate.reasonCodes).toContain('DUPLICATE_SUPPRESSED');
    expect(forced.state).toBe('success');
    expect(exec).toHaveBeenCalledTimes(6);
  });

  it('runs only requested step in strict single-step mode', async () => {
    const orchestrator = new RMETransferOrchestrator();
    const executedSteps: string[] = [];
    const exec = vi.fn(async (step: string) => {
      executedSteps.push(step);
      return {
        success: [{ field: 'ok', value: 'ok', method: 'direct' }],
        failed: [],
        skipped: [],
      };
    });

    const result = await orchestrator.run(
      samplePayload({
        options: {
          requestId: 'strict-dx',
          startFromStep: 'diagnosa',
          onlyStep: 'diagnosa',
        },
      }),
      exec
    );

    expect(result.state).toBe('success');
    expect(executedSteps).toEqual(['diagnosa']);
    expect(result.steps.anamnesa.state).toBe('pending');
    expect(result.steps.diagnosa.state).toBe('success');
    expect(result.steps.resep.state).toBe('pending');
  });

  it('does not dedupe different start steps within the same payload window', async () => {
    const orchestrator = new RMETransferOrchestrator();
    const exec = vi.fn(async () => ({
      success: [{ field: 'ok', value: 'ok', method: 'direct' }],
      failed: [],
      skipped: [],
    }));

    const now = (() => {
      let t = 5000;
      return () => {
        t += 5;
        return t;
      };
    })();

    const anamnesaRun = await orchestrator.run(
      samplePayload({
        options: { requestId: 'strict-ax', startFromStep: 'anamnesa', onlyStep: 'anamnesa' },
      }),
      exec,
      { now }
    );
    const diagnosaRun = await orchestrator.run(
      samplePayload({
        options: { requestId: 'strict-dx', startFromStep: 'diagnosa', onlyStep: 'diagnosa' },
      }),
      exec,
      { now }
    );

    expect(anamnesaRun.state).toBe('success');
    expect(diagnosaRun.state).toBe('success');
    expect(diagnosaRun.reasonCodes).not.toContain('DUPLICATE_SUPPRESSED');
    expect(exec).toHaveBeenCalledTimes(2);
  });
});
