# Note di Progetto

## Processo di Lavoro


- **Repository**: branching model basato su feature branch + PR review obbligatoria
- **Strumenti**: GitHub per codice e documentazione, MLflow per tracciamento esperimenti, dashboard monitoring interna
- **Comunicazione asincrona**: issue e discussion su GitHub, documentazione su repo

## Rischi

| Rischio                                               | Probabilità | Impatto | Mitigazione                                                     |
| ----------------------------------------------------- | ----------- | ------- | --------------------------------------------------------------- |
| Sbilanciamento classi nel dataset                     | Alta        | Alto    | Oversampling / focal loss / metriche per classe                 |
| Dati di training inconsistenti tra moderatori         | Media       | Alto    | Linee guida di labeling condivise; revisione periodica a campione |
| Drift dei contenuti (nuove tendenze, linguaggio)      | Alta        | Medio   | Retraining frequente + monitoring continuo della distribuzione  |
| Costi infrastrutturali per inferenza in tempo reale   | Media       | Medio   | Ottimizzazione modello (quantization, pruning); batch processing |
| Falsi positivi che bloccano contenuti legittimi       | Media       | Alto    | Soglia conservativa + coda di revisione umana per casi dubbi    |

## Assunzioni

- Lo storico delle decisioni di moderazione esistenti è sufficientemente accurato per l'addestramento iniziale
- La distribuzione dei contenuti caricati rimane statisticamente simile a quella dello storico
- Il team di moderazione ha capacità residua per gestire la coda di revisione generata dal sistema
- I metadati e le trascrizioni sono disponibili per tutti i video storici

## Handover

Cosa deve sapere chi subentra:

1. **Documentazione di riferimento**: README.md (visione generale), DECISION_LOG.md (perché certe scelte), questo file (processo e rischi)
2. **Riprodurre il setup**: requirements.txt con dipendenze; dati di training su archivio condiviso (contattare Ragnatela per accesso)
3. **Primi passi suggeriti**:
   - Leggere README.md e DECISION_LOG.md per contesto
   - Verificare che la pipeline di training sia eseguibile localmente
   - Controllare dashboard monitoring per metriche recenti
   - Partecipare a una daily standup per allineamento col team
4. **Contatti**:
   - Pinizzotto (PM) — prioritizzazione e stakeholder
   - Ragnatela (DS) — dati, metriche, modello
   - Ukmar (Dev) — pipeline, deploy, infrastruttura
   - Rigamonti (Dev) — frontend moderazione, feedback loop
