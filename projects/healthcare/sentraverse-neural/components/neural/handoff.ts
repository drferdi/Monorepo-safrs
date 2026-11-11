// The one entity the story hands on (brief 2026-10-09 §2): a single glowing point that is the
// origin, the nucleus of the progenitor, the soma of the first neuron, the thought behind the
// founder's face, the impulse in the axon, the pulse across the cleft, the centre of the network,
// the hub of each division and the unified system, until the legacy's void takes it. This module
// only says which host carries it at a phase and how it looks; the renderer knows where each host
// is on screen. Node imports it alone: no runtime imports.

export type Host = 'origin' | 'progenitor' | 'soma' | 'mind' | 'impulse' | 'cleft' | 'centre' | 'hub' | 'unified'
type Rgb = readonly [number, number, number]

// Each host holds the carrier from `from`; the carrier travels to it over the HANDOFF phases before.
export const hosts: ReadonlyArray<{ readonly host: Host; readonly from: number }> = [
  { host: 'origin', from: 0 }, { host: 'progenitor', from: 9 }, { host: 'soma', from: 19 }, { host: 'mind', from: 28 },
  { host: 'impulse', from: 38 }, { host: 'cleft', from: 52 }, { host: 'centre', from: 60 }, { host: 'hub', from: 66 }, { host: 'unified', from: 91 },
]
export const HANDOFF = 2
// The network leans to one division's hub every five phases from 66 and travels to the next over these.
export const HUB_BLEND = 1.5

const smooth = (value: number) => { const t = Math.min(1, Math.max(0, value)); return t * t * (3 - 2 * t) }
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const hex = (value: string): Rgb => [parseInt(value.slice(1, 3), 16) / 255, parseInt(value.slice(3, 5), 16) / 255, parseInt(value.slice(5, 7), 16) / 255]

export function handoffAt(phase: number): { from: Host; to: Host; blend: number } {
  const owner = Math.max(0, hosts.findLastIndex(item => phase >= item.from))
  const next = hosts[owner + 1]
  const start = next ? next.from - HANDOFF : Infinity
  if (!next || phase <= start) return { from: hosts[owner].host, to: hosts[owner].host, blend: 0 }
  return { from: hosts[owner].host, to: next.host, blend: smooth((phase - start) / HANDOFF) }
}

export function hubBlend(phase: number): { index: number; next: number; blend: number } {
  const index = Math.min(4, Math.max(0, Math.floor((phase - 66) / 5)))
  const next = Math.min(4, index + 1)
  if (next === index) return { index, next, blend: 0 }
  return { index, next, blend: smooth((phase - (66 + next * 5 - HUB_BLEND)) / HUB_BLEND) }
}

// Size is the core diameter in CSS pixels; `breath` the share it swells by at rest.
const looks: Record<Host, { size: number; color: Rgb; breath: number }> = {
  origin: { size: 18, color: [.92, .68, .4], breath: .18 },
  progenitor: { size: 15, color: [.92, .7, .45], breath: .14 },
  soma: { size: 16, color: [.95, .74, .5], breath: .1 },
  mind: { size: 12, color: [.86, .84, .8], breath: .08 },
  impulse: { size: 10, color: [1, .9, .74], breath: 0 },
  cleft: { size: 13, color: [1, .82, .6], breath: .05 },
  centre: { size: 16, color: [.8, .88, 1], breath: .06 },
  hub: { size: 15, color: [.8, .88, 1], breath: .04 },
  unified: { size: 22, color: [.92, .95, 1], breath: .03 },
}

export function carrierStyle(phase: number, hubColors: ReadonlyArray<string>): { size: number; color: Rgb; alpha: number; breath: number } {
  const look = (host: Host) => {
    if (host !== 'hub') return looks[host]
    const { index, next, blend } = hubBlend(phase)
    return { ...looks.hub, color: mix(hex(hubColors[index]), hex(hubColors[next]), blend) }
  }
  const { from, to, blend } = handoffAt(phase)
  const a = look(from), b = look(to)
  return { size: a.size + (b.size - a.size) * blend, color: mix(a.color, b.color, blend), breath: a.breath + (b.breath - a.breath) * blend, alpha: 1 - smooth((phase - 94) / 1.5) }
}
