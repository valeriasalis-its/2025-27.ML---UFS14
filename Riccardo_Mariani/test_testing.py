def somma(a,b):
    return a+b

def test_somma_positivi():
    assert somma(2,3)==5
def test_somma_negativi():
    assert somma(-1,-3)==-4