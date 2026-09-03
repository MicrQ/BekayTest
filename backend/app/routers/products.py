from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import get_current_user, require_manager
from app.schemas import Product, ProductCreate, StockAdjustment, User
from app.store import products, stock_movements

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[Product])
def list_products(_: User = Depends(get_current_user)):
    """List all products with current stock quantities."""
    return [Product(**p) for p in products.values()]


@router.get("/low-stock", response_model=list[Product])
def list_low_stock_products(_: User = Depends(get_current_user)):
    """List products currently at or below their minimum stock level."""
    return [
        Product(**p)
        for p in products.values()
        if p["stock_quantity"] <= p["min_stock_level"]
    ]


@router.post("", response_model=Product, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    _: User = Depends(require_manager),
):
    """Create a new product (Manager only)."""
    # Generate sequential product ID (p1, p2, p3...)
    existing_numeric_ids = [
        int(pid[1:])
        for pid in products.keys()
        if pid.startswith("p") and pid[1:].isdigit()
    ]
    next_id = f"p{max(existing_numeric_ids, default=0) + 1}"

    new_product = {
        "id": next_id,
        "name": payload.name,
        "unit": payload.unit,
        "stock_quantity": payload.stock_quantity,
        "min_stock_level": payload.min_stock_level,
    }
    products[next_id] = new_product

    # If product is created with initial positive stock, log initial stock movement
    if payload.stock_quantity > 0:
        movement_num = len(stock_movements) + 1
        mv_id = f"mv{movement_num}"
        stock_movements[mv_id] = {
            "id": mv_id,
            "product_id": next_id,
            "order_id": None,
            "delta": payload.stock_quantity,
            "reason": "manual_in",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    return Product(**new_product)


@router.post("/{product_id}/stock", response_model=Product)
def adjust_stock(
    product_id: str,
    adjustment: StockAdjustment,
    _: User = Depends(require_manager),
):
    """Adjust product stock manually (Manager only). Records immutable StockMovement."""
    if product_id not in products:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found",
        )

    product = products[product_id]

    # Normalize delta based on reason
    delta = adjustment.delta
    if adjustment.reason == "manual_in":
        if delta <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Delta must be positive for 'manual_in'",
            )
    elif adjustment.reason == "manual_out":
        delta = -abs(delta)

    if delta == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock adjustment delta cannot be zero",
        )

    new_quantity = product["stock_quantity"] + delta
    if new_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Insufficient stock for adjustment",
                "product": product["name"],
                "requested_reduction": abs(delta),
                "available": product["stock_quantity"],
            },
        )

    # Apply mutation
    product["stock_quantity"] = new_quantity

    # Record immutable stock movement
    mv_id = f"mv{len(stock_movements) + 1}"
    stock_movements[mv_id] = {
        "id": mv_id,
        "product_id": product_id,
        "order_id": None,
        "delta": delta,
        "reason": adjustment.reason,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    return Product(**product)
