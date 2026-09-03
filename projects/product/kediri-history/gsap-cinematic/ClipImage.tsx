'use client';

import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ClipImageProps {
  src: string;
  alt: string;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  className?: string;
  start?: string;
  once?: boolean;
}

const clipMap = {
  left: { from: 'inset(0 100% 0 0)', to: 'inset(0 0% 0 0)' },
  right: { from: 'inset(0 0 0 100%)', to: 'inset(0 0 0 0%)' },
  up: { from: 'inset(100% 0 0 0)', to: 'inset(0% 0 0 0)' },
  down: { from: 'inset(0 0 100% 0)', to: 'inset(0 0 0% 0)' },
};

export default function ClipImage({
  src,
  alt,
  direction = 'left',
  duration = 1.4,
  className = '',
  start = 'top 80%',
  once = true,
}: ClipImageProps) {
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = imageRef.current;
    if (!el) return;

    const { from, to } = clipMap[direction];

    const tween = gsap.fromTo(
      el,
      { clipPath: from, willChange: 'clip-path' },
      {
        clipPath: to,
        duration,
        ease: 'power3.inOut',
        scrollTrigger: {
          trigger: el,
          start,
          toggleActions: once ? 'play none none none' : 'play reverse play reverse',
        },
        onComplete: () => {
          gsap.set(el, { willChange: 'auto' });
        },
      }
    );

    return () => {
      tween.kill();
    };
  }, [src, direction, duration, start, once]);

  return (
    <div ref={imageRef} className={`overflow-hidden ${className}`}>
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </div>
  );
}
