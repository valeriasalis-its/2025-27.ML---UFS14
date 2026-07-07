# Decision log — BioAge

Qui ripercorro le decisioni prese durante il progetto, più o meno in ordine cronologico. Per ognuna scrivo cosa ho scelto, cosa avevo considerato in alternativa e motivo le mie scelte.

## 1. Definire l'età biologica come scarto di un modello addestrato sui sani

L'idea centrale del progetto. Invece di cercare una formula per l'età biologica, la faccio "emergere" da un modello: alleno il modello a prevedere l'età anagrafica usando solo pazienti sani, così impara com'è l'invecchiamento ideale. Applicato a un paziente malato, il modello gli dà un'età più alta di quella vera, e quella diventa la sua età biologica.

L'alternativa era addestrare su tutti i pazienti per prevedere l'età nel modo più preciso possibile, ma quel modello imparerebbe a sfruttare la malattia per indovinare l'età, e non distinguerebbe più chi invecchia in fretta. Ho preferito un modello che "sbaglia apposta" sui malati, perché è proprio quell'errore l'informazione che cerco.

## 2. Pulire i dati con criterio clinico, non statistico

È la decisione metodologica più importante. Per costruire la coorte "sana" ho tenuto solo i pazienti con tutti i marcatori dentro i range clinici di normalità, stratificati per fascia d'età, invece di rimuovere gli outlier con metodi statistici come IQR o z-score.

Il motivo: un outlier statistico non è un paziente malato, e viceversa. Una glicemia di 124 mg/dL è dentro la distribuzione (statisticamente normale) ma è già pre-diabete (clinicamente alterata). Pulire con l'IQR terrebbe dentro pazienti malati e butterebbe via informazione clinica vera. Il filtro medico dentro/fuori dai range di riferimento è l'unico che seleziona davvero l'invecchiamento sano. Il prezzo è che restano solo il 22,2% dei pazienti, ma è un prezzo che vale la pena pagare per avere una coorte pulita.

## 3. Stratificare i range di normalità per fascia d'età

Non ho usato un unico range per tutte le età, ma quattro fasce (18-39, 40-54, 55-69, 70+) con piccoli aggiustamenti fisiologici per gli anziani su glicemia, creatinina, urea e RDW.

Il motivo è che alcuni valori cambiano fisiologicamente con l'età: pretendere che un 80enne abbia gli stessi identici range di un 30enne escluderebbe come "malati" anche anziani sostanzialmente sani. Gli aggiustamenti servono a non svuotare le fasce anziane della coorte.

## 4. Escludere FIB-4 dalle feature (anti-leakage)

Ho tolto l'indice FIB-4 dalle variabili in ingresso, anche se è un indice clinico utile.

Il motivo è che FIB-4 si calcola con una formula che contiene l'età dentro (Età·AST diviso Piastrine·√ALT). Se lo lasciassi tra le feature, il modello leggerebbe l'età "di nascosto" dentro quella variabile e la userebbe per barare, falsando completamente il risultato. Questo è un caso classico di data leakage e andava eliminato.

## 5. Validare con GroupKFold sull'id paziente

Per la cross-validation ho usato GroupKFold raggruppando per id del paziente, non un KFold normale.

Il motivo è che il dataset è longitudinale: dello stesso paziente ci sono più record nel tempo. Con un KFold normale lo stesso paziente potrebbe finire sia in training che in test, e il modello lo "riconoscerebbe", gonfiando le performance in modo disonesto. GroupKFold garantisce che tutti i record di un paziente stiano nello stesso fold.

## 6. Confrontare tre modelli e scegliere XGBoost

Ho provato Ridge (lineare regolarizzato), Random Forest (non lineare) e XGBoost (boosting), invece di partire subito con un modello solo.

XGBoost ha dato il MAE più basso in cross-validation (11,17 anni contro 11,30 di Random Forest e 11,78 di Ridge) e cattura le non-linearità che un modello lineare come Ridge si perde. Provare tre famiglie diverse mi permette di giustificare la scelta invece di darla per scontata. Ho anche controllato che nessuna singola feature dominasse il modello (feature importance bilanciata), perché volevo un orologio basato su tanti marcatori, non su uno solo.

## 7. Accettare (anzi cercare) un MAE più alto per il modello sano

Quando ho confrontato il modello sui sani con quello su tutti i pazienti, il modello sui sani aveva un MAE più alto (10,74 contro 9,78). Ho tenuto quello sui sani lo stesso.

Il motivo è che un MAE più basso qui sarebbe un segnale negativo: vorrebbe dire che il modello sta usando la malattia per indovinare l'età. Ho verificato che il modello sui sani fa quello che deve: lo scarto Età biologica − anagrafica è ~0 sui sani (−0,01 anni, l'orologio è calibrato) e nettamente positivo sui non-sani (+6,57 anni, invecchiamento accelerato). È la prova che il metodo funziona.

## 8. Validare su NHANES impilando 6 cicli invece di uno solo

Per la validazione esterna ho unito 6 cicli NHANES dal 2007 al 2020 (33.611 pazienti) invece di usare solo il ciclo più recente (~7.500).

Il motivo era rispondere a una domanda precisa: le performance limitate dipendono dalla poca quantità di pazienti? Per rispondere mi serviva un dataset molto più grande. Impilando i cicli che condividono le stesse variabili arrivo a più del doppio dei pazienti. Il risultato: il MAE su NHANES (10,50) è quasi identico al nostro dataset (9,85), quindi il metodo regge su dati indipendenti.

## 9. Usare la learning curve per dimostrare il plateau

Per isolare l'impatto reale della dimensione del campione sull'errore del modello (MAE), si è evitato l'uso di una classica learning curve a scaglioni, preferendo un confronto diretto tra la clinica e i rispettivi dataset completi non filtrati. Poiché i criteri di inclusione stringenti avevano reso la numerosità dei dati puliti troppo simile tra i due centri, l'estensione ai dati grezzi ha permesso di sfruttare l'alto volume di campioni della popolazione generale. Il fatto che il MAE sia rimasto quasi invariato anche di fronte a questo massiccio incremento di dati ha dimostrato empiricamente che il limite dell'accuratezza non risiede nella quantità dei pazienti, ma nel potere informativo intrinseco degli esami standard. Questo risultato ha confermato la necessità metodologica di espandere il set di feature cliniche anziché raccogliere ulteriori anagrafiche.

## 10. Scegliere le nuove feature con forward selection e test di stabilità

Per decidere quali nuovi esami aggiungere non ho provato quattro variabili a mano, ma ho usato una procedura sistematica: forward selection (a ogni passo aggiungo la variabile che abbassa di più il MAE in cross-validation, mi fermo quando il guadagno scende sotto 0,05 anni), ripetuta su più bootstrap per tenere solo le variabili scelte in modo ricorrente.

Con questa procedura ogni variabile inclusa è giustificata dal fatto che abbassa l'errore fuori campione in modo stabile. La forward selection aveva proposto 7 variabili, ma il test di stabilità ne ha bocciate 2 (Albumina scelta solo 1 volta su 4, Bilirubina 0 su 4): le ho scartate proprio perché instabili, tenendo solo le 5 feature più robuste.

## 11. Separare il test set prima di tutta la selezione

Tutta la feature selection avviene su un train separato (75%), mentre il test set (25%) resta intatto fino alla validazione finale.

Il motivo è evitare il bias di selezione: se scegliessi le feature guardando anche il test, l'errore finale sarebbe ottimistico e falso. Toccando il test solo alla fine, il guadagno misurato (MAE da 10,52 a 8,19 sul test mai visto, cioè oltre 2 anni) è un numero onesto.

## 12. Validare la scelta anche clinicamente, non solo statisticamente

Le 5 variabili scelte dalla procedura (pressione sistolica, HbA1c, pressione diastolica, circonferenza vita, BMI) le ho poi giustificate una per una anche dal punto di vista medico: rigidità arteriosa, glicazione cumulativa, adiposità viscerale.

Il motivo è che una feature statisticamente utile, ma senza senso clinico sarebbe sospetta (potrebbe essere una correlazione spuria). Il fatto che le variabili scelte siano tutte legate all'invecchiamento cardiometabolico conferma che il modello ha trovato segnale vero. In più sono tutti esami economici e di routine, quindi la proposta allo studio medico è realizzabile davvero.

## 13. Chiudere con una lettera formale allo studio medico

Invece di fermarmi ai numeri, ho chiuso il progetto con una lettera che propone allo studio medico di aggiungere quei 5 esami alle future raccolte dati.

Il motivo è che il progetto nasce da un committente reale e deve portare a qualcosa di concreto: la conclusione utile non è "il MAE è X" ma "raccogliete anche questi esami e il modello migliorerà di oltre 2 anni". La lettera traduce il risultato tecnico in un'azione pratica per chi userà il modello.
