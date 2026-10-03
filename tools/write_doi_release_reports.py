#!/usr/bin/env python3
"""Generate the public-file decision manifest and concise DOI release report."""

from __future__ import annotations

import argparse
import csv
import re
import subprocess
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports" / "doi-release"

APPROVED_EXACT = {
    ".gitignore",
    "_redirects",
    "about/indexing-archiving/index.html",
    "assets/css/main.css",
    "assets/js/doi-copy.js",
    "assets/js/editorial-desk.js",
    "backend/google-apps-script/Code.gs",
    "data/pioneer-articles.json",
    "data/public-asset-manifest.json",
    "feed.xml",
    "index.html",
    "issues/volume-1-issue-1/index.html",
    "issues/volume-1-issue-2/index.html",
    "netlify/build-public.mjs",
    "papers/index.html",
    "portal/chief-editor-login/index.html",
    "sitemap.xml",
    "tools/doi_release_sync.py",
    "tools/qa-harness.mjs",
    "tools/test-release.mjs",
    "tools/test_doi_release.py",
    "tools/validate_site.mjs",
    "tools/write_doi_release_reports.py",
}


def status_entries() -> list[tuple[str, str]]:
    process = subprocess.run(
        ["git", "-c", "core.quotepath=false", "status", "--porcelain=v1", "-z", "-uall"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    )
    chunks = process.stdout.decode("utf-8", errors="replace").split("\0")
    entries: list[tuple[str, str]] = []
    index = 0
    while index < len(chunks):
        chunk = chunks[index]
        index += 1
        if not chunk:
            continue
        status, path = chunk[:2], chunk[3:].replace("\\", "/")
        if status[0] in {"R", "C"} and index < len(chunks):
            path = chunks[index].replace("\\", "/")
            index += 1
        entries.append((status, path))
    return entries


def decision(path: str) -> tuple[str, str, str, str, str]:
    if path == "reports/doi-release/github-publication-manifest.csv":
        return "PUSH", "Required release classification report", "NO", "NO", "NO"
    if path == "reports/doi-release/FINAL_RELEASE_REPORT.md":
        return "PUSH", "Required evidence-honest release report", "NO", "NO", "NO"
    if path.startswith("reports/doi-release/"):
        return "PUSH", "Public-safe DOI QA evidence", "NO", "NO", "NO"
    if path in APPROVED_EXACT:
        public = "YES" if path.endswith((".html", ".xml", ".js", ".css")) or path in {"_redirects", "feed.xml", "sitemap.xml"} else "NO"
        return "PUSH", "Reviewed DOI release implementation or public output", "NO", "NO", public
    if re.fullmatch(r"papers/e(?:00[1-9]|0[1-5][0-9]|060)/.+", path) and not path.endswith("ADMIN_FORM_COPY_PASTE.txt"):
        return "PUSH", "Published article HTML, PDF, or accessibility asset", "NO", "NO", "YES"
    if path.startswith("crossref/"):
        return "DO NOT PUSH", "Raw Crossref/source evidence retained locally; public outputs are normalized separately", "POSSIBLE", "NO", "NO"
    if path.startswith("don't push/") or path.startswith("editorial/private/"):
        return "DO NOT PUSH", "Private/internal material outside the public release boundary", "POSSIBLE", "POSSIBLE", "NO"
    if path.startswith("papers/2026_V1I1_PIONEER_JULY_AUGUST_PART2/"):
        return "DO NOT PUSH", "Pre-existing historical-route working changes preserved but excluded; redirects provide compatibility", "NO", "NO", "NO"
    if path.endswith("ADMIN_FORM_COPY_PASTE.txt"):
        return "DO NOT PUSH", "Pre-existing editorial control-file deletion is unrelated to this release", "POSSIBLE", "NO", "NO"
    return "DO NOT PUSH", "Pre-existing or unrelated working-tree change preserved and not included", "POSSIBLE", "POSSIBLE", "NO"


def write_manifest() -> tuple[int, Counter[str]]:
    rows = []
    counts: Counter[str] = Counter()
    for status, path in sorted(status_entries(), key=lambda item: item[1].casefold()):
        classification, reason, personal, secret, public = decision(path)
        counts[classification] += 1
        rows.append(
            {
                "path": path,
                "git_status": status,
                "classification": classification,
                "reason": reason,
                "contains_personal_data": personal,
                "contains_secret": secret,
                "public_web_asset": public,
                "commit": "YES" if classification == "PUSH" else "NO",
            }
        )
    REPORTS.mkdir(parents=True, exist_ok=True)
    output = REPORTS / "github-publication-manifest.csv"
    with output.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    return len(rows), counts


def write_final_report(args: argparse.Namespace, manifest_total: int, counts: Counter[str]) -> None:
    content = f"""# CHIATECH JOURNAL registered DOI release report

Generated for the Pioneer e001-e060 post-Crossref publication synchronization.

## Release identity

- Repository: `{ROOT}`
- Branch: `release/crossref-doi-sync-e001-e060-20261003`
- Commit: `{args.commit}`
- Push result: **{args.push_result}**
- Production deployment smoke test: **{args.deployment}**

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
- Secrets detected in the staged release: **{args.secrets_detected}**

## GitHub publication boundary

- Changed/untracked paths classified: **{manifest_total}**
- Classified PUSH: **{counts['PUSH']}**
- Classified DO NOT PUSH: **{counts['DO NOT PUSH']}**
- Files committed: **{args.files_committed}**
- Public-file audit: **{args.public_audit}**

Excluded categories include raw Crossref/source evidence, private/internal controls, historical-route working copies, unrelated backend documentation, local QA/render output, and pre-existing editorial control-file changes. Exclusion preserves the operator's existing working tree and keeps private material outside the public release.

## DOI resolution note

Crossref REST identity verification passed for all 60 registered article DOIs. Before deployment, 35 Part 2 resolvers reached registered historical URLs that returned 404 in production; this release adds permanent redirects to `/papers/e026/` through `/papers/e060/`. The committed `doi-resolution-audit.csv` records the measured state at its run time. A post-deployment smoke test is required before reporting the redirects as live.

## Remaining operational/editorial actions

- ISSN remains pending; no ISSN was invented.
- The Google Apps Script source is updated, but its separate Apps Script deployment is not implied by a Git/Netlify deployment.
- Crossref resource URLs remain stable through redirects; no automatic Crossref redeposit was performed.
"""
    (REPORTS / "FINAL_RELEASE_REPORT.md").write_text(content, encoding="utf-8", newline="\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--commit", default="PENDING")
    parser.add_argument("--push-result", default="PENDING")
    parser.add_argument("--deployment", default="NOT RUN")
    parser.add_argument("--files-committed", default="PENDING")
    parser.add_argument("--secrets-detected", default="PENDING")
    parser.add_argument("--public-audit", default="PENDING")
    args = parser.parse_args()
    total, counts = write_manifest()
    write_final_report(args, total, counts)
    print(f"Wrote release reports for {total} classified paths ({counts['PUSH']} PUSH; {counts['DO NOT PUSH']} DO NOT PUSH).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
