from __future__ import annotations

import collections
import contextvars
import logging
import time
from typing import Any, Deque, Dict, List
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("sky_ariana.performance")

# Context variables for per-request database metric accumulation
req_db_time_ms: contextvars.ContextVar[float] = contextvars.ContextVar("req_db_time_ms", default=0.0)
req_query_count: contextvars.ContextVar[int] = contextvars.ContextVar("req_query_count", default=0)

# Ring buffer for diagnostics endpoint (retains last 100 entries)
RECENT_SLOW_QUERIES: Deque[Dict[str, Any]] = collections.deque(maxlen=100)
RECENT_REQUEST_STATS: Deque[Dict[str, Any]] = collections.deque(maxlen=200)


def record_query_metric(statement: str, duration_ms: float) -> None:
    """Record query timing from SQLAlchemy cursor execute hook."""
    try:
        curr_db = req_db_time_ms.get()
        req_db_time_ms.set(curr_db + duration_ms)
        curr_cnt = req_query_count.get()
        req_query_count.set(curr_cnt + 1)
    except Exception:
        pass

    if duration_ms > 300.0:
        clean_stmt = " ".join(statement.split())
        logger.warning(f"[SLOW QUERY] {clean_stmt[:120]}... {duration_ms:.1f}ms")
        RECENT_SLOW_QUERIES.append({
            "statement": clean_stmt[:250],
            "duration_ms": round(duration_ms, 2),
            "timestamp": time.time(),
        })


def get_diagnostics_metrics() -> Dict[str, Any]:
    """Retrieve ring-buffer performance statistics for developers and health endpoints."""
    req_list = list(RECENT_REQUEST_STATS)
    total_reqs = len(req_list)
    avg_total_ms = (
        round(sum(r["total_ms"] for r in req_list) / total_reqs, 2)
        if total_reqs > 0
        else 0.0
    )
    avg_db_ms = (
        round(sum(r["db_ms"] for r in req_list) / total_reqs, 2)
        if total_reqs > 0
        else 0.0
    )

    slow_apis = [r for r in req_list if r["total_ms"] > 500.0]

    return {
        "recent_request_count": total_reqs,
        "avg_total_latency_ms": avg_total_ms,
        "avg_db_latency_ms": avg_db_ms,
        "slow_api_count": len(slow_apis),
        "recent_slow_queries_count": len(RECENT_SLOW_QUERIES),
        "recent_slow_queries": list(RECENT_SLOW_QUERIES)[-10:],
    }


class PerformanceTimingMiddleware(BaseHTTPMiddleware):
    """Middleware measuring request latency, database query time, serialization time, and appending diagnostic headers."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Reset context metrics for this request
        req_db_time_ms.set(0.0)
        req_query_count.set(0)

        start_time = time.perf_counter()
        response = await call_next(request)
        process_time_sec = time.perf_counter() - start_time
        total_ms = process_time_sec * 1000.0

        db_ms = req_db_time_ms.get()
        app_ms = max(0.0, total_ms - db_ms)
        q_count = req_query_count.get()

        # Custom diagnostic headers
        response.headers["X-Process-Time"] = f"{total_ms:.2f}ms"
        response.headers["X-DB-Time"] = f"{db_ms:.2f}ms"
        response.headers["X-App-Time"] = f"{app_ms:.2f}ms"
        response.headers["X-Query-Count"] = str(q_count)
        response.headers["Server-Timing"] = (
            f"total;dur={total_ms:.2f}, db;dur={db_ms:.2f}, app;dur={app_ms:.2f}"
        )

        stat_entry = {
            "method": request.method,
            "path": request.url.path,
            "total_ms": round(total_ms, 2),
            "db_ms": round(db_ms, 2),
            "app_ms": round(app_ms, 2),
            "query_count": q_count,
            "status_code": response.status_code,
            "timestamp": time.time(),
        }
        RECENT_REQUEST_STATS.append(stat_entry)

        # Performance Logging as requested in Section 1
        path_str = f"{request.url.path}{'?' + str(request.url.query) if request.url.query else ''}"
        if total_ms > 500.0:
            logger.warning(
                f"[SLOW API] {request.method} {path_str} {total_ms:.1f}ms "
                f"(DB: {db_ms:.1f}ms, App/Ser: {app_ms:.1f}ms, Queries: {q_count})"
            )
        else:
            logger.info(
                f"[PERF] {request.method} {path_str:<32} {total_ms:6.1f}ms "
                f"(DB: {db_ms:5.1f}ms, App/Ser: {app_ms:5.1f}ms, Queries: {q_count})"
            )

        return response
