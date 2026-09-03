"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { api, ApiError } from "@/lib/api";
import { Product } from "@/types";
import { AdjustStockModal } from "@/components/AdjustStockModal";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  PackageCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LowStockPage() {
  const { currentUser } = useUser();
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const isManager = currentUser?.role === "manager";

  const loadLowStock = useCallback(async () => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getLowStockProducts(currentUser.id);
      setLowStockProducts(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load low stock alerts.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadLowStock();
  }, [loadLowStock]);

  return (
    <div className="space-y-6">
      {/* Top back navigation and header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-5">
        <div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to All Products</span>
          </Link>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Low Stock Alerts
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Supplies currently at or below their safety stock threshold.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLowStock}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Zero State or Table */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center font-mono text-xs text-muted-foreground">
          Checking inventory stock thresholds...
        </div>
      ) : lowStockProducts.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3">
            <PackageCheck className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            All Stock Levels Optimal
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            No products are currently at or below their minimum stock limit. All shop operations have sufficient supply reserves.
          </p>
          <div className="mt-5">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
            >
              Browse Full Catalog
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-amber-500/30 bg-card shadow-xs">
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>{lowStockProducts.length} product(s) require replenishment</span>
            </div>
            <span className="font-mono text-muted-foreground">
              Automated Threshold Engine
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    Low Stock Supply
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Unit
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Available Stock
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Min Threshold
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Shortage Gap
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {lowStockProducts.map((product) => {
                  const shortage = Math.max(
                    0,
                    product.min_stock_level - product.stock_quantity
                  );
                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground">
                          {product.name}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          SKU: {product.id}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs capitalize text-muted-foreground">
                        {product.unit}
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-base font-bold text-amber-600 dark:text-amber-400">
                          {product.stock_quantity}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          {product.unit}s left
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                        {product.min_stock_level} {product.unit}s
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-destructive">
                          -{shortage} {product.unit}s
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isManager ? (
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(product)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
                          >
                            <SlidersHorizontal className="h-3 w-3" />
                            <span>Restock</span>
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">
                            Alert notify
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      <AdjustStockModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSuccess={loadLowStock}
      />
    </div>
  );
}
