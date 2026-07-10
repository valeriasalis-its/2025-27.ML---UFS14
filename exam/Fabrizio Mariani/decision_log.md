# Decision Log — Modello di Classificazione Dipinti (Artista e Stile)

Registro delle decisioni tecniche prese durante lo sviluppo e l'addestramento del modello CNN multi-task per la classificazione di artista e stile pittorico (dataset tipo WikiArt).

---

## 1. Ridimensionamento delle immagini

**Problema**: le immagini originali del dataset erano ad alta risoluzione, il che rendeva il modello troppo pesante da addestrare e aumentava notevolmente i tempi di training e l'occupazione di memoria.

**Decisione**: ridimensionare tutte le immagini a 64×64 pixel (variabile `IMG_SIZE`) prima di darle in input alla rete.

**Motivazione**: una risoluzione più bassa riduce il numero di parametri necessari nei layer e il costo computazionale delle convoluzioni, rendendo l'addestramento sostenibile con le risorse disponibili.

**Conseguenza**: perdita di dettaglio visivo, con possibile impatto negativo sulla capacità del modello di distinguere stili pittorici che si basano su dettagli fini (pennellate, texture). È una scelta di compromesso tra fattibilità pratica e accuracy ottenibile.


## 2. Addestramento in locale su CPU

**Problema**: non avendo a disposizione una GPU, l'addestramento è stato eseguito su CPU (`DEVICE = "cpu"`), il che ha reso il training molto più lento e meno efficiente rispetto a un'esecuzione su hardware dedicato.

**Decisione**: adattare l'intera pipeline (batch size, numero di epoche, dimensione immagini) per rendere l'addestramento su CPU realisticamente eseguibile in tempi ragionevoli.

**Motivazione**: mancanza di accesso a GPU locale o cloud al momento dello sviluppo.

**Conseguenze**:
- tempi di addestramento per epoca molto più lunghi;
- necessità di ridurre `BATCH_SIZE` e `IMG_SIZE` per contenere i tempi;
- minore possibilità di sperimentare rapidamente con architetture più profonde o con iperparametri diversi, il che ha limitato l'ottimizzazione complessiva del modello.


## 3. Overfitting e regolarizzazione tramite scheduler del learning rate

**Problema**: durante le prime fasi di addestramento il modello mostrava un chiaro overfitting, con la loss di training in costante calo ma la loss di validazione che smetteva di migliorare (o peggiorava) dopo poche epoche.

**Decisione**: introdurre uno scheduler (`StepLR`, con riduzione del learning rate del 50% ogni 5 epoche) per affinare progressivamente l'addestramento e ridurre il rischio di overfitting nelle fasi avanzate.

**Motivazione**: un learning rate costante e relativamente alto per tutta la durata del training tende a far "saltare" il modello oltre i minimi locali più stretti nelle fasi finali; ridurlo gradualmente permette una convergenza più fine e stabile.

**Altre misure di regolarizzazione adottate in parallelo**:
- Dropout (0.4) nel layer fully-connected condiviso;
- Weight decay (1e-4) nell'optimizer Adam;
- Data augmentation sul training set (flip orizzontale casuale, jitter di luminosità/contrasto/saturazione) per aumentare la variabilità dei dati visti dal modello.

---

## 4. Architettura multi-task condivisa

**Problema**: il modello deve predire due output distinti (artista e stile) a partire dalla stessa immagine.

**Decisione**: utilizzare un'unica CNN con backbone convoluzionale condiviso (3 blocchi conv+batchnorm+pool) e due "teste" (head) separate, una per l'artista e una per lo stile.

**Motivazione**: condividere il backbone permette al modello di riutilizzare le feature visive di basso e medio livello (colore, texture, composizione) per entrambi i task, riducendo il numero di parametri rispetto a due reti separate e sfruttando la correlazione naturale tra stile e artista (spesso un artista è associato a uno stile dominante).

**Trade-off accettato**: i due task competono parzialmente per la stessa rappresentazione condivisa, il che può limitare le performance massime raggiungibili su ciascun task singolarmente rispetto a modelli dedicati.

---

## 5. Uso di BatchNorm dopo ogni convoluzione

**Problema**: l'addestramento di reti profonde può risultare instabile, con gradienti che variano molto tra i batch, specialmente in condizioni di risorse limitate (CPU, batch size non enormi).

**Decisione**: inserire un layer di Batch Normalization dopo ogni convoluzione, prima dell'attivazione ReLU.

**Motivazione**: La BatchNorm rende il training più stabile e veloce da far convergere, ed è meno sensibile alla scelta del learning rate iniziale. Questo è stato utile perché, allenando su CPU, ripetere più run per trovare i parametri giusti sarebbe stato troppo lento.


## 6. Salvataggio e ripresa tramite checkpoint

**Problema**: dati i lunghi tempi di addestramento su CPU, un'interruzione imprevista (chiusura del notebook, mancanza di corrente, timeout) avrebbe comportato la perdita di ore di training.

**Decisione**: implementare un sistema di checkpoint (`art_cnn.pth`) che salva stato del modello, dell'optimizer e dello scheduler, permettendo di riprendere l'addestramento dall'epoca successiva a quella salvata.

**Motivazione**: permettere di suddividere l'addestramento in più sessioni, compatibilmente con la disponibilità limitata di tempo macchina su hardware non dedicato.

---

## Riepilogo

| Area | Problema riscontrato | Decisione presa |
|---|---|---|
| Dati | Immagini troppo pesanti | Resize a 64×64 |
| Infrastruttura | Solo CPU disponibile, training lento | Batch size e architettura ridotti per sostenibilità |
| Training | Overfitting | LR scheduler (StepLR) + dropout + weight decay + augmentation |
| Architettura | Due task da predire | Backbone condiviso con due head separate |
| Stabilità | Training instabile su CPU | BatchNorm dopo ogni conv |
| Continuità | Rischio di interruzioni lunghe sessioni | Sistema di checkpoint per riprendere il training |