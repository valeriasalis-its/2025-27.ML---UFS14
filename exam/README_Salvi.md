# Anomaly Detection su Dati Tabulari — Statlog (Shuttle)

**Progetto d'esame — Machine Learning (Supervised & Unsupervised)**
ITS Academy Angelo Rizzoli — Milano, 2026

## Setup/How to run this project

Il progetto è composto da un unico notebook autosufficiente e dal dataset che utilizza:

- File: `anomaly_detection_shuttle.ipynb`, `shuttle.csv`.
- È un notebook **Jupyter/Python**, eseguibile in locale (Jupyter, VS Code) oppure su Google Colab; non richiede build step né configurazioni particolari oltre alle librerie elencate sotto.
- Requisiti: `python >= 3.10`, `pandas`, `numpy`, `matplotlib`, `seaborn`, `scikit-learn`, `torch` (PyTorch), `xgboost`, `scipy`.

Installazione:

```bash
pip install pandas numpy matplotlib seaborn scikit-learn torch xgboost scipy
```

Esecuzione:

1. Posiziona `shuttle.csv` nella stessa cartella del notebook.
2. Apri `anomaly_detection_shuttle.ipynb` in Jupyter (o VS Code / Colab).
3. Esegui le celle in ordine (*Run All*). Il notebook è già stato eseguito e contiene tutti gli output e i grafici, ma può essere rilanciato da zero: il tempo di esecuzione completo è di pochi minuti su CPU.

## Spiegazione del progetto

Il progetto realizza un sistema di **anomaly detection** su dati tabulari numerici, applicato al dataset **Statlog (Shuttle)**, contenente letture di sensori di una navetta spaziale NASA. L'obiettivo è distinguere gli stati di funzionamento **normale** dagli stati **anomali** (guasti, condizioni rare), un compito tipico del monitoraggio industriale e aerospaziale.

L'approccio combina un metodo **unsupervised** (un Autoencoder denso, addestrato sulla sola normalità) con due metodi **supervised** ad albero (Random Forest e XGBoost), fusi in un **ensemble**. Questa scelta copre entrambi i paradigmi richiesti dall'esame — supervisionato e non supervisionato — e permette di confrontarli direttamente sullo stesso problema.

Nel dettaglio, il notebook: standardizza le feature rispettando la regola anti-leakage (`.fit()` solo su train); addestra l'Autoencoder (architettura `9 → 6 → 3 → 6 → 9`) sui soli campioni normali, usando come anomaly score la distanza euclidea L2 tra input e ricostruzione; addestra Random Forest e XGBoost sul train etichettato completo; normalizza i tre score in [0,1] con parametri appresi solo sul validation set e li media in un unico score d'ensemble; ottimizza una soglia di classificazione massimizzando l'F1 sul validation, applicandola poi al test; valuta i quattro modelli (Autoencoder, Random Forest, XGBoost, Ensemble) con Precision, Recall, F1 e AUC-ROC; infine proietta lo spazio latente dell'Autoencoder in 2D con PCA per visualizzare la separazione tra le classi.

Ogni scelta metodologica è ancorata a una sezione precisa del materiale teorico del corso, richiamata direttamente nei titoli delle celle del notebook.

## Dati

| Proprietà | Valore |
|---|---|
| Nome | Statlog (Shuttle) |
| Fonte canonica | UCI Machine Learning Repository |
| Formulazione | Binaria per anomaly detection (ODDS / PyOD benchmark) |
| Numero di campioni | 49.097 |
| Numero di feature | 9 (tutte numeriche continue) |
| Valori mancanti | Nessuno |
| Target | `anomaly` — 0 = Normale, 1 = Anomalia |
| Anomalie | 3.511 (7,2% del totale) |

Non è un dataset sintetico: è un benchmark pubblico e reale (UCI/ODDS), scelto al posto di alternative come Water Quality and Potability (scartato: nessun potere predittivo, AUC ≈ 0,50), ECG5000, Credit Card Fraud o NSL-KDD. Shuttle è interamente numerico (nessun encoding categorico necessario), di dimensioni gestibili, con anomalie realmente separabili (verifica preliminare con Isolation Forest: AUC = 0,9975) ed è un benchmark riconosciuto per l'outlier detection — il miglior equilibrio tra semplicità di preprocessing e onestà delle metriche.

Fonte ufficiale: `https://archive.ics.uci.edu/ml/datasets/Statlog+(Shuttle)`. La versione usata è la formulazione binaria standard per anomaly detection (2 classi, 9 feature), fornita nel file `shuttle.csv` allegato.

Gestione dei dati: split stratificato Train (60%) / Validation (20%) / Test (20%), mantenendo la stessa proporzione di anomalie in ogni set; standardizzazione (`StandardScaler`) fittata esclusivamente su `X_train`. L'Autoencoder usa solo il sottoinsieme dei campioni normali del train; Random Forest e XGBoost usano il train etichettato completo.

## Ciclo di vita ML

- **Raccolta dati**: non applicabile nel senso classico — il dataset è un benchmark pubblico già raccolto e pulito (nessun valore mancante), non generato né raccolto dal progetto.
- **Training**: tre modelli indipendenti addestrati sullo stesso split. Autoencoder denso (PyTorch) con early stopping sulla validation loss; Random Forest (`class_weight="balanced"`, 300 alberi); XGBoost (`scale_pos_weight` per lo sbilanciamento, early stopping sul validation set). Seed fisso `SEED = 42` per NumPy e PyTorch, per garantire la riproducibilità dei risultati.
- **Validazione**: normalizzazione min-max dei tre anomaly score (parametri appresi solo sul validation, per non introdurre leakage sul test), media in un unico score d'ensemble, soglia ottimizzata massimizzando l'F1 sul validation e poi applicata — una sola volta — al test. Metriche riportate: Precision, Recall, F1-Score, AUC-ROC (mai Accuracy, vista la forte sbilanciamento delle classi).
- **Deploy**: il progetto è un prototipo/notebook d'esame, non un sistema in produzione. Non è previsto alcun deploy: il notebook eseguito, con tutti gli output e i grafici incorporati, costituisce il deliverable finale.
- **Monitoring**: non essendoci un ambiente di produzione reale, non è implementato un monitoraggio automatico. Concettualmente, in un'ipotetica messa in produzione andrebbero monitorati lo scarto tra le metriche di validation e quelle su nuovi batch di sensori, e la stabilità nel tempo della feature importance dei modelli ad albero.

## MLOps

Cosa si dovrebbe monitorare in un'ipotetica messa in produzione: lo scarto tra F1/AUC di validation e quelli osservati su nuovi dati di sensori (segnale di data drift), la distribuzione dei singoli anomaly score (Autoencoder, RF, XGBoost) nel tempo, e la stabilità della feature importance della Random Forest.

Il re-training andrebbe innescato in caso di: introduzione di nuovi tipi di sensori o di nuove modalità di guasto non rappresentate nel dataset originale, deriva (drift) nella distribuzione delle feature rispetto al training, o un peggioramento delle metriche di validazione sotto una soglia accettabile.

Per quanto riguarda il **testing**, il progetto copre manualmente, all'interno del notebook, i livelli *data and components* (assenza di NaN residui, shape coerenti, verifica che il fit dello scaler avvenga solo su train) e *model functional* (metriche di valutazione, ispezione dello spazio latente); il livello *production validation* (A/B testing, shadow deployment, monitoraggio continuo) non è applicabile, trattandosi di un prototipo. Si dichiara esplicitamente, come **debito tecnico consapevole**, l'assenza di una suite di test automatizzati (`pytest`) e di una pipeline CI/CD: per un'estensione futura andrebbero estratte le funzioni di preprocessing in moduli testabili, scritti unit test anti-leakage e configurato un workflow di Continuous Integration, fino a un eventuale ciclo di Continuous Training.

Sul fronte **governance**: il dataset Shuttle non contiene dati personali o sensibili (sono letture di sensori industriali), quindi non si pongono problemi di privacy o di equità (fairness) tra gruppi demografici; la trasparenza del processo decisionale è garantita dal `decision-log.md`, dove ogni scelta metodologica è motivata e le alternative scartate sono documentate.

## Rischi, assunzioni e limiti

- **Risultati molto alti sul test set (F1 = 1,000, AUC = 1,000 per l'ensemble)**: valori attesi e onesti per questo specifico dataset. Shuttle è notoriamente "facile" — le classi anomale hanno firme sensoriali molto marcate — e i benchmark pubblicati raggiungono regolarmente performance analoghe. Non si tratta di overfitting: la soglia è ottimizzata sul validation e valutata su un test set mai visto durante il tuning.
- **Il risultato più significativo è quello dell'Autoencoder da solo** (F1 = 0,959, AUC = 0,999): raggiunge performance eccellenti **senza mai usare le etichette**, a dimostrazione della potenza dell'approccio unsupervised basato sull'errore di ricostruzione.
- **Dataset "facile" per costruzione**: essendo un benchmark standard con anomalie ben separabili, le performance ottenute qui non sono automaticamente rappresentative di scenari industriali reali con anomalie più sottili o rumore di misurazione più elevato.
- **PatchCore scartato**: è stato valutato e abbandonato perché progettato per anomaly detection su immagini (patch spaziali da CNN pre-addestrate); su dati tabulari scalari è concettualmente inapplicabile senza cambiare dominio.
- **Nessuna suite di test automatizzati né pipeline CI/CD** (vedi sezione MLOps): le verifiche sono manuali, all'interno del notebook, coerentemente con lo scope di un progetto d'esame.
- Il progetto è funzionante end-to-end, dal caricamento dati alla valutazione comparativa finale; il punto debole, dichiarato esplicitamente, è l'assenza di un'infrastruttura di produzione (test automatizzati, CI/CD, monitoring reale), estranea al perimetro dell'esame.

## Ulteriori informazioni

- Stack tecnologico: Python, con `pandas`/`numpy` per la manipolazione dati, `matplotlib`/`seaborn` per le visualizzazioni, `scikit-learn` per Random Forest/PCA/preprocessing/metriche, `PyTorch` per l'Autoencoder, `xgboost` per il boosting.
- Il notebook è eseguito e salvato con tutti gli output incorporati (figure, metriche, tabelle): chiunque lo apra vede esattamente i risultati ottenuti, senza dover rieseguire nulla per verificarli — pur potendo farlo, ottenendo gli stessi numeri grazie al seed fisso.
- La scelta del dataset finale (Shuttle, al posto di Water Quality and Potability abbandonato in corso d'opera) e il motivo di questa scelta sono descritti nel `decision-log.md`.
