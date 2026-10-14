(() => {
  const menuToggle = document.querySelector('#mobile-menu-open');
  const mobileMenu = document.querySelector('#mobile-menu');
  if (menuToggle && mobileMenu) {
    const syncMenu = () => menuToggle.setAttribute('aria-expanded', String(document.body.classList.contains('menu-open')));
    new MutationObserver(syncMenu).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    mobileMenu.addEventListener('click', event => {
      if (!event.target.closest('a[href^="#"]')) return;
      document.body.classList.remove('menu-open');
      menuToggle.classList.remove('active');
      syncMenu();
    });
    menuToggle.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      document.body.classList.remove('menu-open');
      menuToggle.classList.remove('active');
      syncMenu();
    });
  }

  for (const control of document.querySelectorAll('#projectCards .card-closed')) {
    const card = control.closest('.proj-card');
    const syncExpanded = () => control.setAttribute('aria-expanded', String(card.classList.contains('is-open')));
    new MutationObserver(syncExpanded).observe(card, { attributes: true, attributeFilter: ['class'] });
    control.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      control.click();
      card.querySelector('.card-open a')?.focus();
    });
  }

  const form = document.querySelector('#sentrapedia-contact form');
  if (form) {
    const submit = form.querySelector('[type="submit"]');
    const status = form.querySelector('.contact-status');
    form.addEventListener('invalid', () => {
      form.dataset.attempted = 'true';
      status.dataset.state = 'error';
      status.textContent = 'Periksa kolom wajib dan alamat email sebelum mengirim.';
    }, true);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity() || submit.disabled) return;

      submit.disabled = true;
      submit.value = 'Mengirim…';
      status.dataset.state = 'sending';
      status.textContent = 'Sedang mengirim pesan…';
      try {
        const fields = new FormData(form);
        const response = await fetch(form.action, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fields.get('your-name'),
            email: fields.get('your-email'),
            company: fields.get('company') || '',
            phone: fields.get('phone') || '',
            message: fields.get('message'),
            website: fields.get('website') || '',
            consent: fields.get('acceptance-0') === '1'
          })
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'accepted') throw new Error(result.message || 'Layanan pengiriman belum tersedia.');
        form.reset();
        delete form.dataset.attempted;
        status.dataset.state = 'success';
        status.textContent = 'Pesan diterima oleh layanan pengiriman. Terima kasih.';
      } catch (error) {
        status.dataset.state = 'error';
        status.textContent = `Pesan belum terkirim. ${error.message || 'Periksa kembali nanti.'}`;
      } finally {
        submit.disabled = false;
        submit.value = 'Kirim';
      }
    });
  }

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
})();
