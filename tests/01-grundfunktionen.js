const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=process.argv[2]||'/home/claude/app';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const srv=http.createServer((q,s)=>{let p=q.url.split('?')[0];if(p==='/')p='/index.html';const f=path.join(ROOT,p);
 fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);s.end('nf')}else{s.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});s.end(d)}})});
(async()=>{
await new Promise(r=>srv.listen(8123,r));
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const page=await ctx.newPage();
const errs=[];
page.on('pageerror',e=>{errs.push('PAGEERROR: '+e.message);console.log('!! PAGEERROR:',e.message)});
page.on('console',m=>{if(m.type()==='error'){errs.push('CONSOLE: '+m.text());console.log('!! CONSOLE:',m.text())}});
await page.goto('http://localhost:8123/',{waitUntil:'networkidle'});

const report=[];
async function overflow(label){
  const r=await page.evaluate(()=>{
    const w=document.documentElement.clientWidth;const bad=[];
    document.querySelectorAll('body *').forEach(el=>{
      if(el.classList.contains('skip-link'))return; // bewusst ausserhalb des Sichtbereichs
      // Inhalte in horizontal scrollenden Behaeltern sind kein Seitenueberlauf
      let sp=el.parentElement, inScroller=false;
      while(sp && sp!==document.body){ const ov=getComputedStyle(sp).overflowX;
        if(ov==='auto'||ov==='scroll'){inScroller=true;break} sp=sp.parentElement; }
      if(inScroller)return;
      const b=el.getBoundingClientRect();
      if(b.width>0&&(b.right>w+1||b.left<-1)) bad.push({t:el.tagName+'.'+(el.className&&el.className.toString().split(' ')[0]||''),r:Math.round(b.right),l:Math.round(b.left),txt:(el.textContent||'').trim().slice(0,40)});});
    return {w,scrollW:document.documentElement.scrollWidth,bad:bad.slice(0,8)};
  });
  if(r.scrollW>r.w+1||r.bad.length)report.push(`[OVERFLOW ${label}] viewport=${r.w} scrollWidth=${r.scrollW} `+JSON.stringify(r.bad));
}
async function smallTargets(label){
  const r=await page.evaluate(()=>{const bad=[];
    document.querySelectorAll('button,select,a,input,summary').forEach(el=>{const b=el.getBoundingClientRect();
      if(b.width>0&&b.height>0&&(b.height<36))bad.push(((el.textContent||el.id||el.tagName).trim().slice(0,26))+':'+Math.round(b.height));});
    return [...new Set(bad)];});
  if(r.length)report.push(`[TAP<36px ${label}] ${r.join(', ')}`);
}
async function smallFonts(label){
  const r=await page.evaluate(()=>{const bad=[];
    document.querySelectorAll('input,select,textarea').forEach(el=>{const fs=parseFloat(getComputedStyle(el).fontSize);
      if(fs<16)bad.push((el.id||el.className||el.tagName)+':'+fs+'px');});
    return [...new Set(bad)];});
  if(r.length)report.push(`[iOS-ZOOM ${label}] Inputs <16px: ${r.join(', ')}`);
}
async function untranslated(label){
  const t=await page.evaluate(()=>document.body.innerText);
  const keys=['navAssistant','navHome','navDocs','navLost','heroTitle','undefined','NaN','[object Object]'];
  const hit=keys.filter(k=>t.includes(k));
  if(hit.length)report.push(`[TEXT ${label}] verdächtige Rohtexte: ${hit.join(', ')}`);
}
async function alive(label){const n=await page.evaluate(()=>document.querySelector('#app').innerHTML.length);
  if(n<50)report.push(`[LEER ${label}] #app ist praktisch leer (${n} Zeichen) – Render fehlgeschlagen`);}
async function check(label){await alive(label);await overflow(label);await smallTargets(label);await smallFonts(label);await untranslated(label);}

await check('home');
// language switch
await page.click('#langBtn');await page.waitForTimeout(150);await check('home/de');
// assistant flow: answer all questions
await page.click('[data-route="assistant"]');await page.waitForTimeout(200);await check('assistant');
for(let i=0;i<15;i++){
  const opt=await page.$('.option-btn');
  if(opt)await opt.click();
  const nxt=await page.$('#assistantNext');
  if(!nxt)break;
  await nxt.click();await page.waitForTimeout(120);
  if(await page.$('.result-hero'))break;
}
await check('assistant-result');
// service view
const svc=await page.$('[data-service]');if(svc){await svc.click();await page.waitForTimeout(200);await check('service');}
// fields
const fld=await page.$('[data-fields]');if(fld){await fld.click();await page.waitForTimeout(200);await check('fields');
  await page.evaluate(()=>{const i=document.querySelector('[data-form-key]');if(i){i.value='Testwert';i.dispatchEvent(new Event('input',{bubbles:true}))}});
  const tabs=await page.$$('[data-form-tab]');for(const t of tabs.slice(0,4)){await t.click();await page.waitForTimeout(80);}
  await check('fields-tabs');
  const tg=await page.$('#toggleAllFields');if(tg){await tg.click();await page.waitForTimeout(150);await check('fields-all');}
}
// case
await page.click('[data-route="case"]');await page.waitForTimeout(200);await check('case');
// manual text analysis
console.log('[dbg] route=',await page.evaluate(()=>JSON.parse(localStorage.getItem('puente-prototype-v3')||'{}').route),'btn=',!!(await page.$('#manualTextBtn')),'app=',(await page.evaluate(()=>document.querySelector('#app').innerHTML.length)));await page.click('#manualTextBtn');await page.waitForTimeout(200);
await page.fill('#manualDocText','Mietvertrag\nNettokaltmiete: 640,00 €\nBetriebskostenvorauszahlung 120,50 €\nHeizkostenvorauszahlung 85,00 €\nWohnfläche 62,5 m²\nMietverhältnis beginnt am 01.03.2024\nIBAN DE02 1203 0000 0000 2020 51\nSteuer-ID 12 345 678 901');
await check('modal-manualtext');
await page.click('#analyzeManualTextBtn');await page.waitForTimeout(400);
await check('case-after-analysis');
const facts=await page.evaluate(()=>[...document.querySelectorAll('.fact-label')].map(x=>x.textContent));
report.push('[INFO] erkannte Angaben: '+JSON.stringify(facts));
const ap=await page.$('[data-approve-fact]');if(ap){await ap.click();await page.waitForTimeout(250);await check('case-approved');}
// dossier
await page.click('[data-go="dossier"]');await page.waitForTimeout(300);await check('dossier');
// docs
await page.click('[data-route="more"]');await page.waitForTimeout(200);await check('more');
await page.goto('http://localhost:8123/#docs');await page.reload();await page.waitForTimeout(450);await check('docs');
await page.fill('#docSearch','miet');await page.waitForTimeout(200);await check('docs-search');
const rec=await page.$('#docResults .req');if(rec){await rec.click();await page.waitForTimeout(200);await check('modal-recovery');
  await page.keyboard.press('Escape');await page.waitForTimeout(150);}
// lost
await page.click('[data-route="more"]');await page.waitForTimeout(200);
await page.goto('http://localhost:8123/#lost');await page.reload();await page.waitForTimeout(450);await check('lost');
// privacy modal
await page.click('#settingsBtn');await page.waitForTimeout(300);await check('einstellungen');

// narrow phone
await page.setViewportSize({width:320,height:640});await page.waitForTimeout(200);
await page.click('[data-route="home"]');await page.waitForTimeout(200);await overflow('home@320');
await page.click('[data-route="case"]');await page.waitForTimeout(200);await overflow('case@320');
await page.click('[data-go="dossier"]');await page.waitForTimeout(300);await overflow('dossier@320');

console.log('===== RUNTIME ERRORS =====');console.log(errs.length?[...new Set(errs)].join('\n'):'keine');
console.log('\n===== REPORT =====');console.log(report.join('\n'));
await b.close();srv.close();
})().catch(e=>{console.error('HARNESS FAIL',String(e).slice(0,400));process.exit(1)});
