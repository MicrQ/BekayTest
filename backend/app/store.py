"""In-memory data store with seed data.

Entities are stored in flat dictionaries keyed by their primary ID string.
"""

from typing import Any, Dict

# The 5 flat in-memory stores keyed by ID
users: Dict[str, Dict[str, Any]] = {}
products: Dict[str, Dict[str, Any]] = {}
orders: Dict[str, Dict[str, Any]] = {}
order_lines: Dict[str, Dict[str, Any]] = {}
stock_movements: Dict[str, Dict[str, Any]] = {}


def seed_store() -> None:
    """Populate store with blueprint seed data."""
    users.clear()
    products.clear()
    orders.clear()
    order_lines.clear()
    stock_movements.clear()

    users.update(
        {
            "u1": {"id": "u1", "name": "Sales Person 1", "role": "sales"},
            "u2": {"id": "u2", "name": "Sales Person 2", "role": "sales"},
            "u3": {"id": "u3", "name": "Manager", "role": "manager"},
        }
    )

    products.update(
        {
            "p1": {
                "id": "p1",
                "name": "Roll of Fabric",
                "unit": "roll",
                "stock_quantity": 50,
                "min_stock_level": 10,
            },
            "p2": {
                "id": "p2",
                "name": "DTF Film A3",
                "unit": "sheet",
                "stock_quantity": 15,
                "min_stock_level": 20,
            },
            "p3": {
                "id": "p3",
                "name": "Sublimation Ink Black",
                "unit": "bottle",
                "stock_quantity": 8,
                "min_stock_level": 5,
            },
            "p4": {
                "id": "p4",
                "name": "Cotton T-Shirt Blank L",
                "unit": "piece",
                "stock_quantity": 4,
                "min_stock_level": 10,
            },
        }
    )


# Seed store upon module import
seed_store()

# Alias for test isolation
reset_store = seed_store
