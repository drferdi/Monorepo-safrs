import { anatomyLayers, anatomyTargets } from './system-anatomy-model.js';

const root = document.querySelector('.system-anatomy');
if (root) {
  const buttons = [...root.querySelectorAll('[data-anatomy-select]')];
  const parts = [...root.querySelectorAll('[data-anatomy-stage]')];
  const traces = [...root.querySelectorAll('.anatomy-data-trace')];
  const reset = root.querySelector('[data-anatomy-reset]');
  const play = root.querySelector('[data-anatomy-play]');
  const readout = root.querySelector('[data-anatomy-readout]');
  const status = root.querySelector('[data-anatomy-status]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const projection = JSON.parse(root.dataset.projection);
  const rise = -Math.cos(projection.elevation * Math.PI / 180) * projection.scale * Math.sqrt(1.6);
  const overview = anatomyTargets(null);
  const layers = anatomyLayers.map(layer => ({
    ...layer, current: overview[layer.id], target: overview[layer.id],
    nodes: [...root.querySelectorAll('[data-anatomy-assembly="' + layer.id + '"]')]
  }));
  let selected = null, playing = true, visible = false, frame = 0, last = 0, clock = 0;
  const transitioning = () => layers.some(layer => Math.abs(layer.current - layer.target) > .015);
  function place(instant = false) {
    for (const layer of layers) {
      if (instant) layer.current = layer.target;
      for (const node of layer.nodes) node.setAttribute('transform', 'translate(0 ' + layer.current * rise + ')');
    }
  }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 0;
    last = now;
    for (const layer of layers) {
      layer.current += (layer.target - layer.current) * (1 - Math.exp(-dt / .24));
      if (Math.abs(layer.current - layer.target) < .015) layer.current = layer.target;
    }
    place();
    if (playing && !reduced.matches) {
      clock += dt;
      traces.forEach(trace => { trace.style.strokeDashoffset = String(-clock * 32); });
    }
    frame = 0;
    run();
  }
  function run() {
    if (!frame && visible && !document.hidden && !reduced.matches && (playing || transitioning())) {
      frame = requestAnimationFrame(tick);
    } else if (!frame) last = 0;
  }
  function choose(index, announce = true) {
    selected = index;
    const targets = anatomyTargets(index);
    layers.forEach(layer => {
      layer.target = targets[layer.id];
      layer.nodes.forEach(node => node.toggleAttribute('data-focus', layer.stage === index && index !== null));
    });
    root.toggleAttribute('data-focus', index !== null);
    root.dataset.phase = index === null ? 'overview' : String(index);
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    parts.forEach(part => part.toggleAttribute('data-selected', index !== null && Number(part.dataset.anatomyStage) === index));
    reset.setAttribute('aria-pressed', String(index === null));
    readout.textContent = index === null ? 'Semua lapisan - pilih fitur di atas' : String(index + 1).padStart(2, '0') + ' / 04 - ' + buttons[index].querySelector('strong').textContent;
    if (announce) status.textContent = readout.textContent;
    if (reduced.matches) place(true);
    run();
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => choose(index));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + buttons.length - 1) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (event.key === 'Escape') { event.preventDefault(); choose(null); return; }
      if (next === undefined) return;
      event.preventDefault();
      buttons[next].focus();
      choose(next);
    });
  });
  reset.addEventListener('click', () => choose(null));
  play.addEventListener('click', () => {
    playing = !playing;
    play.setAttribute('aria-pressed', String(!playing));
    play.textContent = playing ? 'Jeda' : 'Putar';
    if (!playing && !transitioning()) { cancelAnimationFrame(frame); frame = 0; last = 0; }
    run();
  });
  const observer = new IntersectionObserver(entries => {
    visible = entries[entries.length - 1].isIntersecting;
    if (!visible) { cancelAnimationFrame(frame); frame = 0; last = 0; }
    run();
  }, { threshold: .1 });
  observer.observe(root.querySelector('.anatomy-stage'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; last = 0; }
    run();
  });
  reduced.addEventListener('change', () => {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    play.hidden = reduced.matches;
    if (reduced.matches) {
      place(true);
      traces.forEach(trace => { trace.style.strokeDashoffset = '0'; });
    }
    run();
  });
  window.addEventListener('pagehide', event => {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    if (!event.persisted) observer.disconnect();
  });
  window.addEventListener('pageshow', run);
  root.querySelector('.anatomy-controls').hidden = false;
  play.hidden = reduced.matches;
  choose(selected, false);
}
