from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import date
from decimal import Decimal
import os
import csv
import io
from app.database.session import get_db
from app.core.security import require_permission, create_access_token
from app.models.models import Invoice, InvoiceItem, ShipmentDetails, Customer, User, ActivityLog, Payment, BusinessParty, BusinessPartyRelationship
from app.schemas.schemas import InvoiceOut, InvoiceCreate, InvoiceUpdate, InvoiceListItem, PaymentOut
from app.services.pdf_service import generate_pdf
from app.services.invoice_party import normalize_party_snapshot
from app.services.commercial_line_items import calculate_item_amount
from app.services.invoice_number import generate_invoice_number
from app.services.business_parties import party_roles, party_to_snapshot
from app.core.config import settings

router = APIRouter(prefix="/invoices", tags=["invoices"])

@router.get("/export/csv")
def export_invoices_csv(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("invoices.view"))
):
    query = db.query(Invoice)
    if status:
        query = query.filter(Invoice.status == status)
    invoices = query.order_by(Invoice.invoice_date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Invoice Number", "Date", "Due Date", "Status",
        "Exporter / Shipper", "Importer / Consignee",
        "Currency", "Subtotal", "Freight", "Insurance", "Grand Total", "Paid Amount", "Balance Due",
        "Payment Status", "Template"
    ])

    for inv in invoices:
        shipper = inv.shipper_exporter.get("companyName", "") if isinstance(inv.shipper_exporter, dict) else ""
        consignee = inv.consignee_buyer.get("companyName", "") if isinstance(inv.consignee_buyer, dict) else (inv.customer.company_name if inv.customer else "")
        balance = Decimal(str(inv.grand_total or 0)) - Decimal(str(inv.paid_amount or 0))
        writer.writerow([
            inv.invoice_number,
            inv.invoice_date.isoformat() if inv.invoice_date else "",
            inv.due_date.isoformat() if inv.due_date else "",
            inv.status,
            shipper,
            consignee,
            inv.currency,
            str(inv.subtotal),
            str(inv.freight),
            str(inv.insurance),
            str(inv.grand_total),
            str(inv.paid_amount),
            str(balance),
            inv.payment_status,
            inv.invoice_template
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=invoices_export_{date.today().isoformat()}.csv"}
    )

def normalize_invoice_item_values(item_data, currency: str = "USD"):
    values = item_data.model_dump()
    supplied = getattr(item_data, "model_fields_set", set())
    legacy_unit = values.get("unit") or "PCS"
    values["quantity_unit"] = values.get("quantity_unit") or legacy_unit
    values["unit"] = values["quantity_unit"]
    if "weight_unit" not in supplied or not values.get("weight_unit"):
        values["weight_unit"] = legacy_unit if str(legacy_unit).upper().rstrip("S") in {"KG", "MT", "G", "LB", "TON"} else "KG"
    if "net_weight" not in supplied:
        values["net_weight"] = values.get("quantity") or Decimal("0")
    if "gross_weight" not in supplied:
        values["gross_weight"] = values.get("net_weight") or Decimal("0")
    values["currency"] = values.get("currency") or currency
    return values

def recalculate_invoice(invoice: Invoice):
    preserve_draft = invoice.status == "draft"
    subtotal = Decimal("0.00")
    for item in invoice.items:
        item.amount = calculate_item_amount(item)
        subtotal += item.amount
    
    invoice.subtotal = subtotal.quantize(Decimal("0.01"))
    weight = Decimal("0")
    if invoice.shipment_details:
        weight = Decimal(str(invoice.shipment_details.gross_weight or invoice.shipment_details.net_weight or 0))
    if (not weight or weight == Decimal("0")) and invoice.items:
        weight = sum(Decimal(str(getattr(item, 'gross_weight', 0) or getattr(item, 'net_weight', 0) or 0)) for item in invoice.items)
    if invoice.freight_rate and weight:
        invoice.freight = (weight * Decimal(str(invoice.freight_rate))).quantize(Decimal("0.01"))
    invoice.grand_total = (
        invoice.subtotal
        + Decimal(str(invoice.freight or 0.00))
        + Decimal(str(invoice.insurance or 0.00))
        + Decimal(str(invoice.other_charges or 0.00))
        + Decimal(str(invoice.documentation_fees or 0.00))
        + Decimal(str(invoice.customs_clearance_fees or 0.00))
        - Decimal(str(invoice.discount or 0.00))
        + Decimal(str(invoice.tax or 0.00))
    )
    paid_amount = Decimal(str(invoice.paid_amount or 0.00))
    invoice.paid_amount = paid_amount
    invoice.remaining_balance = invoice.grand_total - paid_amount
    
    if preserve_draft:
        invoice.status = "draft"
    elif paid_amount <= 0:
        invoice.status = "unpaid"
    elif paid_amount >= invoice.grand_total:
        invoice.status = "paid"
    else:
        invoice.status = "partial"


def resolve_business_party(db: Session, party_id: int | None, expected_type: str, *, required: bool = False):
    if party_id is None:
        if required:
            raise HTTPException(status_code=404, detail=f"{expected_type.replace('_', ' ').title()} not found")
        return None
    party = db.query(BusinessParty).filter(BusinessParty.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Selected business party not found")
    allowed_roles = set(party_roles(party))
    expected_roles = {expected_type}
    if expected_type == "shipper":
        expected_roles.add("exporter")
    if expected_type == "consignee":
        expected_roles.update({"importer", "buyer"})
    if not allowed_roles.intersection(expected_roles):
        raise HTTPException(status_code=422, detail=f"Selected record is not a {expected_type.replace('_', ' ')}")
    if party.is_archived or not party.is_active:
        raise HTTPException(status_code=409, detail="Archived business parties cannot be selected")
    return party


def record_party_relationship(db: Session, shipper_party_id: int | None, notify_party_id: int | None) -> None:
    """Keep a lightweight usage signal for shipper/notify-party suggestions."""
    if not shipper_party_id or not notify_party_id:
        return
    relationship = db.query(BusinessPartyRelationship).filter(
        BusinessPartyRelationship.source_party_id == shipper_party_id,
        BusinessPartyRelationship.target_party_id == notify_party_id,
        BusinessPartyRelationship.relationship_type == "previously_used_notify_party",
    ).first()
    if relationship:
        relationship.usage_count = (relationship.usage_count or 0) + 1
    else:
        db.add(BusinessPartyRelationship(
            source_party_id=shipper_party_id,
            target_party_id=notify_party_id,
            relationship_type="previously_used_notify_party",
            usage_count=1,
        ))


def record_business_party_relationship(db: Session, source_party_id: int | None, target_party_id: int | None, relationship_type: str) -> None:
    if not source_party_id or not target_party_id:
        return
    relationship = db.query(BusinessPartyRelationship).filter(
        BusinessPartyRelationship.source_party_id == source_party_id,
        BusinessPartyRelationship.target_party_id == target_party_id,
        BusinessPartyRelationship.relationship_type == relationship_type,
    ).first()
    if relationship:
        relationship.usage_count = (relationship.usage_count or 0) + 1
    else:
        db.add(BusinessPartyRelationship(
            source_party_id=source_party_id,
            target_party_id=target_party_id,
            relationship_type=relationship_type,
            usage_count=1,
        ))


def record_invoice_party_relationships(db: Session, shipper_party_id: int | None, consignee_party_id: int | None, notify_party_id: int | None) -> None:
    record_party_relationship(db, shipper_party_id, notify_party_id)
    record_business_party_relationship(db, shipper_party_id, consignee_party_id, "previously_used_consignee")
    record_business_party_relationship(db, consignee_party_id, notify_party_id, "previously_used_notify_party")

@router.get("", response_model=List[InvoiceListItem])
def list_invoices(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("invoices.view"))
):
    query = db.query(Invoice)
    
    if search:
        query = query.filter(Invoice.invoice_number.ilike(f"%{search}%"))
    if status:
        query = query.filter(Invoice.status == status)
    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)
    if start_date:
        query = query.filter(Invoice.invoice_date >= start_date)
    if end_date:
        query = query.filter(Invoice.invoice_date <= end_date)
        
    invoices = query.order_by(Invoice.invoice_date.desc()).all()
    
    results = []
    for inv in invoices:
        results.append(InvoiceListItem(
            id=inv.id,
            invoice_number=inv.invoice_number,
            invoice_date=inv.invoice_date,
            due_date=inv.due_date,
            currency=inv.currency,
            status=inv.status,
            invoice_template=inv.invoice_template or "premium_afghan_glass",
            grand_total=inv.grand_total,
            paid_amount=inv.paid_amount,
            remaining_balance=inv.remaining_balance,
            customer_name=inv.customer.company_name,
            created_by_name=inv.creator.name
        ))
    return results

@router.post("", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("invoices.create"))
):
    invoice_number = payload.invoice_number or generate_invoice_number(db, payload.invoice_date)
    existing = db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()
    if existing:
        raise HTTPException(status_code=409, detail="Invoice number already exists")

    cust = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not cust:
        fallback_cust = db.query(Customer).first()
        if fallback_cust:
            payload.customer_id = fallback_cust.id
        else:
            new_cust = Customer(company_name="General Customer", contact_person="General Contact")
            db.add(new_cust)
            db.commit()
            db.refresh(new_cust)
            payload.customer_id = new_cust.id
        
    invoice_data = payload.model_dump(exclude={"items", "shipment_details"})
    invoice_data["invoice_number"] = invoice_number
    shipper_record = resolve_business_party(db, payload.shipper_party_id, "shipper")
    consignee_record = resolve_business_party(db, payload.consignee_party_id, "consignee")
    notify_record = resolve_business_party(db, payload.notify_party_id, "notify_party")
    normalized_notify = normalize_party_snapshot(invoice_data.get("notify_party"))
    if notify_record and not normalized_notify:
        normalized_notify = normalize_party_snapshot(party_to_snapshot(notify_record))
    invoice_data["notify_party"] = normalized_notify
    invoice_data["notify_party_enabled"] = bool(normalized_notify)
    normalized_shipper = normalize_party_snapshot(
        invoice_data.get("shipper_exporter"), strip_stale_notify_fragment=True
    )
    if shipper_record and not normalized_shipper:
        normalized_shipper = normalize_party_snapshot(party_to_snapshot(shipper_record), strip_stale_notify_fragment=True)
    invoice_data["shipper_exporter"] = normalized_shipper
    normalized_consignee = normalize_party_snapshot(
        invoice_data.get("consignee_buyer"), strip_stale_notify_fragment=True
    )
    if consignee_record and not normalized_consignee:
        normalized_consignee = normalize_party_snapshot(party_to_snapshot(consignee_record), strip_stale_notify_fragment=True)
    invoice_data["consignee_buyer"] = normalized_consignee
    if not normalized_notify:
        invoice_data["notify_party_same_as_consignee"] = False
        invoice_data["notify_party_customer_id"] = None
    invoice = Invoice(**invoice_data, created_by=current_user.id)
    invoice.documentation_fees = Decimal(str(payload.documentation_fees or 0))
    invoice.customs_clearance_fees = Decimal(str(payload.customs_clearance_fees or 0))
    if invoice.documentation_fees and invoice.other_charges == invoice.documentation_fees:
        invoice.other_charges = Decimal("0.00")
    
    for item_data in payload.items:
        item = InvoiceItem(**normalize_invoice_item_values(item_data, payload.currency))
        invoice.items.append(item)
        
    if payload.shipment_details:
        ship = ShipmentDetails(**payload.shipment_details.model_dump())
        invoice.shipment_details = ship
        
    recalculate_invoice(invoice)
    try:
        db.add(invoice)
        db.flush()

        record_invoice_party_relationships(db, invoice.shipper_party_id, invoice.consignee_party_id, invoice.notify_party_id)

        log = ActivityLog(
            user_id=current_user.id,
            action="create_invoice",
            entity_type="invoice",
            entity_id=invoice.id,
            details=f"Invoice created: {invoice.invoice_number}"
        )
        db.add(log)
        if invoice.shipper_party_id:
            db.add(ActivityLog(
                user_id=current_user.id,
                action="select_shipper_for_invoice",
                entity_type="invoice",
                entity_id=invoice.id,
                details=f"Shipper selected for invoice: {shipper_record.display_name if shipper_record else invoice.shipper_party_id}",
            ))
        if invoice.notify_party_id:
            db.add(ActivityLog(
                user_id=current_user.id,
                action="select_notify_party_for_invoice",
                entity_type="invoice",
                entity_id=invoice.id,
                details=f"Notify party selected for invoice: {notify_record.display_name if notify_record else invoice.notify_party_id}",
            ))
        if invoice.consignee_party_id:
            db.add(ActivityLog(
                user_id=current_user.id,
                action="select_consignee_for_invoice",
                entity_type="invoice",
                entity_id=invoice.id,
                details=f"Consignee selected for invoice: {consignee_record.display_name if consignee_record else invoice.consignee_party_id}",
            ))
        db.commit()
        db.refresh(invoice)
    except IntegrityError as error:
        db.rollback()
        if "invoice_number" in str(error).lower() or "unique" in str(error).lower():
            raise HTTPException(status_code=409, detail="Invoice number already exists") from error
        raise
    except Exception:
        db.rollback()
        raise
    return invoice

@router.get("/{id}", response_model=InvoiceOut)
def get_invoice(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("invoices.view"))
):
    invoice = db.query(Invoice).filter(Invoice.id == id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.put("/{id}", response_model=InvoiceOut)
def update_invoice(
    id: int,
    payload: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("invoices.edit"))
):
    invoice = db.query(Invoice).filter(Invoice.id == id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if payload.invoice_number and payload.invoice_number != invoice.invoice_number:
        existing = db.query(Invoice).filter(Invoice.invoice_number == payload.invoice_number).first()
        if existing:
            raise HTTPException(status_code=409, detail="Invoice number already exists")
            
    previous_shipper_party_id = invoice.shipper_party_id
    previous_consignee_party_id = invoice.consignee_party_id
    previous_notify_party_id = invoice.notify_party_id
    invoice_data = payload.model_dump(exclude={"items", "shipment_details"}, exclude_unset=True)
    if "shipper_party_id" in invoice_data:
        shipper_record = resolve_business_party(db, invoice_data.get("shipper_party_id"), "shipper")
        if shipper_record and "shipper_exporter" not in invoice_data:
            invoice_data["shipper_exporter"] = party_to_snapshot(shipper_record)
    if "consignee_party_id" in invoice_data:
        consignee_record = resolve_business_party(db, invoice_data.get("consignee_party_id"), "consignee")
        if consignee_record and "consignee_buyer" not in invoice_data:
            invoice_data["consignee_buyer"] = party_to_snapshot(consignee_record)
    if "notify_party_id" in invoice_data:
        notify_record = resolve_business_party(db, invoice_data.get("notify_party_id"), "notify_party")
        if notify_record and "notify_party" not in invoice_data:
            invoice_data["notify_party"] = party_to_snapshot(notify_record)
    notify_submitted = "notify_party" in payload.model_fields_set
    notify_disabled = "notify_party_enabled" in payload.model_fields_set and payload.notify_party_enabled is False
    if notify_submitted or notify_disabled:
        normalized_notify = None if notify_disabled else normalize_party_snapshot(invoice_data.get("notify_party"))
        invoice_data["notify_party"] = normalized_notify
        invoice_data["notify_party_enabled"] = bool(normalized_notify)
        if not normalized_notify:
            invoice_data["notify_party_same_as_consignee"] = False
            invoice_data["notify_party_customer_id"] = None
    for party_field in ("shipper_exporter", "consignee_buyer"):
        if party_field in invoice_data:
            invoice_data[party_field] = normalize_party_snapshot(
                invoice_data[party_field], strip_stale_notify_fragment=True
            )
    for field, value in invoice_data.items():
        setattr(invoice, field, value)
    if payload.documentation_fees is not None:
        invoice.documentation_fees = Decimal(str(payload.documentation_fees))
    if payload.customs_clearance_fees is not None:
        invoice.customs_clearance_fees = Decimal(str(payload.customs_clearance_fees))
    if invoice.documentation_fees and invoice.other_charges == invoice.documentation_fees:
        invoice.other_charges = Decimal("0.00")
        
    if payload.items is not None:
        db.query(InvoiceItem).filter(InvoiceItem.invoice_id == id).delete()
        for item_data in payload.items:
            item = InvoiceItem(**normalize_invoice_item_values(item_data, payload.currency or invoice.currency))
            invoice.items.append(item)
            
    if payload.shipment_details is not None:
        if invoice.shipment_details:
            ship_data = payload.shipment_details.model_dump()
            for field, value in ship_data.items():
                setattr(invoice.shipment_details, field, value)
        else:
            invoice.shipment_details = ShipmentDetails(**payload.shipment_details.model_dump())
            
    recalculate_invoice(invoice)
    
    log = ActivityLog(
        user_id=current_user.id,
        action="update_invoice",
        entity_type="invoice",
        entity_id=invoice.id,
        details=f"Invoice updated: {invoice.invoice_number}"
    )
    db.add(log)
    if "shipper_party_id" in invoice_data and invoice.shipper_party_id and invoice.shipper_party_id != previous_shipper_party_id:
        selected = db.query(BusinessParty).filter(BusinessParty.id == invoice.shipper_party_id).first()
        db.add(ActivityLog(
            user_id=current_user.id,
            action="select_shipper_for_invoice",
            entity_type="invoice",
            entity_id=invoice.id,
            details=f"Shipper selected for invoice: {selected.display_name if selected else invoice.shipper_party_id}",
        ))
    if "notify_party_id" in invoice_data and invoice.notify_party_id and invoice.notify_party_id != previous_notify_party_id:
        selected = db.query(BusinessParty).filter(BusinessParty.id == invoice.notify_party_id).first()
        db.add(ActivityLog(
            user_id=current_user.id,
            action="select_notify_party_for_invoice",
            entity_type="invoice",
            entity_id=invoice.id,
            details=f"Notify party selected for invoice: {selected.display_name if selected else invoice.notify_party_id}",
        ))
    if "consignee_party_id" in invoice_data and invoice.consignee_party_id and invoice.consignee_party_id != previous_consignee_party_id:
        selected = db.query(BusinessParty).filter(BusinessParty.id == invoice.consignee_party_id).first()
        db.add(ActivityLog(
            user_id=current_user.id,
            action="select_consignee_for_invoice",
            entity_type="invoice",
            entity_id=invoice.id,
            details=f"Consignee selected for invoice: {selected.display_name if selected else invoice.consignee_party_id}",
        ))
    if invoice.shipper_party_id != previous_shipper_party_id or invoice.consignee_party_id != previous_consignee_party_id or invoice.notify_party_id != previous_notify_party_id:
        record_invoice_party_relationships(db, invoice.shipper_party_id, invoice.consignee_party_id, invoice.notify_party_id)
    
    try:
        db.commit()
        db.refresh(invoice)
    except IntegrityError as error:
        db.rollback()
        if "invoice_number" in str(error).lower() or "unique" in str(error).lower():
            raise HTTPException(status_code=409, detail="Invoice number already exists") from error
        raise
    except Exception:
        db.rollback()
        raise
    return invoice

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("invoices.delete"))
):
    invoice = db.query(Invoice).filter(Invoice.id == id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    db.delete(invoice)
    
    log = ActivityLog(
        user_id=current_user.id,
        action="delete_invoice",
        entity_type="invoice",
        entity_id=id,
        details=f"Invoice deleted: {invoice.invoice_number}"
    )
    db.add(log)
    db.commit()

@router.post("/{id}/duplicate", response_model=InvoiceOut)
def duplicate_invoice(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("invoices.duplicate"))
):
    source = db.query(Invoice).filter(Invoice.id == id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    import random
    suffix = random.randint(100, 999)
    new_number = f"{source.invoice_number}_DUP_{suffix}"
    
    dup_invoice = Invoice(
        invoice_number=new_number,
        invoice_date=date.today(),
        due_date=date.today(),
        customer_id=source.customer_id,
        currency=source.currency,
        status="unpaid",
        paid_amount=Decimal("0.00"),
        invoice_template=source.invoice_template or "premium_afghan_glass",
        freight=source.freight,
        freight_rate=source.freight_rate,
        insurance=source.insurance,
        other_charges=source.other_charges,
        discount=source.discount,
        tax=source.tax,
        documentation_fees=source.documentation_fees,
        customs_clearance_fees=source.customs_clearance_fees,
        notify_party=normalize_party_snapshot(source.notify_party),
        shipper_exporter=normalize_party_snapshot(source.shipper_exporter, strip_stale_notify_fragment=True),
        consignee_buyer=normalize_party_snapshot(source.consignee_buyer, strip_stale_notify_fragment=True),
        notify_party_enabled=bool(normalize_party_snapshot(source.notify_party)),
        notify_party_same_as_consignee=bool(normalize_party_snapshot(source.notify_party)) and source.notify_party_same_as_consignee,
        notify_party_customer_id=source.notify_party_customer_id if normalize_party_snapshot(source.notify_party) else None,
        shipper_party_id=source.shipper_party_id,
        consignee_party_id=source.consignee_party_id,
        notify_party_id=source.notify_party_id,
        notes=source.notes,
        created_by=current_user.id
    )
    
    for it in source.items:
        dup_invoice.items.append(InvoiceItem(
            description=it.description,
            hs_code=it.hs_code,
            quantity=it.quantity,
            unit=it.unit,
            unit_price=it.unit_price,
            sort_order=it.sort_order
        ))
        
    if source.shipment_details:
        s = source.shipment_details
        dup_invoice.shipment_details = ShipmentDetails(
            booking_number=s.booking_number,
            bill_of_lading_number=s.bill_of_lading_number,
            container_number=s.container_number,
            container_type=s.container_type,
            seal_number=s.seal_number,
            commodity=s.commodity,
            gross_weight=s.gross_weight,
            net_weight=s.net_weight,
            package_count=s.package_count,
            package_type=s.package_type,
            port_of_loading=s.port_of_loading,
            port_of_discharge=s.port_of_discharge,
            vessel_name=s.vessel_name,
            voyage_number=s.voyage_number,
            shipping_line=s.shipping_line,
            incoterms=s.incoterms,
            etd=s.etd,
            eta=s.eta
        )
        
    recalculate_invoice(dup_invoice)
    db.add(dup_invoice)
    db.commit()
    db.refresh(dup_invoice)
    
    log = ActivityLog(
        user_id=current_user.id,
        action="duplicate_invoice",
        entity_type="invoice",
        entity_id=dup_invoice.id,
        details=f"Invoice duplicated from {source.invoice_number} to {dup_invoice.invoice_number}"
    )
    db.add(log)
    db.commit()
    return dup_invoice

@router.get("/{id}/pdf")
async def download_invoice_pdf(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("invoices.print"))
):
    invoice = db.query(Invoice).filter(Invoice.id == id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    temp_token = create_access_token(subject=current_user.id)
    
    try:
        template_id = invoice.invoice_template or "premium_afghan_glass"
        pdf_path = await generate_pdf(id, temp_token, invoice.invoice_number, template_id)
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=500, detail="Failed to generate PDF file")
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=os.path.basename(pdf_path)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")

@router.get("/{id}/payments", response_model=List[PaymentOut])
def list_payments(id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("payments.view"))):
    return db.query(Payment).filter(Payment.invoice_id == id).all()

@router.post("/{id}/payments", response_model=InvoiceOut)
def record_payment(
    id: int,
    amount: Decimal,
    payment_method: str,
    payment_date: date,
    reference_number: Optional[str] = Query(None),
    notes: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("payments.create"))
):
    invoice = db.query(Invoice).filter(Invoice.id == id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    payment = Payment(
        invoice_id=id,
        amount=amount,
        currency=invoice.currency,
        payment_date=payment_date,
        payment_method=payment_method,
        reference_number=reference_number,
        notes=notes,
        created_by=current_user.id
    )
    db.add(payment)
    
    invoice.paid_amount += amount
    recalculate_invoice(invoice)
    
    log = ActivityLog(
        user_id=current_user.id,
        action="record_payment",
        entity_type="invoice",
        entity_id=id,
        details=f"Recorded payment of {amount} {invoice.currency} for invoice {invoice.invoice_number}"
    )
    db.add(log)
    db.commit()
    db.refresh(invoice)
    return invoice
