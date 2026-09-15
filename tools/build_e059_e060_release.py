from pathlib import Path
from docx import Document
import hashlib, json, shutil, html

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / 'papers' / '2026_V1I1_PIONEER_JULY_AUGUST_PART2'
STATUS = 'ACCEPTED_PRODUCTION_APPROVED_PENDING_DOI_REGISTRATION'
ISSUE = 'Volume 2, Issue 1 · August 2026'
ARTICLES = {
    'e059': {
        'source': PACKAGE / 'CHIATECH_JOURNAL_2026_V1I1_SEPTEMBER_e059_Tanimu_Zachariah_PURE_BW_PRINT_FINAL.docx',
        'title': 'Testing a Motivation-Based Intervention for Mathematics and English Language Achievement among Senior Secondary School Students: A Randomized Pretest–Posttest Study Protocol',
        'authors': [{'given': 'Tanimu', 'family': 'Zachariah'}],
        'keywords': 'academic motivation; self-efficacy; Mathematics achievement; English Language achievement; randomized experiment; ANCOVA; secondary education; Nigeria',
        'abstract': 'Background: Motivation is associated with academic achievement, but the relationship is reciprocal and heterogeneous. Objective: This article specifies a reproducible protocol for testing whether a structured motivation-based intervention improves Mathematics and English Language Continuous Assessment Test performance among senior secondary students. Methods: The documented quantitative pretest-posttest randomized control-group protocol at Christ Anglican College, Gwagwalada, Abuja, specifies a proportionate sample of 100 students from an accessible population of 200, with 50 students assigned to each condition. Mathematics and English Language baseline and post-intervention scores are analysed with subject-specific ANCOVA models that adjust for corresponding pretest scores. Results: This protocol article reports no treatment-effect estimate before verified trial data are available. Contribution: The protocol separates measured motivation from the manipulated intervention and supplies an auditable framework for reporting school-based experimental evidence without overstating causal claims.',
    },
    'e060': {
        'source': PACKAGE / 'CHIATECH_JOURNAL_2026_V1I2_AUGUST_e060_Iboro_Tom_IDIM_PURE_BW_PRINT_FINAL.docx',
        'title': 'The Impact of National Cybersecurity Operations Coordination on Critical Economic Sectors and Economic Growth in Nigeria, 2000-2025: A Policy-Economic Evidence Synthesis and Evaluation Framework',
        'authors': [{'given': 'Iboro Tom', 'family': 'Idim'}],
        'keywords': 'cybersecurity economics; National Cybersecurity Coordination Centre; ngCERT; critical national information infrastructure; economic growth; operational resilience; Nigeria',
        'abstract': "Background: Nigeria's economic activity increasingly depends on networked services, creating systemic exposure to cyber disruption. Objective: This study examines how national cybersecurity operations coordination can protect critical economic sectors and support resilience while distinguishing defensible evidence from causal claims that available national time series cannot sustain. Methods: A longitudinal policy-economic evidence synthesis maps institutional milestones, economic transmission channels and an evaluation design using Nigerian laws, national coordination and incident-response materials, critical-infrastructure policy, financial-sector frameworks, ITU capability benchmarks and macroeconomic indicators. Results: Nigeria's architecture has moved toward a coordinated model centred on NCCC, ngCERT and sector CSIRTs; the 2024 CNII Order identifies thirteen critical sectors. Conclusion: Coordination is best understood as resilience infrastructure whose value lies in avoided loss, shorter disruption, faster recovery and stronger confidence. A credible growth estimate requires harmonised incident, downtime, response-time, loss and sector-output data; this article provides a reproducible evaluation framework rather than an invented treatment effect.",
    },
}

def sha(path):
    h = hashlib.sha256(); h.update(path.read_bytes()); return h.hexdigest().upper()

def body_html(doc):
    return '\n'.join(f'<p>{html.escape(p.text.strip())}</p>' for p in doc.paragraphs if p.text.strip())

def main():
    for eid, item in ARTICLES.items():
        source = item['source']
        if not source.exists():
            raise FileNotFoundError(source)
        destination = PACKAGE / eid
        if destination.exists():
            raise RuntimeError(f'Refusing to overwrite existing controlled package: {destination}')
        for name in ('source', 'manuscript', 'pdf', 'html', 'figures', 'metadata', 'editorial'):
            (destination / name).mkdir(parents=True, exist_ok=True)
        source_copy = destination / 'source' / source.name
        manuscript = destination / 'manuscript' / f'CHIATECH_JOURNAL_2026_V2I1_{eid}_AUGUST_2026_EDITORIAL_FINAL.docx'
        shutil.copy2(source, source_copy); shutil.copy2(source, manuscript)
        doc = Document(manuscript)
        doc.core_properties.subject = f'{ISSUE}; DOI pending Crossref registration; ISSN pending assignment'
        doc.core_properties.comments = 'Controlled editorial copy. A proposed DOI is not a registered DOI until successful authenticated Crossref deposit and resolution verification.'
        doc.save(manuscript)
        proposed_doi = f'10.68232/cj.{eid}'
        meta = {
            'article_id': eid, 'title': item['title'], 'author': item['authors'], 'abstract': item['abstract'], 'keywords': item['keywords'],
            'issue': ISSUE, 'volume': '2', 'issue_number': '1', 'published_online': [2026, 8], 'status': STATUS,
            'proposed_doi': proposed_doi, 'doi': '', 'doi_status': 'PENDING_REGISTRATION', 'issn': '', 'issn_status': 'PENDING_ASSIGNMENT',
            'source_file': str(source_copy.relative_to(ROOT)).replace('\\', '/'), 'source_sha256': sha(source_copy),
            'manuscript_file': str(manuscript.relative_to(ROOT)).replace('\\', '/'), 'manuscript_sha256': sha(manuscript),
            'public_version_of_record': 'NOT_CLAIMED_UNTIL_AUTHENTICATED_CROSSREF_DEPOSIT_AND_RELEASE_CHECKS_COMPLETE',
            'landing_page_url': f'https://journal.chiatechsolutions.com/papers/2026_V1I1_PIONEER_JULY_AUGUST_PART2/{eid}/html/{eid}.html',
        }
        (destination / 'metadata' / 'article_metadata.json').write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding='utf-8')
        (destination / 'metadata' / 'crossref_metadata.json').write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding='utf-8')
        (destination / 'html' / f'{eid}.html').write_text(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(item['title'])} | CHIATECH JOURNAL</title><meta name="citation_title" content="{html.escape(item['title'])}"><meta name="citation_publication_date" content="2026/08"><meta name="citation_volume" content="2"><meta name="citation_issue" content="1"><meta name="citation_firstpage" content="{eid}"><meta name="description" content="{html.escape(item['abstract'])}"><meta name="robots" content="noindex,follow"></head><body><main><p>CHIATECH JOURNAL · {ISSUE} · {eid}</p><h1>{html.escape(item['title'])}</h1><p>{html.escape('; '.join(a['given'] + ' ' + a['family'] for a in item['authors']))}</p><h2>Abstract</h2><p>{html.escape(item['abstract'])}</p><p><strong>Identifier control:</strong> proposed DOI {proposed_doi}; pending authenticated Crossref registration. ISSN pending assignment.</p>{body_html(doc)}</main></body></html>''', encoding='utf-8')
        (destination / 'recommended_citation.txt').write_text(f"{'; '.join(a['family'] + ', ' + a['given'] for a in item['authors'])}. (2026). {item['title']}. CHIATECH JOURNAL, 2(1), {eid}. Proposed DOI: {proposed_doi} (pending registration).\n", encoding='utf-8')
        (destination / 'editorial' / 'CHIEF_EDITOR_RELEASE_CONTROL.md').write_text(f'''# {eid} Chief Editor release control

- Title and author names are transcribed from the supplied manuscript and require final Chief Editor sign-off.
- Proposed DOI: `{proposed_doi}`. It is not a registered or resolvable DOI until authenticated Crossref deposit succeeds and the target landing page resolves.
- ISSN status: pending assignment. No ISSN has been invented.
- Required before public release: author approval, ethics/declarations review, PDF render QA, Crossref deposit acceptance, DOI-resolution check, and production landing-page deployment check.
''', encoding='utf-8')
        print(f'Built {eid}: {destination}')

if __name__ == '__main__':
    main()
