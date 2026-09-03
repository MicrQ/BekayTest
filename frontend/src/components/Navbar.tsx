"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";
import {
  Package,
  ShoppingCart,
  PlusCircle,
  BarChart3,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { users, currentUser, switchUser, isLoading } = useUser();

  const isManager = currentUser?.role === "manager";

  const navLinks = [
    {
      label: "Products",
      href: "/products",
      icon: Package,
      visible: true,
    },
    {
      label: "Low Stock",
      href: "/low-stock",
      icon: AlertTriangle,
      visible: true,
    },
    {
      label: "Orders",
      href: "/orders",
      icon: ShoppingCart,
      visible: true,
    },
    {
      label: "New Order",
      href: "/orders/new",
      icon: PlusCircle,
      visible: true,
    },
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: BarChart3,
      visible: isManager, // Strictly hidden from sales users
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Workshop identity */}
        <div className="flex items-center gap-6">
          <Link
            href="/products"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black tracking-tight text-lg shadow-sm">
              N
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-foreground block leading-tight">
                Neba
              </span>
              <span className="text-xs text-muted-foreground font-mono tracking-normal block leading-none">
                Garment & Print ERP
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {navLinks
              .filter((item) => item.visible)
              .map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/products" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-secondary text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </nav>
        </div>

        {/* User Role Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card p-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 px-2 text-xs font-mono text-muted-foreground">
              {isManager ? (
                <ShieldCheck className="h-4 w-4 text-primary" />
              ) : (
                <UserCheck className="h-4 w-4 text-amber-500" />
              )}
              <span className="hidden sm:inline">Role:</span>
              <span
                className={cn(
                  "font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-[10px]",
                  isManager
                    ? "bg-primary/20 text-foreground border border-primary/40 font-mono"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono"
                )}
              >
                {currentUser?.role || "..."}
              </span>
            </div>

            <label htmlFor="user-switcher" className="sr-only">
              Switch Active User
            </label>
            <select
              id="user-switcher"
              value={currentUser?.id || ""}
              onChange={(e) => switchUser(e.target.value)}
              disabled={isLoading || users.length === 0}
              className="bg-transparent text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring rounded px-2 py-1 cursor-pointer"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-popover text-popover-foreground">
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="flex md:hidden overflow-x-auto border-t border-border px-4 py-2 gap-2 scrollbar-none">
        {navLinks
          .filter((item) => item.visible)
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-secondary/40"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
      </div>
    </header>
  );
}
