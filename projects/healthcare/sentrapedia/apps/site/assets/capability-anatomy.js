export const documentationSlots = 18;
export const gatewayPhases = ['Konteks', 'Gateway', 'Streaming'];

export function featureTargets(count, selected) {
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(selected) || selected < 0 || selected >= count) throw new RangeError('Invalid anatomy selection');
  return Array.from({ length: count }, (_, index) => index === selected ? 1 : 0);
}

export function createCapabilityAnatomy(element) {
  const stage = element.querySelector('.capability-anatomy-stage');
  const readout = element.querySelector('[data-feature-readout]');
  const count = Number(element.dataset.featureCount);
  const modes = element.dataset.featureAnatomy === 'modes';
  const vector = element.dataset.liftVector.split(',').map(Number);
  const lifts = [...element.querySelectorAll('[data-feature-lift]')];
  const flows = [...element.querySelectorAll('.feature-data-flow')];
  const phases = [...element.querySelectorAll('[data-phase-part]')];
  const position = Array(count).fill(0);
  const clock = { time: 0 };
  let selected = 0, running = false, calm = false, held = false, last = 0, quietUntil = 1.4, nextTour = 2.8;
  let targets = featureTargets(count, selected);
  function draw(instant = false) {
    const dt = Math.min(.05, Math.max(0, clock.time - last));
    last = clock.time;
    if (!held && !calm && running && clock.time > quietUntil && clock.time > nextTour) {
      choose((selected + 1) % count, false);
      nextTour = clock.time + 2.8;
    }
    for (let i = 0; i < count; i++) position[i] = instant || calm ? targets[i] : position[i] + (targets[i] - position[i]) * (1 - Math.exp(-dt / .22));
    for (const part of lifts) {
      const value = position[Number(part.dataset.featureLift)];
      part.setAttribute('transform', `translate(${vector[0] * value} ${vector[1] * value})`);
      part.dataset.activePart = String(Number(part.dataset.featureLift) === selected);
    }
    for (const part of phases) part.dataset.activePart = String(Number(part.dataset.phasePart) === selected);
    for (const flow of flows) flow.style.strokeDashoffset = String(calm ? 0 : -clock.time * 34);
    const settled = position.every((value, i) => Math.abs(value - targets[i]) < .015);
    readout.textContent = modes ? (settled ? 'Slot ' : 'Memilih slot ') + String(selected + 1).padStart(2, '0') + ' / ' + count : gatewayPhases[selected] + ' · ' + (selected + 1) + ' / ' + count;
    element.dataset.featureSelection = String(selected);
  }
  function choose(index, manual = true) {
    selected = (index + count) % count;
    targets = featureTargets(count, selected);
    if (manual) quietUntil = clock.time + 3.6;
    stage.setAttribute('aria-label', (modes ? 'Slot ' + (selected + 1) + ' dari ' + count : gatewayPhases[selected]) + '; gunakan panah kiri atau kanan');
    if (!running || calm) draw(true);
  }
  const loop = window.gsap?.to(clock, { time: 3600, duration: 3600, repeat: -1, paused: true, ease: 'none', onUpdate: () => draw() });
  for (const button of element.querySelectorAll('[data-feature-step]')) button.addEventListener('click', () => choose(selected + Number(button.dataset.featureStep)));
  stage.addEventListener('keydown', event => {
    let next = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = selected + 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = selected - 1;
    if (event.key === 'Home' || event.key === 'Escape') next = 0;
    if (event.key === 'End') next = count - 1;
    if (next === null) return;
    event.preventDefault(); event.stopPropagation(); choose(next);
  });
  stage.addEventListener('pointerover', event => {
    const part = event.target.closest('[data-cartridge], [data-phase-part]');
    if (part) choose(Number(part.dataset.cartridge ?? part.dataset.phasePart));
  });
  element.addEventListener('pointerenter', () => { held = true; });
  element.addEventListener('pointerleave', () => { held = false; quietUntil = clock.time + 3.6; });
  element.addEventListener('focusin', () => { held = true; });
  element.addEventListener('focusout', event => { if (!element.contains(event.relatedTarget)) { held = false; quietUntil = clock.time + 3.6; } });
  draw(true);
  return {
    element,
    sync(active, reduced) {
      running = active; calm = reduced;
      element.dataset.motion = running && !calm ? 'running' : 'paused';
      loop?.paused(!running || calm);
      if (calm) draw(true);
    },
    destroy() { loop?.kill(); }
  };
}
