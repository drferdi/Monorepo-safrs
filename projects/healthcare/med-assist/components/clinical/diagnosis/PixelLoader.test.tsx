import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reducedMotion = vi.hoisted(() => ({ value: false }));
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => reducedMotion.value,
}));

import { PIXEL_FRAMES, PIXEL_TICK_MS, PixelLoader } from './PixelLoader';

const lit = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-testid="dx-pixel-loader"] > span')].flatMap((cell, index) =>
    cell.getAttribute('data-on') === 'true' ? [index] : []
  );

describe('PIXEL_FRAMES', () => {
  it('follows the 4x4 variant of the reference: spiral out and back, two snake passes, six pulses', () => {
    expect(PIXEL_FRAMES).toHaveLength(80);
    expect(PIXEL_FRAMES.slice(0, 16)).toEqual([0, 1, 2, 3, 7, 11, 15, 14, 13, 12, 8, 4, 5, 6, 10, 9].map((cell) => [cell]));
    expect(PIXEL_FRAMES.slice(16, 30)).toEqual([10, 6, 5, 4, 8, 12, 13, 14, 15, 11, 7, 3, 2, 1].map((cell) => [cell]));
    expect(PIXEL_FRAMES[30]).toEqual([0]);
    expect(PIXEL_FRAMES[31]).toEqual([0, 1]);
    expect(PIXEL_FRAMES[45]).toEqual([13, 12]);
    expect(PIXEL_FRAMES.slice(46, 62)).toEqual(PIXEL_FRAMES.slice(30, 46));
    expect(PIXEL_FRAMES.slice(62, 65)).toEqual([[5, 6, 9, 10], [0, 1, 2, 3, 4, 7, 8, 11, 12, 13, 14, 15], []]);
    expect(PIXEL_FRAMES.slice(62)).toEqual(Array.from({ length: 6 }, () => PIXEL_FRAMES.slice(62, 65)).flat());
  });
});

describe('PixelLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reducedMotion.value = false;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a decorative 4x4 grid and steps one frame per tick, looping', () => {
    const { container } = render(<PixelLoader />);
    const grid = container.querySelector('[data-testid="dx-pixel-loader"]');
    expect(grid).toHaveAttribute('aria-hidden', 'true');
    expect(grid).toHaveClass('dx-pixel-loader');
    expect(grid?.children).toHaveLength(16);
    expect(lit(container)).toEqual([0]);
    act(() => {
      vi.advanceTimersByTime(PIXEL_TICK_MS);
    });
    expect(lit(container)).toEqual([1]);
    act(() => {
      vi.advanceTimersByTime(PIXEL_TICK_MS * (PIXEL_FRAMES.length - 1));
    });
    expect(lit(container)).toEqual([0]);
  });

  it('stops its timer on unmount', () => {
    const { unmount } = render(<PixelLoader />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('holds one still frame under reduced motion', () => {
    reducedMotion.value = true;
    const { container } = render(<PixelLoader />);
    expect(vi.getTimerCount()).toBe(0);
    expect(lit(container)).toEqual([5, 6, 9, 10]);
  });
});
