import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const skipDirectories = new Set([
  '.git', '.agents', 'node_modules', 'tools', 'backend', 'cloudflare',
  '_qa_site', '_qa_review_report', 'dist', "don't push", 'reports'
]);
const skipFiles = new Set(['README.md', 'LAUNCH-CHECKLIST.md', 'PROJECT-DIRECTORY.md']);

async function walk(directory) {
  const found = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    const relative = path.relative(root, full).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      if (skipDirectories.has(entry.name) || ['articles/2026', 'articles/JULY 2026', 'articles/_editorial_work'].includes(relative)) continue;
      found.push(...await walk(full));
    } else if (!skipFiles.has(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

async function read(relativePath) {
  return fs.readFile(path.join(root, relativePath), 'utf8');
}

async function exists(relativePath) {
  try {
    await fs.access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

function requireText(text, phrase, location) {
  if (!text.includes(phrase)) errors.push(`${location}: missing ${JSON.stringify(phrase)}`);
}

function rejectText(text, phrase, location) {
  if (text.toLowerCase().includes(phrase.toLowerCase())) errors.push(`${location}: contains prohibited text ${JSON.stringify(phrase)}`);
}

const files = await walk(root);
const htmlFiles = files.filter(file => file.endsWith('.html'));
const publicHtml = new Map();
const prohibitedPublicPhrases = [
  'REPLACE_WITH',
  'Lorem ipsum',
  '10.xxxx',
  'ADMIN_BOOTSTRAP_PASSWORD',
  'DATABASE_SHEET_ID',
  'script.google.com/macros/s/'
];

for (const file of htmlFiles) {
  const html = await fs.readFile(file, 'utf8');
  const rel = path.relative(root, file);
  publicHtml.set(rel, html);

  if (!/^<!doctype html>/i.test(html)) errors.push(`${rel}: missing HTML doctype`);
  if (!html.includes('<main')) errors.push(`${rel}: missing main landmark`);
  if (!html.includes('CHIATECH JOURNAL')) errors.push(`${rel}: missing journal identity`);
  for (const phrase of prohibitedPublicPhrases) rejectText(html, phrase, rel);

  const refs = [...html.matchAll(/(?:href|src|action)="([^"]+)"/g)].map(match => match[1]);
  for (const ref of refs) {
    if (!ref.startsWith('/') || ref.startsWith('//')) continue;
    const clean = decodeURIComponent(ref.split('#')[0].split('?')[0]);
    if (!clean || clean.startsWith('/api/')) continue;
    if (['/admin', '/admin/', '/about/editorial-board/', '/editorial/'].includes(clean)) continue;
    const candidate = path.join(root, clean.replace(/^\//, ''));
    let targetExists = false;
    try {
      const stat = await fs.stat(candidate);
      targetExists = stat.isDirectory()
        ? await fs.stat(path.join(candidate, 'index.html')).then(() => true).catch(() => false)
        : true;
    } catch {
      targetExists = false;
    }
    if (!targetExists) errors.push(`${rel}: broken local reference ${ref}`);
  }
}

const requiredPublicFiles = [
  'articles/index.html',
  'articles/read/index.html',
  'blog/index.html',
  'blog/read/index.html',
  'portal/chief-editor-login/index.html',
  'portal/editor-access/index.html',
  'netlify/functions/editorial-api.mjs',
  'assets/js/runtime-config.js',
  'assets/js/api-client.js',
  'assets/js/editorial-desk.js',
  'assets/js/editor-activation.js',
  'assets/js/journal-profile.js',
  'assets/js/article-registry.js',
  'assets/js/blog-registry.js'
];
for (const required of requiredPublicFiles) {
  if (!await exists(required)) errors.push(`${required}: missing`);
}

const home = publicHtml.get('index.html') || '';
if ((home.match(/class="scope-card /g) || []).length !== 7) errors.push('index.html: expected seven SETEHEM scope cards');
requireText(home, '/articles/', 'index.html');
requireText(home, '/blog/', 'index.html');

const admin = publicHtml.get(path.join('portal', 'chief-editor-login', 'index.html')) || '';
for (const required of [
  'noindex,nofollow,noarchive',
  'id="editorialLoginForm"',
  'data-desk-tab="overview"',
  'data-desk-tab="editors"',
  'data-desk-tab="papers"',
  'data-desk-tab="blog"',
  'data-desk-tab="settings"',
  'id="staffInviteForm"',
  'id="articlePublishForm"',
  'name="html_url"',
  'name="html_confirmed"',
  'name="video_title"',
  'name="video_url"',
  'name="video_caption_url"',
  'name="video_transcript_url"',
  'name="video_confirmed"',
  'id="blogPostForm"',
  'id="journalSettingsForm"'
]) requireText(admin, required, 'portal/chief-editor-login/index.html');

const activation = publicHtml.get(path.join('portal', 'editor-access', 'index.html')) || '';
for (const required of ['noindex,nofollow', 'id="editorActivationForm"', 'minlength="12"']) {
  requireText(activation, required, 'portal/editor-access/index.html');
}

const articleIndex = publicHtml.get(path.join('articles', 'index.html')) || '';
const articleReader = publicHtml.get(path.join('articles', 'read', 'index.html')) || '';
requireText(articleIndex, 'data-article-registry', 'articles/index.html');
requireText(articleReader, 'data-article-reader', 'articles/read/index.html');
requireText(articleReader, '/assets/js/article-registry.js', 'articles/read/index.html');

const articleScript = await read('assets/js/article-registry.js');
for (const required of [
  'apa7:', 'mla9:', 'chicago18:', 'harvard:', 'ieee:', 'vancouver:',
  'recommendedStyle', 'Read full paper (HTML)', 'Read full paper (PDF)', 'Download full paper (PDF)',
  'citation_fulltext_html_url', 'citation_pdf_url', 'ScholarlyArticle', 'VideoObject',
  'Complimentary explanatory video', 'kind="captions"', 'navigator.clipboard.writeText'
]) requireText(articleScript, required, 'assets/js/article-registry.js');

const blogIndex = publicHtml.get(path.join('blog', 'index.html')) || '';
const blogReader = publicHtml.get(path.join('blog', 'read', 'index.html')) || '';
requireText(blogIndex, 'data-blog-registry', 'blog/index.html');
requireText(blogReader, 'data-blog-reader', 'blog/read/index.html');
requireText(blogReader, '/assets/js/blog-registry.js', 'blog/read/index.html');

const blogScript = await read('assets/js/blog-registry.js');
for (const required of [
  'controlsList="nodownload noremoteplayback"',
  'navigator.share',
  'Copy page link',
  'Share this page link.'
]) requireText(blogScript, required, 'assets/js/blog-registry.js');
if (/download\s*=|download>/i.test(blogScript)) errors.push('assets/js/blog-registry.js: contains a blog download control');

const css = await read('assets/css/launch.css');
requireText(css, '@media print', 'assets/css/launch.css');
requireText(css, '.protected-reading', 'assets/css/launch.css');

const runtime = await read('assets/js/runtime-config.js');
requireText(runtime, "apiUrl: '/api/editorial'", 'assets/js/runtime-config.js');
rejectText(runtime, 'script.google.com', 'assets/js/runtime-config.js');

const proxy = await read('netlify/functions/editorial-api.mjs');
for (const required of [
  'process.env.CHIATECH_APPS_SCRIPT_URL',
  "['GET', 'POST']",
  'body.length > 400000',
  "'Cache-Control': 'no-store'",
  'script\\.google\\.com\\/macros'
]) requireText(proxy, required, 'netlify/functions/editorial-api.mjs');

const appScript = await read('backend/google-apps-script/Code.gs');
for (const required of [
  "action === 'login'",
  "action === 'logout'",
  "action === 'activateEditor'",
  "action === 'reissueEditorInvite'",
  "action === 'getEditorialDashboard'",
  "action === 'saveArticle'",
  "action === 'saveBlogPost'",
  "action === 'saveSettings'",
  "requireSession(data.token, ['ADMIN'])",
  'ADMIN_BOOTSTRAP_PASSWORD',
  'resetAdminPasswordFromScriptProperties',
  "deleteProperty('ADMIN_BOOTSTRAP_PASSWORD')",
  'maxLoginFailures: 8',
  'sessionSeconds: 6 * 60 * 60'
]) requireText(appScript, required, 'backend/google-apps-script/Code.gs');

const adminScript = await read('assets/js/editorial-desk.js');
for (const required of [
  "action: 'login'",
  "action: 'createEditor'",
  "action: 'reissueEditorInvite'",
  "action: 'updateEditor'",
  "action: 'saveArticle'",
  "action: 'saveBlogPost'",
  "action: 'saveSettings'",
  "action: 'logout'",
  'htmlConfirmed',
  'videoCaptionUrl',
  'videoTranscriptUrl',
  'videoConfirmed'
]) requireText(adminScript, required, 'assets/js/editorial-desk.js');

for (const required of [
  "'doi'", "'html_url'", "'pdf_url'", "'video_title'", "'video_url'",
  "'video_caption_url'", "'video_transcript_url'", 'Register and verify the article DOI',
  'Confirm and provide the approved full-paper HTML URL', 'Confirm and provide the complimentary explanatory video title'
]) requireText(appScript, required, 'backend/google-apps-script/Code.gs');

const redirects = await read('_redirects');
for (const required of [
  '/api/editorial /.netlify/functions/editorial-api 200!',
  '/admin /portal/chief-editor-login/ 302',
  '/articles/2026/* /404.html 410!',
  '/backend/* /404.html 404',
  '/tools/* /404.html 404'
]) requireText(redirects, required, '_redirects');

const headers = await read('_headers');
for (const required of [
  "Content-Security-Policy: default-src 'self'",
  'Strict-Transport-Security: max-age=31536000',
  '/api/*',
  'Cache-Control: no-store',
  '/portal/chief-editor-login/*',
  'X-Robots-Tag: noindex, nofollow, noarchive'
]) requireText(headers, required, '_headers');

const ignored = await read('.netlifyignore');
for (const required of [
  'tools/', 'backend/', 'cloudflare/', 'articles/2026/',
  'README.md', 'LAUNCH-CHECKLIST.md', 'PROJECT-DIRECTORY.md'
]) requireText(ignored, required, '.netlifyignore');

const serviceWorker = await read('sw.js');
for (const required of [
  "url.pathname.startsWith('/api/')",
  "url.pathname.startsWith('/portal/')",
  "url.pathname.startsWith('/submit/')"
]) requireText(serviceWorker, required, 'sw.js');

const robots = await read('robots.txt');
requireText(robots, 'Disallow: /portal/', 'robots.txt');
requireText(robots, 'Disallow: /api/', 'robots.txt');

const formChecks = [
  [path.join('submit', 'index.html'), 'manuscript-submission'],
  [path.join('portal', 'author-registration', 'index.html'), 'author-registration'],
  [path.join('portal', 'editor-registration', 'index.html'), 'editor-registration'],
  [path.join('portal', 'reviewer-registration', 'index.html'), 'reviewer-registration']
];
for (const [rel, name] of formChecks) {
  const html = publicHtml.get(rel) || '';
  if (!html.includes(`name="${name}"`) || !html.includes('data-netlify="true"')) {
    errors.push(`${rel}: Netlify form ${name} is not configured`);
  }
}

const contract = JSON.parse(await read('tools/document-contract.json'));
if (contract.publicCount !== 6 || contract.documents.length !== 6 || contract.authorMirrors !== false) errors.push('Incorrect document contract');
for (const { filename } of contract.documents) {
  if (!await exists(`downloads/${filename}`)) errors.push(`downloads/${filename}: missing`);
}

const staticArticles = JSON.parse(await read('data/articles.json'));
if (!Array.isArray(staticArticles) || staticArticles.length !== 0) {
  errors.push('data/articles.json: dynamic production requires this legacy static registry to remain an empty array');
}

const sitemap = await read('sitemap.xml');
for (const required of ['/articles/', '/blog/']) requireText(sitemap, required, 'sitemap.xml');
for (const prohibited of ['/portal/', '/api/', '/articles/read/', '/blog/read/']) rejectText(sitemap, prohibited, 'sitemap.xml');

const feed = await read('feed.xml');
if (/<item\b/i.test(feed)) errors.push('feed.xml: static feed must not contain unverified publication items');

const textExtensions = new Set(['.html', '.js', '.mjs', '.css', '.xml', '.txt', '.webmanifest', '.toml']);
for (const file of files.filter(file => textExtensions.has(path.extname(file).toLowerCase()) || path.basename(file).startsWith('_'))) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  const text = await fs.readFile(file, 'utf8');
  if (text.includes('\uFFFD')) errors.push(`${rel}: contains a Unicode replacement character`);
  if (/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/i.test(text)) {
    errors.push(`${rel}: contains an Apps Script deployment URL`);
  }
}

if (errors.length) {
  console.error(`Site validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `PASS: ${htmlFiles.length} deployable HTML pages; dynamic admin/editor/content service, ` +
  'least-privilege source checks, paper DOI/HTML/PDF/citation/video/caption controls, blog reader protections, ' +
  'six current Word resources, forms, security routing, local links and UTF-8 text validated.'
);
