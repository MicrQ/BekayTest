"use client";

import React, { useState } from "react";
import { useUser } from "@/context/UserContext";
import { api, ApiError } from "@/lib/api";
import { Product } from "@/types";
import { X, ArrowUpCircle, ArrowDownCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdjustStockModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdjustStockModal({
  product,
  isOpen,
  onClose,
  onSuccess,
}: AdjustStockModalProps) {
  const { currentUser } = useUser();
  const [reason, setReason] = useState<"manual_in" | "manual_out">("manual_in");
  const [quantity, setQuantity] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const currentStock = product.stock_quantity;
  const projectedStock =
    reason === "manual_in" ? currentStock + quantity : currentStock - quantity;
  const isNegativeStock = projectedStock < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (quantity <= 0) {
      setError("Adjustment quantity must be greater than zero.");
      return;
    }

    if (reason === "manual_out" && isNegativeStock) {
      setError(`Cannot deduct ${quantity} units. Only ${currentStock} available.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const delta = reason === "manual_in" ? quantity : -quantity;
      await api.adjustStock(currentUser.id, product.id, {
        delta,
        reason,
      });
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to adjust stock. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-stock-title"
    >
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl text-card-foreground animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 id="adjust-stock-title" className="text-lg font-bold tracking-tight">
              Adjust Inventory Stock
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              Product: <span className="text-foreground font-medium">{product.name}</span> ({product.unit})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Action Type: Stock In vs Stock Out */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Movement Direction
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReason("manual_in")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold transition-all",
                  reason === "manual_in"
                    ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary/50"
                )}
              >
                <ArrowUpCircle className="h-4 w-4 text-primary" />
                <span>Stock In (+ receive)</span>
              </button>
              <button
                type="button"
                onClick={() => setReason("manual_out")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold transition-all",
                  reason === "manual_out"
                    ? "border-destructive bg-destructive/10 text-destructive ring-1 ring-destructive"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary/50"
                )}
              >
                <ArrowDownCircle className="h-4 w-4 text-destructive" />
                <span>Stock Out (- issue)</span>
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="stock-quantity-change"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Quantity to {reason === "manual_in" ? "Add" : "Deduct"} ({product.unit})
            </label>
            <input
              id="stock-quantity-change"
              type="number"
              min="1"
              required
              autoFocus
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full font-mono rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Real-time Calculation Summary Card */}
          <div className="rounded-lg border border-border/70 bg-background/50 p-3 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Current Available:</span>
              <span>{currentStock} {product.unit}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className={reason === "manual_in" ? "text-primary" : "text-destructive"}>
                {reason === "manual_in" ? `+ ${quantity}` : `- ${quantity}`} {product.unit}:
              </span>
              <span className={isNegativeStock ? "text-destructive font-bold" : "text-foreground"}>
                {projectedStock} {product.unit}
              </span>
            </div>
            {isNegativeStock && (
              <p className="text-[11px] text-destructive pt-1 font-sans">
                ⚠️ Stock cannot fall below 0.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (reason === "manual_out" && isNegativeStock)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isSubmitting ? "Adjusting..." : "Confirm Adjustment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
