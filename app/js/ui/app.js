/* Interfaccia dell'app. Nessuna logica di calcolo qui: tutto passa dai moduli in js/core. */
(function () {
  'use strict';
  const GC = window.GC;
  const D = GC.dates;
  const C = GC.calendar;
  const M = GC.model;
  const S = GC.storage;
  const F = GC.fileDati;
  const I = GC.importer;
  const X = GC.xlsx;

  let stato = null;
  const ui = {
    vista: 'calendario',
    anno: 0,
    mese: 0,
    giorno: '',
    cercaFasc: '',
    faseFasc: '',
    salvataggio: { testo: '', errore: false },
    // File dei dati scelto dall'utente: stato = nessuno | collegato | da-riaprire | nonSupportato
    file: { handle: null, stato: 'nessuno', errore: '' },
    imp: null,
    impErrore: '',
    annoFeste: new Date().getFullYear(),
    predib: { esclusi: {}, ordine: 'prima', mostraRossi: false, pianoAttivo: false },
    inc: { esclusi: {}, mostraRossi: false },
    messaggio: null,
    erroreOrari: []
  };
  let timerSalvataggio = null;

  /* ---------- utilità ---------- */

  function h(tag, attrs) {
    const el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'for') el.htmlFor = v;
      else if (k === 'style' || k === 'list' || k === 'form') el.setAttribute(k, v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k in el) el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (let i = 2; i < arguments.length; i++) aggiungi(el, arguments[i]);
    return el;
  }

  function aggiungi(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { aggiungi(el, x); });
    else el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function fmtMin(n) {
    if (n < 60) return n + ' min';
    const o = Math.floor(n / 60);
    const m = n % 60;
    return m ? o + ' h ' + m + ' min' : o + ' h';
  }

  function fmtDataOra(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
  }

  function scarica(nome, testo, mime) {
    const blob = new Blob([testo], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: nome });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function lettera(i) {
    let s = '';
    i++;
    while (i > 0) {
      const r = (i - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      i = Math.floor((i - 1) / 26);
    }
    return s;
  }

  /* ---------- salvataggio ---------- */

  function aggiornaStatoSalvataggio() {
    const el = document.getElementById('stato-salvataggio');
    if (!el) return;
    el.textContent = ui.salvataggio.testo;
    el.className = 'stato-salvataggio' + (ui.salvataggio.errore ? ' errore' : '');
  }

  function pianificaSalvataggio() {
    ui.salvataggio = { testo: 'Salvataggio in corso…', errore: false };
    aggiornaStatoSalvataggio();
    clearTimeout(timerSalvataggio);
    timerSalvataggio = setTimeout(salvaOra, 250);
  }

  async function salvaOra() {
    stato.meta.salvato = M.clock();
    const n = new Date();
    const ora = D.pad(n.getHours()) + ':' + D.pad(n.getMinutes());
    let erroreBrowser = '';
    try {
      await S.save(stato);
    } catch (e) {
      erroreBrowser = e.message;
    }
    if (ui.file.handle && ui.file.stato === 'collegato') {
      try {
        await F.scrivi(ui.file.handle, stato);
        ui.salvataggio = { testo: 'Salvato nel file "' + ui.file.handle.name + '" alle ' + ora, errore: false };
      } catch (e) {
        ui.file.stato = 'da-riaprire';
        ui.file.errore = 'Il file non è stato aggiornato (' + (e && e.message ? e.message : e) + ').';
        ui.salvataggio = { testo: ui.file.errore + ' I dati sono salvati solo nel browser.', errore: true };
        render();
      }
    } else if (erroreBrowser) {
      ui.salvataggio = { testo: erroreBrowser, errore: true };
    } else if (ui.file.stato === 'da-riaprire') {
      ui.salvataggio = { testo: 'Salvato solo nel browser: riapri il file dei dati', errore: true };
    } else {
      ui.salvataggio = { testo: 'Salvato su questo dispositivo alle ' + ora, errore: false };
    }
    aggiornaStatoSalvataggio();
  }

  /* ---------- file dei dati ---------- */

  /** Legge il file scelto, decide quali dati tenere e lo collega. Restituisce true se il file è collegato. */
  async function usaFile(handle, primoCollegamento) {
    const r = await F.leggi(handle);
    if (!r.ok) {
      ui.messaggio = { tipo: 'errore', testo: 'Il file scelto non è un file dei dati di questa app. ' + r.errore };
      return false;
    }
    const daFile = r.vuoto ? null : r.stato;
    let fonte = F.scegliFonte(stato, daFile);
    if (primoCollegamento && F.haDati(daFile) && F.haDati(stato)) {
      if (!window.confirm('Il file contiene già dei dati (salvati il ' + fmtDataOra(daFile.meta.salvato || r.esportato) + '). Sostituire i dati attuali di questa app con quelli del file?')) return false;
      fonte = 'file';
    } else if (fonte === 'chiedi') {
      fonte = window.confirm('Nel browser ci sono modifiche più recenti di quelle nel file (browser: ' + fmtDataOra(stato.meta.salvato) + ', file: ' + fmtDataOra(daFile.meta.salvato) + ').\n\nOK = tieni i dati del browser e aggiorna il file.\nAnnulla = usa i dati del file (le modifiche più recenti del browser andranno perse).') ? 'locale' : 'file';
    }
    if (fonte === 'file') stato = M.normalizeState(daFile);
    ui.file = { handle: handle, stato: 'collegato', errore: '' };
    try {
      await S.salvaCollegamento(handle);
    } catch (e) {
      /* il collegamento vale solo per questa sessione */
    }
    await salvaOra();
    return true;
  }

  /** Scelta del file da parte dell'utente (serve un clic). nuovo = crea; altrimenti apre uno già esistente. */
  async function sceltaFile(nuovo) {
    try {
      const handle = nuovo ? await F.scegliNuovo() : await F.scegliEsistente();
      if ((await F.permesso(handle, true)) !== 'granted') {
        ui.messaggio = { tipo: 'errore', testo: 'Senza il permesso di scrivere nel file non posso collegarlo.' };
      } else if (await usaFile(handle, true)) {
        ui.messaggio = { tipo: 'ok', testo: 'File collegato: "' + handle.name + '". Da ora ogni modifica viene salvata anche lì.' };
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      ui.messaggio = { tipo: 'errore', testo: 'Non è stato possibile usare il file: ' + (e && e.message ? e.message : e) };
    }
    render();
  }

  /** Riapre il file collegato nelle sessioni precedenti. */
  async function riapriFile() {
    try {
      await usaFile(ui.file.handle, false);
    } catch (e) {
      ui.file.stato = 'da-riaprire';
      ui.file.errore = 'Il file non si può leggere: è stato spostato o cancellato?';
    }
  }

  async function riapriDaClic() {
    try {
      if ((await F.permesso(ui.file.handle, true)) !== 'granted') {
        ui.messaggio = { tipo: 'errore', testo: 'Il permesso di scrivere nel file non è stato dato.' };
        return render();
      }
      await riapriFile();
      if (ui.file.stato === 'collegato') ui.messaggio = { tipo: 'ok', testo: 'File dei dati riaperto.' };
    } catch (e) {
      ui.messaggio = { tipo: 'errore', testo: 'Non è stato possibile riaprire il file: ' + (e && e.message ? e.message : e) };
    }
    render();
  }

  async function scollegaFile() {
    ui.file = { handle: null, stato: 'nessuno', errore: '' };
    await S.eliminaCollegamento();
    ui.messaggio = { tipo: 'ok', testo: 'File scollegato. Il file resta dov\'è; i dati continuano a essere salvati nel browser.' };
    render();
  }

  async function collegaAvvio() {
    if (!F.supportato()) {
      ui.file = { handle: null, stato: 'nonSupportato', errore: '' };
      return;
    }
    const handle = await S.caricaCollegamento();
    if (!handle) return;
    ui.file = { handle: handle, stato: 'da-riaprire', errore: '' };
    try {
      if ((await F.permesso(handle, false)) === 'granted') await riapriFile();
    } catch (e) {
      ui.file.errore = 'Il file non si può leggere: è stato spostato o cancellato?';
    }
  }

  /** Dopo ogni modifica: salva e ridisegna. */
  function aggiorna() {
    pianificaSalvataggio();
    render();
  }

  function logParam(testo) {
    M.log(stato, 'modifica', 'parametri', null, testo);
  }

  /* ---------- struttura della pagina ---------- */

  const VISTE = [
    ['calendario', 'Calendario'],
    ['predib', 'Predibattimento'],
    ['incamera', 'Incameramento'],
    ['fascicoli', 'Fascicoli'],
    ['importa', 'Importa da Excel'],
    ['impostazioni', 'Impostazioni'],
    ['dati', 'Dati e backup']
  ];

  function vaiA(v) {
    ui.vista = v;
    ui.messaggio = null;
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    const app = document.getElementById('app');
    let corpo;
    if (ui.vista === 'calendario') corpo = vistaCalendario();
    else if (ui.vista === 'predib') corpo = vistaPredib();
    else if (ui.vista === 'incamera') corpo = vistaIncamera();
    else if (ui.vista === 'fascicoli') corpo = vistaFascicoli();
    else if (ui.vista === 'importa') corpo = vistaImporta();
    else if (ui.vista === 'impostazioni') corpo = vistaImpostazioni();
    else corpo = vistaDati();

    const barra = h('header', { class: 'barra' },
      h('div', { class: 'marchio' }, 'Fascicoli Udienze Tracker'),
      h('nav', { class: 'navigazione', 'aria-label': 'Sezioni' },
        VISTE.map(function (v) {
          return h('button', { class: 'scheda', 'aria-current': ui.vista === v[0] ? 'page' : null, onClick: function () { vaiA(v[0]); } }, v[1]);
        })),
      h('div', { id: 'stato-salvataggio', class: 'stato-salvataggio' + (ui.salvataggio.errore ? ' errore' : '') }, ui.salvataggio.testo)
    );
    app.replaceChildren(barra, h('main', null, corpo));
  }

  /* ---------- calendario ---------- */

  function vistaCalendario() {
    const blocchi = [];
    blocchi.push(avvisiGenerali());
    blocchi.push(h('div', { class: 'cal-layout' }, pannelloMese(), pannelloGiorno()));
    return blocchi;
  }

  function avvisiGenerali() {
    const out = [];
    if (stato.parametri.giorniUdienza.settimanali.length === 0 && stato.parametri.giorniUdienza.date.length === 0) {
      out.push(h('div', { class: 'messaggio info' }, 'Prima di iniziare indica i giorni in cui hai udienza. ',
        h('button', { class: 'btn btn-piccolo', onClick: function () { vaiA('impostazioni'); } }, 'Vai alle impostazioni')));
    }
    if (ui.file.stato === 'da-riaprire') {
      out.push(h('div', { class: 'messaggio avviso' },
        'Il file dei dati "' + (ui.file.handle && ui.file.handle.name ? ui.file.handle.name : '') + '" non è collegato in questa sessione: finché non lo riapri, i dati sono salvati solo nel browser. ' + (ui.file.errore || ''),
        h('button', { class: 'btn btn-piccolo', onClick: riapriDaClic }, 'Riapri il file dei dati')));
    } else if (ui.file.stato === 'nessuno') {
      out.push(h('div', { class: 'messaggio info' },
        'Per non perdere i dati, scegli un file dove salvarli: l\'app lo aggiorna a ogni modifica. ',
        h('button', { class: 'btn btn-piccolo', onClick: function () { vaiA('dati'); } }, 'Scegli il file dei dati')));
    }
    const ult = stato.meta.ultimoBackup;
    const giorni = ult ? Math.floor((Date.now() - new Date(ult).getTime()) / 86400000) : null;
    const limite = stato.parametri.backupPromemoriaGiorni;
    if (ui.file.stato !== 'collegato' && (stato.eventi.length > 0 || stato.fascicoli.length > 0) && (ult === null || giorni >= limite)) {
      out.push(h('div', { class: 'messaggio avviso' },
        ult === null ? 'Non hai ancora fatto un backup dei dati. ' : 'L\'ultimo backup risale a ' + giorni + ' giorni fa. ',
        'I dati sono solo su questo dispositivo. ',
        h('button', { class: 'btn btn-piccolo', onClick: function () { vaiA('dati'); } }, 'Fai un backup')));
    }
    if (ui.messaggio) out.push(h('div', { class: 'messaggio ' + ui.messaggio.tipo, role: 'status' }, ui.messaggio.testo));
    return out;
  }

  function spostaMese(delta) {
    let m = ui.mese + delta;
    let a = ui.anno;
    if (m < 1) { m = 12; a--; }
    if (m > 12) { m = 1; a++; }
    ui.mese = m;
    ui.anno = a;
    render();
  }

  function scegliGiorno(s) {
    ui.giorno = s;
    const p = D.parts(s);
    ui.anno = p.y;
    ui.mese = p.m;
    render();
  }

  function pannelloMese() {
    const settimane = C.monthGrid(stato, ui.anno, ui.mese);
    const oggi = D.today();
    const celle = [];
    ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'].forEach(function (n) {
      celle.push(h('div', { class: 'nome-giorno' }, n));
    });
    settimane.forEach(function (sett) {
      sett.forEach(function (g) {
        const st = g.stato;
        const classi = ['cella'];
        if (!g.inMese) classi.push('fuori');
        if (st.stato === 'udienza') classi.push('udienza');
        else if (st.stato === 'libero') classi.push('libero');
        else classi.push(st.blocco.tipo);
        if (g.data === oggi) classi.push('oggi');
        if (g.data === ui.giorno) classi.push('scelta');
        const righe = [];
        if (st.stato === 'bloccato') {
          righe.push(h('span', null, st.blocco.tipo === 'feriale' ? 'Periodo feriale' : st.nome));
          if (g.attivita + g.provvisorie > 0) righe.push(h('span', null, (g.attivita + g.provvisorie) + ' att.'));
        } else if (st.stato === 'udienza' || g.attivita + g.provvisorie > 0) {
          if (g.attivita + g.provvisorie === 0) righe.push(h('span', null, 'Libera'));
          else {
            if (g.attivita) righe.push(h('span', null, g.attivita + ' attività'));
            if (g.provvisorie) righe.push(h('span', null, g.provvisorie + ' provv.'));
            if (g.vuoti) righe.push(h('span', { class: 'con-vuoti' }, g.liberi + ' min liberi'));
          }
        }
        celle.push(h('button', {
          class: classi.join(' '),
          onClick: function () { scegliGiorno(g.data); },
          'aria-label': D.fmtLong(g.data) + (st.nome ? ', ' + st.nome : st.stato === 'udienza' ? ', giorno di udienza' : ''),
          'aria-pressed': g.data === ui.giorno ? 'true' : 'false',
          title: D.fmtLong(g.data) + (st.nome ? ' - ' + st.nome : '')
        }, h('span', { class: 'num' }, D.parts(g.data).d), righe));
      });
    });

    const vaiInput = h('input', { type: 'date', value: ui.giorno, onChange: function (e) { if (D.isValidYmd(e.target.value)) scegliGiorno(e.target.value); } });
    return h('section', { class: 'pannello', 'aria-label': 'Calendario del mese' },
      h('div', { class: 'mese-testa' },
        h('button', { class: 'btn btn-icona', 'aria-label': 'Mese precedente', onClick: function () { spostaMese(-1); } }, '‹'),
        h('h2', { class: 'titolo-mese' }, cap(D.MESI[ui.mese - 1]) + ' ' + ui.anno),
        h('button', { class: 'btn btn-icona', 'aria-label': 'Mese successivo', onClick: function () { spostaMese(1); } }, '›'),
        h('button', { class: 'btn', onClick: function () { scegliGiorno(oggi); } }, 'Oggi'),
        h('label', { class: 'vai-a' }, 'Vai al', vaiInput)),
      h('div', { class: 'griglia-mese' }, celle),
      h('div', { class: 'legenda' },
        h('span', null, h('i', { class: 'campione udienza' }), 'Giorno di udienza'),
        h('span', null, h('i', { class: 'campione festivo' }), 'Festivo'),
        h('span', null, h('i', { class: 'campione feriale' }), 'Periodo feriale'),
        h('span', null, h('i', { class: 'campione indisponibile' }), 'Indisponibile'),
        h('span', { class: 'con-vuoti', style: 'color:var(--vuoto-testo);font-weight:600' }, 'min liberi = vuoti da riempire'))
    );
  }

  function segnalazioni(t) {
    const out = [];
    t.eventi.forEach(function (e) {
      const nome = e.inizio + ' ' + M.etichettaEvento(stato, e);
      if (e.flags.indexOf('sovrapposto') >= 0) out.push(nome + ': si sovrappone a un\'altra attività.');
      if (e.flags.indexOf('in-pausa') >= 0) out.push(nome + ': cade nella pausa.');
      if (e.flags.indexOf('prima-inizio') >= 0) out.push(nome + ': inizia prima dell\'orario di udienza.');
      if (e.flags.indexOf('oltre-tolleranza') >= 0) out.push(nome + ': termina oltre il limite massimo (' + D.minToHhmm(t.tol) + ').');
      else if (e.flags.indexOf('in-tolleranza') >= 0) out.push(nome + ': termina nella tolleranza dopo le ' + D.minToHhmm(t.fin) + '.');
    });
    return out;
  }

  function assegnaCorsie(eventi) {
    const corsie = [];
    const out = eventi.map(function (e) { return { e: e, corsia: 0, n: 1 }; });
    out.forEach(function (o) {
      let k = -1;
      for (let i = 0; i < corsie.length; i++) {
        if (corsie[i] <= o.e.startMin) { k = i; break; }
      }
      if (k < 0) { k = corsie.length; corsie.push(0); }
      corsie[k] = o.e.endMin;
      o.corsia = k;
    });
    out.forEach(function (o) {
      let max = o.corsia;
      out.forEach(function (p) {
        if (p.e.startMin < o.e.endMin && o.e.startMin < p.e.endMin) max = Math.max(max, p.corsia);
      });
      o.n = max + 1;
    });
    return out;
  }

  function righello(t) {
    const PX = 1.5;
    const alt = (t.tol - t.ini) * PX;
    const box = h('div', { class: 'righello', style: 'height:' + alt + 'px' });
    for (let m = Math.ceil(t.ini / 30) * 30; m <= t.tol; m += 30) {
      box.append(h('div', { class: 'tacca ' + (m % 60 === 0 ? 'ora' : 'mezza'), style: 'top:' + (m - t.ini) * PX + 'px' }, h('span', { class: 'tacca-et' }, D.minToHhmm(m))));
    }
    const area = h('div', { class: 'area-righello' });
    area.append(h('div', { class: 'zona-tolleranza', style: 'top:' + (t.fin - t.ini) * PX + 'px;height:' + (t.tol - t.fin) * PX + 'px' }, 'Tolleranza fino alle ' + D.minToHhmm(t.tol)));
    area.append(h('div', { class: 'pausa', style: 'top:' + (t.pausa.startMin - t.ini) * PX + 'px;height:' + (t.pausa.endMin - t.pausa.startMin) * PX + 'px' }, 'Pausa'));
    t.vuoti.forEach(function (v) {
      area.append(h('button', {
        class: 'vuoto',
        style: 'top:' + (v.startMin - t.ini) * PX + 'px;height:' + v.durata * PX + 'px',
        title: 'Vuoto di ' + fmtMin(v.durata) + ' (' + v.inizio + '-' + v.fine + '): aggiungi un\'attività',
        'aria-label': 'Vuoto di ' + fmtMin(v.durata) + ' dalle ' + v.inizio + ' alle ' + v.fine + ': aggiungi un\'attività',
        onClick: function () { dialogoEvento({ data: t.data, inizio: v.inizio, vuoto: v }); }
      }, h('span', { class: 'vuoto-durata' }, fmtMin(v.durata)), h('span', { class: 'vuoto-orario' }, v.inizio + '–' + v.fine)));
    });
    const visibili = t.eventi.filter(function (e) { return e.endMin > t.ini && e.startMin < t.tol; });
    assegnaCorsie(visibili).forEach(function (o) {
      const e = o.e;
      const da = Math.max(e.startMin, t.ini);
      const a = Math.min(e.endMin, t.tol);
      const altezza = Math.max((a - da) * PX, 15);
      const larg = 100 / o.n;
      const fam = M.TIPI[e.tipo] ? M.TIPI[e.tipo].famiglia : 'altro';
      const classi = ['attivita', fam];
      if (e.stato === 'provvisorio') classi.push('provvisorio');
      if (e.flags.indexOf('sovrapposto') >= 0) classi.push('sovrapposto');
      const f = e.fascicoloId ? M.getFascicolo(stato, e.fascicoloId) : null;
      const compatta = altezza < 34;
      if (compatta) classi.push('riga-unica');
      const etich = M.etichettaEvento(stato, e);
      const intervallo = e.inizio + '–' + D.minToHhmm(e.endMin);
      area.append(h('button', {
        class: classi.join(' '),
        style: 'top:' + (da - t.ini) * PX + 'px;height:' + altezza + 'px;left:' + o.corsia * larg + '%;width:calc(' + larg + '% - 2px)',
        title: intervallo + ' ' + etich + (f && f.imputato ? ' (' + f.imputato + ')' : '') + (e.stato === 'provvisorio' ? ' [provvisorio]' : ''),
        onClick: function () { dialogoEvento({ id: e.id }); }
      },
        compatta
          ? [h('span', { class: 'ora' }, e.inizio), ' ' + etich]
          : [h('span', { class: 'ora' }, intervallo), e.stato === 'provvisorio' ? ' · provvisorio' : '', h('span', { class: 'sotto' }, etich), f && f.imputato && altezza >= 52 ? h('span', { class: 'sotto' }, f.imputato) : null]
      ));
    });
    box.append(area);
    return box;
  }

  function pannelloGiorno() {
    const s = ui.giorno;
    const st = C.dayStatus(stato, s);
    const t = C.timeline(stato, s);
    const sez = h('section', { class: 'pannello', 'aria-label': 'Giornata' });

    let etichetta;
    if (st.stato === 'udienza') etichetta = h('span', { class: 'etichetta' }, st.extra ? 'Giorno di udienza (extra)' : 'Giorno di udienza');
    else if (st.stato === 'bloccato') etichetta = h('span', { class: 'etichetta ' + st.blocco.tipo }, st.blocco.tipo === 'festivo' ? 'Festivo: ' + st.nome : st.nome);
    else etichetta = h('span', { class: 'etichetta libero' }, 'Non è un giorno di udienza');
    sez.append(h('div', { class: 'giorno-testa' }, h('h2', { class: 'giorno-titolo' }, cap(D.fmtLong(s))), etichetta));

    const azioni = h('div', { class: 'azioni' });
    azioni.append(h('button', { class: 'btn btn-primario', onClick: function () { dialogoEvento({ data: s, inizio: t.vuoti.length ? t.vuoti[0].inizio : null, vuoto: t.vuoti.length ? t.vuoti[0] : null }); } }, 'Aggiungi attività'));
    if (st.stato === 'libero') {
      azioni.append(h('button', { class: 'btn', onClick: function () {
        stato.parametri.giorniUdienza.date.push(s);
        stato.parametri.giorniUdienza.date.sort();
        logParam('Aggiunto giorno di udienza extra ' + s);
        aggiorna();
      } }, 'Segna come giorno di udienza'));
    }
    if (st.extra) {
      azioni.append(h('button', { class: 'btn', onClick: function () {
        stato.parametri.giorniUdienza.date = stato.parametri.giorniUdienza.date.filter(function (x) { return x !== s; });
        logParam('Tolto giorno di udienza extra ' + s);
        aggiorna();
      } }, 'Togli il giorno extra'));
    }
    sez.append(azioni);

    if (st.stato === 'udienza' || t.eventi.length > 0) {
      sez.append(h('div', { class: 'metriche' },
        h('div', { class: 'metrica' }, h('b', null, fmtMin(t.utili)), h('span', null, 'utili (senza pausa)')),
        h('div', { class: 'metrica' }, h('b', null, fmtMin(t.occupati)), h('span', null, 'occupati')),
        h('div', { class: 'metrica' }, h('b', { style: t.liberi > 0 ? 'color:var(--vuoto-testo)' : '' }, fmtMin(t.liberi)), h('span', null, 'liberi')),
        h('div', { class: 'barra-saturazione' },
          h('div', { class: 'pista', role: 'img', 'aria-label': 'Saturazione ' + Math.round(t.saturazione * 100) + ' per cento' }, h('div', { class: 'pieno', style: 'width:' + Math.min(100, Math.round(t.saturazione * 100)) + '%' })),
          h('span', null, 'Saturazione ' + Math.round(t.saturazione * 100) + '%' + (t.minutiInTolleranza ? ' · ' + t.minutiInTolleranza + ' min in tolleranza' : '')))));
      const seg = segnalazioni(t);
      if (seg.length) sez.append(h('div', { class: 'messaggio avviso' }, h('ul', null, seg.map(function (x) { return h('li', null, x); }))));
      if (t.margini.length) sez.append(h('div', { class: 'aiuto', style: 'font-size:.8rem;color:var(--inchiostro-2)' }, 'Margini sotto i ' + stato.parametri.vuotoMinimo + ' minuti non contati come vuoti: ' + t.margini.map(function (x) { return x.inizio + '-' + x.fine; }).join(', ') + '.'));
      sez.append(righello(t));
    } else if (st.stato === 'bloccato') {
      sez.append(h('div', { class: 'vuota' }, 'Giorno bloccato: ' + st.nome + '. Non è prevista udienza.'));
    } else {
      sez.append(h('div', { class: 'vuota' }, 'Nessuna udienza prevista per questo giorno. Puoi segnarlo come giorno di udienza oppure aggiungere un\'attività.'));
    }

    const fuori = t.eventi.filter(function (e) { return !(e.endMin > t.ini && e.startMin < t.tol); });
    if (t.eventi.length) {
      const det = h('details', { class: 'elenco', open: t.eventi.length <= 14 });
      det.append(h('summary', null, 'Elenco delle attività (' + t.eventi.length + ')' + (fuori.length ? ', di cui ' + fuori.length + ' fuori fascia' : '')));
      det.append(h('div', { class: 'scorri' }, h('table', { class: 'tabella' },
        h('thead', null, h('tr', null, ['Ora', 'Durata', 'Attività', 'Fascicolo', 'Stato', ''].map(function (x) { return h('th', null, x); }))),
        h('tbody', null, t.eventi.map(function (e) {
          const f = e.fascicoloId ? M.getFascicolo(stato, e.fascicoloId) : null;
          return h('tr', null,
            h('td', null, e.inizio + '–' + D.minToHhmm(e.endMin)),
            h('td', null, fmtMin(e.durata)),
            h('td', null, e.titolo || M.TIPI[e.tipo].label),
            h('td', null, f ? [f.rg || '(senza RG)', f.imputato ? ' · ' + f.imputato : ''] : '—'),
            h('td', null, e.stato === 'provvisorio' ? h('span', { class: 'pillola prov' }, 'provvisorio') : h('span', { class: 'pillola ok' }, 'ufficiale'),
              fuori.indexOf(e) >= 0 ? h('span', { class: 'pillola avv' }, 'fuori fascia') : null),
            h('td', null, h('button', { class: 'btn btn-piccolo', onClick: function () { dialogoEvento({ id: e.id }); } }, 'Modifica')));
        })))));
      sez.append(det);
    }
    return sez;
  }

  /* ---------- finestre di dialogo ---------- */

  function apriDialogo(titolo, corpo, piede, opts) {
    const dlg = h('dialog', { class: 'dialogo', 'aria-labelledby': 'dlg-titolo' });
    const form = h('form', { onSubmit: function (e) { e.preventDefault(); } },
      h('header', null, h('h2', { id: 'dlg-titolo' }, titolo)),
      h('div', { class: 'corpo' }, corpo),
      h('footer', null, piede));
    dlg.append(form);
    dlg.addEventListener('close', function () { dlg.remove(); });
    document.body.append(dlg);
    dlg.showModal();
    if (opts && opts.focus) opts.focus.focus();
    return dlg;
  }

  function dialogoEvento(opz) {
    const esistente = opz.id ? M.getEvento(stato, opz.id) : null;
    const fasc0 = esistente && esistente.fascicoloId ? M.getFascicolo(stato, esistente.fascicoloId) : opz.fascicoloId ? M.getFascicolo(stato, opz.fascicoloId) : null;
    const base = esistente || {
      data: opz.data || ui.giorno,
      inizio: opz.inizio || stato.parametri.orario.inizio,
      durata: opz.vuoto ? Math.min(stato.parametri.durate.ISTRUTTORIA, opz.vuoto.durata) : stato.parametri.durate.ISTRUTTORIA,
      tipo: opz.tipo || 'ISTRUTTORIA',
      stato: 'ufficiale',
      titolo: '',
      note: '',
      sovrapponibile: false
    };
    let durataModificata = !!esistente || !!opz.vuoto;

    const fData = h('input', { type: 'date', value: base.data, required: true, onInput: aggiornaMessaggi });
    const fInizio = h('input', { type: 'time', value: base.inizio, required: true, onInput: aggiornaMessaggi });
    const fDurata = h('input', { type: 'number', min: 1, max: 600, step: 1, value: base.durata, required: true, onInput: function () { durataModificata = true; aggiornaMessaggi(); } });
    const fTipo = h('select', { onChange: function () {
      if (!durataModificata) fDurata.value = stato.parametri.durate[fTipo.value] || 10;
      aggiornaMessaggi();
    } }, Object.keys(M.TIPI).map(function (k) { return h('option', { value: k, selected: k === base.tipo }, M.TIPI[k].label); }));
    const fStato = h('select', { onChange: aggiornaMessaggi }, Object.keys(M.STATI).map(function (k) { return h('option', { value: k, selected: k === base.stato }, M.STATI[k]); }));
    const datalist = h('datalist', { id: 'elenco-rg' }, stato.fascicoli.filter(function (f) { return f.rg; }).map(function (f) { return h('option', { value: f.rg }, f.imputato); }));
    const fRg = h('input', { type: 'text', list: 'elenco-rg', value: fasc0 ? fasc0.rg : '', autocomplete: 'off', onInput: sincronizzaFascicolo });
    const fImp = h('input', { type: 'text', value: fasc0 ? fasc0.imputato : '', autocomplete: 'off' });
    const fOrigine = h('select', null, Object.keys(M.ORIGINI).map(function (k) { return h('option', { value: k, selected: fasc0 ? k === fasc0.origine : k === 'ALTRO' }, M.ORIGINI[k]); }));
    const fTitolo = h('input', { type: 'text', value: base.titolo || '', placeholder: 'Facoltativo, sostituisce il nome del tipo' });
    const rinvio0 = base.rinvioDal && D.isValidYmd(base.rinvioDal) ? D.fmtIt(base.rinvioDal) : (base.rinvioDal || '');
    const fRinvio = h('input', { type: 'text', value: rinvio0, placeholder: 'gg/mm/aaaa oppure 1 UD' });
    const fEsito = h('input', { type: 'text', value: base.esito || '', placeholder: 'Da compilare dopo l\'udienza' });
    const fNote = h('textarea', null, base.note || '');
    const fSovr = h('input', { type: 'checkbox', checked: !!base.sovrapponibile, onChange: aggiornaMessaggi });
    const msg = h('div', { class: 'intera' });
    const errori = h('div', { class: 'intera', role: 'alert' });
    let conferma = false;
    const btnSalva = h('button', { class: 'btn btn-primario', type: 'button' }, 'Salva');

    function sincronizzaFascicolo() {
      const f = fRg.value.trim() ? M.findFascicoloByRg(stato, fRg.value) : null;
      if (f) {
        if (!fImp.value.trim()) fImp.value = f.imputato;
        fOrigine.value = f.origine;
        fOrigine.disabled = true;
      } else fOrigine.disabled = false;
    }

    function bozza() {
      return { data: fData.value, inizio: fInizio.value, durata: parseInt(fDurata.value, 10), stato: fStato.value, sovrapponibile: fSovr.checked };
    }

    function aggiornaMessaggi() {
      conferma = false;
      btnSalva.textContent = 'Salva';
      const w = C.checkEvent(stato, bozza(), { escludiId: esistente ? esistente.id : null });
      msg.replaceChildren();
      if (w.length) msg.append(h('div', { class: 'messaggio avviso' }, h('ul', null, w.map(function (x) { return h('li', null, x.testo); })), h('span', { class: 'aiuto' }, 'Puoi salvare comunque: la decisione è tua.')));
    }

    btnSalva.addEventListener('click', function () {
      errori.replaceChildren();
      const dati = {
        data: fData.value,
        inizio: fInizio.value,
        durata: parseInt(fDurata.value, 10),
        tipo: fTipo.value,
        stato: fStato.value,
        titolo: fTitolo.value,
        note: fNote.value,
        sovrapponibile: fSovr.checked,
        rinvioDal: I.normalizzaRinvio(fRinvio.value),
        esito: fEsito.value
      };
      const prova = M.validateEvento(stato, Object.assign({}, dati, { fascicoloId: null }));
      if (prova.length) {
        errori.append(h('div', { class: 'messaggio errore' }, h('ul', null, prova.map(function (x) { return h('li', null, x); }))));
        return;
      }
      const forti = C.checkEvent(stato, dati, { escludiId: esistente ? esistente.id : null }).filter(function (x) { return x.livello === 'errore'; });
      if (forti.length && !conferma) {
        conferma = true;
        btnSalva.textContent = 'Salva comunque';
        errori.append(h('div', { class: 'messaggio errore' }, forti.map(function (x) { return h('div', null, x.testo); }), h('div', { class: 'aiuto' }, 'Premi di nuovo per salvare comunque.')));
        return;
      }
      let fid = null;
      const rg = fRg.value.trim();
      const imp = fImp.value.trim();
      if (rg || imp) {
        let f = rg ? M.findFascicoloByRg(stato, rg) : null;
        if (!f && !rg && imp) {
          f = stato.fascicoli.find(function (x) { return !x.rg && x.imputato.toLowerCase() === imp.toLowerCase(); }) || null;
        }
        if (!f) {
          const r = M.addFascicolo(stato, { rg: rg, imputato: imp, origine: fOrigine.value });
          if (!r.ok) {
            errori.append(h('div', { class: 'messaggio errore' }, r.errori.join(' ')));
            return;
          }
          f = r.valore;
        } else if (imp && !f.imputato) M.updateFascicolo(stato, f.id, { imputato: imp });
        fid = f.id;
      }
      dati.fascicoloId = fid;
      const r = esistente ? M.updateEvento(stato, esistente.id, dati) : M.addEvento(stato, dati);
      if (!r.ok) {
        errori.append(h('div', { class: 'messaggio errore' }, r.errori.join(' ')));
        return;
      }
      dlg.close();
      ui.giorno = dati.data;
      const p = D.parts(dati.data);
      ui.anno = p.y;
      ui.mese = p.m;
      aggiorna();
    });

    const piede = [
      btnSalva,
      h('button', { class: 'btn', type: 'button', onClick: function () { dlg.close(); } }, 'Annulla'),
      h('span', { class: 'spazio' }),
      esistente ? h('button', { class: 'btn', type: 'button', onClick: function () { dlg.close(); dialogoEsito(esistente.id); } }, 'Esito e prossima azione') : null,
      esistente ? h('button', { class: 'btn btn-pericolo', type: 'button', onClick: function () {
        if (!window.confirm('Eliminare questa attività?')) return;
        M.deleteEvento(stato, esistente.id);
        dlg.close();
        aggiorna();
      } }, 'Elimina') : null
    ];
    const corpo = [
      h('label', { class: 'campo' }, 'Data', fData),
      h('label', { class: 'campo' }, 'Ora di inizio', fInizio),
      h('label', { class: 'campo' }, 'Durata (minuti)', fDurata),
      h('label', { class: 'campo' }, 'Tipo di attività', fTipo),
      h('label', { class: 'campo' }, 'Stato', fStato),
      h('label', { class: 'campo' }, 'Numero di ruolo (RG)', fRg, datalist),
      h('label', { class: 'campo' }, 'Imputato', fImp),
      h('label', { class: 'campo' }, 'Origine (solo per un fascicolo nuovo)', fOrigine),
      h('label', { class: 'campo' }, 'Rinvio dal', fRinvio),
      h('label', { class: 'campo' }, 'Esito', fEsito),
      h('label', { class: 'campo intera' }, 'Titolo', fTitolo),
      h('label', { class: 'campo intera' }, 'Note', fNote),
      h('label', { class: 'casella intera' }, fSovr, 'Consenti la sovrapposizione con altre attività (forzatura)'),
      msg,
      errori
    ];
    const dlg = apriDialogo(esistente ? 'Modifica attività' : 'Nuova attività', corpo, piede, { focus: fTipo });
    if (fasc0) { fOrigine.disabled = true; }
    aggiornaMessaggi();
    sincronizzaFascicolo();
  }

  /* Esito di un'udienza e prossima azione: l'app propone, il giudice conferma (nulla cambia da solo). */
  function dialogoEsito(eventoId) {
    const ev = M.getEvento(stato, eventoId);
    if (!ev) return;
    const E = GC.esiti;
    const f = ev.fascicoloId ? M.getFascicolo(stato, ev.fascicoloId) : null;
    const sel = h('select', null,
      h('option', { value: '' }, 'Scegli l\'esito…'),
      E.esitiPer(ev.tipo).map(function (x) { return h('option', { value: x.codice, selected: x.codice === ev.esitoCodice }, x.label); }));
    const fData = h('input', { type: 'date' });
    const fOra = h('input', { type: 'time' });
    const fDur = h('input', { type: 'number', min: 1, max: 600, step: 1 });
    const fFase = h('input', { type: 'checkbox', checked: true });
    const box = h('div', { class: 'intera' });
    const errori = h('div', { class: 'intera', role: 'alert' });
    const btnPrincipale = h('button', { class: 'btn btn-primario', type: 'button' }, 'Registra l\'esito');
    let prop = null;

    function dati() {
      return { fascicoloId: ev.fascicoloId, data: fData.value, inizio: fOra.value, durata: parseInt(fDur.value, 10), tipo: prop.udienza.tipo, stato: 'ufficiale', titolo: '', note: '', rinvioDal: ev.data, esito: '', sovrapponibile: false };
    }

    function ridisegna() {
      errori.replaceChildren();
      box.replaceChildren();
      prop = sel.value ? E.proponi(stato, ev, sel.value) : null;
      if (!prop) {
        btnPrincipale.textContent = 'Registra l\'esito';
        btnPrincipale.disabled = true;
        return;
      }
      btnPrincipale.disabled = false;
      const parti = [h('div', { class: 'aiuto' }, 'Regola: ' + prop.fonte + '. ' + prop.motivo)];
      if (prop.azione === 'udienza' && f) {
        const u = prop.udienza;
        fData.value = u.data || '';
        fOra.value = u.inizio || '';
        fDur.value = u.durata;
        parti.push(h('h3', { style: 'font-size:1rem;margin:8px 0 4px' }, 'Prossima attività proposta: ' + M.TIPI[u.tipo].label));
        parti.push(h('div', { class: 'griglia-campi' }, h('label', { class: 'campo' }, 'Data', fData), h('label', { class: 'campo' }, 'Ora', fOra), h('label', { class: 'campo' }, 'Durata (minuti)', fDur)));
        [fData, fOra, fDur].forEach(function (c) { c.oninput = avvisiData; });
        btnPrincipale.textContent = 'Registra l\'esito e crea l\'attività';
      } else if (prop.azione === 'udienza') {
        parti.push(h('div', { class: 'messaggio avviso' }, 'L\'attività non è collegata a un fascicolo: posso registrare l\'esito, ma non proporre la prossima udienza.'));
        btnPrincipale.textContent = 'Registra l\'esito';
      } else if (prop.azione === 'chiudi') btnPrincipale.textContent = 'Registra l\'esito e chiudi il fascicolo';
      else if (prop.azione === 'fase') btnPrincipale.textContent = 'Registra l\'esito e aggiorna la fase';
      else btnPrincipale.textContent = 'Registra l\'esito e scegli l\'attività';
      prop.avvisi.forEach(function (a) { parti.push(h('div', { class: 'messaggio avviso' }, a)); });
      if (f && prop.fase && M.faseDi(f, stato) !== prop.fase) {
        fFase.checked = true;
        parti.push(h('label', { class: 'casella' }, fFase, 'Aggiorna la fase del fascicolo: ' + M.FASI[M.faseDi(f, stato)] + ' → ' + M.FASI[prop.fase]));
      } else fFase.checked = false;
      parti.push(h('div', { id: 'avvisi-data' }));
      box.append(h('div', null, parti));
      avvisiData();
    }

    function avvisiData() {
      const c = box.querySelector('#avvisi-data');
      if (!c) return;
      c.replaceChildren();
      if (!(prop && prop.azione === 'udienza' && f)) return;
      const d = dati();
      if (!d.data || !d.inizio || !(d.durata > 0)) return;
      const w = C.checkEvent(stato, d, {});
      if (w.length) c.append(h('div', { class: 'messaggio avviso' }, h('ul', null, w.map(function (x) { return h('li', null, x.testo); })), h('span', { class: 'aiuto' }, 'Puoi confermare comunque: la decisione è tua.')));
    }

    function registra(creaUdienza) {
      errori.replaceChildren();
      if (!prop) return;
      let nuova = null;
      if (creaUdienza && prop.azione === 'udienza' && f) {
        nuova = dati();
        const err = M.validateEvento(stato, nuova);
        if (err.length) {
          errori.append(h('div', { class: 'messaggio errore' }, h('ul', null, err.map(function (x) { return h('li', null, x); }))));
          return;
        }
      }
      M.updateEvento(stato, ev.id, { esitoCodice: sel.value, esito: ev.esito || prop.label });
      if (f && prop.fase && fFase.checked) M.updateFascicolo(stato, f.id, { fase: prop.fase });
      if (nuova) M.addEvento(stato, nuova);
      dlg.close();
      if (creaUdienza && prop.azione === 'libera' && f) {
        ui.vista = 'calendario';
        dialogoEvento({ fascicoloId: f.id, data: ev.data });
        return;
      }
      if (nuova) scegliGiorno(nuova.data);
      aggiorna();
    }

    sel.addEventListener('change', ridisegna);
    btnPrincipale.addEventListener('click', function () { registra(true); });
    const piede = [
      btnPrincipale,
      h('button', { class: 'btn', type: 'button', onClick: function () { registra(false); } }, 'Registra solo l\'esito'),
      h('button', { class: 'btn', type: 'button', onClick: function () { dlg.close(); } }, 'Annulla')
    ];
    const corpo = [
      h('p', { class: 'aiuto intera' }, (f ? (f.rg || '') + ' ' + f.imputato + ' · ' : '') + M.TIPI[ev.tipo].label + ' del ' + D.fmtIt(ev.data) + ' ' + ev.inizio + '. Scegli come è andata: l\'app propone la prossima attività e tu confermi. Nulla cambia finché non confermi.'),
      h('label', { class: 'campo intera' }, 'Esito dell\'udienza', sel),
      box,
      errori
    ];
    const dlg = apriDialogo('Esito e prossima azione', corpo, piede, { focus: sel });
    ridisegna();
  }

  function dialogoFascicolo(id, preset) {
    const esistente = id ? M.getFascicolo(stato, id) : null;
    const base = esistente || Object.assign({ rg: '', imputato: '', origine: 'ALTRO', detenuto: false, note: '', reato: '', pm: '', nrOrd: '', ricezione: '', notificaCitazione: '', urgente: false, predibDaFissare: false, dataProvvedimento: '', incameramentoDaFissare: false }, preset || {});
    const fRg = h('input', { type: 'text', value: base.rg });
    const fImp = h('input', { type: 'text', value: base.imputato });
    const fOri = h('select', null, Object.keys(M.ORIGINI).map(function (k) { return h('option', { value: k, selected: k === base.origine }, M.ORIGINI[k]); }));
    const fDet = h('input', { type: 'checkbox', checked: base.detenuto });
    const fNote = h('textarea', null, base.note || '');
    const fReato = h('input', { type: 'text', value: base.reato || '' });
    const fPm = h('input', { type: 'text', value: base.pm || '' });
    const fNrOrd = h('input', { type: 'text', value: base.nrOrd || '' });
    const fRic = h('input', { type: 'date', value: base.ricezione || '' });
    const fNot = h('input', { type: 'date', value: base.notificaCitazione || '' });
    const fUrg = h('input', { type: 'checkbox', checked: !!base.urgente });
    const fDaFissare = h('input', { type: 'checkbox', checked: !!base.predibDaFissare });
    const fProv = h('input', { type: 'date', value: base.dataProvvedimento || '' });
    const fDaInc = h('input', { type: 'checkbox', checked: !!base.incameramentoDaFissare });
    const fFase = h('select', null, h('option', { value: '' }, esistente ? 'Non indicata (si ricava: ' + M.FASI[M.faseDi(esistente, stato)] + ')' : 'Non indicata'), Object.keys(M.FASI).map(function (k) { return h('option', { value: k, selected: k === base.fase }, M.FASI[k]); }));
    const errori = h('div', { class: 'intera', role: 'alert' });

    const corpo = [
      h('label', { class: 'campo' }, 'Numero di ruolo (RG)', fRg),
      h('label', { class: 'campo' }, 'Imputato', fImp),
      h('label', { class: 'campo' }, 'Origine', fOri),
      h('label', { class: 'campo' }, 'Fase del fascicolo', fFase),
      h('label', { class: 'campo' }, 'Numero d\'ordine', fNrOrd),
      h('label', { class: 'campo' }, 'Reato', fReato),
      h('label', { class: 'campo' }, 'P.M. titolare', fPm),
      h('label', { class: 'campo' }, 'Fascicolo ricevuto il', fRic),
      h('label', { class: 'campo' }, 'Notifica del decreto di citazione', fNot),
      h('label', { class: 'casella' }, fUrg, 'Urgente (termine di 45 giorni)'),
      h('label', { class: 'casella' }, fDaFissare, 'Da fissare in predibattimento'),
      h('label', { class: 'campo' }, 'Data del decreto, del provvedimento o dell\'ultima notifica (immediato)', fProv),
      h('label', { class: 'casella' }, fDaInc, 'Da incamerare'),
      h('label', { class: 'casella' }, fDet, 'Imputato detenuto (priorità)'),
      h('label', { class: 'campo intera' }, 'Note', fNote)
    ];
    if (esistente) {
      const ev = M.eventiDelFascicolo(stato, esistente.id);
      corpo.push(h('div', { class: 'intera' },
        h('h3', { style: 'font-size:1rem;margin-bottom:6px' }, 'Attività del fascicolo (' + ev.length + ')'),
        ev.length
          ? h('div', { class: 'scorri' }, h('table', { class: 'tabella' },
            h('tbody', null, ev.map(function (e) {
              return h('tr', null,
                h('td', null, D.fmtIt(e.data) + ' ' + e.inizio),
                h('td', null, e.titolo || M.TIPI[e.tipo].label),
                h('td', null, fmtMin(e.durata)),
                h('td', null, e.esitoCodice && GC.esiti.ESITI[e.esitoCodice] ? h('span', { class: 'pillola' }, GC.esiti.ESITI[e.esitoCodice].label) : (e.esito || '')),
                h('td', null, h('button', { class: 'btn btn-piccolo', type: 'button', onClick: function () { dlg.close(); dialogoEsito(e.id); } }, 'Esito'), ' ', h('button', { class: 'btn btn-piccolo', type: 'button', onClick: function () { dlg.close(); dialogoEvento({ id: e.id }); } }, 'Modifica')));
            }))))
          : h('div', { class: 'aiuto' }, 'Nessuna attività collegata.'),
        h('div', { style: 'margin-top:8px' }, h('button', { class: 'btn', type: 'button', onClick: function () { dlg.close(); dialogoEvento({ fascicoloId: esistente.id, data: ui.giorno }); } }, 'Aggiungi attività'))));
    }
    corpo.push(errori);
    const piede = [
      h('button', { class: 'btn btn-primario', type: 'button', onClick: function () {
        errori.replaceChildren();
        const dati = { rg: fRg.value, imputato: fImp.value, origine: fOri.value, fase: fFase.value, detenuto: fDet.checked, note: fNote.value, reato: fReato.value, pm: fPm.value, nrOrd: fNrOrd.value, ricezione: fRic.value, notificaCitazione: fNot.value, urgente: fUrg.checked, predibDaFissare: fDaFissare.checked, dataProvvedimento: fProv.value, incameramentoDaFissare: fDaInc.checked };
        const r = esistente ? M.updateFascicolo(stato, esistente.id, dati) : M.addFascicolo(stato, dati);
        if (!r.ok) {
          errori.append(h('div', { class: 'messaggio errore' }, h('ul', null, r.errori.map(function (x) { return h('li', null, x); }))));
          return;
        }
        dlg.close();
        aggiorna();
      } }, 'Salva'),
      h('button', { class: 'btn', type: 'button', onClick: function () { dlg.close(); } }, 'Annulla'),
      h('span', { class: 'spazio' }),
      esistente ? h('button', { class: 'btn btn-pericolo', type: 'button', onClick: function () {
        const n = M.eventiDelFascicolo(stato, esistente.id).length;
        if (!window.confirm(n ? 'Eliminare il fascicolo e le sue ' + n + ' attività?' : 'Eliminare il fascicolo?')) return;
        M.deleteFascicolo(stato, esistente.id, { conAttivita: true });
        dlg.close();
        aggiorna();
      } }, 'Elimina') : null
    ];
    const dlg = apriDialogo(esistente ? 'Fascicolo ' + (esistente.rg || esistente.imputato) : 'Nuovo fascicolo', corpo, piede, { focus: fRg });
  }

  /* ---------- predibattimento ---------- */

  function vistaPredib() {
    const da = stato.fascicoli.filter(function (f) { return f.predibDaFissare; });
    const sel = da.filter(function (f) { return !ui.predib.esclusi[f.id]; });
    const out = [
      h('h1', { class: 'titolo-pagina' }, 'Predibattimento'),
      h('p', { class: 'sottotitolo' }, 'Inserisci i fascicoli ricevuti con la data di notifica della citazione: l\'app propone le date possibili, almeno 60 giorni dopo la notifica (45 se urgente) e almeno 5 settimane dopo l\'ultima udienza predibattimentale. Scegli tu la data più comoda.')
    ];
    if (ui.messaggio) out.push(h('div', { class: 'messaggio ' + ui.messaggio.tipo, role: 'status' }, ui.messaggio.testo));
    out.push(sezioneDaFissare(da, sel));
    if (sel.length) out.push(sezioneDate(sel));
    out.push(sezioneUdienzePredib());
    return out;
  }

  function sezioneDaFissare(da, sel) {
    const P = GC.predib;
    const tutti = h('input', { type: 'checkbox', checked: sel.length === da.length && da.length > 0, 'aria-label': 'Seleziona tutti', onChange: function (e) {
      ui.predib.esclusi = {};
      if (!e.target.checked) da.forEach(function (f) { ui.predib.esclusi[f.id] = true; });
      render();
    } });
    return h('section', { class: 'sezione' },
      h('h2', null, 'Fascicoli da fissare (' + da.length + ')'),
      h('div', { class: 'azioni' },
        h('button', { class: 'btn btn-primario', onClick: function () { dialogoFascicolo(null, { predibDaFissare: true, ricezione: D.today() }); } }, 'Aggiungi un fascicolo'),
        h('button', { class: 'btn', onClick: dialogoElencoPredib }, 'Incolla un elenco')),
      da.length
        ? h('div', { class: 'scorri', style: 'max-height:380px' }, h('table', { class: 'tabella' },
          h('thead', null, h('tr', null, [tutti, 'RG', 'Imputato', 'Reato', 'Ricevuto il', 'Notifica citazione', 'Data minima', ''].map(function (x) { return h('th', null, x); }))),
          h('tbody', null, da.map(function (f) {
            const m = P.dataMinima(stato, [f]);
            return h('tr', null,
              h('td', null, h('input', { type: 'checkbox', checked: !ui.predib.esclusi[f.id], 'aria-label': 'Includi ' + (f.rg || f.imputato), onChange: function (e) {
                if (e.target.checked) delete ui.predib.esclusi[f.id];
                else ui.predib.esclusi[f.id] = true;
                render();
              } })),
              h('td', null, f.rg || '—'),
              h('td', null, f.imputato || '—'),
              h('td', null, f.reato || '—'),
              h('td', null, f.ricezione ? D.fmtIt(f.ricezione) : '—'),
              h('td', null, f.notificaCitazione ? D.fmtIt(f.notificaCitazione) : h('span', { class: 'pillola avv' }, 'manca'), f.urgente ? h('span', { class: 'pillola err' }, 'urgente') : null),
              h('td', null, m.data ? D.fmtIt(m.data) : '—'),
              h('td', null, h('button', { class: 'btn btn-piccolo', onClick: function () { dialogoFascicolo(f.id); } }, 'Scheda')));
          }))))
        : h('div', { class: 'vuota' }, 'Nessun fascicolo da fissare. Aggiungine uno o incolla un elenco: anche da Excel, copiando le colonne RG, Imputato, Reato, Data notifica, Urgente.'));
  }

  function sezioneDate(sel) {
    const P = GC.predib;
    const cand = P.candidate(stato, sel, { ordine: ui.predib.ordine, giorni: 180, oggi: D.today() });
    const buone = cand.righe.filter(function (x) { return x.stato !== 'rosso'; });
    const rosse = cand.righe.filter(function (x) { return x.stato === 'rosso'; });
    const esito = { verde: ['ok', 'Idonea'], giallo: ['avv', 'Con riserve'], rosso: ['err', 'Non consentita'] };
    const mostra = ui.predib.mostraRossi ? buone.slice(0, 12).concat(rosse.slice(0, 12)) : buone.slice(0, 12);
    const tab = h('div', { class: 'scorri', style: 'max-height:560px' }, h('table', { class: 'tabella' },
      h('thead', null, h('tr', null, ['Data', 'Esito', 'Dall\'udienza precedente', 'Posti da 10 min', 'Giorni liberi per studiare', 'Note', ''].map(function (x) { return h('th', null, x); }))),
      h('tbody', null, mostra.map(function (r) {
        const e = esito[r.stato];
        return h('tr', null,
          h('td', null, h('b', null, cap(D.fmtLong(r.data)))),
          h('td', null, h('span', { class: 'pillola ' + e[0] }, e[1])),
          h('td', null, r.giorniDaPrecedente !== null ? r.giorniDaPrecedente + ' giorni (' + D.fmtIt(r.precedente) + ')' : 'nessuna prima'),
          h('td', null, r.posti, r.attivitaPresenti ? h('span', { class: 'aiuto' }, ' · ' + r.attivitaPresenti + ' già fissate') : null),
          h('td', null, r.giorniLiberiStudio + ' (' + r.giorniDaRicezione + ' giorni dalla ' + (r.riferimentoRicezione === 'ricezione' ? 'ricezione' : 'data di oggi') + ')'),
          h('td', { class: 'aiuto' }, r.motivi.concat(r.avvisi || []).join(' ')),
          h('td', null, h('button', { class: 'btn btn-piccolo' + (r.stato === 'verde' ? ' btn-primario' : ''), onClick: function () { fissaQui(r, sel); } }, r.stato === 'verde' ? 'Fissa qui' : 'Fissa comunque')));
      }))));
    const per = stato.parametri.predibFascicoliPerUdienza;
    let pianoBox = null;
    if (sel.length > per) {
      if (!ui.predib.pianoAttivo) {
        pianoBox = h('div', { class: 'messaggio info' }, 'Hai ' + sel.length + ' fascicoli: più dei ' + per + ' previsti per un\'udienza. ',
          h('button', { class: 'btn btn-piccolo', onClick: function () { ui.predib.pianoAttivo = true; render(); } }, 'Dividili in gruppi da ' + per));
      } else {
        const piano = P.piano(stato, sel, { oggi: D.today(), ordine: ui.predib.ordine });
        const nFissabili = piano.reduce(function (t, g) { return g.data ? t + g.ids.length : t; }, 0);
        pianoBox = h('div', { class: 'messaggio info' },
          h('b', null, 'Piano in ' + piano.length + ' udienze'),
          h('table', { class: 'tabella', style: 'margin:8px 0;background:var(--superficie)' },
            h('thead', null, h('tr', null, ['Gruppo', 'Fascicoli', 'Data', 'Esito', 'Note'].map(function (x) { return h('th', null, x); }))),
            h('tbody', null, piano.map(function (g, i) {
              const e = esito[g.stato];
              return h('tr', null,
                h('td', null, i + 1),
                h('td', null, g.ids.length),
                h('td', null, g.data ? h('b', null, cap(D.fmtLong(g.data))) : '—'),
                h('td', null, h('span', { class: 'pillola ' + e[0] }, e[1])),
                h('td', { class: 'aiuto' }, g.motivi.concat(g.avvisi || []).join(' ')));
            }))),
          h('div', { class: 'azioni', style: 'margin:0' },
            h('button', { class: 'btn btn-primario', disabled: nFissabili === 0, onClick: function () {
              piano.forEach(function (g) {
                if (g.data) P.fissa(stato, g.data, g.ids.map(function (id) { return M.getFascicolo(stato, id); }), {});
              });
              ui.messaggio = { tipo: 'ok', testo: 'Piano applicato: fissati ' + nFissabili + ' fascicoli in ' + piano.filter(function (g) { return g.data; }).length + ' udienze, 10 minuti ciascuno.' };
              ui.predib.esclusi = {};
              ui.predib.pianoAttivo = false;
              aggiorna();
            } }, 'Applica il piano (' + nFissabili + ' fascicoli)'),
            h('button', { class: 'btn', onClick: function () { ui.predib.pianoAttivo = false; render(); } }, 'Chiudi il piano')));
      }
    }
    if (pianoBox && ui.predib.pianoAttivo) {
      return h('section', { class: 'sezione' },
        h('h2', null, 'Date proposte per ' + sel.length + ' fascicoli'),
        h('p', { class: 'aiuto' }, cand.minimo.data ? 'Prima data ammessa dal termine di notifica: ' + D.fmtIt(cand.minimo.data) + '.' : 'Nessun fascicolo ha la data di notifica: il termine di 60 giorni non viene controllato.'),
        pianoBox);
    }
    return h('section', { class: 'sezione' },
      h('h2', null, 'Date proposte per ' + sel.length + (sel.length === 1 ? ' fascicolo' : ' fascicoli')),
      pianoBox,
      h('p', { class: 'aiuto' }, cand.minimo.data ? 'Prima data ammessa dal termine di notifica: ' + D.fmtIt(cand.minimo.data) + '.' : 'Nessun fascicolo ha la data di notifica: il termine di 60 giorni non viene controllato.'),
      h('div', { class: 'riga-campi' },
        h('label', { class: 'campo' }, 'Ordina per',
          h('select', { onChange: function (e) { ui.predib.ordine = e.target.value; render(); } },
            h('option', { value: 'prima', selected: ui.predib.ordine === 'prima' }, 'Data più vicina'),
            h('option', { value: 'studio', selected: ui.predib.ordine === 'studio' }, 'Più comoda per studiare i fascicoli'))),
        h('label', { class: 'casella' }, h('input', { type: 'checkbox', checked: ui.predib.mostraRossi, onChange: function (e) { ui.predib.mostraRossi = e.target.checked; render(); } }), 'Mostra anche le date non consentite')),
      buone.length ? tab : h('div', { class: 'messaggio avviso' }, 'Nessuna data adatta nei prossimi 180 giorni. Controlla i giorni di udienza nelle impostazioni.'),
      !buone.length && mostra.length ? tab : null);
  }

  function fissaQui(r, sel) {
    const P = GC.predib;
    if (r.stato !== 'verde') {
      const testo = (r.stato === 'rosso' ? 'Questa data non è consentita dalle regole:\n' : 'Questa data ha delle riserve:\n') + r.motivi.join('\n') + '\n\nFissare comunque?';
      if (!window.confirm(testo)) return;
    }
    let usaTol = false;
    const a = P.assegnaOrari(stato, r.data, sel.length, {});
    if (a.mancanti > 0) {
      const ok = window.confirm('Nella fascia ordinaria entrano ' + (sel.length - a.mancanti) + ' fascicoli su ' + sel.length + '. Vuoi collocare gli altri nella tolleranza, fino alle ' + stato.parametri.orario.tolleranzaFine + '?');
      usaTol = ok;
    }
    const res = P.fissa(stato, r.data, sel, { usaTolleranza: usaTol });
    ui.messaggio = {
      tipo: res.nonCollocati ? 'avviso' : 'ok',
      testo: 'Fissati ' + res.creati + ' fascicoli per ' + D.fmtLong(r.data) + ' (10 minuti ciascuno, alla prima udienza).' + (res.nonCollocati ? ' ' + res.nonCollocati + ' non sono entrati e restano da fissare.' : '')
    };
    ui.predib.esclusi = {};
    ui.giorno = r.data;
    aggiorna();
  }

  function sezioneUdienzePredib() {
    const P = GC.predib;
    const righe = P.riepilogoUdienze(stato);
    return h('section', { class: 'sezione' },
      h('h2', null, 'Udienze predibattimentali già fissate'),
      h('p', { class: 'aiuto' }, 'Sono le giornate con almeno ' + stato.parametri.predibSogliaUdienza + ' fascicoli alla prima udienza. Le 5 settimane si contano tra una e l\'altra.'),
      righe.length
        ? h('table', { class: 'tabella' },
          h('thead', null, h('tr', null, ['Data', 'Alla prima udienza', 'Predibattimenti in tutto', 'Dalla precedente', 'Controllo', ''].map(function (x) { return h('th', null, x); }))),
          h('tbody', null, righe.map(function (u) {
            return h('tr', null,
              h('td', null, cap(D.fmtLong(u.data))),
              h('td', null, u.prime),
              h('td', null, u.totale),
              h('td', null, u.giorniDaPrecedente !== null ? u.giorniDaPrecedente + ' giorni' : '—'),
              h('td', null, u.rispetta ? h('span', { class: 'pillola ok' }, 'rispetta le 5 settimane') : h('span', { class: 'pillola err' }, 'meno di 5 settimane')),
              h('td', null, h('button', { class: 'btn btn-piccolo', onClick: function () { ui.vista = 'calendario'; scegliGiorno(u.data); } }, 'Apri')));
          })))
        : h('div', { class: 'vuota' }, 'Ancora nessuna udienza predibattimentale. Importa il ruolo oppure fissa i primi fascicoli.'));
  }

  function dialogoElencoPredib() {
    const ta = h('textarea', { rows: 8, placeholder: 'RG; Imputato; Reato; Data notifica; Urgente\n1234/26; Mario Rossi; 640 CP; 15/10/2026; no', style: 'min-height:150px;font-family:monospace' });
    const esito = h('div', { class: 'intera' });
    let valide = [];
    const btn = h('button', { class: 'btn btn-primario', type: 'button', disabled: true }, 'Aggiungi i fascicoli');
    function analizza() {
      valide = [];
      const errori = [];
      const viste = {};
      ta.value.split(/\r?\n/).forEach(function (riga, i) {
        if (!riga.trim()) return;
        const c = riga.split(/\t|;/).map(function (x) { return x.trim(); });
        const rg = c[0] || '';
        const imp = c[1] || '';
        if (!rg && !imp) { errori.push('Riga ' + (i + 1) + ': indica almeno RG o imputato.'); return; }
        const k = rg.replace(/\s+/g, '').toLowerCase();
        if (rg && (M.findFascicoloByRg(stato, rg) || viste[k])) { errori.push('Riga ' + (i + 1) + ': il fascicolo ' + rg + ' è già presente.'); return; }
        let notifica = '';
        if (c[3]) {
          const d = I.analizzaData(c[3]);
          if (!d.ok) { errori.push('Riga ' + (i + 1) + ': ' + (d.errore || 'data di notifica non valida.')); return; }
          notifica = d.ymd;
        }
        const urgente = /^(si|sì|s|x|1|urgente)/i.test(c[4] || '');
        if (k) viste[k] = true;
        valide.push({ rg: rg, imputato: imp, reato: c[2] || '', notificaCitazione: notifica, urgente: urgente, ricezione: D.today(), predibDaFissare: true, origine: 'ALTRO' });
      });
      esito.replaceChildren();
      if (valide.length) esito.append(h('div', { class: 'messaggio ok' }, valide.length + (valide.length === 1 ? ' fascicolo pronto da aggiungere.' : ' fascicoli pronti da aggiungere.')));
      if (errori.length) esito.append(h('div', { class: 'messaggio errore' }, h('ul', null, errori.map(function (x) { return h('li', null, x); }))));
      btn.disabled = valide.length === 0;
      btn.textContent = valide.length ? 'Aggiungi ' + valide.length + (valide.length === 1 ? ' fascicolo' : ' fascicoli') : 'Aggiungi i fascicoli';
    }
    ta.addEventListener('input', analizza);
    btn.addEventListener('click', function () {
      valide.forEach(function (d) { M.addFascicolo(stato, d); });
      ui.messaggio = { tipo: 'ok', testo: 'Aggiunti ' + valide.length + ' fascicoli da fissare.' };
      dlg.close();
      aggiorna();
    });
    const dlg = apriDialogo('Incolla un elenco di fascicoli',
      [h('p', { class: 'aiuto intera' }, 'Una riga per fascicolo. Colonne separate da punto e virgola o tabulazione (quindi puoi copiarle da Excel): RG, Imputato, Reato, Data notifica (gg/mm/aaaa), Urgente (sì/no). Servono solo RG o imputato.'), h('label', { class: 'campo intera' }, 'Elenco', ta), esito],
      [btn, h('button', { class: 'btn', type: 'button', onClick: function () { dlg.close(); } }, 'Annulla')], { focus: ta });
  }

  /* ---------- incameramento ---------- */

  const STATI_INC = {
    aperta: ['ok', 'Aperta'],
    'chiusa-immediati': ['avv', 'Chiusa agli immediati'],
    chiusa: ['avv', 'Chiusa'],
    definitiva: ['ok', 'Lista definitiva'],
    passata: ['prov', 'Passata']
  };

  function vistaIncamera() {
    const da = stato.fascicoli.filter(function (f) { return f.incameramentoDaFissare; });
    const sel = da.filter(function (f) { return !ui.inc.esclusi[f.id]; });
    const out = [
      h('h1', { class: 'titolo-pagina' }, 'Incameramento'),
      h('p', { class: 'sottotitolo' }, 'Un\'udienza di incameramento è uno slot unico di 90 minuti per tutti i fascicoli di quella data. Ogni fascicolo ha la sua data minima: 20 giorni dopo il decreto (GUP) o il provvedimento (predibattimento), 30 giorni dopo la notifica (immediato).')
    ];
    if (ui.messaggio) out.push(h('div', { class: 'messaggio ' + ui.messaggio.tipo, role: 'status' }, ui.messaggio.testo));
    out.push(sezioneDaIncamerare(da, sel));
    if (sel.length) out.push(sezioneDateInc(sel));
    out.push(sezioneIncameramenti());
    return out;
  }

  function sezioneDaIncamerare(da, sel) {
    const IN = GC.incamera;
    const oggi = D.today();
    const tutti = h('input', { type: 'checkbox', checked: sel.length === da.length && da.length > 0, 'aria-label': 'Seleziona tutti', onChange: function (e) {
      ui.inc.esclusi = {};
      if (!e.target.checked) da.forEach(function (f) { ui.inc.esclusi[f.id] = true; });
      render();
    } });
    return h('section', { class: 'sezione' },
      h('h2', null, 'Fascicoli da incamerare (' + da.length + ')'),
      h('div', { class: 'azioni' },
        h('button', { class: 'btn btn-primario', onClick: function () { dialogoFascicolo(null, { incameramentoDaFissare: true, origine: 'GUP', ricezione: oggi }); } }, 'Aggiungi un fascicolo'),
        h('button', { class: 'btn', onClick: dialogoElencoInc }, 'Incolla un elenco')),
      da.length
        ? h('div', { class: 'scorri', style: 'max-height:380px' }, h('table', { class: 'tabella' },
          h('thead', null, h('tr', null, [tutti, 'RG', 'Imputato', 'Origine', 'Decreto, provvedimento o notifica', 'Data minima', 'Note', ''].map(function (x) { return h('th', null, x); }))),
          h('tbody', null, da.map(function (f) {
            const m = IN.dataMinima(stato, [f]);
            const fine = IN.fineTermineRiti(stato, f);
            return h('tr', null,
              h('td', null, h('input', { type: 'checkbox', checked: !ui.inc.esclusi[f.id], 'aria-label': 'Includi ' + (f.rg || f.imputato), onChange: function (e) {
                if (e.target.checked) delete ui.inc.esclusi[f.id];
                else ui.inc.esclusi[f.id] = true;
                render();
              } })),
              h('td', null, f.rg || '—'),
              h('td', null, f.imputato || '—'),
              h('td', null, M.ORIGINI[f.origine]),
              h('td', null, f.dataProvvedimento ? D.fmtIt(f.dataProvvedimento) : h('span', { class: 'pillola avv' }, 'manca')),
              h('td', null, m.data ? D.fmtIt(m.data) : '—'),
              h('td', { class: 'aiuto' }, fine ? (oggi <= fine ? 'Può ancora uscire per rito alternativo fino al ' + D.fmtIt(fine) + '.' : 'Termine dei 15 giorni scaduto.') : ''),
              h('td', null, h('button', { class: 'btn btn-piccolo', onClick: function () { dialogoFascicolo(f.id); } }, 'Scheda')));
          }))))
        : h('div', { class: 'vuota' }, 'Nessun fascicolo da incamerare. Aggiungine uno o incolla un elenco (RG; Imputato; Reato; Origine; Data decreto o notifica).'));
  }

  function sezioneDateInc(sel) {
    const IN = GC.incamera;
    const cand = IN.candidate(stato, sel, { oggi: D.today(), giorni: 400 });
    const buone = cand.righe.filter(function (x) { return x.stato !== 'rosso'; });
    const rosse = cand.righe.filter(function (x) { return x.stato === 'rosso'; });
    const esito = { verde: ['ok', 'Idonea'], giallo: ['avv', 'Con riserve'], rosso: ['err', 'Non consentita'] };
    // Le prime date idonee, più le date con riserve che vengono prima (per esempio entro la cadenza di 3 mesi), così le vedi con il motivo.
    const verdi = buone.filter(function (x) { return x.stato === 'verde'; }).slice(0, 8);
    const limite = verdi.length ? verdi[0].data : '9999-12-31';
    const gialliPrima = buone.filter(function (x) { return x.stato === 'giallo' && x.data < limite; }).slice(0, 4);
    const elenco = verdi.length ? gialliPrima.concat(verdi) : buone.slice(0, 12);
    elenco.sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; });
    const mostra = ui.inc.mostraRossi ? elenco.concat(rosse.slice(0, 12)) : elenco;
    const durata = stato.parametri.durate.INCAMERAMENTO;
    const tab = h('div', { class: 'scorri', style: 'max-height:560px' }, h('table', { class: 'tabella' },
      h('thead', null, h('tr', null, ['Data', 'Esito', 'Slot di ' + fmtMin(durata), 'Tempo per fascicolo', 'Resta in giornata', 'Note', ''].map(function (x) { return h('th', null, x); }))),
      h('tbody', null, mostra.map(function (r) {
        const e = esito[r.stato];
        return h('tr', null,
          h('td', null, h('b', null, cap(D.fmtLong(r.data)))),
          h('td', null, h('span', { class: 'pillola ' + e[0] }, e[1])),
          h('td', null, r.esistente ? 'già fissato alle ' + r.inizio + ' (' + r.nEsistenti + ')' : r.inizio ? 'nuovo, alle ' + r.inizio : 'nessuno spazio'),
          h('td', null, 'circa ' + r.mediaMinuti + ' min'),
          h('td', null, fmtMin(r.minutiRestanti)),
          h('td', { class: 'aiuto' }, r.motivi.join(' ')),
          h('td', null, h('button', { class: 'btn btn-piccolo' + (r.stato === 'verde' ? ' btn-primario' : ''), onClick: function () { fissaIncamera(r, sel); } }, r.stato === 'verde' ? 'Fissa qui' : 'Fissa comunque')));
      }))));
    return h('section', { class: 'sezione' },
      h('h2', null, 'Date proposte per ' + sel.length + (sel.length === 1 ? ' fascicolo' : ' fascicoli')),
      h('p', { class: 'aiuto' }, cand.minimo.data ? 'Prima data ammessa dai termini: ' + D.fmtIt(cand.minimo.data) + '. Le date idonee rispettano anche la cadenza per origine (GUP, predibattimento).' : 'Nessun fascicolo ha la data del provvedimento: i termini non vengono controllati.'),
      h('div', { class: 'riga-campi' },
        h('label', { class: 'casella' }, h('input', { type: 'checkbox', checked: ui.inc.mostraRossi, onChange: function (e) { ui.inc.mostraRossi = e.target.checked; render(); } }), 'Mostra anche le date non consentite')),
      buone.length ? tab : h('div', { class: 'messaggio avviso' }, 'Nessuna data adatta nei prossimi 400 giorni. Controlla i giorni di udienza nelle impostazioni.'),
      !buone.length && mostra.length ? tab : null);
  }

  function fissaIncamera(r, sel) {
    const IN = GC.incamera;
    if (r.stato !== 'verde') {
      const testo = (r.stato === 'rosso' ? 'Questa data non è consentita dalle regole:\n' : 'Questa data ha delle riserve:\n') + r.motivi.join('\n') + '\n\nFissare comunque?';
      if (!window.confirm(testo)) return;
    }
    const res = IN.fissa(stato, r.data, sel, {});
    ui.messaggio = { tipo: 'ok', testo: 'Fissati ' + res.creati + (res.creati === 1 ? ' fascicolo' : ' fascicoli') + ' per ' + D.fmtLong(r.data) + ' alle ' + res.inizio + ': ' + fmtMin(stato.parametri.durate.INCAMERAMENTO) + ' in tutto per tutti i fascicoli di quella data.' };
    ui.inc.esclusi = {};
    ui.giorno = r.data;
    aggiorna();
  }

  function sezioneIncameramenti() {
    const IN = GC.incamera;
    const righe = IN.riepilogo(stato, D.today());
    const nomiOri = function (po) {
      return Object.keys(po).map(function (k) { return po[k] + ' ' + M.ORIGINI[k].toLowerCase(); }).join(', ');
    };
    return h('section', { class: 'sezione' },
      h('h2', null, 'Incameramenti fissati'),
      h('p', { class: 'aiuto' }, 'Per ogni slot: dopo la chiusura (20 giorni prima per GUP e predibattimento, 30 per gli immediati) non possono arrivare altri fascicoli. La lista è definitiva quando sono scaduti i 15 giorni degli immediati, al più tardi 15 giorni prima.'),
      righe.length
        ? h('div', { class: 'scorri', style: 'max-height:520px' }, h('table', { class: 'tabella' },
          h('thead', null, h('tr', null, ['Data', 'Ora', 'Fascicoli', 'Tempo per fascicolo', 'Chiusura assegnazioni', 'Lista definitiva dal', 'Stato', ''].map(function (x) { return h('th', null, x); }))),
          h('tbody', null, righe.map(function (r) {
            const st = STATI_INC[r.stato];
            return h('tr', null,
              h('td', null, cap(D.fmtShort(r.data))),
              h('td', null, r.inizio + '–' + D.minToHhmm(D.hhmmToMin(r.inizio) + r.durata)),
              h('td', null, r.n, Object.keys(r.perOrigine).length ? h('span', { class: 'aiuto' }, ' · ' + nomiOri(r.perOrigine)) : null),
              h('td', null, r.n ? 'circa ' + r.mediaMinuti + ' min' : '—'),
              h('td', null, 'GUP e predib. ' + D.fmtIt(r.chiusuraGupPredib), h('br'), 'immediati ' + D.fmtIt(r.chiusuraImmediati)),
              h('td', null, D.fmtIt(r.definitivaDal), r.immediatiARischio ? h('span', { class: 'pillola avv' }, r.immediatiARischio + ' immediati a rischio') : null),
              h('td', null, h('span', { class: 'pillola ' + st[0] }, st[1])),
              h('td', null, h('button', { class: 'btn btn-piccolo', onClick: function () { ui.vista = 'calendario'; scegliGiorno(r.data); } }, 'Apri')));
          }))))
        : h('div', { class: 'vuota' }, 'Ancora nessun incameramento fissato. Importa il ruolo o fissa i primi fascicoli.'));
  }

  function dialogoElencoInc() {
    const ta = h('textarea', { rows: 8, placeholder: 'RG; Imputato; Reato; Origine; Data decreto o notifica\n1234/26; Mario Rossi; 640 CP; GUP; 20/11/2026', style: 'min-height:150px;font-family:monospace' });
    const esito = h('div', { class: 'intera' });
    let valide = [];
    const btn = h('button', { class: 'btn btn-primario', type: 'button', disabled: true }, 'Aggiungi i fascicoli');
    function origineDa(t) {
      const x = String(t || '').toLowerCase();
      if (/gup|preliminare/.test(x)) return 'GUP';
      if (/predib/.test(x)) return 'PREDIB';
      if (/immediat/.test(x)) return 'IMMEDIATO';
      return 'ALTRO';
    }
    function analizza() {
      valide = [];
      const errori = [];
      const viste = {};
      ta.value.split(/\r?\n/).forEach(function (riga, i) {
        if (!riga.trim()) return;
        const c = riga.split(/\t|;/).map(function (x) { return x.trim(); });
        const rg = c[0] || '';
        const imp = c[1] || '';
        if (!rg && !imp) { errori.push('Riga ' + (i + 1) + ': indica almeno RG o imputato.'); return; }
        const k = rg.replace(/\s+/g, '').toLowerCase();
        if (rg && (M.findFascicoloByRg(stato, rg) || viste[k])) { errori.push('Riga ' + (i + 1) + ': il fascicolo ' + rg + ' è già presente.'); return; }
        const origine = origineDa(c[3]);
        if (origine === 'ALTRO') { errori.push('Riga ' + (i + 1) + ': origine non riconosciuta (scrivi GUP, Predibattimento o Immediato).'); return; }
        let data = '';
        if (c[4]) {
          const d = I.analizzaData(c[4]);
          if (!d.ok) { errori.push('Riga ' + (i + 1) + ': ' + (d.errore || 'data non valida.')); return; }
          data = d.ymd;
        }
        if (k) viste[k] = true;
        valide.push({ rg: rg, imputato: imp, reato: c[2] || '', origine: origine, dataProvvedimento: data, ricezione: D.today(), incameramentoDaFissare: true });
      });
      esito.replaceChildren();
      if (valide.length) esito.append(h('div', { class: 'messaggio ok' }, valide.length + (valide.length === 1 ? ' fascicolo pronto da aggiungere.' : ' fascicoli pronti da aggiungere.')));
      if (errori.length) esito.append(h('div', { class: 'messaggio errore' }, h('ul', null, errori.map(function (x) { return h('li', null, x); }))));
      btn.disabled = valide.length === 0;
      btn.textContent = valide.length ? 'Aggiungi ' + valide.length + (valide.length === 1 ? ' fascicolo' : ' fascicoli') : 'Aggiungi i fascicoli';
    }
    ta.addEventListener('input', analizza);
    btn.addEventListener('click', function () {
      valide.forEach(function (d) { M.addFascicolo(stato, d); });
      ui.messaggio = { tipo: 'ok', testo: 'Aggiunti ' + valide.length + ' fascicoli da incamerare.' };
      dlg.close();
      aggiorna();
    });
    const dlg = apriDialogo('Incolla un elenco di fascicoli da incamerare',
      [h('p', { class: 'aiuto intera' }, 'Una riga per fascicolo. Colonne separate da punto e virgola o tabulazione (puoi copiarle da Excel): RG, Imputato, Reato, Origine (GUP, Predibattimento o Immediato), Data del decreto, del provvedimento o dell\'ultima notifica (gg/mm/aaaa).'), h('label', { class: 'campo intera' }, 'Elenco', ta), esito],
      [btn, h('button', { class: 'btn', type: 'button', onClick: function () { dlg.close(); } }, 'Annulla')], { focus: ta });
  }

  /* ---------- fascicoli ---------- */

  /** Fascicoli per cui il giudice deve ancora registrare l'esito o fissare la prossima udienza. */
  function pannelloDaDecidere(oggi) {
    const lista = GC.esiti.daDecidere(stato, oggi);
    if (!lista.length) return null;
    const MAX = 25;
    const dett = h('details', { class: 'sezione', open: lista.length <= 8 },
      h('summary', { style: 'cursor:pointer;font-weight:600;font-size:1.05rem' }, 'Da decidere (' + lista.length + ')'),
      h('p', { class: 'aiuto' }, 'L\'ultima udienza di questi fascicoli è passata e manca l\'esito, oppure l\'esito prevede una nuova udienza che non è ancora stata fissata. L\'app propone, tu confermi.'),
      h('div', { class: 'scorri', style: 'max-height:none' }, h('table', { class: 'tabella' },
        h('tbody', null, lista.slice(0, MAX).map(function (x) {
          return h('tr', null,
            h('td', null, (x.fascicolo.rg || '—') + ' ' + x.fascicolo.imputato),
            h('td', null, M.TIPI[x.evento.tipo].label + ' del ' + D.fmtShort(x.evento.data)),
            h('td', null, x.tipo === 'senza-esito' ? 'Esito da registrare' : 'Esito: ' + x.esito + ' · udienza da fissare'),
            h('td', null, h('button', { class: 'btn btn-piccolo btn-primario', onClick: function () { dialogoEsito(x.evento.id); } }, x.tipo === 'senza-esito' ? 'Registra esito' : 'Decidi')));
        })))),
      lista.length > MAX ? h('p', { class: 'aiuto' }, 'Altri ' + (lista.length - MAX) + ' fascicoli: compariranno man mano che li gestisci.') : null);
    return dett;
  }

  function vistaFascicoli() {
    const elenco = M.filtraFascicoli(stato, { testo: ui.cercaFasc, fase: ui.faseFasc });
    const conta = {};
    stato.fascicoli.forEach(function (f) {
      const k = M.faseDi(f, stato);
      conta[k] = (conta[k] || 0) + 1;
    });
    const selFase = h('select', { 'aria-label': 'Filtra per fase' },
      h('option', { value: '' }, 'Tutte le fasi (' + stato.fascicoli.length + ')'),
      Object.keys(M.FASI).filter(function (k) { return conta[k]; }).map(function (k) {
        return h('option', { value: k, selected: k === ui.faseFasc }, M.FASI[k] + ' (' + conta[k] + ')');
      }));
    selFase.addEventListener('change', function () { ui.faseFasc = selFase.value; render(); });
    const oggi = D.today();
    const ricerca = h('input', { type: 'search', value: ui.cercaFasc, placeholder: 'Cerca per RG o imputato', 'aria-label': 'Cerca fascicoli' });
    ricerca.addEventListener('input', function () {
      ui.cercaFasc = ricerca.value;
      const pos = ricerca.selectionStart;
      render();
      const nuovo = document.querySelector('input[type=search]');
      if (nuovo) { nuovo.focus(); nuovo.setSelectionRange(pos, pos); }
    });
    return [
      h('h1', { class: 'titolo-pagina' }, 'Fascicoli'),
      h('p', { class: 'sottotitolo' }, 'Elenco dei fascicoli con la prossima attività prevista. I fascicoli nascono anche dall\'importazione da Excel o quando aggiungi un\'attività.'),
      pannelloDaDecidere(oggi),
      h('div', { class: 'barra-strumenti' }, h('label', { class: 'campo' }, 'Cerca', ricerca), h('label', { class: 'campo' }, 'Fase', selFase), h('button', { class: 'btn btn-primario', onClick: function () { dialogoFascicolo(null); } }, 'Nuovo fascicolo')),
      elenco.length
        ? h('div', { class: 'scorri', style: 'max-height:none' }, h('table', { class: 'tabella' },
          h('thead', null, h('tr', null, ['RG', 'Imputato', 'Reato', 'Origine', 'Fase', 'Detenuto', 'Prossima attività', 'Attività', ''].map(function (x) { return h('th', null, x); }))),
          h('tbody', null, elenco.map(function (f) {
            const ev = M.eventiDelFascicolo(stato, f.id);
            const prossima = ev.find(function (e) { return e.data >= oggi && e.stato !== 'provvisorio'; });
            return h('tr', null,
              h('td', null, f.rg || '—'),
              h('td', null, f.imputato || '—'),
              h('td', null, f.reato || '—'),
              h('td', null, M.ORIGINI[f.origine]),
              h('td', null, h('span', { class: 'pillola' }, M.FASI[M.faseDi(f, stato)])),
              h('td', null, f.detenuto ? h('span', { class: 'pillola err' }, 'detenuto') : ''),
              h('td', null, prossima ? [D.fmtShort(prossima.data) + ' ' + prossima.inizio, ' ', h('button', { class: 'btn btn-piccolo', onClick: function () { ui.vista = 'calendario'; scegliGiorno(prossima.data); } }, 'Apri')] : '—'),
              h('td', null, ev.length),
              h('td', null, h('button', { class: 'btn btn-piccolo', onClick: function () { dialogoFascicolo(f.id); } }, 'Apri scheda')));
          }))))
        : h('div', { class: 'vuota' }, stato.fascicoli.length ? 'Nessun fascicolo corrisponde alla ricerca o alla fase scelta.' : 'Non ci sono ancora fascicoli. Importali da Excel oppure creane uno.')
    ];
  }

  /* ---------- importazione ---------- */

  function vistaImporta() {
    const imp = ui.imp;
    const fase = imp ? imp.fase : 'file';
    const passi = h('div', { class: 'passi' }, [['file', '1. Scegli il file'], [fase === 'ruolo' ? 'ruolo' : 'mappa', fase === 'ruolo' ? '2. Scegli giudice e fogli' : '2. Abbina le colonne'], ['anteprima', '3. Controlla'], ['fatto', '4. Fatto']].map(function (p) {
      return h('span', { class: 'passo' + (p[0] === fase ? ' attivo' : '') }, p[1]);
    }));
    const out = [
      h('h1', { class: 'titolo-pagina' }, 'Importa da Excel'),
      h('p', { class: 'sottotitolo' }, 'Carica il file con i fascicoli e le udienze già calendarizzate (.xlsx o .csv). Prima di importare vedi un\'anteprima: nulla cambia finché non confermi, e puoi annullare l\'importazione.'),
      passi
    ];
    if (ui.impErrore) out.push(h('div', { class: 'messaggio errore', role: 'alert' }, ui.impErrore));

    if (fase === 'file') out.push(passoFile());
    else if (fase === 'ruolo') out.push(passoRuolo());
    else if (fase === 'mappa') out.push(passoMappa());
    else if (fase === 'anteprima') out.push(passoAnteprima());
    else out.push(passoFatto());
    out.push(elencoImportazioni());
    return out;
  }

  function passoFile() {
    const input = h('input', { type: 'file', accept: '.xlsx,.csv,.txt', onChange: async function (e) {
      const f = e.target.files && e.target.files[0];
      if (f) await caricaFile(f);
    } });
    return h('section', { class: 'sezione' },
      h('h2', null, 'Scegli il file'),
      h('p', { class: 'aiuto' }, 'Il file resta sul tuo dispositivo: non viene inviato da nessuna parte. Formati: Excel (.xlsx) o testo separato da virgole o punti e virgola (.csv).'),
      h('label', { class: 'campo' }, 'File da importare', input),
      h('p', { class: 'aiuto', style: 'margin-top:12px' }, 'Non hai ancora un file? ', h('a', { href: 'modello_import.xlsx', download: 'modello_import.xlsx' }, 'Scarica il modello Excel'), ' con le colonne già pronte.'));
  }

  async function caricaFile(file) {
    ui.impErrore = '';
    try {
      const buf = await file.arrayBuffer();
      const r = await X.leggiFile(file.name, buf);
      if (!r.fogli.length) throw new Error('Il file non contiene fogli leggibili.');
      const ril = I.rilevaRuolo(r.fogli);
      if (ril.ok) {
        ui.imp = {
          fase: 'ruolo', modo: 'ruolo', nomeFile: file.name, fogli: r.fogli, ril: ril, selezionati: ril.fogli.map(function (f) { return f.indice; }),
          giudice: '', giudici: [], tabella: null, piano: null,
          opzioni: { saltaDuplicati: true, senzaOra: 'accoda', durataUnita: 'min', origineDefault: 'ALTRO', statoDefault: 'ufficiale', sovrapponiStessoOrario: true }
        };
        costruisciRuolo();
        render();
        return;
      }
      ui.imp = { fase: 'mappa', nomeFile: file.name, fogli: r.fogli, foglio: 0, rigaInt: 0, mapping: {}, piano: null, opzioni: { saltaDuplicati: true, senzaOra: 'accoda', durataUnita: 'min', origineDefault: 'ALTRO', statoDefault: 'ufficiale' } };
      avviaFoglio(0);
    } catch (e) {
      ui.impErrore = 'Non riesco a leggere il file: ' + e.message;
      ui.imp = null;
    }
    render();
  }

  function avviaFoglio(i) {
    const f = ui.imp.fogli[i];
    ui.imp.foglio = i;
    ui.imp.rigaInt = I.trovaIntestazione(f.righe);
    ui.imp.mapping = I.indovinaColonne(f.righe[ui.imp.rigaInt] || []);
    ui.imp.piano = null;
  }

  function costruisciRuolo() {
    const imp = ui.imp;
    const sel = imp.ril.fogli.filter(function (f) { return imp.selezionati.indexOf(f.indice) >= 0; });
    imp.tabella = I.tabellaDaRuolo(imp.fogli, { fogli: sel });
    imp.giudici = I.valoriColonna(imp.tabella.righe, 0, imp.tabella.mapping.giudice);
    const noti = imp.giudici.map(function (g) { return g.valore; });
    if (!imp.giudice || noti.indexOf(imp.giudice) < 0) {
      const pref = stato.parametri.giudiceRuolo;
      imp.giudice = noti.indexOf(pref) >= 0 ? pref : (noti[0] || '');
    }
    imp.piano = null;
  }

  function opzioniRuolo(imp) {
    const o = imp.opzioni;
    return h('div', { class: 'riga-campi', style: 'margin-top:14px' },
      h('label', { class: 'campo' }, 'Righe senza ora di inizio',
        h('select', { onChange: function (e) { o.senzaOra = e.target.value; imp.piano = null; } },
          h('option', { value: 'accoda', selected: o.senzaOra === 'accoda' }, 'Colloca al primo orario libero'),
          h('option', { value: 'scarta', selected: o.senzaOra === 'scarta' }, 'Scarta la riga'))),
      h('label', { class: 'casella' }, h('input', { type: 'checkbox', checked: o.saltaDuplicati, onChange: function (e) { o.saltaDuplicati = e.target.checked; imp.piano = null; } }), 'Salta le righe già presenti (duplicati)'),
      h('label', { class: 'casella' }, h('input', { type: 'checkbox', checked: o.sovrapponiStessoOrario, onChange: function (e) { o.sovrapponiStessoOrario = e.target.checked; imp.piano = null; } }), 'Le attività che iniziano alla stessa ora sono sovrapponibili'));
  }

  function passoRuolo() {
    const imp = ui.imp;
    const ril = imp.ril;
    const date = ril.fogli.map(function (f) { return f.data; }).sort();
    const righeTab = imp.tabella.righe.length - 1;
    const anteprima = I.pianifica(stato, imp.tabella.righe, 0, imp.tabella.mapping, Object.assign({}, imp.opzioni, { giudice: imp.giudice }));
    const conta = {};
    anteprima.righe.forEach(function (v) {
      if (v.evento) {
        const k = M.TIPI[v.evento.tipo].label;
        conta[k] = (conta[k] || 0) + 1;
      }
    });
    const tabFogli = h('table', { class: 'tabella' },
      h('thead', null, h('tr', null, ['Importa', 'Foglio', 'Giorno', 'Righe', 'Note'].map(function (x) { return h('th', null, x); }))),
      h('tbody', null, ril.fogli.map(function (f) {
        const note = [];
        if (f.dataDaNome) note.push('data ricavata dal nome del foglio');
        if (f.mapping.rg === null || f.mapping.inizio === null) note.push('colonne RG o ORARIO non riconosciute');
        return h('tr', null,
          h('td', null, h('input', { type: 'checkbox', checked: imp.selezionati.indexOf(f.indice) >= 0, 'aria-label': 'Importa il foglio ' + f.nome, onChange: function (e) {
            const s = imp.selezionati.filter(function (x) { return x !== f.indice; });
            if (e.target.checked) s.push(f.indice);
            imp.selezionati = s;
            costruisciRuolo();
            render();
          } })),
          h('td', null, f.nome),
          h('td', null, cap(D.fmtLong(f.data))),
          h('td', null, f.righe),
          h('td', { class: 'aiuto' }, note.join('; ')));
      })));
    const selGiudice = h('label', { class: 'campo' }, 'Importa solo le righe di',
      h('select', { onChange: function (e) { imp.giudice = e.target.value; imp.piano = null; render(); } },
        imp.giudici.map(function (g) { return h('option', { value: g.valore, selected: g.valore === imp.giudice }, g.valore + ' (' + g.righe + ' righe)'); })));
    const nessuna = !imp.giudice || anteprima.riepilogo.totale === 0;
    return h('section', { class: 'sezione' },
      h('h2', null, 'Ruolo delle udienze riconosciuto'),
      h('p', { class: 'aiuto' }, 'Nel file ' + imp.nomeFile + ' ho trovato ' + ril.fogli.length + (ril.fogli.length === 1 ? ' foglio' : ' fogli') + ' (uno per giorno, dal ' + D.fmtIt(date[0]) + ' al ' + D.fmtIt(date[date.length - 1]) + '), per un totale di ' + righeTab + ' righe di tutti i giudici.'),
      ril.saltati.length ? h('div', { class: 'messaggio avviso' }, 'Fogli ignorati perché non riconosciuti come giorni di udienza: ' + ril.saltati.join(', ') + '.') : null,
      h('div', { class: 'scorri', style: 'max-height:none' }, tabFogli),
      h('div', { class: 'riga-campi', style: 'margin-top:14px' }, selGiudice, h('span', { class: 'aiuto' }, 'La scelta viene ricordata per le prossime importazioni.')),
      opzioniRuolo(imp),
      h('div', { class: 'messaggio info', style: 'margin-top:14px' },
        h('b', null, 'Come interpreto le righe'),
        h('ul', null,
          h('li', null, 'Annotazione con «predibattimentale»: Predibattimento.'),
          h('li', null, 'Reato che inizia con «SVIL UP»: Incameramento, fascicolo da GUP, con lo slot di 1 ora e 30 che parte dall\'ora indicata (più fascicoli alla stessa ora condividono lo stesso slot).'),
          h('li', null, 'N. R.G. «SIGE» o reato «incidente d\'esecuzione»: Esecuzione (il fascicolo si chiama «SIGE» più il numero d\'ordine).'),
          h('li', null, 'Tutte le altre righe vengono da un rinvio: Udienza dibattimentale (da precisare), cioè istruttoria, repliche e così via. L\'annotazione resta come titolo.'),
          h('li', null, 'La data è quella del titolo del foglio; l\'ora è la colonna ORARIO; la durata è quella predefinita del tipo (10 min per predibattimento, esecuzione e udienze dibattimentali da precisare; 90 min per l\'incameramento), perché nel file non c\'è.'),
          h('li', null, 'RINVIO DAL è conservato (una data, oppure «1 UD» se è la prima udienza); ESITO, reato, P.M. e numero d\'ordine sono conservati.')),
        Object.keys(conta).length ? h('p', { style: 'margin:8px 0 0' }, 'Per ' + (imp.giudice || 'il giudice scelto') + ': ' + Object.keys(conta).map(function (k) { return k + ' ' + conta[k]; }).join(' · ') + '.') : null),
      nessuna ? h('div', { class: 'messaggio errore' }, 'Nessuna riga da importare con questa scelta di fogli e giudice.') : null,
      h('div', { class: 'azioni', style: 'margin-top:14px' },
        h('button', { class: 'btn btn-primario', disabled: nessuna, onClick: function () {
          imp.piano = I.pianifica(stato, imp.tabella.righe, 0, imp.tabella.mapping, Object.assign({}, imp.opzioni, { giudice: imp.giudice }));
          imp.fase = 'anteprima';
          ui.impErrore = '';
          render();
        } }, 'Mostra l\'anteprima'),
        h('button', { class: 'btn', onClick: function () { ui.imp = null; ui.impErrore = ''; render(); } }, 'Scegli un altro file')));
  }

  function passoMappa() {
    const imp = ui.imp;
    const foglio = imp.fogli[imp.foglio];
    const intest = foglio.righe[imp.rigaInt] || [];
    let nCol = 0;
    foglio.righe.slice(0, 40).forEach(function (r) { nCol = Math.max(nCol, r.length); });
    const campioni = function (j) {
      const out = [];
      for (let i = imp.rigaInt + 1; i < foglio.righe.length && out.length < 3; i++) {
        const v = foglio.righe[i] ? foglio.righe[i][j] : null;
        if (v !== null && v !== undefined && String(I.testoCella(v)) !== '') out.push(I.testoCella(v));
      }
      return out.join(' | ');
    };
    const opzioniColonne = function (selezionata) {
      const o = [h('option', { value: '' }, '— non presente —')];
      for (let j = 0; j < nCol; j++) {
        const nome = I.testoCella(intest[j]) || '(senza intestazione)';
        o.push(h('option', { value: String(j), selected: selezionata === j }, lettera(j) + ' · ' + nome));
      }
      return o;
    };
    const selFoglio = imp.fogli.length > 1 ? h('label', { class: 'campo' }, 'Foglio', h('select', { onChange: function (e) { avviaFoglio(+e.target.value); render(); } }, imp.fogli.map(function (f, i) { return h('option', { value: i, selected: i === imp.foglio }, f.nome); }))) : null;
    const rigaInt = h('input', { type: 'number', min: 1, max: Math.max(1, foglio.righe.length), value: imp.rigaInt + 1, style: 'width:90px', onChange: function (e) {
      const v = Math.max(1, Math.min(foglio.righe.length, parseInt(e.target.value, 10) || 1));
      imp.rigaInt = v - 1;
      imp.mapping = I.indovinaColonne(foglio.righe[imp.rigaInt] || []);
      imp.piano = null;
      render();
    } });

    const righeMappa = I.CAMPI.map(function (c) {
      const sel = h('select', { 'aria-label': c.etichetta, onChange: function (e) {
        imp.mapping[c.chiave] = e.target.value === '' ? null : +e.target.value;
        imp.piano = null;
        render();
      } }, opzioniColonne(imp.mapping[c.chiave]));
      const j = imp.mapping[c.chiave];
      return h('tr', null,
        h('td', null, c.etichetta, (c.chiave === 'data' ? h('span', { class: 'aiuto' }, ' (obbligatoria)') : null)),
        h('td', null, sel),
        h('td', { class: 'aiuto' }, j !== null && j !== undefined ? campioni(j) : ''));
    });

    const o = imp.opzioni;
    const opz = h('div', { class: 'riga-campi', style: 'margin-top:14px' },
      h('label', { class: 'campo' }, 'Righe senza ora di inizio',
        h('select', { onChange: function (e) { o.senzaOra = e.target.value; imp.piano = null; } },
          h('option', { value: 'accoda', selected: o.senzaOra === 'accoda' }, 'Colloca al primo orario libero'),
          h('option', { value: 'scarta', selected: o.senzaOra === 'scarta' }, 'Scarta la riga'))),
      h('label', { class: 'campo' }, 'Numeri della durata sono in',
        h('select', { onChange: function (e) { o.durataUnita = e.target.value; imp.piano = null; } },
          h('option', { value: 'min', selected: o.durataUnita === 'min' }, 'minuti'),
          h('option', { value: 'ore', selected: o.durataUnita === 'ore' }, 'ore'))),
      h('label', { class: 'campo' }, 'Origine se non indicata',
        h('select', { onChange: function (e) { o.origineDefault = e.target.value; imp.piano = null; } }, Object.keys(M.ORIGINI).map(function (k) { return h('option', { value: k, selected: o.origineDefault === k }, M.ORIGINI[k]); }))),
      h('label', { class: 'campo' }, 'Stato se non indicato',
        h('select', { onChange: function (e) { o.statoDefault = e.target.value; imp.piano = null; } }, Object.keys(M.STATI).map(function (k) { return h('option', { value: k, selected: o.statoDefault === k }, M.STATI[k]); }))),
      h('label', { class: 'casella' }, h('input', { type: 'checkbox', checked: o.saltaDuplicati, onChange: function (e) { o.saltaDuplicati = e.target.checked; imp.piano = null; } }), 'Salta le righe già presenti (duplicati)'));

    if (imp.mapping.giudice !== null && imp.mapping.giudice !== undefined) {
      const vals = I.valoriColonna(foglio.righe, imp.rigaInt, imp.mapping.giudice);
      opz.append(h('label', { class: 'campo' }, 'Importa solo le righe del giudice',
        h('select', { onChange: function (e) { imp.opzioni.giudice = e.target.value; imp.piano = null; } },
          h('option', { value: '' }, 'Tutti'),
          vals.map(function (v) { return h('option', { value: v.valore, selected: imp.opzioni.giudice === v.valore }, v.valore + ' (' + v.righe + ')'); }))));
    }
    const manca = imp.mapping.data === null || imp.mapping.data === undefined;
    return h('section', { class: 'sezione' },
      h('h2', null, 'Abbina le colonne del file ' + imp.nomeFile),
      h('p', { class: 'aiuto' }, 'Ho provato a riconoscere le colonne dalle intestazioni. Controlla e correggi se serve. La data è obbligatoria.'),
      h('div', { class: 'riga-campi' }, selFoglio, h('label', { class: 'campo' }, 'Riga delle intestazioni', rigaInt)),
      h('div', { class: 'scorri', style: 'margin-top:12px;max-height:none' }, h('table', { class: 'tabella' },
        h('thead', null, h('tr', null, ['Campo dell\'app', 'Colonna del file', 'Esempi'].map(function (x) { return h('th', null, x); }))),
        h('tbody', null, righeMappa))),
      opz,
      manca ? h('div', { class: 'messaggio errore' }, 'Indica la colonna della data per continuare.') : null,
      h('div', { class: 'azioni', style: 'margin-top:14px' },
        h('button', { class: 'btn btn-primario', disabled: manca, onClick: function () {
          imp.piano = I.pianifica(stato, foglio.righe, imp.rigaInt, imp.mapping, imp.opzioni);
          imp.fase = 'anteprima';
          ui.impErrore = '';
          render();
        } }, 'Mostra l\'anteprima'),
        h('button', { class: 'btn', onClick: function () { ui.imp = null; ui.impErrore = ''; render(); } }, 'Scegli un altro file')));
  }

  function passoAnteprima() {
    const imp = ui.imp;
    const p = imp.piano;
    const r = p.riepilogo;
    const conFoglio = p.righe.some(function (v) { return v.foglio; });
    const daImportare = p.righe.filter(function (v) { return v.stato === 'ok' || (v.stato === 'duplicato' && !p.opzioni.saltaDuplicati && v.evento && v.evento.inizio); }).length;
    const tab = h('div', { class: 'scorri', style: 'max-height:520px' }, h('table', { class: 'tabella' },
      h('thead', null, h('tr', null, (conFoglio ? ['Foglio'] : []).concat(['Riga', 'Esito', 'Data', 'Ora', 'Durata', 'Tipo', 'Fascicolo', 'Note dell\'importazione']).map(function (x) { return h('th', null, x); }))),
      h('tbody', null, p.righe.slice(0, 400).map(function (v) {
        const e = v.evento;
        const pill = v.stato === 'ok' ? h('span', { class: 'pillola ok' }, 'da importare') : v.stato === 'duplicato' ? h('span', { class: 'pillola avv' }, 'duplicato') : h('span', { class: 'pillola err' }, 'errore');
        return h('tr', null,
          conFoglio ? h('td', null, v.foglio) : null,
          h('td', null, v.riga),
          h('td', null, pill),
          h('td', null, e ? D.fmtIt(e.data) : '—'),
          h('td', null, e && e.inizio ? e.inizio : '—'),
          h('td', null, e ? fmtMin(e.durata) : '—'),
          h('td', null, e ? M.TIPI[e.tipo].label : '—'),
          h('td', null, v.fascicolo ? [v.fascicolo.rg || '(senza RG)', v.fascicolo.imputato ? ' · ' + v.fascicolo.imputato : '', v.fascicolo.nuovo ? ' (nuovo)' : ''] : '—'),
          h('td', null, v.errori.concat(v.avvisi).join(' ')));
      }))));
    return h('section', { class: 'sezione' },
      h('h2', null, 'Anteprima dell\'importazione'),
      h('div', { class: 'riepilogo' },
        h('div', { class: 'metrica' }, h('b', null, r.totale), h('span', null, 'righe lette')),
        h('div', { class: 'metrica' }, h('b', { style: 'color:var(--ok-testo)' }, r.valide), h('span', null, 'da importare')),
        h('div', { class: 'metrica' }, h('b', null, r.duplicati), h('span', null, 'duplicati')),
        h('div', { class: 'metrica' }, h('b', { style: r.errori ? 'color:var(--err-testo)' : '' }, r.errori), h('span', null, 'con errori (scartate)')),
        h('div', { class: 'metrica' }, h('b', null, r.fascicoliNuovi), h('span', null, 'fascicoli nuovi')),
        h('div', { class: 'metrica' }, h('b', null, r.conAvvisi), h('span', null, 'con avvisi')),
        r.altriGiudici ? h('div', { class: 'metrica' }, h('b', null, r.altriGiudici), h('span', null, 'righe di altri giudici (escluse)')) : null),
      r.errori ? h('div', { class: 'messaggio avviso' }, 'Le righe con errori non vengono importate. Puoi correggerle nel file e importarlo di nuovo: le righe già importate saranno riconosciute come duplicati.') : null,
      p.righe.length > 400 ? h('div', { class: 'aiuto' }, 'Sono mostrate le prime 400 righe; l\'importazione le considera tutte.') : null,
      tab,
      h('div', { class: 'azioni', style: 'margin-top:14px' },
        h('button', { class: 'btn btn-primario', disabled: daImportare === 0, onClick: function () {
          const risultato = I.applica(stato, p, { file: imp.nomeFile, foglio: imp.modo === 'ruolo' ? 'ruolo delle udienze (' + imp.giudice + ')' : imp.fogli[imp.foglio].nome });
          const date = p.righe.filter(function (v) { return v.evento && v.stato !== 'errore'; }).map(function (v) { return v.evento.data; }).sort();
          if (imp.modo === 'ruolo' && imp.giudice && stato.parametri.giudiceRuolo !== imp.giudice) {
            stato.parametri.giudiceRuolo = imp.giudice;
            logParam('Nome nel ruolo delle udienze: ' + imp.giudice);
          }
          ui.imp = { fase: 'fatto', risultato: risultato, prima: date[0] || null, nomeFile: imp.nomeFile };
          pianificaSalvataggio();
          render();
        } }, 'Importa ' + daImportare + ' attività'),
        h('button', { class: 'btn', onClick: function () { imp.fase = imp.modo === 'ruolo' ? 'ruolo' : 'mappa'; render(); } }, 'Indietro')));
  }

  function passoFatto() {
    const r = ui.imp.risultato;
    return h('section', { class: 'sezione' },
      h('h2', null, 'Importazione completata'),
      h('div', { class: 'messaggio ok' }, 'Importate ' + r.eventi + ' attività e creati ' + r.fascicoli + ' fascicoli nuovi dal file ' + ui.imp.nomeFile + '.'),
      h('div', { class: 'azioni' },
        ui.imp.prima ? h('button', { class: 'btn btn-primario', onClick: function () { const prima = ui.imp.prima; ui.imp = null; ui.vista = 'calendario'; scegliGiorno(prima); } }, 'Vai al calendario') : null,
        h('button', { class: 'btn', onClick: function () { ui.imp = null; render(); } }, 'Importa un altro file')));
  }

  function elencoImportazioni() {
    if (!stato.importazioni.length) return null;
    return h('section', { class: 'sezione' },
      h('h2', null, 'Importazioni già fatte'),
      h('p', { class: 'aiuto' }, 'Annullare un\'importazione toglie le attività e i fascicoli che aveva creato, senza toccare il resto.'),
      h('table', { class: 'tabella' },
        h('thead', null, h('tr', null, ['Data', 'File', 'Attività', 'Fascicoli creati', ''].map(function (x) { return h('th', null, x); }))),
        h('tbody', null, stato.importazioni.slice().reverse().map(function (x) {
          return h('tr', null,
            h('td', null, fmtDataOra(x.t)),
            h('td', null, x.file + (x.foglio ? ' (' + x.foglio + ')' : '')),
            h('td', null, x.eventi.length),
            h('td', null, x.fascicoli.length),
            h('td', null, h('button', { class: 'btn btn-piccolo btn-pericolo', onClick: function () {
              if (!window.confirm('Annullare questa importazione? Verranno tolte ' + x.eventi.length + ' attività.')) return;
              const r = I.annulla(stato, x.id);
              ui.messaggio = { tipo: 'ok', testo: 'Importazione annullata: tolte ' + r.eventi + ' attività e ' + r.fascicoli + ' fascicoli.' };
              aggiorna();
            } }, 'Annulla importazione')));
        }))));
  }

  /* ---------- impostazioni ---------- */

  function vistaImpostazioni() {
    const P = stato.parametri;
    const out = [
      h('h1', { class: 'titolo-pagina' }, 'Impostazioni'),
      h('p', { class: 'sottotitolo' }, 'Giorni di udienza, orari, durate e festività. Le modifiche si salvano da sole.')
    ];
    if (ui.messaggio) out.push(h('div', { class: 'messaggio ' + ui.messaggio.tipo, role: 'status' }, ui.messaggio.testo));

    out.push(h('section', { class: 'sezione' },
      h('h2', null, 'Il tuo nome nel ruolo delle udienze'),
      h('p', { class: 'aiuto' }, 'Nel ruolo ci sono più giudici nello stesso foglio. Questo è il testo della colonna «Giudice» che ti riguarda: l\'importazione prende solo le tue righe.'),
      h('label', { class: 'campo', style: 'max-width:280px' }, 'Nome nella colonna Giudice', h('input', { type: 'text', value: P.giudiceRuolo || '', onChange: function (e) {
        P.giudiceRuolo = e.target.value.trim();
        logParam('Nome nel ruolo delle udienze: ' + P.giudiceRuolo);
        aggiorna();
      } }))));

    // giorni di udienza
    const nomi = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
    const giorniSett = h('div', { class: 'giorni-settimana' }, nomi.map(function (n, i) {
      const w = i + 1;
      return h('label', { class: 'casella' }, h('input', { type: 'checkbox', checked: P.giorniUdienza.settimanali.indexOf(w) >= 0, onChange: function (e) {
        const s = P.giorniUdienza.settimanali.filter(function (x) { return x !== w; });
        if (e.target.checked) s.push(w);
        P.giorniUdienza.settimanali = s.sort();
        logParam('Giorni di udienza settimanali: ' + P.giorniUdienza.settimanali.join(','));
        aggiorna();
      } }), n);
    }));
    const nuovaData = h('input', { type: 'date' });
    const extra = P.giorniUdienza.date.slice().sort();
    out.push(h('section', { class: 'sezione' },
      h('h2', null, 'Giorni di udienza'),
      h('p', { class: 'aiuto' }, 'Spunta i giorni fissi della settimana. Per una data singola fuori da questi giorni aggiungila qui sotto. Festività nazionali e agosto restano bloccati.'),
      giorniSett,
      h('div', { class: 'riga-campi' },
        h('label', { class: 'campo' }, 'Giorno singolo in più', nuovaData),
        h('button', { class: 'btn', onClick: function () {
          if (!D.isValidYmd(nuovaData.value)) return;
          if (P.giorniUdienza.date.indexOf(nuovaData.value) < 0) P.giorniUdienza.date.push(nuovaData.value);
          P.giorniUdienza.date.sort();
          logParam('Aggiunto giorno extra ' + nuovaData.value);
          aggiorna();
        } }, 'Aggiungi')),
      extra.length ? h('ul', { class: 'elenco-voci' }, extra.map(function (s) {
        return h('li', null, h('span', null, cap(D.fmtLong(s))), h('button', { class: 'btn btn-piccolo', onClick: function () {
          P.giorniUdienza.date = P.giorniUdienza.date.filter(function (x) { return x !== s; });
          logParam('Tolto giorno extra ' + s);
          aggiorna();
        } }, 'Togli'));
      })) : null));

    // indisponibilità
    const dDa = h('input', { type: 'date' });
    const dA = h('input', { type: 'date' });
    const dMot = h('input', { type: 'text', placeholder: 'Ferie, corso, impedimento…' });
    const indisp = P.indisponibilita.slice().sort(function (a, b) { return a.da < b.da ? -1 : 1; });
    out.push(h('section', { class: 'sezione' },
      h('h2', null, 'Indisponibilità'),
      h('p', { class: 'aiuto' }, 'Periodi in cui non hai udienza (ferie, corsi, impedimenti). Se indichi solo la prima data, vale un giorno solo.'),
      h('div', { class: 'riga-campi' },
        h('label', { class: 'campo' }, 'Dal', dDa),
        h('label', { class: 'campo' }, 'Al', dA),
        h('label', { class: 'campo' }, 'Motivo', dMot),
        h('button', { class: 'btn', onClick: function () {
          if (!D.isValidYmd(dDa.value)) return;
          const a = D.isValidYmd(dA.value) && dA.value >= dDa.value ? dA.value : dDa.value;
          P.indisponibilita.push({ da: dDa.value, a: a, motivo: dMot.value.trim() });
          logParam('Indisponibilità ' + dDa.value + ' - ' + a);
          aggiorna();
        } }, 'Aggiungi')),
      indisp.length ? h('ul', { class: 'elenco-voci' }, indisp.map(function (r) {
        return h('li', null, h('span', null, D.fmtIt(r.da) + (r.a !== r.da ? ' – ' + D.fmtIt(r.a) : '') + (r.motivo ? ' · ' + r.motivo : '')), h('button', { class: 'btn btn-piccolo', onClick: function () {
          P.indisponibilita = P.indisponibilita.filter(function (x) { return x !== r && !(x.da === r.da && x.a === r.a && x.motivo === r.motivo); });
          logParam('Tolta indisponibilità ' + r.da);
          aggiorna();
        } }, 'Togli'));
      })) : null));

    // orari
    const campiOrario = [['inizio', 'Inizio udienza'], ['fine', 'Fine ordinaria'], ['tolleranzaFine', 'Limite massimo'], ['pausaInizio', 'Inizio pausa'], ['pausaFine', 'Fine pausa']];
    out.push(h('section', { class: 'sezione' },
      h('h2', null, 'Orari della giornata'),
      h('p', { class: 'aiuto' }, 'La giornata va dall\'inizio alla fine ordinaria; si può arrivare fino al limite massimo, ma quel tempo non viene programmato in anticipo. La pausa non si riempie.'),
      h('div', { class: 'riga-campi' }, campiOrario.map(function (c) {
        return h('label', { class: 'campo' }, c[1], h('input', { type: 'time', value: P.orario[c[0]], onChange: function (e) {
          const prova = JSON.parse(JSON.stringify(P));
          prova.orario[c[0]] = e.target.value;
          const err = GC.params.validate(prova);
          if (err.length) {
            ui.messaggio = { tipo: 'errore', testo: err.join(' ') };
            render();
            return;
          }
          ui.messaggio = null;
          P.orario[c[0]] = e.target.value;
          logParam('Orario ' + c[0] + ' = ' + e.target.value);
          aggiorna();
        } }));
      }))));

    out.push(h('section', { class: 'sezione' },
      h('h2', null, 'Predibattimento'),
      h('p', { class: 'aiuto' }, 'L\'intervallo minimo di 5 settimane si conta tra le udienze predibattimentali vere, cioè le giornate con molti fascicoli alla prima udienza. I rinvii di pochi fascicoli su altri giorni non contano.'),
      h('label', { class: 'campo', style: 'max-width:340px' }, 'Fascicoli alla prima udienza per considerare una giornata «udienza predibattimentale»', h('input', { type: 'number', min: 1, max: 100, step: 1, value: P.predibSogliaUdienza, onChange: function (e) {
        const v = parseInt(e.target.value, 10);
        if (!(v >= 1 && v <= 100)) { ui.messaggio = { tipo: 'errore', testo: 'Indica un numero da 1 a 100.' }; render(); return; }
        ui.messaggio = null;
        P.predibSogliaUdienza = v;
        logParam('Soglia udienza predibattimentale = ' + v);
        aggiorna();
      } })),
      h('label', { class: 'campo', style: 'max-width:340px;margin-top:10px' }, 'Fascicoli previsti per ogni udienza predibattimentale (circa)', h('input', { type: 'number', min: 1, max: 100, step: 1, value: P.predibFascicoliPerUdienza, onChange: function (e) {
        const v = parseInt(e.target.value, 10);
        if (!(v >= 1 && v <= 100)) { ui.messaggio = { tipo: 'errore', testo: 'Indica un numero da 1 a 100.' }; render(); return; }
        ui.messaggio = null;
        P.predibFascicoliPerUdienza = v;
        logParam('Fascicoli previsti per udienza predibattimentale = ' + v);
        aggiorna();
      } }))));

    out.push(h('section', { class: 'sezione' },
      h('h2', null, 'Incameramento'),
      h('p', { class: 'aiuto' }, 'L\'incameramento è uno slot unico per tutti i fascicoli di quella data (la durata si imposta in «Durate predefinite»). Ogni quanti mesi si tiene, per origine del fascicolo: indica 0 per non avere nessuna regola.'),
      h('div', { class: 'riga-campi' }, [['GUP', 'Da GUP (mesi)'], ['PREDIB', 'Da predibattimento (mesi)'], ['IMMEDIATO', 'Da giudizio immediato (mesi)']].map(function (c) {
        return h('label', { class: 'campo' }, c[1], h('input', { type: 'number', min: 0, max: 24, step: 1, value: P.incameramentoMesi[c[0]], style: 'width:110px', onChange: function (e) {
          const v = parseInt(e.target.value, 10);
          if (!(v >= 0 && v <= 24)) { ui.messaggio = { tipo: 'errore', testo: 'Indica un numero di mesi da 0 a 24.' }; render(); return; }
          ui.messaggio = null;
          P.incameramentoMesi[c[0]] = v;
          logParam('Incameramento ' + c[0] + ': ogni ' + v + ' mesi');
          aggiorna();
        } }));
      }))));

    // durate
    out.push(h('section', { class: 'sezione' },
      h('h2', null, 'Durate predefinite (minuti)'),
      h('p', { class: 'aiuto' }, 'Durata proposta per ogni tipo di attività. Resta sempre modificabile sulla singola attività.'),
      h('div', { class: 'griglia-durate' }, Object.keys(M.TIPI).map(function (k) {
        return h('label', { class: 'campo' }, M.TIPI[k].label, h('input', { type: 'number', min: 1, max: 600, step: 1, value: P.durate[k], onChange: function (e) {
          const v = parseInt(e.target.value, 10);
          if (!(v >= 1 && v <= 600)) { ui.messaggio = { tipo: 'errore', testo: 'La durata deve essere tra 1 e 600 minuti.' }; render(); return; }
          ui.messaggio = null;
          P.durate[k] = v;
          logParam('Durata ' + k + ' = ' + v);
          aggiorna();
        } }));
      }))));

    // feriale e patrono
    out.push(h('section', { class: 'sezione' },
      h('h2', null, 'Periodo feriale e santo patrono'),
      h('p', { class: 'aiuto' }, 'Nel periodo feriale (1-31 agosto) non ci sono udienze e i termini di legge sono sospesi. Il santo patrono della tua città, se è festivo, si aggiunge qui.'),
      h('div', { class: 'riga-campi' },
        h('label', { class: 'casella' }, h('input', { type: 'checkbox', checked: P.feriale.attivo, onChange: function (e) { P.feriale.attivo = e.target.checked; logParam('Periodo feriale ' + (e.target.checked ? 'attivo' : 'disattivato')); aggiorna(); } }), 'Periodo feriale attivo (1-31 agosto)')),
      h('div', { class: 'riga-campi', style: 'margin-top:10px' },
        h('label', { class: 'casella' }, h('input', { type: 'checkbox', checked: P.patrono.attivo, onChange: function (e) { P.patrono.attivo = e.target.checked; logParam('Santo patrono ' + (e.target.checked ? 'attivo' : 'disattivato')); aggiorna(); } }), 'Considera festivo il santo patrono'),
        h('label', { class: 'campo' }, 'Giorno', h('input', { type: 'number', min: 1, max: 31, value: P.patrono.giorno, style: 'width:80px', onChange: function (e) { P.patrono.giorno = parseInt(e.target.value, 10) || 1; aggiorna(); } })),
        h('label', { class: 'campo' }, 'Mese', h('select', { onChange: function (e) { P.patrono.mese = +e.target.value; aggiorna(); } }, D.MESI.map(function (m, i) { return h('option', { value: i + 1, selected: P.patrono.mese === i + 1 }, cap(m)); }))),
        h('label', { class: 'campo' }, 'Nome', h('input', { type: 'text', value: P.patrono.nome, placeholder: 'Es. Sant\'Ambrogio', onChange: function (e) { P.patrono.nome = e.target.value.trim(); aggiorna(); } })))));

    // festività dell'anno
    const feste = D.holidays(ui.annoFeste, P.patrono);
    const anni = [];
    for (let y = new Date().getFullYear() - 1; y <= new Date().getFullYear() + 5; y++) anni.push(y);
    out.push(h('section', { class: 'sezione' },
      h('h2', null, 'Festività considerate'),
      h('p', { class: 'aiuto' }, 'Festività nazionali italiane, con Pasqua e Lunedì dell\'Angelo calcolati dall\'app.'),
      h('label', { class: 'campo', style: 'max-width:160px' }, 'Anno', h('select', { onChange: function (e) { ui.annoFeste = +e.target.value; render(); } }, anni.map(function (y) { return h('option', { value: y, selected: y === ui.annoFeste }, y); }))),
      h('table', { class: 'tabella', style: 'margin-top:10px;max-width:520px' },
        h('tbody', null, Object.keys(feste).sort().map(function (s) { return h('tr', null, h('td', null, cap(D.fmtLong(s))), h('td', null, feste[s])); })))));

    // termini
    const T = P.termini;
    const righeTermini = [
      ['Incameramento da GUP o predibattimento: giorni minimi dal provvedimento', T.incameramentoGupPredib, 'art. 429 c. 3; art. 554-ter c. 4'],
      ['Incameramento da giudizio immediato: giorni minimi dalla notifica', T.immediato, 'art. 456 c. 3'],
      ['Richiesta di riti dopo l\'immediato: giorni dalla notifica', T.ritiDopoNotifica, 'art. 458 c. 1'],
      ['Predibattimento: giorni minimi dalla notifica della citazione', T.predibNotifica + ' (' + T.predibNotificaUrgenza + ' se urgente)', 'art. 552 c. 3'],
      ['Intervallo minimo tra due udienze predibattimentali', T.predibIntervalloMin + ' (5 settimane)', 'regola del giudice'],
      ['Perito: massimo di giorni per la nuova udienza', T.periziaMax, 'art. 508 c. 1'],
      ['Esecuzione camerale: preavviso alle parti', T.preavvisoEsecuzione + ' (da verificare)', 'art. 666 c. 3'],
      ['Esecuzione: opposizione all\'ordinanza', T.opposizioneEsecuzione, 'art. 667 c. 4'],
      ['Relazione del perito: deposito prima dell\'esame', T.relazionePeritoGiorni, 'art. 501 c. 1-bis'],
      ['Liste di testimoni, periti e consulenti: deposito prima dell\'udienza', T.listeProveGiorni, 'art. 468 c. 1']
    ];
    out.push(h('section', { class: 'sezione' },
      h('h2', null, 'Termini di legge usati dai calcoli'),
      h('p', { class: 'aiuto' }, 'Valori in giorni, tratti dalla specifica. Qui sono solo da consultare: verranno usati dai calcoli delle fasi successive. Controlla sempre i testi vigenti.'),
      h('table', { class: 'tabella' }, h('thead', null, h('tr', null, ['Termine', 'Giorni', 'Riferimento'].map(function (x) { return h('th', null, x); }))),
        h('tbody', null, righeTermini.map(function (r) { return h('tr', null, h('td', null, r[0]), h('td', null, r[1]), h('td', null, r[2])); })))));

    out.push(h('section', { class: 'sezione' },
      h('h2', null, 'Ripristino'),
      h('p', { class: 'aiuto' }, 'Riporta orari, durate, periodo feriale e santo patrono ai valori predefiniti. I giorni di udienza e le indisponibilità restano.'),
      h('button', { class: 'btn btn-pericolo', onClick: function () {
        if (!window.confirm('Ripristinare i valori predefiniti di orari, durate, periodo feriale e patrono?')) return;
        const d = GC.params.defaults();
        P.orario = d.orario;
        P.durate = d.durate;
        P.termini = d.termini;
        P.feriale = d.feriale;
        P.patrono = d.patrono;
        logParam('Ripristinati i valori predefiniti');
        ui.messaggio = { tipo: 'ok', testo: 'Valori predefiniti ripristinati.' };
        aggiorna();
      } }, 'Ripristina i valori predefiniti')));
    return out;
  }

  /* ---------- dati e backup ---------- */

  function sezioneFile() {
    const f = ui.file;
    const nome = f.handle && f.handle.name ? f.handle.name : '';
    const sez = h('section', { class: 'sezione' }, h('h2', null, 'File dei dati'));
    if (f.stato === 'nonSupportato') {
      sez.append(h('p', { class: 'aiuto' }, 'Questo browser non permette di salvare in un file scelto da te. Usa Chrome o Edge, oppure fai i backup a mano (qui sotto).'));
    } else if (f.stato === 'collegato') {
      sez.append(
        h('p', { class: 'aiuto' }, 'Ogni modifica viene salvata nel file "' + nome + '" (e in una copia nel browser). Puoi copiarlo, tenerlo in una cartella sincronizzata o portarlo su un altro computer.'),
        h('p', { class: 'aiuto' }, 'Quando passi a una nuova versione dell\'app, apri la nuova versione e scegli lo stesso file con "Apri un file esistente": ritrovi tutti i dati.'),
        h('div', { class: 'azioni' },
          h('button', { class: 'btn', onClick: function () { sceltaFile(false); } }, 'Cambia file'),
          h('button', { class: 'btn', onClick: scollegaFile }, 'Scollega il file')));
    } else if (f.stato === 'da-riaprire') {
      sez.append(
        h('p', { class: 'aiuto' }, 'Il file "' + nome + '" era collegato, ma in questa sessione il browser chiede di nuovo il permesso. ' + (f.errore || '')),
        h('div', { class: 'azioni' },
          h('button', { class: 'btn btn-primario', onClick: riapriDaClic }, 'Riapri il file dei dati'),
          h('button', { class: 'btn', onClick: function () { sceltaFile(false); } }, 'Scegli un altro file'),
          h('button', { class: 'btn', onClick: scollegaFile }, 'Scollega')));
    } else {
      sez.append(
        h('p', { class: 'aiuto' }, 'Scegli un file dove salvare i dati: l\'app lo aggiorna a ogni modifica. Alla prima volta usa "Crea un nuovo file"; per riprendere i dati dopo un aggiornamento dell\'app, o su un altro computer, usa "Apri un file esistente".'),
        h('div', { class: 'azioni' },
          h('button', { class: 'btn btn-primario', onClick: function () { sceltaFile(true); } }, 'Crea un nuovo file dei dati'),
          h('button', { class: 'btn', onClick: function () { sceltaFile(false); } }, 'Apri un file esistente')));
    }
    return sez;
  }

  function vistaDati() {
    const out = [
      h('h1', { class: 'titolo-pagina' }, 'Dati e backup'),
      h('p', { class: 'sottotitolo' }, 'I dati restano solo su questo dispositivo: non vengono inviati a nessun server. Per non perderli, collega un file dei dati e fai un backup di tanto in tanto, conservandolo in un luogo sicuro.')
    ];
    if (ui.messaggio) out.push(h('div', { class: 'messaggio ' + ui.messaggio.tipo, role: 'status' }, ui.messaggio.testo));
    out.push(sezioneFile());
    const ult = stato.meta.ultimoBackup;
    const fileBackup = h('input', { type: 'file', accept: '.json,application/json', onChange: async function (e) {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const testo = await f.text();
      const r = S.parseBackup(testo);
      if (!r.ok) { ui.messaggio = { tipo: 'errore', testo: r.errore }; render(); return; }
      if (!window.confirm('Sostituire tutti i dati attuali con quelli del backup' + (r.esportato ? ' del ' + fmtDataOra(r.esportato) : '') + '? L\'operazione non si può annullare.')) { e.target.value = ''; return; }
      stato = r.stato;
      ui.messaggio = { tipo: 'ok', testo: 'Backup ripristinato: ' + stato.fascicoli.length + ' fascicoli e ' + stato.eventi.length + ' attività.' };
      aggiorna();
    } });
    out.push(h('section', { class: 'sezione' },
      h('h2', null, 'Backup'),
      h('p', { class: 'aiuto' }, ult ? 'Ultimo backup: ' + fmtDataOra(ult) + '.' : 'Non hai ancora fatto nessun backup.'),
      h('div', { class: 'azioni' }, h('button', { class: 'btn btn-primario', onClick: function () {
        stato.meta.ultimoBackup = M.clock();
        const testo = S.exportText(stato);
        scarica('fascicoli-udienze-tracker-backup-' + D.today() + '.json', testo, 'application/json');
        ui.messaggio = { tipo: 'ok', testo: 'Backup salvato nella cartella dei download.' };
        aggiorna();
      } }, 'Scarica il backup')),
      h('label', { class: 'campo', style: 'margin-top:10px;max-width:420px' }, 'Ripristina da un backup (sostituisce i dati attuali)', fileBackup)));

    out.push(h('section', { class: 'sezione' },
      h('h2', null, 'Dove sono i dati'),
      h('p', { class: 'aiuto' }, 'Sistema di salvataggio in uso: ' + ({ indexeddb: 'archivio del browser (IndexedDB)', localstorage: 'archivio semplice del browser (localStorage)', nessuno: 'nessuno: i dati non vengono conservati' }[S.backend()] || S.backend()) + '. I dati sono legati a questo browser e a questo profilo utente: aprendo l\'app con un altro browser vedrai un archivio vuoto, a meno di ripristinare un backup.'),
      h('p', { class: 'aiuto' }, 'Fascicoli: ' + stato.fascicoli.length + ' · Attività: ' + stato.eventi.length + ' · Voci di storico: ' + stato.storico.length),
      h('p', { class: 'aiuto' }, 'Versione dell\'app: ' + (GC.versione || 'sconosciuta'))));

    const rec = stato.storico.slice(-200).reverse();
    out.push(h('section', { class: 'sezione' },
      h('h2', null, 'Storico delle modifiche'),
      h('p', { class: 'aiuto' }, 'Le ultime 200 operazioni, dalla più recente.'),
      rec.length ? h('div', { class: 'scorri' }, h('table', { class: 'tabella' },
        h('thead', null, h('tr', null, ['Quando', 'Azione', 'Oggetto', 'Dettaglio'].map(function (x) { return h('th', null, x); }))),
        h('tbody', null, rec.map(function (r) { return h('tr', null, h('td', null, fmtDataOra(r.t)), h('td', null, r.azione), h('td', null, r.oggetto), h('td', null, r.dettaglio)); }))))
        : h('div', { class: 'vuota' }, 'Ancora nessuna modifica registrata.')));

    out.push(h('section', { class: 'sezione' },
      h('h2', null, 'Cancella tutti i dati'),
      h('p', { class: 'aiuto' }, 'Elimina fascicoli, attività, importazioni e impostazioni da questo dispositivo' + (ui.file.stato === 'collegato' ? ' e svuota anche il file dei dati collegato' : '') + '. Fai prima un backup.'),
      h('button', { class: 'btn btn-pericolo', onClick: async function () {
        const r = window.prompt('Per confermare scrivi CANCELLA (in maiuscolo).');
        if (r !== 'CANCELLA') return;
        await S.clear();
        stato = M.newState();
        ui.imp = null;
        ui.messaggio = { tipo: 'ok', testo: 'Tutti i dati sono stati cancellati da questo dispositivo.' };
        aggiorna();
      } }, 'Cancella tutti i dati')));
    return out;
  }

  /* ---------- avvio ---------- */

  async function avvia() {
    try {
      const raw = await S.load();
      stato = raw ? M.normalizeState(raw) : M.newState();
    } catch (e) {
      stato = M.newState();
      ui.salvataggio = { testo: 'Impossibile leggere i dati salvati: ' + e.message, errore: true };
    }
    try {
      await collegaAvvio();
    } catch (e) {
      ui.file = { handle: null, stato: 'nessuno', errore: '' };
    }
    ui.giorno = D.today();
    const p = D.parts(ui.giorno);
    ui.anno = p.y;
    ui.mese = p.m;
    if (!ui.salvataggio.testo) ui.salvataggio = { testo: S.backend() === 'nessuno' ? 'Attenzione: i dati non possono essere salvati su questo browser.' : 'Dati letti da questo dispositivo.', errore: S.backend() === 'nessuno' };
    render();
  }

  window.addEventListener('error', function (e) {
    ui.salvataggio = { testo: 'Errore: ' + (e.message || 'imprevisto'), errore: true };
    aggiornaStatoSalvataggio();
  });

  GC.app = { avvia: avvia, stato: function () { return stato; }, ui: ui, aggiorna: aggiorna, render: render, scegliGiorno: scegliGiorno };
  document.addEventListener('DOMContentLoaded', avvia);
})();
