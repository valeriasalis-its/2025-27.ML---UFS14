# Scenario 2 — Classificazione contenuti per una piattaforma video

**Gruppo: Suicide Squad** — Lorenzo Bortoluzzi · Elia Samarati · Tommaso Bruzzese · Massimiliano Salvi

*Svolgimento del nostro gruppo (4 persone). Questo è il **README**; le decisioni motivate e le note su ruoli e handover sono nel file [`decision-log.md`](./decision-log.md). Abbiamo scelto di raccontare non solo cosa faremmo, ma soprattutto **come ci siamo arrivati ragionando insieme**.*

**Da dove siamo partiti come gruppo.** La prima cosa su cui ci siamo confrontati non è stata "quale modello usare", ma *qual è davvero il problema*. Ci siamo detti: il team di moderazione non riesce a guardare tutto, quindi il valore non è "un modello che indovina", ma **un sistema che decide di cosa possono occuparsi gli umani e cosa no**. Da qui è nato tutto il resto: il modello per noi è un *filtro di smistamento*, non un giudice. Ci siamo concentrati in particolare su due cose — **come gestire i casi in cui il modello non è sicuro** e **come impostare bene le fasi di lavoro** — perché lì abbiamo capito che si gioca la riuscita del progetto.

## Analisi del problema e degli obiettivi

Ragionando insieme abbiamo riformulato il problema così: *ogni giorno arrivano troppi video per controllarli a mano; se rallentiamo la pubblicazione perdiamo utenti, se pubblichiamo senza controllo rischiamo contenuti dannosi online*. La domanda che ci siamo posti non è "come classifichiamo?", ma **"come facciamo lavorare gli umani solo dove serve davvero?"**.

Da questa domanda è nata l'idea centrale: il modello non dà un verdetto secco, ma un **punteggio di rischio** tra 0 e 1, e siamo **noi** a decidere due soglie che dividono i contenuti in tre corsie.

| Corsia | Condizione | Azione | Il nostro ragionamento |
|---|---|---|---|
| **Pubblica subito** | rischio basso (`< 0.20`) | online in automatico | il modello è molto sicuro → non sprechiamo tempo umano |
| **Da verificare** | rischio intermedio (`0.20–0.80`) | coda moderazione umana | qui il modello è *incerto*, e l'incertezza la gestisce l'uomo |
| **Blocca in attesa** | rischio alto (`> 0.80`) | non pubblicato finché un umano conferma | meglio fermarlo e sbagliare per prudenza |

Abbiamo discusso a lungo sulle soglie e siamo arrivati a una conclusione precisa: **le soglie sono una scelta nostra, non del modello**. Spostandole decidiamo quanto essere prudenti, senza dover riaddestrare nulla. Le abbiamo messe volutamente prudenti all'inizio, sapendo che andranno tarate sui dati reali.

**Come misuriamo se funziona.** Ci siamo detti che l'accuratezza da sola ci avrebbe ingannati (con pochi contenuti problematici, un modello che dice "va tutto bene" sembra bravissimo). Quindi abbiamo fissato due obiettivi, in ordine di importanza:
1. **Intercettare almeno il 95% dei contenuti problematici** (recall ≥ 0.95) — la sicurezza prima di tutto.
2. **Gestire in automatico almeno il 60% dei contenuti** — l'efficienza, ma solo *dopo* aver garantito il punto 1.

## Quali dati potrebbero essere utili e perché

Ci siamo chiesti: *cosa serve al modello per capire un video?* E abbiamo elencato, motivando ogni scelta:

- **Il contenuto stesso** — frame del video, audio e testo (titolo, descrizione, sottotitoli). È l'unico modo per sapere cosa c'è *dentro* il video, non solo cosa dichiara l'utente.
- **Le decisioni storiche della moderazione** — i video già giudicati a mano. Qui abbiamo avuto l'intuizione più utile: **abbiamo già le etichette pronte**, sono le scelte passate dei nostri moderatori. Non dobbiamo inventarci cos'è giusto, ce lo dice il nostro storico.
- **Il contesto dell'utente** — un creator già sanzionato è più a rischio; ci è sembrato uno spreco ignorare questa informazione.
- **Le segnalazioni degli utenti** dopo la pubblicazione — le abbiamo viste come "correzioni gratuite": ci dicono dove abbiamo sbagliato.

Abbiamo anche deciso, ragionandoci, di **non** usare dataset esterni già pronti: le regole di cosa è accettabile cambiano da piattaforma a piattaforma, e un dataset di qualcun altro ci farebbe imparare le regole sbagliate.

## Quali casi potrebbero essere più ambigui o delicati

Questa parte l'abbiamo scritta apposta, perché ci siamo accorti che è dove il modello sbaglierà sempre — e volevamo che fosse messo nero su bianco:

- **Contenuto che dipende dal contesto**: una scena violenta può essere un film, un videogioco o violenza vera. Stesso fotogramma, significato opposto — il modello da solo non può saperlo.
- **Satira, cronaca, educazione**: parlare di un tema ≠ promuoverlo. È una distinzione che spesso sfugge anche a noi umani.
- **Lingue e culture diverse**: qualcosa di normale in un paese è offensivo in un altro.
- **Contenuti nuovi mai visti** (nuove truffe, nuove mode): il modello non li conosce e rischia di farli passare.

La regola che ci siamo dati è una sola: **nel dubbio, non si pubblica in automatico**. Preferiamo far attendere un contenuto sano che pubblicarne uno dannoso.

## Le fasi del ciclo di vita ML — il nostro percorso di ragionamento

Qui abbiamo messo il focus maggiore, perché per noi le fasi *sono* il ragionamento del progetto, non una formalità.

### 1. Raccolta dati
Ci siamo chiesti da dove partire e la risposta è stata: **dal nostro storico di moderazione**, che è già etichettato. Ma ci siamo subito posti un problema: se raccogliamo dati solo di una categoria o di una lingua, il modello sarà cieco su tutto il resto. Quindi abbiamo deciso di curare la **copertura** (tutte le categorie, tutte le lingue principali) e di concordare con la moderazione **cosa significa esattamente ogni classe** — perché se non ci mettiamo d'accordo su questo, ognuno etichetta a modo suo e i dati diventano inutili. Split fissato **70/15/15**, fatto **per utente** e non a caso (spiegato nel decision-log, D7).

### 2. Training — e qui la questione dei **pesi**
Il punto su cui abbiamo discusso di più. I contenuti problematici sono una piccola minoranza (~2–5%), e ci siamo accorti di un rischio: il modello potrebbe imparare la scorciatoia "dico sempre che va bene" e sembrare accuratissimo pur essendo inutile.

Poi ci siamo posti la domanda chiave: **dobbiamo essere noi a decidere quanto conta ciascun segnale?** (es. "l'audio pesa più del testo", "questo esame conta il doppio"). Ci abbiamo ragionato e abbiamo concluso di **no**. Assegnare i pesi a mano sarebbe arbitrario e fragile: sarebbero *nostre impressioni*, non fatti. **È il modello stesso, durante l'addestramento, a bilanciare i pesi dei vari segnali — e lo fa meglio di noi**, perché li calibra sui dati reali e su migliaia di esempi, non sull'intuizione di quattro persone. In pratica il modello "pesa" da solo quali segnali contano di più per distinguere un contenuto problematico, e noi non dobbiamo (né vogliamo) forzargli la mano.

Il nostro compito, allora, non è impostare i pesi, ma fare due cose che il modello da solo non può fare:
- dargli **dati puliti e ben etichettati**;
- dirgli **quali errori ci fanno più paura**. Su questo sì che decidiamo noi: abbiamo stabilito che lasciar passare un contenuto problematico (falso negativo) è molto più grave che bloccare per errore un contenuto sano (falso positivo). Questa priorità la comunichiamo al modello, ma *come* poi lui bilancia internamente i segnali per rispettarla è compito suo, che svolge meglio di noi.

In sintesi: **noi diamo la direzione (quali errori pesano di più e quali dati usare), il modello fa il bilanciamento fine dei pesi**, perché è ciò che sa fare meglio.

### 3. Validazione
Ci siamo detti subito: non guardiamo l'accuratezza complessiva, ci ingannerebbe. Abbiamo scelto di guardare soprattutto **quanti contenuti problematici intercettiamo** (recall) e **quanti ne blocchiamo per sbaglio** (precision), e — questa è stata una nostra insistenza — di **calcolare queste metriche per ogni categoria e per ogni lingua**, non solo sulla media. Perché? Perché ci siamo accorti che un modello può sembrare bravo in media ed essere pessimo su una lingua minoritaria: ed è esattamente lì che si nasconde il bias. Test finale una sola volta, su dati mai visti.

### 4. Deploy
Qui il ragionamento è stato: *non ci fidiamo abbastanza da accendere tutto il primo giorno*. Quindi abbiamo pensato a tre passi:
1. **Shadow mode** — il modello gira ma non applica nulla, e noi confrontiamo le sue scelte con quelle degli umani. Così misuriamo gli errori veri senza rischiare niente.
2. **Canary** — lo attiviamo su una piccola fetta di traffico e confrontiamo con il processo attuale.
3. **Rollout progressivo** fino al 100%, tenendoci sempre la possibilità di **tornare indietro** se qualcosa peggiora.

Il modello resta il *primo filtro*, con la moderazione umana sempre dietro sui casi incerti.

### 5. Monitoring
Ci siamo chiesti: *una volta acceso, come ci accorgiamo se si rompe?* Da qui la sezione MLOps qui sotto, che per noi è parte integrante del progetto e non un'aggiunta finale.

## Aspetti MLOps

### Cosa monitoriamo (e perché lo abbiamo scelto)
Abbiamo diviso i segnali in tre gruppi, ragionando su *cosa possiamo davvero misurare*:

**Qualità del modello** — la parte più importante, misurabile grazie ai casi che l'umano ricontrolla e alle segnalazioni:
- **recall stimata sui problematici**: se scende sotto ~0.93, scatta l'allarme (ci stanno sfuggendo troppi contenuti);
- **quante volte la moderazione ribalta il modello**: se cresce, il modello sta sbagliando di più;
- **segnalazioni utenti su contenuti pubblicati in automatico**: un picco è il segnale più diretto di un falso negativo.

**Comportamento del sistema** — misurabile subito, senza aspettare le etichette:
- **% di contenuti gestiti in automatico**: se crolla, il modello è diventato troppo incerto;
- **% in corsia "da verificare"**: se sale troppo, qualcosa nei contenuti è cambiato (drift);
- **distribuzione del punteggio di rischio**: se si sposta, i contenuti in ingresso non sono più quelli su cui abbiamo addestrato.

**Cambiamento dei dati in ingresso**: comparsa di nuove lingue, nuovi formati, nuove categorie che il modello non conosce.

Abbiamo pensato a una **dashboard** con allarmi automatici, dando priorità assoluta ai segnali di sicurezza.

### Quando faremmo un retraining
Ne abbiamo discusso e siamo arrivati a questi casi:
- **il modello peggiora** (recall sotto soglia o troppe correzioni umane per più settimane);
- **cambiano i contenuti** (nuove lingue/formati, drift dei dati);
- **cambiano le regole** della piattaforma → il modello va riallineato alle nuove policy;
- **compaiono nuovi tipi di abuso** non presenti nei dati;
- **periodicamente**, man mano che si accumulano nuove etichette dalla moderazione e dalle segnalazioni.

Una cosa su cui siamo stati fermi: **nessun retraining va online "al buio"**. Ogni nuovo modello ripassa dalla stessa validazione e da una fase shadow prima di sostituire quello attivo — perché un modello riaddestrato su dati sporchi potrebbe peggiorare le cose.

## Rischi, assunzioni e limiti

**Le nostre assunzioni** (le scriviamo perché se saltano, salta il progetto):
- che le decisioni storiche della moderazione siano coerenti abbastanza da fidarci (se in passato erano contraddittorie, il modello eredita la confusione);
- che ciò che è problematico oggi lo sia anche a breve (le regole cambiano nel tempo);
- che per i contenuti che riceviamo abbiamo dati a sufficienza.

**I rischi che abbiamo individuato:**
- **bias** verso lingue/culture con pochi dati → per questo misuriamo le metriche per lingua;
- **falsi negativi** (contenuto dannoso online) → li abbiamo resi la priorità numero uno;
- **falsi positivi** (creator sani bloccati) → mitigati dalla corsia intermedia e da una revisione rapida;
- **eccesso di fiducia nel modello** da parte del team → per questo la moderazione umana resta obbligatoria sui casi incerti;
- **aggiramento**: chi vuole caricare contenuti vietati imparerà a ingannare il modello → serve il retraining periodico.

**I limiti che riconosciamo:**
- il modello non capisce il contesto come un umano: sui casi ambigui sarà sempre debole, ed è per questo che esiste la corsia "da verificare";
- funziona bene solo su casi simili a quelli già visti;
- non elimina la moderazione umana, la concentra dove serve.

**Il progetto sta in piedi dall'inizio alla fine?** Sì, come ragionamento: dal problema fino al monitoraggio e al retraining. Se dovessimo ampliarlo, penseremmo a un modello che tiene conto anche dello storico dell'utente e a una spiegazione del *perché* un contenuto è stato bloccato, per aiutare il moderatore.
