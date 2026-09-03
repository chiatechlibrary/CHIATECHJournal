(() => {
  const configured = window.CHIATECH_RUNTIME?.apiUrl || document.querySelector('meta[name="chiatech-api-url"]')?.content?.trim() || '';
  const apiUrl = configured.trim();
  const requestTimeoutMs = 25000;

  function unavailableMessage(status) {
    if (status === 502 || status === 504) {
      return 'The journal editorial service is temporarily unavailable. Please try again shortly. If this continues, the release owner must check the Apps Script deployment and Netlify Function logs.';
    }
    if (status === 503) return 'The journal editorial service is not connected. Contact the release owner to restore the private service connection.';
    return `Editorial service returned ${status}.`;
  }

  async function request(url, options = {}) {
    let response;
    const controller = !options.signal && typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller ? window.setTimeout(() => controller.abort(), requestTimeoutMs) : null;
    try {
      response = await fetch(url, controller ? { ...options, signal: controller.signal } : options);
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('The editorial service did not respond in time. Please try again shortly.');
      throw new Error('The editorial service could not be reached. Check your connection or contact chiatechlibrary@gmail.com.');
    } finally {
      if (timeout) window.clearTimeout(timeout);
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof payload?.error === 'string' && payload.error.trim() ? payload.error : unavailableMessage(response.status);
      throw new Error(message);
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('The editorial service returned an unreadable response.');
    return payload;
  }

  async function post(payload) {
    if (!apiUrl) return { ok: false, offline: true, message: 'The journal’s editorial service is not connected.' };
    return request(apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
  }

  async function get(action, parameters = {}) {
    if (!apiUrl) return { ok: false, offline: true, message: 'The journal’s public content service is not connected.' };
    const url = new URL(apiUrl, window.location.origin);
    url.searchParams.set('action', action);
    Object.entries(parameters).forEach(([key, value]) => { if (value !== undefined && value !== null) url.searchParams.set(key, value); });
    return request(url.toString(), { method: 'GET', credentials: 'omit' });
  }

  window.CHIATECH_API = { apiUrl, configured: Boolean(apiUrl), post, get };
  window.apiPost = post;
})();
