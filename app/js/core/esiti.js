/* Esiti delle udienze e prossima azione del fascicolo.
   Ogni esito ha una regola della specifica (campo "fonte") e propone una sola cosa: una nuova attività, la chiusura,
   un cambio di fase oppure "scelgo io". L'app propone, il giudice conferma: niente cambia da solo.
   Tutto deterministico: stessi dati, stessa proposta. */
(function (root) {
  'use strict';
  const GC = (root.GC = root.GC || {});
  const D = GC.dates;

  /* quando: { prima:true } prima data utile dopo l'udienza | { giorni:n } | { mesi:n } | { entro:n } ultima data utile entro n giorni
             | { riti:true } 30 giorni, poi +30 a ogni rinvio | null (nessuna data proposta, sceglie il giudice)
     I numeri possono essere il nome di un parametro in parametri.rinvii o parametri.termini. */
  const TUTTI = '*';

  const ESITI = {
    // ---- validi in ogni udienza (G-12: la riserva è sempre disponibile)
    RINVIO: { label: 'Rinvio (prosegue)', tipi: TUTTI, passo: { udienza: 'STESSO', quando: { prima: true } }, fonte: 'G-04, T-07' },
    RISERVA: { label: 'Mi riservo la decisione', tipi: TUTTI, fase: 'RISERVA', passo: { udienza: 'RISERVA', quando: { prima: true } }, fonte: 'G-12, S-01, S-04' },
    RITI_RINVIO: { label: 'Rinvio per riti o trattative', tipi: TUTTI, fase: 'RITI', passo: { udienza: 'RITI', quando: { riti: true } }, fonte: 'Z-01, Z-04' },
    MAP_RICHIESTA: { label: 'Richiesta di messa alla prova (MAP)', tipi: TUTTI, fase: 'MAP', passo: { udienza: 'MAP', quando: { prima: true } }, fonte: 'M-01, P-18' },
    RIUNIONE_DISP: { label: 'Riunione con altro fascicolo', tipi: TUTTI, passo: { udienza: 'RIUNIONE', quando: { prima: true } }, fonte: 'R-01, R-02, P-17' },
    PERITO_NOMINA: { label: 'Nomina del perito', tipi: TUTTI, fase: 'ISTRUTTORIA', passo: { udienza: 'PERITO', durata: 'conferimentoPerito', quando: { prima: true } }, fonte: 'PE-01, P-16' },
    SENTENZA: { label: 'Sentenza o decreto: fascicolo definito', tipi: TUTTI, fase: 'CHIUSO', passo: { chiudi: true, motivazione: true }, fonte: 'S-10' },
    // ---- predibattimento (P-10 ... P-18)
    PRE_GIUDIZIO: { label: 'Prosecuzione del giudizio: va ad altro giudice', tipi: ['PREDIB'], fase: 'CHIUSO', passo: { chiudi: true, avviso: 'Il fascicolo esce dal tuo calendario. Il giudizio si fissa davanti a un altro giudice almeno 20 giorni dopo il provvedimento (art. 554-ter c. 3 e 4).' }, fonte: 'P-10' },
    PRE_RESTITUZIONE: { label: 'Restituzione al PM o non luogo a procedere', tipi: ['PREDIB'], fase: 'CHIUSO', passo: { chiudi: true }, fonte: 'P-11' },
    PRE_RINOTIFICA: { label: 'Rinotifica', tipi: ['PREDIB'], fase: 'PREDIB', passo: { udienza: 'PREDIB', quando: { mesi: 'rinotificaMesi' } }, fonte: 'P-12' },
    PRE_ABBREVIATO: { label: 'Abbreviato', tipi: ['PREDIB'], fase: 'DISCUSSIONE', passo: { udienza: 'DISCUSSIONE', quando: { prima: true } }, fonte: 'P-13' },
    PRE_ABB_COND: { label: 'Abbreviato condizionato', tipi: ['PREDIB'], fase: 'ISTRUTTORIA', passo: { udienza: 'ISTRUTTORIA', quando: { prima: true } }, fonte: 'P-14' },
    PRE_PATTEGGIAMENTO: { label: 'Patteggiamento, remissione di querela o altro non luogo a procedere', tipi: ['PREDIB'], fase: 'CHIUSO', passo: { chiudi: true }, fonte: 'P-15' },
    // ---- prima udienza di giudizio (§3-bis)
    DIB_PROVE: { label: 'Prove ammesse: calendarizzo l\'istruttoria', tipi: ['INCAMERAMENTO', 'DIBATTIMENTO', 'RINTRACCIO', 'RISERVA', 'RITI'], fase: 'ISTRUTTORIA', passo: { udienza: 'ISTRUTTORIA', quando: { prima: true } }, fonte: 'N-02, N-05, T-01' },
    RIN_PROCEDE: { label: 'Imputato rintracciato: si procede', tipi: ['RINTRACCIO'], passo: { udienza: 'DIBATTIMENTO', quando: { prima: true } }, fonte: 'RUO-12 (da confermare)' },
    // ---- istruttoria (§4, §5)
    IST_PROSEGUE: { label: 'Istruttoria non conclusa: prosegue', tipi: ['ISTRUTTORIA'], fase: 'ISTRUTTORIA', passo: { udienza: 'ISTRUTTORIA', quando: { prima: true } }, fonte: 'T-04, T-07' },
    IST_DISCUSSIONE_ALTRA: { label: 'Istruttoria conclusa: discussione in altra udienza', tipi: ['ISTRUTTORIA'], fase: 'DISCUSSIONE', passo: { udienza: 'DISCUSSIONE', quando: { prima: true } }, fonte: 'D-02' },
    IST_DISCUSSIONE_STESSA: { label: 'Istruttoria conclusa: discussione nella stessa udienza', tipi: ['ISTRUTTORIA'], fase: 'DISCUSSIONE', passo: { soloFase: true }, fonte: 'D-01' },
    DIS_REPLICHE: { label: 'Discussione: rinvio per le repliche', tipi: ['DISCUSSIONE'], fase: 'DISCUSSIONE', passo: { udienza: 'REPLICHE', quando: { prima: true } }, fonte: 'D-04' },
    DIS_RIAPRI_507: { label: 'Riapro l\'istruttoria (art. 507)', tipi: ['DISCUSSIONE', 'REPLICHE'], fase: 'ISTRUTTORIA', passo: { udienza: 'ISTRUTTORIA', quando: { prima: true } }, fonte: 'D-03, D-05, D-06' },
    // ---- perito (§6)
    PER_CONFERITO: { label: 'Incarico conferito: esame del perito', tipi: ['PERITO'], fase: 'ISTRUTTORIA', passo: { udienza: 'PERITO', quando: { entro: 'periziaMax' } }, fonte: 'PE-02', durataDefault: true },
    PER_ESAMINATO: { label: 'Perito esaminato: prosegue l\'istruttoria', tipi: ['PERITO'], fase: 'ISTRUTTORIA', passo: { udienza: 'ISTRUTTORIA', quando: { prima: true } }, fonte: 'PE-09' },
    PER_INTEGRAZIONE: { label: 'Integrazione o nuova perizia', tipi: ['PERITO'], fase: 'ISTRUTTORIA', passo: { udienza: 'PERITO', quando: { entro: 'periziaMax' } }, fonte: 'PE-02, PE-11' },
    // ---- rinvio per riti o trattative (§9-quater)
    RIT_ABBREVIATO: { label: 'Richiesto l\'abbreviato', tipi: ['RITI'], fase: 'DISCUSSIONE', passo: { udienza: 'DISCUSSIONE', quando: { prima: true } }, fonte: 'Z-07, P-13' },
    RIT_ABB_COND: { label: 'Richiesto l\'abbreviato condizionato', tipi: ['RITI'], fase: 'ISTRUTTORIA', passo: { udienza: 'ISTRUTTORIA', quando: { prima: true } }, fonte: 'Z-07, P-14' },
    RIT_PATTEGGIAMENTO: { label: 'Patteggiamento', tipi: ['RITI'], fase: 'CHIUSO', passo: { chiudi: true }, fonte: 'Z-07, P-15' },
    RIT_REMISSIONE: { label: 'Remissione di querela depositata e accettata', tipi: ['RITI'], fase: 'CHIUSO', passo: { chiudi: true }, fonte: 'Z-07, Z-08' },
    RIT_FALLITE: { label: 'Trattative fallite o nessuna richiesta: flusso ordinario', tipi: ['RITI'], fase: 'ISTRUTTORIA', passo: { udienza: 'ISTRUTTORIA', quando: { prima: true } }, fonte: 'Z-07' },
    // ---- messa alla prova (§9)
    MAP_AMMISSIBILE: { label: 'Istanza ammissibile: programma con UEPE (MAP 2)', tipi: ['MAP'], fase: 'MAP', passo: { udienza: 'MAP', quando: { giorni: 'mapSecondoGiorni' } }, fonte: 'M-02, M-03' },
    MAP_AMMESSA: { label: 'MAP ammessa e procedimento sospeso: udienza finale', tipi: ['MAP'], fase: 'MAP', passo: { udienza: 'MAP', quando: null }, fonte: 'M-03, M-04, M-07' },
    MAP_SUPPLEMENTARE: { label: 'Rinvio MAP supplementare (UEPE chiede tempo)', tipi: ['MAP'], fase: 'MAP', passo: { udienza: 'MAP', quando: { prima: true } }, fonte: 'M-09' },
    MAP_POSITIVO: { label: 'Esito positivo: reato estinto', tipi: ['MAP'], fase: 'CHIUSO', passo: { chiudi: true }, fonte: 'M-04' },
    MAP_NEGATIVO: { label: 'Esito negativo o revoca: il processo riprende', tipi: ['MAP'], fase: 'ISTRUTTORIA', passo: { udienza: 'ISTRUTTORIA', quando: { prima: true } }, fonte: 'M-08' },
    // ---- esecuzione (§9-bis)
    ESE_ATTI: { label: 'Rinvio per acquisire atti', tipi: ['ESECUZIONE'], fase: 'ESECUZIONE', passo: { udienza: 'ESECUZIONE', quando: { giorni: 'esecuzioneAtti' } }, fonte: 'X-09' },
    ESE_DECISA: { label: 'Ordinanza emessa (accoglimento, rigetto o inammissibilità)', tipi: ['ESECUZIONE'], fase: 'CHIUSO', passo: { chiudi: true, opposizione: true }, fonte: 'X-11, X-04' },
    // ---- riunione (§8)
    RIU_DISPOSTA: { label: 'Riunione disposta: scelgo io come proseguire', tipi: ['RIUNIONE'], passo: { libera: true }, fonte: 'R-03' },
    // ---- sempre possibile
    LIBERO: { label: 'Altro: scelgo io la prossima attività', tipi: TUTTI, passo: { libera: true }, fonte: 'G-01' }
  };

  function valore(state, x, def) {
    if (typeof x === 'number') return x;
    const P = state.parametri || {};
    if (P.rinvii && typeof P.rinvii[x] === 'number') return P.rinvii[x];
    if (P.termini && typeof P.termini[x] === 'number') return P.termini[x];
    return def;
  }

  /** Esiti offerti per un tipo di attività: prima quelli propri del tipo, poi quelli validi sempre. */
  function esitiPer(tipo) {
    const propri = [];
    const comuni = [];
    Object.keys(ESITI).forEach(function (c) {
      const e = ESITI[c];
      if (e.tipi === TUTTI) comuni.push({ codice: c, label: e.label });
      else if (e.tipi.indexOf(tipo) >= 0) propri.push({ codice: c, label: e.label });
    });
    return propri.concat(comuni);
  }

  function haPosto(state, data, durata) {
    if (GC.calendar.dayStatus(state, data).stato !== 'udienza') return null;
    const t = GC.calendar.timeline(state, data);
    for (let i = 0; i < t.vuoti.length; i++) if (t.vuoti[i].durata >= durata) return t.vuoti[i].inizio;
    return null;
  }

  /** Cerca una data di udienza con posto per la durata richiesta, a partire da "da" (verso avanti) o a ritroso da "da" fino a "limite". */
  function trovaData(state, da, durata, opz) {
    const avanti = !opz || !opz.indietro;
    if (avanti) {
      for (let i = 0; i < 400; i++) {
        const d = D.addDays(da, i);
        const ini = haPosto(state, d, durata);
        if (ini) return { data: d, inizio: ini };
      }
      return null;
    }
    for (let d = da; d >= opz.limite; d = D.addDays(d, -1)) {
      const ini = haPosto(state, d, durata);
      if (ini) return { data: d, inizio: ini };
    }
    return null;
  }

  /**
   * Proposta per un esito. Non modifica lo stato.
   * Restituisce { ok, codice, label, fonte, azione: 'udienza'|'chiudi'|'fase'|'libera', fase, udienza, motivo, avvisi }.
   */
  function proponi(state, evento, codice, opz) {
    const e = ESITI[codice];
    if (!e) return { ok: false, errore: 'Esito non riconosciuto.' };
    const oggi = (opz && opz.oggi) || D.today();
    const avvisi = [];
    const out = { ok: true, codice: codice, label: e.label, fonte: e.fonte, fase: e.fase || '', avvisi: avvisi, azione: 'libera', udienza: null, motivo: '' };
    const p = e.passo;

    if (p.chiudi) {
      out.azione = 'chiudi';
      out.motivo = 'Il fascicolo risulta definito: nessuna nuova udienza.';
      if (p.avviso) avvisi.push(p.avviso);
      if (p.motivazione) {
        const g = valore(state, 'motivazioneGiorni', 15);
        avvisi.push('Deposito della motivazione: di regola entro ' + g + ' giorni (' + D.fmtIt(D.addDays(evento.data, g)) + '). Valore da verificare sull\'art. 544; l\'app non lo registra ancora come scadenza.');
      }
      if (p.opposizione) {
        const g = valore(state, 'opposizioneEsecuzione', 15);
        avvisi.push('Opposizione o ricorso: entro ' + g + ' giorni dalla comunicazione (art. 667 c. 4), cioè entro il ' + D.fmtIt(D.addDays(evento.data, g)) + ' se la comunicazione è di oggi in udienza.');
      }
      return out;
    }
    if (p.soloFase) {
      out.azione = 'fase';
      out.motivo = 'Nessuna nuova udienza: si prosegue nella stessa udienza.';
      return out;
    }
    if (p.libera) {
      out.azione = 'libera';
      out.motivo = 'Nessuna proposta: scegli tu attività, data e durata.';
      return out;
    }

    out.azione = 'udienza';
    let tipo = p.udienza === 'STESSO' ? evento.tipo : p.udienza;
    if (tipo === 'INCAMERAMENTO') tipo = 'DIBATTIMENTO';
    const durate = state.parametri.durate;
    let durata = p.durata ? valore(state, p.durata, durate[tipo] || 10) : durate[tipo] || 10;
    const q = p.quando;
    const u = { tipo: tipo, durata: durata, stato: 'ufficiale', data: '', inizio: '' };
    out.udienza = u;

    if (!q) {
      out.motivo = 'La data dipende da ciò che il giudice stabilisce: scegli tu.';
      return out;
    }
    let bersaglio;
    let spiegazione;
    if (q.prima) {
      bersaglio = D.addDays(evento.data, 1);
      spiegazione = 'prima data utile con posto';
    } else if (q.giorni) {
      const g = valore(state, q.giorni, 30);
      bersaglio = D.addDays(evento.data, g);
      spiegazione = g + ' giorni dopo l\'udienza, o la prima data utile successiva';
    } else if (q.mesi) {
      const m = valore(state, q.mesi, 3);
      bersaglio = D.addMonths(evento.data, m);
      spiegazione = m + ' mesi dopo l\'udienza, o la prima data utile successiva';
    } else if (q.riti) {
      const prima = valore(state, 'ritiPrimo', 30);
      const passo = valore(state, 'ritiIncremento', 30);
      const precedenti = evento.fascicoloId ? GC.model.eventiDelFascicolo(state, evento.fascicoloId).filter(function (x) { return x.tipo === 'RITI' && x.data <= evento.data && x.id !== evento.id; }).length : 0;
      const n = precedenti + (evento.tipo === 'RITI' ? 1 : 0);
      const g = prima + n * passo;
      bersaglio = D.addDays(evento.data, g);
      spiegazione = g + ' giorni dopo l\'udienza (' + (n === 0 ? 'primo rinvio' : 'rinvio numero ' + (n + 1) + ': ' + passo + ' giorni in più a ogni rinvio') + '), o la prima data utile successiva';
    } else if (q.entro) {
      const g = valore(state, q.entro, 60);
      bersaglio = D.addDays(evento.data, g);
      spiegazione = 'ultima data utile entro ' + g + ' giorni dall\'ordinanza (limite di legge, art. 508 c. 1)';
    }

    const partenza = bersaglio > oggi ? bersaglio : oggi;
    let trovata;
    if (q.entro) {
      const limite = D.addDays(evento.data, 1);
      trovata = trovaData(state, bersaglio, durata, { indietro: true, limite: limite > oggi ? limite : oggi });
      if (!trovata) {
        avvisi.push('Nessuna data utile entro il termine di ' + valore(state, q.entro, 60) + ' giorni: proposta la prima data successiva, oltre il termine. Il termine è ordinatorio (PE-02): decidi tu.');
        trovata = trovaData(state, partenza, durata);
      }
    } else trovata = trovaData(state, partenza, durata);

    if (!trovata) {
      avvisi.push('Nessuna data con posto nei prossimi 400 giorni (controlla i giorni di udienza nelle Impostazioni).');
      out.motivo = 'Nessuna data trovata.';
      return out;
    }
    u.data = trovata.data;
    u.inizio = trovata.inizio;
    out.motivo = 'Proposta: ' + spiegazione + '.';
    if (trovata.data < evento.data) avvisi.push('La data proposta è precedente all\'udienza.');
    return out;
  }

  /**
   * Fascicoli che richiedono una decisione: l'ultima udienza ufficiale già svolta (data fino a oggi) non ha esito,
   * oppure ha un esito che prevede una nuova udienza e non ce n'è ancora una dopo.
   * Non considera i fascicoli chiusi e quelli che hanno già un'udienza successiva.
   */
  function daDecidere(state, oggi) {
    const M = GC.model;
    const adesso = oggi || D.today();
    const out = [];
    state.fascicoli.forEach(function (f) {
      if (M.faseDi(f, state) === 'CHIUSO') return;
      const ev = M.eventiDelFascicolo(state, f.id).filter(function (x) { return x.stato !== 'provvisorio'; });
      if (!ev.length) return;
      const ultimo = ev[ev.length - 1];
      if (ultimo.data > adesso) return;
      if (!ultimo.esitoCodice) {
        out.push({ tipo: 'senza-esito', fascicolo: f, evento: ultimo });
        return;
      }
      const e = ESITI[ultimo.esitoCodice];
      if (e && e.passo.udienza) out.push({ tipo: 'da-fissare', fascicolo: f, evento: ultimo, esito: e.label });
    });
    return out;
  }

  GC.esiti = { ESITI: ESITI, esitiPer: esitiPer, proponi: proponi, daDecidere: daDecidere, trovaData: trovaData };
})(typeof globalThis !== 'undefined' ? globalThis : this);
