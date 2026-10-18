"""Container lookup service with indexed container search."""
from __future__ import annotations

from typing import Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def lookup_container(db: AsyncSession, container_number: str) -> Optional[dict]:
    """Instant container lookup via indexed container_number column with single-pass SQL join."""
    clean_num = container_number.strip().upper()
    if not clean_num:
        return None

    # Try exact match first (uses ix_containers_number_nocase / unique index)
    sql_exact = text("""
        SELECT 
            c.id, c.container_number, c.container_type, c.seal_number, 
            c.tare_weight_kg, c.max_payload_kg, c.status,
            b.id AS bol_id, b.bol_number, b.status AS bol_status, 
            b.shipper_name, b.consignee_name, b.origin, b.destination,
            s.id AS shipment_id, s.tracking_number, s.status AS shipment_status, s.carrier
        FROM containers c
        LEFT JOIN bol_records b ON c.bol_id = b.id
        LEFT JOIN shipments s ON c.shipment_id = s.id
        WHERE c.container_number = :num
        LIMIT 1
    """)
    res = await db.execute(sql_exact, {"num": clean_num})
    row = res.mappings().first()

    if not row:
        # Fallback to LIKE match
        sql_like = text("""
            SELECT 
                c.id, c.container_number, c.container_type, c.seal_number, 
                c.tare_weight_kg, c.max_payload_kg, c.status,
                b.id AS bol_id, b.bol_number, b.status AS bol_status, 
                b.shipper_name, b.consignee_name, b.origin, b.destination,
                s.id AS shipment_id, s.tracking_number, s.status AS shipment_status, s.carrier
            FROM containers c
            LEFT JOIN bol_records b ON c.bol_id = b.id
            LEFT JOIN shipments s ON c.shipment_id = s.id
            WHERE c.container_number LIKE :pattern
            LIMIT 1
        """)
        res = await db.execute(sql_like, {"pattern": f"%{clean_num}%"})
        row = res.mappings().first()

    if not row:
        return None

    bol_summary = None
    if row["bol_id"]:
        bol_summary = {
            "id": row["bol_id"],
            "bol_number": row["bol_number"],
            "status": row["bol_status"],
            "shipper_name": row["shipper_name"],
            "consignee_name": row["consignee_name"],
            "origin": row["origin"],
            "destination": row["destination"],
        }

    shipment_summary = None
    if row["shipment_id"]:
        shipment_summary = {
            "id": row["shipment_id"],
            "tracking_number": row["tracking_number"],
            "status": row["shipment_status"],
            "carrier": row["carrier"],
        }

    return {
        "id": row["id"],
        "container_number": row["container_number"],
        "container_type": row["container_type"],
        "seal_number": row["seal_number"],
        "tare_weight_kg": float(row["tare_weight_kg"] or 0),
        "max_payload_kg": float(row["max_payload_kg"] or 0),
        "status": row["status"],
        "bol": bol_summary,
        "shipment": shipment_summary,
    }

