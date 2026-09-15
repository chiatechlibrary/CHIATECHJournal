from pathlib import Path
import json, html

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'CROSSREF_JULY_AUGUST_AUDIT_2026-09-10'
PAYLOAD_PATH = OUT / 'CROSSREF_DEPOSIT_V2I1_AUGUST_2026.json'
PREFIX = '10.68232'
BASE = 'https://journal.chiatechsolutions.com'

def article(eid):
    meta = json.loads((ROOT / 'papers' / '2026_V1I1_PIONEER_JULY_AUGUST_PART2' / eid / 'metadata' / 'crossref_metadata.json').read_text(encoding='utf-8'))
    return {'article_id': eid, 'title': meta['title'], 'author': meta['author'], 'author_source_text': '; '.join(f"{x['given']} {x['family']}" for x in meta['author']), 'abstract': meta['abstract'], 'abstract_status': 'READY_FOR_CHIEF_EDITOR_CONFIRMATION', 'keywords': meta['keywords'], 'proposed_doi': f'{PREFIX}/cj.{eid}', 'doi_status': 'PENDING_REGISTRATION', 'container_title': 'CHIATECH JOURNAL', 'volume': '2', 'issue': '1', 'published_online': [2026, 8], 'URL': f'{BASE}/papers/2026_V1I1_PIONEER_JULY_AUGUST_PART2/{eid}/html/{eid}.html', 'url_path_policy': 'STABLE_LEGACY_PATH; bibliographic issue metadata is authoritative', 'source_package': 'controlled Part 2 August package'}

def xml_record(record, index):
    contributors = ''.join(f'<person_name sequence="{"first" if i == 0 else "additional"}" contributor_role="author"><given_name>{html.escape(a["given"])}</given_name><surname>{html.escape(a["family"])}</surname></person_name>' for i, a in enumerate(record['author']))
    return f'<journal_article publication_type="full_text"><titles><title>{html.escape(record["title"])}</title></titles><contributors>{contributors}</contributors><publication_date media_type="online"><month>08</month><year>2026</year></publication_date><publisher_item><item_number item_number_type="article_number">{record["article_id"]}</item_number></publisher_item><doi_data><doi>{record["proposed_doi"]}</doi><resource>{record["URL"]}</resource></doi_data></journal_article>'

def main():
    payload = json.loads(PAYLOAD_PATH.read_text(encoding='utf-8'))
    payload['records'] = [r for r in payload['records'] if r['article_id'] not in {'e059', 'e060'}] + [article('e059'), article('e060')]
    payload['doi_status'] = 'PENDING_REGISTRATION'
    PAYLOAD_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding='utf-8')
    records = payload['records']
    xml = '<?xml version="1.0" encoding="UTF-8"?><doi_batch version="5.5.0" xmlns="http://www.crossref.org/schema/5.5.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.crossref.org/schema/5.5.0 https://data.crossref.org/schemas/crossref5.5.0.xsd"><head><doi_batch_id>chiatech-v2i1-20260913-r02</doi_batch_id><timestamp>20260913000000</timestamp><depositor><depositor_name>CHIA TECH SOLUTIONS AND RESOURCES LIMITED</depositor_name><email_address>chiatechlibrary@gmail.com</email_address></depositor><registrant>CHIA TECH SOLUTIONS AND RESOURCES LIMITED</registrant></head><body><journal><journal_metadata><full_title>CHIATECH JOURNAL</full_title><title>CHIATECH JOURNAL</title></journal_metadata><journal_issue><publication_date media_type="online"><month>08</month><year>2026</year></publication_date><journal_volume><volume>2</volume></journal_volume><issue>1</issue>' + ''.join(xml_record(r, i) for i, r in enumerate(records)) + '</journal_issue></journal></body></doi_batch>'
    (OUT / 'CROSSREF_DEPOSIT_V2I1_AUGUST_2026.xml').write_text(xml, encoding='utf-8')
    issues = {'paper_count': len(records), 'issues': [], 'interpretation': 'All records are internal Crossref staging only. Proposed DOI values remain PENDING_REGISTRATION until authenticated deposit acceptance and resolver checks.'}
    (OUT / 'CROSSREF_RECONCILIATION_ISSUES.json').write_text(json.dumps(issues, indent=2), encoding='utf-8')
    (OUT / 'CROSSREF_DEPOSIT_README.md').write_text('# Crossref deposit staging — CHIATECH JOURNAL\n\n- Member: CHIA TECH SOLUTIONS AND RESOURCES LIMITED\n- DOI prefix: `10.68232`\n- Intended issue metadata: Volume 2, Issue 1, August 2026\n- Records: 60 (e001–e060)\n- Crossref XML schema target: `5.5.0`\n- DOI status: **PENDING_REGISTRATION**. A proposed suffix is not a registered DOI.\n- ISSN Print, ISSN Online and ISSN-L: pending assignment/designation.\n\nThe XML is a controlled staging file. Validate it, obtain Chief Editor approval, use the authenticated Crossref deposit account, and confirm every returned DOI resolves to its intended public landing page before calling any identifier registered.\n', encoding='utf-8')
    print(f'Crossref staging refreshed with {len(records)} records.')

if __name__ == '__main__':
    main()
