# Dataset Generator - Machine Learning per Predizione Traiettoria Razzi

## 📋 Descrizione

Questo tool genera un dataset con **10.000 lanci di razzi simulati**, contenente:
- **Parametri di input**: massa, carburante, spinta, angolo di lancio, aerodinamica, condizioni meteo, parametri di controllo
- **Dati di output**: altitudine massima, velocità massima, tempo di volo, punto di atterraggio, traiettoria completa

Il dataset è pronto per l'importazione in **Google Colab** per l'addestramento di modelli di Machine Learning.

## 🚀 Come Usare

### 1. Generare il Dataset

1. Apri il file `generate_dataset.html` nel browser (basta doppio click)
2. Specifica il numero di lanci (default: 10.000)
3. Clicca su "Generate Dataset"
4. Attendi il completamento (dipende dal tuo computer, circa 5-30 minuti)

### 2. Scaricare i Dati

Una volta completata la generazione, scarica due file CSV:

- **`rocket_dataset_main.csv`**: Dati principali (16 parametri di input + 8 output)
- **`rocket_dataset_trajectories.csv`**: Dati completi della traiettoria (time, x, y, velocity)

## 📊 Struttura del Dataset

### File Principale: `rocket_dataset_main.csv`

**Colonne di INPUT (parametri della simulazione):**
```
totalMass         - Massa totale del razzo (kg) - Range: 30-100
fuelMass          - Massa del carburante (kg) - Range: 10-60
thrust            - Spinta del motore (N) - Range: 1000-5000
burnTime          - Tempo di combustione (s) - Range: 5-20
launchAngle       - Angolo di lancio (°) - Range: 75-89
diameter          - Diametro del razzo (m) - Range: 0.10-0.25
length            - Lunghezza del razzo (m) - Range: 1.5-3.0
coneAngle         - Angolo del cono (°) - Range: 10-30
cd                - Coefficiente di resistenza aerodinamica - Range: 0.3-0.7
windSpeed         - Velocità del vento (m/s) - Range: 0-15
windVariability   - Variabilità del vento (frazione) - Range: 0.1-0.5
correctionEnabled - Controllo di correzione attivo (0/1)
parachuteEnabled  - Paracadute abilitato (0/1)
pidKp             - Parametro P del controllore PID - Range: 1.0-3.0
pidKi             - Parametro I del controllore PID - Range: 0.05-0.3
pidKd             - Parametro D del controllore PID - Range: 0.5-2.5
```

**Colonne di OUTPUT (risultati della simulazione):**
```
maxAltitude       - Altitudine massima raggiunta (m)
maxVelocity       - Velocità massima durante il volo (m/s)
flightTime        - Tempo totale di volo (s)
landingX          - Posizione X di atterraggio (m)
landingY          - Posizione Y di atterraggio (m) - Sempre ≈ 0 (atterraggio al suolo)
landingVelocity   - Velocità di impatto (m/s)
lateralDeviation  - Deviazione laterale dalla traiettoria nominale (m)
parachuteDeployed - Paracadute dispiegato (0/1)
```

### File Traiettorie: `rocket_dataset_trajectories.csv`

```
launchIndex       - Indice del lancio (0-9999)
time              - Tempo dal lancio (s)
x                 - Posizione orizzontale (m)
y                 - Altitudine (m)
velocity          - Velocità totale (m/s)
```

## 🤖 Importare i Dati in Google Colab

### Opzione 1: Upload Diretto

```python
from google.colab import files
uploaded = files.upload()

import pandas as pd
df = pd.read_csv('rocket_dataset_main.csv')
df_traj = pd.read_csv('rocket_dataset_trajectories.csv')

print(df.shape)
print(df.head())
```

### Opzione 2: Preparare i Dati per l'ML

```python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# Caricare il dataset
df = pd.read_csv('rocket_dataset_main.csv')

# Separare input e output
input_features = ['totalMass', 'fuelMass', 'thrust', 'burnTime', 'launchAngle',
                  'diameter', 'length', 'coneAngle', 'cd', 'windSpeed',
                  'windVariability', 'correctionEnabled', 'parachuteEnabled',
                  'pidKp', 'pidKi', 'pidKd']

output_targets = ['maxAltitude', 'maxVelocity', 'flightTime', 
                  'landingX', 'landingY', 'landingVelocity']

X = df[input_features]
y = df[output_targets]

# Dividere train/test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Normalizzare
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

print(f"Training set: {X_train_scaled.shape}")
print(f"Test set: {X_test_scaled.shape}")
```

### Opzione 3: Predire il Punto di Atterraggio

```python
# Creare un modello per predire landingX e landingY
from sklearn.ensemble import RandomForestRegressor

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train_scaled, y_train[['landingX', 'landingY']])

# Predizione
y_pred = model.predict(X_test_scaled)
print(f"Errore medio (MAE): {np.mean(np.abs(y_pred - y_test[['landingX', 'landingY']].values))}")
```

## 📈 Possibili Modelli ML

1. **Neural Networks** (TensorFlow/Keras) - Per predizioni non-lineari complesse
2. **Random Forest / Gradient Boosting** - Per problemi di regressione
3. **Support Vector Regression** - Per predizioni di singoli valori
4. **LSTM Networks** - Per predizioni di traiettorie (usando i file di traiettoria)
5. **Polynomial Regression** - Per analisi semplificata

## 🔍 Analisi Consigliate

- **Correlazione tra parametri**: quali parametri influenzano maggiormente il punto di atterraggio?
- **Predizione traiettoria**: usare LSTM per predire la traiettoria completa dai parametri
- **Feature importance**: quali parametri sono più importanti per il ML?
- **Analisi di sensibilità**: come cambiano gli output al variare di un parametro?

## ⚙️ Configurazione Avanzata

Nel file `dataset_generator.js` puoi modificare:

```javascript
randomParam(min, max) {
    // Modifica i range di generazione dei parametri
}

runSimulation(params) {
    // Personalizza quali dati raccogliere dalla simulazione
}
```

## 💡 Note Importanti

- Il dataset è **completamente sintetico** basato su simulazioni fisiche
- I parametri vengono generati in modo **casuale ma realistico**
- Le simulazioni includono: **vento**, **controllo PID**, **paracadute**
- Il file di traiettoria può essere molto grande (~50-100 MB per 10k lanci)

## 🐛 Troubleshooting

**Il browser si blocca durante la generazione:**
- Riduci il numero di lanci a 1000-2000
- Usa un browser moderno (Chrome, Firefox, Edge)

**I dati non scaricano:**
- Verifica che il pop-up non sia bloccato
- Prova a fare clic direttamente su "Download"

**Errori durante l'importazione in Colab:**
- Verifica che il CSV sia stato scaricato completamente
- Controlla il separatore (dovrebbe essere `,`)

---

**Creato per il Progetto Personale ITS Angelo Rizzoli**
