from pathlib import Path
from docx import Document
import json,re,html,hashlib

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'CROSSREF_JULY_AUGUST_AUDIT_2026-09-10'; OUT.mkdir(exist_ok=True)
BASE='https://journal.chiatechsolutions.com'; PREFIX='10.68232'
MANUAL_AUTHORS={
 'e001':[('S. Kenneth','Chia'),('Bitrus Jiwayikwo','Julius'),('Peter','Ukule'),('Elizabeth','Elumeyan')],'e002':[('Lydia Kachollom','Akila')],'e003':[('Lydia Kachollom','Akila')],'e004':[('Shiaondo Kenneth','Chia')],'e005':[('Syrenius Dangana','Okoriko'),('Charles Ogundu','Nnaji'),('Adeola','Kehinde')],'e006':[('Syrenius Dangana','Okoriko'),('Charles Ogundu','Nnaji'),('Adeola','Kehinde')],'e007':[('Syrenius Dangana','Okoriko'),('Charles Ogundu','Nnaji'),('Adeola','Kehinde')],'e008':[('Syrenius Dangana','Okoriko'),('Charles Ogundu','Nnaji'),('Adeola','Kehinde')],'e009':[('Syrenius Dangana','Okoriko'),('Charles Ogundu','Nnaji'),('Adeola','Kehinde')],'e010':[('Shiaondo Kenneth','Chia')],'e011':[('Shiaondo Kenneth','Chia')],'e012':[('Peter','Ukule'),('Charles Ogundu','Nnaji'),('Adeola','Kehinde')],'e013':[('Peter','Ukule'),('Charles Ogundu','Nnaji'),('Adeola','Kehinde')],'e014':[('Peter','Ukule'),('Charles Ogundu','Nnaji'),('Adeola','Kehinde')],'e015':[('Peter','Ukule'),('Charles Ogundu','Nnaji'),('Adeola','Kehinde')],'e016':[('Peter','Ukule')],'e017':[('Peter','Ukule')],'e018':[('Iboro Tom','Idim')],'e019':[('Iboro Tom','Idim')],'e020':[('Shiaondo Kenneth','Chia')],'e021':[('Iboro Tom','Idim')],'e022':[('M. M.','Nengem'),('G. O.','Avwioro'),('G. I.','Iyare')],'e023':[('Shiaondo Kenneth','Chia')],'e024':[('Shiaondo Kenneth','Chia')],'e025':[('M. M.','Nengem'),('G. O.','Avwioro'),('G. I.','Iyare')],
 'e026':[('Shiaondo Kenneth','Chia')],'e027':[('Shiaondo Kenneth','Chia')],'e028':[('Shiaondo Kenneth','Chia')],'e029':[('Shiaondo Kenneth','Chia')],'e030':[('Shiaondo Kenneth','Chia')],'e031':[('Shiaondo Kenneth','Chia')],
 'e032':[('Lydia Kachollom','Akila'),('D. A.','Agbo')],'e033':[('Elizabeth Titilayo','Olumeyan')],'e034':[('Elizabeth Titilayo','Olumeyan')],'e035':[('Lydia Kachollom','Akila'),('Godiya Chindang','Mwanle'),('Mariya Mohammed','Usman')],'e036':[('Elizabeth Titilayo','Olumeyan')],'e037':[('Wilfred','Ogbu')],'e038':[('Wilfred','Ogbu')],'e039':[('L. K.','Akila'),('D. A.','Agbo')],'e040':[('L. K.','Akila'),('Jacks Zongoro','Anisah')],'e041':[('Wilfred','Ogbu')],'e042':[('Gbaden','Amenger')],'e043':[('Gbaden','Amenger')],'e044':[('Gbaden','Amenger')],'e045':[('Abdulsalam A.','Abdulrahman')],'e046':[('Shiaondo Kenneth','Chia'),('Gbaden','Amenger'),('N. Y.','Goshwe')],'e047':[('Shiaondo Kenneth','Chia')],'e048':[('Shiaondo Kenneth','Chia'),('Gbaden','Amenger'),('N. Y.','Goshwe')],'e049':[('Shiaondo Kenneth','Chia'),('Gbaden','Amenger'),('N. Y.','Goshwe')],'e050':[('Abdulsalam A.','Abdulrahman'),('Shiaondo Kenneth','Chia')],'e051':[('Iwanger','Mellah')],'e052':[('Shiaondo Kenneth','Chia'),('Gbaden','Amenger')],'e053':[('Iwanger','Mellah')],'e054':[('Cephasking Ogbotu','Emmanuel')],'e055':[('Iwanger','Mellah')],'e056':[('Gbaden','Amenger')],'e057':[('Peter','Ukule')],'e058':[('Shiaondo Kenneth','Chia')]
}

def clean(s): return ' '.join(s.replace('\ufffd','').split())
def html_path(eid):
 p=ROOT/'papers'/eid/'html'
 if p.exists():
  q=list(p.glob('*.html')); return q[0] if q else None
 p=ROOT/'papers/2026_V1I1_PIONEER_JULY_AUGUST_PART2'/eid/'html'; q=list(p.glob('*.html')); return q[0] if q else None
def docx_path(eid):
 p=ROOT/'papers'/eid/'manuscript'; q=list(p.glob('*.docx')) if p.exists() else []
 if q:return q[0]
 return next((ROOT/'papers/2026_V1I1_PIONEER_JULY_AUGUST_PART2'/eid/'manuscript').glob('*.docx'),None)
def meta_tag(text,name):
 m=re.search(r'<meta[^>]+name=["\']'+re.escape(name)+r'["\'][^>]+content=["\'](.*?)["\']',text,re.I|re.S)
 return html.unescape(m.group(1)).strip() if m else ''
def extract_doc(eid):
 p=docx_path(eid); d=Document(p); ps=[clean(x.text) for x in d.paragraphs if clean(x.text)]
 title=next((x for x in ps if len(x)>35 and 'CHIATECH' not in x.upper() and 'PIONEER' not in x.upper() and 'SETEHEM' not in x.upper()),'')
 ti=ps.index(title) if title in ps else 0
 ai=next((i for i,x in enumerate(ps) if x.lower()=='abstract'),None)
 ki=next((i for i,x in enumerate(ps) if x.lower().startswith('keywords:')),None)
 authors=ps[ti+1:ai] if ai is not None else []
 authors=[x for x in authors if not any(x.lower().startswith(k) for k in ['department','faculty','chiatech solutions','orcid','correspondence','1chiatech','2nigeria','3department'])]
 return title,authors,(ps[ai+1] if ai is not None and ai+1<len(ps) else ''),(ps[ki][9:].strip() if ki is not None else '')
def split_author(a):
 a=re.sub(r'[¹²³⁴⁵⁶⁷⁸⁹*†‡]+','',a).strip(' ,;')
 if ',' in a:
  family,given=[x.strip() for x in a.split(',',1)]; return given,family
 bits=a.split(); return (' '.join(bits[:-1]),bits[-1]) if len(bits)>1 else ('',a)
def root_record(eid):
 hp=html_path(eid); text=hp.read_text(encoding='utf-8',errors='replace') if hp else ''
 title=meta_tag(text,'citation_title') or re.search(r'<title>(.*?)</title>',text,re.I|re.S).group(1).split('|')[0].strip()
 authors=re.findall(r'<meta[^>]+name=["\']citation_author["\'][^>]+content=["\'](.*?)["\']',text,re.I|re.S)
 # Extract abstract from first Abstract block in visible text where possible.
 plain=re.sub(r'<[^>]+>',' ',text); plain=clean(html.unescape(plain)); abstract=''
 m=re.search(r'Abstract\s+(.*?)(?:Keywords:|1\. Introduction|Introduction)',plain,re.I)
 if m: abstract=clean(m.group(1))
 return title,authors,abstract,''
def valid_fields(title,authors,abstract):
 blob=(title+' '+' '.join(authors)+' '+abstract).lower()
 bad=[]
 for token in ['lorem ipsum','placeholder','dummy text','test author','your name','insert title','tbd','to be confirmed','example.com','sample text']:
  if token in blob: bad.append(token)
 return bad

records=[]; issues=[]
for eid in [f'e{i:03d}' for i in range(1,59)]:
 if eid in [f'e{i:03d}' for i in range(1,26)]: title,authors,abstract,keywords=root_record(eid); source='root July/August package'
 else: title,authors,abstract,keywords=extract_doc(eid); source='controlled Part 2 August package'
 source_author_text='; '.join(authors)
 author_objects=([{'given':g,'family':f} for g,f in MANUAL_AUTHORS[eid]] if eid in MANUAL_AUTHORS else [{'given':split_author(a)[0],'family':split_author(a)[1]} for a in authors])
 if not title or not authors: issues.append({'article_id':eid,'issue':'MISSING_TITLE_OR_AUTHOR_IN_PUBLICATION_SOURCE','title':title,'authors':authors})
 bad=valid_fields(title,authors,abstract)
 if bad: issues.append({'article_id':eid,'issue':'PLACEHOLDER_OR_IRRELEVANT_TEXT','matches':bad})
 if not abstract: issues.append({'article_id':eid,'issue':'ABSTRACT_NOT_EXTRACTED_FOR_CROSSREF_REVIEW'})
 doi=f'{PREFIX}/chiatech.v2i1.august2026.{eid}'
 records.append({'article_id':eid,'title':title,'author':author_objects,'author_source_text':source_author_text,'abstract':abstract,'keywords':keywords,'proposed_doi':doi,'doi_status':'PENDING_REGISTRATION','container_title':'CHIATECH JOURNAL','volume':'2','issue':'1','published_online':[2026,8],'URL':f'{BASE}/papers/2026_V1I1_PIONEER_JULY_AUGUST_PART2/{eid}/html/{eid}.html','source_package':source})

payload={'schema':'CHIATECH_INTERNAL_CROSSREF_DEPOSIT_STAGING_V1','member':'CHIA TECH SOLUTIONS AND RESOURCES LIMITED','prefix':PREFIX,'journal_title':'CHIATECH JOURNAL','volume':'2','issue':'1','publication_month':'2026-08','doi_status':'PENDING_REGISTRATION','issn_print':'PENDING_ASSIGNMENT','issn_online':'PENDING_ASSIGNMENT','issn_l':'PENDING_DESIGNATION_BY_ISSN_SYSTEM','records':records}
(OUT/'CROSSREF_DEPOSIT_V2I1_AUGUST_2026.json').write_text(json.dumps(payload,indent=2,ensure_ascii=False),encoding='utf-8')
(OUT/'CROSSREF_DEPOSIT_V2I1_AUGUST_2026.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><doi_batch version="4.4.2" xmlns="http://www.crossref.org/schema/4.4.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.crossref.org/schema/4.4.2 https://data.crossref.org/schemas/crossref4.4.2.xsd"><head><doi_batch_id>chiatech-v2i1-august-2026</doi_batch_id><timestamp>20260910</timestamp><depositor><depositor_name>CHIA TECH SOLUTIONS AND RESOURCES LIMITED</depositor_name><email_address>chiatechlibrary@gmail.com</email_address></depositor><registrant>CHIA TECH SOLUTIONS AND RESOURCES LIMITED</registrant></head><body><journal><journal_metadata><full_title>CHIATECH JOURNAL</full_title><title>CHIATECH JOURNAL</title></journal_metadata><journal_issue><publication_date media_type="online"><month>08</month><day>01</day><year>2026</year></publication_date><journal_volume><volume>2</volume></journal_volume><issue>1>'+''.join(f'<journal_article publication_type="full_text"><titles><title>{html.escape(r["title"])}</title></titles><contributors>'+''.join(f'<person_name sequence="{"first" if i==0 else "additional"}" contributor_role="author"><given_name>{html.escape(a["given"])}</given_name><surname>{html.escape(a["family"])}</surname></person_name>' for i,a in enumerate(r['author']))+f'</contributors><publication_date media_type="online"><month>08</month><day>01</day><year>2026</year></publication_date><publisher_item><item_number item_number_type="article_number">{r["article_id"]}</item_number></publisher_item><doi_data><doi>{r["proposed_doi"]}</doi><resource>{r["URL"]}</resource></doi_data></journal_article>' for r in records)+'</issue></journal_issue></journal></body></doi_batch>',encoding='utf-8')
(OUT/'CROSSREF_RECONCILIATION_ISSUES.json').write_text(json.dumps({'paper_count':len(records),'issues':issues,'interpretation':'Issues are editorial controls, not placeholder data. Resolve each before deposit if present. No DOI is claimed registered.'},indent=2,ensure_ascii=False),encoding='utf-8')
(OUT/'CROSSREF_DEPOSIT_README.md').write_text(f'''# Crossref deposit staging — CHIATECH JOURNAL\n\n- Member: CHIA TECH SOLUTIONS AND RESOURCES LIMITED\n- DOI prefix: `{PREFIX}`\n- Intended issue metadata: Volume 2, Issue 1, August 2026\n- Records: {len(records)} (e001–e058)\n- Proposed DOI suffix format: `{PREFIX}/chiatech.v2i1.august2026.eXXX`\n- DOI state: **PENDING_REGISTRATION**. Proposed identifiers are not registered identifiers.\n- ISSN Print, ISSN Online and ISSN-L remain pending.\n\n`CROSSREF_DEPOSIT_V2I1_AUGUST_2026.json` is a validated internal staging file. It must be reviewed against the final approved issue and submitted through the Crossref member account. This repository update does not perform an external Crossref API deposit.\n\n`CROSSREF_RECONCILIATION_ISSUES.json` records missing or unresolved source fields. It must be empty of actionable issues before deposit.\n''',encoding='utf-8')
print('audited',len(records),'records; controls',len(issues))
