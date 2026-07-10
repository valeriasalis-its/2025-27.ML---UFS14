"""
Addestramento modello di rilevamento SMS spam.

Pipeline:
1. Caricamento e pulizia dataset
2. Preprocessing testo con spaCy (lemmatizzazione)
3. Vettorizzazione TF-IDF
4. Confronto tra piu' modelli di classificazione
5. Selezione del modello migliore in base alla precision
   (scelta motivata dal forte sbilanciamento delle classi:
   vogliamo minimizzare i falsi positivi, cioe' SMS legittimi
   classificati come spam)
6. Serializzazione di vectorizer e modello finale
"""

import pickle

import pandas as pd
import spacy
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import SVC

RANDOM_STATE = 42

# ---------------------------------------------------------------------------
# 1. Caricamento e pulizia dataset
# ---------------------------------------------------------------------------

df = pd.read_csv("sms-spam.csv", encoding="latin-1")

# Il CSV originale porta con se' 3 colonne extra quasi completamente vuote
# (retaggio di un export da Excel) e nomi di colonna poco chiari.
df = df.iloc[:, :2]
df.columns = ["etichetta", "testo"]

# "ham"/"spam" -> 0/1
df["etichetta"] = df["etichetta"].map({"ham": 0, "spam": 1})

# Rimozione duplicati esatti
righe_prima = len(df)
df = df.drop_duplicates(keep="first").reset_index(drop=True)
print(f"Righe totali: {righe_prima} -> dopo rimozione duplicati: {len(df)}")

print(df["etichetta"].value_counts(normalize=True).rename("proporzione"))

# ---------------------------------------------------------------------------
# 2. Preprocessing del testo con spaCy
# ---------------------------------------------------------------------------
# Al posto di nltk (tokenizzazione + stopword removal + Porter stemming)
# usiamo spaCy: tokenizzazione, rimozione stopword/punteggiatura e
# lemmatizzazione. La lemmatizzazione riporta ogni parola alla sua forma
# base dizionario (es. "winning" -> "win"), mentre lo stemming taglia
# suffissi in modo euristico (es. "winning" -> "winn"): il lemma e'
# linguisticamente piu' corretto.
#
# disabilitiamo i componenti della pipeline che non servono (parser,
# named entity recognition) per velocizzare l'elaborazione su migliaia
# di messaggi brevi.
nlp = spacy.load("en_core_web_sm", disable=["parser", "ner"])


def preprocessa_testo(testo: str) -> str:
    """Pulisce e lemmatizza un SMS: minuscolo, rimozione punteggiatura/
    stopword, lemmatizzazione. Ritorna una stringa di token separati da
    spazio, pronta per il vectorizer."""
    doc = nlp(testo.lower())
    lemmi = [
        token.lemma_
        for token in doc
        if token.is_alpha and not token.is_stop
    ]
    return " ".join(lemmi)


print("Preprocessing in corso (puo' richiedere qualche minuto)...")
df["testo_processato"] = df["testo"].apply(preprocessa_testo)
print("Preprocessing completato.")

# ---------------------------------------------------------------------------
# 3. Vettorizzazione TF-IDF
# ---------------------------------------------------------------------------
# TF-IDF pesa i termini in base alla frequenza nel documento e alla
# rarita' nel corpus, dando piu' peso a parole distintive (es. "vinci",
# "premio") rispetto a termini generici molto comuni.
vectorizer = TfidfVectorizer(max_features=3000)

X = vectorizer.fit_transform(df["testo_processato"]).toarray()
y = df["etichetta"].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
)

# ---------------------------------------------------------------------------
# 4. Confronto tra modelli
# ---------------------------------------------------------------------------
modelli = {
    "Naive Bayes": MultinomialNB(),
    "Regressione Logistica": LogisticRegression(solver="liblinear"),
    "SVM": SVC(kernel="sigmoid", gamma=1.0),
    "Random Forest": RandomForestClassifier(n_estimators=100, random_state=RANDOM_STATE),
    "HistGradientBoosting": HistGradientBoostingClassifier(random_state=RANDOM_STATE),
}

risultati = []
for nome, modello in modelli.items():
    modello.fit(X_train, y_train)
    y_pred = modello.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    risultati.append(
        {"Modello": nome, "Accuracy": acc, "Precision": prec, "Recall": rec, "F1": f1}
    )
    print(
        f"{nome:25s}  accuracy={acc:.4f}  precision={prec:.4f}  "
        f"recall={rec:.4f}  f1={f1:.4f}"
    )

tabella_risultati = pd.DataFrame(risultati).sort_values("F1", ascending=False)
print("\nClassifica per F1-score (classe spam):")
print(tabella_risultati.to_string(index=False))

# ---------------------------------------------------------------------------
# 5. Selezione del modello finale
# ---------------------------------------------------------------------------
# Il dataset e' sbilanciato (~87% ham / ~13% spam), quindi guardare solo
# l'accuracy sarebbe fuorviante: un modello che dicesse sempre "ham"
# otterrebbe gia' l'87% di accuracy senza aver imparato nulla.
#
# Anche guardare la sola precision e' incompleto: nei test la
# Regressione Logistica raggiunge precision=1.0 ma recall=0.66, cioe'
# non sbaglia mai su un SMS legittimo ma lascia passare 1 spam su 3.
# Usiamo quindi l'F1-score sulla classe spam (media armonica di
# precision e recall) come criterio di selezione, perche' rappresenta
# meglio un compromesso ragionevole tra i due tipi di errore.
migliore_nome = tabella_risultati.iloc[0]["Modello"]
modello_finale = modelli[migliore_nome]
print(f"\nModello selezionato: {migliore_nome}")

# ---------------------------------------------------------------------------
# 6. Serializzazione
# ---------------------------------------------------------------------------
with open("vectorizer.pkl", "wb") as f:
    pickle.dump(vectorizer, f)

with open("model.pkl", "wb") as f:
    pickle.dump(modello_finale, f)

print("\nFile salvati: vectorizer.pkl, model.pkl")
