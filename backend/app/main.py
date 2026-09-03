from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import dashboard, orders, products, users

app = FastAPI(
    title="Neba Shop & Stock Management API",
    version="0.1.0",
    description="In-memory shop and stock management system for garments and printing.",
)

# Allow frontend requests (Next.js default port 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(users.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}
