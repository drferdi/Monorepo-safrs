function initMenu() {
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

}
