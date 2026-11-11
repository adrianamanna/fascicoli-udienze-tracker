# Specifica consolidata: Fascicoli Udienze Tracker, calendario udienze e gestione fascicoli del giudice penale

**Versione:** bozza 1 per revisione
**Legenda:**
- **[DEFAULT]** valore predefinito, sempre modificabile
- **[DA CONFERMARE]** interpretazione mia, da validare
- **[NUOVO]** regola che ho aggiunto e che non era nel testo originale
- **[ASTI]** da allineare al protocollo MAP del Tribunale di Asti (non ancora consultato)

Ogni regola ha un codice (es. G-01) per poterla citare nella revisione.

---

## 1. Principi generali

| Cod. | Regola |
|---|---|
| G-01 | L'app è un supporto al giudice: **suggerisce, il giudice conferma o modifica**. L'ultima parola è sempre del giudice. |
| G-02 | Ogni udienza ha una fascia oraria **9:00-15:00 (6 ore = 360 min, di cui 15 min di pausa dalle 14:00 alle 14:15, G-14: **345 min utili**)** [DEFAULT, modificabile]. Il giudice può spingersi **oltre le 15:00 fino a un massimo di 15:30** (G-09). Questa regola sostituisce le fasce 9:00-14:00 e 9:00-14:30 delle versioni precedenti. [Chiarito dal giudice] |
| G-03 | **Tutte le durate e tutti gli intervalli sono parametri modificabili**, a livello globale e per singolo fascicolo. |
| G-04 | Dopo un rinvio è sempre possibile inserire ulteriori rinvii. |
| G-05 | Nessun evento può superare la capienza della fascia, salvo sovrapposizione forzata dal giudice (consentita solo per il predibattimento, vedi P-02). |
| G-06 | Ogni modifica a un fascicolo viene registrata in uno storico (cosa, quando, da chi). [NUOVO] |
| G-07 | **Saturazione obbligatoria:** ogni udienza **deve essere riempita fino alla fine** della fascia (15:00). L'app mostra per ogni giornata i minuti occupati e quelli liberi, e segnala in modo evidente ogni **vuoto** (anche a metà giornata). Un'udienza con minuti liberi è considerata incompleta finché il giudice non la chiude esplicitamente. |
| G-08 | **Come si riempie la fascia:** l'app propone fascicoli e attività per coprire i minuti liberi, in questo ordine di priorità: (1) fascicoli urgenti (detenuti, prescrizione, termini di custodia); (2) prosecuzione di istruttorie già iniziate, spezzando l'assunzione dei testimoni sulla data (T-04); (3) rinvii in scadenza (riserve §9-ter, riti/trattative §9-quater, MAP §9, esecuzione §9-bis); (4) altri fascicoli in attesa. Il dettaglio dei candidati, dei criteri e delle azioni è nel §10-bis (F-01 … F-10). Il giudice accetta, rifiuta o modifica ogni proposta (G-01). L'app **propone attivamente** i fascicoli o le attività candidate a riempire ogni vuoto (non si limita a segnalarlo): per ogni vuoto mostra un elenco ordinato di candidati con durata e motivo. [Chiarito dal giudice: "cerca di riempire tutto"] |
| G-09 | **Tolleranza oltre le 15:00, massimo 15:30:** l'udienza può finire oltre le 15:00 ma **non oltre le 15:30** [CONFERMATO dal giudice]. Il tempo tra le 15:00 e le 15:30 non si programma di default: si usa per completare un'attività già iniziata (es. finire l'esame di un testimone, chiudere la discussione) o per scelta esplicita del giudice. Oltre le 15:30 l'app non programma nulla e avvisa. |
| G-10 | **Udienze miste:** se un tipo di udienza (es. predibattimento) non riempie la fascia, il giudice può consentire di completarla con attività di altro tipo (es. incameramento, riserve, rinvii brevi da 10 min). Opzione attivabile per giorno o per tipo. [CONFERMATO dal giudice: le udienze miste sono ammesse] |
| G-12 | **Riserva sempre disponibile:** in **ogni udienza e in ogni fase** (incameramento, istruttoria, perito, discussione, predibattimento, MAP, esecuzione, riti e trattative) il giudice può **riservarsi la decisione** e disporre il rinvio per scioglimento della riserva (§9-ter). L'azione "Riservo la decisione" non deve mai essere disabilitata né dipendere dallo stato del fascicolo. |
| G-13 | **Ambito:** l'app è per **un solo magistrato**: un solo utente, un solo calendario, nessuna gestione di più giudici o sezioni. Gli altri giudici (es. quello assegnatario del dibattimento dopo la tua predibattimentale, P-10, o il giudice dell'esecuzione competente, X-13) compaiono solo come **campo di testo** nel fascicolo, senza calendario proprio. [Chiarito dal giudice] |
| G-14 | **Una sola pausa: 14:00-14:15** [DEFAULT, modificabile per giornata]. È l'unica pausa della fascia; l'app **non la riempie** con altre attività e la esclude dai minuti utili (345 min fino alle 15:00). Se alle 14:00 un'attività è in corso, il giudice può spostare o saltare la pausa. Resta il margine di 10 minuti tra due istruttorie (T-07). [Chiarito dal giudice] |
| G-15 | **Conservazione dei dati: solo sul dispositivo del giudice** [Chiarito dal giudice, opzione A]. I dati dei fascicoli (compresi i nomi degli imputati) restano **memorizzati localmente**, **senza cloud** e senza invio a server esterni. L'app funziona **offline**. Per non perdere i dati l'app offre: (a) **esportazione e importazione di un file di backup** manuale; (b) promemoria periodico di backup [DA CONFERMARE]; (c) **protezione con password** all'apertura dell'app e **cifratura del file dati** [DA CONFERMARE]. Le esportazioni del calendario (PDF/ICS, E-06) sono file salvati sul dispositivo e sotto la responsabilità del giudice. |
| G-11 | **Scelta della data:** nel proporre una nuova data (E-01) l'app preferisce le udienze con **minuti liberi** a quelle già piene o ancora da aprire, per mantenere alta la saturazione. Resta fermo il rispetto di frequenze, intervalli minimi e termini di legge. |

---

## 2. Configurazione del calendario

| Cod. | Regola |
|---|---|
| C-01 | Il giudice inserisce i giorni di udienza: una volta a settimana, più volte a settimana, oppure date personalizzate (custom). |
| C-02 | Il giudice può indicare giorni di indisponibilità: ferie, periodo feriale, festività, impedimenti. [NUOVO] |
| C-03 | Il giudice stabilisce la **frequenza** di ciascun tipo di udienza (tabella sotto). La frequenza può cambiare da mese a mese. |
| C-04 | Il giudice può riservare date o fasce a un tipo di udienza (es. "il primo martedì del mese solo predibattimento"). [NUOVO] |

**Frequenze e durate di default**

| Tipo di udienza | Frequenza [DEFAULT] | Durata [DEFAULT] |
|---|---|---|
| Incameramento di fascicoli provenienti dal **GUP** (prima udienza del fascicolo in giudizio, §3-bis) | **1 volta ogni 3 mesi** [DEFAULT, modificabile, anche da mese a mese] | **1,5 h in totale per tutti i fascicoli** dell'incameramento (blocco fisso, indipendente dal numero di fascicoli); il resto dell'udienza si riempie con altro (G-07, G-10) |
| Incameramento di fascicoli provenienti dal **predibattimento** (§3-bis) | **1 volta ogni 6 mesi** [DEFAULT, modificabile, anche da mese a mese] | **1,5 h in totale per tutti i fascicoli** (stesso blocco e stesse regole del GUP) |
| Incameramento di fascicoli da **giudizio immediato** (§3-bis, N-15) | da definire [DA CONFERMARE: probabilmente nelle stesse date degli incameramenti da GUP] | **1,5 h in totale per tutti i fascicoli** (stesso blocco) |
| Udienza predibattimentale (fasi 1 e 2, §7) | **minimo ogni 5 settimane (35 giorni)** tra una e l'altra [DEFAULT, modificabile]; l'app aiuta a individuare le date (P-04, P-05) | somma degli slot dei fascicoli (10 min ciascuno) |
| Esecuzione (incidenti di esecuzione, §9-bis) | **nessuna frequenza fissa**: trattati insieme ad altre udienze (udienze miste, G-10), alla prima data utile (X-07) | **10 min per incidente** [CONFERMATO dal giudice] |

**Nota:** il giudice del dibattimento **non tiene udienze GUP**. Il GUP compare solo come **origine dei fascicoli** che arrivano all'udienza di incameramento.

Nota: l'**udienza di incameramento** è la prima udienza del fascicolo in giudizio. Qui si verificano le parti, si decidono le eccezioni (subito o con rinvio per scioglimento della riserva), si ammettono le prove e **solo dopo** si calendarizza l'istruttoria. Il flusso completo è nel §3-bis.

---

## 3. Fascicoli da incameramento: dati di input

Il giudice inserisce per ogni fascicolo:

| Cod. | Dato |
|---|---|
| I-01 | Nome dell'imputato |
| I-02 | Parti presenti (spunta): PM, parte civile, responsabile civile, imputato, extra |
| I-03 | Numero di testimoni per parte (anche zero) |
| I-04 | Esame dell'imputato (se richiesto) |
| I-05 | Necessità di perito (sì/no) e, se sì, se va sentito **prima** (default) o **dopo** i testimoni |
| I-06 | Marcatura dei testimoni "lunghi" (durata maggiore) [NUOVO] |
| I-08 | Reato procedibile a querela (sì/no) e presenza della persona offesa, per abilitare i rinvii per trattative (§9-quater) [NUOVO] |
| I-07 | Presenza di imputati detenuti e scadenze (prescrizione, termini di custodia cautelare), per segnalare i fascicoli urgenti [NUOVO] |

---

## 3-bis. Udienza di incameramento: flusso [NUOVO, chiarito dal revisore]

L'istruttoria non si calendarizza all'arrivo del fascicolo, ma **all'esito dell'udienza di incameramento**, dopo l'ammissione delle prove.

| Cod. | Regola |
|---|---|
| N-01 | **Calendarizzazione dell'udienza di incameramento:** la data si fissa secondo la frequenza del §2 (3 mesi da GUP, 6 mesi da predibattimento). L'incameramento è un **blocco fisso di 1,5 h in totale per tutti i fascicoli** [DEFAULT, modificabile]: la durata **non dipende dal numero di fascicoli**, che non è preventivabile. L'app mostra il **tempo medio per fascicolo** (90 min diviso il numero di fascicoli assegnati) e, se il giudice imposta una soglia minima per fascicolo (parametro, nessun valore di default), avvisa quando viene superata. Il resto della fascia (345 min utili - 90 min = 255 min) si riempie con altre attività (G-07, G-10). Se nella stessa data confluiscono più origini (GUP, predibattimento, immediato), il blocco è **unico** per tutti i fascicoli [DA CONFERMARE]. |
| N-02 | **Sequenza all'udienza (apertura del dibattimento e ammissione delle prove)**, secondo il codice [CODICE]: (1) **accertamento della costituzione delle parti** (art. 484 ss.); (2) **questioni preliminari** (art. 491): competenza territoriale, nullità, costituzione di parte civile, citazione del responsabile civile e altre, che sono precluse se non proposte subito dopo l'accertamento della costituzione delle parti; si decidono con ordinanza; (3) **dichiarazione di apertura del dibattimento** e lettura dell'imputazione (art. 492); (4) **richieste di prova**: PM, parte civile, responsabile civile, persona civilmente obbligata, imputato, in quest'ordine, indicano i fatti da provare e chiedono l'ammissione (art. 493); (5) **ammissione delle prove** con ordinanza, sentite le parti (art. 495); (6) calendarizzazione dell'istruttoria (§4). Restano ammesse richieste di rito, MAP, riunione o remissione di querela (§9-quater, §9, §8). |
| N-03 | **Eccezioni, due esiti:** (a) **decisione sul momento** → si passa all'ammissione delle prove nella stessa udienza; (b) **riserva** → rinvio per scioglimento (§9-ter: sciolta in udienza oppure rinvio di 10 min alla prima data utile). Dopo lo scioglimento si ammettono le prove. |
| N-04 | **Ammissione delle prove:** il giudice ammette (o esclude) le prove richieste. L'app aggiorna l'elenco effettivo di testimoni per parte (dati I-02, I-03), l'esame dell'imputato, il perito e le durate (T-03). I dati inseriti prima dell'udienza sono **previsioni**; diventano definitivi dopo l'ammissione. |
| N-05 | **Calendarizzazione dell'istruttoria:** dopo l'ammissione delle prove si calendarizza §4 (con perito, §6). L'app propone le date, il giudice conferma. |
| N-06 | **Altre uscite dall'udienza di incameramento:** rinvio per riti o trattative (§9-quater); MAP (§9); riunione (§8); nomina del perito (§6). In questi casi l'istruttoria si calendarizza quando il flusso si chiude. |
| N-07 | **Istruttoria nella stessa udienza:** se resta tempo nella fascia dopo l'ammissione delle prove, il giudice può avviare subito l'assunzione dei testimoni. L'app propone solo se lo slot residuo basta per almeno un testimone. [DA CONFERMARE] |
| N-08 | **Stesse regole per GUP e predibattimento:** l'udienza di incameramento si svolge allo stesso modo per i fascicoli che arrivano dal **GUP** e per quelli che arrivano dal **predibattimento**. Cambia solo la **frequenza** (§2: quella da predibattimento è meno frequente). L'app conserva l'origine del fascicolo ma applica lo stesso flusso. |
| N-09 | **Questioni preliminari e riserva:** il codice prevede che le questioni preliminari (art. 491) siano proposte subito dopo l'accertamento della costituzione delle parti e decise con ordinanza. Nella tua prassi puoi decidere sul momento oppure riservarti e rinviare per lo scioglimento (G-12, §9-ter): l'app consente entrambe le strade. Dopo lo scioglimento si procede con apertura del dibattimento, richieste di prova e ammissione. [CODICE, DA VERIFICARE se il codice richieda la decisione immediata] |
| N-10 | **Prove fuori lista e atti concordati:** sono ammesse prove non comprese nella lista dell'art. 468 se la parte dimostra di non averle potute indicare tempestivamente (art. 493 c. 2); le parti possono concordare l'acquisizione di atti al fascicolo per il dibattimento (art. 493 c. 3). L'app prevede due campi: "prova fuori lista" e "atti concordati". [CODICE] |
| N-11 | **Raccolta e chiusura dei fascicoli di un incameramento (quando la lista è completa):** il numero di fascicoli in arrivo **non è preventivabile**, ma i termini di legge permettono di sapere quando la lista si chiude [CODICE]. Sia **D** la data dell'incameramento. (1) **GUP e predibattimento:** tra decreto o provvedimento e udienza passano almeno **20 giorni** (art. 429 c. 3; art. 554-ter c. 4): nessun nuovo fascicolo da queste origini può essere assegnato dopo **D-20**. (2) **Giudizio immediato** (e giudizio dopo opposizione a decreto penale): il decreto è notificato almeno **30 giorni** prima (art. 456 c. 3), quindi nessun nuovo immediato dopo **D-30**; l'imputato ha **15 giorni** per chiedere abbreviato, patteggiamento o MAP al GIP (art. 458 c. 1, con decorrenza dall'ultima notificazione tra decreto all'imputato e avviso al difensore, Corte cost. n. 120/2002), e in tal caso il fascicolo non arriva al dibattimento; il decreto è trasmesso al giudice del dibattimento **solo dopo la scadenza di quei termini** (art. 457). (3) **Lista definitiva:** per ogni immediato l'app calcola "data fine termine" = ultima notifica + 15 giorni; la lista è definitiva quando tutte queste date sono passate, cioè **al più tardi D-15** (se il preavviso di 30 giorni è stato rispettato). Fino ad allora gli immediati sono marcati "a rischio uscita". Poiché il blocco di incameramento è fisso (1,5 h in totale, N-01), la lista serve soprattutto per sapere **quanti fascicoli si dividono i 90 minuti** (tempo medio per fascicolo) e per organizzare con anticipo il resto della giornata: i **255 minuti residui** si possono riempire in modo definitivo già prima della chiusura della lista (G-07, G-08, G-10). Da **D-20** l'app mostra il numero di fascicoli sicuri e quello degli immediati a rischio. Se un fascicolo urgente richiede una data a meno del termine di legge, l'app avvisa e propone la data utile successiva. |
| N-12 | **Data più vicina ammissibile per un fascicolo:** (a) dal **GUP**: data del decreto che dispone il giudizio + **20 giorni** (art. 429 c. 3); nei procedimenti per omicidio colposo da violazione delle norme antinfortunistiche (art. 589 c. 2 e 589-bis c.p.) il termine tra decreto e giudizio **non può superare 60 giorni** (art. 429 c. 3-bis); (b) dal **predibattimento**: data del provvedimento + **20 giorni** (art. 554-ter c. 4); (c) dal **giudizio immediato**: data di notifica del decreto + **30 giorni** (art. 456 c. 3); lo stesso termine di 30 giorni vale per il giudizio dopo opposizione a decreto penale. [CODICE] L'app calcola questa data per ogni fascicolo e lo assegna al primo incameramento utile. |
| N-13 | **Differenze di rito per origine del fascicolo** [CODICE, DA VERIFICARE nel dettaglio]: (a) **dal predibattimento**: le questioni preliminari dell'art. 491 sono già state decise dal giudice predibattimentale e **non possono essere riproposte** all'udienza dibattimentale (art. 554-bis c. 3); la richiesta di abbreviato, patteggiamento, MAP e oblazione e la verifica della remissione di querela spettano al giudice predibattimentale, e le relative previsioni dell'art. 555 sono state abrogate; (b) **dal GUP**: le questioni preliminari si trattano all'incameramento (art. 491); (c) **dal giudizio immediato**: le richieste di abbreviato, patteggiamento e MAP si presentano al GIP entro 15 giorni dalla notifica (art. 458 c. 1; art. 456 c. 2), quindi al dibattimento il fascicolo arriva senza queste richieste, salvo diversa possibilità di legge da verificare. Il flusso §3-bis (N-02) si adatta all'origine: per i fascicoli da predibattimento l'app salta il passo delle questioni già decise e non offre richieste di rito o remissione, salvo l'ipotesi di nuova contestazione. |
| N-14 | **Liste di prova e udienza di incameramento:** le parti depositano le liste di testimoni, periti, consulenti e persone dell'art. 210 almeno **7 giorni** prima dell'udienza dibattimentale, a pena di inammissibilità (art. 468, art. 555 c. 1); vale per entrambe le origini. La scadenza è collegata a T-06 e PE-13. [CODICE] |
| N-15 | **Fascicoli da giudizio immediato:** il GIP, entro 5 giorni dalla richiesta del PM, emette il decreto o rigetta (art. 455); il decreto contiene luogo, giorno e ora dell'udienza davanti al giudice del dibattimento (art. 456 c. 1, richiamando l'art. 429) e l'avviso della facoltà di chiedere i riti alternativi (art. 456 c. 2). L'app registra per ogni immediato: data del decreto, data di notifica all'imputato, data di notifica dell'avviso al difensore, data fine termine dei 15 giorni (N-11), stato ("a rischio uscita" / "definitivo") e flag "detenuto" (immediato custodiale, art. 453 c. 1-bis). Il fascicolo entra nella tua lista come provvisorio e diventa definitivo alla scadenza dei termini (art. 457). **Frequenza e data dell'incameramento degli immediati: da definire** (domanda 1). |

**Stati del fascicolo** (utili per l'app):

| Stato | Si passa a |
|---|---|
| In attesa di incameramento | Udienza di incameramento celebrata |
| Eccezioni in riserva | Riserva sciolta → apertura del dibattimento |
| Dibattimento aperto, richieste di prova | Ordinanza di ammissione delle prove (art. 495) |
| Prove ammesse | Istruttoria da calendarizzare |
| Istruttoria calendarizzata | Istruttoria in corso → discussione (§5) |

---

## 4. Udienza istruttoria (si calendarizza dopo l'ammissione delle prove)

| Cod. | Regola |
|---|---|
| T-01 | Dopo l'udienza di incameramento e l'ammissione delle prove (§3-bis), si calendarizza l'udienza per sentire i testimoni. |
| T-02 | **Ordine di assunzione delle prove** [CODICE, VERIFICATO]: (1) **tra le parti**: PM, parte civile, responsabile civile, persona civilmente obbligata per la pena pecuniaria (il tuo "extra", e gli enti intervenuti), imputato (art. 493 c. 1, richiamato dall'art. 496 c. 1); le parti possono concordare un **ordine diverso** (art. 496 c. 2). (2) **Esame dell'imputato** (e delle altre parti private): si fa solo se richiesto o consentito e segue l'ordine parte civile, responsabile civile, civilmente obbligato, imputato (art. 503 c. 1); di regola ha luogo **appena terminata l'assunzione delle prove a carico**, quindi **prima dei testimoni a discarico** della difesa (art. 150 disp. att.). Questo è l'**ordine standard** dell'app. (3) **Inversione:** a volte l'ordine viene invertito, per esempio spostando l'esame dell'imputato dopo le prove a discarico. L'app offre l'azione "inverti ordine", che richiede di registrare l'**accordo delle parti** (art. 496 c. 2). [Chiarito dal giudice: l'inversione accade a volte] |
| T-03 | Durata media per testimone: **30 min** [DEFAULT]. Per i casi lunghi indicati dal giudice: **1 h** [DEFAULT]. Il giudice può indicare i casi lunghi per singola parte o singolo testimone. |
| T-04 | Se i testimoni non entrano nella fascia, l'app riempie la fascia rispettando l'ordine e **prosegue alla prima data utile** successiva. |
| T-05 | Vincolo di condizionamento: il giudice può subordinare la testimonianza di alcuni soggetti ad altri eventi (es. "imputato dopo il perito"). L'app rispetta il vincolo e segnala i conflitti. Se il vincolo sposta una prova fuori dall'ordine ordinario (art. 496 c. 1), l'app chiede di registrare l'**accordo delle parti** (art. 496 c. 2). [CODICE] |
| T-06 | **Liste testimoniali (art. 468):** le parti depositano la lista dei testimoni, con le circostanze dell'esame, **almeno 7 giorni prima della data del dibattimento, a pena di inammissibilità**. L'app registra per ogni parte "lista depositata (sì/no, data)" e segnala la scadenza (data dell'udienza di incameramento - 7 giorni). I testimoni possono essere citati per la data del dibattimento o per **udienze successive** (art. 468 c. 2): ogni testimone ha un campo "udienza di citazione". La **prova contraria** non richiede lista. Secondo la giurisprudenza riportata nei commentari, il termine è soggetto alla sospensione feriale. [CODICE, DA VERIFICARE] |
| T-07 | **Intervalli tra udienze istruttorie:** **nessun intervallo minimo o massimo** tra le udienze istruttorie dello stesso fascicolo: la prosecuzione va alla **prima data utile** (T-04). Tra un'istruttoria e la successiva, nella stessa giornata, si lascia un margine di **10 minuti** [DEFAULT, modificabile]. [CONFERMATO dal giudice] |

---

## 5. Discussione, repliche e art. 507 c.p.p.

| Cod. | Regola |
|---|---|
| D-01 | La discussione può svolgersi **subito dopo l'istruttoria**, nella stessa udienza, senza fissarne una a parte. |
| D-02 | Se la discussione è fissata in udienza separata, l'app suggerisce **30 min** [DEFAULT] e il giudice stabilisce la durata definitiva. |
| D-03 | Prima della discussione, terminata l'acquisizione delle prove, il giudice può disporre **nuove prove anche d'ufficio (art. 507 c.p.p.)** se risulta **assolutamente necessario**. Vale anche per mezzi di prova relativi agli atti già nel fascicolo del dibattimento (art. 507 c. 1-bis). L'app riapre l'istruttoria e ricalcola. |
| D-04 | All'udienza di discussione si prevede l'eventuale **replica: 10 min** [DEFAULT]. |
| D-05 | **Riapertura durante o dopo la discussione:** la discussione non può essere interrotta per nuove prove se non in caso di **assoluta necessità**; in tal caso il giudice procede ai sensi dell'art. 507 (art. 523 c. 6 c.p.p.). Secondo la giurisprudenza, il potere dell'art. 507 può essere esercitato anche a discussione terminata (Cass. pen. n. 10819/1993). L'app offre l'azione **"Riapri istruttoria (art. 507)"** disponibile in qualsiasi momento tra l'inizio della discussione e la deliberazione. [NUOVO] |
| D-06 | **Calendarizzazione della nuova istruttoria:** il giudice inserisce le nuove prove (testimoni, perito, documenti). L'app applica le regole di §4 (durate T-03, ordine T-02) e di §6 se c'è un perito, e propone la **prima data utile**, **il più vicino possibile** all'ordinanza (nessun intervallo minimo fisso; il tempo strettamente necessario per la citazione). Se c'è un perito valgono i termini di §6 (massimo 60 giorni). [Chiarito dal giudice: "meno possibile"] |
| D-07 | **Prove contrarie:** ammessa una prova nuova ex art. 507, le parti possono chiedere le prove contrarie (Cass. pen. n. 5401/2000). L'app riserva **il margine minimo possibile**: **10 min** [DEFAULT, sostituisce i 30 min precedenti, DA CONFERMARE come valore], aumentabile dal giudice se serve. [Chiarito dal giudice: "meno possibile"] |
| D-08 | **Rinnovazione della discussione:** se la discussione è stata interrotta per le nuove prove, essa deve **ricominciare dall'inizio**, non essere ripresa da dove si era fermata (commento all'art. 523; la Cass. pen. n. 44524/2008 sanziona con nullità l'acquisizione di documenti dopo le conclusioni senza rinnovare la discussione). L'app annulla lo stato "discussione svolta" e ricalendarizza discussione (**30 min**) e repliche (**10 min**) dopo la nuova istruttoria. |
| D-09 | **Ordine della discussione e ultima parola:** PM, poi difensori della parte civile, del responsabile civile, della persona civilmente obbligata, dell'imputato (art. 523 c. 1). La replica è ammessa una sola volta. **L'imputato e il difensore devono avere la parola per ultimi, se la chiedono, a pena di nullità** (art. 523 c. 5). L'app inserisce sempre lo slot dell'ultima parola alla fine, anche dopo le repliche. |
| D-10 | **Contatore e avvisi:** l'app conta le riaperture dell'istruttoria per fascicolo e segnala rischio **prescrizione**, termini di custodia e fascicoli con detenuti (E-03, E-04). |
| D-11 | **Stati del fascicolo:** da "discussione in corso" o "discussione conclusa" si torna a "istruttoria riaperta" (stato che prima non esisteva) → nuova istruttoria → nuova discussione. Registrazione nello storico (G-06). |

---

## 6. Perito

| Cod. | Regola |
|---|---|
*Verifica sul codice (artt. 508, 227, 501, 496 c.p.p.): le regole originali funzionano nella sostanza, con le correzioni sotto. Le correzioni sono marcate [CODICE].*

| Cod. | Regola |
|---|---|
| PE-01 | **Conferimento dell'incarico: 10 min circa** [CONFERMATO dal giudice]. Se il perito è dichiarato all'inizio, l'udienza di conferimento si prevede prima dei testimoni. Il conferimento comprende le formalità dell'art. 226 e la formulazione dei quesiti con le parti e i loro consulenti. [CODICE] |
| PE-02 | **Udienza per sentire il perito: entro un massimo di 60 giorni dall'ordinanza** (art. 508 c. 1). Il 60 non è un default ma un **limite di legge**. L'app propone **60 giorni** come valore massimo e **avvisa** (senza bloccare) se il giudice indica una data oltre il termine: i commentari lo qualificano come termine **ordinatorio**, quindi il giudice può forzare la data con avviso. Può anche scegliere un termine più breve. [CODICE] |
| PE-03 | **Collocazione dell'esame del perito:** prima dei testimoni (default) o dopo, a scelta del giudice. **L'inversione dell'ordine per il perito accade quasi mai** [chiarito dal giudice]: l'app non la propone di default, ma resta possibile. Il codice non fissa una posizione per il perito: l'ordine di assunzione parte dalle prove del PM e prosegue con quelle delle altre parti (art. 496 c. 1), e le parti possono concordare un ordine diverso (c. 2). La violazione dell'ordine non comporta nullità (Cass. pen. n. 11400/2015). [CODICE] |
| PE-04 | **Perito aggiunto in un secondo momento:** l'app ricalcola le udienze successive. Se la perizia è disposta dopo che l'acquisizione delle prove è terminata, si applicano le regole dell'art. 507 (§5, D-03 e D-05). |
| PE-05 | **Condizionamento di altre testimonianze al perito** (es. "imputato dopo il perito"): vedi T-02 (inversione) e T-05. Poiché l'esame dell'imputato ha una posizione propria (art. 150 disp. att.), metterlo dopo il perito richiede l'**accordo delle parti** (art. 496 c. 2). |
| PE-06 | Se il perito va sentito dopo i testimoni, l'ordine dell'istruttoria viene ricalcolato di conseguenza. [NUOVO] |
| PE-07 | **Perizia immediata:** se il giudice dispone la perizia, il perito è citato subito e deve esporre il parere **nello stesso dibattimento** (art. 508 c. 1). L'app offre l'opzione "perizia immediata": conferimento e risposta nella stessa udienza, senza l'udienza a 60 giorni. [CODICE] |
| PE-08 | **Relazione scritta:** se il perito è autorizzato a depositarla (art. 227 c. 5), deve farlo in cancelleria **almeno 7 giorni prima dell'udienza fissata per il suo esame** (art. 501 c. 1-bis). L'app crea la scadenza di deposito = data dell'esame - 7 giorni. La relazione si legge solo dopo l'esame del perito (artt. 508, 511 c. 3). Il termine di 7 giorni è **ordinatorio**: l'omesso o tardivo deposito non ha sanzioni e non invalida l'esame. L'app lo gestisce come **promemoria e avviso**, non come blocco. [CODICE] |
| PE-09 | **Esame del perito:** segue le regole dell'esame dei testimoni (art. 501 c. 1; art. 508 c. 3). Durata: **breve**, di regola per le perizie sulla **capacità di intendere e di volere** [chiarito dal giudice: "dura poco"]. Valore proposto: **30 min** [DEFAULT, modificabile per tipo di perizia, DA CONFERMARE come numero]. Per perizie più complesse il giudice può indicare una durata maggiore. |
| PE-10 | **Consulenti tecnici di parte** (artt. 225 e 230): campo per indicare i consulenti nominati da ciascuna parte, con slot opzionale per il loro esame (**30 min** ciascuno [DEFAULT, DA CONFERMARE]). Non c'è obbligo di esaminare il consulente dopo il perito se non è intervenuto durante l'incarico o le operazioni peritali (Cass. pen. n. 12610/2010). La parte che ha nominato un consulente deposita l'eventuale **relazione scritta almeno 7 giorni prima dell'udienza di esame** (art. 501 c. 1-bis e 1-ter); anche questa scadenza è un promemoria. [CODICE] |
| PE-11 | **Riserva in ogni passaggio della perizia (G-12, §9-ter):** il giudice può sempre riservarsi la decisione e sciogliere in udienza oppure rinviare per scioglimento (10 min, prima data utile [DEFAULT]) su: **ammissione della perizia**, **nomina o sostituzione del perito**, **formulazione dei quesiti**, **richieste dei consulenti di parte**, **richiesta di integrazione o nuova perizia dopo l'esame del perito**. Il termine massimo di 60 giorni per sentire il perito (PE-02) decorre dall'**ordinanza che dispone la perizia**, non dalla riserva: se la riserva è sulla stessa ammissione, l'app **avvia il conteggio dei 60 giorni solo dopo lo scioglimento** e l'ordinanza. [DA VERIFICARE] Finché la riserva è aperta, le udienze del perito e dei testimoni condizionati sono voci del calendario provvisorio personale (S-08). |
| PE-12 | **Termini più lunghi?** L'art. 227 prevede in generale un termine fino a 90 giorni, prorogabile a più riprese di 30 giorni e comunque non oltre 6 mesi, ma per la perizia in dibattimento l'art. 508 fissa un massimo di 60 giorni. Le proroghe in dibattimento sono un punto dubbio: l'app non le consente di default, ma permette al giudice di forzare una data oltre i 60 giorni con avviso. [DA VERIFICARE] |
| PE-13 | **Liste di periti e consulenti (art. 468):** le parti che vogliono l'esame di periti o consulenti tecnici depositano la lista con le circostanze dell'esame **almeno 7 giorni prima della data del dibattimento, a pena di inammissibilità**. L'app registra per ogni parte "lista depositata (sì/no, data)" e calcola la scadenza = data dell'udienza di incameramento - 7 giorni. La **prova contraria** non richiede lista. Il presidente può autorizzare la citazione per la data del dibattimento o per **udienze successive** in cui l'esame è previsto: l'app permette di indicare per ogni perito o consulente la data di citazione. [CODICE] |
| PE-14 | **Perito dell'incidente probatorio:** se un perito è stato nominato in incidente probatorio (art. 392 c. 2), il presidente ne dispone **d'ufficio la citazione** (art. 468 c. 5). L'app prevede il flag "perito da incidente probatorio" che crea in automatico lo slot dell'esame, senza bisogno di lista di parte. [CODICE] |

---

## 7. Fascicoli di predibattimento (due fasi)

### Fase 1: ricezione e fissazione

| Cod. | Regola |
|---|---|
| P-01 | Si ricevono i fascicoli e si fissa la data dell'udienza predibattimentale. **10 min per fascicolo** [DEFAULT]. |
| P-02 | La **sovrapposizione** di fascicoli nello stesso slot è possibile **solo su forzatura manuale del giudice**. |
| P-03 | Capienza indicativa: 345 min utili (senza la pausa 14:00-14:15) / 10 min = **34 fascicoli per udienza** (fino alle 15:00), fino a **37** usando la tolleranza fino alle 15:30 (G-09). L'udienza va riempita (G-07). [NUOVO] Carico tipico: **circa 30 fascicoli per udienza, a volte di più** [dichiarato dal giudice]: l'app avvisa quando si superano i 34 fascicoli (37 con la tolleranza) e consente la forzatura (P-02). |
| P-04 | **Intervallo minimo tra udienze predibattimentali: 5 settimane (35 giorni)** [DEFAULT, modificabile]. L'app non propone date che violino il minimo; il giudice può forzare (G-01). |
| P-05 | **Assistente alla scelta delle date:** quando si ricevono fascicoli di predibattimento (fase 1) l'app propone un elenco ordinato di **date candidate** (3-5) scelte tra i giorni di udienza del giudice, escludendo indisponibilità e rispettando P-04. Per ogni data mostra: giorni dalla precedente udienza predibattimentale, posti residui (P-03), minuti liberi (G-07), conflitti con altre udienze già fissate (incameramenti, rinvii) e scadenze dei fascicoli (prescrizione, custodia; E-03). Le date sono evidenziate in **verde** (idonea), **giallo** (ammissibile ma non ideale) o **rosso** (non consentita). Il giudice sceglie; l'app preferisce le date che riempiono meglio la fascia (G-11). Se esiste un termine minimo di comparizione per la citazione dei fascicoli, l'app lo considera come parametro. Vincoli di legge per la data [CODICE]: il decreto di citazione deve essere notificato **almeno 60 giorni prima** dell'udienza predibattimentale (**45 giorni** nei casi di urgenza motivata; art. 552 c. 3), e per alcuni reati (art. 590 c. 3 e 590-bis c.p.) la data di comparizione è fissata **non oltre 90 giorni** dall'emissione del decreto (art. 552 c. 1). L'app chiede per ogni fascicolo la **data di notifica** e calcola la data minima ammissibile. **Criterio di scelta del giudice:** la data **più comoda per studiare i fascicoli**. Per ogni data l'app mostra un indicatore di **comodità di studio**: giorni di calendario tra la ricezione dei fascicoli e la data, **giorni senza udienza** nei 14 giorni precedenti, numero di fascicoli da studiare (circa 30) e giorni liberi per fascicolo. È disponibile l'ordinamento "più comoda per lo studio" e le date sono evidenziate di conseguenza (verde, giallo, rosso). [Chiarito dal giudice] |

### Fase 2: esito all'udienza di predibattimento

| Cod. | Esito | Effetto | Slot successivo [DEFAULT] |
|---|---|---|---|
| P-10 | Prosecuzione del giudizio (rinvio a giudizio) | Se non ci sono le condizioni per il non luogo a procedere e non sono stati chiesti riti alternativi, il giudice predibattimentale **fissa l'udienza dibattimentale davanti a un giudice diverso** e restituisce il fascicolo del PM; tra il provvedimento e l'udienza devono passare **almeno 20 giorni** (art. 554-ter c. 3 e 4) [CODICE]. Il fascicolo **esce dal tuo calendario** di incameramento. L'app registra il giudice assegnatario e la data, e verifica il termine di 20 giorni. [CONFERMATO dal giudice: in caso di rinvio a giudizio il fascicolo va sempre a un altro giudice] | Nessuno slot nel tuo calendario |
| P-11 | Restituzione al PM / altri non luogo a procedere | Fascicolo chiuso | Nessuno |
| P-12 | **Rinotifica** | Nuova udienza non prima di **3 mesi**. Se la rinotifica va a buon fine si riapre l'elenco degli esiti | 10 min |
| P-13 | **Abbreviato** | Rinvio per discussione, poi eventuale rinvio per repliche | Discussione **30 min**; repliche **10 min** |
| P-14 | **Abbreviato condizionato** | Si indicano i testimoni e si apre l'istruttoria | Come §4 |
| P-15 | **Patteggiamento, remissione di querela, altri casi di non luogo a procedere** | Chiuso, oppure rinvio | Se rinvio: **10 min** |
| P-16 | **Nomina perito** | Si applicano le regole del §6 | Come §6 |
| P-17 | **Riunione** | Vedi §8 | 10 min |
| P-18 | **MAP (messa alla prova)** | Vedi §9 | Rinvio MAP 1 |

---

## 8. Riunione di fascicoli

| Cod. | Regola |
|---|---|
| R-01 | Se l'altro fascicolo è **già incamerato**: si fissa per entrambi la stessa udienza, in cui si decide la riunione (**10 min** [DEFAULT]). |
| R-02 | Altrimenti si fissa una riunione **fittizia di 10 min**, in attesa dell'arrivo del secondo fascicolo. |
| R-03 | Dopo la riunione i fascicoli diventano uno solo: le liste testimoni vengono unite e le durate ricalcolate. [NUOVO] |

---

## 9. Messa alla prova (MAP)

Valori ricavati dai protocolli di altri tribunali; **da sostituire con quelli del protocollo di Asti** appena disponibile. [ASTI]

| Cod. | Regola |
|---|---|
| M-01 | **Quando si può chiedere:** fino alla dichiarazione di apertura del dibattimento oppure, nel rito a citazione diretta, fino alla conclusione dell'udienza predibattimentale. L'app permette di aprire il flusso MAP da entrambe le fasi. |
| M-02 | **MAP 1:** verifica di ammissibilità dell'istanza. Se positiva, richiesta all'UEPE di indagine socio-familiare e programma di trattamento. Slot **10 min**. |
| M-03 | **MAP 2:** valutazione del programma, ordinanza di ammissione e sospensione del procedimento. Il giudice indica durata della sospensione e del lavoro di pubblica utilità. Slot **10 min**. Intervallo da MAP 1: **3 mesi** [DEFAULT; i protocolli variano da 3 a 6 mesi]. |
| M-04 | **MAP finale:** valutazione dell'esito. Se positivo, sentenza di estinzione del reato; se negativo, il processo riprende. Slot **10 min**. Intervallo dalla fine della prova: **60 giorni** [DEFAULT; i protocolli variano da 45 a 90 giorni]. |
| M-05 | Data di fine prova = data di sottoscrizione del verbale presso l'UEPE + durata della sospensione. Per la sottoscrizione si usa un default di **15-20 giorni** dall'ordinanza. |
| M-06 | **Limite legale** sulla durata della sospensione (art. 464-quinquies c.p.p.): a mia memoria 2 anni per reati con pena detentiva, 1 anno per sola pena pecuniaria. [DA VERIFICARE prima di usarlo come controllo bloccante] |
| M-07 | Durante la prova il fascicolo è **sospeso**: esce dall'istruttoria e dai conteggi di carico, ma resta visibile l'udienza di esito. La sospensione incide sul calcolo della prescrizione. [NUOVO] |
| M-08 | **Esito negativo o revoca:** il fascicolo rientra nel flusso ordinario (§4). Per l'eventuale udienza di revoca si prevede uno slot di **10 min**. |
| M-09 | Possibilità di aggiungere rinvii MAP supplementari (es. UEPE che chiede più tempo): slot **10 min**. |
| M-10 | Flag "citare la persona offesa" all'udienza di ammissione. [DA CONFERMARE] |

**Dati da registrare nel fascicolo MAP:** data istanza e attestazione UEPE; esito ammissibilità; data e durata della sospensione; ente e durata del lavoro di pubblica utilità; data di fine prova; esito finale.

---

## 9-bis. Incidenti di esecuzione [NUOVO, in gran parte VERIFICATO sul codice]

Non erano nel testo originale. La struttura segue il rito dell'esecuzione (artt. 665-676 c.p.p.) e vale per **tutti gli incidenti di competenza del giudice dell'esecuzione per i provvedimenti emessi dal giudice monocratico**. Il giudice dell'esecuzione è in regola il giudice che ha pronunciato il provvedimento da eseguire (art. 665), quindi questi fascicoli arrivano dopo la sentenza o il decreto penale. Le parti marcate [CODICE] sono state verificate sul testo del codice; il resto resta da confermare.

| Cod. | Regola |
|---|---|
| X-01 | **Ingresso:** il fascicolo di esecuzione si apre su istanza (del condannato, del difensore, del PM) o d'ufficio. Dati di input: nome del condannato, provvedimento da eseguire (sentenza/decreto), tipo di questione, parti (PM, difensore, eventuale persona offesa), stato di detenzione. |
| X-02 | **Tipi di incidente** [CODICE, artt. 667-676]. Elenco completo per il giudice dell'esecuzione monocratico, ognuno con durate modificabili: (a) **dubbio sull'identità fisica della persona detenuta** (667); (b) **condannato per errore di nome** (668); (c) **pluralità di sentenze per il medesimo fatto** contro la stessa persona (669); (d) **questioni sul titolo esecutivo** (670); (e) **concorso formale e reato continuato** (671); (f) **amnistia e indulto** (672); (g) **revoca della sentenza di condanna o del decreto penale per abolizione del reato**, e allo stesso modo in caso di sentenza di proscioglimento o di non luogo a procedere per estinzione del reato o mancanza di imputabilità (673); (h) **revoca di altri provvedimenti**: sospensione condizionale della pena, grazia, amnistia e indulto condizionati, non menzione della condanna (674); (i) **falsità di documenti** (675); (j) **altre competenze** (676): estinzione del reato dopo la condanna, estinzione della pena, confisca, restituzione delle cose sequestrate, riduzione di pena ex art. 442 c. 2-bis. L'elenco è modificabile, con campo "altro". |
| X-03 | **Due percorsi procedurali** [CODICE]: (A) **rito ordinario (art. 666)**: per le materie degli artt. 668-675 e per le altre non incluse in (B); l'istanza può essere dichiarata inammissibile "de plano" solo se ripropone gli stessi elementi già respinti o è manifestamente infondata per difetto delle condizioni di legge (art. 666 c. 2); il rigetto nel merito richiede invece l'udienza camerale. (B) **rito semplificato (art. 667 c. 4)**: per le materie dell'art. 667 (identità fisica) e dell'art. 676: il giudice decide con **ordinanza senza formalità**, comunicata al PM e notificata all'interessato. L'app assegna il percorso in base al tipo di incidente. |
| X-04 | **Impugnazione della decisione senza formalità** [CODICE]: nel percorso (B) contro l'ordinanza si propone **opposizione davanti allo stesso giudice**, a pena di decadenza, **entro 15 giorni** dalla comunicazione o notificazione, e si procede poi nelle forme dell'art. 666. L'app calcola la scadenza dalla data di notifica. Nel percorso (A), se il giudice dichiara l'inammissibilità de plano, il rimedio non è l'opposizione ma il **ricorso per cassazione** (la giurisprudenza qualifica così l'impugnazione fuori dalle materie degli artt. 667 e 676). |
| X-05 | **Udienza camerale (art. 666):** si fissa con **avviso alle parti e ai difensori di almeno 10 giorni** prima [DA VERIFICARE c. 3]. L'app impedisce date che violino il preavviso. Partecipazione necessaria di PM e difensore. Per l'opposizione contro l'ordinanza sulla **confisca**, su istanza degli interessati l'udienza si svolge in forma **pubblica** (Corte cost. n. 109/2015). [CODICE] |
| X-06 | **Durata slot** udienza camerale: **10 min** [DEFAULT, modificabile per tipo di incidente]. Per questioni complesse (es. continuazione tra molte sentenze) il giudice può indicare 20-30 min. [CONFERMATO dal giudice: di regola 10 min] |
| X-07 | **Frequenza e collocazione:** non ci sono date dedicate. Le udienze di esecuzione si **trattano insieme ad altre udienze** (udienze miste, G-10), come attività da **10 min** che l'app propone per riempire i minuti liberi (G-07, G-08). L'app sceglie la **prima data utile** con 10 minuti liberi, rispettando il preavviso dell'udienza camerale (X-05) e le priorità (X-08). [Chiarito dal giudice] |
| X-08 | **Priorità:** se il condannato è **detenuto**, o se l'incidente può incidere sul fine pena (es. continuazione, titolo esecutivo), il fascicolo è marcato urgente e l'app propone la prima data utile. |
| X-09 | **Acquisizione documenti:** possibile rinvio per acquisire atti (sentenze, certificati, informazioni dell'ufficio esecuzioni). Slot **10 min**, intervallo **30 giorni** [DEFAULT]. |
| X-10 | **Sospensione dell'esecuzione:** flag che indica se il giudice ha sospeso l'esecuzione in attesa della decisione. Se sì, l'app segnala il fascicolo come urgente. |
| X-11 | **Esito:** ordinanza (accoglimento, rigetto, inammissibilità); poi **ricorso per cassazione** nei termini di legge, con scadenza segnalata a calendario. Fascicolo chiuso o rinviato. |
| X-12 | **Riunione di incidenti** dello stesso condannato (es. più istanze di continuazione): si applicano le regole di §8 (slot 10 min). |
| X-13 | **Competenza del giudice dell'esecuzione (art. 665)** [CODICE]: è competente il giudice che ha deliberato il provvedimento. Se è stato proposto appello e il provvedimento è stato confermato o riformato **solo in relazione a pena, misure di sicurezza o disposizioni civili**, è competente il giudice di primo grado; altrimenti il giudice di appello. Se l'esecuzione riguarda **più provvedimenti di giudici diversi**, è competente il giudice che ha emesso per ultimo il provvedimento irrevocabile. Se riguarda più provvedimenti emessi dal tribunale in **composizione monocratica e collegiale**, è competente **in ogni caso il collegio** (art. 665 c. 4-bis). L'app, all'apertura del fascicolo, chiede quali provvedimenti sono in esecuzione e **segnala se la competenza non è del giudice monocratico**. |
| X-14 | **Pluralità di istanze o di condanne:** per continuazione, titolo esecutivo e pluralità di sentenze l'app permette di collegare più provvedimenti (sentenze, decreti) allo stesso fascicolo di esecuzione e di segnalare conflitti di competenza (X-13). |

---

## 9-ter. Rinvii per scioglimento della riserva [NUOVO, DA CONFERMARE]

Regola trasversale: vale in **qualsiasi fase** (predibattimento, istruttoria, discussione, MAP, esecuzione). Il giudice si riserva di decidere su una questione e rinvia a un'udienza successiva per comunicare la decisione. Prima non era prevista come funzione esplicita (c'era solo la regola generale G-04 sui rinvii).

| Cod. | Regola |
|---|---|
| S-01 | **Azione "riservo la decisione":** in qualsiasi udienza il giudice può aprire una riserva su una questione, scegliendo il tipo (vedi S-02). Alla chiusura della riserva l'app offre due strade: **(a) sciolta in udienza** (stessa udienza, **nessun rinvio**, caso di regola) oppure **(b) rinvio per scioglimento**, che crea un nuovo slot (S-03, S-04). [Chiarito dal giudice] |
| S-02 | **Tipi di riserva: elenco aperto.** Le riserve possono essere svariate e non sono preventivabili: l'app non limita i tipi. Il giudice descrive la questione in un **campo libero** e può usare suggerimenti rapidi (ammissione di prove, eccezioni preliminari, istanze di parte, ammissibilità di rito o MAP, riunione, nomina del perito, decisione nel merito). [Chiarito dal giudice] |
| S-03 | **Slot:** **10 min** [DEFAULT, modificabile per tipo]. |
| S-04 | **Quando si fissa il rinvio per scioglimento:** **il prima possibile**, cioè alla **prima data utile** del calendario con 10 minuti liberi [DEFAULT, modificabile per tipo e per singola riserva]. Non c'è un numero fisso di giorni. L'app propone la prima data disponibile (rispettando indisponibilità, termini di legge e G-07) e il giudice può scegliere un'altra data. [Chiarito dal giudice] |
| S-05 | **Scioglimento:** all'udienza fissata il giudice **legge l'ordinanza** che scioglie la riserva e il procedimento prosegue. L'app registra data, testo o allegato dell'ordinanza e un esito in **campo libero**, e riprende il flusso dal punto in cui era stato interrotto (S-06). [Chiarito dal giudice] |
| S-06 | **Esiti e conseguenze:** poiché le riserve non sono preventivabili, l'app non presuppone esiti. Dopo la lettura dell'ordinanza chiede al giudice **"come si prosegue?"** proponendo i passaggi più probabili per la fase in cui era la riserva (es. prove ammesse → calendarizza l'istruttoria, §4; perito nominato → §6; MAP ammessa → §9; riunione disposta → §8; abbreviato ammesso → P-13). Il giudice sceglie. |
| S-07 | **Nuova riserva:** all'udienza di scioglimento il giudice può riservarsi di nuovo (applicazione di G-04). L'app tiene traccia del numero di riserve e rinvii per fascicolo. |
| S-08 | **Calendarizzazione all'esito, con calendario provvisorio personale:** la calendarizzazione **ufficiale** delle udienze che dipendono da una riserva (es. l'istruttoria successiva) avviene **solo dopo lo scioglimento**, cioè all'esito. In attesa, l'app tiene un **calendario provvisorio ad uso personale** del giudice: le voci provvisorie sono "appunti personali", visibili in un livello separato del calendario, **non vincolanti**, **non incluse** nell'esportazione ufficiale (PDF/ICS, E-06) e **non conteggiate** nella saturazione della fascia (G-07). L'app segnala comunque le sovrapposizioni con voci ufficiali. Allo scioglimento il giudice può **convertire** la voce provvisoria in ufficiale (con le regole del §4 o del flusso corrispondente) oppure **eliminarla**. [Chiarito dal giudice] |
| S-09 | **Priorità e scadenze:** se sono in gioco termini di prescrizione o custodia, o il fascicolo riguarda un detenuto, la riserva è marcata urgente: il rinvio resta alla prima data utile e l'app segnala il rischio se la data proposta è vicina a una scadenza. |
| S-10 | **Riserva sulla sentenza:** quando il giudice si riserva la decisione finale si prevede un rinvio per la **lettura del dispositivo** (slot 10 min). Il **termine per il deposito della motivazione** è un'altra cosa: è una scadenza, non un'udienza. L'app la registra come promemoria sul fascicolo, con **15 giorni** come default e possibilità di indicarne 30 o 90 [DA VERIFICARE su art. 544 c.p.p.]. |
| S-11 | **Sovrapposizione nel predibattimento:** se la riserva riguarda un fascicolo di predibattimento, lo slot di scioglimento è sempre di 10 min e rientra nella capienza di P-03. |

---

## 9-quater. Rinvii per accesso ai riti alternativi e per trattative (remissione di querela) [NUOVO, DA CONFERMARE]

Regola trasversale, applicabile a predibattimento e dibattimento. Il giudice rinvia per dare alle parti il tempo di chiedere un rito alternativo o di trattare una definizione consensuale.

| Cod. | Regola |
|---|---|
| Z-01 | **Azione "rinvio per riti/trattative":** il giudice sceglie il motivo e l'app crea il rinvio. |
| Z-02 | **Motivi, secondo la fase** [Chiarito dal giudice]: **solo in predibattimento** (rinvio per accesso ai riti): (a) richiesta di **abbreviato**; (b) richiesta di **patteggiamento** (serve il consenso del PM); (c) richiesta di **MAP** (poi si applica §9); (d) **oblazione**. **In predibattimento e in dibattimento** (trattative): (e) trattative per **remissione di querela**; (f) **risarcimento o condotte riparatorie**; (g) **mediazione** con la persona offesa. In dibattimento l'app non offre i motivi (a)-(d). [Elenco modificabile] |
| Z-03 | **Slot:** **10 min** [DEFAULT, modificabile per motivo]. |
| Z-04 | **Intervallo: deciso caso per caso dal giudice.** L'app propone **30 giorni** per il **primo rinvio** [DEFAULT, modificabile], e **intervalli più lunghi** per i rinvii successivi, secondo le esigenze: ogni rinvio successivo propone l'intervallo precedente **+ 30 giorni** [suggerimento, DA CONFERMARE], sempre modificabile per motivo e per singolo rinvio. Per le condotte riparatorie e i pagamenti rateali l'intervallo può essere più lungo, con tetto indicato dal giudice (art. 162-ter c.p., da verificare). [Chiarito dal giudice] |
| Z-05 | **Citazione della persona offesa:** flag per citarla all'udienza di rinvio, utile soprattutto per trattative di remissione. |
| Z-06 | **Contatore dei rinvii (solo informativo):** l'app conta e mostra i rinvii per riti/trattative di ogni fascicolo, ma **non c'è una soglia** né un avviso: il giudice non ha un numero massimo di rinvii da concedere. Il contatore serve solo come storico (G-06). [Chiarito dal giudice] |
| Z-07 | **Esiti all'udienza di rinvio:** <br>• **Richiesta di rito presentata** → si apre il flusso corrispondente: abbreviato (P-13), abbreviato condizionato (P-14), patteggiamento (P-15), MAP (§9). <br>• **Remissione di querela depositata e accettata** → fascicolo chiuso (P-15). <br>• **Remissione non ancora perfezionata** → nuovo rinvio (Z-01), con il contatore. <br>• **Trattative fallite o nessuna richiesta** → si riprende il flusso ordinario (istruttoria, §4). |
| Z-08 | **Stato della remissione:** campi nel fascicolo: reato procedibile a querela (sì/no), persona offesa, trattative in corso, remissione depositata, accettazione dell'imputato. L'app mostra la remissione come perfezionata solo se sono presenti entrambe. [DA VERIFICARE le regole di accettazione e di efficacia con più imputati] |
| Z-09 | **Calendarizzazione dopo l'esito:** di regola il giudice **calendarizza le udienze successive (istruttoria) dopo l'esito del rinvio**, non prima. Finché il rinvio per riti o trattative è aperto, le udienze che ne dipendono restano nel **calendario provvisorio personale** (S-08), non in quello ufficiale. Se un'istruttoria era già stata fissata, il giudice sceglie per fascicolo se resta o slitta a cascata (E-02), con i vincoli di prescrizione ed E-03. [Chiarito dal giudice] |
| Z-10 | **Limiti di tempo per la richiesta del rito:** ogni rito ha un termine processuale (es. richiesta di abbreviato o patteggiamento prima dell'apertura del dibattimento o, nel rito a citazione diretta, entro la conclusione del predibattimento). L'app segnala che un rinvio oltre quel limite non consentirebbe la richiesta. [DA VERIFICARE i termini per ciascun rito] |
| Z-11 | **Priorità:** se il fascicolo riguarda un detenuto o ha una scadenza di prescrizione vicina, la richiesta di rinvio genera un avviso e l'intervallo proposto si accorcia (E-03, E-04). |
| Z-12 | **Più imputati:** il rinvio può riguardare un solo imputato; l'app permette di separare la sua posizione dal resto del fascicolo o di tenerlo unito (a scelta del giudice). |

---

## 10-bis. Come si riempiono gli slot vuoti [NUOVO]

Sviluppa G-07, G-08 e G-10. L'app **segnala ogni slot vuoto e indica con cosa riempirlo**; il giudice decide (G-01).

| Cod. | Regola |
|---|---|
| F-01 | **Individuazione dei vuoti:** per ogni giornata l'app calcola gli intervalli liberi nella fascia 9:00-15:00, esclusa la pausa 14:00-14:15 (G-14). Un vuoto ha **orario di inizio, di fine e durata**. I residui **inferiori a 10 minuti** non sono riempibili: sono contati come margine (T-07). La tolleranza 15:00-15:30 non è considerata vuoto (G-09). |
| F-02 | **Candidati ammessi** (il giudice può disattivare ciascuna categoria): (a) **urgenze**: fascicoli con detenuti, prescrizione o termini di custodia vicini (E-03, E-04); (b) **prosecuzione di istruttorie** già iniziate, spezzando l'assunzione dei testimoni (T-04, T-03); (c) **rinvii per scioglimento di riserva**, 10 min, alla prima data utile (S-04); (d) **rinvii per riti e trattative**, 10 min (§9-quater); (e) **udienze MAP** (MAP 1, MAP 2, MAP finale), 10 min (§9); (f) **incidenti di esecuzione**, 10 min (X-06, X-07); (g) **conferimento incarico al perito**, 10 min, ed **esame del perito** (§6); (h) **discussione** (30 min) e **repliche** (10 min) da fissare (§5); (i) **riapertura istruttoria ex art. 507** (D-06); (j) **istruttorie da calendarizzare** dopo l'ammissione delle prove (§3-bis, N-05); (k) **riunioni** (10 min, §8); (l) voci del **calendario provvisorio personale** (S-08), proposte come "da confermare" quando la loro condizione si è verificata. |
| F-03 | **Un candidato è proponibile in un vuoto solo se**: (1) la sua **durata** entra nel vuoto (o può essere spezzata, come per i testimoni, T-04); (2) la **data** rispetta i termini di legge e i vincoli del fascicolo: preavviso di 10 giorni per l'esecuzione camerale (X-05), 20 giorni per l'incameramento (N-12), 60 giorni massimo per il perito (PE-02), ordine delle prove (T-02), vincoli di condizionamento (T-05); (3) **non è già programmato** altrove; (4) non crea conflitto con altre voci ufficiali. |
| F-04 | **Ordine di priorità:** (1) urgenze (E-04); (2) candidati con **scadenza di legge più vicina**; (3) **prosecuzione di istruttorie già iniziate**, per non allungare i tempi di un fascicolo; (4) rinvii che richiedono la **prima data utile** (riserve, S-04); (5) **anzianità** del fascicolo in attesa (giorni dall'ultima udienza); (6) **adattamento al vuoto** (preferire il candidato che lascia il residuo minore); (7) tipo di udienza già in corso nella giornata, per limitare la dispersione tra attività diverse (G-10). I criteri sono modificabili. |
| F-05 | **Cosa mostra l'app per ogni vuoto:** orario e durata, e un elenco ordinato di **3-5 candidati** con, per ciascuno: fascicolo, attività, durata, **motivo della proposta** (es. "scadenza prescrizione tra 20 giorni", "prima data utile per scioglimento riserva"), eventuale residuo che lascerebbe. Azioni: **accetta**, **rifiuta**, **modifica durata**, **sostituisci**. |
| F-06 | **Riempimento in blocco:** azione "riempi la giornata": l'app propone in anteprima una combinazione di candidati che copre **tutti i vuoti** (riempimento a incastro, riducendo al minimo il residuo), il giudice conferma o modifica le singole voci. Nulla viene inserito senza conferma (G-01). |
| F-07 | **Vuoti che non si riescono a riempire:** se non ci sono candidati compatibili, l'app lo segnala e propone, in ordine: (1) **anticipare** attività già programmate in date successive, purché i termini di legge lo consentano; (2) **allungare** un'attività esistente (es. più testimoni nella stessa istruttoria); (3) lasciare il vuoto **evidenziato** come "non riempito". Il giudice può chiudere l'udienza con minuti liberi (G-07). |
| F-08 | **Quando l'app propone di riempire:** (a) alla **chiusura della lista di un incameramento** (N-11); (b) quando si **cancella o sposta** un'attività; (c) quando **cade una riserva** o un rinvio; (d) a **richiesta**, in qualunque momento. L'app rivaluta i vuoti dopo ogni modifica (E-02). |
| F-09 | **Giornate con blocchi fissi:** per le giornate con un incameramento (blocco di 90 min, N-01) o con una predibattimentale (10 min per fascicolo, P-01), l'app riempie i **minuti rimasti** con le stesse regole. Il blocco dell'incameramento è considerato fisso anche se i fascicoli sono pochi. |
| F-10 | **Esempi (default):** vuoto di 10 min → riserva da sciogliere, rinvio per trattativa, MAP, esecuzione, conferimento incarico al perito; vuoto di 30 min → un testimone, una discussione, l'esame breve di un perito sulla capacità di intendere e volere; vuoto di 90 min → blocco di incameramento, oppure 3 testimoni, oppure combinazione di rinvii da 10 min. |

---

## 10. Motore di calcolo e gestione conflitti [NUOVO]

| Cod. | Regola |
|---|---|
| E-01 | Se un'udienza è piena, l'app propone la **prima data libera** compatibile con frequenze e intervalli minimi. |
| E-02 | Un cambio di data o di durata **ricalcola a cascata** le udienze dipendenti (es. slitta il perito → slittano i testimoni condizionati). |
| E-03 | Segnalazione di **rischio prescrizione** e di scadenza dei **termini di custodia cautelare**. |
| E-04 | Priorità di calendarizzazione per fascicoli con detenuti o termini in scadenza. |
| E-05 | Segnalazione dei conflitti tra vincoli (es. ordine imposto non realizzabile nelle date disponibili). |
| E-06 | Esportazione del calendario (PDF/ICS) e promemoria. |

---

## 11. Punti aperti da chiarire

| N. | Domanda |
|---|---|
| 1 | **Frequenza dell'udienza di incameramento:** [Chiarito: da GUP 1 volta ogni 3 mesi, da predibattimento 1 volta ogni 6 mesi; blocco fisso di 1,5 h in totale per tutti i fascicoli, a prescindere dal numero. Quando la lista è completa: D-20 per GUP e predibattimento, D-30 per gli immediati, lista definitiva al più tardi D-15 (N-11). Il giudice del dibattimento non tiene udienze GUP; le predibattimentali sono almeno ogni 5 settimane, con aiuto dell'app per le date (P-04, P-05).] Resta da chiarire: gli **immediati** si incamerano nelle stesse date di quelli da GUP, o in date proprie? Con che frequenza? Se nella stessa data arrivano più origini, il blocco di 1,5 h è unico? |
| 2 | **Ordine di assunzione delle prove:** [CHIUSA: verificato sul codice e confermato dal giudice, vedi T-02. "Extra" = persona civilmente obbligata ed eventuali enti intervenuti.] |
| 3 | **Intervallo tra udienze istruttorie:** [CHIUSA: nessun intervallo, prima data utile; margine di 10 minuti tra due istruttorie nella stessa giornata, confermato (T-07).] |
| 4 | **Rinvio a giudizio dal predibattimento:** [Chiarito: la prima udienza dibattimentale è l'udienza di incameramento, blocco di 1,5 h in totale per tutti i fascicoli, con le stesse regole del GUP (N-08).] |
| 5 | **Udienze predibattimentali:** [CHIUSA: circa 30 fascicoli per udienza, a volte di più (P-03); tra le date suggerite scelgo la più comoda per studiare i fascicoli (P-05); se c'è rinvio a giudizio il fascicolo va sempre a un altro giudice (P-10).] |
| 6 | **MAP (protocollo di Asti):** intervalli MAP 1 → MAP 2 e fine prova → esito; termini per la firma del verbale all'UEPE; durate degli slot. |
| 7 | **Limite di durata della sospensione MAP:** conferma dei valori di legge. |
| 8 | **Ambito dell'app:** [CHIUSA: l'app è per **un solo magistrato** (G-13).] |
| 10 | **Incidenti di esecuzione:** [CHIUSA: tutti quelli di competenza del giudice monocratico secondo il codice (X-02); di regola 10 min, trattati insieme ad altre udienze, senza giornate dedicate (X-06, X-07).] |
| 11 | **Incidenti di esecuzione:** [Verificato sul codice: opposizione entro 15 giorni (art. 667 c. 4), due percorsi (X-03), competenza (X-13).] Resta da verificare il preavviso di 10 giorni dell'udienza camerale (X-05). |
| 12 | **Riserve:** [CHIUSA: svariate, non preventivabili; di regola sciolte in udienza; se serve il rinvio, il prima possibile; allo scioglimento si legge l'ordinanza e si prosegue; calendarizzazione ufficiale all'esito, con calendario provvisorio personale (S-01, S-02, S-04, S-05, S-06, S-08).] |
| 13 | **Rinvii per riti e trattative:** [CHIUSA: i rinvii per riti solo in predibattimento; le trattative anche in dibattimento; intervallo deciso caso per caso, di regola 30 giorni per il primo rinvio e più lungo dopo; calendarizzazione dopo l'esito; nessun limite al numero di rinvii (Z-02, Z-04, Z-06, Z-09).] |
| 14 | **Riapertura ex art. 507:** [CHIUSA: nuova udienza il più vicino possibile all'ordinanza e spazio minimo per le prove contrarie (D-06, D-07).] Resta da confermare il valore minimo di 10 min per le prove contrarie. |
| 15 | **Ordine dell'esame dell'imputato e perito:** [CHIUSA: ordine standard dal codice (art. 503 c. 1, art. 150 disp. att.), con inversione possibile e a volte usata, previo accordo delle parti (T-02); per il perito l'inversione accade quasi mai (PE-03); conferimento dell'incarico circa 10 min (PE-01); esame del perito breve, in genere sulla capacità di intendere e di volere (PE-09).] Resta da confermare il valore di 30 min per l'esame del perito. |
| 16 | **Fascia oraria e saturazione (G-02, G-07 … G-11, G-14):** [CHIUSA: udienze miste ammesse (G-10); fine udienza alle 15:00 con tolleranza fino a un massimo di 15:30 (G-02, G-09); una sola pausa 14:00-14:15 (G-14); l'app cerca di riempire tutto e propone attivamente i candidati per ogni vuoto (G-08).] |
| 9 | **Riservatezza e dati personali:** [CHIUSA: opzione A, dati solo sul dispositivo del giudice, senza cloud (G-15).] Resta da confermare il backup manuale, la password e la cifratura del file. |
