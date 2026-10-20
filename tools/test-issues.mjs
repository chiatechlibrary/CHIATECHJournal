import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateIssueOutput, validateIssuePageSource } from '../netlify/validate-issues.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(root, process.argv[2] || 'dist');
const registry = JSON.parse(await fs.readFile(path.join(root, 'data/pioneer-articles.json'), 'utf8'));
const source = await fs.readFile(path.join(output, 'issues/index.html'), 'utf8');
const result = await validateIssueOutput(root, output);
console.log(`PASS static Issues output: ${result.papers} papers, ${result.issues} issues, ${result.pages} pages, ${result.localLinks} local links, ${result.pdfs} PDF signatures`);

let negatives = 0;
function rejects(label, mutate) {
  const changed = mutate(source);
  assert.notEqual(changed, source, `Mutation did not change source: ${label}`);
  assert.throws(() => validateIssuePageSource(changed, registry.records), undefined, `Validator accepted ${label}`);
  negatives++;
  console.log(`PASS rejects ${label}`);
}
const article = (html, id, mutate) => html.replace(new RegExp(`<article\\b(?=[^>]*data-article-id="${id}")[^>]*>[\\s\\S]*?<\\/article>`), mutate);

rejects('missing e060 despite script metadata', html => article(html, 'e060', () => ''));
rejects('JavaScript-only publication record', html => `<!doctype html><html><body class="issues-page"><script>${JSON.stringify(html)}</script></body></html>`);
rejects('a DOI marked pending', html => article(html, 'e047', paper => paper.replace('DOI: ', 'DOI pending: ')));
rejects('a duplicated title copied from another paper', html => {
  const otherTitle = html.match(/<h3 class="paper-title">([\s\S]*?)<\/h3>/)[1];
  return article(html, 'e060', paper => paper.replace(/(<h3 class="paper-title">)[\s\S]*?(<\/h3>)/, `$1${otherTitle}$2`));
});
rejects('changed author order', html => article(html, 'e001', paper => paper.replace(/(<p class="paper-authors">)([\s\S]*?)(<\/p>)/, (_, open, authors, close) => open + authors.split('; ').reverse().join('; ') + close)));
rejects('a hidden article', html => article(html, 'e047', paper => paper.replace('<article ', '<article hidden ')));
rejects('hidden author text', html => article(html, 'e047', paper => paper.replace('class="paper-authors"', 'class="paper-authors" hidden')));
rejects('an ancestor hiding the entire record', html => html.replace('<div id="publication-record">', '<div id="publication-record" hidden>'));
rejects('an article grouped into the wrong issue', html => article(html, 'e026', paper => paper.replace('data-issue="2"', 'data-issue="1"')));
rejects('an obsolete Volume 2 claim', html => html.replace('Pioneer Volume · Volume 1', 'Pioneer Volume · Volume 2'));
rejects('invented publication-day precision', html => html.replace('"datePublished":"2026-08"', '"datePublished":"2026-08-01"'));
rejects('a fabricated ISSN', html => html.replace('"@type":"Periodical",', '"@type":"Periodical","issn":"0000-0000",'));
rejects('a missing PDF destination', html => article(html, 'e047', paper => paper.replace('/papers/e047/pdf/e047.pdf', '/papers/e047/pdf/missing.pdf')));
rejects('a title existing only in search data', html => article(html, 'e060', paper => paper.replace(/(<h3 class="paper-title">)[\s\S]*?(<\/h3>)/, '$1$2')));
console.log(`PASS ${negatives} isolated mutation checks; no publication files were modified or copied.`);
