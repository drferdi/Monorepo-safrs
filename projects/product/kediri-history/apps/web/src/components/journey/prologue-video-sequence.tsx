"use client";

import { useEffect, useRef } from "react";

interface PrologueVideoSequenceProps {
  readonly videoPath: string;
  readonly poster: string;
  readonly altText: string;
}

/**
 * Jalur opsional untuk footage Kediri kontemporer yang kelak lolos kurasi.
 * Opening saat ini memakai gambar HD; bila footage resmi tersedia, perjalanan
 * menuju 879 tetap dibangun oleh kamera dan lapisan material tanpa source swap.
 */
export function PrologueVideoSequence({
  videoPath,
  poster,
  altText,
}: PrologueVideoSequenceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    /*
     * Mobile adalah desain tersendiri, bukan desktop yang dikecilkan: di
     * lebar telepon naskah "KEDIRI, 2026" duduk langsung di atas bingkai dan
     * footage membuatnya tidak terbaca (terukur 390×844, 2026-09-04). Video
     * yang belum pernah diputar menampilkan POSTER-nya, yaitu citra Kediri
     * 2026 — jadi menahan pemutaran di bawah 48rem sekaligus mengembalikan
     * komposisi mobile yang benar tanpa cabang markup yang berisiko hidrasi.
     */
    const motionViewport = window.matchMedia("(min-width: 48rem)");
    const syncPlayback = () => {
      if (reducedMotion.matches || !motionViewport.matches) {
        video.pause();
        video.currentTime = 0;
        return;
      }
      void video.play().catch(() => undefined);
    };

    syncPlayback();
    reducedMotion.addEventListener("change", syncPlayback);
    motionViewport.addEventListener("change", syncPlayback);
    return () => {
      reducedMotion.removeEventListener("change", syncPlayback);
      motionViewport.removeEventListener("change", syncPlayback);
      video.pause();
    };
  }, []);

  return (
    <div className="prologue-video-sequence">
      <video
        ref={videoRef}
        src={videoPath}
        poster={poster}
        muted
        loop
        playsInline
        preload="auto"
        aria-label={altText}
      />
    </div>
  );
}
