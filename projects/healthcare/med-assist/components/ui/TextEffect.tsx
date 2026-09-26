'use client';

import {
  AnimatePresence,
  MotionConfig,
  motion,
  type TargetAndTransition,
  type Variants,
} from 'framer-motion';
import React, { useEffect } from 'react';

import { cn } from '@/lib/utils';

type PresetType = 'blur' | 'shake' | 'scale' | 'fade' | 'slide';

type TextEffectProps = {
  children: string;
  per?: 'word' | 'char' | 'line';
  as?: keyof React.JSX.IntrinsicElements;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  className?: string;
  preset?: PresetType;
  delay?: number;
  trigger?: boolean;
  onAnimationComplete?: () => void;
  segmentWrapperClassName?: string;
};

const defaultStaggerTimes: Record<'char' | 'word' | 'line', number> = {
  char: 0.006,
  word: 0.03,
  line: 0.1,
};

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.014,
    },
  },
  exit: {
    transition: { staggerChildren: 0.014, staggerDirection: -1 },
  },
};

const defaultItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.12 },
  },
  exit: { opacity: 0 },
};

const presetVariants: Record<PresetType, { container: Variants; item: Variants }> = {
  blur: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: 'blur(12px)' },
      visible: { opacity: 1, filter: 'blur(0px)' },
      exit: { opacity: 0, filter: 'blur(12px)' },
    },
  },
  shake: {
    container: defaultContainerVariants,
    item: {
      hidden: { x: 0 },
      visible: { x: [-4, 4, -4, 4, 0], transition: { duration: 0.45 } },
      exit: { x: 0 },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0.88 },
      visible: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.88 },
    },
  },
  fade: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.12 } },
      exit: { opacity: 0 },
    },
  },
  slide: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 10 },
      visible: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 10 },
    },
  },
};

const AnimationComponent: React.FC<{
  segment: string;
  variants: Variants;
  per: 'line' | 'word' | 'char';
  segmentWrapperClassName?: string;
}> = React.memo(({ segment, variants, per, segmentWrapperClassName }) => {
  const content =
    per === 'line' ? (
      <motion.span variants={variants} className="block">
        {segment}
      </motion.span>
    ) : per === 'word' ? (
      <motion.span aria-hidden="true" variants={variants} className="inline-block whitespace-pre">
        {segment}
      </motion.span>
    ) : (
      <motion.span className="inline-block whitespace-pre">
        {segment.split('').map((char, charIndex) => (
          <motion.span
            key={`char-${charIndex}`}
            aria-hidden="true"
            variants={variants}
            className="inline-block whitespace-pre"
          >
            {char}
          </motion.span>
        ))}
      </motion.span>
    );

  if (!segmentWrapperClassName) {
    return content;
  }

  const defaultWrapperClassName = per === 'line' ? 'block' : 'inline-block';

  return <span className={cn(defaultWrapperClassName, segmentWrapperClassName)}>{content}</span>;
});

AnimationComponent.displayName = 'AnimationComponent';

/**
 * TextEffect
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function TextEffect({
  children,
  per = 'word',
  as = 'p',
  variants,
  className,
  preset,
  delay = 0,
  trigger = true,
  onAnimationComplete,
  segmentWrapperClassName,
}: TextEffectProps) {
  const segments =
    per === 'line'
      ? children.split('\n')
      : per === 'word'
        ? children.split(/(\s+)/)
        : children.split('');

  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;
  const selectedVariants = preset
    ? presetVariants[preset]
    : { container: defaultContainerVariants, item: defaultItemVariants };
  const containerVariants = variants?.container || selectedVariants.container;
  const itemVariants = variants?.item || selectedVariants.item;
  const ariaLabel = per === 'line' ? undefined : children;
  const stagger = defaultStaggerTimes[per];

  const delayedContainerVariants: Variants = {
    hidden: containerVariants.hidden,
    visible: {
      ...containerVariants.visible,
      transition: {
        ...(containerVariants.visible as TargetAndTransition)?.transition,
        staggerChildren:
          (containerVariants.visible as TargetAndTransition)?.transition?.staggerChildren ||
          stagger,
        delayChildren: delay,
      },
    },
    exit: containerVariants.exit,
  };

  useEffect(() => {
    if (!trigger || !onAnimationComplete) {
      return;
    }

    const estimatedDurationMs = Math.max(
      140,
      Math.round((delay + Math.max(segments.length - 1, 0) * stagger + 0.1) * 1000)
    );
    const timer = window.setTimeout(() => {
      onAnimationComplete();
    }, estimatedDurationMs);

    return () => window.clearTimeout(timer);
  }, [delay, onAnimationComplete, segments.length, stagger, trigger]);

  return (
    <MotionConfig reducedMotion="never">
      <AnimatePresence mode="popLayout">
        {trigger ? (
          <MotionTag
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-label={ariaLabel}
            variants={delayedContainerVariants}
            className={cn('whitespace-pre-wrap', className)}
          >
            {segments.map((segment, index) => (
              <AnimationComponent
                key={`${per}-${index}-${segment}`}
                segment={segment}
                variants={itemVariants}
                per={per}
                segmentWrapperClassName={segmentWrapperClassName}
              />
            ))}
          </MotionTag>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}
