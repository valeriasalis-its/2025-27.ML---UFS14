# Decision Log — Classificazione Contenuti

Ogni decisione rilevante va registrata qui con: contesto, alternative considerate,
motivazione della scelta, e chi/quando l'ha presa. Lo scopo è che nessuna decisione
importante resti "detta a voce" in una call o in una chat.

---

## D001 — Output del modello come punteggio di rischio multi-classe, non decisione binaria

**Contesto**: Bisognava decidere se il modello dovesse restituire una decisione diretta
("pubblica" / "non pubblica") oppure un punteggio continuo di rischio.

**Alternative considerate**:
1. Classificazione binaria diretta (pubblica / non pubblica).
2. Punteggio di rischio continuo (0–1) per una o più categorie, con soglie di routing
   separate applicate dopo l'inferenza.

**Decisione**: Opzione 2.

**Motivazione**: Le soglie che definiscono cosa è "abbastanza sicuro da pubblicare"
cambiano più spesso del modello stesso (cambi di policy, pressione del team di
moderazione, periodi di alta sensibilità mediatica). Separare punteggio e soglia permette
di modificare il comportamento del sistema senza ri-addestrare il modello.

---

## D002 — Instradamento a 3 vie invece di 2

**Contesto**: Serviva decidere se il sistema dovesse avere solo due esiti (pubblica /
manda a moderazione) o tre (pubblica / revisiona / blocca subito).

**Alternative considerate**:
1. Due code: pubblica automaticamente oppure manda tutto alla stessa coda di moderazione.
2. Tre code: pubblica, revisione standard, escalation immediata per casi gravi.

**Decisione**: Opzione 2 (tre code).

**Motivazione**: Trattare allo stesso modo un contenuto "probabilmente ok ma non sicuro"
e uno "probabilmente molto grave" sprecherebbe le risorse di moderazione più critiche
(intervento rapido su casi gravi) mescolandole con la coda a bassa priorità.

---

## D003 — Regola hard per contenuti che coinvolgono minori: mai pubblicazione automatica

**Contesto**: Come trattare i casi in cui il modello è incerto ma il contenuto potrebbe
coinvolgere minori.

**Alternative considerate**:
1. Lasciare che sia il punteggio di rischio del modello a decidere anche in questi casi.
2. Applicare una regola fissa, indipendente dal modello: qualunque incertezza in quest'area
   blocca sempre la pubblicazione automatica.

**Decisione**: Opzione 2.

**Motivazione**: Il costo di un errore in questa categoria è talmente alto e asimmetrico
che non è accettabile delegarlo interamente a una soglia statistica soggetta a errore.
Questa regola è un vincolo di prodotto/policy applicato dopo l'inferenza, non un
parametro ottimizzabile dal modello.

---

## D004 — Etichette storiche dei moderatori come fonte principale di training, con nota di validità temporale

**Contesto**: Serviva una fonte di verità (ground truth) per il training supervisionato.

**Alternative considerate**:
1. Usare solo le segnalazioni degli utenti come etichette.
2. Usare le decisioni storiche del team di moderazione umana come etichette principali.

**Decisione**: Opzione 2, con le segnalazioni utente usate solo come segnale secondario
di bootstrap o di monitoraggio, non come etichetta primaria.

**Motivazione**: Le segnalazioni utente sono rumorose (possono riflettere dissenso di
gusto più che violazione reale delle regole) e sono soggette a segnalazioni di massa
coordinate. Le decisioni dei moderatori, pur non perfette, seguono linee guida esplicite.
**Nota tracciata esplicitamente**: ogni etichetta va associata alla versione delle linee
guida di moderazione in vigore al momento della decisione, perché le policy cambiano nel
tempo e un'etichetta "vecchia" potrebbe non essere più valida.

---

## D005 — Validazione per sottogruppo obbligatoria, non solo su metriche aggregate

**Contesto**: Come validare il modello prima del deploy.

**Alternative considerate**:
1. Validare solo su metriche aggregate (precision/recall complessivi).
2. Validare obbligatoriamente anche per sottogruppo (lingua, area geografica, tipo di
   account, categoria di contenuto).

**Decisione**: Opzione 2.

**Motivazione**: Un modello può avere ottime metriche aggregate e comportarsi molto peggio
su una lingua o una categoria minoritaria, generando un rischio di bias sistemico che
resterebbe invisibile guardando solo il numero complessivo.

---

## D006 — Deploy graduale (shadow mode → rollout progressivo)

**Contesto**: Come rilasciare il sistema in produzione la prima volta.

**Alternative considerate**:
1. Rollout completo immediato su tutto il traffico.
2. Deploy graduale: prima in shadow mode (il modello classifica ma non decide), poi su
   una piccola percentuale di traffico reale, poi rollout completo.

**Decisione**: Opzione 2.

**Motivazione**: Un sistema che tocca direttamente la pubblicazione di contenuti non può
essere validato solo offline; serve osservare il comportamento su traffico reale prima di
dargli potere decisionale, per limitare il danno di eventuali errori non previsti in fase
di validazione.

---

## Come aggiungere una nuova decisione
Ogni nuova voce deve includere: **Contesto**, **Alternative considerate**, **Decisione**,
**Motivazione**, e idealmente data/responsabile. Evitare di registrare solo la conclusione:
il valore del log è nelle alternative scartate e nel perché.
