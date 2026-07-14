import pytest

def is_even(n):
    if not isinstance(n, int):
        raise TypeError("L'input deve essere un numero intero")
    return n % 2 == 0

def test_is_even_true():
    assert is_even(4) is True

def test_is_even_false():
    assert is_even(7) is False

def test_is_even_type_error():
    with pytest.raises(TypeError):
        is_even("quattro")

def test_is_even_zero():
    assert is_even(0) is True