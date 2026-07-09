# Decision log

Ricostruzione delle principali decisioni prese durante la progettazione del progetto, con il relativo perché.

---

### 1. Regressione invece di classificazione per fasce d'età

**Decisione:** l'output della rete è un singolo valore continuo (età in anni), con loss `MeanSquaredError` e attivazione `linear` sull'ultimo layer.

**Perché:** classificare per fasce d'età (es. 0-10, 11-20, ...) avrebbe semplificato il training ma introdotto un errore artificiale ai bordi delle fasce (una persona di 29 e una di 31 anni finirebbero in classi diverse pur essendo quasi coetanee). La regressione mantiene la natura continua del problema e permette di misurare l'errore in un'unità direttamente interpretabile (anni), tramite la MAE.

---

### 2. Dataset UTKFace scaricato via `kagglehub`

**Decisione:** usare UTKFace come dataset e scaricarlo in automatico con `kagglehub.dataset_download`, invece di richiedere un download manuale o un dataset raccolto ad hoc.

**Perché:** UTKFace è pubblico, già etichettato (età/genere/etnia ricavabili dal nome del file) e di dimensioni adatte a un progetto didattico con risorse di calcolo limitate. Il download automatico tramite `kagglehub` evita di dover distribuire il dataset nella repo (pesante e con licenza non propria) e rende il progetto riproducibile con un solo comando, senza passaggi manuali soggetti a errore.

---

### 3. Etichette estratte dal nome del file, non da un CSV separato

**Decisione:** età e genere vengono ricavati parsando il filename (`[età]_[genere]_[etnia]_[timestamp].jpg`) invece di usare un file di metadati esterno.

**Perché:** UTKFace non fornisce un CSV di annotazioni separato: l'informazione è già incorporata nel nome del file. Parsare il filename evita un doppio sistema di verità (file + CSV che potrebbero disallinearsi) ed elimina di fatto il problema dei dati mancanti, dato che un file con nome non conforme viene semplicemente scartato in fase di parsing.

---

### 4. Data augmentation con Albumentations

**Decisione:** applicare augmentation (flip orizzontale, variazione di luminosità/contrasto, rotazione, rumore gaussiano) tramite la libreria Albumentations, invece di usare le utility di augmentation integrate in Keras/TensorFlow o allenare senza augmentation.

**Perché:** il dataset, pur ampio, non copre tutte le condizioni reali di scatto (illuminazione, angolazione, qualità). L'augmentation riduce l'overfitting e migliora la generalizzazione simulando variazioni realistiche. Albumentations è stata preferita alle utility native di Keras perché offre più trasformazioni configurabili con un'unica interfaccia e un controllo più fine sulle probabilità di applicazione (`p=...`) per ciascuna trasformazione.

---

### 5. Split train/test 80/20 con `random_state` fisso

**Decisione:** `train_test_split` con `random_state=42` e `shuffle=True`.

**Perché:** uno split 80/20 è lo standard de facto per bilanciare quantità di dati di training e affidabilità della stima di validazione, adeguato alle dimensioni del dataset. Fissare il `random_state` rende lo split riproducibile tra run diverse, permettendo di confrontare in modo equo le configurazioni (risoluzione, architettura) sugli stessi identici dati di test.

---

### 6. Architettura CNN costruita da zero (no transfer learning)

**Decisione:** usare un modello `Sequential` con blocchi Conv2D + BatchNorm + MaxPool + Dropout costruiti da zero, invece di partire da un'architettura pre-addestrata (es. MobileNet, ResNet).

**Perché:** l'obiettivo del progetto era didattico, cioè comprendere e controllare ogni componente della pipeline (dalla scelta dei filtri al dropout). Un'architettura pre-addestrata avrebbe probabilmente dato risultati migliori con meno sforzo, ma avrebbe nascosto le scelte progettuali dietro un modello a scatola nera. Il transfer learning è indicato esplicitamente come possibile estensione futura (vedi README, sezione "Rischi, assunzioni e limiti").

---

### 7. Dropout progressivo (0.2 → 0.2 → 0.3 → 0.5) e GlobalAveragePooling2D

**Decisione:** aumentare il tasso di dropout nei layer più vicini all'output e usare `GlobalAveragePooling2D` invece di un `Flatten` prima dei layer densi.

**Perché:** i layer più profondi/densi hanno più parametri e sono più soggetti a overfitting, quindi un dropout più aggressivo verso l'output regolarizza dove serve di più senza penalizzare l'apprendimento delle feature di basso livello nei primi blocchi. `GlobalAveragePooling2D` riduce drasticamente il numero di parametri rispetto a un `Flatten` (che avrebbe generato un vettore enorme dipendente dalla risoluzione spaziale), riducendo ulteriormente il rischio di overfitting ed evitando che il numero di parametri del modello dipenda dalla risoluzione di input.

---

### 8. Confronto di più risoluzioni di input (64×64, 100×100, 200×200)

**Decisione:** addestrare più modelli a risoluzioni diverse invece di fissarne una sola, e confrontarli esplicitamente in `test_rete.ipynb`.

**Perché:** non era ovvio a priori quale risoluzione offrisse il miglior compromesso tra dettaglio dell'immagine (utile per catturare rughe, occhiaie, ecc.) e costo computazionale/rischio di overfitting con un dataset di dimensioni limitate. Il confronto sperimentale (documentato nei log TensorBoard, `assets/mae.png`) ha mostrato che una risoluzione più alta (200×200) non garantisce risultati migliori: `secondo_test_shape_64x64` ottiene la MAE di validation più bassa. Questo ha guidato la scelta di mantenere 64×64 come configurazione principale.

---

### 9. EarlyStopping con `patience=10` e `restore_best_weights=True`

**Decisione:** allenare fino a un massimo di 100 epoche ma interrompere in anticipo se la validation loss non migliora per 10 epoche, ripristinando i pesi migliori.

**Perché:** 100 epoche sono un limite superiore di sicurezza, non un target da raggiungere sempre: `EarlyStopping` evita di continuare ad allenare (sprecando tempo di calcolo) oltre il punto in cui il modello smette di migliorare o inizia a overfittare, e `restore_best_weights` garantisce che il modello salvato sia quello al punto di miglior generalizzazione osservato, non semplicemente l'ultimo.

---

### 10. Logging con TensorBoard + CSVLogger invece di un dashboard custom

**Decisione:** usare i callback nativi di Keras (`TensorBoard`, `CSVLogger`, `ModelCheckpoint`) per il monitoraggio del training, con log salvati in sottocartelle per esperimento.

**Perché:** sono strumenti già integrati in Keras, senza dipendenze aggiuntive, sufficienti per lo scopo didattico di confrontare run diverse (loss, MAE) e individuare overfitting. Costruire un sistema di monitoring/dashboard dedicato sarebbe stato uno sforzo ingiustificato rispetto al beneficio per un progetto di questa scala; è indicato come possibile estensione futura se il progetto dovesse evolvere verso un contesto più vicino alla produzione.

---

### 11. Nessun deploy, nessun monitoring automatico in produzione

**Decisione:** il progetto si ferma al confronto locale tra modelli tramite notebook, senza esporre un'API, un servizio o un sistema di monitoring/re-training automatico.

**Perché:** l'obiettivo dichiarato è didattico ed esplorativo, non la messa in produzione di un servizio reale. Data la scarsa affidabilità delle stime (vedi README, sezione limiti) sarebbe inoltre irresponsabile presentare il modello come pronto per un uso reale (es. verifica età) senza un dataset più ampio, rappresentativo e una validazione molto più rigorosa.
