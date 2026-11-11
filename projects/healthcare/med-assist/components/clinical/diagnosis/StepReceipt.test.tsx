import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StepGhost, StepReceipt } from './StepReceipt';

describe('StepReceipt', () => {
  it('shows the done step in one line and reopens on "ubah"', () => {
    const onReopen = vi.fn();
    render(<StepReceipt step={{ key: 'finding', index: 1, label: 'Temuan', done: true }} summary="nyeri kepala · TD 168/102" onReopen={onReopen} />);
    const line = screen.getByTestId('dx-flow-receipt-finding');
    expect(line).toHaveTextContent('Temuan');
    expect(line).toHaveTextContent('nyeri kepala · TD 168/102');
    fireEvent.click(screen.getByRole('button', { name: 'ubah Temuan' }));
    expect(onReopen).toHaveBeenCalledTimes(1);
  });

  it('renders a ghost line that is not interactive', () => {
    render(<StepGhost step={{ key: 'rme', index: 4, label: 'RME', done: false }} />);
    const ghost = screen.getByTestId('dx-flow-ghost-rme');
    expect(ghost).toHaveTextContent('4 · RME');
    expect(ghost).toHaveAttribute('aria-hidden', 'true');
    expect(ghost.querySelector('button')).toBeNull();
  });
});
