(() => {
  async function start() {
    const input = document.querySelector('#journalSearch');
    const form = document.querySelector('#searchForm');
    const out = document.querySelector('#searchResults');
    const count = document.querySelector('#resultCount');
    if (!input || !form || !out || !count || !window.CHIATECH_API) return;
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    let records = [];

    const empty = message => {
      count.textContent = '0 results';
      out.innerHTML = `<div class="empty-publication"><img src="/assets/images/chiatechjournal-logo.PNG" alt="CHIATECH JOURNAL emblem"><h2>No matching public record</h2><p>${escapeHtml(message)}</p><div class="hero-actions"><a class="btn btn-primary" href="/articles/">Published papers</a><a class="btn btn-secondary" href="/blog/">Blog &amp; News</a></div></div>`;
    };

    const render = query => {
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      const matches = records.filter(record => terms.every(term => record.search.includes(term)));
      count.textContent = `${matches.length} public result${matches.length === 1 ? '' : 's'}`;
      if (!matches.length) return empty(query ? 'Try a broader title, author, portfolio or keyword.' : 'No journal paper or blog item is public at present.');
      out.innerHTML = matches.map(record => `<article class="article-registry-card"><p class="eyebrow">${escapeHtml(record.label)}</p><h2><a href="${escapeHtml(record.url)}">${escapeHtml(record.title)}</a></h2><p>${escapeHtml(record.summary)}</p><a class="text-link" href="${escapeHtml(record.url)}">Open authorised record →</a></article>`).join('');
    };

    try {
      const [articleResponse, blogResponse] = await Promise.all([
        window.CHIATECH_API.get('articles'),
        window.CHIATECH_API.get('blogPosts')
      ]);
      const articles = articleResponse.ok ? (articleResponse.articles || []) : [];
      const posts = blogResponse.ok ? (blogResponse.posts || []) : [];
      records = [
        ...articles.map(article => ({
          label: `Journal paper · ${article.domain}`, title: article.title, summary: article.abstract,
          url: `/articles/read/?id=${encodeURIComponent(article.id)}`,
          search: [article.title, article.domain, article.articleType, article.abstract, (article.keywords || []).join(' '), (article.authors || []).map(author => `${author.given || ''} ${author.family || ''}`).join(' ')].join(' ').toLowerCase()
        })),
        ...posts.map(post => ({
          label: `${post.contentType} · ${post.domain}`, title: post.title, summary: post.summary,
          url: `/blog/read/?id=${encodeURIComponent(post.id)}`,
          search: [post.title, post.contentType, post.domain, post.authorName, post.summary, (post.tags || []).join(' ')].join(' ').toLowerCase()
        }))
      ];
      render('');
    } catch (_) { empty('The public search service is temporarily unavailable.'); }

    form.addEventListener('submit', event => { event.preventDefault(); render(input.value.trim()); });
    input.addEventListener('input', () => { if (!input.value.trim()) render(''); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
