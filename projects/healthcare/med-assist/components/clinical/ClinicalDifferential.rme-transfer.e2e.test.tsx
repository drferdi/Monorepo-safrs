import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SIDE_PANEL_TATALAKSANA_TRANSFER } from '../../tests/e2e/side-panel-tatalaksana-transfer';

import { ClinicalDifferential } from './ClinicalDifferential';
import { resetDiseaseNotesCache } from './diagnosis/useDiseaseNotes';

import { PERAWAT_NAMA } from '@/lib/clinical/tenaga-medis';
import { syntheticVisit } from '@/lib/report/visit-summary.fixtures';

/**
 * Acceptance regression for Temuan #1 (audit E2E): the live Diagnosis surface
 * must let a physician send diagnosis + resep to RME. Drives the REAL
 * ClinicalDifferential -> DiagnosisStepFlow subtree from suggestion data
 * through diagnosis selection, therapy load, medication selection, to the RME
 * transfer buttons — proving the data path reaches "ready", not just that a
 * hand-built view model renders. (Follows LESSONS [2026-07-05]: drive the real
 * parent->child subtree, not the child in isolation.)
 */

const { mockSendMessage, storedVisits } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
  // The patient's stored visits (Tatalaksana's chronic cards); a test sets them, the rest have none.
  storedVisits: { visits: [] as unknown[] },
}));

// The signed-in Assist user (synthetic): a doctor, so the PDF's DPJP is this name.
vi.mock('@/lib/api/auth-store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/auth-store')>()),
  getSession: vi.fn(async () => ({
    user: {
      id: 'crew-1',
      username: 'login.sintetis',
      name: 'dr. Login Sintetis',
      role: 'doctor',
      facilityId: 'f-1',
      facilityName: 'Puskesmas Sintetis',
      poli: 'Dokter',
    },
    tokens: { accessToken: 'token-sintetis', refreshToken: 'refresh-sintetis', expiresAt: 0 },
    serverBaseUrl: 'http://127.0.0.1:0',
  })),
}));

const { downloadMock } = vi.hoisted(() => ({ downloadMock: vi.fn(async (_model: unknown) => undefined) }));
vi.mock('@/lib/report/download-visit-summary', () => ({ downloadVisitSummaryPdf: downloadMock }));

vi.mock('@/lib/iskandar-diagnosis-engine/visit-history-store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/iskandar-diagnosis-engine/visit-history-store')>()),
  getPatientVisits: vi.fn(async () => storedVisits.visits),
}));

vi.mock('@/utils/messaging', () => ({
  sendMessage: mockSendMessage,
}));

vi.mock('@/lib/api/bridge-client', () => ({
  evaluateCanonicalDifferential: vi.fn().mockRejectedValue(new Error('canonical unavailable')),
}));

vi.mock('@/lib/iskandar-diagnosis-engine/diagnosis-algorithm', () => ({
  runDiagnosisAlgorithm: vi.fn(
    (input: {
      suggestions: Array<{
        icd_x: string;
        nama: string;
        confidence: number;
        rationale?: string;
        red_flags?: string[];
        recommended_actions?: string[];
        rank?: number;
      }>;
    }) =>
      input.suggestions.slice(0, 1).map((suggestion, index) => ({
        rank: index + 1,
        suggestion,
        diagnosisScore: 82,
        adjustedConfidence: suggestion.confidence,
        confidenceBand: 'high',
        scoreBreakdown: {
          baseConfidence: 82,
          symptomFit: 70,
          vitalFit: 75,
          safetyPriority: 40,
          trajectoryFit: 50,
          confirmedChronicFit: 0,
          chronicPriorityBonus: 0,
          clinicalMismatchPenalty: 0,
        },
        insight: {
          matchedSymptoms: ['nyeri tenggorokan'],
          vitalDrivers: ['suhu 38.0'],
          supportingExamPlan: {
            needLevel: 'recommended',
            summary: 'Evaluasi faring',
            tests: ['Pemeriksaan tenggorokan'],
          },
        },
      }))
  ),
}));

vi.mock('@/lib/iskandar-diagnosis-engine/symptom-matcher', () => ({
  searchPenyakitByName: vi.fn(() => Promise.resolve([])),
  getPenyakitByIcd: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/components/ui/AssistShell', () => ({
  AssistShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="assist-shell-wrapper">{children}</div>
  ),
}));

vi.mock('./ClinicalImpressionPanel', () => ({
  ClinicalImpressionPanel: () => <div data-testid="clinical-impression-panel" />,
}));

const MEDICATION = {
  nama_obat: 'Amoksisilin 500mg',
  dosis: '3x1',
  aturan_pakai: 'sesudah makan',
  durasi: '5 hari',
  rationale: 'Antibiotik lini pertama faringitis bakterial',
  safety_check: 'safe',
  contraindications: [],
};

function primeMessaging() {
  mockSendMessage.mockReset();
  mockSendMessage.mockImplementation((type: string) => {
    if (type === 'getSuggestions') {
      return Promise.resolve({
        success: true,
        data: {
          diagnosis_suggestions: [
            {
              rank: 1,
              icd_x: 'J02',
              nama: 'Faringitis akut',
              confidence: 0.82,
              rationale: 'Fixture diagnosis',
              red_flags: [],
              recommended_actions: [],
            },
          ],
          medication_recommendations: [],
          alerts: [],
          meta: {
            processing_time_ms: 1,
            model_version: 'test',
            timestamp: '2026-07-05T00:00:00.000Z',
          },
        },
      });
    }
    if (type === 'getRecommendations') {
      return Promise.resolve({
        success: true,
        data: {
          diagnosis_suggestions: [],
          medication_recommendations: [MEDICATION],
          alerts: [],
          clinical_guidelines: [],
          meta: {
            processing_time_ms: 1,
            model_version: 'test',
            timestamp: '2026-07-05T00:00:00.000Z',
          },
        },
      });
    }
    if (type === 'transferRME') {
      const step = (name: string) => ({
        step: name,
        state: 'success',
        attempt: 1,
        latencyMs: 4,
        successCount: 1,
        failedCount: 0,
        skippedCount: 0,
      });
      return Promise.resolve({
        state: 'success',
        runId: 'run-test',
        totalLatencyMs: 12,
        reasonCodes: [],
        steps: { anamnesa: step('anamnesa'), diagnosa: step('diagnosa'), resep: step('resep') },
      });
    }
    return Promise.resolve({ success: true });
  });
}

function renderSurface(chronicTherapies: string[] = []) {
  return render(
    <ClinicalDifferential
      keluhanUtama="Nyeri tenggorokan dan demam"
      patientAge={28}
      patientGender="L"
      patientRM="RM-J02"
      allergies={[]}
      confirmedPregnancyStatus={false}
      vitals={{ sbp: 118, dbp: 76, hr: 88, rr: 18, temp: 38, glucose: 0 }}
      chronicTherapies={chronicTherapies}
      hasVisitHistory={false}
      onBack={() => undefined}
    />
  );
}

describe('ClinicalDifferential live RME transfer (Diagnosis surface)', () => {
  it('saves the visit on screen as the PDF summary, without the history’s clinicians', async () => {
    render(
      <ClinicalDifferential
        keluhanUtama="Nyeri tenggorokan dan demam"
        patientAge={28}
        patientGender="L"
        patientRM="RM-J02"
        allergies={[]}
        confirmedPregnancyStatus={false}
        vitals={{ sbp: 118, dbp: 76, hr: 88, rr: 18, temp: 38, glucose: 0 }}
        hasVisitHistory
        visitSummaryContext={{
          facilityName: 'Puskesmas Sintetis',
          triage: { zone: 'hijau', headline: null },
          spo2: 98,
          visitHistory: [
            {
              ...syntheticVisit('2026-09-01', { sbp: 120, dbp: 80, hr: 84, rr: 18, temp: 37, glucose: 0 }),
              patient_id: 'RM-J02',
            },
          ],
        }}
        onBack={() => undefined}
      />
    );
    const closestOrThrow = (element: HTMLElement, selector: string): Element => {
      const found = element.closest(selector);
      if (!found) throw new Error(`${selector} not found`);
      return found;
    };

    fireEvent.click(closestOrThrow(await screen.findByText('J02 - Faringitis akut'), '[data-testid="dx-flow-card"]'));
    fireEvent.click(await screen.findByRole('button', { name: 'Isi diagnosis ke RME' }));
    await screen.findByRole('heading', { name: 'Tatalaksana' });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut tanpa terapi tambahan' }));
    fireEvent.click(screen.getByTestId('dx-tx-finish'));
    fireEvent.click(await screen.findByRole('button', { name: 'ubah Tatalaksana' }));
    fireEvent.click(closestOrThrow(await screen.findByText('Amoksisilin'), '[data-testid="dx-tx-visit-med"]'));
    await waitFor(() => expect(screen.getByTestId('dx-tx-finish')).toBeEnabled());
    fireEvent.click(screen.getByTestId('dx-tx-finish'));

    fireEvent.click(await screen.findByRole('button', { name: 'Unduh PDF' }));

    await waitFor(() => expect(downloadMock).toHaveBeenCalledTimes(1));
    const model = downloadMock.mock.calls[0][0];
    expect(model).toEqual(
      expect.objectContaining({
        head: expect.objectContaining({ rm: 'RM-J02', facility: 'Puskesmas Sintetis' }),
        diagnoses: [expect.objectContaining({ icd: 'J02', role: 'PRIMER' })],
        medications: [{ name: 'Amoksisilin', dose: '3x500mg', use: 'sesudah makan', duration: '5 hari' }],
        trend: expect.objectContaining({ dates: [expect.any(String), expect.any(String)] }),
        followUp: 'Kontrol 3 hari',
        education: [],
        signers: { dpjp: 'dr. Login Sintetis', verifier: PERAWAT_NAMA },
      })
    );
    expect(JSON.stringify(model)).not.toContain('Rahasia');
  });

  beforeEach(() => {
    primeMessaging();
    resetDiseaseNotesCache();
    storedVisits.visits = [];
  });

  it('lets the physician select a diagnosis, pick a medication, and uplink diagnosis + resep to RME', async () => {
    renderSurface();

    // Select the working diagnosis.
    const selectPrimary = (await screen.findByText('J02 - Faringitis akut')).closest(
      '[data-testid="dx-flow-card"]'
    );
    expect(selectPrimary).not.toBeNull();
    if (!selectPrimary) throw new Error('diagnosis card not found');
    fireEvent.click(selectPrimary);

    // Migrated (Chief, 2026-09-29: ePuskesmas has the Diagnosa page apart from the therapy): the
    // diagnosis goes to the RME on its own step right after the pick. "Kirim diagnosis" (on the
    // RME step, clicked last) became "Isi diagnosis ke RME" here, clicked first; its success
    // moves the flow on to Tatalaksana.
    const isiDiagnosis = await screen.findByRole('button', { name: 'Isi diagnosis ke RME' });
    expect(isiDiagnosis).toBeEnabled();
    fireEvent.click(isiDiagnosis);
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        'transferRME',
        expect.objectContaining({
          options: expect.objectContaining({ onlyStep: 'diagnosa' }),
        })
      );
    });

    // Choosing a diagnosis must move the flow on to Tatalaksana (was Terapi, 2026-09-29),
    // rendered in full, not just leave it as a one-line ghost.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Tatalaksana' })).toBeInTheDocument();
      expect(screen.queryByTestId('dx-flow-ghost-therapy')).toBeNull();
    });

    // Therapy for the selected diagnosis must render on the live surface.
    const findMedicationRow = async () => {
      // Migrated (2026-09-29): the strength moved from the title into Chief's dose notation, so
      // "Amoksisilin 500mg" reads as the title "Amoksisilin" over the dose "3x500mg".
      const row = (await screen.findByText('Amoksisilin')).closest('[data-testid="dx-tx-visit-med"]');
      expect(row).not.toBeNull();
      if (!row) throw new Error('medication row not found');
      expect(row).toHaveTextContent('3x500mg');
      return row;
    };
    expect(await findMedicationRow()).toBeInTheDocument();

    // A diagnosis-only transfer stays reachable: continue without additional therapy, then
    // "Selesai", to RME (migrated 2026-09-29 from "Lanjut tanpa obat" and Edukasi's "Lanjut").
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut tanpa terapi tambahan' }));
    fireEvent.click(screen.getByTestId('dx-tx-finish'));

    // "Isi resep ke RME" (was "Kirim resep") is gated until at least one medication is selected.
    const isiResep = await screen.findByRole('button', { name: 'Isi resep ke RME' });
    expect(isiResep).toBeDisabled();
    // The diagnosa fill that just succeeded belongs to RME Diagnosa, not to this page's resep.
    expect(isiResep).toHaveAttribute('data-state', 'idle');

    // Select the proposed medication.
    fireEvent.click(screen.getByRole('button', { name: 'ubah Tatalaksana' }));
    fireEvent.click(await findMedicationRow());
    await waitFor(() => expect(screen.getByTestId('dx-tx-finish')).toBeEnabled());
    fireEvent.click(screen.getByTestId('dx-tx-finish'));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Isi resep ke RME' })).toBeEnabled());

    // Uplink resep dispatches an RME transfer for the resep step.
    fireEvent.click(screen.getByRole('button', { name: 'Isi resep ke RME' }));

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        'transferRME',
        expect.objectContaining({
          options: expect.objectContaining({ onlyStep: 'resep' }),
        })
      );
    });
  });

  // Migrated (2026-09-29): education is a part of Tatalaksana (every point is a card of the
  // deck: a swipe brings the next one, the tick on a card gives it), the Kontrol row left the education list for Tindak lanjut, and the
  // follow-up now reaches the anamnesis as rencana_tindakan: since Chief's "cukup kontrol 3 hari atau sejenisnya" it is the
  // interval chosen under Tindak lanjut ("Kontrol 1 minggu" here), no longer the knowledge-base paragraph.
  it('carries the education ticked for the chosen diagnosis into the RME anamnesis, and only that', async () => {
    const given = 'Istirahat cukup, jangan bekerja/sekolah dulu hingga 24 jam bebas demam.';
    const notGiven = 'Minum air putih minimal 2 liter/hari.';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            penyakit: [
              {
                icd10: 'J02',
                definisi: 'Faringitis.',
                advanced_guideline: {
                  kie_edukasi: { untuk_pasien: [notGiven, given] },
                  tindak_lanjut: { kontrol: 'Kontrol jika tidak membaik dalam 7-10 hari.' },
                },
              },
            ],
          })
        )
      )
    );
    try {
      renderSurface();
      const card = (await screen.findByText('J02 - Faringitis akut')).closest('[data-testid="dx-flow-card"]');
      if (!card) throw new Error('diagnosis card not found');
      fireEvent.click(card);

      // Migrated (Chief, 2026-09-29): RME Diagnosa sits between the pick and Tatalaksana.
      fireEvent.click(await screen.findByRole('button', { name: 'Lanjut tanpa mengisi' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Lanjut tanpa terapi tambahan' }));
      const education = await screen.findByTestId('dx-tx-education');
      const cards = await within(education).findAllByTestId('dx-edu-card');
      expect(cards.map((card) => card.querySelector('p')?.textContent)).toEqual([notGiven, given]);
      expect(cards[0]).toHaveAttribute('data-top', 'true');
      fireEvent.click(within(education).getByRole('button', { name: 'Geser ke kiri' }));
      await waitFor(() =>
        expect(within(education).getAllByTestId('dx-edu-card').find((card) => card.getAttribute('data-top') === 'true')).toHaveTextContent(given)
      );
      fireEvent.click(within(education).getByRole('button', { name: 'Berikan edukasi ini' }));
      await waitFor(() =>
        expect(within(education).getByRole('button', { name: 'Batalkan edukasi ini' })).toHaveAttribute('aria-pressed', 'true')
      );
      const interval = within(screen.getByTestId('dx-tx-follow-up')).getByRole('combobox', { name: 'Kontrol' });
      expect(interval).toHaveValue('3 hari');
      fireEvent.change(interval, { target: { value: '1 minggu' } });

      fireEvent.click(screen.getByTestId('dx-tx-finish'));
      // Migrated: "Anamnesis" in Rincian transfer became "Isi anamnesa ke RME" on RME Terapi.
      fireEvent.click(await screen.findByRole('button', { name: 'Isi anamnesa ke RME' }));

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith(
          'transferRME',
          expect.objectContaining({
            anamnesa: expect.objectContaining({
              lainnya: expect.objectContaining({
                edukasi: given,
                rencana_tindakan: 'Kontrol 1 minggu',
              }),
            }),
          })
        );
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // End-to-end check (2026-09-29): one visit carries the diagnosis, the chosen medicine, the given
  // education and the chosen interval. Migrated (Chief, the same day: ePuskesmas has the Diagnosa
  // page apart from the therapy): "Isi otomatis RME" (one run for all three) became three fills in
  // page order - "Isi diagnosis ke RME" on RME Diagnosa, then "Isi resep ke RME" and "Isi anamnesa
  // ke RME" on RME Terapi - and each call is asserted for its own step.
  it('sends the whole visit page by page: the diagnosis on RME Diagnosa, then the resep and the anamnesa with education and "Kontrol 2 minggu"', async () => {
    const given = 'Istirahat cukup, jangan bekerja/sekolah dulu hingga 24 jam bebas demam.';
    const notGiven = 'Minum air putih minimal 2 liter/hari.';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            penyakit: [
              {
                icd10: 'J02',
                definisi: 'Faringitis.',
                red_flags: ['Sesak napas'],
                advanced_guideline: { kie_edukasi: { untuk_pasien: [notGiven, given] } },
              },
            ],
          })
        )
      )
    );
    try {
      renderSurface();
      const card = (await screen.findByText('J02 - Faringitis akut')).closest('[data-testid="dx-flow-card"]');
      if (!card) throw new Error('diagnosis card not found');
      fireEvent.click(card);
      fireEvent.click(await screen.findByRole('button', { name: 'Isi diagnosis ke RME' }));

      const medication = (await screen.findByText('Amoksisilin')).closest('[data-testid="dx-tx-visit-med"]');
      if (!medication) throw new Error('medication row not found');
      fireEvent.click(medication);

      const education = await screen.findByTestId('dx-tx-education');
      await within(education).findAllByTestId('dx-edu-card');
      fireEvent.click(within(education).getByRole('button', { name: 'Geser ke kanan' }));
      await waitFor(() =>
        expect(within(education).getAllByTestId('dx-edu-card').find((c) => c.getAttribute('data-top') === 'true')).toHaveTextContent(given)
      );
      fireEvent.click(within(education).getByRole('button', { name: 'Berikan edukasi ini' }));
      fireEvent.change(within(screen.getByTestId('dx-tx-follow-up')).getByRole('combobox', { name: 'Kontrol' }), {
        target: { value: '2 minggu' },
      });
      expect(screen.getByTestId('dx-tx-safety-net')).toHaveTextContent('Sesak napas');
      expect(screen.getByTestId('dx-tx-summary')).toHaveTextContent('Edukasi1 poin');

      await waitFor(() => expect(screen.getByTestId('dx-tx-finish')).toBeEnabled());
      fireEvent.click(screen.getByTestId('dx-tx-finish'));
      fireEvent.click(await screen.findByRole('button', { name: 'Isi resep ke RME' }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Isi anamnesa ke RME' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Isi anamnesa ke RME' }));

      const sentFor = (step: string) =>
        mockSendMessage.mock.calls.find(([type, payload]) => type === 'transferRME' && payload?.options?.onlyStep === step)?.[1];
      await waitFor(() => expect(sentFor('anamnesa')).toBeDefined());
      expect(sentFor('diagnosa')).toMatchObject({ diagnosa: { icd_x: expect.stringMatching(/^J02/) } });
      expect(sentFor('resep')).toMatchObject({
        resep: { medications: expect.arrayContaining([expect.objectContaining({ nama_obat: expect.stringMatching(/amoksisilin/i) })]) },
      });
      expect(sentFor('anamnesa')).toMatchObject({
        anamnesa: { lainnya: { edukasi: given, rencana_tindakan: 'Kontrol 2 minggu' } },
      });
      // The synthetic ePuskesmas spec (tests/e2e) sends this same payload through the built extension.
      // Migrated: the payload of the last fill (was the one "Isi otomatis RME" run), which holds
      // every section once Tatalaksana is decided.
      expect(sentFor('anamnesa')).toMatchObject(SIDE_PANEL_TATALAKSANA_TRANSFER);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  // Chief, 2026-09-29: "di stage ini saya tidak bisa memilih obatnya" - a chronic card continues
  // the medication in this visit, and the continuation reaches the resep with its latest regimen.
  it('sends a continued chronic medication to the resep, and keeps it through "Lanjut tanpa terapi tambahan"', async () => {
    storedVisits.visits = [
      {
        patient_id: 'RM-J02',
        encounter_id: 'v1',
        timestamp: '2026-09-01T08:00:00Z',
        vitals: { sbp: 130, dbp: 80, hr: 80, rr: 18, temp: 36.8, glucose: 0 },
        keluhan_utama: 'kontrol',
        diagnosa: { icd_x: 'I10', nama: 'Hipertensi esensial' },
        terapi_obat: 'Amlodipin 1x10mg sesudah makan',
        source: 'scrape',
      },
    ];
    renderSurface(['Amlodipin']);
    const card = (await screen.findByText('J02 - Faringitis akut')).closest('[data-testid="dx-flow-card"]');
    if (!card) throw new Error('diagnosis card not found');
    fireEvent.click(card);
    fireEvent.click(await screen.findByRole('button', { name: 'Lanjut tanpa mengisi' }));

    const pick = await screen.findByTestId('dx-tx-chronic-pick');
    fireEvent.click(pick);
    await waitFor(() => expect(pick).toHaveAttribute('aria-pressed', 'true'));
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut tanpa terapi tambahan' }));
    expect(screen.getByTestId('dx-tx-chronic-pick')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('dx-tx-finish'));
    const isiResep = await screen.findByRole('button', { name: 'Isi resep ke RME' });
    await waitFor(() => expect(isiResep).toBeEnabled());
    fireEvent.click(isiResep);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        'transferRME',
        expect.objectContaining({
          options: expect.objectContaining({ onlyStep: 'resep' }),
          resep: expect.objectContaining({
            // The RME mapper names it by the Puskesmas stock; one tablet a day.
            medications: [expect.objectContaining({ nama_obat: 'Amlodipin tablet 10 mg', signa: '1x1' })],
          }),
        })
      );
    });
  });

  // Chief, 2026-10-02: a medication out of stock showed as "Step gagal tanpa klasifikasi spesifik".
  // The page shows what the resep step said; a stock gap is a note without Ulangi (a second run
  // would add the medications already in the resep again).
  it.each([
    {
      reasonCode: 'RESEP_OBAT_TIDAK_TERSEDIA',
      message: 'Vitamin B6: Obat tidak ada di daftar stok ePuskesmas',
      retry: false,
    },
    { reasonCode: 'UNKNOWN_STEP_FAILURE', message: 'Signa 3x1 gagal dipilih', retry: true },
  ])('shows what the resep step said for $reasonCode', async ({ reasonCode, message, retry }) => {
    storedVisits.visits = [
      {
        patient_id: 'RM-J02',
        encounter_id: 'v1',
        timestamp: '2026-09-01T08:00:00Z',
        vitals: { sbp: 130, dbp: 80, hr: 80, rr: 18, temp: 36.8, glucose: 0 },
        keluhan_utama: 'kontrol',
        diagnosa: { icd_x: 'I10', nama: 'Hipertensi esensial' },
        terapi_obat: 'Amlodipin 1x10mg sesudah makan',
        source: 'scrape',
      },
    ];
    const answer = mockSendMessage.getMockImplementation();
    mockSendMessage.mockImplementation((type: string, data?: unknown) => {
      if (type !== 'transferRME') return answer?.(type, data);
      const step = (name: string) => ({
        step: name,
        state: 'pending',
        attempt: 0,
        latencyMs: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
      });
      return Promise.resolve({
        state: 'partial',
        runId: 'run-resep',
        totalLatencyMs: 20,
        // A payload code may come first; the page reads the resep step itself.
        reasonCodes: ['PREGNANCY_UNKNOWN_DEFAULT_FALSE', reasonCode],
        steps: {
          anamnesa: step('anamnesa'),
          diagnosa: step('diagnosa'),
          resep: {
            ...step('resep'),
            state: 'partial',
            attempt: 1,
            successCount: 3,
            failedCount: 1,
            reasonCode,
            message,
          },
        },
      });
    });
    renderSurface(['Amlodipin']);
    const card = (await screen.findByText('J02 - Faringitis akut')).closest('[data-testid="dx-flow-card"]');
    if (!card) throw new Error('diagnosis card not found');
    fireEvent.click(card);
    fireEvent.click(await screen.findByRole('button', { name: 'Lanjut tanpa mengisi' }));
    const pick = await screen.findByTestId('dx-tx-chronic-pick');
    fireEvent.click(pick);
    await waitFor(() => expect(pick).toHaveAttribute('aria-pressed', 'true'));
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut tanpa terapi tambahan' }));
    fireEvent.click(screen.getByTestId('dx-tx-finish'));
    const isiResep = await screen.findByRole('button', { name: 'Isi resep ke RME' });
    await waitFor(() => expect(isiResep).toBeEnabled());
    fireEvent.click(isiResep);

    // The note over Alasan, not only Rincian transfer, says it.
    await waitFor(() =>
      expect(
        document.querySelector('.diagnosis-readonly-field--warning, .diagnosis-readonly-field--danger')
      ).toHaveTextContent(message)
    );
    expect(document.body).not.toHaveTextContent(/tanpa klasifikasi/);
    expect(screen.queryAllByRole('button', { name: 'Ulangi' })).toHaveLength(retry ? 1 : 0);
  });
});
