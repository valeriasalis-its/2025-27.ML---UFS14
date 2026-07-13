# ADR 0006 — Attivazione `leaky_relu`

**Ambito:** Architettura autoencoder

## Contesto

L'ultimo layer del decoder deve produrre 3 canali che, dopo il `Rescaling(255.0)`,
ricostruiscono pixel in `[0, 255]`. Le immagini `segmented` hanno ampie aree di sfondo
nero. La scelta dell'attivazione di output influenza sia la capacità di
riprodurre questi valori sia la stabilità del gradiente.

## Decisione

Usare **`leaky_relu`** come attivazione di output (e in tutti i layer convoluzionali),
seguita da `Rescaling(255.0)`.

## Conseguenze

- **Positive:**
  - Gestisce bene lo sfondo scuro delle immagini segmentate.
  - Mantiene sempre un **piccolo gradiente** anche per valori negativi, evitando neuroni
    morti tipici della `relu` pura.
  - La struttura dell'autoencoder è stata testata con diverse funzioni di attivazione
    come la `sigmoid`, la `relu` e la `leaky_relu`; e quest'ultima ha dato risultati nettamente superiori.
- **Negative:**
  - `leaky_relu` non vincola l'uscita a un intervallo limitato → la ricostruzione può
    produrre valori fuori `[0, 255]`, gestiti a valle con `clip(0, 1)` in fase di
    visualizzazione.

## Alternative scartate

- **`sigmoid`** (uscita naturale in `[0, 1]`) e **`relu`** → Dati diversi esperimenti
  avrebbero portato a **collassi della ricostruzione** su questo dataset.

Il modello di autoencoder adotta `leaky_relu` e ne motiva l'uso per lo sfondo scuro
e il gradiente.
Gli esperimenti di collasso con `sigmoid`/`relu` non sono direttamente documentati con valori numerici
ma da improvvisi rialzi della loss durante il training, intorno all'epoca 50.
