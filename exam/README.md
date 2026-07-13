# Smart Recycling Bin — CNN per la classificazione dei rifiuti

Il progetto è una rete neurale convoluzionale che, data la foto di un rifiuto, capisce di che materiale è fatto e quindi in che bidone andrebbe buttato. L'idea è quella di un "bidone intelligente" che aiuta a fare la raccolta differenziata correttamente.

Autore: Lorenzo Bortoluzzi

## Setup/How to run this project

Tutto il progetto sta in un unico notebook: [`smart_recycling_bin.ipynb`](./smart_recycling_bin.ipynb).

Il modo più semplice per eseguirlo è Google Colab:

1. caricare il notebook su [Google Colab](https://colab.research.google.com/)
2. attivare la GPU gratuita da `Runtime → Change runtime type → T4 GPU`
3. eseguire le celle in ordine dall'alto verso il basso

Il dataset si scarica da solo alla prima esecuzione tramite la libreria `kagglehub`, non serve nessun account Kaggle.

Per eseguirlo in locale invece serve:

- Python 3.10 o superiore
- circa 200 MB di spazio per il dataset
- una GPU non è obbligatoria ma senza il training è lento

```bash
pip install -r requirements.txt
jupyter notebook smart_recycling_bin.ipynb
```

Le librerie usate sono nel file [`requirements.txt`](./requirements.txt): torch e torchvision per il modello, numpy e matplotlib per calcoli e grafici, kagglehub per il dataset, scikit-learn per le metriche, opencv-python e Pillow per la parte webcam/immagini.

Nota: le ultime celle (predizione su una foto propria e cattura dalla webcam) hanno bisogno di un'immagine caricata a mano o di una webcam. Tutto il resto del notebook funziona senza.

## Spiegazione del progetto

L'obiettivo è addestrare un classificatore di immagini che riconosca il materiale di un rifiuto a partire da una foto.

Il problema che vorrebbe risolvere è quello degli errori nella raccolta differenziata: quando un rifiuto finisce nel bidone sbagliato il materiale riciclabile si contamina e il riciclo funziona peggio. Un bidone con una fotocamera e questo modello a bordo potrebbe dire all'utente dove buttare l'oggetto, o in prospettiva smistarlo da solo.

Come funziona: uso il transfer learning, cioè parto da MobileNetV2 già addestrata su ImageNet, congelo i layer convoluzionali (che sanno già riconoscere bordi, texture e forme) e riaddestro solo l'ultimo pezzo sulle 6 classi di rifiuti. Il flusso del notebook è: download del dataset → data augmentation → training con validazione a ogni epoca → valutazione finale sul test set → salvataggio del modello → prova su foto reali.

Il risultato finale è **79,74% di accuracy sul test set** (380 immagini mai viste durante il training).

## Dati

Ho usato [TrashNet](https://github.com/garythung/trashnet), scaricato da Kaggle ([feyzazkefe/trashnet](https://www.kaggle.com/datasets/feyzazkefe/trashnet)) con `kagglehub`, quindi chi riesegue il notebook scarica esattamente gli stessi dati.

L'ho scelto perché è il dataset più usato per questo tipo di problema: sono foto vere di rifiuti, già etichettate e già divise in una cartella per classe, che è esattamente il formato che si aspetta `ImageFolder` di PyTorch. L'alternativa era farmi un dataset da solo fotografando rifiuti, ma ci avrei messo settimane per avere molte meno immagini.

Caratteristiche: 2.527 immagini a colori in 6 classi: cardboard (cartone), glass (vetro), metal (metallo), paper (carta), plastic (plastica), trash (indifferenziato). Le classi non sono bilanciate, trash è la più piccola.

Split: 70% training (1.768 immagini), 15% validation (379), 15% test (380), con seed fissato così lo split è riproducibile.

Sui dati mancanti: essendo immagini e non tabelle non ci sono valori mancanti veri e propri. Però le immagini vanno uniformate: le ridimensiono tutte a 224×224 e le normalizzo con media e deviazione standard di ImageNet, perché il modello pre-addestrato si aspetta input fatti così. Sul training set applico anche data augmentation (flip, rotazioni, variazioni di colore) per compensare il fatto che il dataset è piccolo.

## Ciclo di vita ML

1. **Raccolta dati**: automatizzata nel notebook con kagglehub, versione fissa del dataset, quindi riproducibile.
2. **Training**: 15 epoche di transfer learning con Adam, CrossEntropyLoss e uno scheduler che dimezza il learning rate ogni tot epoche (0.001 → 0.0005 → 0.00025). Nel notebook ci sono le curve di apprendimento (loss e accuracy, train vs validation) per controllare overfitting e underfitting.
3. **Validazione**: a ogni epoca valuto sul validation set, che non viene mai usato per aggiornare i pesi. Alla fine valuto sul test set con confusion matrix e classification report per classe.
4. **Deploy**: questa fase è solo progettata, non realizzata. Il modello viene salvato come checkpoint (`smart_recycling_bin.pth`, con dentro pesi, classi e metriche) e si può ricaricare per fare solo inferenza. Il deploy realistico sarebbe su un dispositivo tipo Raspberry Pi con fotocamera dentro al bidone: ho scelto MobileNetV2 anche per questo, perché è abbastanza leggera per girare su hardware del genere.
5. **Monitoring**: anche questa progettata, la descrivo nella sezione MLOps.

## MLOps

Cosa monitorerei se il modello fosse in produzione:

- l'accuracy per classe, non solo quella media: già adesso trash ha f1-score 0,55 mentre cardboard 0,87, la media nasconde le classi che vanno male
- la confidenza delle predizioni: se aumentano le predizioni a bassa confidenza vuol dire che arrivano immagini diverse da quelle del training (data drift)
- le correzioni degli utenti: se l'utente corregge il bidone suggerito, quella è un'etichetta gratis che dice dove il modello sbaglia
- la distribuzione delle classi predette: se il bidone inizia a dire "plastica" per tutto probabilmente c'è un problema a monte (fotocamera sporca, luce cambiata)

Quando rifarei il training:

- se l'accuracy sul campo scende sotto una soglia decisa prima (per esempio 75%)
- quando si accumulano abbastanza foto reali corrette dagli utenti, che sono più rappresentative di quelle "pulite" di TrashNet
- se cambiano i materiali in circolazione (nuovi packaging) o si aggiungono categorie di raccolta

## Rischi, assunzioni e limiti

Assunzioni che ho fatto:

- che le foto di TrashNet (oggetto singolo, sfondo neutro, buona luce) siano abbastanza simili a quelle che un bidone vero scatterebbe. È l'assunzione più debole del progetto.
- che ogni rifiuto sia di un solo materiale: il modello dà una sola classe per immagine, ma tanti rifiuti veri sono misti (bottiglia di plastica con etichetta di carta).

Limiti e rischi:

- il dataset è piccolo (2.527 immagini) e sbilanciato: trash è la classe peggiore (f1 0,55, solo 24 immagini nel test set) proprio perché ha pochi esempi ed è molto varia al suo interno
- con foto vere fatte col telefono (sfondi pieni di roba, luce variabile) l'accuracy sarà sicuramente più bassa del 79,74% del test set
- dalla confusion matrix, metallo e plastica si confondono tra loro più delle altre classi (superfici riflettenti simili)
- le 6 classi non corrispondono ai bidoni reali, che cambiano da comune a comune (in alcuni carta e cartone vanno insieme, ecc.)

**Il progetto è funzionante dall'inizio alla fine?** Sì: tutte le celle sono state eseguite, dal download dei dati al salvataggio del modello, e gli output sono visibili nel notebook.

Come lo amplierei:

- fine-tuning degli ultimi blocchi convolutivi (ora sono congelati) per provare a guadagnare accuracy
- raccogliere foto reali "sporche" per ridurre la distanza dal mondo reale
- passare dalla classificazione all'object detection per gestire più rifiuti nella stessa foto
- convertire il modello in un formato mobile (TorchScript/ONNX) e provarlo su Raspberry Pi
- rendere configurabile la mappa classi → bidoni in base alle regole del proprio comune

## Ulteriori informazioni

Nel notebook ci sono tre parti extra rispetto al progetto base:

- **Grad-CAM**: fa vedere dove guarda la rete quando classifica, con una heatmap sulle zone dell'immagine che hanno pesato di più. L'ho aggiunta per verificare che il modello guardi l'oggetto e non lo sfondo.
- **Cattura da webcam** con OpenCV: si fotografa un oggetto vero e si vede la predizione al volo. È anche il test più onesto della differenza tra dataset e realtà.
- **Segmentazione con DeepLabV3**: un esperimento per isolare l'oggetto dallo sfondo prima di classificarlo.

## Perché ho scelto questo progetto

Non volevo un progetto "da esercizio", tipo riconoscere cani e gatti, che si dimentica appena consegnato. Cercavo qualcosa che avesse un senso anche fuori dall'aula, e la raccolta differenziata mi è sembrata perfetta: è un problema che riguarda tutti tutti i giorni, sbagliare bidone è facilissimo, e il fatto che una macchina possa aiutarti a farlo bene mi è sembrato un uso concreto e onesto del deep learning. Mi piaceva anche l'idea di poter mostrare il progetto a chiunque — anche a chi non sa niente di reti neurali — e farmi capire in una frase: "gli fai vedere una foto e ti dice in che bidone va".

## I ragionamenti dietro le scelte (i compromessi che ho accettato)

La cosa che ho capito facendo questo progetto è che il deep learning è quasi tutto una questione di **compromessi**, non di trovare "la risposta giusta". Alcuni che ho dovuto affrontare:

- **Accuratezza contro leggerezza.** Avrei potuto usare un modello più grande (tipo ResNet) e forse guadagnare qualche punto di accuracy. Ho scelto MobileNetV2, più leggera e meno precisa, perché ho ragionato sul *dove* girerebbe davvero il modello: dentro un bidone, cioè su un dispositivo piccolo, non su un supercomputer. Ho preferito un modello coerente con l'uso reale piuttosto che un numero più bello nel report.
- **Fare in fretta contro imparare bene.** Congelando i layer del modello pre-addestrato ho reso il training velocissimo, ma ho rinunciato a lasciargli "riadattare" tutto ai rifiuti. È un compromesso che rifarei, perché con così poche immagini lasciare libero tutto il modello lo avrebbe fatto peggiorare.
- **Un numero solo contro la verità.** Sarebbe stato comodo scrivere "79,74% di accuracy" e fermarmi. Ma quel numero da solo mente: nasconde che sulla classe "trash" il modello va male (f1 0,55). Ho preferito guardare le metriche per singola classe, anche se raccontano una storia meno bella, perché è quella vera.

## Cosa ho imparato e le difficoltà che ho incontrato

La lezione più grande è stata che **il modello è solo metà del lavoro**. All'inizio pensavo che il difficile fosse "far funzionare la rete neurale", e invece quello è quasi la parte più semplice grazie al transfer learning. Il difficile è tutto il resto: capire se i dati sono buoni, accorgersi che una classe è sbilanciata, non farsi ingannare da un'accuratezza alta, ragionare su cosa succederebbe con foto vere invece di quelle "pulite" del dataset.

Le difficoltà concrete:
- **La classe "trash"** è stata un problema fin da subito: poche immagini e tutte diverse tra loro (è "tutto il resto"), quindi il modello fa fatica. Ho capito che non era un mio errore di codice ma un limite dei dati, e questo è già un risultato: saperlo riconoscere.
- **Il divario tra dataset e realtà.** Quando ho provato la webcam con oggetti veri, il modello sbagliava più che sul test set. Lì ho toccato con mano la differenza tra "funziona sui dati" e "funziona nel mondo".
- **Non fidarmi dei numeri belli.** La tentazione di guardare solo l'accuracy complessiva è forte; ho imparato a diffidarne quando i dati sono sbilanciati.

## Una riflessione oltre il progetto

Facendo questo lavoro mi sono anche chiesto: *fino a che punto è giusto fidarsi di un modello del genere?* Un bidone intelligente che sbaglia non è drammatico — al massimo un rifiuto finisce nel posto sbagliato. Ma il ragionamento cambia se penso a modelli simili usati per decisioni più delicate. Qui il rischio è basso, e proprio per questo è un buon banco di prova per ragionare su un principio che vale sempre: un modello va usato come **aiuto** a una persona, non come sostituto cieco. Nel mio caso il bidone dovrebbe *suggerire*, lasciando all'utente l'ultima parola — soprattutto sui casi in cui è poco sicuro. È la stessa idea di prudenza che, in scala molto più grande, serve in qualsiasi sistema di intelligenza artificiale.

---

Le scelte progettuali principali, con le alternative che avevo considerato, sono nel [decision-log](./decision-log.md).
