# CHIATECH JOURNAL cleanup classification

No uncertain file was deleted during this release audit. In particular, no Chief Editor paper material, Word lock or private archive was removed.

## KEEP

- Current public source, six current DOCX downloads, `tools/document-contract.json`, current document-source parts, validators, QA harness, backend source, public branding assets and operator documentation.
- `don't push/release-audit-2026-08-28/source-before/` as a local recovery snapshot; it is ignored and never deployed.

## UPDATE

- The Author Guidelines declaration-table grid now fits the page width; its content is unchanged and the refreshed package is validated.
- Current builders, validator, browser checks and manuals use the six-resource contract and private-board policy.

## MOVE TO LOCAL ARCHIVE

- Any older generated packages in `tools/docx-staging/` that use CHIATECH-STEM names or pre-contract resource inventories. Keep them local until the owner confirms they are no longer needed; do not copy them into `downloads/`.
- Legacy builders and instructions retained under the ignored recovery material only for historical comparison.

## IGNORE

- `dist/`, `tools/qa-output/`, browser screenshots, document renders, temporary LibreOffice profiles, accessibility reports, Python caches, dependency folders, `.netlify/` state and `~$` Word locks.
- `articles/2026/`, `articles/JULY 2026/`, `articles/_editorial_work/` and `don't push/`; they are private/embargoed and excluded from both Git release candidates and Netlify output.

## DELETE AFTER CONFIRMATION

- Old `tools/docx-staging/` output only after the owner verifies it contains no needed editor material and Word is closed.
- Temporary Word locks only when the owning Word session is confirmed closed.

## Outcome

The final public DOCX inventory has no orphan, broken, duplicate or case-mismatched resource. The Git candidate excludes local/generated/private material. No automatic deletion was required for the release.
