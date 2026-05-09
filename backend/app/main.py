from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import auth, orders, containers, esg, vendor_applications, packaging_types, vendor_esg, esg_methods, carbon


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="B2B Circular Lunch Platform — Backend", lifespan=lifespan)

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
app.include_router(vendor_applications.router, prefix="/api")
app.include_router(packaging_types.router, prefix="/api")
app.include_router(vendor_esg.router, prefix="/api")
app.include_router(esg_methods.router, prefix="/api")
app.include_router(carbon.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
