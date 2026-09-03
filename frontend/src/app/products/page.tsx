"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { api, ApiError } from "@/lib/api";
import { Product } from "@/types";
import { AddProductModal } from "@/components/AddProductModal";
import { AdjustStockModal } from "@/components/AdjustStockModal";
import {
  Package,
  AlertTriangle,
  Plus,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  RefreshCw,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProductsPage() {
  const { currentUser } = useUser();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] =
    useState<Product | null>(null);

  const isManager = currentUser?.role === "manager";

  const loadProducts = useCallback(async () => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getProducts(currentUser.id);
      setProducts(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load inventory products.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesLowStock = filterLowStockOnly
      ? p.stock_quantity <= p.min_stock_level
      : true;
    return matchesSearch && matchesLowStock;
  });

  const lowStockCount = products.filter(
    (p) => p.stock_quantity <= p.min_stock_level
  ).length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.stock_quantity, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Products & Stock Inventory
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time stock quantities, thresholds, and supplies for printing & garments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadProducts}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Refresh Products"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </button>

          {isManager && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono uppercase">
            <span>Total Catalog Items</span>
            <Package className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-foreground">
            {products.length}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Active supplies and garment blanks
          </p>
        </div>

        <Link
          href="/low-stock"
          className={cn(
            "rounded-xl border p-4 shadow-2xs transition-all hover:border-amber-500/50 block",
            lowStockCount > 0
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-border bg-card"
          )}
        >
          <div className="flex items-center justify-between text-xs font-mono uppercase text-amber-600 dark:text-amber-400">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-foreground">
            {lowStockCount}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {lowStockCount > 0
              ? "Items at or below minimum threshold (View)"
              : "All products above minimum safety levels"}
          </p>
        </Link>

        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono uppercase">
            <span>Total In-Stock Units</span>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-foreground">
            {totalStockUnits}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Aggregated units across all categories
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card/60 p-3 rounded-xl border border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              filterLowStockOnly
                ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Low Stock Filter {filterLowStockOnly && "(Active)"}</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Products Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-3">
                  Product Details
                </th>
                <th scope="col" className="px-4 py-3">
                  Unit
                </th>
                <th scope="col" className="px-4 py-3">
                  Current Stock
                </th>
                <th scope="col" className="px-4 py-3">
                  Safety Threshold
                </th>
                <th scope="col" className="px-4 py-3">
                  Inventory Status
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground font-mono text-xs">
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isLow = product.stock_quantity <= product.min_stock_level;
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
                          ID: {product.id}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs font-mono capitalize text-muted-foreground">
                        {product.unit}
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-base font-bold text-foreground">
                          {product.stock_quantity}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          {product.unit}s
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                        min {product.min_stock_level}
                      </td>
                      <td className="px-4 py-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 font-mono">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 font-mono">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            Optimal
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isManager ? (
                          <button
                            type="button"
                            onClick={() => setSelectedProductForAdjust(product)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary hover:border-primary/50 transition-colors"
                          >
                            <SlidersHorizontal className="h-3 w-3" />
                            <span>Adjust Stock</span>
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">
                            View only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadProducts}
      />

      <AdjustStockModal
        product={selectedProductForAdjust}
        isOpen={!!selectedProductForAdjust}
        onClose={() => setSelectedProductForAdjust(null)}
        onSuccess={loadProducts}
      />
    </div>
  );
}
