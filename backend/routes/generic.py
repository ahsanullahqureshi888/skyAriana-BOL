from __future__ import annotations

from typing import Any, Type

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.database import get_db
from backend.services.crud import delete_record, get_record, list_records, serialize_record, upsert_payload_record


def build_crud_router(
    model: Type[Any],
    tag: str,
    create_schema: Type[BaseModel] | None = None,
    update_schema: Type[BaseModel] | None = None,
) -> APIRouter:
    router = APIRouter(tags=[tag])

    @router.get("")
    async def list_items(
        q: str | None = Query(default=None),
        limit: int = Query(default=200),
        offset: int = Query(default=0),
        db: AsyncSession = Depends(get_db)
    ):
        records = await list_records(db, model, q=q, limit=limit, offset=offset)
        return {"success": True, "data": records, "source": "python-fastapi"}

    @router.get("/{record_id}")
    async def get_item(record_id: str, db: AsyncSession = Depends(get_db)):
        record = await get_record(db, model, record_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Record not found")
        return {"success": True, "data": serialize_record(record), "source": "python-fastapi"}

    @router.post("")
    async def create_item(
        body: dict[str, Any] if create_schema is None else create_schema,
        db: AsyncSession = Depends(get_db)
    ):
        body_dict = body if isinstance(body, dict) else body.model_dump(exclude_unset=True)
        payload = body_dict.get("payload", body_dict)
        record_id = body_dict.get("id") or payload.get("id")
        record = await upsert_payload_record(db, model, payload, record_id=record_id)
        return {"success": True, "data": serialize_record(record), "source": "python-fastapi"}

    @router.put("/{record_id}")
    async def update_item(
        record_id: str,
        body: dict[str, Any] if update_schema is None else update_schema,
        db: AsyncSession = Depends(get_db)
    ):
        body_dict = body if isinstance(body, dict) else body.model_dump(exclude_unset=True)
        payload = body_dict.get("payload", body_dict)
        record = await upsert_payload_record(db, model, payload, record_id=record_id)
        return {"success": True, "data": serialize_record(record), "source": "python-fastapi"}

    @router.delete("/{record_id}")
    async def remove_item(record_id: str, db: AsyncSession = Depends(get_db)):
        if not await delete_record(db, model, record_id):
            raise HTTPException(status_code=404, detail="Record not found")
        return {"success": True, "data": {"id": record_id}, "source": "python-fastapi"}

    return router
