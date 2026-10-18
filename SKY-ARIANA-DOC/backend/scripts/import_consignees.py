"""Idempotently import the reviewed consignee directory seed.

Run from the backend directory with the workspace Python runtime::

    python scripts/import_consignees.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from uuid import uuid4

from sqlalchemy import inspect, text


BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.database.session import Base, SessionLocal, engine  # noqa: E402
from app.models import models  # noqa: F401,E402
from app.models.models import ActivityLog, User  # noqa: E402
from app.services.business_parties import import_seed_records  # noqa: E402


def ensure_import_columns() -> None:
    """Apply the same additive migration used by the API startup hook."""
    business_party_columns = {column["name"] for column in inspect(engine).get_columns("business_parties")}
    migrations = {
        "roles": "JSON", "country_code": "VARCHAR", "contact_person": "VARCHAR", "business_type": "VARCHAR",
        "website": "VARCHAR", "gstin": "VARCHAR", "iec": "VARCHAR", "pan": "VARCHAR", "fssai": "VARCHAR",
        "tin": "VARCHAR", "state_code": "VARCHAR", "identifiers": "JSON", "identifier_provenance": "JSON",
        "field_provenance": "JSON", "source_entries": "JSON", "review_status": "VARCHAR", "import_batch_id": "VARCHAR",
    }
    for column_name, definition in migrations.items():
        if column_name not in business_party_columns:
            with engine.begin() as connection:
                connection.execute(text(f"ALTER TABLE business_parties ADD COLUMN {column_name} {definition}"))
    invoice_columns = {column["name"] for column in inspect(engine).get_columns("invoices")}
    if "consignee_party_id" not in invoice_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE invoices ADD COLUMN consignee_party_id INTEGER"))


def main() -> int:
    seed_path = BACKEND_ROOT / "data" / "consignees_seed.json"
    records = json.loads(seed_path.read_text(encoding="utf-8"))
    Base.metadata.create_all(bind=engine)
    ensure_import_columns()
    db = SessionLocal()
    batch_id = str(uuid4())
    try:
        actor = db.query(User).filter(User.email == "admin@skyariana.com").first()
        report = import_seed_records(
            db,
            records,
            actor_id=actor.id if actor else None,
            source_name="CONSIGNEE - DATA.pdf",
            source_pages_processed=24,
            source_rows_processed=sum(len(record.get("source_entries") or []) for record in records),
            import_batch_id=batch_id,
        )
        db.add(ActivityLog(
            user_id=actor.id if actor else None,
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
        print(json.dumps(report, indent=2, ensure_ascii=False, default=str))
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
