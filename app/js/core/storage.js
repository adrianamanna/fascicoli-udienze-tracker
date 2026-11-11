/* Salvataggio solo sul dispositivo (G-15): IndexedDB, con ripiego su localStorage. Backup manuale in JSON. */
(function (root) {
  'use strict';
  const GC = (root.GC = root.GC || {});

  const DB_NOME = 'fascicoli-udienze-tracker';
  const NEGOZIO = 'kv';
  const CHIAVE = 'stato';
  const APP_ID = 'fascicoli-udienze-tracker';
  // Nome usato fino alla versione 0.4.0: si leggono ancora i dati e i backup creati con quel nome.
  const NOME_VECCHIO = 'calendario-giudice';

  let backend = 'nessuno';

  /** Apre il database. Con soloEsistente non crea nulla: se il database non c'era, dà errore. */
  function apriDb(nome, soloEsistente) {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB non disponibile'));
      let rich;
      try {
        rich = indexedDB.open(nome || DB_NOME, 1);
      } catch (e) {
        return reject(e);
      }
      rich.onupgradeneeded = function () {
        if (soloEsistente) {
          rich.transaction.abort();
          return;
        }
        rich.result.createObjectStore(NEGOZIO);
      };
      rich.onsuccess = function () {
        resolve(rich.result);
      };
      rich.onerror = function () {
        reject(rich.error);
      };
      rich.onblocked = function () {
        reject(new Error('Database bloccato'));
      };
    });
  }

  function leggiLs(nome) {
    try {
      const t = typeof localStorage !== 'undefined' ? localStorage.getItem(nome || DB_NOME) : null;
      return t ? JSON.parse(t) : null;
    } catch (e) {
      return null;
    }
  }

  /** Dati salvati con il nome vecchio (fino alla 0.4.0), se ci sono: vengono copiati al primo salvataggio. */
  async function leggiVecchi() {
    try {
      const db = await apriDb(NOME_VECCHIO, true);
      const v = await new Promise(function (resolve, reject) {
        const rq = db.transaction(NEGOZIO, 'readonly').objectStore(NEGOZIO).get(CHIAVE);
        rq.onsuccess = function () {
          resolve(rq.result || null);
        };
        rq.onerror = function () {
          reject(rq.error);
        };
      });
      db.close();
      if (v) return v;
    } catch (e) {
      /* nessun database con il nome vecchio */
    }
    return leggiLs(NOME_VECCHIO);
  }

  /** Carica lo stato salvato (oggetto grezzo) oppure null. */
  async function load() {
    try {
      const db = await apriDb();
      const v = await new Promise(function (resolve, reject) {
        const rq = db.transaction(NEGOZIO, 'readonly').objectStore(NEGOZIO).get(CHIAVE);
        rq.onsuccess = function () {
          resolve(rq.result || null);
        };
        rq.onerror = function () {
          reject(rq.error);
        };
      });
      db.close();
      backend = 'indexeddb';
      if (v) return v;
      return leggiLs() || (await leggiVecchi()) || null;
    } catch (e) {
      backend = 'localstorage';
      return leggiLs() || leggiLs(NOME_VECCHIO);
    }
  }

  /** Salva lo stato. Restituisce il nome del sistema usato. */
  async function save(state) {
    try {
      const db = await apriDb();
      await new Promise(function (resolve, reject) {
        const tx = db.transaction(NEGOZIO, 'readwrite');
        tx.objectStore(NEGOZIO).put(JSON.parse(JSON.stringify(state)), CHIAVE);
        tx.oncomplete = resolve;
        tx.onerror = function () {
          reject(tx.error);
        };
        tx.onabort = function () {
          reject(tx.error || new Error('Salvataggio annullato'));
        };
      });
      db.close();
      backend = 'indexeddb';
      return backend;
    } catch (e) {
      try {
        localStorage.setItem(DB_NOME, JSON.stringify(state));
        backend = 'localstorage';
        return backend;
      } catch (e2) {
        backend = 'nessuno';
        throw new Error('Impossibile salvare i dati su questo dispositivo: ' + (e2 && e2.message ? e2.message : e2));
      }
    }
  }

  async function clear() {
    try {
      const db = await apriDb();
      await new Promise(function (resolve, reject) {
        const tx = db.transaction(NEGOZIO, 'readwrite');
        tx.objectStore(NEGOZIO).delete(CHIAVE);
        tx.oncomplete = resolve;
        tx.onerror = function () {
          reject(tx.error);
        };
      });
      db.close();
    } catch (e) {
      /* ignora */
    }
    try {
      localStorage.removeItem(DB_NOME);
    } catch (e) {
      /* ignora */
    }
  }

  const CHIAVE_FILE = 'fileDati';

  /** Ricorda quale file dei dati è collegato (il collegamento del browser al file, non il contenuto). */
  async function salvaCollegamento(handle) {
    const db = await apriDb();
    await new Promise(function (resolve, reject) {
      const tx = db.transaction(NEGOZIO, 'readwrite');
      tx.objectStore(NEGOZIO).put(handle, CHIAVE_FILE);
      tx.oncomplete = resolve;
      tx.onerror = function () {
        reject(tx.error);
      };
      tx.onabort = function () {
        reject(tx.error || new Error('Salvataggio annullato'));
      };
    });
    db.close();
  }

  async function caricaCollegamento() {
    try {
      const db = await apriDb();
      const v = await new Promise(function (resolve, reject) {
        const rq = db.transaction(NEGOZIO, 'readonly').objectStore(NEGOZIO).get(CHIAVE_FILE);
        rq.onsuccess = function () {
          resolve(rq.result || null);
        };
        rq.onerror = function () {
          reject(rq.error);
        };
      });
      db.close();
      return v;
    } catch (e) {
      return null;
    }
  }

  async function eliminaCollegamento() {
    try {
      const db = await apriDb();
      await new Promise(function (resolve, reject) {
        const tx = db.transaction(NEGOZIO, 'readwrite');
        tx.objectStore(NEGOZIO).delete(CHIAVE_FILE);
        tx.oncomplete = resolve;
        tx.onerror = function () {
          reject(tx.error);
        };
      });
      db.close();
    } catch (e) {
      /* ignora */
    }
  }

  /** Testo JSON del backup. */
  function exportText(state) {
    return JSON.stringify({ app: APP_ID, versione: 1, versioneApp: GC.versione || '', esportato: GC.model.clock(), stato: state }, null, 1);
  }

  /** Legge un backup. Restituisce { ok, stato } oppure { ok:false, errore }. */
  function parseBackup(testo) {
    let o;
    try {
      o = JSON.parse(testo);
    } catch (e) {
      return { ok: false, errore: 'Il file non è un backup valido (JSON non leggibile).' };
    }
    if (!o || (o.app !== APP_ID && o.app !== NOME_VECCHIO) || !o.stato) return { ok: false, errore: "Il file non è un backup di questa app." };
    if (o.versione > 1) return { ok: false, errore: 'Il backup è stato creato da una versione più recente dell\'app.' };
    const stato = GC.model.normalizeState(o.stato);
    return { ok: true, stato: stato, esportato: o.esportato || null };
  }

  GC.storage = {
    load: load,
    save: save,
    clear: clear,
    salvaCollegamento: salvaCollegamento,
    caricaCollegamento: caricaCollegamento,
    eliminaCollegamento: eliminaCollegamento,
    exportText: exportText,
    parseBackup: parseBackup,
    backend: function () {
      return backend;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
