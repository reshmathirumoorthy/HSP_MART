import uuid
from conftest import login, make_user, sql


def test_health(anon):
    assert anon.get("/api/health").json() == {"ok": True}


def test_admin_requires_sign_in_and_staff_role(anon):
    assert anon.get("/api/admin/dashboard").status_code == 401
    customer = login(make_user("customer"))
    assert customer.get("/api/admin/dashboard").status_code == 403


def test_bad_otp_is_rejected_and_counted(anon):
    email = make_user("customer")
    anon.post("/api/auth/otp", json={"identifier": email})
    r = anon.post("/api/auth/verify", json={"identifier": email, "code": "000000"})
    assert r.status_code == 400
    # 1-in-a-million chance the real code was 000000; attempts must have been recorded either way.
    row = sql("select attempts, consumed_at from otp_codes where identifier = :e order by created_at desc limit 1", e=email)
    assert row["attempts"] == 1 or row["consumed_at"] is not None


def test_me_and_logout(admin):
    me = admin.get("/api/auth/me").json()
    assert me["role"] == "hsp_admin"
    admin.post("/api/auth/logout")
    assert admin.get("/api/auth/me").status_code == 401


def test_dashboard(admin):
    d = admin.get("/api/admin/dashboard").json()
    assert sum(x["n"] for x in d["divisions"]) > 0
    assert any(e["action"] == "auth.login" for e in d["events"])


def test_supplier_lifecycle(admin):
    name = f"Py Supplier {uuid.uuid4().hex[:6]}"
    s = admin.post("/api/admin/suppliers", json={"name": name, "city": "Pune"}).json()
    assert s["status"] == "pending"
    assert admin.post(f"/api/admin/suppliers/{s['id']}/status", json={"status": "approved"}).status_code == 200
    r = admin.post(f"/api/admin/suppliers/{s['id']}/rates", json={"sku": "nope-999", "costPaise": 100})
    assert r.status_code == 400 and "Unknown SKU" in r.json()["detail"]
    assert admin.post(f"/api/admin/suppliers/{s['id']}/rates", json={"sku": "hsp-stn-001", "costPaise": 25000}).status_code == 200
    listed = next(x for x in admin.get("/api/admin/suppliers").json() if x["id"] == s["id"])
    assert listed["status"] == "approved" and listed["rates"][0]["sku"] == "HSP-STN-001"
    events = sql("select count(*)::int as n from audit_events where entity = 'supplier' and entity_id = :id", id=s["id"])
    assert events["n"] == 3


def _order(paid: int = 0, total: int = 49560) -> str:
    number = f"O-PY-{uuid.uuid4().hex[:8].upper()}"
    c = sql("""insert into customers (kind, name, email, dedupe_key) values ('individual', 'Py Buyer', :e, :e)
               returning id""", e=f"buyer-{uuid.uuid4().hex[:6]}@hsp.test")
    o = sql("""insert into orders (number, customer_id, status, subtotal_paise, gst_paise, total_paise, paid_paise)
               values (:n, :c, 'confirmed', 42000, 7560, :t, :p) returning id""", n=number, c=c["id"], t=total, p=paid)
    sql("""insert into order_lines (order_id, product_id, quantity, unit_price_paise, gst_rate_bps)
           values (:o, 'executive-notebook-01', 1, 42000, 1800)""", o=o["id"])
    return number


def test_order_guards_and_full_fulfilment(admin):
    number = _order(paid=0)
    r = admin.post(f"/api/admin/orders/{number}/steps", data={"step": "production"})
    assert r.status_code == 400 and "advance" in r.json()["detail"]

    sql("update orders set paid_paise = total_paise where number = :n", n=number)
    sql("""insert into payments (order_id, provider_order_id, amount_paise, status)
           select id, :p, total_paise, 'captured' from orders where number = :n""", n=number, p=f"order_py_{number}")
    assert admin.post(f"/api/admin/orders/{number}/steps", data={"step": "production"}).status_code == 200

    s = admin.post("/api/admin/suppliers", json={"name": f"Py PO {uuid.uuid4().hex[:6]}"}).json()
    r = admin.post(f"/api/admin/orders/{number}/steps", data={"step": "po", "supplierId": s["id"]})
    assert r.status_code == 400 and "approved suppliers" in r.json()["detail"]
    admin.post(f"/api/admin/suppliers/{s['id']}/status", json={"status": "approved"})
    admin.post(f"/api/admin/suppliers/{s['id']}/rates", json={"sku": "HSP-STN-001", "costPaise": 26000})
    r = admin.post(f"/api/admin/orders/{number}/steps", data={"step": "po", "supplierId": s["id"]})
    assert r.status_code == 200 and r.json()["result"]["number"].startswith("PO-")

    assert admin.post(f"/api/admin/orders/{number}/steps", data={"step": "dispatch", "courier": "Delhivery"}).status_code == 400
    assert admin.post(f"/api/admin/orders/{number}/steps",
                      data={"step": "dispatch", "courier": "Delhivery", "tracking": "DL1"}).status_code == 200
    assert admin.post(f"/api/admin/orders/{number}/steps", data={"step": "cancel"}).status_code == 400
    assert admin.post(f"/api/admin/orders/{number}/steps", data={"step": "deliver", "proof": "signed POD"}).status_code == 200
    assert admin.post(f"/api/admin/orders/{number}/steps", data={"step": "close"}).status_code == 200

    d = admin.get(f"/api/admin/orders/{number}").json()
    assert d["order"]["status"] == "closed" and d["order"]["balancePaise"] == 0
    assert d["shipments"][0]["trackingNumber"] == "DL1"
    assert [a["action"] for a in d["audit"]] == [
        "order.production_approved", "order.dispatch", "order.deliver", "order.close"]


def test_finance_cannot_run_order_steps():
    finance = login(make_user("hsp_finance"))
    assert finance.post(f"/api/admin/orders/{_order()}/steps", data={"step": "cancel"}).status_code == 403


def test_cancel_unpaid_order(admin):
    number = _order()
    assert admin.post(f"/api/admin/orders/{number}/steps", data={"step": "cancel"}).status_code == 200
    assert admin.get(f"/api/admin/orders/{number}").json()["order"]["status"] == "cancelled"


def test_session_cookie_is_shared_with_nextjs_format(admin):
    import jwt
    from app.config import settings
    payload = jwt.decode(admin.cookies["hsp_session"], settings().session_secret, algorithms=["HS256"])
    assert set(payload) >= {"sid", "uid", "role", "exp"}
