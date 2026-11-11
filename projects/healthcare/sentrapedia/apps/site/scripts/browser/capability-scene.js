function createCapabilityScene(gsap, items, reduced, getSelected) {
  let sceneMotion = null, linePulse = null, livePulse = null;
  function resetScene(item) {
    sceneMotion?.kill();
    linePulse?.kill();
    livePulse?.kill();
    sceneMotion = null;
    linePulse = null;
    livePulse = null;
    if (!gsap || !item) return;
    gsap.set(item.querySelectorAll('.clinical-index-number, h4, .clinical-capability-copy > p, .capability-explainer-label, .capability-explainer-route, .capability-explainer-pulse, .capability-live-card, .capability-live-route-signal, .capability-live-route-pulse'), { clearProps: 'transform,opacity,visibility,strokeDashoffset,strokeDasharray' });
  }

  function startScene() {
    const selected = getSelected();
    if (!gsap || sceneMotion || selected < 0 || reduced.matches) return;
    const item = items[selected];
    const route = item.querySelector('.capability-explainer-route');
    const labels = item.querySelectorAll('.capability-explainer-label');
    sceneMotion = gsap.timeline();
    sceneMotion.fromTo(item.querySelectorAll('.clinical-index-number, h4'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.65, stagger: 0.1, ease: 'power2.out' }, 0);
    sceneMotion.fromTo(item.querySelector('.clinical-capability-copy > p'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.65, ease: 'power2.out' }, 0.18);
    sceneMotion.fromTo(route, { strokeDashoffset: 304 }, { strokeDashoffset: 0, duration: 1.15, ease: 'power2.inOut' }, 0.28);
    sceneMotion.fromTo(labels, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.48, stagger: 0.14, ease: 'power2.out' }, 0.5);
    const livePath = item.querySelector('[data-live-path]');
    const cards = item.querySelectorAll('[data-live-card]');
    if (livePath) {
      const length = livePath.getTotalLength();
      sceneMotion.fromTo(livePath, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 1.25, ease: 'power2.inOut' }, 0.26);
      sceneMotion.fromTo(cards, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.62, stagger: 0.12, ease: 'power2.out' }, 0.45);
      const pulse = item.querySelector('[data-live-pulse]');
      const position = { progress: 0 };
      livePulse = gsap.to(position, { progress: 1, duration: 3.2, repeat: -1, repeatDelay: 0.3, ease: 'none', onUpdate() {
        const point = livePath.getPointAtLength(position.progress * length);
        pulse.setAttribute('cx', String(point.x));
        pulse.setAttribute('cy', String(point.y));
      } });
    }
    linePulse = gsap.fromTo(item.querySelector('.capability-explainer-pulse'), { autoAlpha: 0, x: 0 }, { autoAlpha: 1, x: 304, duration: 2.8, repeat: -1, repeatDelay: 0.45, ease: 'none' });
  }

  return { reset: resetScene, sync(motionAllowed, paused) {
    if (reduced.matches) {
      resetScene(items[getSelected()]);
    } else if (motionAllowed) {
      startScene();
      sceneMotion?.play();
      linePulse?.play();
      livePulse?.play();
    } else {
      if (paused) sceneMotion?.progress(1);
      sceneMotion?.pause();
      linePulse?.pause();
      livePulse?.pause();
    }
  } };
}
