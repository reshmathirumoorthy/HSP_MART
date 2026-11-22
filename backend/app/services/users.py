"""Staff user and role management (admin only).

Only HSP staff roles are managed here. Partner roles are granted by KYC verification and supplier roles by linking a
supplier, so this screen never turns a customer, partner or supplier into staff or back, and the reverse. Every change is
audited; deactivating someone or changing their role ends their open sessions. There is always at least one active admin.
"""
from sqlalchemy import Connection
from ..audit import audit
from ..db import all_, one, run
from ..errors import fail
from .common import STAFF_ROLES, is_email, is_uuid

PAGE_SIZE = 50


def list_users(conn: Connection, *, q: str = "", role: str = "", page: int = 1) -> dict:
    where, params = ["true"], {}
    if q.strip():
        where.append("(email ilike :q or phone ilike :q or name ilike :q)")
        params["q"] = f"%{q.strip()}%"
    if role == "staff":
        where.append("role::text = any(:staff)")
        params["staff"] = list(STAFF_ROLES)
    elif role:
        where.append("role::text = :role")
        params["role"] = role
    w = " and ".join(where)
    page = max(page, 1)
    total = one(conn, f"select count(*)::int as n from users where {w}", **params)["n"]
    rows = all_(conn, f"""select id::text, email, phone, name, role::text as role, active, created_at,
                                 (select max(created_at) from sessions s where s.user_id = users.id) as last_sign_in
                          from users where {w} order by created_at desc limit :lim offset :off""",
                lim=PAGE_SIZE, off=(page - 1) * PAGE_SIZE, **params)
    return {"users": rows, "total": total, "page": page, "pageSize": PAGE_SIZE}


def _require_admin(actor):
    if actor.role != "hsp_admin":
        fail("Only an admin can manage staff accounts.")


def _active_admins(conn) -> int:
    return one(conn, "select count(*)::int as n from users where role = 'hsp_admin' and active")["n"]


def _end_sessions(conn, user_id):
    run(conn, "update sessions set revoked_at = now() where user_id = cast(:u as uuid) and revoked_at is null", u=user_id)


def create_staff(conn: Connection, actor, *, email: str, name: str, role: str) -> dict:
    _require_admin(actor)
    email = email.strip().lower()
    if not is_email(email):
        fail("Enter a valid email address.")
    if role not in STAFF_ROLES:
        fail("Choose a staff role.")
    if not name.strip():
        fail("Enter the person's name.")
    existing = one(conn, "select id::text, role::text as role from users where email = :e", e=email)
    if existing:
        if existing["role"] != "customer":
            fail(f"That email already belongs to a {existing['role'].replace('_', ' ')} account.")
        # A plain customer account (e.g. someone who once signed in to the store) is promoted.
        run(conn, "update users set role = cast(:r as role), name = :n, active = true, updated_at = now() where id = cast(:id as uuid)",
            r=role, n=name.strip(), id=existing["id"])
        _end_sessions(conn, existing["id"])
        audit(conn, actor, "user.promote_to_staff", "user", existing["id"], {"role": "customer"}, {"role": role})
        return {"id": existing["id"], "email": email, "role": role}
    u = one(conn, "insert into users (email, name, role) values (:e, :n, cast(:r as role)) returning id::text",
            e=email, n=name.strip(), r=role)
    audit(conn, actor, "user.create_staff", "user", u["id"], None, {"email": email, "role": role})
    return {"id": u["id"], "email": email, "role": role}


def update_staff(conn: Connection, actor, user_id: str, *, role: str | None = None, active: bool | None = None) -> None:
    _require_admin(actor)
    if not is_uuid(user_id):
        fail("User not found.")
    u = one(conn, "select id::text, role::text as role, active from users where id = cast(:id as uuid) for update", id=user_id) \
        or fail("User not found.")
    if u["role"] not in STAFF_ROLES:
        fail("Only staff accounts are managed here. Partners and suppliers are managed from their own pages.")
    if user_id == actor.id:
        fail("You cannot change your own role or deactivate yourself.")
    new_role = role if role is not None else u["role"]
    new_active = active if active is not None else u["active"]
    if new_role not in STAFF_ROLES:
        fail("Choose a staff role.")
    if u["role"] == "hsp_admin" and u["active"] and (new_role != "hsp_admin" or not new_active) and _active_admins(conn) <= 1:
        fail("At least one active admin is required.")
    if (new_role, new_active) == (u["role"], u["active"]):
        return
    run(conn, "update users set role = cast(:r as role), active = :a, updated_at = now() where id = cast(:id as uuid)",
        r=new_role, a=new_active, id=user_id)
    _end_sessions(conn, user_id)
    audit(conn, actor, "user.update_staff", "user", user_id, {"role": u["role"], "active": u["active"]},
          {"role": new_role, "active": new_active})
