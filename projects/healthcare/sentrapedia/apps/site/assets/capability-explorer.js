import { createCapabilityAnatomy } from './capability-anatomy.js';

export function capabilityPath() {
  return [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [3, 3], [4, 3], [5, 3], [5, 4]];
}

export function capabilityExplainSteps() {
  return [
    ['Encounter', 'Ruang kerja', 'Referensi'],
    ['Dokumen', 'Sumber', 'Tinjauan'],
    ['Konteks', 'Gateway', 'Streaming'],
    ['Gejala', 'DDx', 'Edukasi'],
    ['Draf', 'Kode', 'Tinjauan'],
    ['Pilih mode', 'Susun draf', 'Tinjau'],
    ['Dikte', 'Scribe Note', 'Tinjau'],
    ['Cari', 'Pilih', 'Buka'],
    ['Data sintetis', 'Periksa PII', 'Batas biaya'],
    ['Pedoman', 'Obat', 'ICD-10']
  ];
}

export function capabilitySelection(current, key, count) {
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowDown' || key === 'ArrowRight') return (current + 1) % count;
  if (key === 'ArrowUp' || key === 'ArrowLeft') return (current - 1 + count) % count;
  return null;
}

export function capabilityViewportHeight(layout, itemHeight, scrollbar) {
  return layout === 'native' ? Math.ceil(itemHeight + scrollbar) : null;
}

export function settledCapabilityRefresh(refresh, frame, cancelFrame) {
  let pending = 0;
  const cancel = () => { if (pending) cancelFrame(pending); pending = 0; };
  return {
    queue() {
      cancel();
      pending = frame(() => { pending = frame(() => { pending = 0; refresh(); }); });
    },
    cancel,
    flush() { if (pending) { cancel(); refresh(); } }
  };
}

function enhanceCapabilities(root) {
  const viewport = root.querySelector('.capability-rail-window');
  const track = root.querySelector('.clinical-capability-index');
  const items = [...root.querySelectorAll('.clinical-capability')];
  const status = root.querySelector('[data-capability-status]');
  const pause = root.querySelector('[data-capability-pause]');
  const previous = root.querySelector('[data-capability-previous]');
  const next = root.querySelector('[data-capability-next]');
  const progress = root.querySelector('.capability-progress span');
  if (!viewport || !track || !items.length || !status || !pause || !previous || !next || !progress) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const { gsap, ScrollTrigger } = window;
  const anatomy = [...root.querySelectorAll('[data-feature-anatomy]')].map(createCapabilityAnatomy);
  const path = capabilityPath();
  items.forEach((item, index) => { item.style.setProperty('--path-x', path[index][0]); item.style.setProperty('--path-y', path[index][1]); });
  capabilityExplainSteps().forEach((steps, index) => {
    const explanation = document.createElement('div');
    explanation.className = 'capability-explainer';
    explanation.innerHTML = '<svg viewBox="0 0 320 26" preserveAspectRatio="none"><path class="capability-explainer-base" d="M8 13H312"/><path class="capability-explainer-route" d="M8 13H312"/><circle cx="8" cy="13" r="3"/><circle cx="160" cy="13" r="3"/><circle cx="312" cy="13" r="3"/><circle class="capability-explainer-pulse" cx="8" cy="13" r="5"/></svg><div class="capability-explainer-labels"></div>';
    const labels = explanation.querySelector('.capability-explainer-labels');
    steps.forEach(step => {
      const label = document.createElement('span');
      label.className = 'capability-explainer-label';
      label.textContent = step;
      labels.append(label);
    });
    items[index].querySelector('.capability-detail-copy').append(explanation);
  });
  const settled = settledCapabilityRefresh(() => { if (root.isConnected && ScrollTrigger) ScrollTrigger.refresh(); }, requestAnimationFrame, cancelAnimationFrame);
  let selected = -1;
  let paused = false;
  let visible = false;
  let timeline = null;
  let media = null;
  let scrollFrame = 0;
  let signal = null;
  const scene = createCapabilityScene(gsap, items, reduced, () => selected);
  const travel = () => Math.max(viewport.clientWidth, viewport.clientHeight) * (items.length - 1);
  const { fitNativeViewport, offsets, nearest } = createCapabilityViewport(root, viewport, items, () => selected, settled);

  function syncMedia() {
    const slot = items[selected]?.querySelector('.capability-live-panel, .capability-anatomy-stage');
    const rect = slot?.getBoundingClientRect();
    const onScreen = rect && rect.bottom > 84 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    const motionAllowed = visible && onScreen && !document.hidden && !paused && !reduced.matches;
    root.dataset.motion = motionAllowed ? 'running' : 'paused';
    for (const controller of anatomy) controller.sync(motionAllowed && items[selected].contains(controller.element), reduced.matches);
    scene.sync(motionAllowed, paused);
    pause.textContent = paused ? 'Putar motion' : 'Jeda motion';
    pause.setAttribute('aria-pressed', String(paused));
  }

  function setActive(index) {
    if (selected === index) { fitNativeViewport(); syncMedia(); return; }
    scene.reset(items[selected]);
    selected = index;
    root.dataset.capability = String(index + 1);
    items.forEach((item, i) => {
      item.dataset.active = String(i === index);
      item.inert = root.dataset.layout === 'pinned' && i !== index;
    });
    const title = items[index].querySelector('h4').textContent;
    status.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0') + ' — ' + title;
    if (!timeline) progress.style.transform = 'scaleX(' + ((index + 1) / items.length) + ')';
    fitNativeViewport();
    signal?.kill();
    if (gsap && !reduced.matches && !paused) {
      signal = gsap.fromTo(items[index], { '--capability-signal': 0 }, { '--capability-signal': 1, duration: 0.7, ease: 'power2.out' });
    }
    syncMedia();
  }

  function navigate(index) {
    if (timeline?.scrollTrigger) settled.flush();
    if (timeline?.scrollTrigger) {
      const trigger = timeline.scrollTrigger;
      const fraction = index / (items.length - 1);
      const target = trigger.start + (trigger.end - trigger.start) * fraction;
      const smoother = window.ScrollSmoother?.get();
      if (smoother) smoother.scrollTo(target, false);
      else window.scrollTo({ top: target, behavior: 'instant' });
      ScrollTrigger.update();
      trigger.getTween()?.progress(1);
      timeline.progress(fraction);
      setActive(index);
    } else if (root.dataset.layout === 'stack') {
      items[index].scrollIntoView({ block: 'start', behavior: 'instant' });
      setActive(index);
    } else {
      viewport.scrollTo({ left: offsets()[index], behavior: reduced.matches ? 'instant' : 'smooth' });
      setActive(index);
    }
  }

  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport) return;
    const index = capabilitySelection(Math.max(0, selected), event.key, items.length);
    if (index === null) return;
    event.preventDefault();
    navigate(index);
  });
  viewport.addEventListener('scroll', () => {
    if (timeline || scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; setActive(nearest(viewport.scrollLeft)); });
  }, { passive: true });
  pause.addEventListener('click', () => { paused = !paused; signal?.paused(paused); syncMedia(); });
  previous.addEventListener('click', () => navigate((selected - 1 + items.length) % items.length));
  next.addEventListener('click', () => navigate((selected + 1) % items.length));
  document.addEventListener('visibilitychange', syncMedia);
  window.addEventListener('scroll', syncMedia, { passive: true });
  reduced.addEventListener('change', syncMedia);
  if ('ResizeObserver' in window) {
    const resize = new ResizeObserver(fitNativeViewport);
    items.forEach(item => resize.observe(item));
  } else {
    window.addEventListener('resize', fitNativeViewport);
    root.querySelectorAll('img').forEach(image => image.addEventListener('load', fitNativeViewport));
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncMedia(); }, { threshold: 0.05 });
    observer.observe(root);
  } else visible = true;
  for (const control of [pause, previous, next]) control.hidden = false;
  root.classList.add('is-enhanced');
  root.dataset.layout = reduced.matches ? 'stack' : 'native';
  setActive(0);

  async function initializeMotion() {
    await document.fonts.ready;
    if (!root.isConnected || !gsap || !ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    media = gsap.matchMedia();
    media.add({ desktop: '(min-width: 1001px) and (min-height: 800px)', native: '(max-width: 1000px), (max-height: 799px)', reduce: '(prefers-reduced-motion: reduce)' }, context => {
      settled.queue();
      if (!context.conditions.desktop || context.conditions.reduce) {
        root.dataset.layout = context.conditions.reduce ? 'stack' : 'native';
        items.forEach(item => { item.inert = false; });
        fitNativeViewport();
        syncMedia();
        return () => settled.cancel();
      }
      root.dataset.layout = 'pinned';
      fitNativeViewport();
      viewport.scrollLeft = 0;
      timeline = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
        id: 'clinical-capabilities-right', trigger: root, start: 'top 84px',
        end: () => '+=' + Math.round(travel()), pin: true, scrub: 0.45,
        anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: -20,
        onRefresh() { syncMedia(); }
      }, onUpdate() {
        setActive(Math.round(this.progress() * (items.length - 1)));
      } });
      gsap.set(track, { x: 0, y: 0 });
      path.forEach(([x, y], index) => {
        if (index) timeline.fromTo(track, { x: () => -path[index - 1][0] * (viewport.clientWidth + 64), y: () => -path[index - 1][1] * (viewport.clientHeight + 48) }, { x: () => -x * (viewport.clientWidth + 64), y: () => -y * (viewport.clientHeight + 48), duration: 1, immediateRender: false }, index - 1);
        timeline.addLabel('capability-' + (index + 1), index);
      });
      timeline.fromTo(progress, { scaleX: 1 / items.length }, { scaleX: 1, duration: items.length - 1 }, 0);
      root.capabilityTimeline = timeline;
      items.forEach((item, index) => { item.inert = index !== selected; });
      return () => {
        signal?.kill();
        timeline = null;
        delete root.capabilityTimeline;
        root.dataset.layout = reduced.matches ? 'stack' : 'native';
        items.forEach(item => { item.inert = false; });
        fitNativeViewport();
        progress.style.removeProperty('transform');
        syncMedia();
        settled.cancel();
      };
    }, root);
    ScrollTrigger.refresh();
  }
  initializeMotion();
  window.addEventListener('pagehide', event => {
    visible = false;
    syncMedia();
    if (!event.persisted) { scene.reset(items[selected]); anatomy.forEach(controller => controller.destroy()); media?.revert(); }
    settled.cancel();
  });
  window.addEventListener('pageshow', () => { visible = root.getBoundingClientRect().bottom > 0 && root.getBoundingClientRect().top < window.innerHeight; syncMedia(); });
}

if (typeof document !== 'undefined') document.querySelectorAll('.clinical-capability-viewport').forEach(enhanceCapabilities);
