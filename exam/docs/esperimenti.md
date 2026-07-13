# Esperimenti e risultati

Tutti i numeri riportati provengono dagli output eseguiti nel notebook
`models/leaves_classifier.ipynb`. Dove un dato non è presente nel codice/output è
indicato esplicitamente.

## Setup sperimentale

- Specie: **Tomato**, 10 condizioni (9 malattie + `healthy`).
- Sottoinsieme immagini: **`segmented`** (128×128×3).
- Seed fisso `SEED = 42` per numpy, random e Keras.
- Autoencoder addestrato solo su foglie sane; encoder usato come estrattore di feature
  per XGBoost.

## Rilevamento anomalie (autoencoder)

> **Non valutato quantitativamente.** Il notebook **non** calcola uno score di anomalia
> dall'errore di ricostruzione. Le componenti predisposte a tale scopo
> (`TOPK_FRAC = 0.02`, `gaussian_filter`) sono importate/definite ma
> **mai usate**. Non esiste quindi una soglia né una separazione sane/malate misurata.

Ciò che il notebook mostra è **solo qualitativo**: `show_reconstructions()` confronta
alcune foglie sane originali con la loro ricostruzione. Osservazione riportata nel
notebook: forma, colore e venature principali restano riconoscibili.

**Metriche di addestramento** (obiettivo di ricostruzione, non di rilevamento):

| Grandezza | Valore |
|---|---|
| Epoche eseguite | 64 (su max 100, fermato da EarlyStopping) |
| Miglior `val_loss` (MSE) | ≈ 187.7 |
| `val_MAE` corrispondente | ≈ 6.8 |
| Esempi train / val (sane) | 1.272 / 319 (→ 3.816 con augmentation) |


## Classificazione tipo di malattia (XGBoost)

**Dati:** 2.500 immagini (250/classe), feature encoder da 2.048 dim, split stratificato
train 1.500 / val 500 / test 500.

**Iperparametri selezionati da Optuna** (20 trial, obiettivo: accuratezza su validation):

| Iperparametro | Valore |
|---|---|
| `max_depth` | 7 |
| `learning_rate` | ≈ 0.0274 |
| `subsample` | ≈ 0.793 |
| `colsample_bytree` | ≈ 0.809 |
| `reg_lambda` | ≈ 0.0309 |
| `n_estimators` | 600 (con `early_stopping_rounds=20`) |

**Accuratezza sul test: `0.702`.**

### F1 per classe (test set, 50 immagini per classe)

| Condizione | Precision | Recall | F1 |
|---|---|---|---|
| Bacterial_spot | 0.85 | 0.70 | 0.77 |
| Early_blight | 0.53 | 0.52 | **0.53** |
| Late_blight | 0.64 | 0.56 | 0.60 |
| Leaf_Mold | 0.60 | 0.70 | 0.65 |
| Septoria_leaf_spot | 0.72 | 0.58 | 0.64 |
| Spider_mites (Two-spotted) | 0.66 | 0.74 | 0.70 |
| Target_Spot | 0.55 | 0.64 | 0.59 |
| Tomato_Yellow_Leaf_Curl_Virus | 0.81 | 0.84 | 0.82 |
| Tomato_mosaic_virus | 0.94 | 0.90 | **0.92** |
| healthy | 0.78 | 0.84 | 0.81 |
| **macro avg** | 0.71 | 0.70 | 0.70 |
| **weighted avg** | 0.71 | 0.70 | 0.70 |

### Matrice di confusione

Il notebook genera la matrice di confusione (`ConfusionMatrixDisplay.from_predictions`)
sul test set. È un output grafico: la lettura numerica cella-per-cella non è riportata
qui perché non presente come testo. Indicazioni qualitative derivabili dalle metriche:

- **Classi forti:** `Tomato_mosaic_virus` (F1 0.92) e `Tomato_Yellow_Leaf_Curl_Virus`
  (F1 0.82), pattern visivi molto marcati; `healthy` ben separata (F1 0.81).
- **Classi deboli:** `Early_blight` (F1 0.53), `Target_Spot` (F1 0.59) e `Late_blight`
  (F1 0.60), tipicamente confuse tra loro perché condividono lesioni fogliari simili.

## Baseline di confronto

> **Nota.** Con 10 classi bilanciate (250/classe), una baseline
> casuale darebbe un'accuratezza attesa di **≈ 0.10**.  Rispetto a questa baseline, l'accuratezza
> di 0.702 è nettamente superiore.