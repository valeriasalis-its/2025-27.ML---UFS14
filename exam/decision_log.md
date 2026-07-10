# Decision_Log

## Decisione 1: cimentarsi con la classificazione di schizzi basilari
Ho deciso di focalizzarmi sul riconoscimento visivo perché cercavo un caso d'uso tangibile, semplice da valutare e rapido da raccontare. In quest'ottica, QuickDraw si è rivelato un ottimo punto di partenza: il dataset è ben organizzato in classi distinte e mi permette di notare subito se la rete sta effettivamente apprendendo.

Avrei potuto optare per un problema testuale o una regressione, ma mi avrebbero distratto dall'obiettivo principale. Scegliendo invece di classificare immagini, ho avuto modo di dedicare più energie alle fasi di training e misurazione delle performance del modello.

## Decisione 2: restringere il campo a 20 classi
Il dataset QuickDraw offre un'infinità di categorie, eppure ho evitato di usarle tutte fin dall'inizio. Ne ho filtrate appena 20 perché mi pareva il giusto equilibrio tra l'avere dati variegati e la comodità di sviluppo.

Sfruttare l'intero archivio avrebbe reso la sfida enorme, appesantendo di molto i tempi di calcolo, l'uso della memoria e l'analisi degli sbagli. Mantenendo solo 20 etichette, il lavoro si conferma stimolante ma decisamente più fattibile e facile da presentare.

## Decisione 3: preferire una CNN a una rete fully connected
Ho optato per una CNN perché, trattando disegni, l'input non è una semplice lista di pixel: la forma generale, i contorni e il posizionamento spaziale fanno la differenza. Avevo bisogno di un'architettura capace di cogliere queste caratteristiche, e i layer convoluzionali battono nettamente le reti fully connected in questo.

Oltretutto, mi sembrava più logico montare una rete snella e facile da illustrare, scartando soluzioni inutilmente pesanti o articolate. Questa CNN mi assicura il compromesso ideale tra buoni risultati, training veloce e chiarezza del progetto.

## Decisione 4: normalizzare i pixel e mantenere il formato 28x28
Ho mantenuto le dimensioni native delle bitmap QuickDraw, limitandomi a normalizzare i valori dei pixel dividendoli per 255. È una mossa essenzialmente di comodo, ma fondamentale per aiutare la rete ad addestrarsi su numeri più stabili.

Non ha avuto senso provare ad alzare la risoluzione dei file. Parliamo di schizzi molto minimali, quindi una griglia 28x28 basta e avanza per far capire la forma generale dell'oggetto, evitando di appesantire il processo inutilmente.

## Decisione 5: separare training e validation set
Ho spezzato i dati applicando una classica divisione 80/20 per training e validation, così da monitorare con precisione cosa succedeva sotto il cofano. Affidarsi unicamente alla fase di training è rischioso: la rete potrebbe sembrare un fenomeno e poi crollare davanti a dati mai visti.

Ecco perché non l'ho solo allenata alla cieca. Senza un set di validazione di prova, non avrei mai saputo con certezza se il modello stesse imparando a generalizzare o stesse solo imparando le immagini a memoria.

## Decisione 6: ridurre la quantità di dati per epoca
All'interno del codice ho tagliato il numero di campioni quando il blocco di dati diventava troppo grande. Non c'è una grande teoria dietro, è pura praticità: volevo che le esecuzioni finissero in tempi umani per fare test frequenti senza aspettare le ore.

Potevo tranquillamente caricare tutto, ma in fase di sviluppo sarebbe stato frustrante. Trovo molto più utile avere cicli veloci che mi facciano capire al volo se le modifiche che sto facendo funzionano o no.

## Decisione 7: affidarsi ad Adam, CrossEntropy e Early Stopping
Ho puntato su Adam perché è un ottimizzatore solido e mi ha fatto saltare la scocciatura di dover tarare a mano troppe cose fin dall'inizio. Come funzione di perdita la CrossEntropyLoss è stata una via obbligata, essendo lo standard per questo genere di task multiclasse.

L'early stopping, invece, l'ho inserito per staccare la spina al training non appena la loss di validazione si appiattiva o peggiorava. L'ho trovato un trucco tanto banale quanto comodo per arginare l'overfitting e tenermi l'iterazione migliore, anziché beccarmi per forza i risultati dell'ultima epoca.

## Decisione 8: export in locale e recupero dei salvataggi passati
Ho voluto salvare il modello in un file .pth nella cartella di lavoro per evitare di dover rifare il training da zero ogni singola volta. Torna davvero utile sia per fare test veloci sia per garantire che il sistema sia riproducibile.

In più, ho scritto un pezzetto di logica per ricaricare i vecchi checkpoint prendendo solo i pesi compatibili. Durante lo sviluppo gli ultimi strati sono cambiati e non matchavano più in modo diretto; così facendo, posso riciclare le parti buone senza far bloccare il programma per un errore di caricamento.

## Decisione 9: puntare tutto su chiarezza, pulizia e riproducibilità
Nel creare il file notebook ho mantenuto una struttura lineare: prima si caricano i dati, si crea la rete, si addestra, si valida e infine si salva. Ho evitato apposta di infilarci subito strutture troppo ingarbugliate perché la priorità era avere un flusso pulito e comprensibile.
