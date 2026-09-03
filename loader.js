(() => {
  const PARTS = ["chunks/data-01.txt", "chunks/data-02.txt", "chunks/data-03.txt", "chunks/data-04.txt", "chunks/data-05.txt", "chunks/data-06.txt", "chunks/data-07.txt", "chunks/data-08.txt", "chunks/app-01.txt"];
  async function boot() {
    try {
      const parts = await Promise.all(PARTS.map(async p => {
        const r = await fetch(p, {cache:"no-cache"});
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${p}`);
        return r.text();
      }));
      const code = parts.join("") + "\n//# sourceURL=puente-runtime.js";
      (new Function(code))();
    } catch (err) {
      console.error("Puente konnte nicht gestartet werden", err);
      const app = document.getElementById("app");
      if (app) app.innerHTML = `<div style="padding:24px;font-family:system-ui"><h1>Puente</h1><p>La aplicación no pudo cargarse / Die Anwendung konnte nicht geladen werden.</p><pre style="white-space:pre-wrap">${String(err && err.message || err)}</pre></div>`;
    }
  }
  boot();
})();
