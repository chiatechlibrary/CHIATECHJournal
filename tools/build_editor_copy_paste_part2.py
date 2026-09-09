from pathlib import Path
import json, re
from docx import Document

ROOT = Path(__file__).resolve().parents[1]
PKG = ROOT / 'papers/2026_V1I1_PIONEER_JULY_AUGUST_PART2'
OUT = ROOT / 'PIONEER_UPDATE_2026-09-09'
OUT.mkdir(exist_ok=True)

SPECIAL = {
    'e035': ('AUTHOR CONTRIBUTION HOLD: The supplied manuscript establishes the three-author order but does not include a CRediT statement. Contribution roles must be confirmed by all authors in the final editorial proof; no unverified roles are assigned in this copy.', 'AUTHOR_CONFIRMATION_REQUIRED'),
    'e046': ('AUTHOR CONTRIBUTION HOLD: Chia, Shiaondo Kenneth, and Amenger, Gbaden: conceptualization, methodology, formal analysis, engineering reconstruction, validation, visualization, investigation, writing—original draft, and writing—review and editing. Goshwe, N. Y.: supervisory contribution and critical review as recorded in the supplied manuscript. All authors must confirm this statement in the final editorial proof.', 'EDITORIAL_STATEMENT_REQUIRES_ALL_AUTHOR_CONFIRMATION'),
    'e031': ('MANUSCRIPT CONTROL: This current manuscript is a complete replacement of the legacy grouped copy. The current source is authoritative; the legacy copy is retained only for provenance and is not a publication candidate.', 'CURRENT_MANUSCRIPT_REPLACES_LEGACY_GROUPED_COPY'),
    'e056': ('EDITORIAL HOLD: The requested renewable-paper replacement source was not supplied in the controlled workspace. The supplied RESTORE manuscript remains authoritative; do not relabel or substitute e044 without the intended renewable source and author authorization.', 'RENEWABLE_SOURCE_NOT_SUPPLIED'),
}

def clean(s):
    return ' '.join(s.replace('\uFFFD', '').split())

def extract(eid, meta):
    doc = Document(next((PKG/eid/'manuscript').glob('*.docx')))
    paras = [clean(p.text) for p in doc.paragraphs]
    paras = [p for p in paras if p]
    title = meta.get('title', '')
    if title not in paras:
        title = next((p for p in paras if len(p) > 35 and 'PIONEER' not in p.upper() and 'CHIATECH' not in p.upper()), title)
    ti = paras.index(title) if title in paras else 0
    abstract_i = next((i for i,p in enumerate(paras) if p.lower() == 'abstract'), None)
    kw_i = next((i for i,p in enumerate(paras) if p.lower().startswith('keywords:')), None)
    authors = paras[ti+1:abstract_i] if abstract_i is not None else paras[ti+1:ti+5]
    authors = [p for p in authors if not p.lower().startswith(('orcid:', 'correspondence:', 'department', 'faculty', 'chiatech solutions', '1chiatech', '2nigeria', '3department'))]
    abstract = paras[abstract_i+1] if abstract_i is not None and abstract_i+1 < len(paras) else ''
    keywords = paras[kw_i][len('Keywords:'):].strip() if kw_i is not None else ''
    return title, authors, abstract, keywords

def main():
    ids = sorted([p.name for p in PKG.iterdir() if p.is_dir() and re.fullmatch(r'e\d{3}', p.name)], key=lambda x:int(x[1:]))
    lines = [
        'CHIATECH JOURNAL — CHIEF EDITOR COPY/PASTE CONTROL',
        'PIONEER JULY/AUGUST 2026 · PART 2 · e026–e058',
        'EDITORIAL PACKAGE GENERATED 2026-09-09',
        '',
        'CONTROL STATUS: Accepted production package prepared for editorial control. DOI remains pending registration; ISSN remains pending assignment. This file does not claim Version of Record, DOI registration, ISSN assignment, Netlify deployment, Apps Script deployment, or human author sign-off.',
        'PUBLIC URL DESTINATION (to be used after the editor deploys the package): https://journal.chiatechsolutions.com/papers/eXXX/',
        'DIRECT PDF DESTINATION: https://journal.chiatechsolutions.com/papers/eXXX/CHIATECH_JOURNAL_2026_V1I1_eXXX_PIONEER_PART2.pdf',
        '',
    ]
    for eid in ids:
        meta = json.loads((PKG/eid/'metadata/article_metadata.json').read_text(encoding='utf-8'))
        title, authors, abstract, keywords = extract(eid, meta)
        note, state = SPECIAL.get(eid, ('No special reconciliation hold recorded. Confirm author metadata and proof against the supplied source before final sign-off.', 'EDITORIAL_PROOF_CHECK_REQUIRED'))
        lines += [
            '='*92,
            f'ARTICLE ID / eLOCATOR: {eid}',
            f'TITLE: {title}',
            f'ISSUE: Volume 1, Issue 1 · Pioneer July/August 2026 · Part 2',
            f'STATUS: {meta.get("status", "ACCEPTED_PRODUCTION_APPROVED_PENDING_DOI_REGISTRATION")}',
            f'DOI: PENDING REGISTRATION | ISSN: PENDING ASSIGNMENT',
            'AUTHORS (publication order; confirm against final proof):',
        ] + [f'  - {a}' for a in authors] + [
            f'AUTHOR CONTRIBUTIONS / CONTROL: {meta.get("author_contributions") or note}',
            f'EDITORIAL STATE: {state}',
            f'ABSTRACT: {abstract}',
            f'KEYWORDS: {keywords}',
            f'HTML URL DESTINATION: https://journal.chiatechsolutions.com/papers/{eid}/',
            f'PDF URL DESTINATION: https://journal.chiatechsolutions.com/papers/{eid}/CHIATECH_JOURNAL_2026_V1I1_{eid}_PIONEER_PART2.pdf',
            f'LOCAL HTML: papers/2026_V1I1_PIONEER_JULY_AUGUST_PART2/{eid}/html/{eid}.html',
            f'LOCAL PDF: papers/2026_V1I1_PIONEER_JULY_AUGUST_PART2/{eid}/pdf/CHIATECH_JOURNAL_2026_V1I1_{eid}_PIONEER_PART2.pdf',
            f'LOCAL EDITORIAL CONTROL: papers/2026_V1I1_PIONEER_JULY_AUGUST_PART2/{eid}/editorial/PART2_RECONCILIATION.md',
            f'FIGURE POLICY: {meta.get("figure_policy", "Source evidence retained; conceptual diagrams are editable pen-and-ink redraws where identified.")}',
            f'REVIEW NOTE: {note}',
            '',
        ]
    (OUT/'CHIEF_EDITOR_PART2_ALL_PAPERS_COPY_PASTE.txt').write_text('\n'.join(lines), encoding='utf-8')
    (OUT/'START_HERE.md').write_text('''# Pioneer July/August 2026 Part 2 editorial handoff\n\nThis folder contains the chief-editor copy/paste control file for e026–e058 and the controlled Part 2 package. The intended public URL pattern is `/papers/eXXX/`; direct PDFs use the matching `CHIATECH_JOURNAL_2026_V1I1_eXXX_PIONEER_PART2.pdf` filename.\n\nDOI and ISSN are intentionally pending. The package is prepared for editorial control and local release review; Netlify and Apps Script deployment remain a separate operator step.\n\nThe e035 and e046 contribution statements require final author confirmation. e031 is explicitly controlled as a complete replacement of its legacy grouped copy. e056 remains on hold because no renewable replacement manuscript was supplied; the supplied RESTORE manuscript is preserved and must not be relabelled.\n''', encoding='utf-8')
    print(f'Wrote {OUT/"CHIEF_EDITOR_PART2_ALL_PAPERS_COPY_PASTE.txt"}')

if __name__ == '__main__': main()
