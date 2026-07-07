import sys

def chatbot():
    print("Chatbot: Ciao! Sono un piccolo chatbot. Scrivi qualcosa per iniziare (o 'esci' per chiudere).")
    
    # Dizionario delle risposte (Parola chiave: Risposta del bot)
    risposte = {
        "ciao": "Ciao! Come va?",
        "come stai": "Io sono un codice, quindi non ho sentimenti, ma funziono alla grande! Tu?",
        "bene": "Mi fa piacere! Di cosa vorresti parlare?",
        "qual è il tuo nome": "Sono un mini chatbot in Python.",
        "grazie": "Prego! Altro che posso fare per te?",
    }

    while True:
        # Prende l'input dell'utente, lo trasforma in minuscolo e toglie gli spazi extra
        utente = input("Tu: ").lower().strip()
        
        # Condizione di uscita
        if utente == "esci":
            print("Chatbot: Arrivederci! Alla prossima.")
            break
        
        # Cerca la risposta nel dizionario
        # Se la parola non esiste, restituisce la frase di default
        risposta_bot = risposte.get(utente, "Non sono sicuro di aver capito. Prova a dire 'ciao' o 'come stai'.")
        
        print(f"Chatbot: {risposta_bot}")

# Avvia il chatbot
if __name__ == "__main__":
    chatbot()