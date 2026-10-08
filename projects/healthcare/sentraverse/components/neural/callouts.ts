// HUD callouts on the founder's photograph (Chief 2026-10-08, "motion garis futuristic"): three
// labels anchored on the figure in photo coordinates (0–100, the SVG viewBox of the square photo),
// each line running anchor → elbow → a short horizontal lead, the label sitting just right of the
// lead. All three stay right of the head (which ends at x 61) and over the dark suit or the empty
// background, so they never cross the face. The labels are Chief's exact strings.
export type Callout = { label: string; anchor: [number, number]; elbow: [number, number]; end: [number, number] }

export const callouts: Callout[] = [
  { label: 'dr Ferdi Iskandar', anchor: [60, 19], elbow: [67, 12], end: [71, 12] },
  { label: 'the Gaffer', anchor: [69, 47], elbow: [77, 40], end: [81, 40] },
  { label: 'Sentraone', anchor: [68, 76], elbow: [76, 86], end: [80, 86] },
]

export const calloutPoints = (c: Callout) => `${c.anchor[0]},${c.anchor[1]} ${c.elbow[0]},${c.elbow[1]} ${c.end[0]},${c.end[1]}`

export const labelStyle = (c: Callout) => ({ left: `${c.end[0] + 1.5}%`, top: `${c.end[1]}%` })

// The lock-on reticle (Chief 2026-10-08, "Scan → Develop → Lock-on"): four corner brackets around
// the head (the ellipse centred at 48.5, 23.5 with radii 12.5 and 21), in the same photo percent,
// drawn as paths with pathLength 1 like the lines. Only the corners are stroked, so the first
// callout's line leaves the box between the right-hand brackets without crossing one.
export type Reticle = { left: number; top: number; right: number; bottom: number; arm: number }
export const reticle: Reticle = { left: 33.5, top: 0, right: 63.5, bottom: 47, arm: 5 }

export const reticleCorners = (r: Reticle = reticle): string[] => [
  `M${r.left},${r.top + r.arm} L${r.left},${r.top} L${r.left + r.arm},${r.top}`,
  `M${r.right - r.arm},${r.top} L${r.right},${r.top} L${r.right},${r.top + r.arm}`,
  `M${r.right},${r.bottom - r.arm} L${r.right},${r.bottom} L${r.right - r.arm},${r.bottom}`,
  `M${r.left + r.arm},${r.bottom} L${r.left},${r.bottom} L${r.left},${r.bottom - r.arm}`,
]
