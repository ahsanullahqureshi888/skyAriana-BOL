from __future__ import annotations

import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Optional


def safe_decimal(val: Any, default: str = "0.0000", precision: int = 4) -> Decimal:
    """Safely convert any numeric, float, or string representation to exact Python Decimal.

    Handles:
    - Floats, ints, Decimal instances
    - Strings with currency symbols ('$', 'USD', 'AFN', etc.)
    - Thousand separators ('12,345.67')
    - Negative amounts in accounting parentheses '(500.00)' -> '-500.00'
    - Multi-part strings (e.g. '3,840 KG - 18,480 KG') by taking the first numeric value
    """
    if val is None or val == "":
        return Decimal(default)

    if isinstance(val, Decimal):
        return val.quantize(Decimal(f"1e-{precision}"))

    if isinstance(val, (int, float)):
        # Convert through str representation to avoid float binary inaccuracy
        try:
            return Decimal(str(val)).quantize(Decimal(f"1e-{precision}"))
        except (InvalidOperation, ValueError):
            return Decimal(default)

    val_str = str(val).strip()
    if not val_str:
        return Decimal(default)

    # Handle accounting parentheses: '(1000)' -> '-1000'
    is_negative = False
    if val_str.startswith("(") and val_str.endswith(")"):
        is_negative = True
        val_str = val_str[1:-1].strip()
    elif val_str.startswith("-"):
        is_negative = True
        val_str = val_str[1:].strip()

    # If it contains ranges like "3,840 KG - 18,480 KG", take the first part
    if " - " in val_str:
        val_str = val_str.split(" - ")[0].strip()

    # Remove non-numeric characters except '.'
    cleaned = re.sub(r"[^\d.]", "", val_str)
    if not cleaned:
        return Decimal(default)

    # If multiple dots exist, keep only the first dot
    if cleaned.count(".") > 1:
        parts = cleaned.split(".")
        cleaned = parts[0] + "." + "".join(parts[1:])

    try:
        dec = Decimal(cleaned)
        if is_negative:
            dec = -dec
        return dec.quantize(Decimal(f"1e-{precision}"))
    except (InvalidOperation, ValueError):
        return Decimal(default)


def safe_datetime(val: Any) -> Optional[datetime]:
    """Safely parse diverse datetime representations into timezone-aware UTC datetime.

    Supports:
    - datetime objects (ensures timezone)
    - ISO 8601 strings (e.g., '2026-09-18T05:00:37.540Z')
    - Date strings (e.g., '2026-09-18')
    - Millisecond / Unix timestamps (int/float)
    - Fallback to None if Shamsi or invalid string
    """
    if val is None or val == "":
        return None

    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val.astimezone(timezone.utc)

    if isinstance(val, (int, float)):
        try:
            # Check if timestamp in milliseconds
            if val > 1e11:
                val = val / 1000.0
            return datetime.fromtimestamp(val, tz=timezone.utc)
        except (ValueError, OSError, OverflowError):
            return None

    val_str = str(val).strip()
    if not val_str:
        return None

    # Handle ISO strings ending with 'Z'
    if val_str.endswith("Z"):
        val_str = val_str[:-1] + "+00:00"

    formats = [
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(val_str, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            else:
                dt = dt.astimezone(timezone.utc)
            return dt
        except (ValueError, TypeError):
            continue

    # Shamsi dates (e.g. 1404-01-01) or other custom date strings return None for datetime field
    return None


def safe_date_str(val: Any) -> str:
    """Return a clean string representation for date fields (preserving Shamsi dates like 1404-01-01)."""
    if val is None:
        return ""
    val_str = str(val).strip()
    # If it's a full ISO timestamp, extract the date part if applicable
    if "T" in val_str:
        return val_str.split("T")[0]
    return val_str


def safe_int(val: Any, default: int = 0) -> int:
    """Safely convert strings or numbers to int."""
    if val is None or val == "":
        return default
    if isinstance(val, int):
        return val
    if isinstance(val, float):
        return int(val)
    val_str = str(val).strip()
    # Extract only digits and leading minus
    m = re.search(r"-?\d+", val_str)
    if m:
        try:
            return int(m.group(0))
        except ValueError:
            return default
    return default


def clean_text(val: Any, max_length: Optional[int] = None) -> str:
    """Clean, strip, and optionally limit string length."""
    if val is None:
        return ""
    s = str(val).strip()
    # Normalize multiple whitespace characters
    s = re.sub(r"[ \t]+", " ", s)
    if max_length and len(s) > max_length:
        return s[:max_length]
    return s


def clean_code(val: Any, max_length: Optional[int] = None) -> str:
    """Clean alphanumeric/code string."""
    if val is None:
        return ""
    s = str(val).strip().upper()
    if max_length and len(s) > max_length:
        return s[:max_length]
    return s
