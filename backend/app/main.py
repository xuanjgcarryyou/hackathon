from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, orders, containers, esg

app = FastAPI(title="B2B Circular Lunch Platform — Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(orders.router, prefix="/api")
app.include_router(containers.router, prefix="/api")
app.include_router(esg.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
