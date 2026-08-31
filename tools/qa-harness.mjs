// Local-only synthetic fixtures. No real accounts, papers, emails or external writes.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
export function createHarness() {
  const tables = Object.fromEntries(['Users','Reviews','Articles','BlogPosts','Settings','Audit','ContentPages','Sessions'].map(name => [name, []]));
  const cache = new Map();
  const mail = [];
  const properties = new Map([['PASSWORD_PEPPER','LOCAL-QA-ONLY-NOT-A-PRODUCTION-SECRET'],['BLOG_BOT_HANDOFF_SECRET','LOCAL-QA-ONLY-BLOG-BOT-HANDOFF-SECRET'],['PUBLIC_BASE_URL','https://journal.chiatechsolutions.com'],['ADMIN_EMAIL','qa-admin@example.invalid']]);
  const context = vm.createContext({ console, Date, JSON, CacheService: { getScriptCache: () => ({ get: key => cache.get(key) || null, put: (key, value) => cache.set(key,value), remove: key => cache.delete(key) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties.get(key), setProperty: (key, value) => properties.set(key,value), deleteProperty: key => properties.delete(key) }) },
    Utilities: { getUuid: () => crypto.randomUUID(), DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }, computeDigest: (_, value) => [...crypto.createHash('sha256').update(value).digest()], computeHmacSha256Signature: (value, key) => [...crypto.createHmac('sha256', key).update(value).digest()], base64Encode: value => Buffer.from(value).toString('base64'), base64EncodeWebSafe: value => Buffer.from(value).toString('base64url') },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) }, MailApp: { sendEmail(message) { mail.push(message); } },
    ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) }
  });
  vm.runInContext(fs.readFileSync("backend/google-apps-script/Code.gs", 'utf8'), context);
  context.rows = name => tables[name].map((row,index) => ({ ...row, row: index + 2 }));
  context.appendObject = (name, row) => tables[name].push({ ...row });
  context.updateRow = (name, index, fields) => Object.assign(tables[name][index - 2], fields);
  const defaults = vm.runInContext('({...PUBLIC_DEFAULTS})', context);
  const admin = { id: 'local-admin', name: 'LOCAL QA ADMIN', email: 'qa-admin@example.invalid', role: 'ADMIN', status: 'ACTIVE', salt: 'local-admin-salt', domain: '' };
  const editor = { id: 'local-editor', name: 'LOCAL QA EDITOR', email: 'qa-editor@example.invalid', role: 'EDITOR', status: 'ACTIVE', salt: 'local-editor-salt', domain: 'Science', affiliation: 'Local QA institution', public_status: 'PRIVATE' };
  const password = 'Local-QA-only-2026!';
  for (const user of [admin, editor]) { user.password_hash = context.hashPassword(password, user.salt); tables.Users.push(user); }
  const article = { id: 'local-qa-paper', title: 'LOCAL QA ONLY: Testing complete publication metadata and citation exports', domain: 'Science', articleType: 'Research article', authors: [{ given: 'Example', family: 'Author', affiliation: 'Local testing institution', orcid: '' }, { given: 'Second', family: 'Researcher', affiliation: 'Local testing institution', orcid: '' }], abstract: 'This synthetic record exists only in the private local test harness. It verifies full title, byline, abstract, keywords, citation selection and authorised PDF links. It is not a research paper and must never be deployed.', keywords: ['local QA','metadata','citations'], received:'2026-07-01', accepted:'2026-08-01', published:'2026-08-28', volume:'1', issue:'1', eLocator:'qa001', doi:'10.55555/local-qa-only', htmlUrl:'/__qa/full-text/', pdfUrl:'/__qa/paper.pdf', pdfDownloadUrl:'/__qa/paper.pdf', htmlConfirmed:true, pdfConfirmed:true, videoConfirmed:true, videoTitle:'Local QA explanatory video', videoUrl:'/__qa/video.mp4', videoTranscriptUrl:'/__qa/transcript.txt', license:'CC BY 4.0', licenseUrl:'https://creativecommons.org/licenses/by/4.0/', status:'PUBLISHED' };
  const post = { id:'local-qa-story', title:'LOCAL QA ONLY: Research conversations that connect ideas and practice', domain:'Science', contentType:'Feature', authorName:'Local QA editor', published:'2026-08-28', summary:'A synthetic story for testing the journal’s editorial layout, search, safe formatting and sharing controls. This is not a public announcement.', body:'## A useful research conversation\n\nThis private local fixture checks **readability** and accessible editorial presentation. It is not real journal content.\n\n- Clear headings and structure\n- Accurate links and metadata\n\nRead the [author guidelines](/authors/guidelines/) before submitting.\n\n## What readers should expect\n\nEvery published story should be checked by an authorised editor before it appears on the portal.', tags:['Research','Local QA'], mediaType:'NONE', rightsNotice:'Local test fixture. Not for publication.', status:'PUBLISHED' };
  function login(role='ADMIN', trustedDevice=false) { const result = context.login({ email: role === 'ADMIN' ? admin.email : editor.email, password, trustedDevice }); if (!result.ok) throw new Error('Local fixture login failed'); return result.token; }
  function populate() { const token = login(); context.saveArticle({ ...article, token }); context.saveBlogPost({ ...post, token }); return token; }
  return { context, tables, cache, properties, mail, defaults, article, post, password, login, populate };
}
