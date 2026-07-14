import secrets
import string


def genera_password(lunghezza: int = 12, usa_speciali: bool = True) -> str:
    """Genera una password casuale e sicura dal punto di vista crittografico.

    Garantisce che nella password ci sia ALMENO una lettera minuscola,
    una maiuscola, un numero e (se richiesto) un carattere speciale.
    """
    if lunghezza < 4:
        raise ValueError(
            "La lunghezza minima per una password sicura è di 4 caratteri."
        )

    # Definiamo i set di caratteri utilizzabili
    minuscole = string.ascii_lowercase
    maiuscole = string.ascii_uppercase
    numeri = string.digits
    speciali = string.punctuation if usa_speciali else ""

    # Per evitare che la password fallisca i controlli di sicurezza,
    # inseriamo forzatamente almeno un carattere per tipo richiesto
    pool_iniziale = [
        secrets.choice(minuscole),
        secrets.choice(maiuscole),
        secrets.choice(numeri),
    ]
    if usa_speciali:
        pool_iniziale.append(secrets.choice(speciali))

    # Uniamo tutti i caratteri possibili per il resto della password
    tutti_i_caratteri = minuscole + maiuscole + numeri + speciali

    # Riempiamo la password fino alla lunghezza desiderata
    lunghezza_rimanente = lunghezza - len(pool_iniziale)
    resto_password = [
        secrets.choice(tutti_i_caratteri) for _ in range(lunghezza_rimanente)
    ]

    # Uniamo i due blocchi
    password_completa = pool_iniziale + resto_password

    # Mescoliamo la lista in modo sicuro per non avere i primi caratteri in un ordine prevedibile
    secrets.SystemRandom().shuffle(password_completa)

    return "".join(password_completa)

    # 1. Password standard (12 caratteri, con simboli)
print("Password Standard:", genera_password())
# Output tipo: gF4!p9_mZ@qA

# 2. Password extra-lunga per massima sicurezza
print("Password Lunga:", genera_password(lunghezza=20))
# Output tipo: K#m9v$Lp2_XzAq!w98Rt

# 3. Password senza caratteri speciali (solo lettere e numeri)
print("Password Semplice:", genera_password(lunghezza=10, usa_speciali=False))
# Output tipo: 7bK9mX2wPq