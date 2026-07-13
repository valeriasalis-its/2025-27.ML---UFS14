# Decision log

Ripercorrendo a ritroso le decisioni prese nella progettazione del classificatore Cats & Dogs.

## 1. Caricamento dati con `image_dataset_from_directory` invece di un Dataset custom

**Decisione:** usare `tf.keras.utils.image_dataset_from_directory` per caricare le immagini direttamente dalla cartella `Photos/`, con `validation_split=0.2` e `seed=123`.

**Perché questa scelta e non un'altra:** l'alternativa sarebbe stata scrivere un generatore o una classe custom per leggere i file, assegnare le label e fare lo split train/validation a mano. `image_dataset_from_directory` fa tutto questo automaticamente a partire dalla struttura delle cartelle (una sottocartella per classe), riducendo il codice necessario e il rischio di errori nell'assegnazione delle label. Il seed fisso è stato scelto per rendere lo split riproducibile tra esecuzioni diverse.

## 2. Pipeline dati con `cache()`, `shuffle()`, `prefetch()`

**Decisione:** applicare `cache().shuffle(8).prefetch(buffer_size=AUTOTUNE)` sul training set e `cache().prefetch(...)` sul validation set.

**Perché questa scelta e non un'altra:** senza queste ottimizzazioni, ad ogni epoca il dataset verrebbe riletto e ripreparato da disco, rallentando il training. `cache()` mantiene i dati in memoria dopo la prima lettura, `prefetch()` prepara il batch successivo mentre la GPU/CPU sta ancora elaborando quello corrente. Lo `shuffle()` è applicato solo al training set (non al validation set) perché mescolare l'ordine delle immagini di training aiuta il modello a non imparare pattern legati all'ordine dei dati, mentre per la validazione l'ordine è irrilevante.

## 3. Immagini a bassa risoluzione (100×100) e `Rescaling` come layer del modello

**Decisione:** ridimensionare le immagini a 100×100 pixel e normalizzare i valori in `[0,1]` con un layer `Rescaling(1./255)` inserito direttamente dentro il modello, invece che come step di preprocessing separato.

**Perché questa scelta e non un'altra:** una risoluzione più bassa (rispetto, ad esempio, a 224×224) riduce il costo computazionale del training, scelta ragionevole per un dataset locale di piccole dimensioni e per iterare più velocemente. Inserire il `Rescaling` come layer del modello (e non come trasformazione applicata ai dati prima del training) ha il vantaggio che la normalizzazione viene applicata automaticamente anche in fase di inferenza, senza doverla replicare manualmente ogni volta che si usa il modello per predire su una nuova immagine.

## 4. Architettura CNN semplice: 2 blocchi Conv+MaxPooling, non di più

**Decisione:** solo 2 blocchi convoluzionali (Conv2D 16 filtri → MaxPooling, poi Conv2D 32 filtri → MaxPooling), seguiti da Flatten e un classificatore Dense.

**Perché questa scelta e non un'altra:** con un dataset locale relativamente piccolo (a giudicare dal `batch_size=2` usato in training), un'architettura più profonda rischierebbe overfitting quasi immediato, oltre a richiedere più tempo di training senza garanzie di un reale beneficio. Due blocchi convoluzionali sono stati considerati sufficienti per estrarre feature di base (bordi, texture, forme semplici) per un problema binario relativamente contenuto come questo.

## 5. Dropout(0.5) prima dell'output

**Decisione:** un layer `Dropout(0.5)` tra il Dense(64) e il Dense finale.

**Perché questa scelta e non un'altra:** il Dropout "spegne" casualmente metà dei neuroni durante il training, costringendo la rete a non affidarsi troppo a singoli neuroni specifici — è una delle tecniche più semplici ed efficaci per ridurre l'overfitting, particolarmente utile qui vista la combinazione di dataset piccolo e rete relativamente semplice (rischio di overfitting più alto rispetto a un dataset grande).

## 6. Output con attivazione sigmoide + `binary_crossentropy`

**Decisione:** un solo neurone di output con attivazione `sigmoid`, loss `binary_crossentropy`.

**Perché questa scelta e non un'altra:** trattandosi di una classificazione a due classi (gatto/cane), un singolo output con sigmoide restituisce direttamente una probabilità tra 0 e 1, interpretabile come "quanto la rete è sicura che sia un cane" (valori vicini a 0 → gatto, vicini a 1 → cane). L'alternativa — due neuroni di output con softmax e `categorical_crossentropy` — sarebbe stata ridondante per un problema binario, aggiungendo complessità senza benefici.

## 7. Ottimizzatore Adam, 5 epoche

**Decisione:** `optimizer='adam'`, training per 5 epoche con validazione ad ogni epoca.

**Perché questa scelta e non un'altra:** Adam è stato scelto come scelta di default robusta per problemi di questo tipo, poiché adatta automaticamente il learning rate durante il training, riducendo la necessità di fare tuning manuale. Il numero di epoche (5) è stato scelto come compromesso per un primo esperimento rapido, con l'idea di osservare l'andamento delle curve di accuracy/loss (poi effettivamente plottate) prima di decidere se allenare più a lungo.

## 8. Visualizzazione delle curve accuracy/loss (training vs validation)

**Decisione:** dopo il training, plottare affiancate le curve di accuracy e loss sia sul training set sia sul validation set.

**Perché questa scelta e non un'altra:** guardare solo l'accuracy finale non basta per capire se il modello sta generalizzando bene o sta andando in overfitting. Confrontando le curve di training e validation side-by-side, è possibile individuare visivamente il punto in cui le due curve iniziano a divergere (segnale di overfitting), informazione che una singola metrica finale non darebbe.

## 9. Salvataggio del modello in formato `.keras` e ricaricamento per l'inferenza

**Decisione:** salvare il modello addestrato con `model.save("...keras")` e ricaricarlo con `load_model(...)` per fare le predizioni, invece di usare direttamente l'oggetto modello appena allenato.

**Perché questa scelta e non un'altra:** salvare e ricaricare il modello, anche nella stessa sessione, verifica che il modello sia effettivamente persistibile e riutilizzabile — un passaggio necessario se in futuro si vuole separare la fase di training da quella di inferenza (es. allenare una volta, poi usare il modello salvato in un'applicazione separata). Il formato `.keras` è stato scelto perché è il formato nativo raccomandato da Keras, più semplice da gestire rispetto ai formati legacy (es. HDF5).

## 10. Funzione `random_predict()` per validare "a occhio" il modello

**Decisione:** invece di limitarsi alle metriche numeriche (accuracy/loss), scrivere una funzione che sceglie un'immagine casuale dal dataset, mostra la predizione del modello insieme alla classe reale e alla confidenza percentuale.

**Perché questa scelta e non un'altra:** le metriche aggregate (accuracy media) non permettono di capire *su quali immagini* il modello sbaglia o quanto è sicuro delle sue predizioni. Una funzione di ispezione visiva, anche semplice, aiuta a fare un controllo qualitativo rapido oltre al numero secco di accuracy, ed è stata via via migliorata nel corso del notebook (ad esempio aggiungendo un filtro per escludere file di sistema nascosti come `.DS_Store` dalla selezione casuale delle immagini).

**Nota autocritica:** questa parte del notebook contiene diverse versioni ridefinite della stessa funzione e più salvataggi del modello con nomi diversi (`cat_dog_model.keras`, `my_cat_dog_model.keras`) — riflette un'iterazione rapida in fase di test più che una scelta progettuale definitiva, e andrebbe consolidata in un'unica versione pulita prima di una consegna finale.
