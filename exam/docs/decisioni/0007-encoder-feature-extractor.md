# ADR 0007 — Encoder come estrattore di feature invece di rilevamento anomalie

**Ambito:** Strategia della pipeline

## Contesto

L'idea iniziale del progetto era **non supervisionata** → Addestrare un autoencoder solo su
foglie sane e rilevare le malate tramite l'**errore di ricostruzione** (una foglia malata,
mai vista in training, dovrebbe ricostruirsi peggio → punteggio di anomalia elevato).
A questo scopo il notebook predispone `TOPK_FRAC = 0.02`
(frazione di pixel peggiori come score) e `gaussian_filter`.

Un **limite** strutturale di questo approccio pixel-based → L'errore di ricostruzione tende a
concentrarsi sulle **strutture ad alta frequenza** della foglia (venature, bordi) più che
sulle **lesioni** della malattia. Lo score di anomalia finisce per misurare quanto è
difficile ricostruire le venature, invece di quanto è malata la foglia.

## Decisione

Nel codice attuale il rilevamento anomalie via errore di ricostruzione **è stato
rimosso** → `TOPK_FRAC` e `gaussian_filter` rimangono ma restano inutilizzati.
L'autoencoder, addestrato sulle sane, viene sfruttato **solo come estrattore di feature** →
il suo encoder produce il bottleneck 8×8×32, appiattito a 2.048 dim, che alimenta un
classificatore **XGBoost supervisionato** sul tipo di malattia delle foglie di pomodoro.

## Conseguenze

- **Positive:**
  - Si aggira il limite pixel-based → La classificazione supervisionata impara
    direttamente a distinguere le condizioni, ottenendo un'accuratezza test di **0.702**
    (vedi [../esperimenti.md](../esperimenti.md)).
  - Le feature dell'encoder sono compatte e riutilizzabili.
- **Negative:**
  - Si **perde la natura non supervisionata** → Il rilevamento delle malate ora richiede
    etichette. Non esiste più un rilevatore di anomalie funzionante → la valutazione quantitativa dell'anomaly detection è stata abbandonata per dare spazio al nuovo obiettivo del modello.
  - Le feature vengono da un encoder ottimizzato per **ricostruire foglie sane**, non per
    discriminare malattie → sono sub-ottimali per la classificazione e pongono un tetto
    alla resa.

L'assenza dell'anomaly detection e il codice inutilizzato
sono **fatti verificati** nel notebook.
La spiegazione del limite pixel-based
(errore che segue le venature invece delle lesioni) è la motivazione progettuale
che ha portato a virare obbiettivo, puntando ad un sistema di classificazione di malattie per le foglie di pomodoro.
