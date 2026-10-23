/* hero-workspace.js - drives the hero stage: a simulated Sentrapedia workspace with a visible pointer.
   Requires gsap.min.js (loaded earlier on the page). The case is synthetic; every draft stays "Draf lokal"
   until the physician reviews it, and the status only moves after the checklist. */
(() => {
  const root = document.querySelector('[data-hero-workspace]');
  if (!root) return;
  const toggle = root.querySelector('.hero-workspace-toggle');
  if (typeof gsap === 'undefined' || typeof gsap.matchMedia !== 'function') {
    root.classList.add('is-static');
    return;
  }

  const { el, tabs, headlines, chips, chip, docTabs, copy } = bindHeroWorkspace(root);

  const mark = (group, key, className) => {
    for (const [name, node] of Object.entries(group)) node.classList.toggle(className, name === key);
  };
  const setPlaceholder = text => { el.placeholder.textContent = text; };

  /* The markup's default state is the static composition (case typed, DDx draft open). */
  const restoreStatic = () => {
    mark(tabs, 'ask', 'is-active');
    mark(headlines, 'ask', 'is-current');
    mark(chips, 'ask', 'is-current');
    mark(docTabs, 'document', 'is-active');
    el.encounter.classList.add('is-active');
    el.composer.classList.remove('is-typing');
    el.typed.textContent = copy.typedCase;
    setPlaceholder(tabs.ask.dataset.placeholder);
    for (const node of Object.values(chip)) node.classList.remove('is-pressed');
    for (const node of el.checks) node.classList.remove('is-checked');
    el.status.textContent = 'Draf';
    el.statusSelect.classList.remove('is-updated');
  };

  const build = () => buildHeroTimeline({ gsap, el, tabs, headlines, chips, chip, docTabs, copy, mark, setPlaceholder });

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: reduce)', () => {
    root.classList.add('is-static');
    toggle.hidden = true;
    return () => root.classList.remove('is-static');
  });

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const tl = build();
    const intro = root.closest('#intro');
    let arrival = null;
    let entered = false;
    let userPaused = false;
    let inView = true;

    const sync = () => {
      const paused = userPaused || !inView;
      if (!entered) {
        if (!arrival) return;
        if (paused) arrival.pause();
        else arrival.play();
      } else {
        if (paused) tl.pause();
        else tl.play();
      }
    };
    const showUi = () => {
      entered = true;
      gsap.set(el.frame, { autoAlpha: 1 });
      tl.restart();
      sync();
    };
    tl.eventCallback('onComplete', showUi);
    const onToggle = () => {
      userPaused = !userPaused;
      toggle.setAttribute('aria-pressed', String(userPaused));
      toggle.setAttribute('aria-label', userPaused ? 'Putar simulasi' : 'Jeda simulasi');
      toggle.textContent = userPaused ? 'Putar' : 'Jeda';
      sync();
    };
    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => tl.invalidate(), 150);
    };
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }, { threshold: .2 })
      : null;

    tl.seek(0, false);
    gsap.set(el.frame, { autoAlpha: 1 });

    /* Arrival: the neuron lands alone in the centre, slides left as the wordmark joins it, then the lockup
       slides left again and the tablet enters from the right. Offsets are measured from the final CSS layout, so the row and the column
       (narrow screens, where the shifts are zero) share one choreography. */
    const layout = root.parentElement;
    const stage = intro.querySelector('.hero-stage');
    const logo = stage.querySelector('.hero-stage-logo');
    const wordmark = stage.querySelector('.hero-stage-wordmark');
    const wide = window.matchMedia('(min-width: 1024px)').matches;
    const centre = node => { const box = node.getBoundingClientRect(); return box.left + box.width / 2; };
    intro.classList.add('is-choreographed');
    const stageShift = centre(layout) - centre(stage);
    const logoShift = centre(stage) - centre(logo);
    gsap.set(stage, { x: stageShift });
    gsap.set(logo, { x: logoShift, opacity: 0, scale: .72, rotation: -7 });
    gsap.set(wordmark, { opacity: 0, x: wide ? 28 : 0, y: wide ? 0 : 14 });
    gsap.set(root, { opacity: 0, x: wide ? 56 : 0, y: wide ? 0 : 28 });
    arrival = gsap.timeline({ defaults: { ease: 'power3.out' } })
      .to(logo, { opacity: 1, scale: 1, rotation: 0, duration: 1 }, .3)
      .to(logo, { x: 0, duration: .8, ease: 'power3.inOut' }, 1.5)
      .to(wordmark, { opacity: 1, x: 0, y: 0, duration: .7 }, 1.75)
      .to(stage, { x: 0, duration: .9, ease: 'power3.inOut' }, 2.8)
      .to(root, { opacity: 1, x: 0, y: 0, duration: .9 }, 2.95)
      .call(showUi, null, 3.9);
    observer?.observe(root);
    window.addEventListener('resize', onResize);
    toggle.hidden = false;
    toggle.addEventListener('click', onToggle);
    root.heroWorkspaceTimeline = tl;
    root.heroWorkspaceArrival = arrival;
    root.heroWorkspaceShowUi = showUi;

    return () => {
      arrival.kill();
      intro.classList.remove('is-choreographed');
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeTimer);
      toggle.removeEventListener('click', onToggle);
      toggle.hidden = true;
      toggle.setAttribute('aria-pressed', 'false');
      toggle.setAttribute('aria-label', 'Jeda simulasi');
      toggle.textContent = 'Jeda';
      delete root.heroWorkspaceTimeline;
      delete root.heroWorkspaceArrival;
      delete root.heroWorkspaceShowUi;
      restoreStatic();
    };
  });
})();
