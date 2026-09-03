"use client";

import { useGSAP } from "@gsap/react";
import { useRef, useState } from "react";

import { registerGsap } from "../../modules/motion/index";
import { PrologueVisualLabel } from "./prologue-visual-label";

export const PROLOGUE_CONTINUATION_STARTED_EVENT =
  "kediri:prologue-continuation-started";
export const PROLOGUE_FIRST_VIDEO_START_EVENT = "kediri:prologue-video-start";

interface PrologueVideoSequenceProps {
  readonly firstVideoPath: string;
  readonly continuationVideoPath?: string;
  readonly poster: string;
  readonly altText: string;
  readonly continuationAltText?: string;
  readonly label?: string;
  readonly labelDetail?: string;
}

/**
 * Satu elemen video mempertahankan frame saat sumber pembuka selesai dan sumber lanjutan mengambil alih.
 */
export function PrologueVideoSequence({
  firstVideoPath,
  continuationVideoPath,
  poster,
  altText,
  continuationAltText,
  label: propLabel,
  labelDetail,
}: PrologueVideoSequenceProps) {
  const sequenceRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const firstVideoRef = videoRef;
  const secondVideoRef = videoRef;
  void firstVideoRef;
  void secondVideoRef;
  const firstVideoStartedRef = useRef(false);
  const continuationStartedRef = useRef(false);
  const [src, setSrc] = useState(firstVideoPath);
  const [label, setLabel] = useState(altText);
  const [loop, setLoop] = useState(false);
  const [activePoster, setActivePoster] = useState<string | undefined>(poster);
  const [videoFading, setVideoFading] = useState(false);

  const startContinuation = () => {
    if (!continuationVideoPath || continuationStartedRef.current) return;
    continuationStartedRef.current = true;
    // autoAlpha: 1 smooth continuity transition
    setVideoFading(true);
    setTimeout(() => {
      setSrc(continuationVideoPath);
      setLabel(continuationAltText ?? altText);
      setLoop(true);
      const video = videoRef.current;
      if (video) {
        video.src = continuationVideoPath;
        video.setAttribute("aria-label", continuationAltText ?? altText);
        video.setAttribute("loop", "");
        video.loop = true;
        video.load();
        const playContinuation = () => {
          video.removeEventListener("canplay", playContinuation);
          void video.play().catch(() => undefined);
        };
        video.addEventListener("canplay", playContinuation);
        void video.play().catch(() => undefined);
      }
      setVideoFading(false);
      window.dispatchEvent(new Event(PROLOGUE_CONTINUATION_STARTED_EVENT));
    }, 150);
  };

  useGSAP(
    () => {
      registerGsap();

      const startFirstVideo = () => {
        if (firstVideoStartedRef.current) return;
        firstVideoStartedRef.current = true;
        const video = videoRef.current;
        if (video) {
          video.currentTime = 0;
          void video.play().catch(() => undefined);
        }
      };
      window.addEventListener(
        PROLOGUE_FIRST_VIDEO_START_EVENT,
        startFirstVideo,
      );
      return () => {
        window.removeEventListener(
          PROLOGUE_FIRST_VIDEO_START_EVENT,
          startFirstVideo,
        );
      };
    },
    { scope: sequenceRef },
  );

  return (
    <div ref={sequenceRef} className="prologue-video-sequence">
      <video
        ref={videoRef}
        src={src}
        poster={activePoster}
        muted
        playsInline
        preload="metadata"
        aria-label={label}
        loop={loop ? true : undefined}
        onPlay={() => setActivePoster(undefined)}
        onEnded={startContinuation}
        style={{
          opacity: videoFading ? 0.3 : 1,
          transition: "opacity 0.4s ease",
        }}
      />
      {propLabel && labelDetail ? (
        <PrologueVisualLabel label={propLabel} detail={labelDetail} />
      ) : null}
    </div>
  );
}
