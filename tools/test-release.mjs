import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { createHarness } from './qa-harness.mjs';
import { handler as relay } from '../netlify/functions/editorial-api.mjs';
import { handler as paperPage } from '../netlify/functions/paper-page.mjs';
import { handler as publicIndex } from '../netlify/functions/public-index.mjs';
let checks = 0;
const check = (label, work) => { work(); checks++; console.log(`PASS ${label}`); };
const h = createHarness(), c = h.context;
const adminToken = h.login(), editorToken = h.login('EDITOR');
check('manifest is valid V8 JSON, not a .gs file', () => { const manifest = JSON.parse(fs.readFileSync("backend/google-apps-script/appsscript.json")); assert.equal(manifest.runtimeVersion,'V8'); assert.equal(manifest.webapp.executeAs,'USER_DEPLOYING'); });
check('guest board request returns no identities', () => { const result = JSON.parse(c.doGet({ parameter:{ action:'editors' } }).text); assert.equal(result.ok,false); assert(!JSON.stringify(result).includes('LOCAL QA EDITOR')); });
check('admin sees board; section editor does not', () => { assert.equal(c.getEditorialDashboard({ token:adminToken }).editors.length,1); assert.equal(c.getEditorialDashboard({ token:editorToken }).editors.length,0); });
check('unauthenticated and editor content writes are denied', () => { for (const token of ['',editorToken]) { assert.throws(() => c.saveSettings({ token, settings:{} })); assert.throws(() => c.saveContentPage({ token, path:'/about/' })); assert.throws(() => c.saveArticle({ ...h.article, token })); assert.throws(() => c.saveBlogPost({ ...h.post, token })); assert.throws(() => c.updateEditor({ token })); } });
check('active sessions are revoked immediately on suspension and credential change', () => { h.tables.Users[1].status='SUSPENDED'; assert.throws(() => c.requireSession(editorToken,['EDITOR'])); h.tables.Users[1].status='ACTIVE'; const resetToken = h.login('EDITOR'); h.tables.Users[1].salt='changed'; assert.throws(() => c.requireSession(resetToken,['EDITOR'])); });
check('sessions have an absolute expiry', () => { const raw = JSON.parse(h.cache.get(`session:${adminToken}`)); h.cache.set('session:expired',JSON.stringify({...raw, expiresAt:1})); assert.throws(() => c.requireSession('expired',['ADMIN'])); });
check('unassigned founder DOI is absent; ORCID checksum validated', () => { assert.equal(c.publicProfile().managingEditorDoi,''); assert.equal(c.cleanOrcid('0009-0009-6434-4586'),'0009-0009-6434-4586'); assert.throws(() => c.cleanOrcid('0000-0000-0000-0000')); });
check('dangerous Sheet formula prefixes are neutralised', () => { assert.equal(c.safeSheetValue('=IMPORTXML("https://invalid", "//x")'), '\'=IMPORTXML("https://invalid", "//x")'); assert.equal(c.safeSheetValue('+2347037689917'), "'+2347037689917"); });
check('publication requires actual boolean confirmation and metadata', () => { for (const value of [false, 'false', 'true', 1, null]) assert.throws(() => c.saveArticle({...h.article,token:adminToken,pdfConfirmed:value})); assert.throws(() => c.saveArticle({...h.article,token:adminToken,doi:''})); assert.throws(() => c.saveArticle({...h.article,token:adminToken,authors:[]})); });
check('invalid login is rejected and repeated failures are throttled', () => {
  for (let i=0;i<8;i++) assert.equal(c.login({email:'absent@example.invalid',password:'Incorrect local QA input'}).ok,false);
  assert.throws(() => c.login({email:'absent@example.invalid',password:'Incorrect local QA input'}),/Too many/);
});
check('provider error text is never disclosed to callers', () => {
  assert.equal(c.safeError(new Error('Invalid argument: PRIVATE_DATABASE_IDENTIFIER')), 'The editorial service could not complete that request.');
  assert.equal(c.safeError(c.serviceError('Choose a valid page state.')), 'Choose a valid page state.');
  for (const value of ['null','[]','"string"','{']) assert.equal(JSON.parse(c.doPost({postData:{contents:value}}).text).ok,false);
});
check('invalid and expired invitation timestamps are rejected', () => {
  const person=h.tables.Users[1], saved={...person};
  for (const expires of ['', 'not-a-date', '2000-01-01']) {
    Object.assign(person,{status:'INVITED',invite_token:'local-test-invite',invite_expires:expires});
    assert.equal(c.activateEditor({inviteToken:'local-test-invite',password:h.password}).ok,false);
  }
  Object.assign(person,saved);
});
check('invitation reissue invalidates the old link and activation is one-use', () => {
  assert(c.createEditor({token:adminToken,email:'invitee@example.invalid',name:'Local QA invitee',domain:'Technology'}).ok);
  const person=h.tables.Users.find(user=>user.email==='invitee@example.invalid'), first=person.invite_token;
  assert(c.reissueEditorInvite({token:adminToken,id:person.id}).ok);
  assert.notEqual(person.invite_token,first);
  assert.equal(c.activateEditor({inviteToken:first,password:h.password}).ok,false);
  const current=person.invite_token;
  assert.equal(c.activateEditor({inviteToken:current,password:h.password}).ok,true);
  assert.equal(c.activateEditor({inviteToken:current,password:h.password}).ok,false);
  assert.equal(h.mail.filter(message=>message.to==='invitee@example.invalid').length,2);
});
check('logout revokes the active token and settings survive a new session', () => {
  const token=h.login();
  c.saveSettings({token,settings:{publicAnnouncement:'Local QA settings persistence'}});
  c.logout({token}); assert.throws(()=>c.requireSession(token,['ADMIN']));
  assert.equal(c.getEditorialDashboard({token:h.login()}).settings.publicAnnouncement,'Local QA settings persistence');
});
check('Users extension preserves existing header positions and rejects gaps', () => {
  let header=['created_at','id','name','email','salt','password_hash'];
  const before=[...header];
  const sheet={getLastRow:()=>1,getLastColumn:()=>header.length,setFrozenRows(){},getRange:(r,col,rows,width)=>({getValues:()=>[header.slice(col-1,col-1+width)],setValues:values=>{header.splice(col-1,values[0].length,...values[0]);}})};
  const originalDatabase=c.database;
  c.database=()=>({getSheetByName:()=>sheet});
  try { c.ensureSheet('Users'); assert.deepEqual(header.slice(0,before.length),before); assert(header.includes('public_email')); header[2]=''; assert.throws(()=>c.ensureSheet('Users'),/headers are invalid/); }
  finally { c.database=originalDatabase; }
});
check('only published papers are public; unpublish hides reader', () => { c.saveArticle({...h.article,token:adminToken,status:'DRAFT'}); assert.equal(c.publicArticles().length,0); c.saveArticle({...h.article,token:adminToken}); assert.equal(c.publicArticles().length,1); c.setArticleStatus({token:adminToken,id:h.article.id,status:'DRAFT'}); assert.equal(c.publicArticle(h.article.id).ok,false); c.saveArticle({...h.article,token:adminToken}); });
check('page draft preserves the last approved public version', () => { const page={token:adminToken,path:'/about/',title:'Approved title',summary:'Approved introduction',body:'Approved complete content. '.repeat(6)}; c.saveContentPage({...page,status:'PUBLISHED'}); c.saveContentPage({...page,title:'PRIVATE DRAFT',body:'Private work in progress.',status:'DRAFT'}); assert.equal(c.publicContentPage('/about/').page.title,'Approved title'); c.saveContentPage({...page,status:'ARCHIVED'}); assert.equal(c.publicContentPage('/about/').page,null); assert.equal(c.saveContentPage({...page,path:'/admin',status:'PUBLISHED'}).ok,false); });
check('blog draft/publish/archive visibility is correct', () => { c.saveBlogPost({...h.post,token:adminToken,status:'DRAFT'}); assert.equal(c.publicBlogPosts().length,0); c.saveBlogPost({...h.post,token:adminToken}); assert.equal(c.publicBlogPosts().length,1); c.setBlogPostStatus({token:adminToken,id:h.post.id,status:'ARCHIVED'}); assert.equal(c.publicBlogPost(h.post.id).ok,false); c.saveBlogPost({...h.post,token:adminToken}); });
const originalFetch = global.fetch, originalEnv = process.env.CHIATECH_APPS_SCRIPT_URL;
try {
  delete process.env.CHIATECH_APPS_SCRIPT_URL;
  assert.equal((await relay({httpMethod:'GET',queryStringParameters:{action:'editors'}})).statusCode,403); checks++;
  assert.equal((await relay({httpMethod:'GET',queryStringParameters:{action:'profile'}})).statusCode,503); checks++;
  process.env.CHIATECH_APPS_SCRIPT_URL=['https:', '', 'script.google.com', 'macros', 's', 'LOCAL_QA_ONLY', 'exec'].join('/');
  global.fetch = async (url, options={}) => { const text = options.method === 'POST' ? c.doPost({postData:{contents:options.body}}).text : c.doGet({parameter:Object.fromEntries(new URL(url).searchParams)}).text; return {ok:true,text:async()=>text}; };
  for (const body of ['null','[]','{']) assert.equal((await relay({httpMethod:'POST',body})).statusCode,400);
  assert.equal((await relay({httpMethod:'GET',queryStringParameters:{action:'articles'}})).headers['Cache-Control'],'no-store'); checks++;
  const privateResponse=await relay({httpMethod:'POST',body:JSON.stringify({action:'getEditorialDashboard',token:adminToken})});
  assert.equal(privateResponse.headers['Cache-Control'],'no-store'); checks++;
  const rendered = await paperPage({httpMethod:'GET',queryStringParameters:{id:h.article.id}});
  check('crawler receives title, authors, abstract and PDF without JavaScript', () => { assert.equal(rendered.statusCode,200); assert.equal(rendered.headers['Cache-Control'],'no-store'); assert(rendered.body.includes('name="citation_title"')); assert(rendered.body.includes('name="citation_pdf_url"')); assert(rendered.body.includes(h.article.abstract)); assert(rendered.body.includes('data-server-rendered="true"')); });
  assert.equal((await paperPage({httpMethod:'GET',queryStringParameters:{id:'missing'}})).statusCode,404); checks++;
  const sitemap = await publicIndex({httpMethod:'GET',path:'/sitemap.xml'}), feed = await publicIndex({httpMethod:'GET',path:'/feed.xml'});
  check('dynamic sitemap and RSS contain released records only', () => { assert.equal(sitemap.statusCode,200); assert(sitemap.body.includes(h.article.id)); assert(!sitemap.body.includes('editorial-board')); assert(feed.body.includes('<rss')); assert(feed.body.includes(h.post.title)); });
} finally { global.fetch=originalFetch; if (originalEnv===undefined) delete process.env.CHIATECH_APPS_SCRIPT_URL; else process.env.CHIATECH_APPS_SCRIPT_URL=originalEnv; }
const scope={ window:{}, document:{querySelector:()=>null}, location:{origin:'https://journal.chiatechsolutions.com'} };
vm.runInNewContext(fs.readFileSync('assets/js/content-format.js','utf8'),scope);
check('content formatter escapes scripts and refuses javascript links', () => { const output=scope.window.CHIATECH_CONTENT.format('## Heading\n\n<script>alert(1)</script>\n\n[bad](javascript:alert)'); assert(!output.includes('<script>')); assert(!output.includes('href="javascript:')); assert(output.includes('<h2>Heading</h2>')); });
console.log(`\nPASS: ${checks} release test groups. Synthetic data stayed in private process memory.`);
