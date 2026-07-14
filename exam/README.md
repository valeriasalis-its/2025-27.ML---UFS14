# VisualCaptioner - Modello di Descrizione Immagini

## Setup/How to run this project
Per avviare ed eseguire correttamente questo progetto, è necessario configurare un ambiente Python adeguato e installare le dipendenze richieste.
* **Requisiti di Sistema**: Si consiglia l'uso di Python 3.11 o Python 3.12 (il progetto è stato nativamente sviluppato e verificato sulla versione 3.12.12).
* **Librerie Esterne**: È richiesta l'installazione dei pacchetti PyTorch, Torchvision, Pillow (PIL), Matplotlib e Ipywidgets.
* **Comando di Installazione**: È possibile preparare l'ambiente eseguendo nel terminale il comando: `pip install torch torchvision pillow matplotlib ipywidgets`.
* **Esecuzione**: Aprire e riprodurre in sequenza le celle del notebook interattivo `ModelloFinito.ipynb` all'interno di Jupyter Lab, Jupyter Notebook o Google Colab.
* **Download dei Dati di Test**: La prima cella del notebook provvederà automaticamente a scaricare il set di immagini di validazione MS COCO (`val2017.zip`, circa 700MB) tramite comando `wget` e a decomprimerlo per consentire i test visivi immediati sul modello.
* **File dei Pesi**: Assicurarsi che il file contenente i pesi pre-addestrati e l'indice del vocabolario (`modello_base_captioning.pth`) sia posizionato nella stessa directory del notebook o nel percorso specificato all'interno della Cella 3 del codice. Se si parte da 0 ci vorrà un pò.

## Spiegazione del progetto
L'obiettivo principale di questo progetto consiste nell'elaborare e generare automaticamente descrizioni testuali in linguaggio naturale (didascalie) a partire da un'immagine in input (task di *Image Captioning*).
* **Problema Risolto**: Questo sistema risponde a problematiche concrete legate all'accessibilità digitale (generazione automatica di testi alternativi `alt` per utenti ipovedenti), all'indicizzazione intelligente di cataloghi multimediali di grandi dimensioni e all'organizzazione automatizzata di database fotografici.
* **Funzionamento Tecnico**: Si tratta di un'architettura Deep Learning di tipo Encoder-Decoder che unisce la Visione Artificiale e l'Elaborazione del Linguaggio Naturale (NLP). Un Encoder basato su una rete neurale convoluzionale (CNN) estrae le caratteristiche visive salienti, che vengono poi passate sequenzialmente a un Decoder ricorrente (RNN/LSTM) per la predizione della frase parola per parola.

## Dati
Il modello sfrutta l'ecosistema di dati fornito dal dataset Microsoft COCO (Common Objects in Context), uno standard industriale di riferimento nell'ambito della computer vision.
* **Caratteristiche del Dataset**: COCO include immagini reali catturate in contesti quotidiani complessi, ricche di dettagli e accompagnate da annotazioni testuali multiple redatte da esseri umani. Nel notebook viene scaricato lo schema di validazione `val2017` per effettuare l'inferenza qualitativa.
* **Gestione dei Dati e della Formattazione**: Per gestire le frasi a lunghezza variabile e strutturare correttamente l'input del testo, sono stati introdotti quattro token speciali nel vocabolario: `<START>` per segnalare l'inizio della frase, `<END>` per decretarne la fine, `<PAD>` (con indice associato `padding_idx=0`) per uniformare la lunghezza delle sequenze durante i batch di addestramento, e `<UNK>` per mappare i termini non inclusi nel vocabolario controllato.
* **Pre-elaborazione Visiva**: Le immagini subiscono una trasformazione standard prima di alimentare l'Encoder. Vengono ridimensionate alla risoluzione geometrica fissa di 224x224 pixel e normalizzate utilizzando le statistiche medie e le deviazioni standard del dataset ImageNet (`mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]`), garantendo la corretta ricezione delle feature senza distorsioni o data augmentation durante la fase di test.

## Ciclo di vita ML
In conformità con i principi dello sviluppo del software applicati al Machine Learning (SDLC), il ciclo di vita del modello si articola nelle seguenti fasi:
* **Raccolta e Preparazione Dati**: Il set di dati COCO viene scaricato direttamente via script e preparato tramite la pipeline di trasformazione e normalizzazione di PyTorch.
* **Training (Addestramento)**: L'addestramento intensivo del modello è stato precedentemente condotto all'interno dell'ambiente cloud di Kaggle. Per far fronte al pesante carico computazionale, è stata impiegata una GPU dedicata Nvidia Tesla T4 sfruttando il parallelismo hardware fornito dalla classe `torch.nn.DataParallel` di PyTorch.
* **Validazione ed Inferenza**: La fase di inferenza e validazione qualitativa viene eseguita caricando localmente il file di checkpoint. Il motore esegue una ricerca di tipo *Greedy Search* applicando una lunghezza massima prestabilita di 20 token per frase.
* **Deploy (Distribuzione)**: Attualmente il modello è distribuito sotto forma di prototipo prototipale interattivo all'interno del notebook Jupyter, fruibile localmente o tramite Google Colab. La prospettiva di deployment industriale prevede l'esportazione su architetture cloud come AWS (S3 e SageMaker) per l'erogazione del modello tramite API esterne.
* **Monitoring (Monitoraggio)**: Prevede la tracciabilità delle predizioni effettuate e l'analisi dei tempi di risposta della pipeline visivo-testuale.

## MLOps
Il progetto abbraccia i paradigmi MLOps per garantire l'affidabilità, la riproducibilità e l'automazione del software nel lungo termine:
* **Metriche da Monitorare**: In produzione verranno costantemente monitorati il tempo di latenza dell'inferenza (su CPU e GPU), la frequenza di comparsa del token di errore sconosciuto `<UNK>` e le metriche di accuratezza linguistica basate sul feedback esplicito fornito dagli utenti finali.
* **Trigger per il Re-training**: Il ri-addestramento automatico del modello verrà attivato qualora si verifichi un fenomeno di *Data Drift* (ovvero quando le immagini sottoposte dagli utenti presentano stili, distribuzioni visive o oggetti estranei alla distribuzione nativa del dataset COCO, come immagini mediche o cartoni animati), oppure in caso di aggiornamento ed espansione del dizionario linguistico dei lemmi.
* **Automazione CI/CD**: Seguendo le linee guida del corso, l'integrazione di pipeline automatizzate tramite *GitHub Actions* (configurate in file YAML all'interno della directory `.github/workflows/`) consentirà di lanciare test unitari sul codice dell'architettura e verificare l'integrità del caricamento dei pesi ad ogni operazione di `push` o `pull request` nel repository.

## Rischi, assunzioni e limiti
* **Limiti dell'Algoritmo**: La scelta di un motore di generazione basato sulla *Greedy Search* (scelta deterministica del token a massima probabilità ad ogni step locale) rende l'inferenza estremamente rapida ma esposta al rischio di generare frasi sub-ottimali globali rispetto a strategie avanzate quali la *Beam Search*.
* **Allucinazioni e Limiti del Vocabolario**: Se l'immagine in input è eccessivamente ambigua o presenta elementi mai osservati durante il training, il modello può soffrire di allucinazioni visive (producendo didascalie non coerenti con il reale contenuto della foto) o limitarsi all'uso di termini generici ereditati dal vocabolario COCO fissato.
* **Assunzioni sui Dati**: Si assume che le foto caricate dagli utenti siano nativamente in formato a tre canali RGB e posseggano una nitidezza minima sufficiente; il ridimensionamento forzato a 224x224 pixel rappresenta un'assunzione di omogeneità strutturale che potrebbe far perdere dettagli finissimi su immagini ad altissima risoluzione.
* **Stato di Funzionamento ed Ampliamenti**: Il progetto è pienamente funzionante dall'inizio alla fine, incorporando l'importazione dei pesi, la pulizia automatica delle chiavi generate dal modulo multi-GPU (`module.`) e un'interfaccia di prova interattiva. Può essere ampliato sostituendo l'Encoder CNN attuale (ResNet18) con architetture più profonde (es. ResNet50/EfficientNet) o Vision Transformers (ViT), e aggiornando il Decoder LSTM con moduli dotati di meccanismi di Attenzione spaziale (Attention Mechanism) o modelli Transformer autoregressivi.

## Ulteriori informazioni
* Questo progetto costituisce l'artefatto finale d'esame per l'unità formativa **UFS14 - Processo e Sviluppo del Software (DevOps-Agile)** presieduta dalla docente Valeria Salis.
* La scadenza ultima per la sottomissione e la dimostrazione interattiva della demo è fissata per il **10 luglio 2026**.