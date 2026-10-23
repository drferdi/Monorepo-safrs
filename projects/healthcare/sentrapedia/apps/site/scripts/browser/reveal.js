function initReveal() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;

  const targets = document.querySelectorAll(
    '#home-text .section-subtitle, #home-text h2, ' +
    '#featured-projects .section-subtitle, #home-bottom h2, footer .footer-p-light'
  );
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.1 });

  for (const target of targets) {
    target.classList.add('audit-reveal');
    observer.observe(target);
  }
}
