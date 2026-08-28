import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { handler as editorial } from './editorial-api.mjs';
import { SECURITY_HEADERS } from '../shared/security-headers.mjs';

const origin = 'https://journal.chiatechsolutions.com';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const safeUrl = value => {
  try { const url = new URL(value || '', origin); return value && url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
};
const authorName = author => [author.given, author.family].filter(Boolean).join(' ');
const meta = (name, value) => value ? `<meta name="${name}" content="${esc(value)}">` : '';
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');

export async function handler(event) {
  if (!['GET', 'HEAD'].includes(event.httpMethod)) return { statusCode: 405, headers: { ...SECURITY_HEADERS, 'Cache-Control': 'no-store', Allow: 'GET, HEAD' }, body: '' };
  const template = await readFile(join(process.cwd(), 'articles/read/index.html'), 'utf8');
  const id = event.queryStringParameters?.id || '';
  let article;
  let status = 404;
  if (id && /^[a-z0-9][a-z0-9_-]{0,199}$/i.test(id)) {
    const result = await editorial({ httpMethod: 'GET', queryStringParameters: { action: 'article', id } });
    const payload = JSON.parse(result.body);
    if (result.statusCode === 200 && payload.ok && payload.article) { article = payload.article; status = 200; }
    else if (result.statusCode >= 500) status = 503;
  }
  let content = `<section class="section"><div class="container content-state"><h1>${status === 503 ? 'Paper temporarily unavailable' : 'Paper not found'}</h1><p>${status === 503 ? 'Please try again shortly or contact the editorial office.' : 'Choose a published paper from the journal record.'}</p><a class="btn btn-primary" href="/articles/">View published papers</a></div></section>`;
  let head = meta('robots', 'noindex,follow');
  let html = template;
  if (article) {
    const page = `${origin}/articles/read/?id=${encodeURIComponent(article.id)}`;
    const pdf = safeUrl(article.pdfUrl);
    const fullHtml = safeUrl(article.htmlUrl);
    const authors = article.authors || [];
    const doi = /^10\.\d{4,9}\/\S+$/i.test(article.doi || '') ? `https://doi.org/${article.doi}` : '';
    const keywords = article.keywords || [];
    head = meta('citation_title', article.title) + authors.map(author => meta('citation_author', authorName(author))).join('') +
      meta('citation_journal_title', 'CHIATECH JOURNAL') + meta('citation_publication_date', article.published) +
      meta('citation_volume', article.volume) + meta('citation_issue', article.issue) + meta('citation_doi', article.doi) +
      meta('citation_pdf_url', pdf) + meta('citation_fulltext_html_url', fullHtml) + meta('citation_keywords', keywords.join('; ')) +
      `<script type="application/ld+json" data-paper-schema>${json({ '@context': 'https://schema.org', '@type': 'ScholarlyArticle', headline: article.title, abstract: article.abstract, datePublished: article.published, url: page, identifier: doi || undefined, author: authors.map(author => ({ '@type': 'Person', name: authorName(author), sameAs: author.orcid ? `https://orcid.org/${author.orcid}` : undefined, affiliation: author.affiliation ? { '@type': 'Organization', name: author.affiliation } : undefined })), keywords, isPartOf: { '@type': 'Periodical', name: 'CHIATECH JOURNAL' }, license: safeUrl(article.licenseUrl) || undefined, encoding: pdf ? { '@type': 'MediaObject', contentUrl: pdf, encodingFormat: 'application/pdf' } : undefined })}</script>`;
    html = html.replace(/<title>[^<]*<\/title>/i, () => `<title>${esc(article.title)} | CHIATECH JOURNAL</title>`)
      .replace(/<meta name="description"[^>]*>/i, () => meta('description', article.abstract))
      .replace(/<link rel="canonical"[^>]*>/i, () => `<link rel="canonical" href="${esc(page)}">`)
      .replace(/<meta property="og:title"[^>]*>/i, () => `<meta property="og:title" content="${esc(article.title)}">`)
      .replace(/<meta property="og:description"[^>]*>/i, () => `<meta property="og:description" content="${esc(article.abstract)}">`)
      .replace(/<meta property="og:url"[^>]*>/i, () => `<meta property="og:url" content="${esc(page)}">`);
    content = `<section class="article-hero"><div class="container"><p class="eyebrow">${esc(article.domain)} · ${esc(article.articleType)}</p><h1>${esc(article.title)}</h1><p class="article-authors">${esc(authors.map(authorName).join(', '))}</p><p>Published ${esc(article.published)}</p></div></section><section class="section"><div class="container article-reader-shell"><article class="prose"><h2>Abstract</h2><p>${esc(article.abstract)}</p><h2>Keywords</h2><p>${esc(keywords.join('; '))}</p><h2>Authors and affiliations</h2><ol>${authors.map(author => `<li><strong>${esc(authorName(author))}</strong> — ${esc(author.affiliation)}${author.orcid ? ` · <a href="https://orcid.org/${encodeURIComponent(author.orcid)}">ORCID ${esc(author.orcid)}</a>` : ''}</li>`).join('')}</ol>${doi ? `<h2>DOI</h2><a href="${esc(doi)}">${esc(article.doi)}</a>` : ''}<h2>Publication record</h2><p>Received ${esc(article.received)} · Accepted ${esc(article.accepted)} · Published ${esc(article.published)}</p><p>${esc(article.license)} · ${esc(article.copyrightHolder)}</p><noscript><p>Enable JavaScript for citation-style selection and reference-manager downloads.</p></noscript></article><aside class="pdf-access-card"><h2>Read the full paper</h2>${fullHtml ? `<a class="btn btn-accent btn-block" href="${esc(fullHtml)}">Read full paper (HTML)</a>` : ''}${pdf ? `<a class="btn btn-outline btn-block" href="${esc(pdf)}">Read full paper (PDF)</a><a class="btn btn-outline btn-block" href="${esc(safeUrl(article.pdfDownloadUrl) || pdf)}" download>Download full paper (PDF)</a>` : ''}</aside></div></section>`;
  }
  html = html.replace(/<meta name="robots"[^>]*>/i, '').replace('</head>', () => `${head}</head>`)
    .replace(/(<main\b[^>]*data-article-reader[^>]*>)[\s\S]*?(<\/main>)/i, (_, start, end) => `${article ? start.replace('>', ' data-server-rendered="true">') : start}${content}${end}`);
  return { statusCode: status, headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }, body: event.httpMethod === 'HEAD' ? '' : html };
}
