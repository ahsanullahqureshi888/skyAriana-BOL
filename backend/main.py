from __future__ import annotations

import contextlib
import logging
import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from backend.config import settings
from backend.database import init_db
from backend.logging_config import setup_logging
from backend.middleware.timing import PerformanceTimingMiddleware
from backend.routes import (
    backups_router,
    bols_router,
    companies_router,
    containers_router,
    customers_router,
    ledgers_router,
    parties_router,
    reports_router,
    shipments_router,
    system_router,
    documents_router,
    jobs_router,
    auth_router,
    audit_router,
)

logger = setup_logging()


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown lifecycle."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} (Env: {settings.APP_ENV})")
    logger.info(f"App Data Directory: {settings.resolved_data_dir}")

    # Step 1: Crash Detection & Zero-Data-Loss Startup Check
    import os
    from backend.services.backup_service import (
        execute_startup_recovery_check,
        record_clean_shutdown,
        record_startup_session,
    )

    try:
        record_startup_session(os.getpid())
        startup_report = execute_startup_recovery_check()
        logger.info(f"Startup crash & recovery check status: {startup_report.get('status')} (Tables: {startup_report.get('table_count', 'N/A')}, Quick Check: {startup_report.get('quick_check', 'N/A')})")
        if startup_report.get("crashed_previously"):
            logger.warning("AQ COMPANIES recovered safely from an abnormal previous shutdown.")
    except Exception as exc:
        logger.error(f"Startup crash check encountered an issue: {exc}", exc_info=True)

    try:
        await init_db()
        logger.info("Database tables initialized successfully.")
    except Exception as exc:
        logger.error(f"Failed to initialize database during startup: {exc}", exc_info=True)
    yield
    # Record clean shutdown upon graceful exit
    try:
        record_clean_shutdown()
    except Exception:
        pass
    logger.info("Shutting down Sky Ariana backend gracefully.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Professional Python FastAPI Backend for Sky Ariana BOL, Logistics, and Ledgers.",
    lifespan=lifespan,
)

# 1. Performance Timing Middleware
app.add_middleware(PerformanceTimingMiddleware)


# 1.5 Maintenance Mode Middleware
@app.middleware("http")
async def maintenance_middleware(request: Request, call_next):
    if settings.MAINTENANCE_MODE and request.method not in ("GET", "HEAD", "OPTIONS"):
        if not request.url.path.startswith(("/health", "/ready", "/api/v1/system")):
            return JSONResponse(
                status_code=503,
                content={
                    "success": False,
                    "error": "Server is currently in maintenance mode. Data modifications are temporarily locked.",
                    "maintenance_mode": True,
                },
            )
    return await call_next(request)


# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception Handlers
@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"SQLAlchemy Database Error at {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal database error occurred",
            "detail": str(exc) if settings.DEBUG else "A database error occurred. Please contact administrator.",
            "source": "python-fastapi",
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error at {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "Request validation failed",
            "detail": exc.errors(),
            "source": "python-fastapi",
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception at {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred.",
            "source": "python-fastapi",
        },
    )


# System & Core API v1 routes
API_V1_PREFIX = "/api/v1"
app.include_router(system_router, prefix=API_V1_PREFIX)
app.include_router(bols_router, prefix=API_V1_PREFIX)
app.include_router(ledgers_router, prefix=API_V1_PREFIX)
app.include_router(companies_router, prefix=API_V1_PREFIX)
app.include_router(customers_router, prefix=API_V1_PREFIX)
app.include_router(shipments_router, prefix=API_V1_PREFIX)
app.include_router(reports_router, prefix=API_V1_PREFIX)
app.include_router(backups_router, prefix=API_V1_PREFIX)
app.include_router(parties_router, prefix=API_V1_PREFIX)
app.include_router(containers_router, prefix=API_V1_PREFIX)
app.include_router(documents_router, prefix=API_V1_PREFIX)
app.include_router(jobs_router, prefix=API_V1_PREFIX)
app.include_router(auth_router, prefix=API_V1_PREFIX)
app.include_router(audit_router, prefix=API_V1_PREFIX)

# Also expose root level /health and /ready for general probes
app.include_router(system_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
