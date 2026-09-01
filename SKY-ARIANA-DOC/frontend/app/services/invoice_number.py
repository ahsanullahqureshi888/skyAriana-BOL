from __future__ import annotations

import re
from datetime import date

from sqlalchemy.orm import Session

from app.models.models import Invoice


INVOICE_NUMBER_PREFIX = "INV-SABBB"
_SEQUENCE_PATTERN = re.compile(r"-(\d+)$")


def generate_invoice_number(db: Session, invoice_date: date | None = None) -> str:
    """Return the next available human-readable invoice number for the invoice year.

    The database keeps the final unique constraint, while this helper makes the
    normal create flow deterministic and compatible with the existing seeded
    ``INV-SABBB-YYYY-NNN`` numbers.
    """

    year = (invoice_date or date.today()).year
    prefix = f"{INVOICE_NUMBER_PREFIX}-{year}-"
    existing_numbers = (
        db.query(Invoice.invoice_number)
        .filter(Invoice.invoice_number.like(f"{prefix}%"))
        .all()
    )

    highest_sequence = 0
    for (value,) in existing_numbers:
        if not value:
            continue
        match = _SEQUENCE_PATTERN.search(value)
        if match:
            highest_sequence = max(highest_sequence, int(match.group(1)))

    sequence = highest_sequence + 1
    while db.query(Invoice.id).filter(Invoice.invoice_number == f"{prefix}{sequence:03d}").first():
        sequence += 1
    return f"{prefix}{sequence:03d}"
