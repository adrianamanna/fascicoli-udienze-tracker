/* Modello dati: fascicoli, attività (udienze), storico. Identificatori progressivi, nessuna casualità. */
(function (root) {
  'use strict';
  const GC = (root.GC = root.GC || {});
  const D = GC.dates;

  const TIPI = {
    PREDIB: { label: 'Predibattimento', famiglia: 'predib' },
    INCAMERAMENTO: { label: 'Incameramento', famiglia: 'dib' },
    DIBATTIMENTO: { label: 'Udienza dibattimentale (da precisare)', famiglia: 'dib' },
    ISTRUTTORIA: { label: 'Istruttoria', famiglia: 'dib' },
    DISCUSSIONE: { label: 'Discussione', famiglia: 'dib' },
    REPLICHE: { label: 'Repliche', famiglia: 'dib' },
    PERITO: { label: 'Perito', famiglia: 'perito' },
    RISERVA: { label: 'Scioglimento riserva', famiglia: 'cam' },
    RITI: { label: 'Rinvio per riti o trattative', famiglia: 'cam' },
    MAP: { label: 'Messa alla prova', famiglia: 'cam' },
    ESECUZIONE: { label: 'Esecuzione', famiglia: 'cam' },
    RIUNIONE: { label: 'Riunione', famiglia: 'cam' },
    ALTRO: { label: 'Altro', famiglia: 'altro' }
  };

  const ORIGINI = {
    GUP: 'Da GUP',
    PREDIB: 'Da predibattimento',
    IMMEDIATO: 'Da giudizio immediato',
    ALTRO: 'Altra o non indicata'
  };

  // Fase del fascicolo: dove si trova nel percorso. Elenco ricavato dalla specifica (§3-bis, §7, §9, §9-bis): da confermare con il giudice.
  const FASI = {
    NUOVO: 'Nuovo, da inquadrare',
    PREDIB: 'Predibattimento',
    INCAMERAMENTO: 'In attesa di incameramento',
    ISTRUTTORIA: 'Istruttoria',
    DISCUSSIONE: 'Discussione',
    RISERVA: 'In riserva',
    RITI: 'Rinvio per riti o trattative',
    MAP: 'Messa alla prova (sospeso)',
    ESECUZIONE: 'Esecuzione',
    CHIUSO: 'Chiuso'
  };

  const STATI = {
    ufficiale: 'Ufficiale',
    provvisorio: 'Provvisorio (appunto personale)'
  };

  const model = {
    TIPI: TIPI,
    FASI: FASI,
    ORIGINI: ORIGINI,
    STATI: STATI,
    clock: function () {
      return new Date().toISOString();
    }
  };

  model.newState = function () {
    return {
      versione: 1,
      parametri: GC.params.defaults(),
      fascicoli: [],
      eventi: [],
      importazioni: [],
      storico: [],
      meta: { prossimoId: 1, ultimoBackup: null }
    };
  };

  /** Rende coerente uno stato letto da disco o da un backup. */
  model.normalizeState = function (raw) {
    const s = model.newState();
    if (!raw || typeof raw !== 'object') return s;
    s.versione = 1;
    s.parametri = GC.params.load(raw.parametri);
    s.fascicoli = Array.isArray(raw.fascicoli) ? raw.fascicoli : [];
    s.eventi = Array.isArray(raw.eventi) ? raw.eventi : [];
    s.importazioni = Array.isArray(raw.importazioni) ? raw.importazioni : [];
    s.storico = Array.isArray(raw.storico) ? raw.storico : [];
    s.meta = Object.assign({ prossimoId: 1, ultimoBackup: null }, raw.meta || {});
    let max = 0;
    s.fascicoli.concat(s.eventi).forEach(function (o) {
      const n = parseInt(String(o.id || '').replace(/\D/g, ''), 10);
      if (n > max) max = n;
    });
    if (!(s.meta.prossimoId > max)) s.meta.prossimoId = max + 1;
    return s;
  };

  function nextId(state, prefisso) {
    const n = state.meta.prossimoId++;
    return prefisso + String(n).padStart(5, '0');
  }

  function log(state, azione, oggetto, id, dettaglio) {
    state.storico.push({ t: model.clock(), azione: azione, oggetto: oggetto, id: id || null, dettaglio: dettaglio || '' });
    if (state.storico.length > 5000) state.storico.splice(0, state.storico.length - 5000);
  }
  model.log = log;

  function normRg(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  }
  function chiaveRg(s) {
    return normRg(s).toLowerCase().replace(/\s+/g, '');
  }

  model.findFascicoloByRg = function (state, rg) {
    const k = chiaveRg(rg);
    if (!k) return null;
    return (
      state.fascicoli.find(function (f) {
        return chiaveRg(f.rg) === k;
      }) || null
    );
  };

  model.getFascicolo = function (state, id) {
    return (
      state.fascicoli.find(function (f) {
        return f.id === id;
      }) || null
    );
  };

  model.getEvento = function (state, id) {
    return (
      state.eventi.find(function (e) {
        return e.id === id;
      }) || null
    );
  };

  model.validateFascicolo = function (d) {
    const err = [];
    if (!normRg(d.rg) && !String(d.imputato || '').trim()) err.push('Indica almeno il numero di ruolo o il nome dell\'imputato.');
    if (d.origine && !ORIGINI[d.origine]) err.push('Origine non valida.');
    if (d.fase && !FASI[d.fase]) err.push('Fase non valida.');
    return err;
  };

  /** Fase del fascicolo. Se non è stata indicata, si ricava dai segni che ci sono già (flag, attività). */
  model.faseDi = function (f, state) {
    if (f.fase && FASI[f.fase]) return f.fase;
    if (f.predibDaFissare) return 'PREDIB';
    if (f.incameramentoDaFissare) return 'INCAMERAMENTO';
    if (state) {
      const ev = model.eventiDelFascicolo(state, f.id);
      if (ev.length) {
        // Suggerimento: la prossima attività ufficiale in calendario, altrimenti l'ultima.
        const oggi = D.today();
        const ufficiali = ev.filter(function (e) {
          return e.stato !== 'provvisorio';
        });
        const riferimento = ufficiali.find(function (e) {
          return e.data >= oggi;
        }) || ufficiali[ufficiali.length - 1];
        const t = riferimento && riferimento.tipo;
        if (t && FASI[t]) return t;
        if (t === 'PERITO') return 'ISTRUTTORIA';
        if (t === 'REPLICHE') return 'DISCUSSIONE';
      }
    }
    return 'NUOVO';
  };

  /** Elenco filtrato per testo (RG, imputato, reato) e per fase. */
  model.filtraFascicoli = function (state, opz) {
    const q = String((opz && opz.testo) || '').trim().toLowerCase();
    const fase = (opz && opz.fase) || '';
    return state.fascicoli
      .filter(function (f) {
        if (q && (f.rg + ' ' + f.imputato + ' ' + (f.reato || '')).toLowerCase().indexOf(q) < 0) return false;
        if (fase && model.faseDi(f, state) !== fase) return false;
        return true;
      })
      .sort(function (a, b) {
        return (a.rg || '\uffff') < (b.rg || '\uffff') ? -1 : 1;
      });
  };

  model.addFascicolo = function (state, d) {
    const err = model.validateFascicolo(d);
    if (!err.length && normRg(d.rg) && model.findFascicoloByRg(state, d.rg)) err.push('Esiste già un fascicolo con questo numero di ruolo.');
    if (err.length) return { ok: false, errori: err };
    const f = {
      id: nextId(state, 'F'),
      rg: normRg(d.rg),
      imputato: String(d.imputato || '').trim(),
      origine: d.origine && ORIGINI[d.origine] ? d.origine : 'ALTRO',
      detenuto: !!d.detenuto,
      reato: String(d.reato || '').trim(),
      pm: String(d.pm || '').trim(),
      nrOrd: String(d.nrOrd || '').trim(),
      ricezione: D.isValidYmd(d.ricezione) ? d.ricezione : '',
      notificaCitazione: D.isValidYmd(d.notificaCitazione) ? d.notificaCitazione : '',
      urgente: !!d.urgente,
      predibDaFissare: !!d.predibDaFissare,
      dataProvvedimento: D.isValidYmd(d.dataProvvedimento) ? d.dataProvvedimento : '',
      incameramentoDaFissare: !!d.incameramentoDaFissare,
      fase: d.fase && FASI[d.fase] ? d.fase : '',
      note: String(d.note || '').trim()
    };
    state.fascicoli.push(f);
    log(state, 'crea', 'fascicolo', f.id, (f.rg || '(senza RG)') + ' ' + f.imputato);
    return { ok: true, valore: f };
  };

  model.updateFascicolo = function (state, id, patch) {
    const f = model.getFascicolo(state, id);
    if (!f) return { ok: false, errori: ['Fascicolo non trovato.'] };
    const nuovo = Object.assign({}, f, patch);
    const err = model.validateFascicolo(nuovo);
    if (!err.length && normRg(nuovo.rg)) {
      const altro = model.findFascicoloByRg(state, nuovo.rg);
      if (altro && altro.id !== id) err.push('Esiste già un fascicolo con questo numero di ruolo.');
    }
    if (err.length) return { ok: false, errori: err };
    f.rg = normRg(nuovo.rg);
    f.imputato = String(nuovo.imputato || '').trim();
    f.origine = nuovo.origine && ORIGINI[nuovo.origine] ? nuovo.origine : 'ALTRO';
    f.detenuto = !!nuovo.detenuto;
    f.reato = String(nuovo.reato || '').trim();
    f.pm = String(nuovo.pm || '').trim();
    f.nrOrd = String(nuovo.nrOrd || '').trim();
    f.ricezione = D.isValidYmd(nuovo.ricezione) ? nuovo.ricezione : '';
    f.notificaCitazione = D.isValidYmd(nuovo.notificaCitazione) ? nuovo.notificaCitazione : '';
    f.urgente = !!nuovo.urgente;
    f.predibDaFissare = !!nuovo.predibDaFissare;
    f.dataProvvedimento = D.isValidYmd(nuovo.dataProvvedimento) ? nuovo.dataProvvedimento : '';
    f.incameramentoDaFissare = !!nuovo.incameramentoDaFissare;
    f.note = String(nuovo.note || '').trim();
    const faseVecchia = f.fase || '';
    f.fase = nuovo.fase && FASI[nuovo.fase] ? nuovo.fase : '';
    log(state, 'modifica', 'fascicolo', f.id, (f.rg || '(senza RG)') + ' ' + f.imputato + (faseVecchia !== f.fase ? ' · fase: ' + (FASI[faseVecchia] || 'non indicata') + ' → ' + (FASI[f.fase] || 'non indicata') : ''));
    return { ok: true, valore: f };
  };

  model.eventiDelFascicolo = function (state, id) {
    return state.eventi
      .filter(function (e) {
        return e.fascicoloId === id;
      })
      .sort(function (a, b) {
        return a.data < b.data ? -1 : a.data > b.data ? 1 : D.hhmmToMin(a.inizio) - D.hhmmToMin(b.inizio);
      });
  };

  model.deleteFascicolo = function (state, id, opts) {
    const f = model.getFascicolo(state, id);
    if (!f) return { ok: false, errori: ['Fascicolo non trovato.'] };
    const ev = model.eventiDelFascicolo(state, id);
    if (ev.length && !(opts && opts.conAttivita)) return { ok: false, errori: ['Il fascicolo ha ' + ev.length + ' attività collegate.'], richiedeConferma: true };
    state.eventi = state.eventi.filter(function (e) {
      return e.fascicoloId !== id;
    });
    state.fascicoli = state.fascicoli.filter(function (x) {
      return x.id !== id;
    });
    log(state, 'elimina', 'fascicolo', id, (f.rg || '(senza RG)') + ' ' + f.imputato + (ev.length ? ' con ' + ev.length + ' attività' : ''));
    return { ok: true };
  };

  model.validateEvento = function (state, d) {
    const err = [];
    if (!D.isValidYmd(d.data)) err.push('La data non è valida.');
    if (isNaN(D.hhmmToMin(d.inizio))) err.push("L'ora di inizio non è valida (usa HH:MM).");
    if (!(Number.isInteger(d.durata) && d.durata >= 1 && d.durata <= 600)) err.push('La durata deve essere un numero intero di minuti, da 1 a 600.');
    if (!TIPI[d.tipo]) err.push('Il tipo di attività non è valido.');
    if (!STATI[d.stato]) err.push('Lo stato non è valido.');
    if (d.fascicoloId && !model.getFascicolo(state, d.fascicoloId)) err.push('Il fascicolo collegato non esiste.');
    if (!isNaN(D.hhmmToMin(d.inizio)) && D.hhmmToMin(d.inizio) + d.durata > 24 * 60) err.push("L'attività non può superare la mezzanotte.");
    return err;
  };

  function descrivi(e) {
    return (TIPI[e.tipo] ? TIPI[e.tipo].label : e.tipo) + ' ' + e.data + ' ' + e.inizio + ' (' + e.durata + ' min)';
  }

  model.addEvento = function (state, d) {
    const dati = {
      fascicoloId: d.fascicoloId || null,
      data: d.data,
      inizio: isNaN(D.hhmmToMin(d.inizio)) ? d.inizio : D.minToHhmm(D.hhmmToMin(d.inizio)),
      durata: d.durata,
      tipo: d.tipo || 'ALTRO',
      stato: d.stato || 'ufficiale',
      titolo: String(d.titolo || '').trim(),
      note: String(d.note || '').trim(),
      sovrapponibile: !!d.sovrapponibile,
      rinvioDal: String(d.rinvioDal || '').trim(),
      esito: String(d.esito || '').trim(),
      fonte: d.fonte || 'manuale'
    };
    const err = model.validateEvento(state, dati);
    if (err.length) return { ok: false, errori: err };
    dati.id = nextId(state, 'E');
    state.eventi.push(dati);
    log(state, 'crea', 'evento', dati.id, descrivi(dati));
    return { ok: true, valore: dati };
  };

  model.updateEvento = function (state, id, patch) {
    const e = model.getEvento(state, id);
    if (!e) return { ok: false, errori: ['Attività non trovata.'] };
    const nuovo = Object.assign({}, e, patch);
    if (!isNaN(D.hhmmToMin(nuovo.inizio))) nuovo.inizio = D.minToHhmm(D.hhmmToMin(nuovo.inizio));
    const err = model.validateEvento(state, nuovo);
    if (err.length) return { ok: false, errori: err };
    ['fascicoloId', 'data', 'inizio', 'durata', 'tipo', 'stato', 'titolo', 'note', 'sovrapponibile', 'rinvioDal', 'esito'].forEach(function (k) {
      e[k] = nuovo[k];
    });
    e.rinvioDal = String(e.rinvioDal || '').trim();
    e.esito = String(e.esito || '').trim();
    e.fascicoloId = e.fascicoloId || null;
    e.titolo = String(e.titolo || '').trim();
    e.note = String(e.note || '').trim();
    e.sovrapponibile = !!e.sovrapponibile;
    log(state, 'modifica', 'evento', e.id, descrivi(e));
    return { ok: true, valore: e };
  };

  model.deleteEvento = function (state, id) {
    const e = model.getEvento(state, id);
    if (!e) return { ok: false, errori: ['Attività non trovata.'] };
    state.eventi = state.eventi.filter(function (x) {
      return x.id !== id;
    });
    log(state, 'elimina', 'evento', id, descrivi(e));
    return { ok: true };
  };

  /** Etichetta breve di un'attività: tipo + riferimento al fascicolo. */
  model.etichettaEvento = function (state, e) {
    const f = e.fascicoloId ? model.getFascicolo(state, e.fascicoloId) : null;
    const base = e.titolo || (TIPI[e.tipo] ? TIPI[e.tipo].label : e.tipo);
    return f ? base + ' · ' + (f.rg || f.imputato) : base;
  };

  GC.model = model;
})(typeof globalThis !== 'undefined' ? globalThis : this);
