# Cats & Dogs classification using CNN

## Setup/How to run this project

**Requisiti:**
```
Python 3.x
tensorflow (con Keras integrato)
matplotlib
numpy
```

**Struttura dati richiesta:** una cartella `Photos/` nella stessa directory del notebook, organizzata in due sottocartelle:
```
Photos/
├── Cats/
└── Dogs/
```

**Passaggi:**
1. Installare le librerie richieste (`pip install tensorflow matplotlib numpy`)
2. Posizionare la cartella `Photos/` con le immagini divise per classe
3. Eseguire le celle in ordine:
   - caricamento dataset (`image_dataset_from_directory`)
   - ottimizzazione della pipeline (cache/shuffle/prefetch)
   - definizione e training del modello (5 epoche)
   - visualizzazione delle curve di accuracy/loss
   - salvataggio del modello (`.keras`)
   - test con predizioni su immagini casuali tramite `random_predict()`

Il modello addestrato viene salvato su disco (`my_cat_dog_model.keras`) e può essere ricaricato con `load_model(...)` senza dover rifare il training.

## Spiegazione del progetto

L'obiettivo è costruire un classificatore binario in grado di distinguere immagini di **gatti** e **cani** usando una rete neurale convoluzionale (CNN). È un problema di computer vision classico, scelto per la sua natura didattica: permette di lavorare sull'intera pipeline di un progetto di image classification (caricamento dati, costruzione modello, training, valutazione, inferenza) restando su un task concettualmente semplice.

Il modello, una volta addestrato, prende in input un'immagine e restituisce una probabilità: valori vicini a 1 indicano "cane", valori vicini a 0 indicano "gatto".

## Dati

**Fonte:** dataset locale custom, organizzato in una cartella `Photos/` con due sottocartelle (`Cats/`, `Dogs/`), caricato tramite `tf.keras.utils.image_dataset_from_directory`.

**Perché questa scelta:** usare `image_dataset_from_directory` permette di ottenere automaticamente sia le label (dedotte dal nome della sottocartella) sia lo split train/validation (`validation_split=0.2`), senza dover scrivere manualmente un dataset custom.

**Caratteristiche:** immagini ridimensionate a `100×100` pixel, normalizzate in `[0, 1]` tramite il layer `Rescaling(1./255)` direttamente dentro il modello (non come step di preprocessing separato).

**Gestione dati mancanti/non validi:** nel notebook non è presente un passaggio esplicito di pulizia del dataset (non viene verificato se ci sono immagini corrotte o non leggibili prima del training). Le uniche precauzioni presenti riguardano la fase di inferenza casuale (`random_predict`), dove vengono escluti i file nascosti del sistema (es. `.DS_Store`) filtrando quelli che iniziano con un punto.

## Ciclo di vita ML

- **Raccolta dati:** cartella locale di immagini organizzata manualmente per classe, non un dataset pubblico scaricato via API.
- **Preparazione:** resize a 100×100, normalizzazione via `Rescaling`, split train/validation 80/20 con seed fisso (`seed=123`) per la riproducibilità, pipeline ottimizzata con `cache()`, `shuffle()` e `prefetch()` per velocizzare la lettura durante il training.
- **Training:** CNN allenata da zero (no transfer learning), 5 epoche, con validazione ad ogni epoca sul validation set.
- **Validazione:** presente, a differenza di molte altre versioni di questo tipo di progetto — le curve di accuracy/loss vengono plottate confrontando training e validation, permettendo di individuare a occhio eventuale overfitting.
- **Deploy:** non vero e proprio deploy in produzione, ma il modello viene salvato su disco in formato `.keras` e ricaricato per fare inferenza — è il primo passo verso un deploy reale (es. wrapping in un'API).
- **Monitoring:** non implementato — vedi sezione MLOps.

## MLOps

Il progetto si ferma al training + salvataggio del modello, senza un ciclo MLOps automatizzato. In un'ipotetica estensione:

- **Cosa monitorare:** accuracy e loss sul validation set (già disponibili come base), eventualmente estese a un test set separato mai visto durante training/validazione; qualità e distribuzione delle nuove immagini in caso di aggiornamento del dataset.
- **Quando fare re-training:** se venissero aggiunte nuove immagini alla cartella `Photos/` (nuove razze, condizioni di luce/inquadratura diverse), o se le predizioni su immagini reali mostrassero un calo di affidabilità rispetto ai risultati osservati in validazione.

## Rischi, assunzioni e limiti

**Limiti identificati:**
- `batch_size=2` è molto piccolo: rallenta il training e rende le stime di gradiente più rumorose rispetto a batch size più standard (es. 32); è probabilmente una conseguenza delle dimensioni ridotte del dataset locale usato.
- Non è presente uno step di pulizia/validazione delle immagini prima del training (nessun controllo su file corrotti o non leggibili).
- Non è presente un test set separato dal validation set: il validation set viene usato sia per monitorare il training sia, implicitamente, come unica misura di qualità del modello.
- Nessuna data augmentation: su un dataset locale presumibilmente di dimensioni contenute, questo aumenta il rischio di overfitting.
- Il notebook contiene diverse celle di training/inferenza duplicate o ridefinite più volte (`random_predict`, `predict_on_image`, salvataggi multipli del modello con nomi diversi) — segno di iterazione rapida più che di codice finale pulito; andrebbero consolidate in un'unica versione.

**Assunzioni:**
- Si assume che la cartella `Photos/` sia già organizzata correttamente in `Cats/` e `Dogs/` con immagini valide.
- Si assume che le due classi siano ragionevolmente bilanciate numericamente, non essendoci controlli espliciti sul bilanciamento.

**Il progetto è funzionante dall'inizio alla fine?** Sì: dal caricamento del dataset locale fino al salvataggio del modello e alla predizione su immagini casuali, il flusso è completo ed eseguibile. La parte finale del notebook (ultime celle) contiene però codice ridondante e in un caso non eseguibile così com'è (una definizione di funzione commentata il cui corpo resta senza indentazione funzionante) — va ripulita prima di una consegna definitiva.

**Come potrebbe essere ampliato:**
- Aggiungere un vero test set separato da training/validation
- Aumentare il `batch_size` se il dataset lo consente
- Introdurre data augmentation (flip, rotazioni, zoom)
- Ripulire le celle finali duplicate/non eseguibili
- Aggiungere metriche aggiuntive oltre all'accuracy (es. precision/recall, matrice di confusione)

## Ulteriori informazioni

Il notebook alterna celle di codice a celle di commento testuale (in inglese) che spiegano brevemente cosa fa ciascun blocco (es. il ruolo di ogni libreria importata, il significato dei layer del modello, il perché delle scelte di compilazione) — una forma di documentazione inline che accompagna passo passo la lettura del codice.
