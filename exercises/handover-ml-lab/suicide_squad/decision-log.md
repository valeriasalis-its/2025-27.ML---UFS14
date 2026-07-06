# Decision log — Scenario 2

*Le decisioni su cui ci siamo confrontati come gruppo, con l'alternativa che avevamo in mente e il perché abbiamo scelto così. Il README che descrive il progetto è in [`README.md`](./README.md). In fondo trovi le **note su processo, ruoli e handover**.*

### D1 — Tre corsie invece di due (sì/no)
Avevamo pensato a una scelta secca pubblica/blocca, ma ci siamo accorti che costringerebbe il modello a decidere anche quando è incerto — proprio dove sbaglia di più. Con la corsia intermedia l'incertezza diventa un'azione utile (la gestisce l'umano) invece di un errore.

### D2 — Punteggio di rischio + soglie decise da noi
Abbiamo preferito che il modello desse un punteggio e che le soglie le mettessimo noi, invece di far restituire al modello l'etichetta finale. Così regoliamo la prudenza del sistema senza riaddestrare nulla, e la scelta di quanto essere severi resta una decisione nostra, visibile e discutibile.

### D3 — Dati storici nostri, non dataset esterni
Ci siamo detti che le regole cambiano da piattaforma a piattaforma: un dataset esterno ci farebbe imparare le regole di qualcun altro. I nostri dati storici riflettono le nostre policy reali.

### D4 — I falsi negativi contano più dei falsi positivi
Abbiamo ragionato sull'impatto reale: pubblicare un contenuto dannoso fa molto più danno che far attendere un contenuto sano. Quindi abbiamo deciso di comunicare al modello questa priorità e di tarare le soglie in modo prudente, accettando un po' più di lavoro umano in cambio di più sicurezza.

### D5 — I pesi li bilancia il modello, non noi
La decisione concettualmente più importante. Ci siamo chiesti se dovessimo stabilire noi quanto conta ogni segnale, e abbiamo concluso di no: sarebbero nostre impressioni. **Il modello bilancia i pesi meglio di noi**, perché li calibra sui dati reali. Noi gli diamo la direzione (quali errori pesano di più) e dati puliti; il bilanciamento fine è compito suo. Volevamo evitare di "forzare" il modello con pesi decisi a mano, che l'avrebbero solo peggiorato.

### D6 — Metriche per categoria e lingua, non solo la media
Abbiamo insistito su questo perché ci siamo accorti che la media nasconde i problemi: un modello bravo in media può essere pessimo su una lingua minoritaria. È lì che nasce il bias, e volevamo poterlo vedere.

### D7 — Split per utente, non casuale
Ci siamo accorti di un tranello: se dividiamo i video a caso, lo stesso creator finisce sia in training che in test e il modello lo "riconosce" invece di valutare il contenuto, sembrando più bravo di quanto sia. Mettendo tutti i video di un utente dalla stessa parte, la valutazione resta onesta.

### D8 — Deploy graduale con shadow mode e possibilità di tornare indietro
Non ci fidavamo ad accendere tutto subito. Con lo shadow misuriamo gli errori veri senza rischi, e con il rollback ci proteggiamo se un rilascio peggiora le cose.

### D9 — Le segnalazioni degli utenti diventano nuovi dati
Le abbiamo viste come correzioni gratuite che dicono dove il modello sbaglia. Buttarle via, dopo aver gestito il singolo caso, sarebbe stato uno spreco: le reinseriamo nel retraining.

### D10 — Nessun retraining online "al buio"
Abbiamo deciso che ogni modello riaddestrato ripassa validazione e shadow prima di sostituire quello attivo, perché un retraining su dati sporchi o cambiati potrebbe peggiorare il sistema senza che ce ne accorgiamo.

---

# Note su processo, ruoli e handover

## Come ci siamo divisi (4 persone)

| Ruolo | Di cosa si occupa | Parti della traccia |
|---|---|---|
| **Team Lead / Project Owner** *(leadership)* | tiene insieme il gruppo, definisce obiettivi e priorità, è il garante che ogni decisione finisca nel decision log | obiettivi, decisioni, handover |
| **Data & Moderation Specialist** | definisce le classi e il loro significato con la moderazione, cura raccolta ed etichettatura, presidia casi ambigui e bias | dati, casi delicati |
| **ML Engineer** | training, validazione, metriche e soglie; è chi spiega perché lasciamo che sia il modello a bilanciare i pesi | training, validazione |
| **MLOps & Quality** | deploy graduale, dashboard di monitoraggio, trigger di retraining, rollback e handover | deploy, monitoring |

I confini non sono rigidi: le decisioni importanti le abbiamo prese **insieme**; il ruolo dice solo chi ne è responsabile e chi la scrive.

## Cosa non deve restare "solo detto a voce"

Ci siamo dati una regola: se una cosa serve a chi entra dopo, va scritta. In particolare:
- **le definizioni delle classi** con esempi (altrimenti ognuno etichetta diverso);
- **le soglie e la priorità sui falsi negativi**, con il perché e la data;
- **le policy** su cui il modello è tarato, con versione;
- **le metriche-obiettivo e i segnali d'allarme** del monitoraggio;
- **i limiti noti** (categorie/lingue deboli) e i **casi in cui rifare il training**;
- **chi contattare** per dati, modello, moderazione.

## Handover

Il nostro obiettivo è che chi entra dopo capisca il progetto **leggendo il repository**, senza dover chiedere in giro. Per questo abbiamo tenuto README, decision log e note aggiornati **mentre** lavoravamo, non alla fine. È il principio che ci ha guidati per tutto lo scenario: **se una decisione è importante, deve essere rintracciabile in un documento, non nella testa di uno di noi.**
