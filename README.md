# CHIATECH JOURNAL — SETEHEM portal

Release source for https://journal.chiatechsolutions.com. Repository: https://github.com/chiatechlibrary/CHIATECHJournal.git.

## Release scope

This is a **portal-only release**, not a paper publication or an announcement that the service is live. `data/articles.json` remains `[]`. Never add manuscripts, PDFs or real paper landing pages under `articles/2026/`, `articles/JULY 2026/` or `articles/_editorial_work/`. These paths and `don't push/` remain ignored. Chief Editor material is not a source of authorised public records.

Local checks, Netlify preview, Apps Script integration, production smoke tests and human sign-off are separate gates. See `LAUNCH-CHECKLIST.md` and `reports/LAUNCH-ENGINEERING-REPORT.md` for evidence and outstanding checks.

## Architecture and data authority

- Static HTML/CSS/JavaScript public pages, Netlify Forms, a public build allowlist and three Netlify Functions. No framework migration or new database is required.
- `netlify/build-public.mjs` builds **dist**. Only dist is public. Repository source such as backend/, tools/ and reports/ must remain in Git but outside the public package.
- `/api/editorial` relays to the private existing Google Apps Script web app. The URL is held only in Netlify's `CHIATECH_APPS_SCRIPT_URL` environment variable.
- The private Google Sheet contains Users, Reviews, Articles, BlogPosts, ContentPages, Settings and Audit. It is never published or linked in this repository.
- `/articles/read/` uses a Function to render an authorised published record for crawlers, then JavaScript provides citation styles and full-text controls. `/sitemap.xml` and `/feed.xml` derive additional entries only from published records.
- `/portal/` is the pathway hub. `/admin` and legacy editorial-board URLs redirect to `/portal/chief-editor-login/`. Both administrators and invited editors sign in there.

## Current privacy and content contract

Section-editor records are **administrator-only**. The current frontend, relay and backend all enforce that restriction. Do not restore the former public editorial-board pages or publish test editor identities to satisfy an obsolete test. `/about/founding-editor/` is the intentionally public founder profile. Any future public board requires explicit approval and a coordinated frontend/backend change.

The administrator can manage invitations/access, review summaries, paper metadata, blog/news, approved public settings and selected page copy. Section editors see only their assigned review summaries. Draft papers and blogs are absent from public responses. Page drafts retain the last published page version; archiving a managed page restores its static default.

Public content editing accepts constrained text and links, not arbitrary HTML. Blog pages provide reading, watching and sharing without a download control. Browser text selection and printing remain accessible; these interfaces are not DRM and cannot guarantee prevention of copying.

## Public identity and fees

These values agree with the supplied current source; external identity, ORCID and bank ownership require the launch owner's sign-off:

| Field | Current source value |
|---|---|
| Publisher | CHIA TECH SOLUTIONS AND RESOURCES LIMITED, RC 1839865 |
| Managing Editor | CHIA SHIAONDO KENNETH |
| Public role | Founding Editor & Managing Editor |
| Affiliation | CHIA TECH SOLUTIONS AND RESOURCES LIMITED, Nigeria |
| ORCID | https://orcid.org/0009-0009-6434-4586 |
| Journal correspondence | chiatechlibrary@gmail.com |
| Standard accepted-article APC | NGN 35,000 |
| Pioneer APC | NGN 25,000; Volumes 1 and 2 (July/August 2026), as supplied |
| Timing | Only after written acceptance and an official invoice |
| Payment account | CHIA TECH SOLUTIONS AND RESOURCES LIMITED; Moniepoint; 6963021042 |
| Receipt channels | WhatsApp +234 703 768 9917; chiatech010@gmail.com |

Submission and peer review are free. Payment or waiver requests must not influence scholarly decisions. Confirm whether the dated pioneer offer remains approved before launch; no dates or business rules were invented to extend it.

ISSN remains pending and the DOI prefix is not assigned. No external indexing membership is claimed. Future DOI, ISSN, publication dates, authorship, acceptance and peer-review claims require authentic evidence.

## Review Engine and publication controls

The Review Engine reads DOCX locally. With consent it sends only the title, detected DOI strings and a limited reference sample to Crossref; a concise report and routing contact go to authorised editorial staff. It is not peer review, a plagiarism certificate, an AI-authorship verdict or acceptance.

No paper is published by this release. Later, a human administrator must verify acceptance, authorship, permissions, declarations, authentic dates, registered DOI, matching HTML/PDF and the approved accessible explanatory video. The existing server gate requires DOI, dates, metadata, true boolean production confirmations and captions or transcript. Saving a URL does not check a production-confirmation box automatically. Technical validation cannot establish scholarly approval.

## Six Word resources

The approved public inventory is in `downloads/README.txt` and `tools/document-contract.json`. The six resources serve distinct purposes: guide, camera-ready template, title page, Review Engine report, publication agreement and large-collaboration continuation sheet. The Brand and Template Standard is an internal reference, not a seventh public download.

`authors/` contains HTML pathways, not DOCX mirrors. Old download names have HTTP redirects. Do not duplicate or rename the current files to satisfy an old validator.

The builders preserve the supplied designs through deduplicated OOXML parts in `tools/document-sources/`. Build candidates with both builders' `--output-dir tools/qa-output/rebuild-YYYYMMDD`, using a fresh directory for that run. Old `tools/docx-staging` output may contain obsolete files and must not be copied wholesale. Validate against the manifest, render every page and inspect before replacing a release. Close Word first. A lock or failed copy is a failure, not a completed release.

## Required setup for this release

### Existing Apps Script project

1. Make a restricted Sheet backup and record the current deployed version.
2. Replace Code.gs with the complete `backend/google-apps-script/Code.gs`.
3. In Project Settings, show the existing **appsscript.json** manifest, then use the repository manifest. Do not create an `appsscript.json.gs` file.
4. Save, then **Deploy → Manage deployments → Edit → New version → Deploy**. Keep the existing web-app deployment and `/exec` URL.
5. Retain the private Script Properties. Do not reorder columns. Missing required columns are appended; blank or duplicate headers now fail rather than being silently overwritten.
6. Check health, authentication, invitation/activation, suspension, logout, settings, drafts, blog lifecycle, page copy and mail. `health` now checks that the private database is reachable.

See `backend/google-apps-script/SETUP.md`. No Apps Script deployment was performed by the local audit. Password recovery uses **ADMIN_PASSWORD_RESET**, not ADMIN_BOOTSTRAP_PASSWORD. Keep PASSWORD_PEPPER unchanged.

### Netlify

| Setting | Value |
|---|---|
| Repository | chiatechlibrary/CHIATECHJournal |
| Base directory | Repository root (blank) |
| Build command | node netlify/build-public.mjs |
| Publish directory | dist |
| Functions directory | netlify/functions |
| Node runtime | 22, as configured in netlify.toml |
| Private variable | CHIATECH_APPS_SCRIPT_URL, available to Functions |

Do not deploy the repository root or the private holding folder. Retain the existing variable value if the Apps Script deployment URL is unchanged. Never paste it into source, screenshots or reports. Redeploy after environment changes. Use a separate test backend for mutable preview tests; do not expose production credentials to untrusted pull-request previews.

The existing release branch is `release/portal-launch-2026-07`; its older name does not change the August audit date. A push to this branch is not a merge to main. Enable a branch deploy or open a reviewed pull request for a Netlify preview. Promote only after the required external checks and human approval.

### DNS and HTTPS

After an authorised deployment, confirm the custom domain is attached to the intended Netlify site, apply the DNS record Netlify specifies, wait for the certificate, and verify HTTP-to-HTTPS, security headers and API health. Do not guess the Netlify subdomain or DNS target. Record the deploy ID and rollback point.

## Local engineering checks

Use Node 22+ and Python 3 with python-docx and lxml. The Codex workspace provides these runtimes; browser tests additionally require the bundled Playwright package and installed Chromium/Chrome/Edge.

```text
node tools/validate_site.mjs
node tools/test-release.mjs
python tools/validate_journal_documents.py --report reports/document-contract.json
node netlify/build-public.mjs
python tools/audit_release.py --git <git-executable> --node <node-executable>
node tools/validate_browser.mjs
```

The API regression suite uses synthetic process-memory fixtures and never contacts a live service. Browser fixtures prove UI behaviour, not deployment or mail delivery. `node tools/serve-qa.mjs` serves the built portal on loopback port 4173 with an empty paper/blog registry; `--fixtures` enables labelled synthetic records for reader testing. Never deploy this server or its fixtures.

## Git and rollback

Review `git status --short`, `git diff --cached --name-only`, `git diff --cached --stat` and the staged secret/embargo audit before committing. Do not use `git add -f` or force-push. The correct remote and existing main history must be preserved.

For rollback, restore the last known-good Netlify deploy and the recorded Apps Script version. Restore a restricted Sheet backup only after identifying which data changes must be reversed; a code rollback does not undo data writes. Never rotate PASSWORD_PEPPER as a rollback shortcut. For a Git regression, use a reviewed revert commit.

Official setup references: [Netlify build configuration](https://docs.netlify.com/build/configure-builds/overview/), [Function environment variables](https://docs.netlify.com/build/functions/environment-variables/), [Apps Script deployments](https://developers.google.com/apps-script/concepts/deployments).
