from decimal import Decimal, ROUND_HALF_UP

MONEY = Decimal("0.01")


def _decimal(value) -> Decimal:
    if value is None or value == "":
        return Decimal("0")
    return Decimal(str(value).replace(",", ""))


def _get(item, field: str, default=None):
    if isinstance(item, dict):
        return item.get(field, default)
    return getattr(item, field, default)


def weight_to_kg(value, unit: str | None) -> Decimal:
    factors = {
        "KG": Decimal("1"),
        "KGS": Decimal("1"),
        "MT": Decimal("1000"),
        "G": Decimal("0.001"),
        "LB": Decimal("0.45359237"),
        "TON": Decimal("1000"),
    }
    normalized = (unit or "KG").upper()
    return _decimal(value) * factors.get(normalized, Decimal("1"))


def billable_quantity(item) -> Decimal:
    basis = _get(item, "price_basis") or "Per KG"
    if basis == "Per Piece":
        return _decimal(_get(item, "quantity", 0))
    if basis in {"Per Carton", "Per Bag", "Per Package"}:
        return _decimal(_get(item, "package_count", 0))

    kg = weight_to_kg(_get(item, "net_weight", None) or _get(item, "quantity", 0), _get(item, "weight_unit", None) or _get(item, "unit", "KG"))
    if basis == "Per MT":
        return kg / Decimal("1000")
    if basis == "Per LB":
        return kg / Decimal("0.45359237")
    return kg


def calculate_item_amount(item) -> Decimal:
    return (billable_quantity(item) * _decimal(_get(item, "unit_price", 0))).quantize(MONEY, rounding=ROUND_HALF_UP)


def calculate_item_totals(items) -> dict[str, Decimal]:
    return {
        "subtotal": sum((calculate_item_amount(item) for item in items), Decimal("0.00")).quantize(MONEY),
        "net_weight": sum((_decimal(_get(item, "net_weight", None) or _get(item, "quantity", 0)) for item in items), Decimal("0")),
        "gross_weight": sum((_decimal(_get(item, "gross_weight", None) or _get(item, "net_weight", None) or _get(item, "quantity", 0)) for item in items), Decimal("0")),
        "packages": sum((_decimal(_get(item, "package_count", 0)) for item in items), Decimal("0")),
    }
