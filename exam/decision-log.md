# Decision log — Smart Recycling Bin

Qui provo a tornare indietro alle decisioni prese durante il progetto, più o meno in ordine cronologico. Per ognuna scrivo cosa ho scelto, cosa avevo considerato in alternativa e perché alla fine ho scelto così.

## 1. Il problema: classificare i rifiuti

Volevo un problema con un'utilità concreta, spiegabile in una frase ("ti dice in che bidone va il rifiuto"), e non il solito esercizio tipo cani/gatti o cifre scritte a mano. La raccolta differenziata mi sembrava un caso reale, con dati pubblici disponibili, e si presta bene anche a ragionare su deploy e monitoring (le sezioni MLOps della traccia).

## 2. Dataset: TrashNet da Kaggle

Alternative: costruirmi un dataset fotografando rifiuti a mano, oppure usare immagini sintetiche.

Ho scelto TrashNet perché è il dataset di riferimento per questo problema: foto vere, già etichettate, già organizzate una cartella per classe (il formato di `ImageFolder` di PyTorch, quindi zero lavoro di preparazione). Farmi il dataset da solo avrebbe richiesto settimane per avere molte meno immagini e di qualità peggiore. In più, scaricarlo dentro al notebook con `kagglehub` rende il progetto riproducibile senza passaggi manuali.

## 3. Transfer learning invece di una rete da zero

Alternativa: progettare e addestrare una CNN da zero.

Con solo ~1.800 immagini di training una rete da zero non ha abbastanza esempi per imparare feature visive decenti e va in overfitting. Un modello pre-addestrato su ImageNet quelle feature (bordi, texture, forme) le ha già imparate da milioni di immagini: io riuso i layer convoluzionali e insegno solo all'ultimo strato a distinguere i 6 materiali. Il training passa da ore a minuti e l'accuracy è migliore.

## 4. Architettura: MobileNetV2

Alternative: ResNet50, EfficientNet, VGG16, tutte più grandi e probabilmente un po' più accurate.

Ho scelto MobileNetV2 perché il caso d'uso finale è un bidone intelligente, quindi un dispositivo embedded tipo Raspberry Pi, non un server con GPU. MobileNetV2 nasce per il mobile: pochi parametri e inferenza veloce su CPU. Ho preferito essere coerente con il deploy immaginato piuttosto che guadagnare qualche punto di accuracy. È anche più leggera da addestrare sulla GPU gratuita di Colab.

## 5. Data augmentation solo sul training set

Alternativa: nessuna augmentation.

1.768 immagini di training sono poche. Con l'augmentation (flip, rotazioni, variazioni di colore) la rete non vede mai esattamente la stessa immagine due volte e generalizza meglio: un rifiuto resta lo stesso rifiuto da qualsiasi angolazione. Validation e test invece li lascio puliti, perché devono misurare le prestazioni su immagini reali, non modificate.

## 6. Split 70/15/15 con seed fissato

Alternative: split 80/20 senza validation
Mi servivano tre insiemi separati: la validation per controllare l'overfitting a ogni epoca e decidere gli iperparametri (epoche, learning rate), il test per il giudizio finale, che per essere onesto non va mai toccato durante lo sviluppo. Con un semplice 80/20 avrei "bruciato" il test set usandolo per le decisioni. 

## 7. CrossEntropyLoss + scheduler del learning rate

Alternative: learning rate fisso.

La CrossEntropyLoss è la scelta standard per la classificazione multiclasse (contiene già la softmax, per questo l'ultimo layer del modello non ce l'ha). Lo scheduler dimezza il learning rate durante il training (0.001 → 0.0005 → 0.00025): passi grandi all'inizio per imparare in fretta, piccoli alla fine per rifinire senza oscillare. Nelle curve infatti la validation accuracy si stabilizza dopo le riduzioni.

## 8. Dropout al 30%

Alternativa: niente dropout.

Con pochi dati il classificatore rischia di memorizzare il training set. Il dropout spegne a caso il 30% dei neuroni a ogni step, così la rete non può dipendere da singoli neuroni. Nelle learning curves train e validation loss scendono insieme, quindi l'overfitting sembra sotto controllo.

## 9. Tenere le 6 classi di TrashNet

Alternativa: accorpare le classi nei 4 bidoni dell'idea iniziale (es. carta+cartone insieme) già in fase di training.

Ho tenuto le 6 classi originali perché le etichette più fini contengono più informazione: accorparle dopo è banale (basta una mappa classe → bidone), separarle dopo sarebbe impossibile. In più le regole della differenziata cambiano da comune a comune, quindi la mappatura verso i bidoni deve restare configurabile e non finire dentro il modello.

## 10. Fermarsi a 15 epoche

Alternativa: più epoche con early stopping automatico.

Guardando le curve, dopo circa 10 epoche la validation accuracy si ferma intorno all'80%: andare avanti non porta niente e aumenta solo il rischio di overfitting (e il consumo di GPU). L'early stopping automatico sarebbe stato un raffinamento, ma su un training così corto non ne valeva la pena.

## 11. Salvare i pesi con `state_dict` + metadati

Alternativa: salvare l'intero oggetto modello con `torch.save(model)`.

Salvare solo i pesi produce un file più leggero e portabile, che non dipende dalla definizione esatta della classe Python al momento del caricamento. Nel checkpoint ho messo anche le classi, la history del training e la test accuracy, così il file si spiega da solo: chi lo carica sa cosa predice il modello e quanto è affidabile senza rifare il training.

## 12. Google Colab come ambiente

Alternative: training in locale, servizi cloud a pagamento.

Colab dà una GPU gratis che per questo training (backbone congelato, pochi minuti) è più che sufficiente, e non richiede di installare niente sul proprio PC. Il notebook resta comunque eseguibile in locale, i requisiti sono nel README.

## 13. Le parti extra: Grad-CAM, webcam, segmentazione

Alternativa: fermarsi alla valutazione sul test set.

L'accuracy da sola non dice perché il modello decide in un certo modo. Con Grad-CAM vedo quali zone dell'immagine hanno pesato sulla predizione, e posso controllare che la rete guardi l'oggetto e non lo sfondo — se dovessi fidarmi del modello in un deploy vero, questa verifica sarebbe importante. La webcam invece rende il progetto dimostrabile dal vivo con oggetti veri, che è il test più onesto del divario tra le foto del dataset e la realtà. La segmentazione con DeepLabV3 è un esperimento per isolare l'oggetto dallo sfondo, come primo passo verso foto più "sporche".
