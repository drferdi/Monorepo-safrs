import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FindingStep, findingSummary } from './FindingStep';

describe('FindingStep', () => {
  it('summarises the first four signals and counts the rest', () => {
    expect(findingSummary(['Pusing', 'Demam', 'Batuk', 'Sesak', 'Mual', 'Lemas'])).toBe('Pusing · Demam · Batuk · Sesak · +2');
    expect(findingSummary([])).toBe('belum ada sinyal');
  });

  it('renders the clinical signals as chips under the Temuan heading', () => {
    render(<FindingStep complaintSummary="nyeri kepala, tengkuk kaku" secondaryComplaint="" allergySummary="Tidak ada alergi" chronicDiagnosisSummary="Hipertensi" />);
    expect(screen.getByRole('heading', { name: 'Temuan' })).toBeInTheDocument();
    expect(screen.getByText('Pusing')).toHaveClass('diagnosis-chip');
    expect(screen.getByText('Hipertensi')).toHaveClass('diagnosis-chip');
  });
});
