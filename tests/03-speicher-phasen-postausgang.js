const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/claude/app';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
const srv=http.createServer((q,s)=>{let p=q.url.split('?')[0];if(p==='/')p='/index.html';const f=path.join(ROOT,p);
 fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);s.end()}else{s.writeHead(200,{'content-type':MIME[path.extname(f)]||'text/plain'});s.end(d)}})});
(async()=>{
await new Promise(r=>srv.listen(8170,r));
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true});
const page=await ctx.newPage();
const errs=[],rep=[];
page.on('pageerror',e=>{errs.push('PAGEERROR: '+e.message);console.log('!!',e.message)});
page.on('console',m=>{if(m.type()==='error'){errs.push('CONSOLE: '+m.text());console.log('!! console:',m.text())}});
const go=async r=>{await page.goto('http://localhost:8170/#'+r);await page.reload();await page.waitForTimeout(450);};
async function chk(label){
  const r=await page.evaluate(()=>({n:document.querySelector('#app').innerHTML.length,
    sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,txt:document.body.innerText}));
  if(r.n<50)rep.push(`[LEER ${label}] ${r.n}`);
  if(r.sw>r.cw+1)rep.push(`[OVERFLOW ${label}] ${r.cw}->${r.sw}`);
  ['undefined','NaN','[object Object]','navDeadlines','navMore'].forEach(k=>{if(r.txt.includes(k))rep.push(`[ROHTEXT ${label}] ${k}`)});
  const sm=await page.evaluate(()=>[...new Set([...document.querySelectorAll('input,select,textarea')]
    .filter(e=>e.offsetParent!==null&&parseFloat(getComputedStyle(e).fontSize)<16).map(e=>e.id||e.className))]);
  if(sm.length)rep.push(`[iOS-ZOOM ${label}] ${sm.join(',')}`);
}
await page.goto('http://localhost:8170/');await page.waitForTimeout(500);
await page.click('#langBtn');await page.waitForTimeout(200);
rep.push('[START] '+(await page.evaluate(()=>document.querySelector('.next-step h1')?.textContent||'KEIN next-step')));
await chk('home');

// Speicherstufen
await page.click('#settingsBtn');await page.waitForTimeout(400);await chk('settings');
rep.push('[SPEICHER] '+(await page.evaluate(()=>document.querySelector('.dossier-table')?.innerText.replace(/\n/g,' | '))));
await page.click('[data-mode="shared"]');await page.waitForTimeout(500);
rep.push('[MODUS nach Wechsel] '+(await page.evaluate(()=>document.querySelector('.mode-item.active strong')?.textContent)));
page.on('dialog',d=>d.accept());
await page.click('[data-mode="device"]');await page.waitForTimeout(700);
rep.push('[MODUS device] '+(await page.evaluate(()=>document.querySelector('.mode-item.active strong')?.textContent)));
rep.push('[BACKEND] '+(await page.evaluate(()=>document.querySelectorAll('.dossier-table td')[0]?.textContent)));

// Assistent durchlaufen (Profil erzeugen)
await go('assistant');
for(let i=0;i<14;i++){const o=await page.$('.option-btn');if(o)await o.click();const nx=await page.$('#assistantNext');if(!nx)break;await nx.click();await page.waitForTimeout(120);if(await page.$('.result-hero'))break;}
await chk('assistant-result');
await go('home');await chk('home-mit-fall');
rep.push('[NAECHSTER SCHRITT mit Fall] '+(await page.evaluate(()=>document.querySelector('.next-step h1')?.textContent)));
rep.push('[PHASENLEISTE] '+(await page.evaluate(()=>document.querySelectorAll('.phase').length)+' Phasen'));
await page.click('[data-phase="decided"]');await page.waitForTimeout(300);
await page.click('#toggleAreas');await page.waitForTimeout(300);await chk('home-alle-bereiche');
rep.push('[KACHELN sichtbar] '+(await page.evaluate(()=>document.querySelectorAll('.grid .card').length)));

// Persistenz über Reload prüfen (Modus device)
await page.reload();await page.waitForTimeout(600);
rep.push('[PERSISTENZ Profil nach Reload] '+(await page.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem('puente:v6:app')||'{}');return Object.keys(s.state?.profile||{}).length+' Antworten';})));

// Postausgang
await go('outbox');await chk('outbox-leer');
await page.click('#addOutboxBtn');await page.waitForTimeout(350);
await page.fill('#obWhat','Hauptantrag mit Anlagen');await page.fill('#obTo','Jobcenter Berlin Mitte');
await page.selectOption('#obWay','registered');await page.fill('#obTracking','RR123456789DE');
await page.click('#obSave');await page.waitForTimeout(450);await chk('outbox-eintrag');
rep.push('[POSTAUSGANG] '+(await page.evaluate(()=>document.querySelectorAll('.outbox-item').length)+' Eintrag/Einträge'));

// Fristen weiterhin funktionsfähig
await go('deadlines');await chk('deadlines');
await page.click('#addDeadlineBtn');await page.waitForTimeout(350);
rep.push('[FRISTARTEN gefiltert] '+(await page.evaluate(()=>[...document.querySelectorAll('#dlType option')].map(o=>o.textContent.trim()).join(' / '))));
await page.fill('#dlStart','2026-09-01');await page.waitForTimeout(250);
await page.click('#dlSave');await page.waitForTimeout(450);
rep.push('[FRISTEN] '+(await page.evaluate(()=>document.querySelectorAll('.deadline').length)));

// Absturzsicherung
const boundary=await page.evaluate(()=>{
  const app=document.querySelector('#app');
  const before=app.innerHTML.length;
  window.__forceError=true;
  return before>0;
});
// Sprache
rep.push('[VORLESEN verfügbar] '+(await page.evaluate(()=>!document.querySelector('#readBtn').hidden)));

// Persönliche Daten löschen
await go('settings');
await page.click('#clearPersonalBtn');await page.waitForTimeout(700);
rep.push('[NACH LÖSCHEN Postausgang] '+(await page.evaluate(async()=>{
  return new Promise(res=>{const r=indexedDB.open('puente',1);r.onsuccess=()=>{const db=r.result;
    const t=db.transaction('kv','readonly').objectStore('kv').get('puente:v6:personal');
    t.onsuccess=()=>{res(JSON.stringify(t.result?.outbox||[]).length+' Bytes');db.close()};t.onerror=()=>{res('Fehler');db.close()}}
    ;r.onerror=()=>res('kein IDB')})})));

// 320 px
await page.setViewportSize({width:320,height:640});
for(const r of ['home','settings','outbox','deadlines','case','advice']){await go(r);await chk(r+'@320');}
console.log('===== FEHLER =====');console.log(errs.length?[...new Set(errs)].join('\n'):'keine');
console.log('\n===== BERICHT =====');console.log(rep.join('\n'));
await b.close();srv.close();
})().catch(e=>{console.error('HARNESS FAIL',String(e).slice(0,400));process.exit(1)});
