import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EducationStep, educationSummary } from './EducationStep';

const education = [
  { key: 'a', text: 'Patuhi obat setiap hari.', isSelected: true },
  { key: 'b', text: 'Diet rendah garam.', isSelected: false },
];

describe('EducationStep', () => {
  it('is headed "Edukasi" and lists the points to tick, marking only the given ones', () => {
    const onToggleEducation = vi.fn();
    render(<EducationStep education={education} onToggleEducation={onToggleEducation} onConfirm={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Edukasi' })).toBeInTheDocument();
    const rows = screen.getAllByTestId('dx-flow-education-item');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute('aria-pressed', 'true');
    expect(rows[0]).toHaveTextContent('diberikan');
    expect(rows[1]).toHaveAttribute('aria-pressed', 'false');
    expect(rows[1]).not.toHaveTextContent('diberikan');
    fireEvent.click(rows[1]);
    expect(onToggleEducation).toHaveBeenCalledWith('b');
  });

  it('says so when the knowledge base has no education for the diagnosis, instead of composing any', () => {
    render(<EducationStep education={[]} onToggleEducation={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByTestId('dx-flow-education-item')).toBeNull();
    expect(screen.getByText('Basis pengetahuan belum punya edukasi untuk diagnosis ini.')).toBeInTheDocument();
  });

  it('continues from one "Lanjut", ticked or not', () => {
    const onConfirm = vi.fn();
    render(<EducationStep education={[]} onToggleEducation={vi.fn()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('summarises the receipt by what was given', () => {
    expect(educationSummary(education)).toBe('1 poin diberikan');
    expect(educationSummary([])).toBe('tanpa edukasi');
  });
});
