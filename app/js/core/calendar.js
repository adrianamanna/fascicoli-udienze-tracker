/* Calcoli di calendario: giorni di udienza, giornata, vuoti, capienza, controlli.
   Funzioni pure e deterministiche: stesso stato in ingresso, stesso risultato. */
(function (root) {
  'use strict';
  const GC = (root.GC = root.GC || {});
  const D = GC.dates;

  /** Stato di un giorno: 'udienza' (programmato e libero da blocchi), 'bloccato' (festivo, feriale, indisponibile) o 'libero'. */
  function dayStatus(state, s) {
    const P = state.parametri;
    const w = D.isoWeekday(s);
    const custom = P.giorniUdienza.date.indexOf(s) >= 0;
    const weekly = P.giorniUdienza.settimanali.indexOf(w) >= 0;
    const programmato = custom || weekly;
    const fest = D.holidayName(s, P.patrono);
    const feriale = D.inPeriodoFeriale(s, P.feriale);
    let indisp = null;
    (P.indisponibilita || []).forEach(function (r) {
      if (!indisp && r.da <= s && s <= (r.a || r.da)) indisp = r;
    });
    let blocco = null;
    if (fest) blocco = { tipo: 'festivo', nome: fest };
    else if (feriale) blocco = { tipo: 'feriale', nome: 'Periodo feriale (nessuna udienza, termini sospesi)' };
    else if (indisp) blocco = { tipo: 'indisponibile', nome: indisp.motivo || 'Indisponibile' };
    let stato = 'libero';
    if (blocco) stato = 'bloccato';
    else if (programmato) stato = 'udienza';
    return {
      data: s,
      weekday: w,
      programmato: programmato,
      extra: custom && !weekly,
      blocco: blocco,
      stato: stato,
      nome: blocco ? blocco.nome : null
    };
  }

  function sumIntervals(list) {
    return list.reduce(function (t, x) {
      return t + (x[1] - x[0]);
    }, 0);
  }

  /** Toglie l'intervallo [a,b) da un elenco di intervalli [s,e). */
  function subtract(list, a, b) {
    const out = [];
    list.forEach(function (it) {
      const s = it[0];
      const e = it[1];
      if (b <= s || a >= e) {
        out.push([s, e]);
        return;
      }
      if (a > s) out.push([s, Math.min(a, e)]);
      if (b < e) out.push([Math.max(b, s), e]);
    });
    return out;
  }

  function limiti(state) {
    const O = state.parametri.orario;
    return {
      ini: D.hhmmToMin(O.inizio),
      fin: D.hhmmToMin(O.fine),
      tol: D.hhmmToMin(O.tolleranzaFine),
      pi: D.hhmmToMin(O.pausaInizio),
      pf: D.hhmmToMin(O.pausaFine)
    };
  }

  function sovrappone(a, b) {
    return a.startMin < b.endMin && b.startMin < a.endMin;
  }

  /** Giornata di udienza: attività, intervalli liberi (vuoti), minuti occupati e segnalazioni. */
  function timeline(state, s) {
    const L = limiti(state);
    const P = state.parametri;
    const status = dayStatus(state, s);
    const eventi = state.eventi
      .filter(function (e) {
        return e.data === s;
      })
      .map(function (e) {
        const a = D.hhmmToMin(e.inizio);
        return Object.assign({}, e, { startMin: a, endMin: a + e.durata, flags: [] });
      })
      .sort(function (x, y) {
        return x.startMin - y.startMin || x.endMin - y.endMin || (x.id < y.id ? -1 : 1);
      });

    const base = subtract([[L.ini, L.fin]], L.pi, L.pf);
    const utili = sumIntervals(base);
    const ufficiali = eventi.filter(function (e) {
      return e.stato !== 'provvisorio';
    });
    let liberi = base.slice();
    ufficiali.forEach(function (e) {
      liberi = subtract(liberi, e.startMin, e.endMin);
    });
    liberi.sort(function (x, y) {
      return x[0] - y[0];
    });
    const liberiMin = sumIntervals(liberi);
    const occupati = utili - liberiMin;

    const vuoti = [];
    const margini = [];
    liberi.forEach(function (it) {
      const o = { startMin: it[0], endMin: it[1], durata: it[1] - it[0], inizio: D.minToHhmm(it[0]), fine: D.minToHhmm(it[1]) };
      if (o.durata >= P.vuotoMinimo) vuoti.push(o);
      else if (o.durata > 0) margini.push(o);
    });

    const conflitti = [];
    for (let i = 0; i < ufficiali.length; i++) {
      for (let j = i + 1; j < ufficiali.length; j++) {
        if (sovrappone(ufficiali[i], ufficiali[j]) && !(ufficiali[i].sovrapponibile && ufficiali[j].sovrapponibile)) {
          conflitti.push([ufficiali[i].id, ufficiali[j].id]);
        }
      }
    }

    let oltre = 0;
    eventi.forEach(function (e) {
      if (e.startMin < L.ini) e.flags.push('prima-inizio');
      if (e.startMin < L.pf && e.endMin > L.pi) e.flags.push('in-pausa');
      if (e.endMin > L.fin && e.endMin <= L.tol) e.flags.push('in-tolleranza');
      if (e.endMin > L.tol) e.flags.push('oltre-tolleranza');
      if (e.stato !== 'provvisorio') oltre += Math.max(0, Math.min(e.endMin, L.tol) - Math.max(e.startMin, L.fin));
    });
    const inConflitto = {};
    conflitti.forEach(function (c) {
      inConflitto[c[0]] = true;
      inConflitto[c[1]] = true;
    });
    eventi.forEach(function (e) {
      if (inConflitto[e.id]) e.flags.push('sovrapposto');
    });

    return {
      data: s,
      stato: status,
      ini: L.ini,
      fin: L.fin,
      tol: L.tol,
      pausa: { startMin: L.pi, endMin: L.pf },
      utili: utili,
      occupati: occupati,
      liberi: liberiMin,
      saturazione: utili > 0 ? occupati / utili : 0,
      eventi: eventi,
      vuoti: vuoti,
      margini: margini,
      conflitti: conflitti,
      minutiInTolleranza: oltre
    };
  }

  /** Controlli su una singola attività. Non blocca nulla: il giudice decide (G-01). */
  function checkEvent(state, ev, opts) {
    opts = opts || {};
    const L = limiti(state);
    const out = [];
    if (!D.isValidYmd(ev.data)) return out;
    const st = dayStatus(state, ev.data);
    if (st.stato === 'bloccato') out.push({ livello: 'avviso', codice: 'giorno-bloccato', testo: 'Il giorno è bloccato: ' + st.nome + '.' });
    else if (st.stato === 'libero') out.push({ livello: 'avviso', codice: 'giorno-libero', testo: 'Il giorno non è tra i giorni di udienza.' });
    const a = D.hhmmToMin(ev.inizio);
    if (isNaN(a) || !(ev.durata > 0)) return out;
    const b = a + ev.durata;
    if (a < L.ini) out.push({ livello: 'avviso', codice: 'prima-inizio', testo: "Inizia prima delle " + D.minToHhmm(L.ini) + "." });
    if (a < L.pf && b > L.pi) out.push({ livello: 'avviso', codice: 'in-pausa', testo: 'Si sovrappone alla pausa (' + D.minToHhmm(L.pi) + '-' + D.minToHhmm(L.pf) + ').' });
    if (b > L.fin && b <= L.tol) out.push({ livello: 'avviso', codice: 'in-tolleranza', testo: 'Termina dopo le ' + D.minToHhmm(L.fin) + ' (entro il limite delle ' + D.minToHhmm(L.tol) + ').' });
    if (b > L.tol) out.push({ livello: 'errore', codice: 'oltre-tolleranza', testo: 'Termina dopo le ' + D.minToHhmm(L.tol) + ', oltre il limite massimo.' });
    const altri = state.eventi
      .concat(opts.extra || [])
      .filter(function (e) {
        return e.id !== opts.escludiId && e.data === ev.data && e.stato !== 'provvisorio';
      });
    if (ev.stato !== 'provvisorio') {
      altri.forEach(function (e) {
        const a2 = D.hhmmToMin(e.inizio);
        const b2 = a2 + e.durata;
        if (a < b2 && a2 < b && !(ev.sovrapponibile && e.sovrapponibile)) {
          out.push({ livello: 'avviso', codice: 'sovrapposto', testo: 'Si sovrappone a un\'altra attività (' + e.inizio + '-' + D.minToHhmm(b2) + ').' });
        }
      });
    }
    return out;
  }

  /** Griglia del mese (settimane da lunedì a domenica) con riepilogo per giorno. */
  function monthGrid(state, y, m) {
    const primo = D.ymd(y, m, 1);
    const ultimo = D.ymd(y, m, D.daysInMonth(y, m));
    const start = D.addDays(primo, -(D.isoWeekday(primo) - 1));
    const end = D.addDays(ultimo, 7 - D.isoWeekday(ultimo));
    const settimane = [];
    let cur = start;
    while (cur <= end) {
      const sett = [];
      for (let i = 0; i < 7; i++) {
        const st = dayStatus(state, cur);
        const haEventi = state.eventi.some(function (e) {
          return e.data === cur;
        });
        let n = 0;
        let prov = 0;
        let occ = 0;
        let lib = 0;
        let nv = 0;
        if (st.stato === 'udienza' || haEventi) {
          const t = timeline(state, cur);
          n = t.eventi.filter(function (e) {
            return e.stato !== 'provvisorio';
          }).length;
          prov = t.eventi.length - n;
          occ = t.occupati;
          lib = t.liberi;
          nv = t.vuoti.length;
        }
        sett.push({ data: cur, inMese: cur >= primo && cur <= ultimo, stato: st, attivita: n, provvisorie: prov, occupati: occ, liberi: lib, vuoti: nv });
        cur = D.addDays(cur, 1);
      }
      settimane.push(sett);
    }
    return settimane;
  }

  /** Prossimi n giorni di udienza a partire da una data (inclusa). */
  function nextHearingDays(state, from, n, maxGiorni) {
    const out = [];
    let cur = from;
    const limite = maxGiorni || 800;
    for (let i = 0; i < limite && out.length < n; i++) {
      if (dayStatus(state, cur).stato === 'udienza') out.push(cur);
      cur = D.addDays(cur, 1);
    }
    return out;
  }

  GC.calendar = {
    dayStatus: dayStatus,
    timeline: timeline,
    checkEvent: checkEvent,
    monthGrid: monthGrid,
    nextHearingDays: nextHearingDays,
    subtract: subtract
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
