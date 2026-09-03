# Puente – Prototyp v0.7.0

Mobile-first, zweisprachige PWA für die Vorbereitung deutscher Behördenanträge. Puente arbeitet ohne eigenes Backend und verarbeitet Dokumente, Kartenfotos und Audio möglichst vollständig lokal im Browser.

## Neu in v0.7.0

### Karten fotografieren → Formularfelder vorbereiten
Im Fall-Arbeitsbereich gibt es einen eigenen Modus für Bank-/Debit-/Kreditkarten und Gesundheitskarten. Das Foto wird lokal mit Tesseract.js ausgewertet. Erkannte, für Anträge sinnvolle Angaben werden den passenden Formularfeldern zugeordnet, z. B.:

- Vor- und Nachname / Kontoinhaber
- IBAN und BIC
- Bankname
- Krankenkasse und Versichertennummer
- Geburtsdatum

**Zahlungskartendaten werden bewusst ausgeschlossen:** PAN/Kartennummer, CVV/CVC und das Gültigkeitsdatum von Debit-/Kreditkarten werden weder als Fakten ausgegeben noch in Formularfelder übernommen. OCR kann Fehler machen; deshalb werden erkannte Werte angezeigt. Hochsichere, bereits einem Formularfeld zugeordnete Karten-/Audioangaben werden bei freien Zielfeldern automatisch **als Entwurf** eingetragen. Zusätzlich gibt es einen Sammelknopf, der Vorschläge mit mindestens 75 % Erkennungssicherheit bestätigt und übernimmt. Vor dem Absenden bleibt eine Sichtprüfung erforderlich.

### Audio lokal mit Whisper
Audio kann als Datei ausgewählt oder direkt im Browser aufgenommen werden. `whisper.cpp` transkribiert lokal per WebAssembly; danach werden aus dem temporären Transkript u. a. Name, Geburtsdatum, Anschrift, IBAN, Krankenkasse und Versichertennummer extrahiert und den Formularen zugeordnet.

- kein Upload der Audioaufnahme an Puente oder einen KI-Dienst
- Transkript nur im Arbeitsspeicher des geöffneten Tabs
- lokales Modell: Whisper `tiny-q5_1` (ca. 31 MB)
- Same-Origin-Auslieferung der Engine und des Modells im GitHub-Pages-Build
- direkte Aufnahme ist auf 2 Minuten begrenzt; ausgewählte Dateien können länger sein

Die ältere Browser-Spracherkennung in `voice.js` bleibt für das geführte Diktat optional vorhanden und wird weiterhin nur nach ausdrücklicher Einwilligung verwendet. Die neue Audioanalyse benutzt sie **nicht**.

### Keine Laufzeit-CDNs im Deployment
GitHub Actions lädt die benötigten Open-Source-Abhängigkeiten während des Builds, testet sie, legt die geprüften Dateien unter `vendor/` im Repository ab und veröffentlicht sie anschließend unter demselben Puente-Ursprung:

- QRCode.js 1.0.0
- Tesseract.js 5.1.1 + Core + Deutsch/Spanisch/Englisch
- PDF.js 3.11.174
- JSZip 3.10.1
- pdf-lib 1.17.1
- whisper.cpp WebAssembly + `ggml-tiny-q5_1.bin`

Damit funktionieren QR, OCR, PDF, ZIP und Whisper auch in Netzen, in denen öffentliche CDNs am Endgerät gesperrt sind. Die CDN-URLs im Quellcode bleiben ausschließlich als Entwicklungs-Fallback erhalten.

### Whisper auf statischem Hosting
Der vorhandene Puente-Service-Worker setzt bei Same-Origin-Antworten COOP/COEP-Header. Dadurch kann `SharedArrayBuffer` für die threaded WebAssembly-Version von whisper.cpp auch auf GitHub Pages verwendet werden. Beim ersten Besuch kann dafür einmalig ein automatischer Reload erfolgen.

## Aus v0.6

- drei Speicherstufen: Sitzung, eigenes Gerät, geteiltes Gerät
- Fallphasen Vorbereiten / Eingereicht / Bescheid
- Postausgangsbuch
- Bedarfsgemeinschaft und daraus abgeleitete Anlagen
- Fallübergabe als Datei bzw. QR-Code
- Fristen, Bescheidanalyse und Widerspruchshilfe
- Befüllung amtlicher AcroForm-PDFs
- Fallakte und Antragssatz-Export
- Vorlesen sowie optionales, geführtes Browser-Diktat

## Datenschutzmodell

- Originalbilder, Dokumente und Audio: nur im Arbeitsspeicher des geöffneten Tabs
- vollständiger OCR-Text und Whisper-Transkript: nicht persistent gespeichert
- bestätigte Angaben: je nach Speicherstufe `sessionStorage` oder IndexedDB
- Sprache, Route, Dokumentstatus und Einstellungen: `localStorage`
- keine Analytics, kein Tracking, kein Puente-Backend
- keine Extraktion von PAN/CVV/Gültigkeitsdatum aus Zahlungskarten
- Gesundheitskartendaten werden ausschließlich lokal verarbeitet und erst nach sichtbarer Prüfung übernommen

## Dateien

```text
index.html       Grundgerüst, Navigation, frühe SW-/COOP-/COEP-Aktivierung
storage.js       Speichermodell und Migration
voice.js         Vorlesen und optionales Browser-Diktat
capture.js       Kartenextraktion, Aufnahme und lokales Whisper
data.js         Inhalte, Dokumenttypen und Formularzuordnungen
features.js      Fristen, Bescheide, PDF, Beratung, QR, Postausgang
app.js           Zustand, Routing, OCR, Fall- und Formularworkflow
styles.css       Mobil-, Dunkel- und Druckansicht
sw.js            Offline-Cache + Cross-Origin-Isolation für lokales Whisper
vendor/          lokal ausgelieferte Bibliotheken (Build ergänzt große Assets)
tests/           Integritäts- und Funktionsprüfungen
```

## Starten

```bash
python -m http.server 8080
```

Für Kamera, Mikrofon und Service Worker ist ein sicherer Kontext nötig (`localhost` oder HTTPS). Für **lokales Whisper mit mehreren Threads** muss die Seite zusätzlich cross-origin-isolated sein; im GitHub-Pages-Deployment erledigt das `sw.js` automatisch.

## Tests

```bash
node --check app.js
node --check capture.js
node tests/00-datenintegritaet.js
node tests/06-capture.js
```

Der Pages-Workflow führt zusätzlich echte Netzwerk-/Assettests aus: Er lädt den QR-Browserbuild über den vorgesehenen jsDelivr-Pfad, prüft ihn in Headless Chromium, lädt die lokale Whisper-Engine plus Modell und kontrolliert die erwartete WebAssembly-API und die Same-Origin-Bereitstellung.

## Grenzen

OCR und Spracherkennung können falsche Werte erzeugen. Automatische Zuordnung bedeutet daher **nicht** blindes Absenden: Puente zeigt die Vorschläge und verlangt bei Einzelwerten eine Bestätigung bzw. bietet bei sicheren Karten-/Audiofakten eine gebündelte Übernahme mit anschließender Formularprüfung. Fristen bilden Regelfälle ab; maßgeblich bleibt das Originalschreiben. Puente ist praktische Orientierung, keine Rechtsberatung.
