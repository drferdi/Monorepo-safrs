import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  chooseAmbientDelay,
  chooseAmbientPattern,
  ConsoleAmbientLights,
} from './ConsoleAmbientLights';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

describe('ConsoleAmbientLights', () => {
  it('chooses another bounded pattern and a 4–9 second hold', () => {
    for (const previous of [0, 1, 2, 3, 4] as const) {
      for (const sample of [0, 0.25, 0.5, 0.75, 0.999]) {
        expect(chooseAmbientPattern(previous, sample)).not.toBe(previous);
      }
    }
    expect(chooseAmbientDelay(0)).toBe(4000);
    expect(chooseAmbientDelay(1)).toBe(9000);
  });

  it('keeps all three lamps decorative and turns them off during triage', () => {
    const { container, rerender } = render(<ConsoleAmbientLights suspended={false} />);
    const group = container.querySelector('.console-ambient-lights');
    expect(group).toHaveAttribute('aria-hidden', 'true');
    expect(group?.querySelectorAll('.console-ambient-light')).toHaveLength(3);

    rerender(<ConsoleAmbientLights suspended />);
    expect(group).toHaveAttribute('data-pattern', '0');
  });

  it('stops changing when the tab is hidden', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { container } = render(<ConsoleAmbientLights suspended={false} />);
    act(() => vi.advanceTimersByTime(4000));
    const group = container.querySelector('.console-ambient-lights');
    expect(group).toHaveAttribute('data-pattern', '1');

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(group).toHaveAttribute('data-pattern', '0');
    act(() => vi.advanceTimersByTime(10000));
    expect(group).toHaveAttribute('data-pattern', '0');
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  it('keeps every lamp static when motion is reduced', () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })
    );
    const { container } = render(<ConsoleAmbientLights suspended={false} />);
    act(() => vi.advanceTimersByTime(30000));
    expect(container.querySelector('.console-ambient-lights')).toHaveAttribute('data-pattern', '0');
  });
});
