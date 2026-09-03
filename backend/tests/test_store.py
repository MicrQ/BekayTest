from app.schemas import Product, User
from app.store import products, reset_store, users


def test_seed_users():
    reset_store()
    assert len(users) == 3
    assert users["u1"]["role"] == "sales"
    assert users["u2"]["role"] == "sales"
    assert users["u3"]["role"] == "manager"

    # Verify Pydantic schema validation
    u1 = User(**users["u1"])
    assert u1.id == "u1"
    assert u1.role == "sales"


def test_seed_products():
    reset_store()
    assert len(products) == 4
    assert products["p1"]["name"] == "Roll of Fabric"

    # Check that low stock product exists (stock <= min_stock_level)
    low_stock = [
        p for p in products.values() if p["stock_quantity"] <= p["min_stock_level"]
    ]
    assert len(low_stock) >= 1

    # Verify Pydantic validation
    p1 = Product(**products["p1"])
    assert p1.stock_quantity == 50
