# Neba — Shop & Stock Management System

A stock and order management system for a garment/printing shop, demonstrating clean separation of concerns, strict business logic enforcement, and role-based data isolation between Sales and Management staff.

Built with **FastAPI** (Python) on the backend and **Next.js** (TypeScript + Tailwind CSS) on the frontend.

---

## 1. Quick Start Guide

### Prerequisites
- Python 3.13+ with [`uv`](https://docs.astral.sh/uv/) installed
- Node.js 20+ with [`pnpm`](https://pnpm.io/) installed

### Running the Backend
```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```
- API Base URL: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

### Running Backend Tests
```bash
cd backend
uv run pytest
```
All 14 integration and business logic tests will execute against in-memory stores.

### Running the Frontend
```bash
cd frontend
pnpm install
pnpm dev
```
- Frontend Web App: `http://localhost:3000`

---

## 2. Seed Data & User Roles

No database setup or registration is required. On startup, the backend pre-seeds 3 users and 4 workshop products into memory:

| User | ID | Role | Capabilities & Scope |
|---|---|---|---|
| **Sales Person 1** | `u1` | `sales` | Create multi-line orders, view and complete/cancel **only their own** orders, view stock & low-stock alerts |
| **Sales Person 2** | `u2` | `sales` | Same as Sales Person 1, with strict data isolation to **their own** orders |
| **Manager** | `u3` | `manager` | Everything Sales can do, plus view **all company orders**, add products, manually adjust stock in/out, and access the Financial Dashboard |

*Note:* You can switch between active users at any time using the role dropdown in the top navigation bar. The frontend automatically attaches the selected user's ID via the `X-User-ID` HTTP header on every request.

---

## 3. Architecture & Code Structure

The project strictly follows a layered separation of concerns:

```
BekayTest/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app initialization, CORS, router mounting
│   │   ├── deps.py              # Declarative role and user dependencies (X-User-ID validation)
│   │   ├── schemas.py           # Pydantic domain models, DTOs, and status types
│   │   ├── store.py             # 5 flat in-memory data dictionaries and seed data
│   │   └── routers/
│   │       ├── users.py         # GET /users (role switcher options)
│   │       ├── products.py      # GET /products, GET /products/low-stock, POST /products, POST /products/{id}/stock
│   │       ├── orders.py        # GET /orders, POST /orders, PATCH /orders/{id}/status
│   │       └── dashboard.py     # GET /dashboard (order volume & realized revenue)
│   └── tests/
│       ├── test_store.py        # Store seeding and schema validation tests
│       ├── test_products.py     # Product CRUD, manual stock adjustment, and 403 role tests
│       ├── test_orders.py       # Stock deduction, cancellation reversal, and role scoping tests
│       └── test_dashboard.py    # Revenue calculation and manager-only gate tests
└── frontend/
    └── src/
        ├── app/
        │   ├── layout.tsx       # Root layout with UserProvider and Navbar
        │   ├── page.tsx         # Redirect to /products
        │   ├── products/        # Inventory catalog and manager controls
        │   ├── low-stock/       # Dedicated shortage threshold monitor
        │   ├── orders/          # Role-filtered order list and status actions
        │   ├── orders/new/      # Multi-line order builder with real-time stock alerts
        │   └── dashboard/       # Manager financial and operations analytics
        ├── components/
        │   ├── Navbar.tsx       # Navigation header with active role switcher
        │   ├── AddProductModal.tsx # Manager product creation modal
        │   └── AdjustStockModal.tsx # Manager manual stock in/out adjustment modal
        ├── context/
        │   └── UserContext.tsx  # Global active user and role state provider
        ├── lib/
        │   └── api.ts           # Central fetch client with automatic X-User-ID injection
        └── types/
            └── index.ts         # TypeScript interfaces matching backend models
```

---

## 4. Key Business Logic Rules

1. **Stock Deduction Timing:**
   Stock is deducted **at order creation** (`pending` status) rather than upon completion. This commits inventory to the customer immediately and prevents overselling without requiring a complex reservation lock.
2. **Cancellation Stock Reversal & Audit Log:**
   Cancelling an order changes the order status to `cancelled`, restores the deducted quantity to product stock, and appends a **new positive movement** (`delta > 0`, `reason = "order_cancelled"`). **Existing stock movements are never mutated or deleted**, preserving a 100% immutable audit trail.
3. **Status Flow & Terminal States:**
   Orders transition strictly:
   $$\text{Pending} \longrightarrow \text{Completed}$$
   $$\text{Pending} \longrightarrow \text{Cancelled}$$
   `Completed` and `Cancelled` are terminal states. Attempting to transition a closed order returns `400 Bad Request`.
4. **Realized Revenue Calculation:**
   $$\text{Total Revenue} = \sum_{\text{completed orders}} (\text{quantity} \times \text{unit\_price})$$
   Pending orders (unfulfilled) and cancelled orders (uncollected/refunded) contribute 0.00 ETB to realized revenue.
5. **Defense-in-Depth Role Enforcement:**
   - **Frontend:** Action buttons (Add Product, Adjust Stock) and the Dashboard link are hidden from Sales staff.
   - **Backend:** Every protected endpoint checks the acting user's role via declarative dependencies (`deps.py`). Unauthorized attempts return `403 Forbidden`.

---

## 5. What Would Be Done Differently With More Time

1. **Persistent Database with ACID Transactions:** Replace in-memory dictionaries with PostgreSQL and SQLAlchemy to guarantee transactional atomicity during order creation and stock deduction.
2. **Production Authentication:** Replace the header-based mock user switcher with JWT bearer tokens and secure HTTP-only cookies.
3. **Stock Reservation Engine:** Implement temporary reservation holds with TTL expiration (e.g. Redis) during checkout before final order confirmation.
4. **End-to-End Testing:** Add Playwright or Cypress E2E browser tests to validate frontend role switching and order placement workflows.
5. **Pagination & Date Range Filtering:** Add cursor pagination and date-range filters to `GET /orders` and the Manager Dashboard.
