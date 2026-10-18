"""High-Performance Bill of Lading (BOL) service with lightweight lists, pagination, and concurrency."""
from __future__ import annotations

import datetime
from decimal import Decimal
import re
from typing import Any, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from backend.models.base import generate_uuid
from backend.models.logistics import (
    BOLItemModel,
    BOLModel,
    ContainerModel,
    DriverModel,
    ShipmentModel,
    TruckModel,
)
from backend.models.parties import CompanyModel, ConsigneeModel, NotifyPartyModel, ShipperModel
from backend.schemas.bol import (
    BOLCheckNumberResponse,
    BOLCreateRequest,
    BOLDetail,
    BOLItemSchema,
    BOLListItem,
    BOLPatchRequest,
    BOLSaveResponse,
    BOLSummary,
    ContainerSchema,
    DocumentMetadataSchema,
)
from backend.schemas.placeholders import BOLResponse
from backend.services.cache_service import bol_sequence_cache, invalidate_bol_caches
from backend.services.party_service import invalidate_recent_party_cache

# Regex patterns for fast search routing
_CONTAINER_REGEX = re.compile(r"^[A-Z]{4}\d{7}$", re.IGNORECASE)
_BOL_NUM_REGEX = re.compile(r"^(BOL[-_]?)?[A-Z0-9]{3,20}$", re.IGNORECASE)


async def check_bol_number_exists(
    db: AsyncSession, bol_number: str, exclude_id: Optional[str] = None
) -> BOLCheckNumberResponse:
    """Fast indexed duplicate check for BOL numbers."""
    clean_num = bol_number.strip()
    stmt = select(BOLModel.id).where(func.lower(BOLModel.bol_number) == clean_num.lower())
    if exclude_id:
        stmt = stmt.where(BOLModel.id != exclude_id)
    res = await db.execute(stmt)
    matched_id = res.scalar_one_or_none()
    return BOLCheckNumberResponse(
        exists=bool(matched_id),
        bol_number=clean_num,
        matched_id=matched_id,
    )


async def list_bols_paged(
    db: AsyncSession,
    q: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    company_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    shipper: Optional[str] = None,
    consignee: Optional[str] = None,
    notify_party: Optional[str] = None,
) -> Tuple[List[BOLListItem], int, int]:
    """Retrieve lightweight BOL list with true server-side pagination and indexed search priority."""
    page = max(1, page)
    page_size = max(1, min(page_size, 100))
    offset = (page - 1) * page_size

    clean_q = (q or "").strip()
    cache_key = f"bol_paged:{page}:{page_size}:{clean_q}:{company_id}:{status_filter}:{date_from}:{date_to}:{shipper}:{consignee}:{notify_party}"
    cached = bol_sequence_cache.get(cache_key)
    if cached is not None:
        return cached

    filters = []

    # Apply indexed filters
    if company_id:
        filters.append(BOLModel.company_id == company_id)
    if status_filter:
        filters.append(BOLModel.status == status_filter)
    if date_from:
        filters.append(BOLModel.issue_date >= date_from)
    if date_to:
        filters.append(BOLModel.issue_date <= date_to)
    if shipper:
        filters.append(BOLModel.shipper_name.ilike(f"%{shipper.strip()}%"))
    if consignee:
        filters.append(BOLModel.consignee_name.ilike(f"%{consignee.strip()}%"))
    if notify_party:
        filters.append(BOLModel.notify_party_name.ilike(f"%{notify_party.strip()}%"))

    # Search Priority (Section 12)
    if clean_q:
        # Container subquery
        container_subq = (
            select(ContainerModel.bol_id)
            .where(ContainerModel.container_number.ilike(f"%{clean_q}%"))
            .scalar_subquery()
        )
        # Truck subquery
        truck_subq = (
            select(TruckModel.id)
            .where(TruckModel.truck_number.ilike(f"%{clean_q}%"))
            .scalar_subquery()
        )

        clean_stripped = clean_q.replace("-", "").replace(" ", "")

        search_or_conditions = [
            BOLModel.bol_number == clean_q,
            BOLModel.bol_number.ilike(f"%{clean_q}%"),
            BOLModel.driver_name.ilike(f"%{clean_q}%"),
            BOLModel.father_name.ilike(f"%{clean_q}%"),
            BOLModel.shipper_name.ilike(f"%{clean_q}%"),
            BOLModel.consignee_name.ilike(f"%{clean_q}%"),
            BOLModel.notify_party_name.ilike(f"%{clean_q}%"),
            BOLModel.cargo_description.ilike(f"%{clean_q}%"),
            BOLModel.origin.ilike(f"%{clean_q}%"),
            BOLModel.destination.ilike(f"%{clean_q}%"),
            BOLModel.border_station.ilike(f"%{clean_q}%"),
            BOLModel.truck_id.in_(truck_subq),
            BOLModel.id.in_(container_subq),
        ]

        if clean_stripped != clean_q and len(clean_stripped) >= 3:
            search_or_conditions.append(BOLModel.bol_number.ilike(f"%{clean_stripped}%"))

        filters.append(or_(*search_or_conditions))

    where_clause = and_(*filters) if filters else True

    # Fast Count Query
    count_stmt = select(func.count(BOLModel.id)).where(where_clause)
    total = (await db.execute(count_stmt)).scalar() or 0

    # Lightweight Select Query (Only required columns)
    query_stmt = (
        select(
            BOLModel.id,
            BOLModel.bol_number,
            BOLModel.issue_date,
            BOLModel.status,
            BOLModel.shipper_name,
            BOLModel.consignee_name,
            BOLModel.driver_name,
            BOLModel.carton_count,
            BOLModel.gross_weight_kg,
            BOLModel.net_weight_kg,
            BOLModel.freight_fee,
            BOLModel.currency,
            BOLModel.origin,
            BOLModel.destination,
            BOLModel.border_station,
            BOLModel.revision,
            BOLModel.updated_at,
            BOLModel.company_id,
            BOLModel.driver_rent,
            BOLModel.cargo_description,
            TruckModel.truck_number,
        )
        .outerjoin(TruckModel, BOLModel.truck_id == TruckModel.id)
        .where(where_clause)
        .order_by(BOLModel.created_at.desc(), BOLModel.id.desc())
        .offset(offset)
        .limit(page_size)
    )

    rows = (await db.execute(query_stmt)).all()

    items: list[BOLListItem] = []
    for r in rows:
        route_sum = f"{r.origin} -> {r.border_station}" if r.origin else r.border_station
        if r.destination:
            route_sum += f" -> {r.destination}"

        items.append(
            BOLListItem(
                id=r.id,
                bol_number=r.bol_number,
                issue_date=r.issue_date.isoformat() if r.issue_date else None,
                status=r.status,
                shipper_name=r.shipper_name,
                consignee_name=r.consignee_name,
                route_summary=route_sum,
                driver_name=r.driver_name,
                carton_count=r.carton_count or 0,
                gross_weight_kg=float(r.gross_weight_kg or 0),
                net_weight_kg=float(r.net_weight_kg or 0),
                freight_fee=float(r.freight_fee or 0),
                currency=r.currency or "USD",
                updated_at=r.updated_at.isoformat() if r.updated_at else None,
                revision=r.revision or 1,
                truck_number=r.truck_number,
                cargo_description=r.cargo_description,
                number_of_packages=str(r.carton_count or 0),
                gross_weight=str(r.gross_weight_kg or 0),
                net_weight=str(r.net_weight_kg or 0),
                driver_rent=str(r.driver_rent or 0),
            )
        )

    pages = (total + page_size - 1) // page_size if total > 0 else 1
    result = (items, total, pages)
    bol_sequence_cache.set(cache_key, result, ttl=15)
    return result


async def get_bol_summary(db: AsyncSession) -> BOLSummary:
    """Aggregate KPI metrics (total BOLs, cartons, weight, goods value) computed at database level."""
    cache_key = "bol_summary_kpis"
    cached = bol_sequence_cache.get(cache_key)
    if cached is not None:
        return cached

    stmt = select(
        func.count(BOLModel.id),
        func.coalesce(func.sum(BOLModel.carton_count), 0),
        func.coalesce(func.sum(BOLModel.gross_weight_kg), 0),
        func.coalesce(func.sum(BOLModel.freight_fee), 0),
    ).where(BOLModel.status != "deleted")

    res = await db.execute(stmt)
    row = res.fetchone()
    total_bols = int(row[0] or 0) if row else 0
    total_pkgs = int(row[1] or 0) if row else 0
    total_wt = float(row[2] or 0.0) if row else 0.0
    total_val = float(row[3] or 0.0) if row else 0.0

    summary = BOLSummary(
        total_bols=total_bols,
        total_packages=total_pkgs,
        total_weight=total_wt,
        total_goods_value=total_val,
    )
    bol_sequence_cache.set(cache_key, summary, ttl=10)
    return summary


async def get_recent_bols(db: AsyncSession, limit: int = 6) -> List[BOLListItem]:
    """Retrieve top recent lightweight BOLs without loading heavy notes or binaries."""
    limit = max(1, min(limit, 20))
    cache_key = f"bol_recent_{limit}"
    cached = bol_sequence_cache.get(cache_key)
    if cached is not None:
        return cached

    items, _, _ = await list_bols_paged(db, page=1, page_size=limit)
    bol_sequence_cache.set(cache_key, items, ttl=10)
    return items


async def get_bol_detail(db: AsyncSession, bol_id_or_number: str) -> BOLDetail:
    """Retrieve full detail for a single BOL (including cargo items, containers, linked docs metadata)."""
    clean_id = bol_id_or_number.strip()
    cached = bol_sequence_cache.get(f"bol_detail:{clean_id}")
    if cached:
        return cached

    bol_sql = """
        SELECT b.id, b.bol_number, b.issue_date, b.origin, b.destination, b.border_station,
               b.driver_name, b.father_name, b.driver_rent, b.carton_count, b.gross_weight_kg,
               b.net_weight_kg, b.cargo_description, b.status, b.freight_fee, b.demurrage_fee,
               b.documentation_fee, b.currency, b.exchange_rate, b.company_id, b.shipper_id,
               b.consignee_id, b.notify_party_id, b.driver_id, b.truck_id, b.revision,
               b.created_at, b.updated_at,
               c.company_name,
               COALESCE(b.shipper_name, s.name) as shipper_name,
               COALESCE(b.consignee_name, cn.name) as consignee_name,
               COALESCE(b.notify_party_name, np.name) as notify_party_name,
               d.phone as driver_phone,
               COALESCE(tr.truck_number, '') as truck_number
        FROM bol_records b
        LEFT JOIN companies c ON b.company_id = c.id
        LEFT JOIN shippers s ON b.shipper_id = s.id
        LEFT JOIN consignees cn ON b.consignee_id = cn.id
        LEFT JOIN notify_parties np ON b.notify_party_id = np.id
        LEFT JOIN drivers d ON b.driver_id = d.id
        LEFT JOIN trucks tr ON b.truck_id = tr.id
        WHERE b.bol_number = :clean_id 
           OR b.id = :clean_id 
           OR b.bol_number LIKE '%' || :clean_id
           OR b.bol_number LIKE '%' || :clean_stripped
        ORDER BY (b.bol_number = :clean_id) DESC, (b.id = :clean_id) DESC, b.created_at DESC
        LIMIT 1;
    """
    clean_stripped = clean_id.replace("-", "").replace(" ", "")
    bol_res = await db.execute(text(bol_sql), {"clean_id": clean_id, "clean_stripped": clean_stripped})
    row = bol_res.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"BOL '{clean_id}' not found",
        )

    bol_id = row[0]

    # Sub items (items, containers, document metadata without heavy text blob)
    items_sql = """
        SELECT id, item_description, carton_count, gross_weight_kg, net_weight_kg, volume_cbm, package_type, commodity_id
        FROM bol_items WHERE bol_id = :bid
    """
    cont_sql = """
        SELECT id, container_number, container_type, seal_number, tare_weight_kg, max_payload_kg, status
        FROM containers WHERE bol_id = :bid
    """
    docs_sql = """
        SELECT id, title, document_type, file_size, mime_type, created_at
        FROM documents WHERE bol_id = :bid
    """
    items_rows = (await db.execute(text(items_sql), {"bid": bol_id})).fetchall()
    cont_rows = (await db.execute(text(cont_sql), {"bid": bol_id})).fetchall()
    docs_rows = (await db.execute(text(docs_sql), {"bid": bol_id})).fetchall()

    items_list = [
        BOLItemSchema(
            id=ir[0],
            item_description=ir[1] or "",
            carton_count=ir[2] or 0,
            gross_weight_kg=float(ir[3] or 0),
            net_weight_kg=float(ir[4] or 0),
            volume_cbm=float(ir[5] or 0),
            package_type=ir[6] or "cartons",
            commodity_id=ir[7],
        )
        for ir in items_rows
    ]

    containers_list = [
        ContainerSchema(
            id=cr[0],
            container_number=cr[1] or "",
            container_type=cr[2] or "40HC",
            seal_number=cr[3],
            tare_weight_kg=float(cr[4] or 0),
            max_payload_kg=float(cr[5] or 0),
            status=cr[6] or "active",
        )
        for cr in cont_rows
    ]

    docs_metadata = [
        DocumentMetadataSchema(
            id=dr[0],
            title=dr[1],
            document_type=dr[2],
            file_size_bytes=dr[3] or 0,
            mime_type=dr[4] or "application/pdf",
            created_at=str(dr[5]) if dr[5] else None,
        )
        for dr in docs_rows
    ]

    container_nums = ", ".join(c.container_number for c in containers_list if c.container_number) if containers_list else None
    seal_nums = ", ".join(c.seal_number for c in containers_list if c.seal_number) if containers_list else None
    routes_list = [
        {"from": row[3] or "Origin", "to": row[5] or "Border", "mode": "road", "status": "completed"},
        {"from": row[5] or "Border", "to": row[4] or "Destination", "mode": "road", "status": "pending"},
    ] if (row[3] or row[5] or row[4]) else []

    detail = BOLDetail(
        id=row[0],
        bol_number=row[1],
        issue_date=str(row[2])[:10] if row[2] else None,
        origin=row[3] or "",
        destination=row[4] or "",
        border_station=row[5] or "",
        driver_name=row[6] or "",
        father_name=row[7],
        driver_rent=float(row[8] or 0),
        carton_count=row[9] or 0,
        gross_weight_kg=float(row[10] or 0),
        net_weight_kg=float(row[11] or 0),
        cargo_description=row[12],
        status=row[13] or "draft",
        freight_fee=float(row[14] or 0),
        demurrage_fee=float(row[15] or 0),
        documentation_fee=float(row[16] or 0),
        currency=row[17] or "USD",
        exchange_rate=float(row[18] or 1.0),
        company_id=row[19],
        company_name=row[28],
        shipper_id=row[20],
        shipper_name=row[29],
        consignee_id=row[21],
        consignee_name=row[30],
        notify_party_id=row[22],
        notify_party_name=row[31],
        truck_number=row[33],
        driver_phone=row[32],
        number_of_packages=str(row[9] or 0),
        gross_weight=str(row[10] or 0),
        net_weight=str(row[11] or 0),
        driver_father_name=row[7],
        notify_party=row[31],
        driver_contact=row[32],
        container_numbers=container_nums,
        seal_numbers=seal_nums,
        routes=routes_list,
        items=items_list,
        containers=containers_list,
        linked_documents=docs_metadata,
        revision=row[25] or 1,
        created_at=str(row[26]) if row[26] else None,
        updated_at=str(row[27]) if row[27] else None,
    )
    bol_sequence_cache.set(f"bol_detail:{clean_id}", detail, ttl=60)
    if detail.id:
        bol_sequence_cache.set(f"bol_detail:{detail.id}", detail, ttl=60)
    if detail.bol_number:
        bol_sequence_cache.set(f"bol_detail:{detail.bol_number}", detail, ttl=60)
    return detail


async def patch_bol(
    db: AsyncSession, bol_id_or_number: str, payload: BOLPatchRequest
) -> BOLSaveResponse:
    """Partial update with optimistic concurrency control (Section 23, 24)."""
    clean_id = bol_id_or_number.strip()
    stmt = (
        select(BOLModel)
        .where(or_(BOLModel.id == clean_id, BOLModel.bol_number == clean_id))
        .with_for_update()
    )
    res = await db.execute(stmt)
    bol = res.scalar_one_or_none()
    if not bol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"BOL '{clean_id}' not found",
        )

    # Optimistic concurrency check
    if bol.revision != payload.revision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Concurrency conflict: This BOL was updated elsewhere (server rev={bol.revision}, client rev={payload.revision}). "
                "Please refresh before saving."
            ),
        )

    # Apply only provided fields
    update_data = payload.model_dump(exclude_unset=True, exclude={"revision", "items", "containers"})
    for key, val in update_data.items():
        if val is not None:
            if key in ("driver_rent", "gross_weight_kg", "net_weight_kg", "freight_fee", "demurrage_fee", "documentation_fee", "exchange_rate"):
                setattr(bol, key, Decimal(str(val)))
            else:
                setattr(bol, key, val)

    bol.revision += 1
    bol.updated_at = datetime.datetime.now(datetime.timezone.utc)

    # Sync cargo items if supplied
    if payload.items is not None:
        # Clear existing items and replace
        await db.execute(select(BOLItemModel).where(BOLItemModel.bol_id == bol.id))
        for existing in bol.items:
            await db.delete(existing)
        for item_data in payload.items:
            db.add(
                BOLItemModel(
                    bol_id=bol.id,
                    item_description=item_data.item_description,
                    carton_count=item_data.carton_count,
                    gross_weight_kg=Decimal(str(item_data.gross_weight_kg)),
                    net_weight_kg=Decimal(str(item_data.net_weight_kg)),
                    volume_cbm=Decimal(str(item_data.volume_cbm)),
                    package_type=item_data.package_type,
                    commodity_id=item_data.commodity_id,
                )
            )

    await db.commit()
    invalidate_bol_caches(bol.bol_number)
    invalidate_bol_caches(bol.id)
    await db.refresh(bol)

    return BOLSaveResponse(
        id=bol.id,
        bol_number=bol.bol_number,
        revision=bol.revision,
        status=bol.status,
        updated_at=bol.updated_at.isoformat() if bol.updated_at else datetime.datetime.now(datetime.timezone.utc).isoformat(),
        message="BOL updated successfully with partial PATCH",
    )


async def duplicate_bol(
    db: AsyncSession, source_id_or_number: str, new_bol_number: str
) -> BOLSaveResponse:
    """Fast, safe BOL duplication cloning required logistics specs into a new transaction (Section 28)."""
    clean_id = source_id_or_number.strip()
    source_detail = await get_bol_detail(db, clean_id)

    # Duplicate check on target number
    dup_check = await check_bol_number_exists(db, new_bol_number)
    if dup_check.exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Target BOL number '{new_bol_number}' already exists.",
        )

    new_id = generate_uuid()
    now = datetime.datetime.now(datetime.timezone.utc)

    # Create cloned BOL (Explicitly excluding old ID, audit history, PDF history, payments)
    cloned_bol = BOLModel(
        id=new_id,
        bol_number=new_bol_number.strip(),
        issue_date=now,
        origin=source_detail.origin,
        destination=source_detail.destination,
        border_station=source_detail.border_station,
        driver_name=source_detail.driver_name,
        father_name=source_detail.father_name,
        driver_rent=Decimal(str(source_detail.driver_rent)),
        carton_count=source_detail.carton_count,
        gross_weight_kg=Decimal(str(source_detail.gross_weight_kg)),
        net_weight_kg=Decimal(str(source_detail.net_weight_kg)),
        cargo_description=source_detail.cargo_description,
        status="active",
        freight_fee=Decimal(str(source_detail.freight_fee)),
        demurrage_fee=Decimal(str(source_detail.demurrage_fee)),
        documentation_fee=Decimal(str(source_detail.documentation_fee)),
        currency=source_detail.currency,
        exchange_rate=Decimal(str(source_detail.exchange_rate)),
        company_id=source_detail.company_id,
        shipper_id=source_detail.shipper_id,
        shipper_name=source_detail.shipper_name,
        consignee_id=source_detail.consignee_id,
        consignee_name=source_detail.consignee_name,
        notify_party_id=source_detail.notify_party_id,
        notify_party_name=source_detail.notify_party_name,
        revision=1,
        created_at=now,
        updated_at=now,
    )
    db.add(cloned_bol)

    # Clone cargo items
    for item in source_detail.items:
        db.add(
            BOLItemModel(
                bol_id=new_id,
                item_description=item.item_description,
                carton_count=item.carton_count,
                gross_weight_kg=Decimal(str(item.gross_weight_kg)),
                net_weight_kg=Decimal(str(item.net_weight_kg)),
                volume_cbm=Decimal(str(item.volume_cbm)),
                package_type=item.package_type,
                commodity_id=item.commodity_id,
            )
        )

    await db.commit()
    invalidate_bol_caches(new_bol_number.strip())
    invalidate_bol_caches(new_id)
    invalidate_recent_party_cache()

    return BOLSaveResponse(
        id=new_id,
        bol_number=new_bol_number.strip(),
        revision=1,
        status="active",
        updated_at=now.isoformat(),
        message="BOL duplicated successfully",
    )


async def create_bol_atomic(
    db: AsyncSession, payload: BOLCreateRequest
) -> BOLResponse:
    """Create a new BOL with nested items and containers in one safe atomic transaction (Section 25, 26)."""
    clean_num = payload.bol_number.strip()
    dup_check = await check_bol_number_exists(db, clean_num)
    if dup_check.exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"BOL number {clean_num} already exists",
        )

    now = datetime.datetime.now(datetime.timezone.utc)
    new_id = generate_uuid()

    try:
        parsed_issue_date = None
        if payload.issue_date:
            try:
                parsed_issue_date = datetime.datetime.fromisoformat(payload.issue_date.replace("Z", "+00:00"))
            except Exception:
                try:
                    parsed_issue_date = datetime.datetime.strptime(payload.issue_date[:10], "%Y-%m-%d")
                except Exception:
                    pass

        truck_id = None
        if payload.truck_number and payload.truck_number.strip():
            clean_truck = payload.truck_number.strip()
            truck_stmt = select(TruckModel).where(TruckModel.truck_number == clean_truck)
            truck_obj = (await db.execute(truck_stmt)).scalar_one_or_none()
            if not truck_obj:
                truck_obj = TruckModel(
                    id=generate_uuid(),
                    truck_number=clean_truck,
                    driver_name=payload.driver_name,
                )
                db.add(truck_obj)
                await db.flush()
            truck_id = truck_obj.id

        new_bol = BOLModel(
            id=new_id,
            bol_number=clean_num,
            issue_date=parsed_issue_date or now,
            origin=payload.origin,
            destination=payload.destination,
            border_station=payload.border_station,
            driver_name=payload.driver_name,
            father_name=payload.father_name,
            driver_rent=Decimal(str(payload.driver_rent)),
            truck_id=truck_id,
            carton_count=payload.carton_count,
            gross_weight_kg=Decimal(str(payload.gross_weight_kg)),
            net_weight_kg=Decimal(str(payload.net_weight_kg)),
            cargo_description=payload.cargo_description,
            status=payload.status,
            freight_fee=Decimal(str(payload.freight_fee)),
            demurrage_fee=Decimal(str(payload.demurrage_fee)),
            documentation_fee=Decimal(str(payload.documentation_fee)),
            currency=payload.currency or "USD",
            exchange_rate=Decimal(str(payload.exchange_rate or 1.0)),
            company_id=payload.company_id,
            shipper_name=payload.shipper_name,
            consignee_name=payload.consignee_name,
            notify_party_name=payload.notify_party_name,
            revision=1,
            created_at=now,
            updated_at=now,
        )
        db.add(new_bol)

        # Add items if present
        for item in payload.items:
            db.add(
                BOLItemModel(
                    bol_id=new_id,
                    item_description=item.item_description,
                    carton_count=item.carton_count,
                    gross_weight_kg=Decimal(str(item.gross_weight_kg)),
                    net_weight_kg=Decimal(str(item.net_weight_kg)),
                    volume_cbm=Decimal(str(item.volume_cbm)),
                    package_type=item.package_type,
                    commodity_id=item.commodity_id,
                )
            )

        # Add containers if present
        for c in payload.containers:
            db.add(
                ContainerModel(
                    bol_id=new_id,
                    container_number=c.container_number,
                    container_type=c.container_type,
                    seal_number=c.seal_number,
                    tare_weight_kg=Decimal(str(c.tare_weight_kg)),
                    max_payload_kg=Decimal(str(c.max_payload_kg)),
                    status=c.status,
                )
            )

        await db.commit()
        invalidate_bol_caches(new_bol.bol_number)
        invalidate_bol_caches(new_bol.id)
        await db.refresh(new_bol)
        invalidate_recent_party_cache()
    except Exception as exc:
        await db.rollback()
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Atomic BOL creation transaction failed: {str(exc)}",
        ) from exc

    return BOLResponse(
        id=1,
        bol_number=new_bol.bol_number,
        origin=new_bol.origin,
        border_station=new_bol.border_station,
        driver_name=new_bol.driver_name,
        father_name=new_bol.father_name,
        driver_rent=float(new_bol.driver_rent or 0),
        carton_count=new_bol.carton_count,
        gross_weight_kg=float(new_bol.gross_weight_kg or 0),
        net_weight_kg=float(new_bol.net_weight_kg or 0),
        cargo_description=new_bol.cargo_description,
        destination=new_bol.destination,
        status=new_bol.status,
        freight_fee=float(new_bol.freight_fee or 0),
        demurrage_fee=float(new_bol.demurrage_fee or 0),
        documentation_fee=float(new_bol.documentation_fee or 0),
        currency=new_bol.currency,
        exchange_rate=float(new_bol.exchange_rate or 1.0),
        created_at=new_bol.created_at.isoformat() if new_bol.created_at else now.isoformat(),
        updated_at=new_bol.updated_at.isoformat() if new_bol.updated_at else now.isoformat(),
    )
