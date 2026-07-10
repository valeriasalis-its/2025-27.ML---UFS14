# Rilevamento SMS Spam

## Setup/How to run this project

Requisiti di sistema:
- Python 3.14
- pip

Installazione delle dipendenze:
```
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

Per riaddestrare il modello da zero (rigenera `vectorizer.pkl` e `model.pkl` a partire dal dataset):
```
python addestramento.py
```

Per avviare l'applicazione web:
```
streamlit run app.py
```
L'app sarà disponibile su `localhost:8501`.

## Spiegazione del progetto

Il progetto è un sistema di classificazione binaria che, dato il testo di un SMS, predice se si tratta di **spam** o di un messaggio legittimo ("ham"). Il problema che risolve è quello, molto concreto, del filtraggio automatico di messaggi indesiderati: un utente riceve un SMS e il sistema decide se mostrarlo normalmente o segnalarlo come sospetto, senza intervento manuale.

Si tratta di un problema di **classificazione testuale supervisionata**: il modello viene addestrato una volta sola su un dataset etichettato, e poi usato "offline" per fare previsioni su nuovi messaggi mai visti prima.

## Dati

Il dataset utilizzato è lo **SMS Spam Collection Dataset**, disponibile pubblicamente su Kaggle: https://www.kaggle.com/datasets/uciml/sms-spam-collection-dataset

Lo abbiamo scelto perché:
- è etichettato manualmente (non serve fare labeling da zero, attività che avrebbe richiesto tempo e competenze che esulano dagli obiettivi dell'esame)
- ha una dimensione gestibile (5572 righe) per essere processato ed esplorato interamente senza infrastrutture particolari
- è un dataset standard e ben documentato, il che rende più facile verificare la correttezza della pipeline confrontandola con benchmark noti

Caratteristiche:
- 5572 messaggi SMS in lingua inglese, ciascuno etichettato come `ham` (legittimo) o `spam`
- Fortemente **sbilanciato**: dopo la pulizia, circa il 12,6% dei messaggi è spam contro l'87,4% di messaggi legittimi. Questo sbilanciamento è stato un fattore centrale nelle scelte successive (vedi decision log)

Gestione dei dati mancanti/malformati:
- Il file CSV originale conteneva 3 colonne quasi completamente vuote (`Unnamed: 2`, `Unnamed: 3`, `Unnamed: 4`), residuo di un export mal formattato: sono state scartate mantenendo solo etichetta e testo del messaggio
- Non erano presenti valori nulli nelle due colonne utili
- Erano invece presenti **righe duplicate** (403 su 5572): sono state rimosse per evitare che lo stesso messaggio venisse conteggiato più volte, falsando sia le statistiche descrittive sia la valutazione del modello (un duplicato finito sia in train che in test darebbe una stima di accuratezza artificialmente ottimistica)

## Ciclo di vita ML

- **Raccolta dati**: dataset statico scaricato una tantum da Kaggle, non c'è raccolta continua di nuovi dati in questa versione del progetto.
- **Training**: eseguito con lo script `addestramento.py`, che copre pulizia dati, preprocessing testuale, vettorizzazione TF-IDF e addestramento/confronto di più modelli di classificazione.
- **Validazione**: split train/test (80/20) con stratificazione sulla classe target, per mantenere la stessa proporzione spam/ham in entrambi gli insiemi vista la forte sbilanciatura. La selezione del modello finale è basata su precision, recall e F1-score sulla classe spam, non sulla sola accuracy (motivazione dettagliata nel decision log).
- **Deploy**: il modello e il vectorizer addestrati vengono serializzati con `pickle` e caricati da un'applicazione Streamlit (`app.py`), che espone un'interfaccia web minimale per l'inferenza su singoli messaggi inseriti dall'utente.
- **Monitoring**: non implementato in questa versione (vedi sezione MLOps per cosa si farebbe con più tempo/risorse).

Nella forma attuale il ciclo è quindi: **raccolta (una tantum) → training offline → validazione offline → deploy locale**, senza un ciclo di feedback automatico che richiuda il loop con nuovi dati.

## MLOps

Cosa andrebbe monitorato in un'ipotetica messa in produzione reale:
- **Data drift**: distribuzione delle lunghezze dei messaggi, frequenza dei termini più comuni nel tempo. Se il traffico SMS cambia stile (es. nuove tattiche di spam), le feature TF-IDF apprese sul dataset originale potrebbero perdere efficacia.
- **Performance del modello in produzione**: se fosse disponibile un feedback loop (es. utenti che segnalano falsi positivi/negativi), si monitorerebbero precision e recall reali nel tempo, non solo quelle misurate sul test set statico.
- **Volume e distribuzione delle classi**: un cambiamento improvviso nella proporzione spam/ham osservata in produzione rispetto a quella di training (~13% spam) sarebbe un segnale di allarme.

Quando fare re-training: il segnale principale sarebbe un calo osservato di precision o recall sotto una soglia accettabile, oppure un cambiamento sostanziale nella distribuzione dei dati in ingresso (data drift) rilevato tramite le metriche sopra. In assenza di un flusso di dati etichettati continuo, però, questo resta un processo che richiederebbe raccolta manuale di nuovi esempi etichettati a intervalli regolari, non un re-training automatico.

## Rischi, assunzioni e limiti

Rischi e limiti identificati:
- **Generalizzazione linguistica e temporale**: il dataset è stato raccolto nel Regno Unito diversi anni fa. I pattern linguistici tipici dello spam SMS possono essere cambiati, ed è un'assunzione forte che il modello generalizzi a messaggi recenti o di altri contesti geografici/culturali.
- **Solo inglese**: sia il dataset che il preprocessing (modello linguistico spaCy `en_core_web_sm`) sono specifici per la lingua inglese. Il sistema non è utilizzabile così com'è su SMS in italiano o altre lingue.
- **Trade-off precision/recall accettato consapevolmente**: il modello finale ha un recall di circa l'83%, cioè circa 1 spam su 6 non viene intercettato. È una scelta deliberata per contenere i falsi positivi (messaggi legittimi bloccati), ma resta un limite concreto, non un bug da correggere semplicemente abbassando la soglia di decisione senza rivalutarne l'impatto complessivo.
- **Assenza di feedback loop**: non essendoci un meccanismo per raccogliere segnalazioni di errore dagli utenti reali, il modello non migliora nel tempo una volta deployato.

Il progetto è funzionante dall'inizio alla fine: dal dataset grezzo, passando per pulizia, preprocessing, training e selezione del modello, fino all'applicazione web che carica il modello serializzato e produce predizioni in tempo reale su input inseriti dall'utente. Lo abbiamo verificato eseguendo l'intera pipeline e testando l'inferenza su esempi nuovi non presenti nel dataset originale.

Possibili ampliamenti:
- Aggiungere un dataset in italiano (o multilingua) per rendere il sistema utilizzabile su SMS reali in contesti non anglofoni
- Implementare un meccanismo di feedback (l'utente segnala una previsione sbagliata) per raccogliere dati per un re-training periodico
- Esporre il modello anche come endpoint API oltre che come interfaccia Streamlit, per permettere l'integrazione in altri sistemi
- Sperimentare rappresentazioni del testo più moderne (es. embedding da modelli linguistici pre-addestrati) al posto di TF-IDF, valutando se il guadagno in performance giustifica la maggiore complessità e il maggior costo computazionale

## Ulteriori informazioni

Il progetto parte da un'implementazione di riferimento ampiamente diffusa online per questo tipo di problema (dataset SMS Spam Collection + pipeline NLP classica + classificatore scikit-learn), che è stata presa come base concettuale e poi riscritta: cambiando libreria di preprocessing linguistico (da nltk a spaCy, con lemmatizzazione al posto dello stemming), cambiando il criterio di selezione del modello finale (da sola precision a F1-score, per una motivazione discussa nel decision log) e aggiornando tutte le dipendenze per garantire compatibilità con Python 3.14.
