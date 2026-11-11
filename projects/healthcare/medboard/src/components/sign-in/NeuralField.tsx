'use client'

import { useEffect, useRef, useState } from 'react'

import styles from './sign-in.module.css'
import { createIntelligenceField } from './visual/canvas-field'
import { createLensIntro } from './visual/lens-intro'
import { createNeuralField } from './visual/neural-field'
import { type FieldHandle, type LensHandle, PALETTE } from './visual/palette'

const getPalette = () => PALETTE

/**
 * Decorative neural field. Renders in WebGL2 (3D, depth of field) and falls back to the 2D
 * canvas renderer where WebGL2 is missing, software-rendered or too slow. Hidden from
 * assistive technology, paused off-screen, and still under reduced motion.
 *
 * playIntro (read at mount): start with the opening sequence.
 * skipIntro: when it turns true, fast-forward the opening.
 */
export default function NeuralField({ playIntro, skipIntro }: { playIntro: boolean; skipIntro: boolean }) {
  const [mode, setMode] = useState<'gl' | '2d'>('gl')
  const [withIntro] = useState(playIntro)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lensRef = useRef<HTMLCanvasElement>(null)
  const fieldRef = useRef<FieldHandle | null>(null)
  const lensFieldRef = useRef<LensHandle | null>(null)
  const handedOver = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    let field: FieldHandle | null
    let lens: LensHandle | null = null
    if (mode === 'gl') {
      field = createNeuralField(canvas, getPalette, {
        intro: withIntro,
        allowSoftware: false,
        adaptive: true,
        onTooSlow: () => {
          handedOver.current = true
          setMode('2d')
        },
      })
      if (!field) {
        setMode('2d')
        return undefined
      }
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (withIntro && !reduced && lensRef.current) lens = createLensIntro(lensRef.current, getPalette)
    } else {
      // After a mid-session handover the opening has already played.
      field = createIntelligenceField(canvas, getPalette, { intro: withIntro && !handedOver.current })
    }
    fieldRef.current = field
    lensFieldRef.current = lens
    return () => {
      field?.destroy()
      lens?.destroy()
      fieldRef.current = null
      lensFieldRef.current = null
    }
  }, [mode, withIntro])

  useEffect(() => {
    if (!skipIntro) return
    fieldRef.current?.skipIntro()
    lensFieldRef.current?.skip()
  }, [skipIntro])

  return (
    <>
      <canvas key={mode} ref={canvasRef} aria-hidden="true" className={styles.canvas} />
      {mode === 'gl' && withIntro ? (
        <canvas ref={lensRef} aria-hidden="true" className={`${styles.canvas} ${styles.lens}`} />
      ) : null}
    </>
  )
}
