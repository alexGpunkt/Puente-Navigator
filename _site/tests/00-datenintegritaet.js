const fs=require('fs');
const code=fs.readFileSync('data.js','utf8');
const APP_DATA=eval(code+';APP_DATA');
const out=[];
const docIds=new Set(Object.keys(APP_DATA.documents));
// 1. services requirements
for(const [sid,s] of Object.entries(APP_DATA.services)){
  for(const [id,kind] of s.requirements){
    if(!docIds.has(id)) out.push(`services.${sid}: unbekannte doc-id "${id}"`);
    if(!["required","conditional"].includes(kind)) out.push(`services.${sid}: kind "${kind}"`);
  }
}
// 2. lostPriority
(APP_DATA.lostPriority||[]).forEach(id=>{if(!docIds.has(id))out.push(`lostPriority: unbekannte doc-id "${id}"`)});
// 3. documents shape
for(const [id,d] of Object.entries(APP_DATA.documents)){
  if(!d.title?.es||!d.title?.de) out.push(`documents.${id}: title unvollständig`);
  if(!d.desc?.es||!d.desc?.de) out.push(`documents.${id}: desc unvollständig`);
  if(!Array.isArray(d.recovery)||!d.recovery.length) out.push(`documents.${id}: keine recovery`);
  (d.recovery||[]).forEach((r,i)=>{
    if(!r.es||!r.de) out.push(`documents.${id}.recovery[${i}]: Text fehlt`);
    if(!(r.level>=1&&r.level<=4)) out.push(`documents.${id}.recovery[${i}]: level ${r.level}`);
  });
  if(!d.icon) out.push(`documents.${id}: kein icon`);
}
// 4. documentTypes
const typeIds=new Set(APP_DATA.documentTypes.map(t=>t.id));
if(!typeIds.has('other'))out.push('documentTypes: "other" fehlt');
APP_DATA.documentTypes.forEach(t=>{if(!t.title?.es||!t.title?.de)out.push(`documentTypes.${t.id}: title unvollständig`)});
// documentTypes that should map to documents for autoMark
[...typeIds].forEach(t=>{if(t!=="other"&&!docIds.has(t))out.push(`documentTypes."${t}" hat kein Gegenstück in documents (autoMark greift nicht)`)});
// 5. formMaps
const formIds={};
for(const [sid,map] of Object.entries(APP_DATA.formMaps)){
  if(!map.forms?.length){out.push(`formMaps.${sid}: keine forms`);continue}
  for(const f of map.forms){
    formIds[f.id]=new Set(f.fields.map(x=>String(x.no)));
    if(!f.source) out.push(`formMaps.${sid}.${f.id}: keine source-URL`);
    const seen=new Set();
    f.fields.forEach(fl=>{
      const k=String(fl.no);
      if(seen.has(k))out.push(`formMaps.${sid}.${f.id}: doppelte Feldnummer ${k}`);
      seen.add(k);
      if(!fl.title?.es||!fl.title?.de)out.push(`formMaps.${sid}.${f.id}.${k}: title unvollständig`);
      if(fl.helpDoc&&!docIds.has(fl.helpDoc))out.push(`formMaps.${sid}.${f.id}.${k}: helpDoc "${fl.helpDoc}" unbekannt`);
    });
  }
}
// duplicate form ids across maps?
const allFormIds=Object.values(APP_DATA.formMaps).flatMap(m=>m.forms.map(f=>f.id));
const dup=allFormIds.filter((x,i)=>allFormIds.indexOf(x)!==i);
if(dup.length)out.push(`formMaps: doppelte form-ids über Services hinweg: ${[...new Set(dup)].join(', ')} (formValues-Keys kollidieren)`);
// 6. factToForm
for(const [key,links] of Object.entries(APP_DATA.factToForm||{})){
  if(!APP_DATA.factLabels[key])out.push(`factToForm."${key}": kein factLabel`);
  links.forEach(l=>{
    if(!formIds[l.form]) out.push(`factToForm.${key}: unbekanntes Formular "${l.form}"`);
    else if(!formIds[l.form].has(String(l.no))) out.push(`factToForm.${key}: Feld ${l.form}:${l.no} existiert nicht`);
  });
}
// 7. facts produced by extractFacts must have labels
const factKeys=["taxId","rvNumber","iban","birthDate","birthPlace","nationality","healthFund","healthInsuranceNo","livingArea","rentCold","rentOperating","rentHeating","rentTotal","grossIncome","netIncome","benefitAmount","contractStart","employmentStart","employmentEnd","firstName","lastName"];
factKeys.forEach(k=>{if(!APP_DATA.factLabels[k])out.push(`factLabels: "${k}" fehlt (wird von extractFacts/dossier genutzt)`)});
// 8. assistantQuestions
(APP_DATA.assistantQuestions||[]).forEach(q=>{
  if(!["single","multi"].includes(q.type))out.push(`assistantQuestions.${q.id}: type "${q.type}"`);
  if(!q.title?.es||!q.title?.de)out.push(`assistantQuestions.${q.id}: title unvollständig`);
  const vals=q.options.map(o=>o.value);
  const d=vals.filter((x,i)=>vals.indexOf(x)!==i);
  if(d.length)out.push(`assistantQuestions.${q.id}: doppelte option values ${d}`);
  (q.exclusive||[]).forEach(e=>{if(!vals.includes(e))out.push(`assistantQuestions.${q.id}: exclusive "${e}" nicht in options`)});
});
// 9. annexRules keys referenced from profile answers
const profileVals=new Set();
(APP_DATA.assistantQuestions||[]).forEach(q=>q.options.forEach(o=>profileVals.add(o.value)));
Object.keys(APP_DATA.annexRules||{}).forEach(k=>{if(!["base","rent"].includes(k)&&!profileVals.has(k))out.push(`annexRules."${k}" wird von keiner Assistenten-Option ausgelöst`)});
// 10. sources
(APP_DATA.sources||[]).forEach((s,i)=>{if(!s.url||!/^https?:/.test(s.url))out.push(`sources[${i}]: URL ${s.url}`)});
// 11. UI keys parity
const es=Object.keys(APP_DATA.ui.es),de=Object.keys(APP_DATA.ui.de);
es.filter(k=>!de.includes(k)).forEach(k=>out.push(`ui.de fehlt Schlüssel "${k}"`));
de.filter(k=>!es.includes(k)).forEach(k=>out.push(`ui.es fehlt Schlüssel "${k}"`));
console.log(out.length?out.join("\n"):"keine Datenfehler gefunden");
console.log("\n--- Stats ---");
console.log("documents:",docIds.size,"| documentTypes:",typeIds.size,"| assistantQuestions:",APP_DATA.assistantQuestions.length);
console.log("formMaps:",Object.entries(APP_DATA.formMaps).map(([k,m])=>`${k}:${m.forms.map(f=>f.id+"("+f.fields.length+")").join(",")}`).join(" | "));
