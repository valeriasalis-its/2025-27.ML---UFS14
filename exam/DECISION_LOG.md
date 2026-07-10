# Decision Log - PEGI Hybrid ML

Questo documento (Architecture Decision Record) raccoglie le principali decisioni architetturali e progettuali prese per il progetto **PEGI Hybrid ML**.

## Indice
- [1. Architettura dell'Applicazione Web](#1-architettura-dellapplicazione-web)
- [2. Approccio Ibrido di Machine Learning](#2-approccio-ibrido-di-machine-learning)
- [3. Doppia Modalità di Classificazione (Standard vs Fasce)](#3-doppia-modalità-di-classificazione-standard-vs-fasce)
- [4. Calcolo delle Probabilità Aggregato (Macro-categorie)](#4-calcolo-delle-probabilità-aggregato-macro-categorie)
- [5. Serializzazione e Caricamento dei Modelli](#5-serializzazione-e-caricamento-dei-modelli)
- [6. Preprocessing Tracciabile](#6-preprocessing-tracciabile)

## 1. Architettura dell'Applicazione Web

**Decisione:** Utilizzo di **Flask** come framework web backend.
**Contesto:** Il progetto richiede un'interfaccia web semplice per interagire con i modelli di Machine Learning sviluppati in Python.
**Conseguenze:**
- Integrazione nativa e immediata con le librerie di Data Science Python (`pandas`, `scikit-learn`, `joblib`, `numpy`).
- Architettura leggera, ideale per un progetto didattico/sperimentale.
- Gestione di due script separati e indipendenti per le diverse modalità (`app.py` e `app_fasce.py`).

> Flask si occupa della visualizzazione web; tutto il peso computazionale resta nei file `.pkl` già pronti.

## 2. Approccio Ibrido di Machine Learning

**Decisione:** Utilizzo di un modello ibrido che combina **KMeans** e **Random Forest**.
**Contesto:** Le feature di base dei videogiochi sono i tag forniti in formato vettoriale binario (1 se presente, 0 altrimenti). Per migliorare la classificazione, è utile arricchire lo spazio delle feature.
**Conseguenze:**
- Il **KMeans** funge da strumento di Feature Engineering: calcola le distanze dei vettori di input dai cluster, aggiungendo feature continue.
- Il **Random Forest** utilizza le feature concatenate (tag binari + distanze KMeans) per la classificazione finale.
- Questo approccio arricchisce l'input e porta a un potenziale miglioramento delle performance (Accuracy, Precision, Recall) rispetto all'uso dei soli tag binari.

**Esempio pratico:**
```python
# Gioco con tag: ["Violenza", "Multiplayer"]
X_tags = [0, 0, 1, 0, 1, ...]   # vettore binario — 150+ feature

km_dists = km_model.transform([X_tags])
# es. distanze da 8 cluster → [0.83, 2.11, 1.45, 0.62, ...]

X_final = np.hstack([X_tags, km_dists])
# Totale feature passate al Random Forest: 150 tag + 8 distanze = 158
```
> Senza KMeans il modello vede solo 0/1; con KMeans vede anche "quanto è lontano dal cluster 'giochi violenti'".

## 3. Doppia Modalità di Classificazione (Standard vs Fasce)

**Decisione:** Creazione di due modalità di esecuzione distinte: Standard e per Macro-categorie (Fasce).
**Contesto:** Gli utenti finali possono avere esigenze diverse: un rating esatto (es. PEGI 16) oppure un'indicazione generica per fasce d'età (Bambino, Teenager, Adulto).
**Conseguenze:**
- Separazione della logica in `app.py` (Standard, predizione classi esatte: 3, 7, 12, 16, 18) e `app_fasce.py` (Macro-categorie).
- Interfacce dedicate (`index.html` e `index_fasce.html`).
- Mappatura logica in `app_fasce.py`:
  - `PEGI <= 7`: Bambino
  - `PEGI >= 18`: Adulto
  - `Altrimenti`: Teenager

**Esempio pratico — stesso gioco, due risposte diverse:**

| Modalità | Tag input | Output |
|---|---|---|
| `app.py` (Standard) | Violenza, Horror | `PEGI 18` |
| `app_fasce.py` (Fasce) | Violenza, Horror | `Adulto` |
| `app.py` (Standard) | Sport, Multiplayer | `PEGI 7` |
| `app_fasce.py` (Fasce) | Sport, Multiplayer | `Bambino` |

> L'utente finale sceglie la granularità che preferisce senza cambiare il modello sottostante.

## 4. Calcolo delle Probabilità Aggregato (Macro-categorie)

**Decisione:** Utilizzo del valore **massimo** (invece della semplice somma) per calcolare la probabilità aggregata per le macro-categorie.
**Contesto:** In `app_fasce.py`, aggregando le probabilità delle singole classi in fasce, sommare le percentuali avrebbe potuto falsare l'effettiva confidenza del modello (sopravvalutando categorie composite).
**Conseguenze:**
- La probabilità per "Bambino" è estratta come `max(prob_3, prob_7)`.
- Richiede uno step di normalizzazione (`prob / total_prob`) in modo tale che la somma finale per le macro-categorie torni al 100%.

**Esempio pratico — perché MAX e non SUM:**

```
Uscita grezza del modello per un gioco:
  PEGI 3  → 5%
  PEGI 7  → 28%    ← valore dominante nella fascia Bambino
  PEGI 12 → 40%    ← valore dominante nella fascia Teenager
  PEGI 16 → 18%
  PEGI 18 → 9%

Con SUM → Bambino = 5%+28% = 33%  ← gonfiato artificialmente
Con MAX → Bambino = 28%           ← rappresenta il caso più probabile

Dopo normalizzazione (28+40+9 = 77):
  Bambino:  28/77 = 36.4%
  Teenager: 40/77 = 51.9%
  Adulto:    9/77 = 11.7%  → somma = 100%
```

## 5. Serializzazione e Caricamento dei Modelli

**Decisione:** Salvataggio dei modelli pre-addestrati e del vocabolario tramite **joblib** nella cartella `models/`.
**Contesto:** Necessità di disaccoppiare nettamente la complessa fase di training (nel Jupyter Notebook `pegi_hybrid_ml.ipynb`) dalla fase di inferenza rapida nell'app web.
**Conseguenze:**
- File persistenti (es. `random_forest_model.pkl`, `kmeans_model.pkl`, `tag_vocabulary.pkl`) caricati in RAM all'avvio dell'app web (`init_models()`).
- Richiede allineamento delle versioni delle dipendenze (come `scikit-learn`) tra l'ambiente di addestramento e quello di deploy.

**Esempio pratico:**
```python
# Notebook (training) — salva una volta sola
import joblib
joblib.dump(rf_model,  'models/random_forest_model.pkl')
joblib.dump(km_model,  'models/kmeans_model.pkl')
joblib.dump(vocabulary,'models/tag_vocabulary.pkl')

# app.py (inference) — carica all'avvio, poi è istantaneo
def init_models():
    global model, km_model, model_features
    model_features = list(joblib.load('models/tag_vocabulary.pkl'))
    km_model = joblib.load('models/kmeans_model.pkl')
    model    = joblib.load('models/random_forest_model.pkl')
```
> Una predizione live impiega ~5 ms; ri-addestrare il Random Forest richiederebbe minuti.

## 6. Preprocessing Tracciabile

**Decisione:** Mantenere salvataggi separati per il dataset grezzo (`for_EDA.csv`) e quello preprocessato (`for_EDA_pulito.csv`).
**Contesto:** È una best practice in Data Science permettere la riproduzione dell'addestramento senza dover rieseguire l'intera Exploratory Data Analysis.
**Conseguenze:**
- Pipeline pulita, riproducibile e facile da debuggare per il fine-tuning futuro.

**Esempio pratico:**
```
for_EDA.csv (grezzo)          for_EDA_pulito.csv (pulito)
─────────────────────         ────────────────────────────
Name, Tags, PEGI, ...         tag_violenza, tag_sport, ..., PEGI
GTA V, Violence|..., 18,…    0, 0, ..., 18
Mario, Sport|..., 3,…        0, 1, ..., 3
""  , NaN       , NaN        (riga rimossa)
```
> Se il training dà risultati strani, si confronta il grezzo vs il pulito riga per riga — senza dover ripetere l'intera EDA.

---
