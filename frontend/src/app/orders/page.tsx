"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { api, ApiError } from "@/lib/api";
import { Order, OrderStatusType, Product } from "@/types";
import {
  ShoppingCart,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Calendar,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function OrdersPage() {
  const { currentUser, users } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Status Filter Tab
  const [selectedStatusTab, setSelectedStatusTab] = useState<
    "all" | OrderStatusType
  >("all");

  // Expanded card tracking
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(
    new Set()
  );

  // Processing state per order id
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(
    null
  );

  const isManager = currentUser?.role === "manager";

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      setError(null);
      const [fetchedOrders, fetchedProducts] = await Promise.all([
        api.getOrders(currentUser.id),
        api.getProducts(currentUser.id),
      ]);
      setOrders(fetchedOrders);
      setProducts(fetchedProducts);

      // Auto-expand first 3 orders by default
      setExpandedOrderIds(new Set(fetchedOrders.slice(0, 3).map((o) => o.id)));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load orders.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: "completed" | "cancelled"
  ) => {
    if (!currentUser) return;

    // Optional confirmation prompt for cancellation
    if (
      newStatus === "cancelled" &&
      !window.confirm(
        `Are you sure you want to cancel Order #${orderId}? Stock will be immediately returned to inventory and an audit record will be logged.`
      )
    ) {
      return;
    }

    try {
      setProcessingOrderId(orderId);
      setError(null);
      setActionNotice(null);

      const updated = await api.updateOrderStatus(
        currentUser.id,
        orderId,
        newStatus
      );

      // Update in-place in state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? updated : o))
      );

      if (newStatus === "cancelled") {
        setActionNotice(
          `Order #${orderId} was cancelled. Reserved inventory has been restored.`
        );
      } else {
        setActionNotice(`Order #${orderId} has been successfully completed.`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to update order status.");
      }
    } finally {
      setProcessingOrderId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (selectedStatusTab === "all") return true;
    return order.status === selectedStatusTab;
  });

  const getProductName = (productId: string) => {
    const found = products.find((p) => p.id === productId);
    return found ? `${found.name} (${found.unit})` : productId;
  };

  const getUserName = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    return found ? found.name : userId;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Customer Orders
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isManager
              ? "All workshop and shop orders across all sales personnel."
              : `Showing orders created exclusively by ${currentUser?.name || "you"}.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </button>

          <Link
            href="/orders/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Order</span>
          </Link>
        </div>
      </div>

      {/* Role Scoping Announcement Banner */}
      <div
        className={cn(
          "rounded-xl border p-3.5 text-xs flex items-center justify-between font-mono",
          isManager
            ? "border-primary/30 bg-primary/5 text-foreground"
            : "border-amber-500/30 bg-amber-500/5 text-foreground"
        )}
      >
        <div className="flex items-center gap-2">
          {isManager ? (
            <UserCheck className="h-4 w-4 text-primary" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          )}
          <span>
            {isManager
              ? "Manager Scope: You have visibility and control over all customer orders."
              : `Sales Scope: Role isolation active. You can only view and manage your own orders (${currentUser?.name}).`}
          </span>
        </div>
        <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-background border border-border">
          {currentUser?.role}
        </span>
      </div>

      {/* Feedback alerts */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionNotice && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2">
        {(["all", "pending", "completed", "cancelled"] as const).map((tab) => {
          const isActive = selectedStatusTab === tab;
          const count =
            tab === "all"
              ? orders.length
              : orders.filter((o) => o.status === tab).length;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedStatusTab(tab)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                isActive
                  ? "bg-secondary text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <span>{tab}</span>
              <span
                className={cn(
                  "font-mono text-[10px] px-1.5 py-0.2 rounded-full",
                  isActive
                    ? "bg-background text-foreground border border-border"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders List / Cards */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center font-mono text-xs text-muted-foreground">
          Loading customer orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <h2 className="text-base font-bold text-foreground">
            No orders found
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            {selectedStatusTab === "all"
              ? "There are no orders recorded under this account scope yet."
              : `No orders currently match the '${selectedStatusTab}' filter.`}
          </p>
          <div className="mt-5">
            <Link
              href="/orders/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create First Order</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrderIds.has(order.id);
            const isPending = order.status === "pending";
            const isProcessing = processingOrderId === order.id;

            const orderTotal = order.lines.reduce(
              (acc, l) => acc + l.quantity * l.unit_price,
              0
            );

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs transition-all"
              >
                {/* Order Summary Row Header */}
                <div
                  onClick={() => toggleExpand(order.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 cursor-pointer hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <button
                      type="button"
                      aria-label={isExpanded ? "Collapse order" : "Expand order"}
                      className="rounded p-1 text-muted-foreground hover:bg-secondary mt-0.5 sm:mt-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-foreground">
                          #{order.id}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {order.customer_name}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(order.created_at).toLocaleDateString()} at{" "}
                          {new Date(order.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>•</span>
                        <span>
                          Created by:{" "}
                          <strong className="text-foreground">
                            {getUserName(order.created_by)}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>{order.lines.length} item line(s)</span>
                      </div>
                    </div>
                  </div>

                  {/* Status and Total */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground block font-mono">
                        Order Value
                      </span>
                      <span className="text-sm font-bold font-mono text-foreground">
                        ${orderTotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Status Badges */}
                    <div>
                      {order.status === "pending" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 font-mono">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      )}
                      {order.status === "completed" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 font-mono">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          Completed
                        </span>
                      )}
                      {order.status === "cancelled" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground font-mono">
                          <XCircle className="h-3 w-3" />
                          Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collapsible Order Lines Details & Actions */}
                {isExpanded && (
                  <div className="border-t border-border/80 bg-background/50 p-4 space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-border/60 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th scope="col" className="pb-2">
                              Item
                            </th>
                            <th scope="col" className="pb-2 text-right">
                              Quantity
                            </th>
                            <th scope="col" className="pb-2 text-right">
                              Unit Price
                            </th>
                            <th scope="col" className="pb-2 text-right">
                              Line Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 font-mono">
                          {order.lines.map((line) => (
                            <tr key={line.id} className="text-foreground">
                              <td className="py-2.5">
                                <span className="font-sans font-medium text-xs">
                                  {getProductName(line.product_id)}
                                </span>
                                <span className="text-[10px] text-muted-foreground block">
                                  ID: {line.product_id}
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-semibold">
                                {line.quantity}
                              </td>
                              <td className="py-2.5 text-right text-muted-foreground">
                                ${line.unit_price.toFixed(2)}
                              </td>
                              <td className="py-2.5 text-right font-bold text-foreground">
                                ${(line.quantity * line.unit_price).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Order Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-border/60 gap-3">
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {isPending ? (
                          <span>Stock already deducted. Ready for fulfillment or cancellation.</span>
                        ) : (
                          <span>Order is closed in terminal status. No further actions available.</span>
                        )}
                      </div>

                      {isPending && (
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(order.id, "cancelled");
                            }}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            <span>Cancel Order</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(order.id, "completed");
                            }}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            <span>Complete Order</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
