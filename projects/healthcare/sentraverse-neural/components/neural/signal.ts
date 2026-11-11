// The network activity cycle (spec 2026-10-08, section 4): one fixed-shape GSAP timeline drives
// six lanes (the five hubs and the centre of the network), each running the causal chain
// impulse -> terminal flash -> vesicle release -> response on the next lane. The timeline writes
// plain lane objects; `copy` flattens them into the Float32Array the renderer uploads as
// u_signal[6] = (impulse, terminal, release, response) per lane. Intensities re-roll on every
// repeat (repeatRefresh re-records function-based values) and the tempo re-rolls in onRepeat.
export type GsapLib = typeof import('gsap').gsap

export const LANES = 6
export const laneOffset = .45
// Stage timing in seconds, measured from the lane's own start.
export const stageAt = { impulse: 1.15, terminal: .15, release: .38, responseDelay: .09, rise: .2, decay: .75, end: 1.15 + .09 + .2 + .75 }
const WINDOW = { start: 49, end: 94 }

type Lane = { impulse: number; terminal: number; release: number; response: number }

export function createSignalCycle(gsap: GsapLib, signal: Float32Array, options: { reduced: boolean }) {
  const lanes: Lane[] = Array.from({ length: LANES }, () => ({ impulse: 0, terminal: 0, release: 0, response: 0 }))
  const copy = () => lanes.forEach((lane, k) => { signal[k * 4] = lane.impulse; signal[k * 4 + 1] = lane.terminal; signal[k * 4 + 2] = lane.release; signal[k * 4 + 3] = lane.response })
  const cycle = gsap.timeline({
    paused: true, repeat: -1, repeatRefresh: true,
    onUpdate: copy,
    onRepeat: () => { cycle.timeScale(gsap.utils.random(.8, 1.25)) },
  })
  lanes.forEach((lane, k) => {
    const start = k * laneOffset, next = lanes[(k + 1) % LANES]
    const arrival = start + stageAt.impulse
    cycle.addLabel(`impulse-${k}`, start)
    cycle.fromTo(lane, { impulse: 0 }, { impulse: 1, duration: stageAt.impulse, ease: 'power1.in' }, start)
    cycle.addLabel(`terminal-${k}`, arrival)
    cycle.fromTo(lane, { terminal: 0 }, { terminal: 1.6, duration: stageAt.terminal / 2, ease: 'power2.out' }, arrival)
    cycle.to(lane, { terminal: 0, duration: stageAt.terminal / 2, ease: 'power2.in' }, arrival + stageAt.terminal / 2)
    cycle.set(lane, { impulse: 0 }, arrival + stageAt.terminal)
    cycle.addLabel(`release-${k}`, arrival)
    cycle.fromTo(lane, { release: 0 }, { release: 1, duration: stageAt.release, ease: 'none' }, arrival)
    cycle.addLabel(`response-${(k + 1) % LANES}`, arrival + stageAt.responseDelay)
    cycle.fromTo(next, { response: 0 }, { response: () => gsap.utils.random(.6, 1), duration: stageAt.rise, ease: 'power2.out' }, arrival + stageAt.responseDelay)
    cycle.to(next, { response: 0, duration: stageAt.decay, ease: 'power2.in' }, arrival + stageAt.responseDelay + stageAt.rise)
  })
  // The gap after the last lane's chain before the cycle repeats.
  cycle.to({ rest: 0 }, { rest: 1, duration: .8 }, laneOffset * (LANES - 1) + stageAt.end)
  copy()
  if (options.reduced) { cycle.time(cycle.labels['terminal-0']); copy() }
  return {
    cycle,
    // Plays inside the synapse-to-network window only; reduced motion stays parked at the first terminal.
    setPhase(phase: number) {
      const inside = phase >= WINDOW.start && phase <= WINDOW.end && !options.reduced
      if (inside && cycle.paused()) cycle.play()
      else if (!inside && !cycle.paused()) cycle.pause()
    },
    dispose() { cycle.kill(); signal.fill(0) },
  }
}
