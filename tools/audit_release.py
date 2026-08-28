"""Audit the actual Netlify public build and safe Git candidates without printing secrets."""
import argparse
import ast
import hashlib
import io
import json
import os
import re
import subprocess
import tempfile
import tomllib
from collections import Counter
from pathlib import Path
from urllib.parse import unquote, urlsplit
from zipfile import ZipFile
from lxml import etree, html

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--git',default='git')
parser.add_argument('--node',default='node')
parser.add_argument('--staged',action='store_true')
args=parser.parse_args()
errors=[]
def fail(message): errors.append(message)
def run(command): return subprocess.run(command,cwd=ROOT,text=True,encoding='utf-8',capture_output=True)

result=run([args.git,'ls-files','--cached'] if args.staged else [args.git,'ls-files','--cached','--others','--exclude-standard'])
if result.returncode: raise SystemExit('Cannot inspect the Git candidate set')
candidates=sorted(set(result.stdout.splitlines()))
protected=('articles/2026/','articles/JULY 2026/','articles/_editorial_work/',"don't push/",'dist/','.agents/','tools/qa-output/','tools/browser-qa','tools/docx-render','tools/docx-staging','tools/a11y-')
secret_patterns={
 'apps-script-deployment':r'https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/(?:exec|dev)',
 'private-key':r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
 'github-token':r'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}',
 'google-api-key':r'AIza[A-Za-z0-9_-]{30,}',
 'sheet-url':r'https://docs\.google\.com/spreadsheets/d/[A-Za-z0-9_-]{25,}',
 'configured-sheet':r'''DATABASE_SHEET_ID\s*[:=]\s*["'][A-Za-z0-9_-]{25,}["']''',
 'activation-link':r'https://[^\s"<>]+/portal/editor-access/\?token=[A-Za-z0-9_-]{20,}'
}
hashes={}
staged_blobs={}
if args.staged:
 listing=subprocess.run([args.git,'ls-files','--stage','-z'],cwd=ROOT,capture_output=True,check=True).stdout
 entries=[]
 for entry in listing.split(b'\0'):
  if not entry: continue
  meta,name=entry.split(b'\t',1); mode,oid,stage=meta.split()
  if stage!=b'0': fail('Unmerged Git index entry');continue
  entries.append((name.decode('utf-8'),oid))
 batch=subprocess.run([args.git,'cat-file','--batch'],input=b'\n'.join(oid for _,oid in entries)+b'\n',cwd=ROOT,capture_output=True,check=True).stdout
 reader=io.BytesIO(batch)
 for name,oid in entries:
  header=reader.readline().split()
  if len(header)!=3 or header[1]!=b'blob': raise SystemExit('Cannot read staged blob safely')
  staged_blobs[name]=reader.read(int(header[2]));reader.read(1)
for name in candidates:
 p=ROOT/name
 if name.startswith(protected) or p.name.startswith(('~$','.env')) or p.suffix.lower() in {'.pem','.key','.p12','.pfx','.crt','.log'}: fail(f'Prohibited Git candidate: {name}')
 if not p.is_file(): continue
 data=staged_blobs[name] if args.staged else p.read_bytes()
 hashes[name]=hashlib.sha256(data).hexdigest()
 streams=[]
 if p.suffix.lower()=='.docx':
  with ZipFile(io.BytesIO(data)) as z: streams=[z.read(n).decode('utf-8') for n in z.namelist() if n.endswith(('.xml','.rels'))]
 else:
  try: streams=[data.decode('utf-8-sig')]
  except UnicodeError: pass
 for text in streams:
  for label,pattern in secret_patterns.items():
   if re.search(pattern,text): fail(f'Sensitive pattern {label} in {name}; value withheld')
 if p.suffix in {'.js','.mjs'}:
  r=run([args.node,'--check',str(p)])
  if r.returncode: fail(f'JavaScript syntax failed: {name}')
 if p.suffix=='.py':
  try: ast.parse(p.read_text(encoding='utf-8-sig'))
  except SyntaxError: fail(f'Python syntax failed: {name}')
 if p.suffix in {'.json','.webmanifest'}:
  try: json.loads(p.read_text(encoding='utf-8-sig'))
  except Exception: fail(f'JSON parse failed: {name}')
 if p.suffix=='.toml':
  try: tomllib.loads(p.read_text(encoding='utf-8-sig'))
  except Exception: fail(f'TOML parse failed: {name}')
 if p.suffix in {'.xml','.rels'}:
  try: etree.fromstring(p.read_bytes())
  except Exception: fail(f'XML parse failed: {name}')

with tempfile.TemporaryDirectory(prefix='chiatech-syntax-') as directory:
 p=Path(directory)/'code.js';p.write_bytes((ROOT/'backend/google-apps-script/Code.gs').read_bytes())
 if run([args.node,'--check',str(p)]).returncode: fail('Apps Script syntax failed')

dist=ROOT/'dist'; public={p.relative_to(dist).as_posix():p for p in dist.rglob('*') if p.is_file()}
if not public: fail('Build dist before running the release audit')
for name in public:
 if name.startswith(('backend/','tools/','reports/','netlify/',"don't push/",'.git/','.agents/','articles/2026/','articles/JULY 2026/','articles/_editorial_work/')): fail(f'Private build file: {name}')
if json.loads((ROOT/'data/articles.json').read_text()) != []: fail('Article embargo: nonempty registry')
if (dist/'data/articles.json').is_file() and json.loads((dist/'data/articles.json').read_text()) != []: fail('Public article registry is not empty')

redirects={}
for line in (ROOT/'_redirects').read_text().splitlines():
 bits=line.split()
 if len(bits)>=3 and '*' not in bits[0]: redirects[unquote(bits[0])]=(unquote(bits[1]),bits[2])
refs=0; pages={}; heading_warnings=[]
for name,p in public.items():
 if p.suffix=='.html':
  raw=p.read_text(encoding='utf-8'); tree=html.fromstring(raw);pages[name]=tree
  ids=Counter(tree.xpath('//*[@id]/@id'))
  for ident,count in ids.items():
   if count>1: fail(f'{name}: duplicate id {ident}')
  if len(tree.xpath('//main'))!=1: fail(f'{name}: expected one main landmark')
  if not tree.xpath('//h1'): fail(f'{name}: missing h1')
  if tree.xpath('//img[not(@alt)]'): fail(f'{name}: missing image alt')
  if not tree.xpath('//html[@lang]'): fail(f'{name}: missing document language')
  if not tree.xpath('//meta[@name="viewport"]'): fail(f'{name}: missing viewport')
  for form in tree.xpath('//form[@data-netlify="true"]'):
   if form.get('method','').lower()!='post' or not form.xpath('.//input[@name="form-name"]'): fail(f'{name}: incomplete Netlify form contract')
  for node in tree.xpath('//input[not(@type="hidden")]|//select|//textarea'):
   ident=node.get('id')
   labelled=node.get('aria-label') or node.get('aria-labelledby') or node.xpath('ancestor::label') or (ident and tree.xpath('//label[@for=$id]',id=ident))
   if not labelled and node.get('type') not in ['submit','button']: fail(f'{name}: unlabelled {node.tag} {node.get("name","")}')
  levels=[int(n.tag[1]) for n in tree.xpath('//main//*[self::h1 or self::h2 or self::h3 or self::h4]')]
  if any(b>a+1 for a,b in zip(levels,levels[1:])): heading_warnings.append(name)
for name,tree in pages.items():
 for node in tree.xpath('//*[@href or @src or @action]'):
  ref=node.get('href') or node.get('src') or node.get('action'); parsed=urlsplit(ref)
  if parsed.scheme or parsed.netloc: continue
  refs+=1
  from posixpath import normpath,dirname
  route=unquote(parsed.path)
  if route.startswith('/api/'): continue
  target=normpath(route.lstrip('/') if route.startswith('/') else dirname(name)+'/'+route) if route else name
  target=target.lstrip('/')
  key=target if target in public else target.rstrip('/')+'/index.html'
  if target in {'.',''}: key='index.html'
  if key not in public:
   redir=redirects.get('/'+target) or redirects.get('/'+target+'/')
   if redir: continue
   fail(f'{name}: missing or case-mismatched reference {ref}');continue
  if parsed.fragment and key in pages and not pages[key].xpath('//*[@id=$id or @name=$id]',id=unquote(parsed.fragment)):
   fail(f'{name}: missing anchor {ref}')

report={'gitMode':'staged' if args.staged else 'candidate','candidateCount':len(candidates),'publicFiles':len(public),'htmlPages':len(pages),'localReferencesChecked':refs,'articleRegistryEmpty':True,'headingWarnings':heading_warnings,'errors':errors,'candidateSha256':hashes}
(ROOT/'reports').mkdir(exist_ok=True)
report_path=ROOT/('tools/qa-output/staging-audit.json' if args.staged else 'reports/release-audit.json')
report_path.parent.mkdir(parents=True,exist_ok=True)
report_path.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
if errors:
 print('\n'.join(errors));raise SystemExit(1)
print(f'PASS: {len(candidates)} safe Git candidates; {len(public)} public files; {len(pages)} HTML pages; {refs} local references; syntax, formats, form labels and embargo verified.')
if heading_warnings: print('Review heading-order warnings: '+', '.join(heading_warnings))
