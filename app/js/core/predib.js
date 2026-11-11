/* Predibattimento (specifica §7, regole P-01 … P-05).
   Dato un gruppo di fascicoli da fissare, propone le date possibili e dice perché ciascuna va bene o no.
   Tutto deterministico: nessuna stima, solo regole e conteggi. */
(function (root) {
  'use strict';
  const GC = (root.GC = root.GC || {});
  const D = GC.dates;
  const C = GC.calendar;
  const M = GC.model;

  function primaUdienza(e) {
    return String(e.rinvioDal || '').trim().toLowerCase() === '1 ud';
  }

  /** Giornate di udienza predibattimentale: quelle con almeno `predibSogliaUdienza` fascicoli alla prima udienza.
      I rinvii di singoli fascicoli su altri giorni non contano (confermato dal giudice). */
  function udienze(state) {
    const per = {};
    state.eventi.forEach(function (e) {
      if (e.tipo !== 'PREDIB' || e.stato === 'provvisorio') return;
      const o = per[e.data] || (per[e.data] = { data: e.data, prime: 0, totale: 0, fissati: 0 });
      o.totale++;
      if (primaUdienza(e)) o.prime++;
      if (e.fonte === 'predib') o.fissati++; // fissato da questa app: è una scelta del giudice, conta sempre come udienza
    });
    const soglia = state.parametri.predibSogliaUdienza;
    return Object.keys(per)
      .sort()
      .map(function (k) {
        return per[k];
      })
      .filter(function (o) {
        return o.prime >= soglia || o.fissati > 0;
      })
      .map(function (o) {
        return { data: o.data, prime: o.prime, totale: o.totale };
      });
  }

  /** Data minima per fissare i fascicoli: notifica + 60 giorni (45 se urgente), art. 552 c. 3. */
  function dataMinima(state, fascicoli) {
    const T = state.parametri.termini;
    let min = null;
    const senzaNotifica = [];
    fascicoli.forEach(function (f) {
      if (!f.notificaCitazione || !D.isValidYmd(f.notificaCitazione)) {
        senzaNotifica.push(f.id);
        return;
      }
      const g = f.urgente ? T.predibNotificaUrgenza : T.predibNotifica;
      const d = D.addDays(f.notificaCitazione, g);
      if (!min || d > min) min = d;
    });
    return { data: min, senzaNotifica: senzaNotifica };
  }

  /** Giorni feriali (lunedì-venerdì) senza udienza e non festivi nei 14 giorni precedenti: tempo per studiare i fascicoli. */
  function giorniLiberiPerStudio(state, data) {
    let n = 0;
    for (let i = 1; i <= 14; i++) {
      const s = D.addDays(data, -i);
      if (D.isoWeekday(s) > 5) continue;
      if (C.dayStatus(state, s).stato === 'libero') n++;
    }
    return n;
  }

  /** Quanti fascicoli da 10 minuti entrano ancora in quella giornata (senza usare la tolleranza). */
  function postiFisici(state, data) {
    const slot = state.parametri.durate.PREDIB;
    const t = C.timeline(state, data);
    return t.vuoti.reduce(function (tot, v) {
      return tot + Math.floor(v.durata / slot);
    }, 0);
  }

  /** Posti disponibili per il predibattimento: il minore tra lo spazio libero e il massimo per udienza
      (30 fascicoli da 10 minuti = circa 5 ore), contando i predibattimenti già fissati quel giorno. */
  function posti(state, data) {
    const t = C.timeline(state, data);
    const gia = t.eventi.filter(function (e) {
      return e.tipo === 'PREDIB' && e.stato !== 'provvisorio';
    }).length;
    return Math.max(0, Math.min(postiFisici(state, data), state.parametri.predibFascicoliPerUdienza - gia));
  }

  /** Valuta una data per un gruppo di fascicoli. Restituisce { stato: 'verde'|'giallo'|'rosso', motivi, ... }. */
  function valuta(state, data, fascicoli, opz) {
    opz = opz || {};
    const T = state.parametri.termini;
    const lista = (opz.udienze || udienze(state)).filter(function (u) {
      return u.data !== data;
    });
    const motivi = [];
    let stato = 'verde';
    const peggiora = function (nuovo) {
      if (nuovo === 'rosso' || (nuovo === 'giallo' && stato === 'verde')) stato = nuovo;
    };

    const min = opz.minimo || dataMinima(state, fascicoli);
    if (min.data && data < min.data) {
      peggiora('rosso');
      motivi.push('Prima della data minima ' + D.fmtIt(min.data) + ' (notifica più 60 giorni, 45 se urgente).');
    }
    if (min.senzaNotifica.length) {
      peggiora('giallo');
      motivi.push('Per ' + min.senzaNotifica.length + (min.senzaNotifica.length === 1 ? ' fascicolo' : ' fascicoli') + ' manca la data di notifica: il termine non è controllato.');
    }

    let precedente = null;
    let successivo = null;
    lista.forEach(function (u) {
      if (u.data < data) precedente = u;
      else if (u.data > data && !successivo) successivo = u;
    });
    const dopo = precedente ? D.diffDays(precedente.data, data) : null;
    const prima = successivo ? D.diffDays(data, successivo.data) : null;
    if (dopo !== null && dopo < T.predibIntervalloMin) {
      peggiora('rosso');
      motivi.push('Solo ' + dopo + ' giorni dopo l\'udienza del ' + D.fmtIt(precedente.data) + ' (minimo ' + T.predibIntervalloMin + ', cinque settimane).');
    }
    if (prima !== null && prima < T.predibIntervalloMin) {
      peggiora('rosso');
      motivi.push('Solo ' + prima + ' giorni prima dell\'udienza del ' + D.fmtIt(successivo.data) + ' (minimo ' + T.predibIntervalloMin + ', cinque settimane).');
    }

    const t = C.timeline(state, data);
    const p = posti(state, data);
    if (p < fascicoli.length) {
      peggiora('giallo');
      motivi.push(p === 0 ? 'La giornata è piena (massimo ' + state.parametri.predibFascicoliPerUdienza + ' fascicoli per udienza).' : 'Entrano solo ' + p + ' fascicoli su ' + fascicoli.length + ' (massimo ' + state.parametri.predibFascicoliPerUdienza + ' per udienza, restano ' + (fascicoli.length - p) + ').');
    }

    const avvisi = [];
    const previsti = state.parametri.predibFascicoliPerUdienza;
    const giaFissati = t.eventi.filter(function (e) {
      return e.tipo === 'PREDIB' && e.stato !== 'provvisorio';
    }).length;

    let ricezione = null;
    fascicoli.forEach(function (f) {
      if (f.ricezione && D.isValidYmd(f.ricezione) && (!ricezione || f.ricezione > ricezione)) ricezione = f.ricezione;
    });
    const riferimento = ricezione || opz.oggi || D.today();

    return {
      data: data,
      stato: stato,
      motivi: motivi,
      avvisi: avvisi,
      giaFissati: giaFissati,
      previsti: previsti,
      giorniDaPrecedente: dopo,
      precedente: precedente ? precedente.data : null,
      giorniAlSuccessivo: prima,
      successivo: successivo ? successivo.data : null,
      posti: p,
      minutiLiberi: t.liberi,
      attivitaPresenti: t.eventi.length,
      giorniLiberiStudio: giorniLiberiPerStudio(state, data),
      giorniDaRicezione: D.diffDays(riferimento, data),
      riferimentoRicezione: ricezione ? 'ricezione' : 'oggi'
    };
  }

  /** Date candidate: giorni di udienza da `da` per `giorni` giorni, valutate e ordinate.
      ordine: 'prima' (la più vicina) oppure 'studio' (più giorni liberi per studiare, poi la più vicina). */
  function candidate(state, fascicoli, opz) {
    opz = opz || {};
    const oggi = opz.oggi || D.today();
    const da = opz.da || oggi;
    const giorni = opz.giorni || 180;
    const ud = udienze(state);
    const min = dataMinima(state, fascicoli);
    const out = [];
    for (let i = 0; i < giorni; i++) {
      const s = D.addDays(da, i);
      if (C.dayStatus(state, s).stato !== 'udienza') continue;
      out.push(valuta(state, s, fascicoli, { udienze: ud, minimo: min, oggi: oggi }));
    }
    const ordine = opz.ordine || 'prima';
    out.sort(function (a, b) {
      const ra = a.stato === 'rosso';
      const rb = b.stato === 'rosso';
      if (ra !== rb) return ra ? 1 : -1; // le date non consentite in fondo
      if (ordine === 'studio' && a.giorniLiberiStudio !== b.giorniLiberiStudio) return b.giorniLiberiStudio - a.giorniLiberiStudio;
      return a.data < b.data ? -1 : a.data > b.data ? 1 : 0;
    });
    return { minimo: min, righe: out };
  }

  /** Assegna gli orari ai fascicoli: slot da 10 minuti nei vuoti, in ordine, senza toccare la pausa. */
  function assegnaOrari(state, data, n, opz) {
    opz = opz || {};
    const slot = state.parametri.durate.PREDIB;
    const t = C.timeline(state, data);
    const intervalli = t.vuoti.map(function (v) {
      return [v.startMin, v.endMin];
    });
    if (opz.usaTolleranza && t.tol > t.fin) {
      let libero = [[t.fin, t.tol]];
      t.eventi.forEach(function (e) {
        if (e.stato !== 'provvisorio') libero = C.subtract(libero, e.startMin, e.endMin);
      });
      libero.forEach(function (x) {
        intervalli.push(x);
      });
    }
    intervalli.sort(function (a, b) {
      return a[0] - b[0];
    });
    const orari = [];
    intervalli.forEach(function (it) {
      for (let c = it[0]; c + slot <= it[1] && orari.length < n; c += slot) orari.push(c);
    });
    return { orari: orari.map(D.minToHhmm), mancanti: n - orari.length };
  }

  /** Fissa i fascicoli alla data scelta: un'attività di predibattimento da 10 minuti ciascuno, prima udienza. */
  function fissa(state, data, fascicoli, opz) {
    opz = opz || {};
    const a = assegnaOrari(state, data, fascicoli.length, opz);
    const slot = state.parametri.durate.PREDIB;
    const creati = [];
    for (let i = 0; i < a.orari.length; i++) {
      const f = fascicoli[i];
      const r = M.addEvento(state, {
        fascicoloId: f.id,
        data: data,
        inizio: a.orari[i],
        durata: slot,
        tipo: 'PREDIB',
        stato: opz.stato || 'ufficiale',
        rinvioDal: '1 UD',
        fonte: 'predib'
      });
      if (r.ok) {
        creati.push(r.valore.id);
        M.updateFascicolo(state, f.id, { predibDaFissare: false });
      }
    }
    M.log(state, 'fissa', 'predibattimento', null, D.fmtIt(data) + ': ' + creati.length + ' fascicoli' + (a.mancanti ? ', ' + a.mancanti + ' non collocati' : ''));
    return { creati: creati.length, nonCollocati: a.mancanti, nonCollocatiId: fascicoli.slice(a.orari.length).map(function (f) { return f.id; }) };
  }

  /** Piano per molti fascicoli: li divide in gruppi da `predibFascicoliPerUdienza` e sceglie per ciascun gruppo la prima data
      non rosso, tenendo conto dei gruppi già pianificati (5 settimane tra un'udienza e l'altra). Non modifica lo stato.
      Ordine dei fascicoli: urgenti, poi per data di notifica (i più vecchi prima), poi per RG. */
  function piano(state, fascicoli, opz) {
    opz = opz || {};
    const per = opz.perUdienza || state.parametri.predibFascicoliPerUdienza;
    const oggi = opz.oggi || D.today();
    const ordinati = fascicoli.slice().sort(function (a, b) {
      if (!!a.urgente !== !!b.urgente) return a.urgente ? -1 : 1;
      const na = a.notificaCitazione || '9999-12-31';
      const nb = b.notificaCitazione || '9999-12-31';
      if (na !== nb) return na < nb ? -1 : 1;
      return String(a.rg || a.id) < String(b.rg || b.id) ? -1 : 1;
    });
    const copia = JSON.parse(JSON.stringify(state));
    const gruppi = [];
    for (let i = 0; i < ordinati.length; i += per) {
      const ids = ordinati.slice(i, i + per).map(function (f) {
        return f.id;
      });
      const g = ids.map(function (id) {
        return M.getFascicolo(copia, id);
      });
      const c = candidate(copia, g, { oggi: oggi, ordine: opz.ordine || 'prima', giorni: 540 });
      // Prima una data idonea che resta entro il numero previsto; poi una idonea; solo se non c'è, la prima con riserve.
      const scelta =
        c.righe.find(function (r) {
          return r.stato === 'verde' && r.giaFissati + g.length <= per;
        }) ||
        c.righe.find(function (r) {
          return r.stato === 'verde';
        }) ||
        c.righe.find(function (r) {
          return r.stato !== 'rosso';
        });
      if (!scelta) {
        gruppi.push({ ids: ids, data: null, stato: 'rosso', motivi: ['Nessuna data utile nei prossimi 18 mesi.'] });
        continue;
      }
      fissa(copia, scelta.data, g, {});
      gruppi.push({ ids: ids, data: scelta.data, stato: scelta.stato, motivi: scelta.motivi, avvisi: scelta.avvisi });
    }
    return gruppi;
  }

  /** Riga di controllo per ogni udienza predibattimentale: giorni dalla precedente e rispetto delle 5 settimane. */
  function riepilogoUdienze(state) {
    const ud = udienze(state);
    const T = state.parametri.termini;
    return ud.map(function (u, i) {
      const giorni = i > 0 ? D.diffDays(ud[i - 1].data, u.data) : null;
      return Object.assign({}, u, { giorniDaPrecedente: giorni, rispetta: giorni === null || giorni >= T.predibIntervalloMin });
    });
  }

  GC.predib = {
    primaUdienza: primaUdienza,
    udienze: udienze,
    dataMinima: dataMinima,
    giorniLiberiPerStudio: giorniLiberiPerStudio,
    posti: posti,
    postiFisici: postiFisici,
    valuta: valuta,
    candidate: candidate,
    assegnaOrari: assegnaOrari,
    fissa: fissa,
    piano: piano,
    riepilogoUdienze: riepilogoUdienze
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
