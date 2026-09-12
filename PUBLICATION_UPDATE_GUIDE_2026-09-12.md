# CHIATECH JOURNAL publication update guide

This guide identifies the final files for the August 2026 continuation release and the portal values that must be deployed together.

## What changed

- The public journal status now displays the confirmed Crossref member prefix `10.68232`.
- The display distinguishes the **confirmed prefix** from **article DOI registration**, which remains pending until an authenticated Crossref deposit succeeds.
- The public status card shows the proposed accession pattern `10.68232/cj.eXXX`; it does not present those identifiers as active DOI links.
- e006, e007, e008 and e020 have complete final abstracts and reconciled Volume 2, Issue 1, August 2026 metadata in their HTML, DOCX and PDF files.

## Final paper files

Each corrected paper is kept under its article identifier:

| Article | Final HTML | Final DOCX | Final PDF | Crossref sidecar |
| --- | --- | --- | --- | --- |
| e006 | `papers/e006/html/index.html` | `papers/e006/manuscript/CHIATECH_JOURNAL_2026_V1I1_e006_Version_of_Record.docx` | `papers/e006/pdf/CHIATECH_JOURNAL_2026_V1I1_e006_Version_of_Record.pdf` | `papers/e006/crossref_metadata.json` |
| e007 | `papers/e007/html/index.html` | `papers/e007/manuscript/CHIATECH_JOURNAL_2026_V1I1_e007_Version_of_Record.docx` | `papers/e007/pdf/CHIATECH_JOURNAL_2026_V1I1_e007_Version_of_Record.pdf` | `papers/e007/crossref_metadata.json` |
| e008 | `papers/e008/html/index.html` | `papers/e008/manuscript/CHIATECH_JOURNAL_2026_V1I1_e008_Version_of_Record.docx` | `papers/e008/pdf/CHIATECH_JOURNAL_2026_V1I1_e008_Version_of_Record.pdf` | `papers/e008/crossref_metadata.json` |
| e020 | `papers/e020/html/index.html` | `papers/e020/manuscript/CHIATECH_JOURNAL_2026_V1I1_e020_Version_of_Record.docx` | `papers/e020/pdf/CHIATECH_JOURNAL_2026_V1I1_e020_Version_of_Record.pdf` | `papers/e020/crossref_metadata.json` |

The `V1I1` token remains in filenames and the controlled legacy URL path for link continuity. The published bibliographic identity in the corrected files is **Volume 2, Issue 1, August 2026**.

## Public portal routes

- Journal status: `/about/indexing-archiving/`
- Article registry: `/articles/`
- Dynamic article record: `/articles/read/?id=e006` (replace `e006` with the article identifier)
- Crossref staging files: `CROSSREF_JULY_AUGUST_AUDIT_2026-09-10/`
- Crossref generator: `tools/audit_july_august_crossref.py`
- Full milestone plan: `CHIATECH JOURNAL — Milestone and ISSN Action Plan.md` (local editorial copy; not a public page)

## Apps Script / Netlify deployment sequence

1. In Apps Script, update the public profile defaults so `doiPrefix` is `10.68232`, `currentIssueLabel` is `Volume 2, Issue 1 · August 2026`, and the announcement states that article registration is pending authenticated deposit.
2. Deploy the Apps Script version and verify `?action=profile` returns the new values.
3. Publish the Netlify build containing `about/indexing-archiving/index.html`, `assets/css/launch.css`, `assets/js/review-engine.js`, and the final paper assets.
4. Open `/about/indexing-archiving/` in a private browser window and confirm the gold Crossref prefix badge is visible.
5. Open `/articles/read/?id=e006`, `/articles/read/?id=e007`, `/articles/read/?id=e008` and `/articles/read/?id=e020`; check the complete abstract, Volume 2 / Issue 1 / August 2026 metadata, PDF link and pending DOI state.
6. Do not add `https://doi.org/10.68232/...` links until Crossref returns a successful registration report for those exact suffixes.

## Crossref handoff

The pushed staging package contains all 58 article records, proposed stable suffixes `10.68232/cj.eXXX`, complete abstracts and `PENDING_REGISTRATION` DOI state. Upload the authenticated XML only after the Crossref 5.5.0 XSD and landing URL checks pass. After Crossref returns the processing report, update the article records with the registered DOI values and verify browser resolution.
