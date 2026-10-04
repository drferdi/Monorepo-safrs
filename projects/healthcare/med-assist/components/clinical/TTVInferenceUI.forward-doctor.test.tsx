import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const {
  mockGetOnlineDoctors,
  mockGetBridgeRuntimeStatus,
  mockSendConsultToDoctor,
  mockExtractClinicalAnamnesis,
  mockEvaluateCanonicalClinicalEngine,
  mockPlaySound,
} = vi.hoisted(() => ({
  mockGetOnlineDoctors: vi.fn(),
  mockGetBridgeRuntimeStatus: vi.fn(),
  mockSendConsultToDoctor: vi.fn(),
  mockExtractClinicalAnamnesis: vi.fn(),
  mockEvaluateCanonicalClinicalEngine: vi.fn(),
  mockPlaySound: vi.fn(),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getManifest: () => ({ version: '2.1.0' }),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  },
}));

vi.mock('@/utils/sound', () => ({
  playSound: mockPlaySound,
}));

vi.mock('@/lib/api/bridge-client', () => ({
  BRIDGE_AUTH_REQUIRED_HINT: 'Bridge memerlukan login',
  extractClinicalAnamnesis: mockExtractClinicalAnamnesis,
  evaluateCanonicalClinicalEngine: mockEvaluateCanonicalClinicalEngine,
  getBridgeRuntimeStatus: mockGetBridgeRuntimeStatus,
  getOnlineDoctors: mockGetOnlineDoctors,
  sendConsultToDoctor: mockSendConsultToDoctor,
}));

import { TTVInferenceUI } from './TTVInferenceUI';

import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

describe('TTVInferenceUI forward consult', () => {
  it('mengikuti pola AutoSen untuk dropdown alergi dan menyembunyikan output autocomplete', () => {
    render(
      <TTVInferenceUI
        patientName="Tn. Budi"
        patientGender="L"
        patientAge={45}
        patientRM="RM-001"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
      />
    );

    expect(screen.getByText('Vital Signs - Cardiopulmonary')).toBeInTheDocument();
    expect(screen.queryByText('Vital Signs - Cardiopulmonary Metrics')).not.toBeInTheDocument();
    expect(screen.queryByText(/AutoComplete\+ Output/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Pilih di sini' })[0]);

    expect(screen.queryByRole('checkbox', { name: 'Obat' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Obat' }));

    expect(screen.getByRole('button', { name: 'Obat' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Makanan' })).not.toBeInTheDocument();
  });

  it('menandai field Gejala/Keluhan agar teks dan AutoComplete+ tampil lebih tegas', () => {
    render(
      <TTVInferenceUI
        patientName="Tn. Budi"
        patientGender="L"
        patientAge={45}
        patientRM="RM-001"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
      />
    );

    expect(screen.getByLabelText('Keluhan utama pasien')).toHaveClass('neu-textarea--symptom');
    expect(screen.getByRole('button', { name: 'AutoComplete+ Gejala' })).toHaveClass(
      'btn-ac-inline--sharp'
    );
    expect(screen.getByRole('button', { name: 'AutoComplete+ Vital Signs' })).toHaveClass(
      'btn-ac-inline--sharp'
    );
  });

  it('memberi shadow pada teks Gejala/Keluhan', () => {
    const css = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/style.css'), 'utf8');
    const symptomTextRule = css.match(
      /\.neu-textarea--symptom,\s*\.neu-textarea--symptom \.neu-textarea__animated-copy\s*\{(?<body>[^}]+)\}/
    )?.groups?.body;
    const symptomPlaceholderRule = css.match(
      /\.neu-textarea--symptom::placeholder\s*\{(?<body>[^}]+)\}/
    )?.groups?.body;

    expect(symptomTextRule).toContain('text-shadow:');
    expect(symptomTextRule).toContain('color: rgba(210, 222, 216, 0.78);');
    expect(symptomTextRule).toContain('font-weight: 500;');
    expect(symptomPlaceholderRule).toContain('color: rgba(210, 222, 216, 0.68);');
    expect(symptomTextRule).not.toContain('color: var(--text-input);');
    expect(symptomPlaceholderRule).not.toContain('color: var(--text-input);');
  });

  it('menampilkan konteks RME tanpa prefix debug mentah', () => {
    render(
      <TTVInferenceUI
        patientName="Ny. Sari"
        patientGender="P"
        patientAge={31}
        patientRM="RM-031"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk="Trimester perlu dikonfirmasi"
        extractedAllergies={['Makanan', 'Debu']}
      />
    );

    const allergyGroup = screen.getByText('Riwayat Alergi').closest('.form-group');
    const pregnancyGroup = screen.getByText('Status Kehamilan').closest('.form-group');

    expect(allergyGroup).not.toBeNull();
    expect(pregnancyGroup).not.toBeNull();
    expect(allergyGroup?.querySelector('.field-context-note')).toHaveTextContent('Makanan, Debu');
    expect(pregnancyGroup?.querySelector('.field-context-note')).toHaveTextContent(
      'Trimester perlu dikonfirmasi'
    );
    expect(allergyGroup?.querySelector('.field-context-note')?.textContent).not.toContain('RME:');
    expect(pregnancyGroup?.querySelector('.field-context-note')?.textContent).not.toContain('RME:');
  });

  it('lets the pregnancy risk indicator wrap below the label instead of overlapping it', () => {
    render(
      <TTVInferenceUI
        patientName="Ny. Sari"
        patientGender="P"
        patientAge={31}
        patientRM="RM-031"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk="Trimester perlu dikonfirmasi"
        extractedAllergies={['Makanan', 'Debu']}
      />
    );

    const label = screen.getByText('Status Kehamilan');
    const header = label.closest('.form-group-header');
    expect(header).toHaveClass('form-group-header--wrap');
    expect(within(header as HTMLElement).getByText('risiko terdeteksi')).toBeInTheDocument();

    const css = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/style.css'), 'utf8');
    expect(css).toMatch(/\.form-group-header--wrap\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).toMatch(
      /\.form-group-header--wrap\s+\.field-extracted-indicator[^{]*\{[^}]*flex-shrink:\s*0/
    );
    expect(css).toMatch(/\.form-group--inline\s+\.form-group-header--wrap\s*\{[^}]*row-gap:\s*2px/);
  });

  it('memberi jarak horizontal khusus antar kolom vital sign', () => {
    render(
      <TTVInferenceUI
        patientName="Tn. Budi"
        patientGender="L"
        patientAge={45}
        patientRM="RM-001"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
      />
    );

    expect(screen.getByLabelText('T/D').closest('.vitals-grid')).toHaveClass(
      'vitals-grid--spaced-columns'
    );
  });

  it('menampilkan GCS dan T/D gabungan sebagai kolom vital awal', () => {
    render(
      <TTVInferenceUI
        patientName="Tn. Budi"
        patientGender="L"
        patientAge={45}
        patientRM="RM-001"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
      />
    );

    expect(screen.getByLabelText('GCS')).toBeInTheDocument();
    expect(screen.getByLabelText('T/D')).toBeInTheDocument();
    expect(screen.getByText('T/D :')).toBeInTheDocument();
    expect(screen.queryByText('TD xx/xx')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Sistolik')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Diastolik')).not.toBeInTheDocument();
  });

  it('menyamakan ukuran dan gaya angka vital dengan placeholder Pilih di sini', () => {
    const css = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/style.css'), 'utf8');
    const selectPlaceholderRule = css.match(
      /\.neu-select\.select-prominent--placeholder\s*\{(?<body>[^}]+)\}/
    )?.groups?.body;
    const vitalCenteredRule = css.match(/\.vital-input--centered\s*\{(?<body>[^}]+)\}/)?.groups
      ?.body;
    const tensiVitalRule = css.match(
      /\.vitals-row--tensi \.vital-input--centered\s*\{(?<body>[^}]+)\}/
    )?.groups?.body;

    expect(selectPlaceholderRule).toContain('font-size: 11px;');
    expect(vitalCenteredRule).toContain('font-size: 11px;');
    expect(vitalCenteredRule).toContain('font-weight: 400;');
    expect(vitalCenteredRule).toContain('font-style: italic;');
    expect(vitalCenteredRule).toContain('color: var(--text-muted);');
    expect(tensiVitalRule).not.toContain('font-size: 15px;');
  });

  it('mengoreksi typo suhu pada blur dan memberi severity critical pada vital kritis', () => {
    render(
      <TTVInferenceUI
        patientName="Tn. Budi"
        patientGender="L"
        patientAge={45}
        patientRM="RM-001"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
      />
    );

    fireEvent.change(screen.getByLabelText('Suhu'), { target: { value: '365' } });
    fireEvent.blur(screen.getByLabelText('Suhu'));

    expect(screen.getByLabelText('Suhu')).toHaveValue('36.5');

    fireEvent.change(screen.getByLabelText('Saturasi O₂'), { target: { value: '89' } });
    fireEvent.blur(screen.getByLabelText('Saturasi O₂'));

    expect(screen.getByLabelText('Saturasi O₂')).toHaveAttribute('data-vital-severity', 'critical');
  });

  it('menampilkan hard-stop BP dan memblokir tab Doctor saat tekanan darah tidak valid', () => {
    render(
      <TTVInferenceUI
        patientName="Tn. Budi"
        patientGender="L"
        patientAge={45}
        patientRM="RM-001"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
      />
    );

    fireEvent.change(screen.getByLabelText('T/D'), { target: { value: '80/80' } });
    fireEvent.blur(screen.getByLabelText('T/D'));

    expect(screen.getByRole('alert')).toHaveTextContent('Sistolik harus lebih besar');
    expect(screen.getByRole('button', { name: 'Doctor' })).toBeDisabled();
  });

  it('tidak menampilkan header palsu atau baris ICD sebagai penyakit khusus', () => {
    render(
      <TTVInferenceUI
        patientName="Tn. Budi"
        patientGender="L"
        patientAge={45}
        patientRM="RM-001"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[
          'Warna icdx Penyakit',
          'Warna icdx Penyakit E10 Insulin-dependent diabetes mellitus',
        ]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
      />
    );

    expect(screen.queryByText('Warna icdx Penyakit')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Warna icdx Penyakit E10 Insulin-dependent diabetes mellitus')
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Insulin-dependent diabetes mellitus/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Penyakit Khusus')).not.toBeInTheDocument();
  });

  it('tidak menampilkan opsi disabilitas yang harus dihapus dari dropdown', () => {
    render(
      <TTVInferenceUI
        patientName="Tn. Budi"
        patientGender="L"
        patientAge={45}
        patientRM="RM-001"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
      />
    );

    const disabilityGroup = screen.getByText('Disabilitas').closest('.form-group');
    expect(disabilityGroup).not.toBeNull();

    fireEvent.click(
      within(disabilityGroup as HTMLElement).getByRole('button', { name: 'Pilih di sini' })
    );

    expect(screen.queryByRole('button', { name: 'Intelektual' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Emosi dan Perilaku' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Komunikasi' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Belajar spesifik' })).not.toBeInTheDocument();
  });

  it('menghapus placeholder Pilih di sini dari panel dropdown disabilitas, obesitas, dan skala nyeri', () => {
    render(
      <TTVInferenceUI
        patientName="Tn. Budi"
        patientGender="L"
        patientAge={45}
        patientRM="RM-001"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
      />
    );

    const disabilityGroup = screen.getByText('Disabilitas').closest('.form-group') as HTMLElement;
    fireEvent.click(within(disabilityGroup).getByRole('button', { name: 'Pilih di sini' }));
    expect(
      within(document.getElementById('disabilitas-panel') as HTMLElement).queryByText(
        'Pilih di sini'
      )
    ).not.toBeInTheDocument();

    const obesityGroup = screen.getByText('Obesitas').closest('.form-group') as HTMLElement;
    fireEvent.click(within(obesityGroup).getByRole('button', { name: 'Pilih di sini' }));
    expect(
      within(document.getElementById('obesitas-panel') as HTMLElement).queryByText('Pilih di sini')
    ).not.toBeInTheDocument();

    const painGroup = screen.getByText('Skala Nyeri').closest('.form-group') as HTMLElement;
    fireEvent.click(within(painGroup).getByRole('button', { name: 'Pilih di sini' }));
    expect(
      within(document.getElementById('pain-score-panel') as HTMLElement).queryByText(
        'Pilih di sini'
      )
    ).not.toBeInTheDocument();
  });

  it('membuka dropdown skala nyeri dan mengisi skor terpilih', () => {
    render(
      <TTVInferenceUI
        patientName="Tn. Budi"
        patientGender="L"
        patientAge={45}
        patientRM="RM-001"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
      />
    );

    const painGroup = screen.getByText('Skala Nyeri').closest('.form-group') as HTMLElement;
    const painTrigger = within(painGroup).getByRole('button', { name: 'Pilih di sini' });

    fireEvent.click(painTrigger);
    fireEvent.click(screen.getByRole('button', { name: '4/10' }));

    expect(within(painGroup).getByRole('button')).toHaveTextContent('4/10');
    expect(document.getElementById('pain-score-panel')).not.toBeInTheDocument();
  });

  it('menjaga pasangan selector tetap simetris secara horizontal', () => {
    render(
      <TTVInferenceUI
        patientName="Ny. Sari"
        patientGender="P"
        patientAge={32}
        patientRM="RM-002"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
      />
    );

    const symmetricPairs = [
      ['Riwayat Alergi', 'Status Kehamilan'],
      ['Disabilitas', 'Obesitas'],
      ['AutoSen Preset', 'Skala Nyeri'],
    ] as const;

    for (const [leftLabel, rightLabel] of symmetricPairs) {
      const leftRow = screen.getByText(leftLabel).closest('.form-row-dual');
      const rightRow = screen.getByText(rightLabel).closest('.form-row-dual');

      expect(leftRow).not.toBeNull();
      expect(rightRow).not.toBeNull();
      expect(leftRow).toBe(rightRow);
      expect(leftRow).toHaveClass('form-row-dual--symmetric');
      expect(leftRow?.querySelectorAll(':scope > .form-group')).toHaveLength(2);
    }

    expect(screen.queryByText('Quick selector')).not.toBeInTheDocument();
  });

  it('meminta konfirmasi sebelum menandai hamil di luar rentang usia kehamilan umum', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <TTVInferenceUI
        patientName="Ny. Lansia"
        patientGender="P"
        patientAge={65}
        patientRM="RM-002"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
      />
    );

    fireEvent.change(screen.getByLabelText('Pilih status kehamilan'), {
      target: { value: 'hamil' },
    });

    expect(confirmSpy).toHaveBeenCalledWith(
      'Pasien di luar rentang usia kehamilan umum. Lanjutkan?'
    );
    expect(screen.getByLabelText('Pilih status kehamilan')).toHaveValue('pilih');

    confirmSpy.mockRestore();
  });

  it('mengarah otomatis ke AutoSen ADL Terganggu untuk pasien geriatri', async () => {
    render(
      <TTVInferenceUI
        patientName="Tn. Lansia"
        patientGender="L"
        patientAge={70}
        patientRM="RM-070"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
      />
    );

    const presetGroup = screen.getByText('AutoSen Preset').closest('.form-group') as HTMLElement;

    await waitFor(() =>
      expect(within(presetGroup).getByRole('button')).toHaveTextContent('ADL Terganggu')
    );
  });

  it('mewajibkan konfirmasi status kehamilan pada wanita usia subur dengan gejala sugestif', () => {
    render(
      <TTVInferenceUI
        patientName="Ny. Sari"
        patientGender="P"
        patientAge={25}
        patientRM="RM-025"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
      />
    );

    fireEvent.change(screen.getByLabelText('Keluhan utama pasien'), {
      target: { value: 'Mual muntah dan nyeri perut bawah sejak pagi' },
    });

    expect(screen.getByLabelText('Pilih status kehamilan')).toHaveClass(
      'pregnancy-select--required'
    );
    expect(screen.getByRole('button', { name: 'Doctor' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Pilih status kehamilan'), {
      target: { value: 'tidak_hamil' },
    });

    expect(screen.getByLabelText('Pilih status kehamilan')).not.toHaveClass(
      'pregnancy-select--required'
    );
  });

  it('mewajibkan GDS dan mengunci skala nyeri saat keluhan menunjukkan pasien tidak sadar', () => {
    render(
      <TTVInferenceUI
        patientName="Tn. Gawat"
        patientGender="L"
        patientAge={45}
        patientRM="RM-911"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
      />
    );

    fireEvent.change(screen.getByLabelText('Keluhan utama pasien'), {
      target: { value: 'Pasien koma sejak ditemukan keluarga' },
    });

    const painGroup = screen.getByText('Skala Nyeri').closest('.form-group') as HTMLElement;

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Cek Gula Darah Sewaktu (GDS) segera untuk pasien tidak sadar!'
    );
    expect(screen.getByLabelText('Gula')).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText('Gula')).toHaveAttribute('data-vital-severity', 'blocked');
    expect(within(painGroup).getByRole('button')).toBeDisabled();
    expect(within(painGroup).getByRole('button')).toHaveTextContent(
      'Tidak relevan - Pasien tidak sadar'
    );
    expect(screen.getByRole('button', { name: 'Doctor' })).toBeDisabled();
  });

  it('menambahkan prefix heteroanamnesa saat disabilitas Rungu dipilih', () => {
    render(
      <TTVInferenceUI
        patientName="Tn. Rungu"
        patientGender="L"
        patientAge={45}
        patientRM="RM-045"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
      />
    );

    const disabilityGroup = screen.getByText('Disabilitas').closest('.form-group') as HTMLElement;
    fireEvent.click(within(disabilityGroup).getByRole('button', { name: 'Pilih di sini' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rungu' }));

    expect(screen.getByLabelText('Keluhan utama pasien')).toHaveValue(
      'Heteroanamnesa (dari pengantar): '
    );
  });

  it('menampilkan tiga tab bawah untuk Uplink, Doctor, dan Trajectory', async () => {
    const onSentraUplink = vi.fn().mockResolvedValue(undefined);
    const onNavigateToTrajectory = vi.fn();
    mockGetOnlineDoctors.mockResolvedValue([
      {
        id: 'doctor-1',
        name: 'dr. Sentra Satu',
        role: 'dokter',
        poli: 'Poli Umum',
        availability_status: 'online',
      },
    ]);
    mockSendConsultToDoctor.mockResolvedValue({ consultId: 'consult-1', eventId: 'event-1' });

    const prefetchedVisits: VisitRecord[] = [
      {
        patient_id: 'RM-001',
        encounter_id: 'enc-1',
        timestamp: '2026-03-25',
        vitals: {
          sbp: 120,
          dbp: 80,
          hr: 88,
          rr: 18,
          temp: 36.8,
          glucose: 110,
        },
        keluhan_utama: 'Demam',
        diagnosa: {
          icd_x: 'I10',
          nama: 'Hipertensi esensial',
        },
        terapi_obat: 'Amlodipine 5 mg',
        dokter_penanganan: 'dr. Sentra Satu',
        perawat_penanganan: 'Ns. Sentra',
        source: 'scrape',
      },
    ];

    render(
      <TTVInferenceUI
        patientName="Tn. Budi"
        patientGender="L"
        patientAge={45}
        patientRM="RM-001"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
        prefetchedVisits={prefetchedVisits}
        onSentraUplink={onSentraUplink}
        onNavigateToTrajectory={onNavigateToTrajectory}
      />
    );

    expect(screen.queryByText('Dokter Online')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Kirim konsultasi ke dokter' })
    ).not.toBeInTheDocument();
    expect(mockGetOnlineDoctors).not.toHaveBeenCalled();
    for (const actionName of ['Uplink', 'Doctor', 'Trajectory']) {
      expect(screen.getByRole('button', { name: actionName })).toHaveAttribute(
        'data-sound',
        'button5.mp3'
      );
    }

    fireEvent.change(screen.getByLabelText('Keluhan utama pasien'), {
      target: { value: 'Demam' },
    });
    fireEvent.change(screen.getByLabelText('T/D'), { target: { value: '120/80' } });
    fireEvent.change(screen.getByLabelText('Nadi'), { target: { value: '90' } });
    fireEvent.change(screen.getByLabelText('Pernafasan'), { target: { value: '18' } });
    fireEvent.change(screen.getByLabelText('Suhu'), { target: { value: '37.2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Trajectory' }));
    expect(onNavigateToTrajectory).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Uplink' }));

    await waitFor(() => expect(onSentraUplink).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockPlaySound).toHaveBeenCalledWith('message.mp3'));
    expect(mockSendConsultToDoctor).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Doctor' }));

    await waitFor(() => expect(mockGetOnlineDoctors).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockSendConsultToDoctor).toHaveBeenCalledTimes(1));
    expect(mockSendConsultToDoctor).toHaveBeenCalledWith(
      expect.objectContaining({
        target_doctor_id: 'doctor-1',
        keluhan_utama: 'Demam',
        patient: expect.objectContaining({
          name: 'Tn. Budi',
          gender: 'L',
          age: 45,
          rm: 'RM-001',
        }),
        ttv: expect.objectContaining({
          sbp: '120',
          dbp: '80',
          hr: '90',
          rr: '18',
          temp: '37.2',
        }),
        visit_history: expect.arrayContaining([
          expect.objectContaining({
            encounter_id: 'enc-1',
            diagnosa: { icd_x: 'I10', nama: 'Hipertensi esensial' },
          }),
        ]),
      })
    );
  });

  it('menampilkan teks scramble pada tombol Uplink selama proses auto RME berjalan', async () => {
    let resolveUplink: (() => void) | undefined;
    const onSentraUplink = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveUplink = resolve;
        })
    );

    render(
      <TTVInferenceUI
        patientName="Tn. Budi"
        patientGender="L"
        patientAge={45}
        patientRM="RM-001"
        patientBPJSStatus="aktif"
        extractedSpecialConditions={[]}
        extractedPregnancyRisk=""
        extractedAllergies={[]}
        onSentraUplink={onSentraUplink}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Uplink' }));

    await waitFor(() => expect(onSentraUplink).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Uplink' }).textContent).not.toBe('Uplink');

    if (resolveUplink) {
      resolveUplink();
    }

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Uplink' })).toHaveTextContent('UPLINKED')
    );
  });

  describe('MIRA differential on the consult', () => {
    const MIRA_DIFFERENTIAL = {
      engine: 'MIRA' as const,
      generated_at: '2026-10-04T08:00:00.000Z',
      items: [
        {
          rank: 1,
          icd10: 'J18.9',
          nama: 'Pneumonia',
          confidence: 0.7,
          cannot_miss: false,
          rationale: 'Demam; ronki',
        },
      ],
      next_best_actions: [],
      missing_information: [],
    };

    async function sendConsult(
      getMiraDifferential: () => Promise<typeof MIRA_DIFFERENTIAL | null>
    ) {
      mockGetOnlineDoctors.mockResolvedValue([
        {
          id: 'doctor-1',
          name: 'dr. Sentra Satu',
          role: 'dokter',
          poli: 'Poli Umum',
          availability_status: 'online',
        },
      ]);
      mockSendConsultToDoctor.mockResolvedValue({ consultId: 'consult-1', eventId: 'event-1' });
      render(
        <TTVInferenceUI
          patientName="Tn. Budi"
          patientGender="L"
          patientAge={45}
          patientRM="RM-001"
          patientBPJSStatus="aktif"
          extractedSpecialConditions={[]}
          extractedPregnancyRisk=""
          extractedAllergies={[]}
          getMiraDifferential={getMiraDifferential}
        />
      );
      fireEvent.change(screen.getByLabelText('Keluhan utama pasien'), {
        target: { value: 'Demam' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Doctor' }));
      await waitFor(() => expect(mockSendConsultToDoctor).toHaveBeenCalledTimes(1));
      return mockSendConsultToDoctor.mock.calls[0][0];
    }

    it('sends the MIRA differential of the active encounter with the consult', async () => {
      mockSendConsultToDoctor.mockClear();
      const getMiraDifferential = vi.fn(async () => MIRA_DIFFERENTIAL);

      const payload = await sendConsult(getMiraDifferential);

      expect(getMiraDifferential).toHaveBeenCalledTimes(1);
      expect(payload.mira_differential).toEqual(MIRA_DIFFERENTIAL);
    });

    it('still sends the consult, without a differential, when the background cannot answer', async () => {
      mockSendConsultToDoctor.mockClear();

      const payload = await sendConsult(async () => {
        throw new Error('no receiver');
      });

      expect(payload).not.toHaveProperty('mira_differential');
    });
  });
});
