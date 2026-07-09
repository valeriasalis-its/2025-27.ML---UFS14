# Rocket Trajectory Simulator & Landing Predictor

## Setup/How to run this project

Il progetto è composto da due parti indipendenti ma comunicanti:

**1. Simulatore (front-end)**
- File: `index.html`, `style.css`, `app.js`, `simulation.js`, `renderer.js`.
- È un'applicazione **vanilla JavaScript**, senza framework né build step: basta aprire `index.html` in un browser moderno (Chrome/Edge/Firefox aggiornati), oppure servirlo con un semplice web server statico (es. `npx serve .` o l'estensione "Live Server" di VS Code).
- Requisiti: nessuna dipendenza esterna, solo un browser con supporto a Canvas 2D e JavaScript ES6+.

**2. Generazione dataset**
- File: `dataset_generator.js`.
- Usa la classe `RocketSimulation` definita in `simulation.js` per lanciare N simulazioni (di default 10.000) e produrre un dataset in formato tabellare (CSV). Va eseguito in un ambiente dove `RocketSimulation` è disponibile (browser console, oppure Node con un piccolo adattamento delle classi).

**3. Training del modello ML**
- File: `Rocket_ML_model_Yp.ipynb`, `Rocket_ML_model_Np.ipynb`.
- Notebook pensati per **Google Colab** (contengono `drive.mount`), ma eseguibili anche in locale con Jupyter.
- Librerie richieste: `pandas`, `numpy`, `scikit-learn`, `matplotlib`, `seaborn`, `joblib`.
- Serve caricare i CSV generati al punto precedente (es. `rocket_dataset_main_3.csv`, `rocket_dataset_main_no_parachute.csv`) nell'ambiente di esecuzione del notebook.

## Spiegazione del progetto

Il progetto simula il lancio di un razzo amatoriale e ne prevede il punto di atterraggio.

La parte di **simulazione fisica** (`simulation.js`) integra le equazioni del moto con un metodo Runge-Kutta del 4° ordine (RK4), includendo: spinta e consumo del carburante, resistenza aerodinamica (dipendente da densità dell'aria, coefficiente di drag, sezione del razzo), un modello di vento con raffiche stocastiche e wind-shear in quota, un controllore PID che corregge la traiettoria tramite vettorizzazione della spinta e deflessione di alette, un sistema di comunicazione radio Terra-razzo con latenza simulata, e un paracadute per la discesa.

La parte **applicativa** (`app.js`, `renderer.js`, `index.html`) offre un'interfaccia per impostare i parametri del razzo (massa, spinta, angolo di lancio, geometria, condizioni di vento, guadagni PID...), lanciare la simulazione, osservarla in tempo reale su canvas (vista laterale + vista "globo" della traiettoria) e consultare la telemetria (quota, velocità, accelerazione, deviazione laterale, stato dei comandi).

La parte di **Machine Learning** (i due notebook) affronta il problema di prevedere le coordinate di atterraggio (`landingX`, `landingY`) a partire dai parametri del razzo, addestrando un modello di regressione (`RandomForestRegressor`) su un dataset sintetico di migliaia di lanci simulati. L'obiettivo è capire quanto sia possibile stimare il punto di atterraggio **prima** del lancio, conoscendo solo le caratteristiche costruttive del razzo.

## Dati

Non esistono dataset pubblici sufficientemente dettagliati che colleghino parametri costruttivi di un razzo, condizioni meteo e punto di atterraggio esatto: per questo si è scelto di generare un **dataset sintetico** tramite il motore fisico del simulatore stesso (`dataset_generator.js`).

Il generatore produce 10.000 lanci, stratificati in 5 categorie di razzo (leggero, medio, pesante, di precisione, aggressivo), ciascuna con range coerenti di massa, rapporto spinta/peso, frazione di carburante, coefficiente di drag e guadagni PID, in modo da evitare combinazioni fisicamente irrealistiche (es. un razzo pesantissimo con spinta minima).

Per ogni lancio vengono salvati: i **parametri di input** (massa totale, massa carburante, spinta, tempo di combustione, angolo di lancio, diametro, lunghezza, angolo del cono, cd, velocità/variabilità del vento, guadagni PID, tipo di correzione/paracadute), gli **output di volo** (quota massima, velocità massima, tempo di volo, coordinate di atterraggio, deviazione laterale) e cinque **punti caratteristici della traiettoria** (T0, T1, apogeo, T2, T finale), oltre a una rappresentazione testuale dell'intera traiettoria campionata.

Gestione dei dati: nel notebook `Np` si è verificato che le colonne `pidKp`, `pidKi`, `pidKd` fossero completamente vuote nel dataset "no parachute" e sono state rimosse; la colonna categorica `rocketType` è stata trasformata con one-hot encoding; la colonna `trajectoryTimestamps` (stringa complessa) è stata scartata perché richiederebbe un feature engineering dedicato non necessario per la previsione del punto di atterraggio.

## Ciclo di vita ML

- **Raccolta dati**: simulazione massiva e automatizzata (`dataset_generator.js`), senza intervento manuale, con parametri casuali ma vincolati a range fisicamente plausibili.
- **Training**: due iterazioni distinte in due notebook (`Yp` e `Np`), entrambe con `RandomForestRegressor` di `scikit-learn`, `train_test_split` 80/20 e `random_state=42` per la riproducibilità.
- **Validazione**: confronto tra R² sul training set e R² sul test set (per individuare overfitting), Mean Absolute Error in metri, grafici di feature importance e analisi delle performance al variare del numero di stimatori (`n_estimators`).
- **Deploy**: il modello viene serializzato con `joblib` in un file `.pkl`.
- **Monitoring**: non essendoci un ambiente di produzione reale, non è implementato un monitoraggio automatico; è però prevista, come processo manuale, la rigenerazione del dataset e il re-training ogni volta che il motore fisico (`simulation.js`) viene modificato.

## MLOps

Cosa si dovrebbe monitorare in un'ipotetica messa in produzione: lo scarto tra R² di training e di validazione (segnale di overfitting), l'MAE su nuovi batch di simulazioni generate periodicamente, e la stabilità della feature importance nel tempo.

Il re-training andrebbe innescato in caso di: modifiche alle equazioni fisiche del simulatore (che renderebbero il dataset esistente obsoleto), aggiunta di nuovi parametri costruttivi del razzo, o un peggioramento delle metriche di validazione sotto una soglia accettabile.

## Rischi, assunzioni e limiti

- **Dati interamente sintetici**: il modello impara i limiti e le semplificazioni del motore fisico, non la realtà fisica vera e propria. Eventuali bias o approssimazioni della simulazione (es. modello di vento, drag semplificato) si riflettono direttamente nel modello ML.
- **Overfitting nel modello `Yp`**: usando solo i parametri di lancio "puri" (massa, spinta, burn time, angolo + rapporto spinta/massa) per prevedere sia `landingX` che `landingY`, si ottiene un R² di training di 0,92 contro un R² di validazione di 0,45 (MAE ≈ 280 m). Questo indica che, con solo i parametri pre-lancio, il punto di atterraggio è intrinsecamente rumoroso a causa della componente stocastica del vento.
- **Il modello `Np` raggiunge un R² di 0,99** (MAE ≈ 43 m) ma solo perché tra le feature usate compaiono anche grandezze note solo **a simulazione conclusa** (es. quota all'apogeo, tempo di volo, punti della traiettoria): è quindi un ottimo modello "a posteriori", utile per analisi, ma non rappresenta una vera previsione utilizzabile prima del lancio.
- **Assunzione sul vento**: il vento è modellato come processo semi-casuale (combinazione di seno + rumore, con wind-shear logaritmico in quota), non basato su dati meteorologici reali.
- Il progetto è funzionante end-to-end per la parte simulazione/visualizzazione e per la parte di training offline dei modelli.

## Ulteriori informazioni

- Stack tecnologico: JavaScript vanilla (nessun framework) per simulatore e interfaccia, rendering su Canvas 2D; Python (pandas, scikit-learn, matplotlib, seaborn, joblib) per la parte di Machine Learning, sviluppata su notebook Google Colab.
- Sono stati prodotti due notebook di training distinti (`Yp` e `Np`) proprio per confrontare due approcci diversi allo stesso problema: la scelta e il motivo di questa scelta sono descritti nel `decision-log.md`.
