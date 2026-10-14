(() => {
  const cards = [...document.querySelectorAll('.proj-card')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set();
  const players = new Map();

  for (const card of cards) {
    const image = card.querySelector('picture[data-workflow-video] img');
    if (image) Object.assign(image.style, { objectFit: 'contain', objectPosition: 'center', transform: 'none', backgroundColor: '#ededed' });
  }

  function playerFor(card) {
    if (players.has(card)) return players.get(card);
    const picture = card.querySelector('picture[data-workflow-video]');
    const image = picture?.querySelector('img');
    const container = picture?.closest('.card-image');
    if (!image || !container) return null;
    const video = document.createElement('video');
    video.className = 'workflow-video';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    video.poster = image.src;
    video.setAttribute('aria-hidden', 'true');
    const imageStyle = getComputedStyle(image);
    Object.assign(video.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', backgroundColor: '#ededed', pointerEvents: 'none', opacity: '0', transition: imageStyle.transition });
    container.style.position = 'relative';
    container.append(video);
    video.addEventListener('playing', () => { video.style.opacity = '1'; });
    video.addEventListener('error', () => { video.style.opacity = '0'; video.dataset.playback = 'error'; });
    const player = { video, src: picture.dataset.workflowVideo, wanted: false };
    players.set(card, player);
    return player;
  }

  function update() {
    for (const card of cards) {
      const wanted = !document.hidden && !reducedMotion.matches && visible.has(card) && card.classList.contains('is-open');
      const player = wanted ? playerFor(card) : players.get(card);
      if (!player || player.wanted === wanted) continue;
      player.wanted = wanted;
      if (wanted) {
        player.video.src = player.src;
        player.video.play().catch(error => {
          if (player.wanted && error.name !== 'AbortError') {
            player.video.style.opacity = '0';
            player.video.dataset.playback = 'autoplay-blocked';
          }
        });
      } else {
        player.video.pause();
        player.video.style.opacity = '0';
        player.video.removeAttribute('src');
        player.video.load();
      }
    }
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    update();
  }, { threshold: 0.1 });
  for (const card of cards) observer.observe(card);
  const list = document.querySelector('#projectCards');
  if (list) new MutationObserver(update).observe(list, { attributes: true, attributeFilter: ['class'], subtree: true });
  document.addEventListener('visibilitychange', update);
  reducedMotion.addEventListener('change', update);
})();
