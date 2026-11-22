import uuid
from conftest import login, make_user, sql


def _email(tag):
    return f"py-{tag}-{uuid.uuid4().hex[:8]}@hsp.test"


def test_only_admins_manage_staff():
    finance = login(make_user("hsp_finance"))
    assert finance.get("/api/admin/users").status_code == 403
    assert finance.post("/api/admin/users", json={"email": _email("x"), "name": "X", "role": "hsp_finance"}).status_code == 403


def test_create_list_change_role_and_deactivate(admin):
    email = _email("new-staff")
    r = admin.post("/api/admin/users", json={"email": email, "name": "New Staff", "role": "hsp_procurement"})
    assert r.status_code == 200, r.text
    uid = r.json()["id"]
    page = admin.get("/api/admin/users", params={"q": email}).json()
    assert page["total"] == 1 and page["users"][0]["role"] == "hsp_procurement"

    staff = login(email)  # the new account can sign in and gets the role straight away
    assert staff.get("/api/auth/me").json()["role"] == "hsp_procurement"

    assert admin.post(f"/api/admin/users/{uid}", json={"role": "hsp_finance"}).status_code == 200
    # Changing the role ends existing sessions, so the old one is no longer valid.
    assert staff.get("/api/auth/me").status_code == 401
    assert admin.post(f"/api/admin/users/{uid}", json={"active": False}).status_code == 200
    assert sql("select role::text as role, active from users where id = cast(:id as uuid)", id=uid) == {"role": "hsp_finance", "active": False}
    actions = sql("select count(*)::int as n from audit_events where entity = 'user' and entity_id = :id and action like 'user.%staff'", id=uid)
    assert actions["n"] == 3


def test_customer_accounts_are_promoted_but_partner_accounts_are_refused(admin):
    customer = make_user("customer")
    r = admin.post("/api/admin/users", json={"email": customer, "name": "Promoted", "role": "hsp_finance"})
    assert r.status_code == 200 and sql("select role::text as role from users where email = :e", e=customer)["role"] == "hsp_finance"
    partner = make_user("associate")
    r = admin.post("/api/admin/users", json={"email": partner, "name": "Partner", "role": "hsp_admin"})
    assert r.status_code == 400 and "associate" in r.json()["detail"]
    pid = sql("select id::text from users where email = :e", e=partner)["id"]
    r = admin.post(f"/api/admin/users/{pid}", json={"role": "hsp_admin"})
    assert r.status_code == 400 and "Only staff" in r.json()["detail"]


def test_validation_and_self_protection(admin):
    assert admin.post("/api/admin/users", json={"email": "not-an-email", "name": "X", "role": "hsp_finance"}).status_code == 400
    assert admin.post("/api/admin/users", json={"email": _email("r"), "name": "X", "role": "customer"}).status_code == 422
    me = admin.get("/api/auth/me").json()["id"]
    r = admin.post(f"/api/admin/users/{me}", json={"active": False})
    assert r.status_code == 400 and "yourself" in r.json()["detail"]


def test_the_last_active_admin_cannot_be_removed():
    """Run in a rolled-back transaction so the real admins are untouched."""
    import pytest
    from sqlalchemy import text
    from app.db import engine
    from app.errors import CommerceError
    from app.services.users import update_staff

    class Actor:
        def __init__(self, id, role):
            self.id, self.role = id, role

    with engine().connect() as conn:
        tx = conn.begin()
        try:
            only = conn.execute(text("insert into users (email, role) values (:e, 'hsp_admin') returning id::text"),
                                {"e": _email("only-admin")}).scalar()
            conn.execute(text("update users set active = false where role = 'hsp_admin' and id <> cast(:id as uuid)"), {"id": only})
            # The acting admin may be inactive in this setup; the guard is about the target being the last one.
            actor = Actor(str(uuid.uuid4()), "hsp_admin")
            with pytest.raises(CommerceError, match="At least one active admin"):
                update_staff(conn, actor, only, role="hsp_finance")
            with pytest.raises(CommerceError, match="At least one active admin"):
                update_staff(conn, actor, only, active=False)
        finally:
            tx.rollback()
