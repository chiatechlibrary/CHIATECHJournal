/*
 * Public browser configuration. The same-origin endpoint is provided by the
 * Netlify Function; the Apps Script deployment URL remains in the hosting
 * environment as CHIATECH_APPS_SCRIPT_URL. Never put credentials here.
 */
window.CHIATECH_RUNTIME = window.CHIATECH_RUNTIME || {
  apiUrl: '/api/editorial'
};
