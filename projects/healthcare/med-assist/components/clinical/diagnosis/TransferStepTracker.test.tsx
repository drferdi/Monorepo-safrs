import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { DiagnosisPageViewModel } from './diagnosisViewModel';
import { TransferStepTracker, resolveStepMark } from './TransferStepTracker';

type Step = DiagnosisPageViewModel['transfer']['steps'][number];

const step = (key: string, state: string): Step => ({
  key,
  label: key,
  state,
  detail: 'ok:0 fail:0 skip:0',
  reason: null,
  message: null,
});

describe('resolveStepMark', () => {
  it.each([
    ['success', 'done'],
    ['failed', 'failed'],
    ['error', 'failed'],
    ['running', 'running'],
    ['skipped', 'skipped'],
    ['cancelled', 'skipped'],
    ['idle', 'waiting'],
    ['pending', 'waiting'],
    ['ready', 'waiting'],
    ['unknown', 'waiting'],
  ])('%s -> %s', (state, mark) => expect(resolveStepMark(state)).toBe(mark));
});

describe('TransferStepTracker', () => {
  it('marks each node and fills the line up to the last finished step', () => {
    render(
      <TransferStepTracker
        steps={[step('anamnesa', 'success'), step('diagnosa', 'failed'), step('resep', 'idle')]}
      />
    );
    const list = screen.getByRole('list', { name: 'Langkah transfer' });
    expect(list).toHaveAttribute('data-filled', '2');
    const items = Array.from(list.querySelectorAll(':scope > li'));
    expect(items.map((li) => li.getAttribute('data-mark'))).toEqual(['done', 'failed', 'waiting']);
    expect(items[0]).toHaveTextContent('anamnesa');
    expect(items[0]).toHaveTextContent('Berhasil');
  });

  it('renders nothing for an empty step list', () => {
    const { container } = render(<TransferStepTracker steps={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
