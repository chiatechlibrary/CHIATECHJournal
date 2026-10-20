import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { writeIssuePages } from '../netlify/render-issues.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await writeIssuePages(root);
console.log('PASS: generated static Pioneer issue pages from data/pioneer-articles.json (25 + 35 = 60 papers).');
