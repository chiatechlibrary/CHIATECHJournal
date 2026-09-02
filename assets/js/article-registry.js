(() => {
  const listRoot = document.querySelector('[data-article-registry]');
  const readerRoot = document.querySelector('[data-article-reader]');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const authorName = author => [author.given, author.family].filter(Boolean).join(' ');
  const initials = given => String(given || '').split(/[\s-]+/).filter(Boolean).map(name => `${name[0].toUpperCase()}.`).join(' ');
  const yearOf = article => String(article.published || '').slice(0, 4);
  const displayDate = value => value ? new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${value}T12:00:00Z`)) : 'Not recorded';
  const doiUrl = doi => doi ? `https://doi.org/${String(doi).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')}` : '';
  const pageUrl = article => `/articles/read/?id=${encodeURIComponent(article.id)}`;
  const naturalJoin = names => names.length < 2 ? (names[0] || '') : `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
  const ampJoin = names => names.length < 2 ? (names[0] || '') : `${names.slice(0, -1).join(', ')}, & ${names.at(-1)}`;

  function recommendedStyle(domain) {
    if (['Technology', 'Engineering', 'Mathematics'].includes(domain)) return 'ieee';
    if (domain === 'Science') return 'vancouver';
    return 'apa7';
  }

  function citationFormats(article) {
    const authors = article.authors || [];
    const year = yearOf(article);
    const journal = 'CHIATECH JOURNAL';
    const doi = doiUrl(article.doi);
    const doiPendingNote = !article.doi && article.doiStatus === 'PENDING_REGISTRATION' ? ' DOI pending registration.' : '';
    const pages = article.eLocator || article.pages || '';
    const volumeIssue = `${article.volume || ''}${article.issue ? `(${article.issue})` : ''}`;
    const apaAuthors = ampJoin(authors.map(author => `${author.family || ''}, ${initials(author.given)}`.trim()));
    const naturalAuthors = naturalJoin(authors.map(authorName));
    const mlaAuthors = authors.length > 2 ? `${authors[0]?.family || ''}, ${authors[0]?.given || ''}, et al.` : authors.length === 2 ? `${authors[0]?.family || ''}, ${authors[0]?.given || ''}, and ${authorName(authors[1])}` : authors.length ? `${authors[0]?.family || ''}, ${authors[0]?.given || ''}` : '';
    const chicagoAuthors = authors.length > 3 ? `${authors[0]?.family || ''}, ${authors[0]?.given || ''}, et al.` : authors.length ? `${authors[0]?.family || ''}, ${authors[0]?.given || ''}${authors.slice(1).length ? `, ${naturalJoin(authors.slice(1).map(authorName))}` : ''}` : '';
    const harvardAuthors = authors.length > 3 ? `${authors[0]?.family || ''} et al.` : authors.map(author => `${author.family || ''}, ${initials(author.given)}`).join('; ');
    const ieeeAuthors = authors.length > 6 ? `${initials(authors[0]?.given)} ${authors[0]?.family || ''} et al.` : authors.map(author => `${initials(author.given)} ${author.family || ''}`.trim()).join(', ');
    const vancouverAuthors = authors.length > 6 ? `${authors.slice(0, 6).map(author => `${author.family || ''} ${initials(author.given).replace(/\./g, '').replace(/\s/g, '')}`).join(', ')}, et al.` : authors.map(author => `${author.family || ''} ${initials(author.given).replace(/\./g, '').replace(/\s/g, '')}`).join(', ');
    const location = [volumeIssue, pages].filter(Boolean).join(', ');
    const bib = value => String(value || '').replace(/[\\{}]/g, char => `\\${char}`).replace(/[\r\n]+/g, ' ');
    const bibFields = { title: article.title, author: authors.map(author => `${author.family}, ${author.given}`).join(' and '), journal, year, volume: article.volume, number: article.issue, pages, doi: article.doi, note: doiPendingNote.trim(), url: doi || `https://journal.chiatechsolutions.com${pageUrl(article)}`, abstract: article.abstract, keywords: (article.keywords || []).join(', ') };
    const risLine = (tag, value) => value ? `${tag}  - ${String(value).replace(/[\r\n]+/g, ' ')}\n` : '';
    return {
      bibtex: `@article{${String(article.id).replace(/[^a-z0-9_-]/gi, '')},\n${Object.entries(bibFields).filter(([, value]) => value).map(([key, value]) => `  ${key} = {${bib(value)}}`).join(',\n')}\n}`,
      ris: `TY  - JOUR\n${authors.map(author => risLine('AU', `${author.family}, ${author.given}`)).join('')}${risLine('TI', article.title)}${risLine('JO', journal)}${risLine('PY', year)}${risLine('DA', article.published)}${risLine('VL', article.volume)}${risLine('IS', article.issue)}${risLine('SP', pages)}${risLine('DO', article.doi)}${risLine('UR', doi || `https://journal.chiatechsolutions.com${pageUrl(article)}`)}${risLine('AB', article.abstract)}${(article.keywords || []).map(word => risLine('KW', word)).join('')}ER  -`,
      apa7: `${apaAuthors} (${year}). ${article.title}. ${journal}${location ? `, ${location}` : ''}.${doi ? ` ${doi}` : doiPendingNote}`,
      mla9: `${mlaAuthors}. “${article.title}.” ${journal}${article.volume ? `, vol. ${article.volume}` : ''}${article.issue ? `, no. ${article.issue}` : ''}${year ? `, ${year}` : ''}${pages ? `, ${pages}` : ''}.${doi ? ` ${doi}.` : doiPendingNote}`,
      chicago18: `${chicagoAuthors}. “${article.title}.” ${journal} ${volumeIssue}${year ? ` (${year})` : ''}${pages ? `: ${pages}` : ''}.${doi ? ` ${doi}.` : doiPendingNote}`.replace(/\s+/g, ' '),
      harvard: `${harvardAuthors} ${year ? `(${year})` : ''} ‘${article.title}’, ${journal}${article.volume ? `, vol. ${article.volume}` : ''}${article.issue ? `, no. ${article.issue}` : ''}${pages ? `, ${pages}` : ''}.${doi ? ` Available at: ${doi}` : doiPendingNote}`,
      ieee: `${ieeeAuthors}, “${article.title},” ${journal}${article.volume ? `, vol. ${article.volume}` : ''}${article.issue ? `, no. ${article.issue}` : ''}${pages ? `, ${pages}` : ''}${year ? `, ${year}` : ''}.${doi ? ` doi: ${doi.replace('https://doi.org/', '')}.` : doiPendingNote}`,
      vancouver: `${vancouverAuthors}. ${article.title}. ${journal}. ${year}${article.volume ? `;${article.volume}` : ''}${article.issue ? `(${article.issue})` : ''}${pages ? `:${pages}` : ''}.${doi ? ` doi:${doi.replace('https://doi.org/', '')}.` : doiPendingNote}`
    };
  }

  function injectMetadata(article) {
    document.querySelectorAll('meta[name^="citation_"],script[data-paper-schema]').forEach(node => node.remove());
    document.title = `${article.title} | CHIATECH JOURNAL`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = article.abstract;
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = `${location.origin}${pageUrl(article)}`;
    const addMeta = (name, content) => {
      if (!content) return;
      const node = document.createElement('meta');
      node.name = name;
      node.content = content;
      document.head.append(node);
    };
    addMeta('citation_title', article.title);
    (article.authors || []).forEach(author => addMeta('citation_author', authorName(author)));
    addMeta('citation_publication_date', article.published);
    addMeta('citation_journal_title', 'CHIATECH JOURNAL');
    addMeta('citation_volume', article.volume);
    addMeta('citation_issue', article.issue);
    addMeta('citation_firstpage', article.eLocator || article.pages);
    addMeta('citation_fulltext_html_url', article.htmlUrl);
    addMeta('citation_pdf_url', article.pdfUrl);
    addMeta('citation_doi', article.doi);
    addMeta('citation_keywords', (article.keywords || []).join(', '));
    const schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.dataset.paperSchema = '';
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'ScholarlyArticle',
      headline: article.title, abstract: article.abstract, datePublished: article.published,
      author: (article.authors || []).map(author => ({ '@type': 'Person', name: authorName(author), identifier: author.orcid ? `https://orcid.org/${author.orcid}` : undefined, affiliation: author.affiliation ? { '@type': 'Organization', name: author.affiliation } : undefined })),
      keywords: (article.keywords || []).join(', '), inLanguage: article.language || 'English',
      isPartOf: { '@type': 'Periodical', name: 'CHIATECH JOURNAL' },
      publisher: { '@type': 'Organization', name: 'CHIA TECH SOLUTIONS AND RESOURCES LIMITED' },
      license: article.licenseUrl || article.license,
      sameAs: article.doi ? doiUrl(article.doi) : undefined,
      encoding: [
        article.htmlUrl ? { '@type': 'MediaObject', contentUrl: article.htmlUrl, encodingFormat: 'text/html' } : undefined,
        article.pdfUrl ? { '@type': 'MediaObject', contentUrl: article.pdfUrl, encodingFormat: 'application/pdf' } : undefined
      ].filter(Boolean),
      video: article.videoUrl ? {
        '@type': 'VideoObject',
        name: article.videoTitle || `Explanatory video: ${article.title}`,
        description: `Complimentary narrated visual explanation of the key findings reported in ${article.title}.`,
        contentUrl: article.videoUrl,
        thumbnailUrl: article.videoPosterUrl || undefined,
        uploadDate: article.published,
        transcript: article.videoTranscriptUrl || undefined
      } : undefined
    });
    document.head.append(schema);
  }

  function articleCard(article) {
    const identifierLabel = article.doi ? 'DOI' : article.doiStatus === 'PENDING_REGISTRATION' ? 'DOI pending registration' : 'article record';
    return `<article class="article-registry-card"><p class="eyebrow">${escapeHtml(article.domain)} · ${escapeHtml(article.articleType || 'Research article')}</p><h2><a href="${pageUrl(article)}">${escapeHtml(article.title)}</a></h2><p class="article-authors">${escapeHtml((article.authors || []).map(authorName).join(', '))}</p><p>${escapeHtml(article.abstract)}</p><div class="content-tags">${(article.keywords || []).slice(0, 8).map(keyword => `<span>${escapeHtml(keyword)}</span>`).join('')}</div><div class="article-card-meta"><span>${escapeHtml(displayDate(article.published))}</span><span>${escapeHtml([article.volume && `Vol. ${article.volume}`, article.issue && `Issue ${article.issue}`, article.eLocator || article.pages].filter(Boolean).join(' · '))}</span></div><a class="text-link" href="${pageUrl(article)}">Abstract, ${escapeHtml(identifierLabel)}, HTML, PDF, citations and explanatory video →</a></article>`;
  }

  async function loadList() {
    if (!listRoot || !window.CHIATECH_API) return;
    const state = listRoot.querySelector('[data-registry-state]') || listRoot;
    try {
      const response = await window.CHIATECH_API.get('articles');
      if (!response.ok) throw new Error(response.error || 'The publication service is unavailable.');
      const articles = response.articles || [];
      if (!articles.length) {
        listRoot.innerHTML = '<div class="empty-publication"><img src="/assets/images/chiatechjournal-logo.PNG" alt="CHIATECH JOURNAL emblem"><p class="eyebrow">The publication record</p><h2>Our first papers are being prepared.</h2><p>Approved papers will appear here after editorial acceptance, author proof approval and final publication checks. Draft manuscripts are not public.</p><a class="btn btn-primary" href="/review-engine/">Begin the author pathway</a></div>';
        return;
      }
      listRoot.innerHTML = `<div class="registry-controls"><label>Search papers<input type="search" data-paper-search placeholder="Title, author, abstract or keyword"></label><label>Discipline<select data-paper-domain><option value="">All disciplines</option>${[...new Set(articles.map(article => article.domain))].sort().map(domain => `<option>${escapeHtml(domain)}</option>`).join('')}</select></label><label>Order<select data-paper-sort><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select></label></div><p class="registry-count" aria-live="polite"></p><div class="article-registry-grid"></div>`;
      const render = () => {
        const query = listRoot.querySelector('[data-paper-search]').value.toLowerCase().trim();
        const domain = listRoot.querySelector('[data-paper-domain]').value;
        const order = listRoot.querySelector('[data-paper-sort]').value;
        const filtered = articles.filter(article => (!domain || article.domain === domain) && [article.title, article.abstract, ...(article.keywords || []), ...(article.authors || []).map(authorName)].join(' ').toLowerCase().includes(query))
          .sort((a, b) => order === 'title' ? a.title.localeCompare(b.title) : order === 'oldest' ? a.published.localeCompare(b.published) : b.published.localeCompare(a.published));
        listRoot.querySelector('.registry-count').textContent = `${filtered.length} of ${articles.length} published papers`;
        listRoot.querySelector('.article-registry-grid').innerHTML = filtered.length ? filtered.map(articleCard).join('') : '<p class="content-state">No papers match these filters.</p>';
      };
      listRoot.querySelectorAll('input,select').forEach(input => input.addEventListener('input', render));
      render();
    } catch (error) {
      state.textContent = error.message || 'The publication service is temporarily unavailable.';
      state.classList.add('error');
    }
  }

  function safeUrl(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    try {
      const url = new URL(text, location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  }

  function authorMarkup(author) {
    const orcid = author.orcid ? ` · <a href="https://orcid.org/${encodeURIComponent(author.orcid)}" target="_blank" rel="noopener">ORCID ${escapeHtml(author.orcid)}</a>` : '';
    return `<li><strong>${escapeHtml(authorName(author))}</strong>${author.affiliation ? `<br><span>${escapeHtml(author.affiliation)}</span>` : ''}${orcid}</li>`;
  }

  async function loadReader() {
    if (!readerRoot || !window.CHIATECH_API) return;
    const id = new URLSearchParams(location.search).get('id');
    if (!id) {
      readerRoot.innerHTML = '<section class="section"><div class="container content-state error"><h1>Paper not selected</h1><p>Choose a paper from the CHIATECH JOURNAL publication record.</p><a class="btn btn-primary" href="/articles/">View published papers</a></div></section>';
      return;
    }
    try {
      const response = await window.CHIATECH_API.get('article', { id });
      if (!response.ok || !response.article) throw new Error(response.error || 'This paper is not publicly available.');
      const article = response.article;
      injectMetadata(article);
      const doi = doiUrl(article.doi);
      const formats = citationFormats(article);
      const automatic = recommendedStyle(article.domain);
      let selected = 'auto';
      try {
        const saved = localStorage.getItem('chiatechCitationStyle');
        if (saved === 'auto' || (saved && formats[saved])) selected = saved;
      } catch (_) {}
      const htmlUrl = safeUrl(article.htmlUrl);
      const pdfUrl = safeUrl(article.pdfUrl);
      const pdfDownloadUrl = safeUrl(article.pdfDownloadUrl || article.pdfUrl);
      const videoUrl = safeUrl(article.videoUrl);
      const videoPosterUrl = safeUrl(article.videoPosterUrl);
      const videoCaptionUrl = safeUrl(article.videoCaptionUrl);
      const videoTranscriptUrl = safeUrl(article.videoTranscriptUrl);
      const sameOriginPdf = pdfUrl && new URL(pdfUrl).origin === location.origin;
      const videoMarkup = videoUrl ? `<section class="paper-video" aria-labelledby="paperVideoTitle"><p class="eyebrow">Complimentary explanatory video</p><h2 id="paperVideoTitle">${escapeHtml(article.videoTitle || `Explanatory video: ${article.title}`)}</h2><p>This narrated visual summary explains the paper’s key findings for a wider audience. It supplements the peer-reviewed article; use the HTML or PDF version of record for the complete methods, evidence, limitations and references.</p><video controls preload="metadata"${videoPosterUrl ? ` poster="${escapeHtml(videoPosterUrl)}"` : ''} src="${escapeHtml(videoUrl)}">${videoCaptionUrl ? `<track kind="captions" src="${escapeHtml(videoCaptionUrl)}" srclang="en" label="English captions" default>` : ''}Your browser cannot play this video.</video><div class="paper-video-actions">${videoTranscriptUrl ? `<a class="btn btn-outline" href="${escapeHtml(videoTranscriptUrl)}" target="_blank" rel="noopener">Read accessible transcript</a>` : ''}</div></section>` : '';
      const doiRecord = doi ? `<a href="${escapeHtml(doi)}" target="_blank" rel="noopener">${escapeHtml(article.doi)}</a>` : article.doiStatus === 'PENDING_REGISTRATION' ? 'Pending registration' : 'Not assigned';
      const doiNotice = article.doiStatus === 'PENDING_REGISTRATION' && !doi ? '<p class="form-message"><strong>DOI pending registration.</strong> This Pioneer Issue article is publicly available before the official Crossref DOI deposit. The publication record will be updated after registration.</p>' : '';
      readerRoot.innerHTML = `<section class="article-hero"><div class="container article-hero-grid"><div><p class="eyebrow">${escapeHtml(article.domain)} · ${escapeHtml(article.articleType || 'Research article')}</p><h1>${escapeHtml(article.title)}</h1><p class="article-authors">${escapeHtml((article.authors || []).map(authorName).join(', '))}</p><p class="lead">Published ${escapeHtml(displayDate(article.published))}${article.volume ? ` · Volume ${escapeHtml(article.volume)}` : ''}${article.issue ? `, Issue ${escapeHtml(article.issue)}` : ''}${article.eLocator || article.pages ? ` · ${escapeHtml(article.eLocator || article.pages)}` : ''}</p></div></div></section><section class="section"><div class="container article-reader-shell"><article class="prose"><h2>Abstract</h2><p>${escapeHtml(article.abstract)}</p><h2>Keywords</h2><div class="content-tags">${(article.keywords || []).map(keyword => `<span>${escapeHtml(keyword)}</span>`).join('')}</div><h2>Authors and affiliations</h2><ol class="author-affiliations">${(article.authors || []).map(authorMarkup).join('')}</ol><h2>Cite this paper</h2><div class="citation-tool"><div class="citation-style-row"><label for="citationStyle">Citation format</label><select id="citationStyle"><option value="apa7">APA 7</option><option value="mla9">MLA 9</option><option value="chicago18">Chicago 18</option><option value="harvard">Harvard author-date</option><option value="ieee">IEEE</option><option value="vancouver">Vancouver</option></select><button class="btn btn-secondary" id="copyCitation" type="button">Copy citation</button></div><p class="citation-recommendation">Automatically recommended for ${escapeHtml(article.domain)}: <strong>${escapeHtml(automatic.toUpperCase())}</strong>. Select another format when required by your institution or publication.</p><p class="citation-output" id="citationText"></p></div><h2>Publication record</h2><dl class="article-record"><div><dt>Received</dt><dd>${escapeHtml(article.received || 'Not recorded')}</dd></div><div><dt>Revised</dt><dd>${escapeHtml(article.revised || 'Not applicable')}</dd></div><div><dt>Accepted</dt><dd>${escapeHtml(article.accepted || 'Not recorded')}</dd></div><div><dt>Published</dt><dd>${escapeHtml(article.published || 'Not recorded')}</dd></div><div><dt>Licence</dt><dd>${article.licenseUrl ? `<a href="${escapeHtml(safeUrl(article.licenseUrl))}" target="_blank" rel="noopener">${escapeHtml(article.license)}</a>` : escapeHtml(article.license)}</dd></div><div><dt>DOI</dt><dd>${doiRecord}</dd></div><div><dt>Language</dt><dd>${escapeHtml(article.language || 'English')}</dd></div><div><dt>Copyright</dt><dd>${escapeHtml(article.copyrightHolder || 'The author(s)')}</dd></div></dl>${doiNotice}${videoMarkup}<div class="pdf-inline-reader" id="pdfInlineReader" hidden></div></article><aside class="pdf-access-card"><span class="label">Version of record</span><h2>Read the full paper</h2><p>The approved HTML and PDF carry the same scholarly record. The PDF is available to read or download for lawful scholarly use.</p>${htmlUrl ? `<a class="btn btn-accent btn-block" href="${escapeHtml(htmlUrl)}">Read full paper (HTML)</a>` : '<p class="form-message error"><strong>The HTML version is temporarily unavailable.</strong></p>'}${pdfUrl ? `<a class="btn btn-outline btn-block" href="${escapeHtml(pdfUrl)}" target="_blank" rel="noopener">Read full paper (PDF)</a>${pdfDownloadUrl ? `<a class="btn btn-outline btn-block" href="${escapeHtml(pdfDownloadUrl)}" download>Download full paper (PDF)</a>` : ''}${sameOriginPdf ? '<button class="btn btn-secondary btn-block" id="inlinePdfButton" type="button">View PDF on this page</button>' : ''}` : '<p class="form-message error"><strong>The authorised PDF is temporarily unavailable.</strong></p>'}<a class="btn btn-outline btn-block" href="/articles/">Back to all papers</a></aside></div></section>`;
      const select = document.querySelector('#citationStyle');
      const output = document.querySelector('#citationText');
      select.prepend(new Option(`Automatic — ${automatic.toUpperCase()}`, 'auto'));
      select.append(new Option('BibTeX — reference managers', 'bibtex'), new Option('RIS — Zotero, EndNote, Mendeley', 'ris'));
      select.value = selected;
      const download = document.createElement('a');
      download.className = 'btn btn-secondary'; download.id = 'downloadCitation'; download.textContent = 'Download citation';
      select.parentElement.append(download);
      let citationFile = '';
      const renderCitation = () => {
        output.textContent = formats[select.value] || formats[automatic];
        if (citationFile) URL.revokeObjectURL(citationFile);
        const extension = select.value === 'bibtex' ? 'bib' : select.value === 'ris' ? 'ris' : 'txt';
        citationFile = URL.createObjectURL(new Blob([output.textContent], { type: 'text/plain;charset=utf-8' }));
        download.href = citationFile;
        download.download = `${String(article.id).replace(/[^a-z0-9_-]/gi, '-')}.${extension}`;
        try { localStorage.setItem('chiatechCitationStyle', select.value); } catch (_) {}
      };
      select.addEventListener('change', renderCitation);
      document.querySelector('#copyCitation')?.addEventListener('click', async event => {
        const button = event.currentTarget;
        try {
          await navigator.clipboard.writeText(output.textContent);
          button.textContent = 'Citation copied';
          setTimeout(() => { button.textContent = 'Copy citation'; }, 1800);
        } catch (_) { window.getSelection()?.selectAllChildren(output); }
      });
      document.querySelector('#inlinePdfButton')?.addEventListener('click', event => {
        const target = document.querySelector('#pdfInlineReader');
        target.hidden = false;
        target.innerHTML = `<iframe src="${escapeHtml(pdfUrl)}" title="Full-paper PDF: ${escapeHtml(article.title)}"></iframe>`;
        event.currentTarget.remove();
        target.scrollIntoView({ behavior: 'smooth' });
      });
      renderCitation();
    } catch (error) {
      if (readerRoot.dataset.serverRendered) return;
      readerRoot.innerHTML = `<section class="section"><div class="container content-state error"><h1>Paper unavailable</h1><p>${escapeHtml(error.message)}</p><a class="btn btn-primary" href="/articles/">Return to published papers</a></div></section>`;
    }
  }

  loadList();
  loadReader();
})();
