(() => {
  const gate = document.querySelector('#submissionGate');
  const gateText = document.querySelector('#submissionGateText');
  const form = document.querySelector('#submissionForm');
  if (!gate || !gateText || !form) return;
  let review = null;
  try { review = JSON.parse(sessionStorage.getItem('chiatechReview') || 'null'); } catch (_) {}
  const fresh = review && review.id && review.createdAt && (Date.now() - Date.parse(review.createdAt) < 24 * 60 * 60 * 1000);
  if (!fresh) {
    form.setAttribute('aria-disabled', 'true');
    form.querySelectorAll('input,select,textarea,button').forEach(control => control.disabled = true);
    gateText.innerHTML = '<strong>CHIATECH Review Engine report required</strong><p>Complete the manuscript review first, download the Word report, then return here for formal submission.</p>';
    return;
  }
  gate.classList.add('ready');
  gateText.innerHTML = `<strong>Review report ${review.id} detected</strong><p>Readiness score: ${review.score}/100 · ${review.recommendation}. Attach the downloaded Word report with the manuscript files.</p>`;
  form.setAttribute('aria-disabled', 'false');
  document.querySelector('#reviewId').value = review.id;
  document.querySelector('#reviewScore').value = review.score;
  const title = document.querySelector('#submissionTitle');
  if (title && !title.value) title.value = review.title || '';
})();
