const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/claude/app';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
const srv=http.createServer((q,s)=>{let p=q.url.split('?')[0];if(p==='/')p='/index.html';const f=path.join(ROOT,p);
 fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);s.end()}else{s.writeHead(200,{'content-type':MIME[path.extname(f)]||'text/plain'});s.end(d)}})});
(async()=>{
await new Promise(r=>srv.listen(8140,r));
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const page=await ctx.newPage();
const errs=[],rep=[];
page.on('pageerror',e=>{errs.push('PAGEERROR: '+e.message);console.log('!!',e.message)});
page.on('console',m=>{if(m.type()==='error'){errs.push('CONSOLE: '+m.text());console.log('!! console:',m.text())}});
const dl=[];page.on('download',d=>dl.push(d.suggestedFilename()));
await page.goto('http://localhost:8140/');await page.waitForTimeout(300);
await page.click('#langBtn');await page.waitForTimeout(150);

async function chk(label){
  const r=await page.evaluate(()=>({n:document.querySelector('#app').innerHTML.length,
    sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,
    txt:document.body.innerText}));
  if(r.n<50)rep.push(`[LEER ${label}]`);
  if(r.sw>r.cw+1)rep.push(`[OVERFLOW ${label}] ${r.cw} -> ${r.sw}`);
  ['navDeadlines','navMore','navAdvice','undefined','NaN','[object Object]'].forEach(k=>{if(r.txt.includes(k))rep.push(`[ROHTEXT ${label}] ${k}`)});
  const sm=await page.evaluate(()=>[...new Set([...document.querySelectorAll('input,select,textarea')]
    .filter(e=>e.offsetParent!==null&&parseFloat(getComputedStyle(e).fontSize)<16).map(e=>e.id||e.className))]);
  if(sm.length)rep.push(`[iOS-ZOOM ${label}] ${sm.join(',')}`);
}

// --- Fristen ---
await page.click('[data-route="deadlines"]');await page.waitForTimeout(250);await chk('fristen-leer');
await page.click('#addDeadlineBtn');await page.waitForTimeout(300);await chk('frist-dialog');
await page.selectOption('#dlType','widerspruch');
await page.fill('#dlStart','2026-09-01');await page.waitForTimeout(200);
const calc=await page.evaluate(()=>document.querySelector('#dlCalc').innerText);
rep.push('[BERECHNUNG Widerspruch, Bescheid 01.09.2026]\n'+calc.split('\n').map(x=>'    '+x).join('\n'));
await page.fill('#dlRef','BG 1234/56789');
await page.click('#dlSave');await page.waitForTimeout(400);await chk('fristen-liste');
// zweite Frist: Weiterbewilligung
await page.click('#addDeadlineBtn');await page.waitForTimeout(250);
await page.selectOption('#dlType','weiterbewilligung');await page.fill('#dlStart','2026-11-30');await page.waitForTimeout(200);
const calc2=await page.evaluate(()=>document.querySelector('#dlCalc').innerText);
rep.push('[BERECHNUNG Weiterbewilligung, Ende 30.11.2026]\n'+calc2.split('\n').map(x=>'    '+x).join('\n'));
await page.click('#dlSave');await page.waitForTimeout(350);
const cards=await page.evaluate(()=>document.querySelectorAll('.deadline').length);
rep.push('[INFO] Fristenkarten: '+cards);
// ICS
await page.click('#exportIcsBtn');await page.waitForTimeout(600);
rep.push('[INFO] Downloads: '+JSON.stringify(dl));

// --- Bescheidanalyse ---
await page.click('[data-route="case"]');await page.waitForTimeout(250);
await page.click('#manualTextBtn');await page.waitForTimeout(250);
await page.fill('#manualDocText',`Jobcenter Berlin Mitte
Bescheid vom 01.09.2026
Aktenzeichen: 12345BG0067890
Kundennummer 987654321
Bewilligungszeitraum 01.10.2026 bis 30.09.2027
Leistungen nach dem SGB II werden bewilligt.
Monatlicher Zahlbetrag 563,00 EUR
Rechtsbehelfsbelehrung
Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Widerspruch erhoben werden.`);
await page.click('#analyzeManualTextBtn');await page.waitForTimeout(600);await chk('bescheid');
const panel=await page.evaluate(()=>document.querySelector('.notice-panel')?.innerText||'KEIN PANEL');
rep.push('[BESCHEID-PANEL]\n'+panel.split('\n').map(x=>'    '+x).join('\n'));
const hasBtn=await page.$('[data-notice-deadline]');
if(hasBtn){await hasBtn.click();await page.waitForTimeout(500);await chk('frist-aus-bescheid');
  rep.push('[INFO] Fristen nach Übernahme: '+await page.evaluate(()=>document.querySelectorAll('.deadline').length));}
else rep.push('[FEHLER] Kein Button "Als Frist übernehmen"');
// Widerspruchsschreiben
await page.click('[data-route="case"]');await page.waitForTimeout(300);
const lb=await page.$('[data-notice-letter]');
if(lb){await lb.click();await page.waitForTimeout(400);await chk('widerspruch');
  const t=await page.evaluate(()=>document.querySelector('#objectionText')?.value.slice(0,200)||'');
  rep.push('[WIDERSPRUCH]\n'+t.split('\n').map(x=>'    '+x).join('\n'));
  await page.keyboard.press('Escape');await page.waitForTimeout(200);}
else rep.push('[FEHLER] Kein Button "Widerspruch vorbereiten"');

// --- Beratung ---
await page.click('[data-route="more"]');await page.waitForTimeout(300);await chk('mehr-sheet');
await page.click('[data-more-route="advice"]');await page.waitForTimeout(350);await chk('beratung');
rep.push('[INFO] Beratungskarten: '+await page.evaluate(()=>document.querySelectorAll('.advice-card').length));
const chips=await page.$$('[data-advice-topic]');
rep.push('[INFO] Themen-Chips: '+chips.length);
if(chips[3]){await chips[3].click();await page.waitForTimeout(250);await chk('beratung-gefiltert');}
rep.push('[INFO] nach Filter: '+await page.evaluate(()=>document.querySelectorAll('.advice-card').length));

// --- Formular ausfüllen ---
// "PDF ausfüllen" erscheint nur bei vorbereiteten Werten – hier direkt ansteuern
await page.goto('http://localhost:8140/#fill');await page.reload();await page.waitForTimeout(500);await chk('pdf-fuellen');
rep.push('[INFO] fill-Ansicht geladen: '+await page.evaluate(()=>!!document.querySelector('#pdfFormFile')));

// --- 320px Durchlauf ---
await page.setViewportSize({width:320,height:640});await page.waitForTimeout(200);
for(const r of ['deadlines','case','advice','fill','home']){
  await page.evaluate(rt=>{document.querySelector(`[data-route="${rt}"]`)?.click()},r).catch(()=>{});
  await page.goto('http://localhost:8140/#'+r);await page.waitForTimeout(300);await chk(r+'@320');
}
console.log('===== FEHLER =====');console.log(errs.length?[...new Set(errs)].join('\n'):'keine');
console.log('\n===== BERICHT =====');console.log(rep.join('\n'));
await b.close();srv.close();
})().catch(e=>{console.error('HARNESS FAIL',String(e).slice(0,500));process.exit(1)});
