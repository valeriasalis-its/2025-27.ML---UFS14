def cifrario_cesare(testo, chiave, modalita="cripta"):
    """
    Cripta o decripta un testo spostando le lettere in base alla chiave.
    Mantiene invariati gli spazi, i numeri e la punteggiatura.
    """
    risultato = ""
    
    # Se dobbiamo decriptare, invertiamo il senso dello spostamento
    if modalita == "decripta":
        chiave = -chiave
        
    for carattere in testo:
        # Gestiamo solo le lettere dell'alfabeto
        if carattere.isalpha():
            # Controlla se è maiuscola o minuscola per usare il corretto codice ASCII
            limite = ord('A') if carattere.isupper() else ord('a')
            
            # Calcola la nuova posizione nell'alfabeto (26 lettere)
            nuova_posizione = (ord(carattere) - limite + chiave) % 26
            risultato += chr(limite + nuova_posizione)
        else:
            # Se è uno spazio, un numero o un simbolo, lo lascia così com'è
            risultato += carattere
            
    return risultato

# --- Interfaccia nel terminale ---
if __name__ == "__main__":
    print("🕵️  Cifratore Segreto (Cifrario di Cesare) 🕵️")
    print("-" * 45)
    
    # Chiediamo all'utente cosa vuole fare
    scelta = input("Vuoi [C]riptare o [D]ecriptare un messaggio? ").strip().lower()
    
    if scelta in ['c', 'criptare', 'cripter']:
        modalita = "cripta"
    elif scelta in ['d', 'decriptare', 'decriptor']:
        modalita = "decripta"
    else:
        print("Scelta non valida! Imposto in modalità Criptazione automatica.")
        modalita = "cripta"
        
    messaggio = input("Inserisci il testo: ")
    
    # Chiediamo di quante posizioni spostare le lettere (la chiave)
    try:
        chiave_segreta = int(input("Inserisci la chiave numerica (es. 3): "))
    except ValueError:
        print("Chiave non valida! Uso la chiave predefinita: 3")
        chiave_segreta = 3
        
    # Eseguiamo la funzione
    testo_finale = cifrario_cesare(messaggio, chiave_segreta, modalita)
    
    print("-" * 45)
    print(f"Risultato ({modalita}zione):")
    print(f">>> {testo_finale} <<<")