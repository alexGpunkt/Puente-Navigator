/* Puente v0.6 – Sprache

   Drei Bausteine, bewusst in dieser Reihenfolge nach Nutzen und Risiko:

   1. Vorlesen (SpeechSynthesis). Läuft vollständig im Gerät, kostet nichts
      und hilft den meisten Menschen, weil viele in beiden Sprachen nur
      eingeschränkt lesen.

   2. Geführtes Diktat für ein einzelnes Feld. Die App fragt gezielt nach
      einem Wert, hört kurz zu und legt das Ergebnis zur Bestätigung vor.
      Enger Kontext, prüfbares Ergebnis.

   3. Gesprächsnotiz nach einem Behördentermin. Freitext, der in der Fallakte
      landet; daraus werden Fristen und Zusagen nur vorgeschlagen.

   Bewusst NICHT enthalten: freie Extraktion aus einem Gespräch direkt in
   Formularfelder. Ein falsch verstandener Betrag im Antrag ist teurer als
   ein getippter.

   Datenschutz: Die Spracherkennung der Browser (SpeechRecognition) überträgt
   das Audio in der Regel an Server des Browser-Herstellers. Das widerspricht
   dem Modell der App, deshalb ist die Erkennung standardmäßig aus und wird
   erst nach ausdrücklicher Zustimmung eingeschaltet. Das Vorlesen ist davon
   nicht betroffen.                                                          */

window.PuenteVoice = function (ctx) {
  "use strict";

  const L = (es, de) => (ctx.lang() === "es" ? es : de);
  const bcp = () => (ctx.lang() === "es" ? "es-ES" : "de-DE");

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const synth = window.speechSynthesis || null;

  function canSpeak() { return !!synth; }
  function canListen() { return !!SR; }
  function listenConsent() { return ctx.settings().voiceConsent === true; }
  function setListenConsent(v) { ctx.settings().voiceConsent = !!v; ctx.saveSettings(); }

  /* ------------------------------------------------------------- Vorlesen */

  let speaking = false;

  function stopSpeaking() {
    try { synth && synth.cancel(); } catch (_) {}
    speaking = false;
  }

  function speak(text, opts) {
    if (!synth) return false;
    stopSpeaking();
    const clean = String(text || "")
      .replace(/\s+/g, " ")
      .replace(/[·•→↗✓✕⏳📅⚖️🔒🤝🖊️📎📂🔥🏠🧭⋯]/g, " ")
      .trim();
    if (!clean) return false;
    // Lange Texte in Sätze zerlegen: einige mobile Stimmen brechen sonst ab.
    const chunks = clean.match(/[^.!?]{1,180}([.!?]|$)/g) || [clean];
    chunks.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part.trim());
      u.lang = (opts && opts.lang) || bcp();
      u.rate = (opts && opts.rate) || 0.95;
      if (i === chunks.length - 1) u.onend = () => { speaking = false; ctx.onSpeakChange && ctx.onSpeakChange(false); };
      synth.speak(u);
    });
    speaking = true;
    ctx.onSpeakChange && ctx.onSpeakChange(true);
    return true;
  }

  function isSpeaking() { return speaking; }

  /** Liest die aktuelle Ansicht vor, ohne Bedienelemente mitzusprechen. */
  function readCurrentView() {
    const root = document.querySelector("#app");
    if (!root) return false;
    const parts = [];
    root.querySelectorAll("h1,h2,h3,p,li,.deadline-date,.calc-result,td,th").forEach(el => {
      if (el.closest("button,select,.map-list,.form-tabs")) return;
      const t = (el.textContent || "").trim();
      if (t && t.length > 1 && !parts.includes(t)) parts.push(t);
    });
    return speak(parts.slice(0, 40).join(". "));
  }

  /* --------------------------------------------------------- Erkennung */

  function recognizeOnce(opts) {
    return new Promise((resolve, reject) => {
      if (!SR) return reject(new Error("no-speech-recognition"));
      const rec = new SR();
      rec.lang = (opts && opts.lang) || bcp();
      rec.interimResults = true;
      rec.maxAlternatives = 3;
      rec.continuous = !!(opts && opts.continuous);

      let finalText = "";
      const timeoutMs = (opts && opts.timeoutMs) || 12000;
      const timer = setTimeout(() => { try { rec.stop(); } catch (_) {} }, timeoutMs);

      rec.onresult = e => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript + " ";
          else interim += r[0].transcript;
        }
        opts && opts.onPartial && opts.onPartial((finalText + interim).trim());
      };
      rec.onerror = ev => { clearTimeout(timer); reject(new Error(ev.error || "speech-error")); };
      rec.onend = () => { clearTimeout(timer); resolve(finalText.trim()); };

      opts && opts.onStart && opts.onStart(rec);
      try { rec.start(); } catch (err) { clearTimeout(timer); reject(err); }
    });
  }

  /* ------------------------------------------------- Auswertung nach Feldart */

  const WORD_NUM_DE = { null: 0, eins: 1, ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12 };
  const MONTH = {
    januar: 1, enero: 1, februar: 2, febrero: 2, "märz": 3, marzo: 3, april: 4, abril: 4,
    mai: 5, mayo: 5, juni: 6, junio: 6, juli: 7, julio: 7, august: 8, agosto: 8,
    september: 9, septiembre: 9, oktober: 10, octubre: 10, november: 11, noviembre: 11, dezember: 12, diciembre: 12
  };

  function parseAmount(raw) {
    let t = String(raw || "").toLowerCase()
      .replace(/\beuros?\b|€/g, " ")
      .replace(/\bkomma\b|\bcoma\b/g, ",")
      .replace(/\s+/g, " ").trim();
    let m = t.match(/(\d{1,3}(?:[. ]\d{3})*|\d+)\s*(?:[,.]\s*(\d{1,2}))?/);
    if (!m) {
      const w = WORD_NUM_DE[t.split(" ")[0]];
      return w === undefined ? null : `${w},00 €`;
    }
    const whole = m[1].replace(/[ .]/g, "");
    const cents = (m[2] || "00").padEnd(2, "0");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${grouped},${cents} €`;
  }

  function parseDate(raw) {
    const t = String(raw || "").toLowerCase().replace(/\s+/g, " ").trim();
    let m = t.match(/(\d{1,2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{2,4})/);
    if (m) {
      let y = Number(m[3]); if (y < 100) y += y < 70 ? 2000 : 1900;
      return `${String(m[1]).padStart(2, "0")}.${String(m[2]).padStart(2, "0")}.${y}`;
    }
    m = t.match(/(\d{1,2})\.?\s*(?:de\s+)?([a-zäöü]+)\s*(?:de\s+)?(\d{4})/);
    if (m && MONTH[m[2]]) {
      return `${String(m[1]).padStart(2, "0")}.${String(MONTH[m[2]]).padStart(2, "0")}.${m[3]}`;
    }
    return null;
  }

  function parseIban(raw) {
    const t = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const m = t.match(/[A-Z]{2}\d{2}[A-Z0-9]{10,30}/);
    return m ? m[0] : null;
  }

  function parseDigits(raw, min, max) {
    const t = String(raw || "").replace(/\D/g, "");
    if (!t) return null;
    if (min && t.length < min) return null;
    return max ? t.slice(0, max) : t;
  }

  function parseByKind(kind, raw) {
    switch (kind) {
      case "amount": return parseAmount(raw);
      case "date": return parseDate(raw);
      case "iban": return parseIban(raw);
      case "taxId": return parseDigits(raw, 10, 11);
      case "area": {
        const m = String(raw).match(/(\d+(?:[,.]\d+)?)/);
        return m ? `${m[1].replace(".", ",")} m²` : null;
      }
      default: return String(raw || "").trim() || null;
    }
  }

  const KIND_HINT = {
    amount: { es: "Di el importe, por ejemplo: seiscientos cuarenta coma cero cero", de: "Betrag sagen, zum Beispiel: sechshundertvierzig Komma null null" },
    date: { es: "Di la fecha, por ejemplo: uno tres dos mil veinticuatro", de: "Datum sagen, zum Beispiel: erster März zweitausendvierundzwanzig" },
    iban: { es: "Di el IBAN letra por letra y cifra por cifra", de: "IBAN Buchstabe für Buchstabe und Ziffer für Ziffer sagen" },
    taxId: { es: "Di los once dígitos", de: "Die elf Ziffern sagen" },
    area: { es: "Di los metros cuadrados", de: "Quadratmeter sagen" },
    text: { es: "Habla con calma tras el tono", de: "Nach dem Signal ruhig sprechen" }
  };

  /* -------------------------------------------------- Zustimmung einholen */

  function askConsent() {
    return new Promise(resolve => {
      const modal = document.querySelector("#modal");
      document.querySelector("#modalTitle").textContent = L("🎤 Activar reconocimiento de voz", "🎤 Spracherkennung einschalten");
      document.querySelector("#modalBody").innerHTML = `
        <div class="notice warning"><strong>${L("Antes de activarlo", "Vor dem Einschalten")}:</strong> ${L(
          "El reconocimiento de voz del navegador suele enviar el audio a servidores del fabricante del navegador. Eso es distinto del resto de Puente, donde nada sale del dispositivo.",
          "Die Spracherkennung des Browsers überträgt das Audio in der Regel an Server des Browser-Herstellers. Das ist anders als im übrigen Puente, wo nichts das Gerät verlässt.")}</div>
        <ul class="prep-list">
          <li>${L("No dictes datos de otras personas sin su consentimiento.", "Keine Daten anderer Personen ohne deren Einverständnis diktieren.")}</li>
          <li>${L("Leer en voz alta funciona sin activar esto y sin conexión.", "Das Vorlesen funktioniert ohne diese Zustimmung und ohne Verbindung.")}</li>
          <li>${L("Puedes desactivarlo en cualquier momento en los ajustes.", "Die Zustimmung lässt sich in den Einstellungen jederzeit zurücknehmen.")}</li>
        </ul>
        <div class="toolbar">
          <button type="button" class="primary-btn" id="voiceYes">${L("Activar", "Einschalten")}</button>
          <button type="button" class="ghost-btn" id="voiceNo">${L("Ahora no", "Jetzt nicht")}</button>
        </div>`;
      modal.showModal();
      document.querySelector("#voiceYes").addEventListener("click", () => { setListenConsent(true); modal.close(); resolve(true); });
      document.querySelector("#voiceNo").addEventListener("click", () => { modal.close(); resolve(false); });
    });
  }

  /* ------------------------------------------ Geführtes Diktat für ein Feld */

  /**
   * Fragt genau einen Wert ab und legt das Ergebnis zur Bestätigung vor.
   * @returns {Promise<string|null>} bestätigter Wert oder null
   */
  async function dictateField({ question, kind = "text" }) {
    if (!canListen()) { ctx.toast(L("Este navegador no reconoce voz.", "Dieser Browser erkennt keine Sprache.")); return null; }
    if (!listenConsent() && !(await askConsent())) return null;

    const modal = document.querySelector("#modal");
    document.querySelector("#modalTitle").textContent = "🎤 " + L("Dictado", "Diktat");
    document.querySelector("#modalBody").innerHTML = `
      <div class="dictate">
        <p class="dictate-q">${ctx.esc(question)}</p>
        <p class="small">${ctx.esc(KIND_HINT[kind] ? (ctx.lang() === "es" ? KIND_HINT[kind].es : KIND_HINT[kind].de) : "")}</p>
        <div class="dictate-live" id="dictateLive" aria-live="polite">…</div>
        <label class="field-label" for="dictateValue">${L("Valor reconocido, corregible", "Erkannter Wert, korrigierbar")}</label>
        <input id="dictateValue" class="full-input" value="">
        <div class="toolbar">
          <button type="button" class="primary-btn" id="dictateOk" disabled>${L("Aceptar valor", "Wert übernehmen")}</button>
          <button type="button" class="secondary-btn" id="dictateAgain">${L("Repetir", "Nochmal")}</button>
          <button type="button" class="ghost-btn" id="dictateCancel">${L("Cancelar", "Abbrechen")}</button>
        </div>
      </div>`;
    modal.showModal();

    const live = document.querySelector("#dictateLive");
    const input = document.querySelector("#dictateValue");
    const ok = document.querySelector("#dictateOk");

    const run = async () => {
      live.textContent = L("Escuchando…", "Höre zu…");
      ok.disabled = true;
      try {
        const raw = await recognizeOnce({ kind, onPartial: t => { live.textContent = t || "…"; } });
        const parsed = parseByKind(kind, raw);
        live.textContent = raw || L("Nada reconocido", "Nichts erkannt");
        input.value = parsed || raw || "";
        ok.disabled = !input.value.trim();
        if (raw && !parsed && kind !== "text") {
          live.textContent += " · " + L("formato no reconocido, corrígelo a mano", "Format nicht erkannt, bitte von Hand korrigieren");
        }
      } catch (err) {
        live.textContent = L("No se pudo escuchar: ", "Zuhören nicht möglich: ") + (err.message || err);
        ok.disabled = !input.value.trim();
      }
    };

    input.addEventListener("input", () => { ok.disabled = !input.value.trim(); });
    document.querySelector("#dictateAgain").addEventListener("click", run);
    run();

    return new Promise(resolve => {
      document.querySelector("#dictateOk").addEventListener("click", () => { const v = input.value.trim(); modal.close(); resolve(v || null); });
      document.querySelector("#dictateCancel").addEventListener("click", () => { modal.close(); resolve(null); });
    });
  }

  /* ------------------------------------------------- Gesprächsnotiz */

  async function dictateNote() {
    if (!canListen()) { ctx.toast(L("Este navegador no reconoce voz.", "Dieser Browser erkennt keine Sprache.")); return null; }
    if (!listenConsent() && !(await askConsent())) return null;

    const modal = document.querySelector("#modal");
    document.querySelector("#modalTitle").textContent = "🎤 " + L("Nota tras la cita", "Notiz nach dem Termin");
    document.querySelector("#modalBody").innerHTML = `
      <div class="notice">${L(
        "Cuenta con tus palabras qué se ha acordado: quién, qué documento, para cuándo. La nota se guarda en el expediente; los plazos solo se proponen.",
        "Mit eigenen Worten erzählen, was vereinbart wurde: wer, welches Dokument, bis wann. Die Notiz landet in der Fallakte; Fristen werden nur vorgeschlagen.")}</div>
      <div class="dictate-live" id="noteLive" aria-live="polite">…</div>
      <label class="field-label" for="noteText">${L("Texto", "Text")}</label>
      <textarea id="noteText" class="manual-text" rows="7"></textarea>
      <div class="toolbar">
        <button type="button" class="primary-btn" id="noteRec">🎤 ${L("Grabar", "Aufnehmen")}</button>
        <button type="button" class="secondary-btn" id="noteStop" disabled>⏹ ${L("Parar", "Stopp")}</button>
        <button type="button" class="primary-btn" id="noteSave">${L("Guardar en el expediente", "In der Fallakte sichern")}</button>
      </div>`;
    modal.showModal();

    const live = document.querySelector("#noteLive");
    const area = document.querySelector("#noteText");
    let active = null;

    document.querySelector("#noteRec").addEventListener("click", async () => {
      document.querySelector("#noteStop").disabled = false;
      live.textContent = L("Escuchando…", "Höre zu…");
      try {
        const text = await recognizeOnce({
          continuous: true, timeoutMs: 120000,
          onStart: rec => { active = rec; },
          onPartial: t => { live.textContent = t.slice(-160); }
        });
        area.value = (area.value ? area.value + "\n" : "") + text;
      } catch (err) {
        live.textContent = L("Error: ", "Fehler: ") + (err.message || err);
      } finally {
        active = null;
        document.querySelector("#noteStop").disabled = true;
      }
    });
    document.querySelector("#noteStop").addEventListener("click", () => { try { active && active.stop(); } catch (_) {} });

    return new Promise(resolve => {
      document.querySelector("#noteSave").addEventListener("click", () => {
        const text = area.value.trim();
        modal.close();
        resolve(text || null);
      });
    });
  }

  return {
    canSpeak, canListen, listenConsent, setListenConsent,
    speak, stopSpeaking, isSpeaking, readCurrentView,
    dictateField, dictateNote, parseByKind, askConsent
  };
};
