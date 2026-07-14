# Decision Log — Trovare la Deforestazione nelle Foto Satellitari

Questo documento spiega, le scelte fatte per costruire un sistema che guarda foto satellitari della foresta amazzonica e cerca di capire da solo dove è stata "toccata" dall'uomo (strade, campi coltivati, miniere), distinguendola dalla foresta intatta.

---

## 1. Perché foto satellitari e non semplici tabelle di numeri?

Si è scelto di lavorare con **immagini reali** (foto satellitari della zona "Planet — Amazon") invece che con dati numerici già organizzati in tabelle.

**Perché:** le foto sono più difficili da analizzare ma sono anche più simili ai problemi reali. Contengono nuvole, rumore, forme sfumate — proprio le difficoltà che un sistema di intelligenza artificiale deve imparare ad affrontare.

## 2. Perché immagini piccole e poche immagini?

Il computer usato non ha una scheda grafica potente (niente GPU), solo il normale processore. Quindi:
- Le immagini sono state rimpicciolite a 128x128 pixel.
- Sono state usate solo alcune migliaia di immagini, non tutte le oltre 40.000 disponibili.

**Perché:** usare tutte le immagini a piena grandezza avrebbe fatto bloccare il computer o richiesto giorni interi di calcolo. Riducendo tutto, il sistema impara comunque bene, ma in pochi minuti.

## 3. Perché fermare l'addestramento in automatico?

È stata impostata una regola che ferma l'addestramento del modello non appena smette di migliorare, e tiene in memoria la versione migliore ottenuta fino a quel momento.

**Perché:** continuare ad allenare il modello oltre il punto giusto è tempo sprecato e rischia di fargli "imparare a memoria" invece che capire davvero (fenomeno chiamato overfitting).

## 4. Perché trasformare le etichette in "normale" o "anomalia"?

Le foto originali avevano tante etichette diverse (nuvole, foschia, strade, agricoltura, miniere...). Sono state raggruppate in sole due categorie: **Normale** e **Anomalia** (cioè: presenza di attività umana).

**Perché:** per riconoscere le anomalie serve un confine netto: o la zona è foresta intatta, o mostra segni di intervento umano. Le nuvole e la foschia non contano come anomalia, perché sono solo condizioni atmosferiche, non attività umana.

## 5. Perché un tipo particolare di rete neurale (Autoencoder convoluzionale)?

Il modello che "impara" a riconoscere la foresta normale usa un tipo di rete neurale pensata apposta per le immagini (chiamata convoluzionale), non un tipo generico.

**Perché:** questo tipo di rete capisce le forme e le texture di un'immagine (bordi, colori, pattern) molto meglio di un modello generico, ed è anche più leggero da calcolare.

## 6. Come fa il sistema a capire cos'è "anomalo"?

Il modello viene allenato guardando **solo** foto di foresta intatta, imparando a "ricostruirle" nel modo più fedele possibile. Quando poi gli viene mostrata una foto con una strada o un campo, fa più fatica a ricostruirla bene — l'errore di ricostruzione (chiamato MSE) sale.

**Perché:** un errore alto è come un campanello d'allarme: significa "questa immagine non assomiglia a quello che ho imparato essere normale", quindi probabilmente contiene un'anomalia. Il bello è che il sistema impara questo senza che nessuno gli dica esplicitamente dove sono le anomalie.

## 7. Come si misura se il sistema funziona bene?

Per confrontare i vari modelli si è usata una misura chiamata **AUROC**, che dà un punteggio tra 0 e 1 su quanto bene il modello distingue tra le due categorie.

**Perché:** altre misure più comuni (come l'accuratezza) dipendono da una soglia scelta a caso, che può ingannare. L'AUROC valuta invece la capacità del modello di separare le due classi in modo più oggettivo e completo.

## 8. Prima fase: "congelare" ciò che il modello ha già imparato

In un primo esperimento, la parte del modello che aveva imparato a riconoscere la foresta normale è stata "bloccata" (non le è stato permesso di cambiare), e sopra di essa è stato aggiunto solo un piccolo classificatore nuovo.

**Perché:** per verificare, in modo pulito, se ciò che il modello aveva già imparato (senza etichette) fosse già utile di per sé per riconoscere le anomalie, senza modificarlo ulteriormente.

## 9. Seconda fase: lasciare che il modello si "specializzi"

In un secondo esperimento, invece, è stato permesso al modello di correggere leggermente ciò che aveva già imparato, con un ritmo di apprendimento molto controllato.

**Perché:** questo permette al modello di adattarsi meglio al compito specifico ("trova la deforestazione") invece di limitarsi al compito generico ("ricostruisci l'immagine"). Infatti, il punteggio è migliorato (da 0.78 a 0.82).

## 10. Un modello di confronto costruito da zero

È stato creato anche un modello separato, allenato da zero usando fin dall'inizio le etichette normale/anomalia (senza passare prima per la fase non supervisionata).

**Perché:** serve come "termine di paragone": mostra quanto si potrebbe ottenere di meglio (0.86) se si avessero sempre a disposizione le etichette corrette, e permette di capire quanto "costa" in termini di prestazioni non averle usate fin da subito.

## 11. Download dei dati in modo sicuro e automatico

I dati sono stati scaricati usando uno strumento (`kagglehub`) che gestisce da solo l'accesso, invece di scrivere nel codice password o chiavi personali.

**Perché:** scrivere le proprie credenziali direttamente nel codice è pericoloso (chiunque veda il codice potrebbe usarle) e rende il progetto difficile da far girare su altri computer. Con questo strumento, chiunque può scaricare i dati ed eseguire il progetto senza configurazioni manuali.

## 12. Risultati sempre uguali ad ogni esecuzione

È stato fissato un numero di partenza fisso (chiamato "seed", impostato a 42) per tutte le componenti casuali del sistema.

**Perché:** questi modelli hanno diverse componenti che normalmente sono casuali (come mescolare i dati o inizializzare i pesi). Fissando questo numero, ogni volta che si rilancia il progetto si ottengono esattamente gli stessi risultati — fondamentale per poter confrontare i modelli in modo corretto durante la presentazione.

## 13. Visualizzare cosa "vede" il modello

Per mostrare graficamente come il modello organizza le immagini nella sua "mente", è stata usata una tecnica chiamata **UMAP**, invece di altre più tradizionali (PCA, t-SNE).

**Perché:** UMAP riesce a mostrare meglio sia i piccoli dettagli (immagini simili vicine tra loro) sia il quadro generale, ed è più veloce da calcolare rispetto alle alternative, producendo grafici interattivi chiari.

## 14. Cosa NON è stato fatto (e perché va bene così)

Alcune cose tipiche di un progetto "professionale" non sono state incluse: test automatici avanzati, sistemi di controllo continuo in produzione, e l'uso di alcuni dati satellitari extra (banda infrarossa, formato TIF).

**Perché:** questo è un progetto dimostrativo (proof of concept) per uno scopo accademico/didattico, con tempo limitato. Si è scelto di concentrare gli sforzi sulla parte più importante — far funzionare bene i modelli — dichiarando onestamente quali parti sono state lasciate fuori, invece di nasconderle.
