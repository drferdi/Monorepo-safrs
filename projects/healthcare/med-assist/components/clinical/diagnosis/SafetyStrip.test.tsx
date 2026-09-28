import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SafetyStrip } from './SafetyStrip';

describe('SafetyStrip', () => {
  it('renders nothing without a triage result', () => {
    const { container } = render(<SafetyStrip triage={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('highlights a referral in one line and folds its reasons behind "alasan"', () => {
    render(
      <SafetyStrip
        triage={{ outcome: 'refer', headline: 'Rujuk ke RS', tone: 'danger', firedCriteria: ['TD > 180'], referralGuidance: '1. Bawa hasil EKG' }}
      />
    );
    const line = screen.getByTestId('dx-flow-triage');
    expect(line).toHaveAttribute('data-tone', 'danger');
    expect(line).toHaveClass('ct-v2-danger-text');
    expect(line).toHaveTextContent('Rujuk: Rujuk ke RS');
    expect(screen.queryByText('TD > 180')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'alasan' }));
    expect(screen.getByText('TD > 180')).toBeInTheDocument();
    expect(screen.getByText('Bawa hasil EKG')).toBeInTheDocument();
  });

  it('reads "Triase:" quietly for a non-referral outcome and never lists danger signs', () => {
    render(<SafetyStrip triage={{ outcome: 'treat_locally', headline: 'Dapat ditangani di layanan primer', tone: 'primary', firedCriteria: [], referralGuidance: null }} />);
    const line = screen.getByTestId('dx-flow-triage');
    expect(line).toHaveTextContent('Triase: Dapat ditangani di layanan primer');
    expect(line).toHaveClass('text-muted');
    expect(screen.queryByRole('button', { name: 'alasan' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'lihat' })).toBeNull();
  });
});
