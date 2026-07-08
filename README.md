# PatchCore — Anomaly Detection su immagini industriali (MVTec AD)

## Setup/How to run this project

**Requisiti di sistema:**
- Python 3.9+
- GPU con CUDA (opzionale ma consigliata: il coreset subsampling e l'estrazione feature sono molto più veloci)
- Account Kaggle con API key configurata (per scaricare il dataset)

**Librerie esterne necessarie:**
```
torch
torchvision
scikit-learn
numpy
matplotlib
pillow
tqdm
kaggle
```

Installazione rapida:
```bash
pip install torch torchvision scikit-learn numpy matplotlib pillow tqdm kaggle
```

**Comandi per avviare il progetto:**
1. Configurare le credenziali Kaggle (file `kaggle.json` in `~/.kaggle/`).
2. Scaricare ed estrarre il dataset:
   ```bash
   kaggle datasets download ipythonx/mvtec-ad
   unzip mvtec-ad.zip -d mvtect
   ```
3. Aprire il notebook `patchcore_anomaly_detection.ipynb` .
4. Impostare `DATA_ROOT` con il percorso in cui è stato estratto il dataset e `CATEGORY` con la categoria MVTec da analizzare (es. `bottle`, `cable`, `carpet`, ...).
5. Eseguire le celle in ordine: build del memory bank → coreset subsampling → inference kNN → valutazione AUC-ROC e visualizzazione heatmap.

## Spiegazione del progetto

Il progetto implementa **PatchCore**, un algoritmo di *anomaly detection* non supervisionato per il rilevamento di difetti su immagini industriali. L'obiettivo è individuare automaticamente prodotti difettosi (es. bottiglie rotte, cavi danneggiati, superfici contaminate) senza dover addestrare il modello su esempi di difetti, che nella pratica industriale sono rari e costosi da etichettare.

L'idea di fondo è sfruttare le rappresentazioni intermedie di una rete CNN pre-addestrata su ImageNet (ResNet18): si costruisce un "profilo di normalità" a partire da sole immagini di prodotti privi di difetti, e a inference time si misura quanto le feature di una nuova immagine si discostano da tale profilo. Il risultato non è solo una classificazione binaria (normale/anomalo), ma anche una **heatmap** che localizza spazialmente le zone sospette dell'immagine.

Il problema che risolve è tipico del controllo qualità in produzione industriale (visual inspection), dove le anomalie sono rare, variabili e spesso non note a priori.

## Dati

Il dataset utilizzato è **MVTec AD** (Anomaly Detection Dataset), scaricato dalla piattaforma Kaggle ( `ipythonx/mvtec-ad`). È stato scelto per fare anomaly detection industriale.

**Caratteristiche principali:**
- 15 categorie di oggetti/texture (es. `bottle`, `cable`, `carpet`, `grid`, `hazelnut`, ...); in questo progetto è stata analizzata la categoria `bottle` come caso d'uso di riferimento.
- Per ogni categoria, il set di **training** contiene esclusivamente immagini "good" (prive di difetti), coerentemente con l'impostazione unsupervised del problema.
- Il set di **test** contiene sia immagini "good" sia immagini con diverse tipologie di difetto (es. `broken_large`, `broken_small`, `contamination`), etichettate solo per la fase di valutazione finale, mai usate in training.

**Gestione dei dati mancanti/malformattati:** il dataset MVTec AD è già pulito e strutturato in cartelle (`train/good`, `test/<tipo_difetto>`), quindi non sono stati necessari interventi di pulizia. Le uniche trasformazioni applicate sono quelle di preprocessing standard richieste dal backbone ResNet18 (resize a 256×256, center crop a 224×224, normalizzazione con media/deviazione standard di ImageNet), applicate in modo identico a train e test per garantire coerenza.

## Ciclo di vita ML

- **Raccolta dati:** download del dataset MVTec AD da Kaggle; nessuna raccolta dati proprietaria in questa fase di prototipazione.
- **Training:** non è un training nel senso classico (nessun aggiornamento dei pesi della rete). La fase di "training" consiste nella costruzione del **memory bank** (estrazione delle feature patch da tutte le immagini normali) e nella sua compressione tramite **coreset subsampling** (farthest-point sampling greedy, ~1% dei punti totali) per rendere l'inference efficiente.
- **Validazione:** viene calcolata la metrica **AUC-ROC** sul test set (che contiene sia immagini normali sia anomale), usando come score dell'immagine il massimo anomaly score tra tutte le sue patch.
- **Deploy:** in un ipotetico scenario di produzione, il memory bank/coreset verrebbe serializzato (es. con `torch.save` o `pickle`) insieme ai pesi del backbone, e la funzione `get_anomaly_map` esposta tramite un servizio (es. API REST) che riceve un'immagine e restituisce heatmap + anomaly score.
- **Monitoring:** vedi sezione MLOps.

## MLOps

**Cosa monitorare in un ipotetico deploy:**
- Distribuzione degli anomaly score nel tempo (drift rispetto alla distribuzione osservata in training/validazione).
- Percentuale di immagini classificate come anomale per turno/lotto di produzione (un aumento anomalo potrebbe indicare sia un problema reale di qualità sia un problema del modello).
- Qualità delle immagini in ingresso (illuminazione, inquadratura, risoluzione), poiché PatchCore è sensibile a variazioni nelle condizioni di acquisizione rispetto al training.

**Trigger per un eventuale re-training:**
- Cambiamento del prodotto/linea di produzione (nuova variante estetica del prodotto normale) che renderebbe obsoleto il memory bank attuale.
- Drift significativo e persistente nella distribuzione degli score delle immagini "good" note.
- Feedback dagli operatori umani che segnalano un numero crescente di falsi positivi/negativi.

## Rischi, assunzioni e limiti

**Limiti identificati:**
- Il modello è specifico per categoria: il memory bank costruito per `bottle` non è utilizzabile per un'altra categoria di oggetti; per ogni nuova categoria è necessario ricostruire il memory bank.
- Le prestazioni dipendono fortemente dalla qualità e rappresentatività delle immagini di training "good": se il training set non copre tutte le variazioni normali (illuminazione, angolazione, micro-variazioni del prodotto), si rischiano falsi positivi.
- L'assenza di fine-tuning del backbone (le feature ImageNet non sono specifiche del dominio industriale) può limitare le prestazioni su categorie con texture molto diverse da quelle viste durante il pre-training di ResNet18.
- Il coreset subsampling introduce un trade-off esplicito tra velocità di inference e qualità della rappresentazione della normalità: un `ratio` troppo basso può far perdere regioni rilevanti dello spazio delle feature.

**Assunzioni:**
- Si assume che il training set contenga *solo* immagini prive di difetti (nessuna contaminazione con anomalie non etichettate).
- Si assume che le anomalie nel test set siano "sufficientemente diverse" a livello di feature intermedie rispetto alle immagini normali da poter essere separate tramite semplice distanza euclidea nel k-NN.

**Funzionamento end-to-end:** il progetto è funzionante dall'inizio alla fine sulla categoria `bottle`: download dati → estrazione feature → costruzione memory bank → coreset → inference k-NN → calcolo AUC-ROC → visualizzazione heatmap.

**Possibili ampliamenti:**
- Estendere la valutazione a tutte le 15 categorie di MVTec AD, riportando l'AUC-ROC media.
- Sperimentare backbone diversi (WideResNet50, EfficientNet) o combinazioni di layer differenti.

- Esporre il modello come servizio (API) per un'integrazione in una linea di produzione reale.

## Ulteriori informazioni

Il notebook di riferimento è `patchcore_anomaly_detection.ipynb`. Contiene, oltre al codice, spiegazioni testuali dettagliate (in celle markdown) di ogni fase della pipeline: motivazione della scelta dei layer `layer2`/`layer3` di ResNet18, funzionamento del coreset greedy, e interpretazione della metrica AUC-ROC.

---
