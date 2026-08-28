(() => {
  const editable = new Set([
    '/about/', '/about/aims-scope/', '/about/contact/', '/about/indexing-archiving/', '/about/setehem-model/',
    '/academic-resources/', '/authors/', '/authors/guidelines/', '/authors/manuscript-template/',
    '/disciplines/', '/disciplines/science/', '/disciplines/technology/', '/disciplines/engineering/',
    '/disciplines/mathematics/', '/disciplines/education/', '/disciplines/humanities-social-sciences/',
    '/disciplines/entrepreneurship-management/', '/ethics/', '/peer-review/', '/policies/',
    '/policies/privacy/', '/policies/corrections-retractions/', '/policies/plagiarism-ai/',
    '/policies/copyright-licensing/', '/policies/open-access/'
  ]);
  const route = location.pathname.replace(/index\.html$/, '').replace(/\/?$/, '/');
  if (!editable.has(route) || !window.CHIATECH_API || !window.CHIATECH_CONTENT) return;
  const { escape, format } = window.CHIATECH_CONTENT;
  window.CHIATECH_API.get('contentPage', { path: route }).then(result => {
    if (!result.ok || !result.page || result.page.status !== 'PUBLISHED') return;
    const page = result.page;
    const main = document.querySelector('main');
    if (!main) return;
    document.title = `${page.title} | CHIATECH JOURNAL`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', page.summary);
    main.innerHTML = `<section class="page-hero"><div class="container"><p class="eyebrow">CHIATECH JOURNAL</p><h1>${escape(page.title)}</h1><p class="lead">${escape(page.summary)}</p></div></section><section class="section"><div class="container managed-page prose">${format(page.body)}</div></section>`;
  }).catch(() => {});
})();
