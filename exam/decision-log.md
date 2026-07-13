# Decision log

## Decisione 1: affrontare un problema di classificazione di disegni semplici
Ho scelto di lavorare su un problema di riconoscimento di immagini perché volevo qualcosa di concreto, facile da misurare e anche abbastanza immediato da spiegare. QuickDraw, in questo senso, mi è sembrata una buona base: i dati sono già divisi in categorie chiare e posso capire abbastanza velocemente se il modello sta imparando davvero oppure no.

Potevo scegliere un problema testuale o una regressione, ma mi avrebbero portato subito su aspetti meno centrali per quello che volevo fare io. Invece, con una classificazione di immagini, ho potuto concentrarmi meglio sulla parte di addestramento e valutazione del modello.

## Decisione 2: limitare il progetto a 20 categorie
QuickDraw contiene tantissime classi, ma ho preferito non partire da tutto il dataset. Ho selezionato 20 categorie perché mi sembrava un compromesso più sensato tra varietà e gestione pratica del progetto.

Se avessi usato tutte le categorie, avrei avuto un problema più grande, ma anche molto più pesante da gestire in termini di tempo, memoria e interpretazione degli errori. Con 20 classi il progetto resta interessante, ma rimane ancora realistico da sviluppare e da presentare.

## Decisione 3: usare una CNN invece di una rete completamente connessa
Per questo tipo di immagini ho scelto una CNN perché i disegni non sono solo una lista di pixel: contano anche la forma, i bordi e la posizione dei tratti. Mi serviva quindi un modello che riuscisse a leggere bene questo tipo di struttura, e una rete convoluzionale è molto più adatta di una fully connected.

In più, ho trovato più sensato usare un’architettura abbastanza semplice da spiegare, invece di qualcosa di più pesante o complicato. La CNN mi dà un buon equilibrio tra efficacia, velocità di addestramento e leggibilità del progetto.

## Decisione 4: normalizzare i dati e usare immagini 28x28
Ho lasciato il formato originale delle bitmap QuickDraw e ho semplicemente normalizzato i pixel dividendo per 255. È una scelta molto pratica, ma importante, perché aiuta la rete a lavorare su valori più stabili.

Non ho cercato di aumentare la risoluzione perché, in questo caso, sarebbe stato quasi inutile. Le immagini sono già abbastanza semplici e 28x28 sono sufficienti per riconoscere la forma generale del disegno senza complicare troppo il training.

## Decisione 5: usare train/validation split invece di allenare tutto il dataset
Ho diviso i dati in training e validation set con uno split 80/20 perché volevo avere un controllo reale su quello che stava succedendo durante l’addestramento. Guardare solo il training non basta: un modello può sembrare molto bravo e poi fallire appena vede dati nuovi.

Per questo non mi sono limitato ad allenarlo e basta. Senza validation, non avrei avuto un modo affidabile per capire se stava migliorando davvero o se stava semplicemente memorizzando i dati.

## Decisione 6: limitare il numero di campioni per epoca
Nel notebook ho anche ridotto il numero di campioni usati quando il dataset era troppo grande. Questa non è una scelta “teorica”, ma pratica: mi serviva far girare il progetto in tempi ragionevoli e poter fare più prove senza aspettare troppo a lungo.

Avrei potuto usare tutto il dataset, ma in sviluppo sarebbe stato molto meno comodo. Per me era più utile avere iterazioni rapide e poter capire in fretta se una modifica andava nella direzione giusta.

## Decisione 7: usare Adam, CrossEntropyLoss ed Early Stopping
Ho scelto Adam perché è un ottimizzatore molto affidabile e, soprattutto all’inizio, mi ha permesso di partire senza dover fare un tuning troppo complesso. Per la loss ho usato CrossEntropyLoss, che è la scelta più naturale per una classificazione multiclasse.

L’early stopping, invece, l’ho introdotto perché non volevo continuare ad allenare il modello quando la validation loss smetteva di migliorare. Per me è stato un modo semplice ma efficace per limitare l’overfitting e salvare il miglior modello, senza affidarmi all’ultima epoca eseguita.

## Decisione 8: salvare il modello in locale e riutilizzare eventuali pesi precedenti
Ho deciso di salvare il modello in un file .pth dentro il progetto perché mi interessava poter riprendere il lavoro senza ricominciare tutto da zero. È una scelta molto utile sia per i test sia per la riproducibilità.

Ho anche previsto il caricamento di eventuali checkpoint precedenti filtrando solo i pesi compatibili. L’ho fatto perché nel tempo il progetto è cambiato e alcuni strati finali non potevano essere riutilizzati in modo diretto. In questo modo ho mantenuto il recupero dei pesi, ma senza forzare un caricamento che avrebbe creato errori.

## Decisione 9: privilegiare semplicità, leggibilità e ripetibilità
Nel costruire il notebook ho cercato di mantenerlo lineare: prima i dati, poi il modello, poi il training, la validazione e infine il salvataggio. Non ho voluto aggiungere subito una pipeline più complessa perché, in questa fase, per me era più importante avere un progetto chiaro e facile da seguire.

Questa scelta mi sembra la più adatta anche per un contesto di esame: non conta solo ottenere un risultato, ma anche riuscire a spiegare bene ogni passaggio e mostrare che il lavoro è ripetibile.