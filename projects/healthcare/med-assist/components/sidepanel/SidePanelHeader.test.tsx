import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../ui/ThemeToggle', () => ({
  default: () => <div data-testid="theme-toggle" />,
}));

vi.mock('./MiraStatusDot', () => ({
  MiraStatusDot: () => null,
}));

vi.mock('@/utils/messaging', () => ({
  sendMessage: vi.fn(async () => ({ state: 'ready', checkedAt: 't' })),
}));

import { sendMessage } from '@/utils/messaging';

import { SidePanelHeader } from './SidePanelHeader';

describe('SidePanelHeader patient strip', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(sendMessage).mockClear();
  });

  it('renders MEDLENS as the third engine tab instead of SETTING', () => {
    render(
      <SidePanelHeader
        activeEngine="medlens"
        onEngineChange={vi.fn()}
        patientName="Chief"
        patientAge={40}
        patientRM="RM-1"
        patientGender="L"
      />
    );

    expect(screen.getByRole('tab', { name: 'MEDLENS' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('tab', { name: 'SETTING' })).not.toBeInTheDocument();
  });

  it('renders TRIAGE instead of CODE RED as the emergency tab label', () => {
    render(
      <SidePanelHeader
        activeEngine="vs"
        onEngineChange={vi.fn()}
        patientName="Chief"
        patientAge={40}
        patientRM="RM-1"
        patientGender="L"
      />
    );

    expect(screen.getByRole('tab', { name: 'TRIAGE' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'CODE RED' })).not.toBeInTheDocument();
  });

  it('applies the merah modifier class and shows a dot for zone merah', () => {
    render(
      <SidePanelHeader
        activeEngine="vs"
        onEngineChange={vi.fn()}
        patientName="Chief"
        patientAge={40}
        patientRM="RM-1"
        patientGender="L"
        triageZone="merah"
      />
    );

    const tab = screen.getByRole('tab', { name: /TRIAGE/ });
    expect(tab.className).toContain('engine-btn--triage-merah');
  });

  it('shows no modifier class and no dot for standby zone', () => {
    render(
      <SidePanelHeader
        activeEngine="vs"
        onEngineChange={vi.fn()}
        patientName="Chief"
        patientAge={40}
        patientRM="RM-1"
        patientGender="L"
        triageZone="standby"
      />
    );

    const tab = screen.getByRole('tab', { name: 'TRIAGE' });
    expect(tab.className).not.toContain('engine-btn--triage');
    expect(tab.querySelector('.engine-tab-dot')).toBeNull();
  });

  it('matches patient identity font size to START engine tab typography', () => {
    const css = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/style.css'), 'utf8');
    const engineTabRule = css.match(/\.engine-btn\.engine-tab\s*\{(?<body>[^}]+)\}/)?.groups?.body;
    const identityRule = css.match(/\.card-header \.patient-field--identity\s*\{(?<body>[^}]+)\}/)
      ?.groups?.body;

    expect(engineTabRule).toContain('font-size: 10px;');
    expect(identityRule).toContain('font-size: 11px;');
  });

  it('keeps patient identity grid height fixed so it does not open and close', () => {
    const css = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/style.css'), 'utf8');
    const patientBarRule = css.match(/\.card-header \.patient-bar\s*\{(?<body>[^}]+)\}/)?.groups
      ?.body;
    const historySlotRule = css.match(/\.card-header \.patient-cell--history\s*\{(?<body>[^}]+)\}/)
      ?.groups?.body;

    expect(patientBarRule).toContain('display: grid;');
    expect(patientBarRule).toContain(
      'grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.85fr) minmax(0, 2fr);'
    );
    expect(patientBarRule).toContain('grid-template-rows: 20px 20px;');
    expect(patientBarRule).toContain('height: 60px;');
    expect(patientBarRule).toContain('min-height: 60px;');
    expect(patientBarRule).toContain('max-height: 60px;');
    expect(patientBarRule).toContain('overflow: hidden;');
    expect(historySlotRule).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));');
  });

  it('uses the two-line identity layout and keeps visit history dark before patient data loads', () => {
    const { rerender } = render(
      <SidePanelHeader
        activeEngine="vs"
        onEngineChange={vi.fn()}
        patientName="---"
        patientAge={0}
        chronicHistorySummary="DM"
        previousVisitSections={[
          {
            key: 'stale',
            title: 'Kunjungan Lama',
            rows: [{ label: 'Diagnosa', value: 'HIPERTENSI' }],
          },
        ]}
      />
    );

    expect(screen.queryByText('DM')).not.toBeInTheDocument();
    const emptyHistoryButton = screen.getByRole('button', { name: /RIWAYAT KUNJUNGAN PASIEN/i });
    expect(emptyHistoryButton).toBeDisabled();
    expect(emptyHistoryButton).toHaveClass('patient-history-trigger--disabled');
    expect(emptyHistoryButton).not.toHaveClass('active');

    rerender(
      <SidePanelHeader
        activeEngine="vs"
        onEngineChange={vi.fn()}
        patientName="DAVID AFENDES -"
        patientAge={36}
        patientRM="83206"
        patientGender="L"
        patientFacilityName="Puskesmas Balowerti"
        chronicHistorySummary="DM, HIPERTENSI, SKIZOFREN, CHF, CKD, ASMA, EXTRA"
        previousVisitSections={[
          {
            key: 'latest',
            title: 'Kunjungan Terakhir',
            rows: [{ label: 'Diagnosa', value: 'HIPERTENSI' }],
          },
        ]}
      />
    );

    const nameCell = screen.getByText('DAVID AFENDES -');
    expect(nameCell).toHaveClass('patient-field--identity');
    expect(nameCell).toHaveAttribute('title', expect.stringContaining('83206'));
    expect(nameCell).toHaveAttribute('title', expect.stringContaining('Puskesmas Balowerti'));
    expect(screen.getByText('36 tahun')).toBeInTheDocument();
    expect(screen.getByText('Sex: L')).toBeInTheDocument();
    for (const history of ['DM', 'HIPERTENSI', 'SKIZOFREN', 'CHF', 'CKD', 'ASMA']) {
      expect(screen.getByText(history)).toBeInTheDocument();
    }
    expect(screen.queryByText('EXTRA')).not.toBeInTheDocument();
    const readyHistoryButton = screen.getByRole('button', { name: /RIWAYAT KUNJUNGAN PASIEN/i });
    expect(readyHistoryButton).toHaveClass('active');
    expect(readyHistoryButton).not.toBeDisabled();
  });

  it('does not render patient identity and visit history sections on the MedLens tab', () => {
    const { container } = render(
      <SidePanelHeader
        activeEngine="medlens"
        onEngineChange={vi.fn()}
        patientName="DAVID AFENDES -"
        patientAge={36}
        patientRM="83206"
        patientGender="L"
        chronicHistorySummary="DM, HIPERTENSI"
        previousVisitSections={[
          {
            key: 'latest',
            title: 'Kunjungan Terakhir',
            rows: [{ label: 'Diagnosa', value: 'HIPERTENSI' }],
          },
        ]}
      />
    );

    expect(container.querySelector('.patient-bar')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /RIWAYAT KUNJUNGAN PASIEN/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('DAVID AFENDES -')).not.toBeInTheDocument();
    expect(screen.queryByText('HIPERTENSI')).not.toBeInTheDocument();
  });

  it('can hide the patient summary strip while keeping visit history access available', () => {
    const { container } = render(
      <SidePanelHeader
        activeEngine="vs"
        onEngineChange={vi.fn()}
        patientName="DAVID AFENDES -"
        patientAge={36}
        patientRM="83206"
        patientGender="L"
        chronicHistorySummary="DM, HIPERTENSI"
        previousVisitSections={[
          {
            key: 'latest',
            title: 'Kunjungan Terakhir',
            rows: [{ label: 'Diagnosa', value: 'HIPERTENSI' }],
          },
        ]}
        showPatientSummary={false}
      />
    );

    expect(container.querySelector('.patient-bar')).not.toBeInTheDocument();
    expect(screen.queryByText('DAVID AFENDES -')).not.toBeInTheDocument();
    expect(screen.queryByText('36 tahun')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /RIWAYAT KUNJUNGAN PASIEN/i })).toBeInTheDocument();
  });

  it('can hide visit history access together with the trajectory patient strip', () => {
    const { container } = render(
      <SidePanelHeader
        activeEngine="vs"
        onEngineChange={vi.fn()}
        patientName="DAVID AFENDES -"
        patientAge={36}
        patientRM="83206"
        patientGender="L"
        chronicHistorySummary="DM, HIPERTENSI"
        previousVisitSections={[
          {
            key: 'latest',
            title: 'Kunjungan Terakhir',
            rows: [{ label: 'Diagnosa', value: 'HIPERTENSI' }],
          },
        ]}
        showPatientSummary={false}
        showVisitHistoryTrigger={false}
      />
    );

    expect(container.querySelector('.patient-bar')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /RIWAYAT KUNJUNGAN PASIEN/i })
    ).not.toBeInTheDocument();
  });

  it('routes TRAJECTORY to the supplied clinical trajectory action', () => {
    const onOpenDashboard = vi.fn();
    const onOpenDiagnosis = vi.fn();
    const onOpenStats = vi.fn();

    render(
      <SidePanelHeader
        activeEngine="vs"
        onEngineChange={vi.fn()}
        onOpenDashboard={onOpenDashboard}
        onOpenDiagnosis={onOpenDiagnosis}
        onOpenStats={onOpenStats}
      />
    );

    expect(screen.getByRole('button', { name: /TRAJECTORY/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /DIAGNOSIS/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^STATS$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^DASHBOARD$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /TRAJECTORY/i }));

    expect(onOpenDashboard).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /DIAGNOSIS/i }));

    expect(onOpenDiagnosis).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /^STATS$/i }));

    expect(onOpenStats).toHaveBeenCalledTimes(1);
  });

  it('keeps TRAJECTORY navigation available when doctor is online', () => {
    const onOpenDashboard = vi.fn();

    render(
      <SidePanelHeader
        activeEngine="vs"
        onEngineChange={vi.fn()}
        doctorOnlineCount={2}
        onOpenDashboard={onOpenDashboard}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /TRAJECTORY/i }));

    expect(onOpenDashboard).toHaveBeenCalledTimes(1);
  });

  it('renders up to 2 vital warning slots in the middle column', () => {
    render(
      <SidePanelHeader
        activeEngine="vs"
        onEngineChange={vi.fn()}
        patientName="Ferdi Iskandar"
        patientAge={45}
        patientGender="L"
        patientRM="RM-0099"
        patientFacilityName="Puskesmas Balowerti"
        vitalWarnings={[
          { label: 'TD', value: '180/110' },
          { label: 'Suhu', value: '39.2' },
        ]}
      />
    );

    expect(screen.getByText(/TD 180\/110/)).toBeInTheDocument();
    expect(screen.getByText(/Suhu 39.2/)).toBeInTheDocument();
  });

  it('renders no warning text when vitalWarnings is empty', () => {
    render(
      <SidePanelHeader
        activeEngine="vs"
        onEngineChange={vi.fn()}
        patientName="Ferdi Iskandar"
        patientAge={45}
        patientGender="L"
        patientRM="RM-0099"
        patientFacilityName="Puskesmas Balowerti"
        vitalWarnings={[]}
      />
    );

    expect(screen.queryByText(/TD /)).not.toBeInTheDocument();
  });

  it('moves RM and facility into the name tooltip instead of a visible cell', () => {
    render(
      <SidePanelHeader
        activeEngine="vs"
        onEngineChange={vi.fn()}
        patientName="Ferdi Iskandar"
        patientAge={45}
        patientGender="L"
        patientRM="RM-0099"
        patientFacilityName="Puskesmas Balowerti"
      />
    );

    const nameCell = screen.getByTitle(/RM-0099/);
    expect(nameCell).toHaveTextContent('Ferdi Iskandar');
    expect(screen.queryByText('RM-0099')).not.toBeInTheDocument();
  });

  it('asks the background to ensure MIRA once on mount', () => {
    vi.stubEnv('SENTRA_DIAGNOSIS_ENGINE', 'mira');
    const { rerender } = render(<SidePanelHeader activeEngine="vs" onEngineChange={vi.fn()} />);

    rerender(<SidePanelHeader activeEngine="vs" onEngineChange={vi.fn()} />);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith('miraEnsure', undefined);
  });

  it('does not ask in legacy mode', () => {
    vi.stubEnv('SENTRA_DIAGNOSIS_ENGINE', 'legacy');
    render(<SidePanelHeader activeEngine="vs" onEngineChange={vi.fn()} />);

    expect(sendMessage).not.toHaveBeenCalled();
  });
});
