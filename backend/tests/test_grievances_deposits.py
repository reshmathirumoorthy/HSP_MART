import uuid
from conftest import login, make_user, sql


def _customer_order(email: str, partner_id=None) -> str:
    number = f"O-GR-{uuid.uuid4().hex[:8].upper()}"
    c = sql("""insert into customers (kind, name, email, dedupe_key) values ('individual', 'Gr Buyer', :e, :e) returning id""", e=email)
    o = sql("""insert into orders (number, customer_id, partner_id, status, subtotal_paise, gst_paise, total_paise, paid_paise)
               values (:n, :c, cast(:p as uuid), 'dispatched', 42000, 7560, 49560, 49560) returning id""",
            n=number, c=c["id"], p=partner_id)
    sql("""insert into order_lines (order_id, product_id, quantity, unit_price_paise, gst_rate_bps)
           values (:o, 'executive-notebook-01', 1, 42000, 1800)""", o=o["id"])
    return number


def _supplier_with_po(admin, number: str):
    email = make_user("supplier")
    s = admin.post("/api/admin/suppliers", json={"name": f"Gr Supplier {uuid.uuid4().hex[:6]}", "city": "Pune",
                                                 "loginEmail": email}).json()
    sql("""insert into purchase_orders (number, order_id, supplier_id, total_cost_paise)
           select :pn, id, cast(:s as uuid), 30000 from orders where number = :n""",
        pn=f"PO-GR-{uuid.uuid4().hex[:6]}", s=s["id"], n=number)
    return s["id"], email


def test_grievance_lifecycle(admin):
    email = make_user("customer")
    customer = login(email)
    number = _customer_order(email)
    stranger = login(make_user("customer"))
    assert stranger.post(f"/api/my/orders/{number}/grievances", json={"category": "damaged", "description": "Box arrived crushed"}).status_code == 400
    assert customer.post(f"/api/my/orders/{number}/grievances", json={"category": "damaged", "description": "short"}).status_code == 400
    r = customer.post(f"/api/my/orders/{number}/grievances", json={"category": "damaged", "description": "Two bottles arrived dented"})
    assert r.status_code == 200, r.text
    gr = r.json()["number"]
    dup = customer.post(f"/api/my/orders/{number}/grievances", json={"category": "damaged", "description": "Again, dented bottles"})
    assert dup.status_code == 400
    assert customer.get(f"/api/my/orders/{number}").json()["grievances"][0]["status"] == "open"

    supplier_id, supplier_email = _supplier_with_po(admin, number)
    other = admin.post("/api/admin/suppliers", json={"name": f"Other {uuid.uuid4().hex[:6]}"}).json()
    assert admin.post(f"/api/admin/grievances/{gr}/assign", json={"supplierId": other["id"]}).status_code == 400
    assert admin.post(f"/api/admin/grievances/{gr}/assign", json={"supplierId": supplier_id}).status_code == 200

    supplier = login(supplier_email)
    listed = supplier.get("/api/supplier/dashboard").json()["grievances"]
    assert listed[0]["number"] == gr and "customer" not in listed[0]
    assert supplier.post(f"/api/supplier/grievances/{gr}/respond", json={"note": "Replacement bottles dispatched today"}).status_code == 200

    assert admin.post(f"/api/admin/grievances/{gr}/close").status_code == 400
    assert admin.post(f"/api/admin/grievances/{gr}/resolve", json={"resolution": "Replacement delivered", "creditNote": "CN-NOPE"}).status_code == 400
    assert admin.post(f"/api/admin/grievances/{gr}/resolve", json={"resolution": "Replacement delivered and confirmed"}).status_code == 200
    assert admin.post(f"/api/admin/grievances/{gr}/close").status_code == 200
    row = next(g for g in admin.get("/api/admin/grievances").json() if g["number"] == gr)
    assert row["status"] == "closed" and row["supplierNote"].startswith("Replacement")
    n = sql("select count(*)::int as n from audit_events where entity = 'grievance' and entity_id = (select id::text from grievances where number = :g)", g=gr)
    assert n["n"] == 5
    assert sql("select count(*)::int as n from notifications where template = 'grievance.resolved' and payload->>'grievance' = :g", g=gr)["n"] >= 1


def test_partner_can_raise_on_attributed_order_only(admin):
    pemail = make_user("associate")
    u = sql("select id from users where email = :e", e=pemail)
    p = sql("""insert into partners (user_id, code, type, status, kyc_verified_at) values (:u, :c, 'associate', 'active', now())
               returning id::text""", u=u["id"], c=f"HSP-A-{uuid.uuid4().hex[:6]}")
    mine = _customer_order(f"pc-{uuid.uuid4().hex[:6]}@hsp.test", p["id"])
    theirs = _customer_order(f"pc-{uuid.uuid4().hex[:6]}@hsp.test")
    partner = login(pemail)
    assert partner.post(f"/api/my/orders/{theirs}/grievances", json={"category": "delay", "description": "Customer says it is late"}).status_code == 400
    assert partner.post(f"/api/my/orders/{mine}/grievances", json={"category": "delay", "description": "Customer says it is late"}).status_code == 200
    assert [g["orderNumber"] for g in partner.get("/api/partner/grievances").json()] == [mine]


def _franchise(deposit: int, status: str = "suspended") -> str:
    email = make_user("franchise")
    u = sql("select id from users where email = :e", e=email)
    return sql("""insert into partners (user_id, code, type, status, kyc_verified_at, security_deposit_paise)
                  values (:u, :c, 'franchise', cast(:s as partner_status), now(), :d) returning id::text""",
               u=u["id"], c=f"HSP-F-{uuid.uuid4().hex[:6]}", s=status, d=deposit)["id"]


def test_deposit_settlement_maker_checker():
    maker = login(make_user("hsp_finance"))
    checker = login(make_user("hsp_finance"))
    active = _franchise(5_000_000, "active")
    assert maker.post(f"/api/admin/partners/{active}/deposit-settlement", json={"reason": "Agreement ended by mutual consent"}).status_code == 400
    pid = _franchise(5_000_000)
    too_much = maker.post(f"/api/admin/partners/{pid}/deposit-settlement",
                          json={"reason": "Agreement ended by mutual consent", "deductions": [{"reason": "Damaged demo kits", "amountPaise": 6_000_000}]})
    assert too_much.status_code == 400
    r = maker.post(f"/api/admin/partners/{pid}/deposit-settlement",
                   json={"reason": "Agreement ended by mutual consent", "deductions": [{"reason": "Damaged demo kits", "amountPaise": 500_000}]})
    assert r.status_code == 200, r.text
    s = next(x for x in maker.get("/api/admin/partners").json()["settlements"] if x["number"] == r.json()["number"])
    assert s["refundPaise"] == 4_500_000 and s["status"] == "pending"
    assert maker.post(f"/api/admin/partners/{pid}/deposit", json={"depositPaise": 1}).status_code == 400
    assert maker.post(f"/api/admin/deposit-settlements/{s['id']}/decide", json={"approve": True, "payoutReference": "UTR1"}).status_code == 400
    assert checker.post(f"/api/admin/deposit-settlements/{s['id']}/decide", json={"approve": True}).status_code == 400
    assert checker.post(f"/api/admin/deposit-settlements/{s['id']}/decide", json={"approve": True, "payoutReference": "UTR123"}).status_code == 200
    p = sql("select security_deposit_paise, status::text as status from partners where id = cast(:id as uuid)", id=pid)
    assert p["security_deposit_paise"] == 0 and p["status"] == "terminated"


def test_insights_include_new_measures(admin):
    d = admin.get("/api/admin/insights").json()
    for k in ("advances", "grievances", "forecast", "franchises", "suppliers"):
        assert k in d
    assert set(d["advances"]) == {"orders", "advancesPaise"}
    for f in d["forecast"]:
        assert len(f["forecast"]) == 3


def test_tally_books_advances_as_liability_until_dispatch():
    fin = login(make_user("hsp_finance"))
    number = f"O-ADV-{uuid.uuid4().hex[:8].upper()}"
    c = sql("""insert into customers (kind, name, email, dedupe_key) values ('organisation', 'Advance Co', :e, :e) returning id""",
            e=f"adv-{uuid.uuid4().hex[:6]}@hsp.test")
    o = sql("""insert into orders (number, customer_id, status, subtotal_paise, gst_paise, total_paise, paid_paise)
               values (:n, :c, 'production_approved', 100000, 18000, 118000, 59000) returning id""", n=number, c=c["id"])
    pid = f"pay_{uuid.uuid4().hex[:10]}"
    sql("""insert into payments (order_id, provider_payment_id, amount_paise, status, created_at)
           values (:o, :p, 59000, 'captured', now() - interval '2 days')""", o=o["id"], p=pid)
    xml = fin.get("/api/admin/exports/tally").text
    receipt = xml.split(f"RCPT-{pid}")[1].split("</VOUCHER>")[0]
    assert "Customer Advances" in receipt and "590.00" in receipt
    assert f"<VOUCHERNUMBER>{number}</VOUCHERNUMBER>" not in xml  # no sale before dispatch

    sql("update orders set status = 'dispatched' where id = :o", o=o["id"])
    sql("insert into shipments (order_id, courier, tracking_number, dispatched_at) values (:o, 'Delhivery', 'T1', now())", o=o["id"])
    xml = fin.get("/api/admin/exports/tally").text
    assert f"<VOUCHERNUMBER>{number}</VOUCHERNUMBER>" in xml
    adjust = xml.split(f"ADV-{number}")[1].split("</VOUCHER>")[0]
    assert "Customer Advances" in adjust and "Advance Co" in adjust and "590.00" in adjust
