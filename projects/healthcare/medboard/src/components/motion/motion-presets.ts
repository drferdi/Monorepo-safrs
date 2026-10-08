export type MotionPreset = 'cinematic' | 'balanced'

export interface MotionTuning {
  easing: string
  layoutEase: [number, number, number, number]
  frameCurve: 'smooth' | 'out'
  depthExitMs: number
  depthEnterMs: number
  depthDistance: number
  depthRotation: number
  portalCoverMs: number
  portalRevealMs: number
  portalDepth: number
  curtainCoverMs: number
  curtainRevealMs: number
  layoutMs: number
  tiltDegrees: number
  stiffness: number
  damping: number
}

export const motionPresets: Record<MotionPreset, MotionTuning> = {
  cinematic: {
    easing: 'cubic-bezier(.18,1,.28,1)', layoutEase: [.18, 1, .28, 1], frameCurve: 'smooth',
    depthExitMs: 120, depthEnterMs: 480, depthDistance: 64, depthRotation: 2,
    portalCoverMs: 280, portalRevealMs: 520, portalDepth: 1, curtainCoverMs: 220, curtainRevealMs: 440,
    layoutMs: 560, tiltDegrees: 3, stiffness: 140, damping: 26,
  },
  balanced: {
    easing: 'cubic-bezier(.22,1,.36,1)', layoutEase: [.22, 1, .36, 1], frameCurve: 'out',
    depthExitMs: 160, depthEnterMs: 320, depthDistance: 120, depthRotation: 5,
    portalCoverMs: 200, portalRevealMs: 340, portalDepth: 0, curtainCoverMs: 180, curtainRevealMs: 300,
    layoutMs: 420, tiltDegrees: 1.5, stiffness: 200, damping: 28,
  },
}

export const motionPresetKey = 'medboard.motion-preset.v1'

export function restoreMotionPreset(value: string | null): MotionPreset {
  return value === 'balanced' ? 'balanced' : 'cinematic'
}
