/* Parametri dell'app. Ogni valore predefinito rimanda alla regola del documento di specifica. */
(function (root) {
  'use strict';
  const GC = (root.GC = root.GC || {});

  function defaults() {
    return {
      // G-02, G-09, G-14: fascia 9:00-15:00, tolleranza fino alle 15:30, pausa 14:00-14:15
      orario: {
        inizio: '09:00',
        fine: '15:00',
        tolleranzaFine: '15:30',
        pausaInizio: '14:00',
        pausaFine: '14:15'
      },
      // Durate predefinite per tipo di attività (minuti): P-01, N-01, T-03, D-02, D-04, PE-01, PE-09, S-03, X-06, M-02, R-01
      durate: {
        PREDIB: 10,
        INCAMERAMENTO: 90,
        DIBATTIMENTO: 10,
        RINTRACCIO: 10,
        ISTRUTTORIA: 30,
        DISCUSSIONE: 30,
        REPLICHE: 10,
        PERITO: 30,
        RISERVA: 10,
        RITI: 10,
        MAP: 10,
        ESECUZIONE: 10,
        RIUNIONE: 10,
        ALTRO: 10
      },
      // F-01: sotto questa durata un intervallo libero è un margine, non un vuoto riempibile
      vuotoMinimo: 10,
      // T-07: margine tra due istruttorie nella stessa giornata
      margineIstruttorie: 10,
      // Termini di legge e di prassi usati dai calcoli (giorni)
      termini: {
        incameramentoGupPredib: 20, // art. 429 c. 3; art. 554-ter c. 4
        immediato: 30, // art. 456 c. 3
        ritiDopoNotifica: 15, // art. 458 c. 1
        predibNotifica: 60, // art. 552 c. 3
        predibNotificaUrgenza: 45, // art. 552 c. 3
        predibIntervalloMin: 35, // P-04: 5 settimane
        periziaMax: 60, // art. 508 c. 1
        preavvisoEsecuzione: 10, // art. 666 c. 3 (da verificare)
        opposizioneEsecuzione: 15, // art. 667 c. 4
        relazionePeritoGiorni: 7, // art. 501 c. 1-bis
        listeProveGiorni: 7 // art. 468 c. 1
      },
      giorniUdienza: {
        settimanali: [], // 1 = lunedì ... 5 = venerdì (7 = domenica)
        date: [] // giorni extra 'AAAA-MM-GG'
      },
      indisponibilita: [], // { da, a, motivo }
      feriale: { attivo: true, inizio: '08-01', fine: '08-31' }, // nessuna udienza e termini sospesi
      patrono: { attivo: false, mese: 12, giorno: 7, nome: '' },
      backupPromemoriaGiorni: 30,
      // P-04: una giornata è "udienza predibattimentale" se ha almeno questi fascicoli alla prima udienza.
      // I rinvii di singoli fascicoli su altri giorni non contano per l'intervallo di 5 settimane.
      predibSogliaUdienza: 5,
      // Fascicoli previsti per ogni udienza predibattimentale (circa): è un obiettivo, non un limite.
      predibFascicoliPerUdienza: 30,
      // N-01, §2: ogni quanti mesi si tiene l'incameramento per origine del fascicolo (0 = nessuna regola)
      incameramentoMesi: { GUP: 3, PREDIB: 6, IMMEDIATO: 0 },
      // Nome con cui compari nel ruolo delle udienze (colonna "Giudice"): serve a importare solo le tue righe
      giudiceRuolo: 'GIUDICE 1'
    };
  }

  function isPlain(o) {
    return o !== null && typeof o === 'object' && !Array.isArray(o);
  }

  /** Fonde i parametri salvati sopra i predefiniti: le chiavi mancanti prendono il valore di default. */
  function merge(base, saved) {
    const out = {};
    Object.keys(base).forEach(function (k) {
      if (isPlain(base[k])) out[k] = merge(base[k], isPlain(saved && saved[k]) ? saved[k] : {});
      else out[k] = saved && saved[k] !== undefined ? saved[k] : base[k];
    });
    return out;
  }

  function load(saved) {
    return merge(defaults(), saved || {});
  }

  /** Controlla la coerenza degli orari. Restituisce un elenco di messaggi (vuoto se tutto ok). */
  function validate(p) {
    const D = GC.dates;
    const err = [];
    const o = p.orario;
    const v = {
      inizio: D.hhmmToMin(o.inizio),
      fine: D.hhmmToMin(o.fine),
      tol: D.hhmmToMin(o.tolleranzaFine),
      pi: D.hhmmToMin(o.pausaInizio),
      pf: D.hhmmToMin(o.pausaFine)
    };
    Object.keys(v).forEach(function (k) {
      if (isNaN(v[k])) err.push('Orario non valido: ' + k);
    });
    if (err.length) return err;
    if (!(v.inizio < v.fine)) err.push("L'inizio deve precedere la fine.");
    if (!(v.fine <= v.tol)) err.push('La tolleranza non può terminare prima della fine ordinaria.');
    if (!(v.pi < v.pf)) err.push("L'inizio della pausa deve precedere la sua fine.");
    if (!(v.inizio <= v.pi && v.pf <= v.fine)) err.push("La pausa deve cadere dentro l'orario di udienza.");
    Object.keys(p.durate).forEach(function (t) {
      const n = p.durate[t];
      if (!(Number.isInteger(n) && n >= 1 && n <= 600)) err.push('Durata non valida per ' + t + ' (da 1 a 600 minuti).');
    });
    return err;
  }

  GC.params = { defaults: defaults, merge: merge, load: load, validate: validate };
})(typeof globalThis !== 'undefined' ? globalThis : this);
