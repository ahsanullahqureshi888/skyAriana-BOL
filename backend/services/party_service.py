"""Party search service with LRU recent cache and fast prefix indexing."""
from __future__ import annotations

import collections
from typing import List, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.schemas.parties import PartySearchItem
from backend.services.cache_service import master_data_cache, invalidate_master_data_cache

# In-memory recent party cache for ultra-fast selection (last 10 per role)
_RECENT_CACHE: dict[str, collections.deque[PartySearchItem]] = {
    "SHIPPER": collections.deque(maxlen=10),
    "CONSIGNEE": collections.deque(maxlen=10),
    "NOTIFY_PARTY": collections.deque(maxlen=10),
    "CUSTOMER": collections.deque(maxlen=10),
}


def record_recent_party(item: PartySearchItem) -> None:
    """Store party in recent cache, avoiding duplicates."""
    role = item.role.upper()
    if role not in _RECENT_CACHE:
        _RECENT_CACHE[role] = collections.deque(maxlen=10)
    deck = _RECENT_CACHE[role]
    for i, existing in enumerate(list(deck)):
        if existing.id == item.id:
            del deck[i]
            break
    deck.appendleft(item)


def get_recent_parties(role: Optional[str] = None) -> List[PartySearchItem]:
    """Retrieve cached recent parties for instant selector rendering."""
    if role and role.upper() in _RECENT_CACHE:
        return list(_RECENT_CACHE[role.upper()])
    all_recent: list[PartySearchItem] = []
    for r, deck in _RECENT_CACHE.items():
        all_recent.extend(deck)
    return all_recent[:20]


def invalidate_recent_party_cache(role: Optional[str] = None) -> None:
    """Invalidate recent party cache after record changes (Section 5)."""
    if role and role.upper() in _RECENT_CACHE:
        _RECENT_CACHE[role.upper()].clear()
    else:
        for deck in _RECENT_CACHE.values():
            deck.clear()
    invalidate_master_data_cache("parties_search")


async def search_parties(
    db: AsyncSession,
    query: Optional[str] = None,
    role: Optional[str] = None,
    limit: int = 20,
) -> List[PartySearchItem]:
    """Search parties across Shippers, Consignees, Notify Parties, and Customers via ultra-fast SQL."""
    clean_q = (query or "").strip()
    clean_role = (role or "").strip().upper()

    cache_key = f"parties_search:{clean_role}:{clean_q}:{limit}"
    cached_parties = master_data_cache.get(cache_key)
    if cached_parties is not None:
        return cached_parties

    if not clean_q:
        recent = get_recent_parties(clean_role)
        if recent:
            return recent[:limit]

    results: list[PartySearchItem] = []
    limit = max(1, min(limit, 50))
    params = {"p_like": f"{clean_q}%", "s_like": f"%{clean_q}%", "limit": limit}

    # 1. Shippers (direct SQL join with company)
    if not clean_role or clean_role in ("SHIPPER", "ALL"):
        sql = """
            SELECT s.id, s.name, s.code, c.company_name, s.contact_person, s.phone, s.email, s.address, s.city, s.country
            FROM shippers s
            LEFT JOIN companies c ON s.company_id = c.id
            WHERE s.name LIKE :p_like OR s.name LIKE :s_like OR s.phone LIKE :p_like
            ORDER BY s.name ASC
            LIMIT :limit;
        """
        rows = (await db.execute(text(sql), params)).all()
        for r in rows:
            results.append(
                PartySearchItem(
                    id=r[0],
                    name=r[1],
                    role="SHIPPER",
                    code=r[2],
                    company_name=r[3],
                    contact_person=r[4],
                    phone=r[5],
                    email=r[6],
                    address=r[7],
                    city=r[8],
                    country=r[9],
                )
            )

    # 2. Consignees (direct SQL join with company)
    if (not clean_role or clean_role in ("CONSIGNEE", "ALL")) and len(results) < limit:
        c_limit = limit - len(results)
        c_params = {**params, "limit": c_limit}
        sql = """
            SELECT c.id, c.name, c.code, comp.company_name, c.contact_person, c.phone, c.email, c.address, c.city, c.country
            FROM consignees c
            LEFT JOIN companies comp ON c.company_id = comp.id
            WHERE c.name LIKE :p_like OR c.name LIKE :s_like OR c.phone LIKE :p_like
            ORDER BY c.name ASC
            LIMIT :limit;
        """
        rows = (await db.execute(text(sql), c_params)).all()
        for r in rows:
            results.append(
                PartySearchItem(
                    id=r[0],
                    name=r[1],
                    role="CONSIGNEE",
                    code=r[2],
                    company_name=r[3],
                    contact_person=r[4],
                    phone=r[5],
                    email=r[6],
                    address=r[7],
                    city=r[8],
                    country=r[9],
                )
            )

    # 3. Notify Parties
    if (not clean_role or clean_role in ("NOTIFY_PARTY", "ALL")) and len(results) < limit:
        n_limit = limit - len(results)
        n_params = {**params, "limit": n_limit}
        sql = """
            SELECT n.id, n.name, n.contact_person, n.phone, n.email, n.address
            FROM notify_parties n
            WHERE n.name LIKE :p_like OR n.name LIKE :s_like OR n.phone LIKE :p_like
            ORDER BY n.name ASC
            LIMIT :limit;
        """
        rows = (await db.execute(text(sql), n_params)).all()
        for r in rows:
            results.append(
                PartySearchItem(
                    id=r[0],
                    name=r[1],
                    role="NOTIFY_PARTY",
                    contact_person=r[2],
                    phone=r[3],
                    email=r[4],
                    address=r[5],
                    city=None,
                    country=None,
                )
            )

    # 4. Customers
    if (not clean_role or clean_role in ("CUSTOMER", "ALL")) and len(results) < limit:
        cust_limit = limit - len(results)
        cust_params = {**params, "limit": cust_limit}
        sql = """
            SELECT cust.id, cust.customer_name, cust.company, cust.phone, cust.email, cust.address
            FROM customers cust
            WHERE cust.customer_name LIKE :p_like OR cust.customer_name LIKE :s_like OR cust.phone LIKE :p_like
            ORDER BY cust.customer_name ASC
            LIMIT :limit;
        """
        rows = (await db.execute(text(sql), cust_params)).all()
        for r in rows:
            results.append(
                PartySearchItem(
                    id=r[0],
                    name=r[1],
                    role="CUSTOMER",
                    company_name=r[2],
                    phone=r[3],
                    email=r[4],
                    address=r[5],
                )
            )

    master_data_cache.set(cache_key, results, ttl=120)
    return results
