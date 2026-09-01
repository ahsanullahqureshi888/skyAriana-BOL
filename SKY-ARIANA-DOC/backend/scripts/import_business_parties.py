"""Idempotently import the reviewed shipper and notify-party registry.

Run from the backend directory:
    python scripts/import_business_parties.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.database.session import Base, SessionLocal, engine  # noqa: E402
from app.models import models  # noqa: F401,E402
from app.models.models import ActivityLog, User  # noqa: E402
from app.services.business_parties import import_seed_records  # noqa: E402


def main() -> int:
    seed_path = BACKEND_ROOT / "data" / "business_parties_seed.json"
    records = json.loads(seed_path.read_text(encoding="utf-8"))
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        actor = db.query(User).filter(User.email == "admin@skyariana.com").first()
        report = import_seed_records(
            db,
            records,
            actor_id=actor.id if actor else None,
            source_name="ALL-SHIPPERS--.pdf",
        )
        db.add(ActivityLog(
            user_id=actor.id if actor else None,
            action="import_business_parties",
            entity_type="business_party",
            details=(
                f"Imported reviewed registry: {report['shippersInserted']} shippers inserted, "
                f"{report['notifyPartiesInserted']} notify parties inserted, "
                f"{report['duplicatesMerged']} duplicate matches merged."
            ),
        ))
        db.commit()
        print(json.dumps(report, indent=2, ensure_ascii=False, default=str))
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
