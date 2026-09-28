import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClinicalDifferential } from './ClinicalDifferential';

import { MIRA_PREFETCH_READY_KEY } from '@/lib/diagnosis-engine/prefetch-store';
import {
  buildDiagnosisRequestContext,
  hashDiagnosisContext,
} from '@/lib/diagnosis-engine/request-context';
import { findForbiddenPhysicianTrajectoryTerms } from '@/lib/iskandar-diagnosis-engine/presentation-safety';
import { clearMatcherCache } from '@/lib/iskandar-diagnosis-engine/symptom-matcher';

const KB_PATH = path.resolve(__dirname, '../../public/data/penyakit.json');
const SIDE_PANEL_STYLE_PATH = path.resolve(__dirname, '../../entrypoints/sidepanel/style.css');
const kbData = JSON.parse(readFileSync(KB_PATH, 'utf-8')) as unknown;

const LONG_PRIMARY_RATIONALE =
  'Herpes zoster adalah infeksi kulit dan mukosa yang disebabkan oleh virus varisela-zoster. Infeksi ini perlu dikorelasikan dengan distribusi dermatom, nyeri neuropatik, dan kondisi imun pasien sebelum keputusan terapi dibuat.';

const { mockSendMessage } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
}));

const { mockEvaluateCanonicalDifferential } = vi.hoisted(() => ({
  mockEvaluateCanonicalDifferential: vi.fn(),
}));

vi.mock('@/utils/messaging', () => ({
  sendMessage: mockSendMessage,
}));

vi.mock('@/lib/api/bridge-client', () => ({
  evaluateCanonicalDifferential: mockEvaluateCanonicalDifferential,
}));

// The page waits for the visit-store read before its request; these tests have no visit
// record, so the store has answered "no history". One object, so the page's memos stay stable.
vi.mock('./diagnosis/useRecurrentDiagnoses', () => {
  const noHistory = { candidates: [], loaded: true };
  return { useRecurrentDiagnoses: () => noHistory };
});

vi.mock('@/components/ui/AssistShell', () => ({
  AssistShell: ({ children }: { children: React.ReactNode }) => (
    <div className="assist-shell" data-testid="assist-shell-wrapper">
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/ConsoleFrame', () => ({
  ConsoleFrame: ({ children, ariaLabel }: { children: React.ReactNode; ariaLabel?: string }) => (
    <section className="console-frame" data-testid="console-frame-wrapper" aria-label={ariaLabel}>
      {children}
    </section>
  ),
}));

vi.mock('./CTHeader', () => ({
  CTHeader: ({
    title,
    subtitle,
    meta,
    onBack,
    children,
  }: {
    title: string;
    subtitle: string;
    meta?: string;
    onBack?: () => void;
    children?: React.ReactNode;
  }) => (
    <header>
      {onBack ? (
        <button type="button" aria-label="Back" onClick={onBack}>
          Back
        </button>
      ) : null}
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {meta ? <span>{meta}</span> : null}
      {children}
    </header>
  ),
}));

vi.mock('./ClinicalScreenTabs', () => ({
  ClinicalScreenTabs: () => <div data-testid="clinical-screen-tabs" />,
}));

beforeEach(() => {
  clearMatcherCache();
  vi.stubGlobal('fetch', async (url: string | URL | Request) => {
    if (String(url).includes('penyakit.json')) {
      return { ok: true, json: async () => kbData } as Response;
    }
    throw new Error(`Unexpected fetch: ${String(url)}`);
  });

  mockEvaluateCanonicalDifferential.mockResolvedValue({
    diagnosis_suggestions: [],
    alerts: [],
    meta: {
      processing_time_ms: 145,
    },
  });

  mockSendMessage.mockImplementation(async (type: string, payload?: Record<string, unknown>) => {
    if (type === 'resolveTenagaMedis') {
      return {
        success: true,
        tenagaMedis: {
          dokterNama: 'dr. Sentra',
          perawatNama: 'Ns. Assist',
          source: ['test'],
          capturedAt: '2026-06-24T08:00:00.000Z',
        },
      };
    }

    if (type === 'getSuggestions') {
      return {
        success: true,
        data: {
          diagnosis_suggestions: [
            {
              rank: 1,
              icd_x: 'J18.9',
              nama: 'Community Acquired Pneumonia',
              confidence: 0.81,
              rationale: LONG_PRIMARY_RATIONALE,
              red_flags: ['Hipoksemia perlu dinilai bila sesak memberat.'],
              recommended_actions: [
                'DL / CBC bila tersedia',
                'Foto toraks bila tersedia',
                'Pantau saturasi oksigen',
              ],
            },
            {
              rank: 2,
              icd_x: 'J06.9',
              nama: 'Infeksi Saluran Napas Atas',
              confidence: 0.52,
              rationale: 'Keluhan respirasi akut masih mungkin pada fase awal.',
              red_flags: [],
              recommended_actions: ['Pemeriksaan faring dan auskultasi ulang'],
            },
            {
              rank: 3,
              icd_x: 'A41.9',
              nama: 'Sepsis Concern',
              confidence: 0.33,
              rationale: 'Demam tinggi dan takikardia menuntut kewaspadaan.',
              red_flags: ['Instabilitas klinis harus segera dievaluasi.'],
              recommended_actions: ['Nilai perfusi dan tanda organ dysfunction'],
            },
            {
              rank: 4,
              icd_x: 'J45.9',
              nama: 'Eksaserbasi Asma',
              confidence: 0.29,
              rationale: 'Sesak dan takipnea masih dapat konsisten dengan obstruksi jalan napas.',
              red_flags: [],
              recommended_actions: ['Nebulasi bila ada wheezing', 'Peak flow bila tersedia'],
            },
            {
              rank: 5,
              icd_x: 'U07.1',
              nama: 'Infeksi Virus Respiratorik',
              confidence: 0.24,
              rationale: 'Demam dan batuk akut masih mungkin pada infeksi virus respiratorik.',
              red_flags: [],
              recommended_actions: ['Antigen test bila tersedia'],
            },
          ],
          meta: {
            processing_time_ms: 842,
          },
        },
      };
    }

    if (type === 'getRecommendations') {
      const diagnosisCode = String(payload?.icd_x || '');

      if (diagnosisCode === 'J18.9') {
        return {
          success: true,
          data: {
            medication_recommendations: [
              {
                nama_obat: 'Paracetamol 500 mg',
                dosis: '3x1',
                aturan_pakai: 'Sesudah makan',
                durasi: '3 hari',
                rationale: 'Simptomatik untuk demam dan nyeri.',
                safety_check: 'safe',
              },
              {
                nama_obat: 'Amoxicillin 500 mg',
                dosis: '3x1',
                aturan_pakai: 'Sesudah makan',
                durasi: '5 hari',
                rationale: 'Pertimbangan terapi infeksi saluran napas bawah.',
                safety_check: 'caution',
                contraindications: ['Riwayat alergi penisilin'],
              },
              {
                nama_obat: 'Vitamin C 500 mg',
                dosis: '1x1',
                aturan_pakai: 'Sesudah makan',
                durasi: '5 hari',
                rationale: 'Vitamin suportif selama pemulihan.',
                safety_check: 'safe',
                contraindications: [],
              },
            ],
            alerts: [
              {
                id: 'alert-red-1',
                type: 'red_flag',
                severity: 'emergency',
                title: 'Hipoksemia',
                message: 'Pertimbangkan eskalasi bila saturasi turun atau distress meningkat.',
              },
            ],
            clinical_guidelines: [
              'Pertimbangkan terapi sesuai protokol pneumonia komunitas setempat.',
            ],
            pharmacotherapy_explainability: {
              confidence: 72,
              drivers: ['demam', 'takipnea', 'auskultasi_paru'],
              missing_data: ['fungsi_renal', 'status_laktasi'],
              risk_tier: 'urgent',
              review_window: '24h',
              pathway: 'knowledge+syndrome-intent',
            },
          },
        };
      }

      return {
        success: true,
        data: {
          medication_recommendations: [],
          alerts: [],
          clinical_guidelines: [],
          pharmacotherapy_explainability: {
            confidence: 45,
            drivers: ['keluhan_respirasi'],
            missing_data: ['fungsi_hepatik'],
            risk_tier: 'routine',
            review_window: '48h',
            pathway: 'knowledge-only',
          },
        },
      };
    }

    throw new Error(`Unhandled mock message type: ${type}`);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('ClinicalDifferential final diagnosis support page', () => {
  it('renders the focused diagnosis workspace through the restored therapy + RME transfer surface', async () => {
    const { container } = render(
      <ClinicalDifferential
        keluhanUtama="Demam, batuk, dan sesak sejak 3 hari"
        keluhanTambahan="Nafsu makan menurun"
        patientAge={54}
        patientGender="P"
        patientRM="RM-2026-001"
        allergies={['Penicillin']}
        confirmedPregnancyStatus={false}
        vitals={{ sbp: 108, dbp: 68, hr: 112, rr: 26, temp: 38.5, glucose: 124 }}
        canonicalOutput={null}
        hasVisitHistory={false}
        onBack={() => undefined}
        onDiagnosisChange={() => undefined}
        onMedicationsChange={() => undefined}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('diagnosis-workspace')).toBeTruthy();
    });

    const workspace = screen.getByTestId('diagnosis-workspace');
    if (process.env.WRITE_DIAGNOSIS_THERAPY_PREVIEW === '1') {
      const previewDir = path.resolve('.output-verify');
      mkdirSync(previewDir, { recursive: true });
      writeFileSync(
        path.join(previewDir, 'diagnosis-therapy-preview.fragment.html'),
        container.innerHTML,
        'utf8'
      );
    }
    const expectedOrder = [
      '✓ Temuan',
      'Apa diagnosis utama hari ini?',
      'Penunjang (',
      '3 · Terapi',
      '4 · RME',
    ];
    const positions = expectedOrder.map((label) => workspace.textContent?.indexOf(label) ?? -1);
    positions.forEach((position) => expect(position).toBeGreaterThanOrEqual(0));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));

    fireEvent.click(within(workspace).getByRole('button', { name: 'ubah Temuan' }));
    const clinicalContext = within(workspace).getByLabelText('Temuan');
    const contextText = clinicalContext.textContent || '';
    expect(within(clinicalContext).getByRole('heading', { name: 'Temuan' })).toBeInTheDocument();
    expect(within(clinicalContext).getByTestId('diagnosis-clinical-signals')).toHaveTextContent(
      /Demam/i
    );
    expect(within(clinicalContext).getByTestId('diagnosis-clinical-signals')).toHaveTextContent(
      /Batuk/i
    );
    expect(within(clinicalContext).getByTestId('diagnosis-clinical-signals')).toHaveTextContent(
      /Sesak/i
    );
    expect(clinicalContext).not.toHaveTextContent(/Data pasien|Terapi kronis/i);
    expect(clinicalContext).not.toHaveTextContent(/RM RM-2026-001/i);
    expect(contextText).not.toMatch(/Demam, batuk, dan sesak sejak 3 hari Nafsu makan menurun/i);
    fireEvent.click(within(workspace).getByRole('button', { name: 'selesai' }));

    const diagnosisStep = within(workspace).getByLabelText('Diagnosis');
    const lainnya = within(diagnosisStep).queryByRole('button', { name: /^Lainnya \(/ });
    if (lainnya) fireEvent.click(lainnya);
    const [primaryCard, ...differentialCards] = within(diagnosisStep).getAllByTestId('dx-flow-card');
    expect(primaryCard).toHaveTextContent(/J18\.9 - Community Acquired Pneumonia/i);
    expect(primaryCard).not.toHaveTextContent(
      /Siap ditinjau dokter|diagnosis dipilih|Review red flags|Korelasikan keluhan|Perlu dilengkapi/i
    );
    fireEvent.click(within(workspace).getByRole('button', { name: /^Penunjang \(/ }));
    expect(within(workspace).getByTestId('dx-flow-exams')).toHaveTextContent(/SpO2 dan auskultasi paru/i);
    fireEvent.click(within(workspace).getByRole('button', { name: 'lihat' }));
    expect(within(workspace).getByLabelText('Keselamatan')).toHaveTextContent(/Hipoksemia perlu dinilai/i);
    expect(differentialCards.length).toBeGreaterThanOrEqual(3);
    differentialCards.forEach((card) =>
      expect(card).not.toHaveTextContent(/J18\.9 - Community Acquired Pneumonia/i)
    );
    expect(diagnosisStep).not.toHaveTextContent(/Batalkan Diagnosis Utama/i);
    expect(within(diagnosisStep).queryByText(/^Utama$/i)).toBeNull();
    const sidePanelStyle = readFileSync(SIDE_PANEL_STYLE_PATH, 'utf8');
    expect(sidePanelStyle).toMatch(
      /\.diagnosis-differential-section\s+>\s+\.form-group-header\s+\.console-label[\s\S]*color:\s*var\(--accent-med\)/
    );
    expect(sidePanelStyle).not.toMatch(
      /\.diagnosis-differential-section\s+\.diagnosis-row-title[\s\S]*color:\s*var\(--accent-med\)/
    );
    expect(sidePanelStyle).toMatch(/\.diagnosis-chip[\s\S]*overflow-wrap:\s*anywhere/);
    expect(sidePanelStyle).toMatch(/\.diagnosis-row-meta[\s\S]*overflow-wrap:\s*anywhere/);
    expect(within(workspace).getByRole('button', { name: /Diagnosis manual/i })).toBeTruthy();
    // Temuan #1 restore (2026-07-05): therapy, education, and RME transfer now
    // render on the focused surface (fail-closed until a diagnosis is selected):
    // Terapi and RME as the next steps, Edukasi as a one-line link. The transfer
    // buttons are asserted on the mounted RME step at the end of this test.
    expect(within(workspace).getByTestId('dx-flow-ghost-therapy')).toHaveTextContent('3 · Terapi');
    expect(within(workspace).getByRole('button', { name: /^Edukasi \(/ })).toBeTruthy();
    expect(within(workspace).getByTestId('dx-flow-ghost-rme')).toHaveTextContent('4 · RME');
    // No medication is proposed until the physician selects a working diagnosis.
    expect(within(workspace).queryByText(/Paracetamol 500 mg/i)).toBeNull();

    differentialCards.forEach((card) => {
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('aria-pressed', 'false');
    });
    expect(primaryCard).toHaveAttribute('role', 'button');
    expect(primaryCard).toHaveAttribute('aria-pressed', 'false');

    const triageSection = await within(workspace).findByTestId('dx-flow-triage');
    expect(triageSection.textContent || '').toMatch(
      /darurat|segera|rujukan|layanan primer|belum cukup/i
    );

    const advanced = within(cardOf(primaryCard)).getByRole('button', { name: 'alasan' });
    expect(advanced).toBeTruthy();
    expect(advanced).toHaveAttribute('aria-expanded', 'false');
    expect(workspace.textContent).not.toMatch(LONG_PRIMARY_RATIONALE);
    expect(workspace.textContent).not.toMatch(
      /Kriteria Rujukan|konsultasi dengan spesialis|Pemeriksaan penunjang wajib segera|Dukungan tanda vital belum dominan|Gejala khas belum menonjol/i
    );
    expect(container.textContent).not.toMatch(
      /Clinical Context|Diagnosis Status|Evidence Completeness|Differential Candidates|Main Diagnosis|Differential Diagnosis|Pharmacology|Education|Advanced reasoning|Auto Fill RME|Uplink/i
    );

    expect(container.textContent).not.toMatch(/Alur Kerja Cepat/i);
    expect(container.textContent).not.toMatch(/Diagnosis selection review queue/i);
    expect(container.textContent).not.toMatch(/Manual diagnosis entry/i);
    expect(container.textContent).not.toMatch(/Therapy planning & medication selection/i);
    expect(container.textContent).not.toMatch(/Transfer to ePuskesmas/i);
    expect(container.textContent).not.toMatch(/Step 1 • Pilih Diagnosis/i);
    expect(container.textContent).not.toMatch(/Step 2 • Pilih Resep/i);
    expect(container.textContent).not.toMatch(/Step 3 • Uplink ke RME/i);
    expect(container.textContent).not.toMatch(
      /Kandidat Sementara|Dapat dikunci|Belum dapat dikunci|workflow differential|Diagnosis hasil differential|Lihat alasan differential/i
    );

    expect(container.textContent).not.toMatch(
      /\bAI diagnosis\b|\bfinal diagnosis\b|\bguaranteed\b|\bconfirmed disease\b|\bautomated treatment decision\b/i
    );
    expect(findForbiddenPhysicianTrajectoryTerms(container.textContent || '')).toEqual([]);
    expect(workspace.querySelector('svg')).toBeNull();
    expect(workspace.innerHTML).not.toMatch(/bg-white|#fbfcfe|#f7f9fc|#eff4fb/i);
    expect(workspace.querySelectorAll('.ttv-section').length).toBe(0);

    // The transfer controls render fail-closed on the mounted RME step: with a diagnosis
    // chosen and no medication, "Kirim diagnosis" is offered and "Kirim resep" is disabled.
    fireEvent.click(primaryCard);
    fireEvent.click(await within(workspace).findByRole('button', { name: 'Lanjut tanpa obat' }));
    const rmeStep = within(workspace).getByLabelText('RME');
    expect(within(rmeStep).getByRole('button', { name: 'Kirim diagnosis' })).toBeTruthy();
    expect(within(rmeStep).getByRole('button', { name: 'Kirim resep' })).toBeDisabled();
  });

  it('extracts only important clinical signals instead of dumping the full clinical narrative', async () => {
    render(
      <ClinicalDifferential
        keluhanUtama="Pasien dengan hipertensi dan diabetes datang karena pusing berputar sejak pagi, disertai batuk ringan dan nyeri kaki kanan setelah aktivitas. Keluhan panjang ini tidak perlu ditampilkan utuh di konteks klinis."
        keluhanTambahan="Riwayat sakit kronis HT dan DM, minum amlodipine serta metformin tidak teratur."
        patientAge={59}
        patientGender="P"
        patientRM="RM-2026-HTDM"
        allergies={['Makanan']}
        confirmedPregnancyStatus={false}
        chronicTherapies={['Amlodipine', 'Metformin']}
        vitals={{ sbp: 150, dbp: 92, hr: 88, rr: 20, temp: 36.7, glucose: 214 }}
        canonicalOutput={null}
        hasVisitHistory={false}
        onBack={() => undefined}
        onDiagnosisChange={() => undefined}
        onMedicationsChange={() => undefined}
      />
    );

    const workspace = await screen.findByTestId('diagnosis-workspace');
    fireEvent.click(await within(workspace).findByRole('button', { name: 'ubah Temuan' }));
    const clinicalContext = within(workspace).getByLabelText('Temuan');
    const clinicalSignals = within(clinicalContext).getByTestId('diagnosis-clinical-signals');

    expect(clinicalSignals).toHaveTextContent(/HT/i);
    expect(clinicalSignals).toHaveTextContent(/DM/i);
    expect(clinicalSignals).toHaveTextContent(/Pusing/i);
    expect(clinicalSignals).toHaveTextContent(/Batuk/i);
    expect(clinicalSignals).toHaveTextContent(/Nyeri kaki/i);
    expect(clinicalSignals).toHaveTextContent(/Alergi/i);
    expect(clinicalSignals).not.toHaveTextContent(/Terapi kronis|Amlodipine|Metformin/i);
    expect(clinicalContext.textContent).not.toMatch(
      /Keluhan panjang ini tidak perlu ditampilkan utuh/i
    );
  });

  it('does not label prior acute medications as chronic disease therapy in clinical context', async () => {
    render(
      <ClinicalDifferential
        keluhanUtama="Batuk pilek dan nyeri tenggorokan sejak dua hari"
        keluhanTambahan=""
        patientAge={19}
        patientGender="L"
        patientRM="RM-2026-ACUTE"
        allergies={['Makanan', 'Obat']}
        confirmedPregnancyStatus={false}
        chronicTherapies={[
          'ACETYLSISTEIN',
          'PARACETAMOL',
          'CTM',
          'ANTASID SYR',
          'ORALIT',
          'ZINK',
          'SALEP',
          'LORATADIN',
          'VC',
        ]}
        vitals={{ sbp: 118, dbp: 76, hr: 84, rr: 18, temp: 36.9, glucose: 101 }}
        canonicalOutput={null}
        hasVisitHistory={true}
        onBack={() => undefined}
        onDiagnosisChange={() => undefined}
        onMedicationsChange={() => undefined}
      />
    );

    const workspace = await screen.findByTestId('diagnosis-workspace');
    fireEvent.click(await within(workspace).findByRole('button', { name: 'ubah Temuan' }));
    const clinicalContext = within(workspace).getByLabelText('Temuan');
    const clinicalSignals = within(clinicalContext).getByTestId('diagnosis-clinical-signals');

    expect(clinicalSignals).toHaveTextContent(/Batuk/i);
    expect(clinicalSignals).toHaveTextContent(/Alergi: Makanan, Obat/i);
    expect(clinicalSignals).not.toHaveTextContent(/Terapi kronis/i);
    expect(clinicalSignals).not.toHaveTextContent(
      /ACETYLSISTEIN|PARACETAMOL|ORALIT|ZINK|LORATADIN/i
    );
    expect(clinicalContext).not.toHaveTextContent(/Data pasien/i);
  });

  it('keeps the diagnosis surface flat inside the existing sidepanel shell', async () => {
    const { container } = render(
      <ClinicalDifferential
        keluhanUtama="Demam, batuk, dan sesak sejak 3 hari"
        keluhanTambahan="Nafsu makan menurun"
        patientAge={54}
        patientGender="P"
        patientRM="RM-2026-001"
        allergies={['Penicillin']}
        confirmedPregnancyStatus={false}
        vitals={{ sbp: 108, dbp: 68, hr: 112, rr: 26, temp: 38.5, glucose: 124 }}
        canonicalOutput={null}
        hasVisitHistory={false}
        onBack={() => undefined}
        onDiagnosisChange={() => undefined}
        onMedicationsChange={() => undefined}
      />
    );

    const workspace = await screen.findByTestId('diagnosis-workspace');
    expect(screen.queryByTestId('clinical-screen-tabs')).toBeNull();
    expect(container.textContent).not.toMatch(/Clinical Trajectory|Diagnosis \+ Resep/i);

    expect(screen.queryByTestId('assist-shell-wrapper')).toBeNull();
    expect(screen.queryByTestId('console-frame-wrapper')).toBeNull();
    expect(screen.queryByRole('heading', { name: /Med Assist/i })).toBeNull();
    expect(screen.queryByText(/Your Intelligence Assistant/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Back|Kembali/i })).toBeNull();

    expect(workspace.tagName).toBe('DIV');
    expect(workspace).toHaveClass('diagnosis-content');
    expect(workspace).not.toHaveClass('assist-shell');
    expect(workspace).not.toHaveClass('ct-neu-shell');
    expect(workspace).not.toHaveClass('console-frame');
    expect(workspace.querySelector('.assist-shell, .ct-neu-shell, .console-frame')).toBeNull();
    expect(workspace.querySelector('header')).toBeNull();
    expect(
      workspace.querySelector('svg, img, [data-testid*="logo"], [data-testid*="avatar"]')
    ).toBeNull();
    expect(workspace.querySelector('.diagnosis-section .diagnosis-section')).toBeNull();
    expect(
      container.querySelector(
        '[data-testid="diagnosis-workspace"] [data-testid="diagnosis-workspace"]'
      )
    ).toBeNull();
  });

  it('does not expose non-product bridge/dashboard copy on the diagnosis surface', async () => {
    mockEvaluateCanonicalDifferential.mockRejectedValueOnce(
      new Error(
        'Bridge memerlukan sesi Dashboard (host sama dengan Crew API di Settings) atau Bridge Automation Token di Settings -> Agent.'
      )
    );

    const { container } = render(
      <ClinicalDifferential
        keluhanUtama="Demam, batuk, dan sesak sejak 3 hari"
        keluhanTambahan="Nafsu makan menurun"
        patientAge={54}
        patientGender="P"
        patientRM="RM-2026-001"
        allergies={['Penicillin']}
        confirmedPregnancyStatus={false}
        vitals={{ sbp: 108, dbp: 68, hr: 112, rr: 26, temp: 38.5, glucose: 124 }}
        canonicalOutput={null}
        hasVisitHistory={false}
        onBack={() => undefined}
        onDiagnosisChange={() => undefined}
        onMedicationsChange={() => undefined}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('diagnosis-workspace')).toBeTruthy();
    });

    expect(container.textContent).not.toMatch(/Diagnosis lokal digunakan/i);
    expect(container.textContent).not.toMatch(/Bridge|Dashboard|Crew|Automation Token|Crew API/i);
    expect(container.textContent).not.toMatch(
      /fallback differential lokal|canonical differential/i
    );
  });

  it('keeps manual diagnosis available on the clean workspace', async () => {
    render(
      <ClinicalDifferential
        keluhanUtama="Demam dan kejang"
        keluhanTambahan="Anak tampak lemas"
        patientAge={3}
        patientGender="L"
        patientRM="RM-2026-002"
        allergies={[]}
        confirmedPregnancyStatus={false}
        vitals={{ sbp: 96, dbp: 60, hr: 128, rr: 28, temp: 39.1, glucose: 96 }}
        canonicalOutput={null}
        hasVisitHistory={false}
        onBack={() => undefined}
        onDiagnosisChange={() => undefined}
        onMedicationsChange={() => undefined}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('diagnosis-workspace')).toBeTruthy();
    });

    const workspace = screen.getByTestId('diagnosis-workspace');
    expect(within(workspace).getByRole('button', { name: /Diagnosis manual/i })).toBeTruthy();

    fireEvent.click(within(workspace).getByRole('button', { name: /Diagnosis manual/i }));
    fireEvent.change(within(workspace).getByPlaceholderText(/ICD-X manual/i), {
      target: { value: 'Z99.9' },
    });
    fireEvent.change(within(workspace).getByPlaceholderText(/Nama diagnosis manual/i), {
      target: { value: 'Diagnosis manual uji' },
    });
    fireEvent.click(within(workspace).getByRole('button', { name: /Gunakan diagnosis manual/i }));

    await waitFor(() => {
      expect(
        within(workspace).getAllByText(/Z99\.9 - Diagnosis manual uji/i).length
      ).toBeGreaterThan(0);
    });
  });

  it('keeps engine diagnosis as SSOT even when canonical differential returns stale data', async () => {
    mockEvaluateCanonicalDifferential.mockResolvedValue({
      diagnosis_suggestions: [
        {
          rank: 1,
          icd_x: 'B02.9',
          nama: 'Herpes zoster',
          confidence: 0.91,
          rationale: 'Stale canonical payload',
          red_flags: [],
          recommended_actions: ['Ignore'],
        },
      ],
      alerts: [],
      meta: {
        processing_time_ms: 91,
      },
    });

    render(
      <ClinicalDifferential
        keluhanUtama="Demam, batuk, dan sesak sejak 3 hari"
        keluhanTambahan="Nafsu makan menurun"
        patientAge={54}
        patientGender="P"
        patientRM="RM-2026-001"
        allergies={['Penicillin']}
        confirmedPregnancyStatus={false}
        vitals={{ sbp: 108, dbp: 68, hr: 112, rr: 26, temp: 38.5, glucose: 124 }}
        canonicalOutput={null}
        hasVisitHistory={false}
        onBack={() => undefined}
        onDiagnosisChange={() => undefined}
        onMedicationsChange={() => undefined}
      />
    );

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        'getSuggestions',
        expect.objectContaining({
          keluhan_utama: 'Demam, batuk, dan sesak sejak 3 hari',
        })
      );
    });

    expect(screen.queryByText('B02.9 - Herpes zoster')).toBeNull();
    expect(screen.getAllByText('J18.9 - Community Acquired Pneumonia').length).toBeGreaterThan(0);
  });

  it('shows insufficient-data as a safe action without presenting R69 as locked diagnosis', async () => {
    mockSendMessage.mockImplementation(async (type: string) => {
      if (type === 'resolveTenagaMedis') {
        return {
          success: true,
          tenagaMedis: {
            dokterNama: 'dr. Sentra',
            perawatNama: 'Ns. Assist',
            source: ['test'],
            capturedAt: '2026-06-24T08:00:00.000Z',
          },
        };
      }
      if (type === 'getSuggestions') {
        return {
          success: true,
          data: {
            diagnosis_suggestions: [
              {
                rank: 1,
                icd_x: 'R69',
                nama: 'Data klinis belum cukup',
                confidence: 0.12,
                rationale: 'Data belum cukup untuk diagnosis kerja.',
                red_flags: [],
                recommended_actions: ['Lengkapi anamnesis dan pemeriksaan fisik'],
              },
            ],
            meta: {
              processing_time_ms: 201,
            },
          },
        };
      }
      if (type === 'getRecommendations') {
        return {
          success: true,
          data: {
            medication_recommendations: [],
            alerts: [],
            clinical_guidelines: [],
          },
        };
      }
      throw new Error(`Unhandled mock message type: ${type}`);
    });

    render(
      <ClinicalDifferential
        keluhanUtama="Keluhan belum spesifik"
        keluhanTambahan=""
        patientAge={44}
        patientGender="P"
        patientRM="RM-2026-004"
        allergies={[]}
        confirmedPregnancyStatus={false}
        vitals={{ sbp: 118, dbp: 76, hr: 84, rr: 18, temp: 36.9, glucose: 101 }}
        canonicalOutput={null}
        hasVisitHistory={false}
        onBack={() => undefined}
        onDiagnosisChange={() => undefined}
        onMedicationsChange={() => undefined}
      />
    );

    const workspace = await screen.findByTestId('diagnosis-workspace');
    const primaryCard = await within(workspace).findByLabelText('Diagnosis');
    await within(primaryCard).findByTestId('dx-flow-complete-data');
    expect(workspace).not.toHaveTextContent(/Kandidat Sementara|Sementara|kandidat/i);
    expect(workspace).not.toHaveTextContent(/Diagnosis banding belum lengkap/i);
    expect(workspace).not.toHaveTextContent(/R69/i);
    expect(primaryCard).toHaveTextContent(/Data belum cukup untuk menetapkan diagnosis utama/i);
    expect(within(primaryCard).getByTestId('dx-flow-complete-data')).toHaveTextContent(
      /Lengkapi Data Diagnosis/i
    );
    expect(primaryCard).toHaveTextContent(/Anamnesis terarah/i);
    expect(primaryCard).not.toHaveTextContent(/R69/i);
    expect(primaryCard).not.toHaveTextContent(/Dapat dikunci|Belum dapat dikunci/i);
    expect(within(primaryCard).queryAllByTestId('dx-flow-card')).toHaveLength(0);
    expect(within(primaryCard).queryByRole('button', { name: /Setuju/i })).toBeNull();
  });

  it('keeps follow-up examination collapsed when engine does not require supporting exam', async () => {
    mockSendMessage.mockImplementation(async (type: string) => {
      if (type === 'resolveTenagaMedis') {
        return {
          success: true,
          tenagaMedis: {
            dokterNama: 'dr. Sentra',
            perawatNama: 'Ns. Assist',
            source: ['test'],
            capturedAt: '2026-06-24T08:00:00.000Z',
          },
        };
      }
      if (type === 'getSuggestions') {
        return {
          success: true,
          data: {
            diagnosis_suggestions: [
              {
                rank: 1,
                icd_x: 'R51',
                nama: 'Sakit kepala tegang',
                confidence: 0.62,
                rationale: 'Gejala ringan tanpa red flag dan TTV stabil.',
                red_flags: [],
                recommended_actions: [],
              },
              {
                rank: 2,
                icd_x: 'J06.9',
                nama: 'Infeksi saluran napas atas',
                confidence: 0.28,
                rationale: 'Keluhan non-spesifik masih mungkin ringan.',
                red_flags: [],
                recommended_actions: [],
              },
              {
                rank: 3,
                icd_x: 'R53',
                nama: 'Malaise',
                confidence: 0.18,
                rationale: 'Masih rendah dan perlu korelasi klinis.',
                red_flags: [],
                recommended_actions: [],
              },
            ],
            meta: {
              processing_time_ms: 501,
            },
          },
        };
      }
      if (type === 'getRecommendations') {
        return {
          success: true,
          data: {
            medication_recommendations: [],
            alerts: [],
            clinical_guidelines: [],
          },
        };
      }
      throw new Error(`Unhandled mock message type: ${type}`);
    });

    render(
      <ClinicalDifferential
        keluhanUtama="Sakit kepala ringan sejak semalam"
        keluhanTambahan=""
        patientAge={58}
        patientGender="P"
        patientRM="RM-2026-003"
        allergies={[]}
        confirmedPregnancyStatus={false}
        vitals={{ sbp: 120, dbp: 78, hr: 82, rr: 18, temp: 36.8, glucose: 108 }}
        canonicalOutput={null}
        hasVisitHistory={false}
        onBack={() => undefined}
        onDiagnosisChange={() => undefined}
        onMedicationsChange={() => undefined}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('diagnosis-workspace')).toBeTruthy();
    });

    const workspace = screen.getByTestId('diagnosis-workspace');
    const [primaryCard] = await within(workspace).findAllByTestId('dx-flow-card');
    const advancedReasoning = within(cardOf(primaryCard)).getByRole('button', { name: 'alasan' });
    expect(advancedReasoning).toBeTruthy();
    expect(advancedReasoning).toHaveAttribute('aria-expanded', 'false');
  });

  // The select control carries data-testid="dx-flow-card"; "alasan" sits beside it in the card.
  function cardOf(select: HTMLElement): HTMLElement {
    const wrapper = select.parentElement;
    if (!wrapper) throw new Error('dx-flow-card wrapper missing');
    return wrapper;
  }

  // A diagnosis card found by its title; the engine tag sits in the card's chip.
  function card(title: RegExp): HTMLElement {
    const found = screen
      .getAllByTestId('dx-flow-card')
      .find((element) => title.test(element.querySelector('.dx-flow-card__title')?.textContent ?? ''));
    if (!found) throw new Error(`No diagnosis card titled ${title}`);
    return found;
  }

  function renderWithSuggestions(data: Record<string, unknown>) {
    const base = mockSendMessage.getMockImplementation();
    mockSendMessage.mockImplementation(async (type: string, payload?: Record<string, unknown>) =>
      type === 'getSuggestions' ? { success: true, data } : base?.(type, payload)
    );
    render(
      <ClinicalDifferential
        keluhanUtama="Nyeri perut kanan bawah sejak 1 hari"
        keluhanTambahan="Mual"
        patientAge={24}
        patientGender="L"
        patientRM="RM-2026-001"
        allergies={[]}
        confirmedPregnancyStatus={false}
        vitals={{ sbp: 118, dbp: 76, hr: 96, rr: 18, temp: 37.9, glucose: 0 }}
        canonicalOutput={null}
        hasVisitHistory={false}
        onBack={() => undefined}
        onDiagnosisChange={() => undefined}
        onMedicationsChange={() => undefined}
      />
    );
  }

  it('labels MIRA diagnoses and marks cannot-miss ones, keeping codes outside the local list', async () => {
    renderWithSuggestions({
      diagnosis_suggestions: [
        {
          rank: 1,
          icd_x: 'K35.8',
          nama: 'Acute appendicitis',
          confidence: 0.82,
          rationale: '',
          engine_tag: 'MIRA',
        },
        {
          rank: 2,
          icd_x: 'Z99.9',
          nama: 'Code outside the local list',
          confidence: 0.3,
          rationale: '',
          engine_tag: 'MIRA',
        },
        {
          rank: 3,
          icd_x: 'K65.0',
          nama: 'Acute peritonitis',
          confidence: 0.3,
          rationale: '',
          engine_tag: 'MIRA · jangan terlewat',
        },
      ],
      alerts: [],
    });

    await waitFor(() => {
      expect(within(card(/^K35\.8 - /)).getByText('MIRA')).toBeTruthy();
    });
    expect(within(card(/^Z99\.9 - /)).getByText('MIRA')).toBeTruthy();
    expect(within(card(/^K65\.0 - /)).getByText('MIRA · jangan terlewat')).toBeTruthy();
  });

  it('shows "MIRA tidak tersedia" when the engine fell back to the legacy list', async () => {
    renderWithSuggestions({
      diagnosis_suggestions: [
        { rank: 1, icd_x: 'K35.8', nama: 'Apendisitis akut', confidence: 0.7, rationale: '' },
      ],
      alerts: [],
      engine_notice: 'MIRA tidak tersedia',
    });

    await waitFor(() => {
      expect(screen.getByText('MIRA tidak tersedia')).toBeTruthy();
    });
    expect(
      Array.from(document.querySelectorAll('.dx-flow-chip')).filter((chip) => /MIRA/.test(chip.textContent ?? ''))
    ).toHaveLength(0);
  });

  describe('MIRA prefetch', () => {
    type StorageListener = (changes: Record<string, { newValue?: unknown }>, area: string) => void;
    const listeners: StorageListener[] = [];
    const stored: Record<string, unknown> = {};
    let removedListeners = 0;
    let onFirstReply: () => void = () => undefined;
    const PAGE = {
      keluhanUtama: 'Nyeri perut kanan bawah sejak 1 hari',
      keluhanTambahan: 'Mual',
      patientAge: 24,
      patientGender: 'L' as const,
      vitals: { sbp: 118, dbp: 76, hr: 96, rr: 18, temp: 37.9, glucose: 0 },
    };
    const pageHash = () =>
      hashDiagnosisContext(buildDiagnosisRequestContext({ ...PAGE, recurrent: [] }));
    const getSuggestionsCalls = () =>
      mockSendMessage.mock.calls.filter(([type]) => type === 'getSuggestions').length;
    const fireStorageChange = (value: unknown) =>
      act(() => {
        [...listeners].forEach((fn) => fn({ [MIRA_PREFETCH_READY_KEY]: { newValue: value } }, 'local'));
      });

    beforeEach(() => {
      listeners.length = 0;
      removedListeners = 0;
      onFirstReply = () => undefined;
      for (const key of Object.keys(stored)) delete stored[key];
      vi.stubGlobal('browser', {
        storage: {
          local: {
            get: async (key: string) => (key in stored ? { [key]: stored[key] } : {}),
          },
          onChanged: {
            addListener: (fn: StorageListener) => listeners.push(fn),
            removeListener: (fn: StorageListener) => {
              removedListeners += 1;
              listeners.splice(listeners.indexOf(fn), 1);
            },
          },
        },
      });
      const base = mockSendMessage.getMockImplementation();
      let replies = 0;
      mockSendMessage.mockImplementation(async (type: string, payload?: Record<string, unknown>) => {
        if (type !== 'getSuggestions') return base?.(type, payload);
        replies += 1;
        if (replies === 1) onFirstReply();
        return replies === 1
          ? {
              success: true,
              data: {
                diagnosis_suggestions: [
                  { rank: 1, icd_x: 'K35.8', nama: 'Apendisitis akut', confidence: 0.7, rationale: '' },
                ],
                alerts: [],
                engine_notice: 'Menunggu MIRA…',
                engine_pending: true,
              },
            }
          : {
              success: true,
              data: {
                diagnosis_suggestions: [
                  { rank: 1, icd_x: 'K35.8', nama: 'Acute appendicitis', confidence: 0.8, rationale: '', engine_tag: 'MIRA' },
                  { rank: 2, icd_x: 'K65.0', nama: 'Acute peritonitis', confidence: 0.3, rationale: '', engine_tag: 'MIRA · jangan terlewat' },
                ],
                alerts: [],
              },
            };
      });
    });

    function renderPage() {
      render(
        <ClinicalDifferential
          {...PAGE}
          patientRM="RM-2026-001"
          allergies={[]}
          confirmedPregnancyStatus={false}
          canonicalOutput={null}
          hasVisitHistory={false}
          onBack={() => undefined}
          onDiagnosisChange={() => undefined}
          onMedicationsChange={() => undefined}
        />
      );
    }

    it('re-requests once when the prefetch for the same hash becomes ready', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Menunggu MIRA…')).toBeTruthy());
      await waitFor(() => expect(listeners).toHaveLength(1));

      fireEvent.click((await screen.findAllByTestId('dx-flow-card'))[0]);
      await waitFor(() =>
        expect(screen.getByTestId('diagnosis-workspace')).toHaveAttribute('data-diagnosis-selected-count', '1')
      );
      // The candidate list lives on the Diagnosis step; reopen it to watch the refresh.
      fireEvent.click(screen.getByRole('button', { name: 'ubah Diagnosis' }));

      fireStorageChange({ hash: 'ffffffff', at: 't' });
      expect(getSuggestionsCalls()).toBe(1);

      fireStorageChange({ hash: pageHash(), at: 't' });
      await waitFor(() =>
        expect(within(card(/^K65\.0 - /)).getByText('MIRA · jangan terlewat')).toBeTruthy()
      );
      expect(getSuggestionsCalls()).toBe(2);
      expect(listeners).toHaveLength(0);
      expect(screen.queryByText('Menunggu MIRA…')).toBeNull();
      expect(screen.getByTestId('diagnosis-workspace')).toHaveAttribute('data-diagnosis-selected-count', '1');

      fireStorageChange({ hash: pageHash(), at: 't2' });
      expect(getSuggestionsCalls()).toBe(2);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('re-requests when the prefetch finished before the page started listening', async () => {
      onFirstReply = () => {
        stored[MIRA_PREFETCH_READY_KEY] = { hash: pageHash(), at: new Date().toISOString() };
      };
      renderPage();
      await waitFor(() =>
        expect(within(card(/^K65\.0 - /)).getByText('MIRA · jangan terlewat')).toBeTruthy()
      );
      expect(getSuggestionsCalls()).toBe(2);
      expect(listeners).toHaveLength(0);
    });

    it('ignores a ready record older than the request and keeps listening', async () => {
      stored[MIRA_PREFETCH_READY_KEY] = { hash: pageHash(), at: '2020-01-01T00:00:00.000Z' };
      renderPage();
      await waitFor(() => expect(screen.getByText('Menunggu MIRA…')).toBeTruthy());
      await waitFor(() => expect(listeners).toHaveLength(1));
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(getSuggestionsCalls()).toBe(1);
      expect(listeners).toHaveLength(1);
      expect(removedListeners).toBe(0);
    });

    it('asks once more when no ready record arrives in time', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      renderPage();
      await waitFor(() => expect(screen.getByText('Menunggu MIRA…')).toBeTruthy());
      await waitFor(() => expect(listeners).toHaveLength(1));

      await act(async () => {
        vi.advanceTimersByTime(24_000);
      });
      expect(getSuggestionsCalls()).toBe(1);

      await act(async () => {
        vi.advanceTimersByTime(1_000);
      });
      await waitFor(() => expect(getSuggestionsCalls()).toBe(2));
      expect(listeners).toHaveLength(0);

      await act(async () => {
        vi.advanceTimersByTime(60_000);
      });
      expect(getSuggestionsCalls()).toBe(2);
    });
  });
});
