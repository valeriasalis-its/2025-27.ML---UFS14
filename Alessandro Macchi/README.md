# Sistema di raccomandazione musicalegit reset --soft HEAD~1

## Analisi del problema e degli obiettivi

La piattaforma offre un catalogo musicale ampio, ma gli utenti ascoltano una piccola parte di esso, tendono ad ascoltare la stessa musica (intesa come le stesse canzoni a ripetizione degli stessi artisti) e a rimanere sulle stesse playlist. Questo produce due effetti negativi:

1. **Scoperta limitata**: l’utente non trova nuova musica rilevante, la piattaforma perde valore percepito rispetto ai concorrenti.
2. **Raccomandazioni sempre simili**: senza nuovi contenuti rilevanti, le sessioni si accorciano e il rischio di abbandono aumenta.

La piattaforma offre già raccomandazioni, ma basate sulla popolarità generale, tutti gli utenti ricevono più o meno gli stessi suggerimenti. Vogliamo passare da qualcosa di generale a qualcosa di più specifico, cercando di far ascoltare “musica nuova” che per noi significa musica di artisti e generi che l’utente già conosce e apprezza ma canzoni o album/artisti che l’utente non ha mai ascoltato (non ci interessa necessariamente che la musica consigliata sia uscita di recente).

### Obiettivo di prodotto

Aiutare gli utenti a scoprire nuova musica e rilevante, aumentando il tempo di ascolto e la soddisfazione.                                                                      

Dato un utente e il suo storico di ascolto, produrre una lista ordinata di brani che l’utente non ha ancora ascoltato, simile ai suoi gusti, con alta probabilità di gradimento.

### Metriche di successo

| Metrica | Perché |
| --- | --- |
| Quantità di skip | Quante volte l’utente ha skippato la raccomandazione e a che minuto della riproduzione |
| Click-rate sulle raccomandazioni | L’utente clicca su ciò che proponiamo? |
| Tempo di ascolto medio per sessione | La metrica di business finale |
| Diversity / % artisti nuovi ascoltati | Stiamo davvero facendo *scoprire* musica, non solo riproporre il già noto |

---

## Dati: cosa serve e perché

| Dato | Perché è utile | Attenzioni |
| --- | --- | --- |
| **Storico di ascolto** (utente, brano, timestamp, durata ascolto, skip) | È il segnale principale: il comportamento reale vale più delle dichiarazioni | Lo skip precoce è un segnale negativo forte; la riproduzione passiva (autoplay) è un segnale debole — vanno distinti |
| **Feedback esplicito** (like, salvataggi in playlist, follow artista) | Segnale di gradimento forte ma **raro** (pochi utenti lo usano) | Non basta da solo: la maggioranza degli utenti sarebbe “invisibile” |
| **Metadati dei brani** (genere, artista, anno, BPM, eventuali feature audio) | Permettono raccomandazioni content-based, essenziali per brani nuovi senza storico | Qualità dei metadati spesso incostante (generi mancanti/errati) |
| **Contesto di ascolto** (ora del giorno, dispositivo, playlist di provenienza) | L’ascolto varia col contesto (palestra vs. sera) | Aumenta la complessità |
| **Dati demografici** | Utili per il cold start di utenti nuovi | Rischio privacy e bias  |

**Cosa non usiamo e perché**: Dati sensibili non necessari, contenuti dedotti che potrebbero rivelare informazioni sensibili sull’utente. Minimo dato necessario per il compito.

---

## Ciclo di vita ML

### Raccolta dati

- Estrazione dai log di ascolto e dal DB applicativo verso un data store dedicato al training (separato dal DB di produzione).
- **Definizione esplicita di “interazione positiva”**: ascolto ≥ 30 secondi oppure like/salvataggio.
- **Pulizia**: rimozione bot/anomalie, gestione duplicati, anonimizzazione degli identificativi dove possibile.
- **Versionamento dei dataset**: ogni training deve poter dichiarare “su quale fotografia dei dati è stato fatto”.

### Training

- Approccio della prima versione: **collaborative filtering** (utenti simili ascoltano cose simili), con fallback **content-based** sui metadati per gestire il cold start di brani/utenti nuovi.
- Ogni run di training registra: versione del dataset, parametri, metriche ottenute.

### Validazione

- **Split temporale, non casuale**: si addestra sul passato e si valida sul futuro, perché in produzione il modello predirà sempre ascolti futuri. Uno split casuale gonfierebbe le metriche (data leakage temporale).
- Confronto obbligatorio con una **baseline semplice** (es. “raccomanda i brani più popolari nel genere preferito dell’utente”). Se il modello ML non batte la baseline, non va in produzione — la baseline è anche il nostro fallback.
- Validazione qualitativa a campione: il team guarda le raccomandazioni prodotte per utenti-tipo e verifica che siano sensate (sanity check umano).

### Deploy

- Rilascio graduale tramite **A/B test**: una percentuale piccola di utenti riceve le nuove raccomandazioni, il resto continua col sistema attuale. Si confrontano le metriche online.
- Rollout completo solo se le metriche online confermano quelle offline.
- **Piano di rollback documentato**: se qualcosa va storto, si torna al sistema precedente con un’operazione nota e testata, non improvvisata.

### Monitoring

- Dashboard con le metriche online (CTR, ascolti >30 sec) aggiornata quotidianamente.
- Alert automatici se una metrica scende sotto una soglia definita.
- Monitoraggio anche degli aspetti operativi: latenza nel servire le raccomandazioni, tasso di errore dell’API, copertura (a quanti utenti riusciamo effettivamente a dare raccomandazioni personalizzate).

# MLOps: retraining e segnali di problema

---

### Quando serve il retraining

1. **Periodico e programmato**: i gusti cambiano, escono brani nuovi, arrivano utenti nuovi. Un modello fermo invecchia anche se “funziona”.
2. **Su evento**: ingresso massiccio di nuovo catalogo (es. accordo con una nuova etichetta), cambiamenti di prodotto che alterano il comportamento (nuova UI, nuova feature).
3. **Su degrado misurato**: se le metriche online scendono in modo persistente oltre una soglia concordata.

### Segnali che indicano un problema

| Segnale | Cosa può significare |
| --- | --- |
| CTR in calo costante | Il modello sta invecchiando (drift dei gusti) o c’è un problema nei dati in ingresso |
| Skip rate in aumento sui brani raccomandati | Le raccomandazioni sono diventate meno rilevanti |
| Distribuzione dei dati in ingresso cambiata rispetto al training | Data drift — es. cambia il mix di dispositivi, di generi, di fasce orarie |
| Metriche offline buone ma online cattive | Possibile leakage nel training o mismatch tra ambiente offline e produzione |
| Latenza o errori dell’API in aumento | Problema infrastrutturale, non di modello — ma per l’utente il risultato è lo stesso |

---

## 5. Come è organizzato il repository

```
/docs
  README.md            ← questo file: visione, dati, ciclo di vita
  DECISION_LOG.md      ← decisioni prese e motivate (perché X e non Y)
  NOTE_PROGETTO.md     ← rischi, assunzioni, ruoli, handover
```