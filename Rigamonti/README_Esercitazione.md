# Sistema di Classificazione Contenuti — Piattaforma Video

## Scopo di questo documento
Questo README descrive, a livello concettuale, come il team affronta lo sviluppo di una
funzionalità ML per classificare i contenuti caricati dagli utenti in tre macro-esiti:

- **Pubblicazione automatica** (contenuto sicuro con alta confidenza)
- **Revisione umana** (caso ambiguo, borderline, o bassa confidenza del modello)
- **Blocco/escalation** (alta probabilità di violazione grave, es. contenuti illegali)

Non è un documento tecnico di implementazione: è il punto di riferimento per chiunque
entri nel progetto e debba capire *perché* il sistema è fatto così prima di guardare il codice.

---

## 1. Analisi del problema e obiettivi

### Problema
Ogni giorno vengono caricati contenuti in volumi che rendono impossibile una revisione
manuale sistematica di tutto. Serve un filtro automatico che:
- riduca il carico di lavoro del team di moderazione, concentrando la revisione umana
  sui casi realmente incerti o rischiosi;
- non ritardi la pubblicazione dei contenuti chiaramente innocui;
- minimizzi il rischio che contenuti gravemente problematici arrivino al pubblico prima
  di una verifica.

### Obiettivo del sistema (non del modello soltanto)
L'obiettivo di prodotto **non è "classificare correttamente"** in astratto, ma **ridurre
il tempo-uomo di moderazione a parità di rischio accettato**, oppure, in modo equivalente,
**ridurre il rischio a parità di tempo-uomo disponibile**. Questo va detto esplicitamente
perché guida ogni decisione successiva (soglie, metriche, dataset).

### Obiettivo del modello
Assegnare a ogni contenuto caricato una probabilità (o punteggio) di appartenenza a una o
più categorie di rischio/violazione, da cui deriva l'instradamento in una delle tre code
sopra descritte.

### Metriche di successo — da distinguere in due livelli
- **Metriche di prodotto**: % di contenuti gestiti senza intervento umano, tempo medio di
  attesa prima della pubblicazione, numero di contenuti problematici sfuggiti al filtro
  (falsi negativi gravi), carico settimanale sul team di moderazione.
- **Metriche di modello**: precision/recall per classe, in particolare **recall sulla
  classe "grave"** (non vogliamo lasciar passare contenuti pericolosi) e **precision sulla
  classe "pubblica subito"** (non vogliamo pubblicare cose sbagliate senza controllo).

**Perché la distinzione è importante**: un modello con ottima accuracy complessiva può
comunque essere inutile o dannoso a livello di prodotto, se sbaglia proprio sui casi rari
ma gravi. Le due metriche vanno tracciate separatamente e nessuna sostituisce l'altra.

---

## 2. Dati: cosa raccogliere e perché

| Tipo di dato | Perché è utile |
|---|---|
| Metadati del caricamento (titolo, descrizione, tag, categoria dichiarata dall'utente) | Segnali testuali immediati, economici da processare, spesso già disponibili prima ancora di guardare il video |
| Frame estratti dal video (campionamento a intervalli) | Il contenuto visivo è la fonte primaria di rischio (violenza, nudità, simboli vietati) |
| Audio/trascrizione | Linguaggio d'odio, minacce, contenuti audio non coerenti col video |
| Storico dell'account (età dell'account, numero di segnalazioni pregresse, tasso di rimozioni passate) | Un contenuto identico può avere rischio diverso a seconda della reputazione di chi lo carica |
| Segnalazioni utenti post-pubblicazione (se disponibili da versioni precedenti del prodotto) | Utili come **etichette deboli** per bootstrap iniziale, ma vanno trattate con cautela (vedi rischi) |
| Etichette da moderazione umana (decisioni passate del team) | La fonte di verità principale per il training supervisionato |

### Nota esplicita sulla qualità dei dati
Le etichette prodotte da moderatori umani non sono "verità assoluta": riflettono linee
guida, sensibilità individuale e possono cambiare nel tempo (le policy della piattaforma
evolvono). Questo va documentato perché **il dataset di training invecchia insieme alle
policy**, non solo per drift statistico dei contenuti.

---

## 3. Casi ambigui o delicati (da discutere esplicitamente col team policy/legale)

- **Contenuti borderline culturalmente**: ciò che è accettabile varia per area geografica,
  lingua, contesto culturale — un classificatore addestrato su un mercato può comportarsi
  male su un altro.
- **Satira, arte, contesto educativo/medico**: contenuti che citano o mostrano materiale
  sensibile con finalità legittime (es. documentari, educazione sessuale, denuncia di
  violenza) rischiano falsi positivi se il modello guarda solo al contenuto visivo/testuale
  senza contesto.
- **Contenuti "quasi conformi"**: caricati per aggirare le regole con piccole modifiche
  (es. watermark, tagli, audio alterato) — richiedono probabilmente un sistema separato
  di rilevamento duplicati/near-duplicati, non solo classificazione.
- **Minori coinvolti nei contenuti**: qualunque incertezza in quest'area deve portare
  **sempre** a revisione umana o blocco automatico, mai a pubblicazione automatica,
  indipendentemente dalla confidenza del modello. Questa è una regola di prodotto, non
  una scelta del modello, e va scritta esplicitamente nelle policy di routing.
- **Nuovi formati/trend virali**: contenuti che il modello non ha mai visto in training
  (nuovi meme, nuove challenge) tendono a finire tutti nella coda "incerto", causando
  picchi di carico sulla moderazione — da monitorare come segnale di drift.

---

## 4. Ciclo di vita ML — fasi principali

### 4.1 Raccolta dati
- Definire una pipeline che unisca metadati, frame video, audio ed etichette storiche.
- Stabilire una politica di **campionamento e conservazione** (quanto audio/video si
  conserva, per quanto tempo, con quali permessi — rilevante anche per privacy/GDPR).
- Garantire tracciabilità: ogni esempio di training deve poter essere ricondotto a
  *quale versione delle linee guida di moderazione* era in vigore quando è stato etichettato.

### 4.2 Training
- Definire uno split che eviti **data leakage** tra training/validation/test, in
  particolare evitando che frame dello stesso video finiscano in split diversi.
- Gestire lo **sbilanciamento delle classi**: i contenuti gravemente problematici sono
  rari per natura, quindi accuracy globale è una metrica fuorviante (vedi sezione 1).
- Versionare dataset e modelli, non solo il codice.

### 4.3 Validazione
- Validare non solo su metriche aggregate ma **per sottogruppo** (lingua, area geografica,
  categoria di contenuto, tipo di account) per intercettare bias sistematici.
- Includere una validazione "umana in loop": un campione di decisioni del modello viene
  rivisto da moderatori per stimare l'accordo modello-umano su casi recenti, non solo sul
  test set storico.

### 4.4 Deploy
- Deploy gradato (es. shadow mode → piccola percentuale di traffico → rollout completo),
  mai big-bang su un sistema che tocca la pubblicazione di contenuti.
- Le **soglie di instradamento** (pubblica / revisiona / blocca) sono un parametro di
  prodotto separato dal modello: vanno documentate e modificabili senza dover
  ri-addestrare il modello.

### 4.5 Monitoring
- Monitorare sia le prestazioni del modello sia il carico generato sul team di
  moderazione (se il modello manda troppo in revisione, il beneficio di prodotto sparisce).
- Monitorare la distribuzione dei contenuti in ingresso per rilevare **drift** (nuovi
  formati, nuove lingue, nuovi tipi di abuso).

---

## 5. Aspetti MLOps

### Quando potrebbe servire un retraining
- Cambiano le **linee guida di moderazione** (nuove categorie vietate, policy aggiornate).
- Drift misurato nella distribuzione degli input (nuovi trend, nuove lingue, nuovi formati
  di contenuto) rispetto al training set.
- Calo misurato dell'accordo tra decisioni del modello e revisioni umane su campioni recenti.
- Aumento delle segnalazioni utente su contenuti già pubblicati automaticamente (segnale
  di falsi negativi in produzione).

### Segnali che potrebbero indicare un problema
- Aumento anomalo della % di contenuti instradati in coda "revisione umana" (il modello
  è diventato meno sicuro, o il traffico è cambiato).
- Aumento delle rimozioni post-pubblicazione su contenuti "pubblicati automaticamente".
- Differenze di performance tra sottogruppi che si allargano nel tempo.
- Tempo di attesa in coda di moderazione che cresce oltre soglie concordate col team prodotto.

---

## 6. Rischi, assunzioni, limiti

**Assunzioni esplicite:**
- Si assume che le etichette storiche dei moderatori siano sufficientemente consistenti
  da poter essere usate come training set; questa assunzione va rivalutata periodicamente.
- Si assume che i tre livelli di rischio (pubblica/revisiona/blocca) siano sufficienti a
  coprire le esigenze di prodotto attuali; il team policy può richiederne altri.

**Limiti noti:**
- Il modello non sostituisce la revisione umana per i casi gravi o ambigui: è un
  sistema di **prioritizzazione**, non di decisione finale su tutto.
- Nessun modello può garantire zero falsi negativi; il sistema è progettato per
  minimizzarli sulle categorie più gravi, non per azzerarli.

**Rischi:**
- Bias nei dati storici di moderazione che si riflette e si amplifica nel modello.
- Overfitting su forme note di violazione, con vulnerabilità a nuove tecniche di elusione.
- Rischio reputazionale/legale se contenuti gravi vengono pubblicati automaticamente per
  errore di soglia — da qui la regola "in dubbio, mai auto-pubblicare" per le categorie
  più sensibili (vedi sezione 3).

---

## 7. Cosa deve essere chiaro a chi entra nel team

- Le motivazioni delle soglie di instradamento sono nel **Decision Log**, non solo nel codice.
- Le metriche di prodotto e di modello sono distinte e vanno lette insieme, mai una senza l'altra.
- Le regole "hard" (es. minori, sempre revisione umana) non sono negoziabili dal modello:
  sono vincoli di prodotto/policy applicati **dopo** l'inferenza del modello.
- Ogni cambio di policy di moderazione che potrebbe invalidare le etichette storiche deve
  essere registrato con data, per capire quali dati di training restano validi.

Vedi anche `DECISION_LOG.md` per le decisioni puntuali e motivate, e `NOTE_PROCESSO.md`
per ruoli, rischi operativi e handover.
