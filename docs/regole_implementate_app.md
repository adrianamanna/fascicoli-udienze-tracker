# Regole usate dal programma "Fascicoli Udienze Tracker" (versione 0.4)

Questo documento elenca **ogni regola che il programma applica davvero** quando calcola, controlla o propone qualcosa. Serve a correggerle via via: dimmi il **codice** della regola (per esempio PRE-05) e il valore o il comportamento giusto, e aggiorno programma e documento insieme.

**Come leggere le colonne**

- **Fonte**
  - *Giudice*: l'hai detto tu.
  - *Codice*: l'ho ricavata dal codice di procedura penale (letto su siti di consultazione, non sulla Gazzetta Ufficiale).
  - *Mia ipotesi*: l'ho scelta io, perché non era stata detta.
- **Stato**
  - *Confermato*: vale così.
  - *Da verificare*: è un riferimento normativo da controllare sul testo vigente.
  - *Da confermare*: è una mia ipotesi, o una tua indicazione che ho interpretato.
- **Dove**: file e punto del programma che applica la regola (utile per me, non devi leggerlo).
- **Modificabile**: se esiste già un'impostazione per cambiarla senza intervenire sul programma.

Tutti i calcoli sono **deterministici**: stessi dati, stesso risultato, nessuna stima e nessuna intelligenza artificiale.

---

## 1. La giornata di udienza

| Cod. | Regola | Valore attuale | Fonte | Stato | Dove | Modificabile |
|---|---|---|---|---|---|---|
| CAL-01 | La giornata di udienza va dalle 9:00 alle 15:00. | 09:00-15:00 | Giudice | Confermato | calendar.js `timeline` | Sì, Impostazioni > Orari |
| CAL-02 | Si può andare oltre le 15:00 fino a un limite massimo, ma quel tempo **non si programma in anticipo**: viene mostrato a parte come "minuti in tolleranza" e non entra nei minuti occupati. | limite 15:30 | Giudice | Confermato | calendar.js `timeline` | Sì |
| CAL-03 | Una pausa dalle 14:00 alle 14:15, che non si riempie e non conta nei minuti utili. | 14:00-14:15 | Giudice | Confermato | calendar.js `timeline` | Sì |
| CAL-04 | **Minuti utili** della giornata = durata della fascia ordinaria meno la pausa. | 345 minuti | Giudice | Confermato | calendar.js `timeline` | Derivato |
| CAL-05 | **Minuti occupati** = tempo coperto dalle attività ufficiali dentro la fascia utile. Attività sovrapposte si contano una volta sola. Le attività provvisorie e il tempo in tolleranza non si contano. | | Mia ipotesi | Da confermare | calendar.js `timeline` | No |
| CAL-06 | **Saturazione** = minuti occupati diviso minuti utili. | | Mia ipotesi | Da confermare | calendar.js `timeline` | No |
| CAL-07 | Un intervallo libero è un **vuoto da riempire** se dura almeno 10 minuti; sotto i 10 minuti è un "margine" e non viene proposto come vuoto. | 10 minuti | Giudice (slot da 10) | Da confermare | calendar.js `timeline`; params `vuotoMinimo` | Sì (parametro, non ancora nella schermata) |
| CAL-08 | Due attività ufficiali che si sovrappongono vengono segnalate, **salvo che entrambe siano marcate "sovrapponibili"**. La segnalazione non impedisce di salvare: decidi tu. | | Giudice | Confermato | calendar.js `timeline`, `checkEvent` | Sì, casella "forzatura" sulla singola attività |
| CAL-09 | Le attività **provvisorie** (appunti personali) non occupano spazio, non creano sovrapposizioni e non riducono i vuoti. | | Giudice | Confermato | calendar.js `timeline` | Sì, scelta "stato" sull'attività |
| CAL-10 | Controlli su ogni attività, tutti non bloccanti: giorno bloccato o non di udienza; inizio prima delle 9:00; sovrapposizione alla pausa; fine tra le 15:00 e le 15:30 ("in tolleranza"); sovrapposizione ad altre attività ufficiali. | | Mia ipotesi | Da confermare | calendar.js `checkEvent` | No |
| CAL-11 | Se un'attività finisce **dopo il limite massimo** (15:30), l'app chiede una conferma ulteriore ("Salva comunque"). | | Mia ipotesi | Da confermare | app.js `dialogoEvento` | No |
| CAL-12 | Un'attività dura da 1 a 600 minuti (numero intero) e non può superare la mezzanotte. | | Mia ipotesi | Da confermare | model.js `validateEvento` | No |

## 2. Giorni di udienza, festività e indisponibilità

| Cod. | Regola | Valore attuale | Fonte | Stato | Dove | Modificabile |
|---|---|---|---|---|---|---|
| CAL-20 | Sono giorni di udienza i **giorni fissi della settimana** che spunti (da lunedì a venerdì) più i **giorni singoli extra** che aggiungi. | nessuno finché non li imposti | Giudice | Confermato | calendar.js `dayStatus` | Sì, Impostazioni > Giorni di udienza |
| CAL-21 | Un giorno programmato è **bloccato** (niente udienza) se è festivo, se cade nel periodo feriale o se è in un periodo di indisponibilità. Se più cause coincidono, vale questa priorità: festivo, poi feriale, poi indisponibile. | | Giudice | Confermato | calendar.js `dayStatus` | Sì |
| CAL-22 | Le festività sono quelle **nazionali italiane**: 1 gennaio, 6 gennaio, Pasqua, Lunedì dell'Angelo, 25 aprile, 1 maggio, 2 giugno, 15 agosto, 1 novembre, 8 dicembre, 25 dicembre, 26 dicembre. Pasqua è calcolata dall'app per ogni anno. | | Giudice | Confermato | dates.js `holidays`, `easter` | No (elenco fisso) |
| CAL-23 | Il **santo patrono** della tua città può essere aggiunto come festivo. | disattivato | Mia ipotesi | Da confermare | dates.js `holidays` | Sì |
| CAL-24 | **Periodo feriale** dall'1 al 31 agosto: nessuna udienza. | attivo | Giudice | Confermato | dates.js `inPeriodoFeriale` | Sì (si può disattivare) |
| CAL-25 | **Attenzione:** il periodo feriale blocca le udienze, ma la **sospensione dei termini di legge in agosto non è ancora applicata** ai calcoli (20, 30, 60 giorni…): i giorni di agosto oggi contano come giorni normali. | | Giudice (principio) | **Da implementare** | | |
| CAL-26 | Un giorno che non è di udienza o è bloccato accetta comunque attività aggiunte a mano, con un avviso. | | Mia ipotesi | Da confermare | calendar.js `checkEvent` | No |

## 3. Fascicoli, attività e dati

| Cod. | Regola | Valore attuale | Fonte | Stato | Dove | Modificabile |
|---|---|---|---|---|---|---|
| FAS-01 | Ogni fascicolo ha una **fase**: Nuovo da inquadrare, Predibattimento, In attesa di incameramento, Istruttoria, Discussione, In riserva, Rinvio per riti o trattative, Messa alla prova (sospeso), Esecuzione, Chiuso. L'elenco viene dalla tabella degli stati della specifica (§3-bis) e dai flussi dei §7-§9-bis. | | Mia ipotesi | **Da confermare** | model.js `FASI` | Solo nel codice |
| FAS-02 | Se la fase non è indicata, si **ricava**: prima dai flag "da fissare in predibattimento" e "da incamerare"; poi dalla prossima attività ufficiale in calendario (o dall'ultima, se sono tutte passate), secondo il suo tipo; altrimenti "Nuovo da inquadrare". La fase indicata a mano vince sempre. | | Mia ipotesi | Da confermare | model.js `faseDi` | No |
| FAS-03 | Ogni cambio di fase è registrato nello storico. L'app non cambia mai la fase da sola. | | Mia ipotesi | Da confermare | model.js `updateFascicolo` | No |
| DAT-01 | Per creare un fascicolo serve almeno il numero di ruolo (RG) o il nome dell'imputato. | | Mia ipotesi | Da confermare | model.js `validateFascicolo` | No |
| DAT-02 | Il numero di ruolo è **unico**: due RG sono uguali se coincidono ignorando spazi e maiuscole. | | Mia ipotesi | Da confermare | model.js `findFascicoloByRg` | No |
| DAT-03 | I dati restano **solo sul dispositivo** (archivio del browser), senza cloud né invii a server. Il programma blocca ogni connessione di rete. | | Giudice | Confermato | storage.js; index.html | No |
| DAT-04 | Backup manuale in un file; il programma ricorda di farlo se **non esiste alcun backup** o l'ultimo risale a **30 giorni** fa o più (e ci sono dati). | 30 giorni | Mia ipotesi | Da confermare | app.js `avvisiGenerali`; params `backupPromemoriaGiorni` | Parametro, non ancora nella schermata |
| DAT-05 | Ripristinare un backup **sostituisce** tutti i dati attuali, con conferma. | | Mia ipotesi | Da confermare | app.js `vistaDati` | No |
| DAT-06 | Cancellare tutti i dati richiede di scrivere la parola CANCELLA. | | Mia ipotesi | Da confermare | app.js `vistaDati` | No |
| DAT-07 | Lo **storico** registra ogni modifica (cosa, quando); si conservano le ultime 5000 voci e se ne mostrano 200. | | Giudice (storico) | Da confermare i numeri | model.js `log` | No |
| DAT-08 | Il nome con cui compari nel ruolo delle udienze (colonna Giudice) viene **ricordato**. | GIUDICE 1 | Giudice | Confermato | params `giudiceRuolo` | Sì |
| DAT-09 | **File dei dati** (solo Chrome ed Edge): se scegli un file, a ogni modifica l'app lo riscrive per intero, oltre alla copia nel browser. Il file ha lo stesso formato del backup. La scrittura passa da un file temporaneo: se fallisce, il file precedente resta intatto. | | Giudice (dati solo sul dispositivo) | Da confermare | filedati.js; app.js `salvaOra` | Sì, Dati e backup |
| DAT-10 | **Riapertura del file**: se il file ha dati e il browser no, si usa il file; se il file è più recente del browser (data `meta.salvato`), si usa il file; se il browser è più recente, l'app **chiede** quale copia tenere; se il file è vuoto, ci si scrive la copia del browser. Alla prima scelta di un file che ha già dati, l'app chiede conferma prima di sostituire i dati attuali. | | Mia ipotesi | Da confermare | filedati.js `scegliFonte`; app.js `usaFile` | No |
| DAT-11 | Con un file collegato, il promemoria del backup non compare. Se il file non si può scrivere (permesso scaduto, file spostato), compare un avviso e i dati restano nella copia del browser. | | Mia ipotesi | Da confermare | app.js `avvisiGenerali` | No |

## 4. Importazione da Excel o CSV (formato generico)

| Cod. | Regola | Valore attuale | Fonte | Stato | Dove | Modificabile |
|---|---|---|---|---|---|---|
| IMP-01 | Si leggono file `.xlsx` e `.csv` (separatore `;`, `,` o tabulazione, codifica UTF-8 o Windows). Il vecchio `.xls` non è supportato. | | Mia ipotesi | Da confermare | xlsx.js | No |
| IMP-02 | La **riga delle intestazioni** è, tra le prime 12 righe, quella con più colonne riconosciute (almeno due testi). Puoi correggerla a mano. | | Mia ipotesi | Da confermare | importer.js `trovaIntestazione` | Sì, sulla schermata |
| IMP-03 | Le colonne si riconoscono dal nome: prima corrispondenza esatta con un elenco di sinonimi (es. "RG", "Imputato", "Data", "Ora", "Durata", "Tipo", "Note", "Reato", "P.M. titolare", "Giudice", "Rinvio dal", "Esito", "Nr. Ord."), poi corrispondenza di una parola contenuta nel nome. Puoi sempre correggere l'abbinamento. | | Mia ipotesi | Da confermare | importer.js `indovinaColonne` | Sì, sulla schermata |
| IMP-04 | **Date** accettate: `gg/mm/aaaa` (anche con `.` o `-`), `aaaa-mm-gg`, "3 dicembre 2026", "mar 3 nov 2026", data di Excel, con eventuale ora. Una data impossibile (es. 31/02) è un errore e la riga è scartata. | | Mia ipotesi | Da confermare | importer.js `analizzaData` | No |
| IMP-05 | **Ore** accettate: `09:30`, `09.30`, `9`, "ore 9", ora di Excel. | | Mia ipotesi | Da confermare | importer.js `analizzaOra` | No |
| IMP-06 | **Durate** accettate: `30`, "30 min", "1,5 h", "1h30", `1:30`. Un numero senza unità vale minuti (si può scegliere ore). Da 1 a 600 minuti. | minuti | Mia ipotesi | Da confermare | importer.js `analizzaDurata` | Sì, sulla schermata |
| IMP-07 | Il **tipo di attività** si ricava da parole chiave, nell'ordine: "predib" = Predibattimento; "incamer" = Incameramento; "map" o "messa alla prova" = MAP; "esecuz" = Esecuzione; "riserv" o "sciogl" = Scioglimento riserva; "perit" = Perito; "replic" = Repliche; "discuss" = Discussione; "istrutt", "testimon" o "escuss" = Istruttoria; "rito", "riti", "abbrev", "patteggi", "querela", "trattativ", "oblaz", "rinotific" = Rinvio per riti o trattative; "riunion" = Riunione; "dibattiment" = Udienza dibattimentale. Un testo diverso diventa **Altro** con il testo come titolo. | | Mia ipotesi | Da confermare | importer.js `REGOLE_TIPO` | No |
| IMP-08 | **Stato**: parole come "provvisorio", "appunto", "bozza" = provvisorio; qualsiasi altra cosa = ufficiale; se vuoto vale la scelta fatta in importazione. | ufficiale | Mia ipotesi | Da confermare | importer.js `analizzaStato` | Sì, sulla schermata |
| IMP-09 | **Detenuto**: valori "sì", "s", "x", "1", "true", "vero", "yes", "y", "detenuto" = sì. | | Mia ipotesi | Da confermare | importer.js `analizzaSiNo` | No |
| IMP-10 | Se manca la **durata**, si usa quella predefinita del tipo (tabella in fondo). L'avviso compare solo se il file ha una colonna durata con celle vuote. | | Mia ipotesi | Da confermare | importer.js `pianifica` | Sì, Impostazioni > Durate |
| IMP-11 | Se manca l'**ora**, a scelta: l'attività va al **primo orario libero** della giornata (dalle 9:00, saltando la pausa e le attività ufficiali già presenti o già importate, mai oltre il limite massimo) oppure la riga è scartata. | primo orario libero | Mia ipotesi | Da confermare | importer.js `primoSlot` | Sì, sulla schermata |
| IMP-12 | Se il **fascicolo** (stesso RG) non esiste, viene creato; se esiste, si completano solo i campi vuoti (imputato, reato, P.M., numero d'ordine) senza sovrascrivere. | | Mia ipotesi | Da confermare | importer.js `applica` | No |
| IMP-13 | È **duplicata** una riga con stessa data, ora, tipo, RG e titolo di un'attività già presente. Se nel file manca l'ora, il confronto ignora l'ora. I duplicati si saltano di default, così puoi reimportare lo stesso file. | | Mia ipotesi | Da confermare | importer.js `pianifica` | Sì, sulla schermata |
| IMP-14 | Le attività che **iniziano alla stessa ora** nello stesso file (es. i fascicoli chiamati alle 9:00) sono considerate **sovrapponibili**, qualunque sia il tipo. | attivo | Giudice | Confermato | importer.js `pianifica` | Sì, sulla schermata |
| IMP-15 | Se nel file c'è una colonna del giudice, si importano **solo le righe del giudice scelto** (confronto del testo senza maiuscole né accenti). | GIUDICE 1 | Giudice | Confermato | importer.js `pianifica` | Sì |
| IMP-16 | Nulla viene scritto prima della conferma: si vede un'anteprima con errori, duplicati e avvisi. Ogni importazione si può **annullare**: l'annullamento toglie le attività importate e i fascicoli creati che non hanno altre attività. | | Giudice | Confermato | importer.js `applica`, `annulla` | No |

## 5. Importazione del ruolo delle udienze (file con un foglio per giorno)

| Cod. | Regola | Valore attuale | Fonte | Stato | Dove | Modificabile |
|---|---|---|---|---|---|---|
| RUO-01 | Il file è un **ruolo** se almeno un foglio ha nelle prime righe un titolo come "UDIENZA DEL 2 NOVEMBRE 2026 - LUNEDI". La **data di ogni foglio** viene dal titolo; se manca, dal nome del foglio (es. "16.11") con l'anno degli altri fogli. | | Giudice | Confermato | importer.js `rilevaRuolo` | No |
| RUO-02 | Colonne usate: Nr. Ord., Nr. R.G. NR, Cognome e Nome, Reato, P.M. titolare, Giudice, RINVIO DAL, ESITO, ORARIO, ANNOTAZIONI. CANCELLIERE si ignora. | | Giudice | Confermato | importer.js `tabellaDaRuolo` | No |
| RUO-03 | **Annotazione che contiene "predibattimentale"** (anche scritta male, "predibiattimentale") = **Predibattimento**. | | Giudice | Da confermare | importer.js `inferisciRuolo` | No |
| RUO-04 | **Reato che inizia con "SVIL UP"** = **Predibattimento** (slot da 10 minuti). Il tipo si può cambiare a mano nell'anteprima, perché "di solito" non vuol dire sempre. L'origine del fascicolo non viene impostata. | | Giudice ("di solito è un'udienza da predibattimento") | Confermato; eccezioni da chiarire | importer.js `inferisciRuolo` | Il tipo si cambia a mano |
| RUO-05 | **N. R.G. "SIGE"** oppure reato "incidente d'esecuzione" = **Esecuzione**. Il fascicolo si chiama "SIGE" seguito dal numero d'ordine (es. "SIGE 534/26"). | | Mia ipotesi | Da confermare | importer.js `inferisciRuolo`, `tabellaDaRuolo` | No |
| RUO-06 | **Tutte le altre righe** arrivano da un rinvio e sono **Udienza dibattimentale (da precisare)**: istruttoria, repliche e così via, secondo il caso. L'annotazione diventa il titolo. | | Giudice | Confermato | importer.js `inferisciRuolo` | Il tipo si cambia a mano |
| RUO-07 | L'**ora** è quella della colonna ORARIO. La **durata** non è nel file: vale quella del tipo (10 minuti per predibattimento, esecuzione e udienza dibattimentale; 90 per l'incameramento). | | Giudice | Confermato | importer.js; params `durate` | Sì |
| RUO-08 | Gli **incameramenti** hanno uno slot di 1 ora e 30 che parte dall'ora indicata; più fascicoli alla stessa ora condividono lo stesso slot. | | Giudice | Confermato | importer.js; incamera.js | Sì |
| RUO-09 | **RINVIO DAL** è conservato: "gg,mm,aa" diventa una data, "1 UD" resta com'è (prima udienza). ESITO, reato, P.M. e numero d'ordine sono conservati. | | Giudice | Confermato | importer.js `normalizzaRinvio` | No |
| RUO-10 | Un **asterisco** accanto al numero di ruolo (es. "1234/24*") oggi è parte del numero. | | Mia ipotesi | **Da chiarire** | | |
| RUO-11 | Parole come "misura cautelare", "direttissima", "differito fuori udienza" restano **solo come note**: non cambiano priorità né calcoli. | | Mia ipotesi | **Da chiarire** | | |
| RUO-12 | **Annotazione che contiene "420 quater"** (o "rintraccio") = **Udienza dopo rintraccio (art. 420-quater)**: l'udienza che segue il rintraccio dell'imputato, dopo la sospensione del processo per assenza. Durata 10 minuti. L'annotazione intera resta nelle note. | 10 minuti | Giudice | Confermato il significato; durata **da confermare** | importer.js `inferisciRuolo`, `REGOLE_TIPO` | Sì, Impostazioni > Durate |

## 6. Predibattimento

| Cod. | Regola | Valore attuale | Fonte | Stato | Dove | Modificabile |
|---|---|---|---|---|---|---|
| PRE-01 | Ogni fascicolo ha uno **slot di 10 minuti**, uno dopo l'altro, **senza sovrapposizioni** quando li fissa l'app. | 10 minuti | Giudice | Confermato | predib.js `assegnaOrari`, `fissa` | Sì, Impostazioni > Durate |
| PRE-02 | **Massimo 30 fascicoli per udienza** (circa 5 ore). I posti disponibili di una data sono il minore tra lo spazio libero e 30 meno i predibattimenti ufficiali già fissati quel giorno (rinvii compresi). Se non entrano tutti, la data è "con riserve". | 30 | Giudice | Confermato | predib.js `posti`, `valuta` | Sì, Impostazioni > Predibattimento |
| PRE-03 | **Data minima** per fissare = data di notifica del decreto di citazione + 60 giorni (45 se urgente). Per un gruppo vale la data più lontana. Una data prima di quella è **non consentita**. | 60 e 45 giorni | Codice (art. 552 c. 3) | Da verificare | predib.js `dataMinima`, `valuta` | Valori nelle Impostazioni (sola lettura) |
| PRE-04 | Se un fascicolo non ha la data di notifica, il termine non si può controllare e la data è "con riserve". | | Mia ipotesi | Da confermare | predib.js `valuta` | No |
| PRE-05 | Tra due **udienze predibattimentali** devono passare **almeno 5 settimane (35 giorni)**, nei due versi: né a meno di 35 giorni dopo l'udienza precedente, né a meno di 35 giorni prima della successiva. Altrimenti la data è **non consentita**. | 35 giorni | Giudice | Confermato | predib.js `valuta` | Valore nelle Impostazioni (sola lettura) |
| PRE-06 | È una "**udienza predibattimentale**" la giornata con **almeno 5 fascicoli alla prima udienza** ("1 UD") oppure fissata con questa app. I rinvii di singoli fascicoli su altri giorni **non contano** per le 5 settimane. | soglia 5 | Giudice (principio); soglia mia | **Da confermare la soglia** | predib.js `udienze` | Sì, Impostazioni > Predibattimento |
| PRE-07 | **Colori delle date**: *idonea* se rispetta tutto; *con riserve* se entrano solo alcuni fascicoli o manca una data di notifica; *non consentita* se viola la data minima o le 5 settimane. Si può sempre fissare comunque, con conferma. | | Giudice (decide lui) | Confermato | predib.js `valuta` | No |
| PRE-08 | **Giorni liberi per studiare** di una data = giorni dal lunedì al venerdì, nei 14 giorni prima, che **non sono di udienza e non sono bloccati** (festivi, agosto, indisponibilità). | 14 giorni | Giudice (criterio); calcolo mio | **Da confermare** | predib.js `giorniLiberiPerStudio` | No |
| PRE-09 | **Ordine delle proposte**: le date non consentite vanno in fondo; le altre per data più vicina oppure, a scelta, per più giorni liberi per studiare (a parità, la più vicina). Si guardano i prossimi 180 giorni. | 180 giorni | Giudice (scelta) | Confermato | predib.js `candidate` | Sì, sulla schermata |
| PRE-10 | **Fissare**: ogni fascicolo prende il primo slot libero da 10 minuti dalle 9:00, saltando pausa e attività già presenti. Se non entrano, l'app chiede se usare la **tolleranza** fino al limite massimo; gli altri restano "da fissare". Le attività create sono ufficiali, alla "prima udienza". | | Giudice | Confermato | predib.js `assegnaOrari`, `fissa` | No |
| PRE-11 | **Piano a gruppi**: con più fascicoli del massimo, si dividono in gruppi da 30. Ordine: urgenti, poi notifica più vecchia, poi numero di ruolo. Ogni gruppo prende la prima data idonea che rispetta il massimo, tenendo conto dei gruppi già pianificati (cioè con 5 settimane tra l'uno e l'altro). Il piano si vede prima di applicarlo. | gruppi da 30 | Giudice (idea); ordine mio | **Da confermare l'ordine** | predib.js `piano` | Sì |

## 7. Incameramento

| Cod. | Regola | Valore attuale | Fonte | Stato | Dove | Modificabile |
|---|---|---|---|---|---|---|
| INC-01 | L'incameramento è **uno slot unico di 90 minuti per tutti i fascicoli** di quella data e ora, qualunque ne sia il numero. | 90 minuti | Giudice | Confermato | incamera.js `fissa`, `blocchi` | Sì, Impostazioni > Durate |
| INC-02 | **Tempo medio per fascicolo** = 90 minuti diviso il numero di fascicoli dello slot (arrotondato per difetto). Solo informativo. | | Giudice | Confermato | incamera.js `valuta`, `riepilogo` | No |
| INC-03 | **Data minima** di un fascicolo: **20 giorni** dopo il decreto che dispone il giudizio (GUP) o il provvedimento (predibattimento di un altro giudice); **30 giorni** dopo l'ultima notifica (immediato). Una data prima è **non consentita**. Per un gruppo vale la più lontana. | 20 e 30 giorni | Codice (artt. 429 c. 3, 554-ter c. 4, 456 c. 3) | Da verificare | incamera.js `dataMinima` | Valori nelle Impostazioni (sola lettura) |
| INC-04 | Se manca la data del provvedimento, il termine non si controlla e la data è "con riserve". | | Mia ipotesi | Da confermare | incamera.js `valuta` | No |
| INC-05 | **Cadenza** per origine, rispetto agli incameramenti già fissati con fascicoli della stessa origine, prima e dopo la data: da **GUP ogni 3 mesi**, da **predibattimento ogni 6 mesi**, da immediato **nessuna regola**. Una data più vicina è "**con riserve**", non vietata. | 3, 6, 0 mesi | Giudice (3 e 6); immediato non definito | Confermato; immediato da chiarire | incamera.js `valuta` | Sì, Impostazioni > Incameramento |
| INC-06 | Se in quella data c'è già uno slot, i fascicoli **si aggiungono** a quello, alla stessa ora. Se non c'è, si crea nel **primo spazio libero da 90 minuti**; se nessuno spazio basta, la data è "con riserve" e, fissando comunque, parte dall'orario di inizio della giornata. | | Giudice | Confermato | incamera.js `fissa` | No |
| INC-07 | Una giornata con 30 predibattimenti (5 ore) **non ha spazio** per uno slot da 90 minuti: viene segnalato "con riserve". | | Giudice | Confermato | incamera.js `valuta` | Conseguenza di CAL e PRE |
| INC-08 | Gli incameramenti nello stesso slot sono **sovrapponibili** tra loro (non generano conflitti), e rifissare lo stesso fascicolo nello stesso slot non crea doppioni. | | Giudice | Confermato | incamera.js `fissa` | No |
| INC-09 | **Chiusura delle liste** per uno slot del giorno D: gli immediati non possono più arrivare dopo **D meno 30**; GUP e predibattimento dopo **D meno 20**. | | Codice | Da verificare | incamera.js `riepilogo` | Valori nelle Impostazioni (sola lettura) |
| INC-10 | Un **immediato** può ancora uscire dalla lista per rito alternativo fino a **15 giorni dopo l'ultima notifica**. La **lista è definitiva** quando sono scaduti tutti questi termini, e comunque non prima di D meno 20 (al più tardi D meno 15). | 15 giorni | Codice (art. 458 c. 1, art. 457) | Da verificare | incamera.js `riepilogo` | Valore nelle Impostazioni (sola lettura) |
| INC-11 | **Stato di uno slot** secondo la data di oggi: *aperto*; *chiuso agli immediati* (da D-30); *chiuso* (da D-20); *lista definitiva*; *passato*. | | Giudice (idea) | Da confermare | incamera.js `riepilogo` | No |
| INC-12 | **Ordine delle proposte**: prima le date idonee, poi quelle con riserve, in fondo le non consentite; ciascun gruppo per data. Si guardano i prossimi 400 giorni. A schermo: le prime 8 idonee più le date con riserve che le precedono (fino a 4). | 400 giorni | Giudice (scelta) | Da confermare | incamera.js `candidate`; app.js | No |

## 8. Valori predefiniti: durata per tipo di attività

Si usano quando importi senza durata o quando crei un'attività. Si cambiano in Impostazioni > Durate predefinite.

| Tipo | Minuti | Fonte | Stato |
|---|---|---|---|
| Predibattimento | 10 | Giudice | Confermato |
| Incameramento (slot unico) | 90 | Giudice | Confermato |
| Udienza dibattimentale (da precisare) | 10 | Mia ipotesi | **Da confermare** |
| Udienza dopo rintraccio (art. 420-quater) | 10 | Mia ipotesi | **Da confermare** |
| Istruttoria | 30 | Mia ipotesi (media per testimone) | Da confermare |
| Discussione | 30 | Specifica (suggerimento) | Da confermare |
| Repliche | 10 | Specifica | Da confermare |
| Perito (esame) | 30 | Mia ipotesi | Da confermare |
| Scioglimento riserva | 10 | Specifica | Da confermare |
| Rinvio per riti o trattative | 10 | Specifica | Da confermare |
| Messa alla prova | 10 | Specifica | Da confermare |
| Esecuzione | 10 | Giudice | Confermato |
| Riunione | 10 | Specifica | Da confermare |
| Altro | 10 | Mia ipotesi | Da confermare |

## 9. Termini di legge: quali il programma usa davvero

| Termine | Giorni | Riferimento | Usato oggi nei calcoli? | Stato |
|---|---|---|---|---|
| Incameramento da GUP o predibattimento | 20 | art. 429 c. 3; art. 554-ter c. 4 | **Sì** (INC-03, INC-09) | Da verificare |
| Incameramento da giudizio immediato | 30 | art. 456 c. 3 | **Sì** (INC-03, INC-09) | Da verificare |
| Richiesta di riti dopo l'immediato | 15 | art. 458 c. 1 | **Sì** (INC-10) | Da verificare |
| Citazione predibattimento: notifica prima dell'udienza | 60 (45 se urgente) | art. 552 c. 3 | **Sì** (PRE-03) | Da verificare |
| Intervallo minimo tra udienze predibattimentali | 35 | regola del giudice | **Sì** (PRE-05) | Confermato |
| Perito: massimo per la nuova udienza | 60 | art. 508 c. 1 | No, solo registrato | Da verificare |
| Esecuzione camerale: preavviso alle parti | 10 | art. 666 c. 3 | No, solo registrato | Da verificare |
| Esecuzione: opposizione all'ordinanza | 15 | art. 667 c. 4 | No, solo registrato | Da verificare |
| Relazione del perito: deposito prima dell'esame | 7 | art. 501 c. 1-bis | No, solo registrato | Da verificare |
| Liste di testimoni, periti, consulenti | 7 | art. 468 c. 1 | No, solo registrato | Da verificare |
| Margine tra due istruttorie nella stessa giornata | 10 minuti | regola del giudice | No, solo registrato | Confermato |

## 10. Cosa la specifica prevede ma il programma NON fa ancora

Queste regole sono nel documento di specifica, non ancora nel programma:

- **Sospensione feriale dei termini** nei calcoli (CAL-25).
- **Esiti dell'udienza predibattimentale** (rinvio a giudizio verso altro giudice, restituzione al PM, rinotifica, abbreviato, patteggiamento, MAP, riunione).
- **Istruttoria**: testimoni a 30 minuti (1 ora per i lunghi), ordine delle parti, esame dell'imputato, liste dei testimoni, margine di 10 minuti.
- **Perito**: conferimento dell'incarico (10 minuti), nuova udienza entro 60 giorni, relazione scritta 7 giorni prima, consulenti.
- **Discussione**, repliche e **riapertura ex art. 507**.
- **Riserve** e rinvii per scioglimento; **rinvii per riti e trattative**; **messa alla prova**; **esecuzione** (due percorsi, opposizione, competenza).
- **Riempimento suggerito dei vuoti** e priorità per detenuti o prescrizione.
- **Esportazione PDF o ICS**, password e cifratura del file di backup.

## 11. Punti che ti chiedo di confermare o correggere

1. ~~RUO-04 "SVIL UP"~~ **Chiarito**: di solito è un'udienza da predibattimento. Resta da sapere se ci sono eccezioni (quando non lo è).
2. **RUO-10** L'asterisco accanto al numero di ruolo: che cosa significa?
3. **RUO-11** "Misura cautelare" e "direttissima": devono dare priorità?
4. **PRE-06** La soglia di 5 fascicoli per riconoscere un'udienza predibattimentale ti sembra giusta?
5. **PRE-08** Il calcolo dei "giorni liberi per studiare" risponde a ciò che intendi?
6. **PRE-11** L'ordine del piano (urgenti, poi notifica più vecchia) è quello che vuoi?
7. **INC-05** Come devono comportarsi gli incameramenti da giudizio immediato (ogni quanti mesi)?
8. **INC-12 / PRE-09** Quante date vuoi vedere, e in quale ordine?
9. **Durate** della sezione 8 segnate "da confermare", in particolare l'udienza dibattimentale da 10 minuti.
10. **CAL-25** Conferma che i termini di legge in agosto vanno sospesi e come: ti dico io i giorni, oppure applico la sospensione dall'1 al 31 agosto?
