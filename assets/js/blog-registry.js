(() => {
  const listRoot = document.querySelector('[data-blog-registry]');
  const readerRoot = document.querySelector('[data-blog-reader]');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const displayDate = value => value ? new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${value}T12:00:00Z`)) : '';
  const postUrl = post => `/blog/read/?id=${encodeURIComponent(post.id)}`;
  const readingTime = post => `${Math.max(1, Math.ceil(String(post.body || post.summary || '').split(/\s+/).length / 220))} min read`;
  const safeUrl = value => {
    const text = String(value || '').trim();
    if (!text) return '';
    try {
      const url = new URL(text, location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  };

  function injectMetadata(post) {
    document.title = `${post.title} | CHIATECH JOURNAL`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = post.summary;
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = `${location.origin}${postUrl(post)}`;
    const schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': post.contentType === 'News' ? 'NewsArticle' : 'Article',
      headline: post.title,
      description: post.summary,
      datePublished: post.published,
      author: { '@type': 'Person', name: post.authorName },
      publisher: { '@type': 'Organization', name: 'CHIA TECH SOLUTIONS AND RESOURCES LIMITED' },
      image: post.heroImageUrl || undefined,
      keywords: (post.tags || []).join(', ')
    });
    document.head.append(schema);
  }

  function card(post, featured = false) {
    const image = safeUrl(post.heroImageUrl);
    return `<article class="blog-card${featured ? ' blog-featured' : ''}">${image ? `<img class="blog-card-media" src="${escapeHtml(image)}" alt="${escapeHtml(post.heroImageAlt || '')}" loading="lazy">` : `<div class="story-art" aria-hidden="true"><span>${escapeHtml(post.contentType)}</span><b>CHIATECH<br>JOURNAL</b></div>`}<div class="blog-card-body"><p class="eyebrow">${featured ? 'Latest story · ' : ''}${escapeHtml(post.domain)} · ${escapeHtml(post.contentType)}</p><h2><a href="${postUrl(post)}">${escapeHtml(post.title)}</a></h2><p>${escapeHtml(post.summary)}</p><div class="article-card-meta"><span>${escapeHtml(post.authorName)}</span><span>${escapeHtml(displayDate(post.published))} · ${readingTime(post)}</span></div><div class="content-tags">${(post.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div><a class="text-link" href="${postUrl(post)}">Read the story →</a></div></article>`;
  }

  async function loadList() {
    if (!listRoot || !window.CHIATECH_API) return;
    const state = listRoot.querySelector('[data-blog-state]') || listRoot;
    try {
      const response = await window.CHIATECH_API.get('blogPosts');
      if (!response.ok) throw new Error(response.error || 'The blog service is unavailable.');
      const posts = response.posts || [];
      if (!posts.length) {
        listRoot.innerHTML = '<div class="empty-publication story-empty"><p class="eyebrow">Research · People · Practice</p><h2>A space for ideas worth sharing.</h2><p>Journal news, conversations, research explainers and videos will appear here when released by the editorial team.</p><a class="btn btn-primary" href="mailto:chiatechlibrary@gmail.com">Contact the editorial office</a></div>';
        return;
      }
      listRoot.innerHTML = `<div class="registry-controls"><label>Search stories<input type="search" data-story-search placeholder="Topic, title, author or tag"></label><label>Story type<select data-story-type><option value="">All stories</option>${[...new Set(posts.map(post => post.contentType))].sort().map(type => `<option>${escapeHtml(type)}</option>`).join('')}</select></label><label>Order<select data-story-sort><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select></label></div><p class="registry-count" aria-live="polite"></p><div class="blog-registry-grid"></div>`;
      const render = () => {
        const query = listRoot.querySelector('[data-story-search]').value.trim().toLowerCase();
        const type = listRoot.querySelector('[data-story-type]').value;
        const order = listRoot.querySelector('[data-story-sort]').value;
        const filtered = posts.filter(post => (!type || post.contentType === type) && [post.title, post.summary, post.authorName, post.domain, ...(post.tags || [])].join(' ').toLowerCase().includes(query))
          .sort((a, b) => order === 'title' ? a.title.localeCompare(b.title) : order === 'oldest' ? a.published.localeCompare(b.published) : b.published.localeCompare(a.published));
        listRoot.querySelector('.registry-count').textContent = `${filtered.length} of ${posts.length} stories`;
        listRoot.querySelector('.blog-registry-grid').innerHTML = filtered.length ? filtered.map((post, index) => card(post, index === 0 && !query && !type && order === 'newest')).join('') : '<p class="content-state">No stories match these filters.</p>';
      };
      listRoot.querySelectorAll('input,select').forEach(input => input.addEventListener('input', render));
      render();
    } catch (error) {
      state.textContent = error.message || 'The blog service is temporarily unavailable.';
      state.classList.add('error');
    }
  }

  function bodyMarkup(text) {
    if (window.CHIATECH_CONTENT) return window.CHIATECH_CONTENT.format(text);
    return String(text || '').split(/\n\s*\n/).map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
  }

  function mediaMarkup(post) {
    const url = safeUrl(post.mediaUrl);
    if (!url || post.mediaType === 'NONE') return '';
    if (post.mediaType === 'VIDEO') return `<video class="blog-reader-media" src="${escapeHtml(url)}" controls controlsList="nodownload noremoteplayback" disablePictureInPicture preload="metadata">Your browser cannot play this video.</video>`;
    return `<img class="blog-reader-media" src="${escapeHtml(url)}" alt="${escapeHtml(post.heroImageAlt || `${post.title} supporting image`)}" draggable="false">`;
  }

  function showToast(text) {
    document.querySelector('.content-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'content-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = text;
    document.body.append(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  function protectReader(root) {
    ['copy', 'cut', 'contextmenu', 'dragstart'].forEach(type => root.addEventListener(type, event => {
      event.preventDefault();
      showToast('Please share the page link. Copying or downloading this blog content requires written permission.');
    }));
  }

  function shareUrl(network, page, title) {
    const url = encodeURIComponent(page);
    const text = encodeURIComponent(title);
    const targets = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
    };
    return targets[network];
  }

  async function loadReader() {
    if (!readerRoot || !window.CHIATECH_API) return;
    const id = new URLSearchParams(location.search).get('id');
    if (!id) {
      readerRoot.innerHTML = '<section class="section"><div class="container content-state error"><h1>Blog item not selected</h1><p>Choose an item from the CHIATECH JOURNAL Blog &amp; News page.</p><a class="btn btn-primary" href="/blog/">View Blog &amp; News</a></div></section>';
      return;
    }
    try {
      const response = await window.CHIATECH_API.get('blogPost', { id });
      if (!response.ok || !response.post) throw new Error(response.error || 'This item is unavailable.');
      const post = response.post;
      injectMetadata(post);
      const page = `${location.origin}${postUrl(post)}`;
      const hero = safeUrl(post.heroImageUrl);
      readerRoot.innerHTML = `<section class="blog-reader-hero"><div class="container"><p class="eyebrow">${escapeHtml(post.domain)} · ${escapeHtml(post.contentType)}</p><h1>${escapeHtml(post.title)}</h1><p class="lead">${escapeHtml(post.summary)}</p><p>${escapeHtml(post.authorName)} · ${escapeHtml(displayDate(post.published))}</p></div></section><section class="section"><div class="container blog-reader-layout"><article>${hero ? `<img class="blog-reader-media" src="${escapeHtml(hero)}" alt="${escapeHtml(post.heroImageAlt || '')}" draggable="false">` : ''}${mediaMarkup(post)}<div class="rights-notice"><strong>Reader use</strong><p>${escapeHtml(post.rightsNotice)}</p></div><div class="protected-reading" data-protected-body>${bodyMarkup(post.body)}</div><div class="content-tags">${(post.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div></article><aside class="share-panel"><p class="eyebrow">Share the authorised page</p><h2>Keep readers on the version of record</h2><p>Share this page link. Do not copy, download or repost the article text or media unless written permission or a stated licence allows it.</p><div class="share-actions"><button class="btn btn-accent" type="button" data-native-share>Share page</button><button class="btn btn-outline" type="button" data-copy-link>Copy page link</button><a class="btn btn-outline" href="${shareUrl('facebook', page, post.title)}" target="_blank" rel="noopener">Share on Facebook</a><a class="btn btn-outline" href="${shareUrl('whatsapp', page, post.title)}" target="_blank" rel="noopener">Share on WhatsApp</a><a class="btn btn-outline" href="${shareUrl('linkedin', page, post.title)}" target="_blank" rel="noopener">Share on LinkedIn</a></div></aside></div></section>`;
      const byline = readerRoot.querySelector('.blog-reader-hero .container > p:last-child');
      if (byline) byline.append(` · ${readingTime(post)}`);
      readerRoot.querySelector('[data-native-share]')?.addEventListener('click', async () => {
        if (navigator.share) {
          try { await navigator.share({ title: post.title, text: post.summary, url: page }); } catch (_) {}
        } else {
          try { await navigator.clipboard.writeText(page); showToast('Page link copied.'); } catch (_) { showToast('Copy the address from your browser.'); }
        }
      });
      readerRoot.querySelector('[data-copy-link]')?.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(page); showToast('Page link copied.'); } catch (_) { showToast('Copy the address from your browser.'); }
      });
    } catch (error) {
      readerRoot.innerHTML = `<section class="section"><div class="container content-state error"><h1>Blog item unavailable</h1><p>${escapeHtml(error.message)}</p><a class="btn btn-primary" href="/blog/">Return to Blog &amp; News</a></div></section>`;
    }
  }

  loadList();
  loadReader();
})();
