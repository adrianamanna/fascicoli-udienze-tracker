/* Lettura di file .xlsx e .csv senza librerie esterne.
   Un .xlsx è un archivio ZIP di file XML: lo apriamo con DecompressionStream, presente nei browser moderni e in Node. */
(function (root) {
  'use strict';
  const GC = (root.GC = root.GC || {});
  const D = GC.dates;

  function u16(b, o) {
    return b[o] | (b[o + 1] << 8);
  }
  function u32(b, o) {
    return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Questo browser non supporta la lettura dei file Excel. Usa Chrome o Edge aggiornati, oppure salva il file come CSV.');
    const flusso = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(flusso).arrayBuffer());
  }

  function elencoZip(bytes) {
    let eocd = -1;
    const minimo = Math.max(0, bytes.length - 65557);
    for (let i = bytes.length - 22; i >= minimo; i--) {
      if (u32(bytes, i) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error('Il file non è un archivio .xlsx valido.');
    const n = u16(bytes, eocd + 10);
    let p = u32(bytes, eocd + 16);
    const voci = {};
    const dec = new TextDecoder('utf-8');
    for (let k = 0; k < n; k++) {
      if (u32(bytes, p) !== 0x02014b50) break;
      const metodo = u16(bytes, p + 10);
      const csize = u32(bytes, p + 20);
      const nl = u16(bytes, p + 28);
      const el = u16(bytes, p + 30);
      const cl = u16(bytes, p + 32);
      const lho = u32(bytes, p + 42);
      const nome = dec.decode(bytes.subarray(p + 46, p + 46 + nl));
      voci[nome] = { metodo: metodo, csize: csize, lho: lho };
      p += 46 + nl + el + cl;
    }
    return voci;
  }

  async function leggiVoce(bytes, v) {
    const lh = v.lho;
    if (u32(bytes, lh) !== 0x04034b50) throw new Error('Archivio danneggiato.');
    const nl = u16(bytes, lh + 26);
    const el = u16(bytes, lh + 28);
    const inizio = lh + 30 + nl + el;
    const dati = bytes.subarray(inizio, inizio + v.csize);
    if (v.metodo === 0) return dati;
    if (v.metodo === 8) return inflateRaw(dati);
    throw new Error('Metodo di compressione non supportato.');
  }

  async function testoVoce(bytes, voci, nome) {
    const v = voci[nome];
    if (!v) return null;
    return new TextDecoder('utf-8').decode(await leggiVoce(bytes, v));
  }

  function unesc(s) {
    return s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, function (m, n) {
        return String.fromCodePoint(+n);
      })
      .replace(/&#x([0-9a-fA-F]+);/g, function (m, n) {
        return String.fromCodePoint(parseInt(n, 16));
      })
      .replace(/&amp;/g, '&');
  }

  function attr(s, nome) {
    const m = new RegExp('(?:^|\\s)' + nome + '="([^"]*)"').exec(s);
    return m ? unesc(m[1]) : null;
  }

  function indiceColonna(rif) {
    const m = /^([A-Z]+)/.exec(rif);
    let n = 0;
    for (let i = 0; i < m[1].length; i++) n = n * 26 + (m[1].charCodeAt(i) - 64);
    return n - 1;
  }

  function stringheCondivise(xml) {
    const out = [];
    const re = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    let m;
    while ((m = re.exec(xml))) {
      const corpo = m[1].replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
      let txt = '';
      const tr = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
      let t;
      while ((t = tr.exec(corpo))) txt += unesc(t[1]);
      out.push(txt);
    }
    return out;
  }

  function stili(xml) {
    const fmts = {};
    (xml.match(/<numFmt\b[^>]*>/g) || []).forEach(function (t) {
      fmts[attr(t, 'numFmtId')] = attr(t, 'formatCode');
    });
    const xfs = [];
    const cx = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml);
    if (cx) (cx[1].match(/<xf\b[^>]*>/g) || []).forEach(function (t) {
      xfs.push(attr(t, 'numFmtId'));
    });
    return { fmts: fmts, xfs: xfs };
  }

  /** Dice se il formato numerico di una cella è una data, un'ora o entrambe. */
  function tipoData(idStile, st) {
    if (idStile == null || !st) return null;
    const id = st.xfs[+idStile];
    if (id == null) return null;
    const n = +id;
    if ((n >= 14 && n <= 17) || n === 22 || (n >= 27 && n <= 31) || (n >= 34 && n <= 36) || (n >= 50 && n <= 58)) return { data: true, ora: n === 22 };
    if (n === 18 || n === 19 || n === 20 || n === 21 || n === 45 || n === 46 || n === 47) return { data: false, ora: true };
    if (n === 32 || n === 33) return { data: false, ora: true };
    const codice = st.fmts[id];
    if (!codice) return null;
    const pulito = codice.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, '');
    const haData = /[dy]/i.test(pulito);
    const haOra = /[hs]/i.test(pulito);
    if (!haData && !haOra) return null;
    return { data: haData, ora: haOra };
  }

  function seriale(n, tipo) {
    const giorni = Math.floor(n);
    const frazione = n - giorni;
    let ymdS = null;
    if (tipo.data) ymdS = D.fromUTC(new Date(Date.UTC(1899, 11, 30) + giorni * 86400000));
    let hhmm = null;
    if (tipo.ora || frazione > 0) {
      const min = Math.round(frazione * 1440) % 1440;
      if (tipo.ora || min > 0) hhmm = D.minToHhmm(min);
    }
    return { __date: true, ymd: ymdS, hhmm: hhmm, seriale: n };
  }

  function foglio(xml, condivise, st) {
    const righe = [];
    const rre = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
    let rm;
    while ((rm = rre.exec(xml))) {
      const rn = attr(rm[1], 'r');
      const ri = rn ? +rn - 1 : righe.length;
      const celle = [];
      if (rm[2]) {
        const cre = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
        let cm;
        while ((cm = cre.exec(rm[2]))) {
          const a = cm[1];
          const corpo = cm[2] || '';
          const rif = attr(a, 'r');
          const ci = rif ? indiceColonna(rif) : celle.length;
          const t = attr(a, 't');
          const s = attr(a, 's');
          let val = null;
          const v = /<v>([\s\S]*?)<\/v>/.exec(corpo);
          if (t === 's' && v) val = condivise[+v[1]];
          else if (t === 'inlineStr') {
            let txt = '';
            const tr = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
            let x;
            while ((x = tr.exec(corpo))) txt += unesc(x[1]);
            val = txt;
          } else if (t === 'str' && v) val = unesc(v[1]);
          else if (t === 'b' && v) val = v[1] === '1';
          else if (t === 'e') val = null;
          else if (v) {
            const num = parseFloat(v[1]);
            if (isNaN(num)) val = unesc(v[1]);
            else {
              val = num;
              const tipo = tipoData(s, st);
              if (tipo) val = seriale(num, tipo);
            }
          }
          celle[ci] = val === undefined ? null : val;
        }
      }
      righe[ri] = celle;
    }
    const out = [];
    for (let i = 0; i < righe.length; i++) {
      const r = righe[i] || [];
      const piena = [];
      for (let j = 0; j < r.length; j++) piena.push(r[j] === undefined ? null : r[j]);
      out.push(piena);
    }
    return out;
  }

  /** Legge un file .xlsx. Restituisce { fogli: [{ nome, righe }] }. Le celle data diventano { __date, ymd, hhmm }. */
  async function leggiXlsx(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const voci = elencoZip(bytes);
    const wb = await testoVoce(bytes, voci, 'xl/workbook.xml');
    if (!wb) throw new Error('Il file non sembra una cartella di lavoro Excel (.xlsx).');
    const rels = (await testoVoce(bytes, voci, 'xl/_rels/workbook.xml.rels')) || '';
    const condivise = stringheCondivise((await testoVoce(bytes, voci, 'xl/sharedStrings.xml')) || '');
    const st = stili((await testoVoce(bytes, voci, 'xl/styles.xml')) || '');
    const mappaRel = {};
    (rels.match(/<Relationship\b[^>]*>/g) || []).forEach(function (t) {
      mappaRel[attr(t, 'Id')] = attr(t, 'Target');
    });
    const fogli = [];
    const nomiFogli = wb.match(/<sheet\b[^>]*>/g) || [];
    for (let i = 0; i < nomiFogli.length; i++) {
      const t = nomiFogli[i];
      const nome = attr(t, 'name') || 'Foglio ' + (i + 1);
      const rid = attr(t, 'r:id');
      let target = mappaRel[rid];
      if (!target) continue;
      target = target.charAt(0) === '/' ? target.slice(1) : 'xl/' + target;
      const xml = await testoVoce(bytes, voci, target);
      if (!xml) continue;
      fogli.push({ nome: nome, righe: foglio(xml, condivise, st) });
    }
    return { fogli: fogli };
  }

  function decodificaTesto(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
    } catch (e) {
      return new TextDecoder('windows-1252').decode(bytes);
    }
  }

  /** Legge un CSV (separatore ; , o tabulazione, rilevato in automatico). */
  function leggiCsv(testo) {
    testo = String(testo).replace(/^\uFEFF/, '');
    const primaRiga = testo.split(/\r?\n/)[0] || '';
    const cont = function (ch) {
      return primaRiga.split(ch).length - 1;
    };
    let sep = ';';
    if (cont('\t') > cont(sep)) sep = '\t';
    if (cont(',') > cont(sep)) sep = ',';
    const righe = [];
    let riga = [];
    let campo = '';
    let tra = false;
    for (let i = 0; i < testo.length; i++) {
      const c = testo[i];
      if (tra) {
        if (c === '"') {
          if (testo[i + 1] === '"') {
            campo += '"';
            i++;
          } else tra = false;
        } else campo += c;
      } else if (c === '"') tra = true;
      else if (c === sep) {
        riga.push(campo);
        campo = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && testo[i + 1] === '\n') i++;
        riga.push(campo);
        righe.push(riga);
        riga = [];
        campo = '';
      } else campo += c;
    }
    if (campo !== '' || riga.length) {
      riga.push(campo);
      righe.push(riga);
    }
    return {
      fogli: [
        {
          nome: 'CSV',
          righe: righe.map(function (r) {
            return r.map(function (x) {
              return x === '' ? null : x;
            });
          })
        }
      ]
    };
  }

  /** Apre un file in base all'estensione. */
  async function leggiFile(nome, buffer) {
    if (/\.(csv|txt|tsv)$/i.test(nome)) return leggiCsv(decodificaTesto(buffer));
    if (/\.xls$/i.test(nome)) throw new Error('Il formato .xls (Excel 97-2003) non è supportato: apri il file in Excel e salvalo come .xlsx.');
    return leggiXlsx(buffer);
  }

  GC.xlsx = { leggiXlsx: leggiXlsx, leggiCsv: leggiCsv, leggiFile: leggiFile, decodificaTesto: decodificaTesto };
})(typeof globalThis !== 'undefined' ? globalThis : this);
