// Audrey's name as Chief spelled it out (2026-10-07): each word gives one letter of AUDREY.
export const AUDREY_NAME: ReadonlyArray<{ word: string; before?: string }> = [
  { word: 'Augmented' },
  { word: 'Universal' },
  { word: 'Doctor' },
  { word: 'Reasoning' },
  { word: 'Engine' },
  { before: 'for', word: 'Your Healthcare' },
]

/** "Augmented Universal Doctor Reasoning Engine for Your Healthcare" */
export function audreyExpansion(): string {
  return AUDREY_NAME.map((part) => (part.before ? `${part.before} ${part.word}` : part.word)).join(' ')
}

// What Audrey rests on, from Chief's description.
export const AUDREY_PILLARS = ['Penalaran berbasis bukti', 'Dukungan diagnostik real-time', 'Terkalibrasi untuk Indonesia']
