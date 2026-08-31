'use client';

import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ScrollVideoProps {
  src: string;
  poster?: string;
  className?: string;
  pinDuration?: string;
  start?: string;
  end?: string;
  scrub?: boolean | number;
}

export default function ScrollVideo({
  src,
  poster,
  className = '',
  pinDuration = '+=300%',
  start = 'top top',
  end,
  scrub = true,
}: ScrollVideoProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    const setup = () => {
      const videoDuration = video.duration || 10;

      const ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: section,
          start,
          end: end || pinDuration,
          pin: true,
          pinSpacing: true,
        });

        gsap.to(video, {
          currentTime: videoDuration,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start,
            end: end || pinDuration,
            scrub,
          },
        });
      }, section);

      return () => ctx.revert();
    };

    if (video.readyState >= 1) {
      return setup();
    } else {
      video.addEventListener('loadedmetadata', setup, { once: true });
      return () => {
        video.removeEventListener('loadedmetadata', setup);
      };
    }
  }, [src, pinDuration, start, end, scrub]);

  return (
    <div ref={sectionRef} className={`relative h-screen w-full overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="auto"
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ willChange: 'transform' }}
      />
    </div>
  );
}
