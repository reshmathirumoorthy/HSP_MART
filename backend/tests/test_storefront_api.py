"""Storefront & account API: enquiries, profile, addresses, wishlist, inbox, checkout, webhooks, files."""
import hashlib
import hmac
import json
import uuid
from conftest import login, make_user, sql
from app.config import settings

PRODUCT = "executive-notebook-01"  # HSP-STN-001, MOQ 50
ONLINE = "cable-organizer-01"  # MOQ 1, customisable


def test_contact_enquiry_and_rate_limit(anon):
    email = f"c-{uuid.uuid4().hex[:6]}@x.test"
    r = anon.post("/api/enquiries/contact", json={"name": "Asha", "email": email, "subject": "Hello", "message": "Need 300 diaries for Diwali"})
    assert r.status_code == 200 and r.json()["number"].startswith("ENQ-")
    assert anon.post("/api/enquiries/contact", json={"name": "A", "email": email, "message": "short"}).status_code == 400
    for _ in range(4):
        anon.post("/api/enquiries/contact", json={"name": "Asha", "email": email, "message": "Need 300 diaries for Diwali"})
    r = anon.post("/api/enquiries/contact", json={"name": "Asha", "email": email, "message": "Need 300 diaries for Diwali"})
    assert r.status_code == 400 and "Too many" in r.json()["detail"]
    ack = sql("select count(*)::int n from notifications where recipient = :e and template = 'enquiry.received'", e=email)
    assert ack["n"] == 5


def test_bulk_quote_flows_to_account_and_admin_quote():
    email = make_user("customer")
    cust = login(email)
    body = {"lines": [{"productId": PRODUCT, "quantity": 120, "notes": "Navy"}],
            "requirements": {"orderType": "corporate", "branding": "yes", "brandName": "Acme", "additionalNotes": "Deliver to Pune"},
            "customer": {"fullName": "Ravi", "email": email, "phone": "9876543210", "organizationName": "Acme", "customerType": "business"},
            "address": {"line1": "1 MG Rd", "city": "Pune", "state": "Maharashtra", "pincode": "411001"}}
    assert cust.post("/api/enquiries/bulk-quote", json={**body, "lines": []}).status_code == 400
    number = cust.post("/api/enquiries/bulk-quote", json=body).json()["number"]
    mine = cust.get("/api/account/quotes").json()
    assert mine[0]["reference"] == number and mine[0]["status"] == "submitted" and mine[0]["totalUnits"] == 120

    admin = login(make_user("hsp_admin"))
    e = next(x for x in admin.get("/api/admin/enquiries").json() if x["number"] == number)
    finance = login(make_user("hsp_finance"))
    assert finance.post(f"/api/admin/enquiries/{e['id']}/quote").status_code == 403
    q = admin.post(f"/api/admin/enquiries/{e['id']}/quote").json()["quote"]
    assert admin.post(f"/api/admin/enquiries/{e['id']}/quote").status_code == 400  # only once
    assert cust.get(f"/api/account/quotes/{number}").json()["status"] == "responded"
    detail = admin.get(f"/api/admin/quotes/{q}").json()
    assert detail["lines"][0]["branding"] == {"notes": "Acme"} and detail["quote"]["customerEmail"] == email


def test_profile_and_addresses_are_per_account():
    a, b = login(make_user("customer")), login(make_user("customer"))
    r = a.post("/api/account/profile", json={"fullName": "Meera Iyer", "customerType": "business", "organizationName": "Iyer & Co", "gstin": "bad"})
    assert r.status_code == 400 and "GSTIN" in r.json()["detail"]
    p = a.post("/api/account/profile", json={"fullName": "Meera Iyer", "customerType": "business", "organizationName": "Iyer & Co", "gstin": "33AAAAA0000A1Z5"}).json()
    assert p["firstName"] == "Meera" and p["gstin"] == "33AAAAA0000A1Z5"
    addr = {"label": "Office", "fullName": "Meera", "phone": "9876543210", "addressLine1": "12 Lake View", "city": "Coimbatore", "state": "Tamil Nadu", "postalCode": "641002"}
    assert a.post("/api/account/addresses", json={**addr, "postalCode": "12"}).status_code == 400
    first = a.post("/api/account/addresses", json=addr).json()
    assert first["isDefault"] is True
    second = a.post("/api/account/addresses", json={**addr, "label": "Home"}).json()
    lst = a.post(f"/api/account/addresses/{second['id']}/default").json()
    assert [x["isDefault"] for x in lst if x["id"] == second["id"]] == [True] and sum(x["isDefault"] for x in lst) == 1
    assert b.get("/api/account/addresses").json() == []
    assert b.delete(f"/api/account/addresses/{first['id']}").status_code == 400  # not theirs
    after = a.delete(f"/api/account/addresses/{second['id']}").json()
    assert len(after) == 1 and after[0]["isDefault"] is True
    assert a.get("/api/account/profile").json()["address"]["city"] == "Coimbatore"


def test_wishlist_merge_and_toggle():
    c = login(make_user("customer"))
    assert c.post("/api/account/wishlist", json={"productId": "nope", "on": True}).status_code == 400
    assert c.post("/api/account/wishlist/merge", json={"productIds": [PRODUCT, "nope"]}).json()["productIds"] == [PRODUCT]
    assert c.post("/api/account/wishlist", json={"productId": PRODUCT, "on": False}).json()["productIds"] == []


def _sign(body: dict) -> tuple[str, dict]:
    raw = json.dumps(body)
    sig = hmac.new(settings().razorpay_webhook_secret.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return raw, {"x-razorpay-signature": sig, "x-razorpay-event-id": f"evt_{uuid.uuid4().hex}", "content-type": "application/json"}


def test_checkout_payment_webhook_and_inbox(anon, monkeypatch):
    monkeypatch.setattr(settings(), "razorpay_webhook_secret", "py-test-secret")
    email = make_user("customer")
    c = login(email)
    order = {"clientRef": f"py{uuid.uuid4().hex[:12]}", "customer": {"fullName": "Kiran", "email": email, "phone": "9876543210"},
             "address": {"line1": "1 Rd", "city": "Pune", "state": "Maharashtra", "pincode": "411001"},
             "items": [{"productId": ONLINE, "quantity": 2}]}
    assert anon.post("/api/checkout", json=order).status_code == 401
    n1 = c.post("/api/checkout", json=order).json()["orderNumber"]
    assert c.post("/api/checkout", json=order).json()["orderNumber"] == n1  # idempotent
    o = sql("select o.total_paise, o.freight_paise, p.provider_order_id, p.amount_paise from orders o join payments p on p.order_id = o.id where o.number = :n", n=n1)
    assert o["freight_paise"] == 9900 and o["amount_paise"] == o["total_paise"]

    raw, h = _sign({"event": "payment.captured", "payload": {"payment": {"entity": {"id": f"pay_{uuid.uuid4().hex[:10]}", "order_id": o["provider_order_id"], "amount": o["amount_paise"], "status": "captured"}}}})
    assert anon.post("/api/webhooks/razorpay", content=raw, headers={**h, "x-razorpay-signature": "0" * 64}).status_code == 401
    assert anon.post("/api/webhooks/razorpay", content=raw, headers=h).json() == {"result": "processed"}
    assert anon.post("/api/webhooks/razorpay", content=raw, headers=h).json() == {"result": "duplicate"}

    acct = c.get(f"/api/account/orders/{n1}").json()
    assert acct["status"] == "confirmed" and acct["items"][0]["quantity"] == 2
    inbox = c.get("/api/account/notifications").json()
    assert any(n["type"] == "PAYMENT_SUCCESSFUL" and not n["read"] for n in inbox)
    assert all(n["read"] for n in c.post("/api/account/notifications/read", json={"ids": None}).json())
    stranger = login(make_user("customer"))
    assert stranger.get(f"/api/account/orders/{n1}").status_code == 404
    assert stranger.get(f"/api/my/orders/{n1}").status_code == 404


PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64


def test_artwork_upload_review_and_download_rights(anon):
    email = make_user("customer")
    c = login(email)
    order = {"clientRef": f"py{uuid.uuid4().hex[:12]}", "customer": {"fullName": "Kiran", "email": email, "phone": "9876543210"},
             "address": {"line1": "1 Rd", "city": "Pune", "state": "MH", "pincode": "411001"},
             "items": [{"productId": ONLINE, "quantity": 1, "personalisation": {"text": "Asha"}}]}
    n = c.post("/api/checkout", json=order).json()["orderNumber"]
    r = c.post(f"/api/my/orders/{n}/artwork", files={"file": ("logo.exe", b"MZ\x90\x00", "image/png")})
    assert r.status_code == 400 and "PDF, PNG" in r.json()["detail"]
    fid = c.post(f"/api/my/orders/{n}/artwork", files={"file": ("logo.png", PNG, "image/png")}).json()["id"]
    assert c.get(f"/api/files/{fid}").content == PNG
    assert anon.get(f"/api/files/{fid}").status_code == 401
    assert login(make_user("customer")).get(f"/api/files/{fid}").status_code == 404
    finance = login(make_user("hsp_finance"))
    assert finance.post(f"/api/admin/files/{fid}/review", json={"decision": "approved"}).status_code == 403
    admin = login(make_user("hsp_admin"))
    assert admin.post(f"/api/admin/files/{fid}/review", json={"decision": "rejected", "note": "x"}).status_code == 400
    assert admin.post(f"/api/admin/files/{fid}/review", json={"decision": "approved"}).status_code == 200


def test_credit_note_maker_checker_and_payout_maker_checker():
    admin, finance = login(make_user("hsp_admin")), login(make_user("hsp_finance"))
    number = f"O-PY-{uuid.uuid4().hex[:8].upper()}"
    c = sql("insert into customers (kind, name, email, dedupe_key) values ('individual','CN',:e,:e) returning id", e=f"cn-{uuid.uuid4().hex[:6]}@x.test")
    o = sql("""insert into orders (number, customer_id, status, subtotal_paise, gst_paise, total_paise, paid_paise)
               values (:n, :c, 'delivered', 84000, 15120, 99120, 99120) returning id""", n=number, c=c["id"])
    line = sql("insert into order_lines (order_id, product_id, quantity, unit_price_paise, gst_rate_bps) values (:o, :p, 2, 42000, 1800) returning id", o=o["id"], p=PRODUCT)
    r = admin.post(f"/api/admin/orders/{number}/credit-notes", json={"reason": "One diary damaged in transit", "lines": [{"orderLineId": str(line["id"]), "quantity": 3}]})
    assert r.status_code == 400 and "can still be credited" in r.json()["detail"]
    cn = admin.post(f"/api/admin/orders/{number}/credit-notes", json={"reason": "One diary damaged in transit", "lines": [{"orderLineId": str(line["id"]), "quantity": 1}]}).json()["number"]
    assert admin.post(f"/api/admin/credit-notes/{cn}/approve").json()["detail"].startswith("The person who raised")
    assert finance.post(f"/api/admin/credit-notes/{cn}/approve").status_code == 200
    d = admin.get(f"/api/admin/orders/{number}").json()
    assert d["order"]["creditedPaise"] == 49560 and d["lines"][0]["creditedQuantity"] == 1
    assert d["creditNotes"][0]["status"] == "approved"


def test_cron_requires_secret(anon, monkeypatch):
    monkeypatch.setattr(settings(), "cron_secret", "py-cron-secret")
    assert anon.get("/api/cron/notifications").status_code == 401
    assert anon.get("/api/cron/notifications", headers={"authorization": "Bearer wrong"}).status_code == 401
    assert "attempted" in anon.get("/api/cron/notifications", headers={"authorization": "Bearer py-cron-secret"}).json()


def test_exports_are_staff_only_and_tally_finance_only(anon):
    assert anon.get("/api/admin/exports/sales").status_code == 401
    proc = login(make_user("hsp_procurement"))
    assert proc.get("/api/admin/exports/sales").headers["content-type"].startswith("text/csv")
    assert proc.get("/api/admin/exports/tally").status_code == 403
    fin = login(make_user("hsp_finance"))
    assert fin.get("/api/admin/exports/tally").text.startswith("<?xml")
    assert fin.get("/api/admin/exports/nope").status_code == 404
