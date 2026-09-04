import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = name => {
  const index = args.indexOf(name);
  return index === -1 ? '' : String(args[index + 1] || '');
};
const packageOption = option('--package');
const replace = args.includes('--replace');
if (args.includes('--help') || !packageOption) {
  console.log('Usage: node tools/stage-publication-assets.mjs --package <approved-publication-package> [--replace]');
  console.log('Stages only the explicit HTML, PDF, media, captions and transcript assets described by the package handoff into papers/<eLocator> and regenerates data/public-asset-manifest.json.');
  process.exit(args.includes('--help') ? 0 : 1);
}

const approvedExtensions = new Set(['.css', '.html', '.jpeg', '.jpg', '.pdf', '.png', '.svg', '.vtt', '.webm', '.webp', '.mp4']);
const maximumAssetBytes = 30 * 1024 * 1024;
const checksum = async file => createHash('sha256').update(await fs.readFile(file)).digest('hex');
const normalise = value => String(value || '').replaceAll('\\', '/');
const isInside = (parent, candidate) => candidate === parent || candidate.startsWith(parent + path.sep);
const withMainLandmark = html => {
  if (/<main(?:\s|>)/i.test(html)) return html;
  if (!/<body\b[^>]*>/i.test(html) || !/<\/body>/i.test(html)) throw new Error('Public HTML requires a body element before it can receive the required main landmark.');
  return html.replace(/<body\b[^>]*>/i, match => `${match}<main id="main-content">`).replace(/<\/body>/i, '</main></body>');
};

async function filesWithin(directory) {
  const files = [];
  const visit = async current => {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not accepted: ${absolute}`);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) files.push(absolute);
      else throw new Error(`Unsupported package entry: ${absolute}`);
    }
  };
  await visit(directory);
  return files;
}

function safeTarget(articleId, value) {
  const relative = normalise(value);
  const prefix = `papers/${articleId}/`;
  if (!relative.startsWith(prefix) || relative.includes('..') || !approvedExtensions.has(path.extname(relative).toLowerCase())) {
    throw new Error(`Unsafe or unsupported deployment target: ${value}`);
  }
  const absolute = path.resolve(root, relative);
  if (!isInside(path.join(root, 'papers', articleId), absolute)) throw new Error(`Target escapes the authorised article directory: ${value}`);
  return { relative, absolute };
}

const packageRoot = path.resolve(packageOption);
const handoffPath = path.join(packageRoot, 'publication_handoff', 'WEB_ASSET_PLACEMENT.json');
const handoff = JSON.parse(await fs.readFile(handoffPath, 'utf8'));
const articleId = String(handoff.article_id || '');
if (handoff.schema !== 'chiatech-journal-publication-url-handoff/v1' || !/^e\d{3}$/i.test(articleId)) throw new Error('The selected package does not contain a valid publication URL handoff.');

const sourceToTarget = new Map();
function addAsset(sourceRelative, targetRelative) {
  const source = path.resolve(packageRoot, normalise(sourceRelative));
  if (!isInside(packageRoot, source)) throw new Error(`Source escapes package: ${sourceRelative}`);
  const target = safeTarget(articleId, targetRelative);
  const existing = sourceToTarget.get(target.relative);
  if (existing && existing !== source) throw new Error(`Two package files target the same public path: ${target.relative}`);
  sourceToTarget.set(target.relative, source);
}

const htmlRoot = path.join(packageRoot, 'html');
for (const source of await filesWithin(htmlRoot)) {
  const relative = normalise(path.relative(htmlRoot, source));
  addAsset(normalise(path.relative(packageRoot, source)), `papers/${articleId}/${relative}`);
}
for (const route of Object.values(handoff.routes || {})) {
  if (route?.source_in_package && route?.deploy_target) addAsset(route.source_in_package, route.deploy_target);
}

for (const [target, source] of sourceToTarget) {
  const information = await fs.lstat(source);
  if (!information.isFile() || information.isSymbolicLink() || information.size < 1 || information.size > maximumAssetBytes) throw new Error(`Publication asset is missing, unsafe or too large: ${source}`);
}

const articleRoot = path.join(root, 'papers', articleId);
if (await fs.stat(articleRoot).then(() => true).catch(() => false)) {
  if (!replace) throw new Error(`Public asset folder already exists: ${articleRoot}. Review it first, then rerun with --replace if replacement is authorised.`);
  if (!isInside(path.join(root, 'papers'), articleRoot)) throw new Error('Unsafe replacement target.');
  await fs.rm(articleRoot, { recursive: true, force: false });
}
for (const [target, source] of sourceToTarget) {
  const destination = path.resolve(root, target);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  if (path.extname(target).toLowerCase() === '.html') await fs.writeFile(destination, withMainLandmark(await fs.readFile(source, 'utf8')), 'utf8');
  else await fs.copyFile(source, destination);
}

const manifestPath = path.join(root, 'data', 'public-asset-manifest.json');
const current = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
if (current.schema !== 'chiatech-journal-public-asset-manifest/v1' || !Array.isArray(current.articles)) throw new Error('The existing public asset manifest is invalid.');
const files = [];
for (const target of [...sourceToTarget.keys()].sort()) {
  const destination = path.resolve(root, target);
  const information = await fs.stat(destination);
  files.push({ path: target, bytes: information.size, sha256: await checksum(destination) });
}
const articleEntry = { id: articleId, publicPath: `papers/${articleId}`, files };
const articles = current.articles.filter(article => article?.id !== articleId);
articles.push(articleEntry);
articles.sort((left, right) => left.id.localeCompare(right.id));
await fs.writeFile(manifestPath, `${JSON.stringify({ schema: current.schema, articles }, null, 2)}\n`, 'utf8');
console.log(`STAGED: ${articleId}; ${files.length} approved public assets in papers/${articleId}. Review, build, test and deploy before entering the URLs in the Chief Editor form.`);
