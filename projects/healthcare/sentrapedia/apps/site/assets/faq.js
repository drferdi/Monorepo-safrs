(() => {
  const root = document.querySelector('#faq-page');
  const gsap = window.gsap;
  if (!root || !gsap) return;

  const initialize = () => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const items = [...root.querySelectorAll('.faq-item')].map(element => ({
      element,
      summary: element.querySelector('summary'),
      answer: element.querySelector('.faq-answer'),
      content: element.querySelector('.faq-answer-inner'),
      stroke: element.querySelector('.faq-symbol-vertical'),
      desired: element.open,
      timeline: null,
    }));
    const settle = item => {
      item.element.open = item.desired;
      item.answer.style.removeProperty('height');
      item.content.style.removeProperty('opacity');
      item.content.style.removeProperty('transform');
      item.stroke.style.removeProperty('transform');
      item.timeline = null;
    };
    const context = gsap.context(self => {
      self.add('toggleAnswer', item => {
        item.timeline?.kill();
        const wasOpen = item.element.open;
        const height = wasOpen ? item.answer.getBoundingClientRect().height : 0;
        const strokeScale = Number(gsap.getProperty(item.stroke, 'scaleY'));
        item.desired = !item.desired;
        if (preference.matches) {
          settle(item);
          return;
        }
        item.element.open = true;
        gsap.set(item.answer, { height });
        gsap.set(item.stroke, { scaleY: strokeScale });
        if (!wasOpen) gsap.set(item.content, { opacity: 0, y: 8 });
        item.timeline = gsap.timeline({
          defaults: { ease: 'power2.inOut', duration: 0.38 },
          onComplete: () => settle(item),
        })
          .to(item.answer, { height: item.desired ? item.content.scrollHeight : 0 }, 0)
          .to(item.stroke, { scaleY: item.desired ? 0 : 1, duration: 0.25 }, 0)
          .to(item.content, { opacity: item.desired ? 1 : 0, y: item.desired ? 0 : 8, duration: 0.26 }, item.desired ? 0.08 : 0);
      });
    }, root);

    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const entrance = gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from(root.querySelectorAll('.faq-title-line'), { y: 24, opacity: 0, duration: 0.75, stagger: 0.12 })
        .from(root.querySelector('.faq-intro-bottom'), { y: 12, opacity: 0, duration: 0.5 }, '-=0.4');
      const revealOnFocus = () => entrance.progress(1);
      root.addEventListener('focusin', revealOnFocus);
      return () => root.removeEventListener('focusin', revealOnFocus);
    }, root);

    const handlers = items.map(item => {
      const toggle = event => {
        event.preventDefault();
        context.toggleAnswer(item);
      };
      item.summary.addEventListener('click', toggle);
      return () => item.summary.removeEventListener('click', toggle);
    });
    const finishMotion = () => {
      items.forEach(item => {
        item.timeline?.kill();
        settle(item);
      });
    };
    preference.addEventListener('change', finishMotion);
    window.addEventListener('pagehide', () => {
      finishMotion();
      handlers.forEach(remove => remove());
      preference.removeEventListener('change', finishMotion);
      media.revert();
      context.revert();
    }, { once: true });
  };
  initialize();
  window.addEventListener('pageshow', event => {
    if (event.persisted) initialize();
  });
})();
