# Anomaly Detection di Deforestazione su Immagini Satellitari

Progetto d'esame — Machine Learning, ITS Academy Angelo Rizzoli — Milano, 2026
Convolutional Autoencoder (unsupervised) + Transfer Learning (supervised)

## Setup/How to run this project

Tutto il lavoro si trova in un unico file chiamato `esame_ml.ipynb` (si chiama "notebook": è un documento che contiene sia spiegazioni sia codice che si può eseguire, un pezzo alla volta).

Il programma è stato pensato per funzionare su un normale computer, senza componenti speciali (come una scheda grafica potente): per questo alcune scelte (immagini più piccole, meno immagini usate) sono state fatte apposta per farlo girare anche su un PC normale, anche se un po' più lentamente.

**Cosa serve per farlo partire:**
- Il programma Python, versione 3.10 o più recente.
- Alcuni "pacchetti" extra (piccoli programmi già pronti che il notebook usa), che si installano con questo comando:

```bash
pip install tensorflow pandas numpy matplotlib scikit-learn kagglehub umap-learn plotly
```

**A cosa servono questi pacchetti, in parole semplici:**
- `TensorFlow / Keras` — è lo strumento con cui si costruisce e si "allena" il programma che impara a riconoscere le immagini.
- `pandas`, `numpy` — servono per organizzare e sistemare i dati (numeri, tabelle, elenchi di immagini).
- `scikit-learn` — serve per dividere i dati in gruppi (una parte per insegnare al programma, una parte per testarlo) e per calcolare quanto è bravo il programma alla fine.
- `kagglehub` — serve per scaricare automaticamente le foto satellitari da internet.
- `matplotlib`, `seaborn`, `plotly`, `umap-learn` — servono per disegnare grafici e immagini che aiutano a capire come si comporta il programma.

**Come si esegue, passo per passo:**
1. Si apre il file `esame_ml.ipynb`.
2. Si eseguono le sue parti (chiamate "celle") una dopo l'altra, dall'inizio alla fine: prima si preparano gli strumenti, poi si scaricano le foto, poi si "puliscono" i dati, poi si allena il programma, e infine si guardano i risultati.
3. Per scaricare le foto serve un account gratuito sul sito Kaggle (il sito da cui arrivano le immagini satellitari), con una specie di "chiave" personale che permette al programma di scaricarle in automatico.
4. Nel codice è stato fissato un numero di partenza sempre uguale (chiamato "seed"), in modo che, rifacendo l'esperimento più volte, si ottengano sempre gli stessi identici risultati.

## Spiegazione del progetto

Ogni anno la foresta amazzonica perde un pezzo enorme di territorio — circa 10.000 km², una superficie grande quanto un'intera regione italiana — a causa di persone che tagliano gli alberi illegalmente, costruiscono strade non autorizzate, scavano miniere abusive o appiccano incendi per fare spazio a coltivazioni. Questo danneggia l'ambiente, gli animali e contribuisce ai cambiamenti climatici.

I satelliti fotografano continuamente la Terra e producono moltissime immagini. Il problema è che nessuna persona ha il tempo di guardarle tutte una per una per capire dove sta sparendo la foresta. Serve quindi un programma che lo faccia da solo, in automatico.

**Le due domande a cui il progetto vuole rispondere:**
1. Un programma che ha visto **solo** foto di foresta sana, senza mai vedere un esempio di disboscamento, riesce comunque ad accorgersi quando qualcosa non va, semplicemente notando che "questa foto non assomiglia a quelle che conosco"?
2. Quello che il programma impara guardando solo foreste sane, gli è utile anche per un compito diverso e più preciso (riconoscere davvero "questa è deforestazione" oppure no), oppure per farlo bene serve insegnargli con tanti esempi già etichettati?

**Come funziona, in parole semplici — due parti del progetto:**

- **Prima parte — un programma che impara da solo, senza aiuto:**
  Si fanno vedere al programma solo foto di foresta sana (mai foto con disboscamento). Il programma impara a fare due cose in sequenza:
  - guardare una foto e farne un "riassunto" molto compresso (tenendo solo le informazioni più importanti e buttando via i dettagli inutili);
  - usare questo riassunto per ridisegnare la foto originale, cercando di farla il più simile possibile all'originale.

  Se il programma ha imparato bene la foresta sana, quando gli si dà in pasto una foto di foresta sana riesce a "ridisegnarla" quasi perfettamente. Ma se gli si dà una foto con una strada o un terreno spoglio (cose mai viste prima), il disegno che produce viene molto meno preciso. Questa differenza tra la foto vera e quella "ridisegnata" (chiamata errore) diventa il segnale: più l'errore è alto, più è probabile che quella foto mostri un intervento umano.

- **Seconda parte — un programma che impara con l'aiuto di esempi già etichettati:**
  Qui, invece, al programma vengono mostrate foto già segnate come "normale" o "anomalia" (cioè con la risposta giusta già scritta accanto). Sono state provate tre versioni diverse:
  1. si riusa il "riassunto" già imparato nella prima parte, senza cambiarlo;
  2. si riusa lo stesso riassunto ma lo si lascia "aggiustare" un po', per adattarlo meglio a questo nuovo compito;
  3. si allena un programma completamente nuovo, da zero, senza riusare nulla della prima parte, giusto per fare un confronto.

## Dati

**Da dove arrivano le foto:** da una raccolta pubblica di immagini satellitari chiamata "Planet — Understanding the Amazon from Space", scaricata gratuitamente dal sito Kaggle.

**Perché è stata scelta questa raccolta:** perché contiene tantissime foto vere della foresta amazzonica, già accompagnate da etichette (piccoli "cartellini" che descrivono cosa si vede in ogni foto), quindi non è stato necessario guardare e segnare a mano ogni singola immagine.

**Quante foto ci sono e come sono fatte:**
- In totale ci sono 40.479 foto della zona amazzonica.
- Ogni foto ha più "cartellini" insieme: alcuni riguardano il meteo (es. "sereno", "nuvoloso", "foschia"), altri riguardano cosa c'è a terra (es. "foresta", "acqua", "strada", "coltivazione", "miniera"...).
- Esiste anche una versione delle foto con più informazioni (con anche la luce infrarossa, invisibile all'occhio umano), ma per far girare il programma più velocemente su un PC normale è stata usata la versione più semplice, quella a colori normali.

**Come sono state divise le foto in "normale" e "anomalia":**
Per semplificare il lavoro, ogni foto è stata messa in una di due sole categorie:
- **Normale** = foresta sana, senza nessun segno che qualcuno ci abbia messo mano.
- **Anomalia** = si vede qualcosa fatto dall'uomo: coltivazioni, strade, miniere, terreno spoglio, taglio di alberi, incendi, case.

Le foto solo nuvolose o con foschia non contano come anomalie: sono solo condizioni meteo del momento, non segni di disboscamento.

Con questa regola, su tutte le 40.479 foto disponibili si ottengono circa 21.773 foto "normali" e 16.325 foto "anomalia" (le rimanenti non rientrano chiaramente in nessuna delle due categorie e sono state lasciate da parte).

**Quante foto sono state usate davvero per allenare il programma** (un sottoinsieme più piccolo, scelto a caso ma sempre lo stesso ad ogni esecuzione, per non appesantire troppo il PC):
- 4.000 foto normali, usate per insegnare al programma della prima parte com'è fatta la foresta sana.
- 1.000 foto normali + 1.000 foto con anomalie, tenute da parte e mai usate per l'allenamento, solo per testare alla fine quanto è bravo il programma.
- Una piccola fetta (il 10%) delle foto normali di allenamento è stata tenuta in disparte per controllare, durante l'allenamento, che il programma non stesse "esagerando" nell'imparare a memoria invece che capire davvero.

**Come sono state preparate le foto prima di darle in pasto al programma:**
- Sono state ridotte a una dimensione più piccola e uguale per tutte (128×128 puntini), per fare più in fretta.
- I colori sono stati "riscalati" in un intervallo di numeri più semplice da gestire per il programma.
- Ad ogni giro di allenamento le foto vengono mischiate in ordine diverso, per evitare che il programma impari un ordine sbagliato invece del contenuto.
- È stato usato sempre lo stesso numero di partenza (seed), per poter ripetere l'esperimento ottenendo sempre lo stesso risultato.

**Dati mancanti o rovinati:** nel programma non è presente un controllo specifico per foto mancanti, rotte o scritte male: si parte dal presupposto che il file con le etichette e le foto scaricate da Kaggle siano già corrette e complete. Questo è un punto debole: se per caso ci fosse una foto danneggiata, il programma non se ne accorgerebbe automaticamente (vedi più sotto, nella sezione sui rischi).

## Ciclo di vita ML

- **Raccolta dei dati:** le foto vengono scaricate automaticamente da Kaggle.
- **Preparazione dei dati:** i "cartellini" originali vengono trasformati nelle due categorie semplici (normale/anomalia); viene scelto a caso un numero limitato di foto da usare; le foto vengono ridimensionate e uniformate.
- **Allenamento:**
  - Prima si allena il programma della prima parte, mostrandogli solo foto di foresta sana, fino a un massimo di 50 giri di allenamento (il sistema si ferma prima se capisce che continuare non migliora più i risultati, per non perdere tempo inutilmente) e viene salvata solo la versione migliore ottenuta.
  - Poi si allenano le tre versioni della seconda parte, quella con gli esempi etichettati, dividendo le foto in un gruppo per insegnare (70%) e un gruppo per verificare (30%).
- **Verifica dei risultati:**
  - Per la prima parte: si controlla quanto è diversa la "capacità di ridisegnare" tra foto normali e foto con anomalie — nei test, l'errore medio sulle foto anomale è risultato circa 2,4 volte più alto rispetto a quello sulle foto normali, il che vuol dire che il programma riesce davvero a distinguerle abbastanza bene, pur non avendole mai viste prima.
  - Per la seconda parte: si controlla quante anomalie il programma indovina giuste, quante ne sbaglia, e quante ne trova rispetto al totale.
- **Utilizzo pratico (deploy):** questo progetto è, per ora, solo un prototipo/esperimento realizzato per un esame, non è stato messo a disposizione online o collegato a un sistema reale di monitoraggio.
- **Controllo nel tempo (monitoring):** non è stato ancora implementato in questa fase; qui sotto ci sono alcune idee su come si potrebbe fare in futuro.

## MLOps

Essendo ancora un prototipo da esame, il progetto non ha (ancora) un sistema che lo controlla mentre è "in funzione". Se in futuro venisse usato davvero per monitorare la foresta, converrebbe tenere d'occhio:

- **Quanto il programma fatica a "ridisegnare" le nuove foto nel tempo:** se anche le foto di foresta sana iniziano ad avere un errore più alto del solito, potrebbe voler dire che le nuove foto sono cambiate rispetto a quelle su cui il programma si è allenato (per esempio un satellite diverso, un periodo dell'anno diverso, o una zona geografica mai vista prima).
- **Quanto è bravo il programma nel tempo:** rifare periodicamente i test di verifica su nuove foto etichettate, per controllare che il programma non stia peggiorando.
- **La soglia usata per decidere "normale o anomalia":** nei test si è visto che la stessa identica misura di errore può dare risultati molto diversi a seconda di dove si mette il confine tra "normale" e "anomalia" — quindi questo confine andrebbe ricontrollato ogni tanto e non lasciato fisso per sempre.
- **Quanto sono varie le foto usate per allenare il programma:** dato che è stato allenato solo su una piccola parte delle foto disponibili e solo con i colori normali (non con l'infrarosso), bisognerebbe accorgersi quando arrivano foto molto diverse da quelle già viste.

**In quali casi converrebbe rifare l'allenamento da capo (re-training):**
- Se i risultati dei test iniziano a peggiorare in modo continuo.
- Se il comportamento del programma sulle foto "normali" cambia nel tempo.
- Se compaiono nuovi tipi di intervento umano che il programma non ha mai imparato a riconoscere.
- Se cambia il satellite, la qualità delle immagini, o la zona geografica da monitorare.

## Rischi, assunzioni e limiti

**Cose date per scontate:**
- Dividere le foto solo in due categorie ("normale" oppure "anomalia") è una semplificazione: si perdono i dettagli su che tipo di intervento umano c'è davvero (una strada, una miniera, un incendio... vengono trattati tutti allo stesso modo).
- Si dà per scontato che i "cartellini" originali delle foto siano giusti e completi, senza un controllo indipendente.
- Si dà per scontato che le foto scaricate da Kaggle siano tutte integre e leggibili, senza controlli specifici nel programma.

**Limiti dichiarati apertamente:**
- **Nessuna scheda grafica potente disponibile:** il programma ha dovuto essere reso volutamente semplice e leggero per poter girare su un normale computer, il che limita quanto può imparare bene.
- **Foto piccole (128×128 puntini):** una scelta fatta per andare più veloci, che però può far perdere dettagli piccoli come una strada stretta o un piccolo taglio nella foresta.
- **Poche foto usate:** solo 4.000 foto normali su oltre 21.000 disponibili sono state usate per allenare il programma.
- **Solo colori normali, niente infrarosso:** non è stata sfruttata l'informazione extra (infrarossa) che potrebbe aiutare a distinguere meglio la vegetazione sana da quella malata o disboscata.
- **Non è detto che funzioni bene ovunque:** un programma allenato solo sulla foresta amazzonica potrebbe non funzionare altrettanto bene su altre foreste del mondo, con satelliti diversi o in stagioni diverse.
- **Il programma della prima parte non è ottimizzato per "classificare" ma per "ridisegnare":** questo spiega perché il programma allenato da zero con esempi etichettati (terzo approccio della seconda parte) ha ottenuto risultati migliori rispetto a quello che riusa senza modifiche il "riassunto" imparato nella prima parte; lasciandolo "aggiustare un po'" (fine-tuning) i risultati migliorano molto e si avvicinano a quelli del programma allenato da zero.

**Il progetto funziona dall'inizio alla fine?**
Sì: si può eseguire tutto il percorso, dal download delle foto fino al confronto finale tra i vari programmi, e rifacendolo si ottengono sempre gli stessi risultati (grazie al numero di partenza fissato). Funziona anche su un computer normale, senza bisogno di hardware speciale.

**Come si potrebbe migliorare in futuro** (idee già individuate nel progetto):
- Usare anche l'informazione infrarossa delle foto, per calcolare un indice che misura direttamente quanto è "in salute" la vegetazione.
- Usare un computer con scheda grafica più potente, tutte le foto disponibili (non solo un sottoinsieme) e foto più grandi e dettagliate.
- Provare un modo diverso e più raffinato di misurare l'errore tra foto vera e foto "ridisegnata".
- Partire da programmi già allenati da altri su grandi quantità di immagini, invece di costruirne uno da zero.
- Confrontare i risultati con altri metodi più avanzati, pensati apposta per questo tipo di problema.

## Ulteriori informazioni

- Il progetto comprende anche una presentazione (`esame_presentazione.pptx`) usata per spiegare il lavoro, con schemi di come funziona il programma, grafici sull'andamento dell'allenamento, immagini che mostrano "dove" il programma ha trovato le anomalie, e grafici che mostrano come il programma "vede" internamente le diverse foto.
- Nella presentazione ci sono ancora due campi da completare prima di mostrarla ufficialmente: il nome di chi presenta il progetto e il nome del professore relatore, al momento segnati solo come segnaposto generico.
- C'è anche un appunto, lasciato come promemoria in una delle slide, che ricorda di ricontrollare e aggiornare i numeri finali dei risultati prima di presentare il progetto, per essere sicuri che siano gli ultimi calcolati e non una versione precedente.
