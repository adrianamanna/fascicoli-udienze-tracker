/* Salvataggio su un file scelto dall'utente (File System Access API: Chrome ed Edge).
   Il file contiene gli stessi dati del backup. Resta una copia anche nel browser (storage.js).
   La scrittura passa da un file temporaneo e sostituisce l'originale solo a scrittura completata:
   se qualcosa va storto, il file precedente resta intatto. */
(function (root) {
  'use strict';
  const GC = (root.GC = root.GC || {});

  const NOME_PREDEFINITO = 'fascicoli-udienze-tracker-dati.json';
  const TIPI = [{ description: 'Dati di Fascicoli Udienze Tracker', accept: { 'application/json': ['.json'] } }];

  /** Il browser permette di scegliere un file e di scriverci? (Chrome ed Edge sì; Safari e Firefox no.) */
  function supportato() {
    return typeof root.showSaveFilePicker === 'function' && typeof root.showOpenFilePicker === 'function';
  }

  /** Permesso di scrittura sul file. Con chiedi=true può mostrare la richiesta del browser (serve un clic dell'utente). */
  async function permesso(handle, chiedi) {
    if (!handle || typeof handle.queryPermission !== 'function') return 'denied';
    const opz = { mode: 'readwrite' };
    let p = await handle.queryPermission(opz);
    if (p === 'prompt' && chiedi) p = await handle.requestPermission(opz);
    return p;
  }

  function scegliNuovo() {
    return root.showSaveFilePicker({ suggestedName: NOME_PREDEFINITO, types: TIPI });
  }

  async function scegliEsistente() {
    const r = await root.showOpenFilePicker({ types: TIPI, multiple: false });
    return r[0];
  }

  /** Legge il file. { ok:true, vuoto:true } se il file è vuoto; altrimenti come parseBackup: { ok, stato, esportato } o { ok:false, errore }. */
  async function leggi(handle) {
    const f = await handle.getFile();
    const testo = await f.text();
    if (!testo.trim()) return { ok: true, vuoto: true };
    return GC.storage.parseBackup(testo);
  }

  /** Scrive lo stato nel file. Se la scrittura fallisce, il file precedente non viene toccato. */
  async function scrivi(handle, stato) {
    const w = await handle.createWritable();
    try {
      await w.write(GC.storage.exportText(stato));
      await w.close();
    } catch (e) {
      try {
        await w.abort();
      } catch (e2) {
        /* ignora */
      }
      throw e;
    }
  }

  function haDati(s) {
    return !!(s && ((s.fascicoli && s.fascicoli.length) || (s.eventi && s.eventi.length)));
  }

  function quando(s) {
    return (s && s.meta && s.meta.salvato) || '';
  }

  /** Quale copia usare quando si riapre il file: 'file', 'locale' oppure 'chiedi' (il browser ha modifiche più recenti). */
  function scegliFonte(locale, daFile) {
    if (!daFile || !haDati(daFile)) return 'locale';
    if (!haDati(locale)) return 'file';
    return quando(daFile) >= quando(locale) ? 'file' : 'chiedi';
  }

  GC.fileDati = {
    NOME_PREDEFINITO: NOME_PREDEFINITO,
    supportato: supportato,
    permesso: permesso,
    scegliNuovo: scegliNuovo,
    scegliEsistente: scegliEsistente,
    leggi: leggi,
    scrivi: scrivi,
    haDati: haDati,
    scegliFonte: scegliFonte
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
