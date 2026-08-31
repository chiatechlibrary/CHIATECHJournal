(() => {
  const loginForm = document.querySelector('#editorialLoginForm');
  const desk = document.querySelector('#editorialDesk');
  const message = document.querySelector('#editorialMessage');
  const loginPanel = document.querySelector('#editorialLoginPanel');
  const staffForm = document.querySelector('#staffInviteForm');
  const editorForm = document.querySelector('#editorProfileForm');
  const articleForm = document.querySelector('#articlePublishForm');
  const blogForm = document.querySelector('#blogPostForm');
  const settingsForm = document.querySelector('#journalSettingsForm');
  const pageForm = document.querySelector('#contentPageForm');
  const logoutButton = document.querySelector('#editorialLogout');
  const sessionNotice = document.querySelector('#sessionNotice');
  const sessionNoticeTitle = document.querySelector('#sessionNoticeTitle');
  const sessionNoticeText = document.querySelector('#sessionNoticeText');
  const renewSessionButton = document.querySelector('#renewEditorialSession');
  if (!loginForm || !desk || !window.CHIATECH_API) return;

  const tokenKey = 'chiatechEditorialToken';
  const token = () => sessionStorage.getItem(tokenKey) || localStorage.getItem(tokenKey) || '';
  const clearStoredToken = () => {
    sessionStorage.removeItem(tokenKey);
    localStorage.removeItem(tokenKey);
  };
  const storeToken = (value, persistent) => {
    clearStoredToken();
    (persistent ? localStorage : sessionStorage).setItem(tokenKey, value);
  };
  const field = (form, name) => form?.elements?.namedItem(name);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const show = (text, kind = '') => {
    const target = desk && !desk.hidden ? document.querySelector('#deskMessage') : message;
    if (!target) return;
    target.textContent = text;
    target.className = `form-message ${kind}`;
    if (text) target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  const api = async payload => {
    const response = await window.CHIATECH_API.post({ ...payload, token: token() });
    if (response?.session) acceptSession(response.session);
    if (response && response.ok === false && /session has expired|account access has changed/i.test(String(response.error || response.message || ''))) markSessionExpired();
    return response;
  };
  const adminOnly = value => document.querySelectorAll('[data-admin-only]').forEach(node => { node.hidden = !value; });
  const normaliseStatus = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const dateText = value => value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00Z`)) : '—';

  let isAdmin = false;
  let reviewCache = [];
  let editorCache = [];
  let articleCache = [];
  let blogCache = [];
  let pageCache = [];
  let sessionState = null;
  let sessionExpired = false;
  let sessionRenewalInFlight = false;
  let lastSessionRenewalAt = 0;
  let sessionTimer = null;
  const dirtyForms = new Set();
  const managedForms = [staffForm, editorForm, articleForm, blogForm, settingsForm, pageForm].filter(Boolean);

  const hasUnsavedWork = () => dirtyForms.size > 0;
  const markClean = form => { if (form) dirtyForms.delete(form); };
  const markAllClean = () => managedForms.forEach(markClean);
  managedForms.forEach(form => ['input', 'change'].forEach(eventName => form.addEventListener(eventName, () => dirtyForms.add(form))));

  function durationText(milliseconds) {
    const minutes = Math.max(0, Math.ceil(milliseconds / 60000));
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remaining = minutes % 60;
      return remaining ? `${hours} hour${hours === 1 ? '' : 's'} ${remaining} minute${remaining === 1 ? '' : 's'}` : `${hours} hour${hours === 1 ? '' : 's'}`;
    }
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  function markSessionExpired() {
    sessionExpired = true;
    renderSessionState();
  }

  function acceptSession(session) {
    if (!session?.expiresAt) return;
    sessionState = session;
    sessionExpired = false;
    renderSessionState();
    if (!sessionTimer) sessionTimer = window.setInterval(renderSessionState, 15000);
  }

  function renderSessionState() {
    if (!sessionNotice) return;
    const expiresAt = Date.parse(sessionState?.expiresAt || '');
    const remaining = expiresAt - Date.now();
    const warningWindow = Number(sessionState?.warningSeconds || 300) * 1000;
    sessionNotice.classList.remove('warning', 'expired');
    if (!sessionState || !Number.isFinite(expiresAt)) {
      sessionNotice.hidden = true;
      return;
    }
    sessionNotice.hidden = false;
    if (sessionExpired || remaining <= 0) {
      sessionExpired = true;
      sessionNotice.classList.add('expired');
      sessionNoticeTitle.textContent = 'Your editorial session has expired';
      sessionNoticeText.textContent = hasUnsavedWork() ? 'Your unsaved work remains visible in this browser tab. Do not close it until you have signed in again and saved a draft.' : 'Sign in again before making another editorial change.';
      renewSessionButton.hidden = true;
      return;
    }
    if (remaining <= warningWindow) {
      sessionNotice.classList.add('warning');
      sessionNoticeTitle.textContent = `Session expires in ${durationText(remaining)}`;
      sessionNoticeText.textContent = hasUnsavedWork() ? 'You have unsaved work. Save a draft now, then continue securely to renew your active session.' : 'Continue securely, or keep working, to renew this active workday session.';
      renewSessionButton.hidden = false;
      return;
    }
    sessionNoticeTitle.textContent = sessionState.trustedDevice ? 'Trusted-device workday session active' : 'Standard workday session active';
    sessionNoticeText.textContent = `${durationText(remaining)} until the next activity check. Activity renews this session, but it never extends beyond the ${sessionState.trustedDevice ? '12-hour trusted-device' : '8-hour standard'} workday limit. Sign out when you finish.`;
    renewSessionButton.hidden = true;
  }

  async function renewEditorialSession(announce = false) {
    if (sessionRenewalInFlight || sessionExpired || !token() || desk.hidden) return;
    sessionRenewalInFlight = true;
    try {
      const response = await api({ action: 'renewSession' });
      if (!response.ok) throw new Error(response.error || 'Your editorial session could not be renewed.');
      lastSessionRenewalAt = Date.now();
      if (announce) show('Your editorial session has been renewed.', 'success');
    } catch (error) {
      markSessionExpired();
      if (announce) show(error.message || 'Your editorial session could not be renewed.', 'error');
    } finally {
      sessionRenewalInFlight = false;
    }
  }

  function noteEditorialActivity() {
    if (document.hidden || desk.hidden || sessionExpired || !sessionState) return;
    const remaining = Date.parse(sessionState.expiresAt) - Date.now();
    if (Date.now() - lastSessionRenewalAt < 60000 && remaining > Number(sessionState.warningSeconds || 300) * 1000) return;
    renewEditorialSession(false);
  }

  ['pointerdown', 'keydown', 'input', 'change'].forEach(eventName => document.addEventListener(eventName, noteEditorialActivity, { passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) noteEditorialActivity(); });
  renewSessionButton?.addEventListener('click', () => renewEditorialSession(true));
  window.addEventListener('beforeunload', event => {
    if (!desk.hidden && hasUnsavedWork()) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  function activatePane(name) {
    if (!isAdmin && name !== 'overview') return;
    document.querySelectorAll('[data-desk-tab]').forEach(button => {
      const active = button.dataset.deskTab === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('[data-desk-pane]').forEach(pane => pane.classList.toggle('is-active', pane.dataset.deskPane === name));
  }

  document.querySelectorAll('[data-desk-tab]').forEach(button => button.addEventListener('click', () => activatePane(button.dataset.deskTab)));

  function renderReviews(reviews = []) {
    reviewCache = reviews;
    const target = document.querySelector('#reviewInbox');
    if (!target) return;
    target.innerHTML = reviews.length
      ? reviews.map(review => `<tr><td>${escapeHtml(review.id)}</td><td>${escapeHtml(review.domain)}</td><td>${escapeHtml(review.title)}</td><td><span class="review-score review-score-${Number(review.score) >= 82 ? 'ready' : Number(review.score) >= 65 ? 'revise' : 'major'}">${escapeHtml(review.score)}/100</span></td><td>${escapeHtml(review.recommendation)}</td><td>${escapeHtml(review.createdAt)}</td><td><button class="table-action" type="button" data-view-review="${escapeHtml(review.id)}">Open brief</button></td></tr>`).join('')
      : '<tr><td colspan="7">No Review Engine summaries are currently routed to this account.</td></tr>';
  }

  function viewReview(id) {
    const review = reviewCache.find(item => item.id === id);
    const target = document.querySelector('#reviewBrief');
    if (!review || !target) return;
    const recommendations = (items, empty) => (items || []).length
      ? `<ol>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`
      : `<p>${escapeHtml(empty)}</p>`;
    const registry = review.registry || {};
    target.innerHTML = `<div class="review-brief-head"><div><p class="eyebrow">${escapeHtml(review.id)}</p><h3>${escapeHtml(review.title)}</h3><p>${escapeHtml(review.domain)} · ${escapeHtml(review.articleType || 'Article type not supplied')} · ${escapeHtml(review.recommendation)}</p></div><button class="table-action" type="button" data-close-review>Close brief</button></div><div class="review-brief-metrics"><span><b>${escapeHtml(review.score)}</b>Readiness / 100</span><span><b>${escapeHtml(registry.verifiedDois || 0)}/${escapeHtml(registry.detectedDois || 0)}</b>Detected DOIs verified</span><span><b>${escapeHtml(registry.referenceMatches || 0)}/${escapeHtml(registry.referenceSample || 0)}</b>Reference candidates</span></div><div class="review-brief-grid"><section><h4>Author actions</h4>${recommendations(review.authorRecommendations, 'No author action list was included.')}</section><section><h4>Human editorial checks</h4>${recommendations(review.editorRecommendations, 'No editor action list was included.')}</section></div><div class="review-human-gate"><strong>Human decision gate</strong><p>Open and assess the manuscript and supporting evidence. Confirm scope, method, ethics, references, originality, disclosure, reviewer independence and any relevant reporting guideline before recording an editorial decision. The readiness score cannot accept or reject a paper.</p><small>Routing contact: ${escapeHtml(review.authorEmail || 'not supplied')} · Handling account: ${escapeHtml(review.editorEmail || 'Managing Editor')}</small></div>`;
    target.hidden = false;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderRoster(editors = []) {
    editorCache = editors;
    const target = document.querySelector('#editorRoster');
    if (!target) return;
    target.innerHTML = editors.length
      ? editors.map(editor => `<tr><td>${escapeHtml(editor.domain)}</td><td><strong>${escapeHtml(editor.name)}</strong><br><small>${escapeHtml(editor.title || '')}<br>${escapeHtml(editor.affiliation || '')}</small>${editor.orcid ? `<br><a href="https://orcid.org/${encodeURIComponent(editor.orcid)}" target="_blank" rel="noopener">ORCID ${escapeHtml(editor.orcid)}</a>` : ''}</td><td>${escapeHtml(editor.email)}</td><td><span class="status-tag ${normaliseStatus(editor.status)}">${escapeHtml(editor.status)}</span></td><td><span class="status-tag private">ADMIN ONLY</span></td>${isAdmin ? `<td class="table-actions"><button class="table-action" type="button" data-edit-editor="${escapeHtml(editor.id)}">Edit</button>${editor.status === 'INVITED' ? `<button class="table-action" type="button" data-reissue-editor="${escapeHtml(editor.id)}">New invitation</button>` : ''}</td>` : ''}</tr>`).join('')
      : `<tr><td colspan="${isAdmin ? 6 : 5}">No section-editor accounts have been created.</td></tr>`;
  }

  function renderArticles(articles = []) {
    articleCache = articles;
    const target = document.querySelector('#publicationRegistry');
    if (!target) return;
    target.innerHTML = articles.length
      ? articles.map(article => `<tr><td>${escapeHtml(article.id)}</td><td>${escapeHtml(article.title)}</td><td>${escapeHtml(article.domain)}</td><td><span class="status-tag ${normaliseStatus(article.status)}">${escapeHtml(article.status)}</span></td><td>${escapeHtml(dateText(article.published))}</td><td class="table-actions"><button type="button" data-edit-article="${escapeHtml(article.id)}">Edit</button>${article.status === 'PUBLISHED' ? `<a href="/articles/read/?id=${encodeURIComponent(article.id)}" target="_blank" rel="noopener">View</a><button type="button" data-article-status="DRAFT" data-id="${escapeHtml(article.id)}">Unpublish</button>` : ''}${article.status !== 'ARCHIVED' ? `<button type="button" data-article-status="ARCHIVED" data-id="${escapeHtml(article.id)}">Archive</button>` : ''}</td></tr>`).join('')
      : '<tr><td colspan="6">No paper records have been created.</td></tr>';
  }

  function renderBlog(posts = []) {
    blogCache = posts;
    const target = document.querySelector('#blogRegistry');
    if (!target) return;
    target.innerHTML = posts.length
      ? posts.map(post => `<tr><td>${escapeHtml(post.id)}</td><td>${escapeHtml(post.title)}</td><td>${escapeHtml(post.contentType)}</td><td><span class="status-tag ${normaliseStatus(post.status)}">${escapeHtml(post.status)}</span></td><td>${escapeHtml(dateText(post.published))}</td><td class="table-actions"><button type="button" data-edit-blog="${escapeHtml(post.id)}">Edit</button>${post.status === 'PUBLISHED' ? `<a href="/blog/read/?id=${encodeURIComponent(post.id)}" target="_blank" rel="noopener">View</a><button type="button" data-blog-status="DRAFT" data-id="${escapeHtml(post.id)}">Unpublish</button>` : ''}${post.status !== 'ARCHIVED' ? `<button type="button" data-blog-status="ARCHIVED" data-id="${escapeHtml(post.id)}">Archive</button>` : ''}</td></tr>`).join('')
      : '<tr><td colspan="6">No blog or news records have been created.</td></tr>';
  }

  function renderPages(pages = [], paths = []) {
    pageCache = pages;
    if (!pageForm) return;
    const select = field(pageForm, 'path');
    const chosen = select.value;
    select.replaceChildren(new Option('Choose a page', ''), ...paths.map(path => new Option(path, path)));
    if (paths.includes(chosen)) select.value = chosen;
    document.querySelector('#contentPageRegistry').innerHTML = pages.length
      ? pages.map(page => `<tr><td><a href="${escapeHtml(page.path)}" target="_blank" rel="noopener">${escapeHtml(page.path)}</a></td><td>${escapeHtml(page.title)}</td><td><span class="status-tag ${normaliseStatus(page.status)}">${escapeHtml(page.status)}</span></td><td><button type="button" data-edit-page="${escapeHtml(page.path)}">Edit</button></td></tr>`).join('')
      : '<tr><td colspan="4">The approved default pages are in use. Choose a page above to edit its copy.</td></tr>';
  }

  async function editPage(path) {
    if (!isAdmin || !pageForm || ![...field(pageForm, 'path').options].some(option => option.value === path && path)) return;
    field(pageForm, 'path').value = path;
    document.querySelector('#pagePreview').hidden = true;
    const saved = pageCache.find(page => page.path === path);
    if (saved) {
      ['title', 'summary', 'body'].forEach(key => { field(pageForm, key).value = saved[key] || ''; });
      return;
    }
    ['title', 'summary', 'body'].forEach(key => { field(pageForm, key).value = ''; });
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error('The default page could not be loaded.');
      const source = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (field(pageForm, 'path').value !== path) return;
      const main = source.querySelector('main');
      const headline = main?.querySelector('h1');
      const introduction = main?.querySelector('.lead') || main?.querySelector('p');
      const inline = node => [...node.childNodes].map(child => {
        if (child.nodeType === 3) return child.textContent;
        if (child.nodeName === 'A') return `[${child.textContent.trim()}](${child.getAttribute('href') || '#'})`;
        if (['STRONG', 'B'].includes(child.nodeName)) return `**${child.textContent}**`;
        return child.textContent;
      }).join('').replace(/\s+/g, ' ').trim();
      field(pageForm, 'title').value = headline?.textContent.trim() || '';
      field(pageForm, 'summary').value = introduction?.textContent.trim() || '';
      field(pageForm, 'body').value = [...(main?.querySelectorAll('h2,h3,p,li,table,dl,a') || [])]
        .filter(node => node !== introduction && !node.closest('nav') && !node.parentElement.closest('p,li,h1,h2,h3,table,dl'))
        .map(node => {
          if (node.tagName === 'TABLE') {
            const rows = [...node.querySelectorAll('tr')].map(row => [...row.querySelectorAll('th,td')].map(cell => inline(cell).replaceAll('|', '/')));
            if (!rows.length) return '';
            return [rows[0], rows[0].map(() => '---'), ...rows.slice(1)].map(row => `| ${row.join(' | ')} |`).join('\n');
          }
          if (node.tagName === 'DL') return [...node.querySelectorAll('dt')].map(term => `- **${term.textContent.trim()}:** ${term.nextElementSibling?.textContent.trim() || ''}`).join('\n');
          if (node.tagName === 'A') return `[${node.textContent.trim().replace(/\s+/g, ' ')}](${node.getAttribute('href') || '#'})`;
          return `${node.tagName === 'H2' ? '## ' : node.tagName === 'H3' ? '### ' : node.tagName === 'LI' ? '- ' : ''}${inline(node)}`;
        }).filter(Boolean).join('\n\n');
      show('Default page text loaded. Check the policy wording and download links before publishing.', 'success');
    } catch (error) { show(error.message, 'error'); }
  }

  field(pageForm, 'path')?.addEventListener('change', event => editPage(event.target.value));
  const preview = (form, targetId) => {
    const target = document.querySelector(targetId);
    if (!target || !form) return;
    target.innerHTML = `<p class="eyebrow">Private preview — not published</p><h2>${escapeHtml(field(form, 'title').value)}</h2><p class="lead">${escapeHtml(field(form, 'summary').value)}</p>${window.CHIATECH_CONTENT.format(field(form, 'body').value)}`;
    target.hidden = false;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  document.querySelector('#previewPage')?.addEventListener('click', () => preview(pageForm, '#pagePreview'));
  document.querySelector('#previewBlog')?.addEventListener('click', () => preview(blogForm, '#blogPreview'));
  pageForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const status = event.submitter?.value || 'DRAFT';
    if (!field(pageForm, 'path').value) { show('Choose a page first.', 'error'); return; }
    if (status === 'ARCHIVED' && !window.confirm('Restore the original page text? Your saved copy will remain in the private record.')) return;
    const submit = event.submitter;
    if (submit) submit.disabled = true;
    try {
      const response = await api({ action: 'saveContentPage', status, path: field(pageForm, 'path').value,
        title: field(pageForm, 'title').value.trim(), summary: field(pageForm, 'summary').value.trim(), body: field(pageForm, 'body').value.trim() });
      if (!response.ok) throw new Error(response.error || 'Page could not be saved.');
      await loadDesk(status === 'PUBLISHED' ? 'Page published. Open its public link to verify the result.' : status === 'ARCHIVED' ? 'Default page restored; your saved copy is retained.' : 'Private page draft saved.');
      activatePane('pages');
    } catch (error) { show(error.message, 'error'); }
    finally { if (submit) submit.disabled = false; }
  });

  function fillSettings(settings = {}) {
    if (!settingsForm) return;
    field(settingsForm, 'issn').value = settings.issn || 'Pending assignment';
    field(settingsForm, 'doi_prefix').value = settings.doiPrefix || 'Not yet assigned';
    field(settingsForm, 'contact_email').value = settings.contactEmail || 'chiatechlibrary@gmail.com';
    field(settingsForm, 'submission_status').value = settings.submissionStatus || 'Open';
    field(settingsForm, 'current_issue_label').value = settings.currentIssueLabel || 'Continuous publication';
    field(settingsForm, 'public_announcement').value = settings.publicAnnouncement || 'The CHIATECH JOURNAL submission and publishing portal is open.';
    field(settingsForm, 'home_headline').value = settings.homeHeadline || 'Research with a route to impact.';
    field(settingsForm, 'home_introduction').value = settings.homeIntroduction || 'CHIATECH JOURNAL connects credible scholarship with education, technology, enterprise, policy and society through a rigorous review-first publishing pathway.';
    field(settingsForm, 'managing_editor_name').value = settings.managingEditorName || 'CHIA SHIAONDO KENNETH';
    field(settingsForm, 'managing_editor_title').value = settings.managingEditorTitle || 'Founding Editor & Managing Editor';
    field(settingsForm, 'managing_editor_affiliation').value = settings.managingEditorAffiliation || 'CHIA TECH SOLUTIONS AND RESOURCES LIMITED';
    field(settingsForm, 'managing_editor_country').value = settings.managingEditorCountry || 'Nigeria';
    field(settingsForm, 'managing_editor_orcid').value = settings.managingEditorOrcid || '0009-0009-6434-4586';
    field(settingsForm, 'managing_editor_doi').value = settings.managingEditorDoi || '';
    field(settingsForm, 'managing_editor_bio').value = settings.managingEditorBio || '';
    field(settingsForm, 'managing_editor_image_url').value = settings.managingEditorImageUrl || '/assets/editors/founding-publisher-managing-editor.png';
    field(settingsForm, 'standard_publication_fee').value = settings.standardPublicationFee || '35000';
    field(settingsForm, 'pioneer_publication_fee').value = settings.pioneerPublicationFee || '25000';
    field(settingsForm, 'pioneer_fee_label').value = settings.pioneerFeeLabel || 'Pioneer Volumes 1 and 2 (July/August 2026)';
    field(settingsForm, 'payment_account_name').value = settings.paymentAccountName || 'CHIA TECH SOLUTIONS AND RESOURCES LIMITED';
    field(settingsForm, 'payment_account_number').value = settings.paymentAccountNumber || '6963021042';
    field(settingsForm, 'payment_bank').value = settings.paymentBank || 'Moniepoint';
    field(settingsForm, 'payment_receipt_whatsapp').value = settings.paymentReceiptWhatsapp || '+234 703 768 9917';
    field(settingsForm, 'payment_receipt_email').value = settings.paymentReceiptEmail || 'chiatech010@gmail.com';
    field(settingsForm, 'payment_instruction').value = settings.paymentInstruction || 'Pay only after written acceptance and an official invoice. Payment does not influence editorial or peer-review decisions.';
  }

  async function loadDesk(successMessage = '') {
    const response = await api({ action: 'getEditorialDashboard' });
    if (!response.ok) throw new Error(response.error || response.message || 'Your editorial session has ended.');
    isAdmin = response.user?.role === 'ADMIN';
    adminOnly(isAdmin);
    document.querySelector('#editorialIdentity').textContent = `${response.user?.name || response.user?.email || 'Editorial user'} — ${response.user?.role || 'EDITOR'}${response.user?.domain ? ` · ${response.user.domain}` : ''}`;
    renderRoster(response.editors || []);
    renderReviews(response.reviews || []);
    renderArticles(response.articles || []);
    renderBlog(response.blogPosts || []);
    renderPages(response.contentPages || [], response.editablePages || []);
    fillSettings(response.settings || {});
    document.querySelector('#summaryEditors').textContent = String((response.editors || []).length);
    document.querySelector('#summaryPapers').textContent = String((response.articles || []).length);
    document.querySelector('#summaryPosts').textContent = String((response.blogPosts || []).length);
    loginPanel.hidden = true;
    desk.hidden = false;
    markAllClean();
    renderSessionState();
    show(successMessage || 'Editorial control centre updated.', 'success');
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = loginForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const trustedDeviceRequested = field(loginForm, 'trusted_device').checked;
      const response = await window.CHIATECH_API.post({ action: 'login', email: field(loginForm, 'email').value.trim(), password: field(loginForm, 'password').value, trustedDevice: trustedDeviceRequested });
      if (!response.ok || !response.token) throw new Error(response.error || 'Login was not accepted.');
      storeToken(response.token, response.session?.persistent === true);
      acceptSession(response.session);
      field(loginForm, 'password').value = '';
      await loadDesk(response.session?.trustedDevice ? 'Signed in with a trusted-device workday session. Sign out when you finish.' : 'Signed in. Journal controls are ready.');
    } catch (error) {
      show(error.message || 'The login service could not be reached.', 'error');
    } finally { submit.disabled = false; }
  });

  staffForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = staffForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const response = await api({
        action: 'createEditor',
        name: field(staffForm, 'name').value.trim(),
        email: field(staffForm, 'email').value.trim(),
        affiliation: field(staffForm, 'affiliation').value.trim(),
        country: field(staffForm, 'country').value.trim(),
        domain: field(staffForm, 'domain').value
      });
      if (!response.ok) throw new Error(response.error || 'The invitation could not be created.');
      staffForm.reset();
      await loadDesk('The protected editor invitation was sent.');
      activatePane('editors');
    } catch (error) { show(error.message || 'The invitation could not be created.', 'error'); }
    finally { submit.disabled = false; }
  });

  function editEditor(id) {
    const editor = editorCache.find(item => item.id === id);
    if (!editor || !editorForm) return;
    field(editorForm, 'editor_id').value = editor.id;
    field(editorForm, 'name').value = editor.name || '';
    field(editorForm, 'public_title').value = editor.title || `${editor.domain} Editor`;
    field(editorForm, 'affiliation').value = editor.affiliation || '';
    field(editorForm, 'country').value = editor.country || '';
    field(editorForm, 'public_email').value = editor.publicEmail || '';
    field(editorForm, 'orcid').value = editor.orcid || '';
    field(editorForm, 'domain').value = editor.domain || '';
    field(editorForm, 'public_bio').value = editor.bio || '';
    field(editorForm, 'image_url').value = editor.imageUrl || '';
    field(editorForm, 'profile_url').value = editor.profileUrl || '';
    field(editorForm, 'appointment_start').value = editor.appointmentStart || '';
    field(editorForm, 'appointment_end').value = editor.appointmentEnd || '';
    field(editorForm, 'sort_order').value = editor.sortOrder || 1;
    field(editorForm, 'public_status').value = 'PRIVATE';
    field(editorForm, 'access_status').value = editor.status || 'INVITED';
    editorForm.hidden = false;
    editorForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  editorForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = editorForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const response = await api({
        action: 'updateEditor', id: field(editorForm, 'editor_id').value,
        name: field(editorForm, 'name').value.trim(), publicTitle: field(editorForm, 'public_title').value.trim(),
        affiliation: field(editorForm, 'affiliation').value.trim(), country: field(editorForm, 'country').value.trim(),
        publicEmail: field(editorForm, 'public_email').value.trim(),
        orcid: field(editorForm, 'orcid').value.trim(), domain: field(editorForm, 'domain').value,
        publicBio: field(editorForm, 'public_bio').value.trim(), imageUrl: field(editorForm, 'image_url').value.trim(),
        profileUrl: field(editorForm, 'profile_url').value.trim(), appointmentStart: field(editorForm, 'appointment_start').value,
        appointmentEnd: field(editorForm, 'appointment_end').value, sortOrder: field(editorForm, 'sort_order').value,
        publicStatus: field(editorForm, 'public_status').value, accessStatus: field(editorForm, 'access_status').value
      });
      if (!response.ok) throw new Error(response.error || 'The editor profile could not be saved.');
      editorForm.hidden = true;
      await loadDesk('Private editor account and board profile saved.');
      activatePane('editors');
    } catch (error) { show(error.message || 'The editor profile could not be saved.', 'error'); }
    finally { submit.disabled = false; }
  });

  document.querySelector('#cancelEditorEdit')?.addEventListener('click', () => { editorForm.hidden = true; editorForm.reset(); markClean(editorForm); });

  function authorRow(author = {}) {
    const row = document.createElement('div');
    row.className = 'author-row';
    row.innerHTML = `<label>Given name(s)<input data-author="given" value="${escapeHtml(author.given || '')}"></label><label>Family name<input data-author="family" value="${escapeHtml(author.family || '')}"></label><label>Affiliation<input data-author="affiliation" value="${escapeHtml(author.affiliation || '')}"></label><label>ORCID iD<input data-author="orcid" value="${escapeHtml(author.orcid || '')}"></label><button class="remove-author" type="button" aria-label="Remove this author">Remove</button>`;
    row.querySelector('.remove-author').addEventListener('click', () => { if (document.querySelectorAll('#articleAuthorRows .author-row').length > 1) row.remove(); else row.querySelectorAll('input').forEach(input => { input.value = ''; }); });
    return row;
  }

  function setAuthors(authors = [{}]) {
    const root = document.querySelector('#articleAuthorRows');
    if (!root) return;
    root.replaceChildren(...(authors.length ? authors : [{}]).map(authorRow));
  }
  setAuthors();
  document.querySelector('#addArticleAuthor')?.addEventListener('click', () => document.querySelector('#articleAuthorRows')?.append(authorRow()));

  function collectAuthors() {
    return [...document.querySelectorAll('#articleAuthorRows .author-row')].map(row => ({
      given: row.querySelector('[data-author="given"]').value.trim(), family: row.querySelector('[data-author="family"]').value.trim(),
      affiliation: row.querySelector('[data-author="affiliation"]').value.trim(), orcid: row.querySelector('[data-author="orcid"]').value.trim()
    })).filter(author => author.given || author.family);
  }

  function resetArticle() { articleForm?.reset(); setAuthors(); markClean(articleForm); }
  document.querySelector('#resetArticleForm')?.addEventListener('click', resetArticle);

  function editArticle(id) {
    const article = articleCache.find(item => item.id === id);
    if (!article || !articleForm) return;
    const values = {
      article_id: article.id, article_type: article.articleType, title: article.title, domain: article.domain,
      language: article.language || 'English', abstract: article.abstract, keywords: (article.keywords || []).join(', '),
      received: article.received, revised: article.revised, accepted: article.accepted, published: article.published,
      volume: article.volume, issue: article.issue, issue_title: article.issueTitle, elocator: article.eLocator,
      pages: article.pages, doi: article.doi, license: article.license, license_url: article.licenseUrl,
      copyright_holder: article.copyrightHolder, html_url: article.htmlUrl,
      pdf_url: article.pdfUrl, pdf_download_url: article.pdfDownloadUrl,
      video_title: article.videoTitle, video_url: article.videoUrl,
      video_poster_url: article.videoPosterUrl, video_caption_url: article.videoCaptionUrl,
      video_transcript_url: article.videoTranscriptUrl
    };
    Object.entries(values).forEach(([name, value]) => { const input = field(articleForm, name); if (input) input.value = value || ''; });
    // A saved URL is not evidence that this revision has passed production QA.
    field(articleForm, 'html_confirmed').checked = false;
    field(articleForm, 'pdf_confirmed').checked = false;
    field(articleForm, 'video_confirmed').checked = false;
    setAuthors(article.authors || []);
    activatePane('papers');
    articleForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  articleForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const status = event.submitter?.value === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
    const submit = event.submitter;
    if (submit) submit.disabled = true;
    try {
      const response = await api({
        action: 'saveArticle', status, id: field(articleForm, 'article_id').value.trim(),
        articleType: field(articleForm, 'article_type').value.trim(), title: field(articleForm, 'title').value.trim(),
        domain: field(articleForm, 'domain').value, language: field(articleForm, 'language').value.trim(),
        authors: collectAuthors(), abstract: field(articleForm, 'abstract').value.trim(),
        keywords: field(articleForm, 'keywords').value.split(',').map(item => item.trim()).filter(Boolean),
        received: field(articleForm, 'received').value, revised: field(articleForm, 'revised').value,
        accepted: field(articleForm, 'accepted').value, published: field(articleForm, 'published').value,
        volume: field(articleForm, 'volume').value.trim(), issue: field(articleForm, 'issue').value.trim(),
        issueTitle: field(articleForm, 'issue_title').value.trim(), eLocator: field(articleForm, 'elocator').value.trim(),
        pages: field(articleForm, 'pages').value.trim(), doi: field(articleForm, 'doi').value.trim(),
        license: field(articleForm, 'license').value.trim(), licenseUrl: field(articleForm, 'license_url').value.trim(),
        copyrightHolder: field(articleForm, 'copyright_holder').value.trim(),
        htmlUrl: field(articleForm, 'html_url').value.trim(), htmlConfirmed: field(articleForm, 'html_confirmed').checked,
        pdfUrl: field(articleForm, 'pdf_url').value.trim(),
        pdfDownloadUrl: field(articleForm, 'pdf_download_url').value.trim(), pdfConfirmed: field(articleForm, 'pdf_confirmed').checked,
        videoTitle: field(articleForm, 'video_title').value.trim(), videoUrl: field(articleForm, 'video_url').value.trim(),
        videoPosterUrl: field(articleForm, 'video_poster_url').value.trim(),
        videoCaptionUrl: field(articleForm, 'video_caption_url').value.trim(),
        videoTranscriptUrl: field(articleForm, 'video_transcript_url').value.trim(),
        videoConfirmed: field(articleForm, 'video_confirmed').checked
      });
      if (!response.ok) throw new Error(response.error || 'The paper record could not be saved.');
      resetArticle();
      await loadDesk(status === 'PUBLISHED' ? 'Paper published. Verify the DOI, full HTML, both PDF actions, explanatory video, captions/transcript and public metadata before announcing it.' : 'Paper draft saved.');
      activatePane('papers');
    } catch (error) { show(error.message || 'The paper record could not be saved.', 'error'); }
    finally { if (submit) submit.disabled = false; }
  });

  function resetBlog() { blogForm?.reset(); markClean(blogForm); }
  document.querySelector('#resetBlogForm')?.addEventListener('click', resetBlog);

  function editBlog(id) {
    const post = blogCache.find(item => item.id === id);
    if (!post || !blogForm) return;
    const values = {
      post_id: post.id, content_type: post.contentType, title: post.title, domain: post.domain,
      author_name: post.authorName, published: post.published, tags: (post.tags || []).join(', '),
      summary: post.summary, body: post.body, hero_image_url: post.heroImageUrl,
      hero_image_alt: post.heroImageAlt, media_type: post.mediaType || 'NONE', media_url: post.mediaUrl,
      rights_notice: post.rightsNotice
    };
    Object.entries(values).forEach(([name, value]) => { const input = field(blogForm, name); if (input) input.value = value || ''; });
    activatePane('blog');
    blogForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  blogForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const status = event.submitter?.value === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
    const submit = event.submitter;
    if (submit) submit.disabled = true;
    try {
      const response = await api({
        action: 'saveBlogPost', status, id: field(blogForm, 'post_id').value.trim(),
        contentType: field(blogForm, 'content_type').value, title: field(blogForm, 'title').value.trim(),
        domain: field(blogForm, 'domain').value, authorName: field(blogForm, 'author_name').value.trim(),
        published: field(blogForm, 'published').value,
        tags: field(blogForm, 'tags').value.split(',').map(item => item.trim()).filter(Boolean),
        summary: field(blogForm, 'summary').value.trim(), body: field(blogForm, 'body').value.trim(),
        heroImageUrl: field(blogForm, 'hero_image_url').value.trim(), heroImageAlt: field(blogForm, 'hero_image_alt').value.trim(),
        mediaType: field(blogForm, 'media_type').value, mediaUrl: field(blogForm, 'media_url').value.trim(),
        rightsNotice: field(blogForm, 'rights_notice').value.trim()
      });
      if (!response.ok) throw new Error(response.error || 'The blog item could not be saved.');
      resetBlog();
      await loadDesk(status === 'PUBLISHED' ? 'Blog item published. Open the public reader and test sharing and media playback.' : 'Blog draft saved.');
      activatePane('blog');
    } catch (error) { show(error.message || 'The blog item could not be saved.', 'error'); }
    finally { if (submit) submit.disabled = false; }
  });

  settingsForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = settingsForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const response = await api({ action: 'saveSettings', settings: {
        issn: field(settingsForm, 'issn').value.trim(), doiPrefix: field(settingsForm, 'doi_prefix').value.trim(),
        contactEmail: field(settingsForm, 'contact_email').value.trim(), submissionStatus: field(settingsForm, 'submission_status').value,
        currentIssueLabel: field(settingsForm, 'current_issue_label').value.trim(), publicAnnouncement: field(settingsForm, 'public_announcement').value.trim(),
        homeHeadline: field(settingsForm, 'home_headline').value.trim(), homeIntroduction: field(settingsForm, 'home_introduction').value.trim(),
        managingEditorName: field(settingsForm, 'managing_editor_name').value.trim(), managingEditorTitle: field(settingsForm, 'managing_editor_title').value.trim(),
        managingEditorAffiliation: field(settingsForm, 'managing_editor_affiliation').value.trim(), managingEditorCountry: field(settingsForm, 'managing_editor_country').value.trim(),
        managingEditorOrcid: field(settingsForm, 'managing_editor_orcid').value.trim(), managingEditorBio: field(settingsForm, 'managing_editor_bio').value.trim(),
        managingEditorDoi: field(settingsForm, 'managing_editor_doi').value.trim(),
        managingEditorImageUrl: field(settingsForm, 'managing_editor_image_url').value.trim(),
        standardPublicationFee: field(settingsForm, 'standard_publication_fee').value.trim(), pioneerPublicationFee: field(settingsForm, 'pioneer_publication_fee').value.trim(),
        pioneerFeeLabel: field(settingsForm, 'pioneer_fee_label').value.trim(), paymentAccountName: field(settingsForm, 'payment_account_name').value.trim(),
        paymentAccountNumber: field(settingsForm, 'payment_account_number').value.trim(), paymentBank: field(settingsForm, 'payment_bank').value.trim(),
        paymentReceiptWhatsapp: field(settingsForm, 'payment_receipt_whatsapp').value.trim(), paymentReceiptEmail: field(settingsForm, 'payment_receipt_email').value.trim(),
        paymentInstruction: field(settingsForm, 'payment_instruction').value.trim()
      } });
      if (!response.ok) throw new Error(response.error || 'Journal information could not be saved.');
      fillSettings(response.settings || {});
      show('Public journal information updated. Verify the affected public pages.', 'success');
    } catch (error) { show(error.message || 'Journal information could not be saved.', 'error'); }
    finally { submit.disabled = false; }
  });

  document.addEventListener('click', async event => {
    const pageButton = event.target.closest('[data-edit-page]');
    if (pageButton) { editPage(pageButton.dataset.editPage); activatePane('pages'); return; }
    const viewReviewButton = event.target.closest('[data-view-review]');
    if (viewReviewButton) return viewReview(viewReviewButton.dataset.viewReview);
    if (event.target.closest('[data-close-review]')) {
      const target = document.querySelector('#reviewBrief');
      if (target) { target.hidden = true; target.replaceChildren(); }
      return;
    }
    const editEditorButton = event.target.closest('[data-edit-editor]');
    if (editEditorButton) return editEditor(editEditorButton.dataset.editEditor);
    const reissueEditorButton = event.target.closest('[data-reissue-editor]');
    if (reissueEditorButton) {
      if (!window.confirm('Invalidate the earlier activation link and send a new seven-day invitation?')) return;
      reissueEditorButton.disabled = true;
      try {
        const response = await api({ action: 'reissueEditorInvite', id: reissueEditorButton.dataset.reissueEditor });
        if (!response.ok) throw new Error(response.error || 'A new editor invitation could not be issued.');
        await loadDesk(response.message || 'A new protected editor invitation was sent.');
        activatePane('editors');
      } catch (error) {
        show(error.message || 'A new editor invitation could not be issued.', 'error');
        reissueEditorButton.disabled = false;
      }
      return;
    }
    const editArticleButton = event.target.closest('[data-edit-article]');
    if (editArticleButton) return editArticle(editArticleButton.dataset.editArticle);
    const editBlogButton = event.target.closest('[data-edit-blog]');
    if (editBlogButton) return editBlog(editBlogButton.dataset.editBlog);

    const articleStatusButton = event.target.closest('[data-article-status]');
    if (articleStatusButton) {
      const status = articleStatusButton.dataset.articleStatus;
      if (!window.confirm(`${status === 'DRAFT' ? 'Remove this paper from the public registry' : 'Archive this paper record'}?`)) return;
      try {
        const response = await api({ action: 'setArticleStatus', id: articleStatusButton.dataset.id, status });
        if (!response.ok) throw new Error(response.error || 'Paper status could not be changed.');
        await loadDesk(`Paper moved to ${status.toLowerCase()} status.`);
        activatePane('papers');
      } catch (error) { show(error.message, 'error'); }
      return;
    }

    const blogStatusButton = event.target.closest('[data-blog-status]');
    if (blogStatusButton) {
      const status = blogStatusButton.dataset.blogStatus;
      if (!window.confirm(`${status === 'DRAFT' ? 'Remove this item from the public blog' : 'Archive this blog item'}?`)) return;
      try {
        const response = await api({ action: 'setBlogPostStatus', id: blogStatusButton.dataset.id, status });
        if (!response.ok) throw new Error(response.error || 'Blog status could not be changed.');
        await loadDesk(`Blog item moved to ${status.toLowerCase()} status.`);
        activatePane('blog');
      } catch (error) { show(error.message, 'error'); }
    }
  });

  logoutButton?.addEventListener('click', async () => {
    if (hasUnsavedWork() && !window.confirm('You have unsaved editorial work. Sign out anyway? Your unsaved changes will not be published or saved.')) return;
    try {
      const response = await api({ action: 'logout' });
      if (!response.ok) throw new Error(response.error || 'The service did not confirm sign-out.');
      clearStoredToken();
      sessionState = null;
      sessionExpired = false;
      markAllClean();
      desk.hidden = true;
      loginPanel.hidden = false;
      loginForm.reset();
      renderSessionState();
      show('You have been signed out. This browser no longer retains the editorial session.');
    } catch (error) {
      show(error.message || 'Sign-out could not be confirmed. Keep this page open and try again before leaving the device.', 'error');
    }
  });

  if (token()) loadDesk().catch(error => {
    clearStoredToken();
    sessionState = null;
    desk.hidden = true;
    loginPanel.hidden = false;
    show(error.message || 'Please sign in.', 'error');
  });
})();
