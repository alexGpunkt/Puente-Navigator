const assert = require('assert');
const C = require('../capture.js');

const bank = C.extractCardFacts(`
Beispielbank
Debit Mastercard
Karteninhaber: Max Beispiel
BIC: TESTDEFFXXX
Card number [REDACTED]
VALID THRU [REDACTED]
CVV [REDACTED]
`,'bank_card');
assert.equal(bank.kind,'bank_card');
assert.equal(bank.facts.find(x=>x.key==='accountHolder')?.value,'Max Beispiel');
assert.equal(bank.facts.find(x=>x.key==='bic')?.value,'TESTDEFFXXX');
assert.ok(!bank.facts.some(x=>/pan|cvv|card|valid/i.test(x.key)), 'sensitive payment card fields must never be emitted');

const health = C.extractCardFacts(`
Techniker Krankenkasse
Gesundheitskarte
Vorname: Erika
Nachname: Beispiel
Geburtsdatum: 04.05.1988
`,'health_card');
assert.equal(health.facts.find(x=>x.key==='healthFund')?.value,'Techniker Krankenkasse');
assert.equal(health.facts.find(x=>x.key==='firstName')?.value,'Erika');
assert.equal(health.facts.find(x=>x.key==='lastName')?.value,'Beispiel');

const spoken = C.extractSpokenFacts('Mein Vorname ist Max. Mein Nachname ist Beispiel. Geburtsdatum ist 03.04.1985. Meine Krankenkasse ist BARMER.');
assert.equal(spoken.find(x=>x.key==='firstName')?.value,'Max');
assert.equal(spoken.find(x=>x.key==='lastName')?.value,'Beispiel');
assert.equal(spoken.find(x=>x.key==='birthDate')?.value,'03.04.1985');
assert.equal(spoken.find(x=>x.key==='healthFund')?.value,'BARMER');

const transcript=C.transcriptFromLines([
  '[00:00:00.000 --> 00:00:02.000] Mein Vorname ist Alex.',
  '[00:00:02.000 --> 00:00:05.000] Meine Krankenkasse ist BARMER.'
]);
assert.equal(transcript,'Mein Vorname ist Alex. Meine Krankenkasse ist BARMER.');
console.log('capture tests: OK');
