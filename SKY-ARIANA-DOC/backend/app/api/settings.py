from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
import os
import time
import shutil
from app.database.session import get_db
from app.core.security import require_permission
from app.models.models import CompanySettings, User, ActivityLog
from app.schemas.schemas import CompanyBrandingOut, CompanySettingsOut, CompanySettingsUpdate
from app.core.config import settings

router = APIRouter(prefix="/settings", tags=["settings"])

def get_or_create_settings(db: Session) -> CompanySettings:
    s = db.query(CompanySettings).filter(CompanySettings.id == 1).first()
    if not s:
        s = CompanySettings(
            id=1,
            company_name="SKY ARIANA GROUP OF COMPANIES",
            subtitle="IMPORT • EXPORT • LOGISTICS • CARGO • FREIGHT",
            watermark_enabled=True,
            default_invoice_template="premium_afghan_glass",
            invoice_watermark_enabled=True,
            invoice_watermark_opacity=0.06,
            invoice_qr_enabled=True,
            invoice_seal_enabled=True,
            invoice_signature_enabled=True,
            invoice_stamp_enabled=True,
            invoice_color_printing_enabled=True,
            invoice_compact_layout_enabled=False,
            licence_number="2401-2198",
            website="www.skyariana.com",
            default_currency="USD",
            default_language="en",
            addresses={
                "afghanistan": {
                    "title": "AFGHANISTAN OFFICE",
                    "lines": [
                        "2nd Floor, Office No. 16",
                        "Etimad Rahimi Market, Shahidano Chowk",
                        "Kandahar, Afghanistan"
                    ]
                },
                "kabul": {
                    "title": "KABUL OFFICE",
                    "lines": [
                        "SHAHR-E-NOW, HAJI YAQOUB SQUARE,",
                        "KABUL, AFGHANISTAN"
                    ]
                },
                "iran": {
                    "title": "IRAN OFFICE",
                    "lines": [
                        "Cubic Building",
                        "Bandar Abbas, Iran",
                        "P.O. Box: 7913973295"
                    ]
                }
            },
            phones={
                "afghanistan": ["+93 700 939 365", "+93 711 435 529"],
                "kabul": ["+93 700 700 123", "+93 700 156 010"],
                "iran": ["+98 76 32226028", "+98 917 232 5086"]
            },
            emails={
                "afghanistan": ["info@skyariana.com", "transport@skyariana.com"],
                "kabul": ["cargo@skyariana.com"],
                "iran": ["info@balambarbaran.com", "ceo@balambarbaran.com"]
            },
            bank_details={
                "bank_name": "Islamic Bank of Afghanistan",
                "beneficiary_name": "SKY ARIANA",
                "account_number": "123456789",
                "iban": "AF1234567890",
                "swift_code": "IBAFAFKA",
                "branch": "Kandahar Branch",
                "payment_instructions": "Please transfer to the above account within 14 days."
            }
        )
        db.add(s)
        db.commit()
        db.refresh(s)
    else:
        addresses = dict(s.addresses or {})
        phones = dict(s.phones or {})
        emails = dict(s.emails or {})
        changed = False
        if "kabul" not in addresses:
            addresses["kabul"] = {"title": "KABUL OFFICE", "lines": ["SHAHR-E-NOW, HAJI YAQOUB SQUARE,", "KABUL, AFGHANISTAN"]}
            changed = True
        if "kabul" not in phones:
            phones["kabul"] = ["+93 700 700 123", "+93 700 156 010"]
            changed = True
        if "kabul" not in emails:
            emails["kabul"] = ["cargo@skyariana.com"]
            changed = True
        if changed:
            s.addresses, s.phones, s.emails = addresses, phones, emails
            db.commit()
            db.refresh(s)
    return s

@router.get("/public-branding", response_model=CompanyBrandingOut)
def read_public_branding(db: Session = Depends(get_db)):
    """Return the non-sensitive company identity used on public and shared UI surfaces."""
    return get_or_create_settings(db)

@router.get("", response_model=CompanySettingsOut)
def read_settings(db: Session = Depends(get_db), current_user: User = Depends(require_permission("company.view"))):
    return get_or_create_settings(db)

@router.put("", response_model=CompanySettingsOut)
def update_settings(
    payload: CompanySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("company.edit"))
):
    s = get_or_create_settings(db)
    
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(s, field, value)
        
    log = ActivityLog(
        user_id=current_user.id,
        action="update_settings",
        entity_type="settings",
        entity_id=s.id,
        details="Company settings updated by admin"
    )
    db.add(log)
    db.commit()
    db.refresh(s)
    return s

def save_upload_file(file: UploadFile, prefix: str) -> str:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1]
    filename = f"{prefix}_{int(time.time())}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return file_path

@router.post("/logo", response_model=CompanySettingsOut)
def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("company.change_logo"))
):
    s = get_or_create_settings(db)
    logo_path = save_upload_file(file, "logo")
    s.logo_path = logo_path
    
    log = ActivityLog(
        user_id=current_user.id,
        action="upload_logo",
        entity_type="settings",
        entity_id=s.id,
        details="Company logo uploaded"
    )
    db.add(log)
    db.commit()
    db.refresh(s)
    return s

@router.post("/signature", response_model=CompanySettingsOut)
def upload_signature(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("company.edit"))
):
    s = get_or_create_settings(db)
    sig_path = save_upload_file(file, "signature")
    s.signature_path = sig_path
    
    log = ActivityLog(
        user_id=current_user.id,
        action="upload_signature",
        entity_type="settings",
        entity_id=s.id,
        details="Authorized signature image uploaded"
    )
    db.add(log)
    db.commit()
    db.refresh(s)
    return s

@router.post("/stamp", response_model=CompanySettingsOut)
def upload_stamp(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("company.edit"))
):
    s = get_or_create_settings(db)
    stamp_path = save_upload_file(file, "stamp")
    s.stamp_path = stamp_path
    
    log = ActivityLog(
        user_id=current_user.id,
        action="upload_stamp",
        entity_type="settings",
        entity_id=s.id,
        details="Company stamp image uploaded"
    )
    db.add(log)
    db.commit()
    db.refresh(s)
    return s
