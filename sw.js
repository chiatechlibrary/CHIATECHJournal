const CACHE = 'chiatech-journal-v9-editorial-resilience-20260903';
const CORE = [
  '/', '/articles/', '/blog/', '/offline.html',
  '/assets/css/style.css', '/assets/css/launch.css',
  '/assets/js/main.js', '/assets/js/runtime-config.js', '/assets/js/api-client.js',
  '/assets/js/article-registry.js', '/assets/js/blog-registry.js', '/assets/js/journal-profile.js',
  '/assets/images/chiatech-logo.png', '/assets/images/chiatechjournal-logo.PNG',
  '/assets/images/chiatech-journal-wordmark.png', '/assets/images/hero-network.svg'
];

self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
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
      const cacheable = CORE.includes(pathname) && !url.search && response.ok && response.type === 'basic' && !/no-store|private/i.test(response.headers.get('Cache-Control') || '');
      if (cacheable) {
        // Clone once before returning the live response; keep cache failures out of the console and never cache API/admin routes.
        try {
          const cacheCopy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, cacheCopy)).catch(() => undefined));
        } catch (_) {
          // The caller still receives the successful network response if a browser has already consumed its stream.
        }
      }
      return response;
    }).catch(() => caches.match(event.request).then(response => response || caches.match('/offline.html')))
  );
});
