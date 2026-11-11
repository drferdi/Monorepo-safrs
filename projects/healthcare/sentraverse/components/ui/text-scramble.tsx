// Architected and built by Drferdi.
'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, MotionProps } from 'framer-motion';

const motionElements = {
  div: motion.div,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  h5: motion.h5,
  h6: motion.h6,
  p: motion.p,
  span: motion.span
} as const;

type TextScrambleElement = keyof typeof motionElements;

type TextScrambleProps = {
  children: string;
  duration?: number;
  speed?: number;
  characterSet?: string;
  as?: TextScrambleElement;
  className?: string;
  trigger?: boolean;
  onScrambleComplete?: () => void;
} & MotionProps;

const defaultChars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function TextScramble({
  children,
  duration = 0.8,
  speed = 0.04,
  characterSet = defaultChars,
  className,
  as: Component = 'p',
  trigger = true,
  onScrambleComplete,
  ...props
}: TextScrambleProps) {
  const MotionComponent = motionElements[Component];
  const [displayText, setDisplayText] = useState(children);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const text = children;

  const clearTimers = (): void => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    clearTimers();
    isAnimatingRef.current = false;

    const runScramble = (): void => {
      if (!trigger) {
        setDisplayText(text);
        return;
      }

      if (isAnimatingRef.current) return;

      isAnimatingRef.current = true;
      setDisplayText(text);

      const steps = Math.max(1, Math.ceil(duration / speed));
      let step = 0;

      intervalRef.current = setInterval(() => {
        let scrambled = '';
        const progress = step / steps;

        for (let i = 0; i < text.length; i++) {
          if (text[i] === ' ') {
            scrambled += ' ';
            continue;
          }

          if (progress * text.length > i) {
            scrambled += text[i];
          } else {
            scrambled +=
              characterSet[Math.floor(Math.random() * characterSet.length)];
          }
        }

        setDisplayText(scrambled);
        step++;

        if (step > steps) {
          clearTimers();
          setDisplayText(text);
          isAnimatingRef.current = false;
          onScrambleComplete?.();
        }
      }, speed * 1000);
    };

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      runScramble();
    });

    return () => {
      clearTimers();
      isAnimatingRef.current = false;
    };
  }, [characterSet, duration, onScrambleComplete, speed, text, trigger]);

  return (
    <MotionComponent className={className} {...props}>
      {displayText}
    </MotionComponent>
  );
}
