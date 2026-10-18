from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from backend.config import EXPORTS_DIR
from backend.services.excel import rows_from_excel, write_excel
from backend.services.files import save_upload

router = APIRouter(tags=["excel"])


@router.post("/import")
async def import_excel(file: UploadFile = File(...)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".xlsx", ".xls", ".csv"}:
        raise HTTPException(status_code=400, detail="Upload an Excel or CSV file")
    saved = await save_upload(file)
    rows = rows_from_excel(Path(saved["storage_path"]))
    return {
        "success": True,
        "data": {"file": saved, "rows": rows, "count": len(rows)},
        "source": "python-fastapi",
    }


@router.post("/export")
def export_excel(body: dict):
    rows = body.get("rows")
    if not isinstance(rows, list):
        raise HTTPException(status_code=400, detail="rows must be an array")
    filename = str(body.get("filename") or "sky-logistics-export.xlsx")
    if not filename.lower().endswith(".xlsx"):
        filename = f"{filename}.xlsx"
    output_path = EXPORTS_DIR / filename
    write_excel(output_path, rows)
    return FileResponse(output_path, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=filename)

