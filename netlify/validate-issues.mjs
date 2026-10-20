import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const origin = 'https://journal.chiatechsolutions.com';
const publisher = 'CHIA TECH SOLUTIONS AND RESOURCES LIMITED';
const definitions = [
  { number: '1', route: '/issues/volume-1-issue-1/', title: 'Pioneer Volume · July 2026 · Part 1', month: 'July 2026', date: '2026-07', count: 25 },
  { number: '2', route: '/issues/volume-1-issue-2/', title: 'Pioneer Volume · August 2026 · Part 2', month: 'August 2026', date: '2026-08', count: 35 }
];
const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const decode = value => String(value).replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, key) => {
  if (key[0] === '#') return String.fromCodePoint(key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1)));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[key.toLowerCase()] || entity;
});
const normalize = value => decode(value).replace(/\s+/g, ' ').trim();
const authorName = author => [author.given, author.family].filter(Boolean).join(' ');
const hasClass = (node, name) => (node.attrs?.class || '').split(/\s+/).includes(name);
const descendants = (node, predicate) => node.children.flatMap(child => typeof child === 'string' ? [] : [...(predicate(child) ? [child] : []), ...descendants(child, predicate)]);
const text = node => normalize(node.children.map(child => typeof child === 'string' ? child : text(child)).join(' '));
const attrPath = value => new URL(value, origin).pathname;

// Read generated HTML as source. Script contents can never satisfy visible-record checks.
function parseSource(source) {
  const clean = source.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const document = { tag: '#document', attrs: {}, children: [], parent: null };
  const stack = [document];
  for (const token of clean.match(/<![^>]*>|<\/?[a-z][^>]*>|[^<]+|</gi) || []) {
    if (/^<!/.test(token)) continue;
    if (/^<\//.test(token)) {
      const tag = token.match(/^<\/\s*([^\s>]+)/)?.[1].toLowerCase();
      let index = stack.length - 1;
      while (index > 0 && stack[index].tag !== tag) index--;
      if (index > 0) stack.length = index;
      continue;
    }
    if (/^<[a-z]/i.test(token)) {
      const tag = token.match(/^<([^\s/>]+)/)[1].toLowerCase();
      const attrs = {};
      const attrSource = token.slice(tag.length + 1).replace(/\/?\s*>$/, '');
      for (const match of attrSource.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
        attrs[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
      }
      const node = { tag, attrs, children: [], parent: stack.at(-1) };
      stack.at(-1).children.push(node);
      if (!voidElements.has(tag) && !/\/\s*>$/.test(token)) stack.push(node);
    } else stack.at(-1).children.push(token);
  }
  return document;
}

function assertVisible(node, label) {
  for (let current = node; current; current = current.parent) {
    assert(!Object.hasOwn(current.attrs, 'hidden'), `${label}: publication record is hidden in initial HTML`);
    assert.notEqual(current.attrs['aria-hidden'], 'true', `${label}: publication record is hidden from accessibility APIs`);
    assert(!/(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse))/i.test(current.attrs.style || ''), `${label}: publication record is hidden by inline style`);
  }
}

function validateRegistry(records) {
  assert.equal(records.length, 60, 'Registry must contain exactly 60 Pioneer papers');
  const ordered = [...records].sort((a, b) => a.article_id.localeCompare(b.article_id));
  ordered.forEach((record, index) => {
    const id = `e${String(index + 1).padStart(3, '0')}`;
    const issue = definitions[index < 25 ? 0 : 1];
    assert.equal(record.article_id, id, 'Registry has a missing or duplicate eLocator');
    assert.equal(record.elocator, id);
    assert(record.title?.trim() && record.authors?.length, `${id}: title and ordered authors are required`);
    assert(record.authors.every(author => authorName(author).trim()), `${id}: empty author name`);
    assert.equal(record.volume, '1', `${id}: volume must remain 1`);
    assert.equal(record.issue, issue.number, `${id}: incorrect issue`);
    assert.equal(record.issue_title, issue.title, `${id}: incorrect issue title`);
    assert.equal(record.published, issue.date, `${id}: publication month must retain month precision`);
    assert.equal(record.doi_status, 'REGISTERED', `${id}: registered DOI state changed`);
    assert.equal(record.registered_doi, `10.68232/cj.${id}`);
    assert.equal(record.canonical_doi_url, `https://doi.org/10.68232/cj.${id}`);
    assert.equal(record.html_url, `${origin}/papers/${id}/`);
    assert.equal(record.pdf_reader_url, `${origin}/papers/${id}/pdf/${id}.pdf`);
  });
  return ordered;
}

function validateSchema(source, issues, route) {
  const blocks = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(match => /\btype\s*=\s*["']application\/ld\+json["']/i.test(match[1]));
  assert(blocks.length, `${route}: JSON-LD is missing`);
  const graphs = blocks.flatMap(match => {
    const parsed = JSON.parse(match[2]);
    return Array.isArray(parsed) ? parsed : parsed['@graph'] || [parsed];
  });
  const types = type => graphs.filter(node => Array.isArray(node['@type']) ? node['@type'].includes(type) : node['@type'] === type);
  const journals = types('Periodical');
  assert.equal(journals.length, 1, `${route}: one Periodical is required`);
  const journal = journals[0];
  assert.equal(journal.name, 'CHIATECH JOURNAL');
  assert.equal(journal.url, `${origin}/`);
  assert.equal(journal.sameAs, 'https://doi.org/10.68232/cj');
  assert.equal(journal.identifier, '10.68232/cj');
  assert.equal(journal.publisher?.name, publisher);
  assert.equal(journal.publisher?.address?.addressCountry, 'NG');
  const volumes = types('PublicationVolume');
  assert.equal(volumes.length, 1, `${route}: one PublicationVolume is required`);
  assert.equal(String(volumes[0].volumeNumber), '1');
  assert.equal(volumes[0].isPartOf?.['@id'], journal['@id']);
  const issueNodes = types('PublicationIssue');
  assert.equal(issueNodes.length, issues.length, `${route}: wrong number of PublicationIssue nodes`);
  for (const issue of issues) {
    const matches = issueNodes.filter(node => String(node.issueNumber) === issue.number);
    assert.equal(matches.length, 1, `${route}: missing or duplicate issue ${issue.number} schema`);
    assert.equal(matches[0].name, issue.title);
    assert.equal(matches[0].datePublished, issue.date, `${route}: do not invent a publication day`);
    assert.equal(matches[0].url, `${origin}${issue.route}`);
    assert.equal(matches[0].isPartOf?.['@id'], volumes[0]['@id']);
  }
  const inspect = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.notEqual(key.toLowerCase(), 'issn', `${route}: ISSN has not been officially assigned`);
      inspect(child);
    }
  };
  graphs.forEach(inspect);
}

/** Verify the actual static source. Exported separately for isolated negative tests. */
export function validateIssuePageSource(source, registryRecords, route = '/issues/') {
  const allRecords = validateRegistry(registryRecords);
  const issues = route === '/issues/' ? definitions : definitions.filter(issue => issue.route === route);
  assert(issues.length, `Unknown issue page route: ${route}`);
  const expected = allRecords.filter(record => issues.some(issue => issue.number === record.issue));
  const document = parseSource(source);
  const visibleText = text(document);
  const allNodes = descendants(document, () => true);
  const body = allNodes.find(node => node.tag === 'body');
  assert(body && hasClass(body, 'issues-page'), `${route}: static issue page body is missing`);
  for (const phrase of ['CHIATECH JOURNAL', publisher, 'Nigeria', '10.68232/cj']) assert(visibleText.includes(phrase), `${route}: missing visible journal identity: ${phrase}`);
  assert(!/Loading the publication record|PENDING_REGISTRATION|\bV2I1\b|2026-v2-i1|Volume\s*2\b|Volume 1,? Issue 1\s*[·—-]\s*Pioneer July\/August 2026\s*[·—-]\s*Part 2/i.test(visibleText), `${route}: stale publication claim in visible HTML`);
  assert(!/(?:\bDOI\b\s*(?::|status\s*:)?\s*(?:pending|proposed|reserved|to be registered)|(?:pending|proposed|reserved)\s+(?:registration\s+of\s+)?DOI|Crossref DOI prefix not yet obtained)/i.test(visibleText), `${route}: registered DOI described as pending`);
  assert(!/\bISSN\s*:?\s*(?:assigned\b|(?:\d|x){4}-(?:\d|x){3}[\dx])/i.test(visibleText), `${route}: unsupported assigned ISSN`);
  const canonical = allNodes.filter(node => node.tag === 'link' && (node.attrs.rel || '').split(/\s+/).includes('canonical'));
  assert.equal(canonical.length, 1, `${route}: canonical link is missing or duplicated`);
  assert.equal(canonical[0].attrs.href, `${origin}${route}`);
  assert(!allNodes.some(node => node.tag === 'meta' && /robots/i.test(node.attrs.name || '') && /noindex/i.test(node.attrs.content || '')), `${route}: public issues cannot be noindexed`);
  const titles = allNodes.filter(node => node.tag === 'title');
  assert.equal(titles.length, 1);
  assert(text(titles[0]).includes('CHIATECH JOURNAL'), `${route}: descriptive title is missing`);
  const sections = allNodes.filter(node => Object.hasOwn(node.attrs, 'data-issue-section'));
  assert.equal(sections.length, issues.length, `${route}: incorrect issue section count`);
  const papers = allNodes.filter(node => hasClass(node, 'paper-record'));
  assert.equal(papers.length, expected.length, `${route}: expected ${expected.length} static paper records`);
  for (const issue of issues) {
    assert(visibleText.includes(issue.title) && visibleText.includes(issue.month), `${route}: visible issue title or publication month is missing`);
    const selected = sections.filter(node => node.attrs.id === `issue-${issue.number}`);
    assert.equal(selected.length, 1, `${route}: issue ${issue.number} section is missing or duplicated`);
    assertVisible(selected[0], `Issue ${issue.number}`);
    assert.equal(descendants(selected[0], node => hasClass(node, 'paper-record')).length, issue.count, `${route}: issue ${issue.number} must contain ${issue.count} papers`);
    assert(descendants(selected[0], node => node.tag === 'time' && node.attrs.datetime === issue.date).length, `${route}: issue publication month is missing`);
  }
  const ids = allNodes.filter(node => node.attrs.id).map(node => node.attrs.id);
  assert.equal(new Set(ids).size, ids.length, `${route}: duplicate HTML ID`);
  for (const record of expected) {
    const id = record.article_id;
    const matches = papers.filter(node => node.attrs['data-article-id'] === id);
    assert.equal(matches.length, 1, `${route}: missing or duplicate ${id} article record`);
    const paper = matches[0];
    assert.equal(paper.tag, 'article', `${id}: paper record must be a semantic article`);
    assertVisible(paper, id);
    assert.equal(paper.attrs['data-volume'], '1', `${id}: incorrect visible-record volume`);
    assert.equal(paper.attrs['data-issue'], record.issue, `${id}: incorrect visible-record issue`);
    let ancestor = paper.parent;
    while (ancestor && !Object.hasOwn(ancestor.attrs, 'data-issue-section')) ancestor = ancestor.parent;
    assert.equal(ancestor?.attrs.id, `issue-${record.issue}`, `${id}: article is grouped under the wrong issue`);
    const field = className => {
      const found = descendants(paper, node => hasClass(node, className));
      assert.equal(found.length, 1, `${id}: ${className} is missing or duplicated`);
      assertVisible(found[0], `${id}: ${className}`);
      for (const child of descendants(found[0], () => true)) assertVisible(child, `${id}: ${className}`);
      return found[0];
    };
    assert.equal(text(field('paper-title')), normalize(record.title), `${id}: article title differs from registry`);
    assert.equal(text(field('paper-authors')), normalize(record.authors.map(authorName).join('; ')), `${id}: authors or author order differs from registry`);
    assert.equal(text(field('paper-elocator')), record.elocator, `${id}: visible eLocator differs from registry`);
    assert.equal(text(field('paper-doi')), `DOI: ${record.canonical_doi_url}`, `${id}: visible DOI differs from registered DOI`);
    const titleLinks = descendants(field('paper-title'), node => node.tag === 'a');
    assert.equal(titleLinks.length, 1, `${id}: title must be a real HTML text link`);
    assert.equal(titleLinks[0].attrs.href, attrPath(record.html_url), `${id}: title has the wrong HTML destination`);
    const links = descendants(paper, node => node.tag === 'a').map(node => node.attrs.href);
    for (const href of [attrPath(record.html_url), attrPath(record.pdf_reader_url), record.canonical_doi_url]) assert(links.includes(href), `${id}: missing publication link ${href}`);
  }
  validateSchema(source, issues, route);
  return { document, ids: new Set(ids), links: allNodes.flatMap(node => ['href', 'src'].filter(key => node.attrs[key]).map(key => node.attrs[key])), records: papers.length };
}

async function outputFile(output, pathname) {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '');
  let target = path.resolve(output, relative);
  assert(target === path.resolve(output) || target.startsWith(`${path.resolve(output)}${path.sep}`), `Link leaves public output: ${pathname}`);
  try {
    if ((await fs.stat(target)).isDirectory()) target = path.join(target, 'index.html');
  } catch {
    if (!path.extname(target)) target = path.join(target, 'index.html');
  }
  assert((await fs.stat(target)).isFile(), `Missing public file: ${pathname}`);
  return target;
}

function parseRedirects(source) {
  return source.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#')).map(line => {
    const [from, to, status = '301'] = line.split(/\s+/);
    return { from, to, status };
  });
}

/** Build gate: source completeness, publication assets, discovery and permanent legacy URLs. */
export async function validateIssueOutput(root, output) {
  const registry = JSON.parse(await fs.readFile(path.join(root, 'data/pioneer-articles.json'), 'utf8'));
  assert.equal(registry.schema, 'chiatech-journal-public-articles/v1');
  assert.equal(registry.journal_doi, '10.68232/cj');
  const records = validateRegistry(registry.records);
  const parsedPages = new Map();
  for (const route of ['/issues/', ...definitions.map(issue => issue.route)]) {
    const source = await fs.readFile(await outputFile(output, route), 'utf8');
    parsedPages.set(route, validateIssuePageSource(source, records, route));
  }
  const fragmentCache = new Map([...parsedPages].map(([route, page]) => [route, page.ids]));
  let localLinks = 0;
  for (const [route, page] of parsedPages) {
    for (const href of page.links) {
      if (href === '#' || /^(?:mailto|tel):/i.test(href)) continue;
      const link = new URL(href, `${origin}${route}`);
      if (link.origin !== origin) continue;
      const file = await outputFile(output, link.pathname);
      localLinks++;
      if (link.hash && /\.html?$/i.test(file)) {
        if (!fragmentCache.has(link.pathname)) {
          const target = parseSource(await fs.readFile(file, 'utf8'));
          fragmentCache.set(link.pathname, new Set(descendants(target, node => node.attrs.id).map(node => node.attrs.id)));
        }
        assert(fragmentCache.get(link.pathname).has(decodeURIComponent(link.hash.slice(1))), `${route}: missing fragment target ${href}`);
      }
    }
  }
  for (const record of records) {
    const landing = await outputFile(output, attrPath(record.html_url));
    assert(/<(?:!doctype\s+html|html\b)/i.test(await fs.readFile(landing, 'utf8')), `${record.article_id}: landing page is not HTML`);
    const pdf = await fs.open(await outputFile(output, attrPath(record.pdf_reader_url)), 'r');
    try {
      const header = Buffer.alloc(5);
      await pdf.read(header, 0, 5, 0);
      assert.equal(header.toString('ascii'), '%PDF-', `${record.article_id}: PDF link does not contain a PDF`);
    } finally { await pdf.close(); }
  }
  const sitemap = await fs.readFile(path.join(output, 'sitemap.xml'), 'utf8');
  const locations = [...sitemap.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)].map(match => decode(match[1]).trim());
  assert(locations.length, 'Static sitemap contains no URLs');
  for (const route of ['/issues/', ...definitions.map(issue => issue.route), ...records.map(record => attrPath(record.html_url))]) assert(locations.includes(`${origin}${route}`), `Sitemap is missing ${route}`);
  assert.equal(new Set(locations).size, locations.length, 'Sitemap contains duplicate URLs');
  for (const location of locations) {
    const url = new URL(location);
    assert.equal(url.origin, origin, 'Sitemap must use the canonical journal origin');
    assert(!/(?:^|\/)(?:admin|portal|drafts?|private|editorial|editorial-board|_editorial_work|don['’]?t(?:%20| )push)(?:\/|$)/i.test(decodeURIComponent(url.pathname)), `Private URL in public sitemap: ${url.pathname}`);
  }
  const redirects = parseRedirects(await fs.readFile(path.join(output, '_redirects'), 'utf8'));
  assert(!redirects.some(rule => rule.from === '/sitemap.xml' && rule.to.includes('/.netlify/functions/') && rule.status.startsWith('200')), 'Static sitemap is overridden by a function rewrite');
  const assertPermanent = (from, to) => {
    const exact = redirects.filter(rule => rule.from === from);
    assert.equal(exact.length, 1, `Missing or duplicate legacy redirect: ${from}`);
    assert.equal(exact[0].to, to, `Legacy destination changed: ${from}`);
    assert.equal(exact[0].status, '301!', `Legacy destination must have a forced permanent redirect: ${from}`);
  };
  for (const suffix of ['/', '/index.html']) assertPermanent(`/issues/2026-v2-i1-august-2026${suffix}`, definitions[1].route);
  for (const record of records) {
    if (record.crossref_resource_url && record.crossref_resource_url !== record.html_url) {
      const old = new URL(record.crossref_resource_url);
      assert.equal(old.origin, origin, `${record.article_id}: unexpected DOI legacy target origin`);
      assertPermanent(old.pathname, attrPath(record.html_url));
    }
  }
  return { papers: records.length, issues: definitions.length, pages: parsedPages.size, localLinks, pdfs: records.length, sitemapUrls: locations.length };
}
