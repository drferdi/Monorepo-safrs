export const divisions = [
  { name: 'Sentra Artificial Intelligence', label: 'Intelligence orchestration', detail: 'The intelligence that connects the system.', phase: 66, color: '#a9a4e7' },
  { name: 'Sentra Healthcare Solutions', label: 'Human care', detail: 'Connected intelligence in service of human health.', phase: 71, color: '#9fc8db' },
  { name: 'Sentra Academic Solutions', label: 'Knowledge in formation', detail: 'Learning grows with every new connection.', phase: 76, color: '#bac9df' },
  { name: 'Sentra Digital & Finance', label: 'Precision in motion', detail: 'Structured intelligence for connected digital systems.', phase: 81, color: '#a3bdda' },
  { name: 'Sentra Mitra Design', label: 'Intelligence takes shape', detail: 'Ideas become experiences, interfaces, and human environments.', phase: 86, color: '#d5b69a' },
] as const

export const chapters = [
  { id: 'origin', phase: 0, number: '00', label: 'The beginning', title: 'Intelligence begins\nas connection.', annotation: 'A SINGLE ORIGIN · INFINITE POSSIBILITY', description: 'Before a system. Before a thought. A connection.' },
  { id: 'embryonic-origin', phase: 8, number: '01', label: 'Embryonic origin', title: 'Potential,\nbecoming.', annotation: 'NEURAL TUBE / NEURAL CREST', description: 'Neural progenitors proliferate within the developing neural tube. Neural crest cells migrate outward to contribute to the peripheral nervous system.' },
  { id: 'neuron', phase: 19, number: '02', label: 'Neuronal differentiation', title: 'The first\nconnection.', annotation: 'SOMA / DENDRITE / AXON', description: 'A precursor differentiates. Dendrites branch. An axon extends. A network begins to emerge.' },
  { id: 'nervous-system', phase: 28, number: '03', label: 'A human architecture', title: 'Many connections.\nOne living system.', annotation: 'BRAIN / SPINAL CORD / PERIPHERAL NERVES', description: 'An intricate architecture connects the brain, spinal cord, and peripheral nerves.' },
  { id: 'enter-signal', phase: 37, number: '04', label: 'Enter the signal', title: 'Follow\nthe impulse.', annotation: 'PERIPHERAL NERVE → AXON', description: 'A change in electrical potential propagates along the axonal membrane.' },
  { id: 'axon', phase: 43, number: '05', label: 'Signal propagation', title: 'A thought,\nin motion.', annotation: 'AXON / MYELIN / NODES OF RANVIER', description: 'Sequential membrane illumination traces the impulse along a myelinated neural pathway.' },
  { id: 'synapse', phase: 51, number: '06', label: 'Across the synapse', title: 'Connection\ncreates intelligence.', annotation: 'PRESYNAPTIC TERMINAL / SYNAPTIC CLEFT', description: 'Vesicles release neurotransmitters into the synaptic cleft. Receptors on the next cell receive the chemical signal.' },
  { id: 'network', phase: 60, number: '07', label: 'Network emergence', title: 'SENTRAVERSE', annotation: 'ONE INTELLIGENCE ECOSYSTEM', description: 'Individual connections become a shared architecture. Biology becomes a metaphor for the interconnected ecosystem of Sentra.' },
  ...divisions.map((division, index) => ({ id: `division-${index + 1}`, phase: division.phase, number: `0${index + 1}`, label: division.label, title: division.name, annotation: `SENTRAVERSE · 0${index + 1}`, description: division.detail })),
  { id: 'connected', phase: 91, number: '09', label: 'All systems connected', title: 'SENTRA', annotation: 'ARTIFICIAL INTELLIGENCE FOR HUMAN SYSTEMS', description: 'Five regions. A shared intelligence. Every connection serves the whole.' },
  { id: 'human', phase: 94, number: '10', label: 'The legacy', title: 'THE LEGACY', annotation: 'Human intelligence. Artificial intelligence. One universe.', description: 'Every universe begins with a vision.' },
] as const

// The final chapter's words beyond its title (Chief 2026-10-08, "THE LEGACY"): the line the chapter
// opens on while the figure alone is lit, and the signature under the title at the end.
export const legacyCopy = { presence: 'The human behind the system', name: 'dr Ferdi Iskandar', role: 'The Gaffer · Architect of Sentraverse', brand: 'Sentraverse' } as const

// SentraSquad (Chief 2026-10-09): the team named in the network chapter, written as Chief gave it.
export const squad = [
  { name: 'Asyraf Hadi', role: 'CMO + GROWTH LEAD' },
  { name: 'dr. Novi Dwi Anggraini', role: 'CMO + CLINICAL DIRECTOR' },
  { name: 'Joseph Arianto', role: 'COO + GOVT. LIAISON' },
  { name: 'Farhan Nugroho', role: 'FULLSTACK + INFRASTRUCTURE MAINTENANCE LEAD' },
  { name: 'Kevin Susanto', role: 'QA LEAD' },
] as const

// The journey is its own site (Chief 2026-10-09); the pages it points to live on sentrahai.com.
export const sentra = (path: string) => `https://sentrahai.com${path}`

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
export const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }
// A chapter's phase by its id, so the jump buttons and the hash aliases follow the story.
export function phaseOf(id: string): number {
  const chapter = chapters.find(item => item.id === id)
  if (!chapter) throw new Error(`Unknown chapter: ${id}`)
  return chapter.phase
}
export const activeChapter = (phase: number) => Math.max(0, chapters.findLastIndex(chapter => phase >= chapter.phase))
