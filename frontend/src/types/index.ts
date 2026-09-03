export type RoleType = "sales" | "manager";
export type OrderStatusType = "pending" | "completed" | "cancelled";
export type MovementReasonType =
  | "order_created"
  | "order_cancelled"
  | "manual_in"
  | "manual_out";

export interface User {
  id: string;
  name: string;
  role: RoleType;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
  min_stock_level: number;
}

export interface ProductCreate {
  name: string;
  unit: string;
  stock_quantity: number;
  min_stock_level: number;
}

export interface StockAdjustment {
  delta: number;
  reason: "manual_in" | "manual_out";
}

export interface OrderLine {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface OrderLineCreate {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  customer_name: string;
  status: OrderStatusType;
  created_by: string;
  created_at: string;
  lines: OrderLine[];
}

export interface OrderCreate {
  customer_name: string;
  lines: OrderLineCreate[];
}

export interface StockMovement {
  id: string;
  product_id: string;
  order_id?: string | null;
  delta: number;
  reason: MovementReasonType;
  timestamp: string;
}

export interface DashboardSummary {
  orders_by_status: {
    pending: number;
    completed: number;
    cancelled: number;
  };
  total_revenue: number;
}
