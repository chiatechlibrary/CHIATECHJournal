# CHIATECH JOURNAL registered DOI release report

Generated for the Pioneer e001-e060 post-Crossref publication synchronization.

## Release identity

- Repository: `C:\Users\user\Documents\PROJECTS\CHIATECHJournal`
- Branch: `release/crossref-doi-sync-e001-e060-20261003`
- Commit: `0ce24b61ef8640f066a351a94ca9fe4a9540c5d7`
- Push result: **SUCCESS**
- Production deployment smoke test: **PASS**

## Publication counts

- Total article records: **60 / 60**
- Registered article DOI records: **60 / 60**
- Journal DOI: `10.68232/cj`
- Volume 1 Issue 1: e001-e025, **25 articles**
- Volume 1 Issue 2: e026-e060, **35 articles**
- HTML landing pages updated: **60**
- HTML full-text pages updated: **60**
- PDFs updated: **60**
- PDF blockers: **0**
- Recommended citations updated: **60**
- `citation_doi` tags updated: **120** (landing and full text)
- ScholarlyArticle JSON-LD records updated: **120**
- Issue pages updated: **2**
- Author pages updated: **0** (no separate author-page architecture exists)
- Complimentary explanatory videos updated: **4** (e002-e005; silent visual summaries)
- Video posters updated: **4**
- WebVTT caption records updated: **4**
- Accessible transcript links verified: **4**
- Sitemap updated: **YES**

## Mandatory QA

- DOI mapping and issue tests: **PASS** (60 exact IDs; 25/35 issue split)
- Source-body preservation regression: **PASS** (e001-e025)
- Backend/editorial release tests: **PASS** (32 groups)
- HTML/internal-link/site validation: **PASS** (211 deployable HTML pages)
- Public boundary build: **PASS** (479 files)
- PDF open/text/DOI/issue/metadata audit: **PASS** (60 PDFs)
- PDF visual cover review: **PASS** (60 first pages)
- Broken internal article links: **0**
- HTML/PDF bibliographic conflicts: **0**
- Crossref title/identity conflicts: **0**
- Secrets detected in the staged release: **0**

## GitHub publication boundary

- Changed/untracked paths classified: **233**
- Classified PUSH: **3**
- Classified DO NOT PUSH: **230**
- Files committed: **231**
- Public-file audit: **PASS**

Excluded categories include raw Crossref/source evidence, private/internal controls, historical-route working copies, unrelated backend documentation, local QA/render output, and pre-existing editorial control-file changes. Exclusion preserves the operator's existing working tree and keeps private material outside the public release.

## DOI resolution note

Crossref REST identity verification passed for all 60 registered article DOIs. Before deployment, 35 Part 2 resolvers reached registered historical URLs that returned 404 in production; this release adds permanent redirects to `/papers/e026/` through `/papers/e060/`. The post-deployment `doi-resolution-audit.csv` records **61 PASS and 0 FAIL**, including the journal DOI and every article DOI.

## Remaining operational/editorial actions

- ISSN remains pending; no ISSN was invented.
- The Google Apps Script source is updated, but its separate Apps Script deployment is not implied by a Git/Netlify deployment.
- Crossref resource URLs remain stable through redirects; no automatic Crossref redeposit was performed.
