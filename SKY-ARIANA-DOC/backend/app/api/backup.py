from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import shutil
from app.database.session import get_db
from app.core.security import require_permission
from app.models.models import User, ActivityLog
from app.services.backup_service import (
    create_db_backup,
    restore_db_backup,
    export_invoices_to_json,
    export_invoices_to_excel,
    import_customers_from_excel,
    import_products_from_excel
)
from app.core.config import settings

router = APIRouter(prefix="/backup", tags=["backup"])

@router.post("/create")
def trigger_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("backup.create"))
):
    try:
        backup_path = create_db_backup()
        filename = os.path.basename(backup_path)
        log = ActivityLog(
            user_id=current_user.id,
            action="create_backup",
            entity_type="database",
            details=f"Backup created: {filename}"
        )
        db.add(log)
        db.commit()
        return {"message": "Backup created successfully", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
def list_backups(current_user: User = Depends(require_permission("backup.download"))):
    from datetime import datetime
    backup_dir = os.path.join(settings.UPLOAD_DIR, "backups")
    os.makedirs(backup_dir, exist_ok=True)
    files = []
    for f in os.listdir(backup_dir):
        if f.endswith(".db") and f != "temp_restore.db":
            path = os.path.join(backup_dir, f)
            stat = os.stat(path)
            files.append({
                "filename": f,
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
    files.sort(key=lambda x: x["created_at"], reverse=True)
    return files

@router.delete("/delete/{filename}")
def delete_backup(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("backup.delete"))
):
    backup_path = os.path.join(settings.UPLOAD_DIR, "backups", filename)
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup file not found")
    try:
        os.remove(backup_path)
        log = ActivityLog(
            user_id=current_user.id,
            action="delete_backup",
            entity_type="database",
            details=f"Backup deleted: {filename}"
        )
        db.add(log)
        db.commit()
        return {"message": "Backup file deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{filename}")
def download_backup(
    filename: str,
    current_user: User = Depends(require_permission("backup.download"))
):
    backup_path = os.path.join(settings.UPLOAD_DIR, "backups", filename)
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup file not found")
    return FileResponse(backup_path, filename=filename, media_type="application/octet-stream")

@router.post("/restore")
def restore_backup(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("backup.restore"))
):
    temp_path = os.path.join(settings.UPLOAD_DIR, "backups", f"temp_restore.db")
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        restore_db_backup(temp_path)
        os.remove(temp_path)
        
        log = ActivityLog(
            user_id=current_user.id,
            action="restore_backup",
            entity_type="database",
            details="Database restored from uploaded backup file"
        )
        db.add(log)
        db.commit()
        
        return {"message": "Database restored successfully. Please refresh the page."}
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")

@router.get("/export/json")
def export_json(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("invoices.export"))
):
    try:
        export_path = export_invoices_to_json(db)
        return FileResponse(export_path, filename="invoices_export.json", media_type="application/json")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export/excel")
def export_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("invoices.export"))
):
    try:
        export_path = export_invoices_to_excel(db)
        return FileResponse(
            export_path,
            filename="invoices_export.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import/customers")
def import_customers(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("customers.create"))
):
    temp_path = os.path.join(settings.UPLOAD_DIR, f"temp_import_customers.xlsx")
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        count = import_customers_from_excel(db, temp_path)
        os.remove(temp_path)
        
        log = ActivityLog(
            user_id=current_user.id,
            action="import_customers",
            entity_type="customer",
            details=f"Imported {count} customers from Excel file"
        )
        db.add(log)
        db.commit()
        
        return {"message": f"Successfully imported {count} customers"}
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@router.post("/import/products")
def import_products(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products.create"))
):
    temp_path = os.path.join(settings.UPLOAD_DIR, f"temp_import_products.xlsx")
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        count = import_products_from_excel(db, temp_path)
        os.remove(temp_path)
        
        log = ActivityLog(
            user_id=current_user.id,
            action="import_products",
            entity_type="product",
            details=f"Imported {count} products from Excel file"
        )
        db.add(log)
        db.commit()
        
        return {"message": f"Successfully imported {count} products"}
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
