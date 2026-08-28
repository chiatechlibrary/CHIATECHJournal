(() => {
  const configured = window.CHIATECH_RUNTIME?.apiUrl || document.querySelector('meta[name="chiatech-api-url"]')?.content?.trim() || '';
  const apiUrl = configured.trim();

  async function request(url, options) {
    let response;
    try {
      response = await fetch(url, options);
    } catch (_) {
      throw new Error('The editorial service could not be reached. Check your connection or contact chiatechlibrary@gmail.com.');
    }
    if (!response.ok) {
      let message = `Editorial service returned ${response.status}.`;
      try { message = (await response.json()).error || message; } catch (_) {}
      throw new Error(message);
    }
    try { return await response.json(); }
    catch (_) { throw new Error('The editorial service returned an unreadable response.'); }
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
