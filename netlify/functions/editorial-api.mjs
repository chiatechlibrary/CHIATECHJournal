import { SECURITY_HEADERS } from '../shared/security-headers.mjs';

const JSON_HEADERS = {
  ...SECURITY_HEADERS,
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff'
};

function response(statusCode, payload, cacheControl = 'no-store') {
  return {
    statusCode,
    headers: { ...JSON_HEADERS, 'Cache-Control': cacheControl },
    body: JSON.stringify(payload)
  };
}

function upstreamUrl() {
  const value = String(process.env.CHIATECH_APPS_SCRIPT_URL || '').trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/i.test(value)) return '';
  return value;
}

export async function handler(event) {
  if (!['GET', 'POST'].includes(event.httpMethod)) return response(405, { ok: false, error: 'Method not allowed.' });
  const publicActions = new Set(['health', 'profile', 'articles', 'article', 'blogPosts', 'blogPost', 'contentPage']);
  if (event.httpMethod === 'GET' && !publicActions.has(String(event.queryStringParameters?.action || ''))) {
    return response(403, { ok: false, error: 'This record requires authorised administrator access.' });
  }
  const upstream = upstreamUrl();
  if (!upstream) return response(503, { ok: false, error: 'The journal editorial service is not connected.' });

  try {
    if (event.httpMethod === 'GET') {
      const url = new URL(upstream);
      Object.entries(event.queryStringParameters || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
      });
      const result = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(12000) });
      const body = await result.text();
      if (!result.ok) return response(502, { ok: false, error: 'The public journal service returned an error.' });
      JSON.parse(body);
      return { statusCode: 200, headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' }, body };
    }

    const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : String(event.body || '');
    if (!body || body.length > 400000) return response(413, { ok: false, error: 'The editorial request is empty or too large.' });
    let payload;
    try { payload = JSON.parse(body); }
    catch (_) { return response(400, { ok: false, error: 'Send a valid JSON editorial request.' }); }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return response(400, { ok: false, error: 'Send an editorial request object.' });
    const postActions = new Set(['login', 'logout', 'activateEditor', 'recordReview', 'getEditorialDashboard', 'createEditor', 'reissueEditorInvite', 'updateEditor', 'publishArticle', 'saveArticle', 'setArticleStatus', 'saveBlogPost', 'setBlogPostStatus', 'saveSettings', 'saveContentPage']);
    if (!postActions.has(payload.action)) return response(400, { ok: false, error: 'Unsupported editorial action.' });
    const result = await fetch(upstream, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow',
      signal: AbortSignal.timeout(18000)
    });
    const text = await result.text();
    if (!result.ok) return response(502, { ok: false, error: 'The editorial service returned an error.' });
    JSON.parse(text);
    return { statusCode: 200, headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' }, body: text };
  } catch (error) {
    console.error('CHIATECH editorial proxy request failed', error?.name || 'UpstreamError');
    return response(502, { ok: false, error: 'The journal editorial service could not be reached.' });
  }
}
