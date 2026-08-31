# CHIATECH JOURNAL portal-launch engineering report

**Scope:** portal-only release. No manuscript, version-of-record paper, acceptance decision, DOI, ISSN, indexing claim or live-deployment claim is created by this release.

**Audit date:** 31 August 2026

## 1. Repository health summary

The repository is a valid Git checkout on `main`, with `origin` set to `https://github.com/chiatechlibrary/CHIATECHJournal.git`. The release build has 95 public files and 46 HTML pages. The public article registry is exactly `[]`; no embargoed paper path is in the candidate set.

## 2. Architecture discovered

The portal is a static HTML/CSS/JavaScript site built by `netlify/build-public.mjs` into `dist`. Netlify Functions provide the editorial relay, server-rendered paper reader and public sitemap/feed. A private Google Apps Script and Sheet provide persisted editorial operations. Static source, backend, tools and reports remain version-controlled but are excluded from `dist`.

## 3. Critical blockers

No local critical blocker remains. Production deployment, live Apps Script connectivity, DNS/HTTPS verification and human sign-off have not been performed and are not represented as passed.

## 4. High-priority defects

Resolved:

- The old document builders and validator disagreed with the six current public resources and expected obsolete author mirrors.
- The site validator assumed an unavailable root Apps Script source and stale public editor-board behavior.
- Backend error handling, malformed requests, invitations, date handling and production confirmation checks needed hardening.
- The `Escape` key did not close the mobile navigation when focus remained on the menu button.
- The cache-only six-hour session could end an active Chief Editor's work unexpectedly and could not support a bounded trusted-device choice.

## 5. Medium/low-priority defects

Resolved:

- A stale security-contact URL, missing portal/download hubs and outdated download aliases were reconciled.
- The blog-reader fallback lacked a static `h1`.
- The Author Guidelines declaration table exceeded page width and clipped at the left edge in rendered output. Its second column was reduced from 7,416 to 6,848 twips; text and all other OOXML content are unchanged.

## 6. Files changed

| Area | Substantive files | Reason |
|---|---|---|
| Public routing and headers | `_redirects`, `_headers`, `netlify.toml`, `netlify/shared/security-headers.mjs`, `netlify/functions/*` | Private routing, consistent security headers, cache controls and safe dynamic responses. |
| Public experience | `portal/`, `downloads/`, `blog/read/`, `assets/js/main.js`, `assets/js/editorial-desk.js` | Add missing hubs, correct privacy wording, ensure accessible keyboard behavior and retain staff-only data. |
| Editorial backend | `backend/google-apps-script/Code.gs`, `appsscript.json`, `SETUP.md`, `BLOGBOT-HANDOFF.md` | Persisted role-authorized operations, safe errors, strict production gates, reliable sheet headers, bounded server-side sessions, signed draft-only bot handoff and operator setup. |
| Document contract | `downloads/`, `tools/document-contract.json`, `tools/document-sources/`, document builders and validator | Reconcile exactly six public resources, remove obsolete mirror expectations and retain repeatable supplied-layout packaging. |
| Quality tooling | `tools/qa-harness.mjs`, `tools/test-release.mjs`, `tools/validate_site.mjs`, `tools/validate_browser.mjs`, `tools/audit_release.py` | Exercise persisted access control, public visibility, browser behavior, release safety and the embargo. |
| Operator guidance | `README.md`, `PROJECT-DIRECTORY.md`, `LAUNCH-CHECKLIST.md`, `reports/*` | Give accurate setup, release gates, rollback and cleanup instructions. |

## 7. Exact reasons for substantive changes

Each change follows the same controlled path: detect a specific mismatch or unsafe behavior; trace the affected public or persisted boundary; make the smallest compatible change; run a focused check; rerun the release regression suite. No public paper, private editor record, credential, Apps Script deployment URL, Sheet ID, password, token or invitation link was added.

## 8. Document-contract reconciliation

The approved public inventory is six DOCX resources: Author Guidelines, Camera-Ready Manuscript Template, Copyright/Licensing/Authorship Agreement, Large-Collaboration Continuation Sheet, Review Engine Report Template and Title Page Template. `tools/document-contract.json` is the authority for download names, builder ownership and required language. `authors/` has no duplicate DOCX mirrors. Legacy names redirect to current files rather than duplicating them. The fixed guide table was rendered and reviewed after its layout adjustment; all six packages passed ZIP/XML, link, branding, relationship and source-fidelity validation.

## 9. Git, `.gitignore` and `.netlifyignore` reconciliation

The Git ignore rules exclude generated `dist`, local QA evidence, Word locks, dependencies, secrets and all embargoed paper paths. `.netlifyignore` and the build allowlist exclude the backend, reports, tools and private holding material from the deploy artifact. The release audit rejects protected paths even if a staging mistake is made.

## 10. Security findings

The relay accepts only expected actions, rejects malformed/oversized requests, keeps the upstream URL in a private Function variable, returns safe error messages and sends no-store responses. Apps Script now avoids returning provider failures, requires boolean publication confirmations, validates invitation expiry, preserves Sheet headers safely and checks database access in health. Server-side sessions retain only token hashes in the restricted `Sessions` tab: standard workdays are capped at eight hours, an authenticated Administrator may choose a twelve-hour trusted-device workday, activity renews only the inactivity deadline, and sign-out/password reset/access changes revoke access. The CHIATECHblogBOT route accepts only a recent, one-time HMAC-signed payload, records the supplied human-approval identity privately and always creates a `DRAFT`; it cannot publish. Public section-editor identities remain private. Security headers cover normal Function responses, including the previously incomplete 405/503 paths. The existing password-hash format is intentionally retained for account compatibility; a future password-KDF migration needs a separate compatibility project.

## 11. Broken links and assets fixed

The release audit checked 1,746 local references in the final build with no broken link, missing anchor or case mismatch. Added `/portal/` and `/downloads/` hubs, current Word download links, compatibility redirects, and corrected the `security.txt` canonical/policy hostname. The blog reader now has a usable no-script heading and fallback.

## 12. Backend and API findings

The local synthetic harness completed 29 groups: least privilege, private board behavior, bounded standard/trusted sessions, inactivity renewal, sign-out/suspension/password-reset invalidation, credentials, ORCID checks, formula neutralisation, real booleans, throttling, redaction, invitation reissue/one-use activation, settings persistence, Sheet header safety, draft/public visibility, signed one-time CHIATECHblogBOT General-portfolio drafts, server rendering, dynamic indexes and formatting/XSS safety. Synthetic fixtures stayed only in process memory and were not built or staged.

## 13. Netlify findings

Configured values are repository root, build command `node netlify/build-public.mjs`, publish directory `dist`, Functions directory `netlify/functions`, and Node 22. `CHIATECH_APPS_SCRIPT_URL` is deliberately absent from source and must be configured privately for Functions. The build produced 95 public files and excluded private source, QA evidence and unfinished papers. A Netlify Preview has not been created in this audit.

## 14. Accessibility findings

Browser QA passed 54 desktop/tablet/phone route checks for headings, image alternatives and horizontal overflow. It exercised homepage, public founder, private-board routing, author guidance, citations, captions/transcript controls, Administrator trusted-device choice, session notice, admin navigation and keyboard Escape/focus return. Each current DOCX was rendered to 27 pages in total; every page was visually reviewed. The accessibility audit recorded zero high, medium or low findings for all six resources.

## 15. Article-embargo verification

`data/articles.json` is `[]`. The release audit confirms the built registry is empty. No file under `articles/2026/`, `articles/JULY 2026/` or `articles/_editorial_work/` is a release candidate. Those paths remain Git-ignored, Netlify-excluded and rejected by the audit.

## 16. Validator results before fixes

- `tools/validate_site.mjs` stopped because root `backend/google-apps-script/Code.gs` was absent.
- `tools/validate_journal_documents.py` reported eight stale expectations: five obsolete resources and three obsolete author mirrors.
- Browser QA expected obsolete `ieee` citation behavior, an old public board and legacy administrator tab labels.
- The guide visual render revealed declaration-table clipping.

## 17. Validator results after fixes

- `tools/validate_site.mjs`: PASS — 46 deployable HTML pages.
- `tools/test-release.mjs`: PASS — 29 release test groups.
- `netlify/build-public.mjs`: PASS — 95 public files; protected material excluded.
- `tools/validate_browser.mjs`: PASS — 54 responsive route checks plus citation/download, admin, mobile keyboard and console checks.
- `tools/validate_journal_documents.py`: PASS — six packages, links, inventory, XML, relationships and source fidelity.
- `tools/audit_release.py`: PASS before final staging — syntax, formats, local references, form labels, embargo and secret-pattern scan.
- DOCX accessibility: PASS — zero reported findings in six reports.

## 18. Remaining manual checks

**REQUIRES LIVE/MANUAL VERIFICATION:** actual managing-editor identity/ORCID, payment account ownership, pioneer-offer approval, Netlify Preview, Netlify production deployment, Apps Script deployment/update, private environment variable, real health response, standard and trusted-device Administrator session behavior, five-minute warning/unsaved-work protection, invitation email routing, the separately hosted CHIATECHblogBOT's HMAC handoff and approval record, DNS, HTTPS, production headers, forms, rollback point and formal human sign-off.

## 19. Git staging audit

Run `tools/audit_release.py --staged` after staging. It reads the Git index as bytes, scans sensitive patterns without printing values, rejects documents/QA outputs/private materials/embargoed paths, then checks syntax and the public build. The report is written to ignored `tools/qa-output/staging-audit.json` so it cannot recursively alter the staged result.

## 20. Deployment-preview checklist

1. Create a Netlify deploy preview from this release branch.
2. Set `CHIATECH_APPS_SCRIPT_URL` in Netlify for Functions only; do not place it in source, build logs or screenshots.
3. Verify `/admin` redirect and no-store/no-index headers, then preview public routes, downloads, forms and `/api/editorial?action=health`.
4. Use test data only in the private service, then remove/archive it through the approved operational workflow.
5. Record preview URL, deploy ID, owner, timestamp and observed headers in the controlled release record.

## 21. Production smoke-test checklist

After written deployment authorization, update the existing Apps Script deployment through **Manage deployments → Edit → New version → Deploy**; do not create a separate web-app deployment. Promote the successful Netlify preview. Check health, real standard and trusted-device Administrator login/logout, activity renewal, expiry warning, unsaved-work protection, invalid login, settings persistence, invitation/reissue, private editor records, Journal-wide / General blog drafts, the signed CHIATECHblogBOT handoff/replay rejection, draft visibility, blog lifecycle, mail routing, DNS, TLS, HTTP-to-HTTPS, CSP/HSTS/no-store headers and rollback availability. Remove/archive any deliberate test records.

## 22. Rollback instructions

For Netlify, redeploy the last known-good deployment from the Netlify history or restore the known-good Git revision in a new non-force commit. For Apps Script, edit the **existing** deployment back to its earlier version. Restore a verified private Sheet backup only under the owner’s controlled procedure. Do not delete audit evidence, manuscripts or editor records to roll back the portal.

## 23. Final recommendation

**LOCAL PASS / CONDITIONAL GO FOR GIT UPDATE.** The audited change set is suitable for a reviewed GitHub push after the staged audit passes. It is **not a production-launch approval**. Netlify Preview, Apps Script, live production and human sign-off remain unverified gates. Real papers remain outside this release.
