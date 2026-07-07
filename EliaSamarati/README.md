# BioAge — dall'età cronologica all'età biologica

## Introduzione al progetto
Il progetto stima l'età biologica dei pazienti a partire dai normali esami del sangue e dai relativi biomarcatori. L'idea consiste in un modello che ha imparato a stimare l'età solo di pazienti "sani" dove l'ètà anagrafica dovrebbe corrispondere a quella biologica. Il modello predice in modo abbastanza veritiero l'età di chi è sano, ma sbaglia in eccesso su chi ha valori alterati — e proprio quell'errore in eccesso è l'età biologica, cioè quanto l'organismo è "più vecchio" del dovuto.

Il lavoro parte da una coorte clinica reale di uno studio medico fornitoci a livello locale e viene validato su NHANES, il grande dataset pubblico americano.

## Setup/How to run this project

Il progetto è nel notebook `BioAge_Resoconto.ipynb`.

Per eseguirlo in locale serve:

- Python 3.10 o superiore
- le librerie: numpy, pandas, matplotlib, seaborn, scikit-learn, xgboost
- il file `df_clean_con_indici.csv`, che è già nella cartella

Poi si eseguono le celle in ordine dall'alto verso il basso.

**Nota importante:** lo Step 6 e lo Step 7 (validazione e feature selection su NHANES) leggono i file `.xpt` di NHANES da una cartella `nhanes_data/`. Quei file vanno scaricati a parte dal sito NHANES (sono i cicli DEMO, CBC, BIOPRO dal 2007 al 2020, più GHB, HSCRP, HDL, BMX, BPXO per il ciclo 2017-2020).

## Spiegazione del progetto

L'obiettivo è costruire un "orologio biologico" ovvero un modello che, dati gli esami del sangue di una persona, dice quanti anni "dimostra" il suo corpo invece di quanti ne ha davvero.

Il problema che affronta è che l'età anagrafica da sola non dice come sta una persona: due persone di 50 anni possono avere un organismo in stati molto diversi. Avere un numero — l'età biologica — che riassume lo stato di salute a partire da esami che già si fanno di routine permetterebbe allo studio medico di individuare i pazienti che stanno invecchiando più in fretta e intervenire prima.

Come funziona: invece di addestrare il modello su tutti i pazienti, lo addestro solo sui pazienti "sani" a prevedere la loro età anagrafica. Così il modello impara la traiettoria dell'invecchiamento ideale. Quando poi lo applico a un paziente con valori alterati, il modello gli assegna un'età più alta di quella reale: quella è la sua età biologica, e la differenza (Età biologica − Età anagrafica) misura l'invecchiamento accelerato.

Il notebook segue 7 step:
- caricamento dati
- pulizia con criterio biologico 
- scelta del modello 
- il "paradosso" del MAE 
- validazione esterna su NHANES 
- feature selection 
- lettera finale allo studio medico.

## Dati

**Dataset principale:** `df_clean_con_indici.csv`, la popolazione reale dello studio medico. Contiene 15.718 record su 12.050 pazienti, con età da 18 a 103 anni. Per ogni paziente ci sono 13 esami di routine (glucosio, colesterolo totale/HDL/LDL, trigliceridi, creatinina, urea, ALT, AST, piastrine, RDW, linfociti, neutrofili) più una serie di indici derivati (NLR, PLR, SII, De Ritis, TyG, TG/HDL, urea/creatinina).

**Dataset di validazione (NHANES):** il database pubblico americano. Invece di usare un solo ciclo (~7.500 adulti) ho impilato 6 cicli biennali dal 2007 al 2020 che condividono le stesse variabili, arrivando a **33.611 pazienti**. L'ho usato per capire se il limite del modello fosse la quantità di pazienti o altro.

Perché questi dati: NHANES è lo standard internazionale per questo tipo di validazione (è pubblico, grande e con gli stessi esami più altri aggiuntivi), quindi permette un confronto onesto su dati completamente indipendenti.

Gestione dei dati: la parte più delicata è la pulizia. 
Non ho tolto i valori anomali con criteri statistici (IQR, z-score) ma con un criterio clinico: un paziente entra nella coorte "sana" solo se tutti i suoi marcatori sono dentro i range di normalità di riferimento, e questi range sono stratificati per fascia d'età.
Applicando questo filtro, i pazienti sani risultano 3.495, cioè il 22,2% del totale. Su NHANES si tengono solo i pazienti tra 18 e 79 anni e i record completi.

## Ciclo di vita ML

> Warning: i dati riportati sono relativi al modello sviluppato in data 07/07/2026 ed ai dataset aggiornati alla data 07/07/2026 di conseguenza modificare codice o dataset potrebbe far variare gli indicatori ed i valori trovati. 

1. **Raccolta dati**: coorte fornita dallo studio medico, più i cicli NHANES scaricati dal sito pubblico.
2. **Training**: tre famiglie di modelli (Ridge, Random Forest, XGBoost) addestrate sui soli pazienti sani per imparare l'invecchiamento ideale. XGBoost è risultato il migliore (MAE 11,17 anni in cross-validation sui sani, contro 11,30 di Random Forest e 11,78 di Ridge).
3. **Validazione**: uso GroupKFold sull'id del paziente, così lo stesso paziente non finisce mai sia in training che in test (il dataset è longitudinale, ci sono più record per paziente). Sul completo il modello arriva a MAE 9,78. La validazione esterna su NHANES dà MAE 10,50 contro 9,85 dello studio locale sugli stessi marcatori: performance quasi identiche, il metodo regge su dati indipendenti.
4. **Deploy**: non realizzato, ma il progetto si chiude con una proposta concreta allo studio medico (la lettera finale) su quali nuovi esami raccogliere per migliorare il modello.
5. **Monitoring**: descritto nella sezione sottostante "MLOps".

## 📊 Risultati e Confronto Modelli

I modelli sono stati addestrati esclusivamente sulla sottopopolazione "sana". Di seguito il confronto del MAE (Mean Absolute Error) espresso in anni in Cross-Validation (GroupKFold):

| Modello | MAE (Sani - CV) | Note |
| :------ | :-------------- | :--- |
| **Ridge Regression** | 11.78 | Baseline lineare |
| **Random Forest** | 11.30 | - |
| **XGBoost** | **11.17** | **Miglior modello selezionato** |

### Validazione Esterna (XGBoost)
* **MAE su Dataset Iniziale (Completo):** 9.78 anni
* **MAE su Dataset NHANES (6 cicli):** 10.50 anni

## MLOps

Cosa monitorerei:

- il MAE su nuovi pazienti nel tempo: se peggiora, qualcosa è cambiato nella popolazione (questi fattori possono alterarsi ad esempio tramite l'immigrazione o il cambiamento dello stile di vita) o nel modo di misurare gli esami.
- la distribuzione dei valori in ingresso: se i laboratori cambiano strumenti o unità di misura, i valori si spostano e il modello sbaglia.

Quando rifarei il training:

- quando lo studio medico inizia a raccogliere i nuovi esami proposti nella lettera (pressione, HbA1c, circonferenza vita, BMI): con quelle variabili il modello va riaddestrato perché diventa molto più accurato.
- se cambia la popolazione di pazienti o le linee guida sui range di normalità.
- periodicamente, man mano che arrivano nuovi dati dai pazienti.

## Rischi, assunzioni e limiti

Assunzioni fatte:

- che i range clinici di normalità usati per definire "sano" siano corretti e che permettano di individuare il maggior numero di persone "non sane" possibili tramite le feature che ci sono state fornite in modo da poterli escludere dall'analisi.
- che i marcatori in comune tra il laboratorio che ci ha fornito i dati e NHANES siano confrontabili nonostante laboratori e paesi diversi che potrebbero avere strumenti di misurazione differenti più o meno precisi.

Limiti e rischi:

- Interpretazione del MAE e potere predittivo: Un MAE di circa 9-10 anni non indica un malfunzionamento, ma rappresenta il limite biologico intrinseco dei soli esami del sangue di routine (la letteratura scientifica su questi specifici biomarcatori mostra plateau simili). Il modello non deve "indovinare" l'età anagrafica, ma tracciare un trend.
- il dataset locale perde molti pazienti col filtro clinico (restano solo il 22% "sani"), quindi il modello impara su una fetta ridotta, ma aumentare il numero di pazienti non migliora il modello: la learning curve su NHANES va in plateau.
Il limite è l'informazione contenuta negli esami, non la quantità di dati.
- il modello vede solo esami del sangue di base: mancano parametri importanti (pressione, HbA1c, misure antropometriche) che infatti si sono rivelati decisivi nella feature selection.

Come lo amplierei:

- integrare i 5 nuovi esami individuati e riaddestrare (il guadagno stimato è di oltre 2 anni di MAE).
- provare a costruire un'età biologica specifica per organo (renale, epatica, metabolica) invece di una sola età complessiva.
- Un'evoluzione ideale del modello prevederebbe l'identificazione delle specifiche patologie correlate al gap d'età. Questo richiederebbe tuttavia dataset più estesi e ricchi di dati clinici sensibili, introducendo complessità normative e di privacy.

## Ulteriori informazioni

Il cuore metodologico del progetto sta in due punti "controintuitivi":

- **Il paradosso del MAE**: il modello addestrato sui sani ha un errore *più alto* (10,74 contro 9,78) e questo è voluto, non è un difetto. Un modello che indovina bene l'età anagrafica di tutti starebbe sfruttando la malattia per indovinare; a noi serve invece un modello che "non si accorge" della malattia sbagliando in eccesso, perché quell'errore è l'età biologica.
- **La feature selection**: le nuove variabili non sono state scelte a mano ma con una procedura forward selection + test di stabilità su bootstrap, tutto su dati separati dal test finale, così ogni scelta è difendibile. Le 5 variabili risultate stabili (pressione sistolica, HbA1c, pressione diastolica, circonferenza vita, BMI) abbassano il MAE sul test mai visto da 10,52 a 8,19 anni.

Le scelte progettuali principali sono spiegate nel `decision-log.md`.
