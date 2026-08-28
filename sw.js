const CACHE = 'chiatech-journal-v8-audited-release-20260828';
const CORE = [
  '/', '/articles/', '/blog/', '/offline.html',
  '/assets/css/style.css', '/assets/css/launch.css',
  '/assets/js/main.js', '/assets/js/runtime-config.js', '/assets/js/api-client.js',
  '/assets/js/article-registry.js', '/assets/js/blog-registry.js', '/assets/js/journal-profile.js',
  '/assets/images/chiatech-logo.png', '/assets/images/chiatechjournal-logo.PNG',
  '/assets/images/chiatech-journal-wordmark.png', '/assets/images/hero-network.svg'
];

self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch (_) { return; }
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/.netlify/') ||
    url.pathname.startsWith('/api/') ||
    /^\/(?:submit|portal)(?:\/|$)/.test(pathname) ||
    url.pathname.startsWith('/submit/') ||
    url.pathname.startsWith('/portal/') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/articles/read') ||
    url.pathname.startsWith('/blog/read') ||
    ['/sitemap.xml', '/feed.xml'].includes(url.pathname) ||
    url.pathname.startsWith('/editorial') ||
    url.pathname.startsWith('/about/editorial-board') ||
    pathname.startsWith("/don't push/") ||
    url.hostname === 'api.crossref.org'
  ) return;
  event.respondWith(
    fetch(event.request).then(response => {
      if (CORE.includes(pathname) && !url.search && response.ok && response.type === 'basic' && !/no-store|private/i.test(response.headers.get('Cache-Control') || '')) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(event.request).then(response => response || caches.match('/offline.html')))
  );
});
