/* Progressive enhancement only: the full publication register is already HTML. */
(() => {
  'use strict';

  const form = document.getElementById('issue-filters');
  if (!form) return;

  const search = form.querySelector('#paper-search');
  const issue = form.querySelector('#paper-issue');
  const portfolio = form.querySelector('#paper-portfolio');
  const status = document.getElementById('paper-filter-status');
  const empty = document.getElementById('paper-no-results');
  const records = Array.from(document.querySelectorAll('.paper-record[data-article-id]'));
  const sections = Array.from(document.querySelectorAll('[data-issue-section]'));
  if (!search || !issue || !portfolio || !status || !records.length) return;

  const normalize = (value) => String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en')
    .trim();

  const index = records.map((record) => ({
    element: record,
    text: normalize(record.dataset.search || record.textContent),
    issue: normalize(record.dataset.issue),
    portfolio: normalize(record.dataset.portfolio)
  }));
  const sectionRecords = sections.map((section) => ({
    element: section,
    records: Array.from(section.querySelectorAll('.paper-record[data-article-id]'))
  }));

  function filterPapers() {
    const terms = normalize(search.value).split(/\s+/).filter(Boolean);
    const selectedIssue = normalize(issue.value);
    const selectedPortfolio = normalize(portfolio.value);
    let visible = 0;

    for (const record of index) {
      const matches = terms.every((term) => record.text.includes(term))
        && (!selectedIssue || selectedIssue === record.issue)
        && (!selectedPortfolio || selectedPortfolio === record.portfolio);
      record.element.hidden = !matches;
      if (matches) visible += 1;
    }
    for (const section of sectionRecords) {
      section.element.hidden = !section.records.some((record) => !record.hidden);
    }
    if (empty) empty.hidden = visible !== 0;
    status.textContent = 'Showing ' + visible + ' of ' + records.length
      + (records.length === 1 ? ' paper.' : ' papers.');
  }

  form.addEventListener('submit', (event) => event.preventDefault());
  search.addEventListener('input', filterPapers);
  issue.addEventListener('change', filterPapers);
  portfolio.addEventListener('change', filterPapers);
  form.addEventListener('reset', () => {
    // The reset event fires before the browser restores the controls' defaults.
    window.setTimeout(filterPapers, 0);
  });

  filterPapers();
  form.hidden = false;
})();
