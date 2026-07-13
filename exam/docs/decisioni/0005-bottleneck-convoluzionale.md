# ADR 0005 — Bottleneck convoluzionale invece di denso

**Ambito:** Architettura autoencoder

## Contesto

Un autoencoder può comprimere l'immagine in un vettore latente **denso** (appiattendo e
usando layer `Dense`) oppure mantenere un bottleneck **convoluzionale** che conserva la
struttura spaziale. Nel modello il bottleneck è l'ultimo layer dell'encoder:
`Conv2D(32, 3, padding="same", activation=leaky_relu)`, con uscita **8×8×32**.

## Decisione

Adottare un **bottleneck convoluzionale** (8×8×32 = 2.048 valori) senza layer densi.

## Conseguenze

- **Positive:**
  - Conserva l'informazione spaziale (griglia 8×8): forma, colore e venature restano
    ricostruibili, come osservato nella verifica qualitativa delle ricostruzioni nella fase di anomaly detection.
  - Meno parametri e training più stabile rispetto a un bottleneck denso
    equivalente su immagini 128×128.
  - Il tensore 8×8×32 appiattito diventa il vettore di
    feature da 2.048 dim per XGBoost utilizzato per la classificazione (vedi
    [0007](0007-encoder-feature-extractor.md)).
- **Negative:**
  - La rappresentazione resta **locale**: non c'è un layer che forzi una sintesi globale
    dell'immagine, quindi le feature sono ancora legate alla posizione dei pixel.
  - 2.048 dimensioni sono relativamente alte come input per un classificatore su soli
    2.500 esempi, ma dopo svariati tentativi è risultata la combinazione più efficiente.
