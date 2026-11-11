'use client'

import { useEffect, useRef } from 'react'

import { createMatrixOrb, type MatrixOrbHandle, type OrbMotion } from './visual/matrix-orb'
import styles from './voice.module.css'

// Audrey as a dot-matrix orb that follows the voice session (idle, listening, thinking).
export function AudreyOrb({ motion, still, label }: { motion: OrbMotion; still: boolean; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const orbRef = useRef<MatrixOrbHandle | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const orb = createMatrixOrb(canvas)
    orbRef.current = orb
    return () => {
      orb?.destroy()
      orbRef.current = null
    }
  }, [])

  useEffect(() => {
    orbRef.current?.setMotion(motion)
  }, [motion])

  useEffect(() => {
    orbRef.current?.setStill(still)
  }, [still])

  return (
    <div className={styles.orb}>
      <canvas ref={canvasRef} className={styles.orbCanvas} aria-hidden="true" />
      <span className={styles.orbLabel} role="status">
        {label}
      </span>
    </div>
  )
}
