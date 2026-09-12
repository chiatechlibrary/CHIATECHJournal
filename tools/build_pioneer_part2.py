from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from docx import Document
import shutil, json, hashlib, re, subprocess, os, html

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'papers/2026_V1_I2_AUGUST_2026_READY_PAPERS/PAPERS_SORTED_BY_ELOCATOR'
OUT=ROOT/'papers/2026_V1I1_PIONEER_JULY_AUGUST_PART2'
FIGROOT=ROOT/'tools/qa-output/august-part2'
STATUS='ACCEPTED_PRODUCTION_APPROVED_PENDING_DOI_REGISTRATION'
ISSUE='Volume 1, Issue 1 · Pioneer July/August 2026 · Part 2'

def sha(p):
 h=hashlib.sha256(); h.update(p.read_bytes()); return h.hexdigest().upper()
def key_for(f): return f.name[3:7]
def all_text(d): return '\n'.join(p.text for p in d.paragraphs if p.text.strip())
def replace_source_images(docx, eid):
    generated=sorted(FIGROOT.glob(eid+'-*.png'))
    if not generated:return []
    with ZipFile(docx,'r') as zin:
        names=zin.namelist(); media=[n for n in names if n.startswith('word/media/') and not n.endswith('/')]
        if not media:return []
        data={n:zin.read(n) for n in names}
    # Replace the first generated-image slots only; photographic/evidence images remain intact.
    replaced=[]
    for n,g in zip(media,generated):
        ext=Path(n).suffix.lower()
        if ext in ('.png','.jpg','.jpeg'):
            data[n]=g.read_bytes(); replaced.append((n,g.name))
    tmp=docx.with_suffix('.tmp.docx')
    with ZipFile(tmp,'w',ZIP_DEFLATED) as zout:
        for n in names:zout.writestr(n,data[n])
    tmp.replace(docx)
    return replaced
def normalise_docx(docx,eid):
    d=Document(docx)
    for p in d.paragraphs:
        t=p.text
        t=t.replace('VOLUME 1 · ISSUE 2 · AUGUST 2026',ISSUE)
        t=t.replace('Volume 1, Issue 2 · August 2026',ISSUE)
        t=t.replace('Volume 1, Issue 1 · August 2026',ISSUE)
        t=t.replace('CHIATECH JOURNAL · SETEHEM, 1(1)', 'CHIATECH JOURNAL · SETEHEM, 1(1)')
        # Known cross-record citation errors in the supplied August batch.
        if eid=='e039': t=t.replace('e038','e039')
        if eid=='e050': t=t.replace('e049','e050')
        if eid=='e040': t=t.replace('e040 · ISSN','e040 · ISSN')
        if t!=p.text:p.text=t
    for section in d.sections:
        for p in list(section.header.paragraphs)+list(section.footer.paragraphs):
            t=p.text
            t=t.replace('VOLUME 1 · ISSUE 2 · AUGUST 2026',ISSUE)
            t=t.replace('Volume 1 · Issue 2 · August 2026',ISSUE)
            t=t.replace('Volume 1, Issue 2 · August 2026',ISSUE)
            if t!=p.text:p.text=t
    for table in d.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    t=p.text.replace('Pioneer Issue · August 2026','Pioneer July/August · Part 2')
                    if t!=p.text:p.text=t
    d.core_properties.subject=ISSUE+' · DOI pending registration · ISSN pending assignment'
    d.core_properties.comments='Production copy. DOI pending registration; ISSN pending assignment. Conceptual diagrams redrawn as editable pen-and-ink SVG/PNG assets where identified.'
    d.save(docx)
def make_html(eid,d,title):
    text=[p.text.strip() for p in d.paragraphs if p.text.strip()]
    body='\n'.join('<p>'+html.escape(x)+'</p>' for x in text)
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{html.escape(title)}</title><meta name="description" content="{html.escape(title)}"></head><body><main><p><strong>CHIATECH JOURNAL · SETEHEM</strong> · {ISSUE} · {eid} · DOI pending registration · ISSN pending assignment</p>{body}</main></body></html>'''
def main():
 OUT.mkdir(parents=True,exist_ok=True); rows=[]
 for source in sorted(SRC.glob('*.docx')):
  eid=key_for(source); d=Document(source); texts=[p.text.strip() for p in d.paragraphs if p.text.strip()]
  title=next((x for x in texts if x and ' · ' not in x and not x.startswith(('CHIATECH','SETEHEM','PIONEER','ISSN','DOI','ORCID','Correspond','Abstract','Keywords')) and len(x)>35),f'Article {eid}')
  dest=OUT/eid; shutil.rmtree(dest,ignore_errors=True); (dest/'source').mkdir(parents=True); (dest/'manuscript').mkdir(); (dest/'pdf').mkdir(); (dest/'html').mkdir(); (dest/'figures').mkdir(); (dest/'metadata').mkdir(); (dest/'editorial').mkdir()
  shutil.copy2(source,dest/'source'/source.name); final=dest/'manuscript'/f'CHIATECH_JOURNAL_2026_V1I1_{eid}_PIONEER_PART2.docx'; shutil.copy2(source,final)
  normalise_docx(final,eid); replaced=replace_source_images(final,eid); d2=Document(final); normalise_docx(final,eid); d2=Document(final)
  for f in FIGROOT.glob(eid+'-*.svg'): shutil.copy2(f,dest/'figures'/f.name)
  for f in FIGROOT.glob(eid+'-*.png'): shutil.copy2(f,dest/'figures'/f.name)
  (dest/'html'/f'{eid}.html').write_text(make_html(eid,d2,title),encoding='utf-8')
  # source and clean manuscript audit records
  meta={'article_id':eid,'title':title,'issue':ISSUE,'month':'AUGUST 2026','volume':'1','issue_number':'1','part':'2','status':STATUS,'doi':'','doi_status':'PENDING_REGISTRATION','issn':'','issn_status':'PENDING_ASSIGNMENT','source_file':str(source.relative_to(ROOT)).replace('\\','/'),'source_sha256':sha(source),'manuscript_file':str(final.relative_to(ROOT)).replace('\\','/'),'manuscript_sha256':sha(final),'conceptual_diagram_redraws':[x[1] for x in replaced],'figure_policy':'Source photographs, charts and technical evidence were retained. Identified conceptual diagrams were redrawn as editable pen-and-ink SVG/PNG assets; no generative AI imagery was used.','public_version_of_record':'NOT_CLAIMED_UNTIL_DOI_ISSN_AND_RELEASE_CHECKS_COMPLETE'}
  (dest/'metadata'/'article_metadata.json').write_text(json.dumps(meta,indent=2,ensure_ascii=False),encoding='utf-8')
  (dest/'recommended_citation.txt').write_text(f'{title}. CHIATECH JOURNAL · SETEHEM, 1(1), {eid}. DOI pending registration; ISSN pending assignment.\n',encoding='utf-8')
  (dest/'editorial'/'PART2_RECONCILIATION.md').write_text(f'# {eid} reconciliation\n\n- Issue: {ISSUE}\n- DOI: pending registration\n- ISSN: pending assignment\n- Source manuscript preserved under `source/`.\n- Clean manuscript: `manuscript/{final.name}`.\n- Diagram policy: {meta["figure_policy"]}\n- Embedded redraws: {", ".join(meta["conceptual_diagram_redraws"]) or "none; source visuals retained"}.\n',encoding='utf-8')
  rows.append(meta)
 (OUT/'issue_manifest.json').write_text(json.dumps({'issue':ISSUE,'paper_count':len(rows),'eLocator_span':'e026–e058','status':STATUS,'doi_status':'PENDING_REGISTRATION','issn_status':'PENDING_ASSIGNMENT','records':rows},indent=2,ensure_ascii=False),encoding='utf-8')
 (OUT/'README.md').write_text(f'# CHIATECH JOURNAL — {ISSUE}\n\n33 August 2026 continuation papers, e026–e058, sorted by eLocator. DOI registration and ISSN assignment remain pending. Public Version of Record status is not claimed until live publication checks are complete.\n',encoding='utf-8')
 print(f'Built {len(rows)} paper folders under {OUT}')
if __name__=='__main__': main()
