"""Corporate gifting calendars: each programme raises a draft quote `lead_days` before its occasion."""
import json
from datetime import datetime
from sqlalchemy import Connection
from ..audit import audit
from ..db import all_, engine, one, run
from ..errors import fail
from .common import upsert_customer
from .quotes import create_quote, parse_lines

SYSTEM_EMAIL = "system@hspmart.internal"


class _Actor:
    def __init__(self, id, role):
        self.id, self.role = str(id), role


def system_actor(conn: Connection):
    u = one(conn, "select id, role::text as role from users where email = :e", e=SYSTEM_EMAIL)
    if not u:
        # Inactive staff identity: can own automated records but can never sign in.
        u = one(conn, """insert into users (email, name, role, active) values (:e, 'HSP automation', 'hsp_admin', false)
                         on conflict do nothing returning id, role::text as role""", e=SYSTEM_EMAIL) \
            or one(conn, "select id, role::text as role from users where email = :e", e=SYSTEM_EMAIL)
    return _Actor(u["id"], u["role"])


def create_programme(conn: Connection, actor, *, customer_name: str, customer_email: str, name: str, occasion: str,
                     next_date: str, lead_days: int, lines: str):
    if actor.role != "hsp_admin":
        fail("Only admin can create programmes.")
    try:
        date = datetime.fromisoformat(next_date)
    except ValueError:
        fail("Enter the occasion date.")
    if not name.strip():
        fail("Name the programme.")
    parsed = [{"sku": l["sku"], "quantity": l["quantity"], "branding": l["branding"]} for l in parse_lines(lines)]
    customer = upsert_customer(conn, name=customer_name, email=customer_email, kind="organisation")
    p = one(conn, """insert into programmes (customer_id, name, occasion, next_date, lead_days, lines)
                     values (:c, :n, :o, :d, :l, cast(:lines as jsonb)) returning id::text, name, next_date""",
            c=customer["id"], n=name.strip(), o=occasion.strip(), d=date, l=lead_days or 30, lines=json.dumps(parsed))
    audit(conn, actor, "programme.create", "programme", p["id"], None, {"name": p["name"], "nextDate": p["next_date"].isoformat()})
    return p


def run_due_programmes() -> list[str]:
    """Idempotent per cycle: claim (optimistic lock on next_date), then raise the quote in its own transaction."""
    with engine().begin() as conn:
        actor = system_actor(conn)
        due = all_(conn, """select p.*, c.name as c_name, c.email as c_email, c.kind as c_kind
                            from programmes p join customers c on c.id = p.customer_id
                            where p.active and p.next_date - make_interval(days => p.lead_days) <= now()""")
    raised = []
    for p in due:
        with engine().begin() as conn:
            claimed = one(conn, """update programmes set next_date = next_date + interval '1 year'
                                   where id = :id and next_date = :d returning id""", id=p["id"], d=p["next_date"])
        if not claimed:
            continue
        try:
            with engine().begin() as conn:
                q = create_quote(conn, actor, customer={"name": p["c_name"], "email": p["c_email"], "kind": p["c_kind"]},
                                 lines=[{**l, "unit_price_paise": None} for l in p["lines"]])
                run(conn, "update programmes set last_quotation_id = :q where id = :id", q=q["id"], id=p["id"])
                audit(conn, actor, "programme.quote_raised", "programme", p["id"], None, {"quote": q["number"], "occasion": p["occasion"]})
            raised.append(q["number"])
        except Exception as e:  # noqa: BLE001 — roll the claim back for any failure
            with engine().begin() as conn:
                run(conn, "update programmes set next_date = :d where id = :id", d=p["next_date"], id=p["id"])
                audit(conn, actor, "programme.failed", "programme", p["id"], None, {"error": str(e)})
    return raised
