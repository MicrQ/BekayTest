from collections import Counter
from fastapi import APIRouter, Depends

from app.deps import require_manager
from app.schemas import DashboardSummary, User
from app.store import order_lines, orders

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardSummary)
def get_dashboard_summary(_: User = Depends(require_manager)):
    """Return order counts by status and total revenue from completed orders (Manager only)."""
    # Count orders by status with zero defaults
    status_counts = {"pending": 0, "completed": 0, "cancelled": 0}
    actual_counts = Counter(o["status"] for o in orders.values())
    status_counts.update(actual_counts)

    # Calculate revenue strictly from completed orders
    completed_order_ids = {
        oid for oid, o in orders.items() if o["status"] == "completed"
    }

    total_revenue = sum(
        line["quantity"] * line["unit_price"]
        for line in order_lines.values()
        if line["order_id"] in completed_order_ids
    )

    return DashboardSummary(
        orders_by_status=status_counts,
        total_revenue=round(total_revenue, 2),
    )
