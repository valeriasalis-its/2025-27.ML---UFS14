# Log del progetto — PatchCore Anomaly Detection

Registro delle decisioni e delle modifiche rilevanti apportate al repository, come da indicazione nel README .



---

### 2026-07-07 — Revisione del README

**File coinvolto:** `README.md`

**Azione:** Verificata la coerenza di ogni sezione del README (setup, pipeline, dati, ciclo di vita ML, MLOps, rischi/limiti) rispetto all'implementazione effettiva nel notebook.

**Esito:** Nessuna discrepanza rilevata. In particolare sono stati confermati:
- backbone e layer usati (`layer2` + `layer3` di ResNet18, concatenazione a 384 canali);
- categoria analizzata (`bottle`);
- rapporto di coreset subsampling di default (1%, farthest-point sampling greedy);
- metodo di scoring (kNN con `n_neighbors=1`, score immagine = massimo score di patch);
- metrica di valutazione (AUC-ROC);
- dipendenze elencate coerenti con gli import effettivi nel notebook.

**Decisione:** Nessuna modifica necessaria al README. Le sezioni "Deploy" e "MLOps" restano correttamente presentate come scenario ipotetico/futuro, non come funzionalità già implementata.
