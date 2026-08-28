import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { handler as editorial } from './editorial-api.mjs';
import { SECURITY_HEADERS } from '../shared/security-headers.mjs';

const base = 'https://journal.chiatechsolutions.com';
const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
export async function handler(event) {
  if (!['GET', 'HEAD'].includes(event.httpMethod)) return { statusCode: 405, headers: { ...SECURITY_HEADERS, 'Cache-Control': 'no-store', Allow: 'GET, HEAD' }, body: '' };
  const results = await Promise.all(['articles', 'blogPosts'].map(action => editorial({ httpMethod: 'GET', queryStringParameters: { action } })));
  const payloads = results.map(result => JSON.parse(result.body));
  if (results.some(result => result.statusCode !== 200) || payloads.some(payload => !payload.ok)) return { statusCode: 503, headers: { ...SECURITY_HEADERS, 'Cache-Control': 'no-store', 'Content-Type': 'text/plain' }, body: event.httpMethod === 'HEAD' ? '' : 'The publication index is temporarily unavailable.' };
  const records = [...(payloads[0].articles || []).map(record => ({ ...record, url: `${base}/articles/read/?id=${encodeURIComponent(record.id)}`, summary: record.abstract })), ...(payloads[1].posts || []).map(record => ({ ...record, url: `${base}/blog/read/?id=${encodeURIComponent(record.id)}` }))];
  const rss = event.path === '/feed.xml' || event.queryStringParameters?.format === 'rss';
  let body;
  if (rss) {
    body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>CHIATECH JOURNAL</title><link>${base}</link><description>Published papers and editorial stories from CHIATECH JOURNAL.</description>${records.sort((a, b) => b.published.localeCompare(a.published)).slice(0, 60).map(record => `<item><title>${esc(record.title)}</title><link>${esc(record.url)}</link><guid isPermaLink="true">${esc(record.url)}</guid><description>${esc(record.summary)}</description><pubDate>${new Date(`${record.published}T12:00:00Z`).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`;
  } else {
    const staticMap = await readFile(join(process.cwd(), 'sitemap.xml'), 'utf8');
    body = staticMap.replace('</urlset>', `${records.map(record => `<url><loc>${esc(record.url)}</loc><lastmod>${esc(record.published)}</lastmod></url>`).join('')}</urlset>`);
  }
  return { statusCode: 200, headers: { ...SECURITY_HEADERS, 'Content-Type': rss ? 'application/rss+xml; charset=utf-8' : 'application/xml; charset=utf-8', 'Cache-Control': 'no-store' }, body: event.httpMethod === 'HEAD' ? '' : body };
}
