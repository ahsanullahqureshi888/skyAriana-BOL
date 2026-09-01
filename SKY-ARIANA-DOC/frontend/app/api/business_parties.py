from __future__ import annotations

import json
from pathlib import Path
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session
from uuid import uuid4

from app.core.security import require_permission
from app.services.access_control import has_permission
from app.database.session import get_db
from app.models.models import ActivityLog, BusinessParty, BusinessPartyRelationship, Invoice, User
from app.schemas.schemas import (
    BusinessPartyCreate,
    BusinessPartyOut,
    BusinessPartySummary,
    BusinessPartyUpdate,
)
from app.services.business_parties import (
    BUSINESS_PARTY_ROLES,
    PARTY_TYPES,
    archive_party,
    create_party_from_payload,
    find_matching_party,
    import_seed_records,
    merge_party_record,
    normalise_party_payload,
    party_to_snapshot,
    party_roles,
    restore_party,
)


router = APIRouter(prefix="/business-parties", tags=["business-parties"])
SEED_PATH = Path(__file__).resolve().parents[2] / "data" / "business_parties_seed.json"
CONSIGNEE_SEED_PATH = Path(__file__).resolve().parents[2] / "data" / "consignees_seed.json"


def role_filter(party_type: str):
    """Return a SQLite-compatible filter that includes multi-role records."""
    if party_type == "consignee":
        return or_(
            BusinessParty.party_type == "consignee",
            BusinessParty.roles.ilike("%consignee%"),
            BusinessParty.roles.ilike("%importer%"),
        )
    if party_type == "shipper":
        return or_(BusinessParty.party_type == "shipper", BusinessParty.roles.ilike("%shipper%"), BusinessParty.roles.ilike("%exporter%"))
    if party_type == "notify_party":
        return or_(BusinessParty.party_type == "notify_party", BusinessParty.roles.ilike("%notify_party%"))
    return BusinessParty.party_type == party_type


def has_consignee_role(party: BusinessParty) -> bool:
    return "consignee" in party_roles(party) or "importer" in party_roles(party)


def ensure_role_permission(db: Session, user: User, party_type: str, action: str) -> None:
    if party_type == "consignee" and not has_permission(db, user, f"consignees.{action}"):
        raise HTTPException(status_code=403, detail="You do not have permission to manage consignees")


def usage_count(db: Session, party: BusinessParty) -> int:
    return db.query(Invoice).filter(
        or_(Invoice.shipper_party_id == party.id, Invoice.notify_party_id == party.id, Invoice.consignee_party_id == party.id)
    ).count()


def serialize_party(db: Session, party: BusinessParty) -> dict[str, Any]:
    return {
        "id": party.id,
        "party_type": party.party_type,
        "roles": party_roles(party),
        "canonical_name": party.canonical_name,
        "display_name": party.display_name,
        "normalized_name": party.normalized_name,
        "address_line1": party.address_line1,
        "address_line2": party.address_line2,
        "city": party.city,
        "state_region": party.state_region,
        "postal_code": party.postal_code,
        "country": party.country,
        "country_code": party.country_code,
        "phone": party.phone,
        "alternate_phones": party.alternate_phones or [],
        "email": party.email,
        "alternate_emails": party.alternate_emails or [],
        "trade_license_number": party.trade_license_number,
        "tax_identification_number": party.tax_identification_number,
        "trn": party.trn,
        "registration_number": party.registration_number,
        "contact_person": party.contact_person,
        "business_type": party.business_type,
        "website": party.website,
        "gstin": party.gstin,
        "iec": party.iec,
        "pan": party.pan,
        "fssai": party.fssai,
        "tin": party.tin,
        "state_code": party.state_code,
        "identifiers": party.identifiers or {},
        "identifier_provenance": party.identifier_provenance or [],
        "field_provenance": party.field_provenance or {},
        "bank_details": party.bank_details or {},
        "notes": party.notes,
        "aliases": party.aliases or [],
        "alternate_addresses": party.alternate_addresses or [],
        "source_name": party.source_name,
        "source_pages": party.source_pages or [],
        "source_references": party.source_references or [],
        "source_raw_text": party.source_raw_text,
        "source_entries": party.source_entries or [],
        "review_status": party.review_status or ("needs_review" if party.review_flags else "verified_source"),
        "import_batch_id": party.import_batch_id,
        "review_flags": party.review_flags or [],
        "is_active": party.is_active,
        "is_archived": party.is_archived,
        "created_at": party.created_at,
        "created_by": party.created_by,
        "updated_at": party.updated_at,
        "updated_by": party.updated_by,
        "archived_at": party.archived_at,
        "archived_by": party.archived_by,
        "usage_count": usage_count(db, party),
    }


def validate_type(party_type: str) -> str:
    if party_type not in PARTY_TYPES:
        raise HTTPException(status_code=422, detail=f"Unsupported business party type: {party_type}")
    return party_type


@router.get("", response_model=List[BusinessPartyOut])
def list_business_parties(
    party_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    include_archived: bool = Query(False),
    country: Optional[str] = Query(None),
    review_status: Optional[str] = Query(None),
    has_identifier: Optional[str] = Query(None, pattern="^(gstin|iec|pan|fssai|tin|trn)$"),
    source_type: Optional[str] = Query(None, pattern="^(imported|manual)$"),
    previously_used: Optional[bool] = Query(None),
    sort_by: str = Query("display_name", pattern="^(display_name|country|created_at|updated_at)$"),
    sort_direction: str = Query("asc", pattern="^(asc|desc)$"),
    offset: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("parties.view")),
):
    query = db.query(BusinessParty)
    if party_type:
        party_type = validate_type(party_type)
        ensure_role_permission(db, current_user, party_type, "view")
        query = query.filter(role_filter(party_type))
    if not include_archived:
        query = query.filter(BusinessParty.is_archived.is_(False), BusinessParty.is_active.is_(True))
    if country:
        query = query.filter(BusinessParty.country.ilike(country.strip()))
    if review_status:
        query = query.filter(BusinessParty.review_status == review_status)
    if has_identifier:
        query = query.filter(getattr(BusinessParty, has_identifier).isnot(None), getattr(BusinessParty, has_identifier) != "")
    if source_type == "imported":
        query = query.filter(BusinessParty.source_name.isnot(None))
    elif source_type == "manual":
        query = query.filter(BusinessParty.source_name.is_(None))
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                BusinessParty.display_name.ilike(term),
                BusinessParty.canonical_name.ilike(term),
                BusinessParty.normalized_name.ilike(term),
                BusinessParty.address_line1.ilike(term),
                BusinessParty.country.ilike(term),
                BusinessParty.phone.ilike(term),
                BusinessParty.email.ilike(term),
                BusinessParty.trade_license_number.ilike(term),
                BusinessParty.trn.ilike(term),
                BusinessParty.gstin.ilike(term),
                BusinessParty.iec.ilike(term),
                BusinessParty.pan.ilike(term),
                BusinessParty.fssai.ilike(term),
                BusinessParty.contact_person.ilike(term),
            )
        )
    sort_column = getattr(BusinessParty, sort_by)
    parties = query.order_by(sort_column.desc() if sort_direction == "desc" else sort_column.asc()).all()
    if previously_used is not None:
        parties = [party for party in parties if (usage_count(db, party) > 0) is previously_used]
    parties = parties[offset:offset + limit]
    return [serialize_party(db, party) for party in parties]


@router.get("/summary", response_model=BusinessPartySummary)
def business_party_summary(
    party_type: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("parties.view")),
):
    party_type = validate_type(party_type)
    ensure_role_permission(db, current_user, party_type, "view")
    query = db.query(BusinessParty).filter(role_filter(party_type))
    parties = query.all()
    return BusinessPartySummary(
        party_type=party_type,
        total=len(parties),
        active=sum(1 for party in parties if party.is_active and not party.is_archived),
        archived=sum(1 for party in parties if party.is_archived),
        used_in_invoices=sum(1 for party in parties if usage_count(db, party) > 0),
        needs_review=sum(1 for party in parties if party.review_flags),
    )


@router.get("/export")
def export_business_parties(
    party_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("parties.export")),
):
    if party_type:
        party_type = validate_type(party_type)
        ensure_role_permission(db, current_user, party_type, "export")
    query = db.query(BusinessParty)
    if party_type:
        query = query.filter(role_filter(party_type))
    return JSONResponse(content={"records": [serialize_party(db, party) for party in query.order_by(BusinessParty.display_name).all()]})


@router.post("/duplicate-check")
def duplicate_check(
    payload: BusinessPartyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("parties.view")),
):
    validate_type(payload.party_type)
    ensure_role_permission(db, current_user, payload.party_type, "view")
    incoming = normalise_party_payload(payload.model_dump())
    match = find_matching_party(db, incoming)
    return {"likelyDuplicate": bool(match), "existing": serialize_party(db, match) if match else None}


@router.post("/import")
def import_business_parties(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("parties.import")),
):
    if not SEED_PATH.exists():
        raise HTTPException(status_code=500, detail="Reviewed business-party seed file is missing")
    try:
        records = json.loads(SEED_PATH.read_text(encoding="utf-8"))
        report = import_seed_records(db, records, actor_id=current_user.id)
        db.add(ActivityLog(
            user_id=current_user.id,
            action="import_business_parties",
            entity_type="business_party",
            details=(
                f"Imported business-party registry: {report['shippersInserted']} shippers inserted, "
                f"{report['notifyPartiesInserted']} notify parties inserted, "
                f"{report['duplicatesMerged']} duplicate matches merged."
            ),
        ))
        db.commit()
        return report
    except Exception as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Business-party import rolled back: {error}") from error


@router.post("/import-consignees")
def import_consignees(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("consignees.import")),
):
    if not CONSIGNEE_SEED_PATH.exists():
        raise HTTPException(status_code=500, detail="Reviewed consignee seed file is missing")
    try:
        records = json.loads(CONSIGNEE_SEED_PATH.read_text(encoding="utf-8"))
        source_rows = sum(len(record.get("source_entries") or []) for record in records)
        batch_id = str(uuid4())
        report = import_seed_records(
            db,
            records,
            actor_id=current_user.id,
            source_name="CONSIGNEE - DATA.pdf",
            source_pages_processed=24,
            source_rows_processed=source_rows,
            import_batch_id=batch_id,
        )
        db.add(ActivityLog(
            user_id=current_user.id,
            action="import_consignees",
            entity_type="business_party",
            details=(
                f"Imported consignee directory: {report['consigneesInserted']} inserted, "
                f"{report['existingBusinessPartiesMatched']} existing matches, "
                f"{report['duplicatesMerged']} duplicate matches merged."
            ),
        ))
        db.commit()
        report["importBatchId"] = batch_id
        return report
    except Exception as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Consignee import rolled back: {error}") from error


@router.get("/review-issues")
def list_consignee_review_issues(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("consignees.review_import")),
):
    parties = db.query(BusinessParty).filter(role_filter("consignee"), BusinessParty.review_flags.isnot(None)).order_by(BusinessParty.display_name.asc()).all()
    parties = [party for party in parties if party.review_flags]
    return {"total": len(parties), "records": [serialize_party(db, party) for party in parties]}


@router.post("", response_model=BusinessPartyOut, status_code=status.HTTP_201_CREATED)
def create_business_party(
    payload: BusinessPartyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("parties.create")),
):
    validate_type(payload.party_type)
    ensure_role_permission(db, current_user, payload.party_type, "create")
    incoming = normalise_party_payload(payload.model_dump())
    if find_matching_party(db, incoming):
        raise HTTPException(status_code=409, detail="A similar business party already exists")
    try:
        party = create_party_from_payload(db, incoming, actor_id=current_user.id)
        db.add(ActivityLog(
            user_id=current_user.id,
            action=f"create_{payload.party_type}",
            entity_type="business_party",
            entity_id=party.id,
            details=f"Created {payload.party_type}: {party.display_name}",
        ))
        db.commit()
        db.refresh(party)
        return serialize_party(db, party)
    except Exception:
        db.rollback()
        raise


@router.get("/{party_id}", response_model=BusinessPartyOut)
def get_business_party(
    party_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("parties.view")),
):
    party = db.query(BusinessParty).filter(BusinessParty.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Business party not found")
    if has_consignee_role(party):
        ensure_role_permission(db, current_user, "consignee", "view")
    return serialize_party(db, party)


@router.get("/{party_id}/snapshot")
def get_business_party_snapshot(
    party_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("parties.view")),
):
    party = db.query(BusinessParty).filter(BusinessParty.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Business party not found")
    if has_consignee_role(party):
        ensure_role_permission(db, current_user, "consignee", "view")
    return party_to_snapshot(party)


@router.get("/{party_id}/usage")
def get_business_party_usage(
    party_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("parties.view")),
):
    party = db.query(BusinessParty).filter(BusinessParty.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Business party not found")
    if has_consignee_role(party):
        ensure_role_permission(db, current_user, "consignee", "view")
    invoices = db.query(Invoice).filter(or_(Invoice.shipper_party_id == party_id, Invoice.notify_party_id == party_id, Invoice.consignee_party_id == party_id)).order_by(Invoice.invoice_date.desc()).all()
    return {
        "partyId": party_id,
        "usageCount": len(invoices),
        "invoices": [
            {"id": invoice.id, "invoiceNumber": invoice.invoice_number, "invoiceDate": invoice.invoice_date, "role": "shipper" if invoice.shipper_party_id == party_id else "consignee" if invoice.consignee_party_id == party_id else "notify_party"}
            for invoice in invoices
        ],
    }


@router.get("/{party_id}/related-notify-parties", response_model=List[BusinessPartyOut])
def list_related_notify_parties(
    party_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("parties.view")),
):
    """Return previously used notify parties ordered by recorded usage."""
    source = db.query(BusinessParty).filter(BusinessParty.id == party_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Business party not found")
    relationships = db.query(BusinessPartyRelationship).filter(
        BusinessPartyRelationship.source_party_id == party_id,
        BusinessPartyRelationship.relationship_type.in_(("previously_used_notify_party", "preferred_notify_party")),
    ).order_by(
        BusinessPartyRelationship.is_preferred.desc(),
        BusinessPartyRelationship.usage_count.desc(),
    ).all()
    targets = []
    for relationship in relationships:
        target = db.query(BusinessParty).filter(
            BusinessParty.id == relationship.target_party_id,
            role_filter("notify_party"),
            BusinessParty.is_active.is_(True),
            BusinessParty.is_archived.is_(False),
        ).first()
        if target:
            targets.append(target)
    return [serialize_party(db, target) for target in targets]


@router.put("/{party_id}", response_model=BusinessPartyOut)
def update_business_party(
    party_id: int,
    payload: BusinessPartyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("parties.edit")),
):
    party = db.query(BusinessParty).filter(BusinessParty.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Business party not found")
    if has_consignee_role(party):
        ensure_role_permission(db, current_user, "consignee", "edit")
    incoming = {
        "party_type": party.party_type,
        "roles": party_roles(party),
        "canonical_name": party.canonical_name,
        "display_name": party.display_name,
        "normalized_name": party.normalized_name,
        "address_line1": party.address_line1,
        "address_line2": party.address_line2,
        "city": party.city,
        "state_region": party.state_region,
        "postal_code": party.postal_code,
        "country": party.country,
        "country_code": party.country_code,
        "phone": party.phone,
        "alternate_phones": party.alternate_phones or [],
        "email": party.email,
        "alternate_emails": party.alternate_emails or [],
        "trade_license_number": party.trade_license_number,
        "tax_identification_number": party.tax_identification_number,
        "trn": party.trn,
        "registration_number": party.registration_number,
        "contact_person": party.contact_person,
        "business_type": party.business_type,
        "website": party.website,
        "gstin": party.gstin,
        "iec": party.iec,
        "pan": party.pan,
        "fssai": party.fssai,
        "tin": party.tin,
        "state_code": party.state_code,
        "identifiers": party.identifiers or {},
        "identifier_provenance": party.identifier_provenance or [],
        "field_provenance": party.field_provenance or {},
        "bank_details": party.bank_details or {},
        "notes": party.notes,
        "aliases": party.aliases or [],
        "alternate_addresses": party.alternate_addresses or [],
        "source_name": party.source_name,
        "source_pages": party.source_pages or [],
        "source_references": party.source_references or [],
        "source_raw_text": party.source_raw_text,
        "source_entries": party.source_entries or [],
        "review_status": party.review_status,
        "import_batch_id": party.import_batch_id,
        "review_flags": party.review_flags or [],
        "is_active": party.is_active,
        "is_archived": party.is_archived,
    }
    incoming.update(payload.model_dump(exclude_unset=True))
    incoming = normalise_party_payload(incoming)
    possible_match = find_matching_party(db, incoming)
    if possible_match and possible_match.id != party.id:
        raise HTTPException(status_code=409, detail="The edited name matches another business party")
    for field, value in incoming.items():
        if hasattr(party, field):
            setattr(party, field, value)
    party.updated_by = current_user.id
    db.add(ActivityLog(
        user_id=current_user.id,
        action=f"update_{party.party_type}",
        entity_type="business_party",
        entity_id=party.id,
        details=f"Updated {party.party_type}: {party.display_name}",
    ))
    db.commit()
    db.refresh(party)
    return serialize_party(db, party)


@router.post("/{party_id}/archive", response_model=BusinessPartyOut)
def archive_business_party(
    party_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("parties.archive")),
):
    party = db.query(BusinessParty).filter(BusinessParty.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Business party not found")
    if has_consignee_role(party):
        ensure_role_permission(db, current_user, "consignee", "archive")
    archive_party(party, actor_id=current_user.id)
    db.add(ActivityLog(user_id=current_user.id, action=f"archive_{party.party_type}", entity_type="business_party", entity_id=party.id, details=f"Archived {party.party_type}: {party.display_name}"))
    db.commit()
    db.refresh(party)
    return serialize_party(db, party)


@router.post("/{party_id}/restore", response_model=BusinessPartyOut)
def restore_business_party(
    party_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("parties.restore")),
):
    party = db.query(BusinessParty).filter(BusinessParty.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Business party not found")
    if has_consignee_role(party):
        ensure_role_permission(db, current_user, "consignee", "restore")
    restore_party(party, actor_id=current_user.id)
    db.add(ActivityLog(user_id=current_user.id, action=f"restore_{party.party_type}", entity_type="business_party", entity_id=party.id, details=f"Restored {party.party_type}: {party.display_name}"))
    db.commit()
    db.refresh(party)
    return serialize_party(db, party)


@router.post("/{party_id}/review", response_model=BusinessPartyOut)
def review_business_party(
    party_id: int,
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("consignees.review_import")),
):
    party = db.query(BusinessParty).filter(BusinessParty.id == party_id).first()
    if not party or not has_consignee_role(party):
        raise HTTPException(status_code=404, detail="Consignee not found")
    action = str(payload.get("action") or "mark_reviewed")
    if action not in {"mark_reviewed", "reopen"}:
        raise HTTPException(status_code=422, detail="Unsupported review action")
    party.review_status = "reviewed" if action == "mark_reviewed" else "needs_review"
    if action == "mark_reviewed":
        party.review_flags = []
    db.add(ActivityLog(
        user_id=current_user.id,
        action="review_consignee",
        entity_type="business_party",
        entity_id=party.id,
        details=f"{action.replace('_', ' ').title()}: {party.display_name}",
    ))
    db.commit()
    db.refresh(party)
    return serialize_party(db, party)


@router.post("/{party_id}/roles", response_model=BusinessPartyOut)
def assign_business_party_role(
    party_id: int,
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("consignees.edit")),
):
    party = db.query(BusinessParty).filter(BusinessParty.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Business party not found")
    role = str(payload.get("role") or "").strip()
    if role not in BUSINESS_PARTY_ROLES:
        raise HTTPException(status_code=422, detail="Unsupported business-party role")
    roles = party_roles(party)
    if role not in roles:
        roles.append(role)
        party.roles = roles
        party.party_type = "multi_role" if len(roles) > 1 else role
        party.updated_by = current_user.id
        db.add(ActivityLog(
            user_id=current_user.id,
            action="add_business_party_role",
            entity_type="business_party",
            entity_id=party.id,
            details=f"Added {role.replace('_', ' ')} role to {party.display_name}",
        ))
        db.commit()
        db.refresh(party)
    return serialize_party(db, party)


@router.post("/{party_id}/merge", response_model=BusinessPartyOut)
def merge_consignee_duplicates(
    party_id: int,
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("consignees.merge")),
):
    duplicate_id = int(payload.get("duplicatePartyId") or 0)
    if not duplicate_id or duplicate_id == party_id:
        raise HTTPException(status_code=422, detail="Choose a different duplicate record")
    survivor = db.query(BusinessParty).filter(BusinessParty.id == party_id).first()
    duplicate = db.query(BusinessParty).filter(BusinessParty.id == duplicate_id).first()
    if not survivor or not duplicate or not has_consignee_role(survivor) or not has_consignee_role(duplicate):
        raise HTTPException(status_code=404, detail="Consignee record not found")
    try:
        incoming = normalise_party_payload(serialize_party(db, duplicate))
        incoming["aliases"] = list(dict.fromkeys([duplicate.display_name, *(incoming.get("aliases") or [])]))
        merge_party_record(survivor, incoming, actor_id=current_user.id)
        db.query(Invoice).filter(Invoice.shipper_party_id == duplicate.id).update({Invoice.shipper_party_id: survivor.id}, synchronize_session=False)
        db.query(Invoice).filter(Invoice.consignee_party_id == duplicate.id).update({Invoice.consignee_party_id: survivor.id}, synchronize_session=False)
        db.query(Invoice).filter(Invoice.notify_party_id == duplicate.id).update({Invoice.notify_party_id: survivor.id}, synchronize_session=False)
        for relationship in db.query(BusinessPartyRelationship).filter(
            or_(BusinessPartyRelationship.source_party_id == duplicate.id, BusinessPartyRelationship.target_party_id == duplicate.id)
        ).all():
            if relationship.source_party_id == duplicate.id:
                relationship.source_party_id = survivor.id
            if relationship.target_party_id == duplicate.id:
                relationship.target_party_id = survivor.id
        archive_party(duplicate, actor_id=current_user.id)
        db.add(ActivityLog(
            user_id=current_user.id,
            action="merge_consignee",
            entity_type="business_party",
            entity_id=survivor.id,
            details=f"Merged duplicate consignee {duplicate.display_name} into {survivor.display_name}",
        ))
        db.commit()
        db.refresh(survivor)
        return serialize_party(db, survivor)
    except Exception:
        db.rollback()
        raise
