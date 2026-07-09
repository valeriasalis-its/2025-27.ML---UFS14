# ML Video Content Classification

Classificazione automatica dei contenuti caricati dagli utenti di una piattaforma video per supportare il team di moderazione.

## Team e Ruoli

| Nome        | Ruolo          |
| ----------- | -------------- |
| Pinizzotto  | Project Manager     |
| Ragnatela   | Data Scientist |
| Ukmar       | Sviluppo       |
| Rigamonti   | Sviluppo      |

## Contesto

La piattaforma riceve quotidianamente un volume elevato di video caricati dagli utenti. Distinguere i contenuti pubblicabili da quelli che richiedono moderazione è diventato complesso da gestire solo manualmente. Il team introduce un sistema ML per assistere il workflow di moderazione.

## Obiettivo

Definire un approccio concettuale per sviluppare una funzionalità di classificazione dei contenuti basata su ML, documentando:

- il problema e gli obiettivi
- le decisioni prese e le motivazioni
- il processo di lavoro
- ciò che deve essere chiaro a chi entra successivamente nel team

## Analisi del Problema

I contenuti video possono essere classificati in tre macro-categorie:

- **Pubblicabile direttamente** — contenuti che non violano le policy
- **Da rivedere** — contenuti ambigui che richiedono moderazione umana
- **Bloccato** — contenuti che violano chiaramente le policy 
- **Non pubblicato** — non visualizzabile nella home

## Dati Potenzialmente Utili

- Metadati del video (titolo, descrizione, tag, durata)
- Trascrizione audio / testo generato da ASR
- Thumbnail e fotogrammi chiave
- Storico delle decisioni di moderazione


## Casi Borderline

- Satira politica o sociale
- Contenuti educativi con linguaggio forte
- Opere d'arte o documentari con scene sensibili
- Video in lingue a bassa rappresentanza nei dati di training
- Copyright infrigment 
- Contenuti 18+


## Ciclo di Vita ML

1. **Raccolta dati** — estrazione dal database storico e dai flussi di upload
2. **Training** — modello supervisionato su dataset etichettato dal team moderazione
3. **Validazione** — test su subset fuori dal training; metriche di precision, recall, F1
4. **Deploy** — rollout graduale con fallback (backup server con video già moderati)
5. **Monitoring** — dashbaord con metriche in tempo reale e trascrizioni audio video

## MLOps

- **Retraining**: triggerato mensilmente o all'arrivo di report mandate dal modello predittivo
- **Segnali di problema**: calo di precision/recall, aumento del backlog di moderazione, cambiamenti nella distribuzione delle classi, aumento dei falsi positivi segnalati dagli utenti

## Rischi e Limiti

- Sbilanciamento delle classi (pochi contenuti bloccati rispetto ai pubblicabili)
- Dati di training etichettati in modo non uniforme tra diversi moderatori
- Evoluzione del linguaggio e dei contenuti che richiede aggiornamento continuo del modello
- (Costi computazionali per l'inferenza su larga scala, se decidiamo che Micky è ricco non abbiamo problemi)

## Documenti Correlati

- [DECISION_LOG.md](./DECISION_LOG.md) — tracciamento delle decisioni
- [NOTES.md](./NOTES.md) — note su processo, rischi e handover
