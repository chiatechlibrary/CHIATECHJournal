import { SECURITY_HEADERS } from '../shared/security-headers.mjs';

const JSON_HEADERS = {
  ...SECURITY_HEADERS,
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff'
};

function response(statusCode, payload, cacheControl = 'no-store', relayState = '') {
  return {
    statusCode,
    headers: { ...JSON_HEADERS, 'Cache-Control': cacheControl, ...(relayState ? { 'X-CHIATECH-Relay-State': relayState } : {}) },
    body: JSON.stringify(payload)
  };
}

function upstreamFailure(state) {
  return response(502, {
    ok: false,
    error: 'The journal editorial service is temporarily unavailable. Please try again shortly. If this continues, the release owner must check the Apps Script deployment and Netlify Function logs.'
  }, 'no-store', state);
}

function upstreamUrl() {
  const value = String(process.env.CHIATECH_APPS_SCRIPT_URL || '').trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/i.test(value)) return '';
  return value;
}

async function forwardToUpstream(url, requestOptions) {
  let result;
  try {
    result = await fetch(url, requestOptions);
  } catch (error) {
    const state = ['AbortError', 'TimeoutError'].includes(error?.name) ? 'upstream-timeout' : 'upstream-unreachable';
    console.error('CHIATECH editorial relay failure', state, error?.name || 'UpstreamError');
    return upstreamFailure(state);
  }

  let text;
  try {
    text = await result.text();
  } catch (error) {
    console.error('CHIATECH editorial relay response read failed', error?.name || 'UpstreamReadError');
    return upstreamFailure('upstream-unreadable');
  }
  if (!result.ok) {
    console.error('CHIATECH editorial relay upstream status', result.status);
    return upstreamFailure('upstream-status');
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch (_) {
    console.error('CHIATECH editorial relay received invalid JSON');
    return upstreamFailure('upstream-invalid-json');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    console.error('CHIATECH editorial relay received an invalid JSON object');
    return upstreamFailure('upstream-invalid-payload');
  }
  return response(200, payload);
}

export async function handler(event) {
  if (!['GET', 'POST'].includes(event.httpMethod)) return response(405, { ok: false, error: 'Method not allowed.' });
  const publicActions = new Set(['health', 'profile', 'articles', 'article', 'blogPosts', 'blogPost', 'contentPage']);
  if (event.httpMethod === 'GET' && !publicActions.has(String(event.queryStringParameters?.action || ''))) {
    return response(403, { ok: false, error: 'This record requires authorised administrator access.' });
  }
  const upstream = upstreamUrl();
  if (!upstream) return response(503, { ok: false, error: 'The journal editorial service is not connected.' });

  if (event.httpMethod === 'GET') {
    const url = new URL(upstream);
    Object.entries(event.queryStringParameters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    });
    return forwardToUpstream(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(12000) });
  }

  const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : String(event.body || '');
  if (!body || body.length > 400000) return response(413, { ok: false, error: 'The editorial request is empty or too large.' });
  let payload;
  try { payload = JSON.parse(body); }
  catch (_) { return response(400, { ok: false, error: 'Send a valid JSON editorial request.' }); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return response(400, { ok: false, error: 'Send an editorial request object.' });
  const postActions = new Set(['login', 'logout', 'renewSession', 'activateEditor', 'recordReview', 'getEditorialDashboard', 'createEditor', 'reissueEditorInvite', 'updateEditor', 'publishArticle', 'saveArticle', 'setArticleStatus', 'saveBlogPost', 'importBlogBotDraft', 'setBlogPostStatus', 'saveSettings', 'saveContentPage']);
  if (!postActions.has(payload.action)) return response(400, { ok: false, error: 'Unsupported editorial action.' });
  return forwardToUpstream(upstream, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body,
    redirect: 'follow',
    signal: AbortSignal.timeout(20000)
  });
}
