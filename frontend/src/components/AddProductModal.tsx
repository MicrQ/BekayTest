"use client";

import React, { useState } from "react";
import { useUser } from "@/context/UserContext";
import { api, ApiError } from "@/lib/api";
import { X, Plus, AlertCircle, Loader2 } from "lucide-react";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddProductModal({
  isOpen,
  onClose,
  onSuccess,
}: AddProductModalProps) {
  const { currentUser } = useUser();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("piece");
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [minStockLevel, setMinStockLevel] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (stockQuantity < 0) {
      setError("Stock quantity cannot be negative.");
      return;
    }
    if (minStockLevel < 0) {
      setError("Minimum stock level cannot be negative.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await api.createProduct(currentUser.id, {
        name: name.trim(),
        unit: unit.trim().toLowerCase(),
        stock_quantity: Number(stockQuantity),
        min_stock_level: Number(minStockLevel),
      });
      // Reset form
      setName("");
      setUnit("piece");
      setStockQuantity(0);
      setMinStockLevel(5);
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to create product. Please try again.");
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
      aria-labelledby="add-product-title"
    >
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl text-card-foreground animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-foreground border border-primary/40 font-mono">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h2 id="add-product-title" className="text-lg font-bold tracking-tight">
                Add New Product
              </h2>
              <p className="text-xs text-muted-foreground">
                Manager inventory action
              </p>
            </div>
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
          <div>
            <label
              htmlFor="product-name"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Product Name
            </label>
            <input
              id="product-name"
              type="text"
              required
              autoFocus
              placeholder="e.g. Cotton T-Shirt Blank White"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label
              htmlFor="product-unit"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Measurement Unit
            </label>
            <select
              id="product-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="piece">piece (garments, blanks)</option>
              <option value="roll">roll (fabrics, vinyl)</option>
              <option value="sheet">sheet (DTF film, paper)</option>
              <option value="bottle">bottle (inks, coatings)</option>
              <option value="kg">kg (bulk raw material)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="product-stock"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Initial Stock
              </label>
              <input
                id="product-stock"
                type="number"
                min="0"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Number(e.target.value))}
                className="w-full font-mono rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label
                htmlFor="product-min-stock"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Min Stock Level
              </label>
              <input
                id="product-min-stock"
                type="number"
                min="0"
                required
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(Number(e.target.value))}
                className="w-full font-mono rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
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
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isSubmitting ? "Creating..." : "Save Product"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
