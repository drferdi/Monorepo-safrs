/* Muted in-view playback for the promo beneath the Sentrapedia wordmark. */
const productFilm = document.querySelector('#product-film');

if (productFilm) {
  const video = productFilm.querySelector('.product-film-video');
  const toggle = productFilm.querySelector('.product-film-toggle');
  const caption = productFilm.querySelector('figcaption');
  const kicker = productFilm.querySelector('.product-film-kicker');
  const typeLines = [...productFilm.querySelectorAll('[data-film-type]')].map(node => ({
    node,
    text: node.textContent.trim()
  }));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let inView = false;
  let optedIn = false;
  let manuallyPaused = false;
  let typingTimeline = null;
  let typingDone = false;
  let entranceTimeline = null;
  let entranceDone = false;

  const canAnimate = () => !reducedMotion.matches && typeof gsap !== 'undefined' && typeof gsap.timeline === 'function';

  const finishTyping = () => {
    typingTimeline = null;
    typingDone = true;
    for (const { node, text } of typeLines) {
      node.textContent = text;
      node.classList.remove('is-typing');
    }
  };

  const showFullCopy = () => {
    typingTimeline?.kill();
    finishTyping();
  };

  const syncTyping = () => {
    if (typingDone) return;
    if (reducedMotion.matches) {
      showFullCopy();
      return;
    }
    if (!entranceDone) return;
    if (!inView) {
      typingTimeline?.pause();
      return;
    }
    if (typeof gsap === 'undefined' || typeof gsap.timeline !== 'function') return;
    if (!typingTimeline) {
      typingTimeline = gsap.timeline({ paused: true, onComplete: finishTyping });
      for (const { node, text } of typeLines) {
        const characters = Array.from(text);
        const progress = { count: 0 };
        typingTimeline.call(() => {
          node.textContent = '';
          node.classList.add('is-typing');
        });
        typingTimeline.to(progress, {
          count: characters.length,
          duration: Math.min(2.8, Math.max(.8, characters.length * .023)),
          ease: 'none',
          onUpdate: () => { node.textContent = characters.slice(0, Math.round(progress.count)).join(''); }
        });
        typingTimeline.call(() => {
          node.textContent = text;
          node.classList.remove('is-typing');
        });
      }
    }
    typingTimeline.play();
  };

  const finishEntrance = () => {
    entranceDone = true;
    syncTyping();
  };

  const syncEntrance = () => {
    if (entranceDone) return;
    if (reducedMotion.matches || !canAnimate()) {
      entranceTimeline?.kill();
      if (typeof gsap !== 'undefined') gsap.set([video, caption, kicker], { clearProps: 'transform,opacity,visibility' });
      finishEntrance();
      return;
    }
    if (!inView) entranceTimeline?.pause();
    else entranceTimeline?.play();
  };

  if (canAnimate()) {
    for (const { node } of typeLines) node.textContent = '';
    entranceTimeline = gsap.timeline({ paused: true, onComplete: finishEntrance });
    entranceTimeline.fromTo(video,
      { autoAlpha: 0, y: 28, scale: 1.025 },
      { autoAlpha: 1, y: 0, scale: 1, duration: .9, ease: 'power3.out' }, 0);
    entranceTimeline.fromTo(caption,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: .45, ease: 'power2.out' }, .35);
    entranceTimeline.fromTo(kicker,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: .5, ease: 'power2.out' }, .24);
  }

  const updateControl = () => {
    const playing = !video.paused;
    toggle.textContent = playing ? 'Jeda' : 'Putar';
    toggle.setAttribute('aria-label', playing ? 'Jeda film' : 'Putar film');
    toggle.setAttribute('aria-pressed', String(playing));
  };

  const sync = () => {
    syncEntrance();
    syncTyping();
    const canPlay = inView && !manuallyPaused && (!reducedMotion.matches || optedIn);
    if (!canPlay) {
      video.pause();
      updateControl();
      return;
    }
    video.play().then(updateControl).catch(updateControl);
  };

  toggle.addEventListener('click', () => {
    if (video.paused) {
      optedIn = true;
      manuallyPaused = false;
    } else {
      manuallyPaused = true;
    }
    sync();
  });

  video.addEventListener('play', updateControl);
  video.addEventListener('pause', updateControl);
  video.addEventListener('error', () => {
    video.pause();
    toggle.disabled = true;
    toggle.textContent = 'Film tidak tersedia';
    toggle.setAttribute('aria-label', 'Film tidak tersedia');
  });
  reducedMotion.addEventListener('change', sync);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].intersectionRatio >= .3;
      sync();
    }, { threshold: .3 }).observe(productFilm);
  } else {
    inView = true;
    sync();
  }
}
