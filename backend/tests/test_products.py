from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.store import products, reset_store, stock_movements

client = TestClient(app)


@pytest.fixture(autouse=True)
def run_before_each_test():
    reset_store()


def test_list_users():
    response = client.get("/users")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    user_roles = {u["id"]: u["role"] for u in data}
    assert user_roles["u1"] == "sales"
    assert user_roles["u3"] == "manager"


def test_list_products_auth_required():
    # Missing header -> 401
    res_no_header = client.get("/products")
    assert res_no_header.status_code == 401

    # Invalid user header -> 401
    res_invalid_user = client.get("/products", headers={"X-User-ID": "u999"})
    assert res_invalid_user.status_code == 401

    # Sales user -> 200
    res_sales = client.get("/products", headers={"X-User-ID": "u1"})
    assert res_sales.status_code == 200
    assert len(res_sales.json()) == 4


def test_list_low_stock_products():
    response = client.get("/products/low-stock", headers={"X-User-ID": "u1"})
    assert response.status_code == 200
    low_stock = response.json()
    assert len(low_stock) > 0
    for p in low_stock:
        assert p["stock_quantity"] <= p["min_stock_level"]


def test_create_product_role_enforcement():
    payload = {
        "name": "Vinyl Sheet Matte",
        "unit": "sheet",
        "stock_quantity": 25,
        "min_stock_level": 5,
    }

    # Sales role must receive 403
    res_sales = client.post("/products", json=payload, headers={"X-User-ID": "u1"})
    assert res_sales.status_code == 403

    # Manager role succeeds (201)
    res_manager = client.post("/products", json=payload, headers={"X-User-ID": "u3"})
    assert res_manager.status_code == 201
    created = res_manager.json()
    assert created["id"] == "p5"
    assert created["name"] == "Vinyl Sheet Matte"
    assert created["stock_quantity"] == 25

    # Check store and initial stock movement
    assert "p5" in products
    movements_for_p5 = [
        m for m in stock_movements.values() if m["product_id"] == "p5"
    ]
    assert len(movements_for_p5) == 1
    assert movements_for_p5[0]["delta"] == 25
    assert movements_for_p5[0]["reason"] == "manual_in"


def test_adjust_stock_role_and_validation():
    # 1. Sales role cannot adjust stock (403)
    res_sales = client.post(
        "/products/p1/stock",
        json={"delta": 10, "reason": "manual_in"},
        headers={"X-User-ID": "u1"},
    )
    assert res_sales.status_code == 403

    # 2. Unknown product returns 404
    res_404 = client.post(
        "/products/nonexistent/stock",
        json={"delta": 10, "reason": "manual_in"},
        headers={"X-User-ID": "u3"},
    )
    assert res_404.status_code == 404

    # 3. Manager stock in (+10 on p1)
    initial_stock = products["p1"]["stock_quantity"]
    res_in = client.post(
        "/products/p1/stock",
        json={"delta": 10, "reason": "manual_in"},
        headers={"X-User-ID": "u3"},
    )
    assert res_in.status_code == 200
    assert res_in.json()["stock_quantity"] == initial_stock + 10

    # 4. Exceeding stock reduction returns 400
    res_excess = client.post(
        "/products/p1/stock",
        json={"delta": 9999, "reason": "manual_out"},
        headers={"X-User-ID": "u3"},
    )
    assert res_excess.status_code == 400
    assert "Insufficient stock" in str(res_excess.json())

    # 5. Successful stock out (-5)
    current_stock = products["p1"]["stock_quantity"]
    res_out = client.post(
        "/products/p1/stock",
        json={"delta": 5, "reason": "manual_out"},
        headers={"X-User-ID": "u3"},
    )
    assert res_out.status_code == 200
    assert res_out.json()["stock_quantity"] == current_stock - 5

    # Check movement log
    latest_movement = list(stock_movements.values())[-1]
    assert latest_movement["product_id"] == "p1"
    assert latest_movement["delta"] == -5
    assert latest_movement["reason"] == "manual_out"
