# Fascicoli Udienze Tracker

App per organizzare il calendario delle udienze di un giudice penale: giornata con vuoti da riempire, importazione del ruolo da Excel, predibattimento e incameramento con i loro termini, fase di ogni fascicolo ed esito delle udienze con proposta della prossima azione.

- **Funziona senza internet** e senza installazione: si apre con un doppio clic su `index.html`, con Chrome o Edge, su Windows e macOS.
- **I dati restano sul computer**: in un file scelto da te (Chrome o Edge) e in una copia nel browser. Nessun invio a server e nessun cloud.
- **Calcoli deterministici**: stesse informazioni, stesso risultato. Nessuna intelligenza artificiale e nessuna stima.

## Progetto personale

Questo è un **progetto personale**, sviluppato a titolo individuale nel tempo libero. Non è un prodotto ufficiale e non è collegato a nessun datore di lavoro, tribunale o ufficio giudiziario.

- È **in sviluppo** e viene offerto **così com'è**, senza garanzie (vedi `LICENSE`).
- **Non è consulenza legale.** Termini e regole di legge usati dai calcoli (artt. 429, 456, 552 c.p.p. e altri) sono presi da fonti di consultazione e vanno **controllati sui testi vigenti** prima di farci affidamento. L'ultima parola spetta sempre al giudice.
- Le regole sono quelle di un'unica prassi di udienza e possono non valere per altri uffici.

## Scaricare l'app

1. Apri la pagina **Releases** di questo repository (colonna di destra, oppure la scheda *Code* > *Releases*).
2. Nell'ultima versione, sotto **Assets**, scarica il file `fascicoli-udienze-tracker-vX.Y.Z.zip`.
3. Estrai lo zip e fai doppio clic su `index.html`.

Il repository è **pubblico**: chiunque può scaricare l'app e leggere il codice. Per questo non vi devono mai finire dati reali (vedi "Privacy e dati").

## Primo avvio

Le istruzioni per chi usa l'app sono nel file `LEGGIMI.txt` dentro lo zip (anche in `app/LEGGIMI.txt`). In breve:

1. Impostazioni: giorni di udienza, orari, festività.
2. Importa da Excel: il ruolo delle udienze (un foglio per giorno) oppure un elenco semplice (modello `modello_import.xlsx`).
3. Predibattimento e Incameramento: fissare i fascicoli con le date proposte dall'app.
4. Dopo ogni udienza: scheda **Fascicoli**, pannello "Da decidere". Si registra l'esito e l'app propone la prossima attività e la fase; il giudice conferma o cambia, niente cambia da solo.
5. Dati e backup: scegliere un **file dei dati** (Chrome o Edge) dove l'app salva ogni modifica; in alternativa fare un backup regolare. La copia nel browser resta comunque.

## Privacy e dati

- Nel repository **non devono mai finire dati reali**: backup dell'app (`*.json`), file Excel o CSV del ruolo, nomi di imputati. La cronologia di git è permanente: un file caricato per errore resta recuperabile anche dopo averlo cancellato.
- Il file `.gitignore` blocca i backup e tutti i file Excel e CSV, tranne il modello e i file di prova inventati in `tests/fixtures/`. Un test controlla che non ce ne siano altri.
- Prima di ogni `git add`, controlla con `git status` che non ci siano file inattesi.
- I file di prova in `tests/fixtures/` hanno solo dati inventati.

## Come è fatto

```
app/                  l'app (è questa cartella che viene distribuita)
  index.html          pagina principale
  css/app.css         stile
  js/core/            calcoli: date, calendario, predibattimento, incameramento, esiti, importazione, salvataggio
  js/ui/app.js        interfaccia
  modello_import.xlsx modello Excel da compilare
  LEGGIMI.txt         istruzioni per chi usa l'app
tests/                test automatici (Node.js, nessuna dipendenza)
docs/                 specifica delle regole e regole realmente implementate
.github/workflows/    controlli automatici e pubblicazione delle versioni
```

## Le regole del programma

- `docs/specifica_fascicoli_udienze_tracker.md`: la specifica completa, con tutto ciò che si vuole ottenere.
- `docs/regole_implementate_app.md`: **le regole che il programma applica davvero**, con codice, valore, fonte e stato, compresa la tabella degli esiti delle udienze e della prossima azione proposta. È il documento da correggere quando una regola non è giusta, e va aggiornato a ogni modifica del programma.

## Sviluppo

Serve solo Node.js 20 o superiore. Nessuna installazione di pacchetti.

```
npm test
```

Esegue tutti i test dei calcoli (date, festività, giornata, predibattimento, incameramento, esiti, importazione, file dei dati, backup).

### Fare una nuova versione

1. Aggiorna la versione in **due posti** (un test controlla che coincidano): `package.json` e `app/js/core/versione.js`.
2. Aggiungi le novità in `CHANGELOG.md`.
3. Se hai cambiato una regola, aggiorna `docs/regole_implementate_app.md`.
4. `npm test` deve passare.
5. Salva e pubblica:
   ```
   git add .
   git commit -m "Versione 0.6.0: descrizione breve"
   git push
   git tag v0.6.0
   git push origin v0.6.0
   ```
6. Il tag avvia la pubblicazione automatica: dopo un paio di minuti compare la nuova release con lo zip da scaricare.

### Caricare il repository la prima volta

1. Su GitHub crea un repository **privato** vuoto (senza README né altri file).
2. Nella cartella del progetto:
   ```
   git init
   git add .
   git status
   git commit -m "Prima versione 0.4.0"
   git branch -M main
   git remote add origin https://github.com/NOME-UTENTE/NOME-REPOSITORY.git
   git push -u origin main
   git tag v0.4.0
   git push origin v0.4.0
   ```
3. Controlla `git status` **prima** del commit: devono comparire solo file dell'app, dei test e della documentazione.

## Licenza

Codice rilasciato con licenza [MIT](LICENSE): si può usare, copiare e modificare liberamente, senza alcuna garanzia.
