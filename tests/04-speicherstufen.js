const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/home/claude/app';const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,s)=>{let p=q.url.split('?')[0];if(p==='/')p='/index.html';const f=path.join(ROOT,p);fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);s.end()}else{s.writeHead(200,{'content-type':MIME[path.extname(f)]||'text/plain'});s.end(d)}})});
(async()=>{await new Promise(r=>srv.listen(8180,r));
const b=await chromium.launch();
async function run(mode){
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true});
  const p=await ctx.newPage();
  p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:8180/');await p.waitForTimeout(500);
  await p.click('#settingsBtn');await p.waitForTimeout(350);
  await p.click(`[data-mode="${mode}"]`);await p.waitForTimeout(600);
  // Formularwert setzen
  await p.evaluate(()=>{window.PuenteStorage.personal.formValues["HA:1"]="Testwert";window.PuenteStorage.save("personal")});
  await p.waitForTimeout(700);
  // 1) Reload im selben Tab
  await p.reload();await p.waitForTimeout(700);
  const afterReload=await p.evaluate(()=>window.PuenteStorage.personal.formValues["HA:1"]||null);
  // 2) Neuer Tab im selben Kontext (simuliert "Tab geschlossen und neu geöffnet")
  const p2=await ctx.newPage();
  await p2.goto('http://localhost:8180/');await p2.waitForTimeout(700);
  const inNewTab=await p2.evaluate(()=>window.PuenteStorage.personal.formValues["HA:1"]||null);
  const backend=await p2.evaluate(()=>window.PuenteStorage.status().backend);
  await ctx.close();
  return {mode,backend,afterReload,inNewTab};
}
for(const m of ['session','device','shared']) console.log(JSON.stringify(await run(m)));
await b.close();srv.close();})();
