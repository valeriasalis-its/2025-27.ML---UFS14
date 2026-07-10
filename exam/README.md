# PEGI Hybrid ML - Classificazione Automatica di Videogiochi

## Descrizione

PEGI Hybrid ML è un'applicazione web basata su **Machine Learning** per la classificazione automatica di videogiochi secondo il sistema PEGI (Pan European Game Information). Il sistema utilizza **tag descrittivi** come input e predice la fascia d'età appropriata utilizzando un ensemble di algoritmi di machine learning.

L'applicazione offre due modalità di classificazione:
- **Classificazione Standard**: Predice direttamente le categorie PEGI (3, 7, 12, 16, 18)
- **Classificazione per Fasce**: Raggruppa in tre macro-categorie (Bambino, Teenager, Adulto)

## Indice
- [Descrizione](#descrizione)
- [Caratteristiche Principali](#caratteristiche-principali)
- [Struttura del Progetto](#struttura-del-progetto)
- [Guida all'Utilizzo](#guida-allutilizzo)
  - [Prerequisiti](#prerequisiti)
  - [Installazione](#installazione)
  - [Avvio dell'Applicazione](#avvio-dellapplicazione)
- [Come Funziona il Modello](#come-funziona-il-modello)
  - [Pipeline di Predizione](#pipeline-di-predizione)
  - [Architettura del Modello](#architettura-del-modello)
- [Dataset](#dataset)
  - [for_EDA.csv](#foredacsv)
  - [for_EDA_pulito.csv](#foredapulitocsv)
- [Notebook Jupyter](#notebook-jupyter)
- [API Endpoints](#api-endpoints)
  - [GET /](#get-)
  - [POST /predict](#post-predict)
- [Metriche di Performance](#metriche-di-performance)
- [Customizzazione](#customizzazione)
  - [Aggiungere Nuovi Tag](#aggiungere-nuovi-tag)
  - [Modificare le Soglie di Classificazione](#modificare-le-soglie-di-classificazione)
- [Versione 2](#versione-2)
- [MLOps](#mlops)
- [Troubleshooting](#troubleshooting)
  - [Errore: "Il modello non è caricato"](#errore-il-modello-non-è-caricato)
  - [Errore: "Feature non trovata"](#errore-feature-non-trovata)
  - [Porta 5000 già in uso](#porta-5000-già-in-uso)
- [Licenza](#licenza)
- [Autore](#autore)

## Caratteristiche Principali

- **Interfaccia Web Intuitiva**: Applicazione Flask con interfaccia HTML/CSS moderna
- **Modello Ibrido**: Combinazione di Random Forest + KMeans per features avanzate
- **Selezione Tag Dinamica**: Interfaccia interattiva per selezionare tag del gioco
- **Probabilità di Classificazione**: Visualizza le probabilità per ogni classe predetta
- **EDA Completa**: Dataset puliti e analizzati per lo sviluppo del modello
- **Notebook Jupyter**: Pipeline completa di training e validazione

## Struttura del Progetto

```
ML Progetto/
├── app.py                          # App Flask - Classificazione PEGI singola
├── app_fasce.py                    # App Flask - Classificazione per fasce
├── pegi_hybrid_ml.ipynb            # Notebook Jupyter - Training e validazione
├── for_EDA.csv                     # Dataset originale per EDA
├── for_EDA_pulito.csv              # Dataset pulito e preprocessato
│
├── models/                         # Modelli pre-allenati
│   ├── random_forest_model.pkl     # Modello Random Forest principale
│   ├── kmeans_model.pkl            # Modello KMeans per features aggiuntive
│   ├── tag_vocabulary.pkl          # Vocabolario dei tag utilizzati
│   ├── pegi_classes.pkl            # Classi PEGI disponibili
│   └── min_freq.pkl                # Frequenza minima dei tag
│
├── static/                         # Asset statici
│   ├── style.css                   # Stylesheet principale
│   └── pegi/                       # Risorse PEGI
│
└── templates/                      # Template HTML
    ├── index.html                  # Template - Classificazione PEGI singola
    └── index_fasce.html            # Template - Classificazione per fasce
```

## Guida all'Utilizzo

### Prerequisiti

- Python 3.7+
- Flask
- pandas
- scikit-learn
- joblib
- numpy

### Installazione

1. **Clonare o scaricare il progetto**

2. **Installare le dipendenze**
```bash
pip install flask pandas scikit-learn joblib numpy
```

3. **Verificare la presenza dei modelli**
   - Assicurarsi che i file `.pkl` siano presenti nella cartella `models/`

### Avvio dell'Applicazione

#### Modalità Standard (Classificazione PEGI)
```bash
python app.py
```
Accedere a `http://localhost:5000`

#### Modalità Fasce (Classificazione per macro-categorie)
```bash
python app_fasce.py
```
Accedere a `http://localhost:5000`

## Come Funziona il Modello

### Pipeline di Predizione

1. **Input**: L'utente seleziona i tag descrittivi del videogioco (es: "Violenza", "Azione", "Multiplayer")

2. **Feature Engineering**:
   - Conversione dei tag selezionati in vettore binario (1 se presente, 0 altrimenti)
   - Calcolo delle distanze dal modello KMeans per features aggiuntive
   - Concatenazione delle feature per il modello finale

3. **Predizione**:
   - Il Random Forest classifica il gioco nella categoria PEGI appropriata
   - Calcolo delle probabilità per ciascuna classe

4. **Output**: 
   - Categoria PEGI predetta (Modalità standard) o fascia macro (Modalità fasce)
   - Percentuali di probabilità per cada classe

### Architettura del Modello

**Esempio end-to-end:**
```
Input utente: ☑ Violenza  ☑ Sparatutto  ☑ Multiplayer

Step 1 — vettore binario:
  [0, ..., 1, 0, 1, ..., 1, 0, ...]  (150+ valori 0/1)

Step 2 — distanze KMeans:
  [0.83, 2.11, 0.41, ...]  (8 distanze continue)

Step 3 — Random Forest → output grezzo:
  PEGI 3 → 2%  |  PEGI 7 → 5%  |  PEGI 12 → 18%
  PEGI 16 → 31%  |  PEGI 18 → 44%

Risultato finale: PEGI 18 (confidenza 44%)
```

## Dataset

### for_EDA.csv
- Dataset originale con tutti i dati grezzi
- Utilizzato per l'analisi esplorativa

### for_EDA_pulito.csv
- Dataset pulito e preprocessato
- Rimossi outlier e valori mancanti
- Standardizzate le feature
- Pronto per il training

## Notebook Jupyter

Il file `pegi_hybrid_ml.ipynb` contiene:
- Caricamento e esplorazione dei dati
- Preprocessing e feature engineering
- Training del modello KMeans
- Training del Random Forest
- Validazione incrociata e metriche di valutazione
- Salvataggio dei modelli

## API Endpoints

### GET `/`
Restituisce l'interfaccia web con il modulo di selezione tag.

**Parametri Query:**
- `tags`: Lista di tag del vocabolario modello

### POST `/predict`
Esegue la predizione della categoria PEGI.

**Body (form-data):**
- `tags`: Array di tag selezionati

**Risposta (JSON):**
```json
{
  "success": true,
  "prediction": "PEGI 12",
  "pegi_val": 12,
  "probabilities": {
    "PEGI 3":  5.2,
    "PEGI 7":  15.3,
    "PEGI 12": 68.5,
    "PEGI 16": 8.9,
    "PEGI 18": 2.1
  }
}
```

**Esempio chiamata `curl`:**
```bash
curl -X POST http://localhost:5000/predict \
     -F "tags=Sport" \
     -F "tags=Multiplayer" \
     -F "tags=Familiare"

# Risposta attesa:
# {"success": true, "prediction": "PEGI 7", "pegi_val": 7, ...}
```

## Metriche di Performance

Il modello viene valutato su:
- **Accuracy**: Percentuale di predizioni corrette
- **Precision & Recall**: Per ogni categoria PEGI
- **F1-Score**: Media armonica di precisione e recall

## Customizzazione

### Aggiungere Nuovi Tag
1. Modificare il dataset di training
2. Ri-allenare il modello tramite il notebook
3. Salvare il nuovo vocabolario in `models/tag_vocabulary.pkl`

**Esempio — aggiungere il tag `Rhythm`:**
```python
# Nel Notebook, prima del training
df['tag_rhythm'] = df['tags'].str.contains('Rhythm', case=False).astype(int)
# Ri-addestrare → joblib.dump(new_vocabulary, 'models/tag_vocabulary.pkl')
```

### Modificare le Soglie di Classificazione
In `app_fasce.py`, modificare le condizioni nel metodo `predict()`:
```python
# Attuale (default)
if pred_rounded <= 7:
    categoria_macro = "Bambino"
elif pred_rounded >= 18:
    categoria_macro = "Adulto"
else:
    categoria_macro = "Teenager"

# Alternativa — soglia più conservativa
if pred_rounded <= 3:
    categoria_macro = "Bambino"
elif pred_rounded >= 16:          # abbassa la soglia Adulto
    categoria_macro = "Adulto"
else:
    categoria_macro = "Teenager"
```

---

## Rischi e Limiti del Progetto

Essendo un sistema basato su Machine Learning, "PEGI Hybrid ML" presenta alcuni limiti e potenziali rischi che devono essere considerati durante il suo utilizzo:

### 1. Bias dei Dati (Data Bias)
Il modello apprende esclusivamente dai dati storici con cui è stato addestrato. Se il dataset originale presenta squilibri (ad esempio, una sovra-rappresentazione di giochi di categoria "PEGI 18" per i generi d'azione), il modello svilupperà un *bias* che lo porterà a sovra-prevedere quella specifica categoria, penalizzando altre valutazioni potenzialmente valide. Inoltre, le classi PEGI potrebbero essere sbilanciate, influenzando negativamente precisione e recall per le categorie minoritarie.

### 2. Dipendenza dai Tag (Garbage In, Garbage Out)
L'accuratezza della predizione dipende interamente dalla qualità e dalla pertinenza dei tag selezionati in input. Se un utente seleziona tag troppo generici, fuorvianti o omette tag cruciali che descrivono contenuti sensibili (come la presenza di microtransazioni o linguaggio scurrile), il sistema produrrà inevitabilmente una valutazione errata. Il modello non analizza il gameplay reale, la grafica o il contesto narrativo.

### 3. Incapacità di Comprendere il Contesto
I tag sono semplici variabili binarie (presenza/assenza) e non possiedono relazioni semantiche nel modello attuale (che usa un approccio One-Hot). Ad esempio, il sistema potrebbe non essere in grado di distinguere tra "violenza stilizzata/fumettistica" e "violenza realistica in contesti crudi", differenze che secondo le regole ufficiali PEGI portano a classificazioni molto distanti (es. PEGI 7 vs PEGI 18).

### 4. Rigidità del Vocabolario (Cold Start Problem)
Il sistema accetta e computa esclusivamente i tag presenti nel suo vocabolario pre-addestrato. L'introduzione di nuovi generi videoludici, nuove dinamiche di gioco (es. acquisti in-game, NFT) o l'utilizzo di tag inediti comporterebbe un problema di *cold start*, non venendo riconosciuti dal sistema senza un re-training completo e un aggiornamento dell'intero vocabolario e modello.

### 5. Scarsa Spiegabilità (Interpretability)
Sebbene il Random Forest permetta l'estrazione della *feature importance*, il modello agisce in larga parte come una "black-box" dal punto di vista dell'utente finale. Restituisce le probabilità per ogni classe, ma non fornisce una spiegazione intuitiva e dettagliata del *perché* specifiche features abbiano guidato verso una certa predizione (limitazione che si intende superare nella Versione 2 con l'uso di SHAP).

### 6. Non Sostituisce la Valutazione Ufficiale
Questo progetto è uno strumento sperimentale e un *Proof of Concept* didattico/accademico. **Non può e non deve essere considerato un sostituto del rigoroso processo di certificazione PEGI ufficiale**, che viene eseguito da esaminatori umani in grado di valutare minuziosamente l'esperienza di gioco, il contesto, l'impatto psicologico e la grafica dei titoli.

---

## Versione 2

Evoluzione pianificata sulla base delle limitazioni della v1:

| # | Modifica | Problema v1 risolto | Libreria/Tool |
|---|---|---|---|
| 7.1 | **LightGBM** al posto di Random Forest | Migliori performance | `lightgbm` |
| 7.2 | **Word2Vec** per i tag invece di One-Hot | Nessuna relazione semantica tra tag | `gensim` |
| 7.3 | **Frontend React** + Flask come API pura | HTML accoppiato al backend | React + Flask |
| 7.4 | **SHAP** per la spiegabilità delle predizioni | Black-box — l'utente non sa perché | `shap` |

## MLOps

Per garantire la scalabilità e la manutenibilità del progetto nel tempo, si raccomanda l'adozione delle seguenti pratiche di **MLOps**:
- **Versionamento dei Dati e dei Modelli**: Utilizzare strumenti come **DVC** (Data Version Control) o **MLflow** per tracciare le versioni del dataset (`for_EDA_pulito.csv`) e dei modelli esportati (`.pkl`).
- **Pipeline Automatica**: Automatizzare l'addestramento e il testing tramite **GitHub Actions** o simili. Ad esempio, far scattare un re-training automatico all'aggiunta di nuovi dati.
- **Model Monitoring**: Integrare log strutturati per monitorare le predizioni del modello in produzione, per poter individuare precocemente fenomeni di *data drift*.
- **Containerizzazione**: Utilizzare **Docker** per pacchettizzare l'applicazione Flask e le relative dipendenze (`requirements.txt`), garantendo un ambiente di deploy stabile e riproducibile su qualsiasi macchina.

## Troubleshooting

### Errore: "Il modello non è caricato"
- Verificare che i file `.pkl` siano presenti in `models/`
- Controllare i permessi di lettura della cartella

### Errore: "Feature non trovata"
- Assicurarsi di selezionare tag dal vocabolario disponibile
- Il tag selezionato potrebbe non essere nel vocabolario del modello

### Porta 5000 già in uso
```bash
python app.py --port 5001
```

## Licenza

Progetto realizzato per scopi didattici.

## Autore

Progetto ML: Riccardo Ragnatela, Filippo Pinizzotto, Michele Morlacchi Ukmar

---

**Nota**: Il sistema è basato su dati storici di videogiochi. La classificazione PEGI è una guida e non deve essere considerata sostitutiva della valutazione officiale PEGI.
