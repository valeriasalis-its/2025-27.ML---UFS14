# Decision log: Progetto Image Captioning - UFS14

Questo registro tiene traccia delle decisioni architetturali, ingegneristiche e metodologiche chiave adottate durante lo sviluppo del software di descrizione immagini, motivando in dettaglio le ragioni tecnologiche che hanno guidato ogni scelta rispetto alle alternative possibili.

---

### Decisione 1: Scelta dell'Architettura Encoder-Decoder (ResNet18 + LSTM)
* **Contesto**: Definizione della struttura logica della rete neurale per mappare dati visivi in sequenze testuali coordinate.
* **Scelta adottata**: Utilizzo del backbone CNN ResNet18 privato dell'ultimo strato di classificazione lineare (Encoder) accoppiato a uno strato di Embedding, una rete ricorrente LSTM a livello singolo (`hidden_size=512`) e un classificatore lineare finale (Decoder).
* **Motivazione**: La ResNet18 offre un eccellente bilanciamento tra espressività visiva ad alto livello e footprint computazionale ridotto, minimizzando i tempi di estrazione e prevenendo l'overfitting su dataset di medie/grandi dimensioni rispetto a modelli eccessivamente profondi (es. ResNet152). La LSTM è stata preferita alle RNN classiche poiché è in grado di mitigare efficacemente il problema del gradiente svanente (vanishing gradient), catturando le dipendenze sequenziali a lungo termine necessarie per formulare frasi sintatticamente fluide e coerenti.

### Decisione 2: Integrazione del Vocabolario all'interno dello stesso Checkpoint dei Pesi (`.pth`)
* **Contesto**: Strategia di memorizzazione e distribuzione dell'indice di mappatura lessicale (mappa indici-parole) utilizzato dal Decoder.
* **Scelta adottata**: Salvare il dizionario `indice_a_parola` direttamente all'interno del file binario di checkpoint PyTorch (`checkpoint['indice_a_parola']`) insieme allo stato dei parametri ottimizzati della rete (`checkpoint['stato_modello']`).
* **Motivazione**: Questa scelta di design riduce a zero il rischio di disallineamento (*vocabulary mismatch*) in fase di produzione. Separare i pesi dal vocabolario (ad esempio mantenendo un file JSON di testo esterno) aumenta la probabilità di errori bloccanti qualora i due file vengano aggiornati in tempi diversi o distribuiti in modo non sincronizzato. Un unico file binario auto-contenuto semplifica drasticamente la pipeline MLOps e garantisce l'immutabilità e l'integrità dell'artefatto distribuito.

### Decisione 3: Utilizzo di una Strategia di Inferenza basata su Greedy Search
* **Contesto**: Selezione del metodo di decodifica autoregressiva delle parole durante la generazione della didascalia in tempo reale.
* **Scelta adottata**: Sviluppo di un algoritmo a ricerca locale di tipo Greedy Search tramite operatore deterministico `argmax` applicato ad ogni passo temporale per una lunghezza massima bloccata a 20 token.
* **Motivazione**: La Greedy Search seleziona la parola istantaneamente più probabile a ogni ciclo. Sebbene possa risultare sub-ottimale a livello globale rispetto a tecniche più esose come la *Beam Search*, è stata scelta per massimizzare la reattività dell'applicazione e ridurre la latenza di calcolo nell'interfaccia interattiva del notebook, risultando idonea a un carico computazionale compatibile con CPU standard. La soglia di 20 parole è stata imposta per riflettere la lunghezza media delle frasi umane del dataset COCO e interrompere tempestivamente loop o iterazioni infinite di generazione visiva.

### Decisione 4: Gestione Multi-GPU su Kaggle e successiva Rimozione del Prefisso dei Parametri
* **Contesto**: Risoluzione delle incompatibilità nel dizionario dei pesi generate dall'addestramento distribuito in ambiente cloud.
* **Scelta adottata**: Effettuare il training iniziale su acceleratore GPU Tesla T4 erogato da Kaggle tramite la classe wrapper `torch.nn.DataParallel` e implementare una funzione di pulizia dinamica delle chiavi dello `state_dict` (rimozione della stringa prefissata `module.`) all'interno del motore di caricamento dell'applicazione locale.
* **Motivazione**: L'addestramento distribuito su Kaggle velocizza drasticamente i tempi di convergenza della rete inserendo il prefisso strutturale `module.` a ciascun parametro della rete. Tuttavia, se l'utente finale esegue l'inferenza su una singola CPU o GPU non distribuita, PyTorch solleva un errore di corrispondenza delle chiavi bloccante. La creazione di un dizionario pulito in fase di caricamento assicura la totale portabilità del software tra ambienti hardware eterogenei senza costringere a ri-addestramenti locali.

### Decisione 5: Implementazione dell'Interfaccia Grafica tramite i widget nativi di Jupyter (`ipywidgets`)
* **Contesto**: Progettazione della modalità di interazione dell'utente con il modello per l'esame finale e i test empirici di produzione.
* **Scelta adottata**: Integrazione dei moduli interattivi `widgets.FileUpload` e `widgets.Output` abbinati a routine di rendering grafico basate su `matplotlib`.
* **Motivazione**: Questa scelta consente di trasformare il notebook di sviluppo in un'applicazione interattiva autonoma ed intuitiva (adatta alla presentazione live della demo d'esame prevista per il 10 luglio 2026). Gli utenti possono verificare il comportamento del modello in tempo reale eseguendo il caricamento drag-and-drop di immagini personali esterne al dataset COCO, facilitando una validazione visiva immediata e il rilevamento precoce di eventuali anomalie logiche o bug applicativi.