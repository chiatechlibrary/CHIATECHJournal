(() => {
  const form = document.querySelector('#reviewForm');
  const results = document.querySelector('#reviewResults');
  const runButton = document.querySelector('#runReview');
  if (!form || !results || !runButton) return;

  const state = { report: null };
  const EMAIL = 'chiatechlibrary@gmail.com';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const words = text => (text.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9][A-Za-zÀ-ÖØ-öø-ÿ0-9'’/-]*/g) || []);
  const normalize = text => text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const stopWords = new Set('a an and are as at be by for from has have how in into is it its of on or that the their this through to using with'.split(' '));

  function setProgress(percent, message) {
    results.innerHTML = `<div class="engine-state"><div><strong>${escapeHtml(message)}</strong><div class="engine-progress" style="--progress:${percent}%"><span></span></div><span>${percent}% complete</span></div></div>`;
  }

  function readUint16(view, offset) { return view.getUint16(offset, true); }
  function readUint32(view, offset) { return view.getUint32(offset, true); }

  async function inflateRaw(bytes) {
    if (!('DecompressionStream' in window)) throw new Error('This browser cannot extract DOCX files. Use a current version of Chrome, Edge or Firefox.');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function extractZipEntry(file, targetName) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
      if (readUint32(view, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('The uploaded file is not a valid DOCX package.');
    const entries = readUint16(view, eocd + 10);
    let cursor = readUint32(view, eocd + 16);
    const decoder = new TextDecoder('utf-8');
    for (let index = 0; index < entries; index += 1) {
      if (readUint32(view, cursor) !== 0x02014b50) break;
      const method = readUint16(view, cursor + 10);
      const compressedSize = readUint32(view, cursor + 20);
      const nameLength = readUint16(view, cursor + 28);
      const extraLength = readUint16(view, cursor + 30);
      const commentLength = readUint16(view, cursor + 32);
      const localOffset = readUint32(view, cursor + 42);
      const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
      if (name === targetName) {
        if (readUint32(view, localOffset) !== 0x04034b50) throw new Error('The DOCX package contains an invalid document entry.');
        const localNameLength = readUint16(view, localOffset + 26);
        const localExtraLength = readUint16(view, localOffset + 28);
        const start = localOffset + 30 + localNameLength + localExtraLength;
        const compressed = bytes.slice(start, start + compressedSize);
        if (method === 0) return compressed;
        if (method === 8) return inflateRaw(compressed);
        throw new Error('The DOCX uses an unsupported compression method.');
      }
      cursor += 46 + nameLength + extraLength + commentLength;
    }
    throw new Error('The DOCX does not contain a readable manuscript body.');
  }

  async function extractDocx(file) {
    const xmlBytes = await extractZipEntry(file, 'word/document.xml');
    const xml = new DOMParser().parseFromString(new TextDecoder('utf-8').decode(xmlBytes), 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('The manuscript XML could not be read.');
    const paragraphs = [...xml.getElementsByTagNameNS('*', 'p')].map(paragraph =>
      [...paragraph.getElementsByTagNameNS('*', 't')].map(node => node.textContent).join('')
    ).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
    return paragraphs.join('\n');
  }

  function sectionPresent(text, alternatives) {
    return alternatives.some(name => new RegExp(`(^|\\n)\\s*(?:\\d+(?:\\.\\d+)*[.)]?\\s*)?${name}\\s*:?(?=\\n|$)`, 'im').test(text));
  }

  function extractBlock(text, heading, nextHeadings) {
    const start = text.search(new RegExp(`(^|\\n)\\s*${heading}\\s*:?`, 'im'));
    if (start < 0) return '';
    const after = text.slice(start).replace(new RegExp(`^[\\s\\S]*?${heading}\\s*:?\\s*`, 'i'), '');
    const stop = after.search(new RegExp(`(^|\\n)\\s*(?:${nextHeadings.join('|')})\\s*:?`, 'im'));
    return (stop >= 0 ? after.slice(0, stop) : after).trim();
  }

  function repeatedShingleRate(text) {
    const tokens = normalize(text).split(' ').filter(Boolean).slice(0, 25000);
    if (tokens.length < 30) return 0;
    const counts = new Map();
    for (let i = 0; i <= tokens.length - 10; i += 1) {
      const shingle = tokens.slice(i, i + 10).join(' ');
      counts.set(shingle, (counts.get(shingle) || 0) + 1);
    }
    const repeated = [...counts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
    return Math.round((repeated / Math.max(1, tokens.length - 9)) * 1000) / 10;
  }

  function titleSimilarity(left, right) {
    const tokens = value => new Set(normalize(value).split(' ').filter(token => token.length > 2 && !stopWords.has(token)));
    const a = tokens(left); const b = tokens(right);
    const intersection = [...a].filter(token => b.has(token)).length;
    const union = new Set([...a, ...b]).size;
    return union ? intersection / union : 0;
  }

  async function crossref(path) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const separator = path.includes('?') ? '&' : '?';
      const response = await fetch(`https://api.crossref.org${path}${separator}mailto=${encodeURIComponent(EMAIL)}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Registry request failed');
      return await response.json();
    } finally { clearTimeout(timeout); }
  }

  async function registryChecks(title, dois, references) {
    const output = { available: true, titleMatch: null, verifiedDois: 0, doiTotal: dois.length, referenceMatches: 0, referenceSample: Math.min(6, references.length) };
    try {
      const titleData = await crossref(`/works?rows=3&query.title=${encodeURIComponent(title)}`);
      const candidates = titleData.message?.items || [];
      const ranked = candidates.map(item => {
        const candidateTitle = Array.isArray(item.title) ? item.title[0] : item.title || '';
        return { title: candidateTitle, doi: item.DOI || '', score: titleSimilarity(title, candidateTitle) };
      }).sort((a, b) => b.score - a.score);
      output.titleMatch = ranked[0] || null;
      const doiResults = await Promise.all(dois.slice(0, 12).map(doi =>
        crossref(`/works/${encodeURIComponent(doi)}`).then(() => true).catch(() => false)
      ));
      output.verifiedDois = doiResults.filter(Boolean).length;
      const referenceResults = await Promise.all(references.slice(0, 6).map(reference =>
        crossref(`/works?rows=1&query.bibliographic=${encodeURIComponent(reference)}`).then(data => {
          const item = data.message?.items?.[0];
          const candidate = Array.isArray(item?.title) ? item.title[0] : item?.title || '';
          return candidate && titleSimilarity(reference, candidate) >= .28;
        }).catch(() => false)
      ));
      output.referenceMatches = referenceResults.filter(Boolean).length;
    } catch (error) {
      output.available = false;
    }
    return output;
  }

  function reportingGuideline(text, articleType) {
    if (/randomi[sz]ed|random allocation/i.test(text)) return 'CONSORT';
    if (/systematic review|meta-analysis/i.test(text) || articleType === 'Systematic review') return 'PRISMA';
    if (/qualitative|focus group|thematic analysis|interview study/i.test(text)) return 'COREQ / SRQR';
    if (/case report|case study/i.test(text) || articleType === 'Case study') return 'CARE';
    if (/animal|mice|mouse|rat\b|in vivo/i.test(text)) return 'ARRIVE';
    if (/economic evaluation|cost effectiveness|cost-effectiveness/i.test(text)) return 'CHEERS';
    if (/survey|cross-sectional|cohort|case-control|observational/i.test(text)) return 'STROBE';
    return 'A discipline-appropriate EQUATOR or field-specific guideline';
  }

  function createReportId() {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    return `CJRE-${date}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 6).toUpperCase()}`;
  }

  async function analyse(file, title, domain, articleType, useRegistry) {
    setProgress(12, 'Reading the manuscript');
    const text = await extractDocx(file);
    const wordCount = words(text).length;
    if (wordCount < 100) throw new Error('The DOCX contains too little readable manuscript text for a meaningful review.');

    setProgress(30, 'Checking structure, disclosures and journal alignment');
    const abstract = extractBlock(text, 'abstract', ['keywords?', 'introduction', 'background']);
    const abstractWords = words(abstract).length;
    const keywordMatch = text.match(/(?:^|\n)\s*keywords?\s*:\s*([^\n]+)/i);
    const keywordCount = keywordMatch ? keywordMatch[1].split(/[;,]/).filter(Boolean).length : 0;
    const referenceStart = text.search(/(^|\n)\s*(?:references|bibliography)\s*:?\s*$/im);
    const bodyText = referenceStart >= 0 ? text.slice(0, referenceStart) : text;
    const referenceBlock = referenceStart >= 0 ? text.slice(referenceStart).split('\n').slice(1).join('\n') : '';
    const referenceLines = referenceBlock.split('\n').map(line => line.trim()).filter(line => line.length > 28 && /(?:19|20)\d{2}/.test(line));
    const citations = [...bodyText.matchAll(/\(([A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’\-]+)(?:\s+et\s+al\.)?(?:,|\s)\s*((?:19|20)\d{2}[a-z]?)\b/g)]
      .map(match => ({ author: match[1], year: match[2] }));
    const uniqueCitations = [...new Map(citations.map(citation => [`${citation.author.toLowerCase()}-${citation.year}`, citation])).values()];
    const unresolved = uniqueCitations.filter(citation => !new RegExp(`${citation.author}[^\\n]{0,180}${citation.year}`, 'i').test(referenceBlock));
    const dois = [...new Set([...text.matchAll(/10\.\d{4,9}\/[\-._;()/:A-Z0-9]+/ig)].map(match => match[0].replace(/[.,;)]+$/, '')))];

    const sectionSets = {
      'Original research': [['abstract'], ['introduction|background'], ['methods?|methodology'], ['results?|findings'], ['discussion'], ['conclusions?'], ['references|bibliography']],
      'Systematic review': [['abstract'], ['introduction|background'], ['methods?|search strategy'], ['results?|synthesis'], ['discussion'], ['conclusions?'], ['references|bibliography']],
      'Review article': [['abstract'], ['introduction|background'], ['methods?|search strategy|review approach'], ['discussion|synthesis'], ['conclusions?'], ['references|bibliography']],
      'Technical article': [['abstract'], ['introduction|background'], ['methods?|methodology|implementation|system design'], ['results?|evaluation|performance'], ['conclusions?'], ['references|bibliography']],
      'Case study': [['abstract'], ['introduction|background|context'], ['case|intervention|implementation'], ['results?|outcomes?|findings'], ['conclusions?|lessons'], ['references|bibliography']],
      'Academic resource': [['introduction|overview'], ['objectives?|learning outcomes?'], ['conclusions?|summary'], ['references|bibliography']]
    };
    const expected = sectionSets[articleType] || sectionSets['Original research'];
    const presentSections = expected.filter(options => sectionPresent(text, options)).length;

    const domainTerms = {
      Science: ['science','experiment','laboratory','environment','health','biology','chemistry','physics','evidence','data'],
      Technology: ['technology','digital','software','computer','artificial intelligence','data','system','algorithm','cybersecurity','ict'],
      Engineering: ['engineering','design','energy','system','simulation','infrastructure','optimisation','optimization','technical','performance'],
      Mathematics: ['mathematics','mathematical','statistics','statistical','model','modelling','computation','probability','theorem','numerical'],
      Education: ['education','student','teacher','learning','teaching','curriculum','school','pedagogy','assessment','classroom'],
      'Humanities & Social Sciences': ['humanities','society','culture','ethical','ethics','religion','community','policy','social','identity'],
      'Entrepreneurship & Management': ['entrepreneurship','enterprise','business','startup','management','strategy','operations','leadership','finance','sustainability','innovation','msme']
    };
    const lower = text.toLowerCase();
    const terms = domainTerms[domain] || [];
    const alignmentHits = terms.filter(term => lower.includes(term));
    const disclosures = {
      ethics: /ethics approval|ethical approval|institutional review|exempt(?:ion|ed)/i.test(text),
      consent: /informed consent|consent to participate|participant consent/i.test(text),
      data: /data availability|availability of data|data and materials/i.test(text),
      funding: /funding|financial support/i.test(text),
      conflicts: /competing interests|conflict of interest/i.test(text),
      contributions: /author contributions?|credit taxonomy/i.test(text)
    };
    const disclosureCount = Object.values(disclosures).filter(Boolean).length;
    const objectiveSignal = /research (?:aim|objective|question)|study (?:aim|objective)|this (?:study|paper|article) (?:aims?|examines?|investigates?|evaluates?)|hypothes[ei]s/i.test(bodyText);
    const methodSignals = {
      design: /research design|study design|experimental design|review design|methodology/i.test(bodyText),
      sample: /sample size|sampling (?:method|strategy|frame)|participants?|respondents?|inclusion criteria|exclusion criteria/i.test(bodyText),
      source: /data source|data collection|dataset|instrument|questionnaire|interview guide|laboratory protocol/i.test(bodyText),
      analysis: /data analysis|statistical analysis|thematic analysis|content analysis|regression|anova|confidence interval|effect size/i.test(bodyText),
      reproducibility: /software|version \d|code availability|materials availability|repository|protocol registration|preregistration/i.test(bodyText)
    };
    const methodCount = Object.values(methodSignals).filter(Boolean).length;
    const resultsSignal = sectionPresent(text, ['results?|findings|outcomes?|evaluation|synthesis']);
    const conclusionSignal = sectionPresent(text, ['conclusions?|lessons|summary']);
    const limitationSignal = /limitations?|strengths and limitations|boundary conditions?|threats to validity/i.test(bodyText);
    const overclaimSignal = /(?:the (?:study|findings?|results?) )?(?:prove[sd]?|guarantee[sd]?|definitively establish(?:es|ed)?|always (?:causes?|ensures?))\b/i.test(bodyText);
    const aiDisclosure = /ai[- ]use disclosure|use of (?:generative )?ai|ai-assisted (?:writing|technology|tool)|generative ai (?:was|was not|has|had) used|chatgpt (?:was|was not) used/i.test(text);
    const aiSignature = /as an ai language model|i cannot provide|i hope this (?:helps|finds you well)/i.test(text);
    const duplicateRate = repeatedShingleRate(bodyText);
    const guideline = reportingGuideline(text, articleType);

    let registry = { available: false, titleMatch: null, verifiedDois: 0, doiTotal: dois.length, referenceMatches: 0, referenceSample: 0 };
    if (useRegistry) {
      setProgress(58, 'Verifying DOI and reference metadata with Crossref');
      registry = await registryChecks(title, dois, referenceLines);
    }

    setProgress(82, 'Preparing author and editor recommendations');
    const criteria = [];
    const add = (titleText, status, detail, weight) => criteria.push({ title: titleText, status, detail, weight });
    add('File integrity and readable text', 'pass', `DOCX extracted successfully; ${wordCount.toLocaleString()} words were available for review.`, 6);
    add('Manuscript length', wordCount >= 2500 ? 'pass' : wordCount >= 1200 ? 'warn' : 'fail', `${wordCount.toLocaleString()} words. Article type selected: ${articleType}.`, 5);
    add('Abstract', abstractWords >= 150 && abstractWords <= 350 ? 'pass' : abstractWords >= 80 ? 'warn' : 'fail', abstractWords ? `${abstractWords} words; the journal target is normally 150–350 words.` : 'No clearly labelled abstract was detected.', 7);
    add('Keywords', keywordCount >= 4 && keywordCount <= 8 ? 'pass' : keywordCount > 0 ? 'warn' : 'fail', keywordCount ? `${keywordCount} keyword${keywordCount === 1 ? '' : 's'} detected; the journal expects 4–8.` : 'No clearly labelled keyword line was detected.', 4);
    add('Article structure', presentSections === expected.length ? 'pass' : presentSections / expected.length >= .65 ? 'warn' : 'fail', `${presentSections} of ${expected.length} expected structural elements were detected for ${articleType}. Suggested reporting framework: ${guideline}.`, 12);
    add('Research question or objective', objectiveSignal ? 'pass' : 'warn', objectiveSignal ? 'A purpose, research-question, objective or hypothesis signal was detected.' : 'No explicit research question, objective, aim or hypothesis signal was detected.', 6);
    add('Method transparency and reproducibility', methodCount >= 4 ? 'pass' : methodCount >= 2 ? 'warn' : 'fail', `${methodCount} of 5 method-detail groups were detected: design, sample/eligibility, data source/collection, analysis and reproducibility materials.`, 10);
    add('Results, conclusions and limitations', resultsSignal && conclusionSignal && limitationSignal && !overclaimSignal ? 'pass' : resultsSignal && conclusionSignal ? 'warn' : 'fail', `${resultsSignal ? 'Results detected' : 'Results not clearly detected'}; ${conclusionSignal ? 'conclusion detected' : 'conclusion not clearly detected'}; ${limitationSignal ? 'limitations detected' : 'limitations not clearly detected'}${overclaimSignal ? '; potentially absolute causal language requires review' : ''}.`, 8);
    add('Journal alignment', alignmentHits.length >= 4 ? 'pass' : alignmentHits.length >= 2 ? 'warn' : 'fail', alignmentHits.length ? `Evidence of ${domain} alignment: ${alignmentHits.slice(0, 6).join(', ')}.` : `The selected ${domain} domain was not clearly signalled in the manuscript text.`, 7);
    add('Ethics and publication declarations', disclosureCount >= 5 ? 'pass' : disclosureCount >= 3 ? 'warn' : 'fail', `${disclosureCount} of 6 declaration areas detected: ethics, consent, data availability, funding, competing interests and author contributions.`, 9);
    add('Citation and reference integrity', referenceLines.length >= 8 && unresolved.length <= Math.max(2, uniqueCitations.length * .15) ? 'pass' : referenceLines.length ? 'warn' : 'fail', `${referenceLines.length} reference entries, ${uniqueCitations.length} unique author–year citations and ${unresolved.length} potentially unmatched in-text citations detected. Numeric or non-author–year citation matching still requires human verification.`, 10);
    const registryDetail = useRegistry
      ? registry.available
        ? `Crossref verified ${registry.verifiedDois}/${registry.doiTotal} detected DOI${registry.doiTotal === 1 ? '' : 's'} and found metadata candidates for ${registry.referenceMatches}/${registry.referenceSample} sampled references.`
        : 'Crossref was unavailable during this run; registry verification remains incomplete.'
      : 'Scholarly registry verification was not authorised for this run.';
    add('Web reference verification', useRegistry && registry.available && (registry.doiTotal === 0 || registry.verifiedDois === registry.doiTotal) && (registry.referenceSample === 0 || registry.referenceMatches >= Math.ceil(registry.referenceSample / 2)) ? 'pass' : 'warn', `${registryDetail} A Crossref match confirms metadata availability, not claim support, version status or absence of correction/retraction.`, 6);
    const nearTitle = registry.titleMatch && registry.titleMatch.score >= .82;
    add('Similarity and originality signals', nearTitle || duplicateRate >= 4 ? 'warn' : 'pass', `Internal repeated 10-word sequence rate: ${duplicateRate.toFixed(1)}%. ${nearTitle ? `A closely matching Crossref title was found (${Math.round(registry.titleMatch.score * 100)}% title-token overlap); editors should confirm prior-publication or preprint status.` : 'No closely matching Crossref title was identified in this screen.'}`, 5);
    add('AI-use disclosure and indicators', aiSignature ? 'fail' : aiDisclosure ? 'pass' : 'warn', aiSignature ? 'A model-signature phrase was detected and requires author explanation and source review.' : aiDisclosure ? 'An AI-use disclosure signal was detected. Human editors must verify that the disclosure is specific and complete.' : 'No explicit AI-use disclosure was detected. Text style alone cannot establish whether AI was used.', 5);

    const earned = criteria.reduce((sum, criterion) => sum + criterion.weight * (criterion.status === 'pass' ? 1 : criterion.status === 'warn' ? .5 : 0), 0);
    const score = Math.round(earned);
    const critical = criteria.some(criterion => ['Abstract','Article structure','Citation and reference integrity'].includes(criterion.title) && criterion.status === 'fail');
    const recommendation = score >= 82 && !critical ? 'Proceed to human editorial screening' : score >= 65 ? 'Revise before formal submission' : 'Major readiness revision required';
    const authorRecommendations = [];
    if (abstractWords < 150 || abstractWords > 350) authorRecommendations.push('Provide a self-contained 150–350 word abstract stating purpose, method or approach, principal evidence, conclusion and practical implication.');
    if (keywordCount < 4 || keywordCount > 8) authorRecommendations.push('Supply 4–8 precise, searchable keywords that are not merely repetitions of the title.');
    if (presentSections < expected.length) authorRecommendations.push(`Complete the expected ${articleType.toLowerCase()} structure and use explicit section headings.`);
    if (!objectiveSignal) authorRecommendations.push('State the research question, aim, objective or hypothesis explicitly and align it with the method and conclusion.');
    if (methodCount < 4) authorRecommendations.push('Strengthen reproducibility by reporting the design, sampling or eligibility, data source and collection, analysis procedure, software/version and available protocol, data or code as applicable.');
    if (!limitationSignal || overclaimSignal) authorRecommendations.push('Add a candid limitations section and ensure conclusions do not extend beyond the design, data or uncertainty.');
    if (alignmentHits.length < 4) authorRecommendations.push(`State the manuscript’s contribution to the ${domain} domain and the problem-to-practice pathway more explicitly.`);
    if (disclosureCount < 5) authorRecommendations.push('Complete ethics, consent, data availability, funding, competing-interest and author-contribution declarations as applicable.');
    if (!aiDisclosure) authorRecommendations.push('Add a specific AI-use statement naming any tool and purpose, or state that no generative AI was used.');
    if (unresolved.length) authorRecommendations.push(`Reconcile the ${unresolved.length} potentially unmatched author–year citation${unresolved.length === 1 ? '' : 's'} against the reference list.`);
    if (!registry.available && useRegistry) authorRecommendations.push('Repeat DOI and reference verification when Crossref is available, then correct unresolved metadata.');
    if (nearTitle) authorRecommendations.push('Disclose any preprint, conference paper, thesis, repository version or prior publication related to the closely matching title.');
    if (!authorRecommendations.length) authorRecommendations.push('Preserve the current structure and address any line-level comments supplied by the human editor or peer reviewers.');

    const editorRecommendations = [
      'Confirm scope, novelty and article type independently; the readiness score is not an acceptance decision.',
      `Confirm the appropriate reporting guideline. Current automated suggestion: ${guideline}.`,
      'Run a licensed full-text similarity check against scholarly and web corpora and interpret the matched passages, not only the percentage.',
      'Verify a sample of references against the cited primary sources, including author, title, year, journal, pages and DOI.',
      'Check correction, retraction and expression-of-concern status in the source record, Crossmark where present, and an appropriate retraction resource.',
      'Assess AI-use disclosure and provenance evidence without treating stylistic AI-detection claims as proof.',
      'Verify authorship, affiliations, ORCID, conflicts, ethics documentation and data availability before external peer review.',
      'Confirm that fee or waiver information is handled only after the scholarly acceptance decision and remains outside reviewer decision making.'
    ];

    return {
      id: createReportId(), createdAt: new Date().toISOString(), filename: file.name, title, domain, articleType,
      wordCount, abstractWords, keywordCount, referenceCount: referenceLines.length, citationCount: uniqueCitations.length,
      guideline, score, recommendation, criteria, authorRecommendations, editorRecommendations,
      registry, disclaimer: 'This is a structured pre-review report, not a plagiarism certificate, AI-authorship verdict, peer review, indexing assessment or publication decision. Crossref confirms metadata records only; full-text source checks, relevant reporting guidance, licensed similarity services and qualified human editors remain required.'
    };
  }

  function renderReport(report) {
    const rows = report.criteria.map(item => `<li class="report-item ${item.status}"><strong>${escapeHtml(item.title)} · ${item.status.toUpperCase()}</strong><span>${escapeHtml(item.detail)}</span></li>`).join('');
    results.innerHTML = `
      <div class="report-head"><div><p class="eyebrow">Review complete</p><h2>${escapeHtml(report.recommendation)}</h2></div><div class="score-ring" style="--score:${report.score}%">${report.score}</div></div>
      <div class="report-summary"><p><strong>${escapeHtml(report.title)}</strong></p><p>${escapeHtml(report.id)} · ${report.wordCount.toLocaleString()} words · ${escapeHtml(report.domain)} · ${escapeHtml(report.articleType)}</p><p><strong>Reporting standard signal:</strong> ${escapeHtml(report.guideline)}</p></div>
      <ul class="report-list">${rows}</ul>
      <div class="report-actions"><button class="btn btn-primary" type="button" id="downloadReport">Download Word report</button><a class="btn btn-accent" href="/submit/">Continue to formal submission</a></div>
      <p class="routing-status" id="routingStatus">Checking editorial-routing status…</p>
      <p style="margin-top:1rem;font-size:.78rem;color:var(--ink-600)">${escapeHtml(report.disclaimer)}</p>`;
    document.querySelector('#downloadReport')?.addEventListener('click', () => downloadWordReport(report));
  }

  async function routeReport(report, authorEmail) {
    const status = document.querySelector('#routingStatus');
    if (!status) return;
    if (!window.CHIATECH_API?.configured) {
      status.textContent = 'Editorial routing is not yet connected. Download this report and include it with your formal submission.';
      return;
    }
    try {
      const response = await window.CHIATECH_API.post({ action: 'recordReview', authorEmail, report });
      if (!response.ok) throw new Error(response.error || response.message || 'The routing service did not confirm delivery.');
      status.textContent = `Editorial copy routed to ${response.routedTo || 'the journal office'}. Your report remains a readiness record, not a publication decision.`;
      status.classList.add('success');
    } catch (error) {
      status.textContent = `Editorial routing could not be confirmed: ${error.message || 'Please include the downloaded report with your formal submission.'}`;
      status.classList.add('error');
    }
  }

  function downloadWordReport(report) {
    const criterionRows = report.criteria.map(item => `<tr><td>${escapeHtml(item.title)}</td><td class="${item.status}">${item.status.toUpperCase()}</td><td>${escapeHtml(item.detail)}</td></tr>`).join('');
    const list = items => `<ol>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;
    const html = `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${escapeHtml(report.id)}</title><style>@page{size:8.5in 11in;margin:.75in}body{font-family:Arial,sans-serif;color:#101828;font-size:10.5pt;line-height:1.45}h1{font-family:Georgia,serif;color:#071a45;font-size:24pt;margin:0 0 4pt}h2{color:#173bc4;font-size:15pt;margin:18pt 0 6pt}h3{font-size:11pt;color:#071a45}.kicker{color:#9a7100;font-weight:bold;letter-spacing:1.4pt}.banner{border-left:6px solid #ffd43b;background:#f4f7ff;padding:12pt;margin:14pt 0}.meta{color:#59647d}.score{font-size:28pt;font-weight:bold;color:#173bc4}table{border-collapse:collapse;width:100%;margin:10pt 0}th{background:#071a45;color:white;text-align:left}th,td{border:1px solid #c6d0e1;padding:7pt;vertical-align:top}.pass{color:#087258;font-weight:bold}.warn{color:#9a5a00;font-weight:bold}.fail{color:#af1e36;font-weight:bold}li{margin-bottom:5pt}.footer{border-top:1px solid #c6d0e1;margin-top:22pt;padding-top:8pt;color:#59647d;font-size:8.5pt}</style></head><body><p class="kicker">CHIATECH REVIEW ENGINE</p><h1>Manuscript Readiness Report</h1><p class="meta">Published by CHIA TECH SOLUTIONS AND RESOURCES LIMITED · RC 1839865</p><div class="banner"><strong>${escapeHtml(report.recommendation)}</strong><br><span class="score">${report.score}/100</span><br>${escapeHtml(report.disclaimer)}</div><table><tr><th>Report ID</th><td>${escapeHtml(report.id)}</td><th>Generated</th><td>${escapeHtml(new Date(report.createdAt).toLocaleString())}</td></tr><tr><th>Manuscript</th><td colspan="3">${escapeHtml(report.title)}</td></tr><tr><th>File</th><td>${escapeHtml(report.filename)}</td><th>Domain / Type</th><td>${escapeHtml(report.domain)} / ${escapeHtml(report.articleType)}</td></tr><tr><th>Words</th><td>${report.wordCount.toLocaleString()}</td><th>References</th><td>${report.referenceCount}</td></tr></table><h2>Standards Review</h2><table><thead><tr><th>Criterion</th><th>Result</th><th>Evidence and interpretation</th></tr></thead><tbody>${criterionRows}</tbody></table><h2>Recommendations to the Author</h2>${list(report.authorRecommendations)}<h2>Recommendations to Human Editors</h2>${list(report.editorRecommendations)}<h2>Reference Verification Summary</h2><p>Crossref available: ${report.registry.available ? 'Yes' : 'No'}; detected DOI records verified: ${report.registry.verifiedDois}/${report.registry.doiTotal}; sampled reference metadata candidates: ${report.registry.referenceMatches}/${report.registry.referenceSample}.</p><p class="footer">CHIATECH JOURNAL · Abuja office: Opposite Mini Campus, University of Abuja, Phase 1, Gwagwalada, Nigeria · chiatechlibrary@gmail.com · +234 912 954 8007 · ISSN pending · DOI prefix to be obtained</p></body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${report.id}_CHIATECH_Review_Report.doc`;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const file = document.querySelector('#manuscriptFile').files[0];
    const title = document.querySelector('#manuscriptTitle').value.trim();
    const authorEmail = document.querySelector('#authorEmail').value.trim();
    const domain = document.querySelector('#journalDomain').value;
    const articleType = document.querySelector('#articleType').value;
    const useRegistry = document.querySelector('#registryCheck').checked;
    if (!file || !title || !authorEmail || !domain || !articleType) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      results.innerHTML = '<div class="callout danger"><div class="callout-body"><strong>DOCX required</strong><p>Please upload a Microsoft Word .docx manuscript.</p></div></div>';
      return;
    }
    runButton.disabled = true;
    try {
      const report = await analyse(file, title, domain, articleType, useRegistry);
      state.report = report;
      sessionStorage.setItem('chiatechReview', JSON.stringify({ id: report.id, score: report.score, recommendation: report.recommendation, title: report.title, filename: report.filename, createdAt: report.createdAt }));
      setProgress(100, 'Review complete');
      renderReport(report);
      routeReport(report, authorEmail);
    } catch (error) {
      results.innerHTML = `<div class="callout danger"><div class="callout-body"><strong>Review could not be completed</strong><p>${escapeHtml(error.message || 'The manuscript could not be read.')}</p></div></div>`;
    } finally { runButton.disabled = false; }
  });
})();
