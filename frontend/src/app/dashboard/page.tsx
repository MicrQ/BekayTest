"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { api, ApiError } from "@/lib/api";
import { DashboardSummary } from "@/types";
import {
  BarChart3,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Package,
  ShoppingCart,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { currentUser, users, switchUser } = useUser();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isManager = currentUser?.role === "manager";

  const loadDashboard = useCallback(async () => {
    if (!currentUser || !isManager) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getDashboard(currentUser.id);
      setSummary(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load dashboard metrics.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isManager]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // If active user is Sales, display clear 403 Forbidden role gate
  if (!isManager) {
    const managerUser = users.find((u) => u.role === "manager");

    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="rounded-2xl border border-destructive/30 bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-destructive font-bold">
            HTTP 403 Forbidden
          </span>
          <h1 className="text-xl font-bold tracking-tight text-foreground mt-2">
            Manager Access Required
          </h1>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            You are currently logged in as <strong className="text-foreground">{currentUser?.name}</strong> ({currentUser?.role}). Financial reporting and company-wide revenue metrics are restricted exclusively to management.
          </p>

          <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-center gap-3">
            {managerUser && (
              <button
                type="button"
                onClick={() => switchUser(managerUser.id)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                <UserCheck className="h-4 w-4" />
                <span>Switch to {managerUser.name} (Manager)</span>
              </button>
            )}

            <Link
              href="/orders"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              <span>Back to My Orders</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const counts = summary?.orders_by_status || {
    pending: 0,
    completed: 0,
    cancelled: 0,
  };
  const totalOrders = counts.pending + counts.completed + counts.cancelled;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Manager Financial & Operations Dashboard
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Realized shop revenue, fulfillment order metrics, and business volume.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Primary Financial Metric Banner */}
      <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-card to-secondary/30 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              <DollarSign className="h-4 w-4 text-primary" />
              <span>Realized Shop Revenue</span>
            </div>
            <div className="mt-2 text-4xl sm:text-5xl font-black font-mono tracking-tight text-foreground">
              ${summary ? summary.total_revenue.toFixed(2) : "0.00"}
            </div>
            <p className="mt-2 text-xs text-muted-foreground max-w-lg leading-relaxed">
              Sum of completed customer orders <span className="font-mono font-semibold">(&Sigma; qty &times; unit_price)</span>. Unfulfilled pending orders and cancelled orders are excluded from realized revenue.
            </p>
          </div>

          <div className="flex sm:flex-col items-start sm:items-end gap-2 text-xs font-mono">
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-700 dark:text-emerald-300">
              {counts.completed} Fulfilled Orders
            </span>
            <span className="text-muted-foreground text-[11px]">
              {totalOrders > 0
                ? `${((counts.completed / totalOrders) * 100).toFixed(0)}% completion rate`
                : "No orders yet"}
            </span>
          </div>
        </div>
      </div>

      {/* Order Status Distribution Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Completed */}
        <div className="rounded-xl border border-emerald-500/30 bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-emerald-600 dark:text-emerald-400">
            <span>Completed Orders</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3 text-3xl font-extrabold font-mono text-foreground">
            {counts.completed}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Fulfilled and billed to customers
          </p>
        </div>

        {/* Pending */}
        <div className="rounded-xl border border-amber-500/30 bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-amber-600 dark:text-amber-400">
            <span>Pending Orders</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 text-3xl font-extrabold font-mono text-foreground">
            {counts.pending}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Stock deducted; awaiting fulfillment
          </p>
        </div>

        {/* Cancelled */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground">
            <span>Cancelled Orders</span>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3 text-3xl font-extrabold font-mono text-foreground">
            {counts.cancelled}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Stock reversed via positive audit movement
          </p>
        </div>
      </div>

      {/* Operations Quick Links */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono mb-4">
          Quick Shop Navigation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/orders"
            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Manage Orders
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/products"
            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Stock Catalog
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/low-stock"
            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">
                Low Stock Alerts
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
}
