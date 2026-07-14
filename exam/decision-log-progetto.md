# Decision Log: Progetto Incidenti Aerei

Questo documento ripercorre le decisioni architetturali e progettuali prese durante lo sviluppo del modello predittivo sugli incidenti aerei.

## 1. Definizione del Target: Classificazione Binaria (`Is_Catastrophic`)
* **Decisione:** Invece di prevedere il numero esatto di vittime (un problema di regressione), si è scelto di calcolare il tasso di mortalità (`Fatalities / Aboard`) e creare una variabile target binaria chiamata `Is_Catastrophic` (tasso di mortalità $\ge$ 80%).
* **Motivazione:** La classificazione binaria rende il modello molto più interpretabile e utile a livello di analisi del rischio. Prevedere l'esatto numero di vittime è estremamente suscettibile a variazioni casuali, mentre classificare un incidente come "altamente catastrofico" o "contenuto" permette di catturare le dinamiche generali della sopravvivenza.

## 2. Selezione e Preprocessing delle Feature Tabulari
* **Decisione:** Utilizzare `Aboard` (persone a bordo), `Year` (anno) e `Month` (mese). Il mese mancante è stato imputato usando "giugno" (6) come fallback, mentre per l'anno è stata usata la mediana. Le feature sono state standardizzate tramite `StandardScaler`.
* **Motivazione:** L'anno cattura il miglioramento tecnologico e delle misure di sicurezza nel tempo. Il mese aiuta a intercettare i pattern stagionali legati al meteo. Scegliere giugno come fallback per il mese minimizza le distorsioni posizionandosi a metà anno. La standardizzazione (`StandardScaler`) è fondamentale nelle reti neurali per evitare che feature con magnitudo elevata (come l'anno) dominino su quelle più piccole, garantendo un addestramento più stabile.

## 3. Gestione del Testo (`Summary`): Vocabolario Custom e Tokenizzazione
* **Decisione:** Tokenizzare il testo estraendo un vocabolario custom con le parole che compaiono almeno 2 volte (ignorando la punteggiatura). È stata scelta una lunghezza massima della sequenza (`MAX_LEN`) di 60 token.
* **Motivazione:** Implementare un vocabolario custom invece di usare modelli pre-addestrati giganteschi (es. BERT) mantiene il modello leggero ed efficiente. Scartare le parole che compaiono una sola volta riduce il rumore e la dimensione dell'embedding, prevenendo l'overfitting. Un `MAX_LEN` di 60 permette di catturare abbastanza contesto dalle sintesi (spesso brevi), applicando il *padding* o il *truncating* dove necessario.

## 4. Architettura del Modello: Rete Neurale Multimodale
* **Decisione:** Sviluppare un'architettura custom (`AirplaneCrashProNet`) che processa contemporaneamente dati tabulari (tramite Multi-Layer Perceptron) e testo (tramite Bi-LSTM). I due rami vengono poi uniti in un livello di classificazione finale.
* **Motivazione:** I dati a disposizione hanno natura diversa. Un semplice modello tabulare ignorerebbe i dettagli critici della dinamica dell'incidente presenti nel testo, mentre un modello solo testuale ignorerebbe la scala (persone a bordo) e l'epoca dell'incidente. L'architettura multimodale estrae il meglio da entrambi.

## 5. Analisi del Testo: Bidirezionalità (Bi-LSTM) e Self-Attention
* **Decisione:** Utilizzare una LSTM Bidirezionale abbinata a un modulo di `Self-Attention` pesato (`Attention` block), invece di un semplice RNN o di estrarre solo l'ultimo stato nascosto.
* **Motivazione:** La Bi-LSTM legge il testo sia da sinistra verso destra che viceversa, comprendendo meglio il contesto della frase. L'aggiunta della *Self-Attention* è la decisione più importante per il NLP: permette alla rete di assegnare pesi (importanza) diversi alle varie parole, "concentrandosi" su termini chiave (es. "mountain", "exploded", "storm") e ignorando le stop-words, migliorando drasticamente l'accuratezza senza richiedere modelli trasformer complessi.

## 6. Gestione dello Sbilanciamento delle Classi
* **Decisione:** Utilizzare `BCEWithLogitsLoss` passando il tensore `pos_weight`.
* **Motivazione:** Il dataset presenta un forte sbilanciamento (3634 incidenti catastrofici contro 1315 contenuti). Senza bilanciare i pesi, il modello tenderebbe a prevedere sempre la classe maggioritaria. Il parametro `pos_weight` penalizza maggiormente gli errori sulla classe minoritaria, forzando la rete a imparare a distinguerla.

## 7. Strategia di Addestramento: Scheduler e Early Stopping
* **Decisione:** Implementare l'ottimizzatore `Adam`, affiancato da `ReduceLROnPlateau` (che dimezza il learning rate dopo 2 epoche senza miglioramenti) e da un `Early Stopping` (che interrompe l'addestramento dopo 5 epoche di stallo).
* **Motivazione:** L'utilizzo del solo Adam con un learning rate fisso rischia di far "rimbalzare" la loss senza convergere sul minimo locale. Lo scheduler aiuta a fare *fine-tuning* riducendo il passo man mano che la validazione non migliora. L'Early Stopping evita lo spreco di risorse computazionali e previene l'overfitting, salvando il modello al suo picco ottimale di generalizzazione.
