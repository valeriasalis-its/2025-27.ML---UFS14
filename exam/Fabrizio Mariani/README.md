# Art Classifier — Classificazione Artista e Stile Pittorico

## Setup/How to run this project

**Requisiti di sistema**:
- Python 3.9+
- Librerie: `torch`, `torchvision`, `pandas`, `Pillow`, `tqdm`, `matplotlib`

**Installazione dipendenze**:
```bash
pip install torch torchvision pandas pillow tqdm matplotlib
```

**Struttura cartelle attesa**:
```
project/
├── model.ipynb
├── resized/              # cartella con le immagini ridimensionate
└── dataset_clean.csv     # generato automaticamente dal notebook
```

**Esecuzione**:
1. Assicurarsi che la cartella `resized/` contenga le immagini del dataset.
2. Aprire `model.ipynb` con Jupyter Notebook.
3. Eseguire le celle in ordine dall'alto verso il basso:
   - la cella 2 genera automaticamente il CSV con le etichette artista/stile;
   - la cella di training avvia l'addestramento (può riprendere da un checkpoint `art_cnn.pth` se presente);
   - le celle finali permettono di visualizzare le curve di apprendimento, testare l'inferenza su una singola immagine e valutare l'accuratezza sul set di validazione.

Il progetto è configurato per girare su CPU (`DEVICE = "cpu"`), non è quindi richiesta una GPU.

---

## Spiegazione del progetto

**Obiettivo**: classificare automaticamente un dipinto identificando **artista** e **stile pittorico** a partire dalla sola immagine.

**Problema che risolve**: aiutare a catalogare, riconoscere o esplorare grandi collezioni di opere d'arte (es. archivi digitali, musei online) senza dover etichettare manualmente ogni immagine.

**Cosa fa nello specifico**: è una rete neurale convoluzionale (CNN) multi-task, con un backbone condiviso e due "teste" di output separate — una che predice l'artista, l'altra che predice lo stile associato. Le due predizioni vengono generate nella stessa forward pass.

---

## Dati

**Fonte**: le immagini sono organizzate in cartelle per artista (formato tipo dataset WikiArt), da cui viene generato automaticamente un CSV (`dataset_clean.csv`) contenente il percorso dell'immagine, l'artista e lo stile corrispondente, ricavato da una mappa manuale artista → stile (`ARTIST_STYLE_MAP`).

**Perché questi dati**: il dataset copre un ampio numero di artisti e movimenti artistici diversi (dal Rinascimento al Pop Art), il che lo rende adatto a un task di classificazione multi-classe su due dimensioni correlate (artista e stile).

**Caratteristiche**:
- Immagini a colori (RGB), ridimensionate a 64×64 pixel prima dell'addestramento.
- Etichette categoriche: nome artista e stile associato.
- Split in training/validation tramite `random_split`.

**Gestione dati mancanti/malformattati**:
- La mappa `ARTIST_STYLE_MAP` normalizza eventuali varianti o errori nei nomi delle cartelle (es. refusi nei nomi degli artisti), associandoli comunque allo stile corretto.
- Le immagini vengono caricate e convertite forzatamente in formato RGB (`convert("RGB")`), così da uniformare eventuali immagini in scala di grigi o con canale alpha.
- Il CSV viene generato automaticamente dalla scansione delle cartelle, riducendo il rischio di etichette mancanti o disallineate.

---

## Ciclo di vita ML

- **Raccolta dati**: le immagini sono organizzate per cartella-artista; il CSV con le etichette viene generato automaticamente da questa struttura.
- **Preprocessing**: resize a 64×64, normalizzazione, data augmentation (flip orizzontale, variazioni di luminosità/contrasto/saturazione) solo sul training set.
- **Training**: CNN multi-task addestrata su CPU con Adam, weight decay e scheduler StepLR per ridurre il learning rate nel tempo.
- **Validazione**: ad ogni epoca viene calcolata la loss e l'accuratezza (per artista e per stile) su un validation set separato, per monitorare overfitting.
- **Deploy**: attualmente il modello viene usato tramite una funzione `predict()` che carica un'immagine singola e restituisce artista e stile predetti con relativa confidenza. Non è ancora esposto come servizio (es. API o interfaccia web).
- **Monitoring**: al momento limitato alla visualizzazione manuale delle curve di loss/accuracy a fine training; non c'è un sistema di monitoraggio continuo in produzione.

---

## MLOps

**Cosa monitorare**:
- Andamento di loss e accuracy di validazione durante il training, per individuare tempestivamente overfitting o stagnazione dell'apprendimento.
- Se il modello venisse messo in produzione: accuratezza delle predizioni su nuovi dipinti, distribuzione delle classi predette rispetto a quelle attese, tempi di inferenza.

**Quando fare re-training**:
- Se vengono aggiunti nuovi artisti o stili al dataset.
- Se le performance su nuovi dati calano sensibilmente rispetto alla validazione originale (segnale di data drift, es. dipinti molto diversi da quelli visti in training).
- Se si rendesse disponibile hardware più performante (GPU), per poter aumentare risoluzione delle immagini e complessità del modello senza i vincoli attuali.

---

## Rischi, assunzioni e limiti

**Limiti identificati**:
- La risoluzione ridotta delle immagini (64×64) limita la capacità del modello di cogliere dettagli fini tipici di alcuni stili pittorici.
- Il training su CPU ha vincolato le scelte architetturali e il numero di run sperimentali possibili, riducendo l'ottimizzazione degli iperparametri.
- Alcuni stili sono associati a un solo artista nella mappa `ARTIST_STYLE_MAP`, quindi il modello potrebbe confondere il task "stile" con il task "artista" in quei casi.

**Assunzioni**:
- Si assume che la mappa artista → stile sia corretta e completa per tutti gli artisti presenti nel dataset.
- Si assume che le immagini nella cartella `resized` siano già state ripulite da eventuali file corrotti o non pertinenti.

**Rischi**:
- Overfitting, già osservato durante lo sviluppo e mitigato con dropout, weight decay, data augmentation e scheduler del learning rate — ma non escludibile su dati nuovi molto diversi da quelli di training.
- Bias del dataset: artisti con più opere disponibili sono probabilmente sovra-rappresentati rispetto ad altri, il che può sbilanciare le predizioni.

**Il progetto è funzionante dall'inizio alla fine?**
Sì: il notebook copre l'intera pipeline, dalla generazione del CSV al training, fino a inferenza e valutazione finale su singola immagine e su validation set.

**Come potrebbe essere ampliato**:
- Passare a un'architettura pre-addestrata (transfer learning, es. ResNet) per migliorare l'accuratezza senza dover allenare da zero.
- Aumentare la risoluzione delle immagini se si avesse accesso a GPU.
- Esporre il modello come semplice API/web app per l'inferenza su nuove immagini caricate dall'utente.
- Aggiungere un sistema di logging/monitoring più strutturato (es. tracking degli esperimenti con strumenti dedicati).

---

## Ulteriori informazioni

Il sistema di checkpoint (`art_cnn.pth`) salva stato del modello, dell'optimizer e dello scheduler, permettendo di interrompere e riprendere il training tra sessioni diverse — una scelta pensata proprio per gestire i lunghi tempi di addestramento su CPU.