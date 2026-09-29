import { fireEvent, render, screen, within } from '@testing-library/react';
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
  { key: 'a', text: 'Patuhi obat setiap hari.' },
  { key: 'b', text: 'Diet rendah garam.' },
  { key: 'c', text: 'Kontrol bila sesak.' },
];

const top = () => {
  const card = screen.getAllByTestId('dx-edu-card').find((c) => c.getAttribute('data-top') === 'true');
  if (!card) throw new Error('no top card');
  return card;
};

describe('EducationDeck', () => {
  it('shows the first point on top with its place in the deck', () => {
    render(<EducationDeck items={items} onGive={vi.fn()} />);
    expect(screen.getAllByTestId('dx-edu-card')).toHaveLength(3);
    expect(top()).toHaveTextContent('Patuhi obat setiap hari.');
    expect(top()).toHaveTextContent('01 / 03');
  });

  it('"Berikan" gives the top point', () => {
    const onGive = vi.fn();
    render(<EducationDeck items={items} onGive={onGive} />);
    fireEvent.click(screen.getByRole('button', { name: 'Berikan' }));
    expect(onGive).toHaveBeenCalledWith('a');
  });

  it('"Lewati" moves the top point to the back and gives nothing', () => {
    const onGive = vi.fn();
    render(<EducationDeck items={items} onGive={onGive} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lewati' }));
    expect(onGive).not.toHaveBeenCalled();
    expect(top()).toHaveTextContent('Diet rendah garam.');
    expect(top()).toHaveTextContent('01 / 03');
    const skipped = screen.getAllByTestId('dx-edu-card').find((c) => c.textContent?.includes('Patuhi obat setiap hari.'));
    expect(skipped).toHaveTextContent('03 / 03');
  });

  it('ArrowRight on the deck gives the top point, ArrowLeft skips it', () => {
    const onGive = vi.fn();
    render(<EducationDeck items={items} onGive={onGive} />);
    const deck = screen.getByTestId('dx-tx-education-deck');
    fireEvent.keyDown(deck, { key: 'ArrowLeft' });
    expect(top()).toHaveTextContent('Diet rendah garam.');
    fireEvent.keyDown(deck, { key: 'ArrowRight' });
    expect(onGive).toHaveBeenLastCalledWith('b');
  });

  it('drops a point that is no longer offered and appends a new one at the back', () => {
    const { rerender } = render(<EducationDeck items={items} onGive={vi.fn()} />);
    rerender(<EducationDeck items={items.slice(1)} onGive={vi.fn()} />);
    expect(screen.getAllByTestId('dx-edu-card')).toHaveLength(2);
    expect(top()).toHaveTextContent('Diet rendah garam.');
    expect(top()).toHaveTextContent('01 / 02');
    rerender(<EducationDeck items={[...items.slice(1), { key: 'd', text: 'Minum cukup.' }]} onGive={vi.fn()} />);
    const last = screen.getAllByTestId('dx-edu-card').find((c) => c.textContent?.includes('Minum cukup.'));
    expect(last).toHaveTextContent('03 / 03');
    expect(within(screen.getByTestId('dx-tx-education-deck')).queryByText('Patuhi obat setiap hari.')).toBeNull();
  });

  it('a double-click on "Berikan" gives one point only', () => {
    const onGive = vi.fn();
    render(<EducationDeck items={items} onGive={onGive} />);
    const button = screen.getByRole('button', { name: 'Berikan' });
    fireEvent.click(button, { detail: 1 });
    fireEvent.click(button, { detail: 2 });
    expect(onGive).toHaveBeenCalledTimes(1);
  });

  it('renders no flying copy under reduced motion', () => {
    render(<EducationDeck items={items} onGive={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Berikan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lewati' }));
    expect(screen.queryByTestId('dx-edu-flying')).toBeNull();
  });

  it('ignores a held key, so holding ArrowRight gives one point only', () => {
    const onGive = vi.fn();
    render(<EducationDeck items={items} onGive={onGive} />);
    const deck = screen.getByTestId('dx-tx-education-deck');
    fireEvent.keyDown(deck, { key: 'ArrowRight' });
    fireEvent.keyDown(deck, { key: 'ArrowRight', repeat: true });
    expect(onGive).toHaveBeenCalledTimes(1);
  });

  it('with one card left, skipping does nothing and "Lewati" is disabled', () => {
    render(<EducationDeck items={items.slice(0, 1)} onGive={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Lewati' })).toBeDisabled();
    fireEvent.keyDown(screen.getByTestId('dx-tx-education-deck'), { key: 'ArrowLeft' });
    expect(top()).toHaveTextContent('01 / 01');
  });

  it('when the last point is given the deck is gone and focus goes to onExhausted', () => {
    const onExhausted = vi.fn();
    const { rerender } = render(<EducationDeck items={items.slice(0, 1)} onGive={vi.fn()} onExhausted={onExhausted} />);
    screen.getByRole('button', { name: 'Berikan' }).focus();
    rerender(<EducationDeck items={[]} onGive={vi.fn()} onExhausted={onExhausted} />);
    expect(screen.queryByTestId('dx-tx-education-deck')).toBeNull();
    expect(onExhausted).toHaveBeenCalledTimes(1);
  });

  it('does not call onExhausted when focus was elsewhere', () => {
    const onExhausted = vi.fn();
    const { rerender } = render(<EducationDeck items={items.slice(0, 1)} onGive={vi.fn()} onExhausted={onExhausted} />);
    rerender(<EducationDeck items={[]} onGive={vi.fn()} onExhausted={onExhausted} />);
    expect(onExhausted).not.toHaveBeenCalled();
  });

  it('hides cards beyond the third', () => {
    const many = ['1', '2', '3', '4', '5'].map((key) => ({ key, text: `Poin ${key}` }));
    render(<EducationDeck items={many} onGive={vi.fn()} />);
    expect(screen.getAllByTestId('dx-edu-card').map((c) => c.getAttribute('data-hidden'))).toEqual([
      'false',
      'false',
      'false',
      'true',
      'true',
    ]);
  });
});
