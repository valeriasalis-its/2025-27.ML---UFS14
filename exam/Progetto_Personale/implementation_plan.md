# Simulatore di Lancio Razzi con Correzione Traiettoria via EM

Sito web interattivo per simulare il lancio di razzi con fisica realistica, effetti del vento, e un sistema di comunicazione elettromagnetica terra-razzo per la correzione automatica della traiettoria.

## Panoramica del Progetto

Un'applicazione web single-page (HTML/CSS/JS puro) con:
- Pannello input per tutti i parametri del razzo
- Canvas 2D animato per la visualizzazione della traiettoria
- Simulazione fisica con gravità, drag aerodinamico e vento
- Sistema di comunicazione EM tra stazione di terra e computer di bordo
- Correzione automatica della traiettoria via **flap** e **thrust vectoring**
- Dashboard telemetrica in tempo reale

## Modello Fisico

### Equazioni del Moto
- **Spinta (Thrust)**: Vettore di forza applicato lungo l'asse del razzo, con angolo regolabile (thrust vectoring)
- **Gravità**: $F_g = m \cdot g$ (verso il basso)
- **Drag Aerodinamico**: $F_d = \frac{1}{2} \cdot \rho \cdot v^2 \cdot C_d \cdot A$ (opposto alla velocità relativa al vento)
- **Forza del Vento**: Modellato come profilo variabile con altitudine + raffiche casuali
- **Forza dei Flap**: Forza laterale correttiva proporzionale alla deflessione del flap

### Parametri Input

| Parametro | Unità | Descrizione |
|-----------|-------|-------------|
| Massa razzo | kg | Massa totale (struttura + carburante) |
| Massa carburante | kg | Massa del propellente |
| Thrust | N | Spinta del motore |
| Angolo di lancio | ° o rad | Angolo rispetto al suolo |
| Tempo di combustione | s | Durata della spinta |
| Diametro razzo | m | Diametro del corpo |
| Lunghezza razzo | m | Lunghezza totale |
| Angolo cono | ° | Semi-angolo del nose cone |
| Cd (coefficiente drag) | - | Coefficiente di resistenza aerodinamica |
| Velocità vento | m/s | Velocità del vento laterale |
| Variabilità vento | % | Intensità delle raffiche |

### Sistema di Correzione Traiettoria

1. **Computer di terra** calcola la deviazione dalla traiettoria nominale
2. **Trasmissione EM** (visualizzata con onde animate) invia comandi al razzo
3. **Latenza di comunicazione**: simulata realisticamente (proporzionale alla distanza, velocità della luce)
4. **Computer di bordo** riceve e applica le correzioni:
   - **Thrust Vectoring**: Deflessione dell'ugello fino a ±5° per correggere la direzione della spinta
   - **Flap**: Superfici aerodinamiche che generano forze laterali correttive
5. **Controllore PID**: Algoritmo di controllo proporzionale-integrale-derivativo per stabilizzare la traiettoria

### Visualizzazione

- **Canvas principale**: Traiettoria del razzo con traccia, traiettoria nominale tratteggiata, effetto vento visualizzato
- **Onde EM animate**: Impulsi luminosi tra stazione di terra e razzo
- **Razzo animato**: Con fiamma, flap mobili, e indicatore thrust vectoring
- **Dashboard telemetria**: Altitudine, velocità, accelerazione, angolo, deviazione, stato comunicazione
- **Grafici real-time**: Altitudine vs tempo, velocità vs tempo, deviazione vs tempo

## Proposed Changes

### Struttura del Progetto

Il progetto sarà una single-page application nella directory:
`C:\Users\FilippoDiNoia\.gemini\antigravity\scratch\rocket-simulator\`

#### [NEW] [index.html](file:///C:/Users/FilippoDiNoia/.gemini/antigravity/scratch/rocket-simulator/index.html)
- Struttura HTML semantica con pannello input, canvas, e dashboard
- Meta tags SEO
- Layout responsivo con CSS Grid

#### [NEW] [style.css](file:///C:/Users/FilippoDiNoia/.gemini/antigravity/scratch/rocket-simulator/style.css)
- Design dark-mode con tema spaziale
- Glassmorphism per i pannelli
- Animazioni fluide e micro-interazioni
- Color palette: toni di blu scuro, ciano, arancio (fiamma), verde (telemetria)
- Typography: Google Font "Orbitron" per titoli, "Inter" per testo

#### [NEW] [simulation.js](file:///C:/Users/FilippoDiNoia/.gemini/antigravity/scratch/rocket-simulator/simulation.js)
- Motore fisico con integrazione Runge-Kutta (RK4) per accuratezza
- Modello drag aerodinamico
- Profilo vento con raffiche stocastiche
- Sistema di comunicazione EM con latenza
- Controllore PID per correzione traiettoria
- Logica di thrust vectoring e flap

#### [NEW] [renderer.js](file:///C:/Users/FilippoDiNoia/.gemini/antigravity/scratch/rocket-simulator/renderer.js)
- Rendering del canvas principale (traiettoria, razzo, onde EM)
- Rendering del razzo con dettagli (cono, corpo, alette, fiamma)
- Animazione onde elettromagnetiche
- Grafici telemetrici in tempo reale
- Effetti visivi (particelle fiamma, scia, stelle di sfondo)

#### [NEW] [app.js](file:///C:/Users/FilippoDiNoia/.gemini/antigravity/scratch/rocket-simulator/app.js)
- Orchestrazione dell'applicazione
- Gestione input e validazione
- Loop di animazione (requestAnimationFrame)
- Event handling e UI updates

## Design Estetico

- **Sfondo**: Gradiente scuro con stelle animate (effetto spazio)
- **Pannelli**: Glassmorphism con bordi luminescenti ciano
- **Canvas**: Sfondo con gradiente cielo che cambia con l'altitudine (azzurro → blu scuro → nero/spazio)
- **Razzo**: Disegnato con dettagli, fiamma animata, flap visibili
- **Onde EM**: Cerchi concentrici pulsanti tra terra e razzo
- **Telemetria**: Stile HUD sci-fi con numeri che scorrono
- **Pulsante lancio**: Grande, rosso, con animazione glow

## Verification Plan

### Manual Verification
- Aprire `index.html` nel browser
- Verificare che tutti gli input funzionino
- Lanciare una simulazione e verificare la traiettoria fisicamente plausibile
- Attivare il vento e verificare la deviazione
- Verificare che il sistema EM corregga la traiettoria
- Testare diversi angoli di lancio (0°-90°)
- Verificare il responsive design
