# ADR 0003 — Scelta sull'uso delle foglie di `Tomato`

**Ambito:** Preprocessing dataset

## Contesto

Il dataset PlantVillage fornisce un record totale di immagini di 54306 foglie di piante suddivise in 14 specie e 21 classi tra malattie e `healty` (le specie non presentano le stesse classi). Tramite un'iniziale analisi esplorativa fatta sul dataset la pianta `Tomato` con ~17500 immagini è risultata la più completa con 10 classi → 9 malattie (`Tomato_mosaic_virus`, `Leaf_Mold`, `Early_blight`, `Target_Spot`, `Spider_mites`, `Septoria_leaf_spot`, `Late_Blight`, `Bacterial_spot`, `Tomato_Yellow_Leaf_Curl_Virus`) + `healty`.

## Decisione

Usare solo la pianta **`Tomato`** come **`TARGET_PLANT`** sia per l'autoencoder sia per
l'estrazione di feature escludendo le altre.

## Conseguenze

- **Positive:** Eliminare le altre piante permette all'autoencoder di funzionare in maniera più efficiente, concentrandosi su una sola.
- **Negative:** Il modello finale di classificazione non sarà in grado di classificare la condizione di piante diverse.