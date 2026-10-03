# CHIATECH DOI release repository map

- Canonical normalized source: `crossref/2026-pioneer/CHIATECH_PIONEER_CANONICAL_e001-e060.json`
- Public normalized registry: `data/pioneer-articles.json`
- Public article routes/assets: `papers/e001/` through `papers/e060/`
- Legacy Part 2 DOI targets: `papers/2026_V1I1_PIONEER_JULY_AUGUST_PART2/e026-e060/html/`
- Issue/archive pages: `issues/volume-1-issue-1/`, `issues/volume-1-issue-2/`, `papers/`
- Editorial frontend/backend: `portal/`, `assets/js/editorial-desk.js`, `backend/google-apps-script/Code.gs`
- Public allowlist/build boundary: `data/public-asset-manifest.json`, `netlify/build-public.mjs`
- Discovery: `sitemap.xml`, `feed.xml`, `robots.txt`, article citation meta and JSON-LD
- Deployment: `netlify.toml`, `_headers`, `_redirects`
- Tests: `tools/test-release.mjs`, `tools/validate_site.mjs`, `tools/test_doi_release.py`
- Private/local: `don't push/`, `crossref/private/`, caches and raw editorial controls excluded by `.gitignore` and the public build.
