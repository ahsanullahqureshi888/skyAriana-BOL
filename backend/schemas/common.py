from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ApiResponse(BaseModel):
    success: bool = True
    data: Any | None = None
    error: str | None = None
    source: str = "python-fastapi"


class GenericRecordCreate(BaseModel):
    id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class GenericRecordUpdate(BaseModel):
    payload: dict[str, Any] = Field(default_factory=dict)


class MediaFileOut(BaseModel):
    id: str
    original_name: str
    file_name: str
    file_type: str
    media_type: str
    file_size: int
    storage_path: str
    shipment_reference: str = ""
    linked_type: str = ""
    linked_id: str = ""
    created_at: datetime


class SearchResult(BaseModel):
    source: str
    id: str
    title: str
    payload: dict[str, Any] = Field(default_factory=dict)
