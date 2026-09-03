from typing import Literal, Optional
from pydantic import BaseModel, Field


RoleType = Literal["sales", "manager"]
OrderStatusType = Literal["pending", "completed", "cancelled"]
MovementReasonType = Literal[
    "order_created", "order_cancelled", "manual_in", "manual_out"
]


class User(BaseModel):
    id: str
    name: str
    role: RoleType


class ProductBase(BaseModel):
    name: str
    unit: str
    stock_quantity: int = Field(..., ge=0)
    min_stock_level: int = Field(..., ge=0)


class ProductCreate(ProductBase):
    pass


class Product(ProductBase):
    id: str


class StockAdjustment(BaseModel):
    delta: int = Field(..., description="Positive for stock in, negative for stock out")
    reason: Literal["manual_in", "manual_out"]


class OrderLineCreate(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)
    unit_price: float = Field(..., ge=0.0)


class OrderLine(BaseModel):
    id: str
    order_id: str
    product_id: str
    quantity: int
    unit_price: float


class OrderCreate(BaseModel):
    customer_name: str
    lines: list[OrderLineCreate] = Field(..., min_length=1)


class OrderStatusUpdate(BaseModel):
    status: Literal["completed", "cancelled"]


class Order(BaseModel):
    id: str
    customer_name: str
    status: OrderStatusType
    created_by: str
    created_at: str
    lines: list[OrderLine] = []


class StockMovement(BaseModel):
    id: str
    product_id: str
    order_id: Optional[str] = None
    delta: int
    reason: MovementReasonType
    timestamp: str


class DashboardSummary(BaseModel):
    orders_by_status: dict[str, int]
    total_revenue: float
