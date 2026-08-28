(() => {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#mainMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (!menu.classList.contains('open')) return;
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  const path = location.pathname.replace(/index\.html$/, '');
  const navLinks = [...document.querySelectorAll('.nav-link')];
  const candidates = navLinks.filter(link => {
    const href = new URL(link.href, location.origin).pathname;
    return href === '/' ? path === '/' : path.startsWith(href);
  });
  const active = candidates.sort((a, b) => new URL(b.href).pathname.length - new URL(a.href).pathname.length)[0];
  if (active) { active.classList.add('is-active'); active.setAttribute('aria-current', 'page'); }

  const top = document.querySelector('.back-to-top');
  if (top) {
    window.addEventListener('scroll', () => top.classList.toggle('show', window.scrollY > 700), { passive: true });
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  document.querySelectorAll('.code-copy-btn').forEach(button => button.addEventListener('click', async () => {
    const code = button.closest('.code-container')?.querySelector('code')?.innerText || '';
    try {
      await navigator.clipboard.writeText(code);
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = 'Copy'; }, 1500);
    } catch (_) { button.textContent = 'Select and copy'; }
  }));

  document.querySelectorAll('[data-print]').forEach(button => button.addEventListener('click', () => window.print()));
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
})();
