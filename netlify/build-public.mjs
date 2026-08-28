import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

let files = 0;
async function audit(directory) {
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, item.name);
    if (item.isDirectory()) { await audit(absolute); continue; }
    files++;
    if (/\.(?:html|js|css|json|xml|txt|webmanifest)$/.test(item.name)) {
      const text = await fs.readFile(absolute, 'utf8');
      if (/script\.google\.com\/macros\/s\/|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|AIza[0-9A-Za-z_-]{30,}/.test(text)) {
        throw new Error(`Sensitive value detected in public file: ${path.relative(output, absolute)}`);
      }
    }
  }
}
await audit(output);
console.log(`PASS: ${files} public files built in dist. Private backend, instructions, QA and unfinished papers are excluded.`);
