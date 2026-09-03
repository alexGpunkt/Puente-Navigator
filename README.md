# Puente – Prototyp v0.4.1

Mobile-first, zweisprachige HTML/PWA für aufsuchende Bürokratiehilfe in spanischsprachigen Communities in Deutschland.

## Neu in v0.4.1 – Fehlerbehebung und Mobiloptimierung

### Behobene Fehler
- **Formularansicht sprengte den Bildschirm.** Lange Feldtitel (z. B. „Aktuelle/beantragte/weggefallene/abgelehnte Transferleistungen") konnten nicht umbrechen; die Seite wurde auf einem 390-px-Gerät 462 px breit und die untere Navigation war nicht mehr antippbar.
- **Fehlender Übersetzungsschlüssel `navAssistant`** – in der Navigationsleiste stand in beiden Sprachen der Rohschlüssel statt „Assistent“/„Asistente“.
- **Upload-Fläche zerfiel optisch**, weil das `<label>` ohne `display:block` als Inline-Element gerendert wurde.
- **Falscherkennung bei der Datenextraktion:** „Nettokaltmiete“ wurde zusätzlich als *Nettoeinkommen* erkannt und hätte die Kaltmiete in das Einkommensfeld übertragen. Label-Vergleich erfolgt jetzt mit Wortgrenze. „beginnt am“ greift nur noch bei Mietverträgen.
- **Absturzrisiken beim Start** durch ungeprüfte Werte aus `localStorage` (Sprache, Route, verwaiste Dokument-IDs) und unvollständige Session-Objekte.
- Datei-Inputs werden nach der Auswahl zurückgesetzt – dieselbe Datei kann erneut gewählt werden.
- Blockierende `alert()`-Dialoge durch nicht-blockierende Hinweise ersetzt.

### Mobile Optimierung
- Alle Eingabefelder mit 16 px Schriftgröße: iOS zoomt beim Fokus nicht mehr hinein.
- Tippflächen durchgehend mindestens 44 px; Werkzeugleisten auf Telefonen einspaltig.
- `env(safe-area-inset-*)` für Home-Indicator und Notch, `100dvh` statt `100vh`.
- Dialoge als scrollbares Bottom-Sheet, schließbar per Tipp auf den Hintergrund.
- Android-Zurück-Taste navigiert innerhalb der App (History-API) statt sie zu verlassen.
- Dunkler Modus, sichtbarer Tastaturfokus, Skip-Link, `prefers-reduced-motion`.
- Querformat mit geringer Höhe: Kopf- und Fußleiste werden nicht fixiert.

### Technik
- OCR-Worker wird wiederverwendet: Sprachpakete laden einmal pro Sitzung statt pro Dokument.
- Fortschrittsanzeige schreibt höchstens alle 1,5 s in den `sessionStorage`.
- Service Worker: network-first für Navigationen (Updates erreichen die Geräte), CDN-Antworten werden nicht mehr gecacht.
- PWA-Manifest mit Icons, Scope und Shortcuts; „Zum Startbildschirm hinzufügen“ funktioniert korrekt.

## Aus v0.4: druckfertige Fallakte
- Deckblatt, Fallübersicht, Nachweis-Checkliste und Fehlstellenliste
- bestätigte OCR-Angaben und vorbereitete Formularfelder werden übernommen
- sortiertes Nachweisverzeichnis mit Nummerierung N1, N2, …
- lokaler Antragssatz-Export als ZIP: Fallakte + Falldaten + Checkliste + Originalnachweise
- Hinweisdatei im ZIP, wenn Originaldateien nach einem Reload nicht mehr verfügbar sind

## Aus v0.3: Fall-Arbeitsbereich
- Kamera/Dateiupload für JPG, PNG, WebP und PDF (max. 25 MB je Datei)
- Dokumente bleiben im Browser; keine Puente-Cloud
- clientseitige Dokumenttyp-Erkennung
- clientseitige PDF-Textauslese mit PDF.js
- clientseitiges OCR für Bilder und gescannte PDFs mit Tesseract.js
- automatische Erkennung von Steuer-ID, Renten-/SV-Nummer, IBAN, Krankenkasse, Wohnfläche sowie Miet- und Einkommensbeträgen
- erkannte Angaben werden als Vorschläge mit Konfidenz angezeigt und erst nach Bestätigung übernommen
- manuelle Dokumenttyp-Korrektur und manuelle Textanalyse als Offline-Weg
- Export einer Fallübersicht als JSON ohne Originaldokumente

## Datenschutzmodell
- Originaldateien: nur im Arbeitsspeicher des geöffneten Tabs
- vollständiger OCR-Text: wird nach der Analyse nicht gespeichert
- erkannte Vorschläge und bestätigte Werte: nur `sessionStorage`
- Fallklassifikation und reine Dokumentstatus: `localStorage`
- keine Analytics, kein Tracking, kein Puente-Backend
- „Fall löschen“ entfernt lokale und sessionbezogene Daten

Wichtig: Für OCR/PDF-Auslese lädt der Browser bei Bedarf Tesseract.js bzw. PDF.js über öffentliche CDNs. Die Dokumente werden dabei lokal verarbeitet und nicht an die CDNs übertragen. Für vollständig offline arbeitende Installationen sollten diese Bibliotheken lokal mit dem Projekt ausgeliefert werden.

## Bereits enthalten
- Spanisch/Deutsch
- geführter Fall-Assistent
- Grundsicherungsgeld und Wohngeld
- automatische Jobcenter-Anlagenlogik
- formularfeldgenaue Vorbereitung HA/KDU/EK/VM sowie Berliner Mietzuschuss
- Dokumentverlust-Modus
- Beschaffungswege nach Komplexität 1–4
- Musterschreiben
- Druck/PDF

## Starten
```bash
python -m http.server 8080
```
Dann `http://localhost:8080` öffnen.

Hinweis: Für Kamera, Zwischenablage und Service Worker ist ein sicherer Kontext nötig – also `localhost` oder HTTPS. Über eine reine LAN-IP per HTTP stehen diese Funktionen nicht zur Verfügung.

## Test
Der Prototyp wurde auf 390 px und 320 px Viewportbreite sowie in hellem und dunklem Modus automatisiert durchgeklickt: keine Laufzeitfehler, kein horizontaler Überlauf, keine Eingabefelder unter 16 px, keine Tippfläche unter 36 px.

## Grenzen des Prototyps
OCR und RegEx-Erkennung können Fehler machen. Deshalb werden erkannte persönliche Angaben nicht stillschweigend übernommen, sondern müssen bestätigt werden. Die App ist praktische Orientierung, keine Rechtsberatung.
