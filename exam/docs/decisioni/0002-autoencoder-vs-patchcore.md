# ADR 0002 — Autoencoder vs Patchcore

**Ambito:** Architettura estrazione feature

## Contesto

La prima fase del progetto consiste nell'estrazione delle feature da un modello di machine learning unsupervised di anomaly detection (vedi [architettura](../architettura.md)).
La scelta inizialmente era ricaduta sul **patchcore** poichè l'intento era di fare un rilevamento di anomalie localizzato sulle foglie, ma visti gli scarsi risultati ottenuti con quest'ultima metodologia, la scelta progettuale finale è ricaduta sull'utilizzo di un **autoencoder convoluzionale** che ha dato esiti leggermente miglori sull'anomaly detection in sè e ancora migliori sulla classificazione con **XGboost**.

Il patchcore fà un rilevamento localizzato dell'anomalia (memorizza per pixel come se avesse scattato una fotografia), non è quindi sembrato essere efficiente per l'anomaly detection con questo tipo di dataset nonostante la rimozione dello sfondo con `segmented`, causa le diverse forma, dimensioni, rotazioni e angolazioni delle foglie della stessa pianta → I risultati erano scarsi/insufficienti.

L'autoencoder rispetto al patchcore tende a fare un anomaly detection più generalizzata (encoder → bottleneck → decoder), dal decoder uscirà in output un immagine ricostruita simile a quella data in input al decoder, capace di distinguere una foglia sana (sulla quale è stato addestrato) e una foglia non sana (diversa da ciò su cui è stato addestrato) → Su questo dataset con le immagini utilizzate il rilevamento di anomalie continua a non performare bene, ma la ricostruzione delle foglie ha riscontrato dei miglioramenti visibili oltre a un'estrazione di feature che ha portato il modello di classificazione a dare risultati migliori.

La repository è stata ripulita da modelli e strategie testate in precedenza. Il modello `leaves_classifier.ipynb` con la struttura attuale è risultato il migliore testato fin'ora (vedi [esperimenti](../esperimenti.md)).

## Decisione

- Utilizzo di un **autoencoder convoluzionale** e scartato il **patchcore**.

## Conseguenze

- **Positive:**
  - Risultati migliori sulla classificazione delle malattie e sulla ricostruzione dell'immagine.
- **Negative:**
  - L'anomaly detection continua a non dare risultati soddisfacienti.
  - Progetto finale vira da una scelta di detection sulle anomalie localizzata ad un classificatore che utilizza le feature estartte dall'autoencoder.

 