# CHIATECH JOURNAL production launch checklist

Record the responsible person, date, evidence location and result for every checked item. A check mark represents an observed result, not an intention.

## 1. Release scope and paper embargo

- [ ] No new manuscript, PDF, paper directory or article landing page was added under `articles/`.
- [ ] `data/articles.json` is exactly an empty JSON array.
- [ ] Legacy article/editorial material is excluded from Netlify by `.netlifyignore` and protected by routing.
- [ ] Public paper and issue registries show no paper that has not completed editing, acceptance and production.
- [ ] The portal is launched and verified before any real paper record is published.

## 2. Identity, editor and contact data

- [ ] Managing Editor displays as CHIA SHIAONDO KENNETH.
- [ ] Role displays as Founding Editor & Managing Editor.
- [ ] Affiliation displays as CHIA TECH SOLUTIONS AND RESOURCES LIMITED, Nigeria.
- [ ] The ORCID link resolves to `https://orcid.org/0009-0009-6434-4586` and the public record is checked manually.
- [ ] Journal correspondence displays `chiatechlibrary@gmail.com` throughout pages and Word files.
- [ ] Every appointed section editor has written acceptance and checked identity, affiliation, conflicts and profile permissions in the private administrator record.
- [ ] All section-editor profiles remain absent publicly, including deliberately marked test records; the public founder is the only approved profile surface.

## 3. Fees and payment transparency

- [ ] Standard APC is ₦35,000.00 Nigerian naira and due only after written acceptance and invoice.
- [ ] Pioneer APC is ₦25,000.00 for Volumes 1 and 2 (July/August 2026), due only after written acceptance and invoice.
- [ ] Submission, peer review and withdrawal display ₦0.
- [ ] Payment account is CHIA TECH SOLUTIONS AND RESOURCES LIMITED, Moniepoint, `6963021042`.
- [ ] Receipt channels display WhatsApp `+234 703 768 9917` and `chiatech010@gmail.com`.
- [ ] The receipt email is distinguished from the journal correspondence email.
- [ ] Authors are warned not to pay personal or unverified accounts.
- [ ] Editors and reviewers are shielded from payment/waiver information until the scholarly decision is complete.
- [ ] Waiver wording states eligibility/timing honestly and makes no automatic promise.

## 4. Administrator control

- [ ] `/admin` redirects to the no-index staff sign-in and is served with no-store headers.
- [ ] Administrator login succeeds; incorrect credentials and repeated failures are rejected/throttled.
- [ ] Standard Administrator and section-editor sessions are limited to one 8-hour workday; normal editorial activity renews only the inactivity deadline.
- [ ] The **Keep me signed in on this trusted device** choice is available only to an authenticated Administrator, is used only on the Chief Editor's controlled device, and is capped at 12 hours.
- [ ] A five-minute session-expiry warning appears; unsaved editorial work prompts before browser close and voluntary sign-out.
- [ ] Sign-out invalidates the active session.
- [ ] Admin can invite and reissue an unactivated editor link.
- [ ] Admin can edit editor access and public-profile fields, including public contact and ORCID.
- [ ] Admin can update Managing Editor identity, fees/payment data, contact, announcement and issue/status information.
- [ ] Admin can save paper and blog drafts and deliberately publish, unpublish and archive records.
- [ ] Blog / news offers `Journal-wide / General` for editorials, notices and institutional announcements without allowing that portfolio for journal papers.
- [ ] If CHIATECHblogBOT is enabled, a signed, recorded-human-approval handoff creates only a private `DRAFT`; invalid signatures and nonce replay are rejected; the test draft is removed or archived.
- [ ] A section editor sees only their authorised review/profile scope and cannot access admin-only mutation controls.
- [ ] Audit rows are created for authentication, editor, settings, paper and blog actions.

## 5. Review Engine and human authority

- [ ] The full DOCX remains in the browser during Review Engine use.
- [ ] Crossref queries send only authorised title/DOI/reference samples.
- [ ] Routed summaries contain separate author and human-editor actions.
- [ ] The admin evidence brief displays methods/reproducibility, results/limitations, disclosures, references, registry evidence and the human decision gate.
- [ ] The report states it is not plagiarism certification, an AI-authorship verdict, peer review, indexing assessment or an acceptance decision.
- [ ] Editors verify primary sources, correction/retraction status and the appropriate reporting guideline independently.
- [ ] No confidential manuscript text, password, token or invitation link appears in Netlify/Apps Script logs.

## 6. Google Apps Script update

- [ ] The complete revised `backend/google-apps-script/Code.gs` is saved in the existing journal-controlled project.
- [ ] The manifest is the special file named exactly `appsscript.json`, not an ordinary `appsscript.json.gs` source file, and contains no `myFunction()` wrapper.
- [ ] A **new version** of the existing web-app deployment is deployed.
- [ ] The existing `/exec` URL remains private and unchanged.
- [ ] Script Properties remain correct and contain no copied values in repository files.
- [ ] If CHIATECHblogBOT is enabled, `BLOG_BOT_HANDOFF_SECRET` exists only in the restricted Apps Script properties and the bot service's private secret store.
- [ ] Users headers include `public_email`; the restricted `Sessions` tab has its verified service headers; other service headers remain intact.
- [ ] Public fee/editor Setting keys are created only through authorised admin saves.
- [ ] `/api/editorial?action=health` returns `ok: true` through Netlify.
- [ ] Apps Script execution logs contain no unexplained errors.

## 7. Netlify, GitHub, DNS and security

- [ ] The existing Git release branch, intended remote and main history are verified; no force push or unrelated history overwrite occurs.
- [ ] No secret, Apps Script URL, Sheet ID, password, token, invitation or private editorial data appears in the staged diff/history.
- [ ] `CHIATECH_APPS_SCRIPT_URL` exists only as a private Netlify environment variable.
- [ ] Netlify deploy preview passes before production promotion.
- [ ] DNS resolves `journal.chiatechsolutions.com` to the intended Netlify site.
- [ ] HTTPS is valid and HTTP redirects to HTTPS.
- [ ] CSP, HSTS, no-sniff, frame, referrer, permissions, cache and no-index headers are present.
- [ ] A known-good Netlify deploy and private Sheet backup are available for rollback.
- [ ] Controlling Google, GitHub, Netlify and DNS accounts use multi-factor authentication.

## 8. Public experience and discoverability readiness

- [ ] Home, About, public Founder, private board redirect, Contact, Fees, Author, Review Engine, Papers, Blog, Search and policy pages render at phone, tablet and desktop widths.
- [ ] Navigation, keyboard focus, headings, labels, messages, colour contrast and alt text are checked.
- [ ] No page claims inclusion in Google Scholar, Semantic Scholar, ResearchGate, CORE, JSTOR, PubMed/PMC, BASE, DOAJ, Scopus or Web of Science without evidence.
- [ ] Every future paper will receive one stable crawlable URL with a full visible author-written abstract and bibliographic metadata.
- [ ] DOI, ORCID, dates, licence, authors, affiliation and full-text links will be consistent across HTML, PDF and deposited metadata.
- [ ] The server-rendered paper reader and dynamic sitemap/feed expose only authorised published records; no unverified record is pre-populated.
- [ ] PMC/biomedical claims are withheld until scope, ISSN, publication-history, scientific and JATS/XML requirements are actually met.

## 9. Documents and local validation

- [ ] All six current Word downloads match their approved OOXML builder sources and current identity; no obsolete aliases or author DOCX mirrors are created.
- [ ] Document structure/content validation passes.
- [ ] Accessibility audit has no high-severity findings; remaining findings are reviewed in context.
- [ ] Every page of every final Word file was rendered and visually inspected after the last edit.
- [ ] JavaScript, Apps Script and Python syntax checks pass.
- [ ] `tools/validate_site.mjs` passes all content, security, link and no-paper checks.
- [ ] Browser validation passes with no console/page errors in the tested flows.
- [ ] The `articles/` file count and aggregate hash match the pre-change baseline.

## 10. Launch approval

- [ ] Netlify forms and approved notifications work without exposing manuscripts to unauthorised recipients.
- [ ] Admin, editor invitation, settings, draft paper, blog and Review Engine routing smoke tests pass in production.
- [ ] Test records are removed or archived and public state is correct.
- [ ] A second authorised reviewer confirms identity, payment data, policies and release evidence.
- [ ] The launch owner signs off unresolved failures as closed.
- [ ] The portal is announced as live only after all required live checks pass.

## Gate record

Do not infer a live pass from local evidence. The engineering report records local results. The launch owner must record preview URL/deploy ID, Apps Script version, production deploy ID, test date/operator, mail result, rollback point and final sign-off privately.

- [ ] Netlify base is root, publish is dist, Functions path is correct and the private upstream variable is Functions-scoped.
- [ ] The dated July/August pioneer fee offer is still approved.
- [ ] Admin recovery documentation uses ADMIN_PASSWORD_RESET; PASSWORD_PEPPER is retained.
- [ ] Static and Function responses carry the expected security/no-store headers.
- [ ] The full local suite passes on the exact commit proposed for promotion.
