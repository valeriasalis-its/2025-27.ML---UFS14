# QuickDraw Image Classifier

## Configurazione e avvio dell'applicazione
L'infrastruttura software richiede un runtime Python 3.10 o edizioni successive. I pacchetti esterni adoperati all'interno del codice includono `numpy`, `matplotlib`, `torch`, `scikit-learn` e `tqdm`.

Per l'esecuzione in un ambiente locale, è sufficiente configurare uno spazio virtuale isolato e procedere all'installazione dei componenti core tramite terminale:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install numpy matplotlib torch scikit-learn tqdm jupyter
```

Successivamente, occorre inizializzare il file interattivo `deep_learning_draw.ipynb` ed eseguire i blocchi di codice in sequenza temporale. Il dataset viene caricato dai file`.npy` collocate nel percorso `exam/quickdraw/quickdraw-dataset-master/`; qualora alcuni file risultassero assenti, la logica interna tenterà il download automatico dalla raccolta pubblica del framework QuickDraw.

I pesi definitivi del sistema predittivo vengono esportati e memorizzati in `C:\PW01 (project work)\2025-27.ML---UFS14\Gioele Colombo\quickdraw\model.pth`.

## Analisi concettuale dell'opera
L'applicazione mira ad identificare venti differenti tipologie di schizzi eseguiti a mano libera, elaborando i file bitmap estratti dal dataset QuickDraw. L'obbiettivo del progetto è quello di andare a classificare correttamente lo schizzo fatto a mano tra le categorie `apple`, `airplane`, `cat`, `pizza` ecc....

Questo scenario d'uso è stato selezionato poiché presenta un livello di complessità accessibile ma, al contempo, ideale per illustrare l'intero ciclo operativo del deep learning strutturato: caricamento dati, preprocessing, training, validazione, salvataggio e riuso del modello.


## Struttura dei dati
L'alimentazione del sistema si basa sulla base documentale QuickDraw, composto da 20 classi predefinite. I file sorgente si presentano come bitmap in formaton `.npy`, già formattate come griglie bidimensionali da 28x28 pixel in scala di grigi.

L'utilizzo delle classi ci permette di lavorare in maniera gestibile, non banale. Visto che i dati in se sono abbastanza puliti non abbiamo bisogno di farlo noi, l'attività cruciale si è focalizzata sulla normalizzazione dei pixel e sulla verifica della reperibilità dei file sul disco locale o tramite rete.

## Ciclo di vita del modello
L'architettura del ciclo di vita del modello segue una traiettoria lineare:

1. Raccolta dati: recupero dei file in formato `.npy` riferiti alle categorie scelte.
2. Fase di training: ottimizzazione dei parametri di una rete neurale convoluzionale (CNN) sui record di addestramento.
3. Fase di validation: controllo dell'andamento su una porzione di dati separata.
4. Fase di deploy: salvataggio del file `.pth` per impieghi futuri.
5. Fase di monitoring: si controllano la loss e l'accuracy sia sul test che sul validation per vedere se il modello sta davvero imparando e per evitare l'overfitting.

## MLOps
Le metriche fondamentali da sottoporre a ispezione costante sono la validation loss e il rispettivo livello di accuratezza. Un peggioramento sul validation set e una discesa continua nel training set delinea un fenomeno critico di sovra-addestramento (overfitting).

Un ciclo di riaddestramento programmato risulterebbe indispensabile in presenza di mutamenti strutturali nei vettori di input, nel caso di aggiunta di nuove classi o a seguito di un calo delle performance predittive sulle classi più complesse.

## Vincoli, ipotesi e scenari di rischio
Il fattore limitante principale risiede nel perimetro ristretto a venti categorie, una porzione parziale rispetto a QuickDraw. Inoltre, data la natura estremamente essenziale delle immagini geometriche, il classificatore potrebbe mostrare incertezze davanti a tratti grafici equivoci o eccessivamente confusi.

Si presuppone che i file `.npy` si scarichino in maniera corretta, oltre alla presenza di risorse hardware idonee a sostenere i carichi di calcolo dell'ambiente PyTorch.

Il progetto funziona dall’inizio alla fine: carica i dati, addestra la rete, salva il modello e può ricaricare checkpoint precedenti. Gli sviluppi futuri prevedono l'inclusione di nuove categorie, un'architettura neurale più profonda, una data augmentation o lo sviluppo di un front-end interattivo per testare gli input.

## Dettagli complementari
La scelta dell'architettura è ricaduta volutamente in una CNN leggera, con una fase di training comprensibile e con un salvataggio facile. L'intento primario non risiedeva nello sviluppo del modello più articolato, bensì nella realizzazione di un'opera chiara, riproducibile e ben spiegato.