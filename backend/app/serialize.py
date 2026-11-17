"""Response shaping: snake_case DB rows → camelCase JSON (matching the Next.js/Drizzle field names)."""
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID


def _camel(k: str) -> str:
    head, *rest = k.split("_")
    return head + "".join(p[:1].upper() + p[1:] for p in rest)


def camel(v):
    if isinstance(v, dict):
        return {_camel(k): camel(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [camel(x) for x in v]
    if isinstance(v, UUID):
        return str(v)
    if isinstance(v, Decimal):
        return int(v) if v == v.to_integral_value() else float(v)
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    return v
