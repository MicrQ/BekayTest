from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.store import order_lines, orders, products, reset_store, stock_movements

client = TestClient(app)


@pytest.fixture(autouse=True)
def run_before_each_test():
    reset_store()


def test_create_order_deducts_stock_and_records_movement():
    initial_stock = products["p1"]["stock_quantity"]  # 50
    payload = {
        "customer_name": "Abebe Kebede",
        "lines": [{"product_id": "p1", "quantity": 5, "unit_price": 120.00}],
    }

    response = client.post("/orders", json=payload, headers={"X-User-ID": "u1"})
    assert response.status_code == 201
    order_data = response.json()
    assert order_data["customer_name"] == "Abebe Kebede"
    assert order_data["status"] == "pending"
    assert order_data["created_by"] == "u1"
    assert len(order_data["lines"]) == 1
    assert order_data["lines"][0]["product_id"] == "p1"
    assert order_data["lines"][0]["quantity"] == 5

    # Verify product stock deducted
    assert products["p1"]["stock_quantity"] == initial_stock - 5

    # Verify stock movement recorded
    mv = list(stock_movements.values())[-1]
    assert mv["product_id"] == "p1"
    assert mv["order_id"] == order_data["id"]
    assert mv["delta"] == -5
    assert mv["reason"] == "order_created"


def test_create_order_insufficient_stock_fails():
    initial_stock = products["p1"]["stock_quantity"]
    payload = {
        "customer_name": "Tigist Alemu",
        "lines": [
            {"product_id": "p1", "quantity": initial_stock + 1, "unit_price": 100.0}
        ],
    }

    response = client.post("/orders", json=payload, headers={"X-User-ID": "u1"})
    assert response.status_code == 400
    err_detail = response.json()["detail"]
    assert err_detail["product"] == products["p1"]["name"]
    assert err_detail["requested"] == initial_stock + 1
    assert err_detail["available"] == initial_stock

    # Stock unchanged, no order created
    assert products["p1"]["stock_quantity"] == initial_stock
    assert len(orders) == 0
    assert len(stock_movements) == 0


def test_orders_role_visibility():
    # Sales 1 creates order 1
    res1 = client.post(
        "/orders",
        json={
            "customer_name": "Client 1",
            "lines": [{"product_id": "p1", "quantity": 1, "unit_price": 50.0}],
        },
        headers={"X-User-ID": "u1"},
    )
    oid1 = res1.json()["id"]

    # Sales 2 creates order 2
    res2 = client.post(
        "/orders",
        json={
            "customer_name": "Client 2",
            "lines": [{"product_id": "p1", "quantity": 1, "unit_price": 50.0}],
        },
        headers={"X-User-ID": "u2"},
    )
    oid2 = res2.json()["id"]

    # Sales 1 only sees their own orders
    res_sales1 = client.get("/orders", headers={"X-User-ID": "u1"})
    orders_s1 = [o["id"] for o in res_sales1.json()]
    assert oid1 in orders_s1
    assert oid2 not in orders_s1

    # Sales 2 only sees their own orders
    res_sales2 = client.get("/orders", headers={"X-User-ID": "u2"})
    orders_s2 = [o["id"] for o in res_sales2.json()]
    assert oid2 in orders_s2
    assert oid1 not in orders_s2

    # Manager sees all orders
    res_manager = client.get("/orders", headers={"X-User-ID": "u3"})
    orders_mgr = [o["id"] for o in res_manager.json()]
    assert oid1 in orders_mgr
    assert oid2 in orders_mgr


def test_order_cancellation_reverses_stock_and_keeps_audit_log():
    initial_stock = products["p1"]["stock_quantity"]
    # Create order for 4 items
    res_create = client.post(
        "/orders",
        json={
            "customer_name": "Dawit",
            "lines": [{"product_id": "p1", "quantity": 4, "unit_price": 80.0}],
        },
        headers={"X-User-ID": "u1"},
    )
    oid = res_create.json()["id"]
    assert products["p1"]["stock_quantity"] == initial_stock - 4

    # Sales 2 cannot cancel Sales 1's order (403)
    res_forbidden = client.patch(
        f"/orders/{oid}/status",
        json={"status": "cancelled"},
        headers={"X-User-ID": "u2"},
    )
    assert res_forbidden.status_code == 403

    # Sales 1 cancels own order
    res_cancel = client.patch(
        f"/orders/{oid}/status",
        json={"status": "cancelled"},
        headers={"X-User-ID": "u1"},
    )
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "cancelled"

    # Stock is reversed
    assert products["p1"]["stock_quantity"] == initial_stock

    # Audit trail: 2 records for this order (one negative, one positive)
    movements_for_order = [
        m for m in stock_movements.values() if m["order_id"] == oid
    ]
    assert len(movements_for_order) == 2
    assert movements_for_order[0]["delta"] == -4
    assert movements_for_order[0]["reason"] == "order_created"
    assert movements_for_order[1]["delta"] == 4
    assert movements_for_order[1]["reason"] == "order_cancelled"


def test_terminal_status_transitions():
    # Create order
    res_create = client.post(
        "/orders",
        json={
            "customer_name": "Sara",
            "lines": [{"product_id": "p1", "quantity": 2, "unit_price": 50.0}],
        },
        headers={"X-User-ID": "u1"},
    )
    oid = res_create.json()["id"]

    # Manager completes order
    res_comp = client.patch(
        f"/orders/{oid}/status",
        json={"status": "completed"},
        headers={"X-User-ID": "u3"},
    )
    assert res_comp.status_code == 200
    assert res_comp.json()["status"] == "completed"

    # Cannot transition completed order to cancelled
    res_fail = client.patch(
        f"/orders/{oid}/status",
        json={"status": "cancelled"},
        headers={"X-User-ID": "u3"},
    )
    assert res_fail.status_code == 400
