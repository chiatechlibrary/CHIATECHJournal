# Crossref registration and controlled release guide

This folder is the controlled deposit package for CHIATECH JOURNAL Volume 2 Issue 1, August 2026: 60 records, e001 through e060. The prefix is `10.68232`. Every `10.68232/cj.eXXX` value in this package is a proposed suffix and remains **PENDING_REGISTRATION** until the authenticated Crossref deposit is accepted and each DOI resolves to its exact live landing page.

## 1. Pre-deposit approval

1. Chief Editor signs off the final title, contributor order, abstract, publication month, licence, ethical declarations and resource URL for every record.
2. Render and visually inspect the final e059 and e060 DOCX copies; place the approved PDFs only in their matching `pdf/` folders.
3. Validate `CROSSREF_DEPOSIT_V2I1_AUGUST_2026.xml` against the [Crossref journal XML schema](https://data.crossref.org/schemas/crossref5.5.0.xsd). Fix reported validation errors before upload.
4. Ensure each proposed resource URL is public, returns HTTPS 200, has its matching citation metadata, and is not password-protected or a placeholder page.
5. Do not insert ISSNs: print, online and ISSN-L are pending the ISSN agency outcome.

## 2. Authenticated Crossref deposit

1. Sign in only through the publisher's authorised [Crossref administration and deposit service](https://www.crossref.org/documentation/register-maintain-records/direct-deposit-xml/). Do not place credentials in this repository, browser source, public environment variables or screenshots.
2. Upload the XML deposit file from this folder. Record the submission ID, UTC time, account used and Crossref response in a private editorial log.
3. Resolve all schema or metadata errors from the response; re-deposit a revised batch only with a new batch identifier and recorded change reason.
4. Wait for the accepted-deposit result. Acceptance is not complete until `https://doi.org/10.68232/cj.e001` through `https://doi.org/10.68232/cj.e060` resolve to their intended landing pages.

## 3. Portal and Git release

1. Move only final approved HTML, PDFs, permitted assets and metadata to the public release allowlist. Do not publish DOCX sources, editorial controls, Crossref account data, personal correspondence or QA work files.
2. Update the live article data source and deploy the portal. Verify a private-browser visit to the issue page and all 60 landing pages.
3. Check Crossref's record/metadata retrieval after deposit and confirm title, authors, issue, article number and landing page for a sample plus e059/e060.
4. Stage explicit public paths, run `git diff --cached --check`, commit, push and inspect the hosting preview before merging/deploying.

## Useful official references

- [Crossref direct XML deposit documentation](https://www.crossref.org/documentation/register-maintain-records/direct-deposit-xml/)
- [Crossref journal-article metadata guidance](https://www.crossref.org/documentation/schema-library/markup-guide-record-types/journal-articles/)
- [Crossref XML schema library](https://www.crossref.org/documentation/schema-library/)
- [International ISSN Centre](https://portal.issn.org/)

## Release evidence to retain privately

- Chief Editor approval and author permissions
- final manuscript and PDF QA record
- Crossref submission ID, response and deposit date
- DOI resolver evidence for all public articles
- hosting/deployment URL, timestamp and private-browser check
- Git commit SHA and reviewed changed-path list
