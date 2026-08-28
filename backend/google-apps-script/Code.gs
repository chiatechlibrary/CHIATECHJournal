/*
 * CHIATECH JOURNAL editorial and public-content service.
 *
 * Deploy this Google Apps Script project as a web app that executes as the
 * deploying account and is accessible to anyone. Public reads are anonymous;
 * every editorial write is authorised with a short-lived server-side session.
 * Secrets belong only in Apps Script Script Properties. See SETUP.md.
 */
const CONFIG = {
  users: 'Users',
  reviews: 'Reviews',
  articles: 'Articles',
  blogPosts: 'BlogPosts',
  contentPages: 'ContentPages',
  settings: 'Settings',
  audit: 'Audit',
  domains: [
    'Science',
    'Technology',
    'Engineering',
    'Mathematics',
    'Education',
    'Humanities & Social Sciences',
    'Entrepreneurship & Management'
  ],
  sessionSeconds: 6 * 60 * 60,
  inviteDays: 7,
  passwordIterations: 12000,
  loginWindowSeconds: 15 * 60,
  maxLoginFailures: 8
};

const HEADERS = {
  Users: [
    'created_at', 'updated_at', 'id', 'role', 'name', 'email', 'orcid',
    'affiliation', 'country', 'public_email', 'domain', 'public_title', 'public_bio',
    'image_url', 'profile_url', 'appointment_start', 'appointment_end',
    'public_status', 'sort_order', 'salt', 'password_hash', 'status',
    'invite_token', 'invite_expires', 'last_login'
  ],
  Reviews: [
    'created_at', 'id', 'author_email', 'title', 'domain', 'article_type',
    'score', 'recommendation', 'author_recommendations',
    'editor_recommendations', 'registry_summary', 'editor_email'
  ],
  Articles: [
    'created_at', 'updated_at', 'id', 'title', 'domain', 'article_type',
    'authors_json', 'abstract', 'keywords_json', 'doi', 'volume', 'issue',
    'issue_title', 'elocator', 'pages', 'received', 'revised', 'accepted',
    'published', 'language', 'license', 'license_url', 'copyright_holder',
    'html_url', 'pdf_url', 'pdf_download_url', 'video_title', 'video_url',
    'video_poster_url', 'video_caption_url', 'video_transcript_url',
    'status', 'published_by'
  ],
  BlogPosts: [
    'created_at', 'updated_at', 'id', 'title', 'content_type', 'domain',
    'author_name', 'summary', 'body', 'tags_json', 'published', 'hero_image_url',
    'hero_image_alt', 'media_type', 'media_url', 'rights_notice', 'status',
    'published_by'
  ],
  Settings: ['updated_at', 'key', 'value', 'public'],
  ContentPages: ['created_at', 'updated_at', 'path', 'title', 'summary', 'body', 'status', 'updated_by', 'published_title', 'published_summary', 'published_body', 'published_at'],
  Audit: ['created_at', 'actor', 'action', 'target', 'detail']
};

const PUBLIC_DEFAULTS = {
  journalTitle: 'CHIATECH JOURNAL',
  publisher: 'CHIA TECH SOLUTIONS AND RESOURCES LIMITED',
  publisherRegistration: 'RC 1839865',
  issn: 'Pending assignment',
  doiPrefix: 'Not yet assigned',
  contactEmail: 'chiatechlibrary@gmail.com',
  submissionStatus: 'Open',
  currentIssueLabel: 'Continuous publication',
  publicAnnouncement: 'The CHIATECH JOURNAL submission and publishing portal is open.',
  managingEditorName: 'CHIA SHIAONDO KENNETH',
  managingEditorTitle: 'Founding Editor & Managing Editor',
  managingEditorAffiliation: 'CHIA TECH SOLUTIONS AND RESOURCES LIMITED',
  managingEditorCountry: 'Nigeria',
  managingEditorOrcid: '0009-0009-6434-4586',
  managingEditorDoi: '',
  homeHeadline: 'Research with a route to impact.',
  homeIntroduction: 'CHIATECH JOURNAL connects credible scholarship with education, technology, enterprise, policy and society through a rigorous review-first publishing pathway.',
  managingEditorBio: 'Responsible for editorial governance, appointment verification, journal strategy, research communication, production oversight and final publication control.',
  managingEditorImageUrl: '/assets/editors/founding-publisher-managing-editor.png',
  standardPublicationFee: '35000',
  pioneerPublicationFee: '25000',
  pioneerFeeLabel: 'Pioneer Volumes 1 and 2 (July/August 2026)',
  paymentAccountName: 'CHIA TECH SOLUTIONS AND RESOURCES LIMITED',
  paymentAccountNumber: '6963021042',
  paymentBank: 'Moniepoint',
  paymentReceiptWhatsapp: '+234 703 768 9917',
  paymentReceiptEmail: 'chiatech010@gmail.com',
  paymentInstruction: 'Pay only after written acceptance and an official invoice. Payment does not influence editorial or peer-review decisions.'
};

function doGet(e) {
  try {
    const parameters = (e && e.parameter) || {};
    const action = String(parameters.action || '').trim();
    if (action === 'health') {
      database().getSheets();
      return json({ ok: true, databaseReady: true, service: 'CHIATECH JOURNAL editorial service', version: '2026-08-28-audited' });
    }
    if (action === 'profile') return json({ ok: true, profile: publicProfile() });
    if (action === 'editors') return json({ ok: false, error: 'The editorial board is administrator-only.' });
    if (action === 'contentPage') return json(publicContentPage(String(parameters.path || '')));
    if (action === 'articles') return json({ ok: true, articles: publicArticles() });
    if (action === 'article') return json(publicArticle(String(parameters.id || '')));
    if (action === 'blogPosts') return json({ ok: true, posts: publicBlogPosts() });
    if (action === 'blogPost') return json(publicBlogPost(String(parameters.id || '')));
    return json({ ok: false, error: 'Unsupported public action.' });
  } catch (error) {
    console.error('CHIATECH service request failed', error && error.name || 'ServiceError');
    return json({ ok: false, error: 'The public journal service is temporarily unavailable.' });
  }
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '{}';
    if (raw.length > 400000) return json({ ok: false, error: 'The editorial request is too large.' });
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ ok: false, error: 'Send an editorial request object.' });
    const action = String(data.action || '').trim();
    if (action === 'login') return json(login(data));
    if (action === 'logout') return json(logout(data));
    if (action === 'activateEditor') return json(activateEditor(data));
    if (action === 'recordReview') return json(recordReview(data));
    if (action === 'getEditorialDashboard') return json(getEditorialDashboard(data));
    if (action === 'createEditor') return json(createEditor(data));
    if (action === 'reissueEditorInvite') return json(reissueEditorInvite(data));
    if (action === 'updateEditor') return json(updateEditor(data));
    if (action === 'publishArticle') {
      data.status = 'PUBLISHED';
      return json(saveArticle(data));
    }
    if (action === 'saveArticle') return json(saveArticle(data));
    if (action === 'setArticleStatus') return json(setArticleStatus(data));
    if (action === 'saveBlogPost') return json(saveBlogPost(data));
    if (action === 'setBlogPostStatus') return json(setBlogPostStatus(data));
    if (action === 'saveSettings') return json(saveSettings(data));
    if (action === 'saveContentPage') return json(saveContentPage(data));
    return json({ ok: false, error: 'Unsupported action.' });
  } catch (error) {
    console.error('CHIATECH service request failed', error && error.name || 'ServiceError');
    return json({ ok: false, error: safeError(error) });
  }
}

function login(data) {
  const email = normaliseEmail(data.email);
  const password = String(data.password || '');
  if (!email || !password) return { ok: false, error: 'Enter your journal email and password.' };
  enforceLoginRateLimit(email);
  const user = findUserByEmail(email);
  let principal = user;
  if (!principal && email === normaliseEmail(property('ADMIN_EMAIL'))) principal = bootstrapAdmin(email, password);
  if (!principal || principal.status !== 'ACTIVE' || !verifyPassword(password, principal.salt, principal.password_hash)) {
    recordLoginFailure(email);
    return { ok: false, error: 'Invalid credentials or inactive account.' };
  }
  clearLoginFailures(email);
  updateRow(CONFIG.users, principal.row, { last_login: new Date().toISOString() });
  const token = randomToken();
  const session = { id: principal.id, role: principal.role, email: principal.email, name: principal.name, domain: principal.domain || '', credentialVersion: principal.salt, expiresAt: Date.now() + CONFIG.sessionSeconds * 1000 };
  CacheService.getScriptCache().put('session:' + token, JSON.stringify(session), CONFIG.sessionSeconds);
  audit(principal.email, 'LOGIN', principal.id, 'Editorial session created');
  return { ok: true, token: token, role: principal.role };
}

function logout(data) {
  const token = String(data.token || '');
  if (token) CacheService.getScriptCache().remove('session:' + token);
  return { ok: true };
}

function bootstrapAdmin(email, password) {
  const expected = property('ADMIN_BOOTSTRAP_PASSWORD');
  if (!expected || !constantTimeEqual(password, expected)) return null;
  if (password.length < 12) throw serviceError('The initial administrator password must contain at least 12 characters.');
  return withWriteLock(function () {
    const existing = findUserByEmail(email);
    if (existing) return existing;
    const now = new Date().toISOString();
    const salt = randomToken();
    const admin = {
      created_at: now, updated_at: now, id: randomToken(), role: 'ADMIN',
      name: property('ADMIN_NAME') || PUBLIC_DEFAULTS.managingEditorName, email: email,
      orcid: PUBLIC_DEFAULTS.managingEditorOrcid, affiliation: property('ADMIN_AFFILIATION') || PUBLIC_DEFAULTS.managingEditorAffiliation, country: PUBLIC_DEFAULTS.managingEditorCountry, public_email: PUBLIC_DEFAULTS.contactEmail,
      domain: 'All SETEHEM portfolios', public_title: 'Founding Publisher & Managing Editor',
      public_bio: '', image_url: '', profile_url: '', appointment_start: '',
      appointment_end: '', public_status: 'PRIVATE', sort_order: '0', salt: salt,
      password_hash: hashPassword(password, salt), status: 'ACTIVE',
      invite_token: '', invite_expires: '', last_login: ''
    };
    appendObject(CONFIG.users, admin);
    PropertiesService.getScriptProperties().deleteProperty('ADMIN_BOOTSTRAP_PASSWORD');
    audit(email, 'BOOTSTRAP_ADMIN', admin.id, 'Initial administrator activated');
    return findUserByEmail(email);
  });
}

/*
 * Controlled break-glass recovery. This function is not reachable through
 * doPost. An authorised Apps Script project owner must set a temporary
 * ADMIN_PASSWORD_RESET Script Property, run this function manually, and then
 * confirm that the property has been deleted.
 */
function resetAdminPasswordFromScriptProperties() {
  const email = normaliseEmail(property('ADMIN_EMAIL'));
  const password = property('ADMIN_PASSWORD_RESET');
  if (!email || password.length < 12) throw serviceError('Set ADMIN_EMAIL and a temporary ADMIN_PASSWORD_RESET of at least 12 characters.');
  return withWriteLock(function () {
    const admin = findUserByEmail(email);
    if (!admin || admin.role !== 'ADMIN') throw serviceError('The configured administrator account was not found.');
    const salt = randomToken();
    updateRow(CONFIG.users, admin.row, {
      updated_at: new Date().toISOString(),
      salt: salt,
      password_hash: hashPassword(password, salt)
    });
    PropertiesService.getScriptProperties().deleteProperty('ADMIN_PASSWORD_RESET');
    CacheService.getScriptCache().remove('login-fail:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email)).slice(0, 32));
    audit(email, 'RESET_ADMIN_PASSWORD', admin.id, 'Manual break-glass recovery completed');
    return 'Administrator password reset; ADMIN_PASSWORD_RESET deleted.';
  });
}

function activateEditor(data) {
  const inviteToken = String(data.inviteToken || '');
  const password = String(data.password || '');
  if (password.length < 12) return { ok: false, error: 'Choose a password of at least 12 characters.' };
  return withWriteLock(function () {
    const user = findUserByInvite(inviteToken);
    if (!user || user.status !== 'INVITED') return { ok: false, error: 'This invitation is invalid or has already been used.' };
    const expires = new Date(user.invite_expires).getTime();
    if (!Number.isFinite(expires) || expires <= Date.now()) return { ok: false, error: 'This invitation has expired. Ask the Managing Editor to issue a new one.' };
    const salt = randomToken();
    updateRow(CONFIG.users, user.row, {
      updated_at: new Date().toISOString(), salt: salt,
      password_hash: hashPassword(password, salt), status: 'ACTIVE',
      invite_token: '', invite_expires: ''
    });
    audit(user.email, 'ACTIVATE_EDITOR', user.id, user.domain);
    return { ok: true, message: 'Editor account activated.' };
  });
}

function recordReview(data) {
  const report = data.report || {};
  const domain = String(report.domain || '');
  const title = cleanText(report.title, 350);
  const authorEmail = normaliseEmail(data.authorEmail);
  if (CONFIG.domains.indexOf(domain) < 0 || !title || !authorEmail) return { ok: false, error: 'A valid author email, manuscript title and SETEHEM domain are required.' };
  if (!Array.isArray(report.authorRecommendations) || !Array.isArray(report.editorRecommendations)) return { ok: false, error: 'The review report is incomplete.' };
  if (String(JSON.stringify(report)).length > 50000) return { ok: false, error: 'The review summary is too large to route.' };
  const reportId = cleanText(report.id, 80) || ('CJRE-' + Date.now());
  if (findByField(CONFIG.reviews, 'id', reportId)) return { ok: true, duplicate: true, message: 'This review summary was already routed.' };
  withWriteLock(function () {
    const cache = CacheService.getScriptCache();
    const key = 'review-route:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, authorEmail)).slice(0, 32);
    const count = Number(cache.get(key) || 0), total = Number(cache.get('review-route:total') || 0);
    if (count >= 3 || total >= 30) throw serviceError('Too many review routing attempts. Wait 15 minutes before trying again.');
    cache.put(key, String(count + 1), 900); cache.put('review-route:total', String(total + 1), 900);
  });
  const editor = activeEditorForDomain(domain);
  const recipients = uniqueEmails([property('ADMIN_EMAIL'), editor && editor.email]);
  if (!recipients.length) return { ok: false, error: 'The journal routing service is not configured.' };
  const record = {
    created_at: new Date().toISOString(), id: reportId, author_email: authorEmail,
    title: title, domain: domain, article_type: cleanText(report.articleType, 80),
    score: Number(report.score) || 0,
    recommendation: cleanText(report.recommendation, 160),
    author_recommendations: JSON.stringify(report.authorRecommendations.slice(0, 12)),
    editor_recommendations: JSON.stringify(report.editorRecommendations.slice(0, 12)),
    registry_summary: JSON.stringify({
      available: Boolean(report.registry && report.registry.available),
      verifiedDois: Number(report.registry && report.registry.verifiedDois) || 0,
      detectedDois: Number(report.registry && report.registry.doiTotal) || 0,
      referenceMatches: Number(report.registry && report.registry.referenceMatches) || 0,
      referenceSample: Number(report.registry && report.registry.referenceSample) || 0
    }),
    editor_email: (editor && editor.email) || normaliseEmail(property('ADMIN_EMAIL'))
  };
  withWriteLock(function () { appendObject(CONFIG.reviews, record); });
  sendReviewMail(recipients, record);
  audit(authorEmail, 'ROUTE_REVIEW', reportId, domain + ' -> ' + record.editor_email);
  return { ok: true, message: 'The review summary was routed to the responsible editorial portfolio.', routedTo: editor ? 'section editor and Managing Editor' : 'Managing Editor pending section-editor appointment' };
}

function getEditorialDashboard(data) {
  const user = requireSession(data.token, ['ADMIN', 'EDITOR']);
  const allReviews = rows(CONFIG.reviews).sort(sortByCreatedDescending);
  const reviews = user.role === 'ADMIN' ? allReviews : allReviews.filter(function (review) {
    return review.domain === user.domain && normaliseEmail(review.editor_email) === user.email;
  });
  const allEditors = rows(CONFIG.users).filter(function (record) { return record.role === 'EDITOR'; });
  const visibleEditors = user.role === 'ADMIN' ? allEditors : [];
  const response = {
    ok: true,
    user: { role: user.role, name: user.name, email: user.email, domain: user.domain },
    editors: visibleEditors.map(editorForDashboard),
    reviews: reviews.slice(0, 80).map(reviewSummary),
    articles: user.role === 'ADMIN' ? rows(CONFIG.articles).map(articleForDashboard).sort(sortByUpdatedDescending) : [],
    blogPosts: user.role === 'ADMIN' ? rows(CONFIG.blogPosts).map(blogForDashboard).sort(sortByUpdatedDescending) : []
  };
  if (user.role === 'ADMIN') {
    response.settings = publicProfile();
    response.contentPages = rows(CONFIG.contentPages).map(contentPageForPublic);
    response.editablePages = EDITABLE_PAGES;
  }
  return response;
}

function createEditor(data) {
  const admin = requireSession(data.token, ['ADMIN']);
  const email = normaliseEmail(data.email);
  const domain = String(data.domain || '');
  const name = cleanText(data.name, 120);
  if (!email || !name || CONFIG.domains.indexOf(domain) < 0) return { ok: false, error: 'Provide the editor’s full name, verified email and one SETEHEM portfolio.' };
  if (findUserByEmail(email)) return { ok: false, error: 'A user account already exists for this email.' };
  const baseUrl = String(property('PUBLIC_BASE_URL') || '').replace(/\/$/, '');
  if (!/^https:\/\//i.test(baseUrl)) return { ok: false, error: 'PUBLIC_BASE_URL must be the journal’s HTTPS address before editors are invited.' };
  const invite = randomToken() + randomToken();
  const expires = new Date(Date.now() + CONFIG.inviteDays * 86400000).toISOString();
  const now = new Date().toISOString();
  const editor = {
    created_at: now, updated_at: now, id: randomToken(), role: 'EDITOR',
    name: name, email: email, orcid: '', affiliation: cleanText(data.affiliation, 180),
    country: cleanText(data.country, 100), public_email: '', domain: domain,
    public_title: domain + ' Editor', public_bio: '', image_url: '', profile_url: '',
    appointment_start: '', appointment_end: '', public_status: 'PRIVATE',
    sort_order: String(CONFIG.domains.indexOf(domain) + 1), salt: '', password_hash: '',
    status: 'INVITED', invite_token: invite, invite_expires: expires, last_login: ''
  };
  withWriteLock(function () { appendObject(CONFIG.users, editor); });
  sendEditorInviteMail(editor);
  audit(admin.email, 'INVITE_EDITOR', editor.id, domain + ' / ' + email);
  return { ok: true, message: 'The protected editor invitation was sent.' };
}

function reissueEditorInvite(data) {
  const admin = requireSession(data.token, ['ADMIN']);
  const editor = findByField(CONFIG.users, 'id', String(data.id || ''));
  if (!editor || editor.role !== 'EDITOR') return { ok: false, error: 'The selected editor account was not found.' };
  if (editor.status !== 'INVITED' || editor.password_hash) return { ok: false, error: 'A new activation link may be issued only for an unactivated invited editor.' };
  const invite = randomToken() + randomToken();
  const expires = new Date(Date.now() + CONFIG.inviteDays * 86400000).toISOString();
  withWriteLock(function () {
    updateRow(CONFIG.users, editor.row, {
      updated_at: new Date().toISOString(),
      invite_token: invite,
      invite_expires: expires
    });
  });
  const updated = findByField(CONFIG.users, 'id', editor.id);
  sendEditorInviteMail(updated);
  audit(admin.email, 'REISSUE_EDITOR_INVITE', editor.id, editor.domain + ' / ' + editor.email);
  return { ok: true, message: 'A new protected editor invitation was sent; the earlier link is no longer valid.' };
}

function sendEditorInviteMail(editor) {
  const baseUrl = String(property('PUBLIC_BASE_URL') || '').replace(/\/$/, '');
  if (!/^https:\/\//i.test(baseUrl)) throw serviceError('PUBLIC_BASE_URL must be the journal’s HTTPS address before editors are invited.');
  const url = baseUrl + '/portal/editor-access/?token=' + encodeURIComponent(editor.invite_token);
  MailApp.sendEmail({
    to: editor.email,
    subject: 'CHIATECH JOURNAL editorial invitation - ' + editor.domain,
    htmlBody: '<p>Dear ' + html(editor.name) + ',</p><p>You have been invited to join <strong>CHIATECH JOURNAL</strong> as the section editor for <strong>' + html(editor.domain) + '</strong>.</p><p>Set a private password using this one-time link within ' + CONFIG.inviteDays + ' days:</p><p><a href="' + html(url) + '">Activate editorial account</a></p><p>This invitation does not replace appointment acceptance, conflict declaration or editorial training. If you did not expect it, contact ' + html(property('ADMIN_EMAIL')) + '.</p>',
    name: 'CHIATECH JOURNAL Editorial Office'
  });
}

function updateEditor(data) {
  const admin = requireSession(data.token, ['ADMIN']);
  const user = findByField(CONFIG.users, 'id', String(data.id || ''));
  if (!user || user.role !== 'EDITOR') return { ok: false, error: 'The selected editor account was not found.' };
  const domain = String(data.domain || '');
  const publicStatus = 'PRIVATE';
  const accessStatus = String(data.accessStatus || user.status).toUpperCase();
  if (CONFIG.domains.indexOf(domain) < 0) return { ok: false, error: 'Select one valid SETEHEM portfolio.' };
  if (['PRIVATE', 'PUBLISHED'].indexOf(publicStatus) < 0) return { ok: false, error: 'Select whether the profile is private or published.' };
  if (['INVITED', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'].indexOf(accessStatus) < 0) return { ok: false, error: 'Select a valid account status.' };
  if (accessStatus === 'ACTIVE' && !user.password_hash) return { ok: false, error: 'The editor must activate the invitation before the account can be active.' };
  const updates = {
    updated_at: new Date().toISOString(), name: cleanText(data.name, 120) || user.name,
    orcid: cleanOrcid(data.orcid), affiliation: cleanText(data.affiliation, 180),
    country: cleanText(data.country, 100), public_email: normaliseEmail(data.publicEmail), domain: domain,
    public_title: cleanText(data.publicTitle, 140) || (domain + ' Editor'),
    public_bio: cleanLongText(data.publicBio, 1600), image_url: safePublicUrl(data.imageUrl, true),
    profile_url: safePublicUrl(data.profileUrl, true),
    appointment_start: isoDate(data.appointmentStart), appointment_end: isoDate(data.appointmentEnd),
    public_status: publicStatus, sort_order: String(Math.max(1, Math.min(99, Number(data.sortOrder) || (CONFIG.domains.indexOf(domain) + 1)))),
    status: accessStatus
  };
  if (publicStatus === 'PUBLISHED' && (!updates.name || !updates.affiliation || !updates.public_email || !updates.public_bio)) return { ok: false, error: 'A public editor profile requires the verified name, affiliation, public contact email and a concise role biography.' };
  withWriteLock(function () { updateRow(CONFIG.users, user.row, updates); });
  audit(admin.email, 'UPDATE_EDITOR', user.id, domain + ' / ' + publicStatus + ' / ' + accessStatus);
  return { ok: true, editor: editorForDashboard(findByField(CONFIG.users, 'id', user.id)) };
}

function saveArticle(data) {
  const admin = requireSession(data.token, ['ADMIN']);
  const id = slugify(data.id || data.title);
  const status = String(data.status || 'DRAFT').toUpperCase();
  if (['DRAFT', 'PUBLISHED', 'ARCHIVED'].indexOf(status) < 0) return { ok: false, error: 'Select draft, published or archived status.' };
  const article = normaliseArticle(data, id, status, admin.email);
  const existing = findByField(CONFIG.articles, 'id', id);
  const now = new Date().toISOString();
  article.created_at = existing ? existing.created_at : now;
  article.updated_at = now;
  withWriteLock(function () {
    if (existing) updateRow(CONFIG.articles, existing.row, article);
    else appendObject(CONFIG.articles, article);
  });
  audit(admin.email, existing ? 'UPDATE_ARTICLE' : 'CREATE_ARTICLE', id, article.title + ' / ' + status);
  return { ok: true, article: articleForDashboard(findByField(CONFIG.articles, 'id', id)) };
}

function normaliseArticle(data, id, status, actor) {
  const title = cleanText(data.title, 350);
  const domain = String(data.domain || '');
  const authors = Array.isArray(data.authors) ? data.authors.map(cleanAuthor).filter(function (author) { return author.given || author.family; }) : [];
  const abstract = cleanLongText(data.abstract, 6000);
  const keywords = (Array.isArray(data.keywords) ? data.keywords : []).map(function (item) { return cleanText(item, 80); }).filter(Boolean).slice(0, 12);
  const doi = cleanDoi(data.doi);
  const htmlUrl = safePublicUrl(data.htmlUrl, false);
  const pdfUrl = safePublicUrl(data.pdfUrl || data.fullTextUrl, false);
  const pdfDownloadUrl = safePublicUrl(data.pdfDownloadUrl, true) || pdfUrl;
  const videoTitle = cleanText(data.videoTitle, 220);
  const videoUrl = safePublicUrl(data.videoUrl, false);
  const videoPosterUrl = safePublicUrl(data.videoPosterUrl, true);
  const videoCaptionUrl = safePublicUrl(data.videoCaptionUrl, true);
  const videoTranscriptUrl = safePublicUrl(data.videoTranscriptUrl, true);
  if (!id || !title || CONFIG.domains.indexOf(domain) < 0) throw serviceError('Article ID, title and a valid SETEHEM portfolio are required.');
  if (status === 'PUBLISHED') {
    if (!authors.length || !abstract || keywords.length < 3) throw serviceError('A published paper requires verified authors, a complete abstract and at least three keywords.');
    if (!isoDate(data.received) || !isoDate(data.accepted) || !isoDate(data.published)) throw serviceError('Record the authentic received, accepted and published dates before publication.');
    if (!doi) throw serviceError('Register and verify the article DOI before publication.');
    if (!htmlUrl || data.htmlConfirmed !== true) throw serviceError('Confirm and provide the approved full-paper HTML URL before publication.');
    if (!pdfUrl || data.pdfConfirmed !== true) throw serviceError('Confirm and provide the authorised full-paper PDF URL before publication.');
    if (!videoTitle || !videoUrl || data.videoConfirmed !== true) throw serviceError('Confirm and provide the complimentary explanatory video title and direct media URL before publication.');
    if (!videoCaptionUrl && !videoTranscriptUrl) throw serviceError('Provide captions or a transcript for the explanatory video before publication.');
  }
  return {
    id: id, title: title, domain: domain,
    article_type: cleanText(data.articleType, 100) || 'Research article',
    authors_json: JSON.stringify(authors), abstract: abstract,
    keywords_json: JSON.stringify(keywords), doi: doi,
    volume: cleanText(data.volume, 30), issue: cleanText(data.issue, 30),
    issue_title: cleanText(data.issueTitle, 160), elocator: cleanText(data.eLocator, 50),
    pages: cleanText(data.pages, 50), received: isoDate(data.received),
    revised: isoDate(data.revised), accepted: isoDate(data.accepted),
    published: isoDate(data.published), language: cleanText(data.language, 40) || 'English',
    license: cleanText(data.license, 100) || 'CC BY 4.0',
    license_url: safePublicUrl(data.licenseUrl, true) || 'https://creativecommons.org/licenses/by/4.0/',
    copyright_holder: cleanText(data.copyrightHolder, 180) || 'The author(s)',
    html_url: htmlUrl, pdf_url: pdfUrl, pdf_download_url: pdfDownloadUrl,
    video_title: videoTitle, video_url: videoUrl, video_poster_url: videoPosterUrl,
    video_caption_url: videoCaptionUrl, video_transcript_url: videoTranscriptUrl,
    status: status,
    published_by: status === 'PUBLISHED' ? actor : ''
  };
}

function setArticleStatus(data) {
  const admin = requireSession(data.token, ['ADMIN']);
  const article = findByField(CONFIG.articles, 'id', String(data.id || ''));
  const status = String(data.status || '').toUpperCase();
  if (!article || ['DRAFT', 'ARCHIVED'].indexOf(status) < 0) return { ok: false, error: 'Only an existing paper may be moved to draft or archived status here.' };
  withWriteLock(function () { updateRow(CONFIG.articles, article.row, { updated_at: new Date().toISOString(), status: status }); });
  audit(admin.email, 'SET_ARTICLE_STATUS', article.id, status);
  return { ok: true };
}

function saveBlogPost(data) {
  const admin = requireSession(data.token, ['ADMIN']);
  const id = slugify(data.id || data.title);
  const status = String(data.status || 'DRAFT').toUpperCase();
  const domain = String(data.domain || '');
  const contentType = cleanText(data.contentType, 80);
  const title = cleanText(data.title, 260);
  const summary = cleanLongText(data.summary, 900);
  const body = cleanLongText(data.body, 18000);
  const authorName = cleanText(data.authorName, 140);
  const published = isoDate(data.published);
  const mediaType = String(data.mediaType || 'NONE').toUpperCase();
  if (!id || !title || CONFIG.domains.indexOf(domain) < 0 || !contentType) return { ok: false, error: 'Post ID, title, content type and a valid SETEHEM portfolio are required.' };
  if (['DRAFT', 'PUBLISHED', 'ARCHIVED'].indexOf(status) < 0) return { ok: false, error: 'Select draft, published or archived status.' };
  if (['NONE', 'IMAGE', 'VIDEO'].indexOf(mediaType) < 0) return { ok: false, error: 'Select no media, image or video.' };
  if (status === 'PUBLISHED' && (!summary || !body || !authorName || !published)) return { ok: false, error: 'A published blog item requires an author/byline, summary, complete body and publication date.' };
  const now = new Date().toISOString();
  const existing = findByField(CONFIG.blogPosts, 'id', id);
  const post = {
    created_at: existing ? existing.created_at : now, updated_at: now, id: id,
    title: title, content_type: contentType, domain: domain, author_name: authorName,
    summary: summary, body: body,
    tags_json: JSON.stringify((Array.isArray(data.tags) ? data.tags : []).map(function (tag) { return cleanText(tag, 50); }).filter(Boolean).slice(0, 12)),
    published: published, hero_image_url: safePublicUrl(data.heroImageUrl, true),
    hero_image_alt: cleanText(data.heroImageAlt, 240), media_type: mediaType,
    media_url: mediaType === 'NONE' ? '' : safePublicUrl(data.mediaUrl, false),
    rights_notice: cleanText(data.rightsNotice, 300) || 'Read, watch and share this page. Copying, republication and redistribution require written permission from CHIATECH JOURNAL.',
    status: status, published_by: status === 'PUBLISHED' ? admin.email : ''
  };
  if (mediaType !== 'NONE' && !post.media_url) return { ok: false, error: 'Provide an authorised HTTPS or journal-relative media URL.' };
  withWriteLock(function () {
    if (existing) updateRow(CONFIG.blogPosts, existing.row, post);
    else appendObject(CONFIG.blogPosts, post);
  });
  audit(admin.email, existing ? 'UPDATE_BLOG_POST' : 'CREATE_BLOG_POST', id, title + ' / ' + status);
  return { ok: true, post: blogForDashboard(findByField(CONFIG.blogPosts, 'id', id)) };
}

function setBlogPostStatus(data) {
  const admin = requireSession(data.token, ['ADMIN']);
  const post = findByField(CONFIG.blogPosts, 'id', String(data.id || ''));
  const status = String(data.status || '').toUpperCase();
  if (!post || ['DRAFT', 'ARCHIVED'].indexOf(status) < 0) return { ok: false, error: 'Only an existing post may be moved to draft or archived status here.' };
  withWriteLock(function () { updateRow(CONFIG.blogPosts, post.row, { updated_at: new Date().toISOString(), status: status }); });
  audit(admin.email, 'SET_BLOG_STATUS', post.id, status);
  return { ok: true };
}

function saveSettings(data) {
  const admin = requireSession(data.token, ['ADMIN']);
  const incoming = data.settings || {};
  const allowed = [
    'issn', 'doiPrefix', 'contactEmail', 'submissionStatus', 'currentIssueLabel', 'publicAnnouncement',
    'managingEditorName', 'managingEditorTitle', 'managingEditorAffiliation', 'managingEditorCountry',
    'managingEditorOrcid', 'managingEditorDoi', 'managingEditorBio', 'managingEditorImageUrl',
    'homeHeadline', 'homeIntroduction',
    'standardPublicationFee', 'pioneerPublicationFee', 'pioneerFeeLabel',
    'paymentAccountName', 'paymentAccountNumber', 'paymentBank', 'paymentReceiptWhatsapp',
    'paymentReceiptEmail', 'paymentInstruction'
  ];
  const clean = {};
  allowed.forEach(function (key) {
    if (incoming[key] === undefined) return;
    if (key === 'contactEmail' || key === 'paymentReceiptEmail') clean[key] = normaliseEmail(incoming[key]);
    else if (key === 'managingEditorOrcid') clean[key] = cleanOrcid(incoming[key]);
    else if (key === 'managingEditorDoi') clean[key] = cleanDoi(incoming[key]);
    else if (key === 'managingEditorImageUrl') clean[key] = safePublicUrl(incoming[key], true);
    else if (key === 'standardPublicationFee' || key === 'pioneerPublicationFee') {
      const amount = Math.round(Number(String(incoming[key] || '').replace(/[^0-9.]/g, '')));
      if (!Number.isFinite(amount) || amount < 1 || amount > 10000000) throw serviceError('Publication fees must be valid Nigerian-naira amounts.');
      clean[key] = String(amount);
    } else if (key === 'paymentAccountNumber') {
      clean[key] = String(incoming[key] || '').replace(/\D/g, '');
      if (!/^\d{10,20}$/.test(clean[key])) throw serviceError('Enter the verified payment account number using digits only.');
    } else {
      const longFields = ['publicAnnouncement', 'managingEditorBio', 'paymentInstruction', 'homeIntroduction'];
      clean[key] = cleanLongText(incoming[key], longFields.indexOf(key) >= 0 ? (key === 'managingEditorBio' ? 1600 : 500) : 180);
    }
  });
  if (!clean.contactEmail) clean.contactEmail = PUBLIC_DEFAULTS.contactEmail;
  if (!clean.paymentReceiptEmail) clean.paymentReceiptEmail = PUBLIC_DEFAULTS.paymentReceiptEmail;
  if (clean.pioneerPublicationFee && clean.standardPublicationFee && Number(clean.pioneerPublicationFee) > Number(clean.standardPublicationFee)) {
    throw serviceError('The pioneer publication fee cannot exceed the standard publication fee.');
  }
  withWriteLock(function () {
    Object.keys(clean).forEach(function (key) { setSetting(key, clean[key], true); });
  });
  audit(admin.email, 'UPDATE_JOURNAL_SETTINGS', 'public-profile', Object.keys(clean).join(', '));
  return { ok: true, settings: publicProfile() };
}

function publicProfile() {
  const profile = {};
  Object.keys(PUBLIC_DEFAULTS).forEach(function (key) { profile[key] = PUBLIC_DEFAULTS[key]; });
  rows(CONFIG.settings).filter(function (item) { return String(item.public).toUpperCase() === 'TRUE'; }).forEach(function (item) {
    if (Object.prototype.hasOwnProperty.call(profile, item.key) && item.value) profile[item.key] = item.value;
  });
  return profile;
}

function publicEditors() {
  return [];
}

const EDITABLE_PAGES = [
  '/about/', '/about/aims-scope/', '/about/contact/', '/about/indexing-archiving/', '/about/setehem-model/',
  '/academic-resources/', '/authors/', '/authors/guidelines/', '/authors/manuscript-template/',
  '/disciplines/', '/disciplines/science/', '/disciplines/technology/', '/disciplines/engineering/',
  '/disciplines/mathematics/', '/disciplines/education/', '/disciplines/humanities-social-sciences/',
  '/disciplines/entrepreneurship-management/', '/ethics/', '/peer-review/', '/policies/',
  '/policies/privacy/', '/policies/corrections-retractions/', '/policies/plagiarism-ai/',
  '/policies/copyright-licensing/', '/policies/open-access/'
];

function contentPageForPublic(page) {
  return { path: page.path, title: page.title, summary: page.summary, body: page.body, status: page.status, updatedAt: page.updated_at };
}

function publicContentPage(pagePath) {
  if (EDITABLE_PAGES.indexOf(pagePath) < 0) return { ok: true, page: null };
  const page = findByField(CONFIG.contentPages, 'path', pagePath);
  if (!page || page.status === 'ARCHIVED') return { ok: true, page: null };
  if (page.published_body) return { ok: true, page: { path: page.path, title: page.published_title, summary: page.published_summary, body: page.published_body, status: 'PUBLISHED', updatedAt: page.published_at } };
  return { ok: true, page: page.status === 'PUBLISHED' ? contentPageForPublic(page) : null };
}

function saveContentPage(data) {
  const admin = requireSession(data.token, ['ADMIN']);
  const pagePath = String(data.path || '');
  if (EDITABLE_PAGES.indexOf(pagePath) < 0) return { ok: false, error: 'Choose an editable journal page.' };
  const status = String(data.status || 'DRAFT').toUpperCase();
  if (['DRAFT', 'PUBLISHED', 'ARCHIVED'].indexOf(status) < 0) return { ok: false, error: 'Choose a valid page state.' };
  const record = { path: pagePath, title: cleanText(data.title, 180), summary: cleanLongText(data.summary, 900), body: cleanLongText(data.body, 32000), status: status, updated_by: admin.email, updated_at: new Date().toISOString() };
  if (status === 'PUBLISHED' && (!record.title || !record.summary || record.body.length < 80)) return { ok: false, error: 'Published pages require a title, summary and complete reader content.' };
  withWriteLock(function () {
    const existing = findByField(CONFIG.contentPages, 'path', pagePath);
    record.created_at = existing ? existing.created_at : record.updated_at;
    if (status === 'PUBLISHED') {
      record.published_title = record.title; record.published_summary = record.summary;
      record.published_body = record.body; record.published_at = record.updated_at;
    } else if (status === 'ARCHIVED') {
      record.published_title = ''; record.published_summary = ''; record.published_body = ''; record.published_at = '';
    } else if (existing) {
      record.published_title = existing.published_title || (existing.status === 'PUBLISHED' ? existing.title : '');
      record.published_summary = existing.published_summary || (existing.status === 'PUBLISHED' ? existing.summary : '');
      record.published_body = existing.published_body || (existing.status === 'PUBLISHED' ? existing.body : '');
      record.published_at = existing.published_at || (existing.status === 'PUBLISHED' ? existing.updated_at : '');
    }
    if (existing) updateRow(CONFIG.contentPages, existing.row, record);
    else appendObject(CONFIG.contentPages, record);
  });
  audit(admin.email, 'UPDATE_CONTENT_PAGE', pagePath, status);
  return { ok: true, page: contentPageForPublic(record) };
}

function publicArticles() {
  return rows(CONFIG.articles).filter(function (article) { return article.status === 'PUBLISHED'; })
    .map(articleForPublic)
    .sort(function (a, b) { return String(b.published).localeCompare(String(a.published)); });
}

function publicArticle(id) {
  const article = findByField(CONFIG.articles, 'id', slugify(id));
  return article && article.status === 'PUBLISHED' ? { ok: true, article: articleForPublic(article) } : { ok: false, error: 'Article not found.' };
}

function publicBlogPosts() {
  return rows(CONFIG.blogPosts).filter(function (post) { return post.status === 'PUBLISHED'; })
    .map(blogForPublic)
    .sort(function (a, b) { return String(b.published).localeCompare(String(a.published)); });
}

function publicBlogPost(id) {
  const post = findByField(CONFIG.blogPosts, 'id', slugify(id));
  return post && post.status === 'PUBLISHED' ? { ok: true, post: blogForPublic(post) } : { ok: false, error: 'Blog item not found.' };
}

function articleForPublic(article) {
  return {
    id: article.id, title: article.title, domain: article.domain,
    articleType: article.article_type, authors: parseJson(article.authors_json, []),
    abstract: article.abstract, keywords: parseJson(article.keywords_json, []),
    doi: article.doi, volume: article.volume, issue: article.issue,
    issueTitle: article.issue_title, eLocator: article.elocator, pages: article.pages,
    received: article.received, revised: article.revised, accepted: article.accepted,
    published: article.published, language: article.language,
    license: article.license, licenseUrl: article.license_url,
    copyrightHolder: article.copyright_holder, htmlUrl: article.html_url,
    pdfUrl: article.pdf_url, pdfDownloadUrl: article.pdf_download_url || article.pdf_url,
    videoTitle: article.video_title, videoUrl: article.video_url,
    videoPosterUrl: article.video_poster_url, videoCaptionUrl: article.video_caption_url,
    videoTranscriptUrl: article.video_transcript_url
  };
}

function articleForDashboard(article) {
  const result = articleForPublic(article);
  result.status = article.status;
  result.updatedAt = article.updated_at;
  return result;
}

function blogForPublic(post) {
  return {
    id: post.id, title: post.title, contentType: post.content_type,
    domain: post.domain, authorName: post.author_name, summary: post.summary,
    body: post.body, tags: parseJson(post.tags_json, []), published: post.published,
    heroImageUrl: post.hero_image_url, heroImageAlt: post.hero_image_alt,
    mediaType: post.media_type, mediaUrl: post.media_url,
    rightsNotice: post.rights_notice
  };
}

function blogForDashboard(post) {
  const result = blogForPublic(post);
  result.status = post.status;
  result.updatedAt = post.updated_at;
  return result;
}

function editorForPublic(editor) {
  return {
    id: editor.id, name: editor.name, title: editor.public_title,
    affiliation: editor.affiliation, country: editor.country, publicEmail: editor.public_email, domain: editor.domain,
    orcid: editor.orcid, bio: editor.public_bio, imageUrl: editor.image_url,
    profileUrl: editor.profile_url, appointmentStart: editor.appointment_start,
    appointmentEnd: editor.appointment_end, sortOrder: Number(editor.sort_order || 99)
  };
}

function editorForDashboard(editor) {
  const result = editorForPublic(editor);
  result.email = editor.email;
  result.status = editor.status;
  result.publicStatus = editor.public_status || 'PRIVATE';
  result.lastLogin = editor.last_login;
  return result;
}

function reviewSummary(review) {
  return {
    id: review.id, title: review.title, domain: review.domain, articleType: review.article_type,
    score: review.score, recommendation: review.recommendation, createdAt: review.created_at,
    authorEmail: review.author_email, editorEmail: review.editor_email,
    authorRecommendations: parseJson(review.author_recommendations, []),
    editorRecommendations: parseJson(review.editor_recommendations, []),
    registry: parseJson(review.registry_summary, {})
  };
}

function activeEditorForDomain(domain) {
  return rows(CONFIG.users).filter(function (user) { return user.role === 'EDITOR' && user.status === 'ACTIVE' && user.domain === domain; })[0] || null;
}

function sendReviewMail(recipients, review) {
  const authorSteps = parseJson(review.author_recommendations, []).map(function (item) { return '<li>' + html(item) + '</li>'; }).join('');
  const editorSteps = parseJson(review.editor_recommendations, []).map(function (item) { return '<li>' + html(item) + '</li>'; }).join('');
  MailApp.sendEmail({
    to: recipients.join(','),
    subject: '[CHIATECH Review Engine] ' + review.domain + ' - ' + review.recommendation,
    htmlBody: '<h2>CHIATECH Review Engine routing copy</h2><p><strong>Report:</strong> ' + html(review.id) + '<br><strong>Manuscript:</strong> ' + html(review.title) + '<br><strong>Corresponding author:</strong> ' + html(review.author_email) + '<br><strong>Portfolio:</strong> ' + html(review.domain) + '<br><strong>Readiness score:</strong> ' + html(review.score) + '/100<br><strong>Routing recommendation:</strong> ' + html(review.recommendation) + '</p><h3>Author recommendations</h3><ol>' + authorSteps + '</ol><h3>Required human-editor follow-up</h3><ol>' + editorSteps + '</ol><p><em>This is an automated readiness summary, not an acceptance, peer-review report, plagiarism certificate or AI-authorship finding. A qualified editor must make an independent, documented decision.</em></p>',
    name: 'CHIATECH JOURNAL Review Engine'
  });
}

function requireSession(token, roles) {
  const key = 'session:' + String(token || '');
  const cache = CacheService.getScriptCache();
  const raw = cache.get(key);
  if (!raw) throw serviceError('Your session has expired. Sign in again.');
  const user = JSON.parse(raw);
  const current = findUserByEmail(normaliseEmail(user.email));
  if (!current || current.id !== user.id || current.status !== 'ACTIVE' || current.role !== user.role || !user.expiresAt || user.expiresAt <= Date.now() || !user.credentialVersion || current.salt !== user.credentialVersion) {
    cache.remove(key);
    throw serviceError('Your session has expired or account access has changed. Sign in again.');
  }
  if (roles.indexOf(current.role) < 0) throw serviceError('You are not authorised for this action.');
  return { id: current.id, role: current.role, email: current.email, name: current.name, domain: current.domain || '' };
}

function enforceLoginRateLimit(email) {
  const count = Number(CacheService.getScriptCache().get(loginFailureKey(email)) || 0);
  if (count >= CONFIG.maxLoginFailures) throw serviceError('Too many unsuccessful sign-in attempts. Wait 15 minutes and try again.');
}

function recordLoginFailure(email) {
  const cache = CacheService.getScriptCache();
  const key = loginFailureKey(email);
  const count = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(count), CONFIG.loginWindowSeconds);
}

function clearLoginFailures(email) { CacheService.getScriptCache().remove(loginFailureKey(email)); }
function loginFailureKey(email) { return 'login-fail:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email)).slice(0, 32); }

function database() {
  const id = property('DATABASE_SHEET_ID');
  if (!id) throw serviceError('The editorial database is not configured.');
  return SpreadsheetApp.openById(id);
}

function ensureSheet(name) {
  const ss = database();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const required = HEADERS[name];
  if (!required) throw serviceError('Unknown data sheet.');
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, required.length).setValues([required]);
    sheet.setFrozenRows(1);
  } else {
    const width = Math.max(1, sheet.getLastColumn());
    const current = sheet.getRange(1, 1, 1, width).getValues()[0].map(String);
    if (current.some(function (header) { return !header; }) || new Set(current).size !== current.length) throw serviceError('The database headers are invalid. Ask the project owner to restore the verified schema.');
    const missing = required.filter(function (header) { return current.indexOf(header) < 0; });
    if (missing.length) sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function sheetHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
}

function rows(name) {
  const sheet = ensureSheet(name);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).map(function (row, index) {
    const record = { row: index + 2 };
    headers.forEach(function (header, column) { record[header] = row[column] instanceof Date ? (['received', 'revised', 'accepted', 'published', 'appointment_start', 'appointment_end'].indexOf(header) >= 0 ? Utilities.formatDate(row[column], 'Africa/Lagos', 'yyyy-MM-dd') : row[column].toISOString()) : String(row[column] === null || row[column] === undefined ? '' : row[column]); });
    return row.some(function (cell) { return cell !== ''; }) ? record : null;
  }).filter(Boolean);
}

function safeSheetValue(value) {
  if (typeof value === 'string' && /^\s*[=+\-@]/.test(value)) return "'" + value;
  return value;
}

function appendObject(name, object) {
  const sheet = ensureSheet(name);
  const headers = sheetHeaders(sheet);
  sheet.appendRow(headers.map(function (header) { return object[header] === undefined ? '' : safeSheetValue(object[header]); }));
}

function updateRow(name, rowNumber, values) {
  const sheet = ensureSheet(name);
  const headers = sheetHeaders(sheet);
  const current = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  headers.forEach(function (header, index) { if (values[header] !== undefined) current[index] = values[header]; });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([current.map(safeSheetValue)]);
}

function setSetting(key, value, isPublic) {
  const existing = findByField(CONFIG.settings, 'key', key);
  const record = { updated_at: new Date().toISOString(), key: key, value: value, public: isPublic ? 'TRUE' : 'FALSE' };
  if (existing) updateRow(CONFIG.settings, existing.row, record);
  else appendObject(CONFIG.settings, record);
}

function findByField(name, field, value) { return rows(name).filter(function (record) { return String(record[field] || '') === String(value || ''); })[0] || null; }
function findUserByEmail(email) { return rows(CONFIG.users).filter(function (user) { return normaliseEmail(user.email) === email; })[0] || null; }
function findUserByInvite(token) { return rows(CONFIG.users).filter(function (user) { return token && user.invite_token === token; })[0] || null; }
function property(name) { return String(PropertiesService.getScriptProperties().getProperty(name) || '').trim(); }
function randomToken() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); }

function hashPassword(password, salt) {
  const pepper = property('PASSWORD_PEPPER') || createPepper();
  let value = String(password) + '|' + String(salt) + '|' + pepper;
  for (let i = 0; i < CONFIG.passwordIterations; i += 1) value = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8));
  return value;
}

function createPepper() {
  const pepper = randomToken() + randomToken();
  PropertiesService.getScriptProperties().setProperty('PASSWORD_PEPPER', pepper);
  return pepper;
}

function verifyPassword(password, salt, expected) { return Boolean(expected) && constantTimeEqual(hashPassword(password, salt), expected); }

function constantTimeEqual(a, b) {
  const left = String(a), right = String(b);
  let mismatch = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i += 1) mismatch |= (left.charCodeAt(i % Math.max(left.length, 1)) || 0) ^ (right.charCodeAt(i % Math.max(right.length, 1)) || 0);
  return mismatch === 0;
}

function normaliseEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function uniqueEmails(list) {
  const seen = {};
  return list.map(normaliseEmail).filter(function (email) { if (!email || seen[email]) return false; seen[email] = true; return true; });
}

function cleanText(value, max) { return String(value || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max || 500); }
function cleanLongText(value, max) { return String(value || '').replace(/[<>]/g, '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max || 5000); }
function cleanOrcid(value) {
  const text = String(value || '').trim().replace(/^https?:\/\/(?:www\.)?orcid\.org\//i, '').toUpperCase();
  if (!text) return '';
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(text)) throw serviceError('Enter the ORCID iD as four groups of four characters, or leave it empty.');
  const compact = text.replace(/-/g, '');
  let total = 0;
  for (let index = 0; index < 15; index += 1) total = (total + Number(compact[index])) * 2;
  const remainder = (12 - (total % 11)) % 11;
  const check = remainder === 10 ? 'X' : String(remainder);
  if (compact[15] !== check) throw serviceError('The ORCID iD check digit is invalid. Verify the researcher’s ORCID record or leave the field empty.');
  return text;
}

function cleanAuthor(author) {
  return {
    given: cleanText(author && author.given, 100),
    family: cleanText(author && author.family, 100),
    affiliation: cleanText(author && author.affiliation, 220),
    orcid: cleanOrcid(author && author.orcid)
  };
}

function cleanDoi(value) {
  const text = String(value || '').trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
  if (!text) return '';
  if (!/^10\.\d{4,9}\/[\-._;()/:A-Z0-9]+$/i.test(text)) throw serviceError('Enter a valid, formally assigned DOI or leave the DOI field empty.');
  return text;
}
function isoDate(value) {
  const text = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  const date = new Date(text + 'T12:00:00Z');
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : '';
}
function slugify(value) { return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120); }

function safePublicUrl(value, optional) {
  const url = String(value || '').trim();
  if (!url && optional) return '';
  if (/^\/(?!\/)[A-Za-z0-9._~!$&'()*+,;=:@%/?#-]+$/.test(url)) return url;
  if (/^https:\/\/[^\s<>]+$/i.test(url)) return url.slice(0, 1500);
  return '';
}

function parseJson(value, fallback) { try { return JSON.parse(value); } catch (_) { return fallback; } }
function sortByCreatedDescending(a, b) { return String(b.created_at).localeCompare(String(a.created_at)); }
function sortByUpdatedDescending(a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); }

function withWriteLock(work) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return work(); } finally { lock.releaseLock(); }
}

function audit(actor, action, target, detail) {
  appendObject(CONFIG.audit, { created_at: new Date().toISOString(), actor: actor, action: action, target: target, detail: cleanText(detail, 1000) });
}

function html(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

function serviceError(message) {
  const error = new Error(message);
  error.publicMessage = message;
  return error;
}

function safeError(error) {
  return error && error.publicMessage || 'The editorial service could not complete that request.';
}

function json(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
