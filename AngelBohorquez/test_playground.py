def calculate_tip(bill, percentage):
    return bill * (percentage / 100)

def test_standard_tip():
    assert calculate_tip(50, 20) == 10

def test_generous_tip():
    assert calculate_tip(100, 25) == 25