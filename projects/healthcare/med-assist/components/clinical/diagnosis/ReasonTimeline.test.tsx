import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReasonTimeline } from './ReasonTimeline';

const groups = [
  { key: 'supports', title: 'Mendukung', items: ['Batuk', 'Demam'] },
  { key: 'against', title: 'Yang tidak mendukung', items: [] },
  { key: 'missing', title: 'Data kurang', items: ['Auskultasi'] },
  { key: 'review', title: 'Catatan', items: ['Review faring'] },
];

describe('ReasonTimeline', () => {
  it('renders one timeline entry per non-empty group, in order, with its count and items', () => {
    render(<ReasonTimeline groups={groups} />);
    const list = screen.getByRole('list', { name: 'Alasan' });
    const entries = within(list).getAllByRole('listitem').filter((item) => item.parentElement === list);
    expect(entries.map((entry) => entry.querySelector('.diagnosis-list-title')?.textContent)).toEqual([
      'Mendukung',
      'Data kurang',
      'Catatan',
    ]);
    expect(entries[0].querySelector('.ttv-label')).toHaveTextContent('2');
    expect(within(entries[0]).getByText('Batuk')).toHaveClass('diagnosis-row-meta');
    expect(within(entries[0]).getByText('Demam')).toBeInTheDocument();
    expect(within(entries[1]).getByText('Auskultasi')).toBeInTheDocument();
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
});
