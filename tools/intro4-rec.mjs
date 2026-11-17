import {chromium} from 'playwright-core'; import fs from 'fs';
const D='/tmp/recf4'; fs.rmSync(D,{recursive:true,force:true}); fs.mkdirSync(D);
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const p=await (await b.newContext({viewport:{width:1280,height:720}})).newPage();
const cdp=await p.context().newCDPSession(p); const frames=[];
cdp.on('Page.screencastFrame',async f=>{frames.push(f.metadata.timestamp); fs.writeFileSync(`${D}/${String(frames.length).padStart(5,'0')}.jpg`,Buffer.from(f.data,'base64')); await cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}).catch(()=>{});});
await cdp.send('Page.startScreencast',{format:'jpeg',quality:88,maxWidth:1280,maxHeight:720,everyNthFrame:1});
await p.goto(process.argv[2],{waitUntil:'domcontentloaded'});
const sync=[]; const end=+(process.argv[3]||55.2); const tStart=Date.now();
while(true){ const r=await p.evaluate(()=>({now:Date.now()/1000,t:+(document.querySelector('.dgp')?.dataset.t||0)})); if(r.t>0.5) sync.push(r.now-r.t); if(r.t>=end||Date.now()-tStart>90000) break; await p.waitForTimeout(500); }
await p.locator('.dgp .cta').click(); await p.waitForTimeout(1500);
await cdp.send('Page.stopScreencast');
sync.sort((a,b)=>a-b); const t0=sync[Math.floor(sync.length/2)];
let s=''; let n=0; for(let i=0;i<frames.length;i++){ if(frames[i]<t0-0.02 && !(frames[i+1]>t0)) continue; const d=i<frames.length-1?frames[i+1]-Math.max(frames[i],t0):0.1; s+=`file '${D}/${String(i+1).padStart(5,'0')}.jpg'\nduration ${Math.max(0.001,d).toFixed(3)}\n`; n++; }
fs.writeFileSync(`${D}/list.txt`,s); console.log('frames',n,'t0',t0.toFixed(2),'span',(frames.at(-1)-t0).toFixed(1)+'s');
await b.close();
