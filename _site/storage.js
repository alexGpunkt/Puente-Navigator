/* Puente v0.6 – Speichermodell

   Drei Stufen, weil aufsuchende Arbeit und geteilte Geräte
   gegensätzliche Anforderungen haben:

     session  Voreinstellung. Persönliche Daten leben nur im Tab und sind
              beim Schließen weg. Entspricht dem Verhalten bis v0.5.
     device   Persönliche Daten bleiben in IndexedDB, bis sie gelöscht werden.
              Für das eigene Handy, damit ein Fall über Tage bearbeitbar ist.
     shared   Wie session, zusätzlich automatische Löschung nach Inaktivität.
              Für Beratungs-Tablets und Geräte, die weitergereicht werden.

   Zwei Behälter:
     app       Sprache, Route, Dokumentstatus, Einstellungen. Wenig sensibel,
               immer im localStorage.
     personal  Formularwerte, bestätigte Angaben aus Dokumenten, Fristen,
               Postausgang. Ablageort hängt von der Stufe ab.

   Schreibfehler werden nicht verschluckt. Ein volles Speicherkontingent
   führte bis v0.5 zu stillem Datenverlust; jetzt meldet das Modul den
   Fehler an die App, die eine Warnung anzeigt.                              */

window.PuenteStorage = (function () {
  "use strict";

  const SCHEMA = 6;
  const PREFIX = "puente:v6:";
  const APP_KEY = PREFIX + "app";
  const PERSONAL_KEY = PREFIX + "personal";
  const MODE_KEY = PREFIX + "mode";
  const IDB_NAME = "puente";
  const IDB_STORE = "kv";

  const MODES = ["session", "device", "shared"];
  const IDLE_MS = { shared: 15 * 60 * 1000 };

  const emptyApp = () => ({ schema: SCHEMA, state: {}, settings: {} });
  const emptyPersonal = () => ({
    schema: SCHEMA, formValues: {}, docSession: { docs: [], approvedFacts: {}, ignoredFacts: {} },
    deadlines: [], outbox: [], notes: []
  });

  let mode = "session";
  let app = emptyApp();
  let personal = emptyPersonal();
  let onError = null;
  let onIdleWipe = null;
  let lastError = null;
  let idleTimer = null;
  let flushTimer = null;
  let ready = false;

  /* ---------------------------------------------------------------- IndexedDB */

  function idbOpen() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("no-idb"));
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("idb-open"));
    });
  }
  async function idbGet(key) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const r = tx.objectStore(IDB_STORE).get(key);
      r.onsuccess = () => { resolve(r.result); db.close(); };
      r.onerror = () => { reject(r.error); db.close(); };
    });
  }
  async function idbSet(key, value) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => { resolve(true); db.close(); };
      tx.onerror = () => { reject(tx.error); db.close(); };
    });
  }
  async function idbDel(key) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => { resolve(true); db.close(); };
      tx.onerror = () => { reject(tx.error); db.close(); };
    });
  }

  /* ------------------------------------------------------- Fehlerbehandlung */

  function report(where, err) {
    lastError = {
      where,
      message: String(err && err.message || err),
      quota: /quota|exceeded|full/i.test(String(err && err.name || "") + String(err && err.message || "")),
      at: Date.now()
    };
    try { onError && onError(lastError); } catch (_) {}
    return lastError;
  }

  function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try {
      const v = JSON.parse(raw);
      return (v && typeof v === "object") ? v : fallback;
    } catch (_) { return fallback; }
  }

  /* ------------------------------------------------------------- Migration */

  /** Übernimmt die Stände aus v0.3–v0.5, damit laufende Fälle nicht verloren gehen. */
  function migrateLegacy() {
    let touched = false;
    try {
      const oldState = safeParse(localStorage.getItem("puente-prototype-v3"), null);
      if (oldState && !Object.keys(app.state).length) { app.state = oldState; touched = true; }

      const oldForm = safeParse(sessionStorage.getItem("puente-form-values-v3"), null);
      if (oldForm && !Object.keys(personal.formValues).length) { personal.formValues = oldForm; touched = true; }

      const oldDocs = safeParse(sessionStorage.getItem("puente-document-session-v3"), null);
      if (oldDocs && !personal.docSession.docs.length) {
        personal.docSession = {
          docs: Array.isArray(oldDocs.docs) ? oldDocs.docs : [],
          approvedFacts: oldDocs.approvedFacts || {},
          ignoredFacts: oldDocs.ignoredFacts || {}
        };
        touched = true;
      }
      const oldDl = safeParse(localStorage.getItem("puente-deadlines-v1"), null);
      if (Array.isArray(oldDl) && !personal.deadlines.length) { personal.deadlines = oldDl; touched = true; }
    } catch (err) { report("migrate", err); }
    return touched;
  }

  /* ----------------------------------------------------------------- Laden */

  function normalizeApp(v) {
    const a = Object.assign(emptyApp(), v && typeof v === "object" ? v : {});
    a.schema = SCHEMA;
    if (!a.state || typeof a.state !== "object" || Array.isArray(a.state)) a.state = {};
    if (!a.settings || typeof a.settings !== "object" || Array.isArray(a.settings)) a.settings = {};
    return a;
  }
  function normalizePersonal(v) {
    const p = Object.assign(emptyPersonal(), v && typeof v === "object" ? v : {});
    p.schema = SCHEMA;
    if (!p.formValues || typeof p.formValues !== "object" || Array.isArray(p.formValues)) p.formValues = {};
    const d = p.docSession && typeof p.docSession === "object" ? p.docSession : {};
    p.docSession = {
      docs: Array.isArray(d.docs) ? d.docs : [],
      approvedFacts: (d.approvedFacts && typeof d.approvedFacts === "object") ? d.approvedFacts : {},
      ignoredFacts: (d.ignoredFacts && typeof d.ignoredFacts === "object") ? d.ignoredFacts : {}
    };
    p.deadlines = Array.isArray(p.deadlines) ? p.deadlines : [];
    p.outbox = Array.isArray(p.outbox) ? p.outbox : [];
    p.notes = Array.isArray(p.notes) ? p.notes : [];
    return p;
  }

  async function init(opts) {
    opts = opts || {};
    onError = opts.onError || null;
    onIdleWipe = opts.onIdleWipe || null;

    try {
      const m = localStorage.getItem(MODE_KEY);
      if (MODES.includes(m)) mode = m;
    } catch (err) { report("read-mode", err); }

    try { app = normalizeApp(safeParse(localStorage.getItem(APP_KEY), null)); }
    catch (err) { report("read-app", err); app = emptyApp(); }

    if (mode === "device") {
      try {
        const v = await idbGet(PERSONAL_KEY);
        personal = normalizePersonal(v);
      } catch (err) {
        // IndexedDB ist im privaten Modus mancher Browser gesperrt.
        report("read-personal-idb", err);
        personal = normalizePersonal(safeParse(sessionStorage.getItem(PERSONAL_KEY), null));
      }
    } else {
      try { personal = normalizePersonal(safeParse(sessionStorage.getItem(PERSONAL_KEY), null)); }
      catch (err) { report("read-personal", err); personal = emptyPersonal(); }
    }

    if (migrateLegacy()) { await flush(true); clearLegacy(); }

    ready = true;
    armIdle();
    return { mode, app, personal };
  }

  function clearLegacy() {
    ["puente-prototype-v3", "puente-deadlines-v1"].forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
    ["puente-form-values-v3", "puente-document-session-v3"].forEach(k => { try { sessionStorage.removeItem(k); } catch (_) {} });
  }

  /* --------------------------------------------------------------- Sichern */

  async function writeApp() {
    try { localStorage.setItem(APP_KEY, JSON.stringify(app)); return true; }
    catch (err) { report("write-app", err); return false; }
  }
  async function writePersonal() {
    const json = JSON.stringify(personal);
    if (mode === "device") {
      try { await idbSet(PERSONAL_KEY, personal); return true; }
      catch (err) {
        report("write-personal-idb", err);
        try { sessionStorage.setItem(PERSONAL_KEY, json); return true; } catch (e2) { report("write-personal", e2); return false; }
      }
    }
    try { sessionStorage.setItem(PERSONAL_KEY, json); return true; }
    catch (err) { report("write-personal", err); return false; }
  }

  /** Sammelt Schreibvorgänge; bei OCR-Fortschritt kommen sonst hunderte pro Minute. */
  function save(bucket) {
    touch();
    if (bucket === "app") { queue.app = true; } else { queue.personal = true; }
    if (flushTimer) return;
    flushTimer = setTimeout(() => { flushTimer = null; flush(); }, 400);
  }
  const queue = { app: false, personal: false };

  async function flush(force) {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    const doApp = queue.app || force, doPersonal = queue.personal || force;
    queue.app = queue.personal = false;
    if (doApp) await writeApp();
    if (doPersonal) await writePersonal();
    return !lastError;
  }

  /* ------------------------------------------------------------- Stufe wechseln */

  async function setMode(next) {
    if (!MODES.includes(next) || next === mode) return mode;
    const prev = mode;
    mode = next;
    try { localStorage.setItem(MODE_KEY, mode); } catch (err) { report("write-mode", err); }

    // Beim Verlassen von "device" die dauerhafte Kopie entfernen, sonst bliebe
    // sie unbemerkt auf dem Gerät liegen.
    if (prev === "device") { try { await idbDel(PERSONAL_KEY); } catch (err) { report("clear-idb", err); } }
    if (next !== "device") { /* Daten laufen ab jetzt über sessionStorage */ }

    await flush(true);
    armIdle();
    return mode;
  }

  /* ---------------------------------------------------------- Inaktivität */

  function armIdle() {
    clearTimeout(idleTimer);
    const ms = IDLE_MS[mode];
    if (!ms) return;
    idleTimer = setTimeout(async () => {
      await clearPersonal();
      try { onIdleWipe && onIdleWipe(); } catch (_) {}
    }, ms);
  }
  function touch() { if (ready && IDLE_MS[mode]) armIdle(); }
  function idleDeadline() { return IDLE_MS[mode] ? Date.now() + IDLE_MS[mode] : null; }

  /* ----------------------------------------------------------------- Löschen */

  async function clearPersonal() {
    personal = emptyPersonal();
    try { sessionStorage.removeItem(PERSONAL_KEY); } catch (_) {}
    try { await idbDel(PERSONAL_KEY); } catch (_) {}
    return personal;
  }
  async function clearAll() {
    await clearPersonal();
    app = emptyApp();
    try { localStorage.removeItem(APP_KEY); } catch (_) {}
    clearLegacy();
    return true;
  }

  /** Ersetzt einen ganzen Teilbereich; nötig, weil die App Objekte neu zuweist. */
  function replacePersonal(key, value) {
    personal[key] = value;
    save("personal");
    return personal[key];
  }

  function estimateBytes() {
    try { return JSON.stringify(personal).length + JSON.stringify(app).length; }
    catch (_) { return 0; }
  }

  function status() {
    return {
      mode, schema: SCHEMA, ready,
      backend: mode === "device" ? "IndexedDB" : "sessionStorage",
      bytes: estimateBytes(),
      lastError,
      idleUntil: idleDeadline()
    };
  }
  function clearError() { lastError = null; }

  return {
    SCHEMA, MODES, init, save, flush, setMode, getMode: () => mode,
    get app() { return app; },
    get personal() { return personal; },
    replacePersonal, clearPersonal, clearAll, status, clearError, touch, idleDeadline
  };
})();
