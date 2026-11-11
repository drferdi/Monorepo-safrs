(() => {
  const section = document.querySelector('#clinical-pricing');
  const gsap = window.gsap;
  if (!section || !gsap) return;

  const motion = gsap.matchMedia();
  motion.add('(prefers-reduced-motion: no-preference)', () => {
    const elements = [
      section.querySelector('.clinical-pricing-heading'),
      ...section.querySelectorAll('.clinical-price-card'),
    ];
    const reveal = gsap.from(elements, {
      autoAlpha: 0,
      y: 32,
      duration: 0.75,
      stagger: 0.11,
      ease: 'power3.out',
      paused: true,
      clearProps: 'opacity,visibility,transform',
    });
    if (!('IntersectionObserver' in window)) {
      reveal.play();
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      reveal.play();
    }, { threshold: 0.12 });
    observer.observe(section);
    return () => {
      observer.disconnect();
      reveal.kill();
      gsap.set(elements, { clearProps: 'opacity,visibility,transform' });
    };
  });
})();
