import pickle

import spacy
import streamlit as st

# Il modello linguistico va scaricato una tantum con:
#   python -m spacy download en_core_web_sm
# (il dataset di addestramento e' in inglese, quindi il modello di
# preprocessing resta in inglese anche se l'interfaccia e' in italiano)
nlp = spacy.load("en_core_web_sm", disable=["parser", "ner"])


def preprocessa_testo(testo: str) -> str:
    """Stessa funzione usata in fase di addestramento: minuscolo,
    rimozione stopword/punteggiatura, lemmatizzazione. Deve restare
    identica a quella di addestramento.py, altrimenti il vectorizer
    riceverebbe token diversi da quelli su cui e' stato allenato."""
    doc = nlp(testo.lower())
    lemmi = [token.lemma_ for token in doc if token.is_alpha and not token.is_stop]
    return " ".join(lemmi)


@st.cache_resource
def carica_modello():
    with open("vectorizer.pkl", "rb") as f:
        vectorizer = pickle.load(f)
    with open("model.pkl", "rb") as f:
        modello = pickle.load(f)
    return vectorizer, modello


vectorizer, modello = carica_modello()

st.title("Rilevamento SMS Spam")
st.write(
    "Inserisci il testo di un SMS (in inglese) per verificare se il modello "
    "lo classifica come spam o come messaggio legittimo."
)

testo_inserito = st.text_area("Testo dell'SMS", height=100)

if st.button("Analizza"):
    if not testo_inserito.strip():
        st.warning("Inserisci un testo prima di procedere.")
    else:
        testo_pulito = preprocessa_testo(testo_inserito)
        # .toarray(): il modello e' stato allenato su dati densi (vedi
        # addestramento.py), quindi anche in inferenza va passato un
        # array denso e non una matrice sparsa.
        vettore = vectorizer.transform([testo_pulito]).toarray()
        predizione = modello.predict(vettore)[0]

        if predizione == 1:
            st.error("🚫 Spam")
        else:
            st.success("✅ Non spam")

        with st.expander("Dettagli tecnici"):
            st.write("Testo dopo preprocessing:", testo_pulito or "*(nessun token rilevante)*")
