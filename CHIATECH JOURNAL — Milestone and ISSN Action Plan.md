# CHIATECH JOURNAL — Milestone and ISSN Action Plan

**Working document — local and intentionally unpushed**  
**Prepared:** 12 September 2026  
**Publisher:** CHIA TECH SOLUTIONS AND RESOURCES LIMITED  
**Journal:** CHIATECH JOURNAL  
**Crossref prefix:** `10.68232`

## Purpose

This plan converts the Crossref Publisher Operations Manual supplied to the editorial team into a controlled release sequence for e001–e058, the July–August paper corpus, and the Volume 2, Issue 1 August 2026 publication programme.

The plan separates four states that must not be conflated:

1. **Editorially ready:** the title, author order, abstract, affiliations, article identifiers, files and URLs have passed internal review.
2. **Crossref-ready:** metadata has been converted to the approved Crossref XML schema and has passed XML, URL, duplicate-identifier and human metadata checks.
3. **Submitted:** the authenticated Crossref member account accepted an upload and issued a submission/batch record.
4. **Registered:** Crossref processing returned zero failures, the DOI resolves to the correct landing page, and the Crossref record matches the article.

No proposed identifier is a registered DOI until the final state is reached.

## Current position

| Control | Current state | Required evidence before release |
|---|---|---|
| Crossref membership | Active according to the supplied member notice | Keep the original notice in the private publisher record |
| Member name | CHIA TECH SOLUTIONS AND RESOURCES LIMITED | Freeze this exact spelling |
| DOI prefix | `10.68232` | Keep server-side and in the controlled deposit files |
| Journal title | CHIATECH JOURNAL | Freeze the title before the first title-level DOI |
| Staged records | e001–e058 | Reconcile each against the final approved article and issue |
| DOI status | Not registered | Do not display `https://doi.org/...` as active |
| Print ISSN | Pending | Submit a separate print-media request |
| Online ISSN | Pending | Submit a separate online-media request |
| ISSN-L | Pending designation | Do not invent or display a value |
| Crossref XML | Corrected staging target 5.5.0 | Validate against the 5.5.0 XSD before upload |

## Hard holds before the first Crossref upload

### Abstract recovery\n\n**Resolved 12 September 2026.** e006, e007 and e008 now carry complete conclusions recovered from their final manuscript body sections; e020 HTML was rebuilt from its complete final manuscript abstract. DOCX, HTML and rebuilt PDF outputs were checked for agreement.\n\n### Issue and URL reconciliation

The controlled Part 2 path retains the legacy folder name `2026_V1I1_PIONEER_JULY_AUGUST_PART2` for URL continuity. The authoritative bibliographic identity is Volume 2, Issue 1, August 2026 in the issue and Crossref metadata; the storage-path token is not treated as volume/issue data. Keep the stable path and verify that each landing page serves the corresponding V2I1 object.

### Title and author identity

e047, e057 and e058 must use their scholarly article titles, not portfolio or article-type headings. The controlled records now use:

- e047 — *Prompting for Human-Centred Output: The HUMAN Framework for Credible, Context-Aware Generative AI Writing*.
- e057 — *Responsible Digital Technology Adoption in Nigerian Secondary STEM Education: A Rights, Religious-Pluralism and Child-Safeguarding Framework*.
- e058 — *Empowering Nigerian MSMEs through Finance, Technology and Capability: The SCALE Framework for Sustainable Industrial Development*.

Author order, given names, family names, affiliations and ORCIDs must be confirmed from the final proof. ORCIDs are omitted unless supplied and verified.

## Milestone 0 — freeze identity and access

**Owner:** Publisher / Crossref account contact  
**Exit evidence:**

- Technical contact activates the personal Crossref password.
- Credentials are not stored in GitHub, Netlify client variables, JavaScript, XML, screenshots or logs.
- Chief Editor receives separate personal Crossref credentials if the Chief Editor will submit deposits.
- Exact publisher name, journal title and prefix are frozen.
- Crossref role `bbry` is retained only in the secure account record.

## Milestone 1 — title-level identity while ISSN is pending

**Owner:** Chief Technical Editor  
**Exit evidence:**

- Prepare one journal title-level DOI record for CHIATECH JOURNAL resolving to the stable journal homepage.
- Do not create a separate title DOI for every article.
- Keep article DOI suffixes independent of volume, issue and month.
- Use the stable accession pattern `10.68232/cj.eXXX` unless the publisher approves a different opaque registry policy before DOI #1.

## Milestone 2 — paper metadata reconciliation

**Owner:** Chief Editor and Metadata Editor  
**Exit evidence for every article:**

- Exact Version-of-Record title.
- Complete author list and order.
- Structured given names and family names.
- Verified affiliation text.
- Verified ORCID only where supplied by the author.
- Complete abstract, or a documented hold.
- Keywords, article type and eLocator.
- Actual publication year/month/day when known; never invent 1 August.
- Permanent landing-page URL and PDF route.
- License, funding and conflict declarations where genuinely supplied.
- References and DOI links where available.

## Milestone 3 — clean landing pages

**Owner:** Webmaster / Netlify operator  
**Exit evidence:**

Every article landing page must return HTTP 200 and contain:

- CHIATECH JOURNAL identity.
- Exact title and complete author list.
- Affiliations and verified ORCID links where available.
- Abstract and keywords.
- Article type, volume, issue and eLocator.
- Publication dates that match the editorial registry.
- License and citation block.
- HTML and PDF links.
- References.
- Publisher identity.

The DOI must resolve to the landing page, never directly to a raw PDF.

## Milestone 4 — Crossref 5.5.0 production build

**Owner:** Chief Technical Editor  
**Exit evidence:**

- Generate UTF-8 Crossref 5.5.0 XML.
- Use a unique batch ID for every upload, for example `chiatech-v2i1-20260912-r01`.
- Use a new timestamp for every corrected deposit.
- Omit unknown publication days.
- All four previously held abstracts are now verified from final manuscript text; do not reintroduce truncated or guessed text.
- Include title, contributors, affiliations, abstract, publication date, article number, DOI, landing URL, license and references when genuinely available.
- Validate XML against the Crossref 5.5.0 schema.
- Validate that every landing URL returns 200.
- Check duplicate proposed DOI suffixes and duplicate article IDs.
- Require a Chief Editor metadata approval before upload.

## Milestone 5 — pilot deposit

**Owner:** Crossref account contact  
**Pilot:** journal title-level record plus e001  
**Procedure:**

1. Upload through Crossref Admin Tool → Submissions → Upload → Metadata.
2. Record filename, batch ID, timestamp, submitting user and intended DOI.
3. Wait for the Crossref processing report.
4. Require success count equal to record count and failure count equal to zero.
5. Resolve the DOI in a normal browser.
6. Confirm that it reaches the e001 landing page.
7. Compare title, authors, volume, issue, publication date, article number, abstract, license and URL in Crossref against the landing page.
8. Only then change the registry state from `SUBMITTED` to `REGISTERED` and display the DOI link.

## Milestone 6 — controlled article batches

After the pilot succeeds:

- Batch A: e002–e010.
- Batch B: e011–e025.
- Batch C: e026–e040.
- Batch D: e041–e058.

After every batch: upload, record the submission, wait for the processing log, require zero failures, resolve DOI links, spot-check metadata, and update the DOI master registry.

## Milestone 7 — ISSN applications

**Owner:** Publisher / ISSN application contact  
**Route:** `https://issn.nln.gov.ng/clientregistration/registration`

Create the corporate publisher account using the authentic company information and CAC certificate. Submit two separate media applications:

1. Online/electronic ISSN, using the live journal issue and article archive.
2. Print ISSN, using the matching print maiden issue PDF and any physical evidence requested by the Nigerian ISSN Centre.

Do not invent the p-ISSN, e-ISSN or ISSN-L. When the ISSN Centre assigns the records:

- Update journal metadata and landing pages.
- Add the identifiers to the Crossref journal metadata.
- Redeploy public metadata.
- Redeploy the existing registered article DOIs with the new ISSNs.
- Never create replacement DOIs solely because ISSNs were assigned later.

## Milestone 8 — maintenance

Run a monthly audit with these targets:

- DOI resolution: 100%.
- Landing pages returning 200: 100%.
- Exact titles and complete author lists: 100%.
- Affiliations where available: 100%.
- Complete abstracts: 100% for deposited records.
- License metadata: 100%.
- Broken URLs: zero.
- Duplicate DOIs: zero.
- Failed deposits without correction: zero.
- Metadata and Version-of-Record conflicts: zero.

For corrections, corrigenda, withdrawals and retractions, preserve the DOI and scholarly history. Do not delete a registered DOI or issue a replacement merely because a URL, title metadata field or ISSN later changes.

## Repository deliverables

The pushed repository package contains the corrected internal staging generator and audit files:

- `CROSSREF_JULY_AUGUST_AUDIT_2026-09-10/CROSSREF_DEPOSIT_V2I1_AUGUST_2026.json`
- `CROSSREF_JULY_AUGUST_AUDIT_2026-09-10/CROSSREF_DEPOSIT_V2I1_AUGUST_2026.xml`
- `CROSSREF_JULY_AUGUST_AUDIT_2026-09-10/CROSSREF_RECONCILIATION_ISSUES.json`
- `CROSSREF_JULY_AUGUST_AUDIT_2026-09-10/CROSSREF_DEPOSIT_README.md`
- `tools/audit_july_august_crossref.py`

This full milestone plan is intentionally kept local and unpushed so the editorial team can amend owners, dates, credentials and approval gates before it becomes a public or repository-controlled operating document.

## Final go/no-go rule

**Membership:** GO.  
**Prefix:** GO.  
**Current staging XML:** Abstract holds resolved; proceed to XSD validation, landing-URL checks, and Chief Editor approval before authenticated upload.  
**Pilot:** NEXT after the journal title-level record and e001 pass human metadata approval.  
**Public DOI display:** HOLD until Crossref returns a successful processing report and browser resolution is verified.

