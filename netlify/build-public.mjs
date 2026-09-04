import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const marker = path.join(output, '.chiatech-public-build');
if (output !== path.resolve(root, 'dist') || path.dirname(output) !== root) throw new Error('Unsafe build output.');
try {
  await fs.access(output);
  await fs.access(marker);
  await fs.rm(output, { recursive: true, force: false });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  try {
    await fs.access(output);
    throw new Error('The dist folder was not created by this build. Preserve it elsewhere before building.');
  } catch (check) { if (check.code !== 'ENOENT') throw check; }
}
await fs.mkdir(output, { recursive: true });
await fs.writeFile(marker, 'CHIATECH public build output\n');

const registry = JSON.parse(await fs.readFile(path.join(root, 'data/articles.json'), 'utf8'));
if (!Array.isArray(registry) || registry.length) throw new Error('Portal release requires an empty article registry.');

const publicAssetManifest = JSON.parse(await fs.readFile(path.join(root, 'data', 'public-asset-manifest.json'), 'utf8'));
const publicAssetExtensions = new Set(['.css', '.html', '.jpeg', '.jpg', '.pdf', '.png', '.svg', '.vtt', '.webm', '.webp', '.mp4']);
const maximumPublicAssetBytes = 30 * 1024 * 1024;
const sha256 = async file => createHash('sha256').update(await fs.readFile(file)).digest('hex');

async function filesWithin(directory) {
  const files = [];
  const visit = async current => {
    let entries;
    try { entries = await fs.readdir(current, { withFileTypes: true }); }
    catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symlinks are not allowed in publication assets: ${path.relative(root, absolute)}`);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) files.push(absolute);
      else throw new Error(`Unsupported publication-asset entry: ${path.relative(root, absolute)}`);
    }
  };
  await visit(directory);
  return files;
}

async function copyValidatedPublicationAssets() {
  if (!publicAssetManifest || publicAssetManifest.schema !== 'chiatech-journal-public-asset-manifest/v1' || !Array.isArray(publicAssetManifest.articles)) {
    throw new Error('Invalid public publication-asset manifest.');
  }
  const expected = new Map();
  const articleIds = new Set();
  for (const article of publicAssetManifest.articles) {
    const id = String(article?.id || '');
    if (!/^e\d{3}$/i.test(id) || article.publicPath !== `papers/${id}` || articleIds.has(id) || !Array.isArray(article.files) || !article.files.length) {
      throw new Error('Each public publication asset entry must have one safe eLocator, matching public path and a non-empty file list.');
    }
    articleIds.add(id);
    for (const file of article.files) {
      const relative = String(file?.path || '').replaceAll('\\', '/');
      const expectedPrefix = `papers/${id}/`;
      const extension = path.extname(relative).toLowerCase();
      if (!relative.startsWith(expectedPrefix) || relative.includes('..') || !publicAssetExtensions.has(extension) || !/^[a-f0-9]{64}$/i.test(String(file?.sha256 || '')) || !Number.isInteger(file?.bytes) || file.bytes < 1 || file.bytes > maximumPublicAssetBytes || expected.has(relative)) {
        throw new Error(`Invalid or duplicate public publication asset: ${relative || '(missing path)'}`);
      }
      expected.set(relative, { ...file, path: relative, sha256: file.sha256.toLowerCase() });
    }
  }

  const publicationRoot = path.join(root, 'papers');
  const actual = new Set((await filesWithin(publicationRoot)).map(file => path.relative(root, file).replaceAll('\\', '/')));
  const unexpected = [...actual].filter(relative => !expected.has(relative));
  const missing = [...expected.keys()].filter(relative => !actual.has(relative));
  if (unexpected.length || missing.length) {
    throw new Error(`Publication asset manifest mismatch. Unexpected: ${unexpected.join(', ') || 'none'}; missing: ${missing.join(', ') || 'none'}.`);
  }

  for (const [relative, declared] of expected) {
    const source = path.resolve(root, relative);
    if (!source.startsWith(publicationRoot + path.sep)) throw new Error(`Unsafe public publication asset path: ${relative}`);
    const information = await fs.lstat(source);
    if (!information.isFile() || information.isSymbolicLink() || information.size !== declared.bytes) throw new Error(`Publication asset size or type mismatch: ${relative}`);
    if (await sha256(source) !== declared.sha256) throw new Error(`Publication asset checksum mismatch: ${relative}`);
    const target = path.resolve(output, relative);
    if (!target.startsWith(output + path.sep)) throw new Error(`Unsafe publication output path: ${relative}`);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  }
}

const sources = [
  '.well-known', 'about', 'academic-resources', 'assets', 'authors', 'blog', 'data',
  'disciplines', 'ethics', 'issues', 'peer-review', 'policies',
  'portal', 'review-engine', 'search', 'submit', 'success',
  'articles/index.html', 'articles/read/index.html',
  'index.html', '404.html', 'offline.html', '_headers', '_redirects',
  'robots.txt', 'sitemap.xml', 'feed.xml', 'humans.txt', 'manifest.webmanifest', 'sw.js'
];
const contract = JSON.parse(await fs.readFile(path.join(root, 'tools/document-contract.json'), 'utf8'));
sources.push('downloads/index.html', ...contract.documents.map(doc => `downloads/${doc.filename}`));
const forbiddenName = /^(?:~\$|\.env(?:\.|$))|\.(?:gs|key|pem|p12|log|md|py|ps1)$/i;
const allowed = async source => {
  const info = await fs.lstat(source);
  if (info.isSymbolicLink()) throw new Error(`Symlinks are not allowed in the public build: ${path.relative(root, source)}`);
  if (forbiddenName.test(path.basename(source)) || ['.git', '.agents', 'node_modules', 'README.txt'].includes(path.basename(source))) return false;
  return true;
};
for (const relative of sources) {
  const source = path.resolve(root, relative);
  if (!source.startsWith(root + path.sep)) throw new Error('Unsafe build input.');
  await fs.cp(source, path.join(output, relative), { recursive: true, filter: allowed });
}
await copyValidatedPublicationAssets();

let files = 0;
async function audit(directory) {
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, item.name);
    if (item.isDirectory()) { await audit(absolute); continue; }
    files++;
    if (/\.(?:html|js|css|json|xml|txt|vtt|webmanifest)$/.test(item.name)) {
      const text = await fs.readFile(absolute, 'utf8');
      if (/script\.google\.com\/macros\/s\/|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|AIza[0-9A-Za-z_-]{30,}/.test(text)) {
        throw new Error(`Sensitive value detected in public file: ${path.relative(output, absolute)}`);
      }
    }
  }
}
await audit(output);
console.log(`PASS: ${files} public files built in dist. Private backend, instructions, QA and unfinished papers are excluded.`);
