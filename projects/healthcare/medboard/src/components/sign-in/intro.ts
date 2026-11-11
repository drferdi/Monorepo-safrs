export const INTRO_SEEN_KEY = 'medboard-sign-in-intro-seen'

/** Opening sequence (milliseconds), kept in step with INTRO in visual/neural-field.ts. */
export const LOGO_OUT_AT = 3700
export const SPLIT_AT = 5400
export const SPLIT_MS = 1150

/**
 * The opening plays once per browser session and never under reduced motion.
 * `seen` is null when session storage cannot be read; the opening then plays.
 */
export function shouldPlayIntro({ reducedMotion, seen }: { reducedMotion: boolean; seen: boolean | null }): boolean {
  if (reducedMotion) return false
  return seen !== true
}
