import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FindingStep, findingSignals, findingSummary } from './FindingStep';

describe('FindingStep', () => {
  it('summarises the first three signals and counts the rest', () => {
    expect(findingSummary(['Pusing', 'Demam', 'Batuk', 'Sesak', 'Mual', 'Lemas'])).toBe('Pusing · Demam · Batuk · +3');
    expect(findingSummary([])).toBe('belum ada sinyal');
  });

  it('renders the clinical signals as chips under the Temuan heading', () => {
    render(<FindingStep complaintSummary="nyeri kepala, tengkuk kaku" secondaryComplaint="" allergySummary="Tidak ada alergi" chronicDiagnosisSummary="Hipertensi" bedsideFindings={[]} />);
    expect(screen.getByRole('heading', { name: 'Temuan' })).toBeInTheDocument();
    expect(screen.getByText('Pusing')).toHaveClass('diagnosis-chip');
    expect(screen.getByText('Hipertensi')).toHaveClass('diagnosis-chip');
  });

  it('puts ticked bedside findings right after the main complaint, inside the three shown', () => {
    const signals = findingSignals({
      complaintSummary: 'demam, batuk, sesak',
      secondaryComplaint: '',
      allergySummary: 'Tidak ada alergi',
      chronicDiagnosisSummary: 'Hipertensi',
      bedsideFindings: [{ kind: 'exam', item: 'Auskultasi paru', findings: ['Ronki basah halus', 'Wheezing'] }],
    });
    expect(signals.slice(0, 3)).toEqual(['Demam', 'Auskultasi paru: Ronki basah halus, Wheezing', 'Batuk']);
    expect(signals.indexOf('Hipertensi')).toBeGreaterThan(2);
  });
});
