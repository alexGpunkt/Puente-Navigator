/* Puente v0.5 – Zusatzmodule
   Fristen, Bescheidanalyse, Formularbefüllung, Beratungsstellen.

   Das Modul bekommt von app.js einen Kontext mit lebenden Referenzen auf den
   App-Zustand. Es hält selbst nur die Fristenliste, weil die sonst nirgends
   hingehört. Alles bleibt lokal: keine Übertragung an einen Server.            */

window.PuenteFeatures = function (ctx) {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const L = (es, de) => (ctx.lang() === "es" ? es : de);
  const esc = ctx.esc;
  const tx = ctx.tx;
  const D = () => APP_DATA;

  // Fristen und Postausgang liegen im gemeinsamen Speichermodul, damit sie
  // derselben Aufbewahrungsstufe folgen wie die uebrigen persoenlichen Daten.
  const S = window.PuenteStorage;
  let deadlines = [];
  let outbox = [];

  /** Nach Moduswechsel oder Loeschung neu an die Speicherobjekte binden. */
  function rebind() {
    deadlines = Array.isArray(S.personal.deadlines) ? S.personal.deadlines : (S.personal.deadlines = []);
    outbox = Array.isArray(S.personal.outbox) ? S.personal.outbox : (S.personal.outbox = []);
  }
  function saveDeadlines() { S.personal.deadlines = deadlines; S.save("personal"); }
  function saveOutbox() { S.personal.outbox = outbox; S.save("personal"); }

  /* ========================================================================
     Datums- und Fristberechnung
     § 26 SGB X in Verbindung mit §§ 187, 188 BGB:
     - Der Ereignistag zählt nicht mit.
     - Eine Monatsfrist endet an dem Tag des Folgemonats, der dem Ereignistag
       entspricht; fehlt dieser Tag, am letzten Tag des Monats.
     - Fällt das Ende auf Samstag oder Sonntag, endet die Frist am nächsten
       Werktag. Gesetzliche Feiertage sind Ländersache und werden hier bewusst
       nicht automatisch berücksichtigt.
     ======================================================================== */

  function toISO(d) {
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function fromISO(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d) ? null : d;
  }
  function parseLooseDate(s) {
    const t = String(s || "").trim();
    let m = /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/.exec(t);
    if (m) {
      let y = Number(m[3]); if (y < 100) y += y < 70 ? 2000 : 1900;
      const d = new Date(y, Number(m[2]) - 1, Number(m[1]));
      return isNaN(d) ? null : d;
    }
    return fromISO(t);
  }
  function fmtDate(d) {
    if (!d) return "–";
    return new Intl.DateTimeFormat(ctx.lang() === "es" ? "es-ES" : "de-DE",
      { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addMonths(d, n) {
    const day = d.getDate();
    const x = new Date(d.getFullYear(), d.getMonth() + n, 1);
    const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
    x.setDate(Math.min(day, last));
    return x;
  }
  function nextWorkday(d) {
    const x = new Date(d);
    while (x.getDay() === 0 || x.getDay() === 6) x.setDate(x.getDate() + 1);
    return x;
  }
  function today() { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
  function daysUntil(iso) {
    const d = fromISO(iso); if (!d) return null;
    return Math.round((d - today()) / 86400000);
  }

  function typeById(id) { return (D().deadlineTypes || []).find(t => t.id === id) || D().deadlineTypes[D().deadlineTypes.length - 1]; }

  /** Nur die Fristarten anbieten, die zum Fall passen. Wohngeld-Weiterleistung
      hilft niemandem, der gar kein Wohngeld beantragt. */
  function relevantTypes() {
    const services = ctx.services();
    return (D().deadlineTypes || []).filter(t => {
      if (t.id === "wohngeld_weiter") return services.includes("wohngeld");
      if (t.id === "weiterbewilligung") return services.includes("grundsicherung");
      return true;
    });
  }

  /** Berechnet aus Startdatum und Fristart das Fristende inklusive Zwischenschritten. */
  function computeDeadline(typeId, startDate) {
    const t = typeById(typeId);
    const start = startDate instanceof Date ? startDate : parseLooseDate(startDate);
    if (!start) return null;
    const steps = [];
    let cur = start;

    if (t.leadDays) {
      cur = addDays(start, -t.leadDays);
      steps.push({ label: L(`${t.leadDays} días antes del fin del periodo`, `${t.leadDays} Tage vor Ende des Bewilligungszeitraums`), date: cur });
      const adj = nextWorkday(cur);
      return { due: adj, steps, type: t, start, weekendShift: +adj !== +cur };
    }

    if (t.postDays) {
      cur = addDays(start, t.postDays);
      steps.push({ label: L("Notificación presunta (3.er día tras el envío)", "Bekanntgabe (3. Tag nach Aufgabe zur Post)"), date: cur });
    }
    if (t.months) {
      cur = addMonths(cur, t.months);
      steps.push({ label: L(`${t.months} mes de plazo`, `${t.months} Monat Frist`), date: cur });
    }
    if (t.days) {
      cur = addDays(cur, t.days);
      steps.push({ label: L(`${t.days} días de plazo`, `${t.days} Tage Frist`), date: cur });
    }
    const adjusted = nextWorkday(cur);
    if (+adjusted !== +cur) steps.push({ label: L("Traslado al siguiente día laborable", "Verschiebung auf den nächsten Werktag"), date: adjusted });
    return { due: adjusted, steps, type: t, start, weekendShift: +adjusted !== +cur };
  }

  function addDeadline(entry) {
    const d = {
      id: `f${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: entry.type || "custom",
      title: entry.title || "",
      due: entry.due,
      ref: entry.ref || "",
      note: entry.note || "",
      source: entry.source || "",
      done: false,
      createdAt: new Date().toISOString()
    };
    // Doppelte Fristen aus wiederholter Bescheidanalyse vermeiden.
    const dup = deadlines.find(x => x.type === d.type && x.due === d.due && x.ref === d.ref);
    if (dup) return dup;
    deadlines.push(d);
    saveDeadlines();
    return d;
  }
  function removeDeadline(id) { deadlines = deadlines.filter(d => d.id !== id); saveDeadlines(); }
  function removeOutbox(id) { outbox = outbox.filter(o => o.id !== id); saveOutbox(); }
  function toggleDeadline(id) {
    const d = deadlines.find(x => x.id === id); if (!d) return;
    d.done = !d.done; saveDeadlines();
  }
  function openCount() {
    return deadlines.filter(d => !d.done && (daysUntil(d.due) ?? 99) <= 14).length;
  }
  function sorted() {
    return [...deadlines].sort((a, b) => (a.done - b.done) || String(a.due).localeCompare(String(b.due)));
  }

  /* ========================================================================
     ICS-Export für den Handykalender
     ======================================================================== */

  function icsEscape(s) {
    return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;")
      .replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }
  function icsFold(line) {
    if (line.length <= 73) return line;
    let out = line.slice(0, 73); let rest = line.slice(73);
    while (rest.length) { out += "\r\n " + rest.slice(0, 72); rest = rest.slice(72); }
    return out;
  }
  function icsDate(d) { return toISO(d).replace(/-/g, ""); }

  function buildIcs(entries) {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Puente//Prototyp v0.5//DE",
      "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    for (const e of entries) {
      const due = fromISO(e.due); if (!due) continue;
      const t = typeById(e.type);
      const title = e.title || tx(t.title);
      const desc = [
        e.ref ? `${L("Expediente", "Aktenzeichen")}: ${e.ref}` : "",
        t.basis ? `${L("Base legal", "Rechtsgrundlage")}: ${t.basis}` : "",
        e.note || "",
        L("Creado con Puente. Comprueba el plazo en el escrito original.",
          "Erstellt mit Puente. Frist im Originalschreiben prüfen.")
      ].filter(Boolean).join("\n");
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${e.id}@puente.local`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART;VALUE=DATE:${icsDate(due)}`);
      lines.push(`DTEND;VALUE=DATE:${icsDate(addDays(due, 1))}`);
      lines.push(icsFold(`SUMMARY:${icsEscape(`${t.icon} ${title}`)}`));
      lines.push(icsFold(`DESCRIPTION:${icsEscape(desc)}`));
      lines.push("BEGIN:VALARM", "TRIGGER:-P3D", "ACTION:DISPLAY",
        icsFold(`DESCRIPTION:${icsEscape(L("En 3 días vence: ", "In 3 Tagen fällig: ") + title)}`), "END:VALARM");
      lines.push("BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY",
        icsFold(`DESCRIPTION:${icsEscape(L("Mañana vence: ", "Morgen fällig: ") + title)}`), "END:VALARM");
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  function download(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportIcs(ids) {
    const list = ids ? deadlines.filter(d => ids.includes(d.id)) : deadlines.filter(d => !d.done);
    if (!list.length) { ctx.toast(L("No hay plazos que exportar.", "Keine Fristen zum Exportieren.")); return; }
    download(`Puente_Fristen_${toISO(today())}.ics`, buildIcs(list), "text/calendar;charset=utf-8");
    ctx.toast(L("Archivo de calendario creado.", "Kalenderdatei erstellt."));
  }

  /* ========================================================================
     Ansicht: Fristen
     ======================================================================== */

  function urgency(d) {
    if (d.done) return "done";
    const n = daysUntil(d.due);
    if (n === null) return "";
    if (n < 0) return "over";
    if (n <= 3) return "critical";
    if (n <= 14) return "soon";
    return "later";
  }
  function urgencyLabel(d) {
    if (d.done) return L("hecho", "erledigt");
    const n = daysUntil(d.due);
    if (n === null) return "";
    if (n < 0) return L(`vencido hace ${-n} d.`, `seit ${-n} Tagen abgelaufen`);
    if (n === 0) return L("vence hoy", "heute fällig");
    if (n === 1) return L("mañana", "morgen");
    return L(`en ${n} días`, `in ${n} Tagen`);
  }

  function deadlineCard(d) {
    const t = typeById(d.type);
    const u = urgency(d);
    return `<article class="deadline ${u}">
      <div class="deadline-head">
        <div class="deadline-icon">${t.icon}</div>
        <div class="deadline-main">
          <h3>${esc(d.title || tx(t.title))}</h3>
          <div class="deadline-date"><strong>${esc(fmtDate(fromISO(d.due)))}</strong> · ${esc(urgencyLabel(d))}</div>
          ${d.ref ? `<div class="small">${L("Expediente", "Aktenzeichen")}: ${esc(d.ref)}</div>` : ""}
          ${d.note ? `<div class="small">${esc(d.note)}</div>` : ""}
          ${t.basis ? `<div class="deadline-basis">${esc(t.basis)}</div>` : ""}
        </div>
      </div>
      <div class="deadline-actions">
        <button type="button" class="mini-btn" data-deadline-done="${d.id}">${d.done ? L("↺ Reabrir", "↺ Wieder öffnen") : L("✓ Hecho", "✓ Erledigt")}</button>
        <button type="button" class="mini-btn primary" data-deadline-ics="${d.id}">📅 ${L("Al calendario", "In den Kalender")}</button>
        ${d.type === "widerspruch" ? `<button type="button" class="mini-btn" data-objection="${d.id}">✉️ ${L("Escrito de recurso", "Widerspruchsschreiben")}</button>` : ""}
        <button type="button" class="mini-btn danger" data-deadline-del="${d.id}">✕ ${L("Quitar", "Entfernen")}</button>
      </div>
    </article>`;
  }

  function deadlinesView() {
    const list = sorted();
    const open = list.filter(d => !d.done);
    const done = list.filter(d => d.done);
    return `
      <div class="service-head">
        <div class="big-icon">⏳</div>
        <div>
          <h1>${L("Plazos y citas", "Fristen und Termine")}</h1>
          <p>${L("La causa más frecuente de que un derecho se pierda es un plazo vencido, no una solicitud mal hecha.",
                 "Fristen sind die häufigste Ursache dafür, dass ein Anspruch verloren geht – nicht der falsch ausgefüllte Antrag.")}</p>
        </div>
      </div>

      <div class="privacy-session">🔒 ${L(
        "Los plazos se guardan solo en este dispositivo. Al exportar al calendario, el archivo pasa a la aplicación de calendario que elijas.",
        "Fristen werden nur auf diesem Gerät gespeichert. Beim Kalender-Export gibt die Datei die Angaben an die gewählte Kalender-App weiter.")}</div>

      <div class="toolbar">
        <button type="button" class="primary-btn" id="addDeadlineBtn">➕ ${L("Añadir plazo", "Frist hinzufügen")}</button>
        <button type="button" class="secondary-btn" id="exportIcsBtn">📅 ${L("Exportar todo (.ics)", "Alle exportieren (.ics)")}</button>
      </div>

      ${open.length ? `<div class="deadline-list">${open.map(deadlineCard).join("")}</div>`
        : `<div class="empty"><div class="empty-illustration">⏳</div>
             ${L("Todavía no hay plazos. Añade uno o analiza una resolución en el área del caso; Puente calcula entonces el plazo de recurso.",
                 "Noch keine Fristen. Füge eine hinzu oder analysiere im Fall-Arbeitsbereich einen Bescheid – Puente berechnet dann die Widerspruchsfrist.")}</div>`}

      ${done.length ? `<div class="section-title"><div><h2>${L("Hecho", "Erledigt")}</h2></div></div>
        <div class="deadline-list">${done.map(deadlineCard).join("")}</div>` : ""}

      <div class="notice warning"><strong>${L("Importante", "Wichtig")}:</strong> ${L(
        "Puente calcula los plazos según las reglas habituales. Lo que vale es la instrucción de recurso del escrito original. Si no hay instrucción o es incorrecta, el plazo suele ser de un año.",
        "Puente rechnet nach den Regelfällen. Maßgeblich ist die Rechtsbehelfsbelehrung im Originalschreiben. Fehlt sie oder ist sie fehlerhaft, beträgt die Frist in der Regel ein Jahr.")}</div>
    `;
  }

  function openDeadlineModal(preset) {
    const p = preset || {};
    const types = relevantTypes();
    $("#modalTitle").textContent = L("➕ Añadir plazo", "➕ Frist hinzufügen");
    $("#modalBody").innerHTML = `
      <label class="field-label" for="dlType">${L("Tipo de plazo", "Fristart")}</label>
      <select id="dlType" class="full-input">
        ${types.map(t => `<option value="${t.id}" ${t.id === (p.type || "widerspruch") ? "selected" : ""}>${t.icon} ${esc(tx(t.title))}</option>`).join("")}
      </select>
      <div id="dlHelp" class="notice"></div>

      <label class="field-label" for="dlStart"><span id="dlStartLabel"></span></label>
      <input id="dlStart" class="full-input" type="date" value="${esc(p.start || toISO(today()))}">

      <div class="calc-box" id="dlCalc"></div>

      <label class="field-label" for="dlTitle">${L("Descripción (opcional)", "Bezeichnung (optional)")}</label>
      <input id="dlTitle" class="full-input" value="${esc(p.title || "")}" placeholder="${L("p. ej. Recurso contra la resolución de abril", "z. B. Widerspruch gegen Bescheid April")}">

      <label class="field-label" for="dlRef">${L("Expediente (opcional)", "Aktenzeichen (optional)")}</label>
      <input id="dlRef" class="full-input" value="${esc(p.ref || "")}">

      <div class="toolbar">
        <button type="button" class="primary-btn" id="dlSave">${L("Guardar plazo", "Frist speichern")}</button>
      </div>`;

    const refresh = () => {
      const t = typeById($("#dlType").value);
      $("#dlHelp").innerHTML = `${esc(tx(t.help))}${t.basis ? ` <span class="deadline-basis">${esc(t.basis)}</span>` : ""}`;
      $("#dlStartLabel").textContent = tx(t.startLabel);
      const r = computeDeadline(t.id, $("#dlStart").value);
      $("#dlCalc").innerHTML = r
        ? `<div class="calc-steps">${r.steps.map(s => `<div><span>${esc(s.label)}</span><strong>${esc(fmtDate(s.date))}</strong></div>`).join("")}</div>
           <div class="calc-result">${L("Fecha límite", "Fristende")}: <strong>${esc(fmtDate(r.due))}</strong></div>`
        : `<div class="small">${L("Introduce una fecha válida.", "Bitte ein gültiges Datum eingeben.")}</div>`;
    };
    $("#dlType").addEventListener("change", refresh);
    $("#dlStart").addEventListener("input", refresh);
    refresh();

    $("#dlSave").addEventListener("click", () => {
      const t = typeById($("#dlType").value);
      const r = computeDeadline(t.id, $("#dlStart").value);
      if (!r) { ctx.toast(L("Fecha no válida.", "Ungültiges Datum.")); return; }
      addDeadline({ type: t.id, due: toISO(r.due), title: $("#dlTitle").value.trim() || tx(t.title), ref: $("#dlRef").value.trim() });
      $("#modal").close();
      ctx.toast(L("Plazo guardado.", "Frist gespeichert."));
      ctx.setRoute("deadlines");
    });
    $("#modal").showModal();
  }

  /* ========================================================================
     Bescheidanalyse
     ======================================================================== */

  function analyseNotice(doc) {
    if (!doc) return null;
    const facts = Object.fromEntries((doc.facts || []).map(f => [f.key, f.value]));
    const flags = doc.noticeFlags || {};
    const isNotice = doc.type === "notice_decision" || doc.type === "previous_benefits" ||
      doc.type === "alg1_notice" || doc.type === "wohngeld_notice" || flags.rechtsbehelf;
    if (!isNotice) return null;

    const noticeDate = parseLooseDate(facts.noticeDate);
    const calc = noticeDate ? computeDeadline("widerspruch", noticeDate) : null;
    return {
      doc, facts, flags, noticeDate, calc,
      ref: facts.caseNumber || facts.customerNumber || "",
      kind: flags.aufhebung ? "aufhebung" : flags.ablehnung ? "ablehnung" : flags.bewilligung ? "bewilligung" : "unbekannt"
    };
  }

  /** Zusatzfelder aus einem Bescheidtext. Ergänzt extractFacts aus app.js. */
  function extractNoticeFacts(rawText) {
    const raw = String(rawText || "");
    const low = raw.toLowerCase();
    const out = [];
    const push = (key, value, confidence) => {
      value = String(value || "").trim();
      if (value && !out.some(x => x.key === key)) out.push({ key, value, confidence });
    };
    const near = (labels, pattern) => {
      for (const label of labels) {
        const re = new RegExp(label + "(?![A-Za-zÄÖÜäöüß])[^\\n]{0,40}?" + pattern.source, pattern.flags.replace("g", ""));
        const m = raw.match(re);
        if (m) return m[m.length - 1];
      }
      return null;
    };
    const az = near(["Aktenzeichen", "Az\\.?", "BG[- ]?Nummer", "Bedarfsgemeinschaftsnummer", "Nummer der Bedarfsgemeinschaft"],
      /([0-9A-Z][0-9A-Z .\/-]{5,24}[0-9A-Z])/i);
    if (az) push("caseNumber", az.trim(), 0.8);
    const kd = near(["Kundennummer", "Kunden-Nr\\.?", "BG-Nr\\.?"], /([0-9][0-9 .\/-]{4,20}[0-9])/i);
    if (kd) push("customerNumber", kd.trim(), 0.75);
    const nd = near(["Bescheid vom", "Datum", "vom"], /(\d{1,2}[.]\d{1,2}[.]\d{4})/i);
    if (nd) push("noticeDate", nd, 0.7);
    const span = raw.match(/(\d{1,2}[.]\d{1,2}[.]\d{4})\s*(?:bis|–|-|hasta)\s*(\d{1,2}[.]\d{1,2}[.]\d{4})/i);
    if (span) { push("periodFrom", span[1], 0.78); push("periodTo", span[2], 0.78); }

    const sig = D().noticeSignals || {};
    const flags = {};
    for (const [k, words] of Object.entries(sig)) flags[k] = words.some(w => low.includes(w));
    return { facts: out, flags };
  }

  function noticePanel(doc) {
    const a = analyseNotice(doc);
    if (!a) return "";
    const kindLabel = {
      bewilligung: L("Concesión", "Bewilligung"),
      ablehnung: L("Denegación", "Ablehnung"),
      aufhebung: L("Anulación o reclamación de devolución", "Aufhebung oder Erstattung"),
      unbekannt: L("Tipo no determinado", "Art nicht bestimmt")
    }[a.kind];

    return `<div class="notice-panel ${a.kind}">
      <div class="notice-panel-head">
        <strong>⚖️ ${L("Resolución detectada", "Bescheid erkannt")}</strong>
        <span class="badge ${a.kind === "aufhebung" || a.kind === "ablehnung" ? "warn" : ""}">${esc(kindLabel)}</span>
      </div>
      <table class="dossier-table"><tbody>
        ${a.ref ? `<tr><th>${L("Expediente", "Aktenzeichen")}</th><td>${esc(a.ref)}</td></tr>` : ""}
        ${a.noticeDate ? `<tr><th>${L("Fecha", "Bescheiddatum")}</th><td>${esc(fmtDate(a.noticeDate))}</td></tr>` : ""}
        ${a.facts.periodFrom ? `<tr><th>${L("Periodo", "Zeitraum")}</th><td>${esc(a.facts.periodFrom)} – ${esc(a.facts.periodTo || "?")}</td></tr>` : ""}
        ${a.facts.benefitAmount ? `<tr><th>${L("Importe", "Betrag")}</th><td>${esc(a.facts.benefitAmount)}</td></tr>` : ""}
        <tr><th>${L("Instrucción de recurso", "Rechtsbehelfsbelehrung")}</th><td>${a.flags.rechtsbehelf ? L("encontrada en el texto", "im Text gefunden") : L("no encontrada – comprueba la última página", "nicht gefunden – letzte Seite prüfen")}</td></tr>
      </tbody></table>

      ${a.calc ? `
        <div class="calc-box">
          <div class="calc-steps">${a.calc.steps.map(s => `<div><span>${esc(s.label)}</span><strong>${esc(fmtDate(s.date))}</strong></div>`).join("")}</div>
          <div class="calc-result">${L("Fin del plazo de recurso", "Ende der Widerspruchsfrist")}: <strong>${esc(fmtDate(a.calc.due))}</strong></div>
        </div>
        <div class="doc-actions">
          <button type="button" class="mini-btn primary" data-notice-deadline="${esc(doc.id)}">⏳ ${L("Guardar como plazo", "Als Frist übernehmen")}</button>
          <button type="button" class="mini-btn" data-notice-letter="${esc(doc.id)}">✉️ ${L("Preparar recurso", "Widerspruch vorbereiten")}</button>
        </div>`
        : `<div class="small">${L("Sin fecha de la resolución no se puede calcular el plazo. Añádela manualmente en «Plazos».",
                                  "Ohne Bescheiddatum lässt sich die Frist nicht berechnen. Bitte unter „Fristen“ von Hand eintragen.")}</div>
           <div class="doc-actions"><button type="button" class="mini-btn primary" data-notice-manual="1">⏳ ${L("Introducir plazo a mano", "Frist von Hand eintragen")}</button></div>`}

      <p class="small">${L("Sin garantía. Lo que vale es la instrucción de recurso del escrito original.",
                            "Ohne Gewähr. Maßgeblich ist die Rechtsbehelfsbelehrung im Originalschreiben.")}</p>
    </div>`;
  }

  function objectionLetter(a) {
    const ref = a.ref || "____________";
    const date = a.noticeDate ? fmtDate(a.noticeDate) : "____________";
    const name = ctx.personName();
    const de = `Absender: ${name}
${"_".repeat(40)}
${"_".repeat(40)}

An die zuständige Behörde

Betreff: Widerspruch gegen den Bescheid vom ${date}
Aktenzeichen: ${ref}

Sehr geehrte Damen und Herren,

gegen den oben genannten Bescheid lege ich hiermit fristgerecht Widerspruch ein.

Eine Begründung reiche ich nach. Ich bitte um Akteneinsicht beziehungsweise um Übersendung der Berechnungsbögen, die dem Bescheid zugrunde liegen.

Bitte bestätigen Sie mir den Eingang dieses Widerspruchs schriftlich.

Mit freundlichen Grüßen


${name}
Datum: ${fmtDate(today())}`;

    const es = `Remitente: ${name}
${"_".repeat(40)}
${"_".repeat(40)}

A la autoridad competente

Asunto: Recurso (Widerspruch) contra la resolución de ${date}
Número de expediente: ${ref}

Estimados señores:

Por la presente interpongo recurso dentro de plazo contra la resolución arriba indicada.

Presentaré la fundamentación posteriormente. Solicito acceso al expediente o el envío de las hojas de cálculo en las que se basa la resolución.

Les ruego que me confirmen por escrito la recepción de este recurso.

Atentamente


${name}
Fecha: ${fmtDate(today())}`;

    return { de, es };
  }

  function openObjectionModal(a) {
    const letter = objectionLetter(a);
    const primary = ctx.lang() === "es" ? letter.es : letter.de;
    $("#modalTitle").textContent = L("✉️ Escrito de recurso", "✉️ Widerspruchsschreiben");
    $("#modalBody").innerHTML = `
      <div class="notice warning">${L(
        "El recurso debe llegar dentro de plazo. Envíalo por correo certificado o entrégalo en persona y pide sello en una copia. El correo electrónico no siempre se acepta.",
        "Der Widerspruch muss fristgerecht ankommen. Per Einschreiben senden oder persönlich abgeben und eine Kopie abstempeln lassen. E-Mail wird nicht überall akzeptiert.")}</div>
      <div class="notice">${L(
        "Basta con interponer el recurso dentro de plazo; la fundamentación puede entregarse después.",
        "Für die Fristwahrung genügt der Widerspruch selbst; die Begründung kann nachgereicht werden.")}</div>
      <textarea id="objectionText" class="manual-text" rows="16">${esc(primary)}</textarea>
      <div class="toolbar">
        <button type="button" class="primary-btn" id="copyObjection">📋 ${L("Copiar", "Kopieren")}</button>
        <button type="button" class="secondary-btn" id="downloadObjection">💾 ${L("Guardar como texto", "Als Textdatei sichern")}</button>
      </div>`;
    $("#modal").showModal();
    $("#copyObjection").addEventListener("click", async () => {
      const text = $("#objectionText").value;
      try { await navigator.clipboard.writeText(text); ctx.toast(L("Copiado.", "Kopiert.")); }
      catch (_) { $("#objectionText").select(); ctx.toast(L("Copia manualmente.", "Bitte manuell kopieren.")); }
    });
    $("#downloadObjection").addEventListener("click", () => {
      download(`Widerspruch_${toISO(today())}.txt`, $("#objectionText").value);
    });
  }

  /* ========================================================================
     Amtliches PDF wirklich ausfüllen
     ======================================================================== */

  let pdfState = { doc: null, fields: [], mapping: {}, name: "", bytes: null };

  function preparedValues() {
    const rows = [];
    for (const r of ctx.formRows()) rows.push({ key: `${r.form}:${r.no}`, label: `${r.form} ${r.no} · ${r.title}`, value: r.value });
    for (const f of ctx.facts()) rows.push({ key: `fact:${f.key}`, label: f.label, value: String(f.value) });
    return rows.filter(r => String(r.value).trim());
  }

  function norm(s) {
    return String(s || "").toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }

  /** Einfaches Wort-Scoring zwischen PDF-Feldnamen und vorbereiteten Werten. */
  function guessMapping(fieldName, candidates) {
    const fn = norm(fieldName);
    if (!fn) return "";
    let best = { key: "", score: 0 };
    for (const c of candidates) {
      const words = norm(c.label).split(" ").filter(w => w.length > 3);
      let score = 0;
      for (const w of words) if (fn.includes(w)) score += w.length;
      const numMatch = /(\d{1,3})/.exec(c.key.split(":")[1] || "");
      if (numMatch && new RegExp(`(^|[^0-9])${numMatch[1]}([^0-9]|$)`).test(fn)) score += 6;
      if (score > best.score) best = { key: c.key, score };
    }
    return best.score >= 6 ? best.key : "";
  }

  function sanitizePdfText(s) {
    return String(s == null ? "" : s)
      .replace(/[\u2018\u2019\u201A]/g, "'").replace(/[\u201C\u201D\u201E]/g, '"')
      .replace(/[\u2013\u2014]/g, "-").replace(/\u2026/g, "...")
      .replace(/\u00a0/g, " ")
      // Zeichen ausserhalb von WinAnsi wuerden pdf-lib zum Abbruch bringen.
      .replace(/[^\x20-\x7E\u00A0-\u00FF\u20AC]/g, "");
  }

  function fillView() {
    const vals = preparedValues();
    return `
      <div class="service-head">
        <div class="big-icon">🖊️</div>
        <div>
          <h1>${L("Rellenar el formulario oficial", "Amtliches Formular ausfüllen")}</h1>
          <p>${L("Puente escribe los valores ya preparados directamente en el PDF oficial. El archivo se procesa en el navegador y no se sube a ningún servidor.",
                 "Puente schreibt die bereits vorbereiteten Werte direkt in das amtliche PDF. Die Datei wird im Browser verarbeitet und nicht hochgeladen.")}</p>
        </div>
      </div>

      <div class="local-banner"><strong>🔒 ${L("Procesamiento local", "Lokale Verarbeitung")}:</strong> ${L(
        "El PDF permanece en la memoria de esta pestaña. Solo se descarga la copia rellenada, en tu dispositivo.",
        "Das PDF bleibt im Speicher dieses Tabs. Heruntergeladen wird nur die ausgefüllte Kopie, auf dem eigenen Gerät.")}</div>

      <ol class="step-list">
        <li>${L("Descarga el formulario oficial desde la página de la autoridad.", "Das amtliche Formular von der Behördenseite herunterladen.")}</li>
        <li>${L("Selecciónalo aquí abajo.", "Es hier unten auswählen.")}</li>
        <li>${L("Comprueba la asignación de campos y descarga la copia rellenada.", "Die Feldzuordnung prüfen und die ausgefüllte Kopie herunterladen.")}</li>
      </ol>

      <div class="toolbar">
        <a class="secondary-btn" href="https://www.arbeitsagentur.de/datei/antrag-sgb2_ba042689.pdf" target="_blank" rel="noopener">${L("Hauptantrag SGB II", "Hauptantrag SGB II")} ↗</a>
        <a class="secondary-btn" href="https://www.berlin.de/sen/sbw/_assets/service/formular-center/bereich-wohnen/bauwohnwog1-1.pdf" target="_blank" rel="noopener">${L("Wohngeld Berlín", "Wohngeld Berlin")} ↗</a>
      </div>

      <label class="upload-zone" for="pdfFormFile">
        <div class="upload-icon">📄</div>
        <h3>${L("Elegir PDF oficial", "Amtliches PDF auswählen")}</h3>
        <p>${L("Solo PDF · el archivo no sale del dispositivo", "Nur PDF · die Datei verlässt das Gerät nicht")}</p>
        <input id="pdfFormFile" type="file" accept="application/pdf">
      </label>

      <div class="notice"><strong>${L("Valores preparados", "Vorbereitete Werte")}:</strong> ${vals.length}
        ${vals.length ? "" : ` · ${L("Todavía no hay ninguno. Rellena antes la preparación del formulario o confirma datos de documentos.",
                                     "Noch keine vorhanden. Bitte zuerst die Formularvorbereitung ausfüllen oder Angaben aus Dokumenten bestätigen.")}`}
      </div>

      <div id="pdfFieldArea"></div>
    `;
  }

  /** Laedt ein Skript, bevorzugt aus dem mitgelieferten vendor/-Ordner.
      Nur wenn das fehlt, wird das CDN versucht. Im Keller einer Unterkunft
      ist das CDN nicht erreichbar, die lokale Kopie schon. */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = resolve;
      el.onerror = () => reject(new Error(src));
      document.head.appendChild(el);
    });
  }
  async function ensureLib(globalName, localPath, cdnUrl) {
    if (window[globalName]) return;
    try { await loadScript(localPath); } catch (_) {}
    if (window[globalName]) return;
    await loadScript(cdnUrl);
    if (!window[globalName]) throw new Error(globalName);
  }
  async function ensurePdfLib() {
    await ensureLib("PDFLib", "vendor/pdf-lib.min.js",
      "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js");
  }

  async function loadPdfForm(file) {
    const area = $("#pdfFieldArea");
    if (!area) return;
    area.innerHTML = `<div class="notice">${L("Cargando…", "Wird geladen…")}</div>`;
    try {
      await ensurePdfLib();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      let fields = [];
      try { fields = doc.getForm().getFields(); } catch (_) { fields = []; }
      pdfState = { doc, fields, mapping: {}, name: file.name, bytes };

      // Nach Faehigkeiten pruefen statt nach Klassennamen: die minifizierte
      // pdf-lib benennt Klassen um, constructor.name ist dort unbrauchbar.
      const usable = fields.filter(f => fieldKind(f) !== "other");
      const candidates = preparedValues();
      usable.forEach(f => { pdfState.mapping[f.getName()] = guessMapping(f.getName(), candidates); });

      if (!fields.length) {
        area.innerHTML = `
          <div class="notice warning"><strong>${L("Sin campos de formulario", "Keine Formularfelder")}:</strong> ${L(
            "Este PDF no tiene campos rellenables. Puente puede añadir al final una hoja de apoyo con todos los valores preparados, para copiarlos a mano.",
            "Dieses PDF hat keine ausfüllbaren Felder. Puente kann am Ende eine Ausfüllhilfe mit allen vorbereiteten Werten anhängen, zum Abschreiben von Hand.")}</div>
          <div class="toolbar"><button type="button" class="primary-btn" id="pdfAppendix">📄 ${L("Añadir hoja de apoyo", "Ausfüllhilfe anhängen")}</button></div>`;
        $("#pdfAppendix").addEventListener("click", buildAppendixPdf);
        return;
      }

      const matched = Object.values(pdfState.mapping).filter(Boolean).length;
      area.innerHTML = `
        <div class="section-title"><div>
          <h2>${L("Asignación de campos", "Feldzuordnung")}</h2>
          <p>${fields.length} ${L("campos en el PDF", "Felder im PDF")} · ${usable.length} ${L("rellenables", "beschreibbar")} · ${matched} ${L("asignados automáticamente", "automatisch zugeordnet")}</p>
        </div></div>
        <div class="notice">${L("Comprueba cada asignación. La coincidencia automática se basa en los nombres internos del PDF y puede equivocarse.",
                                "Bitte jede Zuordnung prüfen. Die automatische Zuordnung stützt sich auf die internen PDF-Feldnamen und kann danebenliegen.")}</div>
        <div class="map-list">
          ${usable.map(f => {
            const n = f.getName();
            return `<div class="map-row">
              <div class="map-field" title="${esc(n)}">${esc(n)}</div>
              <select class="map-select" data-pdf-field="${esc(n)}">
                <option value="">— ${L("no rellenar", "nicht ausfüllen")} —</option>
                ${candidates.map(c => `<option value="${esc(c.key)}" ${pdfState.mapping[n] === c.key ? "selected" : ""}>${esc(c.label)} → ${esc(String(c.value).slice(0, 30))}</option>`).join("")}
              </select>
            </div>`;
          }).join("")}
        </div>
        <div class="toolbar">
          <button type="button" class="primary-btn" id="pdfFill">🖊️ ${L("Rellenar y descargar", "Ausfüllen und herunterladen")}</button>
          <button type="button" class="secondary-btn" id="pdfAppendix">📄 ${L("Añadir además hoja de apoyo", "Zusätzlich Ausfüllhilfe anhängen")}</button>
        </div>
        <label class="checkline"><input type="checkbox" id="pdfFlatten"> ${L("Bloquear campos tras rellenar (ya no editables)", "Felder nach dem Ausfüllen sperren (nicht mehr änderbar)")}</label>`;

      $$("[data-pdf-field]").forEach(sel => sel.addEventListener("change", () => {
        pdfState.mapping[sel.dataset.pdfField] = sel.value;
      }));
      $("#pdfFill").addEventListener("click", fillPdfForm);
      $("#pdfAppendix").addEventListener("click", buildAppendixPdf);
    } catch (err) {
      area.innerHTML = `<div class="notice danger">${L("No se pudo abrir el PDF: ", "PDF konnte nicht geöffnet werden: ")}${esc(err?.message || String(err))}</div>`;
    }
  }

  function fieldKind(f) {
    if (typeof f.check === "function" && typeof f.uncheck === "function") return "checkbox";
    if (typeof f.select === "function" && typeof f.getOptions === "function") return "choice";
    if (typeof f.setText === "function") return "text";
    return "other";
  }

  async function fillPdfForm() {
    try {
      const values = Object.fromEntries(preparedValues().map(v => [v.key, v.value]));
      const form = pdfState.doc.getForm();
      let filled = 0;
      for (const [fieldName, valueKey] of Object.entries(pdfState.mapping)) {
        if (!valueKey || !(valueKey in values)) continue;
        const text = sanitizePdfText(values[valueKey]);
        try {
          const f = form.getField(fieldName);
          const kind = fieldKind(f);
          if (kind === "text") { f.setText(text); filled++; }
          else if (kind === "choice") {
            const hit = (f.getOptions() || []).find(o => norm(o) === norm(text));
            if (hit) { f.select(hit); filled++; }
          } else if (kind === "checkbox") {
            const yes = /^(ja|si|sí|yes|x|1|true)$/i.test(text.trim());
            if (yes) { f.check(); filled++; }
          }
        } catch (_) { /* einzelnes Feld überspringen */ }
      }
      try { form.updateFieldAppearances(); } catch (_) {}
      if ($("#pdfFlatten")?.checked) { try { form.flatten(); } catch (_) {} }
      const out = await pdfState.doc.save();
      download(pdfState.name.replace(/\.pdf$/i, "") + "_Puente.pdf", new Blob([out], { type: "application/pdf" }));
      ctx.toast(L(`${filled} campos rellenados.`, `${filled} Felder ausgefüllt.`));
      // Nach dem Speichern neu laden, damit ein zweiter Durchgang sauber startet.
      pdfState.doc = await PDFLib.PDFDocument.load(pdfState.bytes, { ignoreEncryption: true });
    } catch (err) {
      ctx.toast(L("No se pudo rellenar: ", "Ausfüllen fehlgeschlagen: ") + (err?.message || err));
    }
  }

  async function buildAppendixPdf() {
    try {
      await ensurePdfLib();
      const src = pdfState.bytes
        ? await PDFLib.PDFDocument.load(pdfState.bytes, { ignoreEncryption: true })
        : await PDFLib.PDFDocument.create();
      const font = await src.embedFont(PDFLib.StandardFonts.Helvetica);
      const bold = await src.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const rows = preparedValues();
      const perPage = 34;
      const pages = Math.max(1, Math.ceil(rows.length / perPage));
      for (let p = 0; p < pages; p++) {
        const page = src.addPage([595, 842]); // A4
        let y = 790;
        page.drawText(sanitizePdfText(L("Puente - Hoja de apoyo", "Puente - Ausfüllhilfe")), { x: 45, y, size: 16, font: bold });
        y -= 18;
        page.drawText(sanitizePdfText(L(`Generado el ${fmtDate(today())} - documento de trabajo, no es el formulario oficial`,
          `Erstellt am ${fmtDate(today())} - Arbeitsunterlage, nicht das amtliche Formular`)), { x: 45, y, size: 8, font });
        y -= 22;
        for (const r of rows.slice(p * perPage, (p + 1) * perPage)) {
          page.drawText(sanitizePdfText(r.label).slice(0, 62), { x: 45, y, size: 9, font: bold });
          y -= 12;
          page.drawText(sanitizePdfText(r.value).slice(0, 80), { x: 55, y, size: 10, font });
          y -= 10;
          page.drawLine({ start: { x: 45, y: y + 2 }, end: { x: 550, y: y + 2 }, thickness: 0.4, opacity: 0.25 });
          y -= 8;
        }
      }
      const out = await src.save();
      download((pdfState.name || "Puente").replace(/\.pdf$/i, "") + "_Ausfuellhilfe.pdf", new Blob([out], { type: "application/pdf" }));
      ctx.toast(L("Hoja de apoyo creada.", "Ausfüllhilfe erstellt."));
    } catch (err) {
      ctx.toast(L("No se pudo crear: ", "Erstellen fehlgeschlagen: ") + (err?.message || err));
    }
  }

  /* ========================================================================
     Postausgangsbuch
     Die Beweislast für den rechtzeitigen Zugang liegt bei der antragstellenden
     Person. Genau daran scheitern Verfahren, nicht am Inhalt des Antrags.
     ======================================================================== */

  const SEND_WAYS = [
    { id: "counter", icon: "🏢", title: { es: "En persona con sello", de: "Persönlich mit Eingangsstempel" },
      hint: { es: "La forma más segura: pide sello en tu copia.", de: "Der sicherste Weg: Kopie abstempeln lassen." }, quality: "best" },
    { id: "registered", icon: "📮", title: { es: "Correo certificado", de: "Einschreiben" },
      hint: { es: "Guarda el resguardo con el número de envío.", de: "Einlieferungsbeleg mit Sendungsnummer aufbewahren." }, quality: "best" },
    { id: "mailbox", icon: "📬", title: { es: "Buzón de la oficina", de: "Hausbriefkasten der Behörde" },
      hint: { es: "Si es posible, con testigo y foto con fecha.", de: "Wenn möglich mit Zeugin oder Zeuge und Foto mit Datum." }, quality: "ok" },
    { id: "portal", icon: "💻", title: { es: "Portal en línea", de: "Online-Portal" },
      hint: { es: "Guarda la confirmación de envío como PDF.", de: "Sendebestätigung als PDF sichern." }, quality: "ok" },
    { id: "post", icon: "✉️", title: { es: "Correo ordinario", de: "Einfacher Brief" },
      hint: { es: "Sin prueba de entrega. Evítalo si corre un plazo.", de: "Ohne Zugangsnachweis. Bei laufender Frist besser vermeiden." }, quality: "weak" },
    { id: "email", icon: "📧", title: { es: "Correo electrónico", de: "E-Mail" },
      hint: { es: "No siempre se acepta. Pide confirmación de recepción.", de: "Wird nicht überall akzeptiert. Eingangsbestätigung erbitten." }, quality: "weak" }
  ];
  const wayById = id => SEND_WAYS.find(w => w.id === id) || SEND_WAYS[0];

  function addOutbox(entry) {
    const o = {
      id: `p${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      what: entry.what || "", to: entry.to || "", way: entry.way || "counter",
      date: entry.date || toISO(today()), tracking: entry.tracking || "",
      ref: entry.ref || "", note: entry.note || "",
      confirmed: false, createdAt: new Date().toISOString()
    };
    outbox.push(o); saveOutbox(); return o;
  }

  function outboxCard(o) {
    const w = wayById(o.way);
    return `<article class="outbox-item ${w.quality}">
      <div class="deadline-head">
        <div class="deadline-icon">${w.icon}</div>
        <div class="deadline-main">
          <h3>${esc(o.what || L("Envío", "Sendung"))}</h3>
          <div class="deadline-date"><strong>${esc(fmtDate(fromISO(o.date)))}</strong> · ${esc(tx(w.title))}</div>
          ${o.to ? `<div class="small">${L("A", "An")}: ${esc(o.to)}</div>` : ""}
          ${o.ref ? `<div class="small">${L("Expediente", "Aktenzeichen")}: ${esc(o.ref)}</div>` : ""}
          ${o.tracking ? `<div class="small">${L("Nº de envío", "Sendungsnummer")}: ${esc(o.tracking)}</div>` : ""}
          <div class="small">${o.confirmed
            ? `<span class="badge ok">${L("recepción confirmada", "Eingang bestätigt")}</span>`
            : `<span class="badge warn">${L("sin confirmación", "ohne Bestätigung")}</span>`}</div>
        </div>
      </div>
      <div class="deadline-actions">
        <button type="button" class="mini-btn" data-outbox-confirm="${o.id}">${o.confirmed ? L("↺ Marcar sin confirmar", "↺ Als offen markieren") : L("✓ Recepción confirmada", "✓ Eingang bestätigt")}</button>
        <button type="button" class="mini-btn danger" data-outbox-del="${o.id}">✕ ${L("Quitar", "Entfernen")}</button>
      </div>
    </article>`;
  }

  function outboxView() {
    const list = [...outbox].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const weak = list.filter(o => wayById(o.way).quality === "weak" && !o.confirmed).length;
    return `
      <div class="service-head">
        <div class="big-icon">📮</div>
        <div>
          <h1>${L("Libro de envíos", "Postausgangsbuch")}</h1>
          <p>${L("Quien afirma haber entregado algo a tiempo tiene que poder demostrarlo. Aquí se anota qué salió, cuándo y por qué vía.",
                 "Wer behauptet, etwas fristgerecht abgegeben zu haben, muss das belegen können. Hier wird festgehalten, was wann und auf welchem Weg herausging.")}</p>
        </div>
      </div>

      <div class="toolbar">
        <button type="button" class="primary-btn" id="addOutboxBtn">➕ ${L("Anotar envío", "Sendung eintragen")}</button>
      </div>

      ${weak ? `<div class="notice warning">${L(
        `${weak} envío(s) por una vía sin prueba de entrega y sin confirmación. Si corre un plazo, conviene reclamar la confirmación por escrito.`,
        `${weak} Sendung(en) auf einem Weg ohne Zugangsnachweis und ohne Bestätigung. Bei laufender Frist sollte die Bestätigung schriftlich angefordert werden.`)}</div>` : ""}

      ${list.length ? `<div class="deadline-list">${list.map(outboxCard).join("")}</div>`
        : `<div class="empty"><div class="empty-illustration">📮</div>
             ${L("Aún no hay envíos anotados.", "Noch keine Sendungen eingetragen.")}</div>`}

      <div class="section-title"><div><h2>${L("Qué vía deja prueba", "Welcher Weg beweiskräftig ist")}</h2></div></div>
      <div class="deadline-list">
        ${SEND_WAYS.map(w => `<article class="req"><div class="req-top">
          <div class="req-icon">${w.icon}</div>
          <div class="req-main"><h3>${esc(tx(w.title))}</h3><p>${esc(tx(w.hint))}</p>
          <div class="meta"><span class="badge ${w.quality === "best" ? "ok" : w.quality === "weak" ? "bad" : "warn"}">${
            w.quality === "best" ? L("con prueba", "beweiskräftig") : w.quality === "weak" ? L("sin prueba", "ohne Nachweis") : L("parcial", "eingeschränkt")}</span></div>
          </div></div></article>`).join("")}
      </div>
    `;
  }

  function openOutboxModal() {
    $("#modalTitle").textContent = L("➕ Anotar envío", "➕ Sendung eintragen");
    $("#modalBody").innerHTML = `
      <label class="field-label" for="obWhat">${L("¿Qué se ha entregado?", "Was wurde abgegeben?")}</label>
      <input id="obWhat" class="full-input" placeholder="${L("p. ej. Solicitud principal con anexos", "z. B. Hauptantrag mit Anlagen")}">

      <label class="field-label" for="obTo">${L("¿A qué oficina?", "An welche Stelle?")}</label>
      <input id="obTo" class="full-input" placeholder="${L("p. ej. Jobcenter Berlin Mitte", "z. B. Jobcenter Berlin Mitte")}">

      <label class="field-label" for="obWay">${L("Vía", "Weg")}</label>
      <select id="obWay" class="full-input">
        ${SEND_WAYS.map(w => `<option value="${w.id}">${w.icon} ${esc(tx(w.title))}</option>`).join("")}
      </select>
      <div class="notice" id="obHint"></div>

      <label class="field-label" for="obDate">${L("Fecha", "Datum")}</label>
      <input id="obDate" class="full-input" type="date" value="${toISO(today())}">

      <label class="field-label" for="obTracking">${L("Nº de envío o referencia (opcional)", "Sendungsnummer oder Beleg (optional)")}</label>
      <input id="obTracking" class="full-input">

      <div class="toolbar"><button type="button" class="primary-btn" id="obSave">${L("Guardar", "Speichern")}</button></div>`;
    const hint = () => { $("#obHint").textContent = tx(wayById($("#obWay").value).hint); };
    $("#obWay").addEventListener("change", hint); hint();
    $("#obSave").addEventListener("click", () => {
      addOutbox({
        what: $("#obWhat").value.trim(), to: $("#obTo").value.trim(), way: $("#obWay").value,
        date: $("#obDate").value, tracking: $("#obTracking").value.trim()
      });
      $("#modal").close(); ctx.toast(L("Envío anotado.", "Sendung eingetragen."));
      ctx.setRoute("outbox");
    });
    $("#modal").showModal();
  }

  /* ========================================================================
     Beratungsstellen
     ======================================================================== */

  let adviceTopic = "alle";

  function adviceView() {
    const list = (D().advisory || []).filter(a => adviceTopic === "alle" || (a.topics || []).includes(adviceTopic));
    return `
      <div class="service-head">
        <div class="big-icon">🤝</div>
        <div>
          <h1>${L("Dónde hay apoyo personal", "Wo es persönliche Unterstützung gibt")}</h1>
          <p>${L("Puente prepara el expediente. Para las decisiones difíciles ayuda una persona con experiencia.",
                 "Puente bereitet den Fall vor. Für die schwierigen Entscheidungen hilft ein Mensch mit Erfahrung.")}</p>
        </div>
      </div>

      <div class="form-tabs" role="tablist">
        ${(D().advisoryTopics || [])
          .filter(t => t.id === "alle" || (D().advisory || []).some(a => (a.topics || []).includes(t.id)))
          .map(t => `<button type="button" role="tab" aria-selected="${t.id === adviceTopic}" class="form-tab ${t.id === adviceTopic ? "active" : ""}" data-advice-topic="${t.id}">${esc(tx(t.label))}</button>`).join("")}
      </div>

      <div class="requirements">
        ${list.length ? list.map(a => `
          <article class="req advice-card">
            <div class="req-top">
              <div class="req-icon">${a.icon}</div>
              <div class="req-main">
                <h3>${esc(tx(a.title))}</h3>
                <p>${esc(tx(a.desc))}</p>
                <div class="meta">
                  <span class="badge">${esc(tx(a.who))}</span>
                  <span class="badge ${a.free ? "ok" : "warn"}">${a.free ? L("gratuito", "kostenlos") : L("con cuota", "Beitrag nötig")}</span>
                </div>
              </div>
            </div>
            <div class="req-actions">
              ${a.links.map(l => `<a class="secondary-btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(tx(l.label))} ↗</a>`).join("")}
            </div>
          </article>`).join("")
          : `<div class="empty">${L("Ninguna categoría coincide.", "Keine passende Kategorie.")}</div>`}
      </div>

      <div class="section-title"><div><h2>${L("Antes de ir", "Vor dem Termin")}</h2></div></div>
      <ul class="prep-list">
        ${(D().advisoryPrep || []).map(p => `<li>${esc(tx(p))}</li>`).join("")}
      </ul>

      <div class="toolbar">
        <button type="button" class="primary-btn" data-go="dossier">📑 ${L("Abrir expediente para llevar", "Fallakte zum Mitnehmen öffnen")}</button>
      </div>

      <div class="notice">${L(
        "Los enlaces llevan a los buscadores oficiales de cada organización. Puente no guarda ninguna dirección local propia, para que no queden datos obsoletos en la aplicación.",
        "Die Links führen zu den offiziellen Suchdiensten der Träger. Puente speichert bewusst keine eigenen Ortsadressen, damit in der App keine veralteten Angaben stehen.")}</div>
    `;
  }

  /* ========================================================================
     Ereignisbindung nach jedem Render
     ======================================================================== */

  function bind() {
    $("#addDeadlineBtn")?.addEventListener("click", () => openDeadlineModal());
    $("#exportIcsBtn")?.addEventListener("click", () => exportIcs());
    $$('[data-deadline-done]').forEach(el => el.addEventListener("click", () => { toggleDeadline(el.dataset.deadlineDone); ctx.render(); }));
    $$('[data-deadline-del]').forEach(el => el.addEventListener("click", () => {
      if (confirm(L("¿Quitar este plazo?", "Diese Frist entfernen?"))) { removeDeadline(el.dataset.deadlineDel); ctx.render(); }
    }));
    $$('[data-deadline-ics]').forEach(el => el.addEventListener("click", () => exportIcs([el.dataset.deadlineIcs])));
    $$('[data-objection]').forEach(el => el.addEventListener("click", () => {
      const d = deadlines.find(x => x.id === el.dataset.objection);
      openObjectionModal({ ref: d?.ref || "", noticeDate: null });
    }));

    $$('[data-notice-deadline]').forEach(el => el.addEventListener("click", () => {
      const doc = ctx.findDoc(el.dataset.noticeDeadline);
      const a = analyseNotice(doc);
      if (!a?.calc) return;
      addDeadline({
        type: "widerspruch", due: toISO(a.calc.due), ref: a.ref, source: doc.name,
        title: L("Recurso contra la resolución de ", "Widerspruch gegen Bescheid vom ") + fmtDate(a.noticeDate)
      });
      ctx.toast(L("Plazo guardado.", "Frist gespeichert."));
      ctx.setRoute("deadlines");
    }));
    $$('[data-notice-letter]').forEach(el => el.addEventListener("click", () => {
      const a = analyseNotice(ctx.findDoc(el.dataset.noticeLetter));
      if (a) openObjectionModal(a);
    }));
    $$('[data-notice-manual]').forEach(el => el.addEventListener("click", () => openDeadlineModal({ type: "widerspruch" })));

    $("#pdfFormFile")?.addEventListener("change", e => {
      const f = e.target.files?.[0];
      if (f) loadPdfForm(f);
      try { e.target.value = ""; } catch (_) {}
    });

    $("#addOutboxBtn")?.addEventListener("click", openOutboxModal);
    $$('[data-outbox-confirm]').forEach(el => el.addEventListener("click", () => {
      const o = outbox.find(x => x.id === el.dataset.outboxConfirm);
      if (o) { o.confirmed = !o.confirmed; saveOutbox(); ctx.render(); }
    }));
    $$('[data-outbox-del]').forEach(el => el.addEventListener("click", () => {
      if (confirm(L("¿Quitar esta anotación?", "Diesen Eintrag entfernen?"))) { removeOutbox(el.dataset.outboxDel); ctx.render(); }
    }));

    $$('[data-advice-topic]').forEach(el => el.addEventListener("click", () => {
      adviceTopic = el.dataset.adviceTopic; ctx.render();
    }));
  }

  function resetAll() { deadlines = []; outbox = []; saveDeadlines(); saveOutbox(); }

  rebind();

  /* ========================================================================
     Bedarfsgemeinschaft
     Bisher kannte die App nur eine Person. Fuer jedes weitere Mitglied
     verlangt das Jobcenter eine eigene Anlage WEP; unter 15 Jahren die
     Anlage KI. Diese Zuordnung nimmt der Liste die Rechenarbeit ab.
     ======================================================================== */

  function members() {
    if (!Array.isArray(S.personal.members)) S.personal.members = [];
    return S.personal.members;
  }
  function saveMembers() { S.save("personal"); }

  function memberAge(m) {
    const d = parseLooseDate(m.birthDate);
    if (!d) return null;
    const t = today();
    let a = t.getFullYear() - d.getFullYear();
    const before = t.getMonth() < d.getMonth() ||
      (t.getMonth() === d.getMonth() && t.getDate() < d.getDate());
    if (before) a--;
    return a;
  }
  function memberAnnex(m) {
    if (m.role === "self") return { id: "HA", label: L("Solicitud principal", "Hauptantrag") };
    const a = memberAge(m);
    if (a !== null && a < 15) return { id: "KI", label: L("Anexo KI (menores de 15)", "Anlage KI (unter 15 Jahren)") };
    return { id: "WEP", label: L("Anexo WEP (otra persona)", "Anlage WEP (weitere Person)") };
  }

  function addMember(m) {
    const list = members();
    const entry = {
      id: `m${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: m.name || "", role: m.role || "other", birthDate: m.birthDate || "",
      income: !!m.income, note: m.note || ""
    };
    list.push(entry); saveMembers(); return entry;
  }
  function removeMember(id) {
    S.personal.members = members().filter(x => x.id !== id); saveMembers();
  }

  const memberRoles = [
    { id: "self", label: { es: "Persona solicitante", de: "Antragstellende Person" } },
    { id: "partner", label: { es: "Pareja / cónyuge", de: "Partner/in oder Ehegatte" } },
    { id: "child", label: { es: "Hija / hijo", de: "Kind" } },
    { id: "other", label: { es: "Otra persona del hogar", de: "Weitere Person im Haushalt" } }
  ];

  function householdView() {
    const list = members();
    const counts = list.reduce((acc, m) => {
      const a = memberAnnex(m); acc[a.id] = (acc[a.id] || 0) + 1; return acc;
    }, {});
    return `
      <div class="service-head">
        <div class="big-icon">👪</div>
        <div>
          <h1>${L("Comunidad de necesidad", "Bedarfsgemeinschaft")}</h1>
          <p>${L("El Jobcenter cuenta a todas las personas del hogar. Cada persona adicional necesita su propio anexo.",
                 "Das Jobcenter rechnet alle Personen des Haushalts zusammen. Für jede weitere Person wird eine eigene Anlage gebraucht.")}</p>
        </div>
      </div>

      <div class="toolbar">
        <button type="button" class="primary-btn" id="addMemberBtn">➕ ${L("Añadir persona", "Person hinzufügen")}</button>
      </div>

      ${list.length ? `<div class="deadline-list">${list.map(m => {
        const a = memberAnnex(m), age = memberAge(m);
        const role = memberRoles.find(r => r.id === m.role);
        return `<article class="deadline later">
          <div class="deadline-head">
            <div class="deadline-icon">${m.role === "child" ? "🧒" : m.role === "partner" ? "🧑‍🤝‍🧑" : m.role === "self" ? "🙋" : "👤"}</div>
            <div class="deadline-main">
              <h3>${esc(m.name || L("Sin nombre", "Ohne Namen"))}</h3>
              <div class="small">${esc(role ? tx(role.label) : "")}${age !== null ? ` · ${age} ${L("años", "Jahre")}` : ""}</div>
              <div class="deadline-date"><strong>${esc(a.label)}</strong></div>
              ${m.income ? `<div class="small">${L("Tiene ingresos propios → anexo EK", "Hat eigenes Einkommen → Anlage EK")}</div>` : ""}
              ${m.note ? `<div class="small">${esc(m.note)}</div>` : ""}
            </div>
          </div>
          <div class="deadline-actions">
            <button type="button" class="mini-btn danger" data-member-del="${m.id}">✕ ${L("Quitar", "Entfernen")}</button>
          </div>
        </article>`;
      }).join("")}</div>`
      : `<div class="empty"><div class="empty-illustration">👪</div>
          ${L("Todavía no hay personas registradas. Si vives con más gente, añádelas: cambia los anexos necesarios.",
              "Noch keine Personen erfasst. Wenn weitere Menschen im Haushalt leben, bitte eintragen – das ändert die nötigen Anlagen.")}</div>`}

      ${list.length ? `<div class="notice"><strong>${L("Anexos necesarios", "Benötigte Anlagen")}:</strong>
        ${Object.entries(counts).map(([k, v]) => `${v}× ${k}`).join(" · ")}
        ${list.some(m => m.income) ? ` · ${list.filter(m => m.income).length}× EK` : ""}</div>` : ""}

      <div class="notice warning">${L(
        "Los datos de otras personas son especialmente sensibles. Se guardan según el modo de conservación elegido en Ajustes.",
        "Angaben zu anderen Personen sind besonders sensibel. Sie werden nach dem in den Einstellungen gewählten Modus gespeichert.")}</div>`;
  }

  function openMemberModal() {
    $("#modalTitle").textContent = L("➕ Añadir persona", "➕ Person hinzufügen");
    $("#modalBody").innerHTML = `
      <label class="field-label" for="mRole">${L("Relación", "Rolle im Haushalt")}</label>
      <select id="mRole" class="full-input">
        ${memberRoles.map(r => `<option value="${r.id}">${esc(tx(r.label))}</option>`).join("")}
      </select>
      <label class="field-label" for="mName">${L("Nombre (opcional)", "Name (optional)")}</label>
      <input id="mName" class="full-input" autocomplete="off">
      <label class="field-label" for="mBirth">${L("Fecha de nacimiento", "Geburtsdatum")}</label>
      <input id="mBirth" class="full-input" type="date">
      <label class="checkline"><input type="checkbox" id="mIncome"> ${L("Tiene ingresos propios", "Hat eigenes Einkommen")}</label>
      <div class="toolbar"><button type="button" class="primary-btn" id="mSave">${L("Guardar", "Speichern")}</button></div>`;
    $("#modal").showModal();
    $("#mSave").addEventListener("click", () => {
      addMember({
        role: $("#mRole").value, name: $("#mName").value.trim(),
        birthDate: $("#mBirth").value, income: $("#mIncome").checked
      });
      $("#modal").close();
      ctx.toast(L("Persona añadida.", "Person hinzugefügt."));
      ctx.render();
    });
  }

  /* ========================================================================
     Fallübergabe per QR-Code
     Zwischen Berater- und Klientengerät, ohne Server. Der Code enthaelt nur
     den Fall, nicht die Originaldokumente.
     ======================================================================== */

  function handoverPayload() {
    return {
      v: 1, at: new Date().toISOString(),
      profile: S.app.profile || {}, statuses: S.app.statuses || {},
      formValues: S.personal.formValues || {},
      approvedFacts: S.personal.docSession?.approvedFacts || {},
      deadlines: S.personal.deadlines || [],
      members: S.personal.members || [],
      outbox: (S.personal.outbox || []).map(o => ({ ...o, photo: undefined }))
    };
  }

  function installQrToCanvasCompat() {
    const QR=window.QRCode;
    if(!QR || QR.toCanvas) return;
    QR.toCanvas=function(canvas,text,opts={},cb){
      const work=new Promise((resolve,reject)=>{
        let holder;
        try{
          const size=Math.max(64,Number(opts.width)||256);
          holder=document.createElement("div");
          holder.style.cssText="position:absolute;left:-10000px;top:-10000px;width:1px;height:1px;overflow:hidden";
          document.body.appendChild(holder);
          new QR(holder,{text:String(text),width:size,height:size,correctLevel:QR.CorrectLevel?.M});
          const source=holder.querySelector("canvas");
          if(!source) throw new Error("QR canvas unavailable");
          canvas.width=size; canvas.height=size;
          const ctx=canvas.getContext("2d");
          if(!ctx) throw new Error("Canvas 2D unavailable");
          ctx.clearRect(0,0,size,size); ctx.drawImage(source,0,0,size,size);
          holder.remove(); holder=null;
          resolve(canvas);
        }catch(err){ try{holder?.remove();}catch(_){} reject(err); }
      });
      if(typeof cb==="function") work.then(()=>cb(null),cb);
      return work;
    };
  }

  async function ensureQrLib() {
    await ensureLib("QRCode", "vendor/qrcode.min.js",
      "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js");
    installQrToCanvasCompat();
  }

  async function openHandoverModal() {
    const json = JSON.stringify(handoverPayload());
    const b64 = btoa(unescape(encodeURIComponent(json)));
    $("#modalTitle").textContent = L("🔄 Traspaso del caso", "🔄 Fallübergabe");
    $("#modalBody").innerHTML = `
      <div class="notice warning">${L(
        "El código contiene datos personales del caso. Muéstralo solo al dispositivo de la persona correspondiente y no lo fotografíes para archivarlo.",
        "Der Code enthält personenbezogene Falldaten. Nur dem Gerät der betreffenden Person zeigen und nicht zur Ablage abfotografieren.")}</div>
      <div id="qrArea" class="qr-area">${L("Generando…", "Wird erzeugt…")}</div>
      <p class="small">${L("Tamaño", "Größe")}: ${(b64.length / 1024).toFixed(1)} kB</p>
      <div class="toolbar">
        <button type="button" class="secondary-btn" id="handoverFile">💾 ${L("Guardar como archivo", "Als Datei sichern")}</button>
        <button type="button" class="secondary-btn" id="handoverImport">📥 ${L("Importar caso", "Fall importieren")}</button>
      </div>
      <input id="handoverInput" type="file" accept="application/json" hidden>`;
    $("#modal").showModal();

    // QR-Codes fassen nur begrenzt Daten; grosse Faelle gehen als Datei.
    const area = $("#qrArea");
    if (b64.length > 2500) {
      area.innerHTML = `<div class="notice">${L(
        "El caso es demasiado grande para un código QR. Usa el archivo.",
        "Der Fall ist für einen QR-Code zu groß. Bitte die Datei verwenden.")}</div>`;
    } else {
      try {
        await ensureQrLib();
        const canvas = document.createElement("canvas");
        await window.QRCode.toCanvas(canvas, "puente:" + b64, { width: 260, margin: 1 });
        area.innerHTML = ""; area.appendChild(canvas);
      } catch (_) {
        area.innerHTML = `<div class="notice">${L(
          "No se pudo generar el código (sin conexión y sin copia local). Usa el archivo.",
          "Code konnte nicht erzeugt werden (offline und keine lokale Kopie). Bitte die Datei verwenden.")}</div>`;
      }
    }

    $("#handoverFile").addEventListener("click", () =>
      download(`Puente_Fallübergabe_${toISO(today())}.json`, json, "application/json"));
    $("#handoverImport").addEventListener("click", () => $("#handoverInput").click());
    $("#handoverInput").addEventListener("change", async e => {
      const f = e.target.files?.[0]; if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!data || data.v !== 1) throw new Error("Format");
        if (!confirm(L("¿Sustituir el caso actual por el importado?", "Aktuellen Fall durch den importierten ersetzen?"))) return;
        Object.assign(S.app, { profile: data.profile || {}, statuses: data.statuses || {} });
        S.replacePersonal({
          formValues: data.formValues || {},
          docSession: { docs: [], approvedFacts: data.approvedFacts || {}, ignoredFacts: {} },
          deadlines: data.deadlines || [], members: data.members || [], outbox: data.outbox || []
        });
        S.save("app"); S.save("personal");
        $("#modal").close();
        ctx.toast(L("Caso importado.", "Fall importiert."));
        location.reload();
      } catch (err) {
        ctx.toast(L("Archivo no válido.", "Datei nicht lesbar."));
      }
    });
  }

  return {
    deadlinesView, adviceView, fillView, outboxView, householdView, noticePanel, extractNoticeFacts,
    openHandoverModal, memberCount: () => members().length,
    bind, rebind, openCount, outboxCount: () => outbox.length,
    hasPreparedValues: () => preparedValues().length > 0,
    bindHousehold: () => {
      $("#addMemberBtn")?.addEventListener("click", openMemberModal);
      $$('[data-member-del]').forEach(el => el.addEventListener("click", () => {
        removeMember(el.dataset.memberDel); ctx.render();
      }));
      $("#handoverBtn")?.addEventListener("click", openHandoverModal);
    },
    resetAll, addDeadline, computeDeadline, toISO
  };
};
