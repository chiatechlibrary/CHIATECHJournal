import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const excluded = new Set(['.git', '.agents', 'backend', 'cloudflare', 'downloads', 'netlify', 'tools', 'dist', "don't push", 'reports']);
const nav = '<ul id="mainMenu" class="nav-list"><li><a class="nav-link" href="/">Home</a></li><li><a class="nav-link" href="/about/">About</a></li><li><a class="nav-link" href="/disciplines/">SETEHEM Scope</a></li><li><a class="nav-link" href="/articles/">Papers</a></li><li><a class="nav-link" href="/blog/">Blog &amp; News</a></li><li><a class="nav-link" href="/authors/">For Authors</a></li><li><a class="nav-link" href="/ethics/">Ethics</a></li></ul>';

async function* walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excluded.has(entry.name)) continue;
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(item);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) yield item;
  }
}

function addScript(html, source, attributes = '') {
  if (html.includes(`src="${source}"`)) return html;
  return html.replace(/<\/body>/i, `<script src="${source}"${attributes}></script></body>`);
}

function insertApiBeforeMain(html) {
  if (html.includes('src="/assets/js/api-client.js"')) return html;
  const scripts = '<script src="/assets/js/runtime-config.js"></script><script src="/assets/js/api-client.js"></script>';
  if (/<script src="\/assets\/js\/main\.js"/i.test(html)) return html.replace(/(<script src="\/assets\/js\/main\.js"[^>]*><\/script>)/i, `${scripts}$1`);
  return html.replace(/<\/body>/i, `${scripts}</body>`);
}

let changed = 0;
for await (const file of walk(root)) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (['articles/2026/', 'articles/JULY 2026/', 'articles/_editorial_work/'].some(prefix => relative.startsWith(prefix))) continue;
  let html = await fs.readFile(file, 'utf8');
  const before = html;
  html = html
    .replaceAll('https://stem.chiatechsolutions.com', 'https://journal.chiatechsolutions.com')
    .replaceAll('https://www.chiatechsolutions.com', 'https://journal.chiatechsolutions.com')
    .replaceAll('CHIATECH Journal of STEM Solutions and Resources', 'CHIATECH JOURNAL')
    .replaceAll('>Forthcoming Publications<', '>Issues &amp; Papers<')
    .replaceAll('>Forthcoming<', '>Papers<')
    .replace(/<ul id="mainMenu" class="nav-list">[\s\S]*?<\/ul>/i, nav);

  if (!relative.startsWith('portal/')) {
    html = insertApiBeforeMain(html);
    html = addScript(html, '/assets/js/journal-profile.js', ' defer');
  }
  if (relative === 'authors/guidelines/index.html' && !html.includes('Accepted-article publication package')) {
    html = html.replace(
      '<h2>7. Language and accessibility</h2><p>Write in clear English, define abbreviations, use descriptive figure captions and alt text, avoid unnecessary jargon and ensure colour is not the only way information is communicated.</p>',
      '<h2>7. Language and accessibility</h2><p>Write in clear English, define abbreviations, use descriptive figure captions and alt text, avoid unnecessary jargon and ensure colour is not the only way information is communicated.</p><h2>8. Accepted-article publication package</h2><p><strong>Accepted manuscripts are published in PDF and HTML formats, assigned a DOI, and accompanied by a complimentary explanatory video presenting the article’s key findings through narration and relevant visuals.</strong></p><p>The package is released only after the article DOI is registered, the accessible HTML and PDF versions agree, and the corresponding author approves the final scholarly record. The explanatory video itself carries no separate author or reader charge, supplements rather than replaces the paper, and must accurately represent the evidence and limitations. The journal verifies narration, visual rights, captions or transcript, accessibility and author approval before publication.</p>'
    );
  }
  if (relative === 'authors/guidelines/index.html') {
    html = html.replaceAll(
      'The explanatory video is provided at no additional author charge, supplements rather than replaces the paper, and must accurately represent the evidence and limitations.',
      'The explanatory video itself carries no separate author or reader charge, supplements rather than replaces the paper, and must accurately represent the evidence and limitations.'
    );
  }
  if (relative === 'authors/manuscript-template/index.html' && !html.includes('Accepted-article publication package')) {
    html = html.replace(
      '<li>Figure captions</li></ol><div class="resource-downloads compact">',
      '<li>Figure captions</li></ol><div class="callout info"><div class="callout-icon">PUB</div><div class="callout-body"><strong>Accepted-article publication package</strong><p>After formal acceptance and production approval, the journal releases matching full-paper HTML and PDF, registers the article DOI, and provides a complimentary narrated visual explanation of the key findings. The author checks the complete proof and video accuracy before release.</p></div></div><div class="resource-downloads compact">'
    );
  }

  if (html !== before) {
    await fs.writeFile(file, html, 'utf8');
    changed += 1;
  }
}

console.log(`Updated shared navigation, canonical identity and live public-profile hooks in ${changed} HTML file(s). Main page content was preserved.`);
