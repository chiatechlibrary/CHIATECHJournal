import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = 'https://journal.chiatechsolutions.com';
const publisher = 'CHIA TECH SOLUTIONS AND RESOURCES LIMITED';
export const issueDefinitions = [
  { number: '1', title: 'Pioneer Volume · July 2026 · Part 1', month: 'July 2026', date: '2026-07', count: 25, first: 1, last: 25, route: '/issues/volume-1-issue-1/' },
  { number: '2', title: 'Pioneer Volume · August 2026 · Part 2', month: 'August 2026', date: '2026-08', count: 35, first: 26, last: 60, route: '/issues/volume-1-issue-2/' }
];
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const authorName = author => [author.given, author.family].filter(Boolean).join(' ');
const localUrl = value => {
  const url = new URL(value);
  assert.equal(url.origin, base, 'Publication links must use the journal origin');
  assert(!url.search && !url.hash, 'Canonical publication links must not have query strings or fragments');
  return url.pathname;
};

export async function readIssueRegistry(root) {
  const registry = JSON.parse(await fs.readFile(path.join(root, 'data/pioneer-articles.json'), 'utf8'));
  assert.equal(registry.schema, 'chiatech-journal-public-articles/v1');
  assert.equal(registry.journal_doi, '10.68232/cj');
  assert.equal(registry.records.length, 60, 'The Pioneer registry must contain exactly 60 records');
  const records = [...registry.records].sort((a, b) => a.article_id.localeCompare(b.article_id));
  records.forEach((record, index) => {
    const id = `e${String(index + 1).padStart(3, '0')}`;
    const issue = issueDefinitions[index < 25 ? 0 : 1];
    assert.equal(record.article_id, id, 'Missing or duplicate Pioneer eLocator');
    assert.equal(record.elocator, id);
    assert(record.title?.trim() && record.authors?.length, `${id}: title and authors are required`);
    assert(record.authors.every(author => authorName(author).trim()), `${id}: empty author name`);
    assert.equal(record.volume, '1');
    assert.equal(record.issue, issue.number);
    assert.equal(record.issue_title, issue.title);
    assert.equal(record.published, issue.date);
    assert.equal(record.doi_status, 'REGISTERED');
    assert.equal(record.registered_doi, `10.68232/cj.${id}`);
    assert.equal(record.canonical_doi_url, `https://doi.org/10.68232/cj.${id}`);
    assert.equal(localUrl(record.html_url), `/papers/${id}/`);
    assert.equal(localUrl(record.pdf_reader_url), `/papers/${id}/pdf/${id}.pdf`);
  });
  return records;
}

function paperMarkup(record) {
  const id = record.article_id;
  const authors = record.authors.map(authorName).join('; ');
  const metadata = [record.portfolio, record.article_type].filter(Boolean);
  const search = [id, record.title, authors, ...metadata, ...(record.keywords || []), `Volume ${record.volume}`, `Issue ${record.issue}`, record.issue_title, record.published].join(' ');
  return `<article class="paper-record" id="${id}" data-article-id="${id}" data-volume="${record.volume}" data-issue="${record.issue}" data-portfolio="${escape(record.portfolio || '')}" data-search="${escape(search)}">
  <p class="paper-elocator">${id}</p>
  <h3 class="paper-title"><a href="${escape(localUrl(record.html_url))}">${escape(record.title)}</a></h3>
  <p class="paper-authors"><a href="${escape(localUrl(record.html_url))}" aria-label="Authors of ${id}: ${escape(authors)}">${escape(authors)}</a></p>
${metadata.length ? `  <p class="paper-meta">${metadata.map(escape).join(' · ')}</p>` : ''}
  <p class="paper-doi">DOI: <a href="${escape(record.canonical_doi_url)}">${escape(record.canonical_doi_url)}</a></p>
  <nav class="paper-links" aria-label="Access ${id}">
    <a href="${escape(localUrl(record.html_url))}" aria-label="View ${id} article">View article</a>
    <a href="${escape(localUrl(record.pdf_reader_url))}" aria-label="Open ${id} PDF">PDF</a>
    <a href="${escape(record.canonical_doi_url)}" aria-label="Resolve DOI ${escape(record.registered_doi)}">DOI</a>
  </nav>
</article>`;
}

function issueSection(issue, records) {
  return `<section class="issue-register" id="issue-${issue.number}" data-issue-section aria-labelledby="issue-${issue.number}-title">
  <header class="issue-heading">
    <p class="issue-kicker">Volume 1 · Issue ${issue.number} · <time datetime="${issue.date}">${issue.month}</time></p>
    <h2 id="issue-${issue.number}-title">${issue.title}</h2>
    <p>${issue.count} published papers · e${String(issue.first).padStart(3, '0')}–e${String(issue.last).padStart(3, '0')}</p>
    <a href="${issue.route}">View issue ${issue.number}</a> · <a href="#issue-${issue.number}">Permanent section link</a>
  </header>
  <div class="paper-list">${records.filter(record => record.issue === issue.number).map(paperMarkup).join('\n')}</div>
</section>`;
}

function structuredData(issues, route) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Periodical', '@id': `${base}/#journal`, name: 'CHIATECH JOURNAL', url: `${base}/`, sameAs: 'https://doi.org/10.68232/cj', identifier: '10.68232/cj', publisher: { '@type': 'Organization', name: publisher, address: { '@type': 'PostalAddress', addressCountry: 'NG' } } },
      { '@type': 'PublicationVolume', '@id': `${base}/issues/#volume-1`, volumeNumber: '1', name: 'Pioneer Volume', isPartOf: { '@id': `${base}/#journal` } },
      ...issues.map(issue => ({ '@type': 'PublicationIssue', '@id': `${base}${issue.route}#issue`, name: issue.title, issueNumber: issue.number, datePublished: issue.date, url: `${base}${issue.route}`, isPartOf: { '@id': `${base}/issues/#volume-1` } })),
      { '@type': 'CollectionPage', '@id': `${base}${route}`, name: 'Issues & Published Papers | CHIATECH JOURNAL', url: `${base}${route}`, about: { '@id': `${base}/#journal` }, hasPart: issues.map(issue => ({ '@id': `${base}${issue.route}#issue` })) }
    ]
  };
}

export function renderIssuePage(records, selectedIssue) {
  const issues = selectedIssue ? [selectedIssue] : issueDefinitions;
  const shownRecords = records.filter(record => issues.some(issue => record.issue === issue.number));
  const route = selectedIssue?.route || '/issues/';
  const title = selectedIssue ? `${selectedIssue.title} | CHIATECH JOURNAL` : 'Issues & Published Papers | CHIATECH JOURNAL';
  const description = selectedIssue
    ? `${selectedIssue.title}. Volume 1, Issue ${selectedIssue.number}: ${selectedIssue.count} published papers with authors, eLocators, registered Crossref DOIs, article pages and PDFs.`
    : 'Browse 60 Pioneer papers in CHIATECH JOURNAL Volume 1: Issue 1, July 2026, and Issue 2, August 2026. Authors, registered DOIs, article pages and PDFs.';
  const portfolios = [...new Set(shownRecords.map(record => record.portfolio).filter(Boolean))].sort();
  const schema = JSON.stringify(structuredData(issues, route)).replaceAll('<', '\\u003c');
  return `<!doctype html>
<!-- Generated from data/pioneer-articles.json by netlify/render-issues.mjs. Edit the registry or renderer, then run node tools/build-issues.mjs. -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${base}${route}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="CHIATECH JOURNAL">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${base}${route}">
  <link rel="stylesheet" href="/assets/css/issues.css">
  <link rel="icon" href="/assets/icons/favicon-32.png">
  <script type="application/ld+json">${schema}</script>
  <script src="/assets/js/issues.js" defer></script>
</head>
<body class="issues-page">
<a class="skip-link" href="#main-content">Skip to publication record</a>
<header class="issue-masthead"><div class="issue-container">
  <a href="/" aria-label="CHIATECH JOURNAL home">CHIATECH JOURNAL</a>
  <nav class="issue-nav" aria-label="Journal navigation"><a href="/">Home</a><a href="/issues/"${selectedIssue ? '' : ' aria-current="page"'}>Issues</a><a href="/about/">About the journal</a><a href="/authors/guidelines/">For authors</a><a href="/about/contact/">Contact</a></nav>
</div></header>
<main class="issue-container" id="main-content">
  <header class="issue-intro">
    <p class="issue-kicker">CHIATECH JOURNAL · Publication record</p>
    <h1>${selectedIssue ? escape(selectedIssue.title) : 'Issues &amp; Published Papers'}</h1>
    <p class="issue-description">Browse the published issues of CHIATECH JOURNAL. Each article is assigned a persistent Crossref DOI and is available through its Version-of-Record landing page.</p>
    <p>${selectedIssue ? `Volume 1 · Issue ${selectedIssue.number} · ${selectedIssue.month} · ${selectedIssue.count} published papers. <a href="/issues/">Browse all 60 Pioneer articles</a>.` : 'Pioneer Volume · Volume 1 · 2 issues · 60 published papers.'}</p>
    <div class="journal-facts"><dl>
      <div><dt>Publisher</dt><dd>${publisher}</dd></div>
      <div><dt>Country</dt><dd>Nigeria</dd></div>
      <div><dt>Journal DOI</dt><dd><a href="https://doi.org/10.68232/cj">https://doi.org/10.68232/cj</a></dd></div>
      <div><dt>DOI registration</dt><dd>DOIs registered with Crossref · Prefix 10.68232</dd></div>
      <div><dt>ISSN</dt><dd>Pending official assignment</dd></div>
    </dl></div>
  </header>
  <nav class="issue-summary-grid" aria-label="Pioneer issues">${issues.map(issue => `<article class="issue-summary"><p class="issue-kicker">Volume 1 · Issue ${issue.number}</p><h2><a href="${issue.route}">${issue.title}</a></h2><p><time datetime="${issue.date}">${issue.month}</time> · ${issue.count} published papers</p><p><a href="${issue.route}#issue-${issue.number}">Browse issue ${issue.number} papers</a></p></article>`).join('\n')}</nav>
  <form id="issue-filters" class="issue-filters" role="search" aria-label="Filter published papers" hidden>
    <label for="paper-search">Search published papers<input id="paper-search" type="search" placeholder="Title, author, eLocator or keyword" autocomplete="off" aria-controls="publication-record"></label>
    <label for="paper-issue">Volume / issue<select id="paper-issue"><option value="">All issues in Volume 1</option>${issues.map(issue => `<option value="${issue.number}">Volume 1 · Issue ${issue.number} · ${issue.month}</option>`).join('')}</select></label>
    <label for="paper-portfolio">Portfolio<select id="paper-portfolio"><option value="">All portfolios</option>${portfolios.map(portfolio => `<option value="${escape(portfolio)}">${escape(portfolio)}</option>`).join('')}</select></label>
    <button id="clear-paper-filters" type="reset">Clear filters</button>
    <p id="paper-filter-status" role="status" aria-live="polite" aria-atomic="true">${shownRecords.length} papers</p>
  </form>
  <div id="publication-record">${issues.map(issue => issueSection(issue, shownRecords)).join('\n')}</div>
  <p id="paper-no-results" hidden>No published papers match these filters. Try another title, author, eLocator or keyword.</p>
</main>
<footer class="issue-footer"><div class="issue-container"><p>CHIATECH JOURNAL · ${publisher} · Nigeria</p><p><a href="/issues/">Publication record</a> · <a href="/policies/open-access/">Open access</a> · <a href="/about/contact/">Contact the journal</a></p></div></footer>
</body>
</html>
`;
}

export async function writeIssuePages(root, output = root) {
  const records = await readIssueRegistry(root);
  for (const issue of [undefined, ...issueDefinitions]) {
    const target = path.join(output, issue?.route || '/issues/', 'index.html');
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, renderIssuePage(records, issue));
  }
  return records;
}
