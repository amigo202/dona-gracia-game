import {chromium} from 'playwright-core';
const [base,tag='',only='']=process.argv.slice(2);
const Q='/workspace/dona-gracia/qa/intro4-'+tag;
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const errs=[]; const out=[];
const sizes=[['desktop',1280,800,false],['mobile',390,844,true]].filter(s=>!only||s[0]===only);
for (const [name,w,h,mob] of sizes) {
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:mob?2:1,isMobile:mob,hasTouch:mob});
  const p=await ctx.newPage();
  p.on('console',m=>{if(m.type()==='error')errs.push(`${name} CONSOLE ${m.text()}`)});p.on('pageerror',e=>errs.push(`${name} PAGEERR ${e.message}`));
  p.on('response',r=>{if(r.status()>=400)errs.push(`${name} HTTP ${r.status()} ${r.url()}`)}); p.on('requestfailed',r=>errs.push(`${name} FAIL ${r.url()} ${r.failure()?.errorText}`));
  await p.goto(base,{waitUntil:'domcontentloaded'});
  const tt=async()=>+(await p.locator('.dgp').getAttribute('data-t'));
  const at=async(s)=>{ while((await tt())<s) await p.waitForTimeout(80); await p.screenshot({path:`${Q}${name}-${String(s).padStart(2,'0')}s.png`}); };
  const times=(process.env.TIMES||'0,3,5,10,15,20,25,30,35,40,45,50,55').split(',').map(Number);
  let soundOk=null;
  for (const s of times) { await at(s);
    if (s===10) { // הפעלת קול באמצע ובדיקה שהמוזיקה מסונכרנת
      const btn=p.locator('.dgp-sound'); if(mob) await btn.tap(); else await btn.click();
      await p.waitForTimeout(1500);
      soundOk=await p.evaluate(()=>{const A=window.__dgpAudio; const t=+document.querySelector('.dgp').dataset.t; return A&&A.music?{t,music:+A.music.currentTime.toFixed(2),expect:+(t-A.musicOffset).toFixed(2),paused:A.music.paused,label:document.querySelector('.dgp-sound').getAttribute('aria-label')}:'no audio'});
    }
  }
  const vstate=await p.evaluate(()=>[...document.querySelectorAll('.dgp video')].map(v=>[v.readyState,v.currentTime.toFixed(1),v.paused]));
  const sw=await p.evaluate(()=>document.documentElement.scrollWidth);
  await p.locator('.dgp .cta').click(); await p.waitForTimeout(1400);
  const gone=await p.locator('.dgp').count(); const home=await p.locator('.opening-view').count();
  await p.screenshot({path:`${Q}${name}-after-cta.png`});
  await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(1200);
  const second=await p.locator('.dgp').count();
  const u=new URL(base); u.search='?intro'; await p.goto(u.toString(),{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
  const forced=await p.locator('.dgp').count(); await p.locator('.dgp-skip').click(); await p.waitForTimeout(1200);
  const afterSkip=await p.locator('.dgp').count();
  const p3=await (await b.newContext({viewport:{width:w,height:h},reducedMotion:'reduce',deviceScaleFactor:mob?2:1})).newPage(); await p3.goto(base,{waitUntil:'domcontentloaded'}); await p3.waitForTimeout(1000);
  const rmBtn=await p3.locator('.dgp-go.on .cta').count(); await p3.screenshot({path:`${Q}${name}-reduced.png`});
  out.push({name,soundOk,vstate,sw,gone,home,second,forced,afterSkip,rmBtn});
  await ctx.close();
}
console.log(JSON.stringify(out)); console.log('ERRORS',JSON.stringify(errs,null,1));
await b.close();
