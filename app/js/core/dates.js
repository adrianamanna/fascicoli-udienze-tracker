/* Date, orari e festività italiane. Nessuna dipendenza esterna, nessuna casualità. */
(function (root) {
  'use strict';
  var GC = (root.GC = root.GC || {});

  var MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  var MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  var GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']; // indice = getUTCDay()
  var GIORNI_BREVI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

  function pad(n, w) {
    return String(n).padStart(w || 2, '0');
  }

  /** Costruisce una data testuale AAAA-MM-GG (mese 1-12). */
  function ymd(y, m, d) {
    return pad(y, 4) + '-' + pad(m) + '-' + pad(d);
  }

  function isValidYmd(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var p = s.split('-').map(Number);
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return dt.getUTCFullYear() === p[0] && dt.getUTCMonth() === p[1] - 1 && dt.getUTCDate() === p[2];
  }

  function parts(s) {
    var p = s.split('-').map(Number);
    return { y: p[0], m: p[1], d: p[2] };
  }

  function toUTC(s) {
    var p = parts(s);
    return new Date(Date.UTC(p.y, p.m - 1, p.d));
  }

  function fromUTC(dt) {
    return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }

  function addDays(s, n) {
    var dt = toUTC(s);
    dt.setUTCDate(dt.getUTCDate() + n);
    return fromUTC(dt);
  }

  /** Giorni tra a e b (b - a). */
  function diffDays(a, b) {
    return Math.round((toUTC(b) - toUTC(a)) / 86400000);
  }

  /** 1 = lunedì ... 7 = domenica */
  function isoWeekday(s) {
    var w = toUTC(s).getUTCDay();
    return w === 0 ? 7 : w;
  }

  function today() {
    var n = new Date();
    return ymd(n.getFullYear(), n.getMonth() + 1, n.getDate());
  }

  function daysInMonth(y, m) {
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }

  /** Pasqua (algoritmo di Meeus/Jones/Butcher, calendario gregoriano). */
  function easter(y) {
    var a = y % 19;
    var b = Math.floor(y / 100);
    var c = y % 100;
    var d = Math.floor(b / 4);
    var e = b % 4;
    var f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4);
    var k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31);
    var day = ((h + l - 7 * m + 114) % 31) + 1;
    return ymd(y, month, day);
  }

  var FESTE_FISSE = [
    [1, 1, 'Capodanno'],
    [1, 6, 'Epifania'],
    [4, 25, 'Festa della Liberazione'],
    [5, 1, 'Festa del Lavoro'],
    [6, 2, 'Festa della Repubblica'],
    [8, 15, 'Assunzione (Ferragosto)'],
    [11, 1, 'Ognissanti'],
    [12, 8, 'Immacolata Concezione'],
    [12, 25, 'Natale'],
    [12, 26, 'Santo Stefano']
  ];

  var cacheFeste = {};

  /** Festività nazionali italiane dell'anno (+ eventuale santo patrono). Restituisce { 'AAAA-MM-GG': nome }. */
  function holidays(y, patrono) {
    var pk = patrono && patrono.attivo ? [patrono.mese, patrono.giorno, patrono.nome || ''].join('|') : '-';
    var key = y + '#' + pk;
    if (cacheFeste[key]) return cacheFeste[key];
    var out = {};
    FESTE_FISSE.forEach(function (f) {
      out[ymd(y, f[0], f[1])] = f[2];
    });
    var pasqua = easter(y);
    out[pasqua] = 'Pasqua';
    out[addDays(pasqua, 1)] = "Lunedì dell'Angelo";
    if (patrono && patrono.attivo && patrono.mese >= 1 && patrono.mese <= 12 && patrono.giorno >= 1 && patrono.giorno <= 31) {
      var k = ymd(y, patrono.mese, Math.min(patrono.giorno, daysInMonth(y, patrono.mese)));
      if (!out[k]) out[k] = patrono.nome ? 'Santo patrono (' + patrono.nome + ')' : 'Santo patrono';
    }
    cacheFeste[key] = out;
    return out;
  }

  /** Nome della festività se la data è festiva, altrimenti null. */
  function holidayName(s, patrono) {
    var h = holidays(parts(s).y, patrono);
    return h[s] || null;
  }

  /** Vero se la data cade nel periodo feriale (default 1-31 agosto): niente udienze, termini sospesi. */
  function inPeriodoFeriale(s, feriale) {
    if (!feriale || !feriale.attivo) return false;
    var md = s.slice(5);
    var ini = feriale.inizio || '08-01';
    var fin = feriale.fine || '08-31';
    return md >= ini && md <= fin;
  }

  /** Aggiunge n mesi di calendario (il giorno si riduce se il mese è più corto: 31 gennaio + 1 mese = 28/29 febbraio). */
  function addMonths(s, n) {
    var p = parts(s);
    var tot = p.y * 12 + (p.m - 1) + n;
    var y = Math.floor(tot / 12);
    var m = (tot % 12) + 1;
    return ymd(y, m, Math.min(p.d, daysInMonth(y, m)));
  }

  function fmtLong(s) {
    var p = parts(s);
    return GIORNI[toUTC(s).getUTCDay()] + ' ' + p.d + ' ' + MESI[p.m - 1] + ' ' + p.y;
  }

  function fmtShort(s) {
    var p = parts(s);
    return GIORNI_BREVI[toUTC(s).getUTCDay()] + ' ' + p.d + ' ' + MESI_BREVI[p.m - 1] + ' ' + p.y;
  }

  function fmtIt(s) {
    var p = parts(s);
    return pad(p.d) + '/' + pad(p.m) + '/' + p.y;
  }

  /** 'HH:MM' o 'HH.MM' -> minuti dalla mezzanotte, NaN se non valido. */
  function hhmmToMin(t) {
    var m = /^(\d{1,2})[:.](\d{2})$/.exec(String(t == null ? '' : t).trim());
    if (!m) return NaN;
    var h = +m[1];
    var mi = +m[2];
    if (h > 23 || mi > 59) return NaN;
    return h * 60 + mi;
  }

  function minToHhmm(n) {
    n = Math.round(n);
    return pad(Math.floor(n / 60)) + ':' + pad(n % 60);
  }

  GC.dates = {
    MESI: MESI,
    MESI_BREVI: MESI_BREVI,
    GIORNI: GIORNI,
    GIORNI_BREVI: GIORNI_BREVI,
    pad: pad,
    ymd: ymd,
    isValidYmd: isValidYmd,
    parts: parts,
    toUTC: toUTC,
    fromUTC: fromUTC,
    addDays: addDays,
    addMonths: addMonths,
    diffDays: diffDays,
    isoWeekday: isoWeekday,
    today: today,
    daysInMonth: daysInMonth,
    easter: easter,
    holidays: holidays,
    holidayName: holidayName,
    inPeriodoFeriale: inPeriodoFeriale,
    fmtLong: fmtLong,
    fmtShort: fmtShort,
    fmtIt: fmtIt,
    hhmmToMin: hhmmToMin,
    minToHhmm: minToHhmm
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
