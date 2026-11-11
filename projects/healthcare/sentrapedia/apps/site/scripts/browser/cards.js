function initCards() {
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

}
