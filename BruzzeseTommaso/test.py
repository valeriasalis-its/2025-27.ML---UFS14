import pytest

def somma(a, b):
    return a + b

def dividi(a, b):
    if b == 0:
        raise ValueError("Impossibile dividere per zero")
    return a / b

def test_somma():
    assert somma(2, 3) == 5
    assert somma(-1, 1) == 0
    assert somma(0, 0) == 0

def test_dividi():
    assert dividi(10, 2) == 5.0
    assert dividi(9, 3) == 3.0

def test_dividi_per_zero():
    with pytest.raises(ValueError, match="Impossibile dividere per zero"):
        dividi(10, 0)

# pytest -v test.py

'''
test.py::test_somma PASSED                                                                                                       [ 33%]
test.py::test_dividi PASSED                                                                                                      [ 66%]
test.py::test_dividi_per_zero PASSED                                                                                             [100%]

========================================================== 3 passed in 0.02s ==========================================================
'''