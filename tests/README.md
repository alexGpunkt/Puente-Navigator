# Tests

Automatisierte Durchläufe gegen die App. Sie haben im Verlauf der Entwicklung mehrere echte Fehler gefunden: einen horizontalen Überlauf, der die untere Navigation unbedienbar machte, einen fehlenden Übersetzungsschlüssel, eine Falscherkennung „Nettokaltmiete“ → Nettoeinkommen, eine Typprüfung, die an der minifizierten pdf-lib scheiterte, und zwei doppelt vorhandene Modulsätze.

## Voraussetzungen

```bash
npm install playwright pdf-lib
npx playwright install chromium
```

## Ausführen

```bash
node tests/00-datenintegritaet.js
node tests/01-grundfunktionen.js
node tests/02-fristen-bescheid-beratung.js
node tests/03-speicher-phasen-postausgang.js
node tests/04-speicherstufen.js
node tests/05-pdf-ausfuellen.js
```

Die Skripte prüfen u. a. 390-px- und 320-px-Viewports, Laufzeitfehler, horizontalen Überlauf, iOS-Zoomfallen und Rohschlüssel. `05-pdf-ausfuellen.js` erzeugt sein Test-PDF selbst und lädt pdf-lib aus `node_modules`, weil das CDN in abgeschotteten Umgebungen nicht erreichbar ist.
