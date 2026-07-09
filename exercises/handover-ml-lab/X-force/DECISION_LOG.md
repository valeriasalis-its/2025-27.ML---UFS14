# LOG X-force 

# Registro delle Decisioni Architetturali (Decision Log)

Questo file traccia le decisioni fondamentali prese dal team, spiegando le motivazioni, i responsabili e le alternative scartate. **Regola del team:** se una decisione non è scritta qui, non esiste.

---

### DEC-01: Utilizzo di Feedback Impliciti per il Modello e Monitoraggio
* **Autori / Responsabile:** PM / Tester

| Scelta Adottata | Alternativa Rifiutata | Motivazione |
| :--- | :--- | :--- |
| **Utilizzo di Feedback Impliciti** (in particolare il tracciamento dello "Skip Immediato" nei primi 15 secondi ed il tempo di ascolto) come segnale principale. | Tracciamento basato solo sui "Like" espliciti (il tasto Cuore). | Meno del 5% degli utenti interagisce attivamente con i tasti di gradimento o clicca sul "Cuore" (ascolto passivo). Basarsi solo sui Like creerebbe una matrice di dati troppo vuota per addestrare e validare accuratamente il modello. Lo skip immediato è un feedback implicito molto più denso, numeroso e affidabile. |

---

### DEC-02: Metrica di Validazione Offline per il Ranking
* **Autori / Responsabile:** Tester

| Scelta Adottata | Alternativa Rifiutata | Motivazione |
| :--- | :--- | :--- |
| **Validazione tramite metrica NDCG@10** (Normalized Discounted Cumulative Gain) con soglia minima di accettazione a 0.65. | Utilizzo dell'accuratezza classica (Accuracy). | All'utente non interessa se il modello indovina 100 canzoni generiche nel mucchio; interessa che le prime 5-10 canzoni che appaiono sullo schermo del telefono siano perfette. L'NDCG valuta l'ordinamento e premia il modello se posiziona i brani migliori esattamente in cima alla lista. |

---

### DEC-03: Frequenza di Retraining del Modello
* **Autori / Responsabile:** Tutto il team / Tester & Writer

| Scelta Adottata | Alternativa Rifiutata | Motivazione |
| :--- | :--- | :--- |
| **Retraining Batch Settimanale** (ogni venerdì notte alle ore 03:00). | Retraining Continuo in tempo reale (Online Learning). | L'aggiornamento continuo in tempo reale è estremamente costoso a livello computazionale e rischia di rendere il modello instabile. I gusti musicali non variano di ora in ora. Il venerdì è il giorno internazionale di rilascio della nuova musica ("New Music Friday"), rendendo questa cadenza il perfetto compromesso tra freschezza del catalogo e minimizzazione dei costi cloud. |

---

### DEC-04: Gestione del Cold Start per i Nuovi Utenti
* **Autori / Responsabile:** PM / Markdown Writer

| Scelta Adottata | Alternativa Rifiutata | Motivazione |
| :--- | :--- | :--- |
| **Questionario di Onboarding** (Scelta guidata di almeno 3 generi/artisti preferiti all'iscrizione). | Proporre i brani della "Top 50 Globale" finché l'utente non accumula uno storico di ascolti. | Mostrare solo la Top 50 globale a un utente con gusti altamente specifici o di nicchia (es. Jazz o Metal) causerebbe una pessima user experience e l'abbandono immediato dell'applicazione. Un mini-questionario visivo richiede pochissimi secondi all'utente ma permette al modello di effettuare raccomandazioni mirate fin dal primo avvio. |

---

### DEC-05: Strategia di Identificazione della Nuova Musica per l'Utente
* **Autori / Responsabile:** PM

| Scelta Adottata | Alternativa Rifiutata | Motivazione |
| :--- | :--- | :--- |
| **Identificazione Multi-Livello Personalizzata** (Freshness, Lateral Discovery e Serendipità basata su cluster di utenti simili). | Identificazione basata solo sulle Nuove Uscite Editoriali e sulla Top 50 Globale. | Spingere solo le novità editoriali o le hit del momento ignorerebbe i gusti individuali degli utenti di nicchia. Un utente che ascolta solo musica classica o Jazz troverebbe frustrante e irrilevante ricevere come "novità" l'ultimo brano pop del momento, portandolo all'abbandono della piattaforma (churn). La novità deve essere un concetto relativo al singolo profilo, non assoluto rispetto al mercato. |
