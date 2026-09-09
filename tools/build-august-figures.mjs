import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve('papers/2026_V1I1_PIONEER_JULY_AUGUST_PART2');
const specs = JSON.parse(await fs.readFile('tools/august-part2-figures.json','utf8'));
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function wrap(s, max) { const lines=[]; let line=''; for (const w of s.split(/\s+/)) {if ((line+' '+w).trim().length>max && line){lines.push(line);line=w;} else line=(line+' '+w).trim();} if(line)lines.push(line); return lines; }
for (const [key,spec] of Object.entries(specs)) {
  const eid=key.slice(0,4), dest=path.join(root,eid,'figures');await fs.mkdir(dest,{recursive:true});
  const grid=spec.layout==='grid',hub=spec.layout==='hub';
  const n=spec.nodes.length,cols=hub?3:grid?2:Math.min(3,n),rows=Math.ceil(n/cols);
  const W=1100,pad=36,gap=45,bw=(W-2*pad-(cols-1)*gap)/cols;
  const maxBody=Math.max(...spec.nodes.map(v=>wrap(v[1],Math.floor(bw/11)).length));
  const bh=Math.max(112,70+maxBody*25),rowGap=hub?105:55;
  const footer=wrap(spec.note,92),H=pad+rows*(bh+rowGap)+footer.length*24+20;
  const shapes=[],texts=[],positions=[];
  const line=(x1,y1,x2,y2,arrow=false)=>shapes.push(`<path d="M ${x1} ${y1} Q ${(x1+x2)/2+0.8} ${(y1+y2)/2-0.8} ${x2} ${y2}" fill="none" stroke="#303030" stroke-width="1.7" ${arrow?'marker-end="url(#arrow)"':''}/>`);
  spec.nodes.forEach(([head,body],i)=>{
    const row=Math.floor(i/cols);let col=i%cols;
    if(!grid&&!hub&&row%2)col=cols-1-col;
    const x=pad+col*(bw+gap), y=pad+row*(bh+rowGap);
    positions.push({x,y});
    shapes.push(`<path d="M ${x+1} ${y+1} Q ${x+bw/2} ${y-1.1} ${x+bw-1} ${y+0.6} L ${x+bw+0.5} ${y+bh-1} Q ${x+bw/2} ${y+bh+1.3} ${x} ${y+bh} Z" fill="white" stroke="#242424" stroke-width="1.8"/>`);
    const heads=wrap(head,Math.floor(bw/12)),bodys=wrap(body,Math.floor(bw/11));
    const total=heads.length*27+(bodys.length?13:0)+bodys.length*25;
    let ty=y+(bh-total)/2+22;
    for(const t of heads){texts.push(`<text x="${x+bw/2}" y="${ty}" text-anchor="middle" font-family="Georgia,serif" font-size="23" font-weight="bold" fill="#151515">${esc(t)}</text>`);ty+=27;}
    ty+=13;
    for(const t of bodys){texts.push(`<text x="${x+bw/2}" y="${ty}" text-anchor="middle" font-family="Arial,sans-serif" font-size="21" fill="#252525">${esc(t)}</text>`);ty+=25;}
  });
  if(!grid&&!hub)for(let i=0;i<n-1;i++){
    const a=positions[i],b=positions[i+1];
    if(a.y===b.y)line(a.x<b.x?a.x+bw+5:a.x-5,a.y+bh/2,a.x<b.x?b.x-8:b.x+bw+8,b.y+bh/2,true);
    else line(a.x+bw/2,a.y+bh+5,b.x+bw/2,b.y-8,true);
  }
  if(hub){const cy=pad+bh+rowGap/2;shapes.push(`<ellipse cx="550" cy="${cy}" rx="205" ry="34" fill="white" stroke="#242424" stroke-width="1.8"/>`);texts.push(`<text x="550" y="${cy+7}" text-anchor="middle" font-family="Georgia,serif" font-size="23">${esc(spec.center)}</text>`);positions.forEach((p,i)=>line(p.x+bw/2,i<3?p.y+bh+5:p.y-5,550,i<3?cy-38:cy+38,false));}
  footer.forEach((t,i)=>texts.push(`<text x="${pad}" y="${H-15-(footer.length-1-i)*24}" font-family="Georgia,serif" font-size="20" font-style="italic" fill="#333">${esc(t)}</text>`));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><title>${esc(key+' · '+spec.nodes.map(n=>n[0]).join(' → '))}</title><desc>${esc(spec.note)}</desc><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 1 L7 4 L0 7" fill="none" stroke="#303030" stroke-width="1.2"/></marker></defs><rect width="100%" height="100%" fill="white"/>${shapes.join('')}${texts.join('')}</svg>`;
  await fs.writeFile(path.join(dest,key+'.svg'),svg);
  await sharp(Buffer.from(svg)).resize({width:2200}).png().toFile(path.join(dest,key+'.png'));
}
console.log(`Built ${Object.keys(specs).length} editable pen-and-ink SVG diagrams and matching PNGs.`);
