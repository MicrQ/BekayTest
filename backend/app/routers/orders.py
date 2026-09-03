from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import get_current_user
from app.schemas import Order, OrderCreate, OrderLine, OrderStatusUpdate, User
from app.store import order_lines, orders, products, stock_movements

router = APIRouter(prefix="/orders", tags=["orders"])


def _get_order_with_lines(order_dict: dict) -> Order:
    """Helper to assemble Order model with embedded OrderLines."""
    lines = [
        OrderLine(**ol)
        for ol in order_lines.values()
        if ol["order_id"] == order_dict["id"]
    ]
    return Order(**order_dict, lines=lines)


@router.get("", response_model=list[Order])
def list_orders(current_user: User = Depends(get_current_user)):
    """List orders.

    Sales users see only their own orders.
    Managers see all orders.
    """
    if current_user.role == "manager":
        matching_orders = list(orders.values())
    else:
        matching_orders = [
            o for o in orders.values() if o["created_by"] == current_user.id
        ]

    # Return newest orders first
    sorted_orders = sorted(
        matching_orders,
        key=lambda o: o.get("created_at", ""),
        reverse=True,
    )
    return [_get_order_with_lines(o) for o in sorted_orders]


@router.post("", response_model=Order, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    current_user: User = Depends(get_current_user),
):
    """Create order and deduct stock immediately.

    Fails with 400 at the first product with insufficient stock.
    """
    # 1. Validate all products exist and have sufficient stock
    for line in payload.lines:
        if line.product_id not in products:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product '{line.product_id}' not found",
            )
        product = products[line.product_id]
        if product["stock_quantity"] < line.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "product": product["name"],
                    "requested": line.quantity,
                    "available": product["stock_quantity"],
                },
            )

    # 2. Generate Order ID
    existing_order_nums = [
        int(oid[1:])
        for oid in orders.keys()
        if oid.startswith("o") and oid[1:].isdigit()
    ]
    order_id = f"o{max(existing_order_nums, default=0) + 1}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_order = {
        "id": order_id,
        "customer_name": payload.customer_name,
        "status": "pending",
        "created_by": current_user.id,
        "created_at": now_iso,
    }
    orders[order_id] = new_order

    # 3. Deduct stock, log movements, and save order lines
    for line in payload.lines:
        # Deduct stock
        product = products[line.product_id]
        product["stock_quantity"] -= line.quantity

        # Append immutable StockMovement
        mv_id = f"mv{len(stock_movements) + 1}"
        stock_movements[mv_id] = {
            "id": mv_id,
            "product_id": line.product_id,
            "order_id": order_id,
            "delta": -line.quantity,
            "reason": "order_created",
            "timestamp": now_iso,
        }

        # Create OrderLine
        existing_line_nums = [
            int(lid[2:])
            for lid in order_lines.keys()
            if lid.startswith("ol") and lid[2:].isdigit()
        ]
        line_id = f"ol{max(existing_line_nums, default=0) + 1}"
        order_lines[line_id] = {
            "id": line_id,
            "order_id": order_id,
            "product_id": line.product_id,
            "quantity": line.quantity,
            "unit_price": line.unit_price,
        }

    return _get_order_with_lines(new_order)


@router.patch("/{order_id}/status", response_model=Order)
def update_order_status(
    order_id: str,
    update: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update order status.

    - Pending -> Completed: Status update only.
    - Pending -> Cancelled: Status update + reverses stock via new StockMovements.
    - Completed / Cancelled -> Terminal states (cannot be transitioned).
    - Sales can only update their own orders. Manager can update any.
    """
    if order_id not in orders:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order '{order_id}' not found",
        )

    order = orders[order_id]

    # Role restriction: Sales can only modify own orders
    if current_user.role == "sales" and order["created_by"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sales persons can only modify their own orders",
        )

    # Validate transition from Pending
    if order["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition order from terminal status '{order['status']}'",
        )

    now_iso = datetime.now(timezone.utc).isoformat()

    # Handle cancellation: reverse stock and log positive movements
    if update.status == "cancelled":
        lines_for_order = [
            ol for ol in order_lines.values() if ol["order_id"] == order_id
        ]
        for line in lines_for_order:
            pid = line["product_id"]
            if pid in products:
                products[pid]["stock_quantity"] += line["quantity"]

            mv_id = f"mv{len(stock_movements) + 1}"
            stock_movements[mv_id] = {
                "id": mv_id,
                "product_id": pid,
                "order_id": order_id,
                "delta": line["quantity"],
                "reason": "order_cancelled",
                "timestamp": now_iso,
            }

    order["status"] = update.status
    return _get_order_with_lines(order)
