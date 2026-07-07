# ChromaRevive — Image Colorization con ResNet18 U-Net

## Setup/How to run this project

**Requisiti di sistema:**
- Python 3.14
- PyTorch (testato con versione 2.11.0)
- torchvision (per `ResNet18_Weights`, `VGG16_Weights`)
- scikit-image (`skimage.color` per conversione RGB↔LAB)
- Pillow, matplotlib, tqdm
- Kaggle CLI configurato (credenziali API) per scaricare il dataset

**Hardware:** il notebook è ottimizzato per Apple Silicon (M1/M2/M3) tramite backend MPS, ma seleziona automaticamente `cuda` → `mps` → `cpu` in base a cosa è disponibile.

**Installazione pacchetti principali:**
```bash
pip install torch torchvision scikit-image pillow matplotlib tqdm kaggle numpy
```
s
**Come eseguire il progetto:**
1. Scaricare il dataset COCO 2017 (cella "Download Dataset"): richiede l'API Kaggle configurata. Se non si lavora su Kaggle, modificare il path `dest`.
2. Aggiornare i path in `CONFIG` (`train_dir`, `val_dir`, `checkpoint_dir`) con le cartelle corrette sulla propria macchina — attualmente sono percorsi assoluti locali.
3. Eseguire le celle in ordine: preprocessing/dataset → definizione modello → loss → training Fase 1 (decoder only) → Fase 2 (fine-tuning) → Fase 3 (cosine restart finale).
4. Ogni fase salva automaticamente un checkpoint e può essere ripresa in autonomia in caso di interruzione (il notebook rileva i checkpoint esistenti e riparte da lì).
5. Le celle finali generano i grafici delle loss, mostrano esempi di colorizzazione sul validation set e permettono di colorizzare una qualsiasi immagine esterna.

**Nota su `batch_size` in base alla RAM (Apple Silicon):**
- M2 8GB → 8-12
- M2 16GB → 16-32
- M2 Pro/Max 32GB+ → 32-64

## Spiegazione del progetto

Il progetto realizza un sistema di **colorizzazione automatica di immagini in bianco e nero** tramite deep learning: a partire dal solo canale di luminanza di un'immagine, il modello predice i canali di colore mancanti, restituendo una versione a colori plausibile dell'immagine originale.

Il problema che risolve è quello della ricostruzione del colore in assenza di informazione cromatica — un caso d'uso tipico per il restauro di foto storiche in bianco e nero, applicazioni creative o come blocco base in pipeline più ampie di post-produzione fotografica/video.

## Dati

**Dataset:** [COCO 2017](https://www.kaggle.com/datasets/awsaf49/coco-2017-dataset) (Common Objects in Context), scaricato tramite Kaggle.

**Perché questo dataset:** è un dataset generalista di immagini generiche (utilizzato principalmente per la classificazione e riconoscimento di oggetti), scelto per l'ampia varietà di soggetti, scene, illuminazioni e condizioni presenti — caratteristica utile per ottenere un modello che generalizzi su immagini reali eterogenee, piuttosto che specializzarsi su un dominio ristretto.

**Dimensione usata:** per contenere i tempi di training su hardware locale (MacBook M2), non è stato usato l'intero dataset ma un sottoinsieme campionato casualmente: 60.000 immagini di training e 5.000 di validazione (seed fissato a 42 per riproducibilità).

**Caratteristiche/preprocessing:** le immagini vengono convertite dallo spazio colore RGB allo spazio **LAB** tramite `skimage.color.rgb2lab`. Il canale di luminanza L (normalizzato in [-1, 1]) diventa l'input del modello, mentre i canali di crominanza a, b (normalizzati in [-1, 1]) sono il target da predire. Sul training set vengono inoltre applicate augmentation (resize, random crop, flip orizzontale/verticale, color jitter, blur gaussiano occasionale) per migliorare la generalizzazione.

**Gestione dati mancanti/corrotti:** il dataset scaricato da Kaggle può contenere file immagine danneggiati o non apribili. Per evitare che questo blocchi il training, la classe `ColorizationDataset` tenta di caricare fino a 5 immagini successive nella lista in caso di errore, e solo come ultima risorsa restituisce un tensore nero, così un singolo file corrotto non interrompe l'intero processo.

## Ciclo di vita ML

- **Raccolta dati:** download automatizzato del dataset COCO 2017 da Kaggle e campionamento casuale del sottoinsieme di train/validation.
- **Training:** suddiviso in 3 fasi progressive — (1) training del solo decoder con encoder ResNet18 congelato, (2) fine-tuning completo con learning rate differenziato tra encoder ed encoder/decoder, (3) ciclo finale con warm restart per rifinire la convergenza.
- **Validazione:** ad ogni epoca viene calcolata la loss di validazione (L1) sul validation set; è usata sia per l'early stopping sia per decidere quale checkpoint salvare come "migliore".
- **Deploy:** il progetto è didattico/sperimentale ed eseguito localmente in notebook; non è presente una pipeline di deploy vera e propria (es. API REST). Il modello finale viene serializzato in un file `.pth`, potenzialmente riutilizzabile in un'applicazione separata — funzionalità già dimostrata dalla funzione `colora_immagine`, che applica il modello a un'immagine esterna qualsiasi.
- **Monitoring:** in assenza di un deploy in produzione, il "monitoraggio" si limita alle metriche di training/validazione (loss per fase, grafici salvati) e all'ispezione visiva dei risultati tramite la funzione `mostra_risultati`.

## MLOps

**Cosa si monitora:** la loss di training e di validazione ad ogni epoca, per ciascuna delle 3 fasi, oltre alle tre componenti separate della loss composita (SmoothL1, Perceptual/VGG16, SSIM) — utili per capire quale aspetto della colorizzazione (accuratezza pixel-level, texture percettiva, struttura) sta migliorando o peggiorando nel tempo.

**Quando si renderebbe necessario un re-training:**
- Cambio significativo nel dominio delle immagini di input (es. applicazione a vere foto storiche molto diverse da COCO, foto a bassa risoluzione o con artefatti/rumore particolari).
- Degradazione percepita della qualità dei colori prodotti su nuovi dati.
- Disponibilità di un dataset più mirato al caso d'uso finale (es. foto d'epoca reali, invece di immagini moderne desaturate artificialmente).

## Rischi, assunzioni e limiti

**Assunzioni:**
- Si assume che desaturare un'immagine a colori (ottenendo il canale L) sia rappresentativo del problema reale di colorizzare foto storiche in bianco e nero, che però hanno caratteristiche fisiche diverse (grana della pellicola, viraggio seppia, deterioramento del supporto).
- Si assume che un sottoinsieme di 60.000 immagini di COCO sia sufficiente a generalizzare, senza necessità di usare l'intero dataset.

**Limiti:**
- La colorizzazione è un problema intrinsecamente ambiguo (uno stesso oggetto in scala di grigi può avere più colori plausibili): usando loss L1/SmoothL1 il modello tende a convergere verso colori "medi" e desaturati, un limite noto di questo tipo di approccio.
- Non sono state calcolate metriche quantitative standard di colorizzazione (es. PSNR, colorfulness score) in modo sistematico: la valutazione è principalmente qualitativa/visiva, oltre che basata sulla sola loss di training/validazione.
- I path di dataset e checkpoint in `CONFIG` sono percorsi assoluti locali legati a una macchina specifica, quindi il notebook non è direttamente portabile senza modifiche manuali.
- Il training in tempi ragionevoli richiede hardware con supporto MPS o CUDA; su CPU i tempi diventano proibitivi data la profondità della rete e il volume di immagini processate.

**Rischi:**
- Bias del dataset: COCO 2017 è generalista (scene quotidiane, oggetti comuni); il modello potrebbe comportarsi peggio su domini sotto-rappresentati (es. ritratti di studio, paesaggi specifici, foto storiche pre-1900).
- Dipendenza da un dataset esterno mantenuto da terzi su Kaggle (mirror di COCO), con relativa dipendenza dalla sua disponibilità e integrità nel tempo.

## Ulteriori informazioni

- File del progetto: `chromaRevive_deeplearning.ipynb`
- Parametri totali del modello: ~4,31M, di cui ~0,94M nel solo decoder.
- Versione ottimizzata per macOS Apple Silicon: mixed precision (AMP/GradScaler) disattivata su MPS, DataLoader senza multiprocessing (`num_workers=0`), conversione LAB→RGB per la perceptual loss implementata interamente in PyTorch (senza passaggi intermedi su CPU/numpy) per prestazioni migliori su MPS. Per il dettaglio di queste scelte tecniche, vedere il Decision Log.
