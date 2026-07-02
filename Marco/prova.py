import pytest

def is_pari(n):
    return n % 2 == 0


def test_is_pari():
    assert is_pari(4) == True
    assert is_pari(7) == False
    assert is_pari(0) == True
    assert is_pari(-2) == True
