'use client';

import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ParallaxSceneProps {
  background: React.ReactNode;
  midground?: React.ReactNode;
  foreground: React.ReactNode;
  className?: string;
  bgSpeed?: number;
  midSpeed?: number;
  textSpeed?: number;
  scrub?: number | boolean;
  pin?: boolean;
  pinDuration?: string;
}

export default function ParallaxScene({
  background,
  midground,
  foreground,
  className = '',
  bgSpeed = -6,
  midSpeed = -14,
  textSpeed = -22,
  scrub = 1.5,
  pin = false,
  pinDuration = '+=250%',
}: ParallaxSceneProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const triggers: ScrollTrigger[] = [];

      if (bgRef.current) {
        const st = ScrollTrigger.create({
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub,
          animation: gsap.to(bgRef.current, { yPercent: bgSpeed, ease: 'none' }),
        });
        triggers.push(st);
      }

      if (midRef.current) {
        const st = ScrollTrigger.create({
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub,
          animation: gsap.to(midRef.current, { yPercent: midSpeed, ease: 'none' }),
        });
        triggers.push(st);
      }

      if (textRef.current) {
        const st = ScrollTrigger.create({
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub,
          animation: gsap.to(textRef.current, { yPercent: textSpeed, ease: 'none' }),
        });
        triggers.push(st);
      }

      if (pin) {
        const st = ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: pinDuration,
          pin: true,
          pinSpacing: true,
        });
        triggers.push(st);
      }

      return () => {
        triggers.forEach((st) => st.kill());
      };
    }, section);

    return () => ctx.revert();
  }, [bgSpeed, midSpeed, textSpeed, scrub, pin, pinDuration]);

  return (
    <div ref={sectionRef} className={`relative overflow-hidden ${className}`} style={{ minHeight: '100vh' }}>
      <div ref={bgRef} className="absolute inset-0 z-0" style={{ willChange: 'transform' }}>
        {background}
      </div>

      {midground && (
        <div ref={midRef} className="absolute inset-0 z-10" style={{ willChange: 'transform' }}>
          {midground}
        </div>
      )}

      <div ref={textRef} className="relative z-20" style={{ willChange: 'transform' }}>
        {foreground}
      </div>
    </div>
  );
}
