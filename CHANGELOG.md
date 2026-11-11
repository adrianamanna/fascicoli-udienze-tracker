# Novità per versione

## 0.6.0 — in lavorazione
- **Fase del fascicolo**: ogni fascicolo ha una fase (predibattimento, in attesa di incameramento, istruttoria, discussione, in riserva, riti o trattative, messa alla prova, esecuzione, chiuso). Si sceglie nella scheda; se non è indicata, l'app la ricava dai segni che ci sono già (da fissare in predibattimento, da incamerare, prossima attività).
- Scheda **Fascicoli**: colonna "Fase" e filtro per fase con il numero di fascicoli per ciascuna.
- Il cambio di fase è registrato nello storico.
- **Ruolo Excel**: le righe con reato "SVIL UP" sono ora **predibattimenti** (prima erano incameramenti da GUP da 90 minuti, che occupavano la giornata a torto). Le annotazioni "420 quater" diventano la nuova attività **Udienza dopo rintraccio (art. 420-quater)**.
- **Nuovo aspetto**: tema sempre chiaro (niente più sfondo scuro), intestazione fissa in alto, schede bianche con ombre leggere, pulsanti, tabelle e messaggi ridisegnati. Lo stato del salvataggio è una piccola etichetta in basso a destra.

## 0.5.0 — novembre 2026
- **File dei dati**: in "Dati e backup" si sceglie un file (Chrome o Edge) dove l'app salva ogni modifica, oltre alla copia nel browser. Per passare a una nuova versione dell'app basta aprire lo stesso file: niente più backup e ripristino a mano.
- Il file si scrive in modo sicuro: se qualcosa va storto, quello precedente resta intatto.
- Se il file si riapre e il browser ha modifiche più recenti, l'app chiede quale copia tenere.
- Se il file è stato spostato o il permesso non c'è più, un avviso permette di riaprirlo.
- Nuovi controlli automatici sul file dei dati (64 test).

## 0.4.1 — novembre 2026
- **Nome unico**: l'app, la repo, lo zip, i backup e i documenti si chiamano ora "Fascicoli Udienze Tracker" (`fascicoli-udienze-tracker`). Prima c'erano tre nomi diversi.
- **Compatibilità**: i dati già salvati nel browser e i backup creati con il vecchio nome (`calendario-giudice`) si leggono ancora.
- Il documento di specifica diventa `docs/specifica_fascicoli_udienze_tracker.md`.
- README: il repository è pubblico.

## 0.4.0 — novembre 2026
- **Incameramento**: nuova scheda. Uno slot unico di 90 minuti per tutti i fascicoli di quella data, con data minima per fascicolo (20 giorni dal decreto o dal provvedimento, 30 dalla notifica per l'immediato), cadenza per origine (GUP ogni 3 mesi, predibattimento ogni 6), chiusura delle liste e stato di ogni slot.
- **Predibattimento**: massimo 30 fascicoli per udienza (circa 5 ore), slot da 10 minuti uno dopo l'altro; piano che divide molti fascicoli in gruppi da 30, a 5 settimane l'uno dall'altro.
- Documento delle **regole realmente implementate** (`docs/regole_implementate_app.md`).
- Mostrata la versione dell'app nella scheda "Dati e backup" e registrata nei backup.
- Repository con test automatici e pubblicazione delle versioni.

## 0.3.0
- **Predibattimento**: scheda con i fascicoli da fissare (anche incollando un elenco), assistente alle date (60 giorni dalla notifica, 45 se urgente; 5 settimane tra le udienze), ordine "più comoda per studiare".

## 0.2.0
- **Importazione del ruolo delle udienze** (un foglio per giorno, più giudici): riconoscimento del formato, scelta del giudice, interpretazione delle righe (predibattimento, incameramento da GUP, esecuzione, udienza dibattimentale da precisare), conservazione di reato, P.M., RINVIO DAL ed ESITO.
- Le attività che iniziano alla stessa ora sono sovrapponibili.

## 0.1.0
- Calendario del mese e giornata con righello (9:00-15:00, tolleranza fino alle 15:30, pausa 14:00-14:15), vuoti da riempire e saturazione.
- Festività nazionali italiane, periodo feriale, indisponibilità, giorni extra, santo patrono opzionale.
- Fascicoli e attività, attività provvisorie, importazione da Excel o CSV con anteprima e annullamento, backup e storico.
