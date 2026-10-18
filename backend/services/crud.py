from __future__ import annotations

from typing import Any, Type

from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession


def serialize_record(record: Any) -> dict[str, Any]:
    data = {
        "id": record.id,
        "payload": getattr(record, "payload", {}) or {},
        "created_at": record.created_at.isoformat() if getattr(record, "created_at", None) else None,
        "updated_at": record.updated_at.isoformat() if getattr(record, "updated_at", None) else None,
    }

    for name in (
        "invoice_number",
        "customer_name",
        "bol_number",
        "shipper_name",
        "consignee_name",
        "status",
        "name",
        "account_type",
        "account_id",
        "invoice_no",
        "bill_of_lading",
        "debit",
        "credit",
        "pdf_file",
        "driver_name",
        "container_number",
        "track_no",
        "destination",
        "container_type",
        "container_details",
        "key",
        "invoice_id",
        "description",
        "quantity",
        "unit_price",
        "amount",
    ):
        if hasattr(record, name):
            data[name] = getattr(record, name)

    return data


async def list_records(db: AsyncSession, model: Type[Any], q: str | None = None, limit: int = 200, offset: int = 0) -> list[dict[str, Any]]:
    # Normalize parameters in case default FastAPI Query instances were passed directly
    q_str = str(q).strip() if q and not hasattr(q, "default") else None
    limit_int = int(limit) if limit and not hasattr(limit, "default") else 200
    offset_int = int(offset) if offset and not hasattr(offset, "default") else 0

    statement = select(model).order_by(desc(model.updated_at)).offset(max(offset_int, 0)).limit(min(max(limit_int, 1), 1000))
    if q_str:
        searchable = []
        for name in ("invoice_number", "customer_name", "bol_number", "shipper_name", "consignee_name", "name", "driver_name", "container_number", "track_no", "destination"):
            if hasattr(model, name):
                searchable.append(getattr(model, name).ilike(f"%{q_str}%"))
        if searchable:
            statement = statement.where(or_(*searchable))
    result = await db.execute(statement)
    return [serialize_record(record) for record in result.scalars().all()]



async def get_record(db: AsyncSession, model: Type[Any], record_id: str) -> Any | None:
    return await db.get(model, record_id)


async def upsert_payload_record(db: AsyncSession, model: Type[Any], payload: dict[str, Any], record_id: str | None = None) -> Any:
    record = await db.get(model, record_id) if record_id else None
    if record is None:
        record = model()
        if record_id:
            record.id = record_id
        db.add(record)

    record.payload = payload
    apply_known_fields(record, payload)
    await db.commit()
    await db.refresh(record)
    return record


async def delete_record(db: AsyncSession, model: Type[Any], record_id: str) -> bool:
    record = await db.get(model, record_id)
    if record is None:
        return False
    await db.delete(record)
    await db.commit()
    return True


def apply_known_fields(record: Any, payload: dict[str, Any]) -> None:
    field_sources = {
        "invoice_number": ["invoice_number", "invoiceNumber"],
        "customer_name": ["customer_name", "buyer_name", "customerName", "buyerName"],
        "bol_number": ["bol_number", "bolNumber", "billOfLading", "bill_of_lading"],
        "shipper_name": ["shipper_name", "shipperName", "shipper"],
        "consignee_name": ["consignee_name", "consigneeName", "consignee"],
        "status": ["status"],
        "name": ["name", "companyName", "customerName"],
        "account_type": ["type", "account_type", "accountType"],
        "account_id": ["account_id", "accountId"],
        "invoice_no": ["invoice_no", "invoiceNo", "invoice_number"],
        "bill_of_lading": ["bill_of_lading", "billOfLading", "bol_number", "bolNumber"],
        "pdf_file": ["pdf_file", "pdfFile"],
        "driver_name": ["driver_name", "driverName"],
        "container_number": ["container_number", "containerNumber", "container_no", "containerNo"],
        "track_no": ["track_no", "trackNo", "truck_no", "truckNo"],
        "destination": ["destination"],
        "container_type": ["container_type", "containerType"],
        "container_details": ["container_details", "containerDetails"],
        "key": ["key"],
        "invoice_id": ["invoice_id", "invoiceId"],
        "description": ["description"],
        "quantity": ["quantity"],
    }

    for attr, candidates in field_sources.items():
        if not hasattr(record, attr):
            continue
        for key in candidates:
            value = payload.get(key)
            if value is not None:
                setattr(record, attr, str(value))
                break

    if hasattr(record, "debit"):
        record.debit = parse_money(payload.get("debit", 0))
    if hasattr(record, "credit"):
        record.credit = parse_money(payload.get("credit", 0))
    if hasattr(record, "unit_price"):
        record.unit_price = parse_money(payload.get("unit_price", payload.get("unitPrice", 0)))
    if hasattr(record, "amount"):
        record.amount = parse_money(payload.get("amount", 0))


def parse_money(value: Any) -> float:
    if value is None or value == "":
        return 0.0
    if isinstance(value, (int, float)):
        return round(float(value), 2)
    cleaned = "".join(ch for ch in str(value) if ch.isdigit() or ch in ".-")
    try:
        return round(float(cleaned or "0.0"), 2)
    except ValueError:
        return 0.0

