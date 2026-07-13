# QuickDraw Image Classifier

## Setup/How to run this project
Il progetto è pensato per Python 3.10 o superiore. Le dipendenze usate nel notebook sono `numpy`, `matplotlib`, `torch`, `scikit-learn` e `tqdm`.

Se si vuole avviarlo in locale, è sufficiente creare un ambiente virtuale e installare i pacchetti principali:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install numpy matplotlib torch scikit-learn tqdm jupyter
```

Poi si apre il notebook [deep_learning_draw.ipynb](deep_learning_draw.ipynb) ed esegue le celle in ordine. Il dataset può essere caricato dai file `.npy` presenti in `exam/quickdraw/quickdraw-dataset-master/`; se qualche file manca, il notebook prova a scaricarlo automaticamente dalla raccolta pubblica QuickDraw.

Il modello viene salvato in `exam/quickdraw/model.pth`.

## Spiegazione del progetto
Il progetto prova a riconoscere degli oggetti disegnati a mano a partire dalle bitmap del dataset QuickDraw. L’obiettivo è classificare correttamente il disegno tra categorie come `apple`, `airplane`, `cat`, `pizza` e altre simili.

Questo problema è stato scelto perché è abbastanza semplice da capire, ma comunque abbastanza interessante da mostrare una pipeline completa di deep learning: caricamento dati, preprocessing, training, validazione, salvataggio e riuso del modello.

## Dati
Si usa il dataset QuickDraw, in particolare 20 categorie selezionate tra quelle disponibili. I file grezzi sono bitmap in formato `.npy`, già convertite in immagini 28x28 in scala di grigi.

Queste classi permettono di lavorare su un problema gestibile, ma non banale. I dati sono già abbastanza puliti, quindi non ci sono valori mancanti in senso classico; la parte più importante è stata normalizzare i pixel e assicurarsi che i file fossero presenti localmente o scaricabili.

## Ciclo di vita ML
Nel progetto il ciclo di vita ML è molto lineare:

1. Raccolta dati: si usano i file QuickDraw `.npy` delle categorie selezionate.
2. Training: si addestra una CNN sui dati di training.
3. Validazione: controllo l’andamento su un validation set separato.
4. Deploy: il modello viene salvato in un file `.pth` che può essere ricaricato in seguito.
5. Monitoring: si osservano loss e accuracy su training e validation per capire se il modello sta migliorando davvero.

## MLOps
Le metriche più utili da monitorare sono validation loss e validation accuracy. Se la validation loss peggiora mentre la training loss continua a scendere, è un segnale di overfitting.

Fare re-training avrebbe senso se cambiassero i dati, se venissero aggiunte nuove categorie oppure se si notasse un calo evidente delle prestazioni sulle classi più difficili.

## Rischi, assunzioni e limiti
Il limite principale è che il progetto lavora solo su 20 categorie, quindi non copre tutto QuickDraw. Inoltre, essendo basato su immagini molto semplici, il modello potrebbe avere più difficoltà con disegni ambigui o poco leggibili.

Si assume anche che i file `.npy` siano disponibili o scaricabili correttamente e che l’ambiente abbia abbastanza risorse per far girare PyTorch senza problemi.

Il progetto è funzionante dall’inizio alla fine: carica i dati, addestra la rete, salva il modello e può ricaricare checkpoint precedenti. In futuro si potrebbe ampliare aggiungendo più categorie, una rete più profonda, data augmentation o una piccola interfaccia per testare i disegni in input.

## Ulteriori informazioni
La scelta dell’architettura è stata volutamente semplice: una CNN leggera, un training comprensibile e un salvataggio del modello facile da riusare. L’obiettivo non era costruire il sistema più sofisticato possibile, ma un progetto chiaro, riproducibile e spiegabile bene.