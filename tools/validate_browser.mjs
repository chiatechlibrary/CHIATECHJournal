import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (_) {
  try {
    ({ chromium } = require('playwright-core'));
  } catch (_) {
    // The release test needs only the browser driver; allow a managed Node runtime to provide playwright-core.
    ({ chromium } = require(path.join(path.dirname(path.dirname(process.execPath)), 'node_modules', 'playwright-core')));
  }
}
const root = path.join(process.cwd(), 'dist');
const output = path.join(process.cwd(), 'tools', 'browser-qa-final');
await fs.mkdir(output, { recursive: true });

const editor = {
  id: 'qa-editor',
  name: 'Verified QA Editor',
  title: 'Technology Editor',
  affiliation: 'CHIATECH JOURNAL Release Test',
  country: 'Nigeria',
  domain: 'Technology',
  orcid: '',
  bio: 'Controlled local browser-validation record. This record is never deployed.',
  imageUrl: '',
  profileUrl: '',
  appointmentStart: '2026-01-01',
  appointmentEnd: '2026-12-31',
  sortOrder: 1,
  email: 'qa-editor@local.invalid',
  status: 'INVITED',
  publicStatus: 'PRIVATE',
  lastLogin: ''
};

const paper = {
  id: 'qa-browser-paper',
  title: 'Controlled Browser Validation of the CHIATECH JOURNAL Paper Reader',
  domain: 'Technology',
  articleType: 'Release-test record',
  authors: [
    { given: 'Ada', family: 'Validation', affiliation: 'CHIATECH JOURNAL Release Test', orcid: '' },
    { given: 'Tunde', family: 'Quality', affiliation: 'CHIATECH JOURNAL Release Test', orcid: '' }
  ],
  abstract: 'This local-only record verifies abstract, keyword, citation, HTML/PDF-access and explanatory-video interface behaviour without creating a publication claim.',
  keywords: ['browser validation', 'citation interface', 'release assurance'],
  doi: '',
  volume: '',
  issue: '',
  issueTitle: 'Local QA',
  eLocator: 'qa-001',
  pages: '',
  received: '2026-08-01',
  revised: '2026-08-03',
  accepted: '2026-08-05',
  published: '2026-08-09',
  language: 'English',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  copyrightHolder: 'Release-test authors',
  htmlUrl: '/articles/full/qa-browser-paper/',
  pdfUrl: '/downloads/qa-browser-paper.pdf',
  pdfDownloadUrl: '/downloads/qa-browser-paper.pdf',
  videoTitle: 'Explanatory video for the controlled paper-reader test',
  videoUrl: '/downloads/qa-browser-video.mp4',
  videoPosterUrl: '',
  videoCaptionUrl: '/downloads/qa-browser-video.vtt',
  videoTranscriptUrl: '/downloads/qa-browser-transcript.html',
  status: 'PUBLISHED',
  updatedAt: '2026-08-09T12:00:00Z'
};

const post = {
  id: 'qa-browser-news',
  title: 'Controlled Browser Validation of Blog Reading and Sharing',
  contentType: 'News',
  domain: 'Education',
  authorName: 'CHIATECH JOURNAL Release Test',
  summary: 'A local-only record used to verify the blog reader, rights notice and share controls.',
  body: 'This text is a controlled browser-test fixture and is not a public journal announcement.\n\nThe second paragraph verifies safe plain-text rendering and protected reading controls.',
  tags: ['browser validation', 'release assurance'],
  published: '2026-08-09',
  heroImageUrl: '',
  heroImageAlt: '',
  mediaType: 'NONE',
  mediaUrl: '',
  rightsNotice: 'Read, watch and share this local test page. It is not a public journal record.',
  status: 'PUBLISHED',
  updatedAt: '2026-08-09T12:00:00Z'
};

function json(response, payload, status = 200) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}
async function bodyOf(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

let trustedDeviceSession = false;
function editorialSession() {
  const now = Date.now();
  const absoluteExpiresAt = new Date(now + (trustedDeviceSession ? 12 : 8) * 60 * 60 * 1000).toISOString();
  return {
    expiresAt: new Date(now + 60 * 60 * 1000).toISOString(),
    absoluteExpiresAt,
    idleExpiresAt: new Date(now + 60 * 60 * 1000).toISOString(),
    warningSeconds: 300,
    trustedDevice: trustedDeviceSession,
    persistent: trustedDeviceSession
  };
}

async function api(request, response, url) {
  if (request.method === 'GET') {
    const action = url.searchParams.get('action');
    if (action === 'health') return json(response, { ok: true });
    if (action === 'profile') return json(response, {
      ok: true,
      profile: {
        journalTitle: 'CHIATECH JOURNAL',
        publisher: 'CHIA TECH SOLUTIONS AND RESOURCES LIMITED',
        publisherRegistration: 'RC 1839865',
        issn: 'Pending assignment',
        doiPrefix: 'Not yet assigned',
        contactEmail: 'chiatechlibrary@gmail.com',
        submissionStatus: 'Open',
        currentIssueLabel: 'Continuous publication',
        publicAnnouncement: 'Controlled local browser validation.'
      }
    });
    if (action === 'editors') return json(response, { ok: false, error: 'Administrator access required.' }, 403);
    if (action === 'articles') return json(response, { ok: true, articles: [paper] });
    if (action === 'article') return json(response, { ok: true, article: paper });
    if (action === 'blogPosts') return json(response, { ok: true, posts: [post] });
    if (action === 'blogPost') return json(response, { ok: true, post });
    return json(response, { ok: false, error: 'Unsupported local test action.' });
  }

  const payload = JSON.parse(await bodyOf(request));
  if (payload.action === 'login') {
    trustedDeviceSession = payload.trustedDevice === true;
    return json(response, { ok: true, token: 'local-browser-qa-session', role: 'ADMIN', session: editorialSession() });
  }
  if (payload.action === 'logout') { trustedDeviceSession = false; return json(response, { ok: true }); }
  if (payload.action === 'renewSession') return json(response, { ok: true, session: editorialSession() });
  if (payload.action === 'getEditorialDashboard') return json(response, {
    ok: true,
    user: { role: 'ADMIN', name: 'Release QA Administrator', email: 'qa-admin@local.invalid', domain: 'All SETEHEM portfolios' },
    session: editorialSession(),
    editors: [editor],
    reviews: [{
      id: 'CJRE-QA-001',
      title: 'Controlled local Review Engine route',
      domain: 'Technology',
      score: 84,
      recommendation: 'Human editor follow-up required',
      createdAt: '2026-08-09T12:00:00Z'
    }],
    articles: [paper],
    blogPosts: [post],
    settings: {
      issn: 'Pending assignment',
      doiPrefix: 'Not yet assigned',
      contactEmail: 'chiatechlibrary@gmail.com',
      submissionStatus: 'Open',
      currentIssueLabel: 'Continuous publication',
      publicAnnouncement: 'Controlled local browser validation.'
    }
  });
  return json(response, { ok: true, message: 'Controlled local browser action accepted.' });
}

const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webmanifest', 'application/manifest+json'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
]);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/api/editorial') return await api(request, response, url);
    if (['/admin','/admin/','/about/editorial-board/'].includes(url.pathname)) {
      response.writeHead(302, { Location: '/portal/chief-editor-login/' });
      return response.end();
    }
    if (url.pathname === '/downloads/qa-browser-paper.pdf') {
      response.writeHead(200, { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store' });
      return response.end('%PDF-1.4\n% local browser validation\n%%EOF');
    }
    if (url.pathname === '/articles/full/qa-browser-paper/') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return response.end('<!doctype html><html lang="en"><title>Controlled full-paper HTML test</title><body><main><h1>Controlled full-paper HTML test</h1><p>Local validation fixture; not a publication record.</p></main></body></html>');
    }
    if (url.pathname === '/downloads/qa-browser-video.mp4') {
      response.writeHead(200, { 'Content-Type': 'video/mp4', 'Cache-Control': 'no-store', 'Content-Length': '0' });
      return response.end();
    }
    if (url.pathname === '/downloads/qa-browser-video.vtt') {
      response.writeHead(200, { 'Content-Type': 'text/vtt; charset=utf-8', 'Cache-Control': 'no-store' });
      return response.end('WEBVTT\n\n00:00.000 --> 00:01.000\nControlled local caption test.\n');
    }
    if (url.pathname === '/downloads/qa-browser-transcript.html') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return response.end('<!doctype html><html lang="en"><title>Controlled transcript test</title><body><main><h1>Controlled transcript test</h1><p>Local validation fixture; not a publication record.</p></main></body></html>');
    }

    let relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    let target = path.resolve(root, relative || 'index.html');
    if (target !== root && !target.startsWith(root + path.sep)) {
      response.writeHead(403);
      return response.end('Forbidden');
    }
    const stat = await fs.stat(target).catch(() => null);
    if (stat?.isDirectory()) target = path.join(target, 'index.html');
    const data = await fs.readFile(target).catch(() => null);
    if (!data) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return response.end('Not found');
    }
    response.writeHead(200, {
      'Content-Type': types.get(path.extname(target).toLowerCase()) || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    response.end(data);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(error.message);
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;
const browserExecutable = [
  process.env.QA_BROWSER_EXECUTABLE,
  chromium.executablePath(),
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean).find(existsSync);
assert.ok(browserExecutable, 'No Chromium, Chrome or Edge executable is available for browser validation');
const browser = await chromium.launch({ headless: true, executablePath: browserExecutable });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const browserErrors = [];
page.on('pageerror', error => browserErrors.push(`pageerror: ${error.message}`));
page.on('console', message => {
  if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
});

async function open(relative, screenshot) {
  const response = await page.goto(`${base}${relative}`, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200, `${relative} did not return HTTP 200`);
  await page.screenshot({ path: path.join(output, screenshot), fullPage: true, timeout: 120000, animations: 'disabled' });
}

try {
  await open('/', '01-home-desktop.png');
  assert.equal(await page.locator('.scope-card').count(), 7, 'Homepage does not show seven SETEHEM cards');
  await page.getByRole('link', { name: 'Papers' }).first().waitFor();
  await page.getByRole('link', { name: 'Blog & News' }).first().waitFor();

  await open('/articles/', '02-papers-desktop.png');
  await page.getByText(paper.title).waitFor();
  await open('/articles/read/?id=qa-browser-paper', '03-paper-reader-desktop.png');
  await page.getByRole('heading', { name: paper.title }).waitFor();
  assert.equal(await page.locator('#citationStyle').inputValue(), 'auto', 'Citation selector must default to automatic');
  assert.match(await page.locator('.citation-recommendation').innerText(), /IEEE/);
  assert.match(await page.locator('#citationText').innerText(), /CHIATECH JOURNAL/);
  await page.getByRole('link', { name: 'Read full paper (HTML)' }).waitFor();
  await page.getByRole('link', { name: 'Read full paper (PDF)' }).waitFor();
  await page.getByRole('link', { name: 'Download full paper (PDF)' }).waitFor();
  await page.getByRole('heading', { name: paper.videoTitle }).waitFor();
  assert.equal(await page.locator('video track[kind="captions"]').count(), 1, 'Paper video does not expose its captions track');
  await page.getByRole('link', { name: 'Read accessible transcript' }).waitFor();
  const citationDownload=page.locator('#downloadCitation');
  for (const [format,extension] of [['auto','txt'],['bibtex','bib'],['ris','ris']]) {
    await page.locator('#citationStyle').selectOption(format);
    assert.match(await citationDownload.getAttribute('href'),/^blob:/);
    assert.equal(await citationDownload.getAttribute('download'),`qa-browser-paper.${extension}`);
    const expected=await page.locator('#citationText').innerText();
    const downloadEvent=page.waitForEvent('download');
    await citationDownload.click();
    const downloaded=await downloadEvent;
    assert.equal(downloaded.suggestedFilename(),`qa-browser-paper.${extension}`);
    assert.equal(await fs.readFile(await downloaded.path(),'utf8'),expected);
  }

  await open('/blog/', '04-blog-desktop.png');
  await page.getByText(post.title).waitFor();
  await open('/blog/read/?id=qa-browser-news', '05-blog-reader-desktop.png');
  await page.getByRole('button', { name: 'Share page' }).waitFor();
  await page.getByRole('button', { name: 'Copy page link' }).waitFor();
  const copyPrevented = await page.locator('[data-protected-body]').evaluate(node => {
    const event = new Event('copy', { cancelable: true, bubbles: true });
    node.dispatchEvent(event);
    return event.defaultPrevented;
  });
  assert.equal(copyPrevented, false, 'Text selection remains accessible; blog exposes no download control');
  assert.equal(await page.locator('[data-protected-body] [download]').count(), 0);

  await open('/about/founding-editor/', '06-founder-desktop.png');
  await page.getByRole('heading', { name: 'CHIA SHIAONDO KENNETH', exact: true }).waitFor();

  const adminResponse = await page.goto(`${base}/admin`, { waitUntil: 'networkidle' });
  assert.equal(adminResponse.status(), 200, '/admin redirect did not reach the sign-in page');
  await page.getByLabel('Journal email').fill('qa-admin@local.invalid');
  await page.getByLabel('Password', { exact: true }).fill('local-browser-validation-password');
  await page.getByLabel('Keep me signed in on this trusted device').check();
  await page.getByRole('button', { name: 'Sign in securely' }).click();
  await page.getByRole('heading', { name: 'Journal administration' }).waitFor();
  await page.getByText('Trusted-device workday session active', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('chiatechEditorialToken')), 'local-browser-qa-session', 'Trusted-device choice must persist only the session reference');
  assert.equal(await page.evaluate(() => Object.values(localStorage).some(value => /password/i.test(value))), false, 'Browser storage must not contain a password');
  await page.getByRole('button', { name: 'Private editorial board' }).click();
  await page.getByRole('button', { name: 'Send protected invitation' }).waitFor();
  await page.getByRole('button', { name: 'Papers' }).click();
  await page.getByRole('heading', { name: 'Create or update a journal paper' }).waitFor();
  await page.getByLabel('Approved full-paper HTML URL').waitFor();
  await page.getByLabel('Public video title').waitFor();
  await page.getByLabel('WebVTT captions URL').waitFor();
  await page.getByLabel('Accessible transcript URL').waitFor();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: path.join(output, '07-admin-paper-desktop.png'), fullPage: true, timeout: 120000, animations: 'disabled' });
  await page.getByRole('button', { name: 'Blog / news' }).click();
  await page.getByRole('heading', { name: 'Create or update a blog, article or news item' }).waitFor();
  await page.getByRole('button', { name: 'Journal information' }).click();
  await page.getByRole('heading', { name: 'Update journal identity, leadership, fees and payment guidance' }).waitFor();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: path.join(output, '08-admin-settings-desktop.png'), fullPage: true, timeout: 120000, animations: 'disabled' });

  await open('/authors/guidelines/', '09-author-guidelines-desktop.png');
  await page.getByRole('heading', { name: 'Accepted-article publication package' }).waitFor();

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  const mobileResponse = await mobile.goto(`${base}/`, { waitUntil: 'networkidle' });
  assert.equal(mobileResponse.status(), 200);
  const menu = mobile.getByRole('button', { name: /Menu/ });
  await menu.click();
  assert.equal(await menu.getAttribute('aria-expanded'), 'true', 'Mobile menu did not expand');
  await mobile.screenshot({ path: path.join(output, '10-home-mobile.png'), fullPage: true, timeout: 120000, animations: 'disabled' });
  await mobile.keyboard.press('Escape');
  assert.equal(await menu.getAttribute('aria-expanded'), 'false', 'Escape must close the mobile menu');
  assert.equal(await menu.evaluate(node=>node===document.activeElement),true,'Escape must return focus to the menu');
  await mobile.close();

  const routes=['/','/about/','/about/founding-editor/','/about/contact/','/authors/fees/','/authors/','/review-engine/','/articles/','/blog/','/search/','/policies/','/ethics/','/peer-review/','/submit/','/portal/','/portal/author-registration/','/portal/chief-editor-login/','/downloads/'];
  for (const width of [1440,768,390]) {
    await page.setViewportSize({width,height:900});
    for (const route of routes) {
      const response=await page.goto(`${base}${route}`,{waitUntil:'networkidle'});
      assert.equal(response.status(),200,route);
      assert(await page.locator('h1').count()>0,`${route}: heading absent`);
      assert.equal(await page.locator('img:not([alt])').count(),0,`${route}: image alt absent`);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
      assert.equal(overflow,false,`${route}: horizontal overflow at ${width}`);
    }
  }
  console.log(`PASS: ${routes.length*3} desktop/tablet/phone route checks, headings, alt text and overflow.`);
  assert.deepEqual(browserErrors, [], `Browser errors:\n${browserErrors.join('\n')}`);
  console.log('PASS: homepage, seven SETEHEM cards, paper registry/reader/citations/DOI/HTML/PDF/video actions, captions/transcript, blog reader/share and accessible text, public founder, private-board routing, administrator login/work areas, author guidance and mobile navigation passed in Chromium.');
  console.log(`Screenshots: ${output}`);
} finally {
  await context.close();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
