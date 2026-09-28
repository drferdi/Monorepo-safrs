import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReasonTimeline } from './ReasonTimeline';

const groups = [
  { key: 'supports', title: 'Mendukung', items: ['Batuk', 'Demam'] },
  { key: 'against', title: 'Menentang', items: [] },
  { key: 'missing', title: 'Data kurang', items: ['Auskultasi'] },
  { key: 'review', title: 'Catatan', items: ['Review faring'] },
];

describe('ReasonTimeline', () => {
  it('renders one timeline entry per non-empty group, in order, with its items and no count', () => {
    render(<ReasonTimeline groups={groups} />);
    const list = screen.getByRole('list', { name: 'Alasan' });
    const entries = within(list).getAllByRole('listitem').filter((item) => item.parentElement === list);
    expect(entries.map((entry) => entry.querySelector('.diagnosis-list-title')?.textContent)).toEqual([
      'Mendukung',
      'Data kurang',
      'Catatan',
    ]);
    expect(within(entries[0]).getByText('Batuk')).toHaveClass('diagnosis-row-meta');
    expect(within(entries[0]).getByText('Demam')).toBeInTheDocument();
    expect(within(entries[1]).getByText('Auskultasi')).toBeInTheDocument();
    // The card's tally row carries the counts; the timeline does not repeat them.
    entries.forEach((entry) => expect(entry.querySelector('.ttv-label')).toBeNull());
  });

  it('gives every entry an icon node and joins the entries with a line, none after the last', () => {
    render(<ReasonTimeline groups={groups} />);
    const list = screen.getByRole('list', { name: 'Alasan' });
    expect(list.querySelectorAll('.dx-timeline__node svg')).toHaveLength(3);
    expect(list.querySelectorAll('.dx-timeline__line')).toHaveLength(2);
    const entries = [...list.children];
    expect(entries[2].querySelector('.dx-timeline__line')).toBeNull();
  });

  it('drops blank items and renders nothing when every group is empty', () => {
    const { container } = render(<ReasonTimeline groups={[{ key: 'supports', title: 'Mendukung', items: ['  '] }]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a footer after the entries, inside the opening panel', () => {
    const onClick = vi.fn();
    render(
      <ReasonTimeline
        groups={groups}
        footer={
          <button type="button" onClick={onClick}>
            Apa yang perlu diperiksa →
          </button>
        }
      />
    );
    const list = screen.getByRole('list', { name: 'Alasan' });
    const footer = screen.getByRole('button', { name: 'Apa yang perlu diperiksa →' });
    expect(list.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(list.parentElement).toContainElement(footer);
    fireEvent.click(footer);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
