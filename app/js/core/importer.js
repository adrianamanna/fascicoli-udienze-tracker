/* Importazione di fascicoli e udienze già calendarizzate da un foglio di calcolo.
   Tutto è deterministico: stesso file e stesse scelte, stesso risultato. */
(function (root) {
  'use strict';
  const GC = (root.GC = root.GC || {});
  const D = GC.dates;

  const CAMPI = [
    { chiave: 'rg', etichetta: 'Numero di ruolo (RG)', sinonimi: ['rg', 'r g', 'n r g', 'nrg', 'numero rg', 'numero ruolo', 'n ruolo', 'numero fascicolo', 'n fascicolo', 'fascicolo', 'numero procedimento', 'n proc', 'procedimento', 'proc', 'ruolo'] },
    { chiave: 'imputato', etichetta: 'Imputato', sinonimi: ['imputato', 'imputati', 'nome imputato', 'nominativo', 'nominativi', 'parte', 'cognome nome', 'nome'] },
    { chiave: 'data', etichetta: 'Data dell\'udienza', sinonimi: ['data', 'data udienza', 'data ud', 'giorno', 'data attivita', 'data evento', 'udienza'] },
    { chiave: 'inizio', etichetta: 'Ora di inizio', sinonimi: ['ora', 'orario', 'ora inizio', 'ora di inizio', 'inizio', 'dalle', 'ore', 'ora udienza'] },
    { chiave: 'fine', etichetta: 'Ora di fine', sinonimi: ['ora fine', 'ora di fine', 'fine', 'alle', 'termine'] },
    { chiave: 'durata', etichetta: 'Durata', sinonimi: ['durata', 'durata min', 'durata minuti', 'minuti', 'min', 'tempo', 'durata ore'] },
    { chiave: 'tipo', etichetta: 'Tipo di attività', sinonimi: ['tipo', 'tipo udienza', 'tipo di udienza', 'tipologia', 'attivita', 'tipo attivita', 'oggetto', 'fase', 'natura'] },
    { chiave: 'stato', etichetta: 'Stato (ufficiale o provvisorio)', sinonimi: ['stato', 'status'] },
    { chiave: 'origine', etichetta: 'Origine del fascicolo', sinonimi: ['origine', 'provenienza'] },
    { chiave: 'detenuto', etichetta: 'Detenuto', sinonimi: ['detenuto', 'detenuti', 'detenzione', 'custodia'] },
    { chiave: 'note', etichetta: 'Note', sinonimi: ['note', 'nota', 'annotazioni', 'osservazioni', 'commento', 'commenti'] },
    { chiave: 'nrOrd', etichetta: 'Numero d\'ordine', sinonimi: ['nr ord', 'n ord', 'nr ordine', 'n ordine', 'numero ordine', 'numero d ordine'] },
    { chiave: 'reato', etichetta: 'Reato', sinonimi: ['reato', 'reati', 'imputazione', 'capo di imputazione'] },
    { chiave: 'pm', etichetta: 'P.M. titolare', sinonimi: ['p m titolare', 'pm titolare', 'p m', 'pm', 'pubblico ministero'] },
    { chiave: 'giudice', etichetta: 'Giudice (per importare solo le tue righe)', sinonimi: ['giudice', 'magistrato'] },
    { chiave: 'rinvioDal', etichetta: 'Rinvio dal', sinonimi: ['rinvio dal', 'rinvio da', 'rinviato dal'] },
    { chiave: 'esito', etichetta: 'Esito', sinonimi: ['esito'] }
  ];

  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function testoCella(v) {
    if (v == null) return '';
    if (typeof v === 'object' && v.__date) return v.ymd ? D.fmtIt(v.ymd) + (v.hhmm ? ' ' + v.hhmm : '') : v.hhmm || '';
    return String(v).trim();
  }

  function vuota(v) {
    return v == null || (typeof v === 'string' && v.trim() === '');
  }

  /** Abbina in automatico le colonne ai campi, guardando le intestazioni. Restituisce { campo: indiceColonna | null }. */
  function indovinaColonne(intestazioni) {
    const mapping = {};
    const usate = {};
    const normali = intestazioni.map(norm);
    CAMPI.forEach(function (c) {
      mapping[c.chiave] = null;
    });
    // 1° passaggio: corrispondenza esatta
    CAMPI.forEach(function (c) {
      for (let i = 0; i < normali.length; i++) {
        if (usate[i] || !normali[i]) continue;
        if (c.sinonimi.indexOf(normali[i]) >= 0) {
          mapping[c.chiave] = i;
          usate[i] = true;
          return;
        }
      }
    });
    // 2° passaggio: la intestazione contiene il sinonimo come parola
    CAMPI.forEach(function (c) {
      if (mapping[c.chiave] !== null) return;
      for (let i = 0; i < normali.length; i++) {
        if (usate[i] || !normali[i]) continue;
        const h = ' ' + normali[i] + ' ';
        const trovato = c.sinonimi.some(function (s) {
          return s.length > 2 && h.indexOf(' ' + s + ' ') >= 0;
        });
        if (trovato) {
          mapping[c.chiave] = i;
          usate[i] = true;
          return;
        }
      }
    });
    return mapping;
  }

  /** Trova la riga delle intestazioni tra le prime righe del foglio (indice a partire da 0). */
  function trovaIntestazione(righe) {
    let migliore = 0;
    let punteggio = -1;
    const n = Math.min(righe.length, 12);
    for (let i = 0; i < n; i++) {
      const celle = (righe[i] || []).filter(function (c) {
        return typeof c === 'string' && c.trim() !== '';
      });
      if (celle.length < 2) continue;
      const m = indovinaColonne(righe[i] || []);
      const p = Object.keys(m).filter(function (k) {
        return m[k] !== null;
      }).length;
      if (p > punteggio) {
        punteggio = p;
        migliore = i;
      }
    }
    return migliore;
  }

  function dataDaSeriale(n) {
    return D.fromUTC(new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000));
  }

  function analizzaData(v) {
    if (vuota(v)) return { vuoto: true };
    if (typeof v === 'object' && v.__date) return v.ymd ? { ok: true, ymd: v.ymd, hhmm: v.hhmm || null } : { errore: 'La data non è valida.' };
    if (typeof v === 'number') {
      if (v > 20000 && v < 80000) return { ok: true, ymd: dataDaSeriale(v), hhmm: null };
      return { errore: 'Data non riconosciuta: ' + v + '.' };
    }
    let t = String(v).trim().toLowerCase();
    t = t.replace(/^(lun|mar|mer|gio|ven|sab|dom)[a-zì]*\.?,?\s+(?=\d)/, '');
    let hhmm = null;
    const tm = /\s+(?:ore\s+)?(\d{1,2})[:.](\d{2})(?::\d{2})?$/.exec(t);
    if (tm) {
      const mm = +tm[1] * 60 + +tm[2];
      if (+tm[1] < 24 && +tm[2] < 60) hhmm = D.minToHhmm(mm);
      t = t.slice(0, tm.index).trim();
    }
    let s = null;
    let m;
    if ((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/.exec(t))) {
      let y = +m[3];
      if (m[3].length === 2) y += 2000;
      s = D.ymd(y, +m[2], +m[1]);
    } else if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t))) {
      s = t;
    } else if ((m = /^(\d{1,2})\s+([a-zà]+)\.?\s+(\d{4})$/.exec(t))) {
      let idx = D.MESI.indexOf(m[2]);
      if (idx < 0) idx = D.MESI_BREVI.indexOf(m[2].slice(0, 3));
      if (idx >= 0) s = D.ymd(+m[3], idx + 1, +m[1]);
    }
    if (!s || !D.isValidYmd(s)) return { errore: 'Data non riconosciuta: "' + String(v).trim() + '".' };
    return { ok: true, ymd: s, hhmm: hhmm };
  }

  function analizzaOra(v) {
    if (vuota(v)) return { vuoto: true };
    if (typeof v === 'object' && v.__date) return v.hhmm ? { ok: true, hhmm: v.hhmm } : { errore: "L'ora non è valida." };
    if (typeof v === 'number') {
      if (v >= 0 && v < 1) return { ok: true, hhmm: D.minToHhmm(Math.round(v * 1440) % 1440) };
      if (Number.isInteger(v) && v >= 0 && v <= 23) return { ok: true, hhmm: D.minToHhmm(v * 60) };
      return { errore: 'Ora non riconosciuta: ' + v + '.' };
    }
    const t = String(v).trim().toLowerCase().replace(/^ore\s+/, '');
    let m = /^(\d{1,2})[:.hH](\d{2})$/.exec(t);
    if (m && +m[1] < 24 && +m[2] < 60) return { ok: true, hhmm: D.minToHhmm(+m[1] * 60 + +m[2]) };
    m = /^(\d{1,2})$/.exec(t);
    if (m && +m[1] < 24) return { ok: true, hhmm: D.minToHhmm(+m[1] * 60) };
    return { errore: 'Ora non riconosciuta: "' + String(v).trim() + '".' };
  }

  /** Durata in minuti. unita: 'min' o 'ore' per i numeri senza unità. */
  function analizzaDurata(v, unita) {
    if (vuota(v)) return { vuoto: true };
    let min = null;
    if (typeof v === 'object' && v.__date) {
      if (v.hhmm && !v.ymd) min = D.hhmmToMin(v.hhmm);
    } else if (typeof v === 'number') {
      if (v > 0 && v < 1) min = Math.round(v * 1440);
      else min = unita === 'ore' ? Math.round(v * 60) : Math.round(v);
    } else {
      const t = String(v).trim().toLowerCase().replace(',', '.');
      let m;
      if ((m = /^(\d+)\s*h\s*(\d+)?\s*(?:m|min)?$/.exec(t))) min = +m[1] * 60 + (m[2] ? +m[2] : 0);
      else if ((m = /^(\d+(?:\.\d+)?)\s*(?:h|ore|ora)$/.exec(t))) min = Math.round(parseFloat(m[1]) * 60);
      else if ((m = /^(\d+(?:\.\d+)?)\s*(?:m|min|minuti|')$/.exec(t))) min = Math.round(parseFloat(m[1]));
      else if ((m = /^(\d{1,2}):(\d{2})$/.exec(t))) min = +m[1] * 60 + +m[2];
      else if (/^\d+(?:\.\d+)?$/.test(t)) min = unita === 'ore' ? Math.round(parseFloat(t) * 60) : Math.round(parseFloat(t));
    }
    if (min == null || !(min >= 1 && min <= 600)) return { errore: 'Durata non riconosciuta: "' + testoCella(v) + '".' };
    return { ok: true, min: min };
  }

  const REGOLE_TIPO = [
    ['PREDIB', /predib/],
    ['RINTRACCIO', /rintracc|420 ?quater/],
    ['INCAMERAMENTO', /incamer/],
    ['MAP', /\bmap\b|messa alla prova/],
    ['ESECUZIONE', /esecuz/],
    ['RISERVA', /riserv|sciogl/],
    ['PERITO', /perit/],
    ['REPLICHE', /replic/],
    ['DISCUSSIONE', /discuss/],
    ['ISTRUTTORIA', /istrutt|testimon|escuss/],
    ['RITI', /\brit[io]\b|abbrev|patteggi|querela|trattativ|oblaz|rinotific/],
    ['RIUNIONE', /riunion/],
    ['DIBATTIMENTO', /dibattiment/]
  ];

  function analizzaTipo(v) {
    if (vuota(v)) return { vuoto: true };
    const t = norm(testoCella(v));
    for (let i = 0; i < REGOLE_TIPO.length; i++) {
      if (REGOLE_TIPO[i][1].test(t)) return { ok: true, tipo: REGOLE_TIPO[i][0], testo: testoCella(v) };
    }
    return { ok: true, tipo: 'ALTRO', testo: testoCella(v) };
  }

  function analizzaStato(v, predefinito) {
    if (vuota(v)) return predefinito;
    return /prov|appunt|bozza|ipotet/.test(norm(testoCella(v))) ? 'provvisorio' : 'ufficiale';
  }

  function analizzaOrigine(v, predefinita) {
    if (vuota(v)) return predefinita;
    const t = norm(testoCella(v));
    if (/gup|udienza preliminare/.test(t)) return 'GUP';
    if (/predib/.test(t)) return 'PREDIB';
    if (/immediat/.test(t)) return 'IMMEDIATO';
    return 'ALTRO';
  }

  function analizzaSiNo(v) {
    if (vuota(v)) return false;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    return /^(si|s|x|1|true|vero|yes|y|detenut)/.test(norm(testoCella(v)));
  }

  function cella(riga, mapping, chiave) {
    const i = mapping[chiave];
    if (i === null || i === undefined) return null;
    return riga[i] === undefined ? null : riga[i];
  }

  /** 'gg,mm,aa' o 'gg/mm/aaaa' diventa 'AAAA-MM-GG'; altri testi (es. '1 UD') restano com'erano. */
  function normalizzaRinvio(t) {
    const m = /^(\d{1,2})\s*[,\/.\-]\s*(\d{1,2})\s*[,\/.\-]\s*(\d{2}|\d{4})$/.exec(String(t || '').trim());
    if (!m) return String(t || '').trim();
    let y = +m[3];
    if (m[3].length === 2) y += 2000;
    const s = D.ymd(y, +m[2], +m[1]);
    return D.isValidYmd(s) ? s : String(t).trim();
  }

  function chiaveRg(s) {
    return String(s || '').replace(/\s+/g, '').toLowerCase();
  }

  /** Primo orario libero nella giornata, dopo l'inizio e fuori dalla pausa (ordine fisso, nessuna casualità). */
  function primoSlot(state, data, durata, extra) {
    const O = state.parametri.orario;
    const ini = D.hhmmToMin(O.inizio);
    const tol = D.hhmmToMin(O.tolleranzaFine);
    const pi = D.hhmmToMin(O.pausaInizio);
    const pf = D.hhmmToMin(O.pausaFine);
    const occupati = state.eventi
      .concat(extra)
      .filter(function (e) {
        return e.data === data && e.stato !== 'provvisorio';
      })
      .map(function (e) {
        const a = D.hhmmToMin(e.inizio);
        return [a, a + e.durata];
      })
      .sort(function (x, y) {
        return x[0] - y[0];
      });
    let c = ini;
    for (let giri = 0; giri < 500; giri++) {
      let spostato = false;
      if (c < pf && c + durata > pi) {
        c = pf;
        spostato = true;
      }
      for (let i = 0; i < occupati.length; i++) {
        if (c < occupati[i][1] && occupati[i][0] < c + durata) {
          c = occupati[i][1];
          spostato = true;
        }
      }
      if (!spostato) break;
    }
    return Math.min(c, tol);
  }

  /** Costruisce l'anteprima dell'importazione senza modificare lo stato. */
  function pianifica(state, righe, rigaIntestazione, mapping, opzioni) {
    const opz = Object.assign(
      { saltaDuplicati: true, senzaOra: 'accoda', durataUnita: 'min', origineDefault: 'ALTRO', statoDefault: 'ufficiale', tipoDefault: 'ALTRO', giudice: '', sovrapponiStessoOrario: true },
      opzioni || {}
    );
    const piano = [];
    const pianificati = [];
    const gruppi = {};
    let altriGiudici = 0;
    const chiavi = {};
    const chiaviSenzaOra = {};
    const rgNuovi = {};
    state.eventi.forEach(function (e) {
      const f = e.fascicoloId ? GC.model.getFascicolo(state, e.fascicoloId) : null;
      chiavi[[e.data, e.inizio, e.tipo, f ? chiaveRg(f.rg) : '', e.titolo || ''].join('|')] = true;
      chiaviSenzaOra[[e.data, e.tipo, f ? chiaveRg(f.rg) : '', e.titolo || ''].join('|')] = true;
    });

    for (let i = rigaIntestazione + 1; i < righe.length; i++) {
      const r = righe[i] || [];
      if (r.every(vuota)) continue;
      if (opz.giudice && mapping.giudice !== null && mapping.giudice !== undefined) {
        if (norm(testoCella(cella(r, mapping, 'giudice'))) !== norm(opz.giudice)) {
          altriGiudici++;
          continue;
        }
      }
      const rigaOrig = mapping.riga !== null && mapping.riga !== undefined ? parseInt(testoCella(cella(r, mapping, 'riga')), 10) : NaN;
      const voce = { riga: isNaN(rigaOrig) ? i + 1 : rigaOrig, foglio: testoCella(cella(r, mapping, 'foglio')), stato: 'ok', errori: [], avvisi: [], evento: null, fascicolo: null };

      const d = analizzaData(cella(r, mapping, 'data'));
      if (d.vuoto) voce.errori.push('Manca la data.');
      else if (d.errore) voce.errori.push(d.errore);

      let inizio = null;
      const o = analizzaOra(cella(r, mapping, 'inizio'));
      if (o.ok) inizio = o.hhmm;
      else if (o.errore) voce.errori.push(o.errore);
      else if (d.ok && d.hhmm) inizio = d.hhmm;

      const tp = analizzaTipo(cella(r, mapping, 'tipo'));
      const tipo = tp.ok ? tp.tipo : opz.tipoDefault;
      let titolo = '';
      if (tp.ok && tp.tipo === 'ALTRO') titolo = tp.testo;
      else if (tp.ok && tp.tipo === 'DIBATTIMENTO') titolo = tp.testo.replace(/^udienza dibattimentale\s*:?\s*/i, '').trim();

      let durata = null;
      const du = analizzaDurata(cella(r, mapping, 'durata'), opz.durataUnita);
      if (du.ok) durata = du.min;
      else if (du.errore) voce.errori.push(du.errore);
      if (durata === null && inizio) {
        const f = analizzaOra(cella(r, mapping, 'fine'));
        if (f.ok) {
          const diff = D.hhmmToMin(f.hhmm) - D.hhmmToMin(inizio);
          if (diff >= 1) durata = diff;
          else voce.errori.push("L'ora di fine non segue l'ora di inizio.");
        } else if (f.errore) voce.errori.push(f.errore);
      }
      if (durata === null && !voce.errori.length) {
        durata = state.parametri.durate[tipo] || 10;
        // Se il file non ha proprio una colonna della durata, usare quella predefinita è la regola, non un'anomalia.
        if (mapping.durata !== null && mapping.durata !== undefined) voce.avvisi.push('Durata non indicata: usata quella predefinita (' + durata + ' min).');
      }

      const rg = testoCella(cella(r, mapping, 'rg'));
      const imputato = testoCella(cella(r, mapping, 'imputato'));
      const origine = analizzaOrigine(cella(r, mapping, 'origine'), opz.origineDefault);
      const detenuto = analizzaSiNo(cella(r, mapping, 'detenuto'));
      const stato = analizzaStato(cella(r, mapping, 'stato'), opz.statoDefault);
      const note = testoCella(cella(r, mapping, 'note'));
      const reato = testoCella(cella(r, mapping, 'reato'));
      const pm = testoCella(cella(r, mapping, 'pm'));
      const nrOrd = testoCella(cella(r, mapping, 'nrOrd'));
      const rinvioDal = normalizzaRinvio(testoCella(cella(r, mapping, 'rinvioDal')));
      const esito = testoCella(cella(r, mapping, 'esito'));

      if (!inizio && !voce.errori.length) {
        if (opz.senzaOra === 'accoda') {
          // Senza ora il confronto con le attività già presenti ignora l'orario (così una seconda importazione non crea doppioni).
          const k2 = [d.ymd, tipo, chiaveRg(rg), titolo].join('|');
          if (chiaviSenzaOra[k2]) {
            voce.stato = 'duplicato';
            voce.avvisi.push("Esiste già un'attività uguale nello stesso giorno (stesso tipo e fascicolo); l'ora non è indicata nel file.");
            voce.evento = { data: d.ymd, inizio: null, durata: durata, tipo: tipo, stato: stato, titolo: titolo, note: note, rinvioDal: rinvioDal, esito: esito, sovrapponibile: false, fascicoloRg: rg, fascicoloImputato: imputato };
            if (rg || imputato) voce.fascicolo = { rg: rg, imputato: imputato, origine: origine, detenuto: detenuto, reato: reato, pm: pm, nrOrd: nrOrd, nuovo: false };
            piano.push(voce);
            continue;
          }
          chiaviSenzaOra[k2] = true;
          inizio = D.minToHhmm(primoSlot(state, d.ymd, durata, pianificati));
          voce.avvisi.push("Ora non indicata: attività collocata alle " + inizio + " (primo orario libero).");
        } else voce.errori.push("Manca l'ora di inizio.");
      }

      if (rg || imputato) {
        const esistente = rg ? GC.model.findFascicoloByRg(state, rg) : null;
        const chiave = chiaveRg(rg);
        const nuovo = !esistente && !(chiave && rgNuovi[chiave]);
        voce.fascicolo = { rg: rg, imputato: imputato, origine: origine, detenuto: detenuto, reato: reato, pm: pm, nrOrd: nrOrd, nuovo: nuovo };
        if (nuovo && chiave) rgNuovi[chiave] = true;
      } else voce.avvisi.push('Nessun fascicolo indicato: l\'attività resta senza fascicolo.');

      if (!voce.errori.length) {
        voce.evento = { data: d.ymd, inizio: inizio, durata: durata, tipo: tipo, stato: stato, titolo: titolo, note: note, rinvioDal: rinvioDal, esito: esito, sovrapponibile: false, fascicoloRg: rg, fascicoloImputato: imputato };
        const k = [d.ymd, inizio, tipo, chiaveRg(rg), titolo].join('|');
        if (chiavi[k]) {
          voce.stato = 'duplicato';
          voce.avvisi.push("Esiste già un'attività uguale (stessa data, ora, tipo e fascicolo).");
        } else {
          chiavi[k] = true;
          const prova = { id: 'P' + piano.length, data: d.ymd, inizio: inizio, durata: durata, stato: stato, sovrapponibile: false };
          // Più attività che iniziano allo stesso orario (es. fascicoli chiamati alle 9:00): sono sovrapponibili per scelta del giudice.
          const kg = [d.ymd, inizio].join('|');
          if (opz.sovrapponiStessoOrario && gruppi[kg]) {
            gruppi[kg].prova.sovrapponibile = true;
            gruppi[kg].evento.sovrapponibile = true;
            prova.sovrapponibile = true;
            voce.evento.sovrapponibile = true;
          }
          GC.calendar.checkEvent(state, prova, { extra: pianificati }).forEach(function (a) {
            voce.avvisi.push(a.testo);
          });
          pianificati.push(prova);
          if (!gruppi[kg]) gruppi[kg] = { prova: prova, evento: voce.evento };
        }
      } else voce.stato = 'errore';
      piano.push(voce);
    }

    const riepilogo = {
      totale: piano.length,
      valide: piano.filter(function (v) {
        return v.stato === 'ok';
      }).length,
      errori: piano.filter(function (v) {
        return v.stato === 'errore';
      }).length,
      duplicati: piano.filter(function (v) {
        return v.stato === 'duplicato';
      }).length,
      conAvvisi: piano.filter(function (v) {
        return v.stato === 'ok' && v.avvisi.length;
      }).length,
      fascicoliNuovi: piano.filter(function (v) {
        return v.stato !== 'errore' && v.fascicolo && v.fascicolo.nuovo;
      }).length,
      altriGiudici: altriGiudici
    };
    return { righe: piano, riepilogo: riepilogo, opzioni: opz };
  }

  /** Applica l'anteprima allo stato. Restituisce { importId, eventi, fascicoli }. */
  function applica(state, piano, meta) {
    const M = GC.model;
    const nuoviFasc = [];
    const nuoviEv = [];
    const salta = piano.opzioni.saltaDuplicati;
    piano.righe.forEach(function (v) {
      if (v.stato === 'errore') return;
      if (v.stato === 'duplicato' && salta) return;
      let fid = null;
      if (v.fascicolo) {
        let f = v.fascicolo.rg ? M.findFascicoloByRg(state, v.fascicolo.rg) : null;
        if (!f) {
          const r = M.addFascicolo(state, { rg: v.fascicolo.rg, imputato: v.fascicolo.imputato, origine: v.fascicolo.origine, detenuto: v.fascicolo.detenuto, reato: v.fascicolo.reato, pm: v.fascicolo.pm, nrOrd: v.fascicolo.nrOrd });
          if (r.ok) {
            f = r.valore;
            nuoviFasc.push(f.id);
          }
        } else {
          const patch = {};
          ['imputato', 'reato', 'pm', 'nrOrd'].forEach(function (k) {
            if (!f[k] && v.fascicolo[k]) patch[k] = v.fascicolo[k];
          });
          if (Object.keys(patch).length) M.updateFascicolo(state, f.id, patch);
        }
        fid = f ? f.id : null;
      }
      const e = v.evento;
      if (!e.inizio) return;
      const r = M.addEvento(state, {
        fascicoloId: fid,
        data: e.data,
        inizio: e.inizio,
        durata: e.durata,
        tipo: e.tipo,
        stato: e.stato,
        titolo: e.titolo,
        note: e.note,
        sovrapponibile: !!e.sovrapponibile,
        rinvioDal: e.rinvioDal,
        esito: e.esito,
        fonte: 'import'
      });
      if (r.ok) nuoviEv.push(r.valore.id);
    });
    const id = 'I' + String(state.importazioni.length + 1).padStart(4, '0') + '-' + String(state.meta.prossimoId);
    state.eventi.forEach(function (e) {
      if (nuoviEv.indexOf(e.id) >= 0) e.fonte = 'import:' + id;
    });
    state.importazioni.push({ id: id, t: M.clock(), file: (meta && meta.file) || '', foglio: (meta && meta.foglio) || '', eventi: nuoviEv, fascicoli: nuoviFasc });
    M.log(state, 'importa', 'importazione', id, (meta && meta.file ? meta.file + ': ' : '') + nuoviEv.length + ' attività, ' + nuoviFasc.length + ' fascicoli nuovi');
    return { importId: id, eventi: nuoviEv.length, fascicoli: nuoviFasc.length };
  }

  /** Annulla un'importazione: toglie le attività e i fascicoli creati da quella importazione. */
  function annulla(state, importId) {
    const M = GC.model;
    const imp = state.importazioni.find(function (x) {
      return x.id === importId;
    });
    if (!imp) return { ok: false, errori: ['Importazione non trovata.'] };
    state.eventi = state.eventi.filter(function (e) {
      return imp.eventi.indexOf(e.id) < 0;
    });
    let fascRimossi = 0;
    imp.fascicoli.forEach(function (fid) {
      const ancora = state.eventi.some(function (e) {
        return e.fascicoloId === fid;
      });
      if (!ancora) {
        state.fascicoli = state.fascicoli.filter(function (f) {
          return f.id !== fid;
        });
        fascRimossi++;
      }
    });
    state.importazioni = state.importazioni.filter(function (x) {
      return x.id !== importId;
    });
    M.log(state, 'annulla importazione', 'importazione', importId, imp.eventi.length + ' attività e ' + fascRimossi + ' fascicoli rimossi');
    return { ok: true, eventi: imp.eventi.length, fascicoli: fascRimossi };
  }


  /* ---------- ruolo delle udienze: un file per anno, un foglio per giorno ---------- */

  const RE_TITOLO = /udienza\s+del\s+(\d{1,2})\s+([a-zà]+)\s+(\d{4})/i;

  /** Riconosce il formato "ruolo udienze": un foglio per giorno, con il titolo "UDIENZA DEL 2 NOVEMBRE 2026 - LUNEDI". */
  function rilevaRuolo(fogli) {
    const trovati = fogli.map(function (f, indice) {
      let testo = '';
      for (let i = 0; i < Math.min(3, f.righe.length); i++) {
        (f.righe[i] || []).forEach(function (c) {
          if (typeof c === 'string') testo += ' ' + c;
        });
      }
      const m = RE_TITOLO.exec(testo);
      let ymd = null;
      if (m) {
        const idx = D.MESI.indexOf(m[2].toLowerCase());
        if (idx >= 0) {
          const s = D.ymd(+m[3], idx + 1, +m[1]);
          if (D.isValidYmd(s)) ymd = s;
        }
      }
      return { indice: indice, nome: f.nome, data: ymd, dataDaNome: false };
    });
    const conData = trovati.filter(function (x) {
      return x.data;
    });
    if (!conData.length) return { ok: false };
    // I fogli senza titolo leggibile si datano dal nome (es. "16.11") con l'anno degli altri fogli.
    const anni = {};
    conData.forEach(function (x) {
      const y = x.data.slice(0, 4);
      anni[y] = (anni[y] || 0) + 1;
    });
    const anno = +Object.keys(anni).sort(function (a, b) {
      return anni[b] - anni[a];
    })[0];
    trovati.forEach(function (x) {
      if (x.data) return;
      const m = /^(\d{1,2})[.\-\/](\d{1,2})$/.exec(String(x.nome).trim());
      if (m) {
        const s = D.ymd(anno, +m[2], +m[1]);
        if (D.isValidYmd(s)) {
          x.data = s;
          x.dataDaNome = true;
        }
      }
    });
    const fogliOk = [];
    const saltati = [];
    trovati.forEach(function (x) {
      if (!x.data) {
        saltati.push(x.nome);
        return;
      }
      const righe = fogli[x.indice].righe;
      const h = trovaIntestazione(righe);
      const mapping = indovinaColonne(righe[h] || []);
      let nRighe = 0;
      for (let i = h + 1; i < righe.length; i++) {
        if (!(righe[i] || []).every(vuota)) nRighe++;
      }
      x.intestazione = h;
      x.mapping = mapping;
      x.righe = nRighe;
      x.completo = mapping.data === null && mapping.inizio !== null && mapping.rg !== null;
      fogliOk.push(x);
    });
    return { ok: true, fogli: fogliOk, saltati: saltati };
  }

  /** Interpreta una riga del ruolo: che tipo di attività è e da dove viene il fascicolo. */
  function inferisciRuolo(rg, reato, annotazione) {
    const a = norm(annotazione);
    const r = norm(reato);
    if (/predi/.test(a)) return { tipo: 'Predibattimento', origine: '' };
    // Annotazione "420 quater": udienza che segue il rintraccio dell'imputato (processo sospeso per assenza, art. 420-quater c.p.p.).
    if (/420 ?quater|rintracc/.test(a)) return { tipo: 'Udienza dopo rintraccio (art. 420-quater)', origine: '' };
    // "SVIL UP" nel reato: di solito è un'udienza da predibattimento (indicato dal giudice).
    if (/^svil up\b/.test(r)) return { tipo: 'Predibattimento', origine: '' };
    if (norm(rg) === 'sige' || /esecuzione/.test(r)) return { tipo: 'Esecuzione', origine: '' };
    // Le altre righe arrivano da un rinvio: sono udienze di prosecuzione (istruttoria, repliche, ecc.), da precisare.
    return { tipo: annotazione && String(annotazione).trim() ? 'Udienza dibattimentale: ' + String(annotazione).trim() : 'Udienza dibattimentale', origine: '' };
  }

  /** Unisce i fogli del ruolo in un'unica tabella, pronta per pianifica(). Aggiunge le colonne Giudice, Foglio e Riga. */
  function tabellaDaRuolo(fogli, ril) {
    const intest = ['RG', 'Imputato', 'Data', 'Ora', 'Tipo', 'Origine', 'Note', 'Reato', 'P.M. titolare', 'Nr. Ord.', 'Rinvio dal', 'Esito', 'Giudice', 'Foglio', 'Riga'];
    const mapping = { rg: 0, imputato: 1, data: 2, inizio: 3, tipo: 4, origine: 5, note: 6, reato: 7, pm: 8, nrOrd: 9, rinvioDal: 10, esito: 11, giudice: 12, foglio: 13, riga: 14 };
    const righe = [intest];
    ril.fogli.forEach(function (f) {
      const src = fogli[f.indice].righe;
      const mp = f.mapping;
      for (let i = f.intestazione + 1; i < src.length; i++) {
        const r = src[i] || [];
        if (r.every(vuota)) continue;
        const t = function (k) {
          return testoCella(cella(r, mp, k));
        };
        let rg = t('rg');
        const nrOrd = t('nrOrd');
        if (norm(rg) === 'sige' && nrOrd) rg = 'SIGE ' + nrOrd;
        const reato = t('reato');
        const ann = t('note');
        const inf = inferisciRuolo(t('rg'), reato, ann);
        righe.push([
          rg,
          t('imputato'),
          { __date: true, ymd: f.data, hhmm: null },
          t('inizio'),
          inf.tipo,
          inf.origine,
          ann,
          reato,
          t('pm'),
          nrOrd,
          t('rinvioDal'),
          t('esito'),
          t('giudice'),
          f.nome,
          i + 1
        ]);
      }
    });
    return { righe: righe, mapping: mapping, rigaIntestazione: 0 };
  }

  /** Elenca i valori diversi di una colonna con quante volte compaiono (per scegliere il giudice). */
  function valoriColonna(righe, rigaIntestazione, indice) {
    const out = {};
    for (let i = rigaIntestazione + 1; i < righe.length; i++) {
      const v = testoCella((righe[i] || [])[indice]);
      if (v) out[v] = (out[v] || 0) + 1;
    }
    return Object.keys(out)
      .sort()
      .map(function (k) {
        return { valore: k, righe: out[k] };
      });
  }

  GC.importer = {
    CAMPI: CAMPI,
    indovinaColonne: indovinaColonne,
    trovaIntestazione: trovaIntestazione,
    analizzaData: analizzaData,
    analizzaOra: analizzaOra,
    analizzaDurata: analizzaDurata,
    analizzaTipo: analizzaTipo,
    normalizzaRinvio: normalizzaRinvio,
    rilevaRuolo: rilevaRuolo,
    inferisciRuolo: inferisciRuolo,
    tabellaDaRuolo: tabellaDaRuolo,
    valoriColonna: valoriColonna,
    pianifica: pianifica,
    applica: applica,
    annulla: annulla,
    testoCella: testoCella
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
