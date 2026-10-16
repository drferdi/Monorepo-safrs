(() => {
  const root = document.querySelector('#legal-page');
  if (!root) return;
  const gsap = window.gsap;

  const initialize = () => {
    const links = [...root.querySelectorAll('.legal-toc a[href^="#"]')];
    const articles = links.map(link => root.querySelector(link.getAttribute('href'))).filter(Boolean);
    let observer = null;
    if (articles.length && 'IntersectionObserver' in window) {
      const visible = new Map();
      const setCurrent = id => links.forEach(link => {
        if (link.getAttribute('href') === '#' + id) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
      // The reading band is the upper part of the viewport; the last article that has entered it is the current one.
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => visible.set(entry.target.id, entry.isIntersecting));
        const current = articles.findLast(article => visible.get(article.id));
        if (current) setCurrent(current.id);
      }, { rootMargin: '-20% 0px -55% 0px' });
      articles.forEach(article => observer.observe(article));
    }

    let media = null;
    if (gsap) {
      media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const entrance = gsap.timeline({ defaults: { ease: 'power3.out' } })
          .from(root.querySelectorAll('.legal-title-line'), { y: 24, opacity: 0, duration: 0.75, stagger: 0.12 })
          .from(root.querySelector('.legal-intro-bottom'), { y: 12, opacity: 0, duration: 0.5 }, '-=0.4');
        root.legalEntrance = entrance;
        const revealOnFocus = () => entrance.progress(1);
        root.addEventListener('focusin', revealOnFocus);
        return () => {
          root.removeEventListener('focusin', revealOnFocus);
          delete root.legalEntrance;
        };
      }, root);
    }

    window.addEventListener('pagehide', () => {
      observer?.disconnect();
      media?.revert();
    }, { once: true });
  };

  initialize();
  window.addEventListener('pageshow', event => {
    if (event.persisted) initialize();
  });
})();
