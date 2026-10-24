export function shouldPlayAnatomy({ visible, paused, reduced }) {
  return visible && !paused && !reduced;
}

function initHumanAnatomy() {
  const root = document.querySelector('#home-text .human-anatomy-column');
  if (!root) return;

  const art = root.querySelector('.human-anatomy');
  const toggle = root.querySelector('.human-anatomy-toggle');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let paused = false;

  function sync() {
    const play = shouldPlayAnatomy({ visible, paused, reduced: reduced.matches });
    root.dataset.motion = play ? 'playing' : 'paused';
    toggle.hidden = reduced.matches;
    toggle.textContent = paused ? 'Putar animasi' : 'Jeda animasi';
    toggle.setAttribute('aria-label', paused ? 'Putar animasi anatomi' : 'Jeda animasi anatomi');
    toggle.setAttribute('aria-pressed', String(paused));
  }

  toggle.addEventListener('click', () => {
    paused = !paused;
    sync();
  });
  reduced.addEventListener('change', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      sync();
    }, { rootMargin: '120px 0px' }).observe(art);
  } else {
    visible = true;
  }
  sync();
}

if (typeof document !== 'undefined') initHumanAnatomy();
