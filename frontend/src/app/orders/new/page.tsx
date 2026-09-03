"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { api, ApiError } from "@/lib/api";
import { Product } from "@/types";
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  ShoppingCart,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderLineDraft {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [lines, setLines] = useState<OrderLineDraft[]>([
    { productId: "", quantity: 1, unitPrice: 50 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load available products for selection
  const loadProducts = useCallback(async () => {
    if (!currentUser) return;
    try {
      setIsLoadingProducts(true);
      const data = await api.getProducts(currentUser.id);
      setProducts(data);
      if (data.length > 0) {
        setLines((prev) =>
          prev.map((l) => ({
            ...l,
            productId: l.productId || data[0].id,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load products for ordering:", err);
      setErrorMessage("Could not load products. Please ensure the backend is running.");
    } finally {
      setIsLoadingProducts(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Line item manipulations
  const handleAddLine = () => {
    const defaultProductId = products[0]?.id || "";
    setLines((prev) => [
      ...prev,
      { productId: defaultProductId, quantity: 1, unitPrice: 50 },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLine = (
    index: number,
    field: keyof OrderLineDraft,
    value: string | number
  ) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i === index) {
          return { ...line, [field]: value };
        }
        return line;
      })
    );
  };

  // Stock and validation calculations
  const lineEvaluations = lines.map((line) => {
    const product = products.find((p) => p.id === line.productId);
    const available = product ? product.stock_quantity : 0;
    const isOverStock = line.quantity > available;
    const subtotal = (line.quantity || 0) * (line.unitPrice || 0);
    return {
      product,
      available,
      isOverStock,
      subtotal,
    };
  });

  const hasStockError = lineEvaluations.some((ev) => ev.isOverStock);
  const hasZeroQuantity = lines.some((l) => l.quantity <= 0);
  const isFormValid =
    customerName.trim().length > 0 &&
    lines.length > 0 &&
    !hasStockError &&
    !hasZeroQuantity;

  const orderTotal = lineEvaluations.reduce(
    (acc, ev) => acc + ev.subtotal,
    0
  );
  const totalItemsCount = lines.reduce(
    (acc, l) => acc + (Number(l.quantity) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isFormValid) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      await api.createOrder(currentUser.id, {
        customer_name: customerName.trim(),
        lines: lines.map((l) => ({
          product_id: l.productId,
          quantity: Number(l.quantity),
          unit_price: Number(l.unitPrice),
        })),
      });

      // Redirect to orders page on successful placement
      router.push("/orders");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to submit order. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="border-b border-border/80 pb-5">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Orders List</span>
        </Link>
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Create Customer Order
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Add items, check stock levels, and place the order. Stock is deducted immediately upon creation.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to place order</p>
            <p className="text-xs mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 columns: Order Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information Card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono mb-3">
              1. Customer Information
            </h2>
            <div>
              <label
                htmlFor="customer-name"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Customer or Company Name *
              </label>
              <input
                id="customer-name"
                type="text"
                required
                autoFocus
                placeholder="e.g. Abebe Kebede / Addis Uniforms PLC"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Line Items Card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                2. Order Line Items
              </h2>
              <button
                type="button"
                onClick={handleAddLine}
                disabled={isLoadingProducts || products.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            {isLoadingProducts ? (
              <div className="py-8 text-center font-mono text-xs text-muted-foreground">
                Loading products catalog...
              </div>
            ) : (
              <div className="space-y-4">
                {lines.map((line, index) => {
                  const evalData = lineEvaluations[index];
                  const product = evalData.product;
                  const isLow = evalData.available <= (product?.min_stock_level ?? 0);

                  return (
                    <div
                      key={index}
                      className={cn(
                        "rounded-lg border p-4 transition-all bg-background/50",
                        evalData.isOverStock
                          ? "border-destructive/60 bg-destructive/5"
                          : "border-border"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono mb-2">
                        <span>Line #{index + 1}</span>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(index)}
                            className="text-destructive/80 hover:text-destructive flex items-center gap-1 transition-colors"
                            aria-label={`Remove line ${index + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                        {/* Product Selector */}
                        <div className="sm:col-span-5">
                          <label
                            htmlFor={`product-select-${index}`}
                            className="block text-[11px] font-semibold text-muted-foreground mb-1"
                          >
                            Product
                          </label>
                          <select
                            id={`product-select-${index}`}
                            value={line.productId}
                            onChange={(e) =>
                              handleUpdateLine(index, "productId", e.target.value)
                            }
                            className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.stock_quantity} {p.unit}s available)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-3">
                          <div className="flex justify-between items-center mb-1">
                            <label
                              htmlFor={`quantity-${index}`}
                              className="block text-[11px] font-semibold text-muted-foreground"
                            >
                              Qty ({product?.unit || "units"})
                            </label>
                            <span
                              className={cn(
                                "text-[10px] font-mono",
                                evalData.isOverStock
                                  ? "text-destructive font-bold"
                                  : isLow
                                  ? "text-amber-500 font-medium"
                                  : "text-muted-foreground"
                              )}
                            >
                              Max: {evalData.available}
                            </span>
                          </div>
                          <input
                            id={`quantity-${index}`}
                            type="number"
                            min="1"
                            required
                            value={line.quantity}
                            onChange={(e) =>
                              handleUpdateLine(
                                index,
                                "quantity",
                                Math.max(1, Number(e.target.value))
                              )
                            }
                            className={cn(
                              "w-full font-mono rounded-md border px-2.5 py-1.5 text-sm bg-card text-foreground focus:outline-none focus:ring-1",
                              evalData.isOverStock
                                ? "border-destructive focus:ring-destructive"
                                : "border-input focus:ring-ring"
                            )}
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="sm:col-span-2">
                          <label
                            htmlFor={`unit-price-${index}`}
                            className="block text-[11px] font-semibold text-muted-foreground mb-1"
                          >
                            Unit Price (ETB)
                          </label>
                          <input
                            id={`unit-price-${index}`}
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={line.unitPrice}
                            onChange={(e) =>
                              handleUpdateLine(
                                index,
                                "unitPrice",
                                Math.max(0, Number(e.target.value))
                              )
                            }
                            className="w-full font-mono rounded-md border border-input bg-card px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>

                        {/* Subtotal */}
                        <div className="sm:col-span-2 text-right">
                          <span className="block text-[11px] font-semibold text-muted-foreground mb-1">
                            Line Total
                          </span>
                          <span className="block font-mono text-sm font-bold text-foreground py-1.5">
                            {evalData.subtotal.toFixed(2)} ETB
                          </span>
                        </div>
                      </div>

                      {/* Stock warning notification */}
                      {evalData.isOverStock && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive font-mono">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            Insufficient stock: Requested {line.quantity}, only {evalData.available} in stock!
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 column: Order Summary & Placement Confirmation */}
        <div className="space-y-6">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono border-b border-border/80 pb-3">
              Order Summary
            </h2>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Creator Account:</span>
                <span className="text-foreground font-semibold">
                  {currentUser?.name || "..."}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Role:</span>
                <span className="uppercase text-primary font-bold">
                  {currentUser?.role || "..."}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Line Items:</span>
                <span className="text-foreground font-medium">{lines.length}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Units:</span>
                <span className="text-foreground font-medium">{totalItemsCount}</span>
              </div>
              <div className="border-t border-border/80 pt-2 flex justify-between text-sm font-bold">
                <span className="text-foreground">Estimated Total:</span>
                <span className="text-primary text-base font-extrabold font-mono">
                  {orderTotal.toFixed(2)} ETB
                </span>
              </div>
            </div>

            {hasStockError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Validation Error</span>
                </div>
                <p className="text-[11px] font-sans">
                  One or more items exceed current workshop stock. Adjust quantities to proceed.
                </p>
              </div>
            )}

            <div className="border-t border-border/80 pt-4">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deducting Stock & Placing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Place Order</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              Stock is automatically deducted in real time. Order starts in <strong className="text-foreground">Pending</strong> status.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
