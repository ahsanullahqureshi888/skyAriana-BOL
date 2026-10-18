from __future__ import annotations

from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


class BOLListItem(BaseModel):
    """Ultra-lightweight BOL summary item for high-performance list rendering."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    bol_number: str
    issue_date: Optional[str] = None
    company_name: Optional[str] = None
    shipper_name: Optional[str] = None
    consignee_name: Optional[str] = None
    container_number: Optional[str] = None
    commodity_summary: Optional[str] = None
    status: str = "active"
    route_summary: Optional[str] = None
    driver_name: Optional[str] = None
    carton_count: int = 0
    gross_weight_kg: float = 0.0
    net_weight_kg: float = 0.0
    freight_fee: float = 0.0
    currency: str = "USD"
    updated_at: Optional[str] = None
    revision: int = 1

    # Frontend display & legacy compatibility aliases
    truck_number: Optional[str] = None
    driver_rent: Optional[str] = None
    number_of_packages: Optional[str] = None
    gross_weight: Optional[str] = None
    net_weight: Optional[str] = None
    container_numbers: Optional[str] = None
    cargo_description: Optional[str] = None


class BOLSummary(BaseModel):
    """Aggregate KPI metrics across all active BOLs for instant summary cards."""
    total_bols: int = 0
    total_packages: int = 0
    total_weight: float = 0.0
    total_goods_value: float = 0.0


class BOLItemSchema(BaseModel):
    """Line item in a Bill of Lading."""
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    item_description: str
    carton_count: int = 0
    gross_weight_kg: float = 0.0
    net_weight_kg: float = 0.0
    volume_cbm: float = 0.0
    package_type: str = "cartons"
    commodity_id: Optional[str] = None


class ContainerSchema(BaseModel):
    """Container details associated with a BOL."""
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    container_number: str
    container_type: str = "40HC"
    seal_number: Optional[str] = None
    tare_weight_kg: float = 0.0
    max_payload_kg: float = 0.0
    status: str = "in_transit"


class DocumentMetadataSchema(BaseModel):
    """Linked document metadata only (no heavy binary payloads)."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    document_type: str
    file_size_bytes: int = 0
    mime_type: Optional[str] = None
    created_at: Optional[str] = None


class BOLDetail(BaseModel):
    """Full BOL details for viewing/editing a single document."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    bol_number: str
    issue_date: Optional[str] = None
    origin: str
    destination: Optional[str] = None
    border_station: str
    driver_name: str
    father_name: Optional[str] = None
    driver_rent: float = 0.0
    carton_count: int = 0
    gross_weight_kg: float = 0.0
    net_weight_kg: float = 0.0
    cargo_description: Optional[str] = None
    status: str = "active"

    # Fee segregation & currency
    freight_fee: float = 0.0
    demurrage_fee: float = 0.0
    documentation_fee: float = 0.0
    currency: str = "USD"
    exchange_rate: float = 1.0

    # Party snapshots / foreign keys
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    shipper_id: Optional[str] = None
    shipper_name: Optional[str] = None
    consignee_id: Optional[str] = None
    consignee_name: Optional[str] = None
    notify_party_id: Optional[str] = None
    notify_party_name: Optional[str] = None

    # Transport / fleet
    truck_number: Optional[str] = None
    driver_phone: Optional[str] = None

    # Legacy & UI compatibility fields
    number_of_packages: Optional[str] = None
    gross_weight: Optional[str] = None
    net_weight: Optional[str] = None
    driver_father_name: Optional[str] = None
    notify_party: Optional[str] = None
    driver_contact: Optional[str] = None
    container_numbers: Optional[str] = None
    seal_numbers: Optional[str] = None
    routes: List[Any] = Field(default_factory=list)

    # Nested sub-entities
    items: List[BOLItemSchema] = Field(default_factory=list)
    containers: List[ContainerSchema] = Field(default_factory=list)
    linked_documents: List[DocumentMetadataSchema] = Field(default_factory=list)

    # Concurrency control & audit
    revision: int = 1
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class BOLPatchRequest(BaseModel):
    """Partial update payload with optimistic concurrency revision."""
    model_config = ConfigDict(extra="ignore")

    revision: int = Field(..., description="Current document revision for concurrency check")
    origin: Optional[str] = None
    destination: Optional[str] = None
    border_station: Optional[str] = None
    driver_name: Optional[str] = None
    father_name: Optional[str] = None
    driver_rent: Optional[float] = None
    carton_count: Optional[int] = None
    gross_weight_kg: Optional[float] = None
    net_weight_kg: Optional[float] = None
    cargo_description: Optional[str] = None
    status: Optional[str] = None
    freight_fee: Optional[float] = None
    demurrage_fee: Optional[float] = None
    documentation_fee: Optional[float] = None
    currency: Optional[str] = None
    exchange_rate: Optional[float] = None
    shipper_name: Optional[str] = None
    consignee_name: Optional[str] = None
    notify_party_name: Optional[str] = None
    truck_number: Optional[str] = None
    driver_phone: Optional[str] = None
    items: Optional[List[BOLItemSchema]] = None
    containers: Optional[List[ContainerSchema]] = None

    @model_validator(mode="before")
    @classmethod
    def map_legacy_and_alias_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Map number_of_packages -> carton_count
            if "carton_count" not in data or data["carton_count"] is None:
                pkgs = data.get("number_of_packages")
                if pkgs is not None:
                    try:
                        clean_pkg = str(pkgs).split()[0].replace(",", "")
                        data["carton_count"] = int(clean_pkg)
                    except Exception:
                        pass
            # Map gross_weight -> gross_weight_kg
            if "gross_weight_kg" not in data or data["gross_weight_kg"] is None:
                gw = data.get("gross_weight")
                if gw is not None:
                    try:
                        clean_gw = str(gw).split()[0].replace(",", "")
                        data["gross_weight_kg"] = float(clean_gw)
                    except Exception:
                        pass
            # Map net_weight -> net_weight_kg
            if "net_weight_kg" not in data or data["net_weight_kg"] is None:
                nw = data.get("net_weight")
                if nw is not None:
                    try:
                        clean_nw = str(nw).split()[0].replace(",", "")
                        data["net_weight_kg"] = float(clean_nw)
                    except Exception:
                        pass
            # Map driver_father_name -> father_name
            if not data.get("father_name") and data.get("driver_father_name"):
                data["father_name"] = str(data["driver_father_name"]).strip()
            # Map notify_party -> notify_party_name
            if not data.get("notify_party_name") and data.get("notify_party"):
                data["notify_party_name"] = str(data["notify_party"]).strip()
            # Map driver_contact -> driver_phone
            if not data.get("driver_phone") and data.get("driver_contact"):
                data["driver_phone"] = str(data["driver_contact"]).strip()
            # Driver rent string to float if needed
            if "driver_rent" in data and isinstance(data["driver_rent"], str):
                try:
                    data["driver_rent"] = float(data["driver_rent"].replace("$", "").replace(",", "").strip())
                except Exception:
                    pass
        return data


class BOLSaveResponse(BaseModel):
    """Lightweight response returned upon BOL create or update."""
    id: str
    bol_number: str
    revision: int
    status: str
    updated_at: str
    message: str = "BOL saved successfully"


class BOLCheckNumberResponse(BaseModel):
    """Response for indexed duplicate BOL number check."""
    exists: bool
    bol_number: str
    matched_id: Optional[str] = None


class BOLCreateRequest(BaseModel):
    """Full BOL creation payload supporting atomic multi-entity transaction (Section 26)."""
    bol_number: str
    issue_date: Optional[str] = None
    origin: str = "Bandar Abbas"
    destination: Optional[str] = "Kabul"
    border_station: str = "Islam Qala"
    driver_name: str = ""
    father_name: Optional[str] = None
    driver_rent: float = 0.0
    carton_count: int = 0
    gross_weight_kg: float = 0.0
    net_weight_kg: float = 0.0
    cargo_description: Optional[str] = None
    status: str = "active"
    freight_fee: float = 0.0
    demurrage_fee: float = 0.0
    documentation_fee: float = 0.0
    currency: str = "USD"
    exchange_rate: float = 1.0
    company_id: Optional[str] = None
    shipper_name: Optional[str] = None
    consignee_name: Optional[str] = None
    notify_party_name: Optional[str] = None
    truck_number: Optional[str] = None
    driver_phone: Optional[str] = None
    items: List[BOLItemSchema] = Field(default_factory=list)
    containers: List[ContainerSchema] = Field(default_factory=list)
