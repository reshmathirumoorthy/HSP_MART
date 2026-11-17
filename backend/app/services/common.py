import re
import secrets
from datetime import datetime
from sqlalchemy import Connection
from ..db import one

EMAIL_RE = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+")
UUID_RE = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
FREE_MAIL = re.compile(r"@(gmail|yahoo|outlook|hotmail|icloud|rediffmail|proton)\.", re.I)
STAFF_ROLES = ("hsp_admin", "hsp_finance", "hsp_procurement")
FINANCE = ("hsp_admin", "hsp_finance")


def is_uuid(v) -> bool:
    return bool(v) and bool(UUID_RE.fullmatch(str(v)))


def is_email(v: str) -> bool:
    return bool(EMAIL_RE.fullmatch(v.strip()))


def doc_number(prefix: str) -> str:
    return f"{prefix}-{datetime.now().year}-{secrets.token_hex(4).upper()}"


def net_paid(o) -> int:
    return o["paid_paise"] - o["refunded_paise"]


def amount_due(o) -> int:
    """Invoice value still owed after approved credit notes."""
    return o["total_paise"] - o["credited_paise"]


def dedupe_key(email: str, kind: str) -> str:
    e = email.strip().lower()
    return f"domain:{e.split('@')[1]}" if kind == "organisation" and not FREE_MAIL.search(e) else f"email:{e}"


def upsert_customer(conn: Connection, *, name: str, email: str, kind: str, gstin: str | None = None,
                    contact_name: str | None = None):
    email = email.strip().lower()
    existing = one(conn, "select * from customers where email = :e", e=email)
    if existing:
        return existing
    return one(conn, """insert into customers (name, email, kind, gstin, contact_name, dedupe_key)
                        values (:n, :e, :k, :g, :c, :d) returning *""",
               n=name.strip(), e=email, k=kind, g=gstin or None, c=contact_name or None, d=dedupe_key(email, kind))


def customer_owns(conn: Connection, user, customer_id) -> bool:
    c = one(conn, "select email, user_id::text from customers where id = :id", id=customer_id)
    if not c:
        return False
    return c["user_id"] == user.id or (bool(user.email) and c["email"] == user.email)


def supplier_for_user(conn: Connection, user_id: str):
    return one(conn, "select * from suppliers where user_id = cast(:u as uuid)", u=user_id)


def partner_for_user(conn: Connection, user_id: str):
    return one(conn, "select * from partners where user_id = cast(:u as uuid)", u=user_id)
