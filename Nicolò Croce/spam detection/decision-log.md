# Decision log

## 1. Scelta del dataset: SMS Spam Collection

**Decisione**: usare il dataset SMS Spam Collection (Kaggle), invece di raccogliere dati nostri o usare un dataset di email spam (es. il più noto "Enron Spam" o simili).

**Perché**: raccogliere ed etichettare manualmente migliaia di SMS reali avrebbe richiesto tempo e accesso a dati non disponibili nel contesto dell'esame. Un dataset di email è stato scartato perché la struttura testuale è diversa (header, corpo lungo, HTML): gli SMS sono messaggi brevi, informali, con un vocabolario più ristretto, e questo cambia sensibilmente le caratteristiche utili alla classificazione. Il dataset scelto è inoltre uno standard di riferimento per questo tipo di problema, il che permette di confrontare i risultati ottenuti con benchmark noti in letteratura.

## 2. Rimozione dei duplicati invece di tenerli

**Decisione**: eliminare le righe duplicate (403 su 5572) prima di procedere con l'analisi e il training.

**Perché**: tenere i duplicati avrebbe distorto sia le statistiche descrittive (alcuni messaggi sarebbero stati sovra-rappresentati) sia, soprattutto, la valutazione finale del modello: se una riga duplicata finisce sia nel training set che nel test set, il modello "ricorda" quell'esempio invece di generalizzare, e le metriche di accuratezza risultano artificialmente più alte di quanto sarebbero su dati mai visti. Abbiamo preferito una stima più onesta, anche se leggermente più bassa, piuttosto che un risultato gonfiato.

## 3. Preprocessing testuale con spaCy invece di nltk

**Decisione**: usare spaCy per tokenizzazione, rimozione stopword e lemmatizzazione, al posto di nltk (usato nell'implementazione di riferimento da cui siamo partiti).

**Perché**: nltk richiede il download separato di risorse (`punkt`, `stopwords`) ed è basato su un approccio più datato. La scelta tecnica più rilevante però è **lemmatizzazione invece di stemming**: lo stemming (es. l'algoritmo di Porter usato da nltk) tronca le parole in modo euristico seguendo regole fisse (es. "winning" → "winn"), producendo a volte forme che non sono parole reali. La lemmatizzazione riconduce ogni parola alla sua forma canonica dizionario (es. "winning" → "win") sfruttando un modello linguistico allenato, risultando più corretta e interpretabile. Il costo in cambio è un preprocessing leggermente più lento, che abbiamo giudicato accettabile per un dataset di questa dimensione (5169 righe, elaborate in pochi minuti).

Un fattore pratico ha pesato ulteriormente su questa scelta: spaCy garantisce compatibilità piena con Python 3.14 (verificato: dalla versione 3.8.11 in poi, grazie all'adozione di Pydantic v2), requisito esplicito del progetto.

## 4. TF-IDF invece di semplice conteggio delle parole (Bag of Words)

**Decisione**: rappresentare i messaggi con vettori TF-IDF invece che con un semplice conteggio di occorrenze (CountVectorizer).

**Perché**: nei test preliminari (replicando l'approccio dell'implementazione di riferimento), il conteggio grezzo delle parole dava risultati nettamente peggiori (precision massima intorno al 94-95% con Naive Bayes) rispetto a TF-IDF (precision fino a 1.0 con lo stesso modello). Questo succede perché TF-IDF penalizza le parole molto comuni e poco informative, dando invece più peso a termini distintivi dello spam (es. "vinci", "premio", "gratis") che compaiono in proporzione maggiore nei messaggi spam rispetto al corpus generale.

## 5. Metrica di selezione del modello: F1-score invece della sola precision

**Decisione**: scegliere il modello finale in base all'F1-score sulla classe spam, invece che in base alla sola precision (criterio usato nell'implementazione di riferimento originale, che sceglieva il modello con precision più alta).

**Perché**: il dataset è fortemente sbilanciato (~87% ham, ~13% spam), quindi guardare la sola accuracy sarebbe fuorviante — un modello che rispondesse sempre "non spam" otterrebbe già l'87% di accuracy senza aver imparato nulla. Ma anche guardare la sola precision si è rivelato un criterio incompleto: nei nostri test, la Regressione Logistica ha ottenuto precision perfetta (1.0) ma un recall di solo 0.66, cioè lascia passare inosservato uno spam su tre pur di non sbagliare mai su un messaggio legittimo. Un sistema con questo comportamento sarebbe poco utile in pratica, perché filtrerebbe solo una minoranza dello spam reale.

Abbiamo quindi scelto l'F1-score (media armonica di precision e recall) come criterio, perché rappresenta un compromesso più equilibrato tra i due tipi di errore possibili: bloccare un messaggio legittimo (falso positivo) e lasciar passare uno spam (falso negativo). Con questo criterio il modello selezionato è **SVM con kernel sigmoid** (precision ≈ 0,98, recall ≈ 0,83, F1 ≈ 0,90), che rinuncia a un pizzico di precision rispetto alla Regressione Logistica in cambio di un recall molto più alto.

## 6. SVM invece di modelli ensemble più complessi (Random Forest, ExtraTrees, Voting/Stacking)

**Decisione**: usare SVM come modello finale, invece di modelli ensemble più sofisticati.

**Perché**: nei test, i modelli ensemble non hanno superato l'SVM secondo il criterio scelto (F1-score); Random Forest è risultato molto vicino (F1 ≈ 0,898 contro 0,901 di SVM) ma con maggiore complessità e minore interpretabilità. A parità di prestazioni, abbiamo preferito il modello più semplice: è più facile da spiegare, più veloce da addestrare e meno soggetto a overfitting su un dataset di dimensioni contenute come questo.

## 7. Streamlit per il deploy invece di un'API REST dedicata

**Decisione**: esporre il modello tramite una semplice applicazione Streamlit invece di costruire un'API REST (es. con Flask o FastAPI).

**Perché**: l'obiettivo del progetto è dimostrare l'intera pipeline (dati → training → inferenza) in modo verificabile e interattivo, non costruire un servizio pronto per la produzione. Streamlit permette di ottenere un'interfaccia utilizzabile con pochissimo codice, senza dover gestire separatamente backend, frontend e comunicazione HTTP. Il limite di questa scelta — nessuna API riutilizzabile da altri sistemi — è esplicitamente segnalato nel README come possibile ampliamento futuro.

## 8. Aggiornamento delle versioni delle librerie per compatibilità con Python 3.14

**Decisione**: fissare requisiti minimi di versione (`pandas>=2.2`, `scikit-learn>=1.8`, `spacy>=3.8.11`, `streamlit>=1.50`) invece di replicare le versioni datate dell'implementazione di riferimento originale (streamlit 0.87, nltk 3.6.2).

**Perché**: le versioni originali risalgono al 2021 e non sono compatibili con Python 3.14, requisito esplicito del progetto. Abbiamo verificato (tramite ricerca sulla documentazione ufficiale e sui changelog dei progetti) quali fossero le prime versioni di ciascuna libreria con supporto dichiarato a Python 3.14, per evitare di fissare requisiti che sembrano corretti ma falliscono all'installazione.
