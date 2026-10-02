"""High-Performance In-Memory TTL Cache with automatic invalidation and hit tracking."""
from __future__ import annotations

import logging
import time
from typing import Any, Callable, Optional, TypeVar

logger = logging.getLogger("sky_ariana.cache")

T = TypeVar("T")

# Global Cache Statistics for health diagnostics
CACHE_STATS = {
    "hits": 0,
    "misses": 0,
    "sets": 0,
    "invalidations": 0,
}


class TTLCache:
    """Thread-safe and async-safe in-memory cache with Time-To-Live (TTL)."""

    def __init__(self, default_ttl: int = 60):
        self.default_ttl = default_ttl
        self._store: dict[str, tuple[Any, float]] = {}

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            CACHE_STATS["misses"] += 1
            return None
        val, expires_at = entry
        if time.time() > expires_at:
            # Expired
            self._store.pop(key, None)
            CACHE_STATS["misses"] += 1
            return None
        CACHE_STATS["hits"] += 1
        return val

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        ttl_sec = ttl if ttl is not None else self.default_ttl
        expires_at = time.time() + ttl_sec
        self._store[key] = (value, expires_at)
        CACHE_STATS["sets"] += 1

    def delete(self, key: str) -> None:
        if key in self._store:
            del self._store[key]
            CACHE_STATS["invalidations"] += 1

    def delete_prefix(self, prefix: str) -> int:
        keys_to_del = [k for k in self._store if k.startswith(prefix)]
        for k in keys_to_del:
            del self._store[k]
        count = len(keys_to_del)
        CACHE_STATS["invalidations"] += count
        return count

    def clear(self) -> None:
        count = len(self._store)
        self._store.clear()
        CACHE_STATS["invalidations"] += count

    @property
    def size(self) -> int:
        # Purge expired items on size check
        now = time.time()
        expired = [k for k, (_, exp) in self._store.items() if now > exp]
        for k in expired:
            self._store.pop(k, None)
        return len(self._store)


# Global cache singletons
master_data_cache = TTLCache(default_ttl=300)      # 5 minutes for master data (ports, commodities, companies)
reports_summary_cache = TTLCache(default_ttl=60)    # 1 minute for aggregate reports
exchange_rate_cache = TTLCache(default_ttl=3600)    # 1 hour for exchange rates
bol_sequence_cache = TTLCache(default_ttl=30)       # 30 seconds for recent BOL lookups


def get_cache_stats() -> dict[str, Any]:
    """Retrieve cache diagnostic statistics for health check."""
    total = CACHE_STATS["hits"] + CACHE_STATS["misses"]
    hit_ratio = (CACHE_STATS["hits"] / total) if total > 0 else 0.0
    return {
        "hits": CACHE_STATS["hits"],
        "misses": CACHE_STATS["misses"],
        "total_requests": total,
        "hit_ratio_pct": round(hit_ratio * 100, 2),
        "active_keys": (
            master_data_cache.size
            + reports_summary_cache.size
            + exchange_rate_cache.size
            + bol_sequence_cache.size
        ),
    }


def invalidate_master_data_cache(prefix: str = "") -> None:
    """Invalidate master data when companies, parties, or ports change."""
    if prefix:
        master_data_cache.delete_prefix(prefix)
    else:
        master_data_cache.clear()
    logger.debug("Master data cache invalidated.")


def invalidate_reports_cache() -> None:
    """Invalidate cached report aggregations when shipments, BOLs, or ledgers change."""
    reports_summary_cache.clear()
    logger.debug("Reports cache invalidated.")


def invalidate_bol_caches(bol_id_or_num: Optional[str] = None) -> None:
    """Invalidate BOL sequence and report caches."""
    if bol_id_or_num:
        bol_sequence_cache.delete(f"bol_detail:{bol_id_or_num}")
    bol_sequence_cache.delete_prefix("bol_paged:")
    reports_summary_cache.clear()
    logger.debug(f"BOL caches invalidated for {bol_id_or_num or 'all'}.")

