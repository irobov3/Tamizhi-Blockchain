"""
Tamizhi AI Service — FastAPI Application Entry Point
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from .routes import chat, literature_qa
from .utils.config import settings

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("tamizhi.ai")

# ── Redis client (module-level, shared) ───────────────────────────────────────

redis_client: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    """Dependency-injection helper for getting the Redis client."""
    if redis_client is None:
        raise RuntimeError("Redis client not initialized")
    return redis_client


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Handle startup and shutdown events."""
    global redis_client

    # Startup
    logger.info("Starting Tamizhi AI Service…")
    try:
        redis_client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            db=getattr(settings, "redis_db", 1),
        )
        await redis_client.ping()
        logger.info(f"Redis connected: {settings.redis_url}")
    except Exception as exc:
        logger.warning(f"Redis connection failed (continuing without cache): {exc}")
        redis_client = None

    # Store on app.state so routes can access it
    app.state.redis = redis_client

    logger.info(f"Default model: {settings.default_model}")
    logger.info("Tamizhi AI Service ready")

    yield  # Application runs here

    # Shutdown
    logger.info("Shutting down Tamizhi AI Service…")
    if redis_client:
        await redis_client.aclose()
        logger.info("Redis disconnected")


# ── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Tamizhi AI Service",
    description=(
        "Tamil-first AI assistant for the Tamizhi blockchain ecosystem. "
        "Provides chat, Tamil literature Q&A, and translation endpoints."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────

cors_origins = [o.strip() for o in settings.cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(literature_qa.router, prefix="/literature", tags=["Literature Q&A"])

# ── Root / Health ─────────────────────────────────────────────────────────────


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Service health check endpoint."""
    redis_ok = False
    if app.state.redis:
        try:
            await app.state.redis.ping()
            redis_ok = True
        except Exception:
            redis_ok = False

    return {
        "status": "ok",
        "service": "tamizhi-ai",
        "version": "1.0.0",
        "default_model": settings.default_model,
        "redis": "connected" if redis_ok else "disconnected",
    }


@app.get("/", tags=["Health"])
async def root() -> dict:
    """Root endpoint — returns service info."""
    return {
        "service": "Tamizhi AI Service",
        "description": "Tamil-first AI assistant",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "chat": "/chat/message",
            "stream": "/chat/stream",
            "literature_qa": "/literature/ask",
        },
    }
