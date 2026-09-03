const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/claude/app';const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,s)=>{let p=q.url.split('?')[0];if(p==='/')p='/index.html';const f=path.join(ROOT,p);fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);s.end()}else{s.writeHead(200,{'content-type':MIME[path.extname(f)]||'text/plain'});s.end(d)}})});
const PDFLIB=fs.readFileSync(require.resolve('pdf-lib/dist/pdf-lib.min.js'),'utf8');
(async()=>{
await new Promise(r=>srv.listen(8150,r));
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
// pdf-lib lokal bereitstellen, da das CDN in dieser Umgebung nicht erreichbar ist
await ctx.addInitScript(PDFLIB);
const page=await ctx.newPage();
page.on('pageerror',e=>console.log('!! PAGEERROR:',e.message));
page.on('console',m=>{if(m.type()==='error')console.log('!! console:',m.text())});
await page.goto('http://localhost:8150/');await page.waitForTimeout(300);
console.log('PDFLib vorhanden:',await page.evaluate(()=>typeof window.PDFLib));

// Werte vorbereiten: Formularfelder + bestaetigte Angaben
await page.evaluate(()=>{
  sessionStorage.setItem('puente-form-values-v3',JSON.stringify({
    "HA:1":"María","HA:2":"Gómez Ruiz","HA:3":"14.05.1988",
     "HA:18":"TEST-IBAN","HA:21":"TEST-ID","KDU:20":"Kaltmiete: 640,00 €"
  }));
  sessionStorage.setItem('puente-document-session-v3',JSON.stringify({
    docs:[],ignoredFacts:{},approvedFacts:{livingArea:{value:"62,5 m²",source:"Mietvertrag"}}
  }));
  localStorage.setItem("puente:v6:app",JSON.stringify({lang:'de',route:'fill',formService:'grundsicherung'}));
});
await page.goto('http://localhost:8150/#fill');await page.reload();await page.waitForTimeout(600);
console.log('Route:',await page.evaluate(()=>window.PuenteStorage?.app?.route ?? '(unbekannt)'));
console.log('Vorbereitete Werte laut UI:',await page.evaluate(()=>document.querySelector('#pdfFieldArea')?.previousElementSibling?.innerText.trim()));

await page.setInputFiles('#pdfFormFile','/home/claude/testformular.pdf');
await page.waitForTimeout(1200);
const info=await page.evaluate(()=>{
  const rows=[...document.querySelectorAll('.map-row')].map(r=>({feld:r.querySelector('.map-field').textContent,zuordnung:r.querySelector('select').selectedOptions[0].textContent.trim()}));
  return {kopf:document.querySelector('#pdfFieldArea .section-title')?.innerText.replace(/\n/g,' | '),rows};
});
console.log('\n'+info.kopf);info.rows.forEach(r=>console.log('  '+r.feld.padEnd(30)+' -> '+r.zuordnung));
const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#pdfFill')]);
const out='/home/claude/gefuellt.pdf';await dl.saveAs(out);
console.log('\nDatei:',dl.suggestedFilename());
const {PDFDocument}=require('pdf-lib');
const doc=await PDFDocument.load(fs.readFileSync(out));
console.log('\n--- Werte im heruntergeladenen PDF ---');
doc.getForm().getFields().forEach(f=>{let v='';try{v=f.getText()||''}catch(_){v='(kein Textfeld)'}console.log('  '+f.getName().padEnd(30)+' = '+JSON.stringify(v));});
const [dl2]=await Promise.all([page.waitForEvent('download'),page.click('#pdfAppendix')]);
await dl2.saveAs('/home/claude/ausfuellhilfe.pdf');
const doc2=await PDFDocument.load(fs.readFileSync('/home/claude/ausfuellhilfe.pdf'));
console.log('\nAusfüllhilfe:',dl2.suggestedFilename(),'· Seiten:',doc2.getPageCount());
await b.close();srv.close();
})().catch(e=>{console.error('FAIL',String(e).slice(0,600));process.exit(1)});
