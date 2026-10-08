// Architected and built by Drferdi.
// Cinematic Motion Intro Splash for Sentrapedia
'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, ArrowRight, Sparkles } from 'lucide-react'

export default function IntroMotionSplash() {
  const [visible, setVisible] = useState(true)
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Check if session has already viewed the intro
    const hasSeen = sessionStorage.getItem('sentrapedia_intro_seen')
    if (hasSeen === 'true') {
      setVisible(false)
      return
    }

    const video = videoRef.current
    if (video) {
      video.play().catch(() => {
        // Autoplay policy fallback
      })
    }
  }, [])

  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    const { currentTime, duration } = videoRef.current
    if (duration > 0) {
      setProgress((currentTime / duration) * 100)
    }
  }

  const handleEnded = () => {
    finishIntro()
  }

  const finishIntro = () => {
    sessionStorage.setItem('sentrapedia_intro_seen', 'true')
    setVisible(false)
  }

  const toggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted
      setMuted(!muted)
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro-motion-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#06090e] text-white select-none overflow-hidden"
        >
          {/* Background Ambient Glow */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(235,89,57,0.2) 0%, rgba(6,9,14,0.95) 75%)',
            }}
          />

          {/* Video Container with Aspect Ratio Guard & Vignette */}
          <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center px-4 sm:px-8">
            <div className="relative w-full h-full max-w-5xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/80 flex items-center justify-center">
              <video
                ref={videoRef}
                src="/intro-motion.mp4"
                playsInline
                autoPlay
                muted={muted}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                className="w-full h-full object-contain"
              />

              {/* Edge Softening Mask */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at center, transparent 65%, rgba(6,9,14,0.7) 100%)',
                }}
              />

              {/* Top Bar HUD inside Video Card */}
              <div className="absolute top-4 left-5 right-5 flex items-center justify-between pointer-events-none z-10">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                  </span>
                  <span className="font-mono text-[10px] tracking-widest text-accent uppercase font-bold">
                    SENTRAPEDIA :: CLINICAL MOTION ENGINE
                  </span>
                </div>
                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    onClick={toggleSound}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/15 bg-black/40 hover:bg-black/70 text-white/80 hover:text-white transition-all text-xs font-mono"
                    aria-label={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
                  >
                    {muted ? <VolumeX className="w-3.5 h-3.5 text-muted" /> : <Volume2 className="w-3.5 h-3.5 text-accent" />}
                    <span className="text-[10px]">{muted ? 'MUTE' : 'AUDIO ON'}</span>
                  </button>
                </div>
              </div>

              {/* Bottom Progress Line within Card */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-10">
                <motion.div
                  className="h-full bg-accent"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Controls / Skip Action */}
          <div className="absolute bottom-6 sm:bottom-8 z-20 flex items-center gap-4">
            <button
              onClick={finishIntro}
              className="group flex items-center gap-3 px-6 py-2.5 rounded-full border border-accent/40 bg-accent/10 hover:bg-accent hover:text-white text-accent font-jakarta text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-accent/10 backdrop-blur-md"
            >
              <span>Masuk ke Sentrapedia</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Blueprint Corner Accents */}
          <div className="absolute inset-4 pointer-events-none z-10 opacity-30">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
