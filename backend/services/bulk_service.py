"""High-performance batch insertion and bulk transaction utilities (Section 10)."""
from __future__ import annotations

import logging
from typing import Any, List, Sequence
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("sky_ariana.bulk")


async def bulk_insert_ledger_records(
    db: AsyncSession,
    records: Sequence[dict[str, Any]],
    chunk_size: int = 500,
) -> int:
    """Fast batch insert for ledger records using executemany wrapped in a single transaction.
    
    Avoids commit inside loops and optimizes SQLite page writes.
    """
    if not records:
        return 0

    sql = """
        INSERT INTO ledger_records (
            id, account_id, account_name, transaction_date, description,
            debit, credit, balance, currency, fee_type, exchange_rate,
            reference_id, bol_id, invoice_id, revision, created_at, updated_at
        ) VALUES (
            :id, :account_id, :account_name, :transaction_date, :description,
            :debit, :credit, :balance, :currency, :fee_type, :exchange_rate,
            :reference_id, :bol_id, :invoice_id, :revision, :created_at, :updated_at
        );
    """

    total_inserted = 0
    # Process in chunks to prevent memory spikes
    for i in range(0, len(records), chunk_size):
        chunk = records[i : i + chunk_size]
        await db.execute(text(sql), chunk)
        total_inserted += len(chunk)

    await db.commit()
    logger.info(f"Bulk inserted {total_inserted} ledger records atomically.")
    return total_inserted


async def bulk_insert_bol_items(
    db: AsyncSession,
    items: Sequence[dict[str, Any]],
) -> int:
    """Batch insert for BOL cargo line items in a single transaction."""
    if not items:
        return 0

    sql = """
        INSERT INTO bol_items (
            id, bol_id, commodity_id, item_description, carton_count,
            gross_weight_kg, net_weight_kg, volume_cbm, package_type,
            revision, created_at, updated_at
        ) VALUES (
            :id, :bol_id, :commodity_id, :item_description, :carton_count,
            :gross_weight_kg, :net_weight_kg, :volume_cbm, :package_type,
            1, :created_at, :updated_at
        );
    """
    await db.execute(text(sql), items)
    await db.commit()
    return len(items)


async def bulk_insert_containers(
    db: AsyncSession,
    containers: Sequence[dict[str, Any]],
) -> int:
    """Batch insert for container tracking records in a single transaction."""
    if not containers:
        return 0

    sql = """
        INSERT INTO containers (
            id, bol_id, container_number, container_type, seal_number,
            tare_weight_kg, max_payload_kg, status, revision, created_at, updated_at
        ) VALUES (
            :id, :bol_id, :container_number, :container_type, :seal_number,
            :tare_weight_kg, :max_payload_kg, :status, 1, :created_at, :updated_at
        );
    """
    await db.execute(text(sql), containers)
    await db.commit()
    return len(containers)
