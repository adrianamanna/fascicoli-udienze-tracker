/* Incameramento (specifica §3-bis, regole N-01 … N-15).
   Un'udienza di incameramento è uno slot unico di 90 minuti per TUTTI i fascicoli di quella data, a prescindere dal numero.
   I fascicoli arrivano da GUP, predibattimento (di un altro giudice) o giudizio immediato, ciascuno con i suoi termini. */
(function (root) {
  'use strict';
  const GC = (root.GC = root.GC || {});
  const D = GC.dates;
  const C = GC.calendar;
  const M = GC.model;

  function giorniMinimi(state, f) {
    const T = state.parametri.termini;
    return f.origine === 'IMMEDIATO' ? T.immediato : T.incameramentoGupPredib;
  }

  /** Data più vicina in cui il fascicolo può essere incamerato: provvedimento + 20 giorni (GUP, predibattimento)
      oppure notifica + 30 giorni (immediato). Art. 429 c. 3, art. 554-ter c. 4, art. 456 c. 3. */
  function dataMinima(state, fascicoli) {
    let min = null;
    const senzaData = [];
    fascicoli.forEach(function (f) {
      if (!f.dataProvvedimento || !D.isValidYmd(f.dataProvvedimento)) {
        senzaData.push(f.id);
        return;
      }
      const d = D.addDays(f.dataProvvedimento, giorniMinimi(state, f));
      if (!min || d > min) min = d;
    });
    return { data: min, senzaData: senzaData };
  }

  /** Fine dei 15 giorni per chiedere i riti (art. 458): fino ad allora un immediato può ancora uscire dalla lista. */
  function fineTermineRiti(state, f) {
    if (f.origine !== 'IMMEDIATO' || !f.dataProvvedimento || !D.isValidYmd(f.dataProvvedimento)) return null;
    return D.addDays(f.dataProvvedimento, state.parametri.termini.ritiDopoNotifica);
  }

  /** Gli slot di incameramento già fissati (stessa data e stessa ora = stesso slot, anche con più fascicoli). */
  function blocchi(state) {
    const m = {};
    state.eventi.forEach(function (e) {
      if (e.tipo !== 'INCAMERAMENTO' || e.stato === 'provvisorio') return;
      const k = e.data + '|' + e.inizio;
      const b = m[k] || (m[k] = { data: e.data, inizio: e.inizio, durata: e.durata, fascicoliIds: [], senzaFascicolo: 0 });
      b.durata = Math.max(b.durata, e.durata);
      if (e.fascicoloId) {
        if (b.fascicoliIds.indexOf(e.fascicoloId) < 0) b.fascicoliIds.push(e.fascicoloId);
      } else b.senzaFascicolo++;
    });
    return Object.keys(m)
      .sort()
      .map(function (k) {
        const b = m[k];
        b.n = b.fascicoliIds.length + b.senzaFascicolo;
        return b;
      });
  }

  /** Riepilogo di ogni slot con chiusura delle liste (N-11): D-30 immediati, D-20 GUP e predibattimento, lista definitiva. */
  function riepilogo(state, oggi) {
    const T = state.parametri.termini;
    oggi = oggi || D.today();
    return blocchi(state).map(function (b) {
      const fasc = b.fascicoliIds.map(function (id) {
        return M.getFascicolo(state, id);
      }).filter(Boolean);
      const perOrigine = {};
      fasc.forEach(function (f) {
        perOrigine[f.origine] = (perOrigine[f.origine] || 0) + 1;
      });
      const chiusuraImmediati = D.addDays(b.data, -T.immediato);
      const chiusuraGupPredib = D.addDays(b.data, -T.incameramentoGupPredib);
      let definitivaDal = chiusuraGupPredib;
      let immediatiARischio = 0;
      fasc.forEach(function (f) {
        const fine = fineTermineRiti(state, f);
        if (fine) {
          if (fine > definitivaDal) definitivaDal = fine;
          if (oggi <= fine) immediatiARischio++;
        }
      });
      let stato = 'aperta';
      if (oggi > b.data) stato = 'passata';
      else if (oggi >= definitivaDal) stato = 'definitiva';
      else if (oggi >= chiusuraGupPredib) stato = 'chiusa';
      else if (oggi >= chiusuraImmediati) stato = 'chiusa-immediati';
      const t = C.timeline(state, b.data);
      return {
        data: b.data,
        inizio: b.inizio,
        durata: b.durata,
        n: b.n,
        perOrigine: perOrigine,
        mediaMinuti: b.n > 0 ? Math.floor(b.durata / b.n) : b.durata,
        chiusuraImmediati: chiusuraImmediati,
        chiusuraGupPredib: chiusuraGupPredib,
        definitivaDal: definitivaDal,
        immediatiARischio: immediatiARischio,
        stato: stato,
        minutiRestanti: t.liberi
      };
    });
  }

  function ultimaDataPerOrigine(state, origine, prima, elenco) {
    let ultima = null;
    (elenco || blocchi(state)).forEach(function (b) {
      if (b.data >= prima) return;
      const c = b.fascicoliIds.some(function (id) {
        const f = M.getFascicolo(state, id);
        return f && f.origine === origine;
      });
      if (c && (!ultima || b.data > ultima)) ultima = b.data;
    });
    return ultima;
  }

  function prossimaDataPerOrigine(state, origine, dopo, elenco) {
    let prossima = null;
    (elenco || blocchi(state)).forEach(function (b) {
      if (b.data <= dopo) return;
      const c = b.fascicoliIds.some(function (id) {
        const f = M.getFascicolo(state, id);
        return f && f.origine === origine;
      });
      if (c && (!prossima || b.data < prossima)) prossima = b.data;
    });
    return prossima;
  }

  /** Valuta una data per un gruppo di fascicoli da incamerare. */
  function valuta(state, data, fascicoli, opz) {
    opz = opz || {};
    const durata = state.parametri.durate.INCAMERAMENTO;
    const mesi = state.parametri.incameramentoMesi;
    const elenco = opz.blocchi || blocchi(state);
    const motivi = [];
    const avvisi = [];
    let stato = 'verde';
    const peggiora = function (n) {
      if (n === 'rosso' || (n === 'giallo' && stato === 'verde')) stato = n;
    };

    const min = opz.minimo || dataMinima(state, fascicoli);
    if (min.data && data < min.data) {
      peggiora('rosso');
      motivi.push('Prima della data minima ' + D.fmtIt(min.data) + ' (provvedimento più 20 giorni, notifica più 30 per l\'immediato).');
    }
    if (min.senzaData.length) {
      peggiora('giallo');
      motivi.push('Per ' + min.senzaData.length + (min.senzaData.length === 1 ? ' fascicolo' : ' fascicoli') + ' manca la data del provvedimento: il termine non è controllato.');
    }

    const origini = {};
    fascicoli.forEach(function (f) {
      origini[f.origine] = true;
    });
    Object.keys(origini).forEach(function (o) {
      const m = mesi[o];
      if (!(m > 0)) return;
      const prev = ultimaDataPerOrigine(state, o, data, elenco);
      if (prev && data < D.addMonths(prev, m)) {
        peggiora('giallo');
        motivi.push('Meno di ' + m + (m === 1 ? ' mese' : ' mesi') + ' dall\'incameramento ' + M.ORIGINI[o].toLowerCase() + ' del ' + D.fmtIt(prev) + '.');
      }
      const next = prossimaDataPerOrigine(state, o, data, elenco);
      if (next && D.addMonths(data, m) > next) {
        peggiora('giallo');
        motivi.push('Meno di ' + m + (m === 1 ? ' mese' : ' mesi') + ' prima dell\'incameramento ' + M.ORIGINI[o].toLowerCase() + ' del ' + D.fmtIt(next) + '.');
      }
    });

    const esistenti = elenco.filter(function (b) {
      return b.data === data;
    });
    let inizio = null;
    let nEsistenti = 0;
    if (esistenti.length) {
      inizio = esistenti[0].inizio;
      nEsistenti = esistenti.reduce(function (t, b) {
        return t + b.n;
      }, 0);
    } else {
      const t = C.timeline(state, data);
      const v = t.vuoti.find(function (x) {
        return x.durata >= durata;
      });
      if (v) inizio = v.inizio;
      else {
        peggiora('giallo');
        motivi.push('Non c\'è uno spazio libero di ' + durata + ' minuti nella giornata.');
      }
    }
    const totale = nEsistenti + fascicoli.length;
    const media = Math.floor(durata / Math.max(1, totale));
    if (esistenti.length) avvisi.push('Si aggiunge all\'incameramento già fissato (' + nEsistenti + (nEsistenti === 1 ? ' fascicolo' : ' fascicoli') + ').');
    avvisi.push(durata + ' minuti per ' + totale + (totale === 1 ? ' fascicolo' : ' fascicoli') + ': circa ' + media + ' minuti ciascuno.');

    return {
      data: data,
      stato: stato,
      motivi: motivi,
      avvisi: avvisi,
      esistente: esistenti.length > 0,
      nEsistenti: nEsistenti,
      inizio: inizio,
      mediaMinuti: media,
      minutiRestanti: Math.max(0, C.timeline(state, data).liberi - (esistenti.length ? 0 : durata))
    };
  }

  /** Date candidate: prima le idonee, poi quelle con riserve, in fondo le non consentite; ciascun gruppo in ordine di data. */
  function candidate(state, fascicoli, opz) {
    opz = opz || {};
    const oggi = opz.oggi || D.today();
    const da = opz.da || oggi;
    const giorni = opz.giorni || 400;
    const min = dataMinima(state, fascicoli);
    const elenco = blocchi(state);
    const out = [];
    for (let i = 0; i < giorni; i++) {
      const s = D.addDays(da, i);
      if (C.dayStatus(state, s).stato !== 'udienza') continue;
      out.push(valuta(state, s, fascicoli, { minimo: min, blocchi: elenco }));
    }
    const peso = { verde: 0, giallo: 1, rosso: 2 };
    out.sort(function (a, b) {
      if (peso[a.stato] !== peso[b.stato]) return peso[a.stato] - peso[b.stato];
      return a.data < b.data ? -1 : a.data > b.data ? 1 : 0;
    });
    return { minimo: min, righe: out };
  }

  /** Fissa i fascicoli: stessa ora dello slot già presente quel giorno, oppure il primo spazio libero da 90 minuti. */
  function fissa(state, data, fascicoli, opz) {
    opz = opz || {};
    const durata = state.parametri.durate.INCAMERAMENTO;
    const esistente = blocchi(state).find(function (b) {
      return b.data === data;
    });
    let inizio;
    if (esistente) inizio = esistente.inizio;
    else {
      const t = C.timeline(state, data);
      const v = t.vuoti.find(function (x) {
        return x.durata >= durata;
      });
      inizio = v ? v.inizio : state.parametri.orario.inizio;
    }
    let creati = 0;
    fascicoli.forEach(function (f) {
      const gia = state.eventi.some(function (e) {
        return e.tipo === 'INCAMERAMENTO' && e.data === data && e.inizio === inizio && e.fascicoloId === f.id;
      });
      if (gia) return;
      const r = M.addEvento(state, {
        fascicoloId: f.id,
        data: data,
        inizio: inizio,
        durata: durata,
        tipo: 'INCAMERAMENTO',
        stato: opz.stato || 'ufficiale',
        sovrapponibile: true,
        fonte: 'incameramento'
      });
      if (r.ok) {
        creati++;
        M.updateFascicolo(state, f.id, { incameramentoDaFissare: false });
      }
    });
    M.log(state, 'fissa', 'incameramento', null, D.fmtIt(data) + ' ore ' + inizio + ': ' + creati + ' fascicoli');
    return { creati: creati, inizio: inizio };
  }

  GC.incamera = {
    dataMinima: dataMinima,
    fineTermineRiti: fineTermineRiti,
    blocchi: blocchi,
    riepilogo: riepilogo,
    valuta: valuta,
    candidate: candidate,
    fissa: fissa
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
