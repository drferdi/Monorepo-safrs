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
