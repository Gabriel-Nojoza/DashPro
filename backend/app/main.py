import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import settings
from app.database import engine, Base
from app.middleware.logging import RequestLoggingMiddleware

from app.routers.auth import router as auth_router
from app.routers.clients import router as clients_router
from app.routers.products import router as products_router
from app.routers.movements import router as movements_router
from app.routers.orders import router as orders_router
from app.routers.dashboard import router as dashboard_router
from app.routers.whatsapp import router as whatsapp_router
from app.routers.companies import router as companies_router
from app.routers.users import router as users_router
from app.routers.plans import router as plans_router, payments_router
from app.routers.reports import router as reports_router
from app.routers.obras import router as obras_router
from app.routers.orcamentos import router as orcamentos_router
from app.routers.compras import router as compras_router
from app.routers.financeiro import router as financeiro_router
from app.routers.trabalhadores import router as trabalhadores_router
from app.routers.documentos import router as documentos_router

import app.models  # noqa — ensure all models are registered

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger("dashpro")


async def _run_migrations():
    async with engine.begin() as conn:
        if settings.is_sqlite:
            # SQLite: check if column exists before adding
            result = await conn.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result.fetchall()]
            if "supervisor_id" not in columns:
                await conn.execute(text(
                    "ALTER TABLE users ADD COLUMN supervisor_id TEXT REFERENCES users(id)"
                ))
        else:
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL"
            ))
            await conn.execute(text(
                "ALTER TABLE companies ADD COLUMN IF NOT EXISTS ramo VARCHAR(50) DEFAULT 'comercio'"
            ))
            await conn.execute(text(
                "ALTER TABLE documentos ADD COLUMN IF NOT EXISTS category VARCHAR(100)"
            ))
            await conn.execute(text(
                "ALTER TABLE documentos ADD COLUMN IF NOT EXISTS expires_at VARCHAR(20)"
            ))


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("DashPro Business API starting...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _run_migrations()
    logger.info("Database tables ready.")
    try:
        from app.services.storage import ensure_bucket
        await ensure_bucket()
        logger.info("Storage bucket ready.")
    except Exception as e:
        logger.warning(f"Storage bucket setup skipped: {e}")
    yield
    logger.info("DashPro Business API shutting down.")
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API REST para o sistema SaaS DashPro Business",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)

# Routers
app.include_router(auth_router)
app.include_router(clients_router)
app.include_router(products_router)
app.include_router(movements_router)
app.include_router(orders_router)
app.include_router(dashboard_router)
app.include_router(whatsapp_router)
app.include_router(companies_router)
app.include_router(users_router)
app.include_router(plans_router)
app.include_router(payments_router)
app.include_router(reports_router)
app.include_router(obras_router)
app.include_router(orcamentos_router)
app.include_router(compras_router)
app.include_router(financeiro_router)
app.include_router(trabalhadores_router)
app.include_router(documentos_router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
