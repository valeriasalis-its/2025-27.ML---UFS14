# Decision log

Di seguito le decisioni principali prese durante la progettazione del simulatore di lanci spaziali e del modello ML di predizione del punto di atterraggio, con la motivazione dietro ciascuna scelta.

## 1. Motore fisico custom in JavaScript (RK4) invece di una libreria esterna
Abbiamo scritto da zero un integratore Runge-Kutta del 4° ordine (`RK4Integrator` in `simulation.js`) invece di appoggiarci a una libreria di fisica già pronta. Volevamo controllo completo sulle equazioni del moto (spinta, drag dipendente dalla densità dell'aria, vento, PID di correzione) e la possibilità di far girare la stessa identica simulazione sia nel browser (per l'interfaccia interattiva) sia per generare il dataset, senza dover portare la fisica in un secondo linguaggio o dipendere da pacchetti esterni non pensati per questo caso d'uso specifico.

## 2. Dataset sintetico generato dal simulatore, invece di dati reali
Non esistono dataset pubblici che colleghino in modo granulare parametri costruttivi di un razzo, condizioni meteo e punto di atterraggio esatto; raccogliere dati reali (lanci fisici) sarebbe stato costoso, lento e pericoloso. Generare i dati con il nostro stesso motore fisico (`dataset_generator.js`) ci ha permesso di avere il controllo completo sullo spazio dei parametri esplorato e etichette (target) esatte, senza rumore di misurazione da strumentazione reale.

## 3. Stratificazione in 5 categorie di razzo invece di campionamento uniforme
Nel generatore, i parametri non vengono scelti in modo uniforme e indipendente, ma raggruppati in 5 categorie coerenti (leggero, medio, pesante, precisione, aggressivo), ognuna con range correlati tra loro (es. i razzi leggeri hanno rapporto spinta/peso più alto e angolo di lancio più verticale). Campionare i parametri in modo totalmente indipendente avrebbe generato molte combinazioni fisicamente incoerenti o irrealistiche (es. un razzo pesantissimo con spinta minima), rendendo il dataset meno rappresentativo e più difficile da apprendere per il modello.

## 4. RandomForestRegressor come modello scelto, MLP scartato
Nei notebook era stata inizialmente prevista una sezione con un Multi-Layer Perceptron per la predizione della traiettoria, poi rimossa. Abbiamo preferito un `RandomForestRegressor` perché è robusto a feature con scale molto diverse (masse in kg, angoli in gradi, spinte in Newton) senza bisogno di normalizzazione, richiede meno tuning di iperparametri rispetto a una rete neurale per un dataset di questa dimensione, ed è più facile da interpretare tramite la feature importance — utile per capire quali parametri del razzo influenzano di più il punto di atterraggio.

## 5. Due notebook separati (`Yp` e `Np`) con feature diverse invece di un unico modello
Abbiamo deliberatamente addestrato due modelli con set di feature molto diversi: `Yp` usa solo i parametri "pre-lancio" (massa, carburante, spinta, burn time, angolo, più il rapporto spinta/massa derivato) per prevedere sia `landingX` che `landingY`; `Np` usa invece anche grandezze note solo a fine simulazione (apogeo, tempo di volo, punti di traiettoria) per prevedere `landingX`. La scelta di tenerli separati, invece di un unico modello "misto", ci ha permesso di confrontare esplicitamente il trade-off tra un modello realistico (utilizzabile davvero prima del lancio, ma meno accurato) e uno più accurato ma che sfrutta informazioni disponibili solo a posteriori — un confronto che è stato utile per capire i limiti reali del progetto.

## 6. `train_test_split` con `random_state=42` fissato
In entrambi i notebook lo split train/test (80/20) usa lo stesso seed casuale. La scelta è motivata dalla necessità di poter confrontare in modo affidabile le metriche tra run diverse (es. dopo l'aggiunta di una feature) senza che le variazioni di R²/MAE dipendessero semplicemente da uno split diverso dei dati.

## 7. Aggiunta della feature derivata `thrust_to_mass_ratio`
Nel notebook `Yp` abbiamo aggiunto come feature il rapporto spinta/massa totale, oltre alle grandezze grezze già presenti. In fisica missilistica questo rapporto (thrust-to-weight ratio) è un indicatore chiave delle prestazioni del razzo; un modello ad alberi come il Random Forest può in teoria ricavare rapporti tra feature tramite split successivi, ma fornirglielo già calcolato riduce la profondità necessaria degli alberi e rende la relazione più facile da apprendere con lo stesso numero di alberi/dati.

## 8. Rimozione delle colonne costanti e della colonna `trajectoryTimestamps`
Nel notebook `Np` abbiamo verificato che `pidKp`, `pidKi`, `pidKd` fossero completamente vuote/costanti nel dataset "no parachute" e le abbiamo rimosse, perché una feature senza varianza non porta informazione utile al modello e appesantisce solo il dataset. Allo stesso modo, la colonna `trajectoryTimestamps` (una stringa concatenata con l'intera traiettoria campionata) è stata scartata: usarla avrebbe richiesto un feature engineering dedicato (parsing, estrazione di serie temporali) fuori dallo scope della previsione diretta del punto di atterraggio.

## 9. Salvataggio del modello con `joblib` in formato `.pkl`
Per persistere il modello addestrato abbiamo scelto `joblib.dump` invece di formati più complessi/interoperabili come ONNX. Per lo stadio attuale del progetto (prototipo, modello usato solo all'interno di notebook Python) `.pkl` è la soluzione più semplice e nativamente compatibile con `scikit-learn`; la conversione a un formato eseguibile anche lato browser (necessaria per una vera integrazione col simulatore) è stata rimandata a un lavoro futuro.

## 10. Interfaccia in HTML/CSS/JS vanilla, senza framework front-end
Per la parte di interfaccia e visualizzazione non abbiamo usato React, Vue o framework simili, ma HTML/CSS/JavaScript puro con rendering su Canvas 2D (`renderer.js`). Trattandosi di un progetto di dimensioni contenute e con il focus principale sul motore fisico e sulla parte ML, l'uso di un framework avrebbe aggiunto complessità di build e dipendenze non giustificate dai reali benefici in questo contesto.
