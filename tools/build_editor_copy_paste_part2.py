from pathlib import Path
import json
from docx import Document

ROOT = Path(__file__).resolve().parents[1]
PKG = ROOT / 'papers/2026_V1I1_PIONEER_JULY_AUGUST_PART2'
OUT = ROOT / 'PIONEER_UPDATE_2026-09-15'
SPECIAL = {
    'e035': ('AUTHOR CONTRIBUTION HOLD: Confirm contribution roles with all authors before release.', 'AUTHOR_CONFIRMATION_REQUIRED'),
    'e046': ('AUTHOR CONTRIBUTION CONTROL: Obtain all-author confirmation in the final proof.', 'EDITORIAL_STATEMENT_REQUIRES_ALL_AUTHOR_CONFIRMATION'),
    'e031': ('MANUSCRIPT CONTROL: Current manuscript replaces the legacy grouped copy; retain the legacy copy only for provenance.', 'CURRENT_MANUSCRIPT_REPLACES_LEGACY_GROUPED_COPY'),
    'e056': ('EDITORIAL HOLD: The requested renewable-paper replacement source was not supplied. Do not relabel or substitute e044 without the intended source and author authorization.', 'RENEWABLE_SOURCE_NOT_SUPPLIED'),
}

def clean(value): return ' '.join(str(value or '').replace('\ufffd', '').split())

def extract(eid, meta):
    doc = Document(next((PKG/eid/'manuscript').glob('*.docx')))
    paras = [clean(p.text) for p in doc.paragraphs if clean(p.text)]
    title = clean(meta.get('title'))
    if title not in paras:
        title = next((p for p in paras if len(p) > 35 and 'PIONEER' not in p.upper() and 'CHIATECH' not in p.upper()), title)
    ti = paras.index(title) if title in paras else 0
    abstract_i = next((i for i,p in enumerate(paras) if p.lower() == 'abstract'), None)
    keywords_i = next((i for i,p in enumerate(paras) if p.lower().startswith('keywords:')), None)
    authors = paras[ti + 1:abstract_i] if abstract_i is not None else []
    ignored = ('orcid:', 'correspondence:', 'department', 'faculty', 'chiatech solutions', '1chiatech', '2nigeria', '3department')
    authors = [p for p in authors if not p.lower().startswith(ignored)]
    abstract = paras[abstract_i + 1] if abstract_i is not None and abstract_i + 1 < len(paras) else ''
    keywords = paras[keywords_i][len('Keywords:'):].strip() if keywords_i is not None else ''
    return title, authors, abstract, keywords

def metadata(eid): return json.loads((PKG/eid/'metadata/article_metadata.json').read_text(encoding='utf-8'))

def article_block(eid, registered):
    meta = metadata(eid); title, authors, abstract, keywords = extract(eid, meta)
    note, state = SPECIAL.get(eid, ('Confirm final proof, author metadata, rights and release evidence before publication.', 'EDITORIAL_PROOF_CHECK_REQUIRED'))
    doi = f'10.68232/cj.{eid}' if registered else ''
    status = 'REGISTERED DOI ASSIGNED' if registered else 'PENDING REGISTRATION'
    confirmation = 'TRUE ONLY AFTER CHIEF EDITOR HAS VERIFIED DEPLOYED HTML AND MATCHING PDF' if registered else 'FALSE UNTIL THE POST REGISTRATION RELEASE CHECK IS COMPLETED'
    return ['=' * 96, f'ARTICLE ID / STABLE ARTICLE ID: {eid}', 'ARTICLE TYPE: Original research', f'ARTICLE TITLE: {title}', 'SETEHEM PORTFOLIO: [SELECT AFTER CHIEF EDITOR SUBJECT CLASSIFICATION]', 'LANGUAGE: English', 'AUTHORS IN PUBLICATION ORDER:', *[f'  - {a}' for a in authors], 'AUTHOR AFFILIATIONS: [COPY EXACTLY FROM FINAL AUTHOR APPROVED PROOF]', 'ORCID iD: [ENTER ONLY AUTHOR VERIFIED ORCID iDs]', f'ABSTRACT: {abstract}', f'KEYWORDS: {keywords}', 'RECEIVED: [ENTER AUTHENTIC DATE]', 'REVISED: [ENTER AUTHENTIC DATE OR LEAVE BLANK IF NOT APPLICABLE]', 'ACCEPTED: [ENTER AUTHENTIC DATE]', 'PUBLISHED: [ENTER ACTUAL DEPLOYMENT DATE AFTER RELEASE]', 'VOLUME: 2', 'ISSUE: 1', 'ISSUE / COLLECTION TITLE: August 2026 Pioneer Publication Part 2', f'eLOCATOR: {eid}', 'PAGE RANGE: [LEAVE BLANK FOR eLOCATOR ONLY ARTICLE]', f'REGISTERED ARTICLE DOI: {doi or "LEAVE BLANK"}', f'DOI PUBLICATION STATUS: {status}', 'LICENCE: CC BY 4.0', 'LICENCE URL: https://creativecommons.org/licenses/by/4.0/', 'COPYRIGHT HOLDER: The author(s)', f'APPROVED FULL PAPER HTML URL: https://journal.chiatechsolutions.com/papers/{eid}/', f'HTML CONFIRMATION: {confirmation}', f'AUTHORISED PDF READER URL: https://journal.chiatechsolutions.com/papers/{eid}/CHIATECH_JOURNAL_2026_V1I1_{eid}_PIONEER_PART2.pdf', f'DIRECT PDF DOWNLOAD URL: https://journal.chiatechsolutions.com/papers/{eid}/CHIATECH_JOURNAL_2026_V1I1_{eid}_PIONEER_PART2.pdf', f'PDF CONFIRMATION: {confirmation}', 'PUBLIC VIDEO TITLE: [REQUIRED BEFORE PORTAL PUBLICATION]', 'DIRECT VIDEO URL: [REQUIRED BEFORE PORTAL PUBLICATION]', 'POSTER IMAGE URL: [OPTIONAL RIGHTS CLEARED IMAGE]', 'WEBVTT CAPTIONS URL: [REQUIRED UNLESS ACCESSIBLE TRANSCRIPT URL IS PROVIDED]', 'ACCESSIBLE TRANSCRIPT URL: [REQUIRED UNLESS WEBVTT CAPTIONS URL IS PROVIDED]', f'VIDEO CONFIRMATION: {confirmation}', f'EDITORIAL STATE: {state}', f'EDITORIAL NOTE: {note}', 'RELEASE DECISION: DO NOT PUBLISH UNTIL EVERY BRACKETED FIELD, CONFIRMATION AND REQUIRED EVIDENCE IS COMPLETE.', '']

def write_file(path, registered):
    heading = 'REGISTERED DOI ACTIVATION COPY' if registered else 'PENDING DOI COPY'
    lines = ['CHIATECH JOURNAL CHIEF EDITOR COPY PASTE CONTROL', f'PIONEER PART 2 e026 TO e060 {heading}', '', 'This is an editorial control file, not evidence of publication. It includes every field from the secure Editorial Control Centre.', ('Use only after Crossref confirms the deposit and each DOI resolves to its exact deployed landing page.' if registered else 'Use before DOI registration. Proposed suffixes are deliberately omitted from the Registered Article DOI field; do not enter or link a DOI until Crossref acceptance and resolver checks are complete.'), 'ISSN Print, ISSN Online and ISSN L remain pending and must not be invented.', '']
    for number in range(26, 61): lines.extend(article_block(f'e{number:03d}', registered))
    path.write_text('\n'.join(lines), encoding='utf-8')

def main():
    OUT.mkdir(exist_ok=True)
    for number in range(26, 61):
        eid = f'e{number:03d}'
        if not (PKG/eid/'metadata/article_metadata.json').exists(): raise FileNotFoundError(f'Missing controlled metadata for {eid}')
    write_file(OUT/'CHIEF_EDITOR_PIONEER_PART2_e026_e060_PENDING_DOI_COPY_PASTE.txt', False)
    write_file(OUT/'CHIEF_EDITOR_PIONEER_PART2_e026_e060_REGISTERED_DOI_COPY_PASTE.txt', True)
    print(f'Wrote two all fields control files in {OUT}')

if __name__ == '__main__': main()
