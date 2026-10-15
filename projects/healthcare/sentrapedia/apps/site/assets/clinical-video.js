(() => {
  const root = document.querySelector('#home-bottom');
  const frame = root?.querySelector('.clinical-video');
  const video = frame?.querySelector('video');
  const toggle = frame?.querySelector('.clinical-video-toggle');
  if (!root || !frame || !video || !toggle) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let paused = false;
  function update() {
    const label = video.paused ? 'Putar' : 'Jeda';
    toggle.textContent = label;
    toggle.setAttribute('aria-label', label + ' video');
    toggle.setAttribute('aria-pressed', String(!video.paused));
  }
  function play() {
    video.play().catch(error => {
      if (error.name !== 'AbortError') video.dataset.playback = 'autoplay-blocked';
      update();
    });
  }
  function sync() {
    if (!visible || document.hidden || reduced.matches) video.pause();
    else if (!paused && video.paused) play();
    update();
  }
  toggle.addEventListener('click', () => {
    if (video.paused) { paused = false; play(); }
    else { paused = true; video.pause(); }
    update();
  });
  video.addEventListener('play', update);
  video.addEventListener('pause', update);
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }, { threshold: 0.2 }) : null;
  if (observer) observer.observe(frame);
  else visible = true;
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  sync();
  let completeNote = () => {};
  let skipRequested = false;
  for (const link of root.querySelectorAll('.clinical-text-link')) {
    const target = root.querySelector(link.hash);
    if (!target) continue;
    link.addEventListener('click', event => {
      event.preventDefault();
      window.history.pushState(null, '', link.hash);
      if (link.hasAttribute('data-clinical-skip')) { skipRequested = true; completeNote(); }
      else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 84, behavior: 'instant' });
      target.focus({ preventScroll: true });
    });
  }
  const note = root.querySelector('#clinical-note');
  const scrollToNote = () => window.scrollTo({ top: note.getBoundingClientRect().top + window.scrollY - 84, behavior: 'instant' });
  completeNote = scrollToNote;
  const { gsap, ScrollTrigger, SplitText, DrawSVGPlugin } = window;
  if (!gsap || !ScrollTrigger || !SplitText || !DrawSVGPlugin) return;
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
  const motion = gsap.matchMedia();
  document.fonts.ready.then(() => {
    if (!root.isConnected) return;
    motion.add({
      desktop: '(min-width: 1001px) and (min-height: 740px)',
      animate: '(prefers-reduced-motion: no-preference)'
    }, context => {
      if (!context.conditions.animate) { completeNote = scrollToNote; return; }
      const splits = [];
      function split(element, type) {
        const result = SplitText.create(element, { type, mask: 'words', aria: 'auto' });
        result.words.forEach(word => word.parentElement.classList.add('clinical-word-mask'));
        splits.push(result);
        return result;
      }
      const title = split(root.querySelectorAll('.clinical-title-line'), 'words,chars');
      gsap.timeline({ scrollTrigger: {
        trigger: root.querySelector('.clinical-opening'), start: 'top 85%', end: 'center 40%', scrub: 0.5
      } }).from(title.chars, { yPercent: 140, autoAlpha: 0, rotation: 3, duration: 1.2, stagger: 0.035, ease: 'power3.out' });
      const story = root.querySelector('.clinical-story');
      const stages = [...story.querySelectorAll('.clinical-stage')];
      const chapters = [...story.querySelectorAll('.clinical-chapters li')];
      const rows = [...note.querySelectorAll('.clinical-note-row')];
      const strikes = note.querySelectorAll('.clinical-note-strike');
      const circle = note.querySelector('.clinical-note-circle');
      const words = stages.map(stage => split(stage.querySelector('.clinical-stage-title'), 'words').words);
      gsap.set(note.querySelectorAll('.clinical-note-doctor .clinical-note-ink'), { clipPath: 'inset(0 100% 0 0)' });
      gsap.set(note.querySelectorAll('.clinical-note-sentrapedia .clinical-note-ink'), { opacity: 0, y: 4 });
      gsap.set([...strikes, circle], { drawSVG: 0 });
      let current = -1;
      function select(index) {
        if (current === index) return;
        current = index;
        chapters.forEach((chapter, i) => {
          chapter.classList.toggle('is-current', i === index);
          if (i === index) chapter.setAttribute('aria-current', 'step');
          else chapter.removeAttribute('aria-current');
        });
        story.dataset.stage = String(index + 1);
      }
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        onUpdate() { select(Math.min(stages.length - 1, Math.floor((this.time() + 0.2) / 2))); }
      });
      if (context.conditions.desktop) {
        story.classList.add('is-pinned');
        gsap.set(stages.slice(1), { opacity: 0 });
      } else {
        stages.forEach((stage, i) => {
          gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 90%', end: 'top 45%', scrub: 0.4 } })
            .from(words[i], { yPercent: 140, duration: 0.7, stagger: 0.1, ease: 'power3.out' });
        });
      }
      stages.forEach((stage, i) => {
        const start = i * 2;
        timeline.addLabel('clinical-' + (i + 1), start);
        if (context.conditions.desktop && i) {
          timeline.to(stages[i - 1], { opacity: 0, y: -18, duration: 0.3 }, start - 0.3);
          timeline.fromTo(stage, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.35 }, start);
          timeline.fromTo(words[i], { yPercent: 140 }, { yPercent: 0, stagger: 0.08, duration: 0.55, ease: 'power3.out' }, start + 0.08);
        }
        timeline.to(rows[i].querySelectorAll('.clinical-note-doctor .clinical-note-ink'), { clipPath: 'inset(0 0% 0 0)', duration: 0.85 }, start + 0.2);
        timeline.to(rows[i].querySelectorAll('.clinical-note-sentrapedia .clinical-note-ink'), { opacity: 1, y: 0, duration: 0.4 }, start + 0.8);
        if (i === 3) timeline.to(strikes, { drawSVG: '100%', duration: 0.45, stagger: 0.12 }, start + 1);
        if (i === 5) timeline.to(circle, { drawSVG: '100%', duration: 0.6 }, start + 1.05);
      });
      timeline.to({}, { duration: 0.45 });
      const trigger = ScrollTrigger.create({
        id: 'clinical-reasoning', trigger: context.conditions.desktop ? story : note,
        animation: timeline, start: context.conditions.desktop ? 'top 84px' : 'top 90%',
        end: context.conditions.desktop ? () => '+=' + Math.round(window.innerHeight * stages.length * 0.8) : 'bottom 60%',
        pin: context.conditions.desktop, scrub: 0.45, anticipatePin: context.conditions.desktop ? 1 : 0,
        invalidateOnRefresh: true
      });
      completeNote = () => {
        if (context.conditions.desktop) {
          window.scrollTo({ top: trigger.end - 1, behavior: 'instant' });
          ScrollTrigger.update();
          trigger.getTween()?.progress(1);
          timeline.progress(1);
        } else {
          trigger.disable(false);
          timeline.progress(1);
          scrollToNote();
        }
      };
      select(0);
      if (skipRequested) completeNote();
      const capabilityViewport = root.querySelector('.clinical-capability-viewport');
      const track = capabilityViewport.querySelector('.clinical-capability-index');
      const capabilityItems = [...track.querySelectorAll('.clinical-capability')];
      const counter = capabilityViewport.querySelector('[data-clinical-capability-count]');
      gsap.fromTo(root.querySelector('.clinical-product-intro img'), {
        clipPath: 'inset(0 0 100% 0)', scale: 1.02
      }, {
        clipPath: 'inset(0 0 0% 0)', scale: 1, ease: 'none',
        scrollTrigger: { id: 'clinical-product-intro', trigger: root.querySelector('.clinical-index-intro'), start: 'top 88%', end: 'top 30%', scrub: 0.45 }
      });
      if (context.conditions.desktop) {
        capabilityViewport.classList.add('is-horizontal');
        const travel = () => Math.max(0, track.scrollWidth - capabilityViewport.clientWidth);
        let activeCapability = -1;
        const rail = gsap.timeline({ scrollTrigger: {
          id: 'clinical-capabilities-right', trigger: capabilityViewport,
          start: 'top 84px', end: () => '+=' + Math.round(travel() * 0.8),
          pin: true, scrub: 0.45, anticipatePin: 1, invalidateOnRefresh: true
        }, onUpdate() {
            const center = capabilityViewport.getBoundingClientRect().left + capabilityViewport.clientWidth / 2;
            let closest = Infinity;
            let index = 0;
            capabilityItems.forEach((item, i) => {
              const rect = item.getBoundingClientRect();
              const distance = Math.abs((rect.left + rect.right) / 2 - center);
              if (distance < closest) { closest = distance; index = i; }
            });
            if (activeCapability !== index) {
              activeCapability = index;
              counter.textContent = String(index + 1).padStart(2, '0') + ' / 10';
              capabilityViewport.dataset.capability = String(index + 1);
            }
          }
        });
        rail.fromTo(track, { x: 0 }, { x: () => -travel(), duration: 1, ease: 'none' }, 0);
        rail.fromTo(track.querySelectorAll('.clinical-product-visual img'), { y: 12, scale: 1.035 }, { y: -12, scale: 1, duration: 1, ease: 'none' }, 0);
      } else {
        track.querySelectorAll('.clinical-product-visual img').forEach(image => {
          gsap.fromTo(image, { clipPath: 'inset(0 0 12% 0)' }, {
            clipPath: 'inset(0 0 0% 0)', ease: 'none',
            scrollTrigger: { trigger: image.parentElement, start: 'top 90%', end: 'center 65%', scrub: 0.4 }
          });
        });
      }
      return () => {
        completeNote = scrollToNote;
        story.classList.remove('is-pinned');
        delete story.dataset.stage;
        chapters.forEach(chapter => { chapter.classList.remove('is-current'); chapter.removeAttribute('aria-current'); });
        capabilityViewport.classList.remove('is-horizontal');
        delete capabilityViewport.dataset.capability;
        counter.textContent = '01 / 10';
        splits.forEach(item => item.revert());
      };
    }, root);
    ScrollTrigger.refresh();
  });
  window.addEventListener('pagehide', event => {
    if (!event.persisted) { motion.revert(); observer?.disconnect(); }
    video.pause();
  });
})();
