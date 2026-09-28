import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * The 4x4 "Pixel loader" from lab.xevrion.dev (the middle variant, Chief's pick), placed beside
 * the Diagnosis step title. Cells are numbered row by row; each frame lists the lit cells.
 * The cycle was read from the reference's DOM: a single pixel spirals in and back out, a
 * two-pixel snake crosses the grid twice, then the grid pulses inner ring / outer ring / empty
 * six times. One frame per tick; a lit cell snaps on in 90 ms and fades over 360 ms, with an
 * 18 ms delay per diagonal step, as in the reference.
 */
export const PIXEL_TICK_MS = 110;

const SPIRAL = [0, 1, 2, 3, 7, 11, 15, 14, 13, 12, 8, 4, 5, 6, 10, 9];
const SNAKE = [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12];
const INNER = [5, 6, 9, 10];
const OUTER = [0, 1, 2, 3, 4, 7, 8, 11, 12, 13, 14, 15];

const spiral = [...SPIRAL, ...SPIRAL.slice(1, -1).reverse()].map((cell) => [cell]);
const snakePass = SNAKE.map((cell, index) => (index === 0 ? [cell] : [SNAKE[index - 1], cell]));
const pulse = [INNER, OUTER, []];

export const PIXEL_FRAMES: number[][] = [
  ...spiral,
  ...snakePass,
  ...snakePass,
  ...Array.from({ length: 6 }, () => pulse).flat(),
];

const CELLS = Array.from({ length: 16 }, (_, index) => index);

export function PixelLoader() {
  const reduceMotion = useReducedMotion();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const id = setInterval(() => setFrame((current) => (current + 1) % PIXEL_FRAMES.length), PIXEL_TICK_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const litCells = new Set(reduceMotion ? INNER : PIXEL_FRAMES[frame]);
  return (
    <span className="dx-pixel-loader" data-testid="dx-pixel-loader" aria-hidden="true">
      {CELLS.map((cell) => {
        const on = litCells.has(cell);
        return (
          <motion.span
            key={cell}
            data-on={on}
            initial={false}
            animate={{ opacity: on ? 1 : 0.12, scale: on || reduceMotion ? 1 : 0.8 }}
            transition={{
              duration: on ? 0.09 : 0.36,
              ease: 'easeOut',
              delay: (Math.floor(cell / 4) + (cell % 4)) * 0.018,
            }}
          />
        );
      })}
    </span>
  );
}
