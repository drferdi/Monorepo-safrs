import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SafetyStrip } from './SafetyStrip';

describe('SafetyStrip', () => {
  it('renders nothing without danger signs or triage', () => {
    const { container } = render(<SafetyStrip safetyItems={[]} triage={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows danger signs with no triage result, uncapped, behind one "lihat"', () => {
    const items = ['SpO2 < 90%', 'Nyeri dada', 'Kejang', 'Sesak berat'];
    render(<SafetyStrip safetyItems={items} triage={null} />);
    expect(screen.getByText('⚠ 4 tanda bahaya')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'lihat' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('highlights a referral and folds its reasons behind "alasan"', () => {
    render(
      <SafetyStrip
        safetyItems={[]}
        triage={{ outcome: 'refer', headline: 'Rujuk ke RS', tone: 'danger', firedCriteria: ['TD > 180'], referralGuidance: '1. Bawa hasil EKG' }}
      />
    );
    const line = screen.getByTestId('dx-flow-triage');
    expect(line).toHaveAttribute('data-tone', 'danger');
    expect(line).toHaveTextContent('Rujuk: Rujuk ke RS');
    fireEvent.click(screen.getByRole('button', { name: 'alasan' }));
    expect(screen.getByText('TD > 180')).toBeInTheDocument();
    expect(screen.getByText('Bawa hasil EKG')).toBeInTheDocument();
  });

  it('reads "Triase:" for a non-referral outcome', () => {
    render(<SafetyStrip safetyItems={[]} triage={{ outcome: 'treat_locally', headline: 'Dapat ditangani di layanan primer', tone: 'primary', firedCriteria: [], referralGuidance: null }} />);
    expect(screen.getByTestId('dx-flow-triage')).toHaveTextContent('Triase: Dapat ditangani di layanan primer');
    expect(screen.queryByRole('button', { name: 'alasan' })).toBeNull();
  });
});
