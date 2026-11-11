/* Test automatici della logica (nessuna dipendenza). Esecuzione: node tests/run-tests.js */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const base = path.join(__dirname, '..', 'app', 'js', 'core');
['versione', 'dates', 'params', 'calendar', 'model', 'predib', 'incamera', 'storage', 'filedati', 'xlsx', 'importer'].forEach(function (m) {
  require(path.join(base, m + '.js'));
});
const GC = globalThis.GC;
const D = GC.dates;

let passati = 0;
let falliti = 0;
const pendenti = [];

function test(nome, fn) {
  pendenti.push({ nome: nome, fn: fn });
}

async function esegui() {
  for (const t of pendenti) {
    try {
      await t.fn();
      passati++;
      console.log('  ok   ' + t.nome);
    } catch (e) {
      falliti++;
      console.log('  FAIL ' + t.nome + '\n       ' + (e && e.message ? e.message : e));
    }
  }
  console.log('\n' + passati + ' test superati, ' + falliti + ' falliti');
  process.exit(falliti ? 1 : 0);
}

function statoDemo() {
  const s = GC.model.newState();
  s.parametri.giorniUdienza.settimanali = [2, 4]; // martedì e giovedì
  GC.model.clock = function () {
    return '2026-01-01T00:00:00.000Z';
  };
  return s;
}

// ---------- date e festività ----------
test('Pasqua: valori noti 2024-2030', function () {
  const attese = { 2024: '2024-03-31', 2025: '2025-04-20', 2026: '2026-04-05', 2027: '2027-03-28', 2028: '2028-04-16', 2029: '2029-04-01', 2030: '2030-04-21' };
  Object.keys(attese).forEach(function (y) {
    assert.strictEqual(D.easter(+y), attese[y], 'Pasqua ' + y);
  });
});

test('Festività 2026: dodici date nazionali', function () {
  const h = D.holidays(2026, null);
  const attese = ['2026-01-01', '2026-01-06', '2026-04-05', '2026-04-06', '2026-04-25', '2026-05-01', '2026-06-02', '2026-08-15', '2026-11-01', '2026-12-08', '2026-12-25', '2026-12-26'];
  assert.deepStrictEqual(Object.keys(h).sort(), attese);
  assert.strictEqual(h['2026-04-06'], "Lunedì dell'Angelo");
});

test('Santo patrono opzionale', function () {
  const p = { attivo: true, mese: 12, giorno: 7, nome: 'Sant\'Ambrogio' };
  assert.strictEqual(D.holidayName('2026-12-07', p), "Santo patrono (Sant'Ambrogio)");
  assert.strictEqual(D.holidayName('2026-12-07', null), null);
});

test('Aritmetica sulle date e giorno della settimana', function () {
  assert.strictEqual(D.addDays('2026-11-03', 20), '2026-11-23');
  assert.strictEqual(D.addDays('2026-12-31', 1), '2027-01-01');
  assert.strictEqual(D.diffDays('2026-11-03', '2026-12-03'), 30);
  assert.strictEqual(D.isoWeekday('2026-11-03'), 2); // martedì
  assert.strictEqual(D.isoWeekday('2026-11-01'), 7); // domenica
  assert.strictEqual(D.isValidYmd('2026-02-29'), false);
  assert.strictEqual(D.isValidYmd('2028-02-29'), true);
});

test('Ore: conversione in minuti e ritorno', function () {
  assert.strictEqual(D.hhmmToMin('09:00'), 540);
  assert.strictEqual(D.hhmmToMin('9.30'), 570);
  assert.ok(isNaN(D.hhmmToMin('25:00')));
  assert.strictEqual(D.minToHhmm(615), '10:15');
});

// ---------- giorni di udienza ----------
test('Giorni di udienza: settimanali, festivi, agosto, indisponibilità, giorni extra', function () {
  const s = statoDemo();
  assert.strictEqual(GC.calendar.dayStatus(s, '2026-11-03').stato, 'udienza'); // martedì
  assert.strictEqual(GC.calendar.dayStatus(s, '2026-11-04').stato, 'libero'); // mercoledì
  assert.strictEqual(GC.calendar.dayStatus(s, '2026-12-08').stato, 'bloccato'); // martedì ma festivo
  assert.strictEqual(GC.calendar.dayStatus(s, '2026-12-08').nome, 'Immacolata Concezione');
  assert.strictEqual(GC.calendar.dayStatus(s, '2026-08-04').stato, 'bloccato'); // martedì di agosto
  assert.strictEqual(GC.calendar.dayStatus(s, '2026-08-04').blocco.tipo, 'feriale');
  s.parametri.indisponibilita.push({ da: '2026-11-10', a: '2026-11-12', motivo: 'Corso di formazione' });
  assert.strictEqual(GC.calendar.dayStatus(s, '2026-11-10').stato, 'bloccato');
  assert.strictEqual(GC.calendar.dayStatus(s, '2026-11-10').nome, 'Corso di formazione');
  s.parametri.giorniUdienza.date.push('2026-11-06'); // venerdì extra
  assert.strictEqual(GC.calendar.dayStatus(s, '2026-11-06').stato, 'udienza');
  assert.strictEqual(GC.calendar.dayStatus(s, '2026-11-06').extra, true);
  s.parametri.feriale.attivo = false;
  assert.strictEqual(GC.calendar.dayStatus(s, '2026-08-04').stato, 'udienza');
});

test('Prossimi giorni di udienza saltano festivi e agosto', function () {
  const s = statoDemo();
  const g = GC.calendar.nextHearingDays(s, '2026-07-28', 4);
  assert.deepStrictEqual(g, ['2026-07-28', '2026-07-30', '2026-09-01', '2026-09-03']);
});

// ---------- giornata, capienza e vuoti ----------
test('Giornata vuota: 345 minuti utili e due vuoti attorno alla pausa', function () {
  const s = statoDemo();
  const t = GC.calendar.timeline(s, '2026-11-03');
  assert.strictEqual(t.utili, 345);
  assert.strictEqual(t.occupati, 0);
  assert.deepStrictEqual(
    t.vuoti.map(function (v) {
      return v.inizio + '-' + v.fine;
    }),
    ['09:00-14:00', '14:15-15:00']
  );
});

test('Giornata con blocco di incameramento da 90 minuti', function () {
  const s = statoDemo();
  const r = GC.model.addEvento(s, { data: '2026-11-03', inizio: '09:00', durata: 90, tipo: 'INCAMERAMENTO' });
  assert.ok(r.ok);
  const t = GC.calendar.timeline(s, '2026-11-03');
  assert.strictEqual(t.occupati, 90);
  assert.strictEqual(t.liberi, 255);
  assert.strictEqual(Math.round(t.saturazione * 1000), 261);
  assert.deepStrictEqual(
    t.vuoti.map(function (v) {
      return v.inizio + '-' + v.fine + ':' + v.durata;
    }),
    ['10:30-14:00:210', '14:15-15:00:45']
  );
});

test('Predibattimento: 34 fascicoli da 10 minuti riempiono la fascia utile', function () {
  const s = statoDemo();
  let c = D.hhmmToMin('09:00');
  let n = 0;
  while (n < 34) {
    if (c >= D.hhmmToMin('14:00') && c < D.hhmmToMin('14:15')) c = D.hhmmToMin('14:15');
    const r = GC.model.addEvento(s, { data: '2026-11-03', inizio: D.minToHhmm(c), durata: 10, tipo: 'PREDIB' });
    assert.ok(r.ok, r.errori && r.errori[0]);
    c += 10;
    n++;
  }
  const t = GC.calendar.timeline(s, '2026-11-03');
  assert.strictEqual(t.occupati, 340);
  assert.strictEqual(t.liberi, 5);
  assert.strictEqual(t.vuoti.length, 0);
  assert.strictEqual(t.margini.length, 1); // 5 minuti: margine, non vuoto
  assert.strictEqual(t.conflitti.length, 0);
});

test('Pausa, tolleranza fino alle 15:30 e oltre', function () {
  const s = statoDemo();
  const a = GC.calendar.checkEvent(s, { data: '2026-11-03', inizio: '13:50', durata: 20, stato: 'ufficiale' });
  assert.ok(a.some(function (x) { return x.codice === 'in-pausa'; }));
  const b = GC.calendar.checkEvent(s, { data: '2026-11-03', inizio: '14:50', durata: 30, stato: 'ufficiale' });
  assert.ok(b.some(function (x) { return x.codice === 'in-tolleranza'; }));
  assert.ok(!b.some(function (x) { return x.livello === 'errore'; }));
  const c = GC.calendar.checkEvent(s, { data: '2026-11-03', inizio: '15:00', durata: 40, stato: 'ufficiale' });
  assert.ok(c.some(function (x) { return x.codice === 'oltre-tolleranza' && x.livello === 'errore'; }));
});

test('Sovrapposizioni segnalate, salvo forzatura; i provvisori non occupano', function () {
  const s = statoDemo();
  GC.model.addEvento(s, { data: '2026-11-03', inizio: '09:00', durata: 60, tipo: 'ISTRUTTORIA' });
  const sovr = GC.calendar.checkEvent(s, { data: '2026-11-03', inizio: '09:30', durata: 30, stato: 'ufficiale' });
  assert.ok(sovr.some(function (x) { return x.codice === 'sovrapposto'; }));
  const prov = GC.calendar.checkEvent(s, { data: '2026-11-03', inizio: '09:30', durata: 30, stato: 'provvisorio' });
  assert.ok(!prov.some(function (x) { return x.codice === 'sovrapposto'; }));
  GC.model.addEvento(s, { data: '2026-11-03', inizio: '11:00', durata: 30, tipo: 'ALTRO', stato: 'provvisorio' });
  const t = GC.calendar.timeline(s, '2026-11-03');
  assert.strictEqual(t.occupati, 60); // il provvisorio non conta
  assert.strictEqual(t.eventi.length, 2);
});

test('Vuoti sotto la soglia sono margini', function () {
  const s = statoDemo();
  GC.model.addEvento(s, { data: '2026-11-03', inizio: '09:00', durata: 175, tipo: 'ISTRUTTORIA' }); // fino alle 11:55
  GC.model.addEvento(s, { data: '2026-11-03', inizio: '12:00', durata: 120, tipo: 'ISTRUTTORIA' }); // fino alle 14:00
  const t = GC.calendar.timeline(s, '2026-11-03');
  assert.strictEqual(t.margini.length, 1);
  assert.strictEqual(t.margini[0].durata, 5);
  assert.deepStrictEqual(t.vuoti.map(function (v) { return v.inizio; }), ['14:15']);
});

test('Griglia del mese: settimane da lunedì, 7 giorni ciascuna', function () {
  const s = statoDemo();
  const g = GC.calendar.monthGrid(s, 2026, 11);
  assert.ok(g.every(function (w) { return w.length === 7; }));
  assert.strictEqual(g[0][0].data, '2026-10-26'); // 1 nov 2026 è domenica
  assert.strictEqual(g[g.length - 1][6].data, '2026-12-06');
  assert.strictEqual(g[0][6].inMese, true);
  assert.strictEqual(g[0][0].inMese, false);
});

// ---------- modello ----------
test('Fascicoli: RG unico, identificatori progressivi, storico', function () {
  const s = statoDemo();
  const a = GC.model.addFascicolo(s, { rg: '10/2026', imputato: 'Mario Rossi', origine: 'GUP' });
  assert.strictEqual(a.valore.id, 'F00001');
  const dup = GC.model.addFascicolo(s, { rg: ' 10 / 2026', imputato: 'Altro' });
  assert.strictEqual(dup.ok, false);
  const b = GC.model.addFascicolo(s, { rg: '11/2026' });
  assert.strictEqual(b.valore.id, 'F00002');
  assert.strictEqual(GC.model.addFascicolo(s, {}).ok, false);
  assert.strictEqual(s.storico.length, 2);
});

test('Attività: validazione, modifica, eliminazione', function () {
  const s = statoDemo();
  assert.strictEqual(GC.model.addEvento(s, { data: '2026-02-30', inizio: '09:00', durata: 10, tipo: 'ALTRO' }).ok, false);
  assert.strictEqual(GC.model.addEvento(s, { data: '2026-11-03', inizio: '9', durata: 10, tipo: 'ALTRO' }).ok, false);
  assert.strictEqual(GC.model.addEvento(s, { data: '2026-11-03', inizio: '09:00', durata: 0, tipo: 'ALTRO' }).ok, false);
  const r = GC.model.addEvento(s, { data: '2026-11-03', inizio: '9:05', durata: 20, tipo: 'RISERVA' });
  assert.ok(r.ok);
  assert.strictEqual(r.valore.inizio, '09:05');
  assert.ok(GC.model.updateEvento(s, r.valore.id, { durata: 30 }).ok);
  assert.strictEqual(GC.model.getEvento(s, r.valore.id).durata, 30);
  assert.ok(GC.model.deleteEvento(s, r.valore.id).ok);
  assert.strictEqual(s.eventi.length, 0);
});

test('Eliminare un fascicolo con attività richiede conferma', function () {
  const s = statoDemo();
  const f = GC.model.addFascicolo(s, { rg: '1/2026' }).valore;
  GC.model.addEvento(s, { fascicoloId: f.id, data: '2026-11-03', inizio: '09:00', durata: 10, tipo: 'ALTRO' });
  const r = GC.model.deleteFascicolo(s, f.id);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.richiedeConferma, true);
  assert.ok(GC.model.deleteFascicolo(s, f.id, { conAttivita: true }).ok);
  assert.strictEqual(s.eventi.length, 0);
});

// ---------- parametri ----------
test('Parametri: coerenza degli orari', function () {
  const p = GC.params.defaults();
  assert.deepStrictEqual(GC.params.validate(p), []);
  p.orario.pausaInizio = '16:00';
  assert.ok(GC.params.validate(p).length > 0);
  const q = GC.params.load({ orario: { fine: '14:30' } });
  assert.strictEqual(q.orario.fine, '14:30');
  assert.strictEqual(q.orario.inizio, '09:00');
});

// ---------- lettura file ----------
test('CSV italiano: separatore ; virgolette e doppie virgolette', async function () {
  const buf = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.csv'));
  const r = await GC.xlsx.leggiFile('sample.csv', buf);
  const righe = r.fogli[0].righe;
  assert.strictEqual(righe.length, 3);
  assert.strictEqual(righe[1][1], 'Rossi, Mario');
  assert.strictEqual(righe[2][1], 'Bianchi "Gigi" Luca');
});

test('Excel: legge testi, date, ore e numeri', async function () {
  const buf = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.xlsx'));
  const r = await GC.xlsx.leggiFile('sample.xlsx', buf);
  assert.strictEqual(r.fogli.length, 1);
  assert.strictEqual(r.fogli[0].nome, 'Udienze 2026');
  const righe = r.fogli[0].righe;
  assert.strictEqual(righe[0][0], 'Ruolo udienze - elenco di prova (dati inventati)');
  assert.strictEqual(righe[1][3], 'Data udienza');
  const prima = righe[2];
  assert.strictEqual(prima[0], '101/2026');
  assert.strictEqual(prima[3].__date, true);
  assert.strictEqual(prima[3].ymd, '2026-11-10');
  assert.strictEqual(prima[4].hhmm, '09:00');
  assert.strictEqual(prima[5], 90);
});

// ---------- importazione ----------
function mappaDemo(righe) {
  const h = GC.importer.trovaIntestazione(righe);
  return { riga: h, mapping: GC.importer.indovinaColonne(righe[h]) };
}

test('Importazione: riconosce intestazione e colonne', async function () {
  const buf = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.xlsx'));
  const righe = (await GC.xlsx.leggiFile('sample.xlsx', buf)).fogli[0].righe;
  const m = mappaDemo(righe);
  assert.strictEqual(m.riga, 1);
  const c = m.mapping;
  assert.strictEqual(c.rg, 0);
  assert.strictEqual(c.imputato, 1);
  assert.strictEqual(c.origine, 2);
  assert.strictEqual(c.data, 3);
  assert.strictEqual(c.inizio, 4);
  assert.strictEqual(c.durata, 5);
  assert.strictEqual(c.tipo, 6);
  assert.strictEqual(c.detenuto, 7);
  assert.strictEqual(c.note, 8);
});

test('Importazione: formati di data, ora e durata', function () {
  const I = GC.importer;
  assert.strictEqual(I.analizzaData('10/11/2026').ymd, '2026-11-10');
  assert.strictEqual(I.analizzaData('3 dicembre 2026').ymd, '2026-12-03');
  assert.strictEqual(I.analizzaData('mar 3 nov 2026').ymd, '2026-11-03');
  assert.strictEqual(I.analizzaData('2026-11-03').ymd, '2026-11-03');
  assert.strictEqual(I.analizzaData('03/11/2026 09:30').hhmm, '09:30');
  assert.ok(I.analizzaData('31/02/2026').errore);
  assert.strictEqual(I.analizzaData(46000).ok, true);
  assert.strictEqual(I.analizzaOra('09.30').hhmm, '09:30');
  assert.strictEqual(I.analizzaOra(0.375).hhmm, '09:00');
  assert.strictEqual(I.analizzaOra('ore 9').hhmm, '09:00');
  assert.ok(I.analizzaOra('25:00').errore);
  assert.strictEqual(I.analizzaDurata('30 min').min, 30);
  assert.strictEqual(I.analizzaDurata('1,5 h').min, 90);
  assert.strictEqual(I.analizzaDurata('1h30').min, 90);
  assert.strictEqual(I.analizzaDurata('1:30').min, 90);
  assert.strictEqual(I.analizzaDurata(1.5, 'ore').min, 90);
  assert.strictEqual(I.analizzaDurata(45).min, 45);
  assert.ok(I.analizzaDurata('boh').errore);
  assert.strictEqual(I.analizzaTipo('Istruttoria testimoni').tipo, 'ISTRUTTORIA');
  assert.strictEqual(I.analizzaTipo('Scioglimento riserva').tipo, 'RISERVA');
  assert.strictEqual(I.analizzaTipo('abbreviato').tipo, 'RITI');
  assert.strictEqual(I.analizzaTipo('Udienza strana').tipo, 'ALTRO');
});

test('Importazione: anteprima con errori, duplicati, ora mancante e durata predefinita', async function () {
  const buf = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.xlsx'));
  const righe = (await GC.xlsx.leggiFile('sample.xlsx', buf)).fogli[0].righe;
  const s = statoDemo();
  const m = mappaDemo(righe);
  const piano = GC.importer.pianifica(s, righe, m.riga, m.mapping, {});
  const r = piano.riepilogo;
  assert.strictEqual(r.totale, 7); // la riga vuota è ignorata
  assert.strictEqual(r.errori, 1); // 31/02/2026
  assert.strictEqual(r.duplicati, 1); // seconda riga 101/2026
  assert.strictEqual(r.valide, 5);
  const senzaOra = piano.righe.find(function (v) { return v.riga === 5; });
  assert.strictEqual(senzaOra.evento.inizio, '10:30'); // dopo l'incameramento 09:00-10:30 dello stesso giorno
  assert.strictEqual(senzaOra.evento.durata, 90);
  const mapRiga = piano.righe.find(function (v) { return v.riga === 10; });
  assert.strictEqual(mapRiga.evento.durata, 10); // durata predefinita
  assert.ok(mapRiga.avvisi.some(function (a) { return /predefinita/.test(a); }));
  assert.strictEqual(piano.righe.find(function (v) { return v.riga === 4; }).evento.inizio, '09:30');
  assert.strictEqual(piano.righe.find(function (v) { return v.riga === 4; }).evento.durata, 30);
});

test('Importazione: applica, evita i duplicati e si può annullare', async function () {
  const buf = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.xlsx'));
  const righe = (await GC.xlsx.leggiFile('sample.xlsx', buf)).fogli[0].righe;
  const s = statoDemo();
  const m = mappaDemo(righe);
  const piano = GC.importer.pianifica(s, righe, m.riga, m.mapping, {});
  const r = GC.importer.applica(s, piano, { file: 'sample.xlsx', foglio: 'Udienze 2026' });
  assert.strictEqual(r.eventi, 5);
  assert.strictEqual(r.fascicoli, 5);
  assert.strictEqual(s.eventi.length, 5);
  assert.ok(s.eventi.every(function (e) { return e.fonte === 'import:' + r.importId; }));
  const f = GC.model.findFascicoloByRg(s, '101/2026');
  assert.strictEqual(f.origine, 'GUP');
  assert.strictEqual(GC.model.findFascicoloByRg(s, '102/2026').detenuto, true);
  // seconda importazione dello stesso file: tutto duplicato
  const piano2 = GC.importer.pianifica(s, righe, m.riga, m.mapping, {});
  assert.strictEqual(piano2.riepilogo.valide, 0);
  assert.strictEqual(piano2.riepilogo.duplicati, 6);
  const a = GC.importer.annulla(s, r.importId);
  assert.ok(a.ok);
  assert.strictEqual(s.eventi.length, 0);
  assert.strictEqual(s.fascicoli.length, 0);
  assert.strictEqual(s.importazioni.length, 0);
});

test('Importazione CSV: stesso flusso', async function () {
  const buf = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.csv'));
  const righe = (await GC.xlsx.leggiFile('sample.csv', buf)).fogli[0].righe;
  const s = statoDemo();
  const m = mappaDemo(righe);
  assert.strictEqual(m.riga, 0);
  const piano = GC.importer.pianifica(s, righe, m.riga, m.mapping, {});
  assert.strictEqual(piano.riepilogo.valide, 2);
  assert.strictEqual(piano.righe[1].evento.inizio, '10:30');
  assert.strictEqual(piano.righe[0].evento.tipo, 'INCAMERAMENTO');
});

test('Modello Excel fornito con l\'app: colonne riconosciute e riga di esempio valida', async function () {
  const buf = fs.readFileSync(path.join(__dirname, '..', 'app', 'modello_import.xlsx'));
  const r = await GC.xlsx.leggiFile('modello_import.xlsx', buf);
  assert.strictEqual(r.fogli[0].nome, 'Udienze');
  const righe = r.fogli[0].righe;
  const m = mappaDemo(righe);
  assert.strictEqual(m.riga, 0);
  const c = m.mapping;
  ['rg', 'imputato', 'origine', 'data', 'inizio', 'durata', 'tipo', 'stato', 'detenuto', 'note'].forEach(function (k) {
    assert.notStrictEqual(c[k], null, 'colonna non riconosciuta: ' + k);
  });
  const piano = GC.importer.pianifica(statoDemo(), righe, m.riga, c, {});
  assert.strictEqual(piano.riepilogo.valide, 1);
  assert.strictEqual(piano.righe[0].evento.tipo, 'INCAMERAMENTO');
  assert.strictEqual(piano.righe[0].evento.durata, 90);
  assert.strictEqual(piano.righe[0].fascicolo.origine, 'GUP');
});

// ---------- ruolo delle udienze reale (un foglio per giorno, più giudici) ----------
async function ruoloReale() {
  const buf = fs.readFileSync(path.join(__dirname, 'fixtures', 'ruolo_sintetico.xlsx'));
  const r = await GC.xlsx.leggiFile('ruolo_sintetico.xlsx', buf);
  const ril = GC.importer.rilevaRuolo(r.fogli);
  const tab = GC.importer.tabellaDaRuolo(r.fogli, ril);
  return { r: r, ril: ril, tab: tab };
}

test('Ruolo reale: riconosce i tre fogli e le date dai titoli', async function () {
  const x = await ruoloReale();
  assert.ok(x.ril.ok);
  assert.deepStrictEqual(x.ril.fogli.map(function (f) { return f.nome + '=' + f.data; }), ['2.11=2026-11-02', '9.11=2026-11-09', '16.11=2026-11-16']);
  assert.ok(x.ril.fogli.every(function (f) { return f.intestazione === 2 && f.mapping.rg === 1 && f.mapping.inizio === 8 && f.mapping.giudice === 5; }));
  assert.deepStrictEqual(GC.importer.valoriColonna(x.tab.righe, 0, x.tab.mapping.giudice), [{ valore: 'GIUDICE 1', righe: 43 }, { valore: 'GIUDICE 2', righe: 58 }]);
});

test('Ruolo reale: per GIUDICE 1 ci sono 43 righe e i tipi sono riconosciuti', async function () {
  const x = await ruoloReale();
  const s = statoDemo();
  s.parametri.giorniUdienza.settimanali = [1];
  const piano = GC.importer.pianifica(s, x.tab.righe, 0, x.tab.mapping, { giudice: 'GIUDICE 1' });
  assert.strictEqual(piano.riepilogo.totale, 43);
  assert.strictEqual(piano.riepilogo.valide, 43);
  assert.strictEqual(piano.riepilogo.errori, 0);
  assert.strictEqual(piano.riepilogo.altriGiudici, 58);
  const per = {};
  piano.righe.forEach(function (v) { per[v.evento.tipo] = (per[v.evento.tipo] || 0) + 1; });
  assert.deepStrictEqual(per, { DIBATTIMENTO: 3, PREDIB: 34, INCAMERAMENTO: 4, ESECUZIONE: 2 });
  const misura = piano.righe.find(function (v) { return /misura cautelare/.test(v.evento.note); });
  assert.strictEqual(misura.evento.tipo, 'DIBATTIMENTO');
  assert.strictEqual(misura.evento.titolo, 'misura cautelare: obbligo di presentazione');
  assert.strictEqual(piano.righe[0].evento.titolo, '');
  const perFoglio = {};
  piano.righe.forEach(function (v) { perFoglio[v.foglio] = (perFoglio[v.foglio] || 0) + 1; });
  assert.deepStrictEqual(perFoglio, { '2.11': 37, '9.11': 6 });
});

test('Ruolo reale: fascicoli, SIGE, RINVIO DAL e orari', async function () {
  const x = await ruoloReale();
  const s = statoDemo();
  const piano = GC.importer.pianifica(s, x.tab.righe, 0, x.tab.mapping, { giudice: 'GIUDICE 1' });
  const prima = piano.righe[0];
  assert.strictEqual(prima.fascicolo.rg, '7001/21');
  assert.strictEqual(prima.fascicolo.nrOrd, '501/25');
  assert.strictEqual(prima.fascicolo.reato, '640 CP');
  assert.strictEqual(prima.evento.data, '2026-11-02');
  assert.strictEqual(prima.evento.inizio, '09:00');
  assert.strictEqual(prima.evento.rinvioDal, '2026-06-15');
  const unaUd = piano.righe.find(function (v) { return v.riga === 5 && v.foglio === '2.11'; });
  assert.strictEqual(unaUd.evento.rinvioDal, '1 UD');
  assert.strictEqual(unaUd.evento.tipo, 'PREDIB');
  const sige = piano.righe.filter(function (v) { return v.evento.tipo === 'ESECUZIONE'; }).map(function (v) { return v.fascicolo.rg + '@' + v.evento.inizio; });
  assert.deepStrictEqual(sige, ['SIGE 534/26@14:00', 'SIGE 535/26@14:00']);
  const svil = piano.righe.filter(function (v) { return v.evento.tipo === 'INCAMERAMENTO'; });
  assert.ok(svil.every(function (v) { return v.fascicolo.origine === 'GUP'; }));
  assert.deepStrictEqual(svil.map(function (v) { return v.foglio + ' ' + v.evento.inizio; }), ['2.11 14:00', '9.11 12:30', '9.11 12:30', '9.11 14:30']);
});

test('Ruolo reale: stessa ora = sovrapponibili, nessun conflitto a calendario; seconda importazione tutta duplicata', async function () {
  const x = await ruoloReale();
  const s = statoDemo();
  const piano = GC.importer.pianifica(s, x.tab.righe, 0, x.tab.mapping, { giudice: 'GIUDICE 1' });
  const r = GC.importer.applica(s, piano, { file: 'ruolo_sintetico.xlsx', foglio: 'ruolo' });
  assert.strictEqual(r.eventi, 43);
  assert.strictEqual(r.fascicoli, 43);
  const t = GC.calendar.timeline(s, '2026-11-02');
  assert.strictEqual(t.eventi.length, 37);
  assert.strictEqual(t.conflitti.length, 0);
  const f = GC.model.findFascicoloByRg(s, 'SIGE 534/26');
  assert.strictEqual(f.reato, "incidente d'esecuzione");
  const piano2 = GC.importer.pianifica(s, x.tab.righe, 0, x.tab.mapping, { giudice: 'GIUDICE 1' });
  assert.strictEqual(piano2.riepilogo.valide, 0);
  assert.strictEqual(piano2.riepilogo.duplicati, 43);
  assert.ok(GC.importer.annulla(s, r.importId).ok);
  assert.strictEqual(s.eventi.length + s.fascicoli.length, 0);
});

test('Ruolo reale: con l\'altro giudice le righe sono diverse e il filtro funziona', async function () {
  const x = await ruoloReale();
  const s = statoDemo();
  const p2 = GC.importer.pianifica(s, x.tab.righe, 0, x.tab.mapping, { giudice: 'GIUDICE 2' });
  assert.strictEqual(p2.riepilogo.totale, 58);
  const tutti = GC.importer.pianifica(s, x.tab.righe, 0, x.tab.mapping, {});
  assert.strictEqual(tutti.riepilogo.totale, 101);
});

test('Un foglio normale (non ruolo) non viene scambiato per un ruolo', async function () {
  const buf = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.xlsx'));
  const r = await GC.xlsx.leggiFile('sample.xlsx', buf);
  assert.strictEqual(GC.importer.rilevaRuolo(r.fogli).ok, false);
});

// ---------- predibattimento (Fase 2) ----------
async function statoConRuolo() {
  const x = await ruoloReale();
  const s = statoDemo();
  s.parametri.giorniUdienza.settimanali = [1]; // lunedì
  const piano = GC.importer.pianifica(s, x.tab.righe, 0, x.tab.mapping, { giudice: 'GIUDICE 1' });
  GC.importer.applica(s, piano, { file: 'ruolo_sintetico.xlsx', foglio: 'ruolo' });
  return s;
}

function fascicoliNuovi(s, n, extra) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(GC.model.addFascicolo(s, Object.assign({ rg: 'P' + (s.fascicoli.length + 1) + '/2026', imputato: 'Prova ' + (s.fascicoli.length + 1), predibDaFissare: true }, extra || {})).valore);
  }
  return out;
}

test('Predib: la sola udienza vera del ruolo è il 2 novembre (26 alla prima udienza, 32 in tutto)', async function () {
  const s = await statoConRuolo();
  assert.deepStrictEqual(GC.predib.udienze(s), [{ data: '2026-11-02', prime: 26, totale: 32 }]);
});

test('Predib: data minima = notifica + 60 giorni (45 se urgente), e fascicoli senza notifica segnalati', function () {
  const s = statoDemo();
  const a = GC.model.addFascicolo(s, { rg: '1/26', notificaCitazione: '2026-10-20' }).valore;
  const b = GC.model.addFascicolo(s, { rg: '2/26', notificaCitazione: '2026-10-20', urgente: true }).valore;
  const c = GC.model.addFascicolo(s, { rg: '3/26' }).valore;
  assert.strictEqual(GC.predib.dataMinima(s, [a]).data, '2026-12-19');
  assert.strictEqual(GC.predib.dataMinima(s, [b]).data, '2026-12-04');
  assert.strictEqual(GC.predib.dataMinima(s, [a, b]).data, '2026-12-19');
  const m = GC.predib.dataMinima(s, [a, c]);
  assert.strictEqual(m.data, '2026-12-19');
  assert.deepStrictEqual(m.senzaNotifica, [c.id]);
});

test('Predib: 5 settimane dall\'udienza del 2 novembre, nei due versi', async function () {
  const s = await statoConRuolo();
  const f = fascicoliNuovi(s, 3, { notificaCitazione: '2026-09-01' });
  const prima = GC.predib.valuta(s, '2026-11-30', f, { oggi: '2026-11-03' });
  assert.strictEqual(prima.stato, 'rosso');
  assert.strictEqual(prima.giorniDaPrecedente, 28);
  const giusta = GC.predib.valuta(s, '2026-12-07', f, { oggi: '2026-11-03' });
  assert.strictEqual(giusta.stato, 'verde');
  assert.strictEqual(giusta.giorniDaPrecedente, 35);
  assert.strictEqual(giusta.posti, 30); // massimo 30 fascicoli per udienza (circa 5 ore)
  // anche prima di un'udienza già fissata
  GC.predib.fissa(s, '2026-12-07', fascicoliNuovi(s, 6), {});
  const troppoVicino = GC.predib.valuta(s, '2026-11-09', f, { oggi: '2026-11-03' });
  assert.strictEqual(troppoVicino.stato, 'rosso');
  const prima2 = GC.predib.valuta(s, '2026-12-14', f, { oggi: '2026-11-03' });
  assert.strictEqual(prima2.stato, 'rosso'); // 7 giorni dopo il 7 dicembre
});

test('Predib: le date prima della notifica + 60 giorni sono rosse', async function () {
  const s = await statoConRuolo();
  const f = fascicoliNuovi(s, 2, { notificaCitazione: '2026-10-20' });
  const r = GC.predib.valuta(s, '2026-12-14', f, { oggi: '2026-11-03' });
  assert.strictEqual(r.stato, 'rosso');
  assert.ok(r.motivi.some(function (m) { return /data minima 19\/12\/2026/.test(m); }));
  assert.strictEqual(GC.predib.valuta(s, '2026-12-21', f, { oggi: '2026-11-03' }).stato, 'verde');
});

test('Predib: prima data proposta e ordine "più comoda per studiare"', async function () {
  const s = await statoConRuolo();
  const f = fascicoliNuovi(s, 5, { notificaCitazione: '2026-09-01', ricezione: '2026-11-03' });
  const c1 = GC.predib.candidate(s, f, { oggi: '2026-11-03', ordine: 'prima', giorni: 90 });
  assert.strictEqual(c1.minimo.data, '2026-10-31');
  const buone = c1.righe.filter(function (x) { return x.stato !== 'rosso'; });
  assert.deepStrictEqual(buone.slice(0, 3).map(function (x) { return x.data; }), ['2026-12-07', '2026-12-14', '2026-12-21']);
  const c2 = GC.predib.candidate(s, f, { oggi: '2026-11-03', ordine: 'studio', giorni: 90 });
  const b2 = c2.righe.filter(function (x) { return x.stato !== 'rosso'; });
  assert.strictEqual(b2[0].data, '2026-12-07');
  assert.strictEqual(b2[0].giorniLiberiStudio, 8);
  assert.strictEqual(b2.find(function (x) { return x.data === '2026-12-14'; }).giorniLiberiStudio, 7); // l'8 dicembre è festivo
  assert.ok(c1.righe.filter(function (x) { return x.stato === 'rosso'; }).every(function (x) { return x.data < '2026-12-07'; }));
});

test('Predib: capienza e orari (34 fascicoli da 10 minuti, pausa libera, tolleranza solo se richiesta)', function () {
  const s = statoDemo();
  const a = GC.predib.assegnaOrari(s, '2026-11-03', 34, {});
  assert.strictEqual(a.mancanti, 0);
  assert.strictEqual(a.orari[0], '09:00');
  assert.strictEqual(a.orari[29], '13:50');
  assert.strictEqual(a.orari[30], '14:15'); // la pausa 14:00-14:15 resta libera
  assert.strictEqual(a.orari[33], '14:45');
  const b = GC.predib.assegnaOrari(s, '2026-11-03', 36, {});
  assert.strictEqual(b.mancanti, 2);
  const c = GC.predib.assegnaOrari(s, '2026-11-03', 36, { usaTolleranza: true });
  assert.strictEqual(c.mancanti, 0);
  assert.deepStrictEqual(c.orari.slice(34), ['15:00', '15:10']);
});

test('Predib: fissare i fascicoli crea attività di prima udienza e li toglie dall\'elenco "da fissare"', function () {
  const s = statoDemo();
  s.parametri.giorniUdienza.settimanali = [1];
  const f = fascicoliNuovi(s, 8);
  const r = GC.predib.fissa(s, '2026-12-07', f, {});
  assert.strictEqual(r.creati, 8);
  assert.strictEqual(r.nonCollocati, 0);
  const ev = s.eventi.filter(function (e) { return e.data === '2026-12-07'; });
  assert.strictEqual(ev.length, 8);
  assert.ok(ev.every(function (e) { return e.tipo === 'PREDIB' && e.durata === 10 && e.rinvioDal === '1 UD'; }));
  assert.strictEqual(ev[0].inizio, '09:00');
  assert.strictEqual(ev[7].inizio, '10:10');
  assert.ok(s.fascicoli.every(function (x) { return x.predibDaFissare === false; }));
  assert.deepStrictEqual(GC.predib.udienze(s).map(function (u) { return u.data + ':' + u.prime; }), ['2026-12-07:8']);
  assert.strictEqual(GC.calendar.timeline(s, '2026-12-07').conflitti.length, 0);
});

test('Predib: giornata già carica = data gialla con il numero di posti', function () {
  const s = statoDemo();
  s.parametri.giorniUdienza.settimanali = [1];
  GC.predib.fissa(s, '2026-12-07', fascicoliNuovi(s, 20), {});
  const nuovi = fascicoliNuovi(s, 20, { rg: undefined });
  const v = GC.predib.valuta(s, '2026-12-07', nuovi, { oggi: '2026-11-03' });
  assert.strictEqual(v.posti, 10);
  assert.strictEqual(v.stato, 'giallo');
  assert.ok(v.motivi.some(function (m) { return /Entrano solo 10 fascicoli su 20 \(massimo 30 per udienza/.test(m); }));
});

test('Predib: riepilogo delle udienze con il controllo delle cinque settimane', async function () {
  const s = await statoConRuolo();
  GC.predib.fissa(s, '2026-12-07', fascicoliNuovi(s, 6), {});
  GC.predib.fissa(s, '2026-12-28', fascicoliNuovi(s, 6), {}); // 21 giorni dopo: non rispetta
  const r = GC.predib.riepilogoUdienze(s);
  assert.deepStrictEqual(r.map(function (u) { return u.data + ' ' + u.giorniDaPrecedente + ' ' + u.rispetta; }), ['2026-11-02 null true', '2026-12-07 35 true', '2026-12-28 21 false']);
});

test('Predib: anche un piccolo gruppo fissato con l\'app conta come udienza (5 settimane valgono subito)', function () {
  const s = statoDemo();
  s.parametri.giorniUdienza.settimanali = [1];
  GC.predib.fissa(s, '2026-12-07', fascicoliNuovi(s, 3), {});
  assert.deepStrictEqual(GC.predib.udienze(s).map(function (u) { return u.data; }), ['2026-12-07']);
  const f = fascicoliNuovi(s, 2, { notificaCitazione: '2026-09-01' });
  assert.strictEqual(GC.predib.valuta(s, '2026-12-14', f, { oggi: '2026-11-03' }).stato, 'rosso');
  assert.strictEqual(GC.predib.valuta(s, '2027-01-11', f, { oggi: '2026-11-03' }).stato, 'verde');
});

test('Predib: piano per 70 fascicoli = gruppi da 30, 30, 10 a 5 settimane l\'uno dall\'altro', async function () {
  const s = await statoConRuolo();
  const f = fascicoliNuovi(s, 70, { notificaCitazione: '2026-09-01' });
  const prima = JSON.stringify(s);
  const p = GC.predib.piano(s, f, { oggi: '2026-11-03' });
  assert.strictEqual(JSON.stringify(s), prima); // il piano non modifica lo stato
  assert.deepStrictEqual(p.map(function (g) { return g.ids.length; }), [30, 30, 10]);
  assert.deepStrictEqual(p.map(function (g) { return g.data; }), ['2026-12-07', '2027-01-11', '2027-02-15']);
  assert.ok(p.every(function (g) { return g.stato === 'verde'; }));
  // applicando il piano: 10 minuti esatti tra un fascicolo e il successivo, nessuna sovrapposizione
  p.forEach(function (g) {
    GC.predib.fissa(s, g.data, g.ids.map(function (id) { return GC.model.getFascicolo(s, id); }), {});
  });
  const giorno = GC.calendar.timeline(s, '2026-12-07');
  assert.strictEqual(giorno.eventi.length, 30);
  giorno.eventi.forEach(function (e, i) {
    assert.strictEqual(e.startMin, 540 + i * 10);
    assert.strictEqual(e.durata, 10);
  });
  assert.strictEqual(giorno.conflitti.length, 0);
  assert.strictEqual(GC.calendar.timeline(s, '2027-02-15').eventi.length, 10);
  assert.ok(GC.predib.riepilogoUdienze(s).every(function (u) { return u.rispetta; }));
});

test('Predib: ordine del piano = urgenti, poi notifica più vecchia', function () {
  const s = statoDemo();
  s.parametri.giorniUdienza.settimanali = [1];
  const a = GC.model.addFascicolo(s, { rg: 'A/26', notificaCitazione: '2026-09-10', predibDaFissare: true }).valore;
  const b = GC.model.addFascicolo(s, { rg: 'B/26', notificaCitazione: '2026-09-01', predibDaFissare: true }).valore;
  const c = GC.model.addFascicolo(s, { rg: 'C/26', notificaCitazione: '2026-09-20', urgente: true, predibDaFissare: true }).valore;
  const p = GC.predib.piano(s, [a, b, c], { oggi: '2026-11-03', perUdienza: 2 });
  assert.deepStrictEqual(p[0].ids, [c.id, b.id]);
  assert.deepStrictEqual(p[1].ids, [a.id]);
  assert.ok(p[1].data >= GC.dates.addDays(p[0].data, 35));
});

test('Predib: massimo 30 fascicoli per udienza (5 ore): con 25 già fissati ne entrano 5 su 8', function () {
  const s = statoDemo();
  s.parametri.giorniUdienza.settimanali = [1];
  GC.predib.fissa(s, '2026-12-07', fascicoliNuovi(s, 25, { notificaCitazione: '2026-09-01' }), {});
  const nuovi = fascicoliNuovi(s, 8, { notificaCitazione: '2026-09-01' });
  const v = GC.predib.valuta(s, '2026-12-07', nuovi, { oggi: '2026-11-03' });
  assert.strictEqual(v.giaFissati, 25);
  assert.strictEqual(v.posti, 5);
  assert.strictEqual(v.stato, 'giallo');
  assert.ok(v.motivi.some(function (m) { return /Entrano solo 5 fascicoli su 8/.test(m); }));
  // 30 fascicoli da 10 minuti occupano 5 ore: 09:00-14:00
  const giorno = GC.calendar.timeline(s, '2026-12-07');
  assert.strictEqual(giorno.occupati, 250);
});

// ---------- incameramento (Fase 3) ----------
test('Mesi: aggiungere mesi di calendario senza uscire dal mese', function () {
  assert.strictEqual(D.addMonths('2026-11-09', 3), '2027-02-09');
  assert.strictEqual(D.addMonths('2026-08-31', 1), '2026-09-30');
  assert.strictEqual(D.addMonths('2027-01-31', 1), '2027-02-28');
  assert.strictEqual(D.addMonths('2026-12-15', 6), '2027-06-15');
});

test('Incameramento: gli slot del ruolo reale (2 novembre 14:00 e 9 novembre 12:30 e 14:30)', async function () {
  const s = await statoConRuolo();
  assert.deepStrictEqual(GC.incamera.blocchi(s).map(function (b) { return b.data + ' ' + b.inizio + ' n=' + b.n; }), ['2026-11-02 14:00 n=1', '2026-11-09 12:30 n=2', '2026-11-09 14:30 n=1']);
});

test('Incameramento: data minima 20 giorni (GUP e predibattimento), 30 giorni (immediato)', function () {
  const s = statoDemo();
  const g = GC.model.addFascicolo(s, { rg: 'G/26', origine: 'GUP', dataProvvedimento: '2026-11-20' }).valore;
  const p = GC.model.addFascicolo(s, { rg: 'P/26', origine: 'PREDIB', dataProvvedimento: '2026-11-20' }).valore;
  const i = GC.model.addFascicolo(s, { rg: 'I/26', origine: 'IMMEDIATO', dataProvvedimento: '2026-11-20' }).valore;
  const n = GC.model.addFascicolo(s, { rg: 'N/26', origine: 'GUP' }).valore;
  assert.strictEqual(GC.incamera.dataMinima(s, [g]).data, '2026-12-10');
  assert.strictEqual(GC.incamera.dataMinima(s, [p]).data, '2026-12-10');
  assert.strictEqual(GC.incamera.dataMinima(s, [i]).data, '2026-12-20');
  assert.strictEqual(GC.incamera.dataMinima(s, [g, i]).data, '2026-12-20');
  assert.deepStrictEqual(GC.incamera.dataMinima(s, [n]), { data: null, senzaData: [n.id] });
  assert.strictEqual(GC.incamera.fineTermineRiti(s, i), '2026-12-05');
  assert.strictEqual(GC.incamera.fineTermineRiti(s, g), null);
});

test('Incameramento: GUP ogni 3 mesi dall\'ultimo incameramento (9 novembre), immediato senza cadenza', async function () {
  const s = await statoConRuolo();
  const g = GC.model.addFascicolo(s, { rg: 'G/26', origine: 'GUP', dataProvvedimento: '2026-11-20' }).valore;
  const c = GC.incamera.candidate(s, [g], { oggi: '2026-11-03', giorni: 200 });
  assert.strictEqual(c.minimo.data, '2026-12-10');
  assert.strictEqual(c.righe[0].data, '2027-02-15'); // primo lunedì idoneo: 9 febbraio + giorni
  assert.strictEqual(c.righe[0].stato, 'verde');
  const dic = GC.incamera.valuta(s, '2026-12-14', [g]);
  assert.strictEqual(dic.stato, 'giallo');
  assert.ok(dic.motivi.some(function (m) { return /Meno di 3 mesi dall'incameramento da gup del 09\/11\/2026/.test(m); }));
  assert.strictEqual(GC.incamera.valuta(s, '2026-12-07', [g]).stato, 'rosso'); // prima del 10 dicembre
  const i = GC.model.addFascicolo(s, { rg: 'I/26', origine: 'IMMEDIATO', dataProvvedimento: '2026-11-20' }).valore;
  assert.strictEqual(GC.incamera.valuta(s, '2026-12-21', [i]).stato, 'verde');
  assert.strictEqual(GC.incamera.valuta(s, '2026-12-14', [i]).stato, 'rosso');
});

test('Incameramento: uno slot da 90 minuti per tutti i fascicoli, a prescindere dal numero', function () {
  const s = statoDemo();
  s.parametri.giorniUdienza.settimanali = [1];
  const f = [];
  for (let k = 0; k < 7; k++) f.push(GC.model.addFascicolo(s, { rg: 'F' + (k + 1) + '/26', origine: 'GUP', dataProvvedimento: '2026-10-01' }).valore);
  const a = GC.incamera.fissa(s, '2026-12-14', f.slice(0, 4), {});
  assert.strictEqual(a.inizio, '09:00');
  const v = GC.incamera.valuta(s, '2026-12-14', f.slice(4), { oggi: '2026-11-03' });
  assert.strictEqual(v.esistente, true);
  assert.strictEqual(v.nEsistenti, 4);
  assert.strictEqual(v.mediaMinuti, 12); // 90 / (4 + 3)
  GC.incamera.fissa(s, '2026-12-14', f.slice(4), {});
  const t = GC.calendar.timeline(s, '2026-12-14');
  assert.strictEqual(t.eventi.length, 7);
  assert.strictEqual(t.occupati, 90); // lo slot è uno solo
  assert.strictEqual(t.conflitti.length, 0);
  assert.ok(t.eventi.every(function (e) { return e.inizio === '09:00' && e.durata === 90; }));
  assert.strictEqual(GC.incamera.blocchi(s)[0].n, 7);
  assert.strictEqual(GC.incamera.riepilogo(s, '2026-11-03')[0].mediaMinuti, 12); // 90 / 7
  assert.ok(s.fascicoli.every(function (x) { return x.incameramentoDaFissare === false; }));
});

test('Incameramento e predibattimento: 30 fascicoli (5 ore) non lasciano spazio per 90 minuti nella stessa giornata', function () {
  const s = statoDemo();
  s.parametri.giorniUdienza.settimanali = [1];
  GC.predib.fissa(s, '2026-12-07', fascicoliNuovi(s, 30, { notificaCitazione: '2026-09-01' }), {});
  const g = GC.model.addFascicolo(s, { rg: 'G/26', origine: 'GUP', dataProvvedimento: '2026-10-01' }).valore;
  const v = GC.incamera.valuta(s, '2026-12-07', [g]);
  assert.strictEqual(v.stato, 'giallo');
  assert.ok(v.motivi.some(function (m) { return /spazio libero di 90 minuti/.test(m); }));
  // il giorno dopo l'udienza, con meno fascicoli, lo slot da 90 minuti si colloca dopo
  const s2 = statoDemo();
  s2.parametri.giorniUdienza.settimanali = [1];
  GC.predib.fissa(s2, '2026-12-07', fascicoliNuovi(s2, 10, { notificaCitazione: '2026-09-01' }), {});
  const g2 = GC.model.addFascicolo(s2, { rg: 'G/26', origine: 'GUP', dataProvvedimento: '2026-10-01' }).valore;
  const r = GC.incamera.fissa(s2, '2026-12-07', [g2], {});
  assert.strictEqual(r.inizio, '10:40'); // dopo i 10 predibattimenti (09:00-10:40)
});

test('Incameramento: chiusura delle liste (D-30 immediati, D-20 GUP e predibattimento) e lista definitiva', function () {
  const s = statoDemo();
  s.parametri.giorniUdienza.settimanali = [1];
  const g = GC.model.addFascicolo(s, { rg: 'G/27', origine: 'GUP', dataProvvedimento: '2027-01-10' }).valore;
  const i = GC.model.addFascicolo(s, { rg: 'I/27', origine: 'IMMEDIATO', dataProvvedimento: '2027-01-16' }).valore;
  GC.incamera.fissa(s, '2027-02-15', [g, i], {});
  const r = (opz) => GC.incamera.riepilogo(s, opz)[0];
  const x = r('2027-01-10');
  assert.strictEqual(x.chiusuraImmediati, '2027-01-16');
  assert.strictEqual(x.chiusuraGupPredib, '2027-01-26');
  assert.strictEqual(x.definitivaDal, '2027-01-31'); // 16 gennaio + 15 giorni = D-15
  assert.strictEqual(x.stato, 'aperta');
  assert.strictEqual(r('2027-01-20').stato, 'chiusa-immediati');
  assert.strictEqual(r('2027-01-27').stato, 'chiusa');
  assert.strictEqual(r('2027-01-27').immediatiARischio, 1);
  assert.strictEqual(r('2027-02-01').stato, 'definitiva');
  assert.strictEqual(r('2027-02-01').immediatiARischio, 0);
  assert.strictEqual(r('2027-02-16').stato, 'passata');
  assert.deepStrictEqual(r('2027-01-10').perOrigine, { GUP: 1, IMMEDIATO: 1 });
});

test('Incameramento: rifissare lo stesso fascicolo nello stesso slot non crea doppioni', function () {
  const s = statoDemo();
  s.parametri.giorniUdienza.settimanali = [1];
  const g = GC.model.addFascicolo(s, { rg: 'G/26', origine: 'GUP', dataProvvedimento: '2026-10-01' }).valore;
  GC.incamera.fissa(s, '2026-12-14', [g], {});
  const r = GC.incamera.fissa(s, '2026-12-14', [g], {});
  assert.strictEqual(r.creati, 0);
  assert.strictEqual(s.eventi.length, 1);
});

test('Versione: quella dell\'app coincide con package.json', function () {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  assert.strictEqual(GC.versione, pkg.version);
});

test('Il repository non contiene backup né file Excel reali (solo quelli di prova)', function () {
  const vietati = [];
  (function visita(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
      if (e.name === '.git' || e.name === 'node_modules') return;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return visita(p);
      const rel = path.relative(path.join(__dirname, '..'), p).split(path.sep).join('/');
      const ok = /^(app\/modello_import\.xlsx|tests\/fixtures\/(sample|ruolo_sintetico)\.(xlsx|csv)|package\.json)$/.test(rel);
      if (/\.(xlsx|xls|csv)$/i.test(e.name) && !ok) vietati.push(rel);
      if (/backup.*\.json$/i.test(e.name)) vietati.push(rel);
    });
  })(path.join(__dirname, '..'));
  assert.deepStrictEqual(vietati, []);
});

// ---------- determinismo e backup ----------
test('Determinismo: stesso input, stesso risultato', async function () {
  const buf = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.xlsx'));
  const righe = (await GC.xlsx.leggiFile('sample.xlsx', buf)).fogli[0].righe;
  const uno = statoDemo();
  const due = statoDemo();
  const m = mappaDemo(righe);
  const p1 = GC.importer.pianifica(uno, righe, m.riga, m.mapping, {});
  const p2 = GC.importer.pianifica(due, righe, m.riga, m.mapping, {});
  assert.deepStrictEqual(p1, p2);
  GC.importer.applica(uno, p1, { file: 'x' });
  GC.importer.applica(due, p2, { file: 'x' });
  assert.deepStrictEqual(uno, due);
  assert.deepStrictEqual(GC.calendar.timeline(uno, '2026-11-10'), GC.calendar.timeline(due, '2026-11-10'));
});

test('Backup: esportazione e importazione senza perdite', async function () {
  const s = statoDemo();
  s.parametri.orario.fine = '14:45';
  const f = GC.model.addFascicolo(s, { rg: '7/2026', imputato: 'Prova Uno', origine: 'IMMEDIATO', detenuto: true }).valore;
  GC.model.addEvento(s, { fascicoloId: f.id, data: '2026-11-03', inizio: '09:00', durata: 90, tipo: 'INCAMERAMENTO' });
  const testo = GC.storage.exportText(s);
  const r = GC.storage.parseBackup(testo);
  assert.ok(r.ok);
  assert.deepStrictEqual(r.stato, s);
  assert.strictEqual(r.stato.meta.prossimoId, s.meta.prossimoId);
  assert.strictEqual(GC.storage.parseBackup('non json').ok, false);
  assert.strictEqual(GC.storage.parseBackup(JSON.stringify({ app: 'altra' })).ok, false);
});

test('Backup creato con il nome vecchio (calendario-giudice, fino alla 0.4.0) ancora leggibile', function () {
  const s = statoDemo();
  const vecchio = JSON.parse(GC.storage.exportText(s));
  assert.strictEqual(vecchio.app, 'fascicoli-udienze-tracker');
  vecchio.app = 'calendario-giudice';
  const r = GC.storage.parseBackup(JSON.stringify(vecchio));
  assert.ok(r.ok);
  assert.deepStrictEqual(r.stato, s);
});

test('Stato normalizzato: id sempre avanti rispetto a quelli presenti', function () {
  const raw = { fascicoli: [{ id: 'F00007', rg: 'x' }], eventi: [{ id: 'E00012' }], meta: { prossimoId: 3 } };
  const s = GC.model.normalizeState(raw);
  assert.strictEqual(s.meta.prossimoId, 13);
  assert.deepStrictEqual(s.parametri, GC.params.defaults());
});

/* ---------- file dei dati (con un file finto, senza browser) ---------- */

function fileFinto(testoIniziale, rompi) {
  const f = { testo: testoIniziale || '', name: 'dati.json' };
  f.getFile = async function () { return { text: async function () { return f.testo; } }; };
  f.createWritable = async function () {
    let buf = '';
    return {
      write: async function (t) { buf += t; if (rompi) throw new Error('disco pieno'); },
      close: async function () { f.testo = buf; },
      abort: async function () { /* il file originale non si tocca */ }
    };
  };
  return f;
}

test('Fase del fascicolo: indicata, ricavata o non valida', function () {
  const s = GC.model.newState();
  const a = GC.model.addFascicolo(s, { rg: '1/2026', imputato: 'A', origine: 'GUP' }).valore;
  assert.strictEqual(GC.model.faseDi(a, s), 'NUOVO');
  GC.model.addEvento(s, { fascicoloId: a.id, data: '2099-01-10', inizio: '09:00', durata: 90, tipo: 'INCAMERAMENTO' });
  assert.strictEqual(GC.model.faseDi(a, s), 'INCAMERAMENTO', 'ricavata dalla prossima attività');
  assert.ok(GC.model.updateFascicolo(s, a.id, { fase: 'RISERVA' }).ok);
  assert.strictEqual(GC.model.faseDi(a, s), 'RISERVA', 'la fase indicata vince');
  assert.strictEqual(GC.model.updateFascicolo(s, a.id, { fase: 'INVENTATA' }).ok, false);
  assert.ok(s.storico[s.storico.length - 1].dettaglio.indexOf('fase') >= 0, 'il cambio di fase finisce nello storico');
  const b = GC.model.addFascicolo(s, { rg: '2/2026', imputato: 'B', predibDaFissare: true }).valore;
  assert.strictEqual(GC.model.faseDi(b, s), 'PREDIB', 'dal flag predibattimento');
});

test('Elenco fascicoli: filtro per testo e per fase', function () {
  const s = GC.model.newState();
  GC.model.addFascicolo(s, { rg: '10/2026', imputato: 'Rossi', fase: 'ISTRUTTORIA' });
  GC.model.addFascicolo(s, { rg: '11/2026', imputato: 'Bianchi', fase: 'RISERVA', reato: 'furto' });
  GC.model.addFascicolo(s, { rg: '12/2026', imputato: 'Verdi', fase: 'RISERVA' });
  assert.strictEqual(GC.model.filtraFascicoli(s, {}).length, 3);
  assert.strictEqual(GC.model.filtraFascicoli(s, { fase: 'RISERVA' }).length, 2);
  assert.strictEqual(GC.model.filtraFascicoli(s, { testo: 'furto' }).length, 1);
  assert.strictEqual(GC.model.filtraFascicoli(s, { testo: 'rossi', fase: 'RISERVA' }).length, 0);
  assert.deepStrictEqual(GC.model.filtraFascicoli(s, {}).map(function (f) { return f.rg; }), ['10/2026', '11/2026', '12/2026']);
});

test('File dei dati: scrittura e rilettura senza perdite', async function () {
  const s = statoDemo();
  const f = fileFinto('');
  await GC.fileDati.scrivi(f, s);
  const r = await GC.fileDati.leggi(f);
  assert.ok(r.ok);
  assert.deepStrictEqual(r.stato, s);
});

test('File dei dati: file vuoto riconosciuto, file non valido rifiutato', async function () {
  const vuoto = await GC.fileDati.leggi(fileFinto('  \n'));
  assert.ok(vuoto.ok && vuoto.vuoto);
  const rotto = await GC.fileDati.leggi(fileFinto('non json'));
  assert.strictEqual(rotto.ok, false);
  const altro = await GC.fileDati.leggi(fileFinto(JSON.stringify({ app: 'altra', stato: {} })));
  assert.strictEqual(altro.ok, false);
});

test('File dei dati: se la scrittura fallisce, il contenuto precedente resta intatto', async function () {
  const s = statoDemo();
  const buono = fileFinto('');
  await GC.fileDati.scrivi(buono, s);
  const prima = buono.testo;
  const guasto = fileFinto(prima, true);
  await assert.rejects(function () { return GC.fileDati.scrivi(guasto, statoDemo()); }, /disco pieno/);
  assert.strictEqual(guasto.testo, prima);
});

test('File dei dati: quale copia usare alla riapertura', function () {
  const F = GC.fileDati;
  function stato(salvato, conDati) {
    const s = GC.model.newState();
    s.meta.salvato = salvato;
    if (conDati) GC.model.addFascicolo(s, { rg: '1/2026', imputato: 'Prova', origine: 'GUP' });
    return s;
  }
  assert.strictEqual(F.scegliFonte(stato('2026-11-02T10:00:00Z', true), null), 'locale', 'file vuoto: si scrive il browser nel file');
  assert.strictEqual(F.scegliFonte(stato('2026-11-02T10:00:00Z', true), stato('2026-11-01T10:00:00Z', false)), 'locale', 'file senza dati');
  assert.strictEqual(F.scegliFonte(stato('', false), stato('2026-11-01T10:00:00Z', true)), 'file', 'browser vuoto: si usa il file');
  assert.strictEqual(F.scegliFonte(stato('2026-11-01T10:00:00Z', true), stato('2026-11-02T10:00:00Z', true)), 'file', 'file più recente');
  assert.strictEqual(F.scegliFonte(stato('2026-11-02T10:00:00Z', true), stato('2026-11-01T10:00:00Z', true)), 'chiedi', 'browser più recente: si chiede');
  assert.strictEqual(F.scegliFonte(stato('2026-11-02T10:00:00Z', true), stato('2026-11-02T10:00:00Z', true)), 'file', 'stessa data');
});

test('File dei dati: nei browser senza supporto (Node) non è disponibile', function () {
  assert.strictEqual(GC.fileDati.supportato(), false);
});

esegui();
