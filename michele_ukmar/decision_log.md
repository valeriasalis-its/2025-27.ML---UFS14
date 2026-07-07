# Decision log

Ripercorrendo le scelte fatte dall'inizio alla fine del progetto di colorizzazione di immagini, ecco le decisioni principali prese e le motivazioni dietro ciascuna.

## 1. Lavorare nello spazio colore LAB invece che direttamente in RGB

**Decisione:** rappresentare le immagini nello spazio colore LAB (L = luminanza, a/b = crominanza) invece di lavorare direttamente sui 3 canali RGB.

**Motivazione:** in RGB il modello dovrebbe predire tutti e 3 i canali da zero, senza alcuna informazione certa. In LAB, invece, il canale L (luminanza) è esattamente l'immagine in bianco e nero che già abbiamo, quindi diventa l'input del modello, e il problema si riduce a predire solo i 2 canali di crominanza (a, b). Questo dimezza l'output da produrre e rende il task più vincolato e più facile da apprendere, oltre a essere l'approccio standard per questo tipo di problema.

## 2. Encoder ResNet18 pre-addestrato invece di una rete addestrata da zero

**Decisione:** usare un ResNet18 pre-addestrato su ImageNet come encoder, invece di addestrare l'intera rete da zero.

**Motivazione:** addestrare un encoder da zero su un problema come la colorizzazione richiederebbe moltissimi dati e tempo, risorse che non avevamo a disposizione su hardware locale (MacBook M2). Un encoder pre-addestrato porta già con sé una conoscenza generale di forme, texture e oggetti (transfer learning), permettendo al modello di convergere più velocemente e con meno dati, lasciando alla rete "solo" il compito di imparare a colorare a partire da feature visive già buone.

## 3. Architettura U-Net con skip connections e Attention Gate

**Decisione:** collegare encoder e decoder con skip connections in stile U-Net, aggiungendo un Attention Gate prima di ogni concatenazione invece di una semplice concatenazione diretta.

**Motivazione:** le skip connections servono a recuperare i dettagli spaziali persi durante il downsampling dell'encoder (bordi, texture fini), fondamentali per una colorizzazione precisa e non "sfocata". L'Attention Gate è stato aggiunto in più, rispetto a una U-Net classica, per permettere al decoder di pesare automaticamente quali feature dello skip sono davvero rilevanti prima di unirle a quelle del decoder, invece di usarle tutte allo stesso modo — con l'obiettivo di migliorare la qualità dei dettagli senza aumentare eccessivamente il numero di parametri.

## 4. Loss composita (SmoothL1 + Perceptual VGG16 + SSIM) invece di una singola loss

**Decisione:** combinare tre loss diverse — SmoothL1 (pixel-level), Perceptual Loss basata su feature VGG16, e SSIM (similarità strutturale) — invece di usare solo una loss L1/L2 semplice.

**Motivazione:** una loss puramente pixel-level (L1/L2) tende a produrre colori "medi"/desaturati perché penalizza fortemente gli errori grandi, spingendo il modello verso soluzioni sicure ma poco vivaci. La Perceptual Loss confronta le immagini a livello di feature visive di alto livello (estratte da VGG16), aiutando a ottenere colori percettivamente più plausibili anche se non pixel-perfect. La SSIM aggiunge un vincolo sulla struttura/texture locale. La combinazione delle tre è stata scelta per bilanciare accuratezza numerica, qualità percettiva e coerenza strutturale, aspetti che nessuna delle tre da sola coprirebbe completamente.

## 5. Training in 3 fasi progressive invece di un training unico end-to-end

**Decisione:** dividere il training in Fase 1 (solo decoder, encoder congelato), Fase 2 (fine-tuning completo con learning rate differenziato tra encoder e decoder) e Fase 3 (ciclo finale con warm restart), invece di allenare tutta la rete insieme fin da subito con un unico learning rate.

**Motivazione:** allenare subito l'intera rete, incluso l'encoder pre-addestrato, con un learning rate "normale" rischia di distruggere rapidamente le feature ImageNet già utili (catastrophic forgetting). Congelando l'encoder nella Fase 1 si lascia che il decoder (inizializzato casualmente) impari prima a usare bene le feature esistenti. Solo nella Fase 2 l'encoder viene sbloccato, ma con un learning rate molto più basso rispetto al decoder, per adattarlo gradualmente al nuovo task senza comprometterlo. La Fase 3 è stata aggiunta come rifinitura finale con riavvii del learning rate (warm restart) per provare a uscire da eventuali minimi locali e spremere ulteriori miglioramenti.

## 6. Scheduler differenziati per fase (CosineAnnealingWarmRestarts vs ReduceLROnPlateau)

**Decisione:** usare `CosineAnnealingWarmRestarts` nelle Fasi 1 e 3, ma `ReduceLROnPlateau` nella Fase 2.

**Motivazione:** nelle fasi 1 e 3, dove l'obiettivo è esplorare bene lo spazio delle soluzioni (decoder da zero, o rifinitura finale), i riavvii periodici del learning rate aiutano a evitare che il training si blocchi su un minimo locale poco buono. Nella Fase 2, invece, dove si sta facendo un delicato fine-tuning dell'encoder pre-addestrato insieme al decoder, è stato scelto uno scheduler più "prudente" che riduce il learning rate solo quando la validazione smette di migliorare, per non introdurre variazioni brusche che potrebbero destabilizzare l'adattamento dell'encoder.

## 7. Dataset COCO 2017 con sottoinsieme campionato invece dell'intero dataset

**Decisione:** usare il dataset COCO 2017 (scaricato da Kaggle) ma limitarsi a un sottoinsieme di 60.000 immagini di training e 5.000 di validazione, invece di usare tutte le immagini disponibili.

**Motivazione:** COCO 2017 è stato scelto per la sua varietà di soggetti e scene, utile per un modello che deve generalizzare su immagini reali eterogenee. Tuttavia, allenare su tutto il dataset avrebbe richiesto tempi di training non sostenibili sull'hardware disponibile (MacBook M2). Il sottoinsieme è stato quindi dimensionato come compromesso tra varietà sufficiente dei dati e tempi di training gestibili in locale, con un seed fissato per rendere la selezione riproducibile.

## 8. Fix specifici per l'esecuzione su Apple Silicon (MPS)

**Decisione:** impostare `num_workers=0` nel DataLoader, disabilitare `pin_memory`, disattivare l'uso di AMP/GradScaler in modalità fp16, e implementare la conversione LAB→RGB per la Perceptual Loss interamente in PyTorch (senza passare per numpy/CPU).

**Motivazione:**
- `num_workers=0`: su macOS l'uso di più worker nel DataLoader causa problemi legati al meccanismo di spawn dei processi; impostarlo a 0 evita crash ed errori intermittenti, al costo di un caricamento dati leggermente meno parallelo.
- `pin_memory=False`: questa opzione serve a velocizzare il trasferimento host→GPU su CUDA (DMA), ma su MPS (o CPU) non porta benefici e può essere controproducente, quindi viene attivata solo quando il device è CUDA.
- AMP/GradScaler disattivati: il backend MPS supporta `autocast` ma non il `GradScaler` in fp16 nel modo in cui è supportato su CUDA; per evitare instabilità numeriche si è scelto di lasciare il training in precisione piena su MPS, riservando l'AMP reale solo a eventuali esecuzioni su GPU CUDA.
- Conversione LAB→RGB on-device: la Perceptual Loss richiede immagini RGB in input a VGG16, ma i tensori del modello sono in LAB. Fare questa conversione tramite `skimage`/numpy avrebbe richiesto uno spostamento dei dati dalla GPU (MPS) alla CPU e ritorno ad ogni batch, con un forte impatto sulle prestazioni; per questo la conversione è stata reimplementata da zero usando solo operazioni PyTorch, eseguibile interamente sul device senza roundtrip.

## 9. Gestione delle immagini corrotte nel dataset

**Decisione:** nella classe `ColorizationDataset`, in caso di errore nell'apertura/processamento di un'immagine, tentare di caricare le 5 immagini successive nella lista prima di restituire un tensore nero come fallback, invece di lasciare che l'eccezione interrompa il training.

**Motivazione:** dataset di grandi dimensioni scaricati da fonti esterne (in questo caso un mirror Kaggle di COCO) possono contenere file danneggiati o non leggibili. Un training che dura ore non deve interrompersi per un singolo file problematico; il meccanismo di retry è stato scelto come compromesso semplice tra robustezza (il training continua) e correttezza (si prova comunque a recuperare un'immagine valida prima di rinunciare).

## 10. Sistema di checkpoint per fase con resume automatico

**Decisione:** salvare un checkpoint separato per ciascuna delle 3 fasi (`colorizer_fase1_best.pth`, `colorizer_fase2_best.pth`, `colorizer_finale.pth`), includendo stato del modello, ottimizzatore, scheduler ed epoca, con logica automatica di ripresa da dove il training si era interrotto.

**Motivazione:** il training su hardware locale (M2) è lento e può richiedere più sessioni separate nel tempo (es. il notebook potrebbe essere chiuso e riaperto). Salvare un checkpoint completo per fase, con la possibilità di riprendere automaticamente controllando se il file esiste già, evita di dover ripetere da zero fasi di training già completate o parzialmente completate, rendendo il processo resiliente alle interruzioni — una necessità concreta emersa lavorando su un portatile e non su un server dedicato sempre acceso.

## 11. Early stopping per fase invece di un numero fisso di epoche

**Decisione:** applicare `EarlyStopping` con pazienza configurabile in ciascuna fase, oltre al numero massimo di epoche pianificato.

**Motivazione:** un numero fisso di epoche rischia di sprecare tempo di calcolo (prezioso su hardware locale) continuando ad allenare anche quando il modello ha smesso di migliorare sulla validazione, oppure di fermarsi troppo presto. L'early stopping per fase permette di interrompere automaticamente una fase quando la loss di validazione non migliora più per un certo numero di epoche consecutive, risparmiando tempo senza dover monitorare manualmente ogni esecuzione.
