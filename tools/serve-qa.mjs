// Bound to loopback only. Uses private synthetic fixtures and no live backend.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHarness } from './qa-harness.mjs';
import { handler as relay } from '../netlify/functions/editorial-api.mjs';
import { handler as paperPage } from '../netlify/functions/paper-page.mjs';
import { handler as publicIndex } from '../netlify/functions/public-index.mjs';
const h=createHarness(); if (process.argv.includes('--fixtures')) h.populate();
h.context.database=()=>({getSheets:()=>[]});
process.env.CHIATECH_APPS_SCRIPT_URL=['https:', '', 'script.google.com', 'macros', 's', 'LOCAL_QA_ONLY', 'exec'].join('/');
global.fetch=async (url, options={}) => ({ok:true,text:async()=>options.method==='POST' ? h.context.doPost({postData:{contents:options.body}}).text : h.context.doGet({parameter:Object.fromEntries(new URL(url).searchParams)}).text});
const root=path.resolve('dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.xml':'application/xml','.txt':'text/plain','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://127.0.0.1:4173'); const pathname=decodeURIComponent(url.pathname);
    if (pathname==='/admin'||pathname.startsWith('/editorial')||pathname.startsWith('/about/editorial-board')) {res.writeHead(302,{Location:'/portal/chief-editor-login/'});res.end();return;}
    let event={httpMethod:req.method,path:pathname,queryStringParameters:Object.fromEntries(url.searchParams)}, result;
    if(pathname==='/api/editorial'){
      if(req.method==='POST'){let body='';for await (const chunk of req) body+=chunk; event.body=body;}
      if (req.headers.referer?.includes('qa=empty') && ['articles','blogPosts'].includes(event.queryStringParameters.action)) result={statusCode:200,body:JSON.stringify({ok:true,articles:[],posts:[]})};
      else result=await relay(event);
    } else if (pathname==='/articles/read/') result=await paperPage(event);
    else if (pathname==='/sitemap.xml'||pathname==='/feed.xml') result=await publicIndex(event);
    if(result){res.writeHead(result.statusCode,result.headers||{'Content-Type':'application/json'});res.end(result.body);return;}
    const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
    if (!file.startsWith(root+path.sep)) throw new Error('Outside public root');
    const body=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found in public build.');}
});
server.listen(4173,'127.0.0.1',()=>console.log('Local QA at http://127.0.0.1:4173/ — synthetic fixtures only; no external writes.'));
