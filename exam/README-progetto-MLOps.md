# Predizione della Gravità degli Incidenti Aerei (Airplane Crash ProNet)

## Setup / How to run this project
Per eseguire questo progetto è consigliato l'utilizzo di un ambiente con supporto GPU (es. Google Colab) o un'installazione locale adeguata. 
**Requisiti di sistema e librerie:**
* Python 3.8+
* `pandas`, `numpy`, `re`, `collections`, `copy`
* `matplotlib`, `seaborn`
* `scikit-learn`
* `torch` (PyTorch)

**Comandi per l'avvio (in locale):**
1. Clonare la repository (usando Git).
2. Creare un ambiente virtuale: `python -m venv venv` e attivarlo.
3. Installare le dipendenze: `pip install pandas numpy scikit-learn torch matplotlib seaborn`
4. Lanciare il notebook: `jupyter notebook progetto_incidenti_aerei\ \(1\).ipynb`

## Spiegazione del progetto
L'obiettivo di questo progetto è prevedere se un incidente aereo sarà "altamente catastrofico" (ossia se il tasso di mortalità rispetto alle persone a bordo è $\ge$ 80%). 
Si tratta di un problema di classificazione binaria affrontato tramite un'architettura di Deep Learning multimodale (`AirplaneCrashProNet`). Il modello analizza simultaneamente:
1. **Dati strutturati (Tabulari):** Anno, mese e numero di persone a bordo.
2. **Dati non strutturati (Testo):** La sintesi testuale (Summary) della dinamica dell'incidente.

Il problema che risolve è fornire un'analisi del rischio più completa, combinando il contesto semantico delle dinamiche di volo (es. "esplosione", "montagna", "nebbia") con i dati numerici e storici.

## Dati
Il progetto utilizza un dataset storico sugli incidenti aerei. 
* **Feature selezionate:** `Aboard` (persone a bordo), `Year`, `Month`, `Summary` (testo).
* **Gestione dati mancanti:** I mesi mancanti sono stati imputati con il valore 6 (giugno, per posizionarsi a metà anno e minimizzare le distorsioni), mentre per gli anni mancanti è stata usata la mediana. 
* **Pre-processing:** I dati numerici sono stati scalati tramite `StandardScaler`. Il testo è stato pulito dalla punteggiatura, tokenizzato e limitato a un vocabolario custom (scartando parole con frequenza < 2) con sequenze padding/truncating a lunghezza massima di 60 token.
* **Sbilanciamento:** Il target era fortemente sbilanciato. È stato gestito calcolando un peso compensativo (`pos_weight`) passato alla funzione di loss (`BCEWithLogitsLoss`).

## Ciclo di vita ML
Applicando i principi del **SDLC (Software Development Life Cycle)** visti a lezione, il progetto si articola in:
1. **Raccolta e Preparazione Dati:** Ingestion, pulizia, estrazione delle feature e tokenizzazione NLP.
2. **Training & Validazione:** Addestramento tramite PyTorch con ottimizzatore Adam, implementando meccanismi di salvaguardia come il *ReduceLROnPlateau* (riduzione del learning rate) ed *Early Stopping* per prevenire l'overfitting.
3. **Deploy (Prospettiva MLOps):** Come studiato, il modello esportato (`.pth`) può essere containerizzato (es. Docker) e rilasciato tramite pratiche di **Continuous Delivery/Deployment (CD)** su servizi cloud come **AWS SageMaker** o istanze EC2/S3, esponendo un'API per le predizioni in real-time.

## MLOps
In ottica **DevOps + ML (MLOps)**, per garantire l'affidabilità del sistema in produzione:
* **Monitoring:** Sarà fondamentale monitorare sia le performance metriche del modello (es. degrado dell'F1-score o della ROC-AUC) sia il *Data Drift* (es. cambiamenti nel linguaggio usato nei report degli incidenti o variazioni nella capienza media dei nuovi velivoli).
* **Continuous Training (CT):** Il re-training dovrà essere innescato automaticamente tramite pipeline (es. GitHub Actions o pipeline AWS) in due casi:
  1. Quando si accumula un numero statisticamente rilevante di nuovi dati sugli incidenti.
  2. Se i sistemi di monitoring rilevano un calo delle performance sotto una soglia di confidenza accettabile.

## Rischi, assunzioni e limiti
* **Assunzioni:** Si assume che imputare il mese a "giugno" non alteri i pattern stagionali e che la sintesi testuale contenga sempre informazioni sufficienti per dedurre la gravità.
* **Limiti:** L'utilizzo di un vocabolario custom leggero scarta parole rare. Se in futuro un incidente fosse causato da un fattore tecnico altamente specifico e mai visto prima (es. "MCAS failure"), il modello testuale non riconoscerebbe il termine.
* **Stato del progetto:** Il progetto è attualmente funzionante dall'addestramento all'esportazione dei pesi (`.pth`). 
* **Possibili ampliamenti:** L'ampliamento naturale consiste nella creazione di un'interfaccia (es. Streamlit o un frontend web) agganciata al modello per permettere l'inserimento di uno scenario ipotetico da parte di un utente, implementando a pieno le logiche di CI/CD.

## Ulteriori informazioni
A livello architetturale, il ramo di elaborazione del testo (`Summary`) si distacca dalle implementazioni classiche usando una **Bi-LSTM** unita a un meccanismo di **Self-Attention**. Questo permette alla rete di comprendere il contesto bidirezionale della frase e di assegnare "pesi" matematici alle parole più allarmanti, ignorando quelle di riempimento.
L'intero processo di sviluppo del codice beneficia delle pratiche **Agile** e di versionamento tramite **Git/GitHub** per gestire i rami di sviluppo e la documentazione.
