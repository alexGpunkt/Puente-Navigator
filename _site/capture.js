/* Puente v0.7 – lokale Karten- und Audioerfassung
   - Kartenfotos werden ausschließlich lokal per OCR ausgewertet.
   - Zahlungsdaten, die für Behördenformulare nicht benötigt werden (PAN/CVV),
     werden bewusst weder extrahiert noch gespeichert.
   - Audio wird über whisper.cpp/WASM lokal transkribiert. Das Modell und die
     Engine werden beim Pages-Build als Same-Origin-Dateien unter vendor/whisper
     bereitgestellt; zur Laufzeit ist kein externer KI-Dienst nötig. */
(function (root) {
  "use strict";

  const SAFE_CARD_FACTS = new Set([
    "firstName","lastName","accountHolder","iban","bic","bankName",
    "healthFund","healthInsuranceNo","birthDate"
  ]);

  const FUNDS = [
    "AOK Nordost","AOK Bayern","AOK Baden-Württemberg","AOK Niedersachsen","AOK Rheinland/Hamburg",
    "AOK PLUS","AOK Rheinland-Pfalz/Saarland","AOK Sachsen-Anhalt","AOK Bremen/Bremerhaven",
    "Techniker Krankenkasse","TK","BARMER","DAK-Gesundheit","DAK","KKH","hkk","IKK classic",
    "HEK","SBK","mkk","BKK VBU","Mobil Krankenkasse","BIG direkt gesund"
  ];
  const BANK_WORDS = /(bank|sparkasse|volksbank|raiffeisen|commerzbank|deutsche bank|n26|dkb|ing|postbank|santander|revolut|visa|mastercard|girocard|debit|credit)/i;
  const CARD_NO_WORDS = /(kartennummer|card number|karten-nr|pan|cvc|cvv|prüfnummer|security code|valid thru|gültig bis)/i;

  function cleanText(v) {
    return String(v || "").replace(/\u00ad/g, "").replace(/[\t\r]+/g, " ").replace(/[ ]{2,}/g, " ").trim();
  }
  function linesOf(text) {
    return String(text || "").split(/\n+/).map(cleanText).filter(Boolean);
  }
  function ibanChecksumOk(iban) {
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
    const rearranged = iban.slice(4) + iban.slice(0,4);
    let rem = 0;
    for (const ch of rearranged) {
      const part = ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0)-55) : ch;
      for (const d of part) rem = (rem * 10 + Number(d)) % 97;
    }
    return rem === 1;
  }
  function normalizeIban(raw) {
    const src = String(raw || "").toUpperCase();
    const starts = [...src.matchAll(/\b[A-Z]{2}\s*\d{2}/g)];
    for (const m of starts) {
      const segment = src.slice(m.index).split(/[\n;,.!?]/)[0];
      const compact = segment.replace(/[^A-Z0-9]/g, "");
      for (let len = 15; len <= Math.min(34, compact.length); len++) {
        const candidate = compact.slice(0, len);
        if (ibanChecksumOk(candidate)) return candidate;
      }
    }
    return null;
  }
  function normalizeBic(raw) {
    const s = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const m = s.match(/[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?/);
    return m && m[0].length >= 8 && m[0].length <= 11 ? m[0] : null;
  }
  function titleCaseName(s) {
    return cleanText(s).toLowerCase().replace(/(^|[\s'-])([a-zäöüáéíóúñ])/g, (_, a, b) => a + b.toUpperCase());
  }
  function validPersonName(s) {
    const v = cleanText(s).replace(/[|_:]/g, " ").replace(/\s+/g, " ");
    if (v.length < 2 || v.length > 70 || /\d/.test(v) || CARD_NO_WORDS.test(v) || BANK_WORDS.test(v)) return null;
    const words = v.split(" ").filter(Boolean);
    if (words.length > 6) return null;
    if (!words.every(w => /^[A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ.'-]{2,}$/.test(w))) return null;
    return titleCaseName(v);
  }
  function labeledValue(text, labels, valuePattern) {
    const raw = String(text || "");
    for (const label of labels) {
      const re = new RegExp(label + "\\s*[:#-]?\\s*([^\\n]{1,80})", "i");
      const m = raw.match(re);
      if (!m) continue;
      const v = cleanText(m[1]);
      if (!valuePattern || valuePattern.test(v)) return v;
    }
    return null;
  }
  function pushFact(out, key, value, confidence, sourceKind) {
    value = cleanText(value);
    if (!value || !SAFE_CARD_FACTS.has(key) || out.some(x => x.key === key && x.value === value)) return;
    out.push({ key, value, confidence: Math.max(0.1, Math.min(0.99, confidence || 0.7)), sourceKind: sourceKind || "card" });
  }

  function classifyCardText(text) {
    const t = cleanText(text).toLowerCase();
    const fund = FUNDS.find(x => t.includes(x.toLowerCase()));
    const healthScore = (fund ? 4 : 0) + (/versichertennummer|gesundheitskarte|krankenversicherung|health insurance/.test(t) ? 3 : 0) + (/egk|g2/.test(t) ? 1 : 0);
    const bankScore = (BANK_WORDS.test(t) ? 3 : 0) + (/\biban\b|\bbic\b/.test(t) ? 3 : 0) + (/cardholder|karteninhaber|kontoinhaber/.test(t) ? 1 : 0);
    if (healthScore >= Math.max(3, bankScore)) return { kind: "health_card", confidence: Math.min(.98, .45 + healthScore * .08) };
    if (bankScore >= 3) return { kind: "bank_card", confidence: Math.min(.96, .42 + bankScore * .08) };
    return { kind: "card", confidence: .35 };
  }

  function extractCardFacts(text, forcedKind) {
    const raw = String(text || "");
    const lines = linesOf(raw);
    const cls = forcedKind && forcedKind !== "card" ? { kind: forcedKind, confidence: .9 } : classifyCardText(raw);
    const out = [];

    const ibanRaw = labeledValue(raw, ["IBAN"], /[A-Z0-9 ]{15,}/i) || raw.match(/\b[A-Z]{2}\s*\d{2}(?:\s*[A-Z0-9]){11,30}\b/i)?.[0];
    const iban = normalizeIban(ibanRaw);
    if (iban) pushFact(out, "iban", iban, .97, cls.kind);

    const bicRaw = labeledValue(raw, ["BIC", "SWIFT"], /[A-Z0-9]{8,14}/i);
    const bic = normalizeBic(bicRaw);
    if (bic) pushFact(out, "bic", bic, .9, cls.kind);

    const fund = FUNDS.find(x => raw.toLowerCase().includes(x.toLowerCase()));
    if (fund) pushFact(out, "healthFund", fund, .96, cls.kind);

    const healthNo = labeledValue(raw, ["Versichertennummer", "Vers.-Nr\\.?", "Versicherungsnummer", "Insurance no\\.?"], /[A-Z][0-9]{9}/i)
      || raw.match(/\b[A-Z][0-9]{9}\b/i)?.[0];
    if (healthNo) pushFact(out, "healthInsuranceNo", healthNo.toUpperCase().replace(/\s/g, ""), .92, cls.kind);

    const first = labeledValue(raw, ["Vorname", "Given name", "Nombre"], /[A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ '-]{2,}/i);
    const last = labeledValue(raw, ["Nachname", "Familienname", "Surname", "Apellido(?:s)?"], /[A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ '-]{2,}/i);
    const vf = validPersonName(first), vl = validPersonName(last);
    if (vf) pushFact(out, "firstName", vf, .88, cls.kind);
    if (vl) pushFact(out, "lastName", vl, .88, cls.kind);

    const holder = labeledValue(raw, ["Kontoinhaber(?:/in)?", "Karteninhaber(?:/in)?", "Cardholder", "Titular"], /[A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ '.-]{3,}/i);
    const vh = validPersonName(holder);
    if (vh) pushFact(out, "accountHolder", vh, .9, cls.kind);

    if (!vh && cls.kind === "bank_card") {
      const candidate = lines
        .filter(x => !BANK_WORDS.test(x) && !CARD_NO_WORDS.test(x) && !/\b(?:DE\d|IBAN|BIC|VALID|GÜLTIG)\b/i.test(x))
        .map(validPersonName).filter(Boolean)
        .sort((a,b) => b.length - a.length)[0];
      if (candidate) pushFact(out, "accountHolder", candidate, .61, cls.kind);
    }

    if (cls.kind === "bank_card") {
      const bankLine = lines.find(x => BANK_WORDS.test(x) && !/visa|mastercard|girocard|debit|credit/i.test(x));
      if (bankLine) pushFact(out, "bankName", bankLine.slice(0, 70), .7, cls.kind);
    }

    const dob = labeledValue(raw, ["Geburtsdatum", "Date of birth", "Fecha de nacimiento"], /\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}/i);
    if (dob) pushFact(out, "birthDate", dob.replace(/[\/-]/g, "."), .84, cls.kind);

    // Kartennummer, Ablaufdatum und CVV werden absichtlich nicht extrahiert.
    return { kind: cls.kind, confidence: cls.confidence, facts: out };
  }

  function extractSpokenFacts(text) {
    const raw = cleanText(text);
    const out = [];
    const add = (key, value, confidence=.7) => {
      value = cleanText(value);
      if (value && !out.some(x => x.key === key)) out.push({key,value,confidence,sourceKind:"audio"});
    };
    let m;
    m = raw.match(/(?:mein vorname ist|vorname[: ]|mi nombre es|nombre[: ])\s*([A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ'-]{2,})/i); if (m) add("firstName", titleCaseName(m[1]), .83);
    m = raw.match(/(?:mein nachname ist|nachname[: ]|familienname[: ]|mi apellido es|apellido[: ])\s*([A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ' -]{2,45})/i); if (m) add("lastName", titleCaseName(m[1].split(/\b(?:und|y|iban|geboren|geburtsdatum)\b/i)[0]), .83);
    m = raw.match(/(?:ich heiße|ich heisse|me llamo)\s+([A-Za-zÄÖÜäöüßÁÉÍÓÚÑáéíóúñ' -]{3,60})/i); if (m) add("accountHolder", titleCaseName(m[1].split(/\b(?:und|y|meine|mein|mi)\b/i)[0]), .66);
    m = raw.match(/(?:geburtsdatum(?: ist)?|geboren am|fecha de nacimiento(?: es)?)\s*([0-9]{1,2}[.\/-][0-9]{1,2}[.\/-][0-9]{2,4})/i); if (m) add("birthDate", m[1].replace(/[\/-]/g,"."), .88);
    m = raw.match(/(?:anschrift(?: ist)?|adresse(?: ist)?|ich wohne (?:in|unter)|dirección(?: es)?)\s*([^.;\n]{6,90})/i); if (m) add("streetAddress", m[1], .65);
    const ibanLabelPos = raw.search(/(?:\bIBAN\b|meine iban ist|mi iban es)/i);
    const iban = normalizeIban(ibanLabelPos >= 0 ? raw.slice(ibanLabelPos) : raw); if (iban) add("iban", iban, .92);
    const fund = FUNDS.find(x => raw.toLowerCase().includes(x.toLowerCase())); if (fund) add("healthFund", fund, .91);
    m = raw.match(/(?:versichertennummer(?: ist)?|número de asegurado(?: es)?)\s*([A-Z]\s*(?:\d\s*){9})/i); if (m) add("healthInsuranceNo", m[1].replace(/\s/g,""), .86);
    return out;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-puente-src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === "1") return resolve();
        existing.addEventListener("load", resolve, {once:true});
        existing.addEventListener("error", reject, {once:true});
        return;
      }
      const s = document.createElement("script");
      s.src = src; s.async = true; s.dataset.puenteSrc = src;
      s.onload = () => { s.dataset.loaded = "1"; resolve(); };
      s.onerror = () => reject(new Error("whisper-engine-load-failed"));
      document.head.appendChild(s);
    });
  }

  let whisperReady = null;
  let whisperInstance = 0;
  let outputListeners = new Set();
  function whisperPrint(line) {
    const s = String(line == null ? "" : line);
    outputListeners.forEach(fn => { try { fn(s); } catch (_) {} });
  }

  async function ensureWhisper(opts={}) {
    if (root.Module && typeof root.Module.init === "function") return root.Module;
    if (whisperReady) return whisperReady;
    whisperReady = (async () => {
      // Die aktuelle whisper.cpp-WebAssembly-Version nutzt Pthreads. Auf GitHub
      // Pages erzeugt der Puente-Service-Worker die nötige Cross-Origin-Isolation.
      if (!root.crossOriginIsolated && opts.requireIsolation !== false) {
        throw new Error("whisper-cross-origin-isolation-required");
      }
      root.Module = root.Module || {};
      root.Module.print = whisperPrint;
      root.Module.printErr = whisperPrint;
      root.Module.setStatus = s => opts.onStatus && opts.onStatus(String(s || ""));
      await loadScript(opts.enginePath || "vendor/whisper/main.js");
      const started = Date.now();
      while (!(root.Module && typeof root.Module.init === "function")) {
        if (Date.now() - started > 30000) throw new Error("whisper-engine-timeout");
        await new Promise(r => setTimeout(r, 50));
      }
      return root.Module;
    })().catch(err => { whisperReady = null; throw err; });
    return whisperReady;
  }

  async function loadWhisperModel(Module, modelPath, onProgress) {
    try { Module.FS_stat("/whisper.bin"); return; } catch (_) {}
    const res = await fetch(modelPath || "vendor/whisper/ggml-tiny-q5_1.bin");
    if (!res.ok) throw new Error("whisper-model-not-found");
    const total = Number(res.headers.get("content-length") || 0);
    let bytes;
    if (res.body && total) {
      const reader = res.body.getReader(); let got = 0, chunks = [];
      while (true) {
        const {done,value} = await reader.read(); if (done) break;
        chunks.push(value); got += value.length; onProgress && onProgress(Math.min(.35, .35 * got / total));
      }
      bytes = new Uint8Array(got); let off=0; for (const c of chunks) { bytes.set(c,off); off += c.length; }
    } else bytes = new Uint8Array(await res.arrayBuffer());
    try { Module.FS_unlink("/whisper.bin"); } catch (_) {}
    Module.FS_createDataFile("/", "whisper.bin", bytes, true, true);
    onProgress && onProgress(.36);
  }

  async function decodeAudio(file, maxSeconds=600) {
    const AC = root.AudioContext || root.webkitAudioContext;
    const OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    if (!AC || !OAC) throw new Error("audio-context-unavailable");
    const buf = await file.arrayBuffer();
    const ac = new AC();
    let decoded;
    try { decoded = await ac.decodeAudioData(buf.slice(0)); }
    finally { try { await ac.close(); } catch (_) {} }
    const frames = Math.min(Math.ceil(decoded.duration * 16000), maxSeconds * 16000);
    const offline = new OAC(1, Math.max(1, frames), 16000);
    const src = offline.createBufferSource(); src.buffer = decoded; src.connect(offline.destination); src.start(0);
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0).slice(0, frames);
  }

  function transcriptFromLines(lines) {
    const parts = [];
    for (const line of lines) {
      let m = line.match(/^\s*\[[^\]]+-->[^\]]+\]\s*(.+)$/);
      if (m && m[1]) { parts.push(m[1].trim()); continue; }
      m = line.match(/^\s*\[[0-9:.]+\s*-->\s*[0-9:.]+\]\s*(.+)$/);
      if (m && m[1]) parts.push(m[1].trim());
    }
    return parts.join(" ").replace(/\s+/g," ").trim();
  }

  async function transcribeAudioFile(file, opts={}) {
    const maxSeconds = Math.min(1800, Math.max(30, Number(opts.maxSeconds || 600)));
    opts.onStatus && opts.onStatus("audio-decode");
    const pcm = await decodeAudio(file, maxSeconds);
    opts.onProgress && opts.onProgress(.08);
    const Module = await ensureWhisper(opts);
    await loadWhisperModel(Module, opts.modelPath, opts.onProgress);
    if (!whisperInstance) {
      whisperInstance = Module.init("whisper.bin");
      if (!whisperInstance) throw new Error("whisper-model-init-failed");
    }
    const lines = [];
    let doneResolve, doneReject;
    const done = new Promise((resolve,reject)=>{doneResolve=resolve;doneReject=reject;});
    const listener = line => {
      lines.push(line);
      if (/whisper_print_timings:.*total time/i.test(line) || /whisper_print_timings:.*total =/i.test(line)) doneResolve();
      if (/failed to|error:/i.test(line) && /whisper|model|memory/i.test(line)) doneReject(new Error(line));
    };
    outputListeners.add(listener);
    try {
      opts.onStatus && opts.onStatus("whisper-transcribe");
      const threads = Math.min(8, Math.max(1, Number(opts.threads || Math.floor((navigator.hardwareConcurrency || 4)/2) || 2)));
      const lang = opts.lang === "es" ? "es" : opts.lang === "de" ? "de" : "auto";
      const ret = Module.full_default(whisperInstance, pcm, lang, threads, false);
      if (ret < 0) throw new Error("whisper-transcribe-start-failed:"+ret);
      const timer = setTimeout(()=>doneReject(new Error("whisper-transcribe-timeout")), Math.max(180000, pcm.length/16000*8000));
      await done.finally(()=>clearTimeout(timer));
      opts.onProgress && opts.onProgress(1);
      const transcript = transcriptFromLines(lines);
      if (!transcript) throw new Error("whisper-empty-transcript");
      return transcript;
    } finally { outputListeners.delete(listener); }
  }

  const api = { classifyCardText, extractCardFacts, extractSpokenFacts, normalizeIban, transcribeAudioFile, transcriptFromLines, SAFE_CARD_FACTS };
  root.PuenteCapture = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
