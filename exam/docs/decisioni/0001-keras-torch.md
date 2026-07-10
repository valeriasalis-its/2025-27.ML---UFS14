# ADR 0001 — Keras con backend torch

**Ambito:** Framework e strumenti

## Contesto

Keras 3: la stessa API di alto livello può girare su TensorFlow,
PyTorch (torch) o JAX. Il notebook costruisce l'autoencoder con l'API `Sequential` di Keras
(`Conv2D`, `MaxPooling2D`, `UpSampling2D`, `compile`, `fit`) ma imposta esplicitamente il
backend torch nella cella di configurazione:

```python
os.environ["KERAS_BACKEND"] = "torch" 
```

Alternative possibili: PyTorch puro (con training loop manuale), Keras su backend
TensorFlow, oppure JAX.

## Decisione

Usare **Keras 3 con backend torch**: API concisa di Keras per definire e addestrare la rete, motore di calcolo torch al di sotto.

## Conseguenze

- **Positive:**
  - API compatta: encoder/decoder come `Sequential`, addestramento con `compile`/`fit` e
    callback (`EarlyStopping`, `ModelCheckpoint`) senza scrivere un training loop manuale.
  - Backend torch per l'ecosistema e l'hardware, mantenendo la sintassi di Keras.
- **Negative:**
  - Dipendenza da due livelli (Keras + torch); alcune funzionalità torch avanzate sono meno
    accessibili dietro l'astrazione di Keras.
  - **Vincolo operativo**: `KERAS_BACKEND=torch` va impostato *prima* di importare keras,
    altrimenti Keras tenta di caricare TensorFlow e fallisce.
