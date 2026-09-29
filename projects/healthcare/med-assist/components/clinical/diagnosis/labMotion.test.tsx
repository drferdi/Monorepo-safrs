import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));

import { EducationDeck, throwDirection } from './labMotion';

describe('throwDirection', () => {
  it('throws right or left past 120 px or 400 px/s, the sign from the offset, else springs back', () => {
    expect(throwDirection(121, 0)).toBe(1);
    expect(throwDirection(-121, 0)).toBe(-1);
    expect(throwDirection(40, 500)).toBe(1);
    expect(throwDirection(-40, -500)).toBe(-1);
    expect(throwDirection(40, 100)).toBe(0);
    expect(throwDirection(0, 0)).toBe(0);
  });

  it('takes the sign from the velocity when the offset is 0', () => {
    expect(throwDirection(0, 500)).toBe(1);
    expect(throwDirection(0, -500)).toBe(-1);
  });
});

const items = [
  { key: 'a', text: 'Patuhi obat setiap hari. Jangan berhenti sendiri.', isSelected: false },
  { key: 'b', text: 'Diet rendah garam.', isSelected: false },
  { key: 'c', text: 'Kontrol bila sesak.', isSelected: true },
];

const top = () => {
  const card = screen.getAllByTestId('dx-edu-card').find((c) => c.getAttribute('data-top') === 'true');
  if (!card) throw new Error('no top card');
  return card;
};

// Chief, 2026-09-29: "gunakan design asli motion swipe-deck, cuma isi dengan edukasi pada masing
// masing card, swipe ganti edukasi selanjutnya"; a point is given by the tick on its card.
describe('EducationDeck', () => {
  it('holds every point, the first on top with its number, its first sentence as the title', () => {
    render(<EducationDeck items={items} onToggle={vi.fn()} />);
    expect(screen.getAllByTestId('dx-edu-card')).toHaveLength(3);
    expect(top()).toHaveTextContent('01');
    expect(top().querySelector('.dx-edu-card__title')).toHaveTextContent('Patuhi obat setiap hari.');
    expect(top().querySelector('.dx-edu-card__note')).toHaveTextContent('Jangan berhenti sendiri.');
  });

  it('a swipe either way brings the next point on top and gives nothing', () => {
    const onToggle = vi.fn();
    render(<EducationDeck items={items} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'Geser ke kanan' }));
    expect(top()).toHaveTextContent('Diet rendah garam.');
    expect(top()).toHaveTextContent('02');
    fireEvent.click(screen.getByRole('button', { name: 'Geser ke kiri' }));
    expect(top()).toHaveTextContent('Kontrol bila sesak.');
    fireEvent.keyDown(screen.getByTestId('dx-tx-education-deck'), { key: 'ArrowRight' });
    expect(top()).toHaveTextContent('Patuhi obat setiap hari.');
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('the tick on the top card gives or takes back its point, and shows which are given', () => {
    const onToggle = vi.fn();
    render(<EducationDeck items={items} onToggle={onToggle} />);
    const tick = () => top().querySelector('button.dx-edu-card__tick') as HTMLButtonElement;
    expect(tick()).toHaveAttribute('aria-pressed', 'false');
    expect(tick()).toHaveAccessibleName('Berikan edukasi ini');
    fireEvent.click(tick());
    expect(onToggle).toHaveBeenLastCalledWith('a');
    fireEvent.keyDown(screen.getByTestId('dx-tx-education-deck'), { key: 'ArrowLeft' });
    fireEvent.keyDown(screen.getByTestId('dx-tx-education-deck'), { key: 'ArrowLeft' });
    expect(tick()).toHaveAttribute('aria-pressed', 'true');
    expect(tick()).toHaveAccessibleName('Batalkan edukasi ini');
  });

  it('ignores a held key, so holding ArrowRight moves one card only', () => {
    render(<EducationDeck items={items} onToggle={vi.fn()} />);
    const deck = screen.getByTestId('dx-tx-education-deck');
    fireEvent.keyDown(deck, { key: 'ArrowRight' });
    fireEvent.keyDown(deck, { key: 'ArrowRight', repeat: true });
    expect(top()).toHaveTextContent('Diet rendah garam.');
  });

  it('with one point there is nothing to swipe to', () => {
    render(<EducationDeck items={items.slice(0, 1)} onToggle={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Geser ke kanan' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Geser ke kiri' })).toBeDisabled();
  });

  it('renders no flying copy under reduced motion', () => {
    render(<EducationDeck items={items} onToggle={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Geser ke kanan' }));
    expect(screen.queryByTestId('dx-edu-flying')).toBeNull();
  });

  it('keeps its order when a point changes, and drops or appends points the list drops or adds', () => {
    const { rerender } = render(<EducationDeck items={items} onToggle={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Geser ke kanan' }));
    rerender(<EducationDeck items={items.map((item) => ({ ...item, isSelected: true }))} onToggle={vi.fn()} />);
    expect(top()).toHaveTextContent('Diet rendah garam.');
    rerender(<EducationDeck items={[...items.slice(1), { key: 'd', text: 'Minum cukup.', isSelected: false }]} onToggle={vi.fn()} />);
    expect(screen.getAllByTestId('dx-edu-card')).toHaveLength(3);
    expect(screen.queryByText('Patuhi obat setiap hari.')).toBeNull();
    expect(screen.getAllByTestId('dx-edu-card').at(-1)).toHaveTextContent('Minum cukup.');
  });

  it('hides cards beyond the third', () => {
    const many = ['1', '2', '3', '4', '5'].map((key) => ({ key, text: `Poin ${key}.`, isSelected: false }));
    render(<EducationDeck items={many} onToggle={vi.fn()} />);
    expect(screen.getAllByTestId('dx-edu-card').map((c) => c.getAttribute('data-hidden'))).toEqual([
      'false',
      'false',
      'false',
      'true',
      'true',
    ]);
  });
});
