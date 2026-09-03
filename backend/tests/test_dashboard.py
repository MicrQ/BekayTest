from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.store import reset_store

client = TestClient(app)


@pytest.fixture(autouse=True)
def run_before_each_test():
    reset_store()


def test_dashboard_auth_and_role_restrictions():
    # 401 if missing header
    res_no_auth = client.get("/dashboard")
    assert res_no_auth.status_code == 401

    # 403 if sales user attempts to view dashboard
    res_sales = client.get("/dashboard", headers={"X-User-ID": "u1"})
    assert res_sales.status_code == 403

    # 200 if manager requests dashboard
    res_mgr = client.get("/dashboard", headers={"X-User-ID": "u3"})
    assert res_mgr.status_code == 200
    data = res_mgr.json()
    assert data["orders_by_status"] == {"pending": 0, "completed": 0, "cancelled": 0}
    assert data["total_revenue"] == 0.0


def test_dashboard_revenue_and_status_aggregation():
    # 1. Create Order 1 (remains pending: 2 @ 100 ETB = 200 ETB)
    res_o1 = client.post(
        "/orders",
        json={
            "customer_name": "Pending Client",
            "lines": [{"product_id": "p1", "quantity": 2, "unit_price": 100.0}],
        },
        headers={"X-User-ID": "u1"},
    )
    oid1 = res_o1.json()["id"]

    # 2. Create Order 2 (completed: 3 @ 50 ETB = 150 ETB)
    res_o2 = client.post(
        "/orders",
        json={
            "customer_name": "Completed Client",
            "lines": [{"product_id": "p1", "quantity": 3, "unit_price": 50.0}],
        },
        headers={"X-User-ID": "u1"},
    )
    oid2 = res_o2.json()["id"]
    client.patch(
        f"/orders/{oid2}/status",
        json={"status": "completed"},
        headers={"X-User-ID": "u3"},
    )

    # 3. Create Order 3 (cancelled: 4 @ 25 ETB = 100 ETB)
    res_o3 = client.post(
        "/orders",
        json={
            "customer_name": "Cancelled Client",
            "lines": [{"product_id": "p1", "quantity": 4, "unit_price": 25.0}],
        },
        headers={"X-User-ID": "u1"},
    )
    oid3 = res_o3.json()["id"]
    client.patch(
        f"/orders/{oid3}/status",
        json={"status": "cancelled"},
        headers={"X-User-ID": "u3"},
    )

    # 4. Fetch dashboard as Manager
    res_dash = client.get("/dashboard", headers={"X-User-ID": "u3"})
    assert res_dash.status_code == 200
    summary = res_dash.json()

    assert summary["orders_by_status"]["pending"] == 1
    assert summary["orders_by_status"]["completed"] == 1
    assert summary["orders_by_status"]["cancelled"] == 1

    # Revenue MUST strictly sum completed orders only (150.00 ETB)
    assert summary["total_revenue"] == 150.00
