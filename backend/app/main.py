import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import engine, get_db
from app.routers import auth, products, categories, customers, suppliers

logging.basicConfig(
    level=logging.INFO if settings.is_production else logging.DEBUG,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("businessiq")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting BusinessIQ API (%s)", settings.environment)
    yield
    await engine.dispose()  # close database connections cleanly on shutdown


app = FastAPI(
    title="BusinessIQ API",
    version="0.1.0",
    lifespan=lifespan,
    # Hide the interactive docs in production so the API surface isn't advertised.
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,  # we use Bearer tokens in a header, not cookies
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Organization-Id"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Log the full error for us; give the caller nothing that leaks internals.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/health/db")
async def health_db(db: AsyncSession = Depends(get_db)):
    await db.execute(text("select 1"))
    return {"status": "ok"}


# Every business route lives under /api/v1. Add new routers here, one line each.
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(categories.router)
app.include_router(customers.router)
app.include_router(suppliers.router)

