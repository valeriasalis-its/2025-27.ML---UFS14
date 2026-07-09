# README X-force 

# Sistema di Raccomandazione Musicale

 Questo documento descrive l'architettura concettuale, i processi di sviluppo e la strategia di gestione del nuovo algoritmo di raccomandazione musicale della nostra piattaforma di streaming.

---



## 1. Organizzazione del Team & Ruoli
Il team è composto da 3 persone, con responsabilità mappate chiaramente per massimizzare l'efficienza:
* **Product Manager (PM):** Custode degli obiettivi di business, dell'analisi dei rischi e del processo di onboarding/handover.
* **Tester (QA & MLOps):** Responsabile delle metriche di validazione, delle strategie di monitoring, delle soglie di alert del modello e della stabilità predittiva.
* **Markdown Writer (Tech Lead):** Responsabile della traduzione tecnica delle discussioni, della struttura dei dati e del mantenimento di questo repository.


### Processo di Lavoro del Team
Essendo un team ridotto a 3 persone, adottiamo un flusso di lavoro snello ma rigoroso per evitare che le informazioni restino "dette a voce":
1. **Ideazione Co-gestita:** Qualsiasi nuova feature o modifica parte da un brainstorming a 3. Il PM definisce i requisiti utente, il Tester i vincoli di qualità e lo Scrittore l'architettura.
2. **Sviluppo e Documentazione Parallela:** Mentre il Tester progetta i criteri di validazione, lo Scrittore aggiorna i file del repository. Nessuna idea viene implementata se lo Scrittore non l'ha prima strutturata nel README.
3. **Tracciamento delle Decisioni (Il Vincolo):** Se durante lo sviluppo emerge un bivio (es. cambiare una metrica), il team si ferma, discute e lo Scrittore compila una nuova voce nel `DECISION_LOG.md`. Solo dopo l'approvazione scritta del PM e del Tester la decisione diventa effettiva.


---

## 2. Analisi del Problema e Obiettivi

### Il Problema
Il nostro attuale sistema di streaming propone contenuti troppo generici o basati solo sulle tendenze globali. Questo causa una stagnazione del tempo di ascolto e un alto tasso di abbandono (churn) degli utenti che non trovano rapidamente musica affine ai loro gusti, specialmente per quanto riguarda la scoperta di nicchie o nuovi artisti.

### Obiettivi di Business & UX
* **Aumentare il Retention Rate:** Incrementare del 15% il tempo medio di ascolto giornaliero per utente entro i primi 3 mesi dal rilascio.
* **Migliorare l'Ingaggio:** Aumentare la percentuale di brani scoperti tramite playlist automatiche (es. *Daily Mix*) che vengono effettivamente salvati nei preferiti dagli utenti.
* **Ridurre lo "Frustration Skip":** Abbassare il tasso di canzoni saltate nei primi 15 secondi di riproduzione.

---

## 3. Strategia dei Dati
Per addestrare e far funzionare il modello, raccoglieremo e utilizzeremo i seguenti dati:

| Tipologia di Dato | Esempio Specifico | Perché è utile? (Razionale) |
| :--- | :--- | :--- |
| **Feedback Implicito** | Skip della canzone (<15s), tempo di ascolto totale, ripetizione del brano. | È il segnale più onesto del comportamento dell'utente; non richiede azioni manuali. |
| **Feedback Esplicito** | "Aggiungi ai preferiti", "Inserisci in playlist", "Nascondi questa canzone". | Indica una forte intenzione e preferenza conscia da parte dell'utente. |
| **Metadati del Contenuto** | Genere, BPM (battiti al minuto), artista, anno di uscita, mood acustico. | Permette di trovare canzoni strutturalmente simili a quelle già amate. |
| **Dati Contestuali** | Orario di ascolto, giorno della settimana, tipo di dispositivo. | Il comportamento cambia radicalmente se l'utente ascolta musica il lunedì mattina o il sabato sera. |

---

## 4. Ciclo di Vita del Modello ML

### A. Raccolta Dati
La telemetria dell'applicazione invia eventi anonimizzati in tempo reale (es. `song_started`, `song_skipped`) a un data lake centralizzato.

### B. Training
Il modello viene addestrato in modalità **Batch (offline)** su cluster dedicati durante le ore notturne a minor traffico per ridurre i costi infrastrutturali.

### C. Validazione (Sbarramenti di Qualità)
Prima del rilascio, il Tester supervisiona il superamento di due sbarramenti di qualità:

1. **Validazione Offline (Pre-rilascio):** Eseguita in ambiente di staging utilizzando i dati storici degli ascolti dell'ultimo mese divisi in 80% training e 20% test set. La metrica principale è l'**NDCG@10**, che valuta la capacità di posizionare i brani corretti tra i primi 10 risultati. La soglia di accettazione per l'approvazione è un NDCG@10 **>= 0.65**.
2. **Validazione Online (A/B Testing):** Il **90%** degli utenti (Gruppo di Controllo) continua a usare il vecchio algoritmo, mentre il **10%** (Gruppo di Test) riceve le nuove raccomandazioni. Il test dura **14 giorni** per coprire i balletti di comportamento feriali/festivi. Il modello viene promosso se il Gruppo di Test mostra un incremento del tempo di ascolto giornaliero di almeno il **+5%** rispetto al controllo.

### D. Deploy
Il modello validato viene esposto tramite API private. L'applicazione interroga l'endpoint inviando l'ID utente e riceve la lista dei brani consigliati. Il tempo di risposta target ottimale è < 100ms.

---

## 5. Strategia MLOps & Manutenzione

### Logiche di Retraining

* **Retraining Pianificato (Ordinario):** Avviene su base **settimanale** (ogni venerdì notte alle ore 03:00). Il venerdì coincide con il "New Music Friday" (rilascio internazionale di nuovi album), consentendo di includere le novità del mercato pronte per i weekend ottimizzando i costi cloud.
* **Retraining Straordinario / Event-Driven:** Il modello viene gestito in modo mirato in presenza di anomalie macroscopiche stagionali:
  * *Periodo Natalizio:* Da fine novembre al 26 dicembre i dati a tema natalizio vengono isolati ed esclusi dal dataset principale per evitare di raccomandare canti di Natale a gennaio.
  * *Grandi Eventi Nazionali (es. Sanremo) o Trend Virali:* Si monitora il drift e si valuta l'attivazione di una pipeline accelerata per includere i picchi improvvisi di ascolti prima della fine della settimana.

### Monitoraggio in Produzione e Soglie di Allarme (KPI)

Al superamento delle seguenti soglie critiche scatta un **Alert immediato** per il team di sviluppo:

| Metrica (KPI) | Descrizione | Soglia di Allarme (Alert) | Azione Correttiva |
| :--- | :--- | :--- | :--- |
| **Skip Rate precoce** | Percentuale di brani raccomandati saltati nei primi 15 secondi. | **> 45%** dei brani riprodotti | Suggerimenti fuori target. Avviare indagine sui dati di input. |
| **Click-Through Rate (CTR)** | Percentuale di utenti che clicca sulle playlist raccomandate. | **< 5%** delle visualizzazioni | Problema di UX o selezione dei generi in copertina non attrattiva. |
| **Latenza delle API** | Tempo impiegato dal sistema per restituire la lista di brani consigliati. | **> 200 ms** per richiesta | Problema infrastrutturale (rischio abbandono). Allertare DevOps. |
| **Performance Drop** | Calo drastico delle performance su metriche globali di prodotto. | **> 25%** dello Skip Rate globale medio giornaliero | Invio alert automatico su Slack/Email ed esecuzione del **rollback** alla versione precedente. |


### Protocollo di Gestione Incidenti (Post-Alert)
Quando scatta un alert critico (es. Skip Rate > 25% o Latenza > 200ms) e il sistema esegue il rollback automatico, il team si attiva immediatamente secondo questo schema:
* **Fase 1 (Contenimento - Tester):** Il Tester verifica se il rollback ha stabilizzato la piattaforma e isola il modello difettoso in un ambiente di staging per i test.
* **Fase 2 (Root Cause Analysis - Scrittore):** Lo Scrittore (Tech Lead) analizza i log d'errore e la telemetria per capire se si tratta di un problema di codice o di "Data Drift" (es. dati corrotti in ingresso).
* **Fase 3 (Impatto sul Business - PM):** Il PM monitora l'andamento del tempo di ascolto nelle ore successive all'incidente e prepara la comunicazione per gli stakeholder o le note di rilascio per la patch correttiva.

---

## 6. Rischi, Assunzioni e Limiti

* **Assunzione Chiave:** Si assume che gli utenti vogliano scoprire nuova musica; se un utente desidera solo ascoltare i soliti brani, l'algoritmo deve riconoscerlo senza forzare la scoperta.
* **Il Rischio del "Cold Start" (Partenza a freddo):**
    * *Nuovo Utente:* Risolto tramite un **Questionario di Onboarding** iniziale in cui si richiede di selezionare almeno 3 artisti/generi preferiti.
    * *Nuova Canzone:* Inizialmente raccomandata basandosi solo sui metadati (genere/artista) e inserita in modalità "test" nei feed degli utenti più attivi.
* **Effetto "Bolla" (Filter Bubble):** Rischio di consigliare sempre lo stesso identico genere. Mitigato inserendo volutamente un **5% di brani "serendipi"** (fuori target) per testare l'apertura dell'utente.
* **Compliance Privacy (GDPR):** Nessun dato personale sensibile viene usato; la profilazione è strettamente comportamentale e legata all'ID dell'account anonimizzato.

---

## 7. Note di Handover (Benvenuto nel Team)
Se sei appena entrato nel team, ecco come funziona:
1. **Niente è scontato:** Se vuoi proporre una modifica all'architettura o alla strategia dei dati, non farlo a voce.
2. **Consulta la cronologia:** Prima di proporre soluzioni alternative, leggi il file `DECISION_LOG_AGGIORNATO.md` per capire perché abbiamo scartato determinate strade in passato.
3. **Priorità assoluta:** La nostra stella polare è il tempo di ascolto dell'utente combinato con un basso skip rate. Ogni ottimizzazione tecnica deve mirare a questo.
