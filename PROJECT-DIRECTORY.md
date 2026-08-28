# CHIATECH JOURNAL repository map

## Public website

| Path | Purpose |
|---|---|
| `index.html` | Branded SETEHEM home and launch status |
| `about/` | Identity, aims, SETEHEM model, public founder, contact and indexing roadmap |
| `disciplines/` | Seven SETEHEM portfolio pages |
| `authors/` | Author pathway, fees, guidelines and templates |
| `review-engine/` | Local-DOCX readiness evidence and consented editorial routing |
| `submit/` | Netlify manuscript-submission form |
| `portal/` | Author/editor/reviewer forms, editor activation and protected admin desk |
| `articles/` | Dynamic published-paper registry and reader shell; no paper files are added for this release |
| `blog/` | Dynamic blog/news registry and read/watch/share reader |
| `issues/`, `search/`, `policies/`, `ethics/`, `peer-review/` | Scholarly navigation, governance and policy surfaces |
| `downloads/` | Six current branded Word resources |

## Browser assets

| Path | Purpose |
|---|---|
| `assets/css/style.css` | Core design system |
| `assets/css/launch.css` | Release/admin/paper/blog/fee/editor/review styling |
| `assets/js/runtime-config.js` | Same-origin `/api/editorial` path only |
| `assets/js/api-client.js` | Public/protected API client |
| `assets/js/editorial-desk.js` | Authenticated admin/editor controls and evidence briefs |
| `assets/js/content-pages.js`, `content-format.js` | Safely rendered, approved page copy |
| `assets/js/journal-profile.js` | Public settings, Managing Editor and fee/payment hydration |
| `assets/js/review-engine.js` | Local DOCX evidence analysis, Crossref checks, reports and routing |
| `assets/js/article-registry.js` | Paper registry/reader, citations, structured metadata and full-text controls |
| `assets/js/blog-registry.js` | Blog registry/reader, sharing and browser deterrents |

## Protected service source

| Path | Deployment location | Purpose |
|---|---|---|
| `netlify/functions/editorial-api.mjs` | Netlify Function | Same-origin relay; reads private `CHIATECH_APPS_SCRIPT_URL` |
| `backend/google-apps-script/Code.gs` | Private Google Apps Script project | Auth, roles, Sheets, mail, audit, editor/settings/paper/blog workflows |
| `backend/google-apps-script/appsscript.json` | Apps Script project | V8 runtime and Lagos time zone |
| `backend/google-apps-script/SETUP.md` | Operator-only repository manual | Incremental deployment, validation and recovery |

The `backend/` directory is excluded from the public Netlify package. Never replace `Code.gs` with a deployment URL.

## Data authority

| Location | Status |
|---|---|
| Private Google Sheet | Authoritative Users, Reviews, Articles, BlogPosts, ContentPages, Settings and Audit records |
| `data/articles.json` | Empty compatibility registry; must remain `[]` |
| Existing legacy article/editorial directories | User-owned work, excluded from this release and not publication evidence |

## Hosting and security

| File | Purpose |
|---|---|
| `netlify.toml` | Build, Function, redirects and cache/no-index headers |
| `_redirects` | API relay, `/admin`, legacy protection and internal-source blocking |
| `_headers` | CSP, HSTS and security/cache rules |
| `.netlifyignore` | Excludes source, tools, manuals, QA material and legacy papers |
| `sw.js` | Public static resilience; excludes API, portal and submission paths |
| `robots.txt`, `sitemap.xml`, `feed.xml` | Public crawler surfaces; no unverified dynamic paper items |

## Document and validation tools

| Path | Purpose |
|---|---|
| `tools/build_journal_documents.py` | Packages five current author resources from approved OOXML parts |
| `tools/build_review_report.py` | Packages the single current Review Engine report |
| `tools/validate_journal_documents.py` | DOCX package/content checks |
| `tools/validate_site.mjs` | Release, security, links, content and no-paper checks |
| `tools/validate_browser.mjs` | Browser-flow validation |
| `tools/site-migration.mjs` | Controlled shared HTML identity/navigation/profile updates |

## Operator references

- `README.md`: architecture, content contracts, administration, deployment and production acceptance.
- `backend/google-apps-script/SETUP.md`: exact Apps Script/Netlify incremental update and recovery.
- `LAUNCH-CHECKLIST.md`: evidence-based production gate.
- Alternative-hosting material remains in the ignored local archive; Netlify is the current target.
- `downloads/README.txt`: Word resource inventory and regeneration notes.

## Public packaging and evidence

`netlify/build-public.mjs` allowlists public inputs into `dist/`. Netlify publishes dist, not the repository root. `netlify/functions/paper-page.mjs` renders published paper metadata; `public-index.mjs` builds the published sitemap/feed. Shared response headers live in `netlify/shared/security-headers.mjs`.

`tools/document-contract.json` is the six-resource manifest. `tools/document-sources/` holds deduplicated OOXML build inputs, not manuscripts. `tools/test-release.mjs` and `qa-harness.mjs` exercise the service locally; `tools/audit_release.py` checks the built package and safe Git candidates. `reports/` holds sanitised release evidence, excluded from public deployment. QA PNGs, PDFs and browser screenshots remain ignored.

Only the founding-editor page is intentionally public. The section-editor board and staff records are administrator-only; legacy board routes redirect to /admin.
