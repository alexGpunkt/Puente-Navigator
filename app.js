
(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const defaultState = {
    lang:"es", route:"home", service:null, formService:null,
    statuses:{}, profile:{}, assistantStep:0, assistantDone:false, showAllFields:false,
    settings:{}, phase:"prepare"
  };
  const ROUTES=["home","assistant","service","fields","case","dossier","docs","lost","progress","deadlines","advice","fill","settings","outbox","household"];
  function obj(v){ return (v && typeof v==="object" && !Array.isArray(v)) ? v : {}; }

  const Storage = window.PuenteStorage;
  let state = null, formValues = null, docSession = null;
  const CAPTURE = window.PuenteCapture || null;
  let storageAlert = null;     // letzte Schreibstörung, wird als Banner gezeigt
  const liveFiles = new Map();

  function normalizeState(raw){
    const st={...defaultState, ...obj(raw)};
    // Defekte oder veraltete Werte abfangen, damit die App nicht weiss startet.
    if(!APP_DATA.ui[st.lang]) st.lang=defaultState.lang;
    if(!ROUTES.includes(st.route)) st.route="home";
    st.statuses=obj(st.statuses);
    st.profile=obj(st.profile);
    st.settings=obj(st.settings);
    if(!["prepare","submitted","decided"].includes(st.phase)) st.phase="prepare";
    st.assistantStep=Number.isFinite(st.assistantStep)?st.assistantStep:0;
    for(const id of Object.keys(st.statuses)) if(!APP_DATA.documents[id]) delete st.statuses[id];
    return st;
  }

  // Schreiben laeuft ueber das Speichermodul: es buendelt Schreibvorgaenge,
  // waehlt je nach Stufe sessionStorage oder IndexedDB und meldet Fehler.
  function saveState(){ Storage.save("app"); }
  function saveSession(){ Storage.save("personal"); }
  function saveDocSession(){ Storage.save("personal"); }
  function tr(key){ return (APP_DATA.ui[state.lang]||APP_DATA.ui.es)[key] ?? APP_DATA.ui.es[key] ?? key; }
  function tx(obj){ return obj?.[state.lang] ?? ""; }
  function esc(s=""){ return String(s).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
  function arr(v){ return Array.isArray(v) ? v : []; }
  function L(es,de){ return state.lang==="es" ? es : de; }

  function setRoute(route, opts={}){
    if(!ROUTES.includes(route)) route="home";
    const changed = state.route!==route || opts.service!==undefined || opts.formService!==undefined;
    state.route = route;
    if(opts.service !== undefined) state.service = opts.service;
    if(opts.formService !== undefined) state.formService = opts.formService;
    saveState();
    // Android-Zurueck-Taste soll in der App navigieren, nicht die App verlassen.
    if(changed && !opts.fromHistory){
      try{ history.pushState({route,service:state.service,formService:state.formService},"",`#${route}`); }catch(_){}
    }
    render();
    scrollTop();
  }

  function scrollTop(){
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    window.scrollTo({top:0, behavior: reduce?"auto":"smooth"});
  }

  function announceRoute(){
    const el=$("#routeAnnouncer"); if(!el) return;
    const names={home:tr("navHome"),assistant:tr("navAssistant"),case:tr("navCase"),
      docs:tr("navDocs"),lost:tr("navLost"),progress:tr("progress"),
      deadlines:tr("navDeadlines"),advice:tr("navAdvice"),
      service:L("Checklist","Checkliste"), fields:L("Formulario","Formular"),
      dossier:L("Expediente","Fallakte"), fill:L("Formulario oficial","Amtliches Formular")};
    el.textContent=names[state.route]||"";
  }

  function storageBanner(){
    const a=storageAlert; if(!a) return "";
    const quota=a.quota;
    return `<div class="notice danger storage-alert">
      <strong>⚠️ ${L("No se ha podido guardar","Speichern nicht möglich")}:</strong>
      ${quota
        ? L("La memoria del navegador está llena. Los últimos cambios podrían no conservarse. Exporta el expediente y borra documentos que ya no necesites.",
            "Der Browserspeicher ist voll. Die letzten Änderungen sind womöglich nicht gesichert. Bitte die Fallakte exportieren und nicht mehr benötigte Dokumente löschen.")
        : L("Los cambios podrían no conservarse en este navegador (por ejemplo en modo privado).",
            "Änderungen werden in diesem Browser womöglich nicht gesichert (etwa im privaten Modus).")}
      <div class="toolbar">
        <button type="button" class="ghost-btn" id="storageAlertOk">${L("Entendido","Verstanden")}</button>
        <button type="button" class="secondary-btn" data-go="dossier">${L("Exportar expediente","Fallakte exportieren")}</button>
      </div>
    </div>`;
  }

  function settingsView(){
    const st=Storage.status();
    const modes=[
      {id:"session", icon:"🕐", title:L("Sesión","Sitzung"),
       sub:L("Los datos personales desaparecen al cerrar la pestaña. Recomendado.",
             "Persönliche Daten verschwinden beim Schließen des Tabs. Empfohlen.")},
      {id:"device", icon:"📱", title:L("Dispositivo","Gerät"),
       sub:L("Los datos confirmados permanecen hasta que los borres. Solo en un móvil propio.",
             "Bestätigte Angaben bleiben, bis sie gelöscht werden. Nur auf einem eigenen Handy.")},
      {id:"shared", icon:"👥", title:L("Dispositivo compartido","Geteiltes Gerät"),
       sub:L("Como sesión, y además borrado automático tras 15 minutos sin actividad.",
             "Wie Sitzung, zusätzlich automatische Löschung nach 15 Minuten ohne Aktivität.")}
    ];
    return `
      <div class="service-head">
        <div class="big-icon">⚙️</div>
        <div><h1>${L("Ajustes y privacidad","Einstellungen und Datenschutz")}</h1>
        <p>${L("Dónde se guardan tus datos y cuándo se borran.","Wo die Daten liegen und wann sie gelöscht werden.")}</p></div>
      </div>

      <div class="section-title"><div><h2>${L("Conservación de datos","Datenhaltung")}</h2></div></div>
      <div class="mode-list">
        ${modes.map(m=>`<button type="button" class="mode-item ${m.id===st.mode?"active":""}" data-mode="${m.id}">
          <span class="more-icon" aria-hidden="true">${m.icon}</span>
          <span><strong>${esc(m.title)}</strong><small>${esc(m.sub)}</small></span>
          <span class="mode-check" aria-hidden="true">${m.id===st.mode?"✓":""}</span>
        </button>`).join("")}
      </div>
      ${st.mode==="device"?`<div class="notice warning">${L(
        "En este modo quedan datos sociales en el dispositivo. No lo uses en un equipo compartido o prestado.",
        "In dieser Stufe bleiben Sozialdaten auf dem Gerät liegen. Nicht auf einem geteilten oder geliehenen Gerät verwenden.")}</div>`:""}

      <div class="section-title"><div><h2>${L("Voz","Sprache")}</h2></div></div>
      <label class="checkline"><input type="checkbox" id="voiceConsent" ${state.settings?.voiceConsent?"checked":""}>
        ${L("Permitir reconocimiento de voz (el audio se envía al fabricante del navegador)",
            "Spracherkennung erlauben (das Audio geht an den Browser-Hersteller)")}</label>
      <p class="small">${L("Leer en voz alta funciona siempre y sin conexión; no necesita esta casilla.",
                           "Das Vorlesen funktioniert immer und ohne Verbindung; dafür ist dieses Häkchen nicht nötig.")}</p>

      <div class="section-title"><div><h2>${L("Estado","Status")}</h2></div></div>
      <table class="dossier-table"><tbody>
        <tr><th>${L("Almacén","Ablage")}</th><td>${esc(st.backend)}</td></tr>
        <tr><th>${L("Versión de datos","Datenversion")}</th><td>${st.schema}</td></tr>
        <tr><th>${L("Tamaño aproximado","Ungefähre Größe")}</th><td>${formatBytes(st.bytes)}</td></tr>
        ${st.lastError?`<tr><th>${L("Última incidencia","Letzte Störung")}</th><td>${esc(st.lastError.where)}: ${esc(st.lastError.message)}</td></tr>`:""}
      </tbody></table>

      <div class="toolbar">
        <button type="button" class="secondary-btn" id="clearPersonalBtn">🧹 ${L("Borrar datos personales ahora","Persönliche Daten jetzt löschen")}</button>
        <button type="button" class="danger-btn" id="resetBtn">🗑️ ${tr("reset")}</button>
      </div>

      <div class="notice">${tr("privacyShort")}</div>
    
      <div class="section-title"><div><h2>${L("Traspaso del caso","Fallübergabe")}</h2>
        <p>${L("Pasar el caso a otro dispositivo por código QR o archivo, sin servidor.","Den Fall per QR-Code oder Datei auf ein anderes Gerät übergeben, ohne Server.")}</p></div></div>
      <div class="toolbar"><button type="button" class="secondary-btn" id="handoverBtn">🔄 ${L("Abrir traspaso","Übergabe öffnen")}</button></div>
    `;
  }

  function toast(msg){
    const el=$("#toast"); if(!el) return;
    el.textContent=msg; el.hidden=false; el.classList.add("show");
    clearTimeout(toast._t);
    toast._t=setTimeout(()=>{el.classList.remove("show");setTimeout(()=>{el.hidden=true},250)},2200);
  }

  function render(){
    try { renderInner(); }
    catch(err){
      // Ein Fehler in einer Ansicht darf nicht die ganze App unbrauchbar machen.
      console.error("Puente render:", err);
      renderFailure(err);
    }
  }

  function renderFailure(err){
    const app=$("#app"); if(!app) return;
    const lang=(state&&state.lang)==="es"?"es":"de";
    const t=(es,de)=>lang==="es"?es:de;
    app.innerHTML=`
      <div class="notice danger">
        <strong>${t("Algo ha fallado en esta pantalla.","Auf diesem Bildschirm ist etwas schiefgelaufen.")}</strong>
        <p>${t("Tus datos siguen guardados. Puedes volver al inicio y continuar.",
               "Deine Daten sind weiterhin gespeichert. Du kannst zur Startseite zurück und weiterarbeiten.")}</p>
        <div class="toolbar">
          <button type="button" class="primary-btn" id="failHome">${t("Ir al inicio","Zur Startseite")}</button>
          <button type="button" class="ghost-btn" id="failDetails">${t("Detalles técnicos","Technische Details")}</button>
        </div>
        <pre id="failPre" class="fail-pre" hidden>${esc(String(err&&err.stack||err))}</pre>
      </div>`;
    $("#failHome")?.addEventListener("click",()=>{ state.route="home"; saveState(); render(); });
    $("#failDetails")?.addEventListener("click",()=>{ const p=$("#failPre"); if(p) p.hidden=!p.hidden; });
  }

  function renderInner(){
    document.documentElement.lang = state.lang;
    $("#langBtn").textContent = state.lang==="es" ? "DE" : "ES";
    $("#brandSubtitle").textContent = state.lang==="es" ? "Ayuda con trámites en Alemania" : "Hilfe bei Behördenwegen in Deutschland";
    if($("#caseNavLabel")) $("#caseNavLabel").textContent = state.lang==="es" ? "Caso" : "Fall";
    $$('[data-i18n]').forEach(el => el.textContent = tr(el.dataset.i18n));
    // Unterseiten einem Haupt-Tab zuordnen, damit die untere Navigation nie leer wirkt.
    const navGroup={service:"assistant",fields:"assistant",fill:"assistant",
      dossier:"case",progress:"case",docs:"more",lost:"more",advice:"more",
      settings:"more",outbox:"case",household:"case"}[state.route]||state.route;
    $$(".nav-btn").forEach(b => {
      const on=b.dataset.route===navGroup;
      b.classList.toggle("active", on);
      if(on) b.setAttribute("aria-current","page"); else b.removeAttribute("aria-current");
    });

    const app = $("#app");
    if(state.route==="home") app.innerHTML = homeView();
    else if(state.route==="assistant") app.innerHTML = assistantView();
    else if(state.route==="service") app.innerHTML = serviceView(state.service);
    else if(state.route==="fields") app.innerHTML = fieldsView(state.formService || state.service || "grundsicherung");
    else if(state.route==="case") app.innerHTML = caseView();
    else if(state.route==="dossier") app.innerHTML = dossierView();
    else if(state.route==="docs") app.innerHTML = docsView();
    else if(state.route==="lost") app.innerHTML = lostView();
    else if(state.route==="progress") app.innerHTML = progressView();
    else if(state.route==="deadlines") app.innerHTML = FEATURES ? FEATURES.deadlinesView() : homeView();
    else if(state.route==="advice") app.innerHTML = FEATURES ? FEATURES.adviceView() : homeView();
    else if(state.route==="fill") app.innerHTML = FEATURES ? FEATURES.fillView() : homeView();
    else if(state.route==="outbox") app.innerHTML = FEATURES ? FEATURES.outboxView() : homeView();
    else if(state.route==="household") app.innerHTML = FEATURES ? FEATURES.householdView() : homeView();
    else if(state.route==="settings") app.innerHTML = settingsView();
    else app.innerHTML = homeView();
    if(storageAlert) app.insertAdjacentHTML("afterbegin", storageBanner());
    const rb=$("#readBtn"); if(rb) rb.hidden = !(VOICE && VOICE.canSpeak());
    bindViewEvents();
    announceRoute();
  }

  /** Leitet aus dem Zustand genau einen sinnvollen nächsten Schritt ab. */
  function nextStep(){
    const urgent=FEATURES?.openCount()||0;
    if(urgent) return {icon:"⏳", route:"deadlines",
      title:L("Hay un plazo cerca","Eine Frist läuft"),
      text:L("Míralo antes que nada: un plazo vencido cuesta más que un formulario incompleto.",
             "Zuerst ansehen: eine versäumte Frist kostet mehr als ein unvollständiger Antrag."),
      cta:L("Ver plazos","Fristen ansehen"), tone:"danger"};

    if(!Object.keys(state.profile||{}).length) return {icon:"🧭", route:"assistant",
      title:L("Empezar por el asistente","Mit dem Assistenten beginnen"),
      text:L("Diez preguntas breves ordenan el caso y muestran qué documentos hacen falta.",
             "Zehn kurze Fragen ordnen den Fall und zeigen, welche Unterlagen gebraucht werden."),
      cta:L("Empezar","Starten"), tone:"brand"};

    const svc=dossierService();
    const missing=dossierRequirements(svc).filter(r=>r.status!=="have");
    if(missing.length){
      const first=missing[0].doc;
      return {icon:first?.icon||"📄", route:"service", service:svc,
        title:L("Falta un documento","Es fehlt eine Unterlage"),
        text:L(`Lo siguiente: ${tx(first?.title)||""}. Quedan ${missing.length} por reunir.`,
               `Als Nächstes: ${tx(first?.title)||""}. Es fehlen noch ${missing.length}.`),
        cta:L("Ver cómo conseguirlo","Beschaffungsweg ansehen"), tone:"brand"};
    }
    if(state.phase==="prepare") return {icon:"📑", route:"dossier",
      title:L("El expediente está completo","Die Fallakte ist vollständig"),
      text:L("Imprime el expediente, entrégalo y anota el envío para tener prueba.",
             "Fallakte drucken, einreichen und die Sendung eintragen, damit es einen Beleg gibt."),
      cta:L("Abrir expediente","Fallakte öffnen"), tone:"ok"};
    return {icon:"📮", route:"outbox",
      title:L("Solicitud entregada","Antrag ist raus"),
      text:L("Anota la vía de entrega y espera la resolución. Cuando llegue, fotografíala en el área del caso.",
             "Den Weg der Abgabe festhalten und auf den Bescheid warten. Wenn er kommt, im Fall-Arbeitsbereich fotografieren."),
      cta:L("Libro de envíos","Postausgangsbuch"), tone:"ok"};
  }

  function phaseBar(){
    const phases=[
      {id:"prepare",  icon:"📋", label:L("Preparar","Vorbereiten")},
      {id:"submitted",icon:"📮", label:L("Entregado","Eingereicht")},
      {id:"decided",  icon:"⚖️", label:L("Resolución","Bescheid")}
    ];
    return `<div class="phase-bar" role="group" aria-label="${L("Fase del caso","Phase des Falls")}">
      ${phases.map(p=>`<button type="button" class="phase ${p.id===state.phase?"active":""}" data-phase="${p.id}">
        <span aria-hidden="true">${p.icon}</span><small>${esc(p.label)}</small></button>`).join("")}
    </div>`;
  }

  function homeView(){
    const step=nextStep();
    const hasCase=Object.keys(state.profile||{}).length>0;
    // Bereiche, die in der aktuellen Phase nichts beitragen, bleiben weg.
    const showBescheid = state.phase!=="prepare";
    const showOutbox   = state.phase!=="prepare" || (FEATURES?.outboxCount()||0)>0;

    return `
      <section class="hero next-step ${step.tone}">
        <div class="next-icon" aria-hidden="true">${step.icon}</div>
        <h1>${esc(step.title)}</h1>
        <p>${esc(step.text)}</p>
        <button class="primary-btn next-cta" data-go="${step.route}"${step.service?` data-service-hint="${step.service}"`:""}>${esc(step.cta)} →</button>
      </section>

      ${hasCase?phaseBar():""}

      <div class="section-title">
        <div><h2>${tr("choose")}</h2></div>
        <button type="button" class="ghost-btn" id="toggleAreas">${state.settings?.showAreas?L("Menos","Weniger"):L("Todas las áreas","Alle Bereiche")}</button>
      </div>

      <section class="grid">
        ${serviceCard("grundsicherung")}
        ${serviceCard("wohngeld")}
        <article class="card clickable" data-go="case">
          <div class="card-icon">📎</div>
          <h3>${L("Caso y documentos","Fall & Dokumente")}</h3>
          <p>${L("Fotografiar documentos y proponer datos.","Dokumente fotografieren und Angaben vorschlagen.")}</p>
          <div class="meta">${docBadge()}</div>
        </article>
        <article class="card clickable" data-go="deadlines">
          <div class="card-icon">⏳</div>
          <h3>${L("Plazos","Fristen")}</h3>
          <p>${L("Calcular, recordar y pasar al calendario.","Berechnen, erinnern, in den Kalender übernehmen.")}</p>
          <div class="meta">${dueBadge()}</div>
        </article>

        ${state.settings?.showAreas?`
        ${showOutbox?`<article class="card clickable" data-go="outbox">
          <div class="card-icon">📮</div>
          <h3>${L("Libro de envíos","Postausgangsbuch")}</h3>
          <p>${L("Qué se entregó, cuándo y con qué prueba.","Was wann und mit welchem Beleg herausging.")}</p>
        </article>`:""}
        <article class="card clickable" data-go="advice">
          <div class="card-icon">🤝</div>
          <h3>${L("Asesoría personal","Persönliche Beratung")}</h3>
          <p>${L("Servicios gratuitos y confidenciales.","Kostenlose, vertrauliche Stellen.")}</p>
        </article>
        <article class="card clickable" data-go="docs">
          <div class="card-icon">🔎</div><h3>${tr("docsTitle")}</h3><p>${tr("docsSub")}</p>
        </article>
        <article class="card clickable" data-go="lost">
          <div class="card-icon">🔥</div><h3>${tr("lostTitle")}</h3><p>${tr("lostSub")}</p>
        </article>
        ${showBescheid?`<article class="card clickable" data-go="case">
          <div class="card-icon">⚖️</div>
          <h3>${L("Analizar resolución","Bescheid auswerten")}</h3>
          <p>${L("Fotografía la resolución: Puente calcula el plazo de recurso.","Bescheid fotografieren: Puente berechnet die Widerspruchsfrist.")}</p>
        </article>`:""}
        `:""}
      </section>

      ${sourcesBlock()}
      <p class="small">${tr("legalNote")} · v${APP_DATA.meta.version} · ${APP_DATA.meta.updated}</p>
    `;
  }

  function docBadge(){
    const n=docSession.docs.length;
    return n?`<span class="badge ok">${n} ${L("documento(s)","Dokument(e)")}</span>`
            :`<span class="badge">${L("vacío","leer")}</span>`;
  }

  function dueBadge(){
    const c=FEATURES?.openCount()||0;
    if(!c) return `<span class="badge">${L("sin plazos urgentes","keine dringenden Fristen")}</span>`;
    return `<span class="badge bad">${c} ${L("plazo(s) en 14 días","Frist(en) in 14 Tagen")}</span>`;
  }

  function assistantView(){
    if(state.assistantDone) return assistantResultView();
    const qs = APP_DATA.assistantQuestions;
    const i = Math.max(0, Math.min(state.assistantStep || 0, qs.length-1));
    const q = qs[i];
    const selected = state.profile[q.id];

    return `
      <div class="wizard-shell">
        <div class="service-head">
          <div class="big-icon">🧭</div>
          <div>
            <h1>${state.lang==="es"?"Asistente guiado":"Geführter Fall-Assistent"}</h1>
            <p>${state.lang==="es"?"Solo preguntas de clasificación. No calcula automáticamente un derecho legal.":"Nur Einordnungsfragen. Es wird kein Rechtsanspruch automatisch berechnet."}</p>
          </div>
        </div>
        <div class="wizard-progress">
          ${qs.map((_,idx)=>`<div class="wizard-dot ${idx<i?"done":idx===i?"current":""}"></div>`).join("")}
        </div>
        <article class="question-card">
          <div class="small">${state.lang==="es"?`Pregunta ${i+1} de ${qs.length}`:`Frage ${i+1} von ${qs.length}`}</div>
          <h2>${tx(q.title)}</h2>
          <p>${tx(q.help)}</p>
          <div class="option-grid">
            ${q.options.map(opt=>assistantOption(q,opt,selected)).join("")}
          </div>
          <div class="wizard-actions">
            <button class="ghost-btn" id="assistantBack" ${i===0?"disabled":""}>← ${state.lang==="es"?"Atrás":"Zurück"}</button>
            <button class="primary-btn" id="assistantNext">${i===qs.length-1 ? (state.lang==="es"?"Ver resultado":"Ergebnis anzeigen") : (state.lang==="es"?"Siguiente":"Weiter")} →</button>
          </div>
        </article>
        <div class="privacy-session">🔒 ${state.lang==="es"
          ?"Estas respuestas de clasificación se guardan solo en este navegador. Los valores personales que se escriban más tarde en la preparación del formulario se guardan solo durante la sesión."
          :"Diese Einordnungsantworten werden nur in diesem Browser gespeichert. Persönliche Werte in der späteren Formularvorbereitung werden nur für die Sitzung gespeichert."}</div>
      </div>
    `;
  }

  function assistantOption(q,opt,selected){
    const isSelected = q.type==="multi" ? arr(selected).includes(opt.value) : selected===opt.value;
    return `<button type="button" class="option-btn ${isSelected?"selected":""}" data-qid="${q.id}" data-qtype="${q.type}" data-opt="${opt.value}">
      <strong>${tx(opt.label)}</strong>${opt.desc?`<small>${tx(opt.desc)}</small>`:""}
    </button>`;
  }

  function assistantResultView(){
    const p = state.profile;
    const rec = makeRecommendations(p);
    const preferred = rec.preferred || (p.target && p.target!=="unknown" ? p.target : "grundsicherung");
    const annexes = preferred==="grundsicherung" ? getAnnexes(p) : [];
    const relevant = getRelevantRequirements(preferred);

    return `
      <div class="wizard-shell">
        <div class="result-hero">
          <div class="result-score">
            <div class="score-icon">🧭</div>
            <div>
              <h2>${state.lang==="es"?"Resultado de orientación":"Orientierungsergebnis"}</h2>
              <p>${state.lang==="es"?"La app organiza el siguiente paso; la decisión final corresponde a la autoridad competente.":"Die App strukturiert den nächsten Schritt; die endgültige Entscheidung trifft die zuständige Behörde."}</p>
            </div>
          </div>
        </div>

        ${rec.blocks.map(b=>`<div class="notice recommendation ${b.level||""}"><strong>${b.icon||"ℹ️"} ${tx(b.title)}:</strong> ${tx(b.text)}</div>`).join("")}

        <div class="section-title"><div><h2>${state.lang==="es"?"Ruta preparada":"Vorbereiteter Weg"}</h2></div></div>
        <section class="grid">
          <article class="card">
            <div class="card-icon">${APP_DATA.services[preferred]?.icon||"📋"}</div>
            <h3>${APP_DATA.services[preferred]?tx(APP_DATA.services[preferred].title):(state.lang==="es"?"Consulta especializada":"Fachberatung")}</h3>
            <p>${APP_DATA.services[preferred]?tx(APP_DATA.services[preferred].subtitle):(state.lang==="es"?"La situación queda fuera del alcance principal de este prototipo.":"Die Situation liegt außerhalb des Kernbereichs dieses Prototyps.")}</p>
            ${APP_DATA.services[preferred]?`<div class="toolbar">
              <button class="secondary-btn" data-service="${preferred}">📂 ${state.lang==="es"?"Checklist personal":"Personalisierte Checkliste"}</button>
              <button class="primary-btn" data-fields="${preferred}">📝 ${state.lang==="es"?"Preparar formulario":"Formular vorbereiten"}</button>
              <button class="secondary-btn" data-go="case">📎 ${state.lang==="es"?"Añadir documentos":"Dokumente hinzufügen"}</button>
            </div>`:""}
          </article>
          <article class="card">
            <div class="card-icon">📎</div>
            <h3>${state.lang==="es"?"Documentos relevantes":"Relevante Unterlagen"}</h3>
            <p>${relevant.length} ${state.lang==="es"?"grupos de documentos según las respuestas.":"Unterlagengruppen nach den Antworten."}</p>
            <div class="meta">${relevant.slice(0,6).map(([id])=>`<span class="badge">${APP_DATA.documents[id]?.icon||"📄"} ${esc(tx(APP_DATA.documents[id]?.title)||id)}</span>`).join("")}</div>
          </article>
        </section>

        ${preferred==="grundsicherung" ? `
          <div class="section-title"><div><h2>${state.lang==="es"?"Anexos probables del Jobcenter":"Voraussichtlich relevante Jobcenter-Anlagen"}</h2></div></div>
          <div class="attachment-list">
            ${annexes.map(a=>`<span class="attachment ${a.conditional?"":"required"}">${a.name}${a.conditional?" · ?":""}</span>`).join("")}
          </div>
          <p class="rule-note">${state.lang==="es"
            ?"VM y EK forman parte de la comprobación básica; otros anexos se activan por vivienda, composición del hogar y situaciones especiales."
            :"VM und EK gehören zur Grundprüfung; weitere Anlagen werden durch Wohnsituation, Haushaltskonstellation und besondere Lebenslagen aktiviert."}</p>
        `:""}

        <div class="toolbar">
          <button class="ghost-btn" id="assistantEdit">← ${state.lang==="es"?"Cambiar respuestas":"Antworten ändern"}</button>
          <button class="danger-btn" id="caseReset">🗑️ ${state.lang==="es"?"Borrar caso":"Fall löschen"}</button>
        </div>
      </div>
    `;
  }

  function makeRecommendations(p){
    const blocks=[];
    let preferred = p.target && p.target!=="unknown" ? p.target : null;

    if(p.workability==="no"){
      blocks.push({
        icon:"⚠️",level:"warn",
        title:{es:"Jobcenter no es una conclusión automática",de:"Jobcenter nicht automatisch passend"},
        text:{es:"Si la persona no puede trabajar al menos 3 horas diarias, conviene aclarar primero si corresponde Sozialamt/Grundsicherung SGB XII u otra prestación.",de:"Wenn die Person nicht mindestens 3 Stunden täglich arbeiten kann, sollte zuerst geklärt werden, ob Sozialamt/Grundsicherung nach SGB XII oder eine andere Leistung zuständig ist."}
      });
      if(!preferred) preferred = p.housing==="rent" ? "wohngeld" : "grundsicherung";
    }

    if(["sgb2","sgb12","asyl"].includes(p.housing_transfer)){
      blocks.push({
        icon:"🏠",level:"warn",
        title:{es:"Wohngeld puede estar excluido",de:"Wohngeld kann ausgeschlossen sein"},
        text:{es:"Ya existe una prestación que puede incluir costes de vivienda. Antes de presentar Wohngeld, hay que aclararlo con la Wohngeldbehörde; estas prestaciones suelen excluir Wohngeld.",de:"Es besteht bereits eine Leistung, die Unterkunftskosten berücksichtigen kann. Vor einem Wohngeldantrag sollte dies mit der Wohngeldbehörde geklärt werden; solche Leistungen schließen Wohngeld häufig aus."}
      });
      if(!preferred && p.housing_transfer==="sgb2") preferred="grundsicherung";
    }

    if(["student","training"].includes(p.education)){
      blocks.push({
        icon:"🎓",level:"warn",
        title:{es:"Formación/estudios requieren una comprobación aparte",de:"Ausbildung/Studium gesondert prüfen"},
        text:{es:"BAföG o BAB pueden cambiar o excluir el acceso a Wohngeld o a prestaciones del Jobcenter. El asistente mantiene los documentos visibles, pero recomienda revisar este punto.",de:"BAföG oder BAB können Wohngeld bzw. Jobcenter-Leistungen verändern oder ausschließen. Der Assistent hält die Unterlagen sichtbar, empfiehlt aber eine gesonderte Prüfung."}
      });
    }

    if(!preferred){
      const income = arr(p.income);
      if(p.workability==="yes" && income.includes("none")){
        preferred="grundsicherung";
        blocks.push({
          icon:"🧾",
          title:{es:"Primero comprobar Grundsicherungsgeld",de:"Grundsicherungsgeld zuerst prüfen"},
          text:{es:"La persona indica capacidad laboral y ningún ingreso actual. Esto hace razonable preparar primero el expediente del Jobcenter, sin afirmar que exista derecho.",de:"Die Person gibt Erwerbsfähigkeit und keine aktuellen Einnahmen an. Daher ist es sinnvoll, zunächst den Jobcenter-Antrag vorzubereiten, ohne einen Anspruch zu behaupten."}
        });
      }else if(p.housing==="rent" && p.housing_transfer==="no"){
        preferred="wohngeld";
        blocks.push({
          icon:"🏠",
          title:{es:"Wohngeld merece una comprobación",de:"Wohngeld sollte geprüft werden"},
          text:{es:"Hay alquiler y no se ha indicado una prestación que ya cubra los costes de vivienda. Wohngeld puede ser una vía útil, especialmente con ingresos bajos propios.",de:"Es besteht ein Mietverhältnis und keine bereits genannte Leistung mit berücksichtigten Unterkunftskosten. Wohngeld kann daher ein sinnvoller Prüfweg sein, insbesondere bei niedrigem eigenem Einkommen."}
        });
      }else{
        preferred="grundsicherung";
      }
    }

    if(!blocks.length){
      blocks.push({
        icon:"✅",
        title:{es:"La ruta elegida puede prepararse",de:"Der gewählte Weg kann vorbereitet werden"},
        text:{es:"Las respuestas permiten filtrar documentos, anexos y campos de formulario. Revisa las advertencias antes de presentar.",de:"Die Antworten reichen aus, um Unterlagen, Anlagen und Formularfelder zu filtern. Hinweise vor der Abgabe prüfen."}
      });
    }
    return {preferred,blocks};
  }

  function getAnnexes(p){
    const out = new Map();
    const add=(name,conditional=false)=>{ if(!out.has(name)||!conditional) out.set(name,{name,conditional}); };
    APP_DATA.annexRules.base.forEach(x=>add(x));
    if(p.housing==="rent") APP_DATA.annexRules.rent.forEach(x=>add(x));
    arr(p.household).forEach(k => (APP_DATA.annexRules[k]||[]).forEach(x=>add(x,k==="wg")));
    arr(p.income).forEach(k => (APP_DATA.annexRules[k]||[]).forEach(x=>add(x)));
    arr(p.special).forEach(k => (APP_DATA.annexRules[k]||[]).forEach(x=>add(x,k==="pregnant")));
    return [...out.values()];
  }

  function getRelevantRequirements(serviceId){
    const base = APP_DATA.services[serviceId]?.requirements || [];
    const p=state.profile||{};
    return base.filter(([id])=>{
      if(id==="residence_right") return p.citizenship==="non_eu" || p.citizenship==="unknown" || !p.citizenship;
      if(["rental_contract","heating_costs","rent_payments"].includes(id)) return p.housing!=="owner" && p.housing!=="temporary";
      if(id==="previous_benefits") return arr(p.history).includes("benefits3y") || ["sgb2","sgb12","asyl"].includes(p.housing_transfer);
      if(id==="employment_end") return arr(p.history).includes("employment5y") && !arr(p.income).includes("employment");
      if(id==="transfer_benefits") return p.housing_transfer!=="no" || arr(p.income).includes("alg1");
      if(id==="special_deductions") return arr(p.special).some(x=>["disability","single_parent"].includes(x)) || arr(p.income).includes("employment");
      return true;
    });
  }

  function serviceCard(id){
    const s=APP_DATA.services[id], p=serviceProgress(id);
    return `<article class="card clickable" data-service="${id}">
      <div class="card-icon">${s.icon}</div><h3>${tx(s.title)}</h3><p>${tx(s.subtitle)}</p>
      <div class="meta"><span class="badge">${getRelevantRequirements(id).length} ${state.lang==="es"?"puntos":"Punkte"}</span>
      ${p.have?`<span class="badge ok">${p.have}/${p.total} ✓</span>`:""}</div></article>`;
  }

  function serviceView(id){
    const s=APP_DATA.services[id];
    if(!s) return homeView();
    const reqs=getRelevantRequirements(id), p=serviceProgress(id);
    return `
      <div class="service-head"><div class="big-icon">${s.icon}</div><div><h1>${tx(s.title)}</h1><p>${tx(s.subtitle)}</p></div></div>
      <div class="notice">${tx(s.note)}</div>
      ${Object.keys(state.profile||{}).length?`<div class="notice"><strong>🧭 ${state.lang==="es"?"Filtrado por el asistente":"Durch Assistent gefiltert"}:</strong> ${state.lang==="es"?"Solo se muestran los grupos de documentos que parecen relevantes según las respuestas.":"Es werden nur die nach den Antworten voraussichtlich relevanten Unterlagengruppen angezeigt."}</div>`:""}
      ${id==="grundsicherung"?`<div class="notice warning"><strong>${tr("important")}:</strong> ${tr("evidenceLate")}</div>`:""}
      ${id==="wohngeld"?`<div class="notice warning">${tr("berlinNote")}</div>`:""}
      <div class="progress-box">
        <div class="progress-row"><span>${tr("progress")}</span><span>${p.have}/${p.total} ${tr("ready")}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${p.pct}%"></div></div>
      </div>
      <div class="toolbar">
        <button class="secondary-btn" id="printBtn">🖨️ ${tr("print")}</button>
        <button class="primary-btn" data-fields="${id}">📝 ${state.lang==="es"?"Preparar campos":"Formularfelder vorbereiten"}</button>
        <button class="ghost-btn" data-go="assistant">🧭 ${state.lang==="es"?"Modificar caso":"Fall anpassen"}</button>
      </div>
      ${id==="grundsicherung" && Object.keys(state.profile||{}).length ? `
        <div class="section-title"><div><h2>${state.lang==="es"?"Anexos":"Anlagen"}</h2></div></div>
        <div class="attachment-list">${getAnnexes(state.profile).map(a=>`<span class="attachment ${a.conditional?"":"required"}">${a.name}${a.conditional?" · ?":""}</span>`).join("")}</div>
      `:""}
      <div class="section-title"><div><h2>${state.lang==="es"?"Checklist de documentos":"Unterlagen-Checkliste"}</h2></div></div>
      <section class="requirements">${reqs.map(([docId,kind])=>requirementCard(docId,kind)).join("")}</section>
      <p class="small">${tr("legalNote")}</p>`;
  }

  function requirementCard(docId, kind){
    const d=APP_DATA.documents[docId]; if(!d) return "";
    const st=state.statuses[docId]||"";
    return `<article class="req">
      <div class="req-top"><div class="req-icon">${d.icon}</div><div class="req-main">
        <h3>${tx(d.title)}</h3><p>${tx(d.desc)}</p>
        <div class="meta"><span class="badge ${kind==="required"?"warn":""}">${kind==="required"?tr("required"):tr("conditional")}</span></div>
      </div></div>
      <div class="req-actions">
        ${statusButton(docId,"have","✓",tr("statusHave"),st)}
        ${statusButton(docId,"unsure","?",tr("statusUnsure"),st)}
        ${statusButton(docId,"missing","✕",tr("statusMissing"),st)}
        <button class="ghost-btn recovery-link" data-recovery="${docId}">🧭 ${tr("how")}</button>
      </div></article>`;
  }

  function statusButton(docId,value,icon,label,current){
    return `<button class="status-btn ${value} ${current===value?"selected":""}" data-status-doc="${docId}" data-status="${value}">${icon} ${label}</button>`;
  }

  function serviceProgress(id){
    const reqs=getRelevantRequirements(id);
    const have=reqs.filter(([docId])=>state.statuses[docId]==="have").length;
    return {have,total:reqs.length,pct:reqs.length?Math.round(have/reqs.length*100):0};
  }

  function fieldsView(serviceId){
    const map=APP_DATA.formMaps[serviceId];
    if(!map) return `<div class="empty">No form map</div>`;
    const activeForm = state.activeForm && map.forms.some(f=>f.id===state.activeForm) ? state.activeForm : map.forms[0].id;
    const form = map.forms.find(f=>f.id===activeForm);
    const visible = form.fields.filter(f=>state.showAllFields || fieldRelevant(f.when));

    return `
      <div class="service-head">
        <div class="big-icon">📝</div>
        <div><h1>${tx(map.title)}</h1><p>${state.lang==="es"?"Preparación campo por campo. Los valores escritos aquí no pasan a localStorage.":"Feld-für-Feld-Vorbereitung. Hier eingetragene Werte werden nicht im localStorage gespeichert."}</p></div>
      </div>
      <div class="privacy-session">🔒 ${state.lang==="es"
        ?"Los valores personales escritos en esta pantalla se guardan solo en sessionStorage: se eliminan al cerrar la sesión del navegador o al borrar el caso. No se envían a ningún servidor."
        :"Persönliche Werte auf dieser Seite werden nur im sessionStorage gespeichert: Sie verschwinden beim Ende der Browsersitzung oder beim Löschen des Falls. Es erfolgt keine Serverübertragung."}</div>

      ${map.forms.length>1?`<div class="form-tabs" role="tablist">
        ${map.forms.map(f=>`<button type="button" role="tab" aria-selected="${f.id===activeForm}" class="form-tab ${f.id===activeForm?"active":""}" data-form-tab="${f.id}">${esc(tx(f.title))}</button>`).join("")}
      </div>`:""}

      <div class="toolbar">
        <a class="secondary-btn" href="${form.source}" target="_blank" rel="noopener">${state.lang==="es"?"Abrir formulario oficial":"Offizielles Formular öffnen"} ↗</a>
        <button class="ghost-btn" id="toggleAllFields">${state.showAllFields?(state.lang==="es"?"Ocultar no relevantes":"Unnötige ausblenden"):(state.lang==="es"?"Mostrar todos":"Alle Felder anzeigen")}</button>
        <button class="secondary-btn" id="printBtn">🖨️ ${tr("print")}</button>
        ${FEATURES?.hasPreparedValues()?`<button class="primary-btn" data-go="fill">🖊️ ${L("Rellenar el PDF oficial","Amtliches PDF ausfüllen")}</button>`:""}
      </div>

      <div class="notice">
        <strong>${state.lang==="es"?"Visible ahora":"Jetzt sichtbar"}:</strong> ${visible.length}/${form.fields.length}
        ${state.lang==="es"?" campos según las respuestas del asistente.":" Felder entsprechend den Assistenten-Antworten."}
      </div>

      <section class="field-group">
        ${visible.map(f=>formField(form.id,f)).join("")}
      </section>

      <div class="toolbar">
        <button class="ghost-btn" data-go="assistant">← ${state.lang==="es"?"Volver al resultado":"Zurück zum Ergebnis"}</button>
        <button class="danger-btn" id="clearFormValues">🧹 ${state.lang==="es"?"Borrar valores de esta sesión":"Sitzungswerte löschen"}</button>
      </div>
      <p class="small">${tr("legalNote")}</p>
    `;
  }

  function formField(formId,f){
    const key=`${formId}:${f.no}`;
    const val=formValues[key]||"";
    const rel=fieldRelevant(f.when);
    return `<article class="form-field ${rel?"relevant":"conditional"}">
      <div class="field-head">
        <span class="field-no">${esc(f.no)}</span>
        <div class="field-title">${esc(tx(f.title))}</div>
        ${f.helpDoc?`<button class="icon-btn" type="button" data-recovery="${f.helpDoc}" title="${tr("how")}">🧭</button>`:""}
      </div>
      ${f.help?`<div class="field-help">${esc(tx(f.help))}</div>`:""}
      <input class="session-input" data-form-key="${esc(key)}" value="${esc(val)}"
        placeholder="${state.lang==="es"?"Valor / nota (solo esta sesión)":"Wert / Notiz (nur diese Sitzung)"}">
    </article>`;
  }

  function fieldRelevant(when){
    const p=state.profile||{}, hh=arr(p.household), inc=arr(p.income), sp=arr(p.special), hist=arr(p.history);
    switch(when){
      case "always": return true;
      case "temporary": return p.housing==="temporary";
      case "rent": return p.housing==="rent";
      case "owner": return p.housing==="owner";
      case "foreign": return ["eu","non_eu","unknown"].includes(p.citizenship);
      case "asyl": return p.housing_transfer==="asyl";
      case "no_bank": return false;
      case "pregnant": return sp.includes("pregnant");
      case "under25_parent_outside": return sp.includes("under25_parent_outside");
      case "education": return ["student","training","unknown"].includes(p.education);
      case "special_diet": return sp.includes("special_diet");
      case "disability": return sp.includes("disability");
      case "special_need": return sp.includes("special_need");
      case "institution": return sp.includes("institution");
      case "benefits3y": return hist.includes("benefits3y") || ["sgb2","sgb12","asyl"].includes(p.housing_transfer);
      case "employment5y": return hist.includes("employment5y");
      case "self_history_or_current": return hist.includes("self5y") || inc.includes("self_employed");
      case "replacement_or_alg1": return hist.includes("replacement5y") || inc.includes("alg1");
      case "service5y": return hist.includes("service5y");
      case "care5y": return hist.includes("care5y");
      case "history_empty": return hist.length===0;
      case "accident": return sp.includes("accident");
      case "not_alone": return !hh.includes("alone") && hh.length>0;
      case "employment": return inc.includes("employment");
      case "self_current": return inc.includes("self_employed");
      case "children": return hh.includes("child_u15") || hh.includes("child_15_24");
      case "wg": return hh.includes("wg");
      default: return true;
    }
  }


  function caseView(){
    const docs=docSession.docs||[];
    const facts=docSession.approvedFacts||{};
    const statusEntries=Object.entries(state.statuses||{});
    return `
      <div class="case-hero">
        <h1>📎 ${state.lang==="es"?"Caso y extracción local de datos":"Fall & lokale Datenerfassung"}</h1>
        <p>${state.lang==="es"
          ?"Añade documentos, fotografía tarjetas o selecciona una grabación. Puente extrae propuestas localmente y las transfiere a los formularios tras tu confirmación."
          :"Dokumente hinzufügen, Karten fotografieren oder eine Audioaufnahme auswählen. Puente extrahiert Vorschläge lokal und überträgt sie nach deiner Bestätigung in die Formulare."}</p>
      </div>
      <div class="local-banner"><strong>🔒 ${state.lang==="es"?"Procesamiento local":"Lokale Verarbeitung"}:</strong> ${state.lang==="es"
        ?"Fotos, PDFs y audio no se suben. OCR, lectura de PDF y Whisper se ejecutan en el dispositivo. El texto completo y las transcripciones no se guardan de forma persistente."
        :"Fotos, PDFs und Audio werden nicht hochgeladen. OCR, PDF-Lesen und Whisper laufen auf dem Gerät. Volltext und Transkripte werden nicht dauerhaft gespeichert."}</div>

      <label class="upload-zone" id="uploadZone" for="caseFiles">
        <div class="upload-icon">📷</div>
        <h3>${state.lang==="es"?"Fotografiar o añadir documentos":"Dokumente fotografieren oder hinzufügen"}</h3>
        <p>${state.lang==="es"?"Imágenes JPG/PNG/WebP y PDF · máximo 25 MB por archivo":"JPG/PNG/WebP und PDF · max. 25 MB je Datei"}</p>
        <input id="caseFiles" type="file" accept="image/*,application/pdf" multiple>
      </label>
      <div class="capture-grid">
        <div class="capture-card">
          <strong>💳 ${state.lang==="es"?"Tarjeta bancaria o sanitaria":"Bank- oder Gesundheitskarte"}</strong>
          <p>${state.lang==="es"?"Reconoce nombre, IBAN, banco, Krankenkasse y número de asegurado. Por seguridad no se extraen PAN, CVV ni fecha de validez de tarjetas de pago.":"Erkennt Name, IBAN, Bank, Krankenkasse und Versichertennummer. Zahlungs-PAN, CVV und Gültigkeitsdatum werden aus Sicherheitsgründen nicht extrahiert."}</p>
          <button class="secondary-btn" id="cardCameraBtn">📇 ${state.lang==="es"?"Fotografiar tarjeta":"Karte fotografieren"}</button>
          <input class="hidden-file-input" id="cardCameraInput" type="file" accept="image/*" capture="environment">
        </div>
        <div class="capture-card">
          <strong>🎙️ ${state.lang==="es"?"Grabación de audio":"Audioaufnahme"}</strong>
          <p>${state.lang==="es"?"Whisper transcribe localmente y propone IBAN, nombre, fecha de nacimiento, dirección, Krankenkasse y otros datos reconocibles.":"Whisper transkribiert lokal und schlägt u. a. IBAN, Name, Geburtsdatum, Anschrift und Krankenkasse als Formularwerte vor."}</p>
          <div class="capture-actions">
            <button class="secondary-btn" id="audioPickBtn">📁 ${state.lang==="es"?"Elegir audio":"Audio auswählen"}</button>
            <button class="secondary-btn" id="audioRecordBtn">🎙️ ${state.lang==="es"?"Grabar aquí":"Hier aufnehmen"}</button>
            <button class="danger-btn" id="audioStopBtn" disabled>⏹ ${state.lang==="es"?"Detener":"Stoppen"}</button>
          </div>
          <div class="small" id="audioRecordStatus" role="status" aria-live="polite"></div>
          <input class="hidden-file-input" id="audioInput" type="file" accept="audio/*">
        </div>
      </div>
      <div class="toolbar">
        <button class="secondary-btn" id="cameraBtn">📷 ${state.lang==="es"?"Abrir cámara":"Kamera öffnen"}</button>
        <input class="hidden-file-input" id="cameraInput" type="file" accept="image/*" capture="environment">
        <button class="ghost-btn" id="manualTextBtn">⌨️ ${state.lang==="es"?"Analizar texto copiado":"Kopierten Text analysieren"}</button>
      </div>
      <p class="ocr-note">${state.lang==="es"
        ?"Las bibliotecas de OCR, PDF, ZIP, QR y Whisper se sirven desde el mismo origen de Puente. Los CDN externos son solo una reserva de desarrollo y no son necesarios en el despliegue."
        :"OCR-, PDF-, ZIP-, QR- und Whisper-Bibliotheken werden im Deployment vom selben Puente-Ursprung geladen. Externe CDNs sind nur Entwicklungs-Fallback und im Deployment nicht erforderlich."}</p>

      <div class="section-title"><div><h2>${state.lang==="es"?"Documentos del caso":"Dokumente des Falls"}</h2><p>${docs.length} ${state.lang==="es"?"documento(s) en esta sesión":"Dokument(e) in dieser Sitzung"}</p></div></div>
      <div class="doc-list">
        ${docs.length ? docs.map(doc=>caseDocCard(doc)).join("") : `<div class="empty"><div class="empty-illustration">📂</div>${state.lang==="es"?"Todavía no hay documentos. Añade el primero arriba.":"Noch keine Dokumente. Oben das erste hinzufügen."}</div>`}
      </div>

      <div class="section-title"><div><h2>${state.lang==="es"?"Datos confirmados":"Bestätigte Angaben"}</h2><p>${state.lang==="es"?"Se transfieren a los campos vinculados del formulario durante esta sesión.":"Werden in dieser Sitzung in verknüpfte Formularfelder übernommen."}</p></div></div>
      <div class="case-fact-grid">
        ${Object.keys(facts).length ? Object.entries(facts).map(([k,v])=>`<div class="case-fact"><small>${esc(tx(APP_DATA.factLabels[k])||k)}</small><strong>${esc(v.value||v)}</strong><div class="small">${v.source?esc(v.source):""}</div></div>`).join("") : `<div class="empty">${state.lang==="es"?"Ningún dato confirmado todavía.":"Noch keine Angaben bestätigt."}</div>`}
      </div>

      <div class="case-summary-actions">
        <button class="primary-btn" data-go="dossier">📑 ${state.lang==="es"?"Crear expediente imprimible":"Druckfertige Fallakte erstellen"}</button>
        <button class="secondary-btn" data-go="deadlines">⏳ ${L("Plazos","Fristen")}</button>
        <button class="secondary-btn" data-go="assistant">🧭 ${state.lang==="es"?"Asistente de caso":"Fall-Assistent"}</button>
        <button class="secondary-btn" id="caseProgressBtn">✅ ${state.lang==="es"?"Estado de documentos":"Dokumentenstatus"} (${statusEntries.filter(([,v])=>v==="have").length})</button>
        <button class="ghost-btn" id="exportCaseBtn">💾 ${state.lang==="es"?"Exportar resumen JSON":"Fallübersicht als JSON"}</button>
        <button class="danger-btn" id="clearDocumentsBtn">🗑️ ${state.lang==="es"?"Borrar documentos de sesión":"Sitzungsdokumente löschen"}</button>
      </div>
    `;
  }

  function caseDocCard(doc){
    const live=liveFiles.get(doc.id);
    const type=APP_DATA.documentTypes.find(x=>x.id===doc.type)||APP_DATA.documentTypes.find(x=>x.id==="other");
    const conf=doc.typeConfidence||0;
    const facts=doc.facts||[];
    return `<article class="doc-item" data-doc-id="${doc.id}">
      <div class="doc-item-head">
        <div class="doc-thumb">${live?.preview?`<img src="${live.preview}" alt="">`:(type?.icon||"📎")}</div>
        <div class="doc-main">
          <h3>${esc(doc.name)}</h3>
          <p>${formatBytes(doc.size||0)} · ${esc(doc.mime||"")} ${!live?`· ${state.lang==="es"?"archivo no disponible tras recarga":"Datei nach Reload nicht mehr verfügbar"}`:""}</p>
          <div class="meta">
            <span class="detect-pill ${conf>=0.75?"high":conf>=0.45?"mid":""}">${type?.icon||"📎"} ${esc(tx(type?.title)||type?.id||"?")} · ${Math.round(conf*100)}%</span>
            ${doc.status==="analyzing"?`<span class="badge warn">${state.lang==="es"?"Analizando":"Analyse"}</span>`:""}
            ${doc.status==="done"?`<span class="badge ok">${state.lang==="es"?"Analizado":"Analysiert"}</span>`:""}
            ${doc.autoDraftCount?`<span class="badge ok">✍️ ${doc.autoDraftCount} ${L("borrador(es) automático(s)","automatisch als Entwurf")}</span>`:""}
            ${doc.status==="error"?`<span class="badge bad">${state.lang==="es"?"Error":"Fehler"}</span>`:""}
          </div>
          ${doc.progress!=null && doc.status==="analyzing"?`<div class="analysis-bar"><span style="width:${Math.max(3,Math.round(doc.progress*100))}%"></span></div>`:""}
        </div>
      </div>
      <div class="doc-actions">
        <select class="doc-type-select" data-doc-type="${doc.id}">${APP_DATA.documentTypes.map(t=>`<option value="${t.id}" ${t.id===doc.type?"selected":""}>${t.icon} ${esc(tx(t.title))}</option>`).join("")}</select>
        ${live?`<button class="mini-btn primary" data-analyze-doc="${doc.id}">🔎 ${state.lang==="es"?"Analizar de nuevo":"Neu analysieren"}</button>`:""}
        ${live?.transcript?`<button class="mini-btn" data-show-transcript="${doc.id}">🎙️ ${L("Ver transcripción","Transkript ansehen")}</button>`:""}
        ${["card","audio"].includes(doc.sourceKind) && facts.some(f=>(f.confidence||0)>=.75 && (APP_DATA.factToForm[f.key]||[]).length && !(docSession.approvedFacts||{})[f.key])?`<button class="mini-btn primary" data-approve-safe-doc="${doc.id}">✓ ${L("Transferir propuestas seguras","Sichere Vorschläge übernehmen")}</button>`:""}
        <button class="mini-btn danger" data-remove-doc="${doc.id}">✕ ${state.lang==="es"?"Quitar":"Entfernen"}</button>
      </div>
      ${doc.error?`<div class="notice warning">${esc(doc.error)}</div>`:""}
      ${doc.status==="analyzing"?`<div class="doc-actions"><button type="button" class="mini-btn danger" data-abort-doc="${esc(doc.id)}">⏹ ${L("Cancelar análisis","Analyse abbrechen")}</button></div>`:""}
      ${FEATURES?FEATURES.noticePanel(doc):""}
      ${facts.length?`<div class="fact-list">${facts.map((f,idx)=>factCard(doc,f,idx)).join("")}</div>`:""}
    </article>`;
  }

  function factCard(doc,f,idx){
    const approved=(docSession.approvedFacts||{})[f.key];
    const ignored=(docSession.ignoredFacts||{})[`${doc.id}:${f.key}`];
    const cls=approved?"approved":ignored?"rejected":"";
    return `<div class="fact ${cls}">
      <div class="fact-top"><div class="fact-label">${esc(tx(APP_DATA.factLabels[f.key])||f.key)}</div><div class="confidence">${Math.round((f.confidence||0.6)*100)}%</div></div>
      <input data-fact-edit="${doc.id}:${idx}" value="${esc(f.value)}">
      <div class="fact-actions">
        <button class="mini-btn primary" data-approve-fact="${doc.id}:${idx}">✓ ${approved?(state.lang==="es"?"Actualizado":"Aktualisieren"):(state.lang==="es"?"Confirmar y transferir":"Bestätigen & übernehmen")}</button>
        <button class="mini-btn" data-ignore-fact="${doc.id}:${idx}">× ${state.lang==="es"?"Ignorar":"Ignorieren"}</button>
      </div>
    </div>`;
  }

  function formatBytes(n){
    if(!n)return "0 B";
    const u=["B","KB","MB","GB"],i=Math.min(u.length-1,Math.floor(Math.log(n)/Math.log(1024)));
    return `${(n/Math.pow(1024,i)).toFixed(i?1:0)} ${u[i]}`;
  }

  async function addCaseFiles(fileList, opts={}){
    const files=[...fileList];
    for(const file of files){
      if(file.size>25*1024*1024){toast(`${file.name}: ${L("archivo demasiado grande (máx. 25 MB)","Datei zu groß (max. 25 MB)")}`);continue;}
      const id=`d${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const preview=file.type.startsWith("image/")?URL.createObjectURL(file):null;
      liveFiles.set(id,{file,preview,url:preview,sourceKind:opts.sourceKind||"document"});
      const initialType=opts.sourceKind==="card"?"bank_card":detectTypeFromText(file.name).type;
      docSession.docs.push({id,name:file.name,size:file.size,mime:file.type,type:initialType,typeConfidence:opts.sourceKind==="card"?0.3:0.15,sourceKind:opts.sourceKind||"document",status:"queued",progress:0,facts:[]});
      saveDocSession();render();
      await analyzeCaseDocument(id);
    }
  }

  async function analyzeCaseDocument(id){
    const doc=docSession.docs.find(d=>d.id===id), live=liveFiles.get(id);
    if(!doc||!live?.file)return;
    doc.status="analyzing";doc.progress=0.03;doc.error="";saveDocSession();render();
    analysisAbort.set(id,{cancelled:false});
    // Sicherheitsnetz: eine Analyse darf nicht unbegrenzt laufen.
    const watchdog=setTimeout(()=>abortAnalysis(id),180000);
    try{
      let text="";
      if(live.file.type==="application/pdf" || live.file.name.toLowerCase().endsWith(".pdf")) text=await extractPdfText(live.file, p=>updateDocProgress(id,p), id);
      else if(live.file.type.startsWith("image/")) text=await ocrImage(live.file,p=>{checkAbort(id);updateDocProgress(id,p)});
      else text=await live.file.text();
      const detected=detectTypeFromText(`${doc.name}\n${text}`);
      doc.type=detected.type;doc.typeConfidence=detected.confidence;
      doc.facts=extractFacts(text,detected.type);
      if(CAPTURE && (doc.sourceKind==="card" || live.sourceKind==="card")){
        const card=CAPTURE.extractCardFacts(text);
        doc.type=card.kind==="health_card"?"health_insurance":card.kind==="bank_card"?"bank_card":doc.type;
        doc.typeConfidence=Math.max(doc.typeConfidence||0,card.confidence||0);
        for(const f of card.facts||[]) if(!doc.facts.some(x=>x.key===f.key)) doc.facts.push(f);
      }
      // Bescheide liefern zusaetzlich Aktenzeichen, Datum und Zeitraum.
      const extra=FEATURES?.extractNoticeFacts(text);
      if(extra){
        doc.noticeFlags=extra.flags;
        for(const f of extra.facts) if(!doc.facts.some(x=>x.key===f.key)) doc.facts.push(f);
      }
      autoFillCaptureDrafts(doc);
      doc.status="done";doc.progress=1;
      autoMarkDocument(doc);
      saveDocSession();saveState();render();
    }catch(err){
      if(String(err?.message)==="__cancelled__"){
        doc.status="idle";doc.progress=0;doc.error=L("Análisis cancelado.","Analyse abgebrochen.");
      }else{
        doc.status="error";doc.error=L("No se pudo analizar automáticamente. Puedes elegir el tipo manualmente o pegar texto. ","Automatische Analyse fehlgeschlagen. Dokumenttyp kann manuell gewählt oder Text eingefügt werden. ")+(err?.message||String(err));
        doc.progress=0;
      }
      saveDocSession();render();
    }finally{
      clearTimeout(watchdog);
      analysisAbort.delete(id);
    }
  }

  let lastProgressSave=0;
  function updateDocProgress(id,p){
    const d=docSession.docs.find(x=>x.id===id);if(!d)return;
    d.progress=Math.max(d.progress||0,Math.min(.98,p));
    // Nur den Balken anfassen; Session hoechstens alle 1,5 s schreiben.
    const bar=document.querySelector(`[data-doc-id="${id}"] .analysis-bar span`);
    if(bar)bar.style.width=`${Math.round(d.progress*100)}%`;
    const now=Date.now();
    if(now-lastProgressSave>1500){lastProgressSave=now;saveDocSession();}
  }

  let libPromises={};
  function loadScriptOnce(key,src,test){
    if(test())return Promise.resolve();
    if(libPromises[key])return libPromises[key];
    libPromises[key]=new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error(`Library ${key} could not be loaded`));document.head.appendChild(s);});
    return libPromises[key];
  }
  async function loadLocalThenFallback(key,local,remote,test){
    if(test())return;
    try{await loadScriptOnce(key+"-local",local,test);if(test())return;}catch(_){ }
    if(remote)await loadScriptOnce(key+"-cdn",remote,test);
  }
  async function ensureTesseract(){
    await loadLocalThenFallback("tesseract","vendor/tesseract/tesseract.min.js","https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",()=>!!window.Tesseract);
  }
  async function ensurePdfJs(){
    await loadLocalThenFallback("pdfjs","vendor/pdfjs/pdf.min.js","https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",()=>!!window.pdfjsLib);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc="vendor/pdfjs/pdf.worker.min.js";
  }
  async function ensureJsZip(){
    await loadLocalThenFallback("jszip","vendor/jszip.min.js","https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",()=>!!window.JSZip);
  }

  // Ein wiederverwendeter OCR-Worker: die Sprachdaten werden dadurch pro
  // Sitzung einmal geladen statt pro Dokument.
  let ocrWorkerPromise=null, ocrProgressCb=null;
  async function getOcrWorker(){
    await ensureTesseract();
    if(!ocrWorkerPromise){
      ocrWorkerPromise=Tesseract.createWorker("deu+spa+eng",1,{
        workerPath:"vendor/tesseract/worker.min.js",
        langPath:"vendor/tesseract/lang",
        corePath:"vendor/tesseract-core",
        logger:m=>{if(m.status==="recognizing text")ocrProgressCb?.(m.progress||0);}
      }).catch(err=>{ocrWorkerPromise=null;throw err;});
    }
    return ocrWorkerPromise;
  }
  function releaseOcrWorker(){
    const pending=ocrWorkerPromise; ocrWorkerPromise=null; ocrProgressCb=null;
    pending?.then(w=>w.terminate?.()).catch(()=>{});
  }
  async function ocrImage(source,onProgress){
    try{
      const worker=await getOcrWorker();
      ocrProgressCb=pr=>onProgress?.(.15+.8*pr);
      const res=await worker.recognize(source);
      ocrProgressCb=null;
      return res?.data?.text||"";
    }catch(err){
      ocrProgressCb=null;
      if(window.Tesseract?.recognize){
        const res=await Tesseract.recognize(source,"deu+spa+eng",{
          workerPath:"vendor/tesseract/worker.min.js",langPath:"vendor/tesseract/lang",corePath:"vendor/tesseract-core",
          logger:m=>{if(m.status==="recognizing text")onProgress?.(.15+.8*(m.progress||0));}
        });
        return res?.data?.text||"";
      }
      throw err;
    }
  }

  // Laufende Analysen, damit der Nutzer abbrechen kann und ein grosses PDF
  // das Geraet nicht minutenlang blockiert.
  const analysisAbort=new Map();
  function abortAnalysis(id){ const a=analysisAbort.get(id); if(a) a.cancelled=true; }
  function checkAbort(id){
    const a=analysisAbort.get(id);
    if(a && a.cancelled) throw new Error("__cancelled__");
  }

  async function extractPdfText(file,onProgress,docId){
    await ensurePdfJs();
    const buf=await file.arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:buf}).promise;
    let text="";
    const pages=Math.min(pdf.numPages,12);
    for(let i=1;i<=pages;i++){
      checkAbort(docId);
      const page=await pdf.getPage(i), content=await page.getTextContent();
      text += "\n"+content.items.map(x=>x.str).join(" ");
      onProgress?.(.05+.45*(i/pages));
    }
    if(text.replace(/\s/g,"").length<120){
      await ensureTesseract();
      const ocrPages=Math.min(pdf.numPages,3);
      let ocr="";
      for(let i=1;i<=ocrPages;i++){
        checkAbort(docId);
        const page=await pdf.getPage(i), vp=page.getViewport({scale:1.6});
        const canvas=document.createElement("canvas");canvas.width=vp.width;canvas.height=vp.height;
        await page.render({canvasContext:canvas.getContext("2d"),viewport:vp}).promise;
        const blob=await new Promise(r=>canvas.toBlob(r,"image/jpeg",.88));
        ocr += "\n"+await ocrImage(blob,p=>onProgress?.(.5+.48*((i-1+p)/ocrPages)));
      }
      text += ocr;
    }
    return text;
  }

  function normalizeText(t){return String(t||"").replace(/\u00ad/g,"").replace(/[\t\r]+/g," ").replace(/ +/g," ");}
  function detectTypeFromText(text){
    const t=normalizeText(text).toLowerCase();let best={type:"other",score:0};
    for(const dt of APP_DATA.documentTypes){
      if(dt.id==="other")continue;let score=0;
      for(const k of dt.keys||[])if(t.includes(k.toLowerCase()))score+=k.length>18?2:1;
      if(dt.id==="bank_statements" && /\bde\s*\d{2}(?:\s*[a-z0-9]){18,22}/i.test(t))score+=1;
      if(score>best.score)best={type:dt.id,score};
    }
    return {type:best.type,confidence:best.score?Math.min(.96,.28+best.score*.14):.12};
  }

  function extractFacts(text,docType){
    const raw=normalizeText(text), lines=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean);const out=[];
    const push=(key,value,confidence=.7)=>{value=String(value||"").trim();if(value && !out.some(x=>x.key===key&&x.value===value))out.push({key,value,confidence});};
    const near=(labels,pattern)=>{
      // Wortgrenze nach dem Label: sonst trifft "Netto" auch "Nettokaltmiete"
      // und die Kaltmiete landet faelschlich als Nettoeinkommen im Formular.
      for(const label of labels){
        const re=new RegExp(label+"(?![A-Za-zÄÖÜäöüß])[^\\n]{0,45}?"+pattern.source,pattern.flags.replace("g",""));
        const m=raw.match(re);if(m)return m[m.length-1];
      }
      return null;
    };
    const tax=near(["Steuer[- ]?ID","Identifikationsnummer","IdNr\\.?"],/((?:\d[\s-]?){11})/i) || (docType==="tax_id"?raw.match(/\b(?:\d[\s-]?){11}\b/)?.[0]:null);
    if(tax)push("taxId",tax.replace(/\D/g,""),.95);
    const rv=raw.match(/\b\d{2}[\s.-]?\d{6}[\s.-]?[A-ZÄÖÜ][\s.-]?\d{3}\b/i);
    if(rv)push("rvNumber",rv[0].replace(/[\s.-]/g,"").toUpperCase(),.94);
    const iban=raw.match(/\bDE\s*\d{2}(?:\s*[A-Z0-9]){18,22}\b/i);
    if(iban)push("iban",iban[0].replace(/\s/g,"").toUpperCase(),.95);
    const first=near(["Vorname","Given name","Nombre"],/([A-ZÁÉÍÓÚÑÄÖÜ][A-Za-zÁÉÍÓÚÑáéíóúñÄÖÜäöüß' -]{1,35})/i);if(first)push("firstName",first,.72);
    const last=near(["Nachname","Familienname","Surname","Apellido","Apellidos"],/([A-ZÁÉÍÓÚÑÄÖÜ][A-Za-zÁÉÍÓÚÑáéíóúñÄÖÜäöüß' -]{1,45})/i);if(last)push("lastName",last,.72);
    const holder=near(["Kontoinhaber(?:/in)?","Cardholder","Karteninhaber(?:/in)?","Titular"],/([A-ZÁÉÍÓÚÑÄÖÜ][A-Za-zÁÉÍÓÚÑáéíóúñÄÖÜäöüß' -]{2,60})/i);if(holder)push("accountHolder",holder,.74);
    const address=near(["Anschrift","Adresse","Dirección","Address"],/([^\n]{6,90})/i);if(address)push("streetAddress",address,.58);
    const bd=near(["Geburtsdatum","Fecha de nacimiento","Date of birth","NACIMIENTO"],/(\d{1,2}[.\/ -]\d{1,2}[.\/ -]\d{2,4})/i);
    if(bd)push("birthDate",bd.replace(/[\/ -]/g,"."),.82);
    const bp=near(["Geburtsort","Lugar de nacimiento","Lugar de nacimiento /","LUGAR DE NACIMIENTO"],/([A-ZÁÉÍÓÚÑÄÖÜ][A-Za-zÁÉÍÓÚÑáéíóúñÄÖÜäöüß -]{2,35})/i);
    if(bp)push("birthPlace",bp,.62);
    const national=near(["Staatsangehörigkeit","NACIONALIDAD","Nacionalidad","Nationality"],/([A-ZÁÉÍÓÚÑÄÖÜ]{2,20})/i);
    if(national)push("nationality",national,.65);
    const funds=["AOK","BARMER","DAK","TK","Techniker Krankenkasse","KKH","Kaufmännische Krankenkasse","hkk","IKK classic","HEK","SBK","BKK VBU","mkk"];
    const fund=funds.find(x=>raw.toLowerCase().includes(x.toLowerCase()));if(fund)push("healthFund",fund,.92);
    const hv=near(["Versichertennummer","Versicherungsnummer"],/([A-Z][0-9]{9})/i);if(hv)push("healthInsuranceNo",hv.toUpperCase(),.75);
    const area=near(["Wohnfläche","Wohnflaeche","superficie"],/(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:m²|m2|qm)/i);if(area)push("livingArea",area.replace(".",",")+" m²",.92);
    const money=(labels,key,confidence=.9)=>{const v=near(labels,/(?:€|EUR)?\s*(\d{1,4}(?:[. ]\d{3})*,\d{2})\s*(?:€|EUR)?/i);if(v)push(key,v.replace(/ /g,"")+" €",confidence)};
    money(["Nettokaltmiete","Grundmiete"],"rentCold");money(["Betriebskostenvorauszahlung","Betriebskosten","Nebenkosten"],"rentOperating");money(["Heizkostenvorauszahlung","Heizkosten"],"rentHeating");money(["Mietzins \\(gesamt\\)","Gesamtmiete","monatliche Gesamtmiete"],"rentTotal");
    money(["Brutto","Gesamtbrutto","Bruttolohn"],"grossIncome",.72);money(["Netto","Auszahlungsbetrag","Nettoverdienst"],"netIncome",.7);
    if(docType==="alg1_notice"||docType==="previous_benefits")money(["Arbeitslosengeld","Leistungsbetrag","monatlicher Zahlbetrag","Zahlbetrag"],"benefitAmount",.68);
    // "beginnt am" ist zu generisch fuer andere Dokumente (z. B. Lohnabrechnungen)
    const cstartLabels=docType==="rental_contract"
      ? ["Mietverhältnis beginnt","Mietverhaeltnis beginnt","Mietbeginn","beginnt am"]
      : ["Mietverhältnis beginnt","Mietverhaeltnis beginnt","Mietbeginn"];
    const cstart=near(cstartLabels,/(\d{1,2}[.]\d{1,2}[.]\d{4})/i);if(cstart)push("contractStart",cstart,.72);
    const estart=near(["Arbeitsverhältnis beginnt","Arbeitsverhaeltnis beginnt"],/(\d{1,2}[.]\d{1,2}[.]\d{4})/i);if(estart)push("employmentStart",estart,.78);
    const eend=near(["Arbeitsverhältnis wird bis","endet zum","Beschäftigungsende"],/(\d{1,2}[.]\d{1,2}[.]\d{4})/i);if(eend)push("employmentEnd",eend,.75);
    return out;
  }

  function autoMarkDocument(doc){
    const primary=doc.type;
    if(APP_DATA.documents[primary] && (doc.typeConfidence||0)>=0.45)state.statuses[primary]="have";
    if(primary==="alg1_notice")state.statuses["income_proof"]="have";
    if(["wohngeld_notice","previous_benefits","notice_decision"].includes(primary))state.statuses["previous_benefits"]="have";
    for(const f of doc.facts||[]){
      if(f.key==="taxId")state.statuses.tax_id="have";
      if(f.key==="rvNumber")state.statuses.social_insurance="have";
      if(f.key==="iban")state.statuses.iban="have";
      if(f.key==="healthFund"||f.key==="healthInsuranceNo")state.statuses.health_insurance="have";
      if(["rentCold","rentOperating","rentHeating","rentTotal","livingArea"].includes(f.key))state.statuses.rental_contract="have";
      if(f.key==="rentHeating")state.statuses.heating_costs="have";
    }
  }

  function approveFact(docId,idx,inputValue){
    const doc=docSession.docs.find(x=>x.id===docId), f=doc?.facts?.[idx];if(!f)return;
    const value=String(inputValue??f.value).trim();if(!value)return;
    docSession.approvedFacts[f.key]={value,source:doc.name,docId};
    delete docSession.ignoredFacts[`${docId}:${f.key}`];
    transferFactToForms(f.key,value);
    autoMarkDocument({...doc,facts:[{...f,value}]});
    saveDocSession();saveSession();saveState();render();
  }

  function approveSafeFacts(docId){
    const doc=docSession.docs.find(x=>x.id===docId);
    if(!doc)return;
    let count=0;
    for(const f of doc.facts||[]){
      if((f.confidence||0)<.75)continue;
      if(!(APP_DATA.factToForm[f.key]||[]).length)continue;
      if((docSession.ignoredFacts||{})[`${docId}:${f.key}`])continue;
      const value=String(f.value||"").trim();if(!value)continue;
      docSession.approvedFacts[f.key]={value,source:doc.name,docId};
      delete docSession.ignoredFacts[`${docId}:${f.key}`];
      transferFactToForms(f.key,value);
      count++;
    }
    if(count){
      autoMarkDocument(doc);saveDocSession();saveSession();saveState();render();
      toast(L(`${count} dato(s) transferido(s). Revisa los formularios antes de enviarlos.`,`${count} Angabe(n) übernommen. Bitte Formulare vor dem Absenden prüfen.`));
    }else toast(L("No hay propuestas seguras vinculadas a formularios.","Keine sicheren, mit Formularen verknüpften Vorschläge vorhanden."));
  }

  function transferFactToForms(key,value,opts={}){
    const links=APP_DATA.factToForm[key]||[];let changed=0;
    for(const l of links){
      const fk=`${l.form}:${l.no}`;
      if(opts.onlyEmpty && String(formValues[fk]||"").trim())continue;
      if(["rentCold","rentOperating","rentHeating","rentTotal"].includes(key) && l.form==="KDU" && l.no==="20"){
        const labels={rentCold:"Kaltmiete",rentOperating:"Betriebskosten",rentHeating:"Heizkosten",rentTotal:"Gesamtmiete"};
        const current=formValues[fk]||"";const line=`${labels[key]}: ${value}`;
        if(opts.onlyEmpty && current.trim())continue;
        const parts=current.split(" | ").filter(x=>x && !x.startsWith(labels[key]+":"));parts.push(line);formValues[fk]=parts.join(" | ");changed++;
      }else{formValues[fk]=value;changed++;}
    }
    return changed;
  }

  function autoFillCaptureDrafts(doc){
    if(!doc || !["card","audio"].includes(doc.sourceKind))return 0;
    let count=0;doc.autoDraftKeys=[];
    for(const f of doc.facts||[]){
      if((f.confidence||0)<.88)continue;
      if(!(APP_DATA.factToForm[f.key]||[]).length)continue;
      const value=String(f.value||"").trim();if(!value)continue;
      const changed=transferFactToForms(f.key,value,{onlyEmpty:true});
      if(changed){count++;doc.autoDraftKeys.push(f.key);}
    }
    doc.autoDraftCount=count;
    if(count)saveSession();
    return count;
  }

  let localAudioRecorder=null, localAudioStream=null, localAudioChunks=[], localAudioTimer=null;
  async function startLocalAudioRecording(){
    if(!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder==="undefined"){
      toast(L("La grabación directa no está disponible en este navegador. Puedes elegir un archivo de audio.","Direkte Aufnahme wird von diesem Browser nicht unterstützt. Du kannst eine Audiodatei auswählen."));return;
    }
    try{
      localAudioStream=await navigator.mediaDevices.getUserMedia({audio:true});
      localAudioChunks=[];localAudioRecorder=new MediaRecorder(localAudioStream);
      const start=Date.now();
      localAudioRecorder.ondataavailable=e=>{if(e.data?.size)localAudioChunks.push(e.data)};
      localAudioRecorder.onerror=e=>toast(L("Error de grabación.","Aufnahmefehler.")+" "+(e.error?.message||""));
      localAudioRecorder.onstop=async()=>{
        clearTimeout(localAudioTimer);localAudioTimer=null;
        const type=localAudioRecorder?.mimeType||localAudioChunks[0]?.type||"audio/webm";
        const blob=new Blob(localAudioChunks,{type});
        localAudioStream?.getTracks().forEach(t=>t.stop());localAudioStream=null;localAudioRecorder=null;localAudioChunks=[];
        const recBtn=$("#audioRecordBtn"), stopBtn=$("#audioStopBtn"), st=$("#audioRecordStatus");
        if(recBtn)recBtn.disabled=false;if(stopBtn)stopBtn.disabled=true;
        if(st)st.textContent=L("Grabación finalizada. Iniciando transcripción local…","Aufnahme beendet. Lokale Transkription startet …");
        if(blob.size){
          const ext=type.includes("ogg")?"ogg":type.includes("mp4")?"m4a":"webm";
          const file=new File([blob],`puente-audio-${new Date().toISOString().replace(/[:.]/g,"-")}.${ext}`,{type});
          await addAudioFile(file);
        }
      };
      localAudioRecorder.start(1000);
      const recBtn=$("#audioRecordBtn"), stopBtn=$("#audioStopBtn"), st=$("#audioRecordStatus");
      if(recBtn)recBtn.disabled=true;if(stopBtn)stopBtn.disabled=false;
      if(st)st.textContent=L("Grabando localmente… máximo 2 minutos.","Lokale Aufnahme läuft … maximal 2 Minuten.");
      localAudioTimer=setTimeout(()=>stopLocalAudioRecording(),120000);
    }catch(err){
      localAudioStream?.getTracks().forEach(t=>t.stop());localAudioStream=null;localAudioRecorder=null;
      toast(L("No se pudo abrir el micrófono: ","Mikrofon konnte nicht geöffnet werden: ")+(err?.message||String(err)));
    }
  }
  function stopLocalAudioRecording(){
    if(localAudioRecorder && localAudioRecorder.state!=="inactive")localAudioRecorder.stop();
  }

  async function addAudioFile(file){
    if(!file)return;
    if(file.size>100*1024*1024){toast(L("Audio demasiado grande (máx. 100 MB).","Audiodatei zu groß (max. 100 MB)."));return;}
    if(!CAPTURE?.transcribeAudioFile){toast(L("Whisper local no está disponible.","Lokales Whisper ist nicht verfügbar."));return;}
    const id=`a${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    liveFiles.set(id,{file,sourceKind:"audio"});
    const doc={id,name:file.name||L("Grabación","Audioaufnahme"),size:file.size||0,mime:file.type||"audio/*",type:"audio_note",typeConfidence:1,sourceKind:"audio",status:"analyzing",progress:.02,facts:[]};
    docSession.docs.push(doc);saveDocSession();render();
    try{
      const transcript=await CAPTURE.transcribeAudioFile(file,{
        lang:state.lang,onProgress:p=>updateDocProgress(id,.05+.9*p),
        onStatus:st=>{doc.audioStatus=st;saveDocSession();}
      });
      const live=liveFiles.get(id);if(live)live.transcript=transcript;
      const detected=detectTypeFromText(transcript);
      doc.facts=extractFacts(transcript,detected.type);
      for(const f of CAPTURE.extractSpokenFacts(transcript)||[]) if(!doc.facts.some(x=>x.key===f.key)) doc.facts.push(f);
      const extra=FEATURES?.extractNoticeFacts(transcript);
      if(extra) for(const f of extra.facts||[]) if(!doc.facts.some(x=>x.key===f.key))doc.facts.push(f);
      autoFillCaptureDrafts(doc);doc.status="done";doc.progress=1;doc.error="";autoMarkDocument(doc);saveDocSession();saveState();render();
      toast(L(doc.autoDraftCount?`Audio transcrito. ${doc.autoDraftCount} dato(s) seguro(s) se añadieron automáticamente como borrador; revísalos antes de enviar.`:"Audio transcrito localmente. Revisa y confirma los datos propuestos.",doc.autoDraftCount?`Audio lokal transkribiert. ${doc.autoDraftCount} sichere Angabe(n) wurden automatisch als Entwurf eingetragen; bitte vor dem Absenden prüfen.`:"Audio lokal transkribiert. Bitte Vorschläge prüfen und bestätigen."));
    }catch(err){
      doc.status="error";doc.progress=0;doc.error=L("No se pudo transcribir localmente: ","Lokale Transkription fehlgeschlagen: ")+(err?.message||String(err));saveDocSession();render();
    }
  }

  function showTranscript(id){
    const text=liveFiles.get(id)?.transcript||"";if(!text)return;
    $("#modalTitle").textContent=L("🎙️ Transcripción temporal","🎙️ Temporäres Transkript");
    $("#modalBody").innerHTML=`<div class="notice">${L("El texto solo está en la memoria de esta pestaña y no se guarda con el caso.","Der Text liegt nur im Arbeitsspeicher dieses Tabs und wird nicht mit dem Fall gespeichert.")}</div><textarea class="manual-text" rows="12" readonly>${esc(text)}</textarea>`;
    $("#modal").showModal();
  }

  function removeCaseDoc(id){
    const live=liveFiles.get(id);if(live?.url)URL.revokeObjectURL(live.url);liveFiles.delete(id);
    docSession.docs=docSession.docs.filter(d=>d.id!==id);saveDocSession();render();
  }

  function analyzeManualText(){
    const text=(document.querySelector("#manualDocText")?.value||"").trim();if(!text)return;
    const id=`t${Date.now()}_${Math.random().toString(36).slice(2,7)}`,det=detectTypeFromText(text);
    const doc={id,name:state.lang==="es"?"Texto pegado":"Eingefügter Text",size:text.length,mime:"text/plain",type:det.type,typeConfidence:det.confidence,status:"done",progress:1,facts:extractFacts(text,det.type)};
    const extraManual=FEATURES?.extractNoticeFacts(text);
    if(extraManual){
      doc.noticeFlags=extraManual.flags;
      for(const f of extraManual.facts) if(!doc.facts.some(x=>x.key===f.key)) doc.facts.push(f);
    }
    docSession.docs.push(doc);autoMarkDocument(doc);saveDocSession();saveState();document.querySelector("#modal")?.close();render();
  }

  function openManualTextModal(){
    $("#modalTitle").textContent=state.lang==="es"?"⌨️ Analizar texto copiado":"⌨️ Kopierten Text analysieren";
    $("#modalBody").innerHTML=`<p>${state.lang==="es"?"Pega aquí texto de un PDF, correo o documento. Se analiza localmente y el texto completo no se guarda.":"Hier Text aus PDF, E-Mail oder Dokument einfügen. Die Analyse erfolgt lokal; der vollständige Text wird nicht gespeichert."}</p><textarea id="manualDocText" class="manual-text" placeholder="..."></textarea><div class="toolbar"><button type="button" class="primary-btn" id="analyzeManualTextBtn">🔎 ${state.lang==="es"?"Analizar":"Analysieren"}</button></div>`;
    $("#modal").showModal();$("#analyzeManualTextBtn").addEventListener("click",analyzeManualText);
  }

  function exportCaseSummary(){
    const payload={version:APP_DATA.meta.version,exportedAt:new Date().toISOString(),profile:state.profile,statuses:state.statuses,approvedFacts:docSession.approvedFacts,documents:(docSession.docs||[]).map(({id,name,mime,type,typeConfidence,status,facts})=>({id,name,mime,type,typeConfidence,status,facts:facts?.map(({key,value,confidence})=>({key,value,confidence}))}))};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="puente-falluebersicht.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast(L("Resumen exportado.","Fallübersicht exportiert."));
  }


  function dossierService(){
    const direct=state.formService||state.service;
    if(direct && APP_DATA.services[direct]) return direct;
    try{return makeRecommendations(state.profile||{}).preferred||"grundsicherung";}catch(_){return "grundsicherung";}
  }

  function dossierPersonName(){
    const f=docSession.approvedFacts||{};
    const first=(f.firstName?.value||f.firstName||formValues["HA:1"]||"").trim();
    const last=(f.lastName?.value||f.lastName||formValues["HA:2"]||"").trim();
    return `${first} ${last}`.trim() || (state.lang==="es"?"Persona solicitante":"Antragstellende Person");
  }

  function dossierRequirements(serviceId){
    return getRelevantRequirements(serviceId).map(([id,kind])=>({id,kind,doc:APP_DATA.documents[id],status:state.statuses[id]||"open"}));
  }

  function dossierReadiness(serviceId){
    const reqs=dossierRequirements(serviceId);
    const required=reqs.filter(r=>r.kind==="required");
    const denominator=required.length||reqs.length||1;
    const have=(required.length?required:reqs).filter(r=>r.status==="have").length;
    return {pct:Math.round(have/denominator*100),have,total:denominator,reqs};
  }

  function dossierFormRows(serviceId){
    const map=APP_DATA.formMaps[serviceId];
    if(!map)return [];
    const rows=[];
    for(const form of map.forms){
      for(const field of form.fields){
        const key=`${form.id}:${field.no}`;
        const value=(formValues[key]||"").trim();
        if(value)rows.push({form:form.id,no:field.no,title:tx(field.title),value});
      }
    }
    return rows;
  }

  function dossierFacts(){
    return Object.entries(docSession.approvedFacts||{}).map(([key,v])=>({
      key,label:tx(APP_DATA.factLabels[key])||key,value:v?.value||v||"",source:v?.source||""
    })).filter(x=>String(x.value).trim());
  }

  function evidenceSortRank(type){
    const order=["id_document","registration","health_insurance","tax_id","social_insurance","rental_contract","bank_statements","income_proof","alg1_notice","previous_benefits","wohngeld_notice","other"];
    const i=order.indexOf(type);return i<0?999:i;
  }

  function dossierEvidence(){
    return [...(docSession.docs||[])].sort((a,b)=>evidenceSortRank(a.type)-evidenceSortRank(b.type)||String(a.name).localeCompare(String(b.name))).map((d,i)=>({...d,exhibit:`N${i+1}`}));
  }

  function profileSummaryRows(){
    const qs=APP_DATA.assistantQuestions||[], rows=[];
    for(const q of qs){
      const val=state.profile?.[q.id];if(val==null || (Array.isArray(val)&&!val.length))continue;
      const vals=Array.isArray(val)?val:[val];
      const labels=vals.map(v=>tx(q.options.find(o=>o.value===v)?.label)||v).join(", ");
      rows.push({q:tx(q.title),a:labels});
    }
    return rows;
  }

  function dossierView(){
    const serviceId=dossierService(), service=APP_DATA.services[serviceId];
    const ready=dossierReadiness(serviceId), reqs=ready.reqs;
    const missing=reqs.filter(r=>r.status!=="have");
    const facts=dossierFacts(), formRows=dossierFormRows(serviceId), evidence=dossierEvidence();
    const profileRows=profileSummaryRows();
    const annexes=serviceId==="grundsicherung"?getAnnexes(state.profile||{}):[];
    const imageEvidence=evidence.filter(d=>liveFiles.get(d.id)?.preview);
    const generated=new Intl.DateTimeFormat(state.lang==="es"?"es-ES":"de-DE",{dateStyle:"medium",timeStyle:"short"}).format(new Date());
    const serviceName=service?tx(service.title):(serviceId||"");
    const missingRequired=missing.filter(r=>r.kind==="required").length;
    const angle=Math.round(ready.pct*3.6);

    return `<div class="dossier">
      <div class="dossier-toolbar screen-only">
        <button class="primary-btn" id="printDossierBtn">🖨️ ${state.lang==="es"?"Imprimir / guardar PDF":"Drucken / als PDF speichern"}</button>
        <button class="secondary-btn" id="exportPackageBtn">📦 ${state.lang==="es"?"Exportar paquete ZIP":"Antragssatz als ZIP exportieren"}</button>
        <button class="ghost-btn" id="downloadDossierHtmlBtn">💾 HTML</button>
        <button class="ghost-btn" data-go="case">← ${state.lang==="es"?"Volver al caso":"Zurück zum Fall"}</button>
      </div>

      <section class="dossier-page dossier-cover">
        <div>
          <div class="dossier-kicker">PUENTE · ${state.lang==="es"?"EXPEDIENTE DE PREPARACIÓN":"FALLAKTE ZUR ANTRAGSVORBEREITUNG"}</div>
          <h1 class="dossier-title">${esc(serviceName)}</h1>
          <div class="dossier-subtitle">${esc(dossierPersonName())}</div>
          <div class="cover-status">
            <div class="readiness-ring" style="--ready-angle:${angle}deg"><strong>${ready.pct}%</strong></div>
            <div><strong>${state.lang==="es"?"Estado de preparación":"Vorbereitungsstand"}</strong><br><span class="small">${ready.have}/${ready.total} ${state.lang==="es"?"justificantes básicos marcados como disponibles":"grundlegende Nachweise als vorhanden markiert"}</span></div>
          </div>
          <div class="dossier-metrics">
            <div class="metric"><strong>${evidence.length}</strong><small>${state.lang==="es"?"documentos":"Dokumente"}</small></div>
            <div class="metric"><strong>${facts.length}</strong><small>${state.lang==="es"?"datos confirmados":"bestätigte Angaben"}</small></div>
            <div class="metric"><strong>${formRows.length}</strong><small>${state.lang==="es"?"campos preparados":"vorbereitete Felder"}</small></div>
            <div class="metric"><strong>${missingRequired}</strong><small>${state.lang==="es"?"faltas obligatorias":"fehlende Pflichtnachweise"}</small></div>
          </div>
        </div>
        <div>
          <table class="dossier-table"><tbody>
            <tr><th>${state.lang==="es"?"Generado":"Erstellt"}</th><td>${esc(generated)}</td></tr>
            <tr><th>${state.lang==="es"?"Ruta":"Antragsweg"}</th><td>${esc(serviceName)}</td></tr>
            <tr><th>${state.lang==="es"?"Anexos previstos":"Voraussichtliche Anlagen"}</th><td>${annexes.length?annexes.map(a=>esc(a.name)+(a.conditional?" (?)":"")).join(", "):"–"}</td></tr>
          </tbody></table>
          <div class="dossier-foot">${state.lang==="es"?"Documento de trabajo generado localmente. No sustituye el formulario oficial ni la revisión de la autoridad competente.":"Lokal erzeugte Arbeitsunterlage. Sie ersetzt weder das amtliche Formular noch die Prüfung durch die zuständige Behörde."}</div>
        </div>
      </section>

      <section class="dossier-page">
        <h2 class="dossier-section-title">1. ${state.lang==="es"?"Resumen del caso":"Fallübersicht"}</h2>
        ${profileRows.length?`<table class="dossier-table"><thead><tr><th>${state.lang==="es"?"Pregunta":"Einordnung"}</th><th>${state.lang==="es"?"Respuesta":"Antwort"}</th></tr></thead><tbody>${profileRows.map(r=>`<tr><td>${esc(r.q)}</td><td>${esc(r.a)}</td></tr>`).join("")}</tbody></table>`:`<div class="notice">${state.lang==="es"?"No se han completado respuestas del asistente.":"Der Fall-Assistent wurde noch nicht ausgefüllt."}</div>`}
        ${annexes.length?`<h3>${state.lang==="es"?"Anexos previstos":"Voraussichtliche Anlagen"}</h3><div class="attachment-list">${annexes.map(a=>`<span class="attachment ${a.conditional?"":"required"}">${esc(a.name)}${a.conditional?" · ?":""}</span>`).join("")}</div>`:""}
      </section>

      <section class="dossier-page">
        <h2 class="dossier-section-title">2. ${state.lang==="es"?"Checklist de justificantes":"Nachweis-Checkliste"}</h2>
        ${reqs.map(r=>`<div class="check-row"><div class="check-mark ${r.status}">${r.status==="have"?"✓":r.status==="missing"?"!":r.status==="unsure"?"?":"□"}</div><div><strong>${esc(tx(r.doc?.title)||r.id)}</strong><div class="small">${esc(tx(r.doc?.desc)||"")}</div></div><span class="badge ${r.kind==="required"?"warn":""}">${r.kind==="required"?(state.lang==="es"?"necesario":"erforderlich"):(state.lang==="es"?"según caso":"je nach Fall")}</span></div>`).join("")}
      </section>

      <section class="dossier-page">
        <h2 class="dossier-section-title">3. ${state.lang==="es"?"Faltas antes de presentar":"Noch fehlend vor Abgabe"}</h2>
        ${missing.length?missing.map(r=>`<div class="missing-box ${r.status==="unsure"?"unsure":""}"><strong>${r.status==="unsure"?"?":"!"} ${esc(tx(r.doc?.title)||r.id)}</strong><div class="small">${r.status==="missing"?(state.lang==="es"?"Marcado como faltante.":"Als fehlend markiert."):(state.lang==="es"?"Todavía no confirmado como disponible.":"Noch nicht als vorhanden bestätigt.")}</div></div>`).join(""):`<div class="notice"><strong>✓</strong> ${state.lang==="es"?"Todos los grupos de documentos relevantes están marcados como disponibles.":"Alle relevanten Unterlagengruppen sind als vorhanden markiert."}</div>`}
      </section>

      <section class="dossier-page">
        <h2 class="dossier-section-title">4. ${state.lang==="es"?"Datos confirmados y campos preparados":"Bestätigte Angaben und vorbereitete Formularfelder"}</h2>
        ${facts.length?`<h3>${state.lang==="es"?"Datos confirmados de documentos":"Bestätigte Angaben aus Dokumenten"}</h3><table class="dossier-table"><thead><tr><th>${state.lang==="es"?"Dato":"Angabe"}</th><th>${state.lang==="es"?"Valor":"Wert"}</th><th>${state.lang==="es"?"Fuente":"Quelle"}</th></tr></thead><tbody>${facts.map(f=>`<tr><td>${esc(f.label)}</td><td>${esc(f.value)}</td><td>${esc(f.source||"–")}</td></tr>`).join("")}</tbody></table>`:""}
        ${formRows.length?`<h3>${state.lang==="es"?"Campos preparados":"Vorbereitete Formularfelder"}</h3><table class="dossier-table"><thead><tr><th>Form</th><th>${state.lang==="es"?"Campo":"Feld"}</th><th>${state.lang==="es"?"Descripción":"Bezeichnung"}</th><th>${state.lang==="es"?"Valor/nota":"Wert/Notiz"}</th></tr></thead><tbody>${formRows.map(r=>`<tr><td><strong>${esc(r.form)}</strong></td><td>${esc(r.no)}</td><td>${esc(r.title)}</td><td>${esc(r.value)}</td></tr>`).join("")}</tbody></table>`:`<div class="notice">${state.lang==="es"?"Aún no hay valores escritos en la preparación del formulario.":"In der Formularvorbereitung wurden noch keine Werte eingetragen."}</div>`}
      </section>

      <section class="dossier-page">
        <h2 class="dossier-section-title">5. ${state.lang==="es"?"Índice de justificantes":"Nachweisverzeichnis"}</h2>
        ${evidence.length?evidence.map(d=>{const t=APP_DATA.documentTypes.find(x=>x.id===d.type);const fs=(d.facts||[]).map(f=>`${tx(APP_DATA.factLabels[f.key])||f.key}: ${f.value}`).slice(0,5).join(" · ");return `<div class="evidence-item"><div class="evidence-no">${d.exhibit}</div><div><strong>${esc(tx(t?.title)||d.type||"Dokument")}</strong><div>${esc(d.name)}</div>${fs?`<div class="evidence-facts">${esc(fs)}</div>`:""}</div><span class="badge ${d.status==="done"?"ok":""}">${d.status==="done"?(state.lang==="es"?"analizado":"analysiert"):esc(d.status||"–")}</span></div>`}).join(""):`<div class="notice">${state.lang==="es"?"No se han añadido documentos al caso.":"Dem Fall wurden noch keine Dokumente hinzugefügt."}</div>`}
        <div class="dossier-foot">${state.lang==="es"?"Los archivos originales se incluyen en el ZIP del expediente solo mientras sigan disponibles en la pestaña actual. Tras recargar la página, la lista puede permanecer, pero el archivo original ya no está en memoria.":"Originaldateien werden nur dann in das Antragssatz-ZIP aufgenommen, solange sie im aktuellen Tab noch verfügbar sind. Nach einem Reload kann der Listeneintrag bestehen bleiben, während die Originaldatei nicht mehr im Speicher liegt."}</div>
      </section>

      ${imageEvidence.length?`<section class="dossier-page"><h2 class="dossier-section-title">6. ${state.lang==="es"?"Vista previa de justificantes gráficos":"Vorschau bildbasierter Nachweise"}</h2>${imageEvidence.map(d=>`<div><h3>${d.exhibit} · ${esc(d.name)}</h3><img class="appendix-image" src="${liveFiles.get(d.id).preview}" alt="${esc(d.name)}"></div>`).join("")}</section>`:""}
    </div>`;
  }

  function dossierStandaloneHtml(){
    const clone=document.querySelector(".dossier")?.cloneNode(true);
    clone?.querySelectorAll(".dossier-toolbar").forEach(x=>x.remove());
    // Blob-URLs der Bildvorschau funktionieren außerhalb des aktuellen Tabs nicht.
    // Im eigenständigen HTML/ZIP bleibt deshalb der Nachweisindex erhalten; die Originaldateien liegen im ZIP-Ordner Nachweise/.
    clone?.querySelectorAll(".appendix-image").forEach(img=>{const note=document.createElement("p");note.className="notice";note.textContent=state.lang==="es"?"Vista previa omitida en el HTML exportado. Utiliza el archivo original del directorio Nachweise/.":"Bildvorschau im exportierten HTML ausgelassen. Bitte die Originaldatei im Ordner Nachweise/ verwenden.";img.replaceWith(note);});
    const css=[...document.styleSheets].map(ss=>{try{return [...ss.cssRules].map(r=>r.cssText).join("\n")}catch(_){return ""}}).join("\n");
    return `<!doctype html><html lang="${state.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Puente Fallakte</title><style>${css}</style></head><body><main class="app-shell">${clone?clone.outerHTML:""}</main></body></html>`;
  }

  function downloadDossierHtml(){
    const html=dossierStandaloneHtml(), blob=new Blob([html],{type:"text/html;charset=utf-8"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`Puente_Fallakte_${new Date().toISOString().slice(0,10)}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function exportSubmissionPackage(){
    const btn=document.querySelector("#exportPackageBtn");const old=btn?.textContent;
    try{
      if(btn){btn.disabled=true;btn.textContent=state.lang==="es"?"Preparando ZIP…":"ZIP wird erstellt…";}
      await ensureJsZip();
      const zip=new JSZip(), evidence=dossierEvidence();
      zip.file("00_Fallakte.html",dossierStandaloneHtml());
      const payload={version:APP_DATA.meta.version,exportedAt:new Date().toISOString(),service:dossierService(),profile:state.profile,statuses:state.statuses,approvedFacts:docSession.approvedFacts,formValues,documents:evidence.map(({id,name,mime,type,typeConfidence,status,facts,exhibit})=>({id,name,mime,type,typeConfidence,status,exhibit,facts:facts?.map(({key,value,confidence})=>({key,value,confidence}))}))};
      zip.file("00_Falldaten.json",JSON.stringify(payload,null,2));
      const missing=[];
      for(const d of evidence){
        const live=liveFiles.get(d.id);if(!live?.file){missing.push(`${d.exhibit} · ${d.name}`);continue;}
        const safe=String(d.name||"dokument").replace(/[\\/:*?\"<>|]+/g,"_");
        zip.file(`Nachweise/${d.exhibit}_${safe}`,live.file);
      }
      const reqs=dossierRequirements(dossierService());
      const checklist=reqs.map(r=>`${r.status==="have"?"[x]":"[ ]"} ${tx(r.doc?.title)||r.id} — ${r.kind}`).join("\n");
      zip.file("01_Checkliste.txt",checklist);
      if(missing.length)zip.file("HINWEIS_FEHLENDE_ORIGINALDATEIEN.txt",`${state.lang==="es"?"Estos archivos ya no están disponibles en la memoria de la pestaña y no se pudieron incluir":"Diese Originaldateien sind im aktuellen Tab nicht mehr verfügbar und konnten nicht beigefügt werden"}:\n\n${missing.join("\n")}`);
      const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}});
      const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`Puente_Antragssatz_${new Date().toISOString().slice(0,10)}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
    }catch(err){toast(L("No se pudo crear el ZIP: ","ZIP konnte nicht erstellt werden: ")+(err?.message||err));}
    finally{if(btn){btn.disabled=false;btn.textContent=old;}}
  }

  function docsView(){
    return `<div class="service-head"><div class="big-icon">🔎</div><div><h1>${tr("docsTitle")}</h1><p>${tr("docsSub")}</p></div></div>
      <input id="docSearch" class="searchbox" type="search" placeholder="${tr("searchPlaceholder")}" autocomplete="off">
      <div id="docResults" class="requirements">${docsList(Object.keys(APP_DATA.documents))}</div>`;
  }

  function docsList(ids){
    if(!ids.length) return `<div class="empty">${tr("noResults")}</div>`;
    return ids.filter(id=>APP_DATA.documents[id]).map(id=>{
      const d=APP_DATA.documents[id];
      return `<article class="req clickable" data-recovery="${id}" tabindex="0" role="button">
        <div class="req-top"><div class="req-icon">${d.icon}</div><div class="req-main"><h3>${tx(d.title)}</h3><p>${tx(d.desc)}</p></div></div>
        <div class="meta"><span class="badge">${d.recovery.length} ${state.lang==="es"?"rutas":"Wege"}</span></div></article>`;
    }).join("");
  }

  function lostView(){
    return `<div class="service-head"><div class="big-icon">🔥</div><div><h1>${tr("lostTitle")}</h1><p>${tr("lostSub")}</p></div></div>
      <div class="notice danger">${tr("lostIntro")}</div>
      <section class="requirements lost-priority">
        ${APP_DATA.lostPriority.map(id=>{
          const d=APP_DATA.documents[id];
          return `<article class="req lost-item"><h3>${tx(d.title)}</h3><p>${tx(d.desc)}</p>
            <div class="req-actions"><button class="secondary-btn" data-recovery="${id}">🧭 ${tr("how")}</button>
            ${statusButton(id,"have","✓",tr("statusHave"),state.statuses[id]||"")}
            ${statusButton(id,"missing","✕",tr("statusMissing"),state.statuses[id]||"")}</div></article>`;
        }).join("")}
      </section>
      <div class="notice warning">${state.lang==="es"
        ?"Consejo: aunque falten justificantes de Grundsicherungsgeld, la solicitud puede presentarse y los justificantes pueden entregarse posteriormente."
        :"Tipp: Auch wenn Nachweise für Grundsicherungsgeld fehlen, kann der Antrag gestellt und die Nachweise später nachgereicht werden."}</div>`;
  }

  function progressView(){
    const entries=Object.entries(state.statuses).filter(([id])=>APP_DATA.documents[id]);
    const grouped={have:[],unsure:[],missing:[]};
    entries.forEach(([id,st])=>grouped[st]?.push(id));
    return `<div class="service-head"><div class="big-icon">✅</div><div><h1>${tr("currentStatus")}</h1><p>${tr("privacyShort")}</p></div></div>
      ${entries.length?`${progressGroup("✅",tr("statusHave"),grouped.have)}
        ${progressGroup("❓",tr("statusUnsure"),grouped.unsure)}
        ${progressGroup("❌",tr("statusMissing"),grouped.missing)}
        <div class="toolbar"><button id="printBtn" class="secondary-btn">🖨️ ${tr("print")}</button><button id="resetBtn" class="danger-btn">🗑️ ${tr("reset")}</button></div>`
      :`<div class="empty">${tr("noCase")}</div>`}`;
  }

  function progressGroup(icon,title,ids){
    if(!ids.length) return "";
    return `<div class="section-title"><div><h2>${icon} ${title}</h2></div></div><div class="requirements">
      ${ids.filter(id=>APP_DATA.documents[id]).map(id=>{const d=APP_DATA.documents[id];return `<article class="req clickable" data-recovery="${id}" tabindex="0" role="button">
      <div class="req-top"><div class="req-icon">${d.icon}</div><div class="req-main"><h3>${tx(d.title)}</h3><p>${tx(d.desc)}</p></div></div></article>`}).join("")}</div>`;
  }

  function sourcesBlock(){
    return `<div class="section-title"><div><h2>${tr("sources")}</h2></div></div><div class="source-list">
      ${APP_DATA.sources.map(s=>`<a href="${s.url}" target="_blank" rel="noopener">${esc(tx(s.label))} ↗</a>`).join("")}</div>`;
  }

  function openRecovery(id){
    const d=APP_DATA.documents[id]; if(!d) return;
    $("#modalTitle").textContent=`${d.icon} ${tx(d.title)}`;
    $("#modalBody").innerHTML=`<p>${esc(tx(d.desc))}</p><div class="recovery-steps">
      ${[...d.recovery].sort((a,b)=>a.level-b.level).map(step=>`<div class="step"><div class="level l${step.level}">${step.level}</div><div>
      <h4>${complexityLabel(step.level)}</h4><p>${esc(step[state.lang])}</p>
      ${step.url?`<a href="${step.url}" target="_blank" rel="noopener">${tr("openOfficial")} ↗</a>`:""}</div></div>`).join("")}</div>
      ${d.requestTarget?`<div class="toolbar"><button type="button" class="secondary-btn" id="makeRequest" data-doc="${id}">✉️ ${tr("copyRequest")}</button></div>`:""}`;
    $("#modal").showModal();
    $("#makeRequest")?.addEventListener("click",()=>copyRequest(id));
  }

  function complexityLabel(level){
    const x=state.lang==="es"
      ?["","Nivel 1 · inmediato","Nivel 2 · contacto sencillo","Nivel 3 · trámite oficial","Nivel 4 · apoyo recomendado"]
      :["","Stufe 1 · sofort","Stufe 2 · einfache Anfrage","Stufe 3 · Behördengang","Stufe 4 · Beratung sinnvoll"];
    return x[level];
  }

  async function copyRequest(id){
    const d=APP_DATA.documents[id];
    const es=`Asunto: Solicitud de copia / justificante

Buenos días:
Necesito ${tx(d.title)} para un trámite administrativo en Alemania. Mis documentos anteriores ya no están disponibles. ¿Podrían indicarme cómo obtener una copia o un nuevo justificante?

Muchas gracias.`;
    const de=`Betreff: Bitte um Kopie / Nachweis

Sehr geehrte Damen und Herren,
ich benötige ${d.title.de} für einen Behördenantrag. Meine bisherigen Unterlagen sind nicht mehr verfügbar. Bitte teilen Sie mir mit, wie ich eine Kopie beziehungsweise einen neuen Nachweis erhalten kann.

Vielen Dank.`;
    const text=`${es}\n\n--- DEUTSCH ---\n\n${de}`;
    try{
      await navigator.clipboard.writeText(text);
      const btn=$("#makeRequest"); if(btn) btn.textContent=`✓ ${tr("copied")}`;
      toast(tr("copied"));
    }catch(_){
      // Zwischenablage nur in sicheren Kontexten (https/localhost) verfuegbar.
      const ta=document.createElement("textarea");
      ta.className="manual-text"; ta.value=text; ta.readOnly=true;
      $("#modalBody")?.appendChild(ta); ta.focus(); ta.select();
      toast(L("Copia el texto manualmente.","Text bitte manuell kopieren."));
    }
  }

  function openMoreSheet(){
    const items=[
      {route:"advice",  icon:"🤝", title:L("Dónde encontrar asesoría","Wo es Beratung gibt"), sub:L("Servicios gratuitos y confidenciales","Kostenlose, vertrauliche Stellen")},
      {route:"docs",    icon:"🔎", title:tr("docsTitle"), sub:tr("docsSub")},
      {route:"lost",    icon:"🔥", title:tr("lostTitle"), sub:tr("lostSub")},
      ...(FEATURES?.hasPreparedValues()?[{route:"fill", icon:"🖊️", title:L("Rellenar el formulario oficial","Amtliches Formular ausfüllen"), sub:L("Escribir los valores en el PDF","Werte in das PDF schreiben")}]:[]),
      {route:"dossier", icon:"📑", title:L("Expediente imprimible","Druckfertige Fallakte"), sub:L("Para llevar a la asesoría o a la oficina","Zum Mitnehmen in Beratung oder Amt")},
      {route:"outbox",  icon:"📮", title:L("Libro de envíos","Postausgangsbuch"), sub:L("Qué se entregó, cuándo y cómo","Was wann und wie eingereicht wurde")},
      {route:"household",icon:"👪", title:L("Comunidad de necesidad","Bedarfsgemeinschaft"), sub:L("Personas del hogar y sus anexos","Personen im Haushalt und ihre Anlagen")},
      {route:"progress",icon:"✅", title:tr("currentStatus"), sub:tr("privacyShort")},
      {route:"settings",icon:"⚙️", title:L("Ajustes y privacidad","Einstellungen und Datenschutz"), sub:L("Conservación de datos y voz","Datenhaltung und Sprache")}
    ];
    $("#modalTitle").textContent=tr("navMore");
    $("#modalBody").innerHTML=`<div class="more-list">
      ${items.map(i=>`<button type="button" class="more-item" data-more-route="${i.route}">
        <span class="more-icon" aria-hidden="true">${i.icon}</span>
        <span><strong>${esc(i.title)}</strong><small>${esc(i.sub)}</small></span>
      </button>`).join("")}
    </div>
    `;
    $("#modal").showModal();
    $$(`[data-more-route]`).forEach(el=>el.addEventListener("click",()=>{
      $("#modal").close(); setRoute(el.dataset.moreRoute);
    }));

  }

  function showPrivacy(){
    $("#modalTitle").textContent=tr("privacyTitle");
    $("#modalBody").innerHTML=`<p>${tr("privacyBody")}</p>
      <div class="notice">${state.lang==="es"
        ?"v0.3 guarda la clasificación localmente. Documentos, OCR y datos extraídos permanecen solo en esta sesión y no se suben a Puente. Para OCR/PDF se descargan librerías del navegador desde CDN cuando se necesitan."
        :"v0.3 speichert die Einordnung lokal. Dokumente, OCR und erkannte Angaben bleiben nur in dieser Sitzung und werden nicht an Puente hochgeladen. Für OCR/PDF werden bei Bedarf Browser-Bibliotheken von einem CDN geladen."}</div>
      <div class="notice">${tr("legalNote")}</div>
      <button type="button" class="danger-btn" id="modalReset">🗑️ ${tr("reset")}</button>`;
    $("#modal").showModal();
    $("#modalReset").addEventListener("click",resetAll);
  }

  async function resetAll(){
    if(!confirm(tr("resetConfirm"))) return;
    liveFiles.forEach(x=>{ if(x.url) URL.revokeObjectURL(x.url); });
    liveFiles.clear();
    releaseOcrWorker();
    await Storage.clearAll();
    bindStorageObjects({...defaultState, lang:state.lang});
    if($("#modal").open) $("#modal").close();
    render();
  }

  /** Verbindet die Arbeitsvariablen mit den Objekten im Speichermodul. */
  function bindStorageObjects(initialState){
    Storage.app.state = normalizeState(initialState ?? Storage.app.state);
    state = Storage.app.state;
    formValues = Storage.personal.formValues;
    docSession = Storage.personal.docSession;
    Storage.save("app"); Storage.save("personal");
  }

  // Zusatzmodule aus features.js. Der Kontext liefert lebende Referenzen,
  // damit das Modul denselben Zustand sieht wie der Rest der App.
  const FEATURES = (typeof window.PuenteFeatures === "function")
    ? window.PuenteFeatures({
        lang:()=>state.lang, esc, tx, L, toast, render, setRoute,
        findDoc:id=>docSession.docs.find(d=>d.id===id),
        services:()=>{
          const p=state.profile||{};
          const goal=p.goal;
          if(goal==="grundsicherung") return ["grundsicherung"];
          if(goal==="wohngeld") return ["wohngeld"];
          return ["grundsicherung","wohngeld"];
        },
        formRows:()=>dossierFormRows(dossierService()),
        facts:dossierFacts,
        personName:dossierPersonName
      })
    : null;

  const VOICE = (typeof window.PuenteVoice === "function")
    ? window.PuenteVoice({
        lang:()=>state.lang, esc, toast,
        settings:()=>state.settings,
        saveSettings:saveState,
        onSpeakChange:on=>{ const b=$("#readBtn"); if(b){ b.classList.toggle("speaking",on); b.setAttribute("aria-pressed",String(on)); } }
      })
    : null;

  function bindViewEvents(){
    $$(`[data-service]`).forEach(el=>el.addEventListener("click",()=>setRoute("service",{service:el.dataset.service})));
    $$(`[data-fields]`).forEach(el=>el.addEventListener("click",()=>{
      state.activeForm=null;
      setRoute("fields",{formService:el.dataset.fields});
    }));
    $$(`[data-go]`).forEach(el=>el.addEventListener("click",()=>setRoute(el.dataset.go)));
    $$(`[data-recovery]`).forEach(el=>{
      el.addEventListener("click",e=>{e.stopPropagation();openRecovery(el.dataset.recovery)});
      if(el.getAttribute("role")==="button") el.addEventListener("keydown",e=>{
        if(e.key==="Enter"||e.key===" "){e.preventDefault();openRecovery(el.dataset.recovery);}
      });
    });
    $$(`[data-status-doc]`).forEach(el=>el.addEventListener("click",()=>{
      const id=el.dataset.statusDoc,val=el.dataset.status;
      state.statuses[id]=state.statuses[id]===val?"":val;
      if(!state.statuses[id]) delete state.statuses[id];
      saveState();render();
    }));

    $$(`[data-qid]`).forEach(el=>el.addEventListener("click",()=>{
      const q=APP_DATA.assistantQuestions.find(x=>x.id===el.dataset.qid);
      if(!q) return;
      const value=el.dataset.opt;
      if(q.type==="multi"){
        let values=arr(state.profile[q.id]);
        if((q.exclusive||[]).includes(value)){
          values=values.includes(value)?[]:[value];
        }else{
          values=values.filter(x=>!(q.exclusive||[]).includes(x));
          values=values.includes(value)?values.filter(x=>x!==value):[...values,value];
        }
        state.profile[q.id]=values;
      }else{
        state.profile[q.id]=value;
      }
      saveState();render();
    }));
    $("#assistantBack")?.addEventListener("click",()=>{
      if(state.assistantStep>0){state.assistantStep--;saveState();render();}
    });
    $("#assistantNext")?.addEventListener("click",()=>{
      const qs=APP_DATA.assistantQuestions, q=qs[state.assistantStep||0];
      const answer=state.profile[q.id];
      if(q.type==="single" && !answer){
        toast(L("Selecciona una opción.","Bitte eine Option wählen."));
        return;
      }
      if(q.type==="multi" && !Array.isArray(answer)) state.profile[q.id]=[];
      if(state.assistantStep>=qs.length-1){state.assistantDone=true;}
      else state.assistantStep++;
      saveState();render();window.scrollTo({top:0});
    });
    $("#assistantEdit")?.addEventListener("click",()=>{
      state.assistantDone=false;state.assistantStep=0;saveState();render();
    });
    $("#caseReset")?.addEventListener("click",resetAll);

    $$(`[data-form-tab]`).forEach(el=>el.addEventListener("click",()=>{
      state.activeForm=el.dataset.formTab;saveState();render();
    }));
    $("#toggleAllFields")?.addEventListener("click",()=>{
      state.showAllFields=!state.showAllFields;saveState();render();
    });
    $$(`[data-form-key]`).forEach(el=>el.addEventListener("input",()=>{
      formValues[el.dataset.formKey]=el.value;saveSession();
    }));
    $("#clearFormValues")?.addEventListener("click",()=>{
      if(confirm(state.lang==="es"?"¿Borrar los valores escritos durante esta sesión?":"Sitzungswerte löschen?")){
        formValues=Storage.replacePersonal("formValues",{});render();
      }
    });

    // value zuruecksetzen, sonst loest dieselbe Datei kein change-Event aus.
    const pickFiles=e=>{const f=e.target.files;const el=e.target;addCaseFiles(f).finally(()=>{try{el.value=""}catch(_){}})};
    $("#caseFiles")?.addEventListener("change",pickFiles);
    $("#cameraBtn")?.addEventListener("click",()=>$("#cameraInput")?.click());
    $("#cameraInput")?.addEventListener("change",pickFiles);
    $("#cardCameraBtn")?.addEventListener("click",()=>$("#cardCameraInput")?.click());
    $("#cardCameraInput")?.addEventListener("change",e=>{const el=e.target;addCaseFiles(el.files,{sourceKind:"card"}).finally(()=>{try{el.value=""}catch(_){}});});
    $("#audioPickBtn")?.addEventListener("click",()=>$("#audioInput")?.click());
    $("#audioRecordBtn")?.addEventListener("click",startLocalAudioRecording);
    $("#audioStopBtn")?.addEventListener("click",stopLocalAudioRecording);
    $("#audioInput")?.addEventListener("change",e=>{const el=e.target,file=el.files?.[0];addAudioFile(file).finally(()=>{try{el.value=""}catch(_){}});});
    const zone=$("#uploadZone");
    if(zone){
      ["dragenter","dragover"].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.add("drag")}));
      ["dragleave","drop"].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.remove("drag")}));
      zone.addEventListener("drop",e=>addCaseFiles(e.dataTransfer.files));
    }
    $("#manualTextBtn")?.addEventListener("click",openManualTextModal);
    $$('[data-analyze-doc]').forEach(el=>el.addEventListener("click",()=>analyzeCaseDocument(el.dataset.analyzeDoc)));
    $$('[data-remove-doc]').forEach(el=>el.addEventListener("click",()=>removeCaseDoc(el.dataset.removeDoc)));
    $$('[data-show-transcript]').forEach(el=>el.addEventListener("click",()=>showTranscript(el.dataset.showTranscript)));
    $$('[data-approve-safe-doc]').forEach(el=>el.addEventListener("click",()=>approveSafeFacts(el.dataset.approveSafeDoc)));
    $$('[data-doc-type]').forEach(el=>el.addEventListener("change",()=>{const d=docSession.docs.find(x=>x.id===el.dataset.docType);if(d){d.type=el.value;d.typeConfidence=1;autoMarkDocument(d);saveDocSession();saveState();render();}}));
    $$('[data-approve-fact]').forEach(el=>el.addEventListener("click",()=>{const [id,idx]=el.dataset.approveFact.split(":");const inp=document.querySelector(`[data-fact-edit="${id}:${idx}"]`);approveFact(id,Number(idx),inp?.value);}));
    $$('[data-ignore-fact]').forEach(el=>el.addEventListener("click",()=>{const [id,idx]=el.dataset.ignoreFact.split(":");const d=docSession.docs.find(x=>x.id===id),f=d?.facts?.[Number(idx)];if(f){docSession.ignoredFacts[`${id}:${f.key}`]=true;saveDocSession();render();}}));
    $("#clearDocumentsBtn")?.addEventListener("click",()=>{if(confirm(state.lang==="es"?"¿Borrar documentos y datos extraídos de esta sesión?":"Sitzungsdokumente und erkannte Angaben löschen?")){liveFiles.forEach(x=>{if(x.url)URL.revokeObjectURL(x.url)});liveFiles.clear();docSession=Storage.replacePersonal("docSession",{docs:[],approvedFacts:{},ignoredFacts:{}});releaseOcrWorker();render();}});
    $("#exportCaseBtn")?.addEventListener("click",exportCaseSummary);
    $("#caseProgressBtn")?.addEventListener("click",()=>setRoute("progress"));

    $("#printDossierBtn")?.addEventListener("click",()=>window.print());
    $("#exportPackageBtn")?.addEventListener("click",exportSubmissionPackage);
    $("#downloadDossierHtmlBtn")?.addEventListener("click",downloadDossierHtml);
    $("#printBtn")?.addEventListener("click",()=>window.print());
    $("#resetBtn")?.addEventListener("click",resetAll);
    FEATURES?.bind();
    FEATURES?.bindHousehold();

    $$(`[data-abort-doc]`).forEach(el=>el.addEventListener("click",()=>abortAnalysis(el.dataset.abortDoc)));
    $("#toggleAreas")?.addEventListener("click",()=>{
      state.settings.showAreas=!state.settings.showAreas; saveState(); render();
    });
    $$(`[data-phase]`).forEach(el=>el.addEventListener("click",()=>{
      state.phase=el.dataset.phase; saveState(); render();
    }));
    $$(`[data-service-hint]`).forEach(el=>el.addEventListener("click",()=>{
      state.service=el.dataset.serviceHint; saveState();
    }));

    $("#storageAlertOk")?.addEventListener("click",()=>{ storageAlert=null; Storage.clearError(); render(); });

    $$(`[data-mode]`).forEach(el=>el.addEventListener("click",async ()=>{
      const next=el.dataset.mode;
      if(next==="device" && !confirm(L(
        "En este modo los datos permanecen en el dispositivo hasta que los borres. ¿Seguro que este equipo es tuyo?",
        "In dieser Stufe bleiben die Daten auf dem Gerät, bis du sie löschst. Ist dies wirklich dein eigenes Gerät?"))) return;
      await Storage.setMode(next);
      formValues=Storage.personal.formValues;
      docSession=Storage.personal.docSession;
      FEATURES?.rebind();
      toast(L("Modo de conservación cambiado.","Datenhaltung geändert."));
      render();
    }));
    $("#voiceConsent")?.addEventListener("change",e=>{
      state.settings.voiceConsent=e.target.checked; saveState();
    });
    $("#clearPersonalBtn")?.addEventListener("click",async ()=>{
      if(!confirm(L("¿Borrar ahora todos los datos personales de este dispositivo?",
                    "Alle persönlichen Daten auf diesem Gerät jetzt löschen?"))) return;
      liveFiles.forEach(x=>{ if(x.url) URL.revokeObjectURL(x.url); });
      liveFiles.clear(); releaseOcrWorker();
      await Storage.clearPersonal();
      formValues=Storage.personal.formValues;
      docSession=Storage.personal.docSession;
      FEATURES?.rebind();
      toast(L("Datos personales borrados.","Persönliche Daten gelöscht."));
      render();
    });
    $("#docSearch")?.addEventListener("input",e=>{
      const q=e.target.value.trim().toLowerCase();
      const ids=Object.keys(APP_DATA.documents).filter(id=>{
        const d=APP_DATA.documents[id];
        return [d.title.es,d.title.de,d.desc.es,d.desc.de,id].join(" ").toLowerCase().includes(q);
      });
      $("#docResults").innerHTML=docsList(ids);
      $$(`[data-recovery]`,$("#docResults")).forEach(el=>el.addEventListener("click",()=>openRecovery(el.dataset.recovery)));
    });
  }

  const modalEl=$("#modal");
  modalEl?.addEventListener("click",e=>{ if(e.target===modalEl) modalEl.close(); });

  window.addEventListener("popstate",e=>{
    const st=e.state||{};
    setRoute(ROUTES.includes(st.route)?st.route:"home",
      {service:st.service,formService:st.formService,fromHistory:true});
  });

  $("#langBtn").addEventListener("click",()=>{
    VOICE?.stopSpeaking();
    state.lang=state.lang==="es"?"de":"es";saveState();render();
  });
  $("#settingsBtn")?.addEventListener("click",()=>setRoute("settings"));
  $("#readBtn")?.addEventListener("click",()=>{
    if(!VOICE) return;
    if(VOICE.isSpeaking()) VOICE.stopSpeaking();
    else VOICE.readCurrentView();
  });
  $("#homeBtn").addEventListener("click",()=>setRoute("home"));

  $$(".nav-btn").forEach(b=>b.addEventListener("click",()=>{
    // "Mehr" ist keine Route, sondern ein Auswahl-Sheet.
    if(b.dataset.route==="more"){ openMoreSheet(); return; }
    setRoute(b.dataset.route);
  }));

  if("serviceWorker" in navigator){
    window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
  }
  // Start: erst den Speicher laden, dann rendern. Vorher gibt es keinen
  // Zustand, deshalb ist der Bootvorgang asynchron.
  (async function boot(){
    try{
      await Storage.init({
        onError:info=>{ storageAlert=info; try{ render(); }catch(_){} },
        onIdleWipe:()=>{
          liveFiles.forEach(x=>{ if(x.url) URL.revokeObjectURL(x.url); });
          liveFiles.clear(); releaseOcrWorker();
          formValues=Storage.personal.formValues;
          docSession=Storage.personal.docSession;
          FEATURES?.rebind();
          toast(L("Datos personales borrados por inactividad.","Persönliche Daten wegen Inaktivität gelöscht."));
          render();
        }
      });
    }catch(err){ console.error("Storage init:",err); }

    bindStorageObjects();
    FEATURES?.rebind();

    const hashRoute=(location.hash||"").replace("#","");
    if(ROUTES.includes(hashRoute)) state.route=hashRoute;
    try{ history.replaceState({route:state.route,service:state.service,formService:state.formService},"",`#${state.route}`); }catch(_){}
    render();

    // Bei "geteiltes Gerät" den Inaktivitaets-Zaehler bei Bedienung zuruecksetzen.
    ["pointerdown","keydown"].forEach(ev=>window.addEventListener(ev,()=>Storage.touch(),{passive:true}));
    window.addEventListener("pagehide",()=>{ try{ Storage.flush(true); }catch(_){} });
  })();
})();
