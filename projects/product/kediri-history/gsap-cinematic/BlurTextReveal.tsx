'use client';

import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

interface BlurTextRevealProps {
  text: string;
  as?: React.ElementType;
  type?: 'chars' | 'words' | 'lines';
  stagger?: number;
  duration?: number;
  delay?: number;
  blurAmount?: number;
  yOffset?: number;
  className?: string;
  scrollTrigger?: boolean;
  start?: string;
  end?: string;
  scrub?: boolean | number;
  once?: boolean;
}

export default function BlurTextReveal({
  text,
  as: Tag = 'h2',
  type = 'words',
  stagger = 0.08,
  duration = 1.2,
  delay = 0,
  blurAmount = 10,
  yOffset = 24,
  className = '',
  scrollTrigger = true,
  start = 'top 85%',
  end = 'bottom top',
  scrub = false,
  once = true,
}: BlurTextRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const split = new SplitText(el, { type });
    const targets = split[type] || split.words;

    const fromVars: gsap.TweenVars = {
      opacity: 0,
      filter: `blur(${blurAmount}px)`,
      y: yOffset,
      willChange: 'filter, opacity, transform',
    };

    const toVars: gsap.TweenVars = {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      duration,
      stagger,
      delay,
      ease: 'power3.out',
      onComplete: () => {
        gsap.set(targets, { willChange: 'auto' });
      },
    };

    if (scrollTrigger) {
      toVars.scrollTrigger = {
        trigger: el,
        start,
        end: scrub ? end : undefined,
        scrub: scrub || false,
        toggleActions: once ? 'play none none none' : 'play reverse play reverse',
      };
    }

    const tween = gsap.fromTo(targets, fromVars, toVars);

    return () => {
      tween.kill();
      split.revert();
    };
  }, [text, type, stagger, duration, delay, blurAmount, yOffset, scrollTrigger, start, end, scrub, once]);

  return <Tag ref={containerRef} className={className}>{text}</Tag>;
}
