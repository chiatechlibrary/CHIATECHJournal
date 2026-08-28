(() => {
  if (!window.CHIATECH_API || !document.querySelector('main')) return;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const publicFields = new Set([
    'issn', 'doiPrefix', 'contactEmail', 'submissionStatus', 'currentIssueLabel', 'publicAnnouncement',
    'managingEditorName', 'managingEditorTitle', 'managingEditorAffiliation', 'managingEditorCountry',
    'managingEditorOrcid', 'managingEditorDoi', 'managingEditorBio', 'managingEditorImageUrl', 'homeHeadline', 'homeIntroduction',
    'standardPublicationFee', 'pioneerPublicationFee', 'pioneerFeeLabel',
    'paymentAccountName', 'paymentAccountNumber', 'paymentBank', 'paymentReceiptWhatsapp',
    'paymentReceiptEmail', 'paymentInstruction'
  ]);
  const naira = value => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(Number(value) || 0);

  function apply(profile) {
    if (!profile) return;
    document.querySelectorAll('[data-journal-issn]').forEach(node => { node.textContent = profile.issn; });
    document.querySelectorAll('[data-journal-doi-prefix]').forEach(node => { node.textContent = profile.doiPrefix; });
    document.querySelectorAll('a[href^="mailto:chiatechresearch@gmail.com"],a[href^="mailto:chiatechlibrary@gmail.com"]').forEach(link => {
      link.href = `mailto:${profile.contactEmail}`;
      if (/^chiatech(?:research|library)@gmail\.com$/i.test(link.textContent.trim())) link.textContent = profile.contactEmail;
    });
    document.querySelectorAll('[data-profile-text]').forEach(node => {
      const key = node.dataset.profileText;
      if (publicFields.has(key) && profile[key] !== undefined) node.textContent = profile[key];
    });
    document.querySelectorAll('[data-profile-headline]').forEach(node => {
      if (!profile.homeHeadline) return;
      const words = String(profile.homeHeadline).trim().split(/\s+/);
      const accent = document.createElement('span'); accent.textContent = words.pop();
      node.replaceChildren(document.createTextNode(words.length ? `${words.join(' ')} ` : ''), accent);
    });
    document.querySelectorAll('[data-profile-currency]').forEach(node => {
      const key = node.dataset.profileCurrency;
      if (publicFields.has(key) && profile[key] !== undefined) node.textContent = naira(profile[key]);
    });
    document.querySelectorAll('[data-profile-email]').forEach(link => {
      const key = link.dataset.profileEmail;
      if (!publicFields.has(key) || !profile[key]) return;
      link.href = `mailto:${profile[key]}`;
      link.textContent = profile[key];
    });
    document.querySelectorAll('[data-profile-whatsapp]').forEach(link => {
      const key = link.dataset.profileWhatsapp;
      if (!publicFields.has(key) || !profile[key]) return;
      link.href = `https://wa.me/${String(profile[key]).replace(/\D/g, '')}`;
      link.textContent = profile[key];
    });
    document.querySelectorAll('[data-profile-orcid]').forEach(link => {
      const key = link.dataset.profileOrcid;
      const id = publicFields.has(key) ? String(profile[key] || '').trim() : '';
      if (!id) { link.hidden = true; return; }
      link.href = `https://orcid.org/${encodeURIComponent(id)}`;
      link.setAttribute('aria-label', `View ORCID record ${id}`);
      const value = link.querySelector('[data-orcid-value]');
      if (value) value.textContent = `https://orcid.org/${id}`;
      link.hidden = false;
    });
    document.querySelectorAll('[data-profile-doi]').forEach(link => {
      const value = String(profile[link.dataset.profileDoi] || '').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').trim();
      link.hidden = !/^10\.\d{4,9}\/\S+$/i.test(value);
      if (!link.hidden) { link.href = `https://doi.org/${value}`; link.textContent = `Editorial DOI: ${value}`; }
    });
    document.querySelectorAll('[data-profile-image]').forEach(image => {
      const key = image.dataset.profileImage;
      if (publicFields.has(key) && profile[key]) image.src = profile[key];
    });
    document.querySelectorAll('.footer-bottom span').forEach(node => {
      if (/ISSN\s*:/i.test(node.textContent) && /DOI prefix\s*:/i.test(node.textContent)) node.textContent = `ISSN: ${profile.issn} · DOI prefix: ${profile.doiPrefix}`;
    });
    if (document.querySelector('.journal-announcement') || !profile.publicAnnouncement) return;
    const banner = document.createElement('aside');
    banner.className = 'journal-announcement';
    banner.setAttribute('aria-label', 'Journal announcement');
    banner.innerHTML = `<div class="container"><strong>${escapeHtml(profile.submissionStatus)} submissions</strong><span>${escapeHtml(profile.publicAnnouncement)}</span><small>${escapeHtml(profile.currentIssueLabel)}</small></div>`;
    const header = document.querySelector('.site-header');
    (header || document.body.firstElementChild)?.insertAdjacentElement('afterend', banner);
  }

  window.CHIATECH_API.get('profile').then(response => { if (response.ok) apply(response.profile); }).catch(() => {});
})();
