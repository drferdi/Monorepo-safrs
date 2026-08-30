"use client";

import { useEffect, useRef, useState } from "react";

export const PROLOGUE_CONTINUATION_STARTED_EVENT =
  "kediri:prologue-continuation-started";

interface PrologueVideoSequenceProps {
  readonly firstVideoPath: string;
  readonly continuationVideoPath?: string;
  readonly poster: string;
  readonly altText: string;
  readonly continuationAltText?: string;
}

/**
 * Satu elemen video untuk prolog: sumber pertama berjalan sekali, lalu
 * sumber lanjutan mengambil alih frame yang sama dan mengulang.
 */
export function PrologueVideoSequence({
  firstVideoPath,
  continuationVideoPath,
  poster,
  altText,
  continuationAltText,
}: PrologueVideoSequenceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const continuationStartedRef = useRef(false);
  const continuationEventDispatchedRef = useRef(false);
  const [continuationStarted, setContinuationStarted] = useState(false);

  useEffect(() => {
    if (!continuationStarted) return;
    const video = videoRef.current;
    if (!video) return;

    video.load();
    try {
      void video.play().catch(() => undefined);
    } catch {
      // Autoplay policy can reject before a promise is returned.
    }
    if (!continuationEventDispatchedRef.current) {
      continuationEventDispatchedRef.current = true;
      window.dispatchEvent(new Event(PROLOGUE_CONTINUATION_STARTED_EVENT));
    }
  }, [continuationStarted]);

  const handleEnded = () => {
    if (!continuationVideoPath || continuationStartedRef.current) return;
    continuationStartedRef.current = true;
    setContinuationStarted(true);
  };

  return (
    <video
      ref={videoRef}
      src={continuationStarted ? continuationVideoPath : firstVideoPath}
      poster={poster}
      autoPlay
      muted
      loop={continuationStarted}
      playsInline
      preload="metadata"
      aria-label={
        continuationStarted ? (continuationAltText ?? altText) : altText
      }
      onEnded={handleEnded}
    />
  );
}
