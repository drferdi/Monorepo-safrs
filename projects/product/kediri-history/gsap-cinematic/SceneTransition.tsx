'use client';

import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type TransitionType = 'wipe-left' | 'wipe-right' | 'wipe-up' | 'crossfade' | 'scale';

interface SceneTransitionProps {
  children: React.ReactNode;
  className?: string;
  type?: TransitionType;
  duration?: number;
  pinDuration?: string;
  start?: string;
}

export default function SceneTransition({
  children,
  className = '',
  type = 'wipe-left',
  duration = 1,
  pinDuration = '+=250%',
  start = 'top top',
}: SceneTransitionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;
    if (!section || !content) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start,
        end: pinDuration,
        pin: true,
        pinSpacing: true,
      });

      const fromVars: Record<TransitionType, gsap.TweenVars> = {
        'wipe-left': { xPercent: 100, opacity: 0.4 },
        'wipe-right': { xPercent: -100, opacity: 0.4 },
        'wipe-up': { yPercent: 100, opacity: 0.4 },
        'crossfade': { opacity: 0, scale: 0.96 },
        'scale': { scale: 1.08, opacity: 0 },
      };

      const toVars: gsap.TweenVars = {
        xPercent: 0,
        yPercent: 0,
        scale: 1,
        opacity: 1,
        duration,
        ease: 'power3.inOut',
        scrollTrigger: {
          trigger: section,
          start,
          end: 'top+=20% top',
          scrub: 1.5,
        },
      };

      gsap.fromTo(content, fromVars[type], toVars);

      const exitVars: Record<TransitionType, gsap.TweenVars> = {
        'wipe-left': { xPercent: -30, opacity: 0.3 },
        'wipe-right': { xPercent: 30, opacity: 0.3 },
        'wipe-up': { yPercent: -20, opacity: 0.3 },
        'crossfade': { opacity: 0.2, scale: 0.98 },
        'scale': { scale: 1.04, opacity: 0.3 },
      };

      gsap.to(content, {
        ...exitVars[type],
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'bottom-=30% bottom',
          end: 'bottom bottom',
          scrub: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, [type, duration, pinDuration, start]);

  return (
    <div ref={sectionRef} className="relative h-screen w-full overflow-hidden">
      <div ref={contentRef} className={`h-full w-full ${className}`}>
        {children}
      </div>
    </div>
  );
}
